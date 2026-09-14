/* Study Portal — Mastery / Mastery+ / DNSA (ATC-inspired, form-bank adapted) */
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

  let data = {}; // bankKey -> { forms: { A: { clearCount:[], total, masteryPlusLevel, timeSpent } }, timeSpent, masteryPlusLevel }
  let dnsa = {}; // bankKey -> { "form_qIndex": true }
  let session = {
    bankKey: null,
    form: null,
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
  }

  function bankKeyFromPath(path) {
    // banks/medphys/pt1.json -> medphys/pt1
    const m = String(path || '').match(/banks\/(.+)\.json$/);
    if (m) return m[1];
    return String(path || 'unknown').replace(/^banks\//, '').replace(/\.json$/, '');
  }

  function formKey(bankKey, form) {
    return bankKey + '::' + form;
  }

  function getOrInitForm(bankKey, form, totalQs) {
    if (!data[bankKey]) data[bankKey] = { forms: {}, timeSpent: 0, masteryPlusLevel: 0 };
    const bk = data[bankKey];
    if (!bk.forms[form]) {
      const n = Math.max(0, totalQs | 0);
      bk.forms[form] = {
        clearCount: Array(n).fill(0),
        total: n,
        masteryPlusLevel: 0,
        timeSpent: 0
      };
    } else if (totalQs && bk.forms[form].clearCount.length !== totalQs) {
      // resize carefully
      const old = bk.forms[form].clearCount;
      const next = Array(totalQs).fill(0);
      for (let i = 0; i < Math.min(old.length, totalQs); i++) next[i] = old[i] | 0;
      bk.forms[form].clearCount = next;
      bk.forms[form].total = totalQs;
    }
    return bk.forms[form];
  }

  function getOrInitBank(bankKey) {
    if (!data[bankKey]) data[bankKey] = { forms: {}, timeSpent: 0, masteryPlusLevel: 0 };
    return data[bankKey];
  }

  /** masteryPct 0–100 from first clears */
  function getPct(bankKey, form) {
    const f = data[bankKey] && data[bankKey].forms && data[bankKey].forms[form];
    if (!f || !f.total) return 0;
    const cleared = f.clearCount.filter((c) => c > 0).length;
    return Math.min(100, (cleared / f.total) * 100);
  }

  /** Effective % allowing 100+/150/200 via min clearCount layers (ATC getSectionEffectivePct) */
  function getEffectivePct(bankKey, form) {
    const f = data[bankKey] && data[bankKey].forms && data[bankKey].forms[form];
    if (!f || !f.clearCount || !f.clearCount.length) return 0;
    const arr = f.clearCount;
    let minCC = Infinity;
    for (let i = 0; i < arr.length; i++) minCC = Math.min(minCC, arr[i] | 0);
    if (minCC === Infinity) return 0;
    if (minCC === 0) return Math.min(99, getPct(bankKey, form));
    let beyond = 0;
    for (let i = 0; i < arr.length; i++) if ((arr[i] | 0) > minCC) beyond++;
    return minCC * 100 + (beyond / arr.length) * 100;
  }

  /** Aggregate bank effective = average of forms with data, or max */
  function getBankEffectivePct(bankKey) {
    const bk = data[bankKey];
    if (!bk || !bk.forms) return 0;
    const forms = Object.keys(bk.forms);
    if (!forms.length) return 0;
    let sum = 0;
    forms.forEach((f) => (sum += getEffectivePct(bankKey, f)));
    return sum / forms.length;
  }

  function getDisplayInfo(bankKey, form) {
    const pct = form ? getPct(bankKey, form) : Math.min(100, getBankEffectivePct(bankKey));
    if (pct <= 0) return null;
    return { pct: Math.round(pct) };
  }

  function badgeHTML(bankKey, form) {
    const eff = form ? getEffectivePct(bankKey, form) : getBankEffectivePct(bankKey);
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

  /** First correct lock-in (or Mastery+ re-clear) */
  function recordClear(bankKey, form, qIndex, totalQs) {
    const f = getOrInitForm(bankKey, form, totalQs);
    const i = qIndex | 0;
    if (i < 0 || i >= f.clearCount.length) return f;
    const level = session.masteryPlusLevel | 0;
    // Increment clearCount when answering at current mastery layer
    if ((f.clearCount[i] | 0) <= level) {
      f.clearCount[i] = (f.clearCount[i] | 0) + 1;
    }
    // Track DNSA if toggled for this question
    if (session.dnsaActive && level >= 1) {
      if (!dnsa[bankKey]) dnsa[bankKey] = {};
      dnsa[bankKey][form + '_' + i] = true;
      session.dnsaActive = false;
    }
    const cleared = f.clearCount.filter((c) => c > 0).length;
    getOrInitBank(bankKey);
    save();
    return { cleared, total: f.total, clearCount: f.clearCount[i] };
  }

  function isDNSA(bankKey, form, qIndex) {
    return !!(dnsa[bankKey] && dnsa[bankKey][form + '_' + qIndex]);
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

  function beginSession(bankKey, form, totalQs) {
    session.bankKey = bankKey;
    session.form = form;
    const f = getOrInitForm(bankKey, form, totalQs);
    session.masteryPlusLevel = f.masteryPlusLevel | 0;
    session.timerStart = Date.now();
    session.accumulated = 0;
    session.dnsaActive = false;
    updateProgressBar();
    updateDNSAUI();
  }

  function tickTime() {
    if (!session.bankKey || !session.form || !session.timerStart) return;
    const elapsed = Date.now() - session.timerStart;
    session.timerStart = Date.now();
    session.accumulated += elapsed;
    const f = getOrInitForm(session.bankKey, session.form);
    f.timeSpent = (f.timeSpent || 0) + elapsed;
    getOrInitBank(session.bankKey).timeSpent =
      (getOrInitBank(session.bankKey).timeSpent || 0) + elapsed;
    save();
  }

  function endSession() {
    tickTime();
    session.timerStart = null;
  }

  function activateMasteryPlus(bankKey, form) {
    const f = getOrInitForm(bankKey, form);
    f.masteryPlusLevel = (f.masteryPlusLevel | 0) + 1;
    session.masteryPlusLevel = f.masteryPlusLevel;
    getOrInitBank(bankKey).masteryPlusLevel = Math.max(
      getOrInitBank(bankKey).masteryPlusLevel | 0,
      f.masteryPlusLevel
    );
    save();
    return f.masteryPlusLevel;
  }

  /** Questions still needing clear at current Mastery+ layer (skip DNSA) */
  function progressiveQueue(bankKey, form) {
    const f = getOrInitForm(bankKey, form);
    const level = f.masteryPlusLevel | 0;
    const out = [];
    for (let i = 0; i < f.clearCount.length; i++) {
      if ((f.clearCount[i] | 0) <= level && !isDNSA(bankKey, form, i)) out.push(i);
    }
    return out;
  }

  function layerProgress(bankKey, form) {
    const f = getOrInitForm(bankKey, form);
    const level = session.masteryPlusLevel | 0;
    const total = f.clearCount.length || 1;
    let cleared = 0;
    for (let i = 0; i < f.clearCount.length; i++) {
      if ((f.clearCount[i] | 0) > level) cleared++;
    }
    return { cleared, total, level, basePct: (cleared / total) * 100 };
  }

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
      const pct = Math.min(99.99, basePct);
      bar.style.width = pct + '%';
      bar.style.background = '';
      bar.title = Math.round(pct) + '% mastery';
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

  function injectResultsMasteryUI(bankKey, form, container) {
    if (!container) return;
    let box = document.getElementById('masteryResultsBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'masteryResultsBox';
      box.className = 'mastery-results-box';
      container.appendChild(box);
    }
    const eff = getEffectivePct(bankKey, form);
    const f = getOrInitForm(bankKey, form);
    const pct = getPct(bankKey, form);
    const queue = progressiveQueue(bankKey, form);
    let html =
      '<div class="mastery-results-title">Mastery · Form ' +
      form +
      '</div>' +
      '<div class="mastery-results-pct">' +
      parseFloat(eff.toFixed(2)) +
      '%</div>' +
      '<div class="mastery-results-sub">' +
      f.clearCount.filter((c) => c > 0).length +
      ' / ' +
      f.total +
      ' cleared · Mastery+ L' +
      (f.masteryPlusLevel | 0) +
      '</div>';
    if (pct >= 100 || (f.clearCount.every((c) => c > (f.masteryPlusLevel | 0)) && f.total)) {
      html +=
        '<button type="button" class="btn-gold mastery-plus-btn" id="unlockMasteryPlusBtn">Unlock Mastery+(100%+) ✦</button>';
    }
    if (Object.keys(dnsa[bankKey] || {}).length) {
      html +=
        '<button type="button" class="btn-ghost" id="resetDnsaBtn" style="margin-top:8px">Reset DNSA filters</button>';
    }
    box.innerHTML = html;
    const unlock = box.querySelector('#unlockMasteryPlusBtn');
    if (unlock) {
      unlock.onclick = () => {
        const lvl = activateMasteryPlus(bankKey, form);
        if (typeof showToast === 'function') showToast('Mastery+ level ' + lvl + ' — progressive queue ready', 2800);
        injectResultsMasteryUI(bankKey, form, container);
        // Start progressive re-run of remaining layer questions
        if (global.StudyMastery._onMasteryPlusActivate) {
          global.StudyMastery._onMasteryPlusActivate(bankKey, form, progressiveQueue(bankKey, form));
        }
      };
    }
    const reset = box.querySelector('#resetDnsaBtn');
    if (reset) reset.onclick = () => {
      resetDNSA(bankKey);
      injectResultsMasteryUI(bankKey, form, container);
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
    if (!keys.length) return '<p class="profile-mastery-text">No mastery data yet — clear questions in a form.</p>';
    return keys
      .map((k) => {
        const eff = getBankEffectivePct(k);
        const cls =
          eff >= 100 ? 'high-mastery' : eff >= 40 ? 'mid-mastery' : '';
        const ts = formatDuration((data[k] && data[k].timeSpent) || 0);
        return (
          '<div class="profile-mastery-row"><span class="profile-mastery-text ' +
          cls +
          '">' +
          k +
          ' · ' +
          parseFloat(eff.toFixed(1)) +
          '%</span><span class="profile-mastery-time">' +
          ts +
          '</span></div>'
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

  load();
  // Accumulate time while quiz active
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
    getOrInitForm,
    getPct,
    getEffectivePct,
    getBankEffectivePct,
    getDisplayInfo,
    badgeHTML,
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
    getData: () => data,
    getSession: () => session,
    _MC,
    _onMasteryPlusActivate: null
  };
})(window);
