/* Study Portal — themed dropdowns
   Every <select> gets the site look from CSS (closed state). On mouse/trackpad devices the
   option list itself is also themed: the native select stays in the page as the source of
   truth (value, change events, forms, labels) and a button + listbox replace its popup.
   Phones and tablets (coarse pointer) keep the native picker, which is the most accessible
   there. Keyboard: ↑ ↓ Home End PageUp PageDown, letters to jump, Enter/Space to choose,
   Esc to close, Tab to move on. Opt out with data-native on the select. */
(function (global) {
  const doc = global.document;
  let seq = 0;
  let openState = null; // {sel, btn, list, items, active}

  function coarse() {
    try {
      if (doc.documentElement.getAttribute('data-pointer-input') === 'touch') return true;
      return !!(global.matchMedia && global.matchMedia('(pointer: coarse)').matches && !global.matchMedia('(any-pointer: fine)').matches);
    } catch (e) {
      return false;
    }
  }

  function optionLabel(o) {
    return o ? o.label || o.textContent || '' : '';
  }

  function selectedOption(sel) {
    return sel.options[sel.selectedIndex] || null;
  }

  function syncButton(sel) {
    const btn = sel.__tsBtn;
    if (!btn) return;
    const o = selectedOption(sel);
    btn.querySelector('.ts-value').textContent = o ? optionLabel(o) : '';
    btn.disabled = !!sel.disabled;
    btn.title = o ? optionLabel(o) : '';
    if (openState && openState.sel === sel) renderList();
  }

  /* programmatic sel.value / selectedIndex also refresh the button */
  function hookValue(sel) {
    const proto = HTMLSelectElement.prototype;
    ['value', 'selectedIndex'].forEach((prop) => {
      const d = Object.getOwnPropertyDescriptor(proto, prop);
      if (!d || !d.set) return;
      Object.defineProperty(sel, prop, {
        configurable: true,
        get() {
          return d.get.call(this);
        },
        set(v) {
          d.set.call(this, v);
          syncButton(this);
        }
      });
    });
  }

  function labelIdFor(sel) {
    if (!sel.id) return null;
    const lab = doc.querySelector('label[for="' + (global.CSS && CSS.escape ? CSS.escape(sel.id) : sel.id) + '"]');
    if (!lab) return null;
    if (!lab.id) lab.id = 'tsl-' + ++seq;
    return lab.id;
  }

  function enhance(sel) {
    if (!sel || sel.__tsBtn || sel.multiple || sel.size > 1 || sel.hasAttribute('data-native')) return;
    if (!sel.parentNode) return;
    let cs = null;
    try {
      cs = global.getComputedStyle(sel);
    } catch (e) {}
    const wrap = doc.createElement('span');
    wrap.className = 'ts-wrap';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('ts-native');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'ts-button';
    btn.id = 'tsb-' + ++seq;
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    const lid = labelIdFor(sel);
    if (lid) btn.setAttribute('aria-labelledby', lid + ' ' + btn.id);
    else if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));
    btn.innerHTML = '<span class="ts-value"></span><span class="ts-chev" aria-hidden="true"></span>';
    // keep the select's own sizing classes on the wrapper (e.g. full-width pickers)
    ['flex', 'width', 'minWidth', 'maxWidth', 'margin'].forEach((k) => {
      if (sel.style[k]) wrap.style[k] = sel.style[k];
    });
    if (cs) {
      if (!sel.style.flex && cs.flexGrow && cs.flexGrow !== '0') wrap.style.flexGrow = cs.flexGrow;
      if (cs.fontSize) btn.style.fontSize = cs.fontSize;
    }
    wrap.appendChild(btn);
    sel.__tsBtn = btn;
    btn.__tsSel = sel;
    hookValue(sel);
    syncButton(sel);
    btn.addEventListener('click', () => {
      if (doc.activeElement !== btn) btn.focus();
      if (openState && openState.sel === sel) close(true);
      else open(sel);
    });
    btn.addEventListener('keydown', onButtonKey);
    sel.addEventListener('change', () => syncButton(sel));
    sel.addEventListener('focus', () => btn.focus()); // <label for> clicks land on the button
    if (global.MutationObserver) {
      new MutationObserver(() => syncButton(sel)).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'label', 'selected'] });
    }
  }

  function items(sel) {
    const out = [];
    Array.from(sel.children).forEach((ch) => {
      if (ch.tagName === 'OPTGROUP') {
        out.push({ group: ch.label });
        Array.from(ch.children).forEach((o) => o.tagName === 'OPTION' && out.push({ opt: o, disabled: o.disabled || ch.disabled }));
      } else if (ch.tagName === 'OPTION') out.push({ opt: ch, disabled: ch.disabled });
    });
    return out;
  }

  function renderList() {
    const st = openState;
    if (!st) return;
    const list = st.list;
    list.innerHTML = '';
    st.items = items(st.sel);
    let group = null;
    st.items.forEach((it, i) => {
      if (it.group != null) {
        group = doc.createElement('div');
        group.className = 'ts-group';
        group.setAttribute('role', 'group');
        const h = doc.createElement('div');
        h.className = 'ts-group-label';
        h.id = st.list.id + '-g' + i;
        h.textContent = it.group;
        group.setAttribute('aria-labelledby', h.id);
        group.appendChild(h);
        list.appendChild(group);
        return;
      }
      const el = doc.createElement('div');
      el.className = 'ts-option';
      el.id = st.list.id + '-o' + i;
      el.setAttribute('role', 'option');
      el.dataset.i = i;
      el.textContent = optionLabel(it.opt);
      const selected = it.opt.index === st.sel.selectedIndex;
      el.setAttribute('aria-selected', String(selected));
      if (it.disabled) el.setAttribute('aria-disabled', 'true');
      it.el = el;
      (group || list).appendChild(el);
    });
    setActive(st.active != null ? st.active : indexOfSelected());
  }

  function indexOfSelected() {
    const st = openState;
    const i = st.items.findIndex((it) => it.opt && it.opt.index === st.sel.selectedIndex);
    return i >= 0 ? i : firstEnabled(0, 1);
  }
  function firstEnabled(from, dir) {
    const its = openState.items;
    for (let i = from; i >= 0 && i < its.length; i += dir) if (its[i].opt && !its[i].disabled) return i;
    return null;
  }
  function setActive(i) {
    const st = openState;
    if (!st) return;
    st.items.forEach((it) => it.el && it.el.classList.remove('ts-active'));
    st.active = i;
    const it = i != null ? st.items[i] : null;
    if (it && it.el) {
      it.el.classList.add('ts-active');
      st.btn.setAttribute('aria-activedescendant', it.el.id);
      st.list.setAttribute('aria-activedescendant', it.el.id);
      const r = it.el.getBoundingClientRect();
      const lr = st.list.getBoundingClientRect();
      if (r.top < lr.top) st.list.scrollTop -= lr.top - r.top + 4;
      else if (r.bottom > lr.bottom) st.list.scrollTop += r.bottom - lr.bottom + 4;
    } else st.btn.removeAttribute('aria-activedescendant');
  }

  function place() {
    const st = openState;
    if (!st) return;
    const r = st.btn.getBoundingClientRect();
    // the control scrolled away, was hidden or removed: close instead of floating
    if (!st.btn.isConnected || (!r.width && !r.height) || r.bottom < 0 || r.top > global.innerHeight) return close(false);
    const vh = global.innerHeight;
    const vw = global.innerWidth;
    const below = vh - r.bottom - 8;
    const above = r.top - 8;
    const want = Math.min(320, st.list.scrollHeight + 2);
    const up = below < Math.min(want, 180) && above > below;
    const max = Math.max(120, Math.min(320, up ? above : below));
    st.list.style.maxHeight = max + 'px';
    st.list.style.minWidth = Math.round(r.width) + 'px';
    st.list.style.maxWidth = Math.max(r.width, Math.min(460, vw - 16)) + 'px';
    const w = Math.min(st.list.offsetWidth || r.width, vw - 16);
    st.list.style.left = Math.round(Math.max(8, Math.min(r.left, vw - w - 8))) + 'px';
    if (up) {
      st.list.style.top = '';
      st.list.style.bottom = Math.round(vh - r.top + 4) + 'px';
    } else {
      st.list.style.bottom = '';
      st.list.style.top = Math.round(r.bottom + 4) + 'px';
    }
    st.list.classList.toggle('ts-up', up);
  }

  function open(sel) {
    if (sel.disabled) return;
    close(false);
    const btn = sel.__tsBtn;
    const list = doc.createElement('div');
    list.className = 'ts-list';
    list.id = 'tsl-list-' + ++seq;
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;
    const lab = btn.getAttribute('aria-labelledby');
    if (lab) list.setAttribute('aria-labelledby', lab.split(' ')[0]);
    doc.body.appendChild(list);
    openState = { sel, btn, list, items: [], active: null };
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-controls', list.id);
    btn.parentNode.classList.add('ts-open');
    renderList();
    place();
    setActive(openState.active);
    list.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus on the button
    list.addEventListener('click', (e) => {
      const o = e.target.closest('.ts-option');
      if (!o || o.getAttribute('aria-disabled') === 'true') return;
      choose(Number(o.dataset.i));
      close(true);
    });
    list.addEventListener('mousemove', (e) => {
      const o = e.target.closest('.ts-option');
      if (o && o.getAttribute('aria-disabled') !== 'true' && Number(o.dataset.i) !== openState.active) setActive(Number(o.dataset.i));
    });
  }

  function close(refocus) {
    const st = openState;
    if (!st) return;
    openState = null;
    st.list.remove();
    st.btn.setAttribute('aria-expanded', 'false');
    st.btn.removeAttribute('aria-activedescendant');
    st.btn.removeAttribute('aria-controls');
    if (st.btn.parentNode) st.btn.parentNode.classList.remove('ts-open');
    if (refocus && st.btn.isConnected) st.btn.focus();
  }

  function choose(i) {
    const st = openState;
    const it = st && st.items[i];
    if (!it || !it.opt || it.disabled) return;
    if (st.sel.selectedIndex !== it.opt.index) {
      st.sel.selectedIndex = it.opt.index;
      st.sel.dispatchEvent(new Event('input', { bubbles: true }));
      st.sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    syncButton(st.sel);
  }

  let typed = '';
  let typedAt = 0;
  function typeahead(ch) {
    const st = openState;
    const now = Date.now();
    typed = now - typedAt > 700 ? ch : typed + ch;
    typedAt = now;
    const q = typed.toLowerCase();
    const start = st.active != null ? st.active + (typed.length === 1 ? 1 : 0) : 0;
    const n = st.items.length;
    for (let k = 0; k < n; k++) {
      const i = (start + k) % n;
      const it = st.items[i];
      if (it.opt && !it.disabled && optionLabel(it.opt).toLowerCase().indexOf(q) === 0) return setActive(i);
    }
  }

  function onButtonKey(e) {
    const sel = e.currentTarget.__tsSel;
    const isOpen = openState && openState.sel === sel;
    const k = e.key;
    if (!isOpen) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ' || k === 'F4') {
        e.preventDefault();
        open(sel);
      } else if (k.length === 1 && /\S/.test(k) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // closed: letters change the value directly, like a native select
        open(sel);
        typeahead(k);
        if (openState.active != null) choose(openState.active);
        close(false);
        e.preventDefault();
      }
      return;
    }
    const st = openState;
    if (k === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (k === 'ArrowDown') {
      e.preventDefault();
      const n = firstEnabled((st.active == null ? -1 : st.active) + 1, 1);
      if (n != null) setActive(n);
    } else if (k === 'ArrowUp') {
      e.preventDefault();
      if (e.altKey) {
        if (st.active != null) choose(st.active);
        close(true);
        return;
      }
      const n = firstEnabled((st.active == null ? st.items.length : st.active) - 1, -1);
      if (n != null) setActive(n);
    } else if (k === 'Home' || k === 'PageUp') {
      e.preventDefault();
      const n = k === 'Home' ? firstEnabled(0, 1) : firstEnabled(Math.max(0, (st.active || 0) - 8), 1);
      if (n != null) setActive(n);
    } else if (k === 'End' || k === 'PageDown') {
      e.preventDefault();
      const n = k === 'End' ? firstEnabled(st.items.length - 1, -1) : firstEnabled(Math.min(st.items.length - 1, (st.active || 0) + 8), -1);
      if (n != null) setActive(n);
    } else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      if (st.active != null) choose(st.active);
      close(true);
    } else if (k === 'Tab') {
      if (st.active != null) choose(st.active);
      close(false);
    } else if (k.length === 1 && /\S/.test(k) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      typeahead(k);
    }
  }

  function enhanceAll(root) {
    if (coarse()) return;
    const scope = root && root.querySelectorAll ? root : doc;
    if (scope.tagName === 'SELECT') enhance(scope);
    scope.querySelectorAll('select').forEach(enhance);
  }

  function init() {
    enhanceAll(doc);
    doc.addEventListener(
      'mousedown',
      (e) => {
        if (!openState) return;
        if (openState.list.contains(e.target) || openState.btn.contains(e.target)) return;
        close(false);
      },
      true
    );
    global.addEventListener('resize', () => close(false));
    // Esc closes the list wherever focus is (e.g. after a pointer click elsewhere)
    doc.addEventListener('keydown', (e) => {
      if (openState && e.key === 'Escape' && doc.activeElement !== openState.btn) {
        e.preventDefault();
        close(true);
      }
    });
    doc.addEventListener(
      'scroll',
      (e) => {
        if (openState && !openState.list.contains(e.target)) place();
      },
      true
    );
    if (global.MutationObserver) {
      new MutationObserver((muts) => {
        if (coarse()) return;
        muts.forEach((m) =>
          m.addedNodes.forEach((n) => {
            if (n.nodeType !== 1) return;
            if (n.tagName === 'SELECT') enhance(n);
            else if (n.querySelector && n.querySelector('select')) n.querySelectorAll('select').forEach(enhance);
          })
        );
        if (openState) place();
      }).observe(doc.body, { childList: true, subtree: true });
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();

  global.ThemeSelect = { enhance, enhanceAll, close: () => close(false), isOpen: () => !!openState, coarse };
})(window);
