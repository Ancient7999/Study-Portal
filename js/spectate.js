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
    const el = document.createElement('div');
    el.className = 'spectate-tile';
    el.dataset.lobby = lobbyId;
    el.innerHTML =
      '<div class="st-head"><span class="st-title">Lobby ' + esc(lobbyId.slice(0, 6)) + '</span><span class="st-viewers"></span>' +
      '<button type="button" class="st-btn st-zoom" aria-label="Enlarge" title="Enlarge">⤢</button>' +
      '<button type="button" class="st-btn st-close" aria-label="Stop watching" title="Stop watching">×</button></div>' +
      '<div class="st-body"><div class="st-wait">Connecting…</div></div>' +
      '<div class="st-foot"><button type="button" class="chat-tool-btn st-request">Request to join</button><span class="st-note"></span></div>';
    const t = { el, off: null, lobby: null, req: null };
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
  }
  async function renderTile(lobbyId) {
    const t = tiles[lobbyId];
    if (!t) return;
    const L = t.lobby;
    const body = t.el.querySelector('.st-body');
    if (!L) {
      body.innerHTML = '<div class="st-wait">This lobby has closed.</div>';
      t.el.querySelector('.st-request').disabled = true;
      return;
    }
    t.el.querySelector('.st-title').textContent = leaderName(L) + "'s lobby";
    t.el.querySelector('.st-viewers').textContent = '👁 ' + freshCount(L.spectators);
    const policy = L.requestPolicy || 'ask';
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
        await StudyShare.renderMirror(s, holder, { interactive: false, anchorPrefix: 'tile-' + lobbyId });
      } catch (e) {
        holder.textContent = 'Shared set unavailable';
      }
      if (!tiles[lobbyId]) return;
      body.innerHTML = '<div class="share-badge st-badge">Screen Share of ' + esc(s.sharedByName || 'leader') + '</div>';
      body.appendChild(holder);
      return;
    }
    // no share: each member's pane progress
    const panes = (L.session && L.session.panes) || {};
    const rows = Object.keys(L.members || {}).map((id) => {
      const m = L.members[id];
      const p = panes[id];
      return '<div class="st-row"><span>' + esc(m.displayName) + (id === L.leader ? ' ★' : '') + '</span><em>' +
        (p ? 'Q' + ((p.qIndex | 0) + 1) + (p.score != null ? ' · ' + p.score : '') : esc(L.status || 'open')) + '</em></div>';
    });
    body.innerHTML = '<div class="st-status">' + esc(L.status || 'open') + '</div>' + (rows.join('') || '<div class="st-wait">No players yet</div>');
  }

  /* —— join requests (spectator side) —— */
  async function requestJoin(lobbyId) {
    const t = tiles[lobbyId];
    const L = t && t.lobby;
    if (!L) throw new Error('Lobby gone');
    const policy = L.requestPolicy || 'ask';
    if (policy === 'restrict') throw new Error('Join requests are closed for this lobby');
    if (policy === 'all') return acceptAndJoin(lobbyId);
    await db().ref('lobbies/' + lobbyId + '/joinRequests/' + uid()).set({ displayName: myName(), at: Date.now(), status: 'pending' });
    note(lobbyId, 'Request sent — waiting for the leader');
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

  /* lobby panel section: screen share controls + spectators and requests */
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
    let h = '';
    if (g) {
      const s = S.getSession();
      const lead = g.leader === me;
      h += '<div class="llb-sec"><h4>Screen share</h4>';
      if (!s) {
        const JL = g.kind === 'lobby' ? joinedLobby() : null;
        const defBank = esc((JL && JL.bank) || 'banks/medphys/pt1.json');
        const defForm = esc((JL && JL.form) || 'A');
        h += lead
          ? '<div class="llb-row"><input class="chat-tool-input" id="shareBankInput" value="' + defBank + '" aria-label="Bank path"><input class="chat-tool-input" id="shareFormInput" value="' + defForm + '" size="2" aria-label="Form"><button type="button" class="chat-tool-btn" data-act="share-start">Start share</button></div>'
          : '<div class="llb-note">The leader can start a screen share.</div>';
      } else {
        h += '<div class="llb-note">Screen Share of ' + esc(s.sharedByName) + ' · control: ' + esc(s.controllerName || '') + '</div>';
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
      h += '</div>';
    }
    const L = joinedLobby();
    if (L && L.leader === me) {
      const policy = L.requestPolicy || 'ask';
      h += '<div class="llb-sec"><h4>Spectators <span class="llb-count" id="llbViewers">👁 ' + freshCount(live.spectators) + '</span></h4>' +
        '<label class="llb-row">Join requests <select class="chat-tool-input" id="llbPolicy">' +
        ['ask', 'restrict', 'all'].map((p) => '<option value="' + p + '"' + (p === policy ? ' selected' : '') + '>' + ({ ask: 'Ask me', restrict: 'Restrict (block)', all: 'Allow all' }[p]) + '</option>').join('') +
        '</select></label>';
      const reqs = Object.keys(live.requests).filter((k) => live.requests[k] && live.requests[k].status === 'pending');
      h += reqs
        .map((k) => '<div class="llb-row llb-req"><span>' + esc(live.requests[k].displayName) + ' wants to join</span>' +
          '<button type="button" class="chat-tool-btn" data-act="accept" data-uid="' + esc(k) + '">Accept</button>' +
          '<button type="button" class="chat-tool-btn" data-act="decline" data-uid="' + esc(k) + '">Decline</button></div>')
        .join('');
      h += '</div>';
    }
    if (box.__h !== h) {
      box.__h = h;
      box.innerHTML = h;
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
      const bank = (document.getElementById('shareBankInput') || {}).value;
      const form = (document.getElementById('shareFormInput') || {}).value;
      S.start({ bank, form }).then(done, (err) => toast(err.message));
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
    respond,
    setPolicy,
    renderLobbyBox,
    tiles: () => Object.keys(tiles),
    _tick: tick,
    MAX_TILES
  };
})(window);
