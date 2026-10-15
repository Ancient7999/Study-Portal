/* Study Portal — multiplayer layout helpers
   - body.mp-active while in a party, a lobby or a party quiz (pins the profile chip top-left on phones)
   - top-centre bars (party quiz bar with Exit, party "Leave Party" banner) are stacked and the
     page / party quiz container is pushed below them, so they never cover the question box. */
(function (global) {
  const BARS = ['#splitModeBar', '#partyNavLockBanner'];
  function shown(el) {
    if (!el || el.hidden || el.classList.contains('hidden')) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }
  function inMultiplayer() {
    try {
      if (global.StudyParty && StudyParty.getPartyId && StudyParty.getPartyId()) return true;
    } catch (e) {}
    try {
      if (global.StudyLobby && StudyLobby.getActiveLobbyId && StudyLobby.getActiveLobbyId()) return true;
    } catch (e) {}
    return document.body.classList.contains('split-quiz-active') || document.body.classList.contains('party-nav-locked');
  }
  let ro = null;
  let wasSplit = false;
  const watched = new Set();
  function update() {
    const body = document.body;
    if (!body) return;
    body.classList.toggle('mp-active', inMultiplayer());
    // a party quiz starting on a phone tucks the lobby panel into its top icon
    const split = body.classList.contains('split-quiz-active');
    if (split && !wasSplit && global.matchMedia && matchMedia('(max-width: 800px)').matches && global.StudyLobby && StudyLobby.setCollapsed) {
      try { StudyLobby.setCollapsed(true); } catch (e) {}
    }
    wasSplit = split;
    let bottom = 0;
    BARS.forEach((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      if (!watched.has(el)) {
        watched.add(el);
        if (ro) ro.observe(el);
        if (global.MutationObserver) new MutationObserver(queue).observe(el, { attributes: true, attributeFilter: ['class', 'hidden'] });
      }
      if (!shown(el)) {
        el.style.removeProperty('top');
        return;
      }
      // stack below the bar above it
      if (bottom > 0) el.style.top = bottom + 4 + 'px';
      else el.style.removeProperty('top');
      const r = el.getBoundingClientRect();
      bottom = Math.max(bottom, r.bottom);
    });
    const clear = bottom > 0 ? Math.ceil(bottom + 8) : 0;
    const root = document.documentElement;
    if (root.style.getPropertyValue('--mp-top-clear') !== clear + 'px') root.style.setProperty('--mp-top-clear', clear + 'px');
    body.classList.toggle('mp-top-bar', clear > 0);
  }
  let queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    (global.requestAnimationFrame || setTimeout)(() => {
      queued = false;
      update();
    });
  }
  function init() {
    if (global.ResizeObserver) ro = new ResizeObserver(queue);
    global.addEventListener('resize', queue, { passive: true });
    if (global.MutationObserver) {
      new MutationObserver(queue).observe(document.body, { childList: true, attributes: true, attributeFilter: ['class', 'hidden'], subtree: false });
    }
    setInterval(update, 1000);
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  global.StudyMpLayout = { update };
})(window);
