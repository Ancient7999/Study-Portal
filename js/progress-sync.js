/* Study Portal — Progress sync (localStorage ↔ Firestore progress/{uid}) */
(function (global) {
  const FORMS_LETTERS = 'ABCDEFGH'.split('');
  const DEBOUNCE_MS = 1200;
  const FORM_PREFIX = 'pt1_form_';
  const POMO_LS = 'pt1_pomodoro_enabled';
  const FRIENDS_LS = 'study_portal_friends_v1';

  let pushTimer = null;
  let syncing = false;
  let lastUid = null;
  let started = false;

  function ensureFirebase() {
    if (!global.firebase) throw new Error('Firebase SDK missing');
    if (!global.FIREBASE_CONFIG) throw new Error('FIREBASE_CONFIG missing');
    if (!firebase.apps.length) firebase.initializeApp(global.FIREBASE_CONFIG);
    return { auth: firebase.auth(), db: firebase.firestore() };
  }

  function lsGet(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }
  function lsSet(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  }

  function getPomodoroEnabledLocal() {
    const v = lsGet(POMO_LS);
    if (v === null || v === undefined || v === '') return true; // default ON
    return v !== '0' && v !== 'false';
  }

  function setPomodoroEnabledLocal(on) {
    lsSet(POMO_LS, on ? '1' : '0');
    if (typeof global.setPomodoroEnabled === 'function') {
      try {
        global.setPomodoroEnabled(!!on, { fromSync: true });
      } catch (e) {}
    }
  }

  function getFriendsLocal() {
    try {
      const raw = lsGet(FRIENDS_LS);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter(function (f) {
          return f && typeof f.uid === 'string' && f.uid;
        })
        .map(function (f) {
          return {
            uid: String(f.uid),
            displayName: String(f.displayName || 'Scholar').slice(0, 40)
          };
        })
        .slice(0, 40);
    } catch (e) {
      return [];
    }
  }

  function setFriendsLocal(list) {
    const cleaned = (list || [])
      .filter(function (f) {
        return f && f.uid;
      })
      .map(function (f) {
        return {
          uid: String(f.uid),
          displayName: String(f.displayName || 'Scholar').slice(0, 40)
        };
      })
      .slice(0, 40);
    try {
      lsSet(FRIENDS_LS, JSON.stringify(cleaned));
    } catch (e) {}
    if (global.StudyChat && typeof StudyChat.applyFriendsFromCloud === 'function') {
      try {
        StudyChat.applyFriendsFromCloud(cleaned);
      } catch (e) {}
    }
  }

  function mergeFriends(localF, cloudF) {
    const byUid = {};
    (cloudF || []).forEach(function (f) {
      if (f && f.uid) byUid[String(f.uid)] = { uid: String(f.uid), displayName: String(f.displayName || 'Scholar').slice(0, 40) };
    });
    (localF || []).forEach(function (f) {
      if (!f || !f.uid) return;
      const id = String(f.uid);
      const name = String(f.displayName || 'Scholar').slice(0, 40);
      if (!byUid[id]) byUid[id] = { uid: id, displayName: name };
      else if (name && name !== 'Scholar') byUid[id].displayName = name;
    });
    return Object.keys(byUid)
      .map(function (k) {
        return byUid[k];
      })
      .slice(0, 40);
  }

  function currentUid() {
    try {
      const u = firebase.auth().currentUser;
      return u ? u.uid : null;
    } catch (e) {
      return null;
    }
  }

  function collectLocalForms() {
    const forms = {};
    FORMS_LETTERS.forEach(function (L) {
      const bestRaw = lsGet(FORM_PREFIX + L + '_best_pct');
      const done = lsGet(FORM_PREFIX + L + '_done');
      const score = lsGet(FORM_PREFIX + L + '_score');
      const runPct = lsGet(FORM_PREFIX + L + '_run_pct');
      const runState = lsGet(FORM_PREFIX + L + '_run_state');
      if (bestRaw == null && done == null && score == null && runPct == null && runState == null) return;
      const bestPct = Math.max(0, Math.min(100, parseInt(bestRaw || '0', 10) || 0));
      const entry = {
        bestPct: bestPct,
        done: done === '1' || bestPct >= 100,
        score: score != null ? String(score) : ''
      };
      if (runPct != null) {
        const rp = parseInt(runPct, 10);
        if (Number.isFinite(rp)) entry.runPct = Math.max(0, Math.min(100, rp));
      }
      if (runState) {
        try {
          entry.runState = JSON.parse(runState);
        } catch (e) {}
      }
      forms[L] = entry;
    });
    return forms;
  }

  function applyFormsToLocal(forms) {
    if (!forms || typeof forms !== 'object') return;
    Object.keys(forms).forEach(function (L) {
      const f = forms[L];
      if (!f || typeof f !== 'object') return;
      const best = Math.max(0, Math.min(100, Math.round(Number(f.bestPct) || 0)));
      const prev = Math.max(0, parseInt(lsGet(FORM_PREFIX + L + '_best_pct') || '0', 10) || 0);
      lsSet(FORM_PREFIX + L + '_best_pct', String(Math.max(prev, best)));
      if (f.done || best >= 100) lsSet(FORM_PREFIX + L + '_done', '1');
      if (f.score != null && String(f.score) !== '') {
        const cur = lsGet(FORM_PREFIX + L + '_score');
        const nNew = parseFloat(f.score);
        const nCur = cur != null ? parseFloat(cur) : NaN;
        if (!Number.isFinite(nCur) || (Number.isFinite(nNew) && nNew >= nCur)) {
          lsSet(FORM_PREFIX + L + '_score', String(f.score));
        }
      }
      if (typeof f.runPct === 'number') {
        const curR = parseInt(lsGet(FORM_PREFIX + L + '_run_pct') || '0', 10) || 0;
        if (f.runPct >= curR) lsSet(FORM_PREFIX + L + '_run_pct', String(f.runPct));
      }
      if (f.runState && typeof f.runState === 'object') {
        const existing = lsGet(FORM_PREFIX + L + '_run_state');
        let keep = true;
        if (existing) {
          try {
            const ex = JSON.parse(existing);
            if ((ex.updated || 0) > (f.runState.updated || 0)) keep = false;
          } catch (e) {}
        }
        if (keep) lsSet(FORM_PREFIX + L + '_run_state', JSON.stringify(f.runState));
      }
    });
    if (typeof global.renderFormCards === 'function') {
      try {
        global.renderFormCards();
      } catch (e) {}
    }
  }

  function collectLocalBundle() {
    const mastery =
      global.StudyMastery && typeof StudyMastery.getData === 'function'
        ? JSON.parse(JSON.stringify(StudyMastery.getData() || {}))
        : {};
    const dnsa =
      global.StudyMastery && typeof StudyMastery.getDnsa === 'function'
        ? JSON.parse(JSON.stringify(StudyMastery.getDnsa() || {}))
        : {};
    const achievements =
      global.StudyAchievements && typeof StudyAchievements.getData === 'function'
        ? JSON.parse(JSON.stringify(StudyAchievements.getData() || {}))
        : {};
    return {
      mastery: mastery,
      dnsa: dnsa,
      achievements: achievements,
      forms: collectLocalForms(),
      pomodoroEnabled: getPomodoroEnabledLocal(),
      friends: getFriendsLocal(),
      updatedAt: Date.now()
    };
  }

  function mergeClearCounts(a, b) {
    const la = Array.isArray(a) ? a : [];
    const lb = Array.isArray(b) ? b : [];
    const n = Math.max(la.length, lb.length);
    const out = [];
    for (let i = 0; i < n; i++) out.push(Math.max(la[i] | 0, lb[i] | 0));
    return out;
  }

  function mergeMastery(localM, cloudM) {
    const out = {};
    const keys = {};
    Object.keys(localM || {}).forEach(function (k) {
      keys[k] = true;
    });
    Object.keys(cloudM || {}).forEach(function (k) {
      keys[k] = true;
    });
    Object.keys(keys).forEach(function (bankKey) {
      const L = (localM && localM[bankKey]) || {};
      const C = (cloudM && cloudM[bankKey]) || {};
      const forms = {};
      const fKeys = {};
      Object.keys(L.forms || {}).forEach(function (f) {
        fKeys[f] = true;
      });
      Object.keys(C.forms || {}).forEach(function (f) {
        fKeys[f] = true;
      });
      Object.keys(fKeys).forEach(function (f) {
        const lf = (L.forms && L.forms[f]) || {};
        const cf = (C.forms && C.forms[f]) || {};
        const clearCount = mergeClearCounts(lf.clearCount, cf.clearCount);
        forms[f] = {
          clearCount: clearCount,
          total: Math.max(lf.total | 0, cf.total | 0, clearCount.length),
          masteryPlusLevel: Math.max(lf.masteryPlusLevel | 0, cf.masteryPlusLevel | 0),
          timeSpent: Math.max(lf.timeSpent || 0, cf.timeSpent || 0)
        };
      });
      out[bankKey] = {
        forms: forms,
        timeSpent: Math.max(L.timeSpent || 0, C.timeSpent || 0),
        masteryPlusLevel: Math.max(L.masteryPlusLevel | 0, C.masteryPlusLevel | 0)
      };
    });
    return out;
  }

  function mergeDnsa(localD, cloudD) {
    const out = {};
    const keys = {};
    Object.keys(localD || {}).forEach(function (k) {
      keys[k] = true;
    });
    Object.keys(cloudD || {}).forEach(function (k) {
      keys[k] = true;
    });
    Object.keys(keys).forEach(function (bk) {
      out[bk] = Object.assign({}, (cloudD && cloudD[bk]) || {}, (localD && localD[bk]) || {});
    });
    return out;
  }

  function uniqNums(arr) {
    const s = {};
    (arr || []).forEach(function (n) {
      s[n] = true;
    });
    return Object.keys(s)
      .map(Number)
      .filter(function (n) {
        return Number.isFinite(n);
      })
      .sort(function (a, b) {
        return a - b;
      });
  }

  function uniqStrs(arr) {
    const s = {};
    (arr || []).forEach(function (x) {
      if (x != null && x !== '') s[String(x)] = true;
    });
    return Object.keys(s);
  }

  function mergeAchievements(localA, cloudA) {
    const L = localA || {};
    const C = cloudA || {};
    function cat(name, extra) {
      const lc = L[name] || {};
      const cc = C[name] || {};
      const base = {
        unlockedMilestones: uniqNums([].concat(lc.unlockedMilestones || [], cc.unlockedMilestones || []))
      };
      if (extra === 'total') base.total = Math.max(lc.total | 0, cc.total | 0);
      if (extra === 'best') base.best = Math.max(lc.best | 0, cc.best | 0);
      if (extra === 'completed') {
        base.completed = uniqStrs([].concat(lc.completed || [], cc.completed || []));
      }
      return base;
    }
    const unlockDates = Object.assign({}, C.unlockDates || {}, L.unlockDates || {});
    // Prefer earlier unlock timestamp when both exist
    Object.keys(C.unlockDates || {}).forEach(function (id) {
      if (L.unlockDates && L.unlockDates[id] != null) {
        unlockDates[id] = Math.min(L.unlockDates[id], C.unlockDates[id]);
      }
    });
    return {
      correct: cat('correct', 'total'),
      wrong: cat('wrong', 'total'),
      streak: cat('streak', 'best'),
      forms: cat('forms', 'completed'),
      mastery: {
        unlocked: uniqStrs([].concat((L.mastery && L.mastery.unlocked) || [], (C.mastery && C.mastery.unlocked) || []))
      },
      unlockDates: unlockDates
    };
  }

  function mergeForms(localF, cloudF) {
    const out = {};
    const keys = {};
    Object.keys(localF || {}).forEach(function (k) {
      keys[k] = true;
    });
    Object.keys(cloudF || {}).forEach(function (k) {
      keys[k] = true;
    });
    Object.keys(keys).forEach(function (L) {
      const a = (localF && localF[L]) || {};
      const b = (cloudF && cloudF[L]) || {};
      const bestPct = Math.max(Number(a.bestPct) || 0, Number(b.bestPct) || 0);
      const entry = {
        bestPct: Math.max(0, Math.min(100, bestPct)),
        done: !!(a.done || b.done || bestPct >= 100),
        score: ''
      };
      const sa = a.score != null && a.score !== '' ? parseFloat(a.score) : NaN;
      const sb = b.score != null && b.score !== '' ? parseFloat(b.score) : NaN;
      if (Number.isFinite(sa) || Number.isFinite(sb)) {
        entry.score = String(Math.max(Number.isFinite(sa) ? sa : 0, Number.isFinite(sb) ? sb : 0));
      } else if (a.score) entry.score = String(a.score);
      else if (b.score) entry.score = String(b.score);
      const ra = typeof a.runPct === 'number' ? a.runPct : -1;
      const rb = typeof b.runPct === 'number' ? b.runPct : -1;
      if (Math.max(ra, rb) >= 0) entry.runPct = Math.max(ra, rb);
      const rsa = a.runState && typeof a.runState === 'object' ? a.runState : null;
      const rsb = b.runState && typeof b.runState === 'object' ? b.runState : null;
      if (rsa || rsb) {
        if (rsa && rsb) entry.runState = (rsa.updated || 0) >= (rsb.updated || 0) ? rsa : rsb;
        else entry.runState = rsa || rsb;
      }
      out[L] = entry;
    });
    return out;
  }

  function mergeProgress(localBundle, cloudBundle) {
    const L = localBundle || {};
    const C = cloudBundle || {};
    // Settings: cloud wins when it has an explicit boolean (account preference)
    var pomo =
      C && typeof C.pomodoroEnabled === 'boolean'
        ? C.pomodoroEnabled
        : L && typeof L.pomodoroEnabled === 'boolean'
          ? L.pomodoroEnabled
          : true;
    return {
      mastery: mergeMastery(L.mastery, C.mastery),
      dnsa: mergeDnsa(L.dnsa, C.dnsa),
      achievements: mergeAchievements(L.achievements, C.achievements),
      forms: mergeForms(L.forms, C.forms),
      pomodoroEnabled: pomo,
      friends: mergeFriends(L.friends, C.friends),
      updatedAt: Date.now()
    };
  }

  function applyBundleLocally(bundle, opts) {
    opts = opts || {};
    if (!bundle) return;
    if (global.StudyMastery && typeof StudyMastery.importData === 'function') {
      StudyMastery.importData(bundle.mastery || {}, bundle.dnsa || {}, { skipCloud: true });
    }
    if (global.StudyAchievements && typeof StudyAchievements.importData === 'function') {
      StudyAchievements.importData(bundle.achievements || {}, { skipCloud: true });
    }
    applyFormsToLocal(bundle.forms || {});
    if (typeof bundle.pomodoroEnabled === 'boolean') {
      setPomodoroEnabledLocal(bundle.pomodoroEnabled);
    }
    if (Array.isArray(bundle.friends)) {
      setFriendsLocal(bundle.friends);
    }
    if (opts.refreshHub && typeof global.renderFormCards === 'function') {
      try {
        global.renderFormCards();
      } catch (e) {}
    }
  }

  async function fetchCloud(uid) {
    const { db } = ensureFirebase();
    const snap = await db.collection('progress').doc(uid).get();
    if (!snap.exists) return null;
    return snap.data() || null;
  }

  async function writeCloud(uid, bundle) {
    const { db } = ensureFirebase();
    const payload = {
      mastery: bundle.mastery || {},
      dnsa: bundle.dnsa || {},
      achievements: bundle.achievements || {},
      forms: bundle.forms || {},
      pomodoroEnabled:
        typeof bundle.pomodoroEnabled === 'boolean' ? bundle.pomodoroEnabled : getPomodoroEnabledLocal(),
      friends: Array.isArray(bundle.friends) ? bundle.friends : getFriendsLocal(),
      updatedAt: Date.now()
    };
    await db.collection('progress').doc(uid).set(payload, { merge: true });
    return payload;
  }

  async function pushAll() {
    const uid = currentUid();
    if (!uid || syncing) return null;
    try {
      syncing = true;
      const bundle = collectLocalBundle();
      await writeCloud(uid, bundle);
      return bundle;
    } catch (e) {
      console.warn('StudyProgress push failed', e);
      return null;
    } finally {
      syncing = false;
    }
  }

  function schedulePush() {
    if (!currentUid()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      pushAll();
    }, DEBOUNCE_MS);
  }

  function syncFormsFromLocal() {
    schedulePush();
  }

  function notifyMasterySaved() {
    schedulePush();
  }

  function notifyAchievementsSaved() {
    schedulePush();
  }

  /**
   * Pull cloud, merge with local (max wins), write both ways.
   * guestSnapshot: optional pre-captured local bundle (for credential-already-in-use merges).
   */
  async function pullAndMerge(guestSnapshot) {
    const uid = currentUid();
    if (!uid) return null;
    try {
      syncing = true;
      const local = guestSnapshot || collectLocalBundle();
      const cloud = await fetchCloud(uid);
      const merged = mergeProgress(local, cloud || {});
      applyBundleLocally(merged, { refreshHub: true });
      await writeCloud(uid, merged);
      lastUid = uid;
      return merged;
    } catch (e) {
      console.warn('StudyProgress pullAndMerge failed', e);
      return null;
    } finally {
      syncing = false;
    }
  }

  async function onAuthReady(user) {
    if (!user) return;
    if (lastUid && lastUid !== user.uid) {
      // Switched accounts — merge guest/local into new account
      await pullAndMerge();
    } else if (!lastUid) {
      await pullAndMerge();
    } else {
      // Same uid (e.g. anonymous → linked) — push local then soft pull
      await pullAndMerge();
    }
    lastUid = user.uid;
  }

  async function start() {
    if (started) return;
    started = true;
    try {
      ensureFirebase();
      // Handle Google redirect return
      const auth = firebase.auth();
      try {
        const result = await auth.getRedirectResult();
        if (result && result.user) {
          await pullAndMerge();
        }
      } catch (e) {
        console.warn('getRedirectResult', e);
      }
    } catch (e) {
      console.warn('StudyProgress start', e);
    }
  }

  /** Snapshot local progress before signing into another account */
  function snapshotLocal() {
    return collectLocalBundle();
  }

  global.StudyProgress = {
    start: start,
    collectLocalForms: collectLocalForms,
    syncFormsFromLocal: syncFormsFromLocal,
    getPomodoroEnabled: getPomodoroEnabledLocal,
    setPomodoroEnabled: function (on) {
      setPomodoroEnabledLocal(!!on);
      schedulePush();
    },
    getFriends: getFriendsLocal,
    setFriends: function (list) {
      setFriendsLocal(list);
      schedulePush();
    },
    notifyMasterySaved: notifyMasterySaved,
    notifyAchievementsSaved: notifyAchievementsSaved,
    schedulePush: schedulePush,
    pushAll: pushAll,
    pullAndMerge: pullAndMerge,
    onAuthReady: onAuthReady,
    snapshotLocal: snapshotLocal,
    mergeProgress: mergeProgress,
    applyFormsToLocal: applyFormsToLocal,
    collectLocalBundle: collectLocalBundle
  };
})(window);
