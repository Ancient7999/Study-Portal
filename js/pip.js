/* Study Portal — floating picture-in-picture view of one lobby player's page.
   Opened from a seat card; drag it by its header, resize it from the corner. Size and position
   are remembered for the browser session (separately for phones and larger screens). It shows
   the same live mirror as the panes (lobbies/{id}/session/mirror/{uid}) and is view only. */
(function (global) {
  const KEY = 'studyPip';
  const CLOSE_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" fill="currentColor"/></svg>';
  let cur = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function phone() { return !!(global.matchMedia && global.matchMedia('(max-width: 800px)').matches); }
  function vpKey() { return phone() ? 'phone' : 'wide'; }
  function load() { try { const all = JSON.parse(sessionStorage.getItem(KEY) || '{}'); return all[vpKey()] || null; } catch (e) { return null; } }
  function save(r) {
    try { const all = JSON.parse(sessionStorage.getItem(KEY) || '{}'); all[vpKey()] = { x: r.x, y: r.y, w: r.w, h: r.h }; sessionStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
  }
  /* phones: a small tile under the top bar, clear of the answers lower down */
  function defaults() {
    const vw = global.innerWidth, vh = global.innerHeight;
    if (phone()) {
      const w = Math.min(168, Math.round(vw * 0.44));
      const bar = document.getElementById('splitModeBar');
      const below = bar && !bar.classList.contains('hidden') ? Math.round(bar.getBoundingClientRect().bottom) + 8 : 56;
      return { x: vw - w - 8, y: Math.max(56, below), w, h: Math.round(w * 0.8) };
    }
    const w = 380, h = 280;
    return { x: vw - w - 16, y: vh - h - 16, w, h };
  }
  function clamp(r) {
    const vw = global.innerWidth, vh = global.innerHeight;
    const minW = phone() ? 120 : 220, minH = phone() ? 96 : 150;
    r.w = Math.round(Math.max(minW, Math.min(r.w, vw - 16)));
    r.h = Math.round(Math.max(minH, Math.min(r.h, vh - 16)));
    r.x = Math.round(Math.max(8, Math.min(r.x, vw - r.w - 8)));
    r.y = Math.round(Math.max(8, Math.min(r.y, vh - r.h - 8)));
    return r;
  }
  function place(el, r) { el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px'; }

  function open(lobbyId, uid, name) {
    close();
    if (!lobbyId || !uid || !global.StudyMirror) return null;
    const el = document.createElement('section');
    el.id = 'lobbyPip';
    el.className = 'lobby-pip';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Watching ' + (name || 'a player'));
    el.innerHTML =
      '<div class="pip-head" title="Drag to move"><span class="pip-dot" aria-hidden="true"></span><span class="pip-title">' + esc(name || 'Player') + '</span>' +
      '<button type="button" class="pip-x" aria-label="Close the floating window" title="Close">' + CLOSE_SVG + '</button></div>' +
      '<div class="pip-body"></div>' +
      '<div class="pip-resize" role="separator" aria-label="Resize the floating window" title="Drag to resize" tabindex="0"></div>';
    document.body.appendChild(el);
    let r = clamp(Object.assign(defaults(), load() || {}));
    place(el, r);
    const m = StudyMirror.mount(el.querySelector('.pip-body'), 'lobbies/' + lobbyId + '/session/mirror/' + uid, { empty: 'Waiting for ' + esc(name || 'their') + ' page…' });
    const start = (mode) => (e) => {
      if (e.button > 0) return;
      if (mode === 'move' && e.target.closest && e.target.closest('.pip-x')) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, r0 = Object.assign({}, r);
      el.classList.add(mode === 'move' ? 'is-dragging' : 'is-resizing');
      const mv = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        r = clamp(mode === 'move' ? Object.assign({}, r0, { x: r0.x + dx, y: r0.y + dy }) : Object.assign({}, r0, { w: r0.w + dx, h: r0.h + dy }));
        place(el, r);
        if (mode !== 'move') m.refit();
      };
      const up = () => {
        global.removeEventListener('pointermove', mv);
        global.removeEventListener('pointerup', up);
        global.removeEventListener('pointercancel', up);
        el.classList.remove('is-dragging', 'is-resizing');
        save(r);
      };
      global.addEventListener('pointermove', mv);
      global.addEventListener('pointerup', up);
      global.addEventListener('pointercancel', up);
    };
    el.querySelector('.pip-head').addEventListener('pointerdown', start('move'));
    el.querySelector('.pip-resize').addEventListener('pointerdown', start('size'));
    // keyboard: arrows on the corner handle resize, Shift+arrows move
    el.querySelector('.pip-resize').addEventListener('keydown', (e) => {
      const d = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[e.key];
      if (!d) return;
      e.preventDefault();
      r = clamp(e.shiftKey ? Object.assign({}, r, { x: r.x + d[0], y: r.y + d[1] }) : Object.assign({}, r, { w: r.w + d[0], h: r.h + d[1] }));
      place(el, r); m.refit(); save(r);
    });
    el.querySelector('.pip-x').onclick = close;
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
    const onResize = () => { r = clamp(r); place(el, r); };
    global.addEventListener('resize', onResize);
    cur = { el, m, uid, lobbyId, off: () => global.removeEventListener('resize', onResize) };
    return el;
  }
  function close() {
    if (!cur) return;
    const c = cur; cur = null;
    try { c.m.stop(); } catch (e) {}
    c.off();
    c.el.remove();
  }

  global.StudyPip = { open, close, isOpen: () => !!cur, current: () => (cur ? { uid: cur.uid, lobbyId: cur.lobbyId } : null) };
})(window);
