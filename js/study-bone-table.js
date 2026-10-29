/* Interactive skeleton bone table for Anatomy study chapters.
 * Looks for [data-bone-table] roots after a chapter's Markdown is injected.
 * data-system = axial | appendicular | all (optional filter lock)
 * data-src    = JSON inventory path (default data/anatomy-skeleton-bones.json)
 * data-region = optional region lock (e.g. "Pectoral Girdle"): a small table of that region only
 * [data-heading-preview="a.webp|b.webp"] after a heading: the heading text gets the same hover still
 */
(function () {
  'use strict';

  var cache = Object.create(null);
  var previewEl = null;
  var previewTimer = null;
  var cycleTimer = null;
  var cycleIdx = 0;
  var cycleImgs = null;

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadData(src) {
    if (!cache[src]) {
      cache[src] = fetch(src, { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error(src + ' → ' + r.status);
          return r.json();
        });
    }
    return cache[src];
  }

  function ensurePreview() {
    if (previewEl) return previewEl;
    previewEl = document.createElement('div');
    previewEl.className = 'bone-hover-preview';
    previewEl.setAttribute('aria-hidden', 'true');
    previewEl.innerHTML = '<img alt="" />';
    document.body.appendChild(previewEl);
    return previewEl;
  }

  function hidePreview() {
    if (previewTimer) { clearTimeout(previewTimer); previewTimer = null; }
    if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
    cycleImgs = null;
    if (previewEl) previewEl.classList.remove('show');
  }

  function placePreview(clientX, clientY) {
    var el = ensurePreview();
    var pad = 16;
    var w = el.offsetWidth || 220;
    var h = el.offsetHeight || 220;
    var x = clientX + 18;
    var y = clientY + 18;
    if (x + w + pad > window.innerWidth) x = clientX - w - 12;
    if (y + h + pad > window.innerHeight) y = clientY - h - 12;
    if (x < pad) x = pad;
    if (y < pad) y = pad;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  }

  function showPreview(imgs, clientX, clientY) {
    if (!imgs || !imgs.length) return;
    var el = ensurePreview();
    var img = el.querySelector('img');
    cycleImgs = imgs;
    cycleIdx = 0;
    img.onload = function () {
      el.classList.add('show');
      placePreview(clientX, clientY);
    };
    img.onerror = function () { hidePreview(); };
    img.src = imgs[0];
    // light preload of next frames
    imgs.slice(1, 3).forEach(function (src) {
      var pre = new Image();
      pre.src = src;
    });
    if (cycleTimer) clearInterval(cycleTimer);
    if (imgs.length > 1) {
      cycleTimer = setInterval(function () {
        if (!cycleImgs || cycleImgs.length < 2) return;
        cycleIdx = (cycleIdx + 1) % cycleImgs.length;
        img.src = cycleImgs[cycleIdx];
      }, 900);
    }
  }

  function compare(a, b, key, dir) {
    var mul = dir === 'desc' ? -1 : 1;
    var av = a[key];
    var bv = b[key];
    if (key === 'count') return (av - bv) * mul;
    av = String(av || '').toLowerCase();
    bv = String(bv || '').toLowerCase();
    if (av < bv) return -1 * mul;
    if (av > bv) return 1 * mul;
    return 0;
  }

  function unique(arr) {
    var out = [];
    var seen = Object.create(null);
    arr.forEach(function (v) {
      if (!v || seen[v]) return;
      seen[v] = 1;
      out.push(v);
    });
    return out;
  }

  function mount(root, data) {
    var lockSystem = (root.getAttribute('data-system') || 'all').toLowerCase();
    var bones = (data.bones || []).slice();
    if (lockSystem === 'axial' || lockSystem === 'appendicular') {
      bones = bones.filter(function (b) { return b.system === lockSystem; });
    }
    var lockRegion = (root.getAttribute('data-region') || '').trim().toLowerCase();
    if (lockRegion) {
      bones = bones.filter(function (b) { return String(b.region || '').toLowerCase() === lockRegion; });
    }

    var state = {
      sortKey: 'region',
      sortDir: 'asc',
      shape: '',
      region: '',
      system: lockSystem === 'all' ? '' : lockSystem,
      q: ''
    };

    var regions = unique(bones.map(function (b) { return b.region; }));
    var shapes = (data.shapes || ['long', 'short', 'flat', 'irregular', 'sesamoid']).slice();
    var showSystemFilter = lockSystem === 'all';
    var compact = !!lockRegion;

    root.innerHTML =
      (compact ? '<div class="bone-table-toolbar compact">' : '<div class="bone-table-toolbar">') +
      (compact ? '' : 
        '<label class="bone-filter">Shape' +
          '<select data-f="shape"><option value="">All shapes</option>' +
            shapes.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s.charAt(0).toUpperCase() + s.slice(1)) + '</option>'; }).join('') +
          '</select></label>' +
        '<label class="bone-filter">Region' +
          '<select data-f="region"><option value="">All regions</option>' +
            regions.map(function (r) { return '<option value="' + esc(r) + '">' + esc(r) + '</option>'; }).join('') +
          '</select></label>' +
        (showSystemFilter
          ? '<label class="bone-filter">System<select data-f="system"><option value="">Axial + Appendicular</option><option value="axial">Axial</option><option value="appendicular">Appendicular</option></select></label>'
          : '') +
        '<label class="bone-filter bone-search">Search' +
          '<input type="search" data-f="q" placeholder="Bone name…" autocomplete="off" /></label>') +
        '<div class="bone-total" data-total></div>' +
      '</div>' +
      '<div class="bone-table-wrap">' +
        '<table class="bone-table">' +
          '<thead><tr>' +
            '<th data-sort="name">Bone</th>' +
            (showSystemFilter ? '<th data-sort="system">System</th>' : '') +
            '<th data-sort="region">Region</th>' +
            '<th data-sort="shape">Shape</th>' +
            '<th data-sort="count" class="num">Count</th>' +
          '</tr></thead>' +
          '<tbody data-body></tbody>' +
        '</table>' +
      '</div>';

    var body = root.querySelector('[data-body]');
    var totalEl = root.querySelector('[data-total]');
    var baseTotal = bones.reduce(function (n, b) { return n + (b.count || 0); }, 0);

    function filtered() {
      return bones.filter(function (b) {
        if (state.shape && b.shape !== state.shape) return false;
        if (state.region && b.region !== state.region) return false;
        if (state.system && b.system !== state.system) return false;
        if (state.q) {
          var q = state.q.toLowerCase();
          if (String(b.name).toLowerCase().indexOf(q) < 0 &&
              String(b.region).toLowerCase().indexOf(q) < 0 &&
              String(b.shape).toLowerCase().indexOf(q) < 0) return false;
        }
        return true;
      }).slice().sort(function (a, b) { return compare(a, b, state.sortKey, state.sortDir); });
    }

    function paint() {
      var rows = filtered();
      var sum = rows.reduce(function (n, b) { return n + (b.count || 0); }, 0);
      var label = lockSystem === 'all' && !state.system
        ? 'Showing ' + sum + ' of ' + (data.totals && data.totals.all != null ? data.totals.all : baseTotal) + ' bones'
        : 'Showing ' + sum + ' of ' + baseTotal + ' bones';
      if (state.shape || state.region || state.q || (showSystemFilter && state.system)) {
        label += ' (filtered)';
      }
      totalEl.textContent = label;

      root.querySelectorAll('th[data-sort]').forEach(function (th) {
        th.classList.remove('sort-asc', 'sort-desc');
        th.removeAttribute('aria-sort');
        if (th.getAttribute('data-sort') === state.sortKey) {
          th.classList.add(state.sortDir === 'desc' ? 'sort-desc' : 'sort-asc');
          th.setAttribute('aria-sort', state.sortDir === 'desc' ? 'descending' : 'ascending');
        }
      });

      body.innerHTML = rows.map(function (b) {
        var imgs = (b.images || []).filter(Boolean);
        var hasImg = imgs.length > 0;
        return '<tr>' +
          '<td><span class="bone-name' + (hasImg ? ' has-preview' : '') + '"' +
            (hasImg ? ' data-images="' + esc(imgs.join('|')) + '" tabindex="0"' : '') +
            '>' + esc(b.name) + '</span></td>' +
          (showSystemFilter ? '<td class="cap">' + esc(b.system) + '</td>' : '') +
          '<td>' + esc(b.region) + '</td>' +
          '<td class="cap">' + esc(b.shape) + '</td>' +
          '<td class="num">' + esc(b.count) + '</td>' +
          '</tr>';
      }).join('');
    }

    root.querySelectorAll('[data-f]').forEach(function (el) {
      var ev = el.tagName === 'INPUT' ? 'input' : 'change';
      el.addEventListener(ev, function () {
        state[el.getAttribute('data-f')] = el.value.trim();
        paint();
      });
    });

    root.querySelectorAll('th[data-sort]').forEach(function (th) {
      th.tabIndex = 0;
      th.setAttribute('role', 'button');
      function toggle() {
        var key = th.getAttribute('data-sort');
        if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortKey = key; state.sortDir = key === 'count' ? 'desc' : 'asc'; }
        paint();
      }
      th.addEventListener('click', toggle);
      th.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });

    body.addEventListener('pointerover', function (e) {
      var t = e.target.closest('.bone-name.has-preview');
      if (!t || !body.contains(t)) return;
      var imgs = (t.getAttribute('data-images') || '').split('|').filter(Boolean);
      showPreview(imgs, e.clientX, e.clientY);
    });
    body.addEventListener('pointermove', function (e) {
      var t = e.target.closest('.bone-name.has-preview');
      if (!t || !previewEl || !previewEl.classList.contains('show')) return;
      placePreview(e.clientX, e.clientY);
    });
    body.addEventListener('pointerout', function (e) {
      var t = e.target.closest('.bone-name.has-preview');
      if (!t) return;
      var to = e.relatedTarget;
      if (to && t.contains(to)) return;
      hidePreview();
    });
    body.addEventListener('focusin', function (e) {
      var t = e.target.closest('.bone-name.has-preview');
      if (!t) return;
      var rect = t.getBoundingClientRect();
      var imgs = (t.getAttribute('data-images') || '').split('|').filter(Boolean);
      showPreview(imgs, rect.right, rect.top);
    });
    body.addEventListener('focusout', function (e) {
      var t = e.target.closest('.bone-name.has-preview');
      if (!t) return;
      hidePreview();
    });

    paint();
  }

  /* heading hover still: <div data-heading-preview="a|b"> right after an h2/h3 */
  function decorateHeadings(scope) {
    var figs = (scope || document).querySelectorAll('[data-heading-preview]');
    Array.prototype.forEach.call(figs, function (fig) {
      var h = fig.previousElementSibling;
      if (!h || !/^H[2-4]$/.test(h.tagName) || h.dataset.boneHeading === '1') return;
      var imgs = (fig.getAttribute('data-heading-preview') || '').split('|').filter(Boolean);
      if (!imgs.length) return;
      h.dataset.boneHeading = '1';
      var span = document.createElement('span');
      span.className = 'bone-name has-preview';
      span.tabIndex = 0;
      span.setAttribute('data-images', imgs.join('|'));
      while (h.firstChild) span.appendChild(h.firstChild);
      h.appendChild(span);
      span.addEventListener('pointerenter', function (e) { showPreview(imgs, e.clientX, e.clientY); });
      span.addEventListener('pointermove', function (e) {
        if (previewEl && previewEl.classList.contains('show')) placePreview(e.clientX, e.clientY);
      });
      span.addEventListener('pointerleave', hidePreview);
      span.addEventListener('focus', function () {
        var r = span.getBoundingClientRect();
        showPreview(imgs, r.right, r.top);
      });
      span.addEventListener('blur', hidePreview);
    });
  }

  function init(scope) {
    decorateHeadings(scope);
    var roots = (scope || document).querySelectorAll('[data-bone-table]');
    if (!roots.length) return Promise.resolve();
    var tasks = [];
    Array.prototype.forEach.call(roots, function (root) {
      if (root.dataset.boneReady === '1') return;
      var src = root.getAttribute('data-src') || 'data/anatomy-skeleton-bones.json';
      root.dataset.boneReady = '1';
      root.innerHTML = '<p class="bone-loading">Loading bone table…</p>';
      tasks.push(
        loadData(src)
          .then(function (data) { mount(root, data); })
          .catch(function (err) {
            root.innerHTML = '<p class="bone-error"><strong>Could not load bone table.</strong> ' + esc(String(err)) + '</p>';
          })
      );
    });
    return Promise.all(tasks);
  }

  window.StudyBoneTable = { init: init, hidePreview: hidePreview };
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) hidePreview();
  });
})();
