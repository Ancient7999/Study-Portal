/* Study Portal — Spectate lobbies as live tiles, viewer counts, join requests
   lobbies/{id}/spectators/{uid}   { displayName, since, lastSeen }   (own node only)
   lobbies/{id}/joinRequests/{uid} { displayName, at, status: pending|accepted|declined }
   lobbies/{id}/requestPolicy      'ask' | 'restrict' | 'all'          (leader)
   Tiles only read the lobby; up to 4 at once; any tile can be enlarged. */
(function (global) {
  const MAX_TILES = 4;
  const BEAT_MS = 20000;
  const FRESH_MS = 60000;
  const tiles = {}; // lobbyId -> {el, off, lobby}
  const live = { lobbyId: null, off: null, spectators: {}, requests: {} };
  let beatTimer = null;

  function toast(msg) {
    if (global.StudyChat && StudyChat.toast) StudyChat.toast(msg);
    else if (typeof global.showToast === 'function') global.showToast(msg);
    else console.warn(msg);
  }
  function db() {
    return firebase.database();
  }
  function uid() {
    try {
      const u = firebase.auth && firebase.auth().currentUser;
      return u ? u.uid : null;
    } catch (e) {
      return null;
    }
  }
  function myName() {
    const p = global.StudyProfiles && StudyProfiles.getProfile && StudyProfiles.getProfile();
    return String((p && p.displayName) || 'Scholar').slice(0, 40);
  }
  function rulesMsg(e) {
    const S = global.StudyShare;
    const perm = S ? S.isPermission(e) : /permission/i.test(String(e && (e.code || e.message)));
    return perm ? 'Spectating needs the updated database rules — ask the site owner to publish them.' : (e && e.message) || String(e);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function freshCount(map) {
    const now = Date.now();
    return Object.keys(map || {}).filter((k) => map[k] && now - (map[k].lastSeen || 0) < FRESH_MS).length;
  }
  /* lobby settings (lobbies/{id}/settings, js/lobby.js); older lobbies allow everything */
  function policyOf(L) {
    return (L && L.requestPolicy) || (L && L.settings && L.settings.policy) || 'ask';
  }
  function spectatingOff(L) {
    return !!(L && L.settings && L.settings.spectate === false);
  }
  function shareOff(L) {
    return !!(L && L.settings && L.settings.share === false);
  }
  function leaderName(L) {
    return (L && L.members && L.leader && L.members[L.leader] && L.members[L.leader].displayName) || 'Leader';
  }

  /* —— tiles —— */
  function dock() {
    let d = document.getElementById('spectateDock');
    if (!d) {
      d = document.createElement('div');
      d.id = 'spectateDock';
      d.className = 'spectate-dock';
      document.body.appendChild(d);
    }
    d.hidden = !Object.keys(tiles).length;
    return d;
  }
  async function watch(lobbyId) {
    const me = uid();
    if (!me) throw new Error('Sign in first');
    if (tiles[lobbyId]) return tiles[lobbyId];
    if (Object.keys(tiles).length >= MAX_TILES) throw new Error('You can watch up to ' + MAX_TILES + ' lobbies at once');
    let first = null;
    try {
      first = (await db().ref('lobbies/' + lobbyId).once('value')).val();
    } catch (e) {}
    if (spectatingOff(first)) throw new Error('This lobby does not allow spectators');
    const el = document.createElement('div');
    el.className = 'spectate-tile';
    el.dataset.lobby = lobbyId;
    el.innerHTML =
      '<div class="st-head"><span class="st-title">Lobby ' + esc(lobbyId.slice(0, 6)) + '</span><span class="st-viewers"></span>' +
      '<button type="button" class="st-btn st-zoom" aria-label="Enlarge" title="Enlarge">⤢</button>' +
      '<button type="button" class="st-btn st-close" aria-label="Stop watching" title="Stop watching">×</button></div>' +
      '<div class="st-body"><div class="st-wait">Connecting…</div></div>' +
      '<div class="st-foot"><button type="button" class="btn-gold st-request">Request to join</button><span class="st-note"></span></div>';
    const t = { el, off: null, lobby: null, req: null, qs: {}, cursors: {}, coff: null };
    tiles[lobbyId] = t;
    dock().appendChild(el);
    dock();
    el.querySelector('.st-close').onclick = () => unwatch(lobbyId);
    el.querySelector('.st-zoom').onclick = () => zoom(lobbyId);
    el.querySelector('.st-request').onclick = () => requestJoin(lobbyId).catch((e) => toast(rulesMsg(e)));
    const ref = db().ref('lobbies/' + lobbyId);
    const onVal = (snap) => {
      t.lobby = snap.val();
      renderTile(lobbyId).catch(() => {});
    };
    ref.on('value', onVal, (e) => note(lobbyId, rulesMsg(e)));
    t.off = () => ref.off('value', onVal);
    // the players' live cursors, drawn on the spectator's copy of their panes
    const cref = db().ref('lobbies/' + lobbyId + '/cursors');
    const onCur = (snap) => { t.cursors = snap.val() || {}; placeCursors(lobbyId); };
    cref.on('value', onCur, () => {});
    t.coff = () => cref.off('value', onCur);
    if (!t.ro && global.ResizeObserver) { t.ro = new ResizeObserver(() => placeCursors(lobbyId)); t.ro.observe(el); }
    const sref = db().ref('lobbies/' + lobbyId + '/spectators/' + me);
    try {
      await sref.set({ displayName: myName(), since: Date.now(), lastSeen: Date.now() });
      sref.onDisconnect().remove().catch(() => {});
    } catch (e) {
      note(lobbyId, rulesMsg(e));
    }
    ensureBeat();
    return t;
  }
  function note(lobbyId, msg) {
    const t = tiles[lobbyId];
    if (t) t.el.querySelector('.st-note').textContent = msg || '';
  }
  function unwatch(lobbyId) {
    const t = tiles[lobbyId];
    if (!t) return;
    if (t.off) t.off();
    if (t.coff) t.coff();
    if (t.ro) t.ro.disconnect();
    if (t.req) t.req();
    t.el.remove();
    delete tiles[lobbyId];
    const me = uid();
    if (me) {
      const r = db().ref('lobbies/' + lobbyId + '/spectators/' + me);
      r.remove().catch(() => {});
      try { r.onDisconnect().cancel().catch(() => {}); } catch (e) {}
    }
    dock();
  }
  function zoom(lobbyId, on) {
    Object.keys(tiles).forEach((id) => {
      const el = tiles[id].el;
      const z = id === lobbyId ? (on != null ? !!on : !el.classList.contains('zoomed')) : false;
      el.classList.toggle('zoomed', z);
    });
    document.body.classList.toggle('spectate-zoomed', Object.keys(tiles).some((id) => tiles[id].el.classList.contains('zoomed')));
    Object.keys(tiles).forEach((id) => {
      const b = tiles[id].el.querySelector('.st-zoom');
      const z = tiles[id].el.classList.contains('zoomed');
      if (b) { b.textContent = z ? '⤡' : '⤢'; b.title = z ? 'Shrink' : 'Enlarge'; b.setAttribute('aria-label', b.title); }
      setTimeout(() => placeCursors(id), 30);
    });
  }

  /* —— read-only copy of the session's question interface (pane mode: every player's pane; classic: the shared card) ——
     built only from lobby session data (question index, picks, results) and the public bank; nothing personal */
  function questionsFor(t, p, L) {
    const S = global.StudySplitQuiz;
    const bank = (p && p.bank) || (L.session && L.session.bank) || L.bank;
    const form = (p && p.form) || (L.session && L.session.form) || L.form || 'A';
    const card = p && p.bank ? p.card || null : (L.session && L.session.card) || L.card || null;
    if (!S || !S.loadBank || !bank) return null;
    const key = bank + '|' + form + '|' + (card || '');
    if (t.qs[key] && t.qs[key].v) return t.qs[key].v;
    if (!t.qs[key]) {
      t.qs[key] = { p: S.loadBank(bank, form, card).then((v) => { t.qs[key].v = v; const lid = t.el.dataset.lobby; if (tiles[lid]) renderTile(lid).catch(() => {}); }, () => { t.qs[key].v = []; }) };
    }
    return null;
  }
  function hueOf(name) {
    let h = 0; const s2 = String(name || 'x');
    for (let i = 0; i < s2.length; i++) h = (h * 31 + s2.charCodeAt(i)) >>> 0;
    return h % 360;
  }
  function paneBox(t, L, p, id, opts) {
    const qs = questionsFor(t, p, L);
    const n = qs ? qs.length : 0;
    const qi = Math.min(p.qIndex | 0, Math.max(0, n - 1));
    const q = qs && qs[qi];
    const name = p.displayName || (L.members && L.members[id] && L.members[id].displayName) || 'Player';
    const lv = p.level || (L.members && L.members[id] && L.members[id].level) || 1;
    const lp = p.lastPick;
    const fresh = lp && lp.q === qi && Date.now() - (lp.at || 0) < 1500;
    let opts2 = '';
    if (q) {
      opts2 = (q.options || []).map((o, oi) => {
        let c = 'pane-opt-btn';
        if (p.selected === oi) c += oi === q.correct ? ' correct' : ' wrong';
        if (fresh && lp.i === oi) c += lp.ok ? ' pick-flash-ok' : ' pick-flash-bad';
        return '<button type="button" class="' + c + '" disabled tabindex="-1">' + esc(o) + '</button>';
      }).join('');
    }
    const status = (n ? 'Q' + (qi + 1) + '/' + n : 'Q' + ((p.qIndex | 0) + 1)) + ' · ' + (p.score | 0) + (p.done ? ' · done' : '') + (p.role === 'spectate' ? ' · spec' : '');
    return '<div class="party-member-box quiz-pane party-pane st-pane' + (p.done ? ' pane-done' : '') + (opts && opts.focus ? ' pane-focused' : '') + '" data-uid="' + esc(id) + '" style="--friend-hue:' + hueOf(name) + '">' +
      '<div class="pane-friend-header"><div class="pane-header-row"><span class="pane-label">' + (id === L.leader ? '★ Leader' : 'Player') + '</span><span class="pane-status">' + esc(status) + '</span></div>' +
      '<div class="pane-friend-name">' + esc(name) + ' · LV' + (lv | 0 || 1) + '</div></div>' +
      '<div class="pane-body">' + (q
        ? '<div class="pane-question-text">' + esc(q.q || '') + '</div><div class="pane-options">' + opts2 + '</div>' +
          (p.selected != null && q.explain ? '<div class="pane-result-msg">' + (p.selected === q.correct ? '✓ ' : '') + esc(q.explain) + '</div>' : '')
        : '<div class="pane-question-text st-wait">' + (qs ? 'No question' : 'Loading questions…') + '</div>') +
      '</div></div>';
  }
  function sessionView(t, L) {
    const panes = (L.session && L.session.panes) || {};
    const ids = Object.keys(panes).sort((a, b) => ((panes[a].seat | 0) - (panes[b].seat | 0)));
    if (!ids.length) return '';
    const classic = (L.session && L.session.gameMode === 'classic') || L.gameMode === 'classic';
    if (classic) {
      // the shared question card (the leader's question), with the roster of every player
      const focus = ids.indexOf(L.leader) >= 0 ? L.leader : ids[0];
      const roster = '<div class="classic-roster st-roster">' + ids.map((id) => {
        const p = panes[id];
        return '<span class="classic-roster-chip' + (id === focus ? ' active' : '') + (p.done ? ' done' : '') + '">' + esc(p.displayName || 'Player') + ' · LV' + (p.level || 1) + '<em>' + ((p.qIndex | 0) + 1) + ' · ' + (p.score | 0) + '</em></span>';
      }).join('') + '</div>';
      return '<div class="st-session st-classic">' + roster + paneBox(t, L, panes[focus], focus, { focus: true }) + '</div>';
    }
    return '<div class="st-session st-panes" data-n="' + ids.length + '">' + ids.map((id) => paneBox(t, L, panes[id], id)).join('') + '</div>';
  }
  /* cursor records carry a layout anchor (js/cursors.js): pane:<uid>:opt:<i>, pane:<uid>:q, classic:opt:<i> … */
  function anchorEl(root, a) {
    if (!a) return null;
    let m = /^pane:([^:]+)(?::(opt|q|head):?(\d+)?)?$/.exec(a);
    if (m) {
      const box = [...root.querySelectorAll('.party-member-box[data-uid]')].find((b) => b.dataset.uid === m[1]);
      if (!box) return null;
      if (!m[2]) return box;
      if (m[2] === 'opt') return box.querySelectorAll('.pane-opt-btn')[+m[3]] || box;
      if (m[2] === 'q') return box.querySelector('.pane-question-text') || box;
      return box.querySelector('.pane-friend-header') || box;
    }
    m = /^classic:(opt|q|main):?(\d+)?$/.exec(a);
    if (m) {
      const main = root.querySelector('.st-classic .party-member-box');
      if (!main) return null;
      if (m[1] === 'opt') return main.querySelectorAll('.pane-opt-btn')[+m[2]] || main;
      if (m[1] === 'q') return main.querySelector('.pane-question-text') || main;
      return main;
    }
    return null;
  }
  function placeCursors(lobbyId) {
    const t = tiles[lobbyId];
    if (!t) return;
    const body = t.el.querySelector('.st-body');
    let layer = t.el.querySelector('.st-cursors');
    const view = body && body.querySelector('.st-session');
    if (!view) { if (layer) layer.innerHTML = ''; return; }
    if (!layer) { layer = document.createElement('div'); layer.className = 'st-cursors'; t.el.appendChild(layer); }
    const tr = t.el.getBoundingClientRect();
    const vr = view.getBoundingClientRect();
    const now = Date.now();
    const seen = {};
    Object.keys(t.cursors || {}).forEach((id) => {
      const c = t.cursors[id];
      if (!c || now - (c.updatedAt || 0) > 30000) return;
      let x, y;
      const el = anchorEl(view, c.anchor);
      if (el && typeof c.rx === 'number') { const r = el.getBoundingClientRect(); x = r.left + c.rx * r.width; y = r.top + c.ry * r.height; }
      else if (typeof c.nx === 'number') { x = vr.left + c.nx * vr.width; y = vr.top + c.ny * vr.height; }
      else return;
      if (x < tr.left || y < tr.top || x > tr.right || y > tr.bottom) return;
      seen[id] = true;
      let d = layer.querySelector('[data-uid="' + id + '"]');
      if (!d) {
        d = document.createElement('div');
        d.className = 'st-cursor';
        d.dataset.uid = id;
        d.innerHTML = '<span class="st-cursor-dot"></span><span class="st-cursor-name"></span>';
        layer.appendChild(d);
      }
      d.style.setProperty('--friend-hue', c.hue != null ? c.hue : hueOf(c.displayName));
      d.querySelector('.st-cursor-name').textContent = c.displayName || '';
      d.style.transform = 'translate(' + Math.round(x - tr.left) + 'px,' + Math.round(y - tr.top) + 'px)';
    });
    [...layer.children].forEach((d) => { if (!seen[d.dataset.uid]) d.remove(); });
  }
  async function renderTile(lobbyId) {
    const t = tiles[lobbyId];
    if (!t) return;
    const L = t.lobby;
    const body = t.el.querySelector('.st-body');
    if (!L) {
      body.__h = ''; body.innerHTML = '<div class="st-wait">This lobby has closed.</div>';
      t.el.querySelector('.st-request').disabled = true;
      return;
    }
    t.el.querySelector('.st-title').textContent = leaderName(L) + "'s lobby";
    t.el.querySelector('.st-viewers').textContent = '👁 ' + freshCount(L.spectators);
    if (spectatingOff(L)) {
      body.__h = ''; body.innerHTML = '<div class="st-wait">The leader turned spectating off for this lobby.</div>';
      t.el.querySelector('.st-request').disabled = true;
      const me = uid();
      if (me && L.spectators && L.spectators[me]) db().ref('lobbies/' + lobbyId + '/spectators/' + me).remove().catch(() => {});
      return;
    }
    const policy = policyOf(L);
    const btn = t.el.querySelector('.st-request');
    const mine = L.joinRequests && L.joinRequests[uid()];
    btn.disabled = policy === 'restrict' || !!(mine && mine.status === 'pending');
    btn.textContent = policy === 'all' ? 'Join' : mine && mine.status === 'pending' ? 'Request sent' : 'Request to join';
    if (policy === 'restrict') note(lobbyId, 'Join requests are closed');
    if (mine && mine.status === 'accepted') return acceptAndJoin(lobbyId);
    if (mine && mine.status === 'declined') note(lobbyId, 'The leader declined your request');
    const s = L.share;
    if (s && s.bank && global.StudyShare) {
      const holder = document.createElement('div');
      holder.className = 'st-share';
      try {
        await StudyShare.renderMirror(s, holder, { interactive: false, anchorPrefix: 'tile-' + lobbyId, shareSet: L.shareSet || null });
      } catch (e) {
        holder.textContent = 'Shared set unavailable';
      }
      if (!tiles[lobbyId]) return;
      body.__h = ''; body.innerHTML = '<div class="share-badge st-badge">Screen Share of ' + esc(s.sharedByName || 'leader') + '</div>';
      body.appendChild(holder);
      return;
    }
    // no share: a read-only copy of the session's question interface
    const view = L.status === 'live' ? sessionView(t, L) : '';
    let html;
    if (view) html = view;
    else {
      const rows = Object.keys(L.members || {}).map((id) => {
        const m = L.members[id];
        return '<div class="st-row"><span>' + esc(m.displayName) + ' · LV' + (m.level || 1) + (id === L.leader ? ' ★' : '') + '</span><em>' + (m.role === 'spectate' ? 'spectating' : 'ready') + '</em></div>';
      });
      html = '<div class="st-lobby-wait"><div class="st-status">' + (L.status === 'live' ? 'Starting…' : 'Waiting for the leader to start') + '</div>' + (rows.join('') || '<div class="st-wait">No players yet</div>') + '</div>';
    }
    const live = L.status === 'live';
    t.el.classList.toggle('st-live', live);
    const titleEl = t.el.querySelector('.st-title');
    if (titleEl) titleEl.innerHTML = esc(leaderName(L)) + "'s lobby" + (live ? ' <span class="st-live-dot" title="Live">LIVE</span>' : '');
    if (body.__h !== html) { body.__h = html; body.innerHTML = html; }
    placeCursors(lobbyId);
    // pick flashes fade on their own
    clearTimeout(t.flashT);
    if (body.querySelector('.pick-flash-ok,.pick-flash-bad')) t.flashT = setTimeout(() => { body.__h = ''; renderTile(lobbyId).catch(() => {}); }, 1500);
  }

  /* —— join requests (spectator side) —— */
  async function requestJoin(lobbyId) {
    const t = tiles[lobbyId];
    const L = t && t.lobby;
    if (!L) throw new Error('Lobby gone');
    const policy = policyOf(L);
    if (policy === 'restrict') throw new Error('Join requests are closed for this lobby');
    if (policy === 'all') return acceptAndJoin(lobbyId);
    await db().ref('lobbies/' + lobbyId + '/joinRequests/' + uid()).set({ displayName: myName(), at: Date.now(), status: 'pending' });
    note(lobbyId, 'Request sent — waiting for the leader');
  }
  /* "Ask to Join" from the lobby list: the same request, followed without a tile */
  const asks = {}; // lobbyId -> off()
  async function askToJoin(lobbyId) {
    const me = uid();
    if (!me) throw new Error('Sign in first');
    const L = (await db().ref('lobbies/' + lobbyId).once('value')).val();
    if (!L) throw new Error('Lobby gone');
    const policy = policyOf(L);
    if (policy === 'restrict') throw new Error('Join requests are closed for this lobby');
    if (policy === 'all') return acceptAndJoin(lobbyId);
    await db().ref('lobbies/' + lobbyId + '/joinRequests/' + me).set({ displayName: myName(), at: Date.now(), status: 'pending' });
    if (asks[lobbyId]) return;
    const ref = db().ref('lobbies/' + lobbyId + '/joinRequests/' + me);
    const onVal = (snap) => {
      const r = snap.val();
      if (!r || r.status === 'pending') return;
      ref.off('value', onVal);
      delete asks[lobbyId];
      if (r.status === 'accepted') acceptAndJoin(lobbyId);
      else {
        toast('The leader declined your request');
        ref.remove().catch(() => {});
      }
    };
    ref.on('value', onVal, () => {});
    asks[lobbyId] = () => ref.off('value', onVal);
  }
  let joining = false;
  async function acceptAndJoin(lobbyId) {
    if (joining) return;
    joining = true;
    try {
      const L = global.StudyLobby;
      // accepted into one lobby: leave any other lobby first
      const cur = joinedLobbyId();
      if (cur && cur !== lobbyId && L && L.leave) await L.leave(cur);
      if (L && L.join) await L.join(lobbyId, { role: 'play' });
      db().ref('lobbies/' + lobbyId + '/joinRequests/' + uid()).remove().catch(() => {});
      unwatch(lobbyId);
      toast('Joined the lobby');
    } catch (e) {
      note(lobbyId, rulesMsg(e));
    } finally {
      joining = false;
    }
  }

  /* —— leader side —— */
  function joinedLobbyId() {
    const me = uid();
    const L = global.StudyLobby;
    if (!L || !me) return null;
    const a = L.getActiveLobby && L.getActiveLobby();
    if (a && a.members && a.members[me]) return L.getActiveLobbyId();
    const all = (L.getLobbies && L.getLobbies()) || {};
    return Object.keys(all).find((id) => all[id] && all[id].members && all[id].members[me]) || null;
  }
  function joinedLobby() {
    const id = joinedLobbyId();
    const all = (global.StudyLobby && StudyLobby.getLobbies && StudyLobby.getLobbies()) || {};
    return id ? all[id] : null;
  }
  function watchJoined() {
    const id = joinedLobbyId();
    if (id === live.lobbyId) return;
    if (live.off) live.off();
    live.off = null;
    live.lobbyId = id;
    live.spectators = {};
    live.requests = {};
    if (!id) return paintBadge();
    const sref = db().ref('lobbies/' + id + '/spectators');
    const rref = db().ref('lobbies/' + id + '/joinRequests');
    const onS = (snap) => {
      live.spectators = snap.val() || {};
      paintBadge();
      renderLobbyBox();
    };
    const onR = (snap) => {
      live.requests = snap.val() || {};
      renderLobbyBox();
    };
    sref.on('value', onS, () => {});
    rref.on('value', onR, () => {});
    live.off = () => {
      sref.off('value', onS);
      rref.off('value', onR);
    };
  }
  async function respond(reqUid, accept) {
    const id = joinedLobbyId();
    if (!id) return;
    try {
      await db().ref('lobbies/' + id + '/joinRequests/' + reqUid + '/status').set(accept ? 'accepted' : 'declined');
    } catch (e) {
      toast(rulesMsg(e));
    }
  }
  async function setPolicy(p) {
    const id = joinedLobbyId();
    if (!id) return;
    try {
      await db().ref('lobbies/' + id + '/requestPolicy').set(p);
    } catch (e) {
      toast(rulesMsg(e));
    }
  }

  /* viewer count next to the online indicator */
  function paintBadge() {
    let b = document.getElementById('viewerCount');
    const net = document.getElementById('netStatus');
    const n = freshCount(live.spectators);
    if (!b) {
      b = document.createElement('span');
      b.id = 'viewerCount';
      b.className = 'viewer-count';
      b.title = 'Spectators watching your lobby';
      if (net && net.parentNode) net.parentNode.insertBefore(b, net.nextSibling);
      else document.body.appendChild(b);
    } else if (net && b.previousSibling !== net && net.parentNode) net.parentNode.insertBefore(b, net.nextSibling);
    b.hidden = !live.lobbyId;
    b.textContent = '👁 ' + n;
  }

  /* lobby panel section: screen share controls, join requests and spectators */
  let sharePicker = null;
  let shareChoice = null;
  function renderLobbyBox() {
    const panel = document.getElementById('lobbyPanel');
    if (!panel) return;
    let box = document.getElementById('lobbyLiveBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'lobbyLiveBox';
      box.className = 'lobby-live-box';
      panel.appendChild(box);
      box.addEventListener('click', onBoxClick);
      box.addEventListener('change', onBoxChange);
    }
    const me = uid();
    const S = global.StudyShare;
    const g = S && S.currentGroup();
    const JL = g && g.kind === 'lobby' ? joinedLobby() : null;
    let h = '';
    if (g) {
      const s = S.getSession();
      const lead = g.leader === me;
      h += '<section class="llb-sec"><h4>Screen Share</h4>';
      if (!s) {
        if (JL && shareOff(JL)) {
          h += '<div class="llb-note">Screen share is off for this lobby.</div>';
        } else if (!lead) {
          h += '<div class="llb-note">The leader can start a screen share.</div>';
        } else if (JL) {
          h += '<div class="llb-note">Mirror the lobby set to everyone: ' + esc(JL.setLabel || 'the lobby set') + '.</div>' +
            '<div class="llb-row llb-row-end"><button type="button" class="chat-tool-btn" data-act="share-start">Start Share</button></div>';
        } else {
          h += '<div class="llb-note">Pick a set to mirror to your party.</div><div id="shareSetMount" class="llb-picker"></div>' +
            '<div class="llb-row llb-row-end"><button type="button" class="chat-tool-btn" data-act="share-start">Start Share</button></div>';
        }
      } else {
        const sl = (S.getSetLabel && S.getSetLabel()) || '';
        h += '<div class="llb-note">Screen Share of ' + esc(s.sharedByName) + (sl ? ' · ' + esc(sl) : '') + ' · control: ' + esc(s.controllerName || '') + '</div>';
        if (lead) {
          h += Object.keys(g.members || {})
            .map((id) => {
              const m = g.members[id];
              const has = s.controllerUid === id;
              return '<div class="llb-row"><span>' + esc(m.displayName || 'Member') + (id === g.leader ? ' ★' : '') + '</span>' +
                '<button type="button" class="chat-tool-btn' + (has ? ' active' : '') + '" data-act="control" data-uid="' + esc(id) + '" aria-pressed="' + has + '">' +
                (has ? 'Has control' : 'Give control') + '</button></div>';
            })
            .join('');
        }
        if (lead || s.sharedBy === me) h += '<button type="button" class="chat-tool-btn danger" data-act="share-stop">End share</button>';
      }
      h += '</section>';
    }
    const L = joinedLobby();
    let rh = '';
    if (L && L.leader === me) {
      const policy = policyOf(L);
      rh += '<section class="llb-sec llb-requests"><h4>Join Requests</h4>' +
        '<div class="llb-field"><label class="bank-picker-label" for="llbPolicy">Who can ask to join</label><select class="chat-tool-input" id="llbPolicy">' +
        ['ask', 'restrict', 'all'].map((p) => '<option value="' + p + '"' + (p === policy ? ' selected' : '') + '>' + ({ ask: 'Ask me', restrict: 'Restrict', all: 'Allow all' }[p]) + '</option>').join('') +
        '</select></div>';
      const reqs = Object.keys(live.requests).filter((k) => live.requests[k] && live.requests[k].status === 'pending');
      rh += reqs.length
        ? reqs
          .map((k) => '<div class="llb-row llb-req"><span>' + esc(live.requests[k].displayName) + ' wants to join</span>' +
            '<button type="button" class="chat-tool-btn" data-act="accept" data-uid="' + esc(k) + '">Accept</button>' +
            '<button type="button" class="chat-tool-btn" data-act="decline" data-uid="' + esc(k) + '">Decline</button></div>')
          .join('')
        : '<div class="llb-note">No requests waiting.</div>';
      rh += '</section>';
      h += '<section class="llb-sec"><h4>Spectators <span class="llb-count" id="llbViewers">👁 ' + freshCount(live.spectators) + '</span></h4>' +
        (spectatingOff(L) ? '<div class="llb-note">Spectating is off for this lobby.</div>' : '<div class="llb-note">Viewers watching this lobby as a live tile.</div>') +
        '</section>';
    }
    // join requests sit at the TOP of the panel, right under its header
    let rbox = document.getElementById('lobbyReqBox');
    if (!rbox) {
      rbox = document.createElement('div');
      rbox.id = 'lobbyReqBox';
      rbox.className = 'lobby-live-box lobby-req-box';
      const head = panel.querySelector('.lobby-panel-head');
      if (head && head.nextSibling) panel.insertBefore(rbox, head.nextSibling); else panel.insertBefore(rbox, panel.firstChild);
      rbox.addEventListener('click', onBoxClick);
      rbox.addEventListener('change', onBoxChange);
    }
    if (rbox.__h !== rh) { rbox.__h = rh; rbox.innerHTML = rh; }
    rbox.hidden = !rh;
    if (box.__h !== h) {
      box.__h = h;
      box.innerHTML = h;
      const mountEl = box.querySelector('#shareSetMount');
      sharePicker = null;
      if (mountEl && global.StudyBankPicker && StudyBankPicker.mount) {
        sharePicker = StudyBankPicker.mount(mountEl, {
          idPrefix: 'share',
          compact: true,
          value: shareChoice || undefined,
          onChange: (bank, form, enc, choice) => {
            shareChoice = choice ? { bank: choice.bank, form: choice.form, card: choice.card } : null;
          }
        });
      }
    }
    box.hidden = !h;
  }
  function onBoxClick(e) {
    const b = e.target.closest && e.target.closest('[data-act]');
    if (!b) return;
    const S = global.StudyShare;
    const act = b.dataset.act;
    const done = () => renderLobbyBox();
    if (act === 'share-start' && S) {
      const JL = joinedLobby();
      let opts;
      if (JL) opts = { bank: JL.bank, form: JL.form || 'A', card: JL.card || null, label: JL.setLabel || '' };
      else {
        const c = sharePicker && sharePicker.getChoice && sharePicker.getChoice();
        opts = c ? { bank: c.bank, form: c.form, card: c.card, label: c.label } : {};
      }
      S.start(opts).then(done, (err) => toast(err.message));
    } else if (act === 'share-stop' && S) S.stop().then(done, (err) => toast(err.message));
    else if (act === 'control' && S) {
      const s = S.getSession();
      const g = S.getGroup();
      // toggle: giving control to the holder again hands it back to the leader
      const target = s && s.controllerUid === b.dataset.uid ? g.leader : b.dataset.uid;
      S.setController(target).then(done, (err) => toast(err.message));
    } else if (act === 'accept') respond(b.dataset.uid, true);
    else if (act === 'decline') respond(b.dataset.uid, false);
  }
  function onBoxChange(e) {
    if (e.target && e.target.id === 'llbPolicy') setPolicy(e.target.value);
  }

  function ensureBeat() {
    if (beatTimer) return;
    beatTimer = setInterval(() => {
      const me = uid();
      if (!me) return;
      Object.keys(tiles).forEach((id) => {
        db().ref('lobbies/' + id + '/spectators/' + me + '/lastSeen').set(Date.now()).catch(() => {});
      });
    }, BEAT_MS);
  }
  function tick() {
    try {
      watchJoined();
      renderLobbyBox();
      paintBadge();
    } catch (e) {}
  }
  function init() {
    setInterval(tick, 2000);
    setTimeout(tick, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.StudySpectate = {
    watch,
    unwatch,
    zoom,
    requestJoin,
    askToJoin,
    respond,
    setPolicy,
    renderLobbyBox,
    tiles: () => Object.keys(tiles),
    _tick: tick,
    MAX_TILES
  };
})(window);
