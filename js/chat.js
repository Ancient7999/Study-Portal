/* Study Portal — Chat dock (RTDB channels + Web Crypto AES-GCM for Whisper/Party/Guild)
 * Client-side channel encryption only — not server-proof E2E (admins see ciphertext; members share keys).
 */
(function (global) {
  const MSG_LIMIT = 50;
  const MSG_CAP = 70;
  const LS_GUILD = 'study_portal_guild_v1';
  const LS_DOCK = 'study_portal_chat_open_v1';
  const LS_VISIBLE = 'study_portal_chat_visible_v1';
  const LS_MUTE_NUDGES = 'study_portal_mute_nudges_v1';
  const LS_FRIENDS = 'study_portal_friends_v1';
  const LS_RATE_GENERAL = 'study_portal_chat_rate_general_v1';
  const LS_RATE_WORLD = 'study_portal_chat_rate_world_v1';
  const LS_RATE_TRADE = 'study_portal_chat_rate_trade_v1';
  const PRESENCE_MIN_MS = 4000;
  const PRESENCE_HEARTBEAT_MS = 55000;
  const FRIENDS_MAX = 40;

  const CHANNELS = [
    { id: 'local', label: 'Local', enc: false },
    { id: 'world', label: 'World', enc: false },
    { id: 'trade', label: 'Trade', enc: false, accent: 'trade' },
    { id: 'guild', label: 'Guild', enc: true },
    { id: 'whisper', label: 'Whisper', enc: true },
    { id: 'party', label: 'Party', enc: true }
  ];
  const ALL_CHANNEL_IDS = CHANNELS.map((c) => c.id);
  function loadRateLimits() {
    const limits = { global: [], world: 0, trade: 0 };
    try {
      const worldRaw = localStorage.getItem(LS_RATE_WORLD);
      if (worldRaw) limits.world = parseInt(worldRaw, 10) || 0;

      const tradeRaw = localStorage.getItem(LS_RATE_TRADE);
      if (tradeRaw) limits.trade = parseInt(tradeRaw, 10) || 0;

      const globalRaw = localStorage.getItem(LS_RATE_GENERAL);
      if (globalRaw) {
        const arr = JSON.parse(globalRaw);
        if (Array.isArray(arr)) {
          const now = Date.now();
          // Clean out timestamps older than 60 seconds so we don't load stale data
          limits.global = arr.filter(t => typeof t === 'number' && now - t < 60000);
        }
      }
    } catch (e) {}
    return limits;
  }

  function saveRateLimits() {
    try {
      localStorage.setItem(LS_RATE_WORLD, String(state.rateLimits.world || 0));
      localStorage.setItem(LS_RATE_TRADE, String(state.rateLimits.trade || 0));
      const now = Date.now();
      const cleaned = (state.rateLimits.global || []).filter(t => typeof t === 'number' && now - t < 60000);
      localStorage.setItem(LS_RATE_GENERAL, JSON.stringify(cleaned));
    } catch (e) {}
  }
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
    unsubWhisperNudges: null,
    keyCache: {},
    open: false,
    muteNudges: false,
    friends: [], // [{ uid, displayName }]
    activity: 'hub', // hub | quiz | lobby | party
    quiz: null, // { bank, form } | null
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

  /* —— Mute nudges / friends —— */
  function loadMuteNudges() {
    try {
      return localStorage.getItem(LS_MUTE_NUDGES) === '1';
    } catch (e) {
      return false;
    }
  }

  function saveMuteNudges(on) {
    state.muteNudges = !!on;
    try {
      localStorage.setItem(LS_MUTE_NUDGES, state.muteNudges ? '1' : '0');
    } catch (e) {}
    syncMuteBtn();
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
    cleaned.forEach((f) => {
      byUid[f.uid] = f;
    });
    state.friends = Object.keys(byUid)
      .map((k) => byUid[k])
      .slice(0, FRIENDS_MAX);
    try {
      localStorage.setItem(LS_FRIENDS, JSON.stringify(state.friends));
    } catch (e) {}
    if (!opts.skipCloud && global.StudyProgress && StudyProgress.schedulePush) {
      try {
        StudyProgress.schedulePush();
      } catch (e) {}
    }
    listenWhisperNudges();
    renderFriendsPanel();
  }

  function addFriend(uidStr, displayName) {
    const id = String(uidStr || '');
    if (!id) return false;
    const me = uid();
    if (me && id === me) {
      toast('Cannot add yourself');
      return false;
    }
    const name = String(displayName || 'Scholar').slice(0, 40);
    const next = state.friends.slice();
    const idx = next.findIndex((f) => f.uid === id);
    if (idx >= 0) {
      next[idx] = { uid: id, displayName: name || next[idx].displayName };
      toast('Friend updated');
    } else {
      if (next.length >= FRIENDS_MAX) {
        toast('Friends list full');
        return false;
      }
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

  function partySizeNow() {
    try {
      const p = global.StudyParty && StudyParty.getParty && StudyParty.getParty();
      if (p && p.members) return Object.keys(p.members).length;
    } catch (e) {}
    return null;
  }

  function deriveActivity() {
    const inParty = !!(global.StudyParty && StudyParty.getPartyId && StudyParty.getPartyId());
    if (inParty) return 'party';
    if (state.activity === 'lobby') return 'lobby';
    if (state.localRoom && /^form_/i.test(state.localRoom)) return 'quiz';
    if (state.activity === 'quiz' && state.quiz) return 'quiz';
    return state.activity === 'lobby' ? 'lobby' : 'hub';
  }

  function presenceStatusLabel(p) {
    if (!p) return 'Online';
    if (p.partyId) {
      const n = typeof p.partySize === 'number' ? p.partySize : null;
      return n ? 'Party ' + n + '/4' : 'In party';
    }
    if (p.activity === 'quiz' && p.quiz) {
      const bank = p.quiz.bank || 'Quiz';
      const form = p.quiz.form ? ' Form ' + p.quiz.form : '';
      return bank + form;
    }
    if (p.activity === 'lobby') return 'In lobby';
    if (p.activity === 'party') return 'In party';
    return 'Online';
  }

  function playWhisperNudge() {
    if (state.muteNudges) return;
    if (typeof global.playNudgeBell === 'function') {
      try {
        global.playNudgeBell();
      } catch (e) {}
    }
  }

  function stopWhisperNudges() {
    if (state.unsubWhisperNudges) {
      state.unsubWhisperNudges();
      state.unsubWhisperNudges = null;
    }
  }

  function whisperPathsToWatch() {
    const me = uid();
    if (!me) return [];
    const set = {};
    (state.friends || []).forEach((f) => {
      if (f && f.uid) set['chat/whisper/' + whisperPair(me, f.uid)] = true;
    });
    if (state.whisperTarget && state.whisperTarget.uid) {
      set['chat/whisper/' + whisperPair(me, state.whisperTarget.uid)] = true;
    }
    return Object.keys(set);
  }

  function listenWhisperNudges() {
    stopWhisperNudges();
    const me = uid();
    if (!me) return;
    let db;
    try {
      db = ensureFirebase().db;
    } catch (e) {
      return;
    }
    const startTs = Date.now() - 500; // slight skew allowance; skip older history via startAt
    const unsubs = [];
    whisperPathsToWatch().forEach((path) => {
      const q = db.ref(path).orderByChild('ts').startAt(startTs);
      const handler = (snap) => {
        const m = snap.val() || {};
        if (!m.uid || m.uid === me) return;
        if (state.muteNudges) return;
        playWhisperNudge();
      };
      q.on('child_added', handler);
      unsubs.push(() => q.off('child_added', handler));
    });
    state.unsubWhisperNudges = () => unsubs.forEach((fn) => fn());
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
    const partyId = (global.StudyParty && StudyParty.getPartyId && StudyParty.getPartyId()) || null;
    const activity = deriveActivity();
    const pSize = partyId ? partySizeNow() : null;
    const payload = {
      state: 'online',
      displayName: bits.displayName,
      level: bits.level,
      updatedAt: Date.now(),
      activity: activity
    };
    if (partyId) payload.partyId = partyId;
    if (state.guild && state.guild.id) payload.guildId = state.guild.id;
    if (pSize != null && pSize > 0) payload.partySize = pSize;
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
      if (sig === state.lastPresenceSig && now - state.lastPresenceAt < PRESENCE_HEARTBEAT_MS) {
        return;
      }
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
      renderAutocomplete();
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
      const startTs = Date.now() - 3000; 
      const q = db.ref(channelPathFor(c.id)).orderByChild('ts').startAt(startTs);
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

    const now = Date.now();

    // —— 1. CHECK LIMITS BEFORE SENDING ——
    if (state.channel === 'world') {
      if (now - state.rateLimits.world < 30000) {
        toast('Please, do not flood.');
        return;
      }
    } else if (state.channel === 'trade') {
      if (now - state.rateLimits.trade < 30000) {
        toast('Please, do not flood.');
        return;
      }
    } else {
      // Keep only messages from the last 60 seconds
      state.rateLimits.global = state.rateLimits.global.filter(t => now - t < 60000);
      if (state.rateLimits.global.length >= 15) {
        toast('Please, do not flood.');
        return;
      }
      const recent5s = state.rateLimits.global.filter(t => now - t < 5000);
      if (recent5s.length >= 3) {
        toast('Please, do not flood.');
        return;
      }
    }

    // —— 2. WHISPER OFFLINE CHECK ——
    if (state.channel === 'whisper') {
      if (!state.whisperTarget) {
        toast('Pick someone with @name');
        return;
      }
      if (!state.online[state.whisperTarget.uid]) {
        toast('User is offline');
        return;
      }
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

    // —— 3. PROVISIONALLY ADD TO LIMITS (prevents rapid double-clicks) ——
    if (state.channel === 'world') {
      state.rateLimits.world = now;
    } else if (state.channel === 'trade') {
      state.rateLimits.trade = now;
    } else {
      state.rateLimits.global.push(now);
    }

    // —— 4. SEND TO FIREBASE WITH REVERT ON FAILURE ——
    const { db } = ensureFirebase();
    const newMsgRef = db.ref(path).push();
    
    const updates = {};
    updates[path + '/' + newMsgRef.key] = payload;
    
    if (state.channel === 'world') {
      updates['rate_limits/' + me + '/world_last'] = now;
    } else if (state.channel === 'trade') {
      updates['rate_limits/' + me + '/trade_last'] = now;
    } else {
      updates['rate_limits/' + me + '/chat_last'] = now;
    }

      try {
      await db.ref().update(updates);
      // Persist rate limit state to localStorage so it survives page refreshes
      saveRateLimits();
    } catch (e) {
      // REVERT: If Firebase rejects it (e.g., network drop or rule block), 
      // undo the provisional limit so the user isn't unfairly penalized.
      if (state.channel === 'world') {
        state.rateLimits.world = 0; // Reset to allow immediate retry
      } else if (state.channel === 'trade') {
        state.rateLimits.trade = 0;
      } else {
        state.rateLimits.global.pop(); // Remove the timestamp we just added
      }
      
      if (e.code === 'PERMISSION_DENIED') {
        toast('Rate limit exceeded. Please wait a moment.');
      } else {
        toast('Message failed to send. Check connection.');
      }
      console.warn('Chat send failed:', e);
    }
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
    listenWhisperNudges();
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
      '<div class="chat-dock-actions">' +
      '<button type="button" class="chat-icon-btn" id="chatMuteNudgesBtn" title="Mute whisper nudges" aria-pressed="false">🔔</button>' +
      '<div class="chat-friends-wrap">' +
      '<button type="button" class="chat-icon-btn chat-friends-btn" id="chatFriendsBtn" title="Friends" aria-haspopup="true" aria-expanded="false">Friends</button>' +
      '<div class="chat-friends-panel" id="chatFriendsPanel" hidden></div>' +
      '</div>' +
      '<button type="button" class="chat-minimize" id="chatMinBtn" title="Minimize" aria-label="Minimize">–</button>' +
      '</div>' +
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
    syncMuteBtn();

    document.getElementById('chatToggleBtn').addEventListener('click', () => setOpen(!state.open));
    document.getElementById('chatMinBtn').addEventListener('click', () => setOpen(false));
    document.getElementById('chatMuteNudgesBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      saveMuteNudges(!state.muteNudges);
      toast(state.muteNudges ? 'Whisper nudges muted' : 'Whisper nudges on');
    });
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
      const fwrap = document.querySelector('.chat-friends-wrap');
      if (fwrap && !fwrap.contains(e.target)) closeFriendsPanel();
    });
  }

  function syncMuteBtn() {
    const btn = document.getElementById('chatMuteNudgesBtn');
    if (!btn) return;
    btn.textContent = state.muteNudges ? '🔕' : '🔔';
    btn.setAttribute('aria-pressed', state.muteNudges ? 'true' : 'false');
    btn.title = state.muteNudges ? 'Unmute whisper nudges' : 'Mute whisper nudges';
    btn.classList.toggle('muted', !!state.muteNudges);
  }

  function toggleFriendsPanel() {
    const panel = document.getElementById('chatFriendsPanel');
    const btn = document.getElementById('chatFriendsBtn');
    if (!panel) return;
    const open = panel.hidden;
    if (open) {
      closeChannelMenu();
      renderFriendsPanel();
    }
    panel.hidden = !open;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeFriendsPanel() {
    const panel = document.getElementById('chatFriendsPanel');
    const btn = document.getElementById('chatFriendsBtn');
    if (panel) panel.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function openWhisperTo(friend) {
    if (!friend || !friend.uid) return;
    state.whisperTarget = { uid: friend.uid, displayName: friend.displayName || 'Scholar' };
    state.channel = 'whisper';
    ensureVisible();
    if (!state.visible.has('whisper')) {
      state.visible.add('whisper');
      saveVisible();
    }
    syncChannelUI();
    setOpen(true);
    listenMessages();
    listenWhisperNudges();
    updateChannelMeta();
    closeFriendsPanel();
    const inputEl = document.getElementById('chatInput');
    if (inputEl) inputEl.focus();
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
          '<div class="chat-friends-row" data-uid="' +
          esc(f.uid) +
          '">' +
          '<button type="button" class="chat-friends-main" data-act="whisper">' +
          '<span class="chat-friends-name"></span>' +
          '<span class="chat-friends-status">' +
          esc(status) +
          '</span>' +
          '</button>' +
          '<button type="button" class="chat-friends-x" data-act="remove" title="Remove friend">×</button>' +
          '</div>';
      });
    }
    if (offlineFriends.length) {
      html +=
        '<div class="chat-friends-foot">' +
        offlineFriends.length +
        ' offline friend' +
        (offlineFriends.length === 1 ? '' : 's') +
        '</div>';
    }
    html +=
      '<div class="chat-friends-actions">' +
      '<button type="button" class="chat-tool-btn" id="chatAddFriendBtn">Add friend…</button>' +
      '</div>';

    // Online non-friends quick-add (presence)
    const friendIds = {};
    friends.forEach((f) => {
      friendIds[f.uid] = true;
    });
    const addable = getOnlineList()
      .filter((p) => !friendIds[p.uid])
      .slice(0, 6);
    if (addable.length) {
      html += '<div class="chat-friends-head subtle">Online — add</div>';
      addable.forEach((p) => {
        html +=
          '<div class="chat-friends-row addable" data-uid="' +
          esc(p.uid) +
          '">' +
          '<button type="button" class="chat-friends-main" data-act="add">' +
          '<span class="chat-friends-name"></span>' +
          '<span class="chat-friends-status">' +
          esc(presenceStatusLabel(p.presence)) +
          '</span>' +
          '</button>' +
          '<button type="button" class="chat-friends-add" data-act="add" title="Add friend">＋</button>' +
          '</div>';
      });
    }

    panel.innerHTML = html;

    const nameNodes = panel.querySelectorAll('.chat-friends-row');
    const nameSources = onlineFriends.concat(
      addable.map((p) => ({ uid: p.uid, displayName: p.displayName }))
    );
    // Set names safely via textContent — walk rows in order
    let oi = 0;
    Array.from(panel.querySelectorAll('.chat-friends-row:not(.addable)')).forEach((row, i) => {
      const f = onlineFriends[i];
      if (!f) return;
      const nameEl = row.querySelector('.chat-friends-name');
      if (nameEl) nameEl.textContent = f.displayName;
      row.querySelectorAll('[data-act="whisper"]').forEach((btn) => {
        btn.addEventListener('click', () => openWhisperTo(f));
      });
      row.querySelectorAll('[data-act="remove"]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeFriend(f.uid);
        });
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
        if (!hit) {
          toast('Not online — need uid via presence');
          return;
        }
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

    const onlineN = Object.keys(state.online).length;

    /* --- Ping from net-status module --- */
    let pingText = '…';
    if (window.StudyNetStatus && StudyNetStatus.getPing) {
        const ms = StudyNetStatus.getPing();
        if (ms != null && Number.isFinite(ms)) {
            pingText = Math.max(1, Math.round(ms)) + 'ms';
        }
    }

    /* --- Connection dot (optional visual cue) --- */
    const connected = !window.StudyNetStatus || StudyNetStatus.isConnected();

    let meta = (connected ? '🟢 ' : '🔴 ') + onlineN + ' online · ' + pingText;

    /* --- Contextual suffixes (kept from original) --- */
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
                '<button type="button" class="chat-tool-btn danger" id="partyKickBtn">Kick…</button>' +
                '<button type="button" class="chat-tool-btn" id="partySyncTimersBtn" title="Push your Pomodoro to all members">Sync timers</button>'
              : '') +
            '<button type="button" class="chat-tool-btn danger" id="partyLeaveBtn">Leave</button>';
          if (leader) {
            const syncBtn = partyEl.querySelector('#partySyncTimersBtn');
            if (syncBtn) {
              syncBtn.onclick = () => {
                if (global.StudyPartyTimers && StudyPartyTimers.pushLeaderSync) {
                  StudyPartyTimers.pushLeaderSync().catch((e) => toast(e.message || 'Sync failed'));
                } else toast('Timer sync unavailable');
              };
            }
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
    const friendIds = {};
    (state.friends || []).forEach((f) => {
      friendIds[f.uid] = true;
    });
    ac.innerHTML = rows
      .map(
        (p) =>
          '<div class="chat-ac-row" data-uid="' +
          esc(p.uid) +
          '"><button type="button" class="chat-ac-item" data-act="whisper"><span></span><em>LV ' +
          p.level +
          '</em></button>' +
          (friendIds[p.uid]
            ? ''
            : '<button type="button" class="chat-ac-add" data-act="add" title="Add friend">＋</button>') +
          '</div>'
      )
      .join('');
    Array.from(ac.querySelectorAll('.chat-ac-row')).forEach((row, i) => {
      const p = rows[i];
      if (!p) return;
      const span = row.querySelector('.chat-ac-item span');
      if (span) span.textContent = p.displayName;
      const whisperBtn = row.querySelector('[data-act="whisper"]');
      if (whisperBtn) {
        whisperBtn.addEventListener('click', () => {
          state.whisperTarget = { uid: p.uid, displayName: p.displayName };
          state.channel = 'whisper';
          syncChannelUI();
          const inputEl = document.getElementById('chatInput');
          if (inputEl) {
            inputEl.value = inputEl.value.replace(/(^|\s)@\w*$/, '$1').replace(/^@\S*\s*/, '');
            inputEl.focus();
          }
          hideAc();
          listenMessages();
          listenWhisperNudges();
          updateChannelMeta();
        });
      }
      const addBtn = row.querySelector('[data-act="add"]');
      if (addBtn) {
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          addFriend(p.uid, p.displayName);
          onInputAc();
        });
      }
    });
  }

  function hideAc() {
    const ac = document.getElementById('chatAc');
    if (ac) {
      ac.hidden = true;
      ac.innerHTML = '';
    }
  }

  let _partySyncInProgress = false;

  function onPartyChanged() {
    if (_partySyncInProgress) return;
    _partySyncInProgress = true;
    try {
      updateChannelMeta();
      if (state.channel === 'party') {
        renderChannelTools();
      }
      listenMessages();
      // Party join/leave / size change — force presence so partySize updates promptly
      publishPresence(true);
      if (global.StudyCursors && StudyCursors.syncFromParty) StudyCursors.syncFromParty();
      if (global.StudyPartyTimers && StudyPartyTimers.syncFromParty) StudyPartyTimers.syncFromParty();
      if (global.StudyParty && StudyParty.applyNavLock) StudyParty.applyNavLock();
    } finally {
      _partySyncInProgress = false;
    }
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
      state.muteNudges = loadMuteNudges();
      state.friends = loadFriends();
      syncMuteBtn();
      await publishPresence(true);
      listenPresence();
      listenWhisperNudges();
      if (global.StudyParty && StudyParty.start) await StudyParty.start();
      watchInvites();
      syncChannelUI();
      renderChannelTools();
      renderFriendsPanel();
      try {
        if (localStorage.getItem(LS_DOCK) === '1') setOpen(true);
      } catch (e) {}
      // Heartbeat presence — force so RTDB onDisconnect stays fresh
      setInterval(() => {
        if (uid()) publishPresence(true);
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
    if (/^form_/i.test(state.localRoom)) {
      const letter = state.localRoom.replace(/^form_/i, '').slice(0, 8);
      state.activity = 'quiz';
      state.quiz = { bank: currentBankLabel(), form: letter };
    } else if (state.localRoom === 'lobby' || state.localRoom === 'hub') {
      if (state.activity === 'quiz') state.activity = 'hub';
      state.quiz = null;
      if (state.activity !== 'lobby' && state.activity !== 'party') state.activity = 'hub';
    }
    updateChannelMeta();
    ensureVisible();
    if (state.visible.has('local') || state.channel === 'local') {
      listenMessages();
    }
    publishPresence();
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
    if (info.localRoom) {
      state.localRoom = String(info.localRoom).slice(0, 64);
    }
    publishPresence(!!info.force);
  }

  function applyFriendsFromCloud(list) {
    if (!Array.isArray(list)) return;
    const local = loadFriends();
    const byUid = {};
    local.forEach((f) => {
      byUid[f.uid] = f;
    });
    list.forEach((f) => {
      if (!f || !f.uid) return;
      const id = String(f.uid);
      const name = String(f.displayName || 'Scholar').slice(0, 40);
      if (!byUid[id]) byUid[id] = { uid: id, displayName: name };
      else if (name && name !== 'Scholar') byUid[id].displayName = name;
    });
    saveFriends(
      Object.keys(byUid).map((k) => byUid[k]),
      { skipCloud: true }
    );
  }

  global.StudyChat = {
    start,
    open,
    setLocalRoom,
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
