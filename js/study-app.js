/* Study chapter loader + lightweight markdown renderer
 * Copied from medphysics-pt1 js/study-app.js (commit 75cf785).
 * Lines up to renderMarkdown() are PT1's code unchanged.
 * ADAPT (portal): the chapter list comes from the catalog material's "study"
 * entry and renders into #studyView inside the portal page (so mood themes
 * apply); Esc / Backspace return to where the notes were opened from. */
(function () {
  'use strict';

  /** SVG presentation attrs reject height="auto"; allow CSS instead. */
  function sanitizeSvgAttrs(html) {
    return String(html).replace(
      /<svg\b([^>]*)>/gi,
      function (_, attrs) {
        attrs = attrs.replace(/\sheight\s*=\s*(["'])auto\1/i, '');
        if (!/\sstyle\s*=/i.test(attrs)) {
          attrs += ' style="height:auto;display:block"';
        }
        return '<svg' + attrs + '>';
      }
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderMarkdown(md) {
    const lines = md.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;
    let inCode = false;
    let codeBuf = [];
    let codeLang = '';
    /* formula boxes → formula cards. Each formula line is a row: small title ("Label:"), the
       formula large in math type (a spaced " / " becomes a stacked fraction), an arrow note, and
       legend lines ("σ = wall stress,  t = wall thickness") as chips under it.
       ```example blocks are worked examples shown under a formula card. */
    const FX_WORD = /^[a-z][a-z'’-]*/;
    const fxSplitTop = (str, sep) => { const out = []; let depth = 0, last = 0; for (let k = 0; k < str.length; k++) { const c = str[k]; if (c === '(') depth++; else if (c === ')') depth--; else if (depth === 0 && str.startsWith(sep, k)) { out.push(str.slice(last, k)); last = k + sep.length; k += sep.length - 1; } } out.push(str.slice(last)); return out; };
    const fxUnparen = t => { t = t.trim(); if (/^\(.*\)$/.test(t) && fxSplitTop(t.slice(1, -1), ')').length === 1 && !/[()]/.test(t.slice(1, -1).replace(/\([^()]*\)/g, ''))) return t.slice(1, -1).trim(); return t; };
    const FX_UP = /^(Re|Pa|Hz|kg|cm|mm|km|nm|ms|eV|mA|Gy|Sv|Bq|Ci|dB|SI|or|of|in|to|at|is|by|so|if|N|J|W|K|V|Pa)$/;
    const fxVars = t => { let out = '', last = 0; const re = /(^|[^A-Za-z])([A-Za-z]{1,2})(?![A-Za-z])/g; let m;
      while ((m = re.exec(t))) { const v = m[2], at = m.index + m[1].length; const unitAfterNum = /\d\s?$/.test(t.slice(0, at)); if (FX_UP.test(v) || /^[A-Z][a-z]$/.test(v) || unitAfterNum) continue; out += escapeHtml(t.slice(last, at)) + '<i>' + escapeHtml(v) + '</i>'; last = at + v.length; }
      return out + escapeHtml(t.slice(last)); };
    const fxMath = t => fxSplitTop(t, ' = ').map(part => {
      const halves = fxSplitTop(part, ' / ');
      if (halves.length === 2 && halves[0].trim() && halves[1].trim() && !/^[\d.,\s×⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+[A-Za-zΩμ]/.test(halves[1].trim()) && !/^\s*\d[\d.,\s]*[a-zA-Z]+$/.test(part.trim()))
        return '<span class="fx-frac"><span class="fx-num">' + fxVars(fxUnparen(halves[0])) + '</span><span class="fx-den">' + fxVars(fxUnparen(halves[1])) + '</span></span>';
      return fxVars(part.trim());
    }).join(' <span class="fx-op">=</span> ');
    const fxIsLegend = l => { const items = l.split(/,\s+(?=\S{1,6}\s*=\s)/); return items.length >= 1 && /=/.test(l) && items.every(it => { const m = it.match(/^\s*([^\s=]{1,6})\s*=\s*(.+)$/); return m && FX_WORD.test(m[2].trim()) && m[2].trim().split(/\s+/)[0].length >= 3; }); };
    const fxLegendHTML = l => '<span class="fx-legend">' + l.split(/,\s+(?=\S{1,6}\s*=\s)/).map(it => { const m = it.match(/^\s*([^\s=]{1,6})\s*=\s*(.+)$/); return '<span class="fx-chip"><span class="fx-chip-sym">' + fxVars(m[1]) + '</span> ' + escapeHtml(m[2].trim()) + '</span>'; }).join('') + '</span>';
    const fxBlock = (lines, lang) => {
      const ex = lang === 'example';
      if (ex) return '<div class="fx-example"><span class="fx-example-head">Example</span>' + lines.filter(l => l.trim()).map(l => '<span class="fx-ex-line">' + escapeHtml(l.trim()) + '</span>').join('') + '</div>';
      const rows = []; let cur = null;
      lines.forEach(raw => {
        const l = raw.replace(/\s+$/, ''); if (!l.trim()) { cur = null; return; }
        if (cur && fxIsLegend(l.trim())) { cur.legend.push(l.trim()); return; }
        let body = l.trim(), title = '', note = '';
        const k = body.indexOf('←'); if (k > 0) { note = body.slice(k + 1).trim(); body = body.slice(0, k).trim(); }
        const t = body.match(/^((?:\(\d+\)\s*)?[A-Za-z][^:=]{1,44}):\s+(.+)$/); if (t && !/[=∝]/.test(t[1])) { title = t[1].trim(); body = t[2].trim(); }
        const isFormula = /[=∝]/.test(body);
        cur = { title, body, note, legend: [], isFormula }; rows.push(cur);
      });
      return '<div class="fx-box">' + rows.map(r => '<div class="fx-row' + (r.isFormula ? '' : ' fx-text') + '">' +
        (r.title ? '<span class="fx-title">' + escapeHtml(r.title) + '</span>' : '') +
        (r.isFormula ? '<span class="fx-formula" data-fx="' + escapeHtml(r.body) + '">' + fxMath(r.body) + '</span>' : '<span class="fx-plain">' + escapeHtml(r.body) + '</span>') +
        (r.note ? '<span class="fx-note">' + escapeHtml(r.note) + '</span>' : '') +
        r.legend.map(fxLegendHTML).join('') + '</div>').join('') + '</div>';
    };
    let listType = null;
    let inHtmlBlock = false;
    let htmlBuf = [];

    function closeList() {
      if (listType) {
        out.push(listType === 'ol' ? '</ol>' : '</ul>');
        listType = null;
      }
    }

    function inline(t) {
      t = escapeHtml(t);
      t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
      t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      return t;
    }

    while (i < lines.length) {
      const line = lines[i];

      // Pass through HTML blocks (phase diagram etc.)
      if (!inCode && !inHtmlBlock && /^\s*<div[\s>]/.test(line)) {
        closeList();
        inHtmlBlock = true;
        htmlBuf = [line];
        if (/<\/div>\s*$/.test(line)) {
          out.push(sanitizeSvgAttrs(htmlBuf.join('\n')));
          htmlBuf = [];
          inHtmlBlock = false;
        }
        i++;
        continue;
      }
      if (inHtmlBlock) {
        htmlBuf.push(line);
        if (/<\/div>\s*$/.test(line)) {
          // only close when nesting depth returns — simple: count opens/closes in buf
          const joined = htmlBuf.join('\n');
          const opens = (joined.match(/<div\b/gi) || []).length;
          const closes = (joined.match(/<\/div>/gi) || []).length;
          if (closes >= opens) {
            out.push(sanitizeSvgAttrs(joined));
            htmlBuf = [];
            inHtmlBlock = false;
          }
        }
        i++;
        continue;
      }

      if (line.startsWith('```')) {
        if (inCode) {
          out.push(fxBlock(codeBuf, codeLang));
          codeBuf = [];
          inCode = false;
        } else {
          closeList();
          codeLang = line.slice(3).trim().toLowerCase();
          inCode = true;
        }
        i++;
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        i++;
        continue;
      }

      if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*[-:| ]+\|/.test(lines[i + 1])) {
        closeList();
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          const cells = lines[i]
            .trim()
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map(function (c) { return c.trim(); });
          rows.push(cells);
          i++;
          if (i < lines.length && /^\s*\|?\s*[-:| ]+\|/.test(lines[i]) && rows.length === 1) {
            i++;
          } else if (rows.length > 1 && i < lines.length && /^\s*\|?\s*[-:| ]+\|/.test(lines[i])) {
            i++;
          } else if (!/^\s*\|/.test(lines[i] || '')) {
            break;
          }
        }
        if (rows.length) {
          let html =
            '<table><thead><tr>' +
            rows[0].map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') +
            '</tr></thead><tbody>';
          for (let r = 1; r < rows.length; r++) {
            html +=
              '<tr>' +
              rows[r].map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') +
              '</tr>';
          }
          html += '</tbody></table>';
          out.push(html);
        }
        continue;
      }

      if (/^---+\s*$/.test(line)) {
        closeList();
        out.push('<hr>');
        i++;
        continue;
      }

      if (/^>\s?/.test(line)) {
        closeList();
        const quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        out.push('<blockquote><p>' + inline(quote.join(' ')) + '</p></blockquote>');
        continue;
      }

      const hm = /^(#{1,4})\s+(.*)$/.exec(line);
      if (hm) {
        closeList();
        const level = hm[1].length;
        out.push('<h' + level + '>' + inline(hm[2]) + '</h' + level + '>');
        i++;
        continue;
      }

      const ul = /^\s*[-*]\s+(.*)$/.exec(line);
      if (ul) {
        if (listType !== 'ul') {
          closeList();
          out.push('<ul>');
          listType = 'ul';
        }
        out.push('<li>' + inline(ul[1]) + '</li>');
        i++;
        continue;
      }
      const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
      if (ol) {
        if (listType !== 'ol') {
          closeList();
          out.push('<ol>');
          listType = 'ol';
        }
        out.push('<li>' + inline(ol[1]) + '</li>');
        i++;
        continue;
      }

      if (!line.trim()) {
        closeList();
        i++;
        continue;
      }

      closeList();
      out.push('<p>' + inline(line) + '</p>');
      i++;
    }
    closeList();
    if (inCode) out.push(fxBlock(codeBuf, codeLang));
    if (inHtmlBlock && htmlBuf.length) out.push(sanitizeSvgAttrs(htmlBuf.join('\n')));
    return out.join('\n');
  }

  /* PT1 CHAPTERS list → now per material (catalog "study.chapters"):
     [{ id, src, title, meta }] — src is relative to the portal root. */
  let CHAPTERS = [];
  let SYMBOLS = null;

  const cache = Object.create(null);
  const listEl = document.getElementById('chapterList');

  async function loadMd(src) {
    if (!cache[src]) {
      const res = await fetch(src, { cache: 'no-store' });
      if (!res.ok) throw new Error(src + ' → ' + res.status);
      cache[src] = await res.text();
    }
    return cache[src];
  }

  function buildCards() {
    listEl.innerHTML = '';
    CHAPTERS.forEach(function (ch) {
      const card = document.createElement('article');
      card.className = 'chapter-card';
      card.dataset.id = ch.id;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chapter-toggle';
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML =
        '<span class="chev" aria-hidden="true">›</span>' +
        '<span class="title">' +
        escapeHtml(ch.title) +
        '</span>' +
        '<span class="meta">' +
        escapeHtml(ch.meta || '') +
        '</span>';

      const body = document.createElement('div');
      body.className = 'chapter-body';
      body.innerHTML = '<article class="md"><p style="color:var(--col-text-muted)">Closed — click to load.</p></article>';

      btn.addEventListener('click', async function () {
        const open = card.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (!open) return;
        if (body.dataset.loaded === '1') return;
        body.querySelector('.md').innerHTML = '<p style="color:var(--col-text-muted)">Loading…</p>';
        try {
          const md = await loadMd(ch.src);
          body.querySelector('.md').innerHTML = sanitizeSvgAttrs(renderMarkdown(md));
          // symbol / clinical-term tooltips (catalog study.symbols → data/symbols-*.json)
          if (SYMBOLS && window.StudySymbols) {
            try { await window.StudySymbols.decorate(body.querySelector('.md'), SYMBOLS, ch.src); } catch (e) { /* notes still readable */ }
          }
          body.dataset.loaded = '1';
        } catch (err) {
          body.querySelector('.md').innerHTML =
            '<p><strong>Could not load chapter.</strong> Serve over http(s).</p><pre><code>' +
            escapeHtml(String(err)) +
            '</code></pre>';
        }
      });

      card.appendChild(btn);
      card.appendChild(body);
      listEl.appendChild(card);
    });
  }

  /* —— portal glue —— */
  let backTo = 'portalView';
  let quizOpener = null;
  function isActive() {
    const v = document.getElementById('studyView');
    return !!(v && v.classList.contains('active'));
  }
  function goBack() {
    if (typeof showView === 'function') showView(backTo);
  }
  /** open(material, { from: viewId, openQuiz: fn }) */
  function open(material, opts) {
    opts = opts || {};
    const study = (material && material.study) || {};
    CHAPTERS = (study.chapters || []).slice();
    SYMBOLS = study.symbols || null;
    if (window.StudySymbols) window.StudySymbols.hide();
    backTo = opts.from || 'portalView';
    quizOpener = typeof opts.openQuiz === 'function' ? opts.openQuiz : null;
    const h = document.getElementById('studyTitle');
    if (h) h.textContent = study.title || 'Study Interface';
    const sub = document.getElementById('studySub');
    if (sub) {
      sub.textContent = [material && material.subjectName, material && material.title].filter(Boolean).join(' · ');
      // PT2 is draft-marked: the same Draft badge as on its portal card
      if (material && material.draft) sub.insertAdjacentHTML('beforeend', '<span class="draft-badge study-draft" title="Unfinished · still being written">Draft</span>');
    }
    const summary = document.getElementById('studySummary');
    if (summary) { summary.hidden = true; summary.innerHTML = ''; }
    const back = document.getElementById('studyBackBtn');
    if (back) back.textContent = backTo === 'setsView' ? '← Practice sets' : '← Study Portal';
    const q = document.getElementById('studyQuizBtn');
    if (q) q.hidden = !quizOpener;
    // picture study (catalog "study.images"): same chapter cards, pictures instead of Markdown
    if (study.images && window.StudyImages) {
      StudyImages.build(listEl, material, { focus: opts.focus }).catch(function (err) {
        listEl.innerHTML = '<p><strong>Could not load the pictures.</strong> Serve over http(s).</p><pre><code>' + escapeHtml(String(err)) + '</code></pre>';
      });
    } else buildCards();
    document.title = (study.title || 'Study') + ' · ' + ((material && material.title) || 'Study Portal');
    if (typeof showView === 'function') showView('studyView');
  }

  document.getElementById('studyBackBtn').addEventListener('click', goBack);
  document.getElementById('studyQuizBtn').addEventListener('click', function () { if (quizOpener) quizOpener(); });

  document.addEventListener('keydown', function (event) {
    if (!isActive()) return;
    const t = event.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (document.querySelector('.modal-overlay.show, .settings-modal.show')) return;
    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault();
      goBack();
    }
  });

  window.StudyNotes = { open: open, renderMarkdown: renderMarkdown, chapters: function () { return CHAPTERS.slice(); } };
})();
