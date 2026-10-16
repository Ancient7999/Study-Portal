/* Symbol and term tooltips for the Markdown study notes.
 * Data: the catalog's study.symbols file, e.g. data/symbols-medphys.json
 *   common   { symbol: def }            shared by every chapter of the subject
 *   chapters { src: { symbols: { symbol: def }, terms: [ { t, d } ] } }
 *   def = { n: name, u: unit } or a list of them with "when" (a regex tested on the
 *   section heading + the line or cell around the symbol) for context-aware meanings.
 * decorate(mdEl, src) wraps symbols in formula blocks and math-like text, and the listed
 * clinical terms in tables and lists, in <span class="sym" tabindex="0">. One shared tooltip
 * opens on hover / focus (desktop) and on tap / click / Enter (pins it); Esc and an outside
 * tap close it. */
(function () {
  'use strict';
  var DATA = Object.create(null);
  var SUBS = '₀₁₂₃₄₅₆₇₈₉ₐₑₒₓₕₖₗₘₙₚₛₜᵢⱼᵣᵤᵥ';
  // a "word": letters, combining macron, subscripts, _name, prime
  var WORD = new RegExp('[A-Za-zα-ωΑ-ΩΔṁℓ][A-Za-zα-ωΑ-ΩΔṁℓ\\u0304' + SUBS + '′]*(?:_[A-Za-z]+)?(?:½)?', 'g');
  var MATH = /[=×÷\/+−∝<>≈→←·√²³⁴⁻¹⁰⟂↑↓()]/;
  var UNIT = '(?:kg|g|mg|m|cm|mm|km|nm|μm|s|ms|h|min|N|Pa|kPa|GPa|J|eV|MeV|W|Hz|kHz|MHz|K|C|V|A|mA|Ω|S|T|Bq|Ci|Gy|Sv|rad|rem|mSv|D|atm|mol|mmHg|torr|poise|°C|°F|°)';
  var UNIT_EXP = UNIT + '[²³⁻¹]*';
  var NUM_UNIT = new RegExp('\\d[\\d.,]*(?:\\s*×\\s*10[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)?\\s?(' + UNIT_EXP + '(?:\\s?[·\\/]\\s?\\(?' + UNIT_EXP + '\\)?)*)(?![A-Za-z])', 'g');
  var COMPOUND = new RegExp('(?:^|[^A-Za-zα-ω])(' + UNIT_EXP + '(?:\\s?[·\\/]\\s?\\(?' + UNIT_EXP + '\\)?)+)(?![A-Za-z' + SUBS + '])', 'g');
  var PAREN_UNIT = new RegExp('\\((' + UNIT_EXP + ')\\)', 'g');
  var UNIT_WORDS = new RegExp('^' + UNIT + '$');
  var STOP = /^(the|of|in|to|at|is|it|as|an|on|or|so|be|by|if|no|up|we|he|me|do|di|and|are|for|not|per|all|its|has|was|any|can|one|two|use|few|net|max|min|sin|cos|tan|log|ln|exp|unit|units|SI|CGS)$/i;
  function load(url) {
    if (!DATA[url]) {
      DATA[url] = fetch(url, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return DATA[url];
  }

  // ctx is a list of texts, nearest first (sentence or formula line, block, section
  // heading). The first text that some 'when' variant matches decides; otherwise the
  // variant without 'when' is the default.
  function pick(def, ctx) {
    if (!def) return null;
    if (!Array.isArray(def)) return def;
    for (var c = 0; c < ctx.length; c++) {
      for (var i = 0; i < def.length; i++) {
        if (!def[i].when) continue;
        try { if (new RegExp(def[i].when).test(ctx[c])) return def[i]; } catch (e) { /* bad regex: skip */ }
      }
    }
    for (var j = 0; j < def.length; j++) if (!def[j].when) return def[j];
    return null;
  }
  function lookup(g, src, tok, ctx) {
    var ch = (g.chapters && g.chapters[src]) || {};
    var own = ch.symbols || {};
    return pick(own[tok], ctx) || pick((g.common || {})[tok], ctx);
  }
  function known(g, src, tok) {
    var ch = (g.chapters && g.chapters[src]) || {};
    return !!((ch.symbols && ch.symbols[tok]) || (g.common && g.common[tok]));
  }
  function label(tok, d) { return tok + ' — ' + d.n + (d.u ? ' (' + d.u + ')' : ''); }

  // ranges of s that are units: "5 m/s", "N/m²", "(Pa)"
  function unitRanges(s) {
    var out = [], m;
    [NUM_UNIT, COMPOUND, PAREN_UNIT].forEach(function (re) {
      re.lastIndex = 0;
      while ((m = re.exec(s))) {
        var start = m.index + m[0].indexOf(m[1]);
        out.push([start, start + m[1].length]);
        if (m[0].length === 0) re.lastIndex++;
      }
    });
    return out;
  }
  function inRanges(r, i) { for (var k = 0; k < r.length; k++) if (i >= r[k][0] && i < r[k][1]) return true; return false; }
  function marked(tok) { return /[α-ωΑ-ΩΔṁℓ\u0304′_]/.test(tok) || new RegExp('[' + SUBS + ']').test(tok); }
  // heading text ("h2 › h3") for each top-level block of the rendered notes
  function sectionMap(root) {
    var map = new Map(), h2 = '', h3 = '';
    Array.prototype.forEach.call(root.children, function (el) {
      if (el.tagName === 'H2' || el.tagName === 'H1') { h2 = el.textContent; h3 = ''; }
      else if (el.tagName === 'H3' || el.tagName === 'H4') h3 = el.textContent;
      map.set(el, h2 + ' › ' + h3);
    });
    return map;
  }
  function sectionOf(node, root, map) {
    var top = node;
    while (top && top.parentNode !== root) top = top.parentNode;
    return (top && map.get(top)) || '';
  }

  function namedNear(name, s, start, end, blockText, whole) {
    var win = (whole ? s : s.slice(Math.max(0, start - 45), start) + ' ' + s.slice(end, end + 45)).toLowerCase();
    var words = name.toLowerCase().match(/[a-z']{4,}/g) || [];
    return words.some(function (w) { return win.indexOf(w.replace(/s$/, '')) >= 0; });
  }
  function sentenceAround(text, i) {
    var a = i, b = i;
    while (a > 0 && !/[.;!?\n]/.test(text.charAt(a - 1)) ) a--;
    while (b < text.length && !/[.;!?\n]/.test(text.charAt(b))) b++;
    return text.slice(a, b);
  }
  function lineAround(text, i) {
    var a = text.lastIndexOf('\n', i - 1) + 1, b = text.indexOf('\n', i);
    return text.slice(a, b < 0 ? text.length : b);
  }

  // split a word into glossary symbols: the whole word if it is one, else (formula
  // juxtaposition such as ρgh, ηAv, λf) a full split into known symbols, longest first
  function segment(g, src, w) {
    if (known(g, src, w)) return [w];
    if (w.length > 6 || STOP.test(w) || UNIT_WORDS.test(w)) return null;
    // English-looking words are never split: "Mach", "time"; formula runs are short (ρgh, ηAv, λf)
    if (/^[A-Z][a-z]{2,}$/.test(w) || /^[a-z]{4,}$/.test(w)) return null;
    var keys = allKeys(g, src), out = [], i = 0;
    while (i < w.length) {
      var hit = null;
      for (var k = 0; k < keys.length; k++) if (w.startsWith(keys[k], i)) { hit = keys[k]; break; }
      if (!hit) return null;
      out.push(hit); i += hit.length;
    }
    return out.length > 1 ? out : null;
  }
  var keyCache = new Map();
  function allKeys(g, src) {
    if (!keyCache.has(src)) {
      var ch = (g.chapters && g.chapters[src]) || {};
      var ks = Object.keys(Object.assign({}, g.common || {}, ch.symbols || {}));
      ks.sort(function (a, b) { return b.length - a.length; });
      keyCache.set(src, ks);
    }
    return keyCache.get(src);
  }

  function wrapSymbols(textNode, g, src, section, inFormula) {
    var s = textNode.nodeValue;
    if (!s || !/[A-Za-zα-ωΑ-ΩΔ]/.test(s)) return 0;
    var block = textNode.parentNode.closest('td,th,li,p,pre,blockquote') || textNode.parentNode;
    var blockText = block.textContent;
    var units = unitRanges(s);
    var hits = [], m;
    WORD.lastIndex = 0;
    while ((m = WORD.exec(s))) {
      var w = m[0], start = m.index, end = start + w.length;
      if (inRanges(units, start)) continue;
      var prev = s.charAt(start - 1), next = s.charAt(end);
      if (prev === '°') continue; // °C, °F are units
      if (UNIT_WORDS.test(w) && /\b(in|unit:?|units:?)\s$/i.test(s.slice(Math.max(0, start - 7), start))) continue; // "f in m"
      if (/[0-9]/.test(prev) && !inFormula && !marked(w)) continue;
      // the article "A" at the start of a sentence: "A fluid slug of …"
      if (w === 'A' && /^\s+[a-z]/.test(s.slice(end, end + 3)) && /(^|[.:;!?]\s+)$/.test(s.slice(Math.max(0, start - 3), start)) && !(start === 0 && textNode.previousSibling)) continue;
      var parts = segment(g, src, w);
      if (!parts) continue;
      var near = MATH.test(s.slice(Math.max(0, start - 2), start)) || MATH.test(s.slice(end, end + 2));
      if (!inFormula) {
        if (prev === '-' || next === '-' || /['’]/.test(prev + next)) continue;
        if (prev === '.' || (next === '.' && /[A-Za-z]/.test(s.charAt(end + 1)))) continue; // e.g., i.e.
        if (prev === '(' && next === ')' && /^[A-Za-z]$/.test(w)) continue; // list labels such as (c)
        var single = parts.length === 1;
        if (!single && !near && !marked(w)) continue; // ρgh, f₁f₂ read as formulas even in prose
        if (single && !marked(w) && !near) {
          // a plain Latin symbol in prose counts only when its meaning is named next to it,
          // as in "pressure P" or "R is the resistance"
          if (/^[aI]$/.test(w)) continue;
          // a symbol set apart in bold or italics (**Q**) is judged by its whole short paragraph
          var alone = s.trim() === w && blockText.length <= 320;
          var d0 = lookup(g, src, w, alone ? [blockText, section] : [sentenceAround(s, start), blockText, section]);
          if (!d0 || !(alone ? namedNear(d0.n, blockText, 0, 0, blockText, true) : namedNear(d0.n, s, start, end, blockText))) continue;
        }
      }
      var ctx = inFormula ? [lineAround(s, start), section] : (s.trim() === w ? [blockText, section] : [sentenceAround(s, start), blockText, section]);
      var pos = start;
      for (var i = 0; i < parts.length; i++) {
        var d = lookup(g, src, parts[i], ctx);
        if (d) hits.push({ start: pos, tok: parts[i], d: d });
        pos += parts[i].length;
      }
    }
    if (!hits.length) return 0;
    var frag = document.createDocumentFragment(), last = 0;
    hits.forEach(function (h) {
      frag.appendChild(document.createTextNode(s.slice(last, h.start)));
      frag.appendChild(makeTip(h.tok, label(h.tok, h.d), 'sym', label(h.tok, h.d)));
      last = h.start + h.tok.length;
    });
    frag.appendChild(document.createTextNode(s.slice(last)));
    textNode.parentNode.replaceChild(frag, textNode);
    return hits.length;
  }

  // clinical example terms: only in the clinical / medical sections (tables, lists, short paragraphs)
  var CLINICAL = /clinical|medical/i;
  function makeTip(text, tip, cls, label) {
    var span = document.createElement('span');
    span.className = cls;
    span.tabIndex = 0;
    span.setAttribute('role', 'button');
    span.dataset.tip = tip;
    span.setAttribute('aria-label', label);
    span.textContent = text;
    return span;
  }
  function wrapTerms(root, terms, map) {
    if (!terms || !terms.length) return 0;
    var count = 0;
    var sorted = terms.slice().sort(function (a, b) { return b.t.length - a.t.length; });
    root.querySelectorAll('td, li, p').forEach(function (cell) {
      if (cell.closest('svg')) return;
      if (!CLINICAL.test(sectionOf(cell, root, map))) return;
      var walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT, null);
      var queue = [], n;
      while ((n = walker.nextNode())) if (!n.parentNode.closest('.sym,svg,a')) queue.push(n);
      while (queue.length) {
        var tn = queue.shift(), s = tn.nodeValue, low = s.toLowerCase(), best = null;
        for (var i = 0; i < sorted.length; i++) {
          // "case": true matches the exact spelling only (Blood pressure in a table, not every blood pressure)
          var t = sorted[i].t, hay = sorted[i].case ? s : low, needle = sorted[i].case ? t : t.toLowerCase();
          var k = hay.indexOf(needle);
          while (k >= 0) {
            var okL = k === 0 || !/[A-Za-z]/.test(s[k - 1]), okR = k + t.length >= s.length || !/[A-Za-z]/.test(s[k + t.length]);
            if (okL && okR) break;
            k = hay.indexOf(needle, k + 1);
          }
          if (k >= 0 && (!best || k < best.k)) best = { k: k, term: sorted[i] };
        }
        if (!best) continue;
        var text = s.substr(best.k, best.term.t.length);
        var span = makeTip(text, best.term.d, 'sym term', text + ': ' + best.term.d);
        span.dataset.term = best.term.t;
        var rest = document.createTextNode(s.slice(best.k + text.length));
        var frag = document.createDocumentFragment();
        frag.appendChild(document.createTextNode(s.slice(0, best.k)));
        frag.appendChild(span);
        frag.appendChild(rest);
        tn.parentNode.replaceChild(frag, tn);
        queue.unshift(rest);
        count++;
      }
    });
    return count;
  }

  /* —— whole-formula tooltips (no per-letter tooltips) ——
     A formula is a formula-card row or an inline formula in the text such as "Q = Av".
     Its tooltip names what the formula describes and what each symbol stands for. */
  function symbolsIn(g, src, f, ctx) {
    var seen = Object.create(null), out = [], m, units = unitRanges(f).filter(function (r) { return !/\d/.test(f.charAt(r[0] - 1)); });
    WORD.lastIndex = 0;
    while ((m = WORD.exec(f))) {
      if (inRanges(units, m.index)) continue;
      if (/\d\s$/.test(f.slice(0, m.index)) && UNIT_WORDS.test(m[0])) continue;
      var parts = segment(g, src, m[0]); if (!parts) continue;
      parts.forEach(function (t) { if (seen[t]) return; var d = lookup(g, src, t, ctx); if (!d) return; seen[t] = 1; out.push(label(t, d)); });
    }
    return out;
  }
  function cleanHeading(h) { return String(h || '').replace(/^\s*\d+(\.\d+)*[.)]?\s*/, '').trim(); }
  function formulaTip(g, src, f, meaning, section, line) {
    var parts = section.split(' › ');
    var mean = meaning || cleanHeading(parts[1]) || cleanHeading(parts[0]);
    var syms = symbolsIn(g, src, f, [line || f, section]);
    return f + (mean ? '\n' + mean : '') + (syms.length ? '\n\n' + syms.join('\n') : '');
  }
  // inline formulas: a run of math tokens with "=" or "∝" and at least two symbols on it
  var MTOK = new RegExp('^[A-Za-zα-ωΑ-ΩΔṁℓπ\\u0304' + SUBS + '′_½0-9.,+−\\-×÷/·=∝≈<>()²³⁴⁻¹⁰√|]+$');
  function inlineFormulas(g, src, s) {
    var toks = [], re = /\S+/g, m, out = [];
    while ((m = re.exec(s))) toks.push({ t: m[0], a: m.index, b: m.index + m[0].length });
    var isMath = function (t) {
      var core = t.replace(/^[(\[]+/, '').replace(/[.,;:!?)\]]+$/, '');
      if (!core) return false;
      if (/^[=∝≈<>×÷·+−\-/→]+$/.test(core) || core === 'constant') return true;
      if (!MTOK.test(core)) return false;
      var words = core.match(new RegExp('[A-Za-zα-ωΑ-ΩΔṁℓ][A-Za-zα-ωΑ-ΩΔṁℓ\\u0304' + SUBS + '′]*', 'g')) || [];
      return words.every(function (w) { return known(g, src, w) || segment(g, src, w) || UNIT_WORDS.test(w); });
    };
    var k = 0;
    while (k < toks.length) {
      if (!isMath(toks[k].t)) { k++; continue; }
      var e = k; while (e + 1 < toks.length && isMath(toks[e + 1].t) && !/[.,;:!?]$/.test(toks[e].t)) e++;
      var a = toks[k].a, b = toks[e].b, txt = s.slice(a, b);
      var lead = txt.match(/^[(\[]+/); if (lead && !/\)/.test(txt)) { a += lead[0].length; txt = txt.slice(lead[0].length); }
      var trail = txt.match(/[.,;:!?\]]+$/); if (trail) { b -= trail[0].length; txt = txt.slice(0, -trail[0].length); }
      if (/\)$/.test(txt) && (txt.match(/\(/g) || []).length < (txt.match(/\)/g) || []).length) { b--; txt = txt.slice(0, -1); }
      var sides = txt.split(/\s*[=∝]\s*/);
      var symCount = symbolsIn(g, src, txt, [txt]).length;
      if (/[=∝]/.test(txt) && sides.length >= 2 && sides.every(function (x) { return x.trim(); }) && symCount >= 2 && /[A-Za-zα-ωΑ-ΩΔ]/.test(sides[sides.length - 1]))
        out.push({ a: a, b: b, f: txt });
      k = e + 1;
    }
    return out;
  }
  function decorateWith(g, mdEl, src) {
    if (!g || !mdEl) return 0;
    var ch = (g.chapters && g.chapters[src]) || {};
    var map = sectionMap(mdEl);
    var total = wrapTerms(mdEl, ch.terms, map);
    mdEl.querySelectorAll('.fx-formula').forEach(function (el) {
      var row = el.closest('.fx-row'), f = el.dataset.fx || el.textContent;
      var title = row && row.querySelector('.fx-title'), note = row && row.querySelector('.fx-note');
      var meaning = (title ? title.textContent.replace(/^\(\d+\)\s*/, '') : '') || (note ? note.textContent : '');
      var t = formulaTip(g, src, f, meaning, sectionOf(el, mdEl, map), f);
      el.classList.add('sym'); el.tabIndex = 0; el.setAttribute('role', 'button'); el.dataset.tip = t; el.setAttribute('aria-label', t.replace(/\n+/g, '. '));
      total++;
    });
    var walker = document.createTreeWalker(mdEl, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || p.closest('svg,h1,h2,h3,h4,.sym,a,button,.fx-box,.fx-example,pre')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var list = [], n;
    while ((n = walker.nextNode())) list.push(n);
    list.forEach(function (tn) {
      var s = tn.nodeValue; if (!s || !/[=∝]/.test(s)) return;
      var hits = inlineFormulas(g, src, s); if (!hits.length) return;
      var sec = sectionOf(tn, mdEl, map), frag = document.createDocumentFragment(), last = 0;
      hits.forEach(function (h) {
        frag.appendChild(document.createTextNode(s.slice(last, h.a)));
        var t = formulaTip(g, src, h.f, '', sec, sentenceAround(s, h.a));
        var sp = makeTip(h.f, t, 'sym fx-inline', t.replace(/\n+/g, '. '));
        frag.appendChild(sp); last = h.b; total++;
      });
      frag.appendChild(document.createTextNode(s.slice(last)));
      tn.parentNode.replaceChild(frag, tn);
    });
    mdEl.dataset.symbols = String(total);
    return total;
  }

  /* —— the shared tooltip —— */
  var tip = null, current = null, pinned = false;
  function ensureTip() {
    if (tip && document.contains(tip)) return tip;
    tip = document.createElement('div');
    tip.id = 'symTip';
    tip.className = 'sym-tip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    (document.getElementById('studyView') || document.body).appendChild(tip);
    return tip;
  }
  function place(el) {
    var t = ensureTip();
    var r = el.getBoundingClientRect();
    var vw = document.documentElement.clientWidth, vh = window.innerHeight, pad = 8;
    t.style.maxWidth = Math.min(320, vw - 2 * pad) + 'px';
    t.style.left = '0px'; t.style.top = '0px';
    var w = t.offsetWidth, h = t.offsetHeight;
    var left = Math.max(pad, Math.min(r.left + r.width / 2 - w / 2, vw - w - pad));
    var top = r.bottom + 8;
    var above = false;
    if (top + h > vh - pad && r.top - 8 - h >= pad) { top = r.top - 8 - h; above = true; }
    top = Math.max(pad, Math.min(top, vh - h - pad));
    t.style.left = Math.round(left) + 'px';
    t.style.top = Math.round(top) + 'px';
    t.classList.toggle('above', above);
  }
  function show(el, pin) {
    var t = ensureTip();
    if (current && current !== el) current.removeAttribute('aria-describedby');
    current = el; pinned = !!pin;
    t.textContent = '';
    if (el.classList.contains('fx-formula') || el.classList.contains('fx-inline')) {
      var lines = String(el.dataset.tip).split('\n');
      var f = document.createElement('div'); f.className = 'tip-f'; f.textContent = lines[0]; t.appendChild(f);
      var k = 1;
      if (lines[1]) { var mm = document.createElement('div'); mm.className = 'tip-m'; mm.textContent = lines[1]; t.appendChild(mm); k = 2; }
      var rest = lines.slice(k).filter(Boolean);
      if (rest.length) { var ul = document.createElement('ul'); ul.className = 'tip-syms'; rest.forEach(function (r) { var li = document.createElement('li'); li.textContent = r; ul.appendChild(li); }); t.appendChild(ul); }
    } else t.textContent = el.dataset.tip;
    t.hidden = false;
    el.setAttribute('aria-describedby', 'symTip');
    el.classList.add('sym-on');
    document.querySelectorAll('.sym.sym-on').forEach(function (x) { if (x !== el) x.classList.remove('sym-on'); });
    place(el);
  }
  function hide() {
    if (tip) tip.hidden = true;
    if (current) { current.removeAttribute('aria-describedby'); current.classList.remove('sym-on'); }
    current = null; pinned = false;
  }
  function symFrom(e) { return e.target && e.target.closest ? e.target.closest('.sym') : null; }

  document.addEventListener('mouseover', function (e) {
    var el = symFrom(e);
    if (el && !pinned && !(e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents)) show(el, false);
  });
  document.addEventListener('mouseout', function (e) {
    var el = symFrom(e);
    if (el && el === current && !pinned && !(e.relatedTarget && el.contains(e.relatedTarget))) hide();
  });
  document.addEventListener('click', function (e) {
    var el = symFrom(e);
    if (el) {
      e.preventDefault();
      if (current === el && pinned) hide(); else show(el, true);
      return;
    }
    if (current && !(tip && tip.contains(e.target))) hide();
  });
  document.addEventListener('focusin', function (e) { var el = symFrom(e); if (el) show(el, false); });
  document.addEventListener('focusout', function (e) { var el = symFrom(e); if (el && el === current && !pinned) hide(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current) { e.preventDefault(); e.stopImmediatePropagation(); var el = current; hide(); if (el.focus) el.focus({ preventScroll: true }); return; }
    var el = symFrom(e);
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (current === el && pinned) hide(); else show(el, true); }
  }, true);
  window.addEventListener('scroll', function () { if (current) place(current); }, true);
  window.addEventListener('resize', function () { if (current) place(current); });

  window.StudySymbols = {
    decorate: function (mdEl, url, src) {
      return load(url).then(function (g) { return decorateWith(g, mdEl, src); });
    },
    hide: hide
  };
})();
