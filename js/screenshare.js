/* Study Portal — Screen share for parties and lobbies (RTDB)
   One shared session node is the source of truth:
     parties/{id}/session   (party share)   or   lobbies/{id}/share   (lobby share)
     { controllerUid, controllerName, sharedBy, sharedByName, bank, form, seed,
       currentIndex, answers:{qid:origOption}, progress:{solved,correct,total}, updatedAt }
   Only the controller writes it (control changes and answers go through transactions).
   Everyone else mirrors it; their own local run is saved and its clock paused meanwhile.
   Heartbeats live beside it at .../shareBeat/{uid}. If the controller stops beating, the leader
   takes control back; if the sharer stops beating or leaves, the share ends. */
(function (global) {
  const BEAT_MS = 5000;
  const CONTROLLER_STALE_MS = 15000;
  const SHARER_STALE_MS = 30000;
  const RULES_MSG = 'Screen share needs the updated database rules — ask the site owner to publish them.';

  const state = {
    group: null, // {kind,id,base,sessionPath,leader,members}
    session: null,
    unsub: null,
    beats: {},
    unsubBeats: null,
    questions: null,
    questionsKey: '',
    beatTimer: null,
    pollTimer: null,
    following: false,
    ctlHook: null,
    lastError: ''
  };

  function toast(msg) {
    if (global.StudyChat && StudyChat.toast) StudyChat.toast(msg);
    else if (typeof global.showToast === 'function') global.showToast(msg);
    else console.warn(msg);
  }
  function db() {
    return firebase.database();
  }
  function uid() {
    try {
      const u = firebase.auth && firebase.auth().currentUser;
      return u ? u.uid : null;
    } catch (e) {
      return null;
    }
  }
  function myName() {
    const p = global.StudyProfiles && StudyProfiles.getProfile && StudyProfiles.getProfile();
    return String((p && p.displayName) || 'Scholar').slice(0, 40);
  }
  function isPermission(e) {
    const s = String((e && (e.code || e.message)) || e || '');
    return /permission|PERMISSION_DENIED/i.test(s);
  }
  function fail(e, what) {
    const msg = isPermission(e) ? RULES_MSG : (what || 'Screen share') + ' failed' + (e && e.message ? ': ' + e.message : '');
    state.lastError = msg;
    toast(msg);
    return msg;
  }

  /* —— group (party first, else the active lobby) —— */
  function currentGroup() {
    try {
      const P = global.StudyParty;
      const pid = P && P.getPartyId && P.getPartyId();
      const party = pid && P.getParty && P.getParty();
      if (pid && party) {
        return { kind: 'party', id: pid, base: 'parties/' + pid, sessionPath: 'parties/' + pid + '/session', leader: party.leader, members: party.members || {} };
      }
    } catch (e) {}
    try {
      const L = global.StudyLobby;
      const lid = L && L.getActiveLobbyId && L.getActiveLobbyId();
      const lobby = lid && L.getActiveLobby && L.getActiveLobby();
      if (lid && lobby && lobby.members && lobby.members[uid()]) {
        return { kind: 'lobby', id: lid, base: 'lobbies/' + lid, sessionPath: 'lobbies/' + lid + '/share', leader: lobby.leader, members: lobby.members || {}, settings: lobby.settings || null };
      }
    } catch (e) {}
    return null;
  }
  function memberName(g, id) {
    if (!g || !id) return '';
    const m = g.members && g.members[id];
    if (m && m.displayName) return m.displayName;
    if (id === uid()) return myName();
    return 'Member';
  }

  /* —— seeded order —— */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    let h = 2166136261;
    s = String(s);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function seededShuffle(arr, seed) {
    const a = arr.slice();
    const rnd = mulberry32(seed >>> 0);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }
  /* questions in the shared order, each with its shared option order (perm[i] = original index) */
  function orderQuestions(qs, seed) {
    return seededShuffle(qs, seed).map((q) => {
      const perm = seededShuffle(q.options.map((_, i) => i), (seed ^ hashStr(q.__id)) >>> 0);
      return Object.assign({}, q, { __perm: perm });
    });
  }

  /* bank + form, optionally narrowed to one Practice set card (js/study-sets.js) */
  const bankCache = {};
  async function loadBank(path, form, card) {
    const key = path + '|' + form + (card ? '|' + card : '');
    if (bankCache[key]) return bankCache[key];
    let qs = null;
    if (global.StudySets) {
      const data = await StudySets.fetchData(path);
      let material = null;
      if (card && global.StudyBankPicker && StudyBankPicker.loadCatalog) {
        try {
          material = StudySets.materialForBank(await StudyBankPicker.loadCatalog(), path);
        } catch (e) {}
      }
      qs = StudySets.poolFor(data, form, card, material);
    } else {
      const res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) throw new Error('bank HTTP ' + res.status);
      const data = await res.json();
      const bank = data.bank || data.FORM_BANK || {};
      qs = bank[form] || bank[String(form).toUpperCase()];
      if (!qs || !qs.length) {
        const first = (data.forms && data.forms[0]) || Object.keys(bank)[0];
        qs = first ? bank[first] : null;
      }
    }
    if (!qs || !qs.length) throw new Error('Set ' + (card || form) + ' missing');
    // like the party quiz: plain multiple choice only
    const out = qs
      .map((q, i) => Object.assign({}, q, { __id: q.id != null ? String(q.id) : 'q_' + (q.__pos != null ? q.__pos : i) }))
      .filter((q) => (!q.type || q.type === 'mcq') && !q.steps && !q.correct_pairs && Array.isArray(q.options) && typeof q.correct === 'number');
    if (!out.length) throw new Error('No multiple-choice questions in this set');
    bankCache[key] = out;
    return out;
  }
  /* the set card of a share lives beside it at {group}/shareSet = {card, label, seed};
     it only counts while its seed matches the share's seed */
  function cardOf(s, shareSet) {
    return shareSet && s && shareSet.seed === s.seed && shareSet.card ? String(shareSet.card) : null;
  }
  async function shareSetOf(g) {
    if (!g) return null;
    try {
      return (await db().ref(g.base + '/shareSet').once('value')).val();
    } catch (e) {
      return null;
    }
  }
  async function sharedQuestions(s) {
    const set = await shareSetOf(state.group);
    const card = cardOf(s, set);
    const key = s.bank + '|' + s.form + '|' + s.seed + (card ? '|' + card : '');
    if (state.questionsKey === key && state.questions) return state.questions;
    const qs = orderQuestions(await loadBank(s.bank, s.form, card), s.seed);
    state.questions = qs;
    state.questionsKey = key;
    state.setLabel = (card && set && set.label) || '';
    return qs;
  }
  function progressOf(qs, answers) {
    let solved = 0, correct = 0;
    qs.forEach((q) => {
      const a = answers && answers[safeKey(q.__id)];
      if (a == null) return;
      solved++;
      if (a === q.correct) correct++;
    });
    return { solved, correct, total: qs.length };
  }
  function safeKey(id) {
    return String(id).replace(/[.#$\[\]\/]/g, '_');
  }

  /* —— writes —— */
  function sessionRef(g) {
    return db().ref((g || state.group).sessionPath);
  }
  async function start(opts) {
    opts = opts || {};
    const g = currentGroup();
    const me = uid();
    if (!g || !me) throw new Error('Join a party or lobby first');
    if (g.leader !== me) throw new Error('Only the leader can start a screen share');
    if (g.kind === 'lobby' && g.settings && g.settings.share === false) throw new Error('Screen share is off for this lobby');
    const bank = opts.bank || 'banks/medphys/pt1.json';
    const form = opts.form || 'A';
    const card = opts.card || null;
    const qs = await loadBank(bank, form, card);
    const seed = opts.seed != null ? opts.seed >>> 0 : Math.floor(Math.random() * 4294967295);
    const now = Date.now();
    const rec = {
      controllerUid: me,
      controllerName: myName(),
      sharedBy: me,
      sharedByName: myName(),
      bank: bank,
      form: form,
      seed: seed,
      currentIndex: 0,
      answers: {},
      progress: { solved: 0, correct: 0, total: qs.length },
      updatedAt: now
    };
    const ref = sessionRef(g);
    try {
      await ref.remove();
      // the Practice set card travels beside the share (the share node keeps its fixed fields)
      await db().ref(g.base + '/shareSet').set(card ? { card: String(card), label: String(opts.label || '').slice(0, 120), seed: seed } : null);
      await ref.set(rec);
      await ref.onDisconnect().remove();
      await db().ref(g.base + '/shareBeat/' + me).set(now);
    } catch (e) {
      throw new Error(fail(e, 'Starting the share'));
    }
    state.group = g;
    listen(g);
    return rec;
  }
  async function stop() {
    const g = state.group || currentGroup();
    if (!g) return;
    const me = uid();
    const s = state.session;
    if (s && s.sharedBy !== me && g.leader !== me) throw new Error('Only the sharer can end the share');
    try {
      await sessionRef(g).remove();
    } catch (e) {
      fail(e, 'Ending the share');
    }
  }
  /* leader: hand control to one member (or back to the leader) — transaction */
  async function setController(target) {
    const g = state.group;
    const me = uid();
    if (!g || g.leader !== me) throw new Error('Only the leader can hand over control');
    if (target !== g.leader && !(g.members && g.members[target])) throw new Error('Not a member');
    try {
      const res = await sessionRef(g).transaction((cur) => {
        if (!cur) return; // abort: no share
        if (cur.controllerUid === target) return; // already
        cur.controllerUid = target;
        cur.controllerName = memberName(g, target);
        cur.updatedAt = Date.now();
        return cur;
      });
      return res && res.committed;
    } catch (e) {
      throw new Error(fail(e, 'Handing over control'));
    }
  }
  function canControl() {
    const s = state.session;
    return !!(s && uid() && s.controllerUid === uid());
  }
  async function mutate(fn) {
    const me = uid();
    if (!canControl()) return false;
    try {
      const res = await sessionRef().transaction((cur) => {
        if (!cur || cur.controllerUid !== me) return; // lost control meanwhile
        fn(cur);
        cur.updatedAt = Date.now();
        return cur;
      });
      return !!(res && res.committed);
    } catch (e) {
      fail(e, 'Screen share');
      return false;
    }
  }
  async function answer(origIdx) {
    const s = state.session;
    if (!s || !canControl()) return false;
    const qs = await sharedQuestions(s);
    const q = qs[s.currentIndex];
    if (!q) return false;
    return mutate((cur) => {
      cur.answers = cur.answers || {};
      if (cur.answers[safeKey(q.__id)] != null) return;
      cur.answers[safeKey(q.__id)] = origIdx;
      cur.progress = progressOf(qs, cur.answers);
    });
  }
  async function go(index) {
    const s = state.session;
    if (!s || !canControl()) return false;
    const qs = await sharedQuestions(s);
    const i = Math.max(0, Math.min(qs.length - 1, index | 0));
    return mutate((cur) => {
      cur.currentIndex = i;
    });
  }

  /* —— heartbeat, fallback, end —— */
  function beat() {
    const g = state.group, me = uid();
    if (!g || !me || !state.session) return;
    db().ref(g.base + '/shareBeat/' + me).set(Date.now()).catch(() => {});
    checkLiveness();
  }
  function checkLiveness(nowArg) {
    const g = state.group, s = state.session, me = uid();
    if (!g || !s || !me) return;
    const now = nowArg || Date.now();
    const seen = (id) => (id === me ? now : Math.max(state.beats[id] || 0, state.listenSince || 0));
    // sharer gone → the share ends
    if (now - seen(s.sharedBy) > SHARER_STALE_MS) {
      if (me === g.leader || me === s.controllerUid) sessionRef(g).remove().catch(() => {});
      endLocal('The screen share ended (sharer disconnected).');
      return;
    }
    // controller gone → control returns to the leader
    if (me === g.leader && s.controllerUid !== g.leader && now - seen(s.controllerUid) > CONTROLLER_STALE_MS) {
      const lost = s.controllerUid;
      sessionRef(g)
        .transaction((cur) => {
          if (!cur || cur.controllerUid !== lost) return;
          cur.controllerUid = g.leader;
          cur.controllerName = memberName(g, g.leader);
          cur.updatedAt = Date.now();
          return cur;
        })
        .catch((e) => fail(e, 'Taking control back'));
    }
  }
  /* controller registers a server-side fallback: on disconnect, control goes to the leader */
  function syncControllerHook() {
    const g = state.group, s = state.session, me = uid();
    const want = !!(g && s && me && s.controllerUid === me && me !== g.leader);
    if (want && !state.ctlHook) {
      const r = sessionRef(g).child('controllerUid');
      state.ctlHook = r;
      try {
        r.onDisconnect().set(g.leader).catch(() => {});
      } catch (e) {}
    } else if (!want && state.ctlHook) {
      try {
        state.ctlHook.onDisconnect().cancel().catch(() => {});
      } catch (e) {}
      state.ctlHook = null;
    }
  }

  /* —— following: pause and save the local run —— */
  function setFollowing(on) {
    if (on === state.following) return;
    state.following = on;
    document.body.classList.toggle('share-following', on);
    try {
      if (on) {
        if (typeof global.saveRunState === 'function' && global.StudyQuiz && StudyQuiz.active) global.saveRunState();
        if (typeof global.pauseElapsedClock === 'function') global.pauseElapsedClock();
      } else if (typeof global.resumeElapsedClock === 'function') global.resumeElapsedClock();
    } catch (e) {}
  }
  function endLocal(msg) {
    const had = !!state.session;
    state.session = null;
    setFollowing(false);
    syncControllerHook();
    renderView();
    if (had && msg) toast(msg);
  }

  /* —— listening —— */
  function listen(g) {
    if (state.unsub && state.group && g && state.group.sessionPath === g.sessionPath) return;
    unlisten();
    state.group = g;
    if (!g) return;
    state.listenSince = Date.now();
    const ref = db().ref(g.sessionPath);
    const onVal = (snap) => {
      const s = snap.val();
      if (!s) return endLocal(state.session ? 'The screen share ended.' : '');
      state.session = s;
      setFollowing(true);
      syncControllerHook();
      renderView();
    };
    const onErr = (e) => {
      fail(e, 'Screen share');
    };
    ref.on('value', onVal, onErr);
    const bref = db().ref(g.base + '/shareBeat');
    const onBeat = (snap) => {
      state.beats = snap.val() || {};
    };
    bref.on('value', onBeat, () => {});
    state.unsub = () => {
      ref.off('value', onVal);
      bref.off('value', onBeat);
    };
  }
  function unlisten() {
    if (state.unsub) state.unsub();
    state.unsub = null;
    if (state.session) endLocal('');
    state.group = null;
  }
  function sync() {
    const g = currentGroup();
    const prev = state.group;
    if (prev && (!g || g.sessionPath !== prev.sessionPath)) {
      // left the party / lobby: a sharer ends the share cleanly
      if (state.session && state.session.sharedBy === uid()) {
        try {
          db().ref(prev.sessionPath).remove().catch(() => {});
        } catch (e) {}
      }
      unlisten();
    }
    if (g) {
      if (state.group) state.group.leader = g.leader, (state.group.members = g.members), (state.group.settings = g.settings);
      listen(g);
    }
  }

  /* —— rendering —— */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  /* read-only or interactive mirror of a session into el */
  async function renderMirror(s, el, opts) {
    opts = opts || {};
    const qs = await (opts.questions ? Promise.resolve(opts.questions) : orderQuestions(await loadBank(s.bank, s.form, cardOf(s, opts.shareSet)), s.seed));
    const i = Math.max(0, Math.min(qs.length - 1, s.currentIndex | 0));
    const q = qs[i];
    const ans = s.answers && s.answers[safeKey(q.__id)];
    const pre = opts.anchorPrefix || 'share';
    let h =
      '<div class="share-qhead">Question ' + (i + 1) + ' / ' + qs.length +
      ' · solved ' + ((s.progress && s.progress.solved) || 0) + '</div>' +
      '<div class="question share-stem" data-anchor="' + pre + ':q:' + esc(q.__id) + ':stem">' + esc(q.q) + '</div><div class="options share-options">';
    q.__perm.forEach((orig, k) => {
      const cls = ['opt'];
      if (ans != null) {
        if (orig === q.correct) cls.push('correct');
        else if (orig === ans) cls.push('wrong');
      }
      h +=
        '<button type="button" class="' + cls.join(' ') + '" data-orig="' + orig + '" data-key="' + String.fromCharCode(65 + k) +
        '" data-anchor="' + pre + ':q:' + esc(q.__id) + ':opt:' + orig + '"' + (opts.interactive && ans == null ? '' : ' disabled') + '>' +
        esc(q.options[orig]) + '</button>';
    });
    h += '</div>';
    el.innerHTML = h;
    return { q, index: i, total: qs.length };
  }
  function ensureView() {
    let v = document.getElementById('shareView');
    if (v) return v;
    v = document.createElement('div');
    v.id = 'shareView';
    v.className = 'share-view';
    v.hidden = true;
    v.innerHTML =
      '<div class="share-bar"><span class="share-badge" id="shareBadge"></span><span class="share-ctl" id="shareCtl"></span>' +
      '<button type="button" class="chat-tool-btn danger" id="shareStopBtn" hidden>End share</button></div>' +
      '<div class="share-body" id="shareBody"></div>' +
      '<div class="share-nav"><button type="button" class="nav-btn" id="sharePrev">← Back</button>' +
      '<span class="share-lock" id="shareLock"></span><button type="button" class="nav-btn" id="shareNext">Next →</button></div>';
    document.body.appendChild(v);
    v.querySelector('#shareStopBtn').onclick = () => stop().catch((e) => toast(e.message));
    v.querySelector('#sharePrev').onclick = () => state.session && go((state.session.currentIndex | 0) - 1);
    v.querySelector('#shareNext').onclick = () => state.session && go((state.session.currentIndex | 0) + 1);
    v.querySelector('#shareBody').addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('.opt[data-orig]');
      if (!b) return;
      if (!canControl()) return; // click lock: only the controller answers
      answer(Number(b.dataset.orig));
    });
    return v;
  }
  let renderSeq = 0;
  async function renderView() {
    const v = ensureView();
    const s = state.session;
    if (!s) {
      v.hidden = true;
      document.body.classList.remove('share-active');
      return;
    }
    v.hidden = false;
    document.body.classList.add('share-active');
    const me = uid();
    const ctl = canControl();
    v.querySelector('#shareBadge').textContent = 'Screen Share of ' + (s.sharedByName || memberName(state.group, s.sharedBy));
    v.querySelector('#shareCtl').textContent = '· Control: ' + (s.controllerUid === me ? 'you' : s.controllerName || memberName(state.group, s.controllerUid));
    v.querySelector('#shareStopBtn').hidden = !(me && (me === s.sharedBy || (state.group && me === state.group.leader)));
    v.querySelector('#shareLock').textContent = ctl ? '' : 'Only ' + (s.controllerName || 'the controller') + ' can click';
    v.querySelector('#sharePrev').disabled = !ctl;
    v.querySelector('#shareNext').disabled = !ctl;
    v.classList.toggle('share-locked', !ctl);
    const seq = ++renderSeq;
    try {
      const qs = await sharedQuestions(s);
      if (seq !== renderSeq) return;
      await renderMirror(s, v.querySelector('#shareBody'), { questions: qs, interactive: ctl });
    } catch (e) {
      v.querySelector('#shareBody').textContent = 'Could not load the shared set: ' + (e.message || e);
    }
  }

  function init() {
    state.pollTimer = setInterval(sync, 1500);
    state.beatTimer = setInterval(beat, BEAT_MS);
    setTimeout(sync, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.StudyShare = {
    start,
    stop,
    setController,
    answer,
    go,
    sync,
    canControl,
    getSession: () => state.session,
    getGroup: () => state.group,
    currentGroup,
    isFollowing: () => state.following,
    renderMirror,
    orderQuestions,
    seededShuffle,
    loadBank,
    cardOf,
    getSetLabel: () => state.setLabel || '',
    isPermission,
    RULES_MSG,
    _check: checkLiveness,
    _beat: beat
  };
})(window);
