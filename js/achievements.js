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
      correct_2000: '✅ 2,000 Correct',
      correct_3000: '✅ 3,000 Correct',
      correct_4000: '✅ 4,000 Correct',
      correct_5000: '✅ 5,000 Correct',
      correct_6000: '✅ 6,000 Correct',
      correct_7000: '✅ 7,000 Correct',
      correct_8000: '✅ 8,000 Correct',
      correct_9000: '✅ 9,000 Correct',
      correct_10000: '✅ 10,000 Correct',
      wrong_1: '❌ First Mistake',
      wrong_10: '❌ Learning the Hard Way',
      wrong_50: '❌ Building Resilience',
      wrong_100: '❌ Mistake Explorer',
      wrong_500: '❌ Persistent Learner',
      wrong_1000: '❌ Thousand Mistakes, Still Going',
      wrong_1003: '❌ Unstoppable Learner',
      wrong_1008: '❌ Relentless Progress',
      wrong_2000: '❌ 2,000 Mistakes',
      wrong_3000: '❌ 3,000 Mistakes',
      wrong_4000: '❌ 4,000 Mistakes',
      wrong_5000: '❌ 5,000 Mistakes',
      wrong_6000: '❌ 6,000 Mistakes',
      wrong_7000: '❌ 7,000 Mistakes',
      wrong_8000: '❌ 8,000 Mistakes',
      wrong_9000: '❌ 9,000 Mistakes',
      wrong_10000: '❌ 10,000 Mistakes',
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
      correct_2000: 'Answered 2,000 questions correctly.',
      correct_3000: 'Answered 3,000 questions correctly.',
      correct_4000: 'Answered 4,000 questions correctly.',
      correct_5000: 'Answered 5,000 questions correctly.',
      correct_6000: 'Answered 6,000 questions correctly.',
      correct_7000: 'Answered 7,000 questions correctly.',
      correct_8000: 'Answered 8,000 questions correctly.',
      correct_9000: 'Answered 9,000 questions correctly.',
      correct_10000: 'Answered 10,000 questions correctly.',
      wrong_1: 'Got your first question wrong. Every expert started here.',
      wrong_10: 'Got 10 questions wrong. Mistakes are how you improve.',
      wrong_50: 'Got 50 questions wrong. Each one teaches you something new.',
      wrong_100: 'Got 100 questions wrong. You\'re building real understanding.',
      wrong_500: 'Got 500 questions wrong. Persistence is paying off.',
      wrong_1000: 'Got 1000 questions wrong. You\'re still learning and growing.',
      wrong_1003: 'Got 1003 questions wrong. Keep going — progress never stops.',
      wrong_1008: 'Got 1008 questions wrong. Relentless effort leads to mastery.',
      wrong_2000: 'Got 2,000 questions wrong.',
      wrong_3000: 'Got 3,000 questions wrong.',
      wrong_4000: 'Got 4,000 questions wrong.',
      wrong_5000: 'Got 5,000 questions wrong.',
      wrong_6000: 'Got 6,000 questions wrong.',
      wrong_7000: 'Got 7,000 questions wrong.',
      wrong_8000: 'Got 8,000 questions wrong.',
      wrong_9000: 'Got 9,000 questions wrong.',
      wrong_10000: 'Got 10,000 questions wrong.',
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
    // pt1-quiz-upgrade: Mastery is stored per question id; the bank counts as
    // mastered when every question of every set card has been cleared once.
    if (!window.StudyMastery || typeof StudyMastery.isBankFullyCleared !== 'function') return;
    if (StudyMastery.isBankFullyCleared(bankKey)) unlockAchievement('mastery_bank');
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
    // always above whatever is open (e.g. the profile panel it was opened from)
    if (window.StudyLayers) StudyLayers.raise(overlay);
    overlay.classList.add('show');
    const cb = overlay.querySelector('#achievementsCloseBtn');
    if (cb) setTimeout(function () { try { cb.focus({ preventScroll: true }); } catch (e) {} }, 30);
  }

  function closePanel() {
    const overlay = document.getElementById('achievementsModal');
    if (overlay) overlay.classList.remove('show');
    // back to the profile it was opened from (still open underneath)
    const prof = document.getElementById('profileModal');
    if (prof && prof.classList.contains('show')) {
      const b = prof.querySelector('#profileAchievementsBtn');
      if (b) try { b.focus({ preventScroll: true }); } catch (e) {}
    }
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
    btn.className = 'btn-ghost btn-icon-text';
    btn.innerHTML = '<svg class="btn-ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V17h3v3H8v-3h3v-2.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3Zm0 4H6v1a2 2 0 0 0 1 1.7V7Zm10 0v2.7A2 2 0 0 0 18 8V7h-1Z" fill="currentColor"/></svg><span>Achievements</span>';
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
