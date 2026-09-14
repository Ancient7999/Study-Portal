/* Study Portal — Party Pomodoro visibility + leader sync (RTDB) */
(function (global) {
  const PUBLISH_MS = 8000;
  const UI_TICK_MS = 1000;

  const state = {
    partyId: null,
    unsubTimers: null,
    unsubSync: null,
    publishTimer: null,
    uiTimer: null,
    lastPublish: 0,
    lastSyncAt: 0,
    remote: {}, // uid -> timer payload
    disconnectArmed: false
  };

  function toast(msg) {
    if (typeof showToast === 'function') showToast(msg, 2400);
  }

  function ensureDb() {
    if (!global.firebase) throw new Error('Firebase SDK missing');
    if (!global.FIREBASE_CONFIG) throw new Error('FIREBASE_CONFIG missing');
    if (!firebase.apps.length) firebase.initializeApp(global.FIREBASE_CONFIG);
    return firebase.database();
  }

  function authUid() {
    const u = firebase.auth && firebase.auth().currentUser;
    return u ? u.uid : null;
  }

  function displayName() {
    const p = global.StudyProfiles && StudyProfiles.getProfile && StudyProfiles.getProfile();
    if (p && p.displayName) return p.displayName;
    if (typeof global.getPomodoroState === 'function') {
      const st = global.getPomodoroState();
      if (st && st.displayName) return st.displayName;
    }
    return 'Scholar';
  }

  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function remainingFrom(payload) {
    if (!payload) return 0;
    if (typeof payload.phaseEndsAt === 'number' && payload.phaseEndsAt > 0) {
      return Math.max(0, Math.ceil((payload.phaseEndsAt - Date.now()) / 1000));
    }
    if (typeof payload.secondsLeft === 'number') return Math.max(0, Math.floor(payload.secondsLeft));
    return 0;
  }

  function localState() {
    if (typeof global.getPomodoroState === 'function') return global.getPomodoroState();
    return null;
  }

  function timerRef(uid) {
    return ensureDb().ref('parties/' + state.partyId + '/timers/' + uid);
  }

  async function clearOwn(removeDisconnect) {
    const me = authUid();
    if (!me || !state.partyId) return;
    try {
      const ref = timerRef(me);
      if (removeDisconnect !== false) {
        try {
          await ref.onDisconnect().cancel();
        } catch (e) {}
        state.disconnectArmed = false;
      }
      await ref.remove();
    } catch (e) {
      console.warn('party-timers clearOwn', e);
    }
  }

  async function publishOwn(force) {
    const me = authUid();
    if (!me || !state.partyId) return;
    const now = Date.now();
    if (!force && now - state.lastPublish < PUBLISH_MS - 200) return;
    const st = localState();
    if (!st || !st.enabled) {
      await clearOwn(true);
      state.lastPublish = now;
      return;
    }
    const payload = {
      enabled: true,
      mode: st.mode === 'break' ? 'break' : 'focus',
      phaseEndsAt: typeof st.phaseEndsAt === 'number' ? st.phaseEndsAt : now + (st.secondsLeft || 0) * 1000,
      secondsLeft: typeof st.secondsLeft === 'number' ? st.secondsLeft : remainingFrom(st),
      displayName: st.displayName || displayName(),
      updatedAt: now
    };
    try {
      const ref = timerRef(me);
      await ref.set(payload);
      if (!state.disconnectArmed) {
        await ref.onDisconnect().remove();
        state.disconnectArmed = true;
      }
      state.lastPublish = now;
    } catch (e) {
      console.warn('party-timers publish', e);
    }
  }

  function ensureRails() {
    let stack = document.getElementById('partyPresenceStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'partyPresenceStack';
      stack.className = 'party-presence-stack';
      document.body.appendChild(stack);
    }
    let syncWrap = document.getElementById('partyTimerSyncWrap');
    if (!syncWrap) {
      syncWrap = document.createElement('div');
      syncWrap.id = 'partyTimerSyncWrap';
      syncWrap.className = 'party-timer-sync-wrap';
      stack.appendChild(syncWrap);
    } else if (syncWrap.parentNode !== stack) {
      stack.appendChild(syncWrap);
    }
    let rail = document.getElementById('partyTimerRail');
    if (!rail) {
      rail = document.createElement('div');
      rail.id = 'partyTimerRail';
      rail.className = 'party-timer-rail';
      rail.setAttribute('aria-label', 'Party Pomodoro timers');
      stack.appendChild(rail);
    } else if (rail.parentNode !== stack) {
      stack.appendChild(rail);
    }
    return { rail, syncWrap, stack };
  }

  function renderSyncButton() {
    const { syncWrap } = ensureRails();
    const leader = global.StudyParty && StudyParty.isLeader && StudyParty.isLeader();
    const inParty = !!(state.partyId && global.StudyParty && StudyParty.inParty && StudyParty.inParty());
    if (!inParty || !leader) {
      syncWrap.innerHTML = '';
      syncWrap.hidden = true;
      return;
    }
    syncWrap.hidden = false;
    if (!syncWrap.querySelector('#partySyncTimersBtn')) {
      syncWrap.innerHTML =
        '<button type="button" class="chat-tool-btn party-sync-timers-btn" id="partySyncTimersBtn" title="Push your Pomodoro to all party members">Sync timers</button>';
      syncWrap.querySelector('#partySyncTimersBtn').addEventListener('click', () => {
        pushLeaderSync().catch((e) => toast(e.message || 'Sync failed'));
      });
    }
  }

  function renderRemoteChips() {
    const { rail } = ensureRails();
    const me = authUid();
    const entries = Object.keys(state.remote)
      .filter((uid) => uid !== me)
      .map((uid) => ({ uid, t: state.remote[uid] }))
      .filter((x) => x.t && x.t.enabled !== false && (x.t.phaseEndsAt || x.t.secondsLeft != null));

    // Also annotate party mini-chips
    document.querySelectorAll('#partyChipRail .party-mini-chip[data-uid]').forEach((chip) => {
      const uid = chip.getAttribute('data-uid');
      let slot = chip.querySelector('.pmc-timer');
      const t = uid && uid !== me ? state.remote[uid] : null;
      const active = t && t.enabled !== false && (t.phaseEndsAt || t.secondsLeft != null);
      if (!active) {
        if (slot) slot.remove();
        return;
      }
      if (!slot) {
        slot = document.createElement('span');
        slot.className = 'pmc-timer';
        const meta = chip.querySelector('.pmc-meta');
        if (meta) meta.appendChild(slot);
        else chip.appendChild(slot);
      }
      const mode = t.mode === 'break' ? 'break' : 'focus';
      const left = remainingFrom(t);
      slot.className = 'pmc-timer pmc-timer--' + mode;
      slot.textContent = (mode === 'break' ? '☕ ' : '⏱ ') + fmt(left);
      slot.title = (t.displayName || 'Member') + ' · ' + mode + ' · ' + fmt(left);
    });

    if (!entries.length) {
      rail.innerHTML = '';
      rail.classList.remove('show');
      return;
    }
    rail.classList.add('show');
    const html = entries
      .map(({ uid, t }) => {
        const mode = t.mode === 'break' ? 'break' : 'focus';
        const left = remainingFrom(t);
        const name = t.displayName || 'Member';
        return (
          '<div class="party-timer-chip party-timer-chip--' +
          mode +
          '" data-uid="' +
          uid +
          '" title="' +
          name.replace(/"/g, '') +
          ' · ' +
          mode +
          '">' +
          '<span class="ptc-name"></span>' +
          '<span class="ptc-mode">' +
          (mode === 'break' ? 'break' : 'focus') +
          '</span>' +
          '<span class="ptc-time">' +
          fmt(left) +
          '</span>' +
          '</div>'
        );
      })
      .join('');
    rail.innerHTML = html;
    entries.forEach(({ uid, t }) => {
      const el = rail.querySelector('.party-timer-chip[data-uid="' + uid + '"] .ptc-name');
      if (el) el.textContent = t.displayName || 'Member';
    });
  }

  function startUiTick() {
    stopUiTick();
    state.uiTimer = setInterval(() => {
      renderRemoteChips();
      renderSyncButton();
    }, UI_TICK_MS);
  }

  function stopUiTick() {
    if (state.uiTimer) {
      clearInterval(state.uiTimer);
      state.uiTimer = null;
    }
  }

  function startPublishLoop() {
    stopPublishLoop();
    publishOwn(true);
    state.publishTimer = setInterval(() => {
      publishOwn(false);
    }, PUBLISH_MS);
  }

  function stopPublishLoop() {
    if (state.publishTimer) {
      clearInterval(state.publishTimer);
      state.publishTimer = null;
    }
  }

  function onTimersValue(snap) {
    state.remote = snap.val() || {};
    renderRemoteChips();
  }

  function onSyncValue(snap) {
    const cmd = snap.val();
    if (!cmd || typeof cmd !== 'object') return;
    const me = authUid();
    if (!me) return;
    if (cmd.by === me) {
      // Leader already has this state; still refresh publish
      state.lastSyncAt = cmd.at || state.lastSyncAt;
      return;
    }
    if (typeof cmd.at === 'number' && cmd.at <= state.lastSyncAt) return;
    // Ignore stale commands (e.g. joining a party hours after last sync)
    if (typeof cmd.at === 'number' && Date.now() - cmd.at > 120000) {
      state.lastSyncAt = cmd.at;
      return;
    }
    state.lastSyncAt = typeof cmd.at === 'number' ? cmd.at : Date.now();
    if (typeof global.applyPomodoroState !== 'function') return;
    try {
      global.applyPomodoroState(
        {
          enabled: true,
          mode: cmd.mode === 'break' ? 'break' : 'focus',
          phaseEndsAt: cmd.phaseEndsAt,
          secondsLeft:
            typeof cmd.phaseEndsAt === 'number'
              ? Math.max(0, Math.ceil((cmd.phaseEndsAt - Date.now()) / 1000))
              : undefined
        },
        { fromPartySync: true }
      );
      publishOwn(true);
    } catch (e) {
      console.warn('party-timers apply sync', e);
    }
  }

  function listen(partyId) {
    stop();
    state.partyId = partyId || null;
    if (!state.partyId) {
      renderRemoteChips();
      renderSyncButton();
      return;
    }
    const db = ensureDb();
    const tRef = db.ref('parties/' + state.partyId + '/timers');
    const sRef = db.ref('parties/' + state.partyId + '/timerSync');
    tRef.on('value', onTimersValue);
    sRef.on('value', onSyncValue);
    state.unsubTimers = () => tRef.off('value', onTimersValue);
    state.unsubSync = () => sRef.off('value', onSyncValue);
    startPublishLoop();
    startUiTick();
    renderSyncButton();
  }

  async function stop() {
    stopPublishLoop();
    stopUiTick();
    if (state.unsubTimers) {
      state.unsubTimers();
      state.unsubTimers = null;
    }
    if (state.unsubSync) {
      state.unsubSync();
      state.unsubSync = null;
    }
    if (state.partyId) {
      await clearOwn(true);
    }
    state.partyId = null;
    state.remote = {};
    state.disconnectArmed = false;
    renderRemoteChips();
    renderSyncButton();
    const rail = document.getElementById('partyTimerRail');
    if (rail) {
      rail.innerHTML = '';
      rail.classList.remove('show');
    }
  }

  function syncFromParty() {
    const pid = global.StudyParty && StudyParty.getPartyId && StudyParty.getPartyId();
    if (pid) listen(pid);
    else stop();
  }

  function onLocalChange() {
    if (!state.partyId) return;
    publishOwn(true);
  }

  async function pushLeaderSync() {
    const me = authUid();
    if (!me || !state.partyId) throw new Error('Not in a party');
    if (!(global.StudyParty && StudyParty.isLeader && StudyParty.isLeader())) {
      throw new Error('Only the leader can sync timers');
    }
    const st = localState();
    if (!st || !st.enabled) throw new Error('Enable Pomodoro first');
    const phaseEndsAt =
      typeof st.phaseEndsAt === 'number' && st.phaseEndsAt > 0
        ? st.phaseEndsAt
        : Date.now() + Math.max(0, st.secondsLeft || 0) * 1000;
    const at = Date.now();
    await ensureDb()
      .ref('parties/' + state.partyId + '/timerSync')
      .set({
        by: me,
        mode: st.mode === 'break' ? 'break' : 'focus',
        phaseEndsAt: phaseEndsAt,
        at: at
      });
    state.lastSyncAt = at;
    await publishOwn(true);
    toast('Timers synced to party');
  }

  global.StudyPartyTimers = {
    start: listen,
    stop,
    syncFromParty,
    onLocalChange,
    publishNow: () => publishOwn(true),
    pushLeaderSync,
    getRemoteTimers: () => Object.assign({}, state.remote),
    refreshUi: function () {
      renderRemoteChips();
      renderSyncButton();
    }
  };
})(window);
