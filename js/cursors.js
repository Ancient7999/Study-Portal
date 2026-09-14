/* Study Portal — Live party cursors (RTDB, ATC aura aesthetic) */
(function (global) {
  const THROTTLE_MS = 80;
  let unsub = null;
  let lastWrite = 0;
  let partyId = null;
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

  async function publish(x, y) {
    const me = uid();
    if (!me || !partyId) return;
    const now = Date.now();
    if (now - lastWrite < THROTTLE_MS) return;
    lastWrite = now;
    const bits = profileBits();
    const db = ensureDb();
    const ref = db.ref('parties/' + partyId + '/cursors/' + me);
    await ref.set({
      x: Math.round(x),
      y: Math.round(y),
      updatedAt: now,
      displayName: bits.displayName,
      mood: bits.mood || '😊',
      hue: bits.hue != null ? bits.hue : hueFromName(bits.displayName)
    });
    await ref.onDisconnect().remove();
  }

  function onMove(e) {
    if (!partyId) return;
    const x = e.clientX != null ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX);
    const y = e.clientY != null ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY);
    if (x == null) return;
    publish(x, y).catch(() => {});
  }

  function listen(pid) {
    stop();
    partyId = pid || null;
    if (!partyId) {
      clearAll();
      return;
    }
    const me = uid();
    const db = ensureDb();
    const ref = db.ref('parties/' + partyId + '/cursors');
    const handler = (snap) => {
      const val = snap.val() || {};
      const seen = {};
      Object.keys(val).forEach((id) => {
        if (id === me) return; // hide own remote cursor
        seen[id] = true;
        const c = val[id];
        const el = ensureEl(id, c);
        el.style.left = (c.x || 0) + 'px';
        el.style.top = (c.y || 0) + 'px';
      });
      Object.keys(els).forEach((id) => {
        if (!seen[id]) removeEl(id);
      });
    };
    ref.on('value', handler);
    unsub = () => ref.off('value', handler);
    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
  }

  function stop() {
    if (unsub) {
      unsub();
      unsub = null;
    }
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchmove', onMove);
    partyId = null;
    clearAll();
  }

  function syncFromParty() {
    const pid = global.StudyParty && StudyParty.getPartyId && StudyParty.getPartyId();
    if (pid) listen(pid);
    else stop();
  }

  function onMoodChange() {
    // Force next cursor write to pick up new mood hue immediately
    lastWrite = 0;
    if (!partyId) return;
    const x = window._lastPointerX;
    const y = window._lastPointerY;
    if (x != null && y != null) publish(x, y).catch(function () {});
  }

  global.StudyCursors = { listen, stop, syncFromParty, publish, onMoodChange };
})(window);
