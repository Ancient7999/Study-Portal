/* Study Portal — Mastery / Mastery+ / DNSA (ATC-inspired).
 *
 * v2 (pt1-quiz-upgrade): everything is stored by QUESTION ID, not by position.
 *   data[bankKey] = {
 *     q:      { <questionId>: clearCount },          // how many layers cleared
 *     cards:  { <cardId>: { masteryPlusLevel, timeSpent } },
 *     timeSpent, masteryPlusLevel,
 *     forms:  { ... }   // legacy v1 position data, kept read-only for safety
 *     migratedForms: true                             // set once v1 → v2 done
 *   }
 *   dnsa[bankKey] = { "id:<questionId>": true }     // legacy "A_3" keys are migrated
 *
 * A "card" is a set card (category or chunk). The quiz engine registers each
 * card's question ids with registerCard(), so percentages are computed from
 * the real bank contents.
 */
(function (global) {
  const STORAGE_KEY = 'study_portal_mastery_v1';
  const DNSA_KEY = 'study_portal_dnsa_v1';
  const _MC = [
    'linear-gradient(90deg,#22d3ee,#67e8f9,#2dd4bf)',
    'linear-gradient(90deg,#fbbf24,#f59e0b)',
    'linear-gradient(90deg,#34d399,#22d3ee)',
    'linear-gradient(90deg,#a78bfa,#22d3ee,#fbbf24)',
    'linear-gradient(90deg,#fbbf24,#34d399,#a78bfa,#22d3ee)'
  ];

  let data = {};
  let dnsa = {};
  const registry = {}; // bankKey -> cardId -> [ids]   (runtime only)
  let session = {
    bankKey: null,
    form: null, // = cardId (name kept for older callers)
    ids: [],
    masteryPlusLevel: 0,
    timerStart: null,
    accumulated: 0,
    dnsaActive: false
  };

  function load() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) data = JSON.parse(s) || {};
    } catch (e) {
      data = {};
    }
    try {
      const d = localStorage.getItem(DNSA_KEY);
      if (d) dnsa = JSON.parse(d) || {};
    } catch (e) {
      dnsa = {};
    }
  }

  function save(opts) {
    opts = opts || {};
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(DNSA_KEY, JSON.stringify(dnsa));
    } catch (e) {
      console.warn('mastery save failed', e);
    }
    if (!opts.skipCloud && global.StudyProgress && typeof StudyProgress.notifyMasterySaved === 'function') {
      StudyProgress.notifyMasterySaved();
    }
  }

  function getDnsa() {
    return dnsa;
  }

  /** Replace in-memory + localStorage mastery/dnsa (used by progress sync). */
  function importData(masteryData, dnsaData, opts) {
    opts = opts || {};
    data = masteryData && typeof masteryData === 'object' ? masteryData : {};
    dnsa = dnsaData && typeof dnsaData === 'object' ? dnsaData : {};
    save({ skipCloud: !!opts.skipCloud });
    // Cloud copies from older app versions may still carry position data.
    if (global.StudyMigrate && typeof StudyMigrate.migrateMastery === 'function') {
      StudyMigrate.migrateMastery().catch(function () {});
    }
  }

  function bankKeyFromPath(path) {
    // banks/medphys/pt1.json -> medphys/pt1
    const m = String(path || '').match(/banks\/(.+)\.json$/);
    if (m) return m[1];
    return String(path || 'unknown').replace(/^banks\//, '').replace(/\.json$/, '');
  }

  function getOrInitBank(bankKey) {
    if (!data[bankKey]) data[bankKey] = { q: {}, cards: {}, timeSpent: 0, masteryPlusLevel: 0 };
    const bk = data[bankKey];
    if (!bk.q || typeof bk.q !== 'object') bk.q = {};
    if (!bk.cards || typeof bk.cards !== 'object') bk.cards = {};
    return bk;
  }

  function getOrInitCard(bankKey, cardId) {
    const bk = getOrInitBank(bankKey);
    const k = String(cardId || '');
    if (!bk.cards[k]) bk.cards[k] = { masteryPlusLevel: 0, timeSpent: 0 };
    return bk.cards[k];
  }

  /** Engine tells Mastery which ids belong to a card. */
  function registerCard(bankKey, cardId, ids) {
    if (!registry[bankKey]) registry[bankKey] = {};
    registry[bankKey][String(cardId)] = (ids || []).map(String);
  }
  function cardIds(bankKey, cardId) {
    if (Array.isArray(cardId)) return cardId.map(String);
    const r = registry[bankKey] && registry[bankKey][String(cardId)];
    return r ? r.slice() : [];
  }
  function countOf(bankKey, id) {
    const bk = data[bankKey];
    return (bk && bk.q && (bk.q[id] | 0)) || 0;
  }

  /** Mastery % 0–100 (first clears) for a card */
  function getPct(bankKey, cardId) {
    const ids = cardIds(bankKey, cardId);
    if (!ids.length) return 0;
    let cleared = 0;
    ids.forEach((id) => { if (countOf(bankKey, id) > 0) cleared++; });
    return Math.min(100, (cleared / ids.length) * 100);
  }

  /** Effective % allowing 100+/150/200 via min clearCount layers */
  function getEffectivePct(bankKey, cardId) {
    const ids = cardIds(bankKey, cardId);
    if (!ids.length) return 0;
    let minCC = Infinity;
    ids.forEach((id) => { minCC = Math.min(minCC, countOf(bankKey, id)); });
    if (minCC === Infinity) return 0;
    if (minCC === 0) return Math.min(99, getPct(bankKey, cardId));
    let beyond = 0;
    ids.forEach((id) => { if (countOf(bankKey, id) > minCC) beyond++; });
    return minCC * 100 + (beyond / ids.length) * 100;
  }

  /** Bank effective = average over registered cards (or over all cleared ids) */
  function getBankEffectivePct(bankKey) {
    const reg = registry[bankKey];
    if (reg && Object.keys(reg).length) {
      const cards = Object.keys(reg);
      let sum = 0;
      cards.forEach((c) => (sum += getEffectivePct(bankKey, c)));
      return sum / cards.length;
    }
    const bk = data[bankKey];
    if (!bk || !bk.q) return 0;
    const ids = Object.keys(bk.q);
    if (!ids.length) return 0;
    // Without the bank loaded we only know cleared ids: report layers reached.
    let min = Infinity;
    ids.forEach((id) => (min = Math.min(min, bk.q[id] | 0)));
    return Math.max(0, min) * 100;
  }

  function isBankFullyCleared(bankKey) {
    const reg = registry[bankKey];
    if (!reg) return false;
    const all = {};
    Object.keys(reg).forEach((c) => reg[c].forEach((id) => (all[id] = true)));
    const ids = Object.keys(all);
    return ids.length > 0 && ids.every((id) => countOf(bankKey, id) > 0);
  }

  function getDisplayInfo(bankKey, cardId) {
    const pct = cardId ? getPct(bankKey, cardId) : Math.min(100, getBankEffectivePct(bankKey));
    if (pct <= 0) return null;
    return { pct: Math.round(pct) };
  }

  function badgeHTML(bankKey, cardId) {
    const eff = cardId ? getEffectivePct(bankKey, cardId) : getBankEffectivePct(bankKey);
    if (eff <= 0) return '';
    const str = parseFloat(eff.toFixed(2)) + '%';
    let label = '';
    let color = 'var(--success, #34d399)';
    if (eff >= 200) {
      label = 'Mastery+ ' + str;
      color = 'var(--gold, #fbbf24)';
    } else if (eff >= 150) {
      label = 'Mastery ' + str;
      color = 'var(--gold, #fbbf24)';
    } else if (eff >= 100) {
      label = str;
      color = 'var(--gold, #fbbf24)';
    } else {
      label = 'Mastery: ' + Math.round(eff) + '%';
    }
    return '<span class="section-mastery-badge" style="color:' + color + '">' + label + '</span>';
  }

  /** Correct lock-in of a whole question (a stepped question counts once). */
  function recordClearId(bankKey, id) {
    const bk = getOrInitBank(bankKey);
    const k = String(id);
    const level = session.bankKey === bankKey ? session.masteryPlusLevel | 0 : 0;
    if ((bk.q[k] | 0) <= level) bk.q[k] = (bk.q[k] | 0) + 1;
    if (session.dnsaActive && level >= 1 && session.bankKey === bankKey) {
      if (!dnsa[bankKey]) dnsa[bankKey] = {};
      dnsa[bankKey]['id:' + k] = true;
      session.dnsaActive = false;
      const btn = document.getElementById('dnsaToggleBtn');
      if (btn) {
        btn.textContent = '☐ Do not show this question again';
        btn.classList.remove('active');
      }
    }
    save();
    return { clearCount: bk.q[k] };
  }

  /** v1 compatibility: (bankKey, form, qIndex) → needs the engine's id lookup. */
  function recordClear(bankKey, form, qIndex) {
    const resolver = global.StudyMastery && StudyMastery._idForPosition;
    const id = resolver ? resolver(bankKey, form, qIndex) : null;
    if (id == null) return null;
    return recordClearId(bankKey, id);
  }

  function isDNSA(bankKey, id) {
    return !!(dnsa[bankKey] && dnsa[bankKey]['id:' + id]);
  }

  function toggleDNSA() {
    if ((session.masteryPlusLevel | 0) < 1) return false;
    session.dnsaActive = !session.dnsaActive;
    return session.dnsaActive;
  }

  function resetDNSA(bankKey) {
    if (bankKey) delete dnsa[bankKey];
    else dnsa = {};
    save();
  }

  /** cardId + ids of the card; masteryPlusLevel comes from the card record. */
  function beginSession(bankKey, cardId, ids) {
    session.bankKey = bankKey;
    session.form = String(cardId);
    if (Array.isArray(ids)) registerCard(bankKey, cardId, ids);
    session.ids = cardIds(bankKey, cardId);
    const c = getOrInitCard(bankKey, cardId);
    session.masteryPlusLevel = c.masteryPlusLevel | 0;
    session.timerStart = Date.now();
    session.accumulated = 0;
    session.dnsaActive = false;
    updateDNSAUI();
  }

  function tickTime() {
    if (!session.bankKey || !session.form || !session.timerStart) return;
    const elapsed = Date.now() - session.timerStart;
    session.timerStart = Date.now();
    session.accumulated += elapsed;
    const c = getOrInitCard(session.bankKey, session.form);
    c.timeSpent = (c.timeSpent || 0) + elapsed;
    const bk = getOrInitBank(session.bankKey);
    bk.timeSpent = (bk.timeSpent || 0) + elapsed;
    save();
  }

  function endSession() {
    tickTime();
    session.timerStart = null;
  }

  function activateMasteryPlus(bankKey, cardId) {
    const c = getOrInitCard(bankKey, cardId);
    c.masteryPlusLevel = (c.masteryPlusLevel | 0) + 1;
    session.masteryPlusLevel = c.masteryPlusLevel;
    const bk = getOrInitBank(bankKey);
    bk.masteryPlusLevel = Math.max(bk.masteryPlusLevel | 0, c.masteryPlusLevel);
    save();
    return c.masteryPlusLevel;
  }

  /** Ids still needing a clear at the card's current Mastery+ layer (skips DNSA). */
  function progressiveQueue(bankKey, cardId) {
    const c = getOrInitCard(bankKey, cardId);
    const level = c.masteryPlusLevel | 0;
    return cardIds(bankKey, cardId).filter((id) => countOf(bankKey, id) <= level && !isDNSA(bankKey, id));
  }

  function layerProgress(bankKey, cardId) {
    const ids = cardIds(bankKey, cardId);
    const level = session.masteryPlusLevel | 0;
    const total = ids.length || 1;
    let cleared = 0;
    ids.forEach((id) => { if (countOf(bankKey, id) > level) cleared++; });
    return { cleared, total, level, basePct: (cleared / total) * 100 };
  }

  /** Only used for Mastery+ runs (level ≥ 1); normal runs keep PT1's run bar. */
  function updateProgressBar() {
    const bar = document.getElementById('progressBar');
    const wrap = bar && bar.parentElement;
    if (!bar || !session.bankKey || !session.form) return;
    const { cleared, total, level, basePct } = layerProgress(session.bankKey, session.form);
    if (level >= 1) {
      if (wrap) wrap.classList.add('mastery-plus');
      bar.style.width = Math.min(100, basePct) + '%';
      bar.style.background = _MC[Math.min(level, 4)];
      bar.title = cleared + ' / ' + total + ' cleared (Mastery+ L' + level + ')';
    } else {
      if (wrap) wrap.classList.remove('mastery-plus');
      bar.style.background = '';
      bar.title = '';
    }
  }

  function updateDNSAUI() {
    let row = document.getElementById('masteryDnsaRow');
    if (!row) {
      const quiz = document.getElementById('quizScreen');
      if (!quiz) return;
      row = document.createElement('div');
      row.id = 'masteryDnsaRow';
      row.className = 'mastery-dnsa-row';
      row.innerHTML =
        '<button type="button" id="dnsaToggleBtn" class="mastery-dnsa-btn">☐ Do not show this question again</button>' +
        '<span class="mastery-dnsa-hint" id="dnsaHint">Unlocks at Mastery+</span>';
      quiz.appendChild(row);
      row.querySelector('#dnsaToggleBtn').addEventListener('click', () => {
        const on = toggleDNSA();
        const btn = row.querySelector('#dnsaToggleBtn');
        btn.textContent = (on ? '☑' : '☐') + ' Do not show this question again';
        btn.classList.toggle('active', on);
      });
    }
    const unlocked = (session.masteryPlusLevel | 0) >= 1;
    row.style.display = session.bankKey ? 'flex' : 'none';
    const btn = row.querySelector('#dnsaToggleBtn');
    const hint = row.querySelector('#dnsaHint');
    if (btn) {
      btn.disabled = !unlocked;
      btn.style.opacity = unlocked ? '1' : '0.4';
      btn.style.pointerEvents = unlocked ? 'auto' : 'none';
    }
    if (hint) hint.style.display = unlocked ? 'none' : 'inline';
  }

  function injectResultsMasteryUI(bankKey, cardId, container, cardLabel) {
    if (!container) return;
    let box = document.getElementById('masteryResultsBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'masteryResultsBox';
      box.className = 'mastery-results-box';
      container.appendChild(box);
    }
    const ids = cardIds(bankKey, cardId);
    const eff = getEffectivePct(bankKey, cardId);
    const c = getOrInitCard(bankKey, cardId);
    const level = c.masteryPlusLevel | 0;
    const cleared = ids.filter((id) => countOf(bankKey, id) > 0).length;
    let html =
      '<div class="mastery-results-title">Mastery · ' + String(cardLabel || cardId).replace(/[<>&"]/g, '') + '</div>' +
      '<div class="mastery-results-pct">' + parseFloat(eff.toFixed(2)) + '%</div>' +
      '<div class="mastery-results-sub">' + cleared + ' / ' + ids.length + ' cleared · Mastery+ L' + level + '</div>';
    if (ids.length && ids.every((id) => countOf(bankKey, id) > level)) {
      html += '<button type="button" class="btn-gold mastery-plus-btn" id="unlockMasteryPlusBtn">Unlock Mastery+(100%+) ✦</button>';
    }
    if (Object.keys(dnsa[bankKey] || {}).length) {
      html += '<button type="button" class="btn-ghost" id="resetDnsaBtn" style="margin-top:8px">Reset DNSA filters</button>';
    }
    box.innerHTML = html;
    const unlock = box.querySelector('#unlockMasteryPlusBtn');
    if (unlock) {
      unlock.onclick = () => {
        const lvl = activateMasteryPlus(bankKey, cardId);
        if (typeof showToast === 'function') showToast('Mastery+ level ' + lvl + ' — progressive queue ready', 2800);
        injectResultsMasteryUI(bankKey, cardId, container, cardLabel);
        if (global.StudyMastery._onMasteryPlusActivate) {
          global.StudyMastery._onMasteryPlusActivate(bankKey, cardId, progressiveQueue(bankKey, cardId));
        }
      };
    }
    const reset = box.querySelector('#resetDnsaBtn');
    if (reset) reset.onclick = () => {
      resetDNSA(bankKey);
      injectResultsMasteryUI(bankKey, cardId, container, cardLabel);
    };
  }

  function formatDuration(ms) {
    const s = Math.floor((ms || 0) / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h) return h + 'h ' + (m % 60) + 'm';
    if (m) return m + 'm ' + (s % 60) + 's';
    return s + 's';
  }

  function profileMasteryHTML() {
    const keys = Object.keys(data);
    if (!keys.length) return '<p class="profile-mastery-text">No mastery data yet — clear questions in a set.</p>';
    return keys
      .map((k) => {
        const eff = getBankEffectivePct(k);
        const cls = eff >= 100 ? 'high-mastery' : eff >= 40 ? 'mid-mastery' : '';
        const ts = formatDuration((data[k] && data[k].timeSpent) || 0);
        return (
          '<div class="profile-mastery-row"><span class="profile-mastery-text ' + cls + '">' + k + ' · ' +
          parseFloat(eff.toFixed(1)) + '%</span><span class="profile-mastery-time">' + ts + '</span></div>'
        );
      })
      .join('');
  }

  function renderProfileSection() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    let host = document.getElementById('profileMasteryHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'profileMasteryHost';
      host.className = 'profile-mastery-host';
      const actions = modal.querySelector('.modal-actions');
      if (actions) actions.parentNode.insertBefore(host, actions);
      else modal.querySelector('.modal-card') && modal.querySelector('.modal-card').appendChild(host);
    }
    host.innerHTML = '<div class="profile-label">Bank mastery</div>' + profileMasteryHTML();
  }

  /** Migration helper: merge a v1 position record into id counts (max wins). */
  function absorbLegacy(bankKey, idCounts, dnsaIds) {
    const bk = getOrInitBank(bankKey);
    Object.keys(idCounts || {}).forEach((id) => {
      bk.q[id] = Math.max(bk.q[id] | 0, idCounts[id] | 0);
    });
    if (dnsaIds && dnsaIds.length) {
      if (!dnsa[bankKey]) dnsa[bankKey] = {};
      dnsaIds.forEach((id) => (dnsa[bankKey]['id:' + id] = true));
    }
    bk.migratedForms = true;
  }

  /** Bank replaced: move clear counts and "do not show again" to the new ids. */
  function remapIds(bankKey, map, validIds) {
    map = map || {};
    let changed = false;
    const bk = data[bankKey];
    if (bk && bk.q) {
      Object.keys(bk.q).forEach((id) => {
        if (validIds.has(id)) return;
        const to = map[id];
        if (to && validIds.has(to)) bk.q[to] = Math.max(bk.q[to] | 0, bk.q[id] | 0);
        delete bk.q[id];
        changed = true;
      });
    }
    const d = dnsa[bankKey];
    if (d) {
      Object.keys(d).forEach((k) => {
        const m = /^id:(.*)$/.exec(k);
        if (!m || validIds.has(m[1])) return;
        const to = map[m[1]];
        if (to && validIds.has(to)) d['id:' + to] = d[k];
        delete d[k];
        changed = true;
      });
    }
    if (changed) save();
    return changed;
  }

  /** Copy Mastery clears / "do not show again" from an old bank key (once). */
  function importFrom(oldKey, newKey, mapId, validIds, cardMap) {
    const flag = 'sp_mastery_import_v1:' + oldKey + '>' + newKey;
    try { if (localStorage.getItem(flag)) return false; } catch (e) {}
    let changed = false;
    const ob = data[oldKey];
    if (ob && ob.q) {
      const nb = getOrInitBank(newKey);
      Object.keys(ob.q).forEach((id) => {
        const to = mapId(id);
        if (to && validIds.has(to)) { nb.q[to] = Math.max(nb.q[to] | 0, ob.q[id] | 0); changed = true; }
      });
      Object.keys(cardMap || {}).forEach((oc) => {
        if (ob.cards && ob.cards[oc] && !nb.cards[cardMap[oc]]) { nb.cards[cardMap[oc]] = Object.assign({}, ob.cards[oc]); changed = true; }
      });
    }
    const od = dnsa[oldKey];
    if (od) {
      if (!dnsa[newKey]) dnsa[newKey] = {};
      Object.keys(od).forEach((k) => {
        const m = /^id:(.*)$/.exec(k);
        const to = m && mapId(m[1]);
        if (to && validIds.has(to)) { dnsa[newKey]['id:' + to] = od[k]; changed = true; }
      });
    }
    if (changed) save();
    try { localStorage.setItem(flag, String(Date.now())); } catch (e) {}
    return changed;
  }

  load();
  // Accumulate time while a quiz run is on screen
  setInterval(() => {
    if (session.timerStart && document.getElementById('quizView') &&
        document.getElementById('quizView').classList.contains('active') &&
        document.getElementById('quizScreen') &&
        document.getElementById('quizScreen').style.display !== 'none') {
      tickTime();
    }
  }, 15000);

  global.StudyMastery = {
    load,
    save,
    getDnsa,
    importData,
    bankKeyFromPath,
    getOrInitBank,
    getOrInitCard,
    registerCard,
    cardIds,
    countOf,
    getPct,
    getEffectivePct,
    getBankEffectivePct,
    isBankFullyCleared,
    getDisplayInfo,
    badgeHTML,
    recordClearId,
    recordClear,
    isDNSA,
    toggleDNSA,
    resetDNSA,
    beginSession,
    endSession,
    activateMasteryPlus,
    progressiveQueue,
    layerProgress,
    updateProgressBar,
    updateDNSAUI,
    injectResultsMasteryUI,
    renderProfileSection,
    formatDuration,
    absorbLegacy,
    remapIds,
    importFrom,
    getData: () => data,
    getSession: () => session,
    _MC,
    _onMasteryPlusActivate: null,
    _idForPosition: null
  };
})(window);
