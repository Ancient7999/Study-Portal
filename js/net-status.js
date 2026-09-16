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
    started: false,
    onlineCount: 0
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

    // Determine color class based on connection and ping thresholds
    let colorClass = 'is-on'; // Default Green
    if (!state.connected) {
      colorClass = 'is-off'; // Red
    } else if (state.pingMs != null && state.pingMs > 500) {
      colorClass = 'is-bad'; // Orange
    } else if (state.pingMs != null && state.pingMs > 200) {
      colorClass = 'is-warn'; // Yellow
    }

    // Apply classes safely (remove all possible states first)
    root.classList.remove('is-on', 'is-off', 'is-warn', 'is-bad');
    root.classList.add(colorClass);

    if (!state.connected) {
      text.textContent = 'Offline · Firebase-' + REGION;
    } else {
      const pingStr =
        state.pingMs != null && Number.isFinite(state.pingMs)
          ? Math.max(1, Math.round(state.pingMs)) + 'ms'
          : '...';

      text.textContent = 'Firebase-' + REGION + ' · ' + state.onlineCount + ' online · ' + pingStr;
    }
    
    // Dispatch event so other modules (like chat) can update when ping/online changes
    try { 
      window.dispatchEvent(new CustomEvent('net-status-update', { 
        detail: { ping: state.pingMs, connected: state.connected, online: state.onlineCount } 
      })); 
    } catch(e) {}
  }

    async function measurePing() {
    let me = uid();
    let tries = 0;
    
    // Wait up to 5 seconds for anonymous auth to finish
    while (!me && tries < 50) {
      await new Promise((r) => setTimeout(r, 100));
      tries++;
      me = uid();
    }
    if (!me || !state.connected) return;
    
    const db = ensureDb();
    const t0 = performance.now();
    try {
      // A lightweight write that passes security rules to measure true RTT
      await db.ref('rate_limits/' + me + '/world_last').set(Date.now());
      state.pingMs = performance.now() - t0;
    } catch (e) {
      // Fallback if the primary path fails
      try {
        const t1 = performance.now();
        await db.ref('rate_limits/' + me + '/chat_last').set(Date.now());
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

    global.StudyNetStatus = { 
    start: start, 
    REGION: REGION, 
    getPing: function() { return state.pingMs; },
    isConnected: function() { return state.connected; },
    setOnlineCount: function(n) { 
    state.onlineCount = n; 
    render(); 
    }
  };
})(window);
