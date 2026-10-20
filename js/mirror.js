/* Study Portal — live DOM mirror of the quiz engine (and, in Host Screen mode, of the host's page).
   A publisher serialises what the engine drew (ids, classes, inline styles, input values and
   scroll) into one node, e.g. lobbies/{id}/session/mirror/{uid} = { html, w, h, sy, at, title }.
   A viewer sanitises it and patches it into a shadow root that carries the site's own styles,
   so a mirror looks exactly like the quiz it copies and keeps running CSS animations between
   updates. Only the quiz/site interface is copied: profile, settings, chat and anything marked
   data-private are left out. */
(function (global) {
  const MIN_GAP_MS = 450;          // at most ~2 writes a second
  const DEBOUNCE_MS = 160;
  const MAX_HTML = 400000;         // characters
  const DROP_SEL = 'script,noscript,iframe,object,embed,link,meta,base,template,style,canvas,video,audio,' +
    '[data-private],.friend-cursor,.profile-modal,#profileModal,#settingsModal,.chat-root,#chatRoot,.mirror-skip';
  const BAD_TAGS = /^(script|iframe|object|embed|link|meta|base|frame|frameset|applet|form|portal|style|noscript|template)$/i;
  const URL_ATTRS = { src: 1, href: 1, 'xlink:href': 1, poster: 1, srcset: 1, action: 1, formaction: 1, background: 1 };

  function db() { return firebase.database(); }

  /* ---------- publishing ---------- */
  function serialize(root, opts) {
    opts = opts || {};
    if (global.StudyCursors && StudyCursors.stampAnchors) { try { StudyCursors.stampAnchors(root); } catch (e) {} }
    const clone = root.cloneNode(true);
    // live form state → attributes
    const live = root.querySelectorAll('input,textarea,select');
    const copy = clone.querySelectorAll('input,textarea,select');
    live.forEach((el, i) => {
      const c = copy[i]; if (!c) return;
      if (el.tagName === 'SELECT') { const o = c.options[el.selectedIndex]; if (o) o.setAttribute('selected', ''); }
      else if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) c.setAttribute('checked', ''); else c.removeAttribute('checked'); }
      else if (el.type === 'password') c.setAttribute('value', '');
      else if (el.tagName === 'TEXTAREA') c.textContent = el.value;
      else c.setAttribute('value', el.value);
      if (document.activeElement === el) c.setAttribute('data-mfocus', '');
    });
    // element scroll positions (the label stage and long lists scroll inside themselves)
    const lsc = root.querySelectorAll('*'), csc = clone.querySelectorAll('*');
    for (let i = 0; i < lsc.length && i < 6000; i++) {
      const el = lsc[i];
      if ((el.scrollTop || el.scrollLeft) && csc[i]) csc[i].setAttribute('data-mscroll', (el.scrollLeft | 0) + ',' + (el.scrollTop | 0));
    }
    clone.querySelectorAll(DROP_SEL).forEach((n) => n.remove());
    (opts.drop ? clone.querySelectorAll(opts.drop) : []).forEach((n) => n.remove());
    clone.querySelectorAll('*').forEach((n) => {
      for (const a of Array.from(n.attributes)) if (/^on/i.test(a.name)) n.removeAttribute(a.name);
    });
    const r = root.getBoundingClientRect();
    return { html: clone.outerHTML, w: Math.round(r.width) || 0, h: Math.round(Math.max(r.height, root.scrollHeight || 0)) || 0 };
  }

  /* publish(root | () => root, path, opts) → { stop(), flush() } */
  function publish(getRoot, path, opts) {
    opts = opts || {};
    const rootOf = typeof getRoot === 'function' ? getRoot : () => getRoot;
    let mo = null, timer = null, last = 0, lastHtml = '', lastSy = -1, stopped = false, observed = null;
    const ref = db().ref(path);
    const write = () => {
      timer = null;
      if (stopped) return;
      const now = Date.now();
      if (now - last < MIN_GAP_MS) { timer = setTimeout(write, MIN_GAP_MS - (now - last)); return; }
      const root = rootOf();
      if (!root) return;
      if (root !== observed) watch(root);
      let s;
      try { s = serialize(root, opts); } catch (e) { return; }
      const sy = Math.round(opts.scroll ? opts.scroll() : (global.scrollY || 0));
      if (s.html.length > MAX_HTML) s.html = '<div class="mirror-too-big">This screen is too large to mirror.</div>';
      if (s.html === lastHtml && sy === lastSy) return;
      last = now;
      const val = { w: s.w, h: s.h, sy: sy, at: now };
      if (opts.extra) Object.assign(val, opts.extra() || {});
      if (s.html !== lastHtml) { val.html = s.html; ref.set(val).catch(() => {}); }
      else ref.update(val).catch(() => {});
      lastHtml = s.html; lastSy = sy;
    };
    const kick = () => { if (!timer && !stopped) timer = setTimeout(write, DEBOUNCE_MS); };
    function watch(root) {
      if (mo) mo.disconnect();
      observed = root;
      mo = new MutationObserver(kick);
      mo.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
    }
    const onEv = () => kick();
    document.addEventListener('input', onEv, true);
    document.addEventListener('scroll', onEv, true);
    global.addEventListener('resize', onEv);
    const tick = setInterval(kick, 2500); // a view swap (sets → quiz) replaces the root
    kick();
    return {
      flush: () => { last = 0; lastHtml = ''; write(); },
      kick,
      stop: () => {
        stopped = true; if (mo) mo.disconnect(); clearTimeout(timer); clearInterval(tick);
        document.removeEventListener('input', onEv, true);
        document.removeEventListener('scroll', onEv, true);
        global.removeEventListener('resize', onEv);
        if (opts.clearOnStop !== false) ref.remove().catch(() => {});
      }
    };
  }

  /* ---------- viewing ---------- */
  let sheet = null, sheetAt = 0;
  function siteSheet() {
    if (sheet && Date.now() - sheetAt < 60000) return sheet;
    let css = '';
    for (const ss of Array.from(document.styleSheets)) {
      let rules; try { rules = ss.cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (const r of Array.from(rules)) css += r.cssText + '\n';
    }
    // inside a shadow root :root and html/body selectors never match; theme variables inherit from the page
    css += ':host{display:block;position:relative;overflow:hidden;contain:content}' +
      '.mirror-stage{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none}' +
      ':host(.mirror-live) .mirror-stage{pointer-events:auto}' +
      '.mirror-stage .view{display:block}' +
      '.mirror-stage *{animation-play-state:running}' +
      '.mirror-empty{padding:18px;font:600 .8rem var(--mono,monospace);color:var(--text-dim);text-align:center}';
    try { sheet = new CSSStyleSheet(); sheet.replaceSync(css); } catch (e) { sheet = null; }
    sheetAt = Date.now();
    return sheet;
  }

  function safeUrl(v, attr) {
    const s = String(v || '').trim();
    if (!s) return '';
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(s)) return attr === 'srcset' ? '' : s;
    if (/^#/.test(s)) return s;
    if (/^[a-z][a-z0-9+.-]*:/i.test(s) || /^\/\//.test(s)) return ''; // no absolute URLs: no tracking, no javascript:
    return s;
  }
  function sanitize(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html || '');
    const walk = (node) => {
      for (const n of Array.from(node.children)) {
        if (BAD_TAGS.test(n.tagName) || /^(foreignObject|animate|set|animateMotion|animateTransform)$/i.test(n.tagName)) { n.remove(); continue; }
        for (const a of Array.from(n.attributes)) {
          const nm = a.name.toLowerCase();
          if (nm.startsWith('on') || nm === 'srcdoc' || nm === 'autofocus' || nm === 'contenteditable') { n.removeAttribute(a.name); continue; }
          if (URL_ATTRS[nm]) {
            const v = safeUrl(a.value, nm);
            if (nm === 'href' && n.tagName === 'A') { n.removeAttribute(a.name); continue; }
            if (v) n.setAttribute(a.name, v); else n.removeAttribute(a.name);
            continue;
          }
          if (nm === 'style' && /url\s*\(|expression|@import/i.test(a.value)) {
            n.setAttribute('style', a.value.replace(/url\s*\(\s*(['"]?)([^)'"]*)\1\s*\)/gi, (m, q, u) => (safeUrl(u) ? m : 'none')).replace(/expression|@import/gi, ''));
          }
        }
        if (/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(n.tagName)) n.setAttribute('tabindex', '-1');
        walk(n);
      }
    };
    walk(t.content);
    return t.content;
  }

  /* minimal DOM patcher: keeps unchanged nodes (and their running animations) in place */
  function sameNode(a, b) { return a.nodeType === b.nodeType && a.nodeName === b.nodeName && (a.nodeType !== 1 || (a.id || '') === (b.id || '')); }
  function morph(from, to) {
    if (from.nodeType === 3 || from.nodeType === 8) { if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue; return; }
    if (from.nodeType === 1) {
      const fa = from.attributes, ta = to.attributes;
      for (let i = fa.length - 1; i >= 0; i--) { const n = fa[i].name; if (!to.hasAttribute(n)) from.removeAttribute(n); }
      for (let i = 0; i < ta.length; i++) { const a = ta[i]; if (from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value); }
      if (from.tagName === 'INPUT' && from.value !== (to.getAttribute('value') || '')) from.value = to.getAttribute('value') || '';
    }
    const fk = Array.from(from.childNodes), tk = Array.from(to.childNodes);
    let i = 0;
    for (; i < tk.length; i++) {
      const t = tk[i], f = fk[i];
      if (!f) { from.appendChild(t.cloneNode(true)); continue; }
      if (sameNode(f, t)) morph(f, t);
      else from.replaceChild(t.cloneNode(true), f);
    }
    for (let j = fk.length - 1; j >= i; j--) if (fk[j].parentNode === from) from.removeChild(fk[j]);
  }

  /* mount(host, path, opts) → { stop(), root(), last() }; opts: {fit:'width'|'contain', onData(v), empty, live, onInput(ev)} */
  function mount(host, path, opts) {
    opts = opts || {};
    const sr = host.shadowRoot || host.attachShadow({ mode: 'open' });
    const sh = siteSheet();
    if (sh) sr.adoptedStyleSheets = [sh];
    sr.innerHTML = '<div class="mirror-stage"></div>';
    const stage = sr.firstChild;
    host.classList.add('mirror-host');
    let lastVal = null;
    const fit = () => {
      const v = lastVal; if (!v) return;
      const w = v.w || 900;
      const hw = host.clientWidth || w;
      let k = hw / w;
      if (opts.fit === 'contain' && v.h && host.clientHeight) k = Math.min(k, host.clientHeight / Math.min(v.h, 4000));
      k = Math.min(opts.maxScale || 1, k);
      stage.style.width = w + 'px';
      stage.style.transform = 'scale(' + k + ')';
      // follow the player's scroll, scaled
      const sy = Math.max(0, (v.sy || 0) - (v.offTop || 0));
      if (opts.follow !== false) stage.style.top = -(sy * k) + 'px';
      if (opts.fit !== 'contain' && opts.autoHeight) host.style.height = Math.max(120, Math.min((v.h || 600) * k, opts.maxHeight || 99999)) + 'px';
      host.style.setProperty('--mirror-k', k);
    };
    const apply = (v) => {
      lastVal = v;
      if (!v || !v.html) {
        stage.innerHTML = '<div class="mirror-empty">' + (opts.empty || 'Waiting for the screen…') + '</div>';
        if (opts.onData) opts.onData(v);
        return;
      }
      const frag = sanitize(v.html);
      const next = frag.firstElementChild;
      const cur = stage.firstElementChild;
      if (next && cur && !cur.classList.contains('mirror-empty') && sameNode(cur, next)) morph(cur, next);
      else { stage.innerHTML = ''; if (next) stage.appendChild(next); }
      const rootEl = stage.firstElementChild;
      if (rootEl) { rootEl.classList.add('active'); rootEl.style.margin = '0'; }
      stage.querySelectorAll('[data-mscroll]').forEach((el) => { const p = el.getAttribute('data-mscroll').split(','); el.scrollLeft = +p[0] || 0; el.scrollTop = +p[1] || 0; });
      fit();
      if (opts.onData) opts.onData(v);
    };
    const ref = db().ref(path);
    const handler = (s) => { try { apply(s.val()); } catch (e) { console.warn('[mirror]', e); } };
    ref.on('value', handler);
    const ro = global.ResizeObserver ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(host);
    let inputOff = null;
    if (opts.onInput) {
      host.classList.add('mirror-live');
      const h = (e) => opts.onInput(e, stage);
      ['click', 'input', 'change', 'keydown'].forEach((t) => sr.addEventListener(t, h, true));
      inputOff = () => ['click', 'input', 'change', 'keydown'].forEach((t) => sr.removeEventListener(t, h, true));
    }
    return {
      root: () => stage,
      last: () => lastVal,
      refit: fit,
      stop: () => { ref.off('value', handler); if (ro) ro.disconnect(); if (inputOff) inputOff(); sr.innerHTML = ''; host.classList.remove('mirror-host', 'mirror-live'); }
    };
  }

  /* element inside any mirror under a viewport point (for cursors) */
  function elementAt(x, y) {
    let el = document.elementFromPoint(x, y);
    while (el && el.shadowRoot && el.classList.contains('mirror-host')) {
      const inner = el.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === el) break;
      el = inner;
    }
    return el;
  }

  global.StudyMirror = { publish, mount, serialize, sanitize, morph, elementAt, _sheet: siteSheet };
})(window);
