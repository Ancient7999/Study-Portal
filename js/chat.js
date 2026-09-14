/* Study Portal — Chat dock (RTDB channels + Web Crypto AES-GCM for Whisper/Party/Guild)
 * Client-side channel encryption only — not server-proof E2E (admins see ciphertext; members share keys).
 */
(function (global) {
  const MSG_LIMIT = 50;
  const MSG_CAP = 70;
  const LS_GUILD = 'study_portal_guild_v1';
  const LS_DOCK = 'study_portal_chat_open_v1';
  const LS_VISIBLE = 'study_portal_chat_visible_v1';

  const CHANNELS = [
    { id: 'local', label: 'Local', enc: false },
    { id: 'world', label: 'World', enc: false },
    { id: 'trade', label: 'Trade', enc: false, accent: 'trade' },
    { id: 'guild', label: 'Guild', enc: true },
    { id: 'whisper', label: 'Whisper', enc: true },
    { id: 'party', label: 'Party', enc: true }
  ];
  const ALL_CHANNEL_IDS = CHANNELS.map((c) => c.id);

  const state = {
    ready: false,
    channel: 'world',
    localRoom: 'lobby',
    guild: null, // { id, name, secret }
    whisperTarget: null, // { uid, displayName }
    online: {}, // uid -> presence
    visible: null, // Set of channel ids
    unsubMsgs: null,
    unsubPresence: null,
    unsubInvite: null,
    keyCache: {},
    open: false
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

  function b64(buf) {
    const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  function fromB64(str) {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function deriveKey(secret, saltStr) {
    const cacheKey = saltStr + '|' + secret;
    if (state.keyCache[cacheKey]) return state.keyCache[cacheKey];
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode(saltStr), iterations: 100000, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    state.keyCache[cacheKey] = key;
    return key;
  }

  async function encryptText(plain, secret, salt) {
    const key = await deriveKey(secret, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
    return { ct: b64(ct), iv: b64(iv) };
  }

  async function decryptText(ctB64, ivB64, secret, salt) {
    try {
      const key = await deriveKey(secret, salt);
      const pt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromB64(ivB64) },
        key,
        fromB64(ctB64)
      );
      return new TextDecoder().decode(pt);
    } catch (e) {
      return '[unable to decrypt]';
    }
  }

  function whisperPair(a, b) {
    return [a, b].sort().join('_');
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
    if (ch === 'world') return 'chat/world';
    if (ch === 'trade') return 'chat/trade';
    if (ch === 'local') return 'chat/local/' + (state.localRoom || 'lobby');
    if (ch === 'guild') {
      if (!state.guild || !state.guild.id) return null;
      return 'chat/guild/' + state.guild.id;
    }
    if (ch === 'party') {
      const pid = global.StudyParty && StudyParty.getPartyId && StudyParty.getPartyId();
      if (!pid) return null;
      return 'chat/party/' + pid;
    }
    if (ch === 'whisper') {
      const me = uid();
      if (!me || !state.whisperTarget) return null;
      return 'chat/whisper/' + whisperPair(me, state.whisperTarget.uid);
    }
    return null;
  }

  function channelPath() {
    return channelPathFor(state.channel);
  }

  async function channelCryptoFor(ch) {
    if (ch === 'whisper' && state.whisperTarget) {
      const me = uid();
      const secret = whisperPair(me, state.whisperTarget.uid);
      return { secret, salt: 'study-portal-whisper-v1' };
    }
    if (ch === 'party') {
      const party = global.StudyParty && StudyParty.getParty && StudyParty.getParty();
      if (!party || !party.secret) return null;
      const pid = StudyParty.getPartyId();
      return { secret: party.secret + ':' + pid, salt: 'study-portal-party-v1' };
    }
    if (ch === 'guild' && state.guild && state.guild.secret) {
      return { secret: state.guild.secret + ':' + state.guild.id, salt: 'study-portal-guild-v1' };
    }
    return null;
  }

  async function channelCrypto() {
    return channelCryptoFor(state.channel);
  }

  function needsEncFor(ch) {
    return ch === 'whisper' || ch === 'party' || ch === 'guild';
  }

  function needsEnc() {
    return needsEncFor(state.channel);
  }

  /* —— Presence —— */
  async function publishPresence() {
    const me = uid();
    if (!me) return;
    const { db } = ensureFirebase();
    const bits = profileBits();
    const partyId = (global.StudyParty && StudyParty.getPartyId && StudyParty.getPartyId()) || null;
    const payload = {
      state: 'online',
      displayName: bits.displayName,
      level: bits.level,
      updatedAt: Date.now()
    };
    if (partyId) payload.partyId = partyId;
    if (state.guild && state.guild.id) payload.guildId = state.guild.id;
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
      renderAutocomplete();
      updateChannelMeta();
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
        level: state.online[id].level || 1
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
        let hint = 'No visible channels to show. Use the eye icons in the channel menu.';
        if (state.visible.has('guild') && !state.guild) hint = 'Create or join a guild, or hide Guild in the filter.';
        else if (state.visible.has('party') && !(StudyParty && StudyParty.getPartyId && StudyParty.getPartyId()))
          hint = 'Create or join a party, or hide Party in the filter.';
        else if (state.visible.has('whisper') && !state.whisperTarget) hint = 'Type @name to whisper, or hide Whisper in the filter.';
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
      const q = db.ref(channelPathFor(c.id)).orderByChild('ts').limitToLast(MSG_LIMIT);
      const handler = (snap) => {
        const rows = [];
        snap.forEach((child) => {
          rows.push(Object.assign({ id: child.key }, child.val() || {}));
        });
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
    const cryptoCache = {};
    const html = [];
    for (const m of rows) {
      const ch = m._channel || state.channel;
      const mine = m.uid === me;
      const t = m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      html.push(
        '<div class="chat-msg' +
          (mine ? ' mine' : '') +
          '" data-channel="' +
          esc(ch) +
          '">' +
          '<span class="chat-msg-head"><span class="chat-msg-tag tag-' +
          esc(ch) +
          '">[' +
          esc(channelTagLabel(ch)) +
          ']</span><span class="chat-msg-name"></span><span class="chat-msg-time">' +
          esc(t) +
          '</span></span>' +
          '<span class="chat-msg-body"></span></div>'
      );
    }
    log.innerHTML = html.length ? html.join('') : '<div class="chat-empty">No messages yet — say hi.</div>';
    const nodes = log.querySelectorAll('.chat-msg');
    for (let i = 0; i < rows.length; i++) {
      const m = rows[i];
      const node = nodes[i];
      if (!node) continue;
      const ch = m._channel || state.channel;
      const nameEl = node.querySelector('.chat-msg-name');
      const bodyEl = node.querySelector('.chat-msg-body');
      if (nameEl) nameEl.textContent = (m.displayName || '?') + (m.level ? ' · LV' + m.level : '');
      let text = m.text || '';
      if (m.ct && m.iv) {
        if (!Object.prototype.hasOwnProperty.call(cryptoCache, ch)) {
          cryptoCache[ch] = needsEncFor(ch) ? await channelCryptoFor(ch) : null;
        }
        const cryptoInfo = cryptoCache[ch];
        if (cryptoInfo) text = await decryptText(m.ct, m.iv, cryptoInfo.secret, cryptoInfo.salt);
        else text = '[encrypted]';
      }
      if (bodyEl) bodyEl.textContent = text;
    }
    log.scrollTop = log.scrollHeight;
  }

  async function sendMessage(raw) {
    let text = String(raw || '').trim();
    if (!text) return;
    if (text.length > 500) text = text.slice(0, 500);
    const me = uid();
    if (!me) {
      toast('Sign in first');
      return;
    }

    // Whisper @mention shortcut from any channel
    if (state.channel === 'whisper' || text.startsWith('@')) {
      const m = text.match(/^@(\S+)\s+([\s\S]+)$/);
      if (state.channel === 'whisper' && !state.whisperTarget) {
        const only = text.match(/^@(\S+)\s*$/);
        if (only) {
          pickWhisperByName(only[1]);
          return;
        }
      }
      if (m) {
        pickWhisperByName(m[1]);
        text = m[2].trim();
        state.channel = 'whisper';
        syncChannelUI();
        listenMessages();
      }
    }

    const path = channelPath();
    if (!path) {
      if (state.channel === 'guild') toast('Join a guild first');
      else if (state.channel === 'party') toast('Join a party first');
      else if (state.channel === 'whisper') toast('Pick someone with @name');
      else toast('No channel path');
      return;
    }

    const bits = profileBits();
    const payload = {
      uid: me,
      displayName: bits.displayName,
      level: bits.level,
      ts: Date.now()
    };

    if (needsEnc()) {
      const cryptoInfo = await channelCrypto();
      if (!cryptoInfo) {
        toast('Missing channel key');
        return;
      }
      const enc = await encryptText(text, cryptoInfo.secret, cryptoInfo.salt);
      payload.ct = enc.ct;
      payload.iv = enc.iv;
    } else {
      payload.text = text;
    }

    const { db } = ensureFirebase();
    await db.ref(path).push(payload);
  }

  function pickWhisperByName(name) {
    const n = String(name || '').replace(/^@/, '').toLowerCase();
    const hit = getOnlineList().find((p) => p.displayName.toLowerCase() === n);
    if (!hit) {
      toast('No online player named ' + name);
      return null;
    }
    state.whisperTarget = hit;
    updateChannelMeta();
    return hit;
  }

  /* —— Guild —— */
  function saveGuild(g) {
    state.guild = g;
    try {
      if (g) localStorage.setItem(LS_GUILD, JSON.stringify(g));
      else localStorage.removeItem(LS_GUILD);
    } catch (e) {}
  }

  function loadGuild() {
    try {
      const raw = localStorage.getItem(LS_GUILD);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function randomId() {
    const a = new Uint8Array(8);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function createGuild(name) {
    const me = uid();
    if (!me) throw new Error('Sign in first');
    const cleaned = String(name || '').trim().slice(0, 32);
    if (cleaned.length < 2) throw new Error('Guild name too short');
    const { db } = ensureFirebase();
    const id = randomId();
    const secret = randomId() + randomId();
    const bits = profileBits();
    const payload = {
      name: cleaned,
      leader: me,
      secret: secret,
      createdAt: Date.now(),
      members: {}
    };
    payload.members[me] = { displayName: bits.displayName, joinedAt: Date.now() };
    await db.ref('guilds/' + id).set(payload);
    saveGuild({ id, name: cleaned, secret });
    await publishPresence();
    toast('Guild created: ' + cleaned);
    return state.guild;
  }

  async function joinGuild(guildId) {
    const me = uid();
    if (!me) throw new Error('Sign in first');
    const id = String(guildId || '').trim();
    if (!id) throw new Error('Guild id required');
    const { db } = ensureFirebase();
    const snap = await db.ref('guilds/' + id).once('value');
    const val = snap.val();
    if (!val) throw new Error('Guild not found');
    const bits = profileBits();
    await db.ref('guilds/' + id + '/members/' + me).set({
      displayName: bits.displayName,
      joinedAt: Date.now()
    });
    saveGuild({ id, name: val.name, secret: val.secret });
    await publishPresence();
    toast('Joined ' + val.name);
    return state.guild;
  }

  /* —— UI —— */
  function ensureDock() {
    if (document.getElementById('chatDock')) return;
    ensureVisible();
    const dock = document.createElement('div');
    dock.id = 'chatDock';
    dock.className = 'chat-dock';
    dock.innerHTML =
      '<div class="chat-dock-bar">' +
      '<button type="button" class="chat-toggle" id="chatToggleBtn" title="Toggle chat" aria-expanded="false">💬 Chat</button>' +
      '<span class="chat-dock-meta" id="chatDockMeta"></span>' +
      '<button type="button" class="chat-minimize" id="chatMinBtn" title="Minimize" aria-label="Minimize">–</button>' +
      '</div>' +
      '<div class="chat-dock-body" id="chatDockBody" hidden>' +
      '<div class="chat-party-tools" id="chatPartyTools" hidden></div>' +
      '<div class="chat-guild-tools" id="chatGuildTools" hidden></div>' +
      '<div class="chat-log" id="chatLog" aria-live="polite"></div>' +
      '<div class="chat-compose">' +
      '<div class="chat-channel-wrap">' +
      '<button type="button" class="chat-channel-btn" id="chatChannelBtn" aria-haspopup="listbox" aria-expanded="false">World</button>' +
      '<div class="chat-channel-menu" id="chatChannelMenu" role="listbox" hidden></div>' +
      '</div>' +
      '<div class="chat-input-wrap">' +
      '<input type="text" id="chatInput" class="chat-input" maxlength="500" placeholder="Message…" autocomplete="off" />' +
      '<div class="chat-ac" id="chatAc" hidden></div>' +
      '</div>' +
      '<button type="button" class="chat-send" id="chatSendBtn" title="Send">➤</button>' +
      '</div>' +
      '<div class="chat-invite-banner" id="chatInviteBanner" hidden></div>' +
      '</div>';
    document.body.appendChild(dock);

    rebuildChannelMenu();

    document.getElementById('chatToggleBtn').addEventListener('click', () => setOpen(!state.open));
    document.getElementById('chatMinBtn').addEventListener('click', () => setOpen(false));
    document.getElementById('chatChannelBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleChannelMenu();
    });
    document.getElementById('chatSendBtn').addEventListener('click', () => {
      const input = document.getElementById('chatInput');
      sendMessage(input.value).then(() => {
        input.value = '';
        hideAc();
      });
    });
    const input = document.getElementById('chatInput');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value).then(() => {
          input.value = '';
          hideAc();
        });
      }
      if (e.key === 'Escape') hideAc();
    });
    input.addEventListener('input', onInputAc);

    document.addEventListener('click', (e) => {
      const wrap = document.querySelector('.chat-channel-wrap');
      if (wrap && !wrap.contains(e.target)) closeChannelMenu();
    });
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
      row.className =
        'chat-channel-opt' +
        (c.accent === 'trade' ? ' trade' : '') +
        (isActive ? ' active' : '') +
        (isVis ? '' : ' dimmed');
      row.dataset.channel = c.id;

      const visBtn = document.createElement('button');
      visBtn.type = 'button';
      visBtn.className = 'chat-vis-btn' + (isVis ? '' : ' off');
      visBtn.title = isVis ? 'Hide ' + c.label + ' from feed' : 'Show ' + c.label + ' in feed';
      visBtn.setAttribute('aria-label', (isVis ? 'Hide ' : 'Show ') + c.label);
      visBtn.setAttribute('aria-pressed', isVis ? 'true' : 'false');
      visBtn.textContent = '👁';
      visBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChannelVisible(c.id);
      });

      const labelBtn = document.createElement('button');
      labelBtn.type = 'button';
      labelBtn.setAttribute('role', 'option');
      labelBtn.className = 'chat-channel-label';
      labelBtn.textContent = c.label;
      labelBtn.title = 'Send on ' + c.label;
      labelBtn.addEventListener('click', () => {
        setChannel(c.id);
        closeChannelMenu();
      });

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
    try {
      localStorage.setItem(LS_DOCK, state.open ? '1' : '0');
    } catch (e) {}
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
    renderChannelTools();
    listenMessages();
  }

  function syncChannelUI() {
    const btn = document.getElementById('chatChannelBtn');
    const ch = CHANNELS.find((c) => c.id === state.channel) || CHANNELS[1];
    if (btn) {
      btn.textContent = ch.label;
      btn.classList.toggle('trade', ch.accent === 'trade');
    }
    const dock = document.getElementById('chatDock');
    if (dock) {
      dock.dataset.channel = state.channel;
      dock.classList.toggle('accent-trade', state.channel === 'trade');
    }
    rebuildChannelMenu();
    updateChannelMeta();
  }

  function updateChannelMeta() {
    const el = document.getElementById('chatDockMeta');
    if (!el) return;
    ensureVisible();
    const ch = CHANNELS.find((c) => c.id === state.channel) || CHANNELS[1];
    const onlineN = Object.keys(state.online).length;
    const visListening = CHANNELS.filter((c) => state.visible.has(c.id) && channelPathFor(c.id)).length;
    let meta = '';
    if (visListening <= 1) {
      meta = ch.label + ' · ' + onlineN + ' online';
    } else {
      meta = 'sending ' + ch.label + ' · ' + visListening + ' channels';
    }
    if (state.channel === 'local') meta += ' · #' + (state.localRoom || 'lobby');
    else if (state.channel === 'whisper' && state.whisperTarget) meta += ' · @' + state.whisperTarget.displayName;
    else if (state.channel === 'guild' && state.guild) meta += ' · ' + state.guild.name;
    else if (state.channel === 'party') {
      const p = StudyParty && StudyParty.getParty && StudyParty.getParty();
      meta += p ? ' · ' + Object.keys(p.members || {}).length + '/4' : ' · no party';
    }
    el.textContent = meta;
  }

  function renderChannelTools() {
    const partyEl = document.getElementById('chatPartyTools');
    const guildEl = document.getElementById('chatGuildTools');
    if (partyEl) {
      if (state.channel === 'party') {
        partyEl.hidden = false;
        const inParty = StudyParty && StudyParty.getPartyId && StudyParty.getPartyId();
        if (!inParty) {
          partyEl.innerHTML =
            '<button type="button" class="chat-tool-btn" id="partyCreateBtn">Create party</button>' +
            '<input class="chat-tool-input" id="partyJoinInput" placeholder="Party id" maxlength="32" />' +
            '<button type="button" class="chat-tool-btn" id="partyJoinBtn">Join</button>';
          partyEl.querySelector('#partyCreateBtn').onclick = () =>
            StudyParty.create().then(() => {
              renderChannelTools();
              listenMessages();
              publishPresence();
            }).catch((e) => toast(e.message || 'Failed'));
          partyEl.querySelector('#partyJoinBtn').onclick = () => {
            const id = partyEl.querySelector('#partyJoinInput').value;
            StudyParty.join(id).then(() => {
              renderChannelTools();
              listenMessages();
              publishPresence();
            }).catch((e) => toast(e.message || 'Failed'));
          };
        } else {
          const leader = StudyParty.isLeader && StudyParty.isLeader();
          partyEl.innerHTML =
            '<span class="chat-tool-label">Party ' +
            esc(String(StudyParty.getPartyId()).slice(0, 8)) +
            '…</span>' +
            (leader
              ? '<input class="chat-tool-input" id="partyInviteInput" placeholder="Invite @name" maxlength="40" />' +
                '<button type="button" class="chat-tool-btn" id="partyInviteBtn">Invite</button>' +
                '<button type="button" class="chat-tool-btn danger" id="partyKickBtn">Kick…</button>'
              : '') +
            '<button type="button" class="chat-tool-btn danger" id="partyLeaveBtn">Leave</button>';
          if (leader) {
            partyEl.querySelector('#partyInviteBtn').onclick = () => {
              const name = partyEl.querySelector('#partyInviteInput').value.replace(/^@/, '').trim();
              const hit = getOnlineList().find((p) => p.displayName.toLowerCase() === name.toLowerCase());
              if (!hit) {
                toast('Not online');
                return;
              }
              StudyParty.sendInviteToUid(hit.uid).catch((e) => toast(e.message || 'Invite failed'));
            };
            partyEl.querySelector('#partyKickBtn').onclick = () => {
              const party = StudyParty.getParty();
              const me = uid();
              const others = Object.keys((party && party.members) || {}).filter((id) => id !== me);
              if (!others.length) {
                toast('No one to kick');
                return;
              }
              const pick = prompt(
                'Kick uid (or name):\n' +
                  others
                    .map((id) => party.members[id].displayName + ' (' + id.slice(0, 6) + ')')
                    .join('\n')
              );
              if (!pick) return;
              const byName = others.find(
                (id) => String(party.members[id].displayName).toLowerCase() === pick.toLowerCase()
              );
              const target = byName || others.find((id) => id.startsWith(pick) || id === pick);
              if (!target) {
                toast('Not found');
                return;
              }
              StudyParty.kick(target)
                .then(() => renderChannelTools())
                .catch((e) => toast(e.message || 'Kick failed'));
            };
          }
          partyEl.querySelector('#partyLeaveBtn').onclick = () =>
            StudyParty.leave().then(() => {
              renderChannelTools();
              listenMessages();
              publishPresence();
            });
        }
      } else {
        partyEl.hidden = true;
        partyEl.innerHTML = '';
      }
    }
    if (guildEl) {
      if (state.channel === 'guild') {
        guildEl.hidden = false;
        if (!state.guild) {
          guildEl.innerHTML =
            '<input class="chat-tool-input" id="guildNameInput" placeholder="Guild name" maxlength="32" />' +
            '<button type="button" class="chat-tool-btn" id="guildCreateBtn">Create</button>' +
            '<input class="chat-tool-input" id="guildIdInput" placeholder="Guild id to join" maxlength="32" />' +
            '<button type="button" class="chat-tool-btn" id="guildJoinBtn">Join</button>';
          guildEl.querySelector('#guildCreateBtn').onclick = () => {
            const n = guildEl.querySelector('#guildNameInput').value;
            createGuild(n)
              .then(() => {
                renderChannelTools();
                listenMessages();
                updateChannelMeta();
              })
              .catch((e) => toast(e.message || 'Failed'));
          };
          guildEl.querySelector('#guildJoinBtn').onclick = () => {
            const id = guildEl.querySelector('#guildIdInput').value;
            joinGuild(id)
              .then(() => {
                renderChannelTools();
                listenMessages();
                updateChannelMeta();
              })
              .catch((e) => toast(e.message || 'Failed'));
          };
        } else {
          guildEl.innerHTML =
            '<span class="chat-tool-label">' +
            esc(state.guild.name) +
            ' · id ' +
            esc(state.guild.id) +
            '</span>' +
            '<button type="button" class="chat-tool-btn danger" id="guildLeaveBtn">Leave guild</button>';
          guildEl.querySelector('#guildLeaveBtn').onclick = () => {
            saveGuild(null);
            publishPresence();
            renderChannelTools();
            listenMessages();
            updateChannelMeta();
            toast('Left guild');
          };
        }
      } else {
        guildEl.hidden = true;
        guildEl.innerHTML = '';
      }
    }
  }

  function onInputAc() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const v = input.value;
    const at = v.match(/(^|\s)@(\w*)$/);
    if (!at && state.channel !== 'whisper') {
      hideAc();
      return;
    }
    const q = (at ? at[2] : v.replace(/^@/, '')).toLowerCase();
    const list = getOnlineList().filter((p) => !q || p.displayName.toLowerCase().includes(q)).slice(0, 8);
    renderAutocomplete(list, !!at || state.channel === 'whisper');
  }

  function renderAutocomplete(list, force) {
    const ac = document.getElementById('chatAc');
    if (!ac) return;
    if (!force && state.channel !== 'whisper') {
      // still allow refresh when open
    }
    const input = document.getElementById('chatInput');
    const show =
      force ||
      (input && (/@\w*$/.test(input.value) || (state.channel === 'whisper' && !state.whisperTarget)));
    if (!show) {
      hideAc();
      return;
    }
    const rows = list || getOnlineList().slice(0, 8);
    if (!rows.length) {
      ac.hidden = false;
      ac.innerHTML = '<div class="chat-ac-empty">No one online</div>';
      return;
    }
    ac.hidden = false;
    ac.innerHTML = rows
      .map(
        (p) =>
          '<button type="button" class="chat-ac-item" data-uid="' +
          esc(p.uid) +
          '"><span></span><em>LV ' +
          p.level +
          '</em></button>'
      )
      .join('');
    Array.from(ac.querySelectorAll('.chat-ac-item')).forEach((btn, i) => {
      btn.querySelector('span').textContent = rows[i].displayName;
      btn.addEventListener('click', () => {
        state.whisperTarget = rows[i];
        state.channel = 'whisper';
        syncChannelUI();
        const inputEl = document.getElementById('chatInput');
        if (inputEl) {
          // Replace trailing @partial or set placeholder context
          inputEl.value = inputEl.value.replace(/(^|\s)@\w*$/, '$1').replace(/^@\S*\s*/, '');
          inputEl.focus();
        }
        hideAc();
        listenMessages();
        updateChannelMeta();
      });
    });
  }

  function hideAc() {
    const ac = document.getElementById('chatAc');
    if (ac) {
      ac.hidden = true;
      ac.innerHTML = '';
    }
  }

  function onPartyChanged() {
    updateChannelMeta();
    if (state.channel === 'party') {
      renderChannelTools();
    }
    listenMessages();
    publishPresence();
    if (global.StudyCursors && StudyCursors.syncFromParty) StudyCursors.syncFromParty();
    if (global.StudyParty && StudyParty.applyNavLock) StudyParty.applyNavLock();
  }

  function watchInvites() {
    if (!(global.StudyParty && StudyParty.watchInvites)) return;
    if (state.unsubInvite) state.unsubInvite();
    state.unsubInvite = StudyParty.watchInvites((inv) => {
      const banner = document.getElementById('chatInviteBanner');
      if (!banner) return;
      if (!inv || !inv.partyId) {
        banner.hidden = true;
        banner.innerHTML = '';
        return;
      }
      banner.hidden = false;
      banner.innerHTML =
        '<span>Party invite from <b></b></span>' +
        '<button type="button" class="chat-tool-btn" id="acceptInviteBtn">Accept</button>' +
        '<button type="button" class="chat-tool-btn danger" id="declineInviteBtn">Decline</button>';
      banner.querySelector('b').textContent = inv.fromName || 'player';
      banner.querySelector('#acceptInviteBtn').onclick = () => {
        StudyParty.acceptInvite(inv.partyId)
          .then(() => StudyParty.clearInvite())
          .then(() => {
            setChannel('party');
            setOpen(true);
            publishPresence();
          })
          .catch((e) => toast(e.message || 'Accept failed'));
      };
      banner.querySelector('#declineInviteBtn').onclick = () => StudyParty.clearInvite();
    });
  }

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
      if (!uid()) {
        console.warn('chat: no auth yet');
        return;
      }
      state.guild = loadGuild();
      await publishPresence();
      listenPresence();
      if (global.StudyParty && StudyParty.start) await StudyParty.start();
      watchInvites();
      syncChannelUI();
      renderChannelTools();
      try {
        if (localStorage.getItem(LS_DOCK) === '1') setOpen(true);
      } catch (e) {}
      // Refresh presence when profile name changes — poll lightly
      setInterval(() => {
        if (uid()) publishPresence();
      }, 60000);
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
    state.localRoom = String(roomId || 'lobby').slice(0, 64) || 'lobby';
    updateChannelMeta();
    ensureVisible();
    if (state.visible.has('local') || state.channel === 'local') {
      listenMessages();
    }
  }

  global.StudyChat = {
    start,
    open,
    setLocalRoom,
    getOnlineList,
    onPartyChanged,
    isReady: () => state.ready
  };
})(window);
