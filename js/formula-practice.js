/**
 * Formula practice screen (port of the Med Physics PT1 site's formula mode).
 * A material opts in with "formulas": { "gen": "Pt2FormulaGen", "key": "medphys/pt2", "title": "..." }
 * in data/catalog.json. The sets then shows a "Formulas" section with one card.
 * Flow (same as PT1): generated multiple-choice item; a wrong answer greys that option and
 * shows the formula, then more working on each further wrong answer; "Show formula" reveals
 * it on request; after a correct answer a bar empties and the next item comes from the
 * least-answered formula; "New question" during the wait picks a random formula.
 * Counts are kept per material in localStorage (fp_count:<key>, fp_mastery:<key>).
 */
(function () {
  'use strict';
  const ADVANCE_MS = 3200;
  let cfg = null, gen = null, q = null, keys = [], curKey = '', wrong = 0, hintLevel = 0, locked = false;
  let advTimer = null, advRaf = null, clock = null, started = 0;

  const $ = id => document.getElementById(id);
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function countKey() { return 'fp_count:' + cfg.key; }
  function masteryKey() { return 'fp_mastery:' + cfg.key; }
  function total() { const n = parseInt(ls(countKey()) || '0', 10); return n > 0 ? n : 0; }
  function mastery() { try { return JSON.parse(ls(masteryKey()) || '{}') || {}; } catch (e) { return {}; } }
  function famCount(k) { const m = mastery(); return (m[k] && m[k].total) || 0; }
  function famTitle(k) { const md = gen && gen.FORMULA_METADATA[k]; return (md && md.name) || k || 'Formulas'; }
  function bump(k, variant) {
    const m = mastery(); if (!m[k]) m[k] = { total: 0, byVariant: {} };
    m[k].total++; const vk = String(variant == null ? 0 : variant); m[k].byVariant[vk] = (m[k].byVariant[vk] || 0) + 1;
    ls(masteryKey(), JSON.stringify(m)); ls(countKey(), String(total() + 1));
  }
  function leastKey() {
    const m = mastery(); let min = Infinity;
    keys.forEach(k => { const t = (m[k] && m[k].total) || 0; if (t < min) min = t; });
    const c = keys.filter(k => (((m[k] && m[k].total) || 0) === min));
    return c[Math.floor(Math.random() * c.length)] || keys[0];
  }
  function configFor(mat) { return mat && mat.formulas && window[mat.formulas.gen] ? mat.formulas : null; }

  /* —— set cards — one per PT2 chapter —— */
const PT2_CHAPTERS = [
  { id: 'ch3', title: 'Chapter 3', subtitle: 'Fluids · rheology · surface tension',
    keys: ['continuity','massFlow','bernoulli','viscosity','poiseuille','laplaceCylinder','wallStress','reynolds','surfaceTension','alveolus'] },
  { id: 'ch4', title: 'Chapter 4', subtitle: 'Waves · sound · temperature',
    keys: ['waveSpeed','periodFreq','soundSpeed','dopplerSource','mach','tempConvert'] },
  { id: 'ch5', title: 'Chapter 5', subtitle: 'Ray optics',
    keys: ['refractiveIndex','snell','criticalAngle'] },
  { id: 'ch6', title: 'Chapter 6', subtitle: 'Optical instruments',
    keys: ['mirrorFocal','thinLens','magnification','lensPower','powerSum','separatedLenses','simpleMagnifier'] },
  { id: 'ch7', title: 'Chapter 7', subtitle: 'Atomic & nuclear',
    keys: ['photonEnergy','deBroglie','nuclearRadius','halfLife','activity','absorbedDose','doseEquivalent'] }
];

function appendSetsSection(host) {
  const mat = window.__activeMaterial; const c = mat && mat.formulas;
  if (!c) return;
  cfg = c; gen = window[c.gen] || null;
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:12px;margin-bottom:8px';
  const h = document.createElement('div'); h.className = 'section-h'; h.textContent = 'Formulas';
  const desc = document.createElement('div'); desc.className = 'card-desc-formula'; desc.textContent = 'Unlimited practice with formula hints';
  desc.style.margin = '0';
  header.appendChild(h);
  header.appendChild(desc);
  host.appendChild(header);
  const grid = document.createElement('div'); grid.className = 'grid';

  if (!gen) {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'card formula-card'; btn.disabled = true;
    btn.innerHTML = '<div class="card-top"><span class="form-letter">Formulas</span></div><div class="card-desc-formula">Generator failed to load</div>';
    grid.appendChild(btn);
  } else {
    const badges = (c.draft && typeof cardBadgesHTML === 'function') ? cardBadgesHTML({ draft: true }) : '';
    PT2_CHAPTERS.forEach(ch => {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'card formula-card';
      btn.dataset.card = 'formulas-' + ch.id;
      const extraBadge = (ch.id === 'ch3')
        ? '<span class="card-badge note-badge amber" title="Told not to be on the exam — practice only">Off-exam</span>'
        : '';
      const badgeHtml = badges
        ? badges.replace('</div>', extraBadge + '</div>')
        : (extraBadge ? '<div class="card-badges">' + extraBadge + '</div>' : '');
      btn.innerHTML = '<div class="card-top"><span class="form-letter">' + ch.title + '</span></div>' + badgeHtml +
        '<div class="card-sub">' + ch.keys.length + ' formulas · ' + ch.subtitle + '</div>' +
        '<div class="card-stats"><div class="card-pct">' + total() + ' answered</div></div>';
      btn.addEventListener('click', () => start(ch.keys));
      grid.appendChild(btn);
    });
  }
  host.appendChild(grid);
}

  /* —— run —— */
  function start(ks) {
    const mat = window.__activeMaterial; const c = configFor(mat); if (!c) return;
    cfg = c; gen = window[c.gen];
    keys = (ks && ks.length) ? ks.slice() : gen.allKeys();
    $('formulaTitle').textContent = (c.title || 'Formulas');
    started = Date.now(); clearInterval(clock);
    clock = setInterval(() => { const e = Math.floor((Date.now() - started) / 1000); $('formulaElapsed').textContent = String(Math.floor(e / 60)).padStart(2, '0') + ':' + String(e % 60).padStart(2, '0'); }, 1000);
    $('formulaElapsed').textContent = '00:00';
    if (typeof showView === 'function') showView('formulaView');
    next(false);
  }
  function next(random) {
    clearAdvance();
    wrong = 0; hintLevel = 0; locked = false;
    q = random ? gen.generateQuestion(keys) : gen.generateQuestion([leastKey()]);
    curKey = q.formulaKey;
    render();
  }
  function render() {
    $('formulaQText').textContent = q.q;
    const opts = $('formulaOptions'); opts.innerHTML = '';
    q.options.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.key = String.fromCharCode(65 + i);
      b.textContent = o; b.addEventListener('click', () => select(i)); opts.appendChild(b);
    });
    const fb = $('formulaFeedback'); fb.className = 'feedback idle'; fb.textContent = '';
    $('formulaHintBox').classList.remove('show');
    setShowUsed(false);
    chrome();
  }
  function chrome() {
    const strip = $('formulaFamilyStrip'); strip.innerHTML = '';
    keys.forEach(k => {
      const s = document.createElement('span'); s.className = 'ff-title' + (k === curKey ? ' active' : '');
      const n = famCount(k); s.textContent = famTitle(k) + ' ' + n; s.title = famTitle(k) + ' · ' + n + ' answered';
      strip.appendChild(s);
    });
    $('formulaStatus').textContent = 'Formulas · ' + famTitle(curKey) + ' · ' + famCount(curKey) + ' answered · total ' + total();
  }
  function hintText(level) {
    const lines = [q.formulaHint || q.formulaEq || ''];
    if (q.formulaMap && q.formulaMap.length) { lines.push(''); q.formulaMap.forEach(l => lines.push(l)); }
    if (q.formulaPlugIn) { lines.push(''); lines.push(q.formulaPlugIn); }
    const steps = (q.formulaSteps || []).filter(x => x !== q.formulaHint);
    if (level >= 2 && steps.length) { lines.push(''); steps.slice(0, Math.min(steps.length, level - 1)).forEach(s => lines.push(s)); }
    return lines.join('\n');
  }
  function reveal(level) {
    hintLevel = Math.max(hintLevel, level | 0);
    $('formulaHintText').textContent = hintText(hintLevel);
    $('formulaHintBox').classList.add('show');
    setShowUsed(true);
  }
  function setShowUsed(u) { const b = $('formulaShowBtn'); b.disabled = !!u; b.classList.toggle('used', !!u); }
  function select(i) {
    if (locked || !q) return;
    const btns = document.querySelectorAll('#formulaOptions .opt'); const fb = $('formulaFeedback');
    if (i !== q.correct) {
      const b = btns[i]; if (b) { b.disabled = true; b.classList.add('wrong', 'soft-wrong'); setTimeout(() => b.classList.remove('soft-wrong'), 480); }
      fb.className = 'feedback soft'; fb.textContent = 'Not that one. Try again.';
      wrong++; reveal(wrong);
      if (window.StudyAchievements && typeof StudyAchievements.recordWrong === 'function') StudyAchievements.recordWrong();
      return;
    }
    locked = true;
    btns.forEach((b, k) => { b.disabled = true; if (k === i) b.classList.add('correct'); });
    fb.className = 'feedback good'; fb.textContent = '✓ ' + (q.explain || '');
    const panel = $('formulaPanel'); panel.classList.add('correct-pulse'); setTimeout(() => panel.classList.remove('correct-pulse'), 650);
    if (typeof spawnConfetti === 'function') { try { spawnConfetti(); } catch (e) {} }
    bump(q.formulaKey, q._formulaVariant);
    chrome();
    startAdvance();
  }
  function setWaiting(on) { $('formulaView').classList.toggle('formula-waiting', !!on); $('formulaAdvanceWrap').setAttribute('aria-hidden', on ? 'false' : 'true'); }
  function clearAdvance() {
    clearTimeout(advTimer); advTimer = null; if (advRaf) cancelAnimationFrame(advRaf); advRaf = null;
    setWaiting(false); const f = $('formulaAdvanceFill'); if (f) { f.style.transition = 'none'; f.style.transform = 'scaleX(1)'; }
  }
  function startAdvance() {
    clearAdvance(); setWaiting(true);
    const t0 = performance.now(); const fill = $('formulaAdvanceFill');
    function finish() { const was = $('formulaView').classList.contains('formula-waiting'); clearAdvance(); if (was && active()) next(false); }
    function tick(now) { const t = Math.min(1, (now - t0) / ADVANCE_MS); fill.style.transform = 'scaleX(' + (1 - t) + ')'; if (t >= 1) { finish(); return; } advRaf = requestAnimationFrame(tick); }
    advRaf = requestAnimationFrame(tick);
    advTimer = setTimeout(() => { if ($('formulaView').classList.contains('formula-waiting')) finish(); }, ADVANCE_MS + 160);
  }
  function active() { const v = $('formulaView'); return !!(v && v.classList.contains('active')); }
  function leave() {
    clearAdvance(); clearInterval(clock); q = null;
    if (window.StudyQuiz && StudyQuiz.renderSets) StudyQuiz.renderSets();
    if (typeof showView === 'function') showView('setsView');
  }

  function wire() {
    $('formulaShowBtn').addEventListener('click', () => { if (q && !$('formulaShowBtn').disabled) reveal(Math.max(1, hintLevel || 1)); });
    $('formulaRollBtn').addEventListener('click', () => { if (q && $('formulaView').classList.contains('formula-waiting')) next(true); });
    $('formulaSetsBtn').addEventListener('click', leave);
    window.addEventListener('keydown', e => {
      if (!active()) return;
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'Escape') { e.preventDefault(); leave(); return; }
      if (/^[a-dA-D1-4]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const i = /\d/.test(e.key) ? +e.key - 1 : e.key.toUpperCase().charCodeAt(0) - 65;
        const b = document.querySelectorAll('#formulaOptions .opt')[i]; if (b && !b.disabled) { e.preventDefault(); b.click(); }
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();

  window.FormulaPractice = { appendSetsSection, start, next: () => next(true), get question() { return q; }, get active() { return active(); }, leave, totalAnswered: () => cfg ? total() : 0 };
})();
