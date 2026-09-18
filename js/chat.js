/* Study Portal — Chat dock (Lobby Only) */
(function (global) {
  const MSG_LIMIT = 50;
  const MSG_CAP = 70;
  const LS_DOCK = 'study_portal_chat_open_v1';
  const LS_VISIBLE = 'study_portal_chat_visible_v1';
  const LS_FRIENDS = 'study_portal_friends_v1';
  const LS_RATE_GENERAL = 'study_portal_chat_rate_general_v1';
  const PRESENCE_MIN_MS = 4000;
  const PRESENCE_HEARTBEAT_MS = 55000;
  const FRIENDS_MAX = 40;

  const CHANNELS = [
    { id: 'lobby', label: 'Lobby', enc: false }
  ];
  const ALL_CHANNEL_IDS = CHANNELS.map((c) => c.id);

  function loadRateLimits() {
    const limits = { global: [] };
    try {
      const now = Date.now();
      const globalRaw = localStorage.getItem(LS_RATE_GENERAL);
      if (globalRaw) {
        const arr = JSON.parse(globalRaw);
        if (Array.isArray(arr)) {
          limits.global = arr.filter(t => typeof t === 'number' && now - t < 60000);
        }
      }
    } catch (e) {}
    return limits;
  }

  function saveRateLimits() {
    try {
      const now = Date.now();
      const cleaned = (state.rateLimits.global || []).filter(t => typeof t === 'number' && now - t < 60000);
      localStorage.setItem(LS_RATE_GENERAL, JSON.stringify(cleaned));
    } catch (e) {}
  }

  const state = {
    ready: false,
    channel: 'lobby', // Default to lobby
    localRoom: 'hub',
    lobbyCtx: null,
    online: {},
    visible: null,
    unsubMsgs: null,
    unsubPresence: null,
    open: false,
    friends: [],
    activity: 'hub',
    quiz: null,
    lastPresenceAt: 0,
    lastPresenceSig: '',
    presenceTimer: null,
    rateLimits: loadRateLimits()
  };

  function toast(msg) {
    if (typeof showToast === 'function') showToast(msg, 2600);
  }

  function ensureFirebase() {
    if (!global.firebase) throw new Error('Firebase SDK missing');
    if (!global.FIREBASE_CONFIG) throw new Error('FIREBASE_CONFIG missing');
    if (!firebase.apps.length) firebase.initializeApp(global.FIREBASE_CONFIG);
    return {
      auth: firebase.auth(),
      db: firebase.database()
    };
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

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function loadVisible() {
    try {
      const raw = localStorage.getItem(LS_VISIBLE);
      if (!raw) return new Set(ALL_CHANNEL_IDS);
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || !arr.length) return new Set(ALL_CHANNEL_IDS);
      const filtered = arr.filter((id) => ALL_CHANNEL_IDS.indexOf(id) !== -1);
      return filtered.length ? new Set(filtered) : new Set(ALL_CHANNEL_IDS);
    } catch (e) {
      return new Set(ALL_CHANNEL_IDS);
    }
  }

  function saveVisible() {
    try {
      localStorage.setItem(LS_VISIBLE, JSON.stringify(Array.from(state.visible)));
    } catch (e) {}
  }

  function ensureVisible() {
    if (!state.visible) state.visible = loadVisible();
    return state.visible;
  }

  function channelPathFor(ch) {
    if (ch === 'lobby') {
      if (!state.lobbyCtx || !state.lobbyCtx.lobbyId || !state.lobbyCtx.chatSessionId) return null;
      return 'chat/lobby/' + state.lobbyCtx.lobbyId + '/session/' + state.lobbyCtx.chatSessionId;
    }
    return null;
  }

  function channelPath() {
    return channelPathFor(state.channel);
  }

  function loadFriends() {
    try {
      const raw = localStorage.getItem(LS_FRIENDS);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((f) => f && typeof f.uid === 'string' && f.uid)
        .map((f) => ({
          uid: String(f.uid),
          displayName: String(f.displayName || 'Scholar').slice(0, 40)
        }))
        .slice(0, FRIENDS_MAX);
    } catch (e) {
      return [];
    }
  }

  function saveFriends(list, opts) {
    opts = opts || {};
    const cleaned = (list || [])
      .filter((f) => f && f.uid)
      .map((f) => ({
        uid: String(f.uid),
        displayName: String(f.displayName || 'Scholar').slice(0, 40)
      }));
    const byUid = {};
    cleaned.forEach((f) => { byUid[f.uid] = f; });
    state.friends = Object.keys(byUid).map((k) => byUid[k]).slice(0, FRIENDS_MAX);
    try { localStorage.setItem(LS_FRIENDS, JSON.stringify(state.friends)); } catch (e) {}
    if (!opts.skipCloud && global.StudyProgress && StudyProgress.schedulePush) {
      try { StudyProgress.schedulePush(); } catch (e) {}
    }
    renderFriendsPanel();
  }

  function addFriend(uidStr, displayName) {
    const id = String(uidStr || '');
    if (!id) return false;
    const me = uid();
    if (me && id === me) { toast('Cannot add yourself'); return false; }
    const name = String(displayName || 'Scholar').slice(0, 40);
    const next = state.friends.slice();
    const idx = next.findIndex((f) => f.uid === id);
    if (idx >= 0) {
      next[idx] = { uid: id, displayName: name || next[idx].displayName };
      toast('Friend updated');
    } else {
      if (next.length >= FRIENDS_MAX) { toast('Friends list full'); return false; }
      next.push({ uid: id, displayName: name });
      toast('Added ' + name);
    }
    saveFriends(next);
    return true;
  }

  function removeFriend(uidStr) {
    const id = String(uidStr || '');
    saveFriends(state.friends.filter((f) => f.uid !== id));
    toast('Friend removed');
  }

  function bankShort(bank) {
    if (!bank) return 'Quiz';
    const s = String(bank);
    if (/pt1/i.test(s)) return 'PT1';
    const m = s.match(/([^/]+)\.json$/i);
    if (m) return m[1].replace(/[-_]/g, ' ').slice(0, 12).toUpperCase();
    return s.slice(0, 12);
  }

  function currentBankLabel() {
    try {
      if (global.__activeMaterial && __activeMaterial.bank) return bankShort(__activeMaterial.bank);
      if (global.__activeMaterial && __activeMaterial.title) return String(__activeMaterial.title).slice(0, 16);
    } catch (e) {}
    return 'PT1';
  }

  function deriveActivity() {
    if (state.activity === 'lobby') return 'lobby';
    if (state.localRoom && /^form_/i.test(state.localRoom)) return 'quiz';
    if (state.activity === 'quiz' && state.quiz) return 'quiz';
    return state.activity === 'lobby' ? 'lobby' : 'hub';
  }

  function presenceStatusLabel(p) {
    if (!p) return 'Online';
    if (p.activity === 'quiz' && p.quiz) {
      const bank = p.quiz.bank || 'Quiz';
      const form = p.quiz.form ? ' Form ' + p.quiz.form : '';
      return bank + form;
    }
    if (p.activity === 'lobby') return 'In lobby';
    return 'Online';
  }

  /* —— Presence —— */
  function schedulePresencePublish() {
    if (state.presenceTimer) clearTimeout(state.presenceTimer);
    state.presenceTimer = setTimeout(() => {
      state.presenceTimer = null;
      publishPresence();
    }, PRESENCE_MIN_MS);
  }

  async function publishPresence(force) {
    const me = uid();
    if (!me) return;
    const { db } = ensureFirebase();
    const bits = profileBits();
    const activity = deriveActivity();
    const payload = {
      state: 'online',
      displayName: bits.displayName,
      level: bits.level,
      updatedAt: Date.now(),
      activity: activity
    };
    if (activity === 'quiz' && state.quiz && (state.quiz.bank || state.quiz.form)) {
      payload.quiz = {};
      if (state.quiz.bank) payload.quiz.bank = String(state.quiz.bank).slice(0, 32);
      if (state.quiz.form) payload.quiz.form = String(state.quiz.form).slice(0, 8);
    }
    const sigObj = Object.assign({}, payload);
    delete sigObj.updatedAt;
    const sig = JSON.stringify(sigObj);
    const now = Date.now();
    if (!force) {
      if (sig === state.lastPresenceSig && now - state.lastPresenceAt < PRESENCE_HEARTBEAT_MS) return;
      if (sig !== state.lastPresenceSig && now - state.lastPresenceAt < PRESENCE_MIN_MS) {
        schedulePresencePublish();
        return;
      }
    }
    state.lastPresenceSig = sig;
    state.lastPresenceAt = now;
    const ref = db.ref('presence/' + me);
    await ref.set(payload);
    await ref.onDisconnect().remove();
  }

  function listenPresence() {
    const { db } = ensureFirebase();
    if (state.unsubPresence) state.unsubPresence();
    const ref = db.ref('presence');
    const handler = (snap) => {
      state.online = snap.val() || {};
      updateChannelMeta();
      renderFriendsPanel();
    };
    ref.on('value', handler);
    state.unsubPresence = () => ref.off('value', handler);
  }

  function getOnlineList() {
    const me = uid();
    return Object.keys(state.online)
      .filter((id) => id !== me)
      .map((id) => ({
        uid: id,
        displayName: state.online[id].displayName || 'Scholar',
        level: state.online[id].level || 1,
        presence: state.online[id]
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /* —— Messages —— */
  function stopMsgs() {
    if (state.unsubMsgs) {
      state.unsubMsgs();
      state.unsubMsgs = null;
    }
  }

  function listenMessages() {
    stopMsgs();
    ensureVisible();
    const log = document.getElementById('chatLog');
    const listening = CHANNELS.filter((c) => state.visible.has(c.id) && channelPathFor(c.id));
    if (!listening.length) {
      if (log) {
        let hint = 'Join a lobby to use Lobby chat.';
        log.innerHTML = '<div class="chat-empty">' + esc(hint) + '</div>';
      }
      return;
    }
    const { db } = ensureFirebase();
    const buckets = {};
    const unsubs = [];
    let refreshTimer = null;

    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(async () => {
        let all = [];
        listening.forEach((c) => {
          (buckets[c.id] || []).forEach((m) => {
            all.push(Object.assign({ _channel: c.id }, m));
          });
        });
        all.sort((a, b) => (a.ts || 0) - (b.ts || 0));
        if (all.length > MSG_CAP) all = all.slice(all.length - MSG_CAP);
        await renderMessages(all);
      }, 40);
    };

    listening.forEach((c) => {
      buckets[c.id] = [];
      let cutoff = Date.now() - (24 * 60 * 60 * 1000);
      if (c.id === 'lobby' && state.lobbyCtx && state.lobbyCtx.joinedAt) {
        cutoff = Math.max(cutoff, Number(state.lobbyCtx.joinedAt) || cutoff);
      }
      const q = db.ref(channelPathFor(c.id)).orderByChild('ts').startAt(cutoff).limitToLast(MSG_CAP);
      const handler = (snap) => {
        const rows = [];
        snap.forEach((child) => { rows.push(Object.assign({ id: child.key }, child.val() || {})); });
        buckets[c.id] = rows;
        refresh();
      };
      q.on('value', handler);
      unsubs.push(() => q.off('value', handler));
    });

    state.unsubMsgs = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      unsubs.forEach((fn) => fn());
    };
  }
  
  function channelTagLabel(id) {
    const ch = CHANNELS.find((c) => c.id === id);
    return ch ? ch.label : id;
  }

  async function renderMessages(rows) {
    const log = document.getElementById('chatLog');
    if (!log) return;
    const me = uid();
    const html = [];
    for (const m of rows) {
      const ch = m._channel || state.channel;
      const mine = m.uid === me;
      const t = m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      html.push(
        '<div class="chat-msg' + (mine ? ' mine' : '') + '" data-channel="' + esc(ch) + '">' +
        '<span class="chat-msg-head"><span class="chat-msg-tag tag-' + esc(ch) + '">[' + esc(channelTagLabel(ch)) + ']</span><span class="chat-msg-name"></span><span class="chat-msg-time">' + esc(t) + '</span></span>' +
        '<span class="chat-msg-body"></span></div>'
      );
    }
    log.innerHTML = html.length ? html.join('') : '<div class="chat-empty">No messages yet — say hi.</div>';
    const nodes = log.querySelectorAll('.chat-msg');
    for (let i = 0; i < rows.length; i++) {
      const m = rows[i];
      const node = nodes[i];
      if (!node) continue;
      const nameEl = node.querySelector('.chat-msg-name');
      const bodyEl = node.querySelector('.chat-msg-body');
      if (nameEl) nameEl.textContent = (m.displayName || '?') + (m.level ? ' · LV' + m.level : '');
      if (bodyEl) bodyEl.textContent = m.text || '';
    }
    log.scrollTop = log.scrollHeight;
  }

  async function sendMessage(raw) {
    let text = String(raw || '').trim();
    if (!text) return;
    if (text.length > 500) text = text.slice(0, 500);
    const me = uid();
    if (!me) { toast('Sign in first'); return; }

    const now = Date.now();

    // —— 1. CHECK LIMITS BEFORE SENDING ——
    state.rateLimits.global = state.rateLimits.global.filter(t => now - t < 60000);
    if (state.rateLimits.global.length >= 15) { toast('Please, do not flood.'); return; }
    const recent5s = state.rateLimits.global.filter(t => now - t < 5000);
    if (recent5s.length >= 3) { toast('Please, do not flood.'); return; }

    const path = channelPath();
    if (!path) {
      toast('Join a lobby first');
      return;
    }

    const bits = profileBits();
    const payload = {
      uid: me,
      displayName: bits.displayName,
      level: bits.level,
      ts: Date.now(),
      text: text
    };

    // —— 2. PROVISIONALLY ADD TO LIMITS ——
    state.rateLimits.global.push(now);

    // —— 3. SEND TO FIREBASE WITH REVERT ON FAILURE ——
    const { db } = ensureFirebase();
    const newMsgRef = db.ref(path).push();

    try {
      await newMsgRef.set(payload);
      try {
        await db.ref('rate_limits/' + me + '/chat_last').set(firebase.database.ServerValue.TIMESTAMP);
      } catch (markErr) { console.warn('Chat rate mark failed:', markErr); }
      saveRateLimits();
    } catch (e) {
      if (state.rateLimits.global.length) state.rateLimits.global.pop();
      saveRateLimits();
      const code = (e && e.code) || '';
      const msg = String((e && e.message) || e || '');
      const denied = code === 'PERMISSION_DENIED' || /PERMISSION_DENIED/i.test(msg);
      if (denied) toast('Message blocked by server rules. Try again or re-sign in.');
      else toast('Message failed to send. Check connection.');
      console.warn('Chat send failed:', e);
    }
  }

  /* —— UI —— */
  function ensureDock() {
    if (document.getElementById('chatDock')) return;
    ensureVisible();
    const dock = document.createElement('div');
    dock.id = 'chatDock';
    dock.className = 'chat-dock';
    dock.innerHTML =
      '<div class="chat-dock-bar">'+
      '<button type="button" class="chat-toggle" id="chatToggleBtn" title="Toggle chat" aria-expanded="false">💬 Chat</button>'+
      '<span class="chat-dock-meta" id="chatDockMeta"></span>'+
      '<div class="chat-dock-actions">'+
      '<div class="chat-friends-wrap">'+
      '<button type="button" class="chat-icon-btn chat-friends-btn" id="chatFriendsBtn" title="Friends" aria-haspopup="true" aria-expanded="false">Friends</button>'+
      '<div class="chat-friends-panel" id="chatFriendsPanel" hidden></div>'+
      '</div>'+
      '<button type="button" class="chat-minimize" id="chatMinBtn" title="Minimize" aria-label="Minimize">–</button>'+
      '</div>'+
      '</div>'+
      '<div class="chat-dock-body" id="chatDockBody" hidden>'+
      '<div class="chat-log" id="chatLog" aria-live="polite"></div>'+
      '<div class="chat-compose">'+
      '<div class="chat-channel-wrap">'+
      '<button type="button" class="chat-channel-btn" id="chatChannelBtn" aria-haspopup="listbox" aria-expanded="false">Lobby</button>'+
      '<div class="chat-channel-menu" id="chatChannelMenu" role="listbox" hidden></div>'+
      '</div>'+
      '<div class="chat-input-wrap">'+
      '<input type="text" id="chatInput" class="chat-input" maxlength="500" placeholder="Message…" autocomplete="off" />'+
      '</div>'+
      '<button type="button" class="chat-send" id="chatSendBtn" title="Send">➤</button>'+
      '</div>'+
      '</div>';
    document.body.appendChild(dock);

    rebuildChannelMenu();

    document.getElementById('chatToggleBtn').addEventListener('click', () => setOpen(!state.open));
    document.getElementById('chatMinBtn').addEventListener('click', () => setOpen(false));
    document.getElementById('chatFriendsBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFriendsPanel();
    });
    document.getElementById('chatChannelBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      closeFriendsPanel();
      toggleChannelMenu();
    });
    document.getElementById('chatSendBtn').addEventListener('click', () => {
      const input = document.getElementById('chatInput');
      sendMessage(input.value).then(() => { input.value = ''; hideAc(); });
    });
    const input = document.getElementById('chatInput');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value).then(() => { input.value = ''; hideAc(); });
      }
      if (e.key === 'Escape') hideAc();
    });

    document.addEventListener('click', (e) => {
      const wrap = document.querySelector('.chat-channel-wrap');
      if (wrap && !wrap.contains(e.target)) closeChannelMenu();
      const fwrap = document.querySelector('.chat-friends-wrap');
      if (fwrap && !fwrap.contains(e.target)) closeFriendsPanel();
    });
  }

  function toggleFriendsPanel() {
    const panel = document.getElementById('chatFriendsPanel');
    const btn = document.getElementById('chatFriendsBtn');
    if (!panel) return;
    const open = panel.hidden;
    if (open) { closeChannelMenu(); renderFriendsPanel(); }
    panel.hidden = !open;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeFriendsPanel() {
    const panel = document.getElementById('chatFriendsPanel');
    const btn = document.getElementById('chatFriendsBtn');
    if (panel) panel.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function renderFriendsPanel() {
    const panel = document.getElementById('chatFriendsPanel');
    if (!panel) return;
    const me = uid();
    const friends = state.friends || [];
    const onlineFriends = [];
    const offlineFriends = [];
    friends.forEach((f) => {
      if (me && f.uid === me) return;
      if (state.online[f.uid]) {
        const p = state.online[f.uid];
        onlineFriends.push({
          uid: f.uid,
          displayName: p.displayName || f.displayName || 'Scholar',
          level: p.level || 1,
          presence: p
        });
      } else {
        offlineFriends.push(f);
      }
    });
    onlineFriends.sort((a, b) => a.displayName.localeCompare(b.displayName));

    let html = '<div class="chat-friends-head">Friends</div>';
    if (!onlineFriends.length) {
      html += '<div class="chat-friends-empty">No friends online</div>';
    } else {
      onlineFriends.forEach((f) => {
        const status = presenceStatusLabel(f.presence);
        html +=
          '<div class="chat-friends-row" data-uid="' + esc(f.uid) + '">' +
          '<div class="chat-friends-main">' +
          '<span class="chat-friends-name"></span>' +
          '<span class="chat-friends-status">' + esc(status) + '</span>' +
          '</div>' +
          '<button type="button" class="chat-friends-x" data-act="remove" title="Remove friend">×</button>' +
          '</div>';
      });
    }
    if (offlineFriends.length) {
      html += '<div class="chat-friends-foot">' + offlineFriends.length + ' offline friend' + (offlineFriends.length === 1 ? '' : 's') + '</div>';
    }
    html += '<div class="chat-friends-actions"><button type="button" class="chat-tool-btn" id="chatAddFriendBtn">Add friend…</button></div>';

    const friendIds = {};
    friends.forEach((f) => { friendIds[f.uid] = true; });
    const addable = getOnlineList().filter((p) => !friendIds[p.uid]).slice(0, 6);
    if (addable.length) {
      html += '<div class="chat-friends-head subtle">Online — add</div>';
      addable.forEach((p) => {
        html +=
          '<div class="chat-friends-row addable" data-uid="' + esc(p.uid) + '">' +
          '<div class="chat-friends-main">' +
          '<span class="chat-friends-name"></span>' +
          '<span class="chat-friends-status">' + esc(presenceStatusLabel(p.presence)) + '</span>' +
          '</div>' +
          '<button type="button" class="chat-friends-add" data-act="add" title="Add friend">＋</button>' +
          '</div>';
      });
    }

    panel.innerHTML = html;

    Array.from(panel.querySelectorAll('.chat-friends-row:not(.addable)')).forEach((row, i) => {
      const f = onlineFriends[i];
      if (!f) return;
      const nameEl = row.querySelector('.chat-friends-name');
      if (nameEl) nameEl.textContent = f.displayName;
      row.querySelectorAll('[data-act="remove"]').forEach((btn) => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); removeFriend(f.uid); });
      });
    });
    Array.from(panel.querySelectorAll('.chat-friends-row.addable')).forEach((row, i) => {
      const p = addable[i];
      if (!p) return;
      const nameEl = row.querySelector('.chat-friends-name');
      if (nameEl) nameEl.textContent = p.displayName;
      const add = () => addFriend(p.uid, p.displayName);
      row.querySelectorAll('[data-act="add"]').forEach((btn) => btn.addEventListener('click', add));
    });

    const addBtn = panel.querySelector('#chatAddFriendBtn');
    if (addBtn) {
      addBtn.onclick = () => {
        const name = prompt('Add friend by exact @name (must be online):');
        if (!name) return;
        const n = String(name).replace(/^@/, '').trim().toLowerCase();
        const hit = getOnlineList().find((p) => p.displayName.toLowerCase() === n);
        if (!hit) { toast('Not online — need uid via presence'); return; }
        addFriend(hit.uid, hit.displayName);
      };
    }
  }

  function rebuildChannelMenu() {
    const menu = document.getElementById('chatChannelMenu');
    if (!menu) return;
    ensureVisible();
    menu.innerHTML = '';
    CHANNELS.forEach((c) => {
      const row = document.createElement('div');
      const isVis = state.visible.has(c.id);
      const isActive = state.channel === c.id;
      row.className = 'chat-channel-opt' + (isActive ? ' active' : '') + (isVis ? '' : ' dimmed');
      row.dataset.channel = c.id;

      const visBtn = document.createElement('button');
      visBtn.type = 'button';
      visBtn.className = 'chat-vis-btn' + (isVis ? '' : ' off');
      visBtn.title = isVis ? 'Hide ' + c.label + ' from feed' : 'Show ' + c.label + ' in feed';
      visBtn.setAttribute('aria-label', (isVis ? 'Hide ' : 'Show ') + c.label);
      visBtn.setAttribute('aria-pressed', isVis ? 'true' : 'false');
      visBtn.textContent = '👁';
      visBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleChannelVisible(c.id); });

      const labelBtn = document.createElement('button');
      labelBtn.type = 'button';
      labelBtn.setAttribute('role', 'option');
      labelBtn.className = 'chat-channel-label';
      labelBtn.textContent = c.label;
      labelBtn.title = 'Send on ' + c.label;
      labelBtn.addEventListener('click', () => { setChannel(c.id); closeChannelMenu(); });

      row.appendChild(visBtn);
      row.appendChild(labelBtn);
      menu.appendChild(row);
    });
  }

  function toggleChannelVisible(id) {
    ensureVisible();
    if (state.visible.has(id)) state.visible.delete(id);
    else state.visible.add(id);
    saveVisible();
    rebuildChannelMenu();
    listenMessages();
    updateChannelMeta();
  }

  function setOpen(open) {
    state.open = !!open;
    const dock = document.getElementById('chatDock');
    const body = document.getElementById('chatDockBody');
    const btn = document.getElementById('chatToggleBtn');
    if (!dock || !body) return;
    dock.classList.toggle('open', state.open);
    body.hidden = !state.open;
    if (btn) btn.setAttribute('aria-expanded', state.open ? 'true' : 'false');
    try { localStorage.setItem(LS_DOCK, state.open ? '1' : '0'); } catch (e) {}
    if (state.open) {
      listenMessages();
      setTimeout(() => {
        const input = document.getElementById('chatInput');
        if (input) input.focus();
      }, 40);
    }
  }

  function toggleChannelMenu() {
    const menu = document.getElementById('chatChannelMenu');
    const btn = document.getElementById('chatChannelBtn');
    if (!menu) return;
    const open = menu.hidden;
    if (open) rebuildChannelMenu();
    menu.hidden = !open;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeChannelMenu() {
    const menu = document.getElementById('chatChannelMenu');
    const btn = document.getElementById('chatChannelBtn');
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function setChannel(id) {
    state.channel = id;
    syncChannelUI();
    listenMessages();
  }

  function syncChannelUI() {
    const btn = document.getElementById('chatChannelBtn');
    const ch = CHANNELS.find((c) => c.id === state.channel) || CHANNELS[0];
    if (btn) btn.textContent = ch.label;
    const dock = document.getElementById('chatDock');
    if (dock) dock.dataset.channel = state.channel;
    rebuildChannelMenu();
    updateChannelMeta();
  }

  function updateChannelMeta() {
    const el = document.getElementById('chatDockMeta');
    if (!el) return;
    ensureVisible();
    const ch = CHANNELS.find((c) => c.id === state.channel) || CHANNELS[0];
    const onlineN = Object.keys(state.online).length;
    if (window.StudyNetStatus && window.StudyNetStatus.setOnlineCount) {
      window.StudyNetStatus.setOnlineCount(onlineN);
    }
    let meta = ch.label;
    if (state.channel === 'lobby' && state.lobbyCtx && state.lobbyCtx.lobbyId) {
      meta += ' · lobby ' + String(state.lobbyCtx.lobbyId).slice(0, 6);
    }
    el.textContent = meta;
  }

  function hideAc() {
    const ac = document.getElementById('chatAc');
    if (ac) { ac.hidden = true; ac.innerHTML = ''; }
  }

  // Stub for backwards compatibility if other files call this
  function onPartyChanged() {} 

  async function start() {
    try {
      ensureVisible();
      ensureDock();
      ensureFirebase();
      let tries = 0;
      while (!uid() && tries < 50) {
        await new Promise((r) => setTimeout(r, 100));
        tries++;
      }
      if (!uid()) { console.warn('chat: no auth yet'); return; }
      
      state.friends = loadFriends();
      await publishPresence(true);
      listenPresence();
      syncChannelUI();
      renderFriendsPanel();
      
      try { if (localStorage.getItem(LS_DOCK) === '1') setOpen(true); } catch (e) {}
      
      setInterval(() => { if (uid()) publishPresence(true); }, 60000);
      state.ready = true;
    } catch (e) {
      console.warn('chat start', e);
    }
  }

  function open() {
    ensureDock();
    setOpen(true);
  }

  function setLocalRoom(roomId) {
    state.localRoom = String(roomId || 'hub').slice(0, 64) || 'hub';
    if (/^form_/i.test(state.localRoom)) {
      const letter = state.localRoom.replace(/^form_/i, '').slice(0, 8);
      state.activity = 'quiz';
      state.quiz = { bank: currentBankLabel(), form: letter };
    } else if (state.localRoom === 'lobby' || state.localRoom === 'hub') {
      if (state.activity === 'quiz') state.activity = 'hub';
      state.quiz = null;
      if (state.activity !== 'lobby') state.activity = 'hub';
    }
    updateChannelMeta();
    publishPresence();
  }

  function setLobbyContext(ctx) {
    if (!ctx || !ctx.lobbyId || !ctx.chatSessionId) {
      const had = !!state.lobbyCtx;
      state.lobbyCtx = null;
      ensureVisible();
      if (had) { syncChannelUI(); listenMessages(); }
      publishPresence();
      return;
    }
    const next = {
      lobbyId: String(ctx.lobbyId).slice(0, 64),
      chatSessionId: String(ctx.chatSessionId).slice(0, 64),
      joinedAt: Number(ctx.joinedAt) || Date.now()
    };
    const same =
      state.lobbyCtx &&
      state.lobbyCtx.lobbyId === next.lobbyId &&
      state.lobbyCtx.chatSessionId === next.chatSessionId &&
      state.lobbyCtx.joinedAt === next.joinedAt;
    state.lobbyCtx = next;
    state.activity = 'lobby';
    ensureVisible();
    if (!state.visible.has('lobby')) {
      state.visible.add('lobby');
      saveVisible();
    }
    if (!channelPathFor(state.channel)) state.channel = 'lobby';
    syncChannelUI();
    if (!same) listenMessages();
    publishPresence(true);
  }

  function setActivity(info) {
    info = info || {};
    if (info.activity) state.activity = String(info.activity).slice(0, 16);
    if (Object.prototype.hasOwnProperty.call(info, 'quiz')) {
      state.quiz = info.quiz
        ? {
            bank: info.quiz.bank ? String(info.quiz.bank).slice(0, 32) : currentBankLabel(),
            form: info.quiz.form ? String(info.quiz.form).slice(0, 8) : undefined
          }
        : null;
      if (state.quiz && !state.quiz.form) delete state.quiz.form;
      if (state.quiz && !state.quiz.bank) delete state.quiz.bank;
      if (state.quiz && !state.quiz.bank && !state.quiz.form) state.quiz = null;
    }
    if (info.localRoom) state.localRoom = String(info.localRoom).slice(0, 64);
    if (Object.prototype.hasOwnProperty.call(info, 'lobbyCtx')) { setLobbyContext(info.lobbyCtx); return; }
    publishPresence(!!info.force);
  }

  function applyFriendsFromCloud(list) {
    if (!Array.isArray(list)) return;
    const local = loadFriends();
    const byUid = {};
    local.forEach((f) => { byUid[f.uid] = f; });
    list.forEach((f) => {
      if (!f || !f.uid) return;
      const id = String(f.uid);
      const name = String(f.displayName || 'Scholar').slice(0, 40);
      if (!byUid[id]) byUid[id] = { uid: id, displayName: name };
      else if (name && name !== 'Scholar') byUid[id].displayName = name;
    });
    saveFriends(Object.keys(byUid).map((k) => byUid[k]), { skipCloud: true });
  }

  global.StudyChat = {
    start,
    open,
    setLocalRoom,
    setLobbyContext,
    setActivity,
    getOnlineList,
    onPartyChanged,
    addFriend,
    removeFriend,
    getFriends: () => state.friends.slice(),
    applyFriendsFromCloud,
    isReady: () => state.ready
  };
})(window);
