/* Study Portal — Party (max 4, RTDB) */
(function (global) {
  const MAX = 4;
  const LS_PARTY = 'study_portal_party_v1';

  const state = {
    ready: false,
    partyId: null,
    party: null,
    unsubParty: null,
    inviteTarget: null
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

  function authUid() {
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
    const a = new Uint8Array(8);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function saveLocal(id) {
    try {
      if (id) localStorage.setItem(LS_PARTY, id);
      else localStorage.removeItem(LS_PARTY);
    } catch (e) {}
  }

  function loadLocal() {
    try {
      return localStorage.getItem(LS_PARTY) || null;
    } catch (e) {
      return null;
    }
  }

  function memberCount(party) {
    if (!party || !party.members) return 0;
    return Object.keys(party.members).length;
  }

  function isLeader() {
    const uid = authUid();
    return !!(state.party && uid && state.party.leader === uid);
  }

  function renderChips() {
    let stack = document.getElementById('partyPresenceStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'partyPresenceStack';
      stack.className = 'party-presence-stack';
      document.body.appendChild(stack);
    }
    let wrap = document.getElementById('partyChipRail');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'partyChipRail';
      wrap.className = 'party-chip-rail';
      wrap.setAttribute('aria-label', 'Party members');
      stack.appendChild(wrap);
    } else if (wrap.parentNode !== stack) {
      stack.appendChild(wrap);
    }
    wrap.innerHTML = '';
    if (!state.party || !state.party.members) {
      wrap.classList.remove('show');
      stack.classList.remove('show');
      return;
    }
    const entries = Object.keys(state.party.members).map((uid) => {
      const m = state.party.members[uid] || {};
      return { uid, displayName: m.displayName || '?', level: m.level || 1, leader: state.party.leader === uid };
    });
    entries.sort((a, b) => (a.leader === b.leader ? a.displayName.localeCompare(b.displayName) : a.leader ? -1 : 1));
    entries.forEach((m) => {
      const chip = document.createElement('div');
      chip.className = 'party-mini-chip' + (m.leader ? ' leader' : '');
      chip.setAttribute('data-uid', m.uid);
      chip.title = m.displayName + (m.leader ? ' (leader)' : '');
      const hue = hueFromName(m.displayName);
      chip.innerHTML =
        '<span class="pmc-av" style="--av-hue:' +
        hue +
        '">' +
        initials(m.displayName) +
        '</span>' +
        '<span class="pmc-meta"><span class="pmc-name"></span><span class="pmc-lvl">LV ' +
        m.level +
        '</span></span>';
      chip.querySelector('.pmc-name').textContent = m.displayName;
      wrap.appendChild(chip);
    });
    wrap.classList.add('show');
    const stackEl = document.getElementById('partyPresenceStack');
    if (stackEl) stackEl.classList.add('show');
  }

  function initials(name) {
    const p = String(name || 'S').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return 'S';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[1][0]).toUpperCase();
  }

  function hueFromName(name) {
    let h = 0;
    const s = String(name || 'x');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  function listenParty(partyId) {
    if (state.unsubParty) {
      state.unsubParty();
      state.unsubParty = null;
    }
    if (!partyId) {
      state.partyId = null;
      state.party = null;
      renderChips();
      if (global.StudyPartyTimers && StudyPartyTimers.stop) StudyPartyTimers.stop();
      if (global.StudyChat && StudyChat.onPartyChanged) StudyChat.onPartyChanged(null);
      return;
    }
    const db = ensureDb();
    const ref = db.ref('parties/' + partyId);
    const handler = (snap) => {
      const val = snap.val();
      const uid = authUid();
      if (!val || !val.members || !uid || !val.members[uid]) {
        // Removed / dissolved
        saveLocal(null);
        state.partyId = null;
        state.party = null;
        renderChips();
        if (global.StudyPartyTimers && StudyPartyTimers.stop) StudyPartyTimers.stop();
        if (global.StudyChat && StudyChat.onPartyChanged) StudyChat.onPartyChanged(null);
        return;
      }
      state.partyId = partyId;
      state.party = val;
      saveLocal(partyId);
      renderChips();
      if (global.StudyChat && StudyChat.onPartyChanged) StudyChat.onPartyChanged(val);
    };
    ref.on('value', handler);
    state.unsubParty = () => ref.off('value', handler);
  }

  async function createParty() {
    const uid = authUid();
    if (!uid) throw new Error('Sign in first');
    if (state.partyId) throw new Error('Already in a party');
    const db = ensureDb();
    const id = randomId();
    const bits = profileBits();
    const secret = randomId() + randomId();
    const payload = {
      leader: uid,
      secret: secret,
      createdAt: Date.now(),
      members: {}
    };
    payload.members[uid] = {
      displayName: bits.displayName,
      level: bits.level,
      joinedAt: Date.now()
    };
    await db.ref('parties/' + id).set(payload);
    // Auto-remove self on disconnect
    await db.ref('parties/' + id + '/members/' + uid).onDisconnect().remove();
    listenParty(id);
    toast('Party formed');
    return id;
  }

  async function joinParty(partyId) {
    const uid = authUid();
    if (!uid) throw new Error('Sign in first');
    const id = String(partyId || '').trim();
    if (!id) throw new Error('Party id required');
    const db = ensureDb();
    const ref = db.ref('parties/' + id);
    const snap = await ref.once('value');
    const val = snap.val();
    if (!val) throw new Error('Party not found');
    if (memberCount(val) >= MAX) throw new Error('Party is full (max 4)');
    const bits = profileBits();
    await ref.child('members/' + uid).set({
      displayName: bits.displayName,
      level: bits.level,
      joinedAt: Date.now()
    });
    await ref.child('members/' + uid).onDisconnect().remove();
    listenParty(id);
    toast('Joined party');
    return id;
  }

  async function inviteByName(displayName) {
    if (!isLeader()) throw new Error('Only the leader can invite');
    if (memberCount(state.party) >= MAX) throw new Error('Party is full (max 4)');
    const name = String(displayName || '').trim().toLowerCase();
    if (!name) throw new Error('Name required');
    const presence = (global.StudyChat && StudyChat.getOnlineList && StudyChat.getOnlineList()) || [];
    const hit = presence.find((p) => String(p.displayName || '').toLowerCase() === name);
    if (!hit) throw new Error('Player not online');
    if (state.party.members && state.party.members[hit.uid]) throw new Error('Already in party');
    // Soft invite: write pending invite under presence path of target? Simpler: push invite notice via whisper system msg
    // Store invite on party invites/{uid}
    const db = ensureDb();
    await db.ref('parties/' + state.partyId + '/invites/' + hit.uid).set({
      from: authUid(),
      fromName: profileBits().displayName,
      at: Date.now()
    });
    toast('Invite sent to ' + hit.displayName);
    return hit;
  }

  async function acceptInvite(partyId) {
    return joinParty(partyId);
  }

  async function kick(uid) {
    if (!isLeader()) throw new Error('Only the leader can kick');
    if (!state.partyId) throw new Error('No party');
    if (uid === authUid()) throw new Error('Cannot kick yourself — leave instead');
    const db = ensureDb();
    await db.ref('parties/' + state.partyId + '/members/' + uid).remove();
    toast('Kicked');
  }

  async function leave() {
    const uid = authUid();
    if (!uid || !state.partyId) return;
    const db = ensureDb();
    const id = state.partyId;
    const wasLeader = state.party && state.party.leader === uid;
    await db.ref('parties/' + id + '/members/' + uid).onDisconnect().cancel();
    await db.ref('parties/' + id + '/members/' + uid).remove();
    if (wasLeader) {
      // Transfer or dissolve
      const snap = await db.ref('parties/' + id + '/members').once('value');
      const members = snap.val() || {};
      const keys = Object.keys(members);
      if (!keys.length) {
        await db.ref('parties/' + id).remove();
      } else {
        await db.ref('parties/' + id + '/leader').set(keys[0]);
      }
    }
    saveLocal(null);
    listenParty(null);
    toast('Left party');
  }

  async function start() {
    try {
      ensureDb();
      // Wait briefly for auth/profile
      let tries = 0;
      while (!authUid() && tries < 40) {
        await new Promise((r) => setTimeout(r, 100));
        tries++;
      }
      if (!authUid()) return;
      const saved = loadLocal();
      if (saved) {
        try {
          const snap = await ensureDb().ref('parties/' + saved).once('value');
          const val = snap.val();
          if (val && val.members && val.members[authUid()]) {
            await ensureDb().ref('parties/' + saved + '/members/' + authUid()).onDisconnect().remove();
            listenParty(saved);
          } else {
            saveLocal(null);
          }
        } catch (e) {
          saveLocal(null);
        }
      }
      // Listen for invites
      const db = ensureDb();
      const uid = authUid();
      db.ref('parties').orderByChild('invites/' + uid + '/at').limitToLast(5).on('child_added', () => {});
      // Simpler invite watch: scan presence-driven UI will poll getPendingInvite
      state.ready = true;
    } catch (e) {
      console.warn('party start', e);
    }
  }

  async function getPendingInvite() {
    const uid = authUid();
    if (!uid) return null;
    const db = ensureDb();
    // Query is awkward without index — check known party from chat invite toast path.
    // Scan recent: not free-tier friendly. Instead store invites at invites/{uid}
    const snap = await db.ref('invites/' + uid).once('value');
    return snap.val();
  }

  // Prefer top-level invites/{uid} for free-tier friendliness
  async function sendInviteToUid(targetUid) {
    if (!isLeader()) throw new Error('Only the leader can invite');
    if (memberCount(state.party) >= MAX) throw new Error('Party is full (max 4)');
    const db = ensureDb();
    const bits = profileBits();
    await db.ref('invites/' + targetUid).set({
      partyId: state.partyId,
      from: authUid(),
      fromName: bits.displayName,
      at: Date.now()
    });
    await db.ref('invites/' + targetUid).onDisconnect().remove();
    toast('Invite sent');
  }

  function watchInvites(cb) {
    const uid = authUid();
    if (!uid) return () => {};
    const db = ensureDb();
    const ref = db.ref('invites/' + uid);
    const handler = (snap) => cb(snap.val());
    ref.on('value', handler);
    return () => ref.off('value', handler);
  }

  async function clearInvite() {
    const uid = authUid();
    if (!uid) return;
    await ensureDb().ref('invites/' + uid).remove();
  }

  function inParty() {
    return !!(state.partyId && state.party && authUid() && state.party.members && state.party.members[authUid()]);
  }

  function isNavLocked() {
    return inParty() && !isLeader();
  }

  function applyNavLock() {
    const locked = isNavLocked();
    document.body.classList.toggle('party-nav-locked', locked);
    let ban = document.getElementById('partyNavLockBanner');
    if (locked) {
      if (!ban) {
        ban = document.createElement('div');
        ban.id = 'partyNavLockBanner';
        ban.className = 'party-nav-lock-banner';
        ban.innerHTML =
          '<span>Party member — navigation locked. Profiles &amp; Leave Party only.</span>' +
          '<button type="button" class="chat-tool-btn danger" id="partyNavLeaveBtn">Leave Party</button>';
        document.body.appendChild(ban);
        ban.querySelector('#partyNavLeaveBtn').addEventListener('click', () => {
          leave().catch((e) => toast(e.message || 'Leave failed'));
        });
      }
      ban.hidden = false;
    } else if (ban) {
      ban.hidden = true;
    }
    // Soft-disable portal/hub interactive surfaces
    document.querySelectorAll('.portal-tab, .portal-card, #formGrid .card, #subjectTabs button').forEach((el) => {
      if (locked) {
        el.setAttribute('data-party-locked', '1');
        el.classList.add('party-locked-nav');
      } else {
        el.removeAttribute('data-party-locked');
        el.classList.remove('party-locked-nav');
      }
    });
  }

  // Capture-phase guard for nav while locked
  if (!global.__partyNavGuard) {
    global.__partyNavGuard = true;
    document.addEventListener(
      'click',
      (e) => {
        if (!isNavLocked()) return;
        const t = e.target.closest(
          '.portal-tab, .portal-card, #formGrid .card, #portalBackBtn, .hub-back button, #subjectTabs button, [data-form]'
        );
        if (!t) return;
        // Allow profile chip / leave / chat / lobby UI
        if (e.target.closest('#profileChip, #profileModal, #chatDock, #lobbyPanel, #partyNavLockBanner, .party-chip-rail, .party-presence-stack'))
          return;
        e.preventDefault();
        e.stopPropagation();
        toast('Only the party leader can navigate — Leave Party to explore freely');
      },
      true
    );
  }

  // Hook listenParty to refresh nav lock
  const _listenParty = listenParty;
  // re-wrap by patching handler end via applyNavLock calls in existing listenParty — monkeypatch render path
  const _origRender = renderChips;
  renderChips = function () {
    _origRender();
    applyNavLock();
    if (global.StudyPartyTimers && StudyPartyTimers.refreshUi) StudyPartyTimers.refreshUi();
  };

  global.StudyParty = {
    start,
    create: createParty,
    join: joinParty,
    leave: async function () {
      await leave();
      applyNavLock();
    },
    kick,
    inviteByName,
    sendInviteToUid,
    acceptInvite,
    watchInvites,
    clearInvite,
    getParty: () => state.party,
    getPartyId: () => state.partyId,
    isLeader,
    inParty,
    isNavLocked,
    applyNavLock,
    isReady: () => state.ready,
    MAX
  };
})(window);
