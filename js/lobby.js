/* Study Portal — Online lobbies (max 4 seats, drag members, Start) */
(function (global) {
  const SEATS = 4;
  const state = {
    open: false,
    lobbies: {},
    activeLobbyId: null,
    unsubList: null,
    unsubLobby: null,
    dragUid: null
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
      '<p class="lobby-hint">Party leader: drag members into seats (max 4), then Start. Members follow the leader.</p>' +
      '<div class="lobby-toolbar">' +
      '<button type="button" class="chat-tool-btn" id="lobbyCreateBtn">Create lobby</button>' +
      '<select id="lobbyBankSelect" class="chat-tool-input" style="flex:1.2">' +
      '<option value="banks/medphys/pt1.json|A">PT1 · Form A</option>' +
      '<option value="banks/medphys/pt1.json|B">PT1 · Form B</option>' +
      '<option value="banks/medphys/pt1.json|C">PT1 · Form C</option>' +
      '<option value="banks/medphys/pt1.json|D">PT1 · Form D</option>' +
      '<option value="banks/medphys/pt1.json|E">PT1 · Form E</option>' +
      '<option value="banks/medphys/pt1.json|F">PT1 · Form F</option>' +
      '<option value="banks/medphys/pt1.json|G">PT1 · Form G</option>' +
      '<option value="banks/medphys/pt1.json|H">PT1 · Form H</option>' +
      '</select>' +
      '</div>' +
      '<div class="lobby-list" id="lobbyList"></div>' +
      '<div class="lobby-detail" id="lobbyDetail" hidden></div>';
    document.body.appendChild(panel);
    panel.querySelector('#lobbyCloseBtn').onclick = () => setOpen(false);
    panel.querySelector('#lobbyCreateBtn').onclick = () => createLobby().catch((e) => toast(e.message || 'Create failed'));
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
    const ref = db.ref('lobbies').orderByChild('createdAt').limitToLast(20);
    const handler = (snap) => {
      state.lobbies = snap.val() || {};
      render();
    };
    ref.on('value', handler);
    state.unsubList = () => ref.off('value', handler);
  }

  async function createLobby() {
    const me = uid();
    if (!me) throw new Error('Sign in first');
    if (!(StudyParty && StudyParty.isLeader && StudyParty.isLeader())) {
      // Allow create if not in party OR if leader; non-leader members blocked
      if (StudyParty && StudyParty.inParty && StudyParty.inParty() && !StudyParty.isLeader()) {
        throw new Error('Only the party leader can create a lobby');
      }
    }
    const sel = document.getElementById('lobbyBankSelect');
    const [bank, form] = String(sel && sel.value || 'banks/medphys/pt1.json|A').split('|');
    const id = randomId();
    const bits = profileBits();
    const seats = {};
    seats['0'] = { uid: me, displayName: bits.displayName, level: bits.level };
    const payload = {
      leader: me,
      partyId: (StudyParty && StudyParty.getPartyId && StudyParty.getPartyId()) || null,
      status: 'open',
      bank: bank,
      form: form || 'A',
      createdAt: Date.now(),
      seats: seats
    };
    await ensureDb().ref('lobbies/' + id).set(payload);
    state.activeLobbyId = id;
    toast('Lobby created');
    render();
  }

  async function seatMember(lobbyId, seatIdx, memberUid, memberMeta) {
    const lobby = state.lobbies[lobbyId];
    if (!lobby) throw new Error('Lobby gone');
    if (!isLeaderOf(lobby)) throw new Error('Only lobby leader can seat members');
    const db = ensureDb();
    // Remove member from other seats
    const seats = Object.assign({}, lobby.seats || {});
    Object.keys(seats).forEach((k) => {
      if (seats[k] && seats[k].uid === memberUid) delete seats[k];
    });
    if (Object.keys(seats).length >= SEATS && !seats[String(seatIdx)]) {
      throw new Error('Lobby full (max 4)');
    }
    seats[String(seatIdx)] = {
      uid: memberUid,
      displayName: (memberMeta && memberMeta.displayName) || 'Scholar',
      level: (memberMeta && memberMeta.level) || 1
    };
    // Enforce max 4
    if (Object.keys(seats).length > SEATS) throw new Error('Lobby full (max 4)');
    await db.ref('lobbies/' + lobbyId + '/seats').set(seats);
  }

  async function clearSeat(lobbyId, seatIdx) {
    const lobby = state.lobbies[lobbyId];
    if (!isLeaderOf(lobby)) throw new Error('Only leader can clear seats');
    await ensureDb().ref('lobbies/' + lobbyId + '/seats/' + seatIdx).remove();
  }

  async function startLobby(lobbyId) {
    const lobby = state.lobbies[lobbyId];
    if (!lobby) throw new Error('Lobby gone');
    if (!isLeaderOf(lobby)) throw new Error('Only leader can start');
    const seats = lobby.seats || {};
    const n = Object.keys(seats).length;
    if (n < 1) throw new Error('Seat at least yourself');
    const db = ensureDb();
    await db.ref('lobbies/' + lobbyId).update({
      status: 'live',
      startedAt: Date.now(),
      seatCount: n
    });
    // Seed session panes
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
        updatedAt: Date.now()
      };
    });
    // Keep bank/form on the session too: clients consume session directly.
    const sessionBank = lobby.bank || 'banks/medphys/pt1.json';
    const sessionForm = lobby.form || 'A';
    await db.ref('lobbies/' + lobbyId + '/session').set({
      bank: sessionBank,
      form: sessionForm,
      startedAt: Date.now(),
      leader: lobby.leader,
      panes: panes
    });
    toast('Starting split quiz…');
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
      if (!val) return;
      state.lobbies[lobbyId] = val;
      // Auto-join session when live
      if (val.status === 'live' && global.StudySplitQuiz) {
        const me = uid();
        const inSeat = val.seats && Object.keys(val.seats).some((k) => val.seats[k].uid === me);
        if (inSeat) StudySplitQuiz.joinLobbySession(lobbyId);
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

  function render() {
    const list = document.getElementById('lobbyList');
    const detail = document.getElementById('lobbyDetail');
    if (!list || !detail) return;
    const ids = Object.keys(state.lobbies).sort(
      (a, b) => (state.lobbies[b].createdAt || 0) - (state.lobbies[a].createdAt || 0)
    );
    if (!ids.length) {
      list.innerHTML = '<div class="chat-empty">No lobbies yet — create one.</div>';
    } else {
      list.innerHTML = ids
        .map((id) => {
          const L = state.lobbies[id];
          const n = Object.keys(L.seats || {}).length;
          return (
            '<button type="button" class="lobby-row' +
            (id === state.activeLobbyId ? ' active' : '') +
            '" data-id="' +
            id +
            '"><span>' +
            (L.form ? 'Form ' + L.form : 'Lobby') +
            ' · ' +
            n +
            '/4 · ' +
            (L.status || 'open') +
            '</span><em>' +
            id.slice(0, 6) +
            '</em></button>'
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
    }

    const id = state.activeLobbyId;
    const lobby = id && state.lobbies[id];
    if (!lobby) {
      detail.hidden = true;
      detail.innerHTML = '';
      return;
    }
    detail.hidden = false;
    const leader = isLeaderOf(lobby);
    const seats = lobby.seats || {};
    let seatsHtml = '<div class="lobby-seats">';
    for (let i = 0; i < SEATS; i++) {
      const s = seats[String(i)];
      seatsHtml +=
        '<div class="lobby-seat" data-seat="' +
        i +
        '" data-drop="1">' +
        '<div class="lobby-seat-num">Seat ' +
        (i + 1) +
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
            '</div>'
          : '<div class="lobby-seat-empty">Drop member</div>') +
        '</div>';
    }
    seatsHtml += '</div>';

    const members = partyMembers();
    let bench =
      '<div class="lobby-bench"><div class="lobby-bench-label">Party bench (drag into seats)</div>';
    if (!members.length) {
      bench += '<div class="chat-empty">Form a party first to drag members.</div>';
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

    detail.innerHTML =
      seatsHtml +
      bench +
      '<div class="lobby-actions">' +
      (leader
        ? '<button type="button" class="btn-gold" id="lobbyStartBtn">Start · ' +
          Object.keys(seats).length +
          ' players</button>'
        : '<span class="chat-tool-label">Waiting for leader to start…</span>') +
      '<div class="kb-mode-selector" id="lobbyModeSelector">' +
      '<button type="button" class="kb-mode-btn" data-mode="1">1</button>' +
      '<button type="button" class="kb-mode-btn" data-mode="2">2</button>' +
      '<button type="button" class="kb-mode-btn" data-mode="3">3</button>' +
      '<button type="button" class="kb-mode-btn" data-mode="4">4 Party</button>' +
      '</div></div>';

    // Drag/drop
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

    // Mode buttons are informational / set expected size label
    detail.querySelectorAll('.kb-mode-btn').forEach((btn) => {
      const n = Object.keys(seats).length;
      if (String(n) === btn.dataset.mode || (n === 4 && btn.dataset.mode === '4')) btn.classList.add('active');
    });
  }

  function open() {
    setOpen(true);
    if (global.StudyChat && StudyChat.setActivity) {
      try {
        StudyChat.setActivity({ activity: 'lobby', force: true });
      } catch (e) {}
    }
  }

  global.StudyLobby = {
    open,
    setOpen,
    create: createLobby,
    start: startLobby,
    SEATS
  };
})(window);
