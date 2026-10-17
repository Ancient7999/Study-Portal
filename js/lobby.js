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
    createCard: null,
    createChoice: null,
    createMode: 'pane',
    // lobby settings chosen at creation (stored at lobbies/{id}/settings; policy also at requestPolicy)
    createSettings: { spectate: true, policy: 'ask', share: true, cursors: true }
  };

  const POLICY_LABEL = { ask: 'Ask me', restrict: 'Restrict', all: 'Allow all' };
  const POLICY_HINT = {
    ask: 'You accept or decline each request to join.',
    restrict: 'Nobody can ask to join. You can still seat party members.',
    all: 'Anyone can join straight away while seats are free.'
  };
  const MODE_HINT = {
    pane: 'Everyone answers in their own pane, side by side.',
    classic: 'One shared question view with a roster of players.'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* settings of a lobby; lobbies made before settings existed allow everything */
  function settingsOf(lobby) {
    const st = (lobby && lobby.settings) || {};
    return {
      spectate: st.spectate !== false,
      share: st.share !== false,
      cursors: st.cursors !== false,
      policy: (lobby && lobby.requestPolicy) || st.policy || 'ask',
      legacy: !(lobby && lobby.settings)
    };
  }
  /* how a non-member gets in from the list: join, ask the leader, or closed */
  function joinModeOf(lobby) {
    const st = settingsOf(lobby);
    if (st.legacy) return 'join';
    return st.policy === 'all' ? 'join' : st.policy === 'restrict' ? 'closed' : 'ask';
  }

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
    const sw = (id, on, text, hint) =>
      '<div class="lobby-field">' +
      '<label class="lobby-switch" for="' + id + '"><input type="checkbox" role="switch" id="' + id + '"' + (on ? ' checked' : '') + ' aria-describedby="' + id + 'Hint">' +
      '<span class="lobby-switch-track" aria-hidden="true"><span class="lobby-switch-thumb"></span></span>' +
      '<span class="lobby-switch-text">' + text + '</span></label>' +
      '<p class="lobby-field-hint" id="' + id + 'Hint">' + hint + '</p></div>';
    const cs = state.createSettings;
    panel.innerHTML =
      '<div class="lobby-panel-head">' +
      '<h3>Online Lobbies</h3>' +
      '<span class="lobby-head-btns">' +
      '<button type="button" class="chat-minimize lobby-collapse-btn" id="lobbyCollapseBtn" aria-label="Collapse lobby">–</button>' +
      '<button type="button" class="chat-minimize" id="lobbyCloseBtn" aria-label="Close">×</button>' +
      '</span>' +
      '</div>' +
      '<p class="lobby-hint">Join an open lobby, or set up your own and invite your party.</p>' +
      '<div class="lobby-detail" id="lobbyDetail" hidden></div>' +
      '<section class="lobby-create lobby-toolbar lobby-create-block" id="lobbyCreate" aria-labelledby="lobbyCreateTitle">' +
      '<h4 class="lobby-section-title" id="lobbyCreateTitle">Create a Lobby</h4>' +
      '<div class="lobby-group">' +
      '<div class="lobby-group-title">Questions</div>' +
      '<p class="lobby-field-hint">The same tests and sets as on the Practice page.</p>' +
      '<div id="lobbyCreateBankMount" class="lobby-bank-mount"></div>' +
      '</div>' +
      '<div class="lobby-group">' +
      '<div class="lobby-group-title" id="lobbyModeTitle">Mode</div>' +
      '<div class="lobby-mode-row lobby-segment" role="radiogroup" aria-labelledby="lobbyModeTitle">' +
      '<button type="button" class="mp-mode-pill active" role="radio" aria-checked="true" data-mode="pane" id="lobbyModePane">Pane</button>' +
      '<button type="button" class="mp-mode-pill" role="radio" aria-checked="false" data-mode="classic" id="lobbyModeClassic">Classic</button>' +
      '</div>' +
      '<p class="lobby-field-hint" id="lobbyModeHint">' + MODE_HINT.pane + '</p>' +
      '</div>' +
      '<div class="lobby-group">' +
      '<div class="lobby-group-title">Spectators and Joining</div>' +
      sw('lobbyOptSpectate', cs.spectate, 'Allow spectators', 'Others can watch this lobby as a live tile.') +
      '<div class="lobby-field">' +
      '<label class="bank-picker-label" for="lobbyOptPolicy">Join requests</label>' +
      '<select id="lobbyOptPolicy" class="chat-tool-input" aria-describedby="lobbyOptPolicyHint">' +
      ['ask', 'restrict', 'all'].map((p) => '<option value="' + p + '"' + (p === cs.policy ? ' selected' : '') + '>' + POLICY_LABEL[p] + '</option>').join('') +
      '</select>' +
      '<p class="lobby-field-hint" id="lobbyOptPolicyHint">' + POLICY_HINT[cs.policy] + '</p>' +
      '</div>' +
      '</div>' +
      '<div class="lobby-group">' +
      '<div class="lobby-group-title">Playing Together</div>' +
      sw('lobbyOptShare', cs.share, 'Allow screen share', 'You can mirror one quiz to everyone and hand over control.') +
      sw('lobbyOptCursors', cs.cursors, 'Show party cursors', 'See where party members point while you play.') +
      '</div>' +
      '<button type="button" class="btn-gold lobby-create-btn" id="lobbyCreateBtn">Create Lobby</button>' +
      '</section>' +
      '<section class="lobby-open" aria-labelledby="lobbyListTitle">' +
      '<h4 class="lobby-section-title" id="lobbyListTitle">Open Lobbies</h4>' +
      '<div class="lobby-list" id="lobbyList"></div>' +
      '</section>';
    document.body.appendChild(panel);
    panel.querySelector('#lobbyCloseBtn').onclick = () => setOpen(false);
    panel.querySelector('#lobbyCollapseBtn').onclick = () => setCollapsed(true);
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 'lobbyFab';
    fab.className = 'lobby-fab';
    fab.hidden = true;
    fab.setAttribute('aria-label', 'Open lobby');
    fab.title = 'Lobby';
    fab.textContent = '👥';
    fab.onclick = () => setCollapsed(false);
    document.body.appendChild(fab);
    if (global.matchMedia) {
      const mq = global.matchMedia(MOBILE_MQ);
      const onMq = () => syncCollapse();
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
    panel.querySelector('#lobbyCreateBtn').onclick = () =>
      createLobby().catch((e) => toast(e.message || 'Create failed'));
    panel.querySelector('#lobbyModePane').onclick = () => setCreateMode('pane');
    panel.querySelector('#lobbyModeClassic').onclick = () => setCreateMode('classic');
    // arrow keys move between the two mode radios
    panel.querySelector('.lobby-segment').addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
      e.preventDefault();
      setCreateMode(state.createMode === 'pane' ? 'classic' : 'pane');
      const b = document.getElementById(state.createMode === 'pane' ? 'lobbyModePane' : 'lobbyModeClassic');
      if (b) b.focus();
    });
    const optSpec = panel.querySelector('#lobbyOptSpectate');
    const optPolicy = panel.querySelector('#lobbyOptPolicy');
    optSpec.onchange = () => {
      state.createSettings.spectate = optSpec.checked;
    };
    optPolicy.onchange = () => {
      state.createSettings.policy = POLICY_LABEL[optPolicy.value] ? optPolicy.value : 'ask';
      panel.querySelector('#lobbyOptPolicyHint').textContent = POLICY_HINT[state.createSettings.policy];
    };
    panel.querySelector('#lobbyOptShare').onchange = (e) => {
      state.createSettings.share = e.target.checked;
    };
    panel.querySelector('#lobbyOptCursors').onchange = (e) => {
      state.createSettings.cursors = e.target.checked;
    };

    if (global.StudyBankPicker && StudyBankPicker.mount) {
      state.bankPicker = StudyBankPicker.mount(panel.querySelector('#lobbyCreateBankMount'), {
        idPrefix: 'lobbyCreate',
        compact: true,
        value: { bank: state.createBank, form: state.createForm, card: state.createCard },
        onChange: (bank, form, enc, choice) => {
          state.createBank = bank;
          state.createForm = form;
          state.createCard = (choice && choice.card) || null;
          state.createChoice = choice || null;
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
    if (pane) {
      pane.classList.toggle('active', state.createMode === 'pane');
      pane.setAttribute('aria-checked', String(state.createMode === 'pane'));
      pane.tabIndex = state.createMode === 'pane' ? 0 : -1;
    }
    if (classic) {
      classic.classList.toggle('active', state.createMode === 'classic');
      classic.setAttribute('aria-checked', String(state.createMode === 'classic'));
      classic.tabIndex = state.createMode === 'classic' ? 0 : -1;
    }
    const hint = document.getElementById('lobbyModeHint');
    if (hint) hint.textContent = MODE_HINT[state.createMode];
  }

  /* Phones: the lobby panel collapses into a small icon pinned at the top. */
  const MOBILE_MQ = '(max-width: 800px)';
  function isMobile() {
    return !!(global.matchMedia && global.matchMedia(MOBILE_MQ).matches);
  }
  function syncCollapse() {
    const panel = document.getElementById('lobbyPanel');
    const fab = document.getElementById('lobbyFab');
    if (!panel || !fab) return;
    const mobile = isMobile();
    const inLobby = !!(state.activeLobbyId || (typeof getActiveLobbyId === 'function' && getActiveLobbyId()));
    const collapsed = mobile && !!state.collapsed && (state.open || inLobby);
    panel.hidden = !state.open || collapsed;
    panel.classList.toggle('lobby-collapsed', collapsed);
    fab.hidden = !(mobile && (collapsed || (inLobby && !state.open)));
    fab.setAttribute('aria-expanded', String(!panel.hidden));
  }
  function setCollapsed(c) {
    ensurePanel();
    state.collapsed = !!c;
    if (!c && !state.open) {
      setOpen(true);
      return;
    }
    syncCollapse();
  }

  function setOpen(open) {
    ensurePanel();
    state.open = !!open;
    if (state.open) state.collapsed = false;
    const panel = document.getElementById('lobbyPanel');
    if (panel) panel.hidden = !state.open;
    syncCollapse();
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
    if (myJoinedLobby()) {
      throw new Error('You are already in a lobby. Leave it first.');
    }

    if (StudyParty && StudyParty.inParty && StudyParty.inParty() && !StudyParty.isLeader()) {
      throw new Error('Only the party leader can create a lobby');
    }

    let bank = state.createBank;
    let form = state.createForm;
    let card = state.createCard || null;
    let choice = state.createChoice || null;
    if (state.bankPicker && state.bankPicker.getChoice) {
      if (state.bankPicker.ready) await state.bankPicker.ready();
      choice = state.bankPicker.getChoice();
      if (!choice) throw new Error('Pick a test and a set first');
      if (!choice.party) throw new Error('That set has no multiple-choice questions');
      bank = choice.bank;
      form = choice.form;
      card = choice.card || null;
    } else {
      const sel = document.getElementById('lobbyBankSelect');
      if (sel && global.StudyBankPicker) {
        const v = StudyBankPicker.parseValue(sel.value);
        bank = v.bank;
        form = v.form;
        card = v.card;
      }
    }
    const setLabel = (choice && choice.setLabel) || '';
    const testLabel = choice ? choice.subjectName + ' · ' + choice.testTitle : '';
    const cs = state.createSettings;
    const settings = { v: 1, spectate: !!cs.spectate, share: !!cs.share, cursors: !!cs.cursors, policy: cs.policy || 'ask' };
    
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
      card: card,
      setLabel: setLabel,
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
      card: card,
      setLabel: setLabel,
      testLabel: testLabel,
      settings: settings,
      chatSessionId: chatSessionId,
      createdAt: now,
      seats: seats,
      members: members
    };
    
    await ensureDb().ref('lobbies/' + id).set(payload);
    // requestPolicy is checked against the stored leader, so it is written after the lobby exists
    try {
      await ensureDb().ref('lobbies/' + id + '/requestPolicy').set(settings.policy);
    } catch (e) {
      console.warn('[lobby] join request policy not saved', e);
    }
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
    if (opts.role === 'spectate' && findMySeat(lobby, me) == null && !settingsOf(lobby).spectate) {
      throw new Error('This lobby does not allow spectators');
    }
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
        card: lobby.card || null,
        setLabel: lobby.setLabel || '',
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
        StudySplitQuiz.leave({ skipSets: false, silent: true });
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
      card: (prev.bank ? prev.card : lobby.card) || null,
      setLabel: (prev.bank ? prev.setLabel : lobby.setLabel) || '',
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

  async function setSeatBank(lobbyId, seatIdx, bank, form, card, setLabel) {
    const lobby = state.lobbies[lobbyId];
    if (!isLeaderOf(lobby)) throw new Error('Only leader can assign banks');
    const seat = lobby.seats && lobby.seats[String(seatIdx)];
    if (!seat) throw new Error('Seat empty');
    await ensureDb()
      .ref('lobbies/' + lobbyId + '/seats/' + seatIdx)
      .update({
        bank: bank || lobby.bank,
        form: (form || 'A').toUpperCase(),
        card: card || null,
        setLabel: setLabel || '',
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
        card: (s.bank ? s.card : lobby.card) || null,
        setLabel: (s.bank ? s.setLabel : lobby.setLabel) || '',
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
      card: lobby.card || null,
      setLabel: lobby.setLabel || '',
      gameMode: gameMode,
      startedAt: startedAt,
      leader: lobby.leader,
      chatSessionId: lobby.chatSessionId,
      classic: {
        qIndex: 0,
        bank: sessionBank,
        form: sessionForm,
        card: lobby.card || null
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
              StudySplitQuiz.leave({ skipSets: false });
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
            StudySplitQuiz.leave({ skipSets: false });
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
    const short = String(bank || '').split('/').pop() || 'bank';
    return short.replace('.json', '') + ' · ' + (form || 'A');
  }
  /* "Periodic Test 2 · Chapter 3: …" from the stored labels; older lobbies fall back to file · form */
  function setLabelOf(lobby, seat) {
    const own = seat && seat.bank;
    const label = own ? seat.setLabel : lobby && lobby.setLabel;
    if (label) return label;
    return bankLabel(own ? seat.bank : lobby && lobby.bank, own ? seat.form : lobby && lobby.form);
  }
  function testLabelOf(lobby) {
    if (lobby && lobby.testLabel) return lobby.testLabel;
    try {
      const t = global.StudyBankPicker && StudyBankPicker.testForBank && StudyBankPicker.testForBank(lobby && lobby.bank);
      if (t) return t.subjectName + ' · ' + t.title;
    } catch (e) {}
    return 'Lobby';
  }
  function chip(text, on) {
    return '<span class="lobby-chip' + (on === false ? ' off' : '') + '">' + esc(text) + '</span>';
  }
  function settingsChips(lobby) {
    const st = settingsOf(lobby);
    return (
      chip(lobby.gameMode === 'classic' ? 'Classic' : 'Pane') +
      chip(st.spectate ? 'Spectators On' : 'Spectators Off', st.spectate) +
      chip('Requests: ' + ({ ask: 'Ask Me', restrict: 'Restricted', all: 'Allow All' }[st.policy] || 'Ask Me'), st.policy !== 'restrict') +
      chip(st.share ? 'Screen Share On' : 'Screen Share Off', st.share) +
      chip(st.cursors ? 'Cursors On' : 'Cursors Off', st.cursors)
    );
  }
  function myJoinedLobby() {
    const me = uid();
    if (!me) return null;
    const id = Object.keys(state.lobbies).find((k) => state.lobbies[k] && state.lobbies[k].members && state.lobbies[k].members[me]);
    return id ? state.lobbies[id] : null;
  }
  function askToJoin(id) {
    if (global.StudySpectate && StudySpectate.askToJoin) return StudySpectate.askToJoin(id);
    return Promise.reject(new Error('Join requests are unavailable'));
  }
  function joinAction(id) {
    const L = state.lobbies[id];
    const m = joinModeOf(L);
    if (m === 'closed') return Promise.reject(new Error('This lobby is not taking join requests'));
    if (m === 'ask') return askToJoin(id).then(() => toast('Request sent to the leader'));
    return joinLobby(id, { role: 'play' });
  }

  function render() {
    syncCollapse();
    if (global.StudySpectate && StudySpectate.renderLobbyBox) {
      try { StudySpectate.renderLobbyBox(); } catch (e) {}
    }
    const mine = myJoinedLobby();
    if (global.StudyCursors && StudyCursors.setLobbyHidden) {
      try { StudyCursors.setLobbyHidden(!!(mine && !settingsOf(mine).cursors)); } catch (e) {}
    }
    const list = document.getElementById('lobbyList');
    const detail = document.getElementById('lobbyDetail');
    if (!list || !detail) return;
    const createSec = document.getElementById('lobbyCreate');
    if (createSec) createSec.hidden = !!mine; // one lobby at a time: the form returns after leaving
    const me = uid();
    const ids = Object.keys(state.lobbies)
      .filter((id) => isLobbyAlive(state.lobbies[id]))
      .sort((a, b) => (state.lobbies[b].createdAt || 0) - (state.lobbies[a].createdAt || 0));

    const listHtml = !ids.length
      ? '<div class="chat-empty lobby-empty">' + (mine ? 'No other open lobbies right now.' : 'No open lobbies yet. Create one above.') + '</div>'
      : ids
        .map((id) => {
          const L = state.lobbies[id];
          const n = Math.max(memberCount(L), seatCount(L));
          const mode = L.gameMode === 'classic' ? 'Classic' : 'Pane';
          const inIt = !!(L.members && me && L.members[me]);
          const st = settingsOf(L);
          const jm = joinModeOf(L);
          const canJoin = !inIt && (L.status === 'open' || L.status === 'live');
          return (
            '<div class="lobby-row-wrap' + (id === state.activeLobbyId ? ' active' : '') + '" data-id="' + id + '">' +
            '<button type="button" class="lobby-row' + (id === state.activeLobbyId ? ' active' : '') + '" data-id="' + id + '">' +
            '<span class="lobby-row-main"><span class="lobby-row-title">' + esc(testLabelOf(L)) + '</span>' +
            '<span class="lobby-row-set">' + esc(setLabelOf(L)) + '</span>' +
            '<span class="lobby-row-meta">' + mode + ' · ' + n + '/4 · ' + esc(L.status || 'open') + (inIt ? ' · you' : '') + '</span></span>' +
            '<em>' + id.slice(0, 6) + '</em></button>' +
            '<span class="lobby-row-btns">' +
            (canJoin && jm !== 'closed'
              ? '<button type="button" class="lobby-join-btn chat-tool-btn" data-join="' + id + '">' + (jm === 'ask' ? 'Ask to Join' : 'Join') + '</button>'
              : '') +
            (!inIt && st.spectate ? '<button type="button" class="lobby-watch-btn chat-tool-btn" data-watch="' + id + '" title="Watch as a spectator tile">👁 Watch</button>' : '') +
            '</span></div>'
          );
        })
        .join('');
    if (list.__h !== listHtml) {
      list.__h = listHtml;
      list.innerHTML = listHtml;
      list.querySelectorAll('.lobby-row').forEach((btn) => {
        btn.onclick = () => {
          state.activeLobbyId = btn.dataset.id;
          listenActive(state.activeLobbyId);
          render();
        };
      });
      list.querySelectorAll('[data-watch]').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          if (global.StudySpectate) StudySpectate.watch(btn.dataset.watch).catch((err) => toast(err.message || 'Watch failed'));
        };
      });
      list.querySelectorAll('[data-join]').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          joinAction(btn.dataset.join).catch((err) => toast(err.message || 'Join failed'));
        };
      });
    }

    const id = state.activeLobbyId;
    const lobby = id && state.lobbies[id];
    if (!lobby || !isLobbyAlive(lobby)) {
      detail.hidden = true;
      detail.innerHTML = '';
      detail.__h = '';
      return;
    }
    detail.hidden = false;
    const leader = isLeaderOf(lobby);
    const seats = lobby.seats || {};
    const inLobby = !!(lobby.members && me && lobby.members[me]);
    const st = settingsOf(lobby);

    let seatsHtml = '<div class="lobby-seats">';
    for (let i = 0; i < SEATS; i++) {
      const s = seats[String(i)];
      const role = (s && s.role) || 'play';
      seatsHtml +=
        '<div class="lobby-seat' + (s ? ' filled' : '') + '" data-seat="' + i + '" data-drop="1">' +
        '<div class="lobby-seat-num">Seat ' + (i + 1) + (s ? ' · ' + (role === 'spectate' ? 'Spectate' : 'Play') : '') + '</div>' +
        (s
          ? '<div class="lobby-seat-occ" draggable="' + (leader ? 'true' : 'false') + '" data-uid="' + esc(s.uid) + '">' + esc(s.displayName) + ' · LV' + (s.level || 1) + '</div>' +
            '<div class="lobby-seat-bank">' + esc(setLabelOf(lobby, s)) + '</div>' +
            (leader || s.uid === me
              ? '<div class="lobby-seat-actions">' +
                '<button type="button" class="lobby-mini-btn" data-role-seat="' + i + '" data-role="' + (role === 'spectate' ? 'play' : 'spectate') + '">' +
                (role === 'spectate' ? 'Set Play' : 'Set Spec') + '</button>' +
                (leader && lobby.status !== 'live'
                  ? '<select class="lobby-seat-bank-sel chat-tool-input" data-bank-seat="' + i + '" aria-label="Set for seat ' + (i + 1) + '"></select>'
                  : '') +
                '</div>'
              : '')
          : '<div class="lobby-seat-empty">Empty · join or drop a member here</div>') +
        '</div>';
    }
    seatsHtml += '</div>';

    const members = partyMembers();
    let bench = '<div class="lobby-bench"><div class="lobby-bench-label">Party bench · drag into seats</div>';
    if (!members.length) {
      bench += '<div class="chat-empty">Form a party to drag members in, or let others join from the list.</div>';
    } else {
      members.forEach((m) => {
        bench +=
          '<div class="lobby-bench-chip" draggable="' + (leader ? 'true' : 'false') + '" data-uid="' + esc(m.uid) + '" data-name="' + esc(m.displayName) + '" data-level="' + m.level + '">' +
          esc(m.displayName) + (m.leader ? ' ★' : '') + '</div>';
      });
    }
    bench += '</div>';

    const mode = lobby.gameMode === 'classic' ? 'classic' : 'pane';
    const jm = joinModeOf(lobby);
    const html =
      '<div class="lobby-detail-head">' +
      '<div class="lobby-detail-title">' + esc(testLabelOf(lobby)) + '</div>' +
      '<div class="lobby-detail-set">' + esc(setLabelOf(lobby)) + '</div>' +
      '<div class="lobby-chips">' + settingsChips(lobby) + '</div>' +
      '</div>' +
      '<div class="lobby-mode-row lobby-detail-mode lobby-segment" role="radiogroup" aria-label="Mode">' +
      '<span class="lobby-mode-label">Mode</span>' +
      '<button type="button" role="radio" aria-checked="' + (mode === 'pane') + '" class="mp-mode-pill' + (mode === 'pane' ? ' active' : '') + '" data-set-mode="pane"' + (leader && lobby.status === 'open' ? '' : ' disabled') + '>Pane</button>' +
      '<button type="button" role="radio" aria-checked="' + (mode === 'classic') + '" class="mp-mode-pill' + (mode === 'classic' ? ' active' : '') + '" data-set-mode="classic"' + (leader && lobby.status === 'open' ? '' : ' disabled') + '>Classic</button>' +
      '</div>' +
      seatsHtml +
      bench +
      '<div class="lobby-actions">' +
      (leader && lobby.status === 'open'
        ? '<button type="button" class="btn-gold" id="lobbyStartBtn">Start · ' + Object.keys(seats).length + ' · ' + (mode === 'classic' ? 'Classic' : 'Pane') + '</button>'
        : lobby.status === 'live'
          ? '<span class="chat-tool-label">Quiz live</span>'
          : '<span class="chat-tool-label">Waiting for leader…</span>') +
      (inLobby
        ? '<button type="button" class="chat-tool-btn" id="lobbyLeaveBtn">Leave</button>'
        : (jm !== 'closed' ? '<button type="button" class="chat-tool-btn" id="lobbyJoinHereBtn">' + (jm === 'ask' ? 'Ask to Join' : 'Join') + '</button>' : '') +
          (st.spectate ? '<button type="button" class="chat-tool-btn" id="lobbySpectateBtn">Spectate</button>' : '')) +
      '</div>';
    // unchanged (e.g. a heartbeat): keep the DOM so open dropdowns and focus survive
    if (detail.__h === html && detail.__id === id && detail.__leader === leader) return;
    detail.__h = html;
    detail.__id = id;
    detail.__leader = leader;
    detail.innerHTML = html;

    // per-seat set selects: the Practice sets of this lobby's subject
    if (leader && global.StudyBankPicker && detail.querySelector('[data-bank-seat]')) {
      const t = StudyBankPicker.testForBank && StudyBankPicker.testForBank(lobby.bank);
      StudyBankPicker.optionsHtml(t ? { subjectId: t.subjectId } : {}).then((html) => {
        detail.querySelectorAll('[data-bank-seat]').forEach((sel) => {
          const seatIdx = Number(sel.dataset.bankSeat);
          const s = seats[String(seatIdx)];
          sel.innerHTML = html;
          if (s) {
            const own = !!s.bank;
            sel.value = StudyBankPicker.encodeValue(own ? s.bank : lobby.bank, own ? s.form : lobby.form, own ? s.card : lobby.card);
          }
          sel.onchange = () => {
            const v = StudyBankPicker.parseValue(sel.value);
            const opt = sel.options[sel.selectedIndex];
            const grp = opt && opt.parentNode && opt.parentNode.label;
            const label = (grp && t ? grp + ' · ' : '') + (opt ? opt.textContent : '');
            setSeatBank(id, seatIdx, v.bank, v.form, v.card, label).catch((e) => toast(e.message || 'Set failed'));
          };
        });
      });
    }

    if (leader) {
      detail.querySelectorAll('.lobby-bench-chip, .lobby-seat-occ').forEach((chipEl) => {
        chipEl.addEventListener('dragstart', (e) => {
          state.dragUid = chipEl.dataset.uid;
          e.dataTransfer.setData(
            'text/plain',
            JSON.stringify({
              uid: chipEl.dataset.uid,
              displayName: chipEl.dataset.name || chipEl.textContent,
              level: Number(chipEl.dataset.level) || 1
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
    if (joinHere) joinHere.onclick = () => joinAction(id).catch((e) => toast(e.message || 'Join failed'));
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
    setCollapsed,
    create: createLobby,
    join: joinLobby,
    leave: leaveLobby,
    start: startLobby,
    setSeatRole,
    setSeatBank,
    setGameMode,
    getActiveLobbyId,
    getActiveLobby,
    getLobbies: () => state.lobbies,
    settingsOf,
    joinModeOf,
    getCreateSettings: () => Object.assign({}, state.createSettings),
    getCreateChoice: () => (state.bankPicker && state.bankPicker.getChoice ? state.bankPicker.getChoice() : null),
    pickerReady: () => (state.bankPicker && state.bankPicker.ready ? state.bankPicker.ready() : Promise.resolve()),
    SEATS
  };
})(window);
