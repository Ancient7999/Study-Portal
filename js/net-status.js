/* Study Portal — connection region + ping (ATC-style HUD) */
(function (global) {
  const REGION = (function () {
    try {
      const url = (global.FIREBASE_CONFIG && global.FIREBASE_CONFIG.databaseURL) || '';
      const m = url.match(/\.([a-z0-9-]+)\.firebasedatabase\.app/i);
      if (m && m[1]) {
        // europe-west1 → eu-west1
        return m[1].replace(/^europe-/, 'eu-');
      }
    } catch (e) {}
    return 'eu-west1';
  })();

  const state = {
    connected: false,
    pingMs: null,
    timer: null,
    started: false
  };

  function ensureDb() {
    if (!global.firebase) throw new Error('Firebase SDK missing');
    if (!global.FIREBASE_CONFIG) throw new Error('FIREBASE_CONFIG missing');
    if (!firebase.apps.length) firebase.initializeApp(global.FIREBASE_CONFIG);
    return firebase.database();
  }

  function uid() {
    const u = firebase.auth && firebase.auth().currentUser;
    return u ? u.uid : null;
  }

  function ensureEl() {
    let el = document.getElementById('netStatus');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'netStatus';
    el.className = 'net-status';
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<span class="net-dot" aria-hidden="true"></span>' +
      '<span class="net-text" id="netStatusText">Connecting…</span>';
    document.body.appendChild(el);
    return el;
  }

  function render() {
    ensureEl();
    const text = document.getElementById('netStatusText');
    const root = document.getElementById('netStatus');
    if (!text || !root) return;
    root.classList.toggle('is-on', !!state.connected);
    root.classList.toggle('is-off', !state.connected);
    if (!state.connected) {
      text.textContent = 'Disconnected';
      return;
    }
    const ping =
      state.pingMs != null && Number.isFinite(state.pingMs)
        ? Math.max(1, Math.round(state.pingMs)) + ' ms'
        : '…';
    text.textContent = 'Connected to ' + REGION + ' · ' + ping;
  }

  async function measurePing() {
    const me = uid();
    if (!me || !state.connected) return;
    const db = ensureDb();
    const t0 = performance.now();
    try {
      // Lightweight write — same path already used for presence heartbeat
      await db.ref('presence/' + me + '/updatedAt').set(Date.now());
      state.pingMs = performance.now() - t0;
    } catch (e) {
      // Fallback: server time offset read (not full RTT, but shows liveness)
      try {
        const t1 = performance.now();
        await db.ref('.info/serverTimeOffset').once('value');
        state.pingMs = performance.now() - t1;
      } catch (e2) {
        state.pingMs = null;
      }
    }
    render();
  }

  function start() {
    if (state.started) return;
    state.started = true;
    ensureEl();
    render();
    try {
      const db = ensureDb();
      db.ref('.info/connected').on('value', function (snap) {
        state.connected = !!snap.val();
        render();
        if (state.connected) measurePing();
      });
      state.timer = setInterval(function () {
        if (state.connected) measurePing();
      }, 8000);
    } catch (e) {
      state.connected = false;
      render();
    }
  }

  global.StudyNetStatus = { start: start, REGION: REGION };
})(window);
