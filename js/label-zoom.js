/* Picture zoom: pictures start fitted to their box; − / Fit / + buttons (and Ctrl + wheel) zoom in and back out, never below fit. */
(function () {
  'use strict';
  var LEVELS = []; for (var li = 10; li <= 30; li++) LEVELS.push(li / 10); // Fit (100%) → 300% in 10% steps
  function level(fig) { return parseFloat(fig.style.getPropertyValue('--lz')) || 1; }
  function setLevel(stage, fig, z, bar) {
    z = Math.max(1, Math.min(LEVELS[LEVELS.length - 1], z));
    var old = level(fig);
    var cx = (stage.scrollLeft + stage.clientWidth / 2) / (stage.scrollWidth || 1);
    var cy = (stage.scrollTop + stage.clientHeight / 2) / (stage.scrollHeight || 1);
    z = Math.round(z * 10) / 10;
    stage.classList.toggle('lz-zoomed', z > 1);
    if (z === 1) fig.style.removeProperty('--lz'); else fig.style.setProperty('--lz', String(z));
    if (z !== old) {
      stage.scrollLeft = cx * stage.scrollWidth - stage.clientWidth / 2;
      stage.scrollTop = cy * stage.scrollHeight - stage.clientHeight / 2;
    }
    if (bar) {
      bar.querySelector('.lz-out').disabled = z <= 1;
      bar.querySelector('.lz-fit').disabled = z <= 1;
      bar.querySelector('.lz-in').disabled = z >= LEVELS[LEVELS.length - 1];
      bar.querySelector('.lz-level').textContent = Math.round(z * 100) + '%';
    }
  }
  function step(z, dir) {
    if (dir > 0) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i] > z + 0.01) return LEVELS[i]; return LEVELS[LEVELS.length - 1]; }
    for (var k = LEVELS.length - 1; k >= 0; k--) if (LEVELS[k] < z - 0.01) return LEVELS[k]; return 1;
  }
  function wire(stage) {
    if (stage.dataset.zoomWired === '1') return;
    var fig = stage.querySelector('.label-figure'); if (!fig) return;
    if (stage.closest('.label-review')) return;
    stage.dataset.zoomWired = '1';
    var bar = document.createElement('div');
    bar.className = 'label-zoom';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Picture zoom');
    bar.innerHTML = '<button type="button" class="lz-out" title="Zoom out" aria-label="Zoom out">−</button>'
      + '<span class="lz-level" aria-live="polite">100%</span>'
      + '<button type="button" class="lz-in" title="Zoom in" aria-label="Zoom in">+</button>'
      + '<button type="button" class="lz-fit" title="Fit the whole picture" aria-label="Fit the whole picture">Fit</button>';
    stage.parentNode.insertBefore(bar, stage);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var f = stage.querySelector('.label-figure'); if (!f) return;
      var z = level(f);
      setLevel(stage, f, b.classList.contains('lz-in') ? step(z, 1) : b.classList.contains('lz-out') ? step(z, -1) : 1, bar);
    });
    stage.addEventListener('wheel', function (e) {
      if (!e.ctrlKey) return;
      var f = stage.querySelector('.label-figure'); if (!f) return;
      e.preventDefault();
      setLevel(stage, f, step(level(f), e.deltaY < 0 ? 1 : -1), bar);
    }, { passive: false });
    /* hold-and-drag pans when zoomed (mouse left button or touch); chips, inputs, buttons and label boxes keep their own behaviour */
    var pan = null;
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var f = stage.querySelector('.label-figure'); if (!f || level(f) <= 1) return;
      if (document.querySelector('.label-ghost:not(.returning)')) return;
      if (e.target.closest && e.target.closest('.label-chip, input, textarea, button, select, .label-slot, a')) return;
      pan = { id: e.pointerId, x: e.clientX, y: e.clientY, l: stage.scrollLeft, t: stage.scrollTop, moved: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!pan || e.pointerId !== pan.id) return;
      var dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (!pan.moved) { if (Math.hypot(dx, dy) < 6) return; pan.moved = true; stage.classList.add('lz-panning'); }
      e.preventDefault();
      stage.scrollLeft = pan.l - dx; stage.scrollTop = pan.t - dy;
    }, { passive: false });
    var endPan = function (e) {
      if (!pan || e.pointerId !== pan.id) return;
      if (pan.moved) {
        stage.classList.remove('lz-panning');
        var stop = function (ev) { ev.stopPropagation(); ev.preventDefault(); };
        stage.addEventListener('click', stop, true);
        setTimeout(function () { stage.removeEventListener('click', stop, true); }, 60);
      }
      pan = null;
    };
    window.addEventListener('pointerup', endPan); window.addEventListener('pointercancel', endPan);
    setLevel(stage, fig, level(fig), bar);
  }
  function scan(root) { (root || document).querySelectorAll('.label-stage').forEach(wire); }
  function start() {
    scan();
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) if (ms[i].addedNodes.length) { scan(); return; }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.LabelZoom = { scan: scan, levels: LEVELS };
})();
