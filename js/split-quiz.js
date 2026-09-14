/* Study Portal — 1–2–3–4 party split quiz (ATC layout-stack) */
(function (global) {
  const MAX_SLOTS = 4;
  const state = {
    lobbyId: null,
    session: null,
    bank: null,
    questions: [],
    form: 'A',
    unsub: null,
    myUid: null,
    focused: 0
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

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function ensureContainer() {
    let el = document.getElementById('multi-quiz-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'multi-quiz-container';
      el.className = 'hidden';
      document.body.appendChild(el);
    }
    // Mode selector bar
    let bar = document.getElementById('splitModeBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'splitModeBar';
      bar.className = 'split-mode-bar hidden';
      bar.innerHTML =
        '<span class="split-mode-label">Party quiz</span>' +
        '<button type="button" class="kb-mode-btn" data-slots="1">1</button>' +
        '<button type="button" class="kb-mode-btn" data-slots="2">2</button>' +
        '<button type="button" class="kb-mode-btn" data-slots="3">3</button>' +
        '<button type="button" class="kb-mode-btn" data-slots="4">4 Party Members</button>' +
        '<button type="button" class="kb-mode-btn" id="splitExitBtn">Exit</button>';
      document.body.appendChild(bar);
      bar.querySelector('#splitExitBtn').onclick = leave;
    }
    return el;
  }

  async function loadBank(path, form) {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error('bank HTTP ' + res.status);
    const data = await res.json();
    const bank = data.bank || data.FORM_BANK || {};
    const qs = bank[form] || bank[String(form).toUpperCase()];
    if (!qs || !qs.length) throw new Error('Form ' + form + ' missing');
    return qs.slice();
  }

  async function joinLobbySession(lobbyId) {
    if (state.lobbyId === lobbyId && state.session) return;
    leave();
    state.lobbyId = lobbyId;
    state.myUid = uid();
    const db = ensureDb();
    const snap = await db.ref('lobbies/' + lobbyId).once('value');
    const lobby = snap.val();
    if (!lobby || !lobby.session) {
      toast('Session not ready');
      return;
    }
    state.form = lobby.session.form || lobby.form || 'A';
    const bankPath = lobby.session.bank || lobby.bank || 'banks/medphys/pt1.json';
    state.questions = await loadBank(bankPath, state.form);
    state.session = lobby.session;

    // Ensure my pane exists
    if (state.myUid && (!lobby.session.panes || !lobby.session.panes[state.myUid])) {
      const bits =
        (StudyProfiles && StudyProfiles.getProfile && StudyProfiles.getProfile()) || {};
      await db.ref('lobbies/' + lobbyId + '/session/panes/' + state.myUid).set({
        qIndex: 0,
        selected: null,
        answers: [],
        displayName: bits.displayName || 'Scholar',
        level: bits.level || 1,
        updatedAt: Date.now()
      });
    }

    const container = ensureContainer();
    container.classList.remove('hidden');
    container.classList.add('layout-stack');
    document.getElementById('splitModeBar').classList.remove('hidden');
    document.body.classList.add('split-quiz-active');

    // Hide normal quiz view conflict
    const quizView = document.getElementById('quizView');
    if (quizView) quizView.classList.remove('active');

    const ref = db.ref('lobbies/' + lobbyId + '/session');
    const handler = (s) => {
      state.session = s.val();
      if (!state.session) return;
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
      .sort((a, b) => (a.seat != null && b.seat != null ? a.seat - b.seat : a.displayName.localeCompare(b.displayName)))
      .slice(0, MAX_SLOTS);
  }

  function render() {
    const container = ensureContainer();
    const panes = sortedPanes();
    const bar = document.getElementById('splitModeBar');
    if (bar) {
      bar.querySelectorAll('.kb-mode-btn[data-slots]').forEach((btn) => {
        btn.classList.toggle('active', Number(btn.dataset.slots) === panes.length);
      });
    }
    container.innerHTML = '';
    panes.forEach((pane, idx) => {
      const mine = pane.uid === state.myUid;
      const hue = hueFromName(pane.displayName);
      const qIndex = Math.min(pane.qIndex | 0, state.questions.length - 1);
      const q = state.questions[qIndex];
      const box = document.createElement('div');
      box.className =
        'party-member-box quiz-pane party-pane' +
        (mine ? ' pane-focused active' : '') +
        (pane.done ? ' pane-done' : '');
      box.style.setProperty('--friend-hue', hue);
      box.dataset.uid = pane.uid;
      box.dataset.slot = idx;

      const status =
        qIndex + 1 + '/' + state.questions.length + (pane.selected != null ? ' · locked' : '');
      box.innerHTML =
        '<div class="pane-friend-header">' +
        '<div class="pane-header-row"><span class="pane-label">' +
        (mine ? 'You' : 'Party') +
        '</span><span class="pane-status"></span></div>' +
        '<div class="pane-friend-name"></div>' +
        '</div>' +
        '<div class="pane-body"></div>';
      box.querySelector('.pane-friend-name').textContent =
        (pane.displayName || '?') + ' · LV' + (pane.level || 1);
      box.querySelector('.pane-status').textContent = status;

      const body = box.querySelector('.pane-body');
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
          if (mine && pane.selected == null) {
            btn.addEventListener('click', () => answer(oi));
          } else {
            btn.disabled = true;
          }
          // Show remote selection highlight
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

  async function answer(optIdx) {
    if (!state.lobbyId || !state.myUid || !state.session) return;
    const pane = state.session.panes && state.session.panes[state.myUid];
    if (!pane || pane.selected != null) return;
    const qIndex = pane.qIndex | 0;
    const q = state.questions[qIndex];
    if (!q) return;

    // Refuse wrong locally (match solo flow)
    if (optIdx !== q.correct) {
      if (window.StudyAchievements && typeof StudyAchievements.recordWrong === 'function') {
        StudyAchievements.recordWrong();
      }
      toast('not that one · try again');
      return;
    }

    const answers = (pane.answers || []).slice();
    answers[qIndex] = optIdx;
    const done = qIndex >= state.questions.length - 1;
    const nextIndex = done ? qIndex : qIndex + 1;
    const patch = {
      selected: done ? optIdx : null,
      answers: answers,
      qIndex: done ? qIndex : nextIndex,
      done: done,
      updatedAt: Date.now()
    };
    // When advancing, clear selected for next Q
    if (!done) {
      patch.selected = null;
      // Briefly show correct then advance — write selected first then advance
      await ensureDb()
        .ref('lobbies/' + state.lobbyId + '/session/panes/' + state.myUid)
        .update({ selected: optIdx, answers: answers, updatedAt: Date.now() });
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

    // Mastery clear for own pane
    if (window.StudyMastery && state.session.bank) {
      const bk = StudyMastery.bankKeyFromPath(state.session.bank);
      StudyMastery.recordClear(bk, state.form, qIndex, state.questions.length);
      if (window.StudyAchievements && typeof StudyAchievements.recordFormMastery === 'function') {
        const pct = StudyMastery.getPct(bk, state.form);
        if (pct >= 100) StudyAchievements.recordFormMastery(state.form, bk);
      }
    }
    if (window.StudyProfiles) StudyProfiles.bumpQuestionsAnswered(1);
    if (window.StudyAchievements && typeof StudyAchievements.recordCorrect === 'function') {
      StudyAchievements.recordCorrect();
    }
  }

  function leave() {
    if (state.unsub) {
      state.unsub();
      state.unsub = null;
    }
    state.lobbyId = null;
    state.session = null;
    const container = document.getElementById('multi-quiz-container');
    if (container) {
      container.classList.add('hidden');
      container.classList.remove('layout-stack');
      container.innerHTML = '';
    }
    const bar = document.getElementById('splitModeBar');
    if (bar) bar.classList.add('hidden');
    document.body.classList.remove('split-quiz-active');
  }

  global.StudySplitQuiz = {
    joinLobbySession,
    leave,
    MAX_SLOTS
  };
})(window);
