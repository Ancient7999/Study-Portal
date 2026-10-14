/* PICTURE STUDY (Medical Terminology PT2): the PT1 study screen, with pictures.
 * Each lecture is a chapter (the same foldable chapter cards as the Medical Physics notes),
 * each picture is a section: title, picture, teaching caption, credit line.
 * Three modes per picture (switch in the section header):
 *   🧩 Word bank — drag a chip onto its slot, or tap a chip then tap the slot (the default);
 *   ⌨ Type      — a typing slot at every hotspot, graded with the quiz engine's labeling logic
 *                  (labelMatches / labelEchoHTML / saqHint: strict capitals and spelling, `accept`
 *                  alternatives, live highlighter, lowercase hints) — the default for bone pictures;
 *   👁 Labels    — the labeled picture.
 * A right slot locks for good and celebrates. Progress is kept per picture AND per mode, so ↺ restart
 * (bottom right of the picture) only clears the mode you are in, and only shows when that mode has
 * progress. A label counts as solved for the chapter totals once it is solved in either mode.
 * XP: +2 per correct word-bank placement, once per slot per picture per profile, ever (a separate
 * ledger that restart never clears), so dragging the same picture again does not farm XP.
 * Hover (or tap) a term, its slot or its leader line → the whole structure lights up (SVG polygons
 * in the picture data, `labels[].region`). Bone pictures are one paged "Bone Anatomy" card. */
