/* Study Portal — Live party cursors (RTDB, ATC aura aesthetic, layout-anchored positions) */
(function (global) {
  const THROTTLE_MS = 80;
  let unsub = null;
  let lastWrite = 0;
  let partyId = null; // the live channel: 'parties/<id>' or 'lobbies/<id>' (cursors live under <channel>/cursors)
  const els = {}; // uid -> DOM

  function ensureDb() {
    if (!global.firebase || !firebase.apps.length) {
      if (!global.FIREBASE_CONFIG) throw new Error('FIREBASE_CONFIG missing');
      firebase.initializeApp(global.FIREBASE_CONFIG);
    }
    return firebase.database();
  }

  function uid() {
    const u = firebase.auth && firebase.auth().currentUser;
    return u ? u.uid : null;
  }

  /* Mood theme → hue (matches html.mood-* palette accents) */
  const MOOD_HUE = {
    'mood-happy': 42,
    'mood-neutral': 217,
    'mood-calm': 160,
    'mood-fierce': 28,
    'mood-mad': 0,
    'mood-sad': 200,
    'mood-crying': 240,
    'mood-sleepy': 250
  };

  function hueFromName(name) {
    let h = 0;
    const s = String(name || 'x');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  function currentMoodMeta() {
    const html = document.documentElement;
    let cls = 'mood-neutral';
    Object.keys(MOOD_HUE).forEach((c) => {
      if (html.classList.contains(c)) cls = c;
    });
    let emoji = '😊';
    try {
      if (typeof currentMoodEmoji !== 'undefined' && currentMoodEmoji) emoji = currentMoodEmoji;
      else emoji = localStorage.getItem('pt1_live_mood') || emoji;
    } catch (e) {}
    // each emoji has its own colour class; the hue follows its mood family
    try { if (typeof resolveMood === 'function') { const m = resolveMood(emoji); if (m && MOOD_HUE[m.fam] != null) cls = m.fam; } } catch (e) {}
    return { cls: cls, emoji: emoji, hue: MOOD_HUE[cls] != null ? MOOD_HUE[cls] : 190 };
  }

  function profileBits() {
    const p = global.StudyProfiles && StudyProfiles.getProfile && StudyProfiles.getProfile();
    const mood = currentMoodMeta();
    return {
      displayName: (p && p.displayName) || 'Scholar',
      level: (p && p.level) || 1,
      mood: mood.emoji,
      hue: mood.hue
    };
  }

  function ensureEl(id, meta) {
    let el = els[id];
    if (!el) {
      el = document.createElement('div');
      el.className = 'friend-cursor spawning';
      el.innerHTML =
        '<div class="friend-cursor-inner"><div class="friend-cursor-aura"></div></div>' +
        '<div class="friend-cursor-name"></div>';
      document.body.appendChild(el);
      els[id] = el;
      setTimeout(() => el.classList.remove('spawning'), 450);
    }
    const hue = meta.hue != null ? meta.hue : hueFromName(meta.displayName);
    el.style.setProperty('--friend-hue', hue);
    el.querySelector('.friend-cursor-inner').style.background =
      'radial-gradient(circle at 30% 30%, hsl(' + hue + ',90%,70%), hsl(' + hue + ',80%,40%))';
    el.querySelector('.friend-cursor-aura').style.background =
      'radial-gradient(circle, hsla(' + hue + ',90%,60%,.5) 0%, transparent 70%)';
    el.querySelector('.friend-cursor-name').textContent = meta.displayName || '';
    return el;
  }

  function removeEl(id) {
    if (els[id]) {
      els[id].remove();
      delete els[id];
    }
  }

  function clearAll() {
    Object.keys(els).forEach(removeEl);
  }

  /* —— Layout-independent positions ——
     A pointer is described by the stable element under it (data-anchor) plus
     rx/ry inside that element's rect, with a fallback nx/ny inside the main
     content container. Receivers resolve both against their own layout, so
     reflow between desktop and phone layouts keeps cursors on the same thing. */
  function curQ() {
    const Q = global.StudyQuiz;
    if (!Q || !Q.active || !Q.questions) return null;
    return Q.questions[Q.current] || null;
  }
  function qKey(q) {
    return q ? String(q.__id || q.id || '') : '';
  }
  function anchorOf(el) {
    if (!el || el.nodeType !== 1) return null;
    if (el.dataset && el.dataset.anchor) return el.dataset.anchor;
    const q = curQ(), k = qKey(q);
    const cls = el.classList;
    if (el.id === 'qText') return 'q:' + k + ':stem';
    // lobby Pane mode: every player has a pane (data-uid) on every screen, so anchor inside that pane
    const pane = el.closest && el.closest('#multi-quiz-container .party-member-box[data-uid]');
    if (pane) {
      const pu = pane.dataset.uid;
      if (el === pane) return 'pane:' + pu;
      if (cls.contains('pane-opt-btn')) return 'pane:' + pu + ':opt:' + Array.prototype.indexOf.call(pane.querySelectorAll('.pane-opt-btn'), el);
      if (cls.contains('pane-question-text')) return 'pane:' + pu + ':q';
      if (cls.contains('pane-friend-header')) return 'pane:' + pu + ':head';
    }
    // lobby Classic mode: one shared question card
    const cmain = el.closest && el.closest('#multi-quiz-container .classic-main');
    if (cmain) {
      if (el === cmain) return 'classic:main';
      if (cls.contains('pane-opt-btn')) return 'classic:opt:' + Array.prototype.indexOf.call(cmain.querySelectorAll('.pane-opt-btn'), el);
      if (cls.contains('pane-question-text')) return 'classic:q';
    }
    if (cls.contains('classic-roster-chip') && el.dataset.focus != null) return 'classic:chip:' + el.dataset.focus;
    if (cls.contains('opt') && el.parentNode && el.parentNode.id === 'options') {
      const i = Array.prototype.indexOf.call(el.parentNode.querySelectorAll('.opt'), el);
      const orig = q && q.__perm && q.__perm[i] != null ? q.__perm[i] : i;
      return 'q:' + k + ':opt:' + orig;
    }
    if (cls.contains('match-item') && el.dataset.id != null) return 'q:' + k + ':match:' + (el.dataset.side || '') + ':' + el.dataset.id;
    if (cls.contains('label-slot') && el.dataset.id != null) return 'q:' + k + ':slot:' + el.dataset.id;
    if (cls.contains('label-chip') && el.dataset.for != null) return 'q:' + k + ':chip:' + el.dataset.for;
    if (cls.contains('order-card') && el.dataset.id != null) return 'q:' + k + ':order:' + el.dataset.id;
    if (el.id && !/^(app|root)$/.test(el.id)) return '#' + el.id;
    return null;
  }
  const ANCHOR_SEL = '#qText, #options .opt, .match-item, .label-slot[data-id], .label-chip, .order-card, .party-member-box[data-uid], .party-member-box .pane-opt-btn, .party-member-box .pane-question-text, .party-member-box .pane-friend-header, .classic-main, .classic-main .pane-opt-btn, .classic-main .pane-question-text, .classic-roster-chip, [id]';
  function stampAnchors(root) {
    (root || document).querySelectorAll(ANCHOR_SEL).forEach((el) => {
      if (el.closest && el.closest('.friend-cursor')) return;
      const a = anchorOf(el);
      if (a && el.dataset.anchor !== a) el.dataset.anchor = a;
    });
  }
  function usable(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function container() {
    const cands = ['#shareView', '#multi-quiz-container', '.app.view.active #mainPanel', '.app.view.active', '.view.active'];
    for (let i = 0; i < cands.length; i++) {
      const el = document.querySelector(cands[i]);
      if (el && usable(el) && getComputedStyle(el).display !== 'none') return el;
    }
    return document.documentElement;
  }
  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  function round4(v) {
    return Math.round(v * 10000) / 10000;
  }
  function describe(cx, cy, target) {
    let el = target && target.nodeType === 1 ? target : document.elementFromPoint(cx, cy);
    let anchor = null, rx = 0, ry = 0;
    for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (n.closest && n.closest('.friend-cursor')) continue;
      const a = anchorOf(n);
      if (a && usable(n)) {
        const r = n.getBoundingClientRect();
        anchor = a;
        rx = clamp01((cx - r.left) / r.width);
        ry = clamp01((cy - r.top) / r.height);
        if (!n.dataset.anchor) n.dataset.anchor = a;
        break;
      }
    }
    const c = container();
    const cr = c.getBoundingClientRect();
    const se = document.scrollingElement || document.documentElement;
    const maxS = Math.max(1, se.scrollHeight - global.innerHeight);
    const out = {
      nx: round4(cr.width ? (cx - cr.left) / cr.width : cx / global.innerWidth),
      ny: round4(cr.height ? (cy - cr.top) / cr.height : cy / global.innerHeight),
      container: c.id ? '#' + c.id : c.className ? String(c.className).split(' ')[0] : 'html',
      scrollY: round4(clamp01((global.scrollY || se.scrollTop || 0) / maxS))
    };
    if (anchor) {
      out.anchor = anchor.slice(0, 160);
      out.rx = round4(rx);
      out.ry = round4(ry);
    }
    return out;
  }
  function findAnchor(a) {
    if (!a) return null;
    let el = null;
    try {
      el = document.querySelector('[data-anchor="' + String(a).replace(/["\\]/g, '\\$&') + '"]');
    } catch (e) {}
    if (!el || anchorOf(el) !== a) {
      stampAnchors();
      try {
        el = document.querySelector('[data-anchor="' + String(a).replace(/["\\]/g, '\\$&') + '"]');
      } catch (e) {}
    }
    return el && usable(el) && !(el.closest && el.closest('[hidden]')) ? el : null;
  }
  /* local viewport point for a remote cursor record */
  function resolve(c) {
    const el = findAnchor(c.anchor);
    if (el && typeof c.rx === 'number' && typeof c.ry === 'number') {
      const r = el.getBoundingClientRect();
      return { x: r.left + c.rx * r.width, y: r.top + c.ry * r.height, via: 'anchor' };
    }
    const nx = typeof c.nx === 'number' ? c.nx : c.x;
    const ny = typeof c.ny === 'number' ? c.ny : c.y;
    if (typeof nx === 'number' && nx <= 1.5 && ny <= 1.5 && nx >= -0.5 && ny >= -0.5) {
      const cr = container().getBoundingClientRect();
      return { x: cr.left + nx * cr.width, y: cr.top + ny * cr.height, via: 'container' };
    }
    return { x: nx || 0, y: ny || 0, via: 'px' }; // legacy pixel record
  }

  /* a lobby can turn party cursors off (lobby settings.cursors === false):
     nothing is published and other cursors are hidden while you are in it */
  let lobbyOff = false;
  function setLobbyHidden(on) {
    on = !!on;
    if (on === lobbyOff) return;
    lobbyOff = on;
    document.documentElement.classList.toggle('cursors-off', on);
    if (on && partyId && uid()) {
      try { ensureDb().ref(partyId + '/cursors/' + uid()).remove().catch(() => {}); } catch (e) {}
    }
  }

  let lastDesc = null;
  async function publish(x, y, target) {
    const me = uid();
    if (!me || !partyId || lobbyOff) return;
    const now = Date.now();
    if (now - lastWrite < THROTTLE_MS) return;
    lastWrite = now;
    const d = describe(x, y, target);
    lastDesc = d;
    const bits = profileBits();
    const db = ensureDb();
    const ref = db.ref(partyId + '/cursors/' + me);
    const rec = {
      x: d.nx,
      y: d.ny,
      nx: d.nx,
      ny: d.ny,
      container: d.container,
      scrollY: d.scrollY,
      updatedAt: now,
      displayName: bits.displayName,
      mood: bits.mood || '😊',
      hue: bits.hue != null ? bits.hue : hueFromName(bits.displayName)
    };
    if (d.anchor) {
      rec.anchor = d.anchor;
      rec.rx = d.rx;
      rec.ry = d.ry;
    }
    await ref.set(rec);
    await ref.onDisconnect().remove();
  }

  function onMove(e) {
    if (!partyId) return;
    const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    const x = t ? t.clientX : e.clientX;
    const y = t ? t.clientY : e.clientY;
    if (x == null) return;
    global._lastPointerX = x;
    global._lastPointerY = y;
    // touch: the finger's element is under the point, not the gesture's start target
    publish(x, y, t ? null : e.target).catch(() => {});
  }
  function onTouchEnd(e) {
    if (!partyId) return;
    lastWrite = 0; // the last touch always goes out
    onMove(e);
  }

  /* —— receiver placement —— */
  const remote = {}; // uid -> last record
  let placeQueued = false;
  function placeAll() {
    placeQueued = false;
    Object.keys(els).forEach((id) => {
      const c = remote[id];
      if (!c) return;
      const p = resolve(c);
      els[id].style.left = Math.round(p.x) + 'px';
      els[id].style.top = Math.round(p.y) + 'px';
    });
  }
  function queuePlace() {
    if (placeQueued) return;
    placeQueued = true;
    (global.requestAnimationFrame || setTimeout)(placeAll);
  }
  let ro = null, mo = null, roTarget = null;
  function watchLayout(on) {
    if (on) {
      global.addEventListener('resize', queuePlace, { passive: true });
      global.addEventListener('scroll', queuePlace, { passive: true, capture: true });
      if (global.ResizeObserver && !ro) {
        ro = new ResizeObserver(queuePlace);
        ro.observe(document.documentElement);
      }
      if (global.MutationObserver && !mo) {
        mo = new MutationObserver((list) => {
          if (list.every((m) => m.target.closest && m.target.closest('.friend-cursor'))) return;
          const c = container();
          if (ro && c !== roTarget) {
            if (roTarget) ro.unobserve(roTarget);
            roTarget = c;
            ro.observe(c);
          }
          queuePlace();
        });
        mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
      }
    } else {
      global.removeEventListener('resize', queuePlace, { capture: false });
      global.removeEventListener('scroll', queuePlace, { capture: true });
      if (ro) { ro.disconnect(); ro = null; roTarget = null; }
      if (mo) { mo.disconnect(); mo = null; }
    }
  }

  /* listen(channel): 'parties/<id>' or 'lobbies/<id>'; a bare id means a party (older callers) */
  function chanOf(pid) {
    if (!pid) return null;
    pid = String(pid);
    return /^(parties|lobbies)\//.test(pid) ? pid : 'parties/' + pid;
  }
  function listen(pid) {
    const ch = chanOf(pid);
    if (ch && ch === partyId && unsub) return; // already on this channel
    stop();
    partyId = ch;
    if (!partyId) {
      clearAll();
      return;
    }
    const me = uid();
    const db = ensureDb();
    const ref = db.ref(partyId + '/cursors');
    const handler = (snap) => {
      const val = snap.val() || {};
      const seen = {};
      Object.keys(val).forEach((id) => {
        if (id === me) return; // hide own remote cursor
        seen[id] = true;
        const c = val[id];
        ensureEl(id, c);
        remote[id] = c;
      });
      Object.keys(els).forEach((id) => {
        if (!seen[id]) { removeEl(id); delete remote[id]; }
      });
      placeAll();
    };
    ref.on('value', handler);
    unsub = () => ref.off('value', handler);
    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchstart', onMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    watchLayout(true);
  }

  function stop() {
    if (unsub) {
      unsub();
      unsub = null;
    }
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchstart', onMove);
    document.removeEventListener('touchend', onTouchEnd);
    watchLayout(false);
    Object.keys(remote).forEach((k) => delete remote[k]);
    partyId = null;
    clearAll();
  }

  /* channel choice: a live lobby quiz (pane/classic) first, then the party, then a lobby you sit in */
  function currentChannel() {
    const S = global.StudySplitQuiz;
    const live = S && S.getLobbyId && S.getLobbyId();
    if (live) return 'lobbies/' + live;
    const pid = global.StudyParty && StudyParty.getPartyId && StudyParty.getPartyId();
    if (pid) return 'parties/' + pid;
    const L = global.StudyLobby;
    const lid = L && L.getActiveLobbyId && L.getActiveLobbyId();
    const lob = L && L.getActiveLobby && L.getActiveLobby();
    const me = uid();
    if (lid && lob && me && lob.members && lob.members[me]) return 'lobbies/' + lid;
    return null;
  }
  function syncFromParty() {
    let ch = null;
    try { ch = currentChannel(); } catch (e) {}
    if (ch) listen(ch);
    else if (partyId) stop();
  }

  function onMoodChange() {
    // Force next cursor write to pick up new mood hue immediately
    lastWrite = 0;
    if (!partyId) return;
    const x = window._lastPointerX;
    const y = window._lastPointerY;
    if (x != null && y != null) publish(x, y).catch(function () {});
  }

  global.StudyCursors = { listen, stop, syncFromParty, publish, onMoodChange, setLobbyHidden, isLobbyHidden: () => lobbyOff, describe, resolve, anchorOf, stampAnchors, _place: placeAll, _remote: remote, _els: els,
    channel: () => partyId, sync: syncFromParty,
    _inject: function (id, rec) { ensureEl(id, rec); remote[id] = rec; watchLayout(true); placeAll(); } };
})(window);
