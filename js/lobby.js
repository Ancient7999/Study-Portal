/* Study Portal — Online lobbies (join list, presence, classic/pane, per-seat banks) */
(function (global) {
  const SEATS = 4;
  const HEARTBEAT_MS = 12000;
  const STALE_MS = 40000;
  const LIST_LIMIT = 30;

  const state = {
    open: false,
    lobbies: {},
    activeLobbyId: null,
    unsubList: null,
    unsubLobby: null,
    dragUid: null,
    heartbeatTimer: null,
    sweepTimer: null,
    mySeat: null,
    disconnectHooks: [],
    bankPicker: null,
    createBank: 'banks/medphys/pt1.json',
    createForm: 'A',
    createMode: 'pane'
  };

  function toast(msg) {
    if (typeof showToast === 'function') showToast(msg, 2600);
  }

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

  function profileBits() {
    const p = global.StudyProfiles && StudyProfiles.getProfile && StudyProfiles.getProfile();
    return {
      displayName: (p && p.displayName) || 'Scholar',
      level: (p && p.level) || 1
    };
  }

  function randomId() {
    const a = new Uint8Array(6);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function isLeaderOf(lobby) {
    return lobby && uid() && lobby.leader === uid();
  }

  function seatCount(lobby) {
    return Object.keys((lobby && lobby.seats) || {}).length;
  }

  function memberCount(lobby) {
    return Object.keys((lobby && lobby.members) || {}).length;
  }

  function findMySeat(lobby, me) {
    const seats = (lobby && lobby.seats) || {};
    for (let i = 0; i < SEATS; i++) {
      const s = seats[String(i)];
      if (s && s.uid === me) return i;
    }
    return null;
  }

  function findEmptySeat(lobby) {
    const seats = (lobby && lobby.seats) || {};
    for (let i = 0; i < SEATS; i++) {
      if (!seats[String(i)]) return i;
    }
    return null;
  }

  function isLobbyAlive(lobby) {
    if (!lobby) return false;
    if (lobby.status === 'closed') return false;
    const members = lobby.members || {};
    const n = Object.keys(members).length;
    if (n === 0) return false;
    // Leader gone and nobody left in seats → dead
    if (lobby.leader && !members[lobby.leader] && seatCount(lobby) === 0) return false;
    return true;
  }

  function clearDisconnectHooks() {
    state.disconnectHooks.forEach((fn) => {
      try {
        fn();
      } catch (e) {}
    });
    state.disconnectHooks = [];
  }

  function stopHeartbeat() {
    if (state.heartbeatTimer) {
      clearInterval(state.heartbeatTimer);
      state.heartbeatTimer = null;
    }
    if (state.sweepTimer) {
      clearInterval(state.sweepTimer);
      state.sweepTimer = null;
    }
  }

  async function bindPresence(lobbyId, seatIdx, role) {
    const me = uid();
    if (!me || !lobbyId) return;
    const db = ensureDb();
    const bits = profileBits();
    const now = Date.now();
    const memberRef = db.ref('lobbies/' + lobbyId + '/members/' + me);
    const payload = {
      displayName: bits.displayName,
      level: bits.level,
      seat: seatIdx,
      role: role || 'play',
      joinedAt: now,
      lastSeen: now,
      online: true
    };
    // Preserve original joinedAt if already a member (re-bind)
    const existing = (await memberRef.once('value')).val();
    if (existing && existing.joinedAt) payload.joinedAt = existing.joinedAt;

    clearDisconnectHooks();
    await memberRef.set(payload);
    await memberRef.onDisconnect().remove();
    state.disconnectHooks.push(() => memberRef.onDisconnect().cancel());

    if (seatIdx != null) {
      const seatRef = db.ref('lobbies/' + lobbyId + '/seats/' + seatIdx);
      await seatRef.onDisconnect().remove();
      state.disconnectHooks.push(() => seatRef.onDisconnect().cancel());
      // Also clear session pane on disconnect
      const paneRef = db.ref('lobbies/' + lobbyId + '/session/panes/' + me);
      await paneRef.onDisconnect().remove();
      state.disconnectHooks.push(() => paneRef.onDisconnect().cancel());
    }

    stopHeartbeat();
    state.heartbeatTimer = setInterval(() => {
      memberRef.update({ lastSeen: Date.now(), online: true }).catch(() => {});
    }, HEARTBEAT_MS);

    state.sweepTimer = setInterval(() => {
      sweepStale(lobbyId).catch(() => {});
    }, HEARTBEAT_MS + 2000);
  }

  async function sweepStale(lobbyId) {
    const lobby = state.lobbies[lobbyId];
    if (!lobby) return;
    // Any connected member can help sweep; prefer leader
    const me = uid();
    if (!me || !lobby.members || !lobby.members[me]) return;
    const now = Date.now();
    const db = ensureDb();
    const members = lobby.members || {};
    const staleUids = [];
    Object.keys(members).forEach((id) => {
      if (id === me) return;
      const m = members[id];
      const last = m.lastSeen || m.joinedAt || 0;
      if (now - last > STALE_MS) staleUids.push(id);
    });
    for (const id of staleUids) {
      await removeMemberFromLobby(lobbyId, id, { reason: 'stale' });
    }
    // Re-read locally after removals
    const snap = await db.ref('lobbies/' + lobbyId).once('value');
    const fresh = snap.val();
    if (!fresh) return;
    if (!isLobbyAlive(fresh)) {
      await db.ref('lobbies/' + lobbyId).remove();
      if (state.activeLobbyId === lobbyId) {
        state.activeLobbyId = null;
        clearDisconnectHooks();
        stopHeartbeat();
        notifyChatLeave();
      }
    } else if (fresh.leader && !(fresh.members || {})[fresh.leader]) {
      // Transfer leadership to earliest remaining member
      const ids = Object.keys(fresh.members || {}).sort(
        (a, b) => (fresh.members[a].joinedAt || 0) - (fresh.members[b].joinedAt || 0)
      );
      if (ids.length) {
        await db.ref('lobbies/' + lobbyId + '/leader').set(ids[0]);
      }
    }
  }

  async function removeMemberFromLobby(lobbyId, memberUid, opts) {
    opts = opts || {};
    const db = ensureDb();
    const snap = await db.ref('lobbies/' + lobbyId).once('value');
    const lobby = snap.val();
    if (!lobby) return;
    const updates = {};
    updates['members/' + memberUid] = null;
    updates['session/panes/' + memberUid] = null;
    const seats = lobby.seats || {};
    Object.keys(seats).forEach((k) => {
      if (seats[k] && seats[k].uid === memberUid) updates['seats/' + k] = null;
    });
    
    if (lobby.leader === memberUid) {
      const remainingMembers = Object.keys(lobby.members || {}).filter(id => id !== memberUid);
      if (remainingMembers.length > 0) {
        remainingMembers.sort((a, b) => (lobby.members[a].joinedAt || 0) - (lobby.members[b].joinedAt || 0));
        updates['leader'] = remainingMembers[0];
      }
    }

    await db.ref('lobbies/' + lobbyId).update(updates);

    if (memberUid === uid()) {
      clearDisconnectHooks();
      stopHeartbeat();
    }

    const after = (await db.ref('lobbies/' + lobbyId).once('value')).val();
    if (!after || !isLobbyAlive(after)) {
      await db.ref('lobbies/' + lobbyId).remove();
      return;
    }
  }

  function notifyChatLobby(lobby) {
    if (!global.StudyChat || !lobby) return;
    try {
      StudyChat.setLobbyContext({
        lobbyId: state.activeLobbyId,
        chatSessionId: lobby.chatSessionId,
        joinedAt: (lobby.members && lobby.members[uid()] && lobby.members[uid()].joinedAt) || Date.now()
      });
    } catch (e) {}
  }

  function notifyChatLeave() {
    if (!global.StudyChat || !StudyChat.setLobbyContext) return;
    try {
      StudyChat.setLobbyContext(null);
    } catch (e) {}
  }

  function ensurePanel() {
    if (document.getElementById('lobbyPanel')) return;
    const panel = document.createElement('div');
    panel.id = 'lobbyPanel';
    panel.className = 'lobby-panel';
    panel.hidden = true;
    panel.innerHTML =
      '<div class="lobby-panel-head">' +
      '<h3>Online Lobbies</h3>' +
      '<button type="button" class="chat-minimize" id="lobbyCloseBtn" aria-label="Close">×</button>' +
      '</div>' +
      '<p class="lobby-hint">Join an open lobby, or create one. Owner assigns banks per seat. Classic = shared quiz · Pane = split view.</p>' +
      '<div class="lobby-toolbar lobby-create-block">' +
      '<div id="lobbyCreateBankMount" class="lobby-bank-mount"></div>' +
      '<div class="lobby-mode-row">' +
      '<span class="lobby-mode-label">Mode</span>' +
      '<button type="button" class="mp-mode-pill active" data-mode="pane" id="lobbyModePane">Pane</button>' +
      '<button type="button" class="mp-mode-pill" data-mode="classic" id="lobbyModeClassic">Classic</button>' +
      '</div>' +
      '<button type="button" class="chat-tool-btn" id="lobbyCreateBtn">Create lobby</button>' +
      '</div>' +
      '<div class="lobby-list" id="lobbyList"></div>' +
      '<div class="lobby-detail" id="lobbyDetail" hidden></div>';
    document.body.appendChild(panel);
    panel.querySelector('#lobbyCloseBtn').onclick = () => setOpen(false);
    panel.querySelector('#lobbyCreateBtn').onclick = () =>
      createLobby().catch((e) => toast(e.message || 'Create failed'));
    panel.querySelector('#lobbyModePane').onclick = () => setCreateMode('pane');
    panel.querySelector('#lobbyModeClassic').onclick = () => setCreateMode('classic');

    if (global.StudyBankPicker && StudyBankPicker.mount) {
      state.bankPicker = StudyBankPicker.mount(panel.querySelector('#lobbyCreateBankMount'), {
        idPrefix: 'lobbyCreate',
        compact: true,
        value: { bank: state.createBank, form: state.createForm },
        onChange: (bank, form) => {
          state.createBank = bank;
          state.createForm = form;
        }
      });
    } else {
      panel.querySelector('#lobbyCreateBankMount').innerHTML =
        '<select id="lobbyBankSelect" class="chat-tool-input" style="width:100%">' +
        '<option value="banks/medphys/pt1.json|A">Medical Physics · PT1 · Form A</option>' +
        '</select>';
    }
  }

  function setCreateMode(mode) {
    state.createMode = mode === 'classic' ? 'classic' : 'pane';
    const pane = document.getElementById('lobbyModePane');
    const classic = document.getElementById('lobbyModeClassic');
    if (pane) pane.classList.toggle('active', state.createMode === 'pane');
    if (classic) classic.classList.toggle('active', state.createMode === 'classic');
  }

  function setOpen(open) {
    ensurePanel();
    state.open = !!open;
    const panel = document.getElementById('lobbyPanel');
    if (panel) panel.hidden = !state.open;
    if (state.open) {
      listenList();
      render();
    }
  }

  function listenList() {
    const db = ensureDb();
    if (state.unsubList) state.unsubList();
    const ref = db.ref('lobbies').orderByChild('createdAt').limitToLast(LIST_LIMIT);
    const handler = (snap) => {
      state.lobbies = snap.val() || {};
      // Drop dead from local view promptly
      Object.keys(state.lobbies).forEach((id) => {
        if (!isLobbyAlive(state.lobbies[id])) {
          // Opportunistic delete for empty/orphan lobbies (incl. pre-presence schema)
          const L = state.lobbies[id];
          const me = uid();
          const empty = !L.members || !Object.keys(L.members).length;
          if (me && (empty || L.leader === me || (L.members && L.members[me]))) {
            ensureDb()
              .ref('lobbies/' + id)
              .remove()
              .catch(() => {});
          }
          delete state.lobbies[id];
        }
      });
      render();
    };
    ref.on('value', handler);
    state.unsubList = () => ref.off('value', handler);
  }

  async function createLobby() {
    const me = uid();
    if (!me) throw new Error('Sign in first');
    
    // Safety lock: prevent creating multiple lobbies
    if (state.activeLobbyId) {
      throw new Error('You are already in a lobby. Leave it first.');
    }

    if (StudyParty && StudyParty.inParty && StudyParty.inParty() && !StudyParty.isLeader()) {
      throw new Error('Only the party leader can create a lobby');
    }

    let bank = state.createBank;
    let form = state.createForm;
    if (state.bankPicker && state.bankPicker.getValue) {
      const v = state.bankPicker.getValue();
      bank = v.bank;
      form = v.form;
    } else {
      const sel = document.getElementById('lobbyBankSelect');
      if (sel && global.StudyBankPicker) {
        const v = StudyBankPicker.parseValue(sel.value);
        bank = v.bank;
        form = v.form;
      }
    }
    
    const id = randomId();
    const bits = profileBits();
    const chatSessionId = randomId() + randomId();
    const now = Date.now();
    
    const seats = {};
    seats['0'] = {
      uid: me,
      displayName: bits.displayName,
      level: bits.level,
      role: 'play',
      bank: bank,
      form: form || 'A',
      updatedAt: now
    };
    
    const members = {};
    members[me] = {
      displayName: bits.displayName,
      level: bits.level,
      seat: 0,
      role: 'play',
      joinedAt: now,
      lastSeen: now,
      online: true
    };
    
    const payload = {
      leader: me,
      partyId: (StudyParty && StudyParty.getPartyId && StudyParty.getPartyId()) || null,
      status: 'open',
      gameMode: state.createMode || 'pane',
      bank: bank,
      form: form || 'A',
      chatSessionId: chatSessionId,
      createdAt: now,
      seats: seats,
      members: members
    };
    
    await ensureDb().ref('lobbies/' + id).set(payload);
    state.activeLobbyId = id;
    state.mySeat = 0;
    
    await bindPresence(id, 0, 'play');
    listenActive(id);
    notifyChatLobby(payload);
    
    toast('Lobby created');
    render();
  }
  async function joinLobby(lobbyId, opts) {
    opts = opts || {};
    const me = uid();
    if (!me) throw new Error('Sign in first');
    const db = ensureDb();
    const snap = await db.ref('lobbies/' + lobbyId).once('value');
    const lobby = snap.val();
    if (!lobby) throw new Error('Lobby gone');
    if (lobby.status && lobby.status !== 'open' && lobby.status !== 'live') {
      throw new Error('Lobby not joinable');
    }
    if (!isLobbyAlive(lobby)) {
      await db.ref('lobbies/' + lobbyId).remove();
      throw new Error('Lobby expired');
    }

    // Already seated?
    let seatIdx = findMySeat(lobby, me);
    const role = opts.role || 'play';
    if (seatIdx == null) {
      if (lobby.status === 'live' && role === 'play') {
        // Late joiners to a live quiz default to spectate unless empty seat + owner allows
        // Still allow claiming empty seat as play if open seats remain
      }
      seatIdx = findEmptySeat(lobby);
      if (seatIdx == null) throw new Error('Lobby full (max 4)');
      const bits = profileBits();
      const now = Date.now();
      const seatPayload = {
        uid: me,
        displayName: bits.displayName,
        level: bits.level,
        role: role,
        bank: lobby.bank || 'banks/medphys/pt1.json',
        form: lobby.form || 'A',
        updatedAt: now
      };
      // Claim seat transactionally
      const seatRef = db.ref('lobbies/' + lobbyId + '/seats/' + seatIdx);
      const tx = await seatRef.transaction((cur) => {
        if (cur != null) return; // abort
        return seatPayload;
      });
      if (!tx.committed) {
        // Retry once on another empty seat
        const again = (await db.ref('lobbies/' + lobbyId).once('value')).val();
        seatIdx = findEmptySeat(again);
        if (seatIdx == null) throw new Error('Lobby full (max 4)');
        const tx2 = await db.ref('lobbies/' + lobbyId + '/seats/' + seatIdx).transaction((cur) => {
          if (cur != null) return;
          return seatPayload;
        });
        if (!tx2.committed) throw new Error('Could not claim a seat — try again');
      }
    }

    state.activeLobbyId = lobbyId;
    state.mySeat = seatIdx;
    await bindPresence(lobbyId, seatIdx, role);
    listenActive(lobbyId);

    const fresh = (await db.ref('lobbies/' + lobbyId).once('value')).val();
    notifyChatLobby(fresh || lobby);

    if (fresh && fresh.status === 'live' && global.StudySplitQuiz) {
      StudySplitQuiz.joinLobbySession(lobbyId);
    }
    toast(role === 'spectate' ? 'Joined as spectator' : 'Joined lobby');
    render();
  }

  async function leaveLobby(lobbyId) {
    lobbyId = lobbyId || state.activeLobbyId;
    const me = uid();
    if (!lobbyId || !me) return;
    if (global.StudySplitQuiz && StudySplitQuiz.leave) {
      try {
        StudySplitQuiz.leave({ skipHub: false, silent: true });
      } catch (e) {}
    }
    await removeMemberFromLobby(lobbyId, me, { reason: 'leave' });
    if (state.activeLobbyId === lobbyId) {
      state.activeLobbyId = null;
      state.mySeat = null;
    }
    notifyChatLeave();
    toast('Left lobby');
    render();
  }

  async function seatMember(lobbyId, seatIdx, memberUid, memberMeta) {
    const lobby = state.lobbies[lobbyId];
    if (!lobby) throw new Error('Lobby gone');
    if (!isLeaderOf(lobby)) throw new Error('Only lobby leader can seat members');
    const db = ensureDb();
    const seats = Object.assign({}, lobby.seats || {});
    Object.keys(seats).forEach((k) => {
      if (seats[k] && seats[k].uid === memberUid) delete seats[k];
    });
    if (Object.keys(seats).length >= SEATS && !seats[String(seatIdx)]) {
      throw new Error('Lobby full (max 4)');
    }
    const prev = (lobby.seats && Object.values(lobby.seats).find((s) => s && s.uid === memberUid)) || {};
    seats[String(seatIdx)] = {
      uid: memberUid,
      displayName: (memberMeta && memberMeta.displayName) || prev.displayName || 'Scholar',
      level: (memberMeta && memberMeta.level) || prev.level || 1,
      role: prev.role || 'play',
      bank: prev.bank || lobby.bank || 'banks/medphys/pt1.json',
      form: prev.form || lobby.form || 'A',
      updatedAt: Date.now()
    };
    if (Object.keys(seats).length > SEATS) throw new Error('Lobby full (max 4)');
    await db.ref('lobbies/' + lobbyId + '/seats').set(seats);
    if (lobby.members && lobby.members[memberUid]) {
      await db.ref('lobbies/' + lobbyId + '/members/' + memberUid + '/seat').set(seatIdx);
    }
  }

  async function clearSeat(lobbyId, seatIdx) {
    const lobby = state.lobbies[lobbyId];
    if (!isLeaderOf(lobby)) throw new Error('Only leader can clear seats');
    const seat = lobby.seats && lobby.seats[String(seatIdx)];
    if (seat && seat.uid) {
      await removeMemberFromLobby(lobbyId, seat.uid, { reason: 'cleared' });
    } else {
      await ensureDb().ref('lobbies/' + lobbyId + '/seats/' + seatIdx).remove();
    }
  }

  async function setSeatRole(lobbyId, seatIdx, role) {
    const lobby = state.lobbies[lobbyId];
    if (!lobby) throw new Error('Lobby gone');
    const me = uid();
    const seat = lobby.seats && lobby.seats[String(seatIdx)];
    if (!seat) throw new Error('Empty seat');
    const r = role === 'spectate' ? 'spectate' : 'play';
    if (!isLeaderOf(lobby) && seat.uid !== me) throw new Error('Cannot change that seat');
    await ensureDb()
      .ref('lobbies/' + lobbyId + '/seats/' + seatIdx)
      .update({ role: r, updatedAt: Date.now() });
    if (lobby.members && lobby.members[seat.uid]) {
      await ensureDb().ref('lobbies/' + lobbyId + '/members/' + seat.uid + '/role').set(r);
    }
  }

  async function setSeatBank(lobbyId, seatIdx, bank, form) {
    const lobby = state.lobbies[lobbyId];
    if (!isLeaderOf(lobby)) throw new Error('Only leader can assign banks');
    const seat = lobby.seats && lobby.seats[String(seatIdx)];
    if (!seat) throw new Error('Seat empty');
    await ensureDb()
      .ref('lobbies/' + lobbyId + '/seats/' + seatIdx)
      .update({
        bank: bank || lobby.bank,
        form: (form || 'A').toUpperCase(),
        updatedAt: Date.now()
      });
  }

  async function setGameMode(lobbyId, mode) {
    const lobby = state.lobbies[lobbyId];
    if (!isLeaderOf(lobby)) throw new Error('Only leader can set mode');
    if (lobby.status === 'live') throw new Error('Mode locked after start');
    const m = mode === 'classic' ? 'classic' : 'pane';
    await ensureDb().ref('lobbies/' + lobbyId + '/gameMode').set(m);
  }

  async function startLobby(lobbyId) {
    const lobby = state.lobbies[lobbyId];
    if (!lobby) throw new Error('Lobby gone');
    if (!isLeaderOf(lobby)) throw new Error('Only leader can start');
    const seats = lobby.seats || {};
    const n = Object.keys(seats).length;
    if (n < 1) throw new Error('Seat at least yourself');
    const db = ensureDb();
    const gameMode = lobby.gameMode === 'classic' ? 'classic' : 'pane';
    const startedAt = Date.now();
    // Keep same chatSessionId for continuity; members already present keep thread
    await db.ref('lobbies/' + lobbyId).update({
      status: 'live',
      startedAt: startedAt,
      seatCount: n,
      gameMode: gameMode
    });

    const panes = {};
    Object.keys(seats).forEach((k) => {
      const s = seats[k];
      panes[s.uid] = {
        qIndex: 0,
        selected: null,
        answers: [],
        displayName: s.displayName,
        level: s.level || 1,
        seat: Number(k),
        role: s.role || 'play',
        bank: s.bank || lobby.bank || 'banks/medphys/pt1.json',
        form: s.form || lobby.form || 'A',
        done: false,
        score: 0,
        updatedAt: startedAt
      };
    });

    const sessionBank = lobby.bank || 'banks/medphys/pt1.json';
    const sessionForm = lobby.form || 'A';
    await db.ref('lobbies/' + lobbyId + '/session').set({
      bank: sessionBank,
      form: sessionForm,
      gameMode: gameMode,
      startedAt: startedAt,
      leader: lobby.leader,
      chatSessionId: lobby.chatSessionId,
      classic: {
        qIndex: 0,
        bank: sessionBank,
        form: sessionForm
      },
      panes: panes
    });

    // Refresh lobby chat context (same session id — continuity)
    notifyChatLobby(
      Object.assign({}, lobby, {
        status: 'live',
        chatSessionId: lobby.chatSessionId
      })
    );

    toast(gameMode === 'classic' ? 'Starting classic quiz…' : 'Starting pane quiz…');
    if (global.StudySplitQuiz && StudySplitQuiz.joinLobbySession) {
      StudySplitQuiz.joinLobbySession(lobbyId);
    }
  }

  function listenActive(lobbyId) {
    if (state.unsubLobby) {
      state.unsubLobby();
      state.unsubLobby = null;
    }
    if (!lobbyId) return;
    const ref = ensureDb().ref('lobbies/' + lobbyId);
    const handler = (snap) => {
      const val = snap.val();
      if (!val) {
        if (state.activeLobbyId === lobbyId) {
          state.activeLobbyId = null;
          state.mySeat = null;
          clearDisconnectHooks();
          stopHeartbeat();
          notifyChatLeave();
          if (global.StudySplitQuiz && StudySplitQuiz.leave) {
            try {
              StudySplitQuiz.leave({ skipHub: false });
            } catch (e) {}
          }
          toast('Lobby closed');
        }
        delete state.lobbies[lobbyId];
        render();
        return;
      }
      state.lobbies[lobbyId] = val;
      const me = uid();
      if (me && val.members && !val.members[me] && state.activeLobbyId === lobbyId) {
        // Kicked / removed remotely
        state.activeLobbyId = null;
        state.mySeat = null;
        clearDisconnectHooks();
        stopHeartbeat();
        notifyChatLeave();
        if (global.StudySplitQuiz && StudySplitQuiz.leave) {
          try {
            StudySplitQuiz.leave({ skipHub: false });
          } catch (e) {}
        }
      }
      if (val.status === 'live' && global.StudySplitQuiz) {
        const inSeat = val.seats && Object.keys(val.seats).some((k) => val.seats[k].uid === me);
        if (inSeat || (val.members && val.members[me])) {
          StudySplitQuiz.joinLobbySession(lobbyId);
        }
      }
      if (me && val.members && val.members[me]) {
        notifyChatLobby(val);
      }
      render();
    };
    ref.on('value', handler);
    state.unsubLobby = () => ref.off('value', handler);
  }

  function partyMembers() {
    const party = StudyParty && StudyParty.getParty && StudyParty.getParty();
    if (!party || !party.members) return [];
    return Object.keys(party.members).map((id) => ({
      uid: id,
      displayName: party.members[id].displayName || '?',
      level: party.members[id].level || 1,
      leader: party.leader === id
    }));
  }

  function bankLabel(bank, form) {
    if (global.StudyBankPicker && StudyBankPicker.parseValue) {
      const short = String(bank || '').split('/').pop() || 'bank';
      return short.replace('.json', '') + ' · ' + (form || 'A');
    }
    return (form ? 'Form ' + form : 'Lobby');
  }

  function render() {
    const list = document.getElementById('lobbyList');
    const detail = document.getElementById('lobbyDetail');
    if (!list || !detail) return;
    const me = uid();
    const ids = Object.keys(state.lobbies)
      .filter((id) => isLobbyAlive(state.lobbies[id]))
      .sort((a, b) => (state.lobbies[b].createdAt || 0) - (state.lobbies[a].createdAt || 0));

    if (!ids.length) {
      list.innerHTML = '<div class="chat-empty">No open lobbies — create one.</div>';
    } else {
      list.innerHTML = ids
        .map((id) => {
          const L = state.lobbies[id];
          const n = Math.max(memberCount(L), seatCount(L));
          const mode = L.gameMode === 'classic' ? 'Classic' : 'Pane';
          const inIt = !!(L.members && me && L.members[me]);
          return (
            '<div class="lobby-row-wrap' +
            (id === state.activeLobbyId ? ' active' : '') +
            '" data-id="' +
            id +
            '">' +
            '<button type="button" class="lobby-row' +
            (id === state.activeLobbyId ? ' active' : '') +
            '" data-id="' +
            id +
            '"><span>' +
            mode +
            ' · ' +
            bankLabel(L.bank, L.form) +
            ' · ' +
            n +
            '/4 · ' +
            (L.status || 'open') +
            (inIt ? ' · you' : '') +
            '</span><em>' +
            id.slice(0, 6) +
            '</em></button>' +
            (!inIt && (L.status === 'open' || L.status === 'live')
              ? '<button type="button" class="lobby-join-btn chat-tool-btn" data-join="' +
                id +
                '">Join</button>'
              : '') +
            '</div>'
          );
        })
        .join('');
      list.querySelectorAll('.lobby-row').forEach((btn) => {
        btn.onclick = () => {
          state.activeLobbyId = btn.dataset.id;
          listenActive(state.activeLobbyId);
          render();
        };
      });
      list.querySelectorAll('[data-join]').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          joinLobby(btn.dataset.join).catch((err) => toast(err.message || 'Join failed'));
        };
      });
    }

    const id = state.activeLobbyId;
    const lobby = id && state.lobbies[id];
    if (!lobby || !isLobbyAlive(lobby)) {
      detail.hidden = true;
      detail.innerHTML = '';
      return;
    }
    detail.hidden = false;
    const leader = isLeaderOf(lobby);
    const seats = lobby.seats || {};
    const mySeatIdx = findMySeat(lobby, me);
    const inLobby = !!(lobby.members && me && lobby.members[me]);

    let seatsHtml = '<div class="lobby-seats">';
    for (let i = 0; i < SEATS; i++) {
      const s = seats[String(i)];
      const role = (s && s.role) || 'play';
      seatsHtml +=
        '<div class="lobby-seat" data-seat="' +
        i +
        '" data-drop="1">' +
        '<div class="lobby-seat-num">Seat ' +
        (i + 1) +
        (s ? ' · ' + (role === 'spectate' ? 'Spectate' : 'Play') : '') +
        '</div>' +
        (s
          ? '<div class="lobby-seat-occ" draggable="' +
            (leader ? 'true' : 'false') +
            '" data-uid="' +
            s.uid +
            '">' +
            s.displayName +
            ' · LV' +
            (s.level || 1) +
            '</div>' +
            '<div class="lobby-seat-bank">' +
            bankLabel(s.bank || lobby.bank, s.form || lobby.form) +
            '</div>' +
            (leader || s.uid === me
              ? '<div class="lobby-seat-actions">' +
                '<button type="button" class="lobby-mini-btn" data-role-seat="' +
                i +
                '" data-role="' +
                (role === 'spectate' ? 'play' : 'spectate') +
                '">' +
                (role === 'spectate' ? 'Set Play' : 'Set Spec') +
                '</button>' +
                (leader
                  ? '<select class="lobby-seat-bank-sel chat-tool-input" data-bank-seat="' +
                    i +
                    '"></select>'
                  : '') +
                '</div>'
              : '')
          : '<div class="lobby-seat-empty">Empty — Join or drop</div>') +
        '</div>';
    }
    seatsHtml += '</div>';

    const members = partyMembers();
    let bench =
      '<div class="lobby-bench"><div class="lobby-bench-label">Party bench (drag into seats)</div>';
    if (!members.length) {
      bench += '<div class="chat-empty">Form a party to drag members, or use Join on the list.</div>';
    } else {
      members.forEach((m) => {
        bench +=
          '<div class="lobby-bench-chip" draggable="' +
          (leader ? 'true' : 'false') +
          '" data-uid="' +
          m.uid +
          '" data-name="' +
          m.displayName +
          '" data-level="' +
          m.level +
          '">' +
          m.displayName +
          (m.leader ? ' ★' : '') +
          '</div>';
      });
    }
    bench += '</div>';

    const mode = lobby.gameMode === 'classic' ? 'classic' : 'pane';
    detail.innerHTML =
      '<div class="lobby-mode-row lobby-detail-mode">' +
      '<span class="lobby-mode-label">Mode</span>' +
      '<button type="button" class="mp-mode-pill' +
      (mode === 'pane' ? ' active' : '') +
      '" data-set-mode="pane"' +
      (leader && lobby.status === 'open' ? '' : ' disabled') +
      '>Pane</button>' +
      '<button type="button" class="mp-mode-pill' +
      (mode === 'classic' ? ' active' : '') +
      '" data-set-mode="classic"' +
      (leader && lobby.status === 'open' ? '' : ' disabled') +
      '>Classic</button>' +
      '</div>' +
      seatsHtml +
      bench +
      '<div class="lobby-actions">' +
      (leader && lobby.status === 'open'
        ? '<button type="button" class="btn-gold" id="lobbyStartBtn">Start · ' +
          Object.keys(seats).length +
          ' · ' +
          (mode === 'classic' ? 'Classic' : 'Pane') +
          '</button>'
        : lobby.status === 'live'
          ? '<span class="chat-tool-label">Quiz live</span>'
          : '<span class="chat-tool-label">Waiting for leader…</span>') +
      (inLobby
        ? '<button type="button" class="chat-tool-btn" id="lobbyLeaveBtn">Leave</button>'
        : '<button type="button" class="chat-tool-btn" id="lobbyJoinHereBtn">Join</button>' +
          '<button type="button" class="chat-tool-btn" id="lobbySpectateBtn">Spectate</button>') +
      '</div>';

    // Fill per-seat bank selects
    if (leader && global.StudyBankPicker) {
      StudyBankPicker.optionsHtml().then((html) => {
        detail.querySelectorAll('[data-bank-seat]').forEach((sel) => {
          const seatIdx = Number(sel.dataset.bankSeat);
          const s = seats[String(seatIdx)];
          sel.innerHTML = html;
          if (s) {
            const enc = StudyBankPicker.encodeValue(s.bank || lobby.bank, s.form || lobby.form);
            sel.value = enc;
          }
          sel.onchange = () => {
            const v = StudyBankPicker.parseValue(sel.value);
            setSeatBank(id, seatIdx, v.bank, v.form).catch((e) => toast(e.message || 'Bank failed'));
          };
        });
      });
    }

    if (leader) {
      detail.querySelectorAll('.lobby-bench-chip, .lobby-seat-occ').forEach((chip) => {
        chip.addEventListener('dragstart', (e) => {
          state.dragUid = chip.dataset.uid;
          e.dataTransfer.setData(
            'text/plain',
            JSON.stringify({
              uid: chip.dataset.uid,
              displayName: chip.dataset.name || chip.textContent,
              level: Number(chip.dataset.level) || 1
            })
          );
        });
      });
      detail.querySelectorAll('.lobby-seat').forEach((seat) => {
        seat.addEventListener('dragover', (e) => {
          e.preventDefault();
          seat.classList.add('drag-over');
        });
        seat.addEventListener('dragleave', () => seat.classList.remove('drag-over'));
        seat.addEventListener('drop', (e) => {
          e.preventDefault();
          seat.classList.remove('drag-over');
          let meta;
          try {
            meta = JSON.parse(e.dataTransfer.getData('text/plain'));
          } catch (err) {
            return;
          }
          seatMember(id, Number(seat.dataset.seat), meta.uid, meta).catch((err) =>
            toast(err.message || 'Seat failed')
          );
        });
        seat.addEventListener('dblclick', () => {
          if (seats[seat.dataset.seat]) {
            clearSeat(id, seat.dataset.seat).catch((err) => toast(err.message || 'Clear failed'));
          }
        });
      });
      const startBtn = detail.querySelector('#lobbyStartBtn');
      if (startBtn) startBtn.onclick = () => startLobby(id).catch((e) => toast(e.message || 'Start failed'));
    }

    detail.querySelectorAll('[data-set-mode]').forEach((btn) => {
      btn.onclick = () =>
        setGameMode(id, btn.dataset.setMode).catch((e) => toast(e.message || 'Mode failed'));
    });
    detail.querySelectorAll('[data-role-seat]').forEach((btn) => {
      btn.onclick = () =>
        setSeatRole(id, Number(btn.dataset.roleSeat), btn.dataset.role).catch((e) =>
          toast(e.message || 'Role failed')
        );
    });
    const leaveBtn = detail.querySelector('#lobbyLeaveBtn');
    if (leaveBtn) leaveBtn.onclick = () => leaveLobby(id).catch((e) => toast(e.message || 'Leave failed'));
    const joinHere = detail.querySelector('#lobbyJoinHereBtn');
    if (joinHere)
      joinHere.onclick = () => joinLobby(id, { role: 'play' }).catch((e) => toast(e.message || 'Join failed'));
    const specBtn = detail.querySelector('#lobbySpectateBtn');
    if (specBtn)
      specBtn.onclick = () =>
        joinLobby(id, { role: 'spectate' }).catch((e) => toast(e.message || 'Spectate failed'));
  }

  function open() {
    setOpen(true);
    if (global.StudyChat && StudyChat.setActivity) {
      try {
        StudyChat.setActivity({ activity: 'lobby', force: true });
      } catch (e) {}
    }
  }

  function getActiveLobbyId() {
    return state.activeLobbyId;
  }

  function getActiveLobby() {
    return state.activeLobbyId ? state.lobbies[state.activeLobbyId] : null;
  }

  // Auth / unload cleanup
  function wireAuth() {
    try {
      if (!global.firebase || !firebase.auth) return;
      let lastUid = null;
      firebase.auth().onAuthStateChanged((user) => {
        if (user) lastUid = user.uid;
        if (!user && state.activeLobbyId) {
          const id = state.activeLobbyId;
          const gone = lastUid;
          state.activeLobbyId = null;
          clearDisconnectHooks();
          stopHeartbeat();
          notifyChatLeave();
          // Best-effort; onDisconnect should already fire
          if (gone) {
            ensureDb()
              .ref('lobbies/' + id + '/members/' + gone)
              .remove()
              .catch(() => {});
          }
          lastUid = null;
        }
      });
    } catch (e) {}
    window.addEventListener('beforeunload', () => {
      // onDisconnect handles RTDB; stop timers
      stopHeartbeat();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireAuth);
  } else {
    wireAuth();
  }

  global.StudyLobby = {
    open,
    setOpen,
    create: createLobby,
    join: joinLobby,
    leave: leaveLobby,
    start: startLobby,
    setSeatRole,
    setSeatBank,
    setGameMode,
    getActiveLobbyId,
    getActiveLobby,
    SEATS
  };
})(window);
