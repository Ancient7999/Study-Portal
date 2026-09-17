/* Study Portal — Classic + Pane multiplayer quiz (ATC-inspired, portal-native) */
(function (global) {
  const MAX_SLOTS = 4;

  const state = {
    lobbyId: null,
    session: null,
    lobby: null,
    bank: null,
    bankPath: 'banks/medphys/pt1.json',
    questions: [],
    questionsByKey: {}, // bank|form -> questions
    form: 'A',
    unsub: null,
    myUid: null,
    focused: 0,
    gameMode: 'pane',
    role: 'play'
  };

  function toast(msg) {
    if (typeof showToast === 'function') showToast(msg, 2400);
  }

  function ensureDb() {
    if (!firebase.apps.length) firebase.initializeApp(global.FIREBASE_CONFIG);
    return firebase.database();
  }

  function uid() {
    const u = firebase.auth && firebase.auth().currentUser;
    return u ? u.uid : null;
  }

  function hueFromName(name) {
    let h = 0;
    const s = String(name || 'x');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  function bankKey(bank, form) {
    return String(bank || '') + '|' + String(form || 'A').toUpperCase();
  }

  function ensureContainer() {
    let el = document.getElementById('multi-quiz-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'multi-quiz-container';
      el.className = 'hidden';
      document.body.appendChild(el);
    }
    let bar = document.getElementById('splitModeBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'splitModeBar';
      bar.className = 'split-mode-bar hidden';
      bar.innerHTML =
        '<span class="split-mode-label" id="splitModeLabel">Party quiz</span>' +
        '<span class="split-mode-meta" id="splitModeMeta"></span>' +
        '<button type="button" class="kb-mode-btn" id="splitExitBtn">Exit</button>';
      document.body.appendChild(bar);
      bar.querySelector('#splitExitBtn').onclick = () => {
        const id = state.lobbyId;
        leave({ skipHub: false, silent: true });
        if (id && global.StudyLobby && StudyLobby.leave) {
          StudyLobby.leave(id).catch(() => {});
        }
      };
    }
    return el;
  }

  async function loadBank(path, form) {
    const key = bankKey(path, form);
    if (state.questionsByKey[key]) return state.questionsByKey[key];
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error('bank HTTP ' + res.status);
    const data = await res.json();
    const bank = data.bank || data.FORM_BANK || {};
    const qs = bank[form] || bank[String(form).toUpperCase()];
    if (!qs || !qs.length) throw new Error('Form ' + form + ' missing');
    const copy = qs.slice();
    state.questionsByKey[key] = copy;
    return copy;
  }

  async function questionsForPane(pane) {
    const path = (pane && pane.bank) || state.bankPath;
    const form = (pane && pane.form) || state.form;
    return loadBank(path, form);
  }

  function myPane() {
    if (!state.session || !state.myUid) return null;
    return (state.session.panes && state.session.panes[state.myUid]) || null;
  }

  function isSpectator() {
    const pane = myPane();
    if (pane && pane.role === 'spectate') return true;
    if (state.role === 'spectate') return true;
    return false;
  }

  async function joinLobbySession(lobbyId) {
    if (state.lobbyId === lobbyId && state.session) return;
    leave({ skipHub: true, silent: true });
    state.lobbyId = lobbyId;
    state.myUid = uid();
    const db = ensureDb();
    const snap = await db.ref('lobbies/' + lobbyId).once('value');
    const lobby = snap.val();
    if (!lobby || !lobby.session) {
      toast('Session not ready');
      state.lobbyId = null;
      return;
    }
    state.lobby = lobby;
    state.session = lobby.session;
    state.gameMode = lobby.session.gameMode === 'classic' || lobby.gameMode === 'classic' ? 'classic' : 'pane';
    state.form = lobby.session.form || lobby.form || 'A';
    state.bankPath = lobby.session.bank || lobby.bank || 'banks/medphys/pt1.json';

    const seat =
      lobby.seats &&
      Object.keys(lobby.seats)
        .map((k) => lobby.seats[k])
        .find((s) => s && s.uid === state.myUid);
    state.role = (seat && seat.role) || 'play';

    // Prefetch default + my seat bank
    state.questions = await loadBank(state.bankPath, state.form);
    if (seat && (seat.bank || seat.form)) {
      await loadBank(seat.bank || state.bankPath, seat.form || state.form);
    }
    // Prefetch all seat banks for pane spectators
    if (lobby.seats) {
      const jobs = Object.keys(lobby.seats).map((k) => {
        const s = lobby.seats[k];
        return loadBank(s.bank || state.bankPath, s.form || state.form).catch(() => null);
      });
      await Promise.all(jobs);
    }

    if (window.StudyMastery && state.role !== 'spectate') {
      const bankKeyM = StudyMastery.bankKeyFromPath(
        (seat && seat.bank) || state.bankPath
      );
      StudyMastery.beginSession(bankKeyM, (seat && seat.form) || state.form, state.questions.length);
    }

    // Ensure my pane exists (participants + spectators)
    if (state.myUid && (!lobby.session.panes || !lobby.session.panes[state.myUid])) {
      const bits =
        (StudyProfiles && StudyProfiles.getProfile && StudyProfiles.getProfile()) || {};
      const seatIdx =
        seat && lobby.seats
          ? Number(
              Object.keys(lobby.seats).find((k) => lobby.seats[k] && lobby.seats[k].uid === state.myUid)
            )
          : 0;
      await db.ref('lobbies/' + lobbyId + '/session/panes/' + state.myUid).set({
        qIndex: 0,
        selected: null,
        answers: [],
        displayName: bits.displayName || 'Scholar',
        level: bits.level || 1,
        seat: seatIdx,
        role: state.role || 'play',
        bank: (seat && seat.bank) || state.bankPath,
        form: (seat && seat.form) || state.form,
        done: false,
        score: 0,
        updatedAt: Date.now()
      });
    }

    const container = ensureContainer();
    container.classList.remove('hidden');
    container.classList.toggle('layout-stack', state.gameMode === 'pane');
    container.classList.toggle('layout-classic', state.gameMode === 'classic');
    document.getElementById('splitModeBar').classList.remove('hidden');
    document.body.classList.add('split-quiz-active');
    document.body.classList.toggle('classic-quiz-active', state.gameMode === 'classic');

    const label = document.getElementById('splitModeLabel');
    if (label) label.textContent = state.gameMode === 'classic' ? 'Classic quiz' : 'Pane quiz';
    const meta = document.getElementById('splitModeMeta');
    if (meta) meta.textContent = isSpectator() ? '· Spectating' : '· Playing';

    const quizView = document.getElementById('quizView');
    if (quizView) quizView.classList.remove('active');

    // Lobby chat continuity into quiz
    if (global.StudyChat && StudyChat.setLobbyContext && lobby.chatSessionId) {
      const mem = lobby.members && lobby.members[state.myUid];
      StudyChat.setLobbyContext({
        lobbyId: lobbyId,
        chatSessionId: lobby.session.chatSessionId || lobby.chatSessionId,
        joinedAt: (mem && mem.joinedAt) || Date.now()
      });
      StudyChat.setActivity({
        activity: 'quiz',
        quiz: { bank: state.bankPath.split('/').pop(), form: state.form },
        force: true
      });
    }

    const ref = db.ref('lobbies/' + lobbyId + '/session');
    const handler = (s) => {
      state.session = s.val();
      if (!state.session) {
        // Session wiped — others may still be in lobby; exit quiz UI
        leave({ skipHub: false });
        return;
      }
      // Sync role if changed
      const p = myPane();
      if (p && p.role) state.role = p.role;
      const metaEl = document.getElementById('splitModeMeta');
      if (metaEl) metaEl.textContent = isSpectator() ? '· Spectating' : '· Playing';
      render();
    };
    ref.on('value', handler);
    state.unsub = () => ref.off('value', handler);

    if (global.StudyCursors && StudyCursors.syncFromParty) StudyCursors.syncFromParty();
  }

  function sortedPanes() {
    const panes = (state.session && state.session.panes) || {};
    return Object.keys(panes)
      .map((id) => Object.assign({ uid: id }, panes[id]))
      .sort((a, b) =>
        a.seat != null && b.seat != null ? a.seat - b.seat : String(a.displayName || '').localeCompare(b.displayName || '')
      )
      .slice(0, MAX_SLOTS);
  }

  function render() {
    if (state.gameMode === 'classic') renderClassic();
    else renderPanes();
  }

  function renderPanes() {
    const container = ensureContainer();
    container.classList.add('layout-stack');
    container.classList.remove('layout-classic');
    const panes = sortedPanes();
    container.innerHTML = '';
    panes.forEach((pane, idx) => {
      const mine = pane.uid === state.myUid;
      const hue = hueFromName(pane.displayName);
      const qs = state.questionsByKey[bankKey(pane.bank || state.bankPath, pane.form || state.form)] || state.questions;
      const qIndex = Math.min(pane.qIndex | 0, Math.max(0, qs.length - 1));
      const q = qs[qIndex];
      const box = document.createElement('div');
      box.className =
        'party-member-box quiz-pane party-pane' +
        (mine ? ' pane-focused active' : '') +
        (pane.done ? ' pane-done' : '') +
        (pane.role === 'spectate' ? ' pane-spectate' : '');
      box.style.setProperty('--friend-hue', hue);
      box.dataset.uid = pane.uid;
      box.dataset.slot = idx;

      const status =
        (qs.length ? qIndex + 1 + '/' + qs.length : '—') +
        (pane.role === 'spectate' ? ' · spec' : pane.selected != null ? ' · locked' : '');

      box.innerHTML =
        '<div class="pane-friend-header">' +
        '<div class="pane-header-row"><span class="pane-label">' +
        (mine ? 'You' : pane.role === 'spectate' ? 'Spec' : 'Party') +
        '</span><span class="pane-status"></span></div>' +
        '<div class="pane-friend-name"></div>' +
        '<div class="pane-current-bank"></div>' +
        '</div>' +
        '<div class="pane-body"></div>';
      box.querySelector('.pane-friend-name').textContent =
        (pane.displayName || '?') + ' · LV' + (pane.level || 1);
      box.querySelector('.pane-status').textContent = status;
      const bankEl = box.querySelector('.pane-current-bank');
      if (bankEl) {
        const b = (pane.bank || state.bankPath || '').split('/').pop() || '';
        bankEl.textContent = b.replace('.json', '') + ' · ' + (pane.form || state.form);
      }

      const body = box.querySelector('.pane-body');
      const canAnswer = mine && pane.role !== 'spectate' && !isSpectator();
      if (!q) {
        body.innerHTML = '<div class="pane-question-text">No question</div>';
      } else {
        const qEl = document.createElement('div');
        qEl.className = 'pane-question-text';
        qEl.textContent = q.q || q.question || '';
        body.appendChild(qEl);
        const opts = document.createElement('div');
        opts.className = 'pane-options';
        (q.options || []).forEach((opt, oi) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'pane-opt-btn';
          btn.textContent = opt;
          if (pane.selected === oi) btn.classList.add(oi === q.correct ? 'correct' : 'wrong');
          if (canAnswer && pane.selected == null) {
            btn.addEventListener('click', () => answer(oi));
          } else {
            btn.disabled = true;
          }
          if (!mine && pane.selected === oi) btn.classList.add('ai-hover');
          opts.appendChild(btn);
        });
        body.appendChild(opts);
        if (pane.selected != null && q.explain) {
          const msg = document.createElement('div');
          msg.className = 'pane-result-msg';
          msg.textContent = (pane.selected === q.correct ? '✓ ' : '') + (q.explain || '');
          body.appendChild(msg);
        }
      }
      box.addEventListener('click', () => {
        state.focused = idx;
        container.querySelectorAll('.party-member-box').forEach((el, i) => {
          el.classList.toggle('pane-focused', i === idx);
        });
      });
      container.appendChild(box);
    });
  }

  function renderClassic() {
    const container = ensureContainer();
    container.classList.remove('layout-stack');
    container.classList.add('layout-classic');
    const panes = sortedPanes();
    const mine = myPane();
    const focusPane =
      mine ||
      panes[state.focused] ||
      panes[0] ||
      null;
    const qs = focusPane
      ? state.questionsByKey[bankKey(focusPane.bank || state.bankPath, focusPane.form || state.form)] ||
        state.questions
      : state.questions;
    const qIndex = focusPane ? Math.min(focusPane.qIndex | 0, Math.max(0, qs.length - 1)) : 0;
    const q = qs[qIndex];
    const canAnswer =
      focusPane &&
      focusPane.uid === state.myUid &&
      focusPane.role !== 'spectate' &&
      !isSpectator();

    let roster =
      '<div class="classic-roster">' +
      panes
        .map((p, i) => {
          const pqs =
            state.questionsByKey[bankKey(p.bank || state.bankPath, p.form || state.form)] || state.questions;
          const done = p.done ? ' done' : '';
          const active = focusPane && p.uid === focusPane.uid ? ' active' : '';
          return (
            '<button type="button" class="classic-roster-chip' +
            done +
            active +
            '" data-focus="' +
            i +
            '">' +
            (p.displayName || '?') +
            (p.role === 'spectate' ? ' · spec' : '') +
            '<em>' +
            ((p.qIndex | 0) + 1) +
            '/' +
            (pqs.length || '?') +
            (p.score != null ? ' · ' + (p.score | 0) : '') +
            '</em></button>'
          );
        })
        .join('') +
      '</div>';

    let bodyHtml = '';
    if (!q) {
      bodyHtml = '<div class="pane-question-text">Waiting for questions…</div>';
    } else {
      bodyHtml =
        '<div class="classic-q-meta">' +
        (focusPane && focusPane.uid === state.myUid ? 'Your question' : 'Watching ' + (focusPane.displayName || '')) +
        ' · ' +
        (qIndex + 1) +
        '/' +
        qs.length +
        '</div>' +
        '<div class="pane-question-text classic-q-text"></div>' +
        '<div class="pane-options classic-options" id="classicOptions"></div>';
    }

    container.innerHTML =
      '<div class="classic-shell">' +
      roster +
      '<div class="classic-main quiz-pane party-pane">' +
      bodyHtml +
      '</div></div>';

    const qText = container.querySelector('.classic-q-text');
    if (qText && q) qText.textContent = q.q || q.question || '';

    const opts = container.querySelector('#classicOptions');
    if (opts && q) {
      (q.options || []).forEach((opt, oi) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pane-opt-btn';
        btn.textContent = opt;
        if (focusPane && focusPane.selected === oi) {
          btn.classList.add(oi === q.correct ? 'correct' : 'wrong');
        }
        if (canAnswer && focusPane.selected == null) {
          btn.addEventListener('click', () => answer(oi));
        } else {
          btn.disabled = true;
        }
        opts.appendChild(btn);
      });
      if (focusPane && focusPane.selected != null && q.explain) {
        const msg = document.createElement('div');
        msg.className = 'pane-result-msg';
        msg.textContent = (focusPane.selected === q.correct ? '✓ ' : '') + (q.explain || '');
        opts.parentNode.appendChild(msg);
      }
    }

    container.querySelectorAll('[data-focus]').forEach((chip) => {
      chip.onclick = () => {
        state.focused = Number(chip.dataset.focus);
        render();
      };
    });
  }

  async function answer(optIdx) {
    if (!state.lobbyId || !state.myUid || !state.session) return;
    if (isSpectator()) {
      toast('Spectating — answers disabled');
      return;
    }
    const pane = state.session.panes && state.session.panes[state.myUid];
    if (!pane || pane.selected != null || pane.role === 'spectate') return;
    const qs =
      state.questionsByKey[bankKey(pane.bank || state.bankPath, pane.form || state.form)] ||
      state.questions;
    const qIndex = pane.qIndex | 0;
    const q = qs[qIndex];
    if (!q) return;

    if (optIdx !== q.correct) {
      if (window.StudyAchievements && typeof StudyAchievements.recordWrong === 'function') {
        StudyAchievements.recordWrong();
      }
      toast('not that one · try again');
      return;
    }

    const answers = (pane.answers || []).slice();
    answers[qIndex] = optIdx;
    const done = qIndex >= qs.length - 1;
    const nextIndex = done ? qIndex : qIndex + 1;
    const score = (pane.score | 0) + 1;
    const patch = {
      selected: done ? optIdx : null,
      answers: answers,
      qIndex: done ? qIndex : nextIndex,
      done: done,
      score: score,
      updatedAt: Date.now()
    };

    if (!done) {
      await ensureDb()
        .ref('lobbies/' + state.lobbyId + '/session/panes/' + state.myUid)
        .update({ selected: optIdx, answers: answers, score: score, updatedAt: Date.now() });
      setTimeout(() => {
        ensureDb()
          .ref('lobbies/' + state.lobbyId + '/session/panes/' + state.myUid)
          .update({ selected: null, qIndex: nextIndex, updatedAt: Date.now() });
      }, 450);
    } else {
      await ensureDb()
        .ref('lobbies/' + state.lobbyId + '/session/panes/' + state.myUid)
        .update(patch);
      toast('Pane complete');
    }

    if (window.StudyMastery) {
      const bk = StudyMastery.bankKeyFromPath(pane.bank || state.bankPath);
      const form = pane.form || state.form;
      StudyMastery.recordClear(bk, form, qIndex, qs.length);
      const pct = StudyMastery.getPct(bk, form);
      if (typeof setBestPct === 'function' && typeof setRunPct === 'function') {
        setBestPct(form, pct);
        setRunPct(form, pct);
      } else {
        try {
          const bestKey = 'pt1_form_' + form + '_best_pct';
          const runKey = 'pt1_form_' + form + '_run_pct';
          const existingBest = parseInt(localStorage.getItem(bestKey) || '0', 10) || 0;
          const nextPct = Math.round(pct);
          localStorage.setItem(bestKey, String(Math.max(existingBest, nextPct)));
          localStorage.setItem(runKey, String(nextPct));
        } catch (e) {}
      }
      if (pct >= 100) {
        try {
          localStorage.setItem('pt1_form_' + form + '_done', '1');
        } catch (e) {}
      }
      if (typeof StudyMastery.updateProgressBar === 'function') StudyMastery.updateProgressBar();
      if (window.StudyAchievements && typeof StudyAchievements.recordFormMastery === 'function' && pct >= 100) {
        StudyAchievements.recordFormMastery(form, bk);
      }
      refreshHub();
    }
    if (window.StudyProfiles) StudyProfiles.bumpQuestionsAnswered(1);
    if (window.StudyAchievements && typeof StudyAchievements.recordCorrect === 'function') {
      StudyAchievements.recordCorrect();
    }
  }

  function refreshHub() {
    if (typeof renderForms === 'function') renderForms();
    else if (typeof buildFormCards === 'function') buildFormCards();
    else if (typeof refreshHubCards === 'function') refreshHubCards();
  }

  function leave(opts) {
    opts = opts || {};
    const lobbyId = state.lobbyId;
    if (state.unsub) {
      state.unsub();
      state.unsub = null;
    }
    state.lobbyId = null;
    state.session = null;
    state.lobby = null;
    state.bankPath = 'banks/medphys/pt1.json';
    state.questionsByKey = {};
    state.gameMode = 'pane';
    state.role = 'play';

    const container = document.getElementById('multi-quiz-container');
    if (container) {
      container.classList.add('hidden');
      container.classList.remove('layout-stack', 'layout-classic');
      container.innerHTML = '';
    }
    const bar = document.getElementById('splitModeBar');
    if (bar) bar.classList.add('hidden');
    document.body.classList.remove('split-quiz-active', 'classic-quiz-active');
    if (global.StudyMastery && typeof StudyMastery.endSession === 'function') {
      try {
        StudyMastery.endSession();
      } catch (e) {}
    }
    refreshHub();

    if (!opts.skipHub) {
      if (typeof goHub === 'function') goHub();
      else if (typeof showView === 'function') showView('hubView');
      else {
        document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
        const hub = document.getElementById('hubView');
        if (hub) hub.classList.add('active');
      }
    }
  }

  global.StudySplitQuiz = {
    joinLobbySession,
    leave,
    MAX_SLOTS
  };
})(window);