(function () {
  'use strict';
  const STORE = 'sp_study_images_v1';
  const XP_STORE = 'sp_study_images_xp_v1';
  const XP_PER_DROP = 2;
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = s => (typeof saqNorm === 'function') ? saqNorm(s) : String(s == null ? '' : s).trim().replace(/\s+/g, ' ');
  const cands = l => [l.answer].concat(Array.isArray(l.accept) ? l.accept : []).filter(x => x != null && String(x).trim() !== '');
  const matches = (l, t) => (typeof labelMatches === 'function') ? labelMatches(l, t) : (!!norm(t) && cands(l).some(c => norm(c) === norm(t)));
  const echoHTML = (l, t) => (typeof labelEchoHTML === 'function') ? labelEchoHTML(l, t) : esc(t);
  const hint = (l, t) => (typeof saqHint === 'function') ? saqHint({ answer: l.answer, accept: l.accept }, t) : 'not that one · try again';
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const isBasic = () => document.documentElement.getAttribute('data-quality') === 'basic';
  // Basic Quality plays animated SVG diagrams at one-third speed (their -slow.svg twin)
  const animSrc = (img, src) => (img.animated && isBasic() && /\.svg$/.test(src || '')) ? src.replace(/\.svg$/, '-slow.svg') : src;
  const MODES = {
    bank: { icon: '🧩', text: 'Word bank', tip: 'Drag the words onto the picture (or tap a word, then its box)' },
    type: { icon: '⌨', text: 'Type', tip: 'Type each label' },
    show: { icon: '👁', text: 'Labels', tip: 'Show the labeled picture' }
  };
  const EXTRA_BADGE = { text: 'Extra (Not In Lecture)', tip: 'Extra practice. The lecture slides do not cover this picture, so it does not count in the chapter progress.', tone: 'grey', cls: 'simg-extra' };

  let DATA = null, MAT = null, dataSrc = '';
  const modeOf = Object.create(null);   // picture key → mode (this visit only)
  const pageOf = Object.create(null);   // chapter → bone page index (this visit only)

  /* —— storage —— */
  function loadJSON(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function setKey() { return (MAT && (MAT.studyKey || ('medterm/' + MAT.id))) || 'study'; }
  function recOf(key) { const s = loadJSON(STORE)[setKey()] || {}; return s[key] || {}; }
  // older saves kept one {slots} per picture (typed only) → that is the Type mode's progress
  function modeSlots(key, mode) {
    const r = recOf(key);
    if (r.m && r.m[mode]) return Object.assign({}, r.m[mode].slots || {});
    if (!r.m && mode === 'type' && r.slots) return Object.assign({}, r.slots);
    return {};
  }
  function writeModeSlots(key, mode, slots) {
    const all = loadJSON(STORE); const s = all[setKey()] = all[setKey()] || {};
    let r = s[key] || {};
    if (!r.m) r = { m: r.slots ? { type: { slots: r.slots } } : {} };
    if (slots && Object.keys(slots).length) r.m[mode] = { slots: slots }; else delete r.m[mode];
    r.at = Date.now();
    if (Object.keys(r.m).length) s[key] = r; else delete s[key];
    saveJSON(STORE, all);
  }
  const isSingle = img => img.kind === 'single-structure' || !(img.labels && img.labels.length);
  const labelsOf = img => isSingle(img) ? [{ id: 'name', answer: img.answer, accept: img.accept || [] }] : img.labels;
  const keyOf = (ch, img) => ch.lecture + '/' + img.id;
  const modesOf = img => (Array.isArray(img.modes) && img.modes.length) ? img.modes : (isSingle(img) ? ['type', 'bank', 'show'] : ['bank', 'type', 'show']);
  function currentMode(key, img) { const m = modeOf[key]; return modesOf(img).includes(m) ? m : modesOf(img)[0]; }
  function solvedIn(key, img, mode) { const s = modeSlots(key, mode); return labelsOf(img).filter(l => s[l.id] != null && matches(l, s[l.id])).map(l => l.id); }
  function solvedIds(key, img) { return new Set(solvedIn(key, img, 'bank').concat(solvedIn(key, img, 'type'))); }
  function solvedCount(key, img) { return solvedIds(key, img).size; }

  /* —— XP (anti-farm ledger) —— */
  function xpUser() { try { const u = window.StudyProfiles && StudyProfiles.getUser && StudyProfiles.getUser(); return (u && u.uid) || 'local'; } catch (e) { return 'local'; } }
  function awardDropXP(key, labelId) {
    const all = loadJSON(XP_STORE), u = xpUser();
    const byPic = ((all[u] = all[u] || {})[setKey()] = (all[u][setKey()] || {}));
    const got = byPic[key] = byPic[key] || [];
    if (got.includes(labelId)) return 0;
    got.push(labelId); saveJSON(XP_STORE, all);
    try { if (window.StudyProfiles && typeof StudyProfiles.bumpQuestionsAnswered === 'function') { const p = StudyProfiles.bumpQuestionsAnswered(XP_PER_DROP); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
    return XP_PER_DROP;
  }

  /* —— totals —— */
  function lectureOf(id) { return ((MAT && MAT.lectures) || []).find(l => l.id === id) || {}; }
  const counted = img => !img.extra;
  function chapterTotals(ch) {
    let n = 0, k = 0, pics = 0;
    ch.images.forEach(img => { if (!counted(img)) return; pics++; n += labelsOf(img).length; k += solvedCount(keyOf(ch, img), img); });
    return { n, k, pics };
  }
  function chapterMeta(ch) { const t = chapterTotals(ch); return t.pics + ' picture' + (t.pics === 1 ? '' : 's') + ' · ' + t.k + ' / ' + t.n + ' solved'; }
  function updateSummary() {
    if (!DATA) return;
    let n = 0, k = 0;
    DATA.chapters.forEach(ch => { const t = chapterTotals(ch); n += t.n; k += t.k; });
    const el = document.getElementById('studySummary');
    if (el) { el.hidden = false; el.innerHTML = '<span class="ss-label">Progress</span><span class="ss-track"><span class="ss-fill" style="width:' + (n ? Math.round(k / n * 100) : 0) + '%"></span></span><span class="ss-count">' + k + ' / ' + n + ' labels solved</span>'; }
    document.querySelectorAll('#chapterList .chapter-card').forEach(card => {
      const ch = DATA.chapters.find(c => c.lecture === card.dataset.id); if (!ch) return;
      const t = chapterTotals(ch);
      const m = card.querySelector('.chapter-toggle .meta'); if (m) m.textContent = chapterMeta(ch);
      const bar = card.querySelector('.chapter-progress .cp-fill'); if (bar) bar.style.width = (t.n ? Math.round(t.k / t.n * 100) : 0) + '%';
      card.querySelectorAll('.simg-index-chip').forEach(chip => {
        let kk = 0, nn = 0;
        const imgs = chip.dataset.img === '__bones' ? ch.images.filter(isSingle) : ch.images.filter(i => i.id === chip.dataset.img);
        imgs.forEach(img => { kk += solvedCount(keyOf(ch, img), img); nn += labelsOf(img).length; });
        chip.querySelector('.sic-count').textContent = kk + '/' + nn; chip.classList.toggle('done', nn > 0 && kk === nn);
      });
    });
  }

  /* —— helpers —— */
  function seededShuffle(arr, seedStr) {
    let h = 2166136261; for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; const j = (h >>> 0) % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const pt = p => p[0] + ',' + p[1];
  function leaderStart(l) {
    const a = l.anchor, x0 = l.x, y0 = l.y, x1 = l.x + l.w, y1 = l.y + l.h;
    if (a.x > x1) return [x1, (y0 + y1) / 2];
    if (a.x < x0) return [x0, (y0 + y1) / 2];
    return [(x0 + x1) / 2, a.y > y1 ? y1 : y0];
  }
  function regionsSVG(img) {
    if (isSingle(img)) return '';
    const parts = img.labels.map(l => {
      const polys = (l.region || []).map(p => '<polygon class="simg-reg-poly" points="' + p.map(pt).join(' ') + '"/>').join('');
      const line = l.anchor ? (() => { const s = leaderStart(l); return '<line class="simg-leader-hit" x1="' + s[0] + '" y1="' + s[1] + '" x2="' + l.anchor.x + '" y2="' + l.anchor.y + '"/>'; })() : '';
      return (polys || line) ? '<g class="simg-reg" data-id="' + esc(l.id) + '">' + polys + line + '</g>' : '';
    }).join('');
    return parts ? '<svg class="simg-regions" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + parts + '</svg>' : '';
  }
  function boneChips(ch, img) {
    const others = ch.images.filter(i => isSingle(i) && i.id !== img.id).map(i => i.answer);
    const pick = seededShuffle(others, img.id).slice(0, 5);
    return seededShuffle([img.answer].concat(pick), img.id + '/chips');
  }

  /* —— one picture —— */
  function sectionHTML(ch, img, pager) {
    const key = keyOf(ch, img), single = isSingle(img), mode = currentMode(key, img);
    const slots = modeSlots(key, mode), labels = labelsOf(img), n = labels.length;
    const solvedHere = mode === 'show' ? [] : labels.filter(l => slots[l.id] != null && matches(l, slots[l.id]));
    const k = solvedCount(key, img);
    const title = single ? 'Bone Anatomy' : img.title;
    let h = '<header class="simg-head"><h3 class="simg-title">' + esc(title)
      + (single && pager ? ' <span class="simg-page-no">' + (pager.i + 1) + ' / ' + pager.n + '</span>' : '')
      + (img.extra ? ' ' + (typeof noteBadgeHTML === 'function' ? noteBadgeHTML(EXTRA_BADGE) : '<span class="note-badge grey" title="' + esc(EXTRA_BADGE.tip) + '" data-tip="' + esc(EXTRA_BADGE.tip) + '">' + esc(EXTRA_BADGE.text) + '</span>') : '')
      + '</h3>'
      + '<span class="simg-count" title="Solved labels">' + k + ' / ' + n + '</span>'
      + '<div class="simg-modes" role="group" aria-label="Study mode">'
      + modesOf(img).map(m => '<button type="button" class="simg-mode" data-mode="' + m + '" aria-pressed="' + (m === mode ? 'true' : 'false') + '" title="' + esc(MODES[m].tip) + '"><span aria-hidden="true">' + MODES[m].icon + '</span> ' + MODES[m].text + '</button>').join('')
      + '</div></header>';
    const src = animSrc(img, (mode !== 'show' || !img.labeled) ? img.blank : img.labeled);
    h += '<div class="simg-frame"><div class="label-stage simg-stage' + (single ? ' single' : '') + '"><div class="label-figure simg-figure' + (single ? ' single' : '') + '">'
      + '<img class="label-img simg-img" loading="lazy" decoding="async" src="' + esc(src) + '" width="' + (img.width || '') + '" height="' + (img.height || '') + '" alt="' + esc(img.alt || img.title) + '" draggable="false">';
    h += regionsSVG(img);
    if (!single) {
      labels.forEach(l => {
        const style = 'left:' + l.x + '%;top:' + l.y + '%;width:' + l.w + '%;height:' + l.h + '%';
        const hintHTML = l.hint ? '<span class="simg-slot-hint">' + esc(l.hint) + '</span>' : '';
        if (mode === 'show') { h += '<div class="simg-hot" data-id="' + esc(l.id) + '" style="' + style + '" title="' + esc(l.answer) + '"></div>'; return; }
        const t = slots[l.id];
        if (t != null && matches(l, t)) h += '<div class="label-slot locked" data-id="' + esc(l.id) + '" style="' + style + '"><span class="label-slot-text">' + esc(t) + '</span></div>';
        else if (mode === 'bank') h += '<div class="label-slot open' + (l.hint ? ' has-hint' : '') + '" data-id="' + esc(l.id) + '" style="' + style + '" tabindex="0" role="button" aria-label="Empty label' + (l.hint ? ' (' + esc(l.hint) + ')' : '') + '">' + hintHTML + '</div>';
        else h += '<div class="label-slot typing' + (l.hint ? ' has-hint' : '') + '" data-id="' + esc(l.id) + '" style="' + style + '"><input class="label-input" type="text" autocomplete="off" spellcheck="false" autocapitalize="sentences" autocorrect="off" aria-label="Label' + (l.hint ? ' (' + esc(l.hint) + ')' : '') + '"' + (l.hint ? ' placeholder="' + esc(l.hint) + '"' : '') + '><div class="label-echo" aria-live="polite"></div></div>';
      });
    }
    h += '</div></div><button type="button" class="simg-restart" title="Clear this mode\'s progress for this picture"' + (solvedHere.length ? '' : ' hidden') + '>↺ restart</button></div>';
    if (single) {
      const l = labels[0], t = slots.name, q = img.plural ? 'What are these bones called?' : 'What is this bone called?';
      if (mode === 'show') h += '<p class="simg-answer">' + esc(img.answer) + '</p>';
      else if (t != null && matches(l, t)) h += '<div class="simg-name done"><span class="simg-name-label">' + q + '</span><span class="simg-name-locked">✓ ' + esc(t) + '</span></div>';
      else if (mode === 'bank') h += '<div class="simg-name"><span class="simg-name-label">' + q + '</span><div class="label-slot open simg-name-slot" data-id="name" tabindex="0" role="button" aria-label="Drop the name here">drop the name here</div></div>';
      else h += '<div class="simg-name"><label class="simg-name-label" for="sn-' + esc(key) + '">' + q + '</label><div class="saq-wrap"><input id="sn-' + esc(key) + '" class="saq-input simg-name-input" type="text" autocomplete="off" spellcheck="false" autocapitalize="sentences" autocorrect="off" placeholder="Type the name"><button type="button" class="nav-btn primary simg-name-check">Check</button><div class="label-echo saq-echo simg-name-echo" aria-live="polite"></div></div></div>';
    }
    if (mode === 'bank') {
      const open = labels.filter(l => !(slots[l.id] != null && matches(l, slots[l.id])));
      if (open.length) {
        const words = single ? boneChips(ch, img) : seededShuffle(open.map(l => l.answer), key);
        h += '<div class="label-bank simg-bank" aria-label="Word bank">' + words.map(w => '<button type="button" class="label-chip" data-text="' + esc(w) + '">' + esc(w) + '</button>').join('') + '</div>';
      }
    }
    h += '<div class="feedback idle simg-fb" aria-live="polite"></div>';
    if (pager) h += '<nav class="simg-pager-nav" aria-label="Bone pages"><button type="button" class="nav-btn simg-prev"' + (pager.i ? '' : ' disabled') + '>‹ Previous</button><span class="simg-page">Bone ' + (pager.i + 1) + ' of ' + pager.n + '</span><button type="button" class="nav-btn simg-next"' + (pager.i < pager.n - 1 ? '' : ' disabled') + '>Next ›</button></nav>';
    if (!single && img.caption) h += '<p class="simg-caption">' + esc(img.caption) + '</p>';
    const lic = img.license ? (img.licenseUrl ? '<a href="' + esc(img.licenseUrl) + '" target="_blank" rel="noopener">' + esc(img.license) + '</a>' : esc(img.license)) : '';
    // a bone's source page names it, so its link only shows with the labels shown
    const srcLink = (img.sourceUrl && !(single && mode !== 'show')) ? ' · <a href="' + esc(img.sourceUrl) + '" target="_blank" rel="noopener">source</a>' : '';
    h += '<p class="simg-credit">' + (img.animated ? 'Animation' : 'Image') + ': ' + esc(img.credit || '') + (lic ? ' · ' + lic : '') + srcLink + '</p>';
    return h;
  }

  function renderSection(sec, ch, img, pager) {
    const key = keyOf(ch, img), mode = currentMode(key, img), single = isSingle(img);
    sec.innerHTML = sectionHTML(ch, img, pager);
    sec.dataset.key = key; sec.dataset.img = img.id; sec.dataset.mode = mode;
    sec.classList.toggle('is-hidden', mode !== 'show');
    const rerender = () => renderSection(sec, ch, img, pager);
    sec.querySelectorAll('.simg-mode').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.mode === mode) return;
      modeOf[key] = b.dataset.mode; rerender();
      if (b.dataset.mode === 'type') { const f = sec.querySelector('.label-input, .simg-name-input'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }
    }));
    sec.querySelector('.simg-restart').addEventListener('click', () => { writeModeSlots(key, mode, {}); rerender(); updateSummary(); });
    if (pager) {
      const go = d => { pageOf[ch.lecture] = Math.max(0, Math.min(pager.n - 1, pager.i + d)); pager.render(); };
      sec.querySelector('.simg-prev').addEventListener('click', () => go(-1));
      sec.querySelector('.simg-next').addEventListener('click', () => go(1));
    }
    const fb = sec.querySelector('.simg-fb');
    const say = (cls, msg, ms) => { fb.className = 'feedback ' + cls + ' simg-fb'; fb.textContent = msg; clearTimeout(fb._t); if (ms) fb._t = setTimeout(() => { fb.className = 'feedback idle simg-fb'; fb.textContent = ''; }, ms); };
    const shake = el => { if (!el) return; el.classList.remove('soft-wrong'); void el.offsetWidth; el.classList.add('soft-wrong'); setTimeout(() => el.classList.remove('soft-wrong'), 480); };
    const lock = (l, text, el, how) => {
      const slots = modeSlots(key, mode); if (slots[l.id] != null) return;
      slots[l.id] = norm(text); writeModeSlots(key, mode, slots);
      const r = el.getBoundingClientRect();
      const labels = labelsOf(img), k = labels.filter(x => slots[x.id] != null).length, n = labels.length;
      const xp = how === 'drop' ? awardDropXP(key, l.id) : 0;
      const hadFocus = el.contains(document.activeElement);
      rerender();
      const done = sec.querySelector('.label-slot.locked[data-id="' + CSS.escape(l.id) + '"], .simg-name.done');
      if (done) done.classList.add('just-locked');
      if (typeof spawnFireworkBurst === 'function') spawnFireworkBurst(r.left + r.width / 2, r.top + r.height / 2, 14);
      const fb2 = sec.querySelector('.simg-fb');
      fb2.className = 'feedback good simg-fb';
      fb2.textContent = (n === 1 ? '✓ correct' : k >= n ? ('✓ all ' + n + ' solved') : ('✓ ' + k + ' of ' + n + ' labels')) + (xp ? ' · +' + xp + ' XP' : '');
      if (k >= n) { sec.classList.add('correct-pulse'); setTimeout(() => sec.classList.remove('correct-pulse'), 650); if (typeof pt1Confetti === 'function') pt1Confetti(); }
      updateSummary();
      if (hadFocus) { const nx = sec.querySelector('.label-slot.typing input'); if (nx) try { nx.focus({ preventScroll: true }); } catch (e) {} }
    };
    const labelById = id => labelsOf(img).find(x => x.id === id);

    /* typed slots */
    sec.querySelectorAll('.label-slot.typing').forEach(slot => {
      const input = slot.querySelector('input'), echo = slot.querySelector('.label-echo');
      const l = labelById(slot.dataset.id);
      input.addEventListener('input', () => {
        echo.innerHTML = echoHTML(l, input.value);
        slot.classList.toggle('has-echo', !!echo.innerHTML);
        if (matches(l, input.value)) lock(l, input.value, slot, 'type');
      });
      input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault(); e.stopPropagation();
        if (!norm(input.value)) return;
        if (matches(l, input.value)) lock(l, input.value, slot, 'type');
        else { shake(input); say('soft', hint(l, input.value), 1400); }
      });
    });
    const ni = sec.querySelector('.simg-name-input');
    if (ni) {
      const l = labelsOf(img)[0], echo = sec.querySelector('.simg-name-echo');
      const check = () => {
        if (!norm(ni.value)) { ni.focus(); return; }
        if (matches(l, ni.value)) lock(l, ni.value, ni.closest('.simg-name'), 'type');
        else { shake(ni); say('soft', hint(l, ni.value), 1400); ni.select(); }
      };
      ni.addEventListener('input', () => { echo.innerHTML = echoHTML(l, ni.value); });
      ni.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); check(); } });
      sec.querySelector('.simg-name-check').addEventListener('click', check);
    }

    /* word bank: drag a chip onto a slot, or tap a chip then a slot (or a slot then a chip) */
    let selChip = null, selSlot = null;
    const fig = sec.querySelector('.simg-figure');
    const select = chip => {
      sec.querySelectorAll('.label-chip.selected').forEach(c => c.classList.remove('selected'));
      selChip = chip || null; if (chip) chip.classList.add('selected');
      if (fig) fig.classList.toggle('picking', !!chip);
    };
    const selectSlot = slot => {
      sec.querySelectorAll('.label-slot.slot-picked').forEach(s => s.classList.remove('slot-picked'));
      selSlot = slot || null; if (slot) slot.classList.add('slot-picked');
    };
    const bounce = (chip, ghost) => {
      if (!ghost) return;
      const r = chip.getBoundingClientRect();
      ghost.classList.add('returning'); ghost.style.left = (r.left + r.width / 2) + 'px'; ghost.style.top = (r.top + r.height / 2) + 'px';
      setTimeout(() => ghost.remove(), 320);
    };
    const tryPlace = (chip, slot, ghost) => {
      if (!chip || !slot || !slot.classList.contains('open')) { bounce(chip, ghost); return; }
      const l = labelById(slot.dataset.id); if (!l) { bounce(chip, ghost); return; }
      if (!matches(l, chip.dataset.text)) {
        bounce(chip, ghost); shake(chip); shake(slot); select(null); selectSlot(null);
        if (window.StudyAchievements && typeof StudyAchievements.recordWrong === 'function') { try { StudyAchievements.recordWrong(); } catch (e) {} }
        say('soft', 'not that one · try again', 1400);
        return;
      }
      if (ghost) ghost.remove();
      lock(l, chip.dataset.text, slot, 'drop');
    };
    sec.querySelectorAll('.label-chip').forEach(chip => {
      chip.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const sx = e.clientX, sy = e.clientY; let ghost = null, over = null;
        const move = ev => {
          if (!ghost) {
            if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
            ghost = chip.cloneNode(true); ghost.classList.add('label-ghost'); ghost.classList.remove('selected');
            document.body.appendChild(ghost); chip.classList.add('dragging'); select(null);
          }
          ev.preventDefault();
          ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
          if (ev.clientY < 48) window.scrollBy(0, -14); else if (ev.clientY > window.innerHeight - 48) window.scrollBy(0, 14);
          const el = document.elementFromPoint(ev.clientX, ev.clientY);
          const s = el && el.closest ? el.closest('.label-slot.open') : null;
          const s2 = (s && sec.contains(s)) ? s : null;
          if (s2 !== over) { if (over) over.classList.remove('drop-over'); over = s2; if (over) over.classList.add('drop-over'); }
        };
        const end = ev => {
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end);
          if (over) over.classList.remove('drop-over');
          if (!ghost) return; // a tap: the click handler selects the chip
          chip.__suppressClick = true; setTimeout(() => { chip.__suppressClick = false; }, 60);
          chip.classList.remove('dragging');
          if (ev.type === 'pointerup' && over) tryPlace(chip, over, ghost); else bounce(chip, ghost);
        };
        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
      });
      chip.addEventListener('click', () => {
        if (chip.__suppressClick) return;
        if (selSlot) { const s = selSlot; selectSlot(null); tryPlace(chip, s, null); return; }
        select(selChip === chip ? null : chip);
      });
    });
    sec.querySelectorAll('.label-slot.open').forEach(slot => {
      const go = () => { if (selChip) { const c = selChip; select(null); tryPlace(c, slot, null); } else selectSlot(selSlot === slot ? null : slot); };
      slot.addEventListener('click', go);
      slot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); go(); } });
    });

    /* hover / tap highlight: term (slot or hot box), its leader line, or the region itself */
    const regs = sec.querySelector('.simg-regions');
    if (regs && !single) {
      let sticky = null;
      const on = id => {
        sec.querySelectorAll('.simg-reg.hl, .label-slot.hl, .simg-hot.hl').forEach(e => e.classList.remove('hl'));
        if (!id) return;
        sec.querySelectorAll('.simg-reg[data-id="' + CSS.escape(id) + '"], .label-slot[data-id="' + CSS.escape(id) + '"], .simg-hot[data-id="' + CSS.escape(id) + '"]').forEach(e => e.classList.add('hl'));
      };
      const off = () => on(sticky);
      const targets = sec.querySelectorAll('.simg-reg, .label-slot, .simg-hot');
      targets.forEach(t => {
        t.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') on(t.dataset.id); });
        t.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') off(); });
        t.addEventListener('focusin', () => on(t.dataset.id));
        t.addEventListener('focusout', () => off());
        t.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { sticky = sticky === t.dataset.id ? null : t.dataset.id; on(sticky); } });
      });
    }
  }

  function renderChapterBody(body, ch) {
    const md = body.querySelector('.md') || body;
    md.className = 'md simg-chapter';
    const singles = ch.images.filter(isSingle), normal = ch.images.filter(i => !isSingle(i));
    const ordered = normal.filter(counted).concat(normal.filter(i => !counted(i)));
    let idx = '<nav class="simg-index" aria-label="Pictures in this chapter">';
    ordered.forEach(img => { idx += '<button type="button" class="simg-index-chip' + (img.extra ? ' extra' : '') + '" data-img="' + esc(img.id) + '"><span class="sic-name">' + esc(img.title) + (img.extra ? ' (extra)' : '') + '</span><span class="sic-count"></span></button>'; });
    if (singles.length) idx += '<button type="button" class="simg-index-chip" data-img="__bones"><span class="sic-name">Bone Anatomy</span><span class="sic-count"></span></button>';
    md.innerHTML = idx + '</nav><div class="simg-list"></div>';
    const list = md.querySelector('.simg-list');
    ordered.forEach(img => {
      const sec = document.createElement('section');
      sec.className = 'simg-card' + (img.extra ? ' extra' : '');
      list.appendChild(sec);
      renderSection(sec, ch, img, null);
    });
    if (singles.length) {
      const sec = document.createElement('section');
      sec.className = 'simg-card single simg-pager'; sec.dataset.pager = '1';
      list.appendChild(sec);
      const pager = { n: singles.length, i: 0, render: null };
      pager.render = () => { pager.i = Math.max(0, Math.min(singles.length - 1, pageOf[ch.lecture] || 0)); renderSection(sec, ch, singles[pager.i], pager); };
      pager.render();
    }
    md.querySelectorAll('.simg-index-chip').forEach(chip => chip.addEventListener('click', () => {
      const s = chip.dataset.img === '__bones' ? list.querySelector('.simg-pager') : list.querySelector('.simg-card[data-img="' + CSS.escape(chip.dataset.img) + '"]:not(.simg-pager)');
      if (s) s.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    }));
    updateSummary();
  }

  /* build the chapter list (same chapter cards as the notes) */
  async function build(listEl, material, opts) {
    MAT = material; opts = opts || {};
    const src = material.study.images;
    if (!DATA || dataSrc !== src) {
      listEl.innerHTML = '<p class="simg-loading">Loading pictures…</p>';
      const res = await fetch(src, { cache: 'no-store' });
      if (!res.ok) throw new Error(src + ' → ' + res.status);
      DATA = await res.json(); dataSrc = src;
    }
    listEl.innerHTML = '';
    DATA.chapters.forEach(ch => {
      const lec = lectureOf(ch.lecture);
      const card = document.createElement('article');
      card.className = 'chapter-card simg-chapter-card'; card.dataset.id = ch.lecture;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'chapter-toggle'; btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '<span class="chev" aria-hidden="true">›</span><span class="title">' + esc(lec.title || ch.lecture)
        + (lec.draft ? '<span class="draft-badge study-draft" title="Unfinished · still being written">Draft</span>' : '') + '</span><span class="meta">' + esc(chapterMeta(ch)) + '</span>';
      const prog = document.createElement('div'); prog.className = 'chapter-progress'; prog.innerHTML = '<span class="cp-fill"></span>';
      const body = document.createElement('div'); body.className = 'chapter-body';
      body.innerHTML = '<article class="md"></article>';
      btn.addEventListener('click', () => {
        const open = card.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open && body.dataset.loaded !== '1') { renderChapterBody(body, ch); body.dataset.loaded = '1'; }
      });
      card.append(btn, prog, body);
      listEl.appendChild(card);
    });
    updateSummary();
    if (opts.focus) {
      const card = listEl.querySelector('.chapter-card[data-id="' + CSS.escape(opts.focus) + '"]');
      if (card) { card.querySelector('.chapter-toggle').click(); setTimeout(() => card.scrollIntoView({ block: 'start' }), 30); }
    }
  }
  function chapterIds(material) { return (DATA && material && material.study && dataSrc === material.study.images) ? DATA.chapters.map(c => c.lecture) : null; }
  window.StudyImages = { build, storeKey: STORE, xpKey: XP_STORE, chapterIds, _data: () => DATA };
  addEventListener('study-prefs-changed', () => {
    document.querySelectorAll('#chapterList .simg-card img.simg-img').forEach(el => {
      const cur = el.getAttribute('src') || ''; if (!/heart-flow|\.svg$/.test(cur)) return;
      const base = cur.replace(/-slow\.svg$/, '.svg'), want = isBasic() ? base.replace(/\.svg$/, '-slow.svg') : base;
      const animated = !!(DATA && DATA.chapters.some(c => c.images.some(i => i.animated && (i.blank === base || i.labeled === base))));
      if (animated && want !== cur) el.setAttribute('src', want);
    });
  });
})();
