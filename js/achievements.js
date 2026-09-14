/* Study Portal — Achievements (ATC Quiz port: correct / wrong / mastery / streak / forms)
 * Dice / vibe / cosmic deferred — portal has no dice/vibe UX.
 */
(function (global) {
  const STORAGE_KEY = 'study_portal_achievements_v1';

  const CORRECT_MILESTONES = [1, 50, 100, 200, 500, 800, 1000];
  const WRONG_MILESTONES = [1, 10, 50, 100, 500, 1000, 1003, 1008];
  const STREAK_MILESTONES = [5, 10, 20, 35, 50];
  const FORMS_MILESTONES = [1, 4, 8];
  const MASTERY_IDS = ['mastery_100', 'mastery_plus', 'mastery_bank'];

  let data = defaultData();
  let sessionStreak = 0;
  let popupStyleInjected = false;

  function defaultData() {
    return {
      correct: { total: 0, unlockedMilestones: [] },
      wrong: { total: 0, unlockedMilestones: [] },
      streak: { best: 0, unlockedMilestones: [] },
      forms: { completed: [], unlockedMilestones: [] },
      mastery: { unlocked: [] },
      unlockDates: {}
    };
  }

  function loadAchievementData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      data = Object.assign(defaultData(), parsed);
      data.correct = Object.assign(defaultData().correct, parsed.correct || {});
      data.wrong = Object.assign(defaultData().wrong, parsed.wrong || {});
      data.streak = Object.assign(defaultData().streak, parsed.streak || {});
      data.forms = Object.assign(defaultData().forms, parsed.forms || {});
      data.mastery = Object.assign(defaultData().mastery, parsed.mastery || {});
      data.unlockDates = parsed.unlockDates || {};
      if (!Array.isArray(data.forms.completed)) data.forms.completed = [];
      if (!Array.isArray(data.mastery.unlocked)) data.mastery.unlocked = [];
    } catch (e) {
      console.warn('Failed to load achievements:', e);
    }
  }

  function saveAchievementData(opts) {
    opts = opts || {};
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save achievements:', e);
    }
    if (!opts.skipCloud && global.StudyProgress && typeof StudyProgress.notifyAchievementsSaved === 'function') {
      StudyProgress.notifyAchievementsSaved();
    }
  }

  function importData(incoming, opts) {
    opts = opts || {};
    const parsed = incoming && typeof incoming === 'object' ? incoming : {};
    data = Object.assign(defaultData(), parsed);
    data.correct = Object.assign(defaultData().correct, parsed.correct || {});
    data.wrong = Object.assign(defaultData().wrong, parsed.wrong || {});
    data.streak = Object.assign(defaultData().streak, parsed.streak || {});
    data.forms = Object.assign(defaultData().forms, parsed.forms || {});
    data.mastery = Object.assign(defaultData().mastery, parsed.mastery || {});
    data.unlockDates = parsed.unlockDates || {};
    if (!Array.isArray(data.forms.completed)) data.forms.completed = [];
    if (!Array.isArray(data.mastery.unlocked)) data.mastery.unlocked = [];
    saveAchievementData({ skipCloud: !!opts.skipCloud });
    refreshPanelIfOpen();
  }

  function getAchievementName(id) {
    const names = {
      correct_1: '✅ First Answer',
      correct_50: '✅ Half Century',
      correct_100: '✅ Century',
      correct_200: '✅ Double Century',
      correct_500: '✅ Master',
      correct_800: '✅ Programmed',
      correct_1000: '✅ Grandmaster',
      wrong_1: '❌ First Mistake',
      wrong_10: '❌ Learning the Hard Way',
      wrong_50: '❌ Will Not Happen Again',
      wrong_100: '❌ What Defines a Mistake',
      wrong_500: '❌ Unbreakable Will',
      wrong_1000: '❌ One Thousand and Still Moving',
      wrong_1003: '❌ Resilient',
      wrong_1008: "❌ Relentless, But That Doesn't Matter",
      streak_5: '🔥 Warming Up',
      streak_10: '🔥 On a Roll',
      streak_20: '🔥 Locked In',
      streak_35: '🔥 Unstoppable',
      streak_50: '🔥 Session Legend',
      forms_1: '📋 First Form Cleared',
      forms_4: '📋 Half the Bank',
      forms_8: '📋 Forms A–H Complete',
      mastery_100: '✦ Form Mastery',
      mastery_plus: '✦ Mastery+ Unlocked',
      mastery_bank: '✦ Bank Dominated'
    };
    return names[id] || id;
  }

  function getAchievementDesc(id) {
    const descs = {
      correct_1: 'Answered your first question correctly.',
      correct_50: 'Answered 50 questions correctly.',
      correct_100: 'Answered 100 questions correctly.',
      correct_200: 'Answered 200 questions correctly.',
      correct_500: 'Answered 500 questions correctly.',
      correct_800: 'Answered 800 questions correctly.',
      correct_1000: 'Answered 1000 questions correctly.',
      wrong_1: 'Got your first question wrong. Because you own all mistakes!',
      wrong_10: 'Got 10 questions wrong.',
      wrong_50: 'Got 50 questions wrong. Deserved...',
      wrong_100: 'Got 100 questions wrong. Part of the plan, am I right?',
      wrong_500: 'Got 500 questions wrong. Teacher of All Faults, your mighty breath, creates 100 out of 1+1..',
      wrong_1000: 'Got 1000 questions wrong. Logic has failed to find its way within you.',
      wrong_1003: 'Got 1003 questions wrong. Still standing. Barely.',
      wrong_1008: "Got 1008 questions wrong. Relentless — but that doesn't matter.",
      streak_5: '5 correct lock-ins in a row this session.',
      streak_10: '10 correct lock-ins in a row this session.',
      streak_20: '20 correct lock-ins in a row this session.',
      streak_35: '35 correct lock-ins in a row this session.',
      streak_50: '50 correct lock-ins in a row this session.',
      forms_1: 'Cleared your first form at 100%.',
      forms_4: 'Cleared 4 forms at 100%.',
      forms_8: 'Cleared all Forms A–H at 100%.',
      mastery_100: 'Hit 100% mastery on a form.',
      mastery_plus: 'Unlocked Mastery+ on a form.',
      mastery_bank: 'Every form in a bank at 100% mastery.'
    };
    return descs[id] || '';
  }

  function iconFor(id) {
    if (id.startsWith('correct_')) return '✅';
    if (id.startsWith('wrong_')) return '❌';
    if (id.startsWith('streak_')) return '🔥';
    if (id.startsWith('forms_')) return '📋';
    if (id.startsWith('mastery_')) return '✦';
    return '🏆';
  }

  function unlockAchievement(id) {
    if (!id) return false;
    let category = null;
    let milestone = null;
    let masteryKey = null;

    if (id.startsWith('correct_')) {
      category = 'correct';
      milestone = parseInt(id.split('_')[1], 10);
    } else if (id.startsWith('wrong_')) {
      category = 'wrong';
      milestone = parseInt(id.split('_')[1], 10);
    } else if (id.startsWith('streak_')) {
      category = 'streak';
      milestone = parseInt(id.split('_')[1], 10);
    } else if (id.startsWith('forms_')) {
      category = 'forms';
      milestone = parseInt(id.split('_')[1], 10);
    } else if (MASTERY_IDS.indexOf(id) !== -1) {
      masteryKey = id;
    } else {
      return false;
    }

    if (masteryKey) {
      if (data.mastery.unlocked.indexOf(masteryKey) !== -1) return false;
      data.mastery.unlocked.push(masteryKey);
      data.unlockDates[masteryKey] = Date.now();
      saveAchievementData();
      showAchievementPopup(masteryKey);
      refreshPanelIfOpen();
      return true;
    }

    if (!category || !milestone) return false;
    if (data[category].unlockedMilestones.indexOf(milestone) !== -1) return false;
    data[category].unlockedMilestones.push(milestone);
    data.unlockDates[id] = Date.now();
    saveAchievementData();
    showAchievementPopup(id);
    refreshPanelIfOpen();
    return true;
  }

  function checkMilestones(category, milestones, totalOrBest) {
    milestones.forEach(function (m) {
      if (totalOrBest >= m && data[category].unlockedMilestones.indexOf(m) === -1) {
        unlockAchievement(category + '_' + m);
      }
    });
  }

  function recordCorrect() {
    data.correct.total++;
    sessionStreak++;
    if (sessionStreak > data.streak.best) data.streak.best = sessionStreak;
    checkMilestones('correct', CORRECT_MILESTONES, data.correct.total);
    checkMilestones('streak', STREAK_MILESTONES, sessionStreak);
    saveAchievementData();
  }

  function recordWrong() {
    data.wrong.total++;
    sessionStreak = 0;
    checkMilestones('wrong', WRONG_MILESTONES, data.wrong.total);
    saveAchievementData();
  }

  /** Called when a form first hits 100% cleared */
  function recordFormMastery(formLetter, bankKey) {
    unlockAchievement('mastery_100');
    const letter = String(formLetter || '').toUpperCase();
    if (letter && data.forms.completed.indexOf(letter) === -1) {
      data.forms.completed.push(letter);
      checkMilestones('forms', FORMS_MILESTONES, data.forms.completed.length);
      saveAchievementData();
    }
    if (bankKey && window.StudyMastery && typeof StudyMastery.getPct === 'function') {
      // If all common forms A–H exist and are 100%, unlock bank
      tryBankMastery(bankKey);
    }
  }

  function tryBankMastery(bankKey) {
    if (!window.StudyMastery || typeof StudyMastery.getData !== 'function') return;
    const allData = StudyMastery.getData() || {};
    const bk = allData[bankKey];
    if (!bk || !bk.forms) return;
    const forms = Object.keys(bk.forms);
    if (!forms.length) return;
    let all = true;
    for (let i = 0; i < forms.length; i++) {
      const f = bk.forms[forms[i]];
      if (!f || !f.total) continue;
      const cleared = (f.clearCount || []).filter(function (c) { return c > 0; }).length;
      if (cleared < f.total) { all = false; break; }
    }
    // Require at least A–H shape (8 forms) or every known form cleared
    if (all && forms.length >= 8) unlockAchievement('mastery_bank');
  }

  function recordMasteryPlus() {
    unlockAchievement('mastery_plus');
  }

  function resetSessionStreak() {
    sessionStreak = 0;
  }

  function ensurePopupStyles() {
    if (popupStyleInjected) return;
    popupStyleInjected = true;
    const style = document.createElement('style');
    style.id = 'achievement-popup-keyframes';
    style.textContent =
      '@keyframes achievementSlideIn{from{opacity:0;transform:translateX(80px)}to{opacity:1;transform:translateX(0)}}' +
      '@keyframes achievementFadeOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(40px)}}';
    document.head.appendChild(style);
  }

  function showAchievementPopup(achievementId) {
    const name = getAchievementName(achievementId);
    const desc = getAchievementDesc(achievementId);
    ensurePopupStyles();
    const existing = document.getElementById('achievement-popup');
    if (existing) existing.remove();
    const popup = document.createElement('div');
    popup.id = 'achievement-popup';
    popup.innerHTML =
      '<div class="achievement-popup-content">' +
      '<div class="achievement-popup-icon">🏆</div>' +
      '<div class="achievement-popup-text">' +
      '<div class="achievement-popup-title">Achievement Unlocked!</div>' +
      '<div class="achievement-popup-name"></div>' +
      '<div class="achievement-popup-desc"></div>' +
      '</div></div>';
    popup.querySelector('.achievement-popup-name').textContent = name;
    popup.querySelector('.achievement-popup-desc').textContent = desc;
    document.body.appendChild(popup);
    setTimeout(function () {
      if (popup.parentNode) popup.remove();
    }, 4500);
  }

  function formatDate(ts) {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return '';
    }
  }

  function collectCards() {
    const cards = [];
    function pushMilestone(prefix, milestones, total, unlockedArr, icon) {
      const next = milestones.filter(function (m) {
        return m > total;
      })[0];
      milestones.forEach(function (m) {
        const unlocked = unlockedArr.indexOf(m) !== -1;
        const isNext = !unlocked && next === m;
        if (unlocked || isNext) {
          const id = prefix + '_' + m;
          cards.push({
            id: id,
            icon: icon,
            name: getAchievementName(id),
            desc: getAchievementDesc(id),
            unlocked: unlocked,
            date: formatDate(data.unlockDates[id])
          });
        }
      });
    }

    pushMilestone(
      'correct',
      CORRECT_MILESTONES,
      data.correct.total,
      data.correct.unlockedMilestones,
      '✅'
    );
    pushMilestone('wrong', WRONG_MILESTONES, data.wrong.total, data.wrong.unlockedMilestones, '❌');
    pushMilestone('streak', STREAK_MILESTONES, data.streak.best, data.streak.unlockedMilestones, '🔥');
    pushMilestone(
      'forms',
      FORMS_MILESTONES,
      data.forms.completed.length,
      data.forms.unlockedMilestones,
      '📋'
    );

    MASTERY_IDS.forEach(function (id) {
      const unlocked = data.mastery.unlocked.indexOf(id) !== -1;
      const nextLocked = MASTERY_IDS.find(function (x) {
        return data.mastery.unlocked.indexOf(x) === -1;
      });
      if (unlocked || id === nextLocked) {
        cards.push({
          id: id,
          icon: '✦',
          name: getAchievementName(id),
          desc: getAchievementDesc(id),
          unlocked: unlocked,
          date: formatDate(data.unlockDates[id])
        });
      }
    });

    cards.sort(function (a, b) {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      return 0;
    });
    return cards;
  }

  function renderAchievementsPanel() {
    const container = document.getElementById('achievements-list-container');
    if (!container) return;
    const cards = collectCards();
    const unlockedCount = cards.filter(function (c) {
      return c.unlocked;
    }).length;

    let statsHTML =
      '<div class="achievement-stats">' +
      '<div class="achievement-stat"><div class="achievement-stat-n" style="color:var(--success)">' +
      data.correct.total.toLocaleString() +
      '</div><div class="achievement-stat-l">Correct</div></div>' +
      '<div class="achievement-stat"><div class="achievement-stat-n" style="color:var(--error)">' +
      data.wrong.total.toLocaleString() +
      '</div><div class="achievement-stat-l">Wrong</div></div>' +
      '<div class="achievement-stat"><div class="achievement-stat-n" style="color:var(--gold)">' +
      data.streak.best.toLocaleString() +
      '</div><div class="achievement-stat-l">Best Streak</div></div>' +
      '<div class="achievement-stat"><div class="achievement-stat-n" style="color:var(--cyan-bright)">' +
      data.forms.completed.length.toLocaleString() +
      '</div><div class="achievement-stat-l">Forms Cleared</div></div>' +
      '</div>';

    let html = '';
    cards.forEach(function (a) {
      const cardClass = a.unlocked ? 'achievement-card unlocked' : 'achievement-card';
      const statusClass = a.unlocked ? 'unlocked-badge' : 'locked-badge';
      const statusLabel = a.unlocked ? 'Unlocked' : 'Locked';
      html +=
        '<div class="' +
        cardClass +
        '">' +
        '<div class="achievement-icon">' +
        a.icon +
        '</div>' +
        '<div class="achievement-body">' +
        '<div class="achievement-name"></div>' +
        '<div class="achievement-desc"></div>' +
        (a.unlocked && a.date
          ? '<div class="achievement-date"></div>'
          : '') +
        '</div>' +
        '<span class="achievement-status ' +
        statusClass +
        '">' +
        statusLabel +
        '</span>' +
        '</div>';
    });

    container.innerHTML =
      statsHTML +
      '<p class="achievement-count-line">' +
      unlockedCount +
      ' / ' +
      cards.length +
      ' shown · keep locking in</p>' +
      (html ||
        '<p class="achievement-empty">Start answering to unlock achievements!</p>');

    const cardEls = container.querySelectorAll('.achievement-card');
    cards.forEach(function (a, i) {
      const el = cardEls[i];
      if (!el) return;
      el.querySelector('.achievement-name').textContent = a.name;
      el.querySelector('.achievement-desc').textContent = a.desc;
      const dateEl = el.querySelector('.achievement-date');
      if (dateEl) dateEl.textContent = 'Unlocked ' + a.date;
    });
  }

  function refreshPanelIfOpen() {
    const overlay = document.getElementById('achievementsModal');
    if (overlay && overlay.classList.contains('show')) renderAchievementsPanel();
  }

  function openPanel() {
    let overlay = document.getElementById('achievementsModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'achievementsModal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML =
        '<div class="modal-card achievements-card" role="dialog" aria-modal="true" aria-labelledby="achievementsTitle">' +
        '<div class="achievements-hero">' +
        '<div class="achievements-hero-icon">🏆</div>' +
        '<div><h3 id="achievementsTitle">Achievements</h3>' +
        '<p class="profile-help">Milestones for correct lock-ins, wrong attempts, streaks, forms &amp; mastery.</p></div>' +
        '</div>' +
        '<div id="achievements-list-container" class="achievements-list"></div>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn-ghost" id="achievementsCloseBtn">Close</button>' +
        '</div></div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closePanel();
      });
      overlay.querySelector('#achievementsCloseBtn').addEventListener('click', closePanel);
    }
    renderAchievementsPanel();
    overlay.classList.add('show');
  }

  function closePanel() {
    const overlay = document.getElementById('achievementsModal');
    if (overlay) overlay.classList.remove('show');
  }

  /** Inject Achievements button into Profiles modal when present */
  function hookProfileModal() {
    const overlay = document.getElementById('profileModal');
    if (!overlay) return;
    if (overlay.querySelector('#profileAchievementsBtn')) return;
    const actions = overlay.querySelector('.modal-actions');
    if (!actions) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'profileAchievementsBtn';
    btn.className = 'btn-ghost';
    btn.textContent = '🏆 Achievements';
    btn.addEventListener('click', function () {
      openPanel();
    });
    actions.insertBefore(btn, actions.firstChild);
  }

  function start() {
    loadAchievementData();
    // Watch for profile modal opens
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!t) return;
      if (
        t.id === 'profileChip' ||
        (t.closest && t.closest('#profileChip'))
      ) {
        setTimeout(hookProfileModal, 60);
      }
    });
    // Also hook if already open / re-open via StudyProfiles
    if (window.StudyProfiles && typeof StudyProfiles.open === 'function' && !StudyProfiles.open._achHooked) {
      const orig = StudyProfiles.open;
      StudyProfiles.open = function () {
        const r = orig.apply(this, arguments);
        setTimeout(hookProfileModal, 60);
        return r;
      };
      StudyProfiles.open._achHooked = true;
    }
    // Mastery+ unlock hook
    if (window.StudyMastery && typeof StudyMastery.activateMasteryPlus === 'function' && !StudyMastery.activateMasteryPlus._achHooked) {
      const origMp = StudyMastery.activateMasteryPlus;
      StudyMastery.activateMasteryPlus = function () {
        const r = origMp.apply(this, arguments);
        recordMasteryPlus();
        return r;
      };
      StudyMastery.activateMasteryPlus._achHooked = true;
    }
  }

  global.StudyAchievements = {
    start: start,
    loadAchievementData: loadAchievementData,
    importData: importData,
    saveAchievementData: saveAchievementData,
    recordCorrect: recordCorrect,
    recordWrong: recordWrong,
    recordFormMastery: recordFormMastery,
    recordMasteryPlus: recordMasteryPlus,
    resetSessionStreak: resetSessionStreak,
    getData: function () {
      return data;
    },
    openPanel: openPanel,
    closePanel: closePanel,
    getAchievementName: getAchievementName,
    getAchievementDesc: getAchievementDesc
  };
})(window);
