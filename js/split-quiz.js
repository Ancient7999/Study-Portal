/* Study Portal — lobby Pane mode on the real quiz engine.
   Every player plays their own set in the regular quiz (js/quiz-engine.js: same screens, timing,
   navigator, every question type, mastery bar). What the engine draws is mirrored live
   (js/mirror.js) to lobbies/{id}/session/mirror/{uid}, and every other player's pane is a
   read-only mirror of that. A short summary per player feeds seats, tiles and spectate views:
   lobbies/{id}/session/panes/{uid} = { qIndex, total, answered, correct, done, bank, form, card,
   setLabel, testLabel, displayName, level, seat, role, updatedAt }.
   Players can change their own set at any time; everybody's view follows. */
(function (global) {
  const MAX_SLOTS = 4;
  const SUMMARY_MS = 900;

  const state = {
    lobbyId: null,
    lobby: null,
    session: null,
    myUid: null,
    role: 'play',
    gameMode: 'pane',
    choice: null,          // my current set {bank, form, card, setLabel, testLabel}
    pub: null,             // mirror publisher
    mirrors: {},           // uid -> mirror handle
    unsub: null,
    summaryTimer: null,
    lastSummary: '',
    launching: null,
    picker: null
  };

  function toast(msg) { if (typeof showToast === 'function') showToast(msg, 2400); }
  function ensureDb() { if (!firebase.apps.length) firebase.initializeApp(global.FIREBASE_CONFIG); return firebase.database(); }
  function uid() { const u = firebase.auth && firebase.auth().currentUser; return u ? u.uid : null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function hueFromName(name) { let h = 0; const s = String(name || 'x'); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 360; }
  function initials(name) { const p = String(name || '?').trim().split(/\s+/).filter(Boolean); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : (p[0] || '')[1] || '')).toUpperCase(); }
  function bankKey(bank, form, card) { return String(bank || '') + '|' + String(form || 'A').toUpperCase() + (card ? '|' + card : ''); }
  function base() { return 'lobbies/' + state.lobbyId + '/session'; }

  /* ---------- the engine ---------- */
  function sameChoice(set, v) {
    return set.bank === v.bank && (set.card || null) === (v.card || null) && (set.card ? true : set.form === String(v.form || 'A').toUpperCase());
  }
  /* open a Practice set in the regular quiz, exactly as its Practice card would */
  async function launchSet(c) {
    const Q = global.StudyQuiz;
    if (!Q || !global.StudySets || !global.StudyBankPicker) throw new Error('Quiz engine not ready');
    const cat = await StudyBankPicker.loadCatalog();
    const t = StudySets.tests(cat).find((x) => (x.lectures ? x.lectures.some((l) => l && l.bank === c.bank) : x.material.bank === c.bank));
    if (!t) throw new Error('Set not found');
    global.__activeMaterial = Object.assign({}, t.material, { subjectName: t.subjectName });
    if (t.lectures) await global.loadLectureSet(global.__activeMaterial);
    else await Q.loadBank(t.material.bank);
    const sets = await StudySets.setsOf(t);
    const set = sets.find((s) => sameChoice(s, c)) || sets[0];
    const card = set && Q.cards.find((x) => x.id === set.id);
    if (!card) throw new Error('Set not found');
    c.setLabel = c.setLabel || set.label;
    c.testLabel = c.testLabel || t.title;
    if (typeof global.refreshSetsCards === 'function') { try { global.refreshSetsCards(); } catch (e) {} }
    if (Q.resumeRun && Q.resumeRun(card)) return card;
    // a lobby always plays the whole set, also when every question is already solved
    const left = card.pool.filter((q) => !(global.StudyStore && StudyStore.solvedSet && StudyStore.solvedSet(Q.bankKey).has(q.__id))).length;
    Q.startRun(card.pool, card.label, left ? { card } : { card, noSolvedFilter: true });
    return card;
  }
  function engineSummary() {
    const Q = global.StudyQuiz;
    const out = { qIndex: 0, total: 0, answered: 0, correct: 0, done: false };
    if (!Q || !Q.questions) return out;
    const qs = Q.questions || [], an = Q.answers || [];
    out.total = qs.length;
    out.qIndex = Q.current | 0;
    qs.forEach((q, i) => { if (Q.isAnswered ? Q.isAnswered(an[i], q) : an[i] != null) { out.answered++; out.correct++; } });
    const qv = document.getElementById('quizView');
    out.done = !!(out.total && out.answered >= out.total) || !!(qv && !Q.active && out.total);
    return out;
  }
  function writeSummary(force) {
    if (!state.lobbyId || !state.myUid || isSpectator()) return;
    const s = engineSummary();
    const c = state.choice || {};
    const v = Object.assign(s, { bank: c.bank || '', form: c.form || 'A', card: c.card || null, setLabel: c.setLabel || '', testLabel: c.testLabel || '' });
    const key = JSON.stringify(v);
    if (!force && key === state.lastSummary) return;
    state.lastSummary = key;
    v.updatedAt = Date.now();
    v.score = s.correct;
    ensureDb().ref(base() + '/panes/' + state.myUid).update(v).catch(() => {});
  }

  /* ---------- session ---------- */
  function myPane() { return (state.session && state.session.panes && state.session.panes[state.myUid]) || null; }
  function isSpectator() { const p = myPane(); return state.role === 'spectate' || !!(p && p.role === 'spectate'); }
  function seatOf(lobby, me) {
    if (!lobby || !lobby.seats) return null;
    const k = Object.keys(lobby.seats).find((x) => lobby.seats[x] && lobby.seats[x].uid === me);
    return k == null ? null : { idx: Number(k), seat: lobby.seats[k] };
  }
  function choiceFor(lobby, seat) {
    const s = lobby.session || {};
    if (seat && seat.bank) return { bank: seat.bank, form: seat.form || 'A', card: seat.card || null, setLabel: seat.setLabel || '', testLabel: seat.testLabel || '' };
    return { bank: s.bank || lobby.bank || 'banks/medphys/pt1.json', form: s.form || lobby.form || 'A', card: (s.bank ? s.card : lobby.card) || null, setLabel: s.setLabel || lobby.setLabel || '', testLabel: lobby.testLabel || '' };
  }

  function joinLobbySession(lobbyId) {
    if (state.lobbyId === lobbyId && state.session) return Promise.resolve();
    if (state.joining === lobbyId && state.joinPromise) return state.joinPromise;
    state.joining = lobbyId;
    state.joinPromise = joinInner(lobbyId).catch((e) => { console.warn('[pane]', e); toast('Could not open the quiz · ' + ((e && e.message) || e)); })
      .finally(() => { if (state.joining === lobbyId) { state.joining = null; state.joinPromise = null; } });
    return state.joinPromise;
  }
  async function joinInner(lobbyId) {
    leave({ skipSets: true, silent: true });
    state.lobbyId = lobbyId;
    state.myUid = uid();
    const db = ensureDb();
    const lobby = (await db.ref('lobbies/' + lobbyId).once('value')).val();
    if (!lobby || !lobby.session) { toast('Session not ready'); state.lobbyId = null; return; }
    state.lobby = lobby;
    state.session = lobby.session;
    state.gameMode = 'pane';
    const mine = seatOf(lobby, state.myUid);
    const mem = lobby.members && lobby.members[state.myUid];
    state.role = (mine && mine.seat.role) || (mem && mem.role) || (mine ? 'play' : 'spectate');
    state.choice = choiceFor(lobby, mine && mine.seat);

    const bits = (global.StudyProfiles && StudyProfiles.getProfile && StudyProfiles.getProfile()) || {};
    const prev = (lobby.session.panes && lobby.session.panes[state.myUid]) || {};
    await db.ref(base() + '/panes/' + state.myUid).update({
      qIndex: prev.qIndex | 0,
      displayName: bits.displayName || 'Scholar',
      level: bits.level || 1,
      seat: mine ? mine.idx : 0,
      role: state.role,
      bank: state.choice.bank, form: state.choice.form, card: state.choice.card, setLabel: state.choice.setLabel || '', testLabel: state.choice.testLabel || '',
      updatedAt: Date.now()
    });

    document.body.classList.add('split-quiz-active', 'pane-mode');
    document.body.classList.toggle('pane-spectating', state.role === 'spectate');
    ensureChrome();
    paintBar();

    if (state.role !== 'spectate') {
      await relaunch();
      startPublishing();
    } else {
      const qv = document.getElementById('quizView'); if (qv) qv.classList.remove('active');
    }

    if (global.StudyChat && StudyChat.setLobbyContext && lobby.chatSessionId) {
      StudyChat.setLobbyContext({ lobbyId, chatSessionId: lobby.session.chatSessionId || lobby.chatSessionId, joinedAt: (mem && mem.joinedAt) || Date.now() });
      StudyChat.setActivity({ activity: 'quiz', quiz: { bank: String(state.choice.bank).split('/').pop(), form: state.choice.form }, force: true });
    }
    const ref = db.ref(base());
    const handler = (s) => {
      if (!state.lobbyId) return;
      state.session = s.val();
      if (!state.session) { leave({ skipSets: false }); return; }
      const p = myPane();
      if (p && p.role && p.role !== state.role) setRole(p.role);
      render();
    };
    ref.on('value', handler);
    state.unsub = () => ref.off('value', handler);
    state.summaryTimer = setInterval(() => writeSummary(false), SUMMARY_MS);
    if (global.StudyCursors && StudyCursors.syncFromParty) StudyCursors.syncFromParty();
  }

  async function relaunch() {
    const c = state.choice;
    const my = (state.launching = {});
    try {
      await launchSet(c);
    } catch (e) {
      toast('Could not open that set · ' + ((e && e.message) || e));
    }
    if (state.launching !== my) return;
    paintBar();
    writeSummary(true);
    if (state.pub) state.pub.flush();
  }
  function startPublishing() {
    if (state.pub || !global.StudyMirror) return;
    state.pub = StudyMirror.publish(() => document.querySelector('.app.view.active'), base() + '/mirror/' + state.myUid, {
      extra: () => {
        const v = document.querySelector('.app.view.active');
        const r = v && v.getBoundingClientRect();
        return { offTop: r ? Math.round(r.top + (global.scrollY || 0)) : 0, view: v ? v.id : '' };
      }
    });
  }

  /* my own set, changed from the bar (Practice-style Subject → Test → Set picker) */
  async function changeSet(choice) {
    if (!state.lobbyId || isSpectator() || !choice || !choice.bank) return;
    state.choice = { bank: choice.bank, form: choice.form || 'A', card: choice.card || null, setLabel: choice.setLabel || '', testLabel: choice.testTitle || choice.testLabel || '' };
    const db = ensureDb();
    const mine = seatOf(state.lobby, state.myUid) || seatOf((await db.ref('lobbies/' + state.lobbyId).once('value')).val(), state.myUid);
    const patch = { bank: state.choice.bank, form: state.choice.form, card: state.choice.card, setLabel: state.choice.setLabel, testLabel: state.choice.testLabel, updatedAt: Date.now() };
    if (mine) db.ref('lobbies/' + state.lobbyId + '/seats/' + mine.idx).update(patch).catch(() => {});
    await db.ref(base() + '/panes/' + state.myUid).update(Object.assign({ qIndex: 0, answered: 0, correct: 0, done: false }, patch)).catch(() => {});
    closePicker();
    await relaunch();
    toast('Now playing ' + (state.choice.setLabel || 'the new set'));
  }

  function setRole(role) {
    state.role = role === 'spectate' ? 'spectate' : 'play';
    document.body.classList.toggle('pane-spectating', state.role === 'spectate');
    if (state.role === 'spectate') {
      if (state.pub) { state.pub.stop(); state.pub = null; }
      if (global.StudyQuiz && StudyQuiz.active && StudyQuiz.leaveRun) { try { StudyQuiz.leaveRun(); } catch (e) {} }
      const qv = document.getElementById('quizView'); if (qv) qv.classList.remove('active');
    } else if (state.lobbyId) {
      relaunch().then(startPublishing);
    }
    paintBar();
    render();
  }

  /* ---------- chrome: top bar + peers ---------- */
  function ensureChrome() {
    let el = document.getElementById('multi-quiz-container');
    if (!el) { el = document.createElement('div'); el.id = 'multi-quiz-container'; document.body.appendChild(el); }
    el.className = 'pane-peers';
    el.setAttribute('aria-label', 'Other players');
    // phones: the peers strip sits above the quiz; desktops pin it beside the quiz
    const qv = document.getElementById('quizView');
    if (qv && el.nextElementSibling !== qv && qv.parentNode) qv.parentNode.insertBefore(el, qv);
    let bar = document.getElementById('splitModeBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'splitModeBar';
      bar.className = 'split-mode-bar';
      bar.innerHTML =
        '<span class="split-mode-label" id="splitModeLabel">Pane Quiz</span>' +
        '<span class="split-mode-meta" id="splitModeMeta"></span>' +
        '<button type="button" class="kb-mode-btn" id="splitSetBtn" aria-haspopup="dialog" title="Choose the set you play">Change Set</button>' +
        '<button type="button" class="kb-mode-btn" id="splitExitBtn">Exit</button>' +
        '<div class="split-set-pop" id="splitSetPop" role="dialog" aria-label="Choose your set" hidden><div id="splitSetMount"></div>' +
        '<div class="split-set-actions"><button type="button" class="kb-mode-btn" id="splitSetCancel">Cancel</button><button type="button" class="kb-mode-btn primary" id="splitSetGo">Play This Set</button></div></div>';
      document.body.appendChild(bar);
      bar.querySelector('#splitExitBtn').onclick = () => {
        const id = state.lobbyId;
        if (id && global.StudyLobby && StudyLobby.confirmLeave) { StudyLobby.confirmLeave(id); return; }
        leave({ skipSets: false, silent: true });
        if (id && global.StudyLobby && StudyLobby.leave) StudyLobby.leave(id).catch(() => {});
      };
      bar.querySelector('#splitSetBtn').onclick = () => (bar.querySelector('#splitSetPop').hidden ? openPicker() : closePicker());
      bar.querySelector('#splitSetCancel').onclick = closePicker;
      bar.querySelector('#splitSetGo').onclick = () => { const c = state.picker && state.picker.getChoice(); if (c) changeSet(c); };
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !bar.querySelector('#splitSetPop').hidden) closePicker(); });
    }
    bar.classList.remove('hidden');
    return el;
  }
  function openPicker() {
    const pop = document.getElementById('splitSetPop');
    if (!pop || !global.StudyBankPicker) return;
    pop.hidden = false;
    const c = state.choice || {};
    state.picker = StudyBankPicker.mount(document.getElementById('splitSetMount'), { idPrefix: 'paneSet', compact: true, allTypes: true, value: { bank: c.bank, form: c.form, card: c.card } });
    const sel = pop.querySelector('select'); if (sel) setTimeout(() => sel.focus(), 0);
  }
  function closePicker() {
    const pop = document.getElementById('splitSetPop');
    if (pop) pop.hidden = true;
    if (state.picker) { state.picker.destroy(); state.picker = null; }
  }
  function setText(p) {
    const t = (p && (p.testLabel || '')) || '';
    const s = (p && p.setLabel) || (p && p.bank ? String(p.bank).split('/').pop().replace('.json', '') + ' · ' + (p.form || 'A') : '');
    return t && s ? t + ' · ' + s : s || t;
  }
  function paintBar() {
    const meta = document.getElementById('splitModeMeta');
    if (meta) meta.textContent = isSpectator() ? 'Spectating' : 'Playing · ' + setText(state.choice);
    const b = document.getElementById('splitSetBtn');
    if (b) b.hidden = isSpectator();
  }

  function sortedPanes() {
    const panes = (state.session && state.session.panes) || {};
    return Object.keys(panes)
      .map((id) => Object.assign({ uid: id }, panes[id]))
      .filter((p) => p.role !== 'spectate')
      .sort((a, b) => (a.seat != null && b.seat != null ? a.seat - b.seat : String(a.displayName || '').localeCompare(b.displayName || '')))
      .slice(0, MAX_SLOTS);
  }
  function render() {
    const el = document.getElementById('multi-quiz-container');
    if (!el || !state.lobbyId) return;
    const peers = sortedPanes().filter((p) => p.uid !== state.myUid || isSpectator());
    document.body.classList.toggle('pane-has-peers', peers.length > 0);
    const keep = new Set(peers.map((p) => p.uid));
    Object.keys(state.mirrors).forEach((u) => { if (!keep.has(u)) { state.mirrors[u].stop(); delete state.mirrors[u]; const b = el.querySelector('.party-member-box[data-uid="' + u + '"]'); if (b) b.remove(); } });
    peers.forEach((p, i) => {
      let box = el.querySelector('.party-member-box[data-uid="' + p.uid + '"]');
      if (!box) {
        box = document.createElement('div');
        box.className = 'party-member-box quiz-pane party-pane';
        box.dataset.uid = p.uid;
        box.innerHTML =
          '<div class="pane-friend-header" data-anchor="pane:' + esc(p.uid) + ':head">' +
          '<span class="pane-avatar" aria-hidden="true"></span>' +
          '<div class="pane-who"><div class="pane-friend-name"></div><div class="pane-current-bank"></div></div>' +
          '<span class="pane-level"></span><span class="pane-status"></span>' +
          '<button type="button" class="pane-zoom" aria-label="Enlarge this pane" title="Enlarge">⤢</button></div>' +
          '<div class="pane-progress" aria-hidden="true"><span></span></div>' +
          '<div class="pane-mirror" data-mirror-uid="' + esc(p.uid) + '"></div>';
        box.querySelector('.pane-zoom').onclick = () => { box.classList.toggle('pane-zoomed'); const m = state.mirrors[p.uid]; if (m) setTimeout(m.refit, 30); };
        el.appendChild(box);
        state.mirrors[p.uid] = StudyMirror.mount(box.querySelector('.pane-mirror'), base() + '/mirror/' + p.uid, { empty: 'Opening ' + esc(p.displayName || 'their') + ' quiz…' });
      }
      if (box !== el.children[i]) el.insertBefore(box, el.children[i] || null);
      box.style.setProperty('--friend-hue', hueFromName(p.displayName));
      box.classList.toggle('pane-done', !!p.done);
      box.querySelector('.pane-avatar').textContent = initials(p.displayName);
      box.querySelector('.pane-friend-name').textContent = (p.displayName || '?');
      box.querySelector('.pane-level').textContent = 'LV ' + (p.level || 1);
      box.querySelector('.pane-current-bank').textContent = setText(p);
      const total = p.total | 0, at = Math.min((p.qIndex | 0) + 1, total || 1);
      box.querySelector('.pane-status').textContent = total ? at + '/' + total + (p.done ? ' · Done' : '') : '—';
      box.querySelector('.pane-progress span').style.width = (total ? Math.round(((p.answered | 0) / total) * 100) : 0) + '%';
    });
    if (global.StudyCursors && StudyCursors._place) { try { StudyCursors._place(); } catch (e) {} }
  }

  function leave(opts) {
    opts = opts || {};
    if (state.unsub) { state.unsub(); state.unsub = null; }
    if (state.pub) { state.pub.stop(); state.pub = null; }
    clearInterval(state.summaryTimer); state.summaryTimer = null;
    Object.keys(state.mirrors).forEach((u) => state.mirrors[u].stop());
    state.mirrors = {};
    closePicker();
    const wasIn = !!state.lobbyId;
    state.lobbyId = null; state.session = null; state.lobby = null; state.choice = null; state.role = 'play'; state.lastSummary = ''; state.launching = null;
    const el = document.getElementById('multi-quiz-container');
    if (el) { el.innerHTML = ''; el.className = 'hidden'; }
    const bar = document.getElementById('splitModeBar');
    if (bar) bar.classList.add('hidden');
    document.body.classList.remove('split-quiz-active', 'classic-quiz-active', 'pane-mode', 'pane-has-peers', 'pane-spectating');
    if (global.StudyCursors && StudyCursors.syncFromParty) { try { StudyCursors.syncFromParty(); } catch (e) {} }
    if (global.StudyLobby && StudyLobby.refresh) { try { StudyLobby.refresh(); } catch (e) {} }
    if (!opts.skipSets && wasIn) {
      if (global.StudyQuiz && StudyQuiz.goSets) { try { StudyQuiz.goSets(); } catch (e) {} }
      else if (typeof global.showView === 'function') global.showView('setsView');
    }
  }

  global.StudySplitQuiz = {
    joinLobbySession,
    leave,
    changeSet,
    setRole,
    getLobbyId: () => (state.session ? state.lobbyId : null),
    getSession: () => state.session,
    getChoice: () => state.choice,
    isSpectator,
    rerender: () => { if (state.session) render(); },
    setText,
    initials,
    bankKey,
    MAX_SLOTS
  };
})(window);
