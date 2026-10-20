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
    createSettings: { spectate: true, policy: 'ask', hostControl: false }
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

  const COPY_SVG = '<svg class="lobby-ico" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path d="M8 3h9a2 2 0 0 1 2 2v11h-2V5H8V3Zm-3 4h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm0 2v11h9V9H5Z" fill="currentColor"/></svg>';
  const CHEV_SVG = '<svg class="lobby-ico" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path d="M6.4 8.6 12 14.2l5.6-5.6L19 10l-7 7-7-7 1.4-1.4Z" fill="currentColor"/></svg>';
  const X_SVG = '<svg class="lobby-ico" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" fill="currentColor"/></svg>';
  function hueOf(name) { let h = 0; const t = String(name || 'x'); for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h % 360; }
  function initialsOf(name) { const p = String(name || '?').trim().split(/\s+/).filter(Boolean); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : (p[0] || '')[1] || '')).toUpperCase(); }
  function codeOf(id) { return String(id || '').slice(0, 6).toUpperCase(); }
  function copyCode() {
    const code = codeOf(state.activeLobbyId);
    if (!code) return;
    const done = () => toast('Lobby code ' + code + ' copied');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(code).then(done, done); return; }
    } catch (e) {}
    done();
  }
  /* spectators: watchers with a live tile plus members who switched to spectating */
  function spectatorCount(L) {
    if (global.StudySpectate && StudySpectate.spectatorCount) return StudySpectate.spectatorCount(L);
    return Object.keys((L && L.members) || {}).filter((k) => L.members[k] && L.members[k].role === 'spectate').length;
  }
  function paintEye(el, n) {
    if (!el) return;
    if (global.StudySpectate && StudySpectate.paintEye) StudySpectate.paintEye(el, n);
    else el.textContent = String(n);
  }
  function myRole(L) {
    const me = uid();
    const m = L && L.members && me && L.members[me];
    return m && m.role === 'spectate' ? 'spectate' : 'play';
  }
  /* why you cannot switch right now ('' when you can) */
  function spectateBlock(L) {
    const me = uid();
    if (!settingsOf(L).spectate) return 'Spectating is off for this lobby';
    if (Object.keys((L && L.members) || {}).filter((k) => k !== me).length === 0) return 'You are the only member';
    return '';
  }
  function playBlock(L) {
    if (findMySeat(L, uid()) != null) return '';
    if (findEmptySeat(L) == null) return 'Every seat is taken';
    if (settingsOf(L).policy === 'restrict' && !isLeaderOf(L)) return 'The leader has closed joining';
    return '';
  }

  /* settings of a lobby; lobbies made before settings existed allow everything */
  function settingsOf(lobby) {
    const st = (lobby && lobby.settings) || {};
    return {
      spectate: st.spectate !== false,
      hostControl: st.hostControl === true,
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
    try {
      const u = global.firebase && firebase.auth && firebase.auth().currentUser;
      return u ? u.uid : null;
    } catch (e) {
      return null; // SDK not loaded (offline or blocked)
    }
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
      await claimLeadIfNext(lobbyId, fresh);
    }
  }

  /* —— host migration ——
     successor = earliest joined remaining member (then seat order, then id); only the successor claims,
     with a transaction on the leader field, so two clients can never both take it */
  function successorOf(L, excludeUid) {
    const mem = (L && L.members) || {};
    const seatOf = (id) => { const k = findMySeat(L, id); return k == null ? 99 : Number(k); };
    const ids = Object.keys(mem).filter((id) => id !== excludeUid && mem[id] && mem[id].role !== 'spectate');
    const pool = ids.length ? ids : Object.keys(mem).filter((id) => id !== excludeUid);
    pool.sort((a, b) => ((mem[a].joinedAt || 0) - (mem[b].joinedAt || 0)) || (seatOf(a) - seatOf(b)) || (a < b ? -1 : a > b ? 1 : 0));
    return pool[0] || null;
  }
  async function claimLeadIfNext(lobbyId, L) {
    const me = uid();
    if (!me || !L || !L.members || !L.members[me] || !L.leader || L.members[L.leader]) return false;
    if (successorOf(L) !== me) return false;
    const old = L.leader;
    if (state.claiming === lobbyId + ':' + old) return false;
    state.claiming = lobbyId + ':' + old;
    try {
      const r = await ensureDb().ref('lobbies/' + lobbyId + '/leader').transaction((cur) => (cur === old ? me : undefined));
      return !!(r && r.committed);
    } catch (e) {
      console.warn('[lobby] leadership not claimed', e);
      return false;
    } finally {
      setTimeout(() => { if (state.claiming === lobbyId + ':' + old) state.claiming = null; }, 3000);
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
      const next = successorOf(lobby, memberUid);
      if (next) updates['leader'] = next;
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
      '<h3 id="lobbyPanelTitle">Online Lobbies</h3>' +
      '<span class="lobby-head-meta" id="lobbyHeadMeta" hidden>' +
      '<span class="lobby-status-pill" id="lobbyHeadStatus"></span>' +
      '<button type="button" class="lobby-code" id="lobbyCodeBtn" title="Copy the lobby code" aria-label="Copy the lobby code"><span class="lobby-code-text" id="lobbyCodeText"></span>' + COPY_SVG + '</button>' +
      '<span class="lobby-spec-count" id="lobbyHeadSpec"></span>' +
      '</span>' +
      '<span class="lobby-head-btns">' +
      '<button type="button" class="lobby-icon-btn lobby-collapse-btn" id="lobbyCollapseBtn" aria-label="Collapse lobby" title="Collapse to a small bar">' + CHEV_SVG + '</button>' +
      '<button type="button" class="lobby-icon-btn" id="lobbyCloseBtn" aria-label="Close" title="Close">' + X_SVG + '</button>' +
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
      '<button type="button" class="btn-gold lobby-create-btn" id="lobbyCreateBtn">Create Lobby</button>' +
      '</section>' +
      '<section class="lobby-open" aria-labelledby="lobbyListTitle">' +
      '<h4 class="lobby-section-title" id="lobbyListTitle">Open Lobbies</h4>' +
      '<div class="lobby-list" id="lobbyList"></div>' +
      '</section>';
    document.body.appendChild(panel);
    panel.querySelector('#lobbyCloseBtn').onclick = () => setOpen(false);
    panel.querySelector('#lobbyCollapseBtn').onclick = () => setCollapsed(true, { user: true });
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
    // in a lobby the panel never hides completely: it shrinks to this bar (desktop) / chip (phone)
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.id = 'lobbyPill';
    pill.className = 'lobby-pill';
    pill.hidden = true;
    pill.setAttribute('aria-expanded', 'false');
    pill.innerHTML = '<span class="lp-ico" aria-hidden="true">👥</span><span class="lp-text" id="lobbyPillText">Lobby</span><span class="lp-short" id="lobbyPillShort" aria-hidden="true"></span>' +
      '<span class="lp-spec lobby-spec-count" id="lobbyPillSpec"></span>' +
      '<span class="lp-badge" id="lobbyPillBadge" hidden></span><span class="lp-chev" aria-hidden="true">' + CHEV_SVG + '</span>';
    pill.onclick = () => setCollapsed(false);
    document.body.appendChild(pill);
    const notes = document.createElement('div');
    notes.id = 'lobbyNotes';
    notes.className = 'lobby-notes';
    notes.setAttribute('role', 'status');
    notes.setAttribute('aria-live', 'polite');
    document.body.appendChild(notes);
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
    panel.querySelector('#lobbyCodeBtn').onclick = () => copyCode();

    if (global.StudyBankPicker && StudyBankPicker.mount) {
      state.bankPicker = StudyBankPicker.mount(panel.querySelector('#lobbyCreateBankMount'), {
        idPrefix: 'lobbyCreate',
        compact: true,
        allTypes: true,
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
    const pill = document.getElementById('lobbyPill');
    const mineL = myJoinedLobby();
    panel.classList.toggle('in-lobby', !!mineL);
    if (mineL && pill) {
      // member of a lobby: the panel is either open or the compact bar, never gone
      if (!state.open) { state.open = true; state.collapsed = true; }
      const c = !!state.collapsed;
      panel.hidden = c;
      panel.classList.toggle('lobby-collapsed', c);
      fab.hidden = true;
      pill.hidden = !c;
      pill.setAttribute('aria-expanded', String(!c));
      paintPill(mineL);
      return;
    }
    if (pill) pill.hidden = true;
    const mobile = isMobile();
    const inLobby = !!(state.activeLobbyId || (typeof getActiveLobbyId === 'function' && getActiveLobbyId()));
    const collapsed = mobile && !!state.collapsed && (state.open || inLobby);
    panel.hidden = !state.open || collapsed;
    panel.classList.toggle('lobby-collapsed', collapsed);
    fab.hidden = !(mobile && (collapsed || (inLobby && !state.open)));
    fab.setAttribute('aria-expanded', String(!panel.hidden));
  }
  function setCollapsed(c, o) {
    ensurePanel();
    state.collapsed = !!c;
    const mineL = myJoinedLobby();
    if (mineL && mineL.status === 'live') { try { sessionStorage.setItem('lobby_live_collapsed', c ? '1' : '0'); } catch (e) {} }
    if (!c) { state.unseen = 0; }
    if (!c && !state.open) {
      setOpen(true);
      return;
    }
    syncCollapse();
  }

  function setOpen(open) {
    ensurePanel();
    // while you are in a lobby, "close" only shrinks the panel to the compact bar
    if (!open && myJoinedLobby()) { setCollapsed(true, { user: true }); return; }
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
    const settings = { v: 1, spectate: !!cs.spectate, policy: cs.policy || 'ask' };
    
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

    // Already seated? Spectators join without a seat.
    let seatIdx = findMySeat(lobby, me);
    const role = opts.role || 'play';
    if (seatIdx == null && role !== 'spectate') {
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
    // an accepted request, or a quiz that is already live: start on the compact bar
    if (opts.collapsed || (fresh && fresh.status === 'live')) {
      state.open = true;
      state.collapsed = true;
      if (fresh && fresh.status === 'live') state.autoKey = lobbyId + ':' + (fresh.startedAt || '');
    }

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

  /* the Spectate switch: give up your seat and watch, or take a free seat again.
     A leader who starts spectating hands leadership on, as when leaving. */
  async function setMyRole(lobbyId, role) {
    lobbyId = lobbyId || state.activeLobbyId;
    const me = uid();
    if (!me || !lobbyId) return;
    const db = ensureDb();
    const L = (await db.ref('lobbies/' + lobbyId).once('value')).val();
    if (!L || !L.members || !L.members[me]) throw new Error('You are not in this lobby');
    const want = role === 'spectate' ? 'spectate' : 'play';
    if (myRole(L) === want && (want === 'spectate' || findMySeat(L, me) != null)) return;
    const now = Date.now();
    const pane = L.session && L.session.panes && L.session.panes[me];
    if (want === 'spectate') {
      const why = spectateBlock(L);
      if (why) throw new Error(why);
      const up = {};
      const k = findMySeat(L, me);
      if (k != null) up['seats/' + k] = null;
      up['members/' + me + '/role'] = 'spectate';
      up['members/' + me + '/seat'] = null;
      if (pane) { up['session/panes/' + me + '/role'] = 'spectate'; up['session/panes/' + me + '/updatedAt'] = now; }
      let next = null;
      if (L.leader === me) { next = successorOf(L, me); if (next) up.leader = next; }
      await db.ref('lobbies/' + lobbyId).update(up);
      state.mySeat = null;
      await bindPresence(lobbyId, null, 'spectate');
      toast(next ? 'You are spectating · ' + ((L.members[next] && L.members[next].displayName) || 'the next player') + ' now leads' : 'You are spectating');
    } else {
      const why = playBlock(L);
      if (why) throw new Error(why);
      let k = findMySeat(L, me);
      if (k == null) {
        const bits = profileBits();
        const c = pane && pane.bank ? pane : L;
        const seat = { uid: me, displayName: bits.displayName, level: bits.level, role: 'play', bank: c.bank || 'banks/medphys/pt1.json', form: c.form || 'A', card: c.card || null, setLabel: c.setLabel || '', updatedAt: now };
        for (let tries = 0; tries < 2 && k == null; tries++) {
          const fresh = tries ? (await db.ref('lobbies/' + lobbyId).once('value')).val() : L;
          const free = findEmptySeat(fresh);
          if (free == null) throw new Error('Every seat is taken');
          const tx = await db.ref('lobbies/' + lobbyId + '/seats/' + free).transaction((cur) => (cur != null ? undefined : seat));
          if (tx.committed) k = free;
        }
        if (k == null) throw new Error('Could not take a seat · try again');
      }
      const up = {};
      up['members/' + me + '/role'] = 'play';
      up['members/' + me + '/seat'] = k;
      if (pane) { up['session/panes/' + me + '/role'] = 'play'; up['session/panes/' + me + '/seat'] = k; up['session/panes/' + me + '/updatedAt'] = now; }
      await db.ref('lobbies/' + lobbyId).update(up);
      state.mySeat = k;
      await bindPresence(lobbyId, k, 'play');
      toast('You are playing again');
    }
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
      // compare against our own last copy (the open-lobbies list listener also refreshes state.lobbies)
      const prevVal = state.notesSeen === lobbyId ? state.notePrev : null;
      state.lobbies[lobbyId] = val;
      const me = uid();
      try { diffNotes(lobbyId, prevVal, val); } catch (e) { console.warn('[lobby] notes', e); }
      state.notesSeen = lobbyId;
      try { state.notePrev = JSON.parse(JSON.stringify(val)); } catch (e) { state.notePrev = val; }
      // the quiz going live folds the panel into the compact bar (your last choice this session wins)
      if (me && val.members && val.members[me] && val.status === 'live') {
        const key = lobbyId + ':' + (val.startedAt || '');
        if (state.autoKey !== key) {
          state.autoKey = key;
          let pref = null;
          try { pref = sessionStorage.getItem('lobby_live_collapsed'); } catch (e) {}
          state.open = true;
          state.collapsed = pref !== '0';
          if (!state.collapsed) state.unseen = 0;
        }
      }
      try { syncMyProfile(); } catch (e) {}
      if (me && val.members && val.members[me] && val.leader && !val.members[val.leader]) claimLeadIfNext(lobbyId, val);
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
      chip('Requests: ' + ({ ask: 'Ask Me', restrict: 'Restricted', all: 'Allow All' }[st.policy] || 'Ask Me'), st.policy !== 'restrict')
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

  /* —— compact bar —— */
  function pendingRequests(L) {
    const me = uid();
    if (!L || L.leader !== me || !L.joinRequests) return [];
    return Object.keys(L.joinRequests).filter((k) => L.joinRequests[k] && L.joinRequests[k].status === 'pending');
  }
  function paintPill(L) {
    const t = document.getElementById('lobbyPillText');
    const b = document.getElementById('lobbyPillBadge');
    if (!t || !b || !L) return;
    const n = Math.max(memberCount(L), seatCount(L));
    const st = L.status === 'live' ? 'Live' : 'Open';
    t.textContent = 'Lobby · ' + n + '/' + SEATS + ' · ' + st;
    const sh = document.getElementById('lobbyPillShort');
    if (sh) sh.textContent = n + '/' + SEATS;
    paintEye(document.getElementById('lobbyPillSpec'), spectatorCount(L));
    const count = pendingRequests(L).length + (state.unseen | 0);
    b.hidden = !count;
    b.textContent = String(count);
    const pill = document.getElementById('lobbyPill');
    if (pill) {
      pill.classList.toggle('live', L.status === 'live');
      const sc = spectatorCount(L);
      pill.setAttribute('aria-label', t.textContent + ' · ' + (sc === 1 ? '1 spectator' : sc + ' spectators') + (count ? ' · ' + count + ' new' : '') + ' · expand');
      pill.title = 'Expand the lobby';
    }
  }

  /* —— live updates: banners at the top (join requests carry Accept / Decline) —— */
  const NOTE_MS = 6000;
  function noteBox() {
    let n = document.getElementById('lobbyNotes');
    if (!n) { ensurePanel(); n = document.getElementById('lobbyNotes'); }
    return n;
  }
  function pushNote(key, text, opts) {
    opts = opts || {};
    const box = noteBox();
    if (!box) return;
    let el = key ? box.querySelector('[data-key="' + key.replace(/"/g, '') + '"]') : null;
    if (!el) {
      el = document.createElement('div');
      el.className = 'lobby-note' + (opts.kind ? ' ' + opts.kind : '');
      if (key) el.dataset.key = key;
      box.appendChild(el);
    }
    el.innerHTML = '<span class="lobby-note-ico" aria-hidden="true">' + (opts.icon || '👥') + '</span><span class="lobby-note-text"></span>' +
      (opts.actions ? '<span class="lobby-note-btns">' + opts.actions.map((a, i) => '<button type="button" class="chat-tool-btn' + (a.primary ? ' primary' : '') + '" data-i="' + i + '">' + esc(a.label) + '</button>').join('') + '</span>' : '') +
      '<button type="button" class="lobby-note-x" aria-label="Dismiss">×</button>';
    el.querySelector('.lobby-note-text').textContent = text;
    el.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => { const a = opts.actions[+b.dataset.i]; el.remove(); if (a && a.run) a.run(); }; });
    el.querySelector('.lobby-note-x').onclick = () => el.remove();
    clearTimeout(el._t);
    if (!opts.sticky) el._t = setTimeout(() => el.remove(), NOTE_MS);
    if (state.collapsed) { state.unseen = (state.unseen | 0) + (opts.count === false ? 0 : 1); paintPill(myJoinedLobby()); }
    if (opts.sound && global.StudyAudio && typeof StudyAudio.notify === 'function') { try { StudyAudio.notify(); } catch (e) {} }
  }
  function dropNote(key) {
    const box = document.getElementById('lobbyNotes');
    const el = box && box.querySelector('[data-key="' + key + '"]');
    if (el) el.remove();
  }
  function respondRequest(lobbyId, reqUid, ok) {
    return ensureDb().ref('lobbies/' + lobbyId + '/joinRequests/' + reqUid + '/status').set(ok ? 'accepted' : 'declined')
      .catch((e) => toast((e && e.message) || 'Could not answer the request'));
  }
  function diffNotes(lobbyId, prev, cur) {
    const me = uid();
    if (!cur || !me || !cur.members || !cur.members[me]) return;
    // join requests (leader): one sticky banner each, with the answer buttons right there
    const reqs = cur.leader === me ? pendingRequests(cur) : [];
    reqs.forEach((k) => {
      const r = cur.joinRequests[k];
      const had = prev && prev.joinRequests && prev.joinRequests[k] && prev.joinRequests[k].status === 'pending';
      if (had && document.querySelector('#lobbyNotes [data-key="req-' + k + '"]')) return;
      pushNote('req-' + k, (r.displayName || 'Someone') + ' wants to join', {
        icon: '✋', kind: 'req', sticky: true, sound: !had, count: false,
        actions: [{ label: 'Accept', primary: true, run: () => respondRequest(lobbyId, k, true) }, { label: 'Decline', run: () => respondRequest(lobbyId, k, false) }]
      });
    });
    if (prev && prev.joinRequests) Object.keys(prev.joinRequests).forEach((k) => { if (reqs.indexOf(k) < 0) dropNote('req-' + k); });
    if (!prev) return; // first look: no "joined" noise for people already there
    if (prev.leader && cur.leader && prev.leader !== cur.leader && cur.members[cur.leader]) {
      const msg = cur.leader === me ? 'You are now the lobby leader' : (cur.members[cur.leader].displayName || 'Someone') + ' is now the lobby leader';
      pushNote('lead', msg, { icon: '★', count: false });
      toast(msg);
    }
    const pm = prev.members || {}, cm = cur.members || {};
    Object.keys(cm).forEach((k) => {
      if (k === me || pm[k]) return;
      const spec = cm[k].role === 'spectate';
      pushNote('join-' + k, (cm[k].displayName || 'Someone') + (spec ? ' joined as a spectator' : ' joined the lobby'), { icon: spec ? '👁' : '👋' });
    });
    Object.keys(pm).forEach((k) => { if (k !== me && !cm[k]) pushNote('left-' + k, (pm[k].displayName || 'Someone') + ' left the lobby', { icon: '🚪' }); });
    const ps = prev.spectators || {}, cs = cur.spectators || {};
    Object.keys(cs).forEach((k) => { if (k !== me && !ps[k] && !cm[k]) pushNote('spec-' + k, (cs[k].displayName || 'Someone') + ' is spectating', { icon: '👁' }); });
    if (cur.status === 'live' && prev.status !== 'live') pushNote('live', 'The quiz is live', { icon: '▶', count: false });
  }

  /* —— callsign and level follow your profile live (members, seat and pane records) —— */
  function syncMyProfile() {
    const id = state.activeLobbyId;
    const me = uid();
    const L = id && state.lobbies[id];
    if (!me || !L || !L.members || !L.members[me]) return;
    const b = profileBits();
    const db = ensureDb();
    const jobs = [];
    const diff = (rec) => rec && (rec.displayName !== b.displayName || (rec.level || 1) !== b.level);
    if (diff(L.members[me])) jobs.push(db.ref('lobbies/' + id + '/members/' + me).update({ displayName: b.displayName, level: b.level }));
    const sk = findMySeat(L, me);
    if (sk != null && L.seats && diff(L.seats[sk])) jobs.push(db.ref('lobbies/' + id + '/seats/' + sk).update({ displayName: b.displayName, level: b.level }));
    const pane = L.session && L.session.panes && L.session.panes[me];
    if (diff(pane)) jobs.push(db.ref('lobbies/' + id + '/session/panes/' + me).update({ displayName: b.displayName, level: b.level, updatedAt: Date.now() }));
    if (jobs.length) Promise.all(jobs).catch((e) => console.warn('[lobby] profile not synced', e));
  }
  global.addEventListener('study:profile', () => { try { syncMyProfile(); } catch (e) {} });

  function render() {
    syncCollapse();
    if (global.StudyCursors && StudyCursors.syncFromParty) {
      try { StudyCursors.syncFromParty(); } catch (e) {}
    }
    if (global.StudySpectate && StudySpectate.renderLobbyBox) {
      try { StudySpectate.renderLobbyBox(); } catch (e) {}
    }
    const mine = myJoinedLobby();
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
    paintHead(lobby && isLobbyAlive(lobby) ? lobby : null, id);
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

    const live = lobby.status === 'live';
    const panes = (lobby.session && lobby.session.panes) || {};
    let seatsHtml = '<div class="lobby-seats">';
    for (let i = 0; i < SEATS; i++) {
      const s = seats[String(i)];
      if (!s) {
        seatsHtml +=
          '<div class="lobby-seat empty" data-seat="' + i + '" data-drop="1">' +
          '<span class="ls-avatar ls-avatar-empty" aria-hidden="true">+</span>' +
          '<div class="lobby-seat-empty">Open seat' + (leader ? '<span class="ls-sub">Drop a party member here</span>' : '') + '</div></div>';
        continue;
      }
      const role = s.role === 'spectate' ? 'spectate' : 'play';
      const p = panes[s.uid] || null;
      const total = p ? p.total | 0 : 0;
      const pct = total ? Math.round(((p.answered | 0) / total) * 100) : 0;
      const pill = role === 'spectate' ? '<span class="lobby-pill-tag spec">Spectating</span>' : live ? '<span class="lobby-pill-tag live">Live</span>' : '<span class="lobby-pill-tag wait">Waiting</span>';
      seatsHtml +=
        '<div class="lobby-seat filled' + (s.uid === me ? ' is-me' : '') + (s.uid === lobby.leader ? ' is-leader' : '') + '" data-seat="' + i + '" data-drop="1" style="--friend-hue:' + hueOf(s.displayName) + '">' +
        '<div class="ls-top">' +
        '<span class="ls-avatar" aria-hidden="true">' + esc(initialsOf(s.displayName)) + '</span>' +
        '<div class="ls-who">' +
        '<div class="lobby-seat-occ" draggable="' + (leader ? 'true' : 'false') + '" data-uid="' + esc(s.uid) + '" title="' + esc(s.displayName) + '">' + esc(s.displayName) + (s.uid === lobby.leader ? ' <span class="ls-star" title="Lobby leader">★</span>' : '') + '</div>' +
        '<div class="lobby-seat-bank">' + esc(setLabelOf(lobby, s)) + '</div>' +
        '</div>' +
        '<span class="ls-level">LV ' + (s.level || 1) + '</span>' +
        '</div>' +
        '<div class="ls-foot">' + pill +
        '<span class="ls-prog" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></span>' +
        '<span class="ls-count">' + (total ? (p.answered | 0) + '/' + total : '') + '</span>' +
        '</div>' +
        (leader && !live
          ? '<div class="lobby-seat-actions"><select class="lobby-seat-bank-sel chat-tool-input" data-bank-seat="' + i + '" aria-label="Set for seat ' + (i + 1) + '"></select></div>'
          : '') +
        '</div>';
    }
    seatsHtml += '</div>';

    // spectators: members who switched to watching plus live-tile watchers
    const mem = lobby.members || {};
    const watchers = [];
    Object.keys(mem).forEach((k) => { if (mem[k] && mem[k].role === 'spectate') watchers.push({ name: mem[k].displayName || 'Member', member: true, me: k === me }); });
    Object.keys(lobby.spectators || {}).forEach((k) => { const v = lobby.spectators[k]; if (v && !mem[k] && Date.now() - (v.lastSeen || 0) < 60000) watchers.push({ name: v.displayName || 'Viewer', member: false }); });
    const specHtml = watchers.length
      ? '<div class="lobby-specs" aria-label="Spectators"><span class="lobby-specs-title">Spectating</span>' +
        watchers.map((w) => '<span class="lobby-spec-chip' + (w.me ? ' is-me' : '') + '" title="' + (w.member ? 'Lobby member' : 'Watching as a live tile') + '">' + esc(w.name) + '</span>').join('') + '</div>'
      : '';

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
    const myR = inLobby ? myRole(lobby) : null;
    const block = inLobby ? (myR === 'spectate' ? playBlock(lobby) : spectateBlock(lobby)) : '';
    const specSwitch = inLobby
      ? '<label class="lobby-switch lobby-spec-switch' + (block ? ' is-blocked' : '') + '" for="lobbySpecSw" title="' + esc(block || (myR === 'spectate' ? 'Take a free seat and play' : 'Watch without a seat')) + '">' +
        '<input type="checkbox" role="switch" id="lobbySpecSw"' + (myR === 'spectate' ? ' checked' : '') + (block ? ' disabled' : '') + ' aria-describedby="lobbySpecHint">' +
        '<span class="lobby-switch-track" aria-hidden="true"><span class="lobby-switch-thumb"></span></span><span class="lobby-switch-text">Spectate</span></label>'
      : '';
    const html =
      '<div class="lobby-detail-head">' +
      '<div class="lobby-detail-top"><div class="lobby-detail-title">' + esc(testLabelOf(lobby)) + '</div>' +
      '<span class="lobby-pill-tag ' + (live ? 'live' : 'wait') + '">' + (live ? 'Live' : 'Waiting') + '</span>' +
      (myR === 'spectate' ? '<span class="lobby-pill-tag spec">Spectating</span>' : '') + '</div>' +
      '<div class="lobby-detail-set">' + esc(setLabelOf(lobby)) + '</div>' +
      '<div class="lobby-chips">' + settingsChips(lobby) + '</div>' +
      '</div>' +
      (leader && lobby.status === 'open'
        ? '<div class="lobby-mode-row lobby-detail-mode lobby-segment" role="radiogroup" aria-label="Mode">' +
          '<button type="button" role="radio" aria-checked="' + (mode === 'pane') + '" class="mp-mode-pill' + (mode === 'pane' ? ' active' : '') + '" data-set-mode="pane">Pane</button>' +
          '<button type="button" role="radio" aria-checked="' + (mode === 'classic') + '" class="mp-mode-pill' + (mode === 'classic' ? ' active' : '') + '" data-set-mode="classic">Classic</button>' +
          '</div>'
        : '') +
      '<div class="lobby-group-title lobby-seats-title">Seats <span class="lobby-count-chip">' + Object.keys(seats).length + '/' + SEATS + '</span></div>' +
      seatsHtml +
      specHtml +
      (leader ? bench : '') +
      '<div class="lobby-actions">' +
      (leader && lobby.status === 'open'
        ? '<button type="button" class="btn-gold" id="lobbyStartBtn">Start · ' + Object.keys(seats).length + ' · ' + (mode === 'classic' ? 'Classic' : 'Pane') + '</button>'
        : lobby.status === 'live'
          ? ''
          : '<span class="chat-tool-label lobby-wait-note">Waiting for the leader to start</span>') +
      (inLobby
        ? '<div class="lobby-action-row">' + specSwitch + '<button type="button" class="chat-tool-btn danger lobby-leave-btn" id="lobbyLeaveBtn">Leave</button></div>' +
          '<p class="lobby-field-hint" id="lobbySpecHint">' + esc(block || (myR === 'spectate' ? 'You are watching. Switch off to take a free seat.' : 'Watch without leaving the lobby.')) + '</p>'
        : '<div class="lobby-action-row">' + (jm !== 'closed' ? '<button type="button" class="chat-tool-btn primary" id="lobbyJoinHereBtn">' + (jm === 'ask' ? 'Ask to Join' : 'Join') + '</button>' : '') +
          (st.spectate ? '<button type="button" class="chat-tool-btn" id="lobbySpectateBtn">Spectate</button>' : '') + '</div>') +
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
      StudyBankPicker.optionsHtml(t ? { subjectId: t.subjectId, allTypes: true } : { allTypes: true }).then((html) => {
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
    const specSw = detail.querySelector('#lobbySpecSw');
    if (specSw) specSw.onchange = () => {
      const want = specSw.checked ? 'spectate' : 'play';
      specSw.disabled = true;
      setMyRole(id, want).catch((e) => { toast(e.message || 'Could not switch'); render(); });
    };
    const leaveBtn = detail.querySelector('#lobbyLeaveBtn');
    if (leaveBtn) leaveBtn.onclick = () => confirmLeave(id);
    const joinHere = detail.querySelector('#lobbyJoinHereBtn');
    if (joinHere) joinHere.onclick = () => joinAction(id).catch((e) => toast(e.message || 'Join failed'));
    const specBtn = detail.querySelector('#lobbySpectateBtn');
    if (specBtn)
      specBtn.onclick = () =>
        joinLobby(id, { role: 'spectate' }).catch((e) => toast(e.message || 'Spectate failed'));
  }

  function paintHead(L, id) {
    const meta = document.getElementById('lobbyHeadMeta');
    const title = document.getElementById('lobbyPanelTitle');
    if (!meta || !title) return;
    meta.hidden = !L;
    title.textContent = L ? 'Lobby' : 'Online Lobbies';
    const hint = document.querySelector('#lobbyPanel .lobby-hint');
    if (hint) hint.hidden = !!myJoinedLobby();
    if (!L) return;
    const st = document.getElementById('lobbyHeadStatus');
    if (st) { st.textContent = L.status === 'live' ? 'Live' : 'Waiting'; st.className = 'lobby-status-pill lobby-pill-tag ' + (L.status === 'live' ? 'live' : 'wait'); }
    const ct = document.getElementById('lobbyCodeText');
    if (ct) ct.textContent = codeOf(id);
    paintEye(document.getElementById('lobbyHeadSpec'), spectatorCount(L));
  }
  function leaveText(L) {
    const me = uid();
    let t = L && L.status === 'live' ? "You'll leave the live quiz." : 'Your seat opens up.';
    if (L && L.leader === me) {
      const next = successorOf(L, me);
      const nm = next && L.members[next] && L.members[next].displayName;
      t += next ? ' Leadership passes to ' + (nm || 'the next player') + '.' : ' As the last member, the lobby will close.';
    }
    return t;
  }
  function confirmLeave(id) {
    id = id || state.activeLobbyId;
    const L = id && state.lobbies[id];
    const ask = global.StudyConfirm && StudyConfirm.ask
      ? StudyConfirm.ask({ title: 'Leave the lobby?', text: leaveText(L), confirm: 'Leave', cancel: 'Stay', danger: true, icon: 'leave' })
      : Promise.resolve(global.confirm ? global.confirm('Leave this lobby?') : true);
    return ask.then((ok) => (ok ? leaveLobby(id).catch((e) => toast(e.message || 'Leave failed')) : null));
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
    confirmLeave,
    refresh: () => render(),
    notify: pushNote,
    syncProfile: () => syncMyProfile(),
    successorOf,
    start: startLobby,
    setSeatRole,
    setMyRole,
    spectatorCount,
    canSpectate: (L) => spectateBlock(L || getActiveLobby()),
    canPlay: (L) => playBlock(L || getActiveLobby()),
    myRole: (L) => myRole(L || getActiveLobby()),
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
