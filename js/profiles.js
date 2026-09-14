/* Study Portal — Profiles (Anonymous Auth + Firestore) — ATC-inspired HUD */
(function (global) {
  const LEVEL_EVERY = 10;

  function levelFromAnswered(n) {
    return 1 + Math.floor(Math.max(0, n | 0) / LEVEL_EVERY);
  }
  function asInt(n) {
    return Math.floor(Number(n) || 0);
  }
  function expProgress(questionsAnswered) {
    const q = asInt(questionsAnswered);
    const into = q % LEVEL_EVERY;
    return {
      into,
      need: LEVEL_EVERY,
      pct: Math.min(100, (into / LEVEL_EVERY) * 100),
      level: levelFromAnswered(q)
    };
  }
  function initials(name) {
    const p = String(name || 'S').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return 'S';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[1][0]).toUpperCase();
  }
  function hueFromName(name) {
    let h = 0;
    const s = String(name || 'x');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  const state = {
    ready: false,
    user: null,
    profile: null,
    error: null,
    lastLevel: null
  };

  function toast(msg) {
    if (typeof showToast === 'function') showToast(msg, 2800);
  }

  function ensureFirebase() {
    if (!global.firebase) throw new Error('Firebase SDK missing');
    if (!global.FIREBASE_CONFIG) throw new Error('FIREBASE_CONFIG missing');
    if (!firebase.apps.length) firebase.initializeApp(global.FIREBASE_CONFIG);
    return { auth: firebase.auth(), db: firebase.firestore() };
  }

  function defaultName() {
    return 'Scholar ' + Math.floor(1000 + Math.random() * 9000);
  }

  function normalizeProfile(data) {
    const questionsAnswered = asInt(data && data.questionsAnswered);
    const level = asInt((data && data.level) || levelFromAnswered(questionsAnswered)) || 1;
    return {
      displayName: String((data && data.displayName) || defaultName()).slice(0, 40),
      photoURL: (data && data.photoURL) || '',
      bio: (data && data.bio) || '',
      mood: (data && data.mood) || '',
      questionsAnswered,
      level,
      createdAt: (data && data.createdAt) || Date.now(),
      updatedAt: (data && data.updatedAt) || Date.now()
    };
  }

  async function ensureProfile(uid) {
    const { db } = ensureFirebase();
    const ref = db.collection('profiles').doc(uid);
    const snap = await ref.get();
    if (snap.exists) {
      state.profile = normalizeProfile(snap.data());
      state.lastLevel = state.profile.level;
      return state.profile;
    }
    const profile = normalizeProfile({
      displayName: defaultName(),
      questionsAnswered: 0,
      level: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    await ref.set(profile);
    state.profile = profile;
    state.lastLevel = profile.level;
    return profile;
  }

  async function start() {
    try {
      const { auth } = ensureFirebase();
      await new Promise((resolve, reject) => {
        const unsub = auth.onAuthStateChanged(async (user) => {
          try {
            if (!user) {
              const cred = await auth.signInAnonymously();
              state.user = cred.user;
              await ensureProfile(cred.user.uid);
            } else {
              state.user = user;
              await ensureProfile(user.uid);
            }
            state.ready = true;
            state.error = null;
            unsub();
            resolve();
          } catch (e) {
            unsub();
            reject(e);
          }
        }, reject);
      });
      renderChip();
      return state.profile;
    } catch (e) {
      console.error(e);
      state.error = e;
      state.ready = false;
      throw e;
    }
  }

  async function saveDisplayName(name) {
    const cleaned = String(name || '').trim().slice(0, 40);
    if (cleaned.length < 1) throw new Error('Name is required');
    if (!state.user) await start();
    const { db } = ensureFirebase();
    const q = asInt(state.profile && state.profile.questionsAnswered);
    const payload = normalizeProfile({
      displayName: cleaned,
      photoURL: (state.profile && state.profile.photoURL) || '',
      bio: (state.profile && state.profile.bio) || '',
      mood: (state.profile && state.profile.mood) || '',
      questionsAnswered: q,
      level: levelFromAnswered(q),
      createdAt: (state.profile && state.profile.createdAt) || Date.now(),
      updatedAt: Date.now()
    });
    await db.collection('profiles').doc(state.user.uid).set(payload);
    state.profile = payload;
    renderChip();
    fillModal();
    return payload;
  }

  function celebrateLevelUp(newLevel) {
    const chip = document.getElementById('profileChip');
    if (chip) {
      chip.classList.remove('lvl-up');
      void chip.offsetWidth;
      chip.classList.add('lvl-up');
      setTimeout(() => chip.classList.remove('lvl-up'), 1400);
    }
    let tag = document.getElementById('profileLvlToast');
    if (!tag) {
      tag = document.createElement('div');
      tag.id = 'profileLvlToast';
      tag.className = 'profile-lvl-toast';
      document.body.appendChild(tag);
    }
    tag.textContent = 'LEVEL UP! ' + newLevel;
    tag.classList.add('show');
    clearTimeout(celebrateLevelUp._t);
    celebrateLevelUp._t = setTimeout(() => tag.classList.remove('show'), 1600);
    toast('Level ' + newLevel + ' — nice');
  }

  async function bumpQuestionsAnswered(by) {
    const add = Math.max(1, by | 0);
    try {
      if (!state.user) await start();
      const { db } = ensureFirebase();
      const uid = state.user.uid;
      const ref = db.collection('profiles').doc(uid);
      let leveled = null;
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const cur = snap.exists ? normalizeProfile(snap.data()) : normalizeProfile({});
        const questionsAnswered = asInt(cur.questionsAnswered) + add;
        const level = levelFromAnswered(questionsAnswered);
        const payload = normalizeProfile(Object.assign({}, cur, {
          questionsAnswered,
          level,
          updatedAt: Date.now()
        }));
        tx.set(ref, payload);
        if (state.lastLevel != null && level > state.lastLevel) leveled = level;
        state.lastLevel = level;
        state.profile = payload;
      });
      renderChip();
      fillModal();
      if (leveled != null) celebrateLevelUp(leveled);
    } catch (e) {
      console.warn('profile bump failed', e);
    }
  }

  function renderChip() {
    let chip = document.getElementById('profileChip');
    if (!chip) {
      chip = document.createElement('button');
      chip.type = 'button';
      chip.id = 'profileChip';
      chip.className = 'profile-chip';
      chip.title = 'Your profile';
      chip.addEventListener('click', () => openProfileModal());
      const dock = document.getElementById('timerDock');
      if (dock && dock.parentNode) dock.parentNode.insertBefore(chip, dock);
      else document.body.appendChild(chip);
    }
    const p = state.profile;
    if (!p) {
      chip.innerHTML = '<span class="pc-name">Profile</span>';
      return;
    }
    const prog = expProgress(p.questionsAnswered);
    const hue = hueFromName(p.displayName);
    chip.innerHTML =
      '<span class="pc-avatar" style="--av-hue:' + hue + '"><span class="pc-av-aura"></span><span class="pc-av-core">' +
      initials(p.displayName) +
      '</span></span>' +
      '<span class="pc-body">' +
      '<span class="pc-top"><span class="pc-name"></span><span class="pc-lvl">LV ' + prog.level + '</span></span>' +
      '<span class="pc-bars">' +
      '<span class="pc-bar-row"><span class="pc-bar-lab exp">XP</span>' +
      '<span class="pc-bar-track"><span class="pc-bar-fill exp" style="width:' + prog.pct + '%"></span></span></span>' +
      '</span>' +
      '<span class="pc-meta"></span>' +
      '</span>';
    chip.querySelector('.pc-name').textContent = p.displayName;
    chip.querySelector('.pc-meta').textContent =
      prog.into + '/' + prog.need + ' to next · ' + asInt(p.questionsAnswered) + ' Qs';
  }

  function openProfileModal() {
    let overlay = document.getElementById('profileModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'profileModal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML =
        '<div class="modal-card profile-card" role="dialog" aria-modal="true" aria-labelledby="profileTitle">' +
        '<div class="profile-hero">' +
        '<div class="profile-hero-av" id="profileHeroAv"><span class="pc-av-aura"></span><span class="pc-av-core" id="profileHeroInit">S</span></div>' +
        '<div class="profile-hero-text">' +
        '<h3 id="profileTitle">Commander profile</h3>' +
        '<p class="profile-help">Callsign, rank, and sortie count. Level rises every 10 correct lock-ins.</p>' +
        '</div></div>' +
        '<label class="profile-label" for="profileNameInput">Callsign</label>' +
        '<input id="profileNameInput" class="profile-input" maxlength="40" autocomplete="nickname" placeholder="Your display name" />' +
        '<div class="profile-xp-wrap">' +
        '<div class="profile-xp-head"><span>EXP</span><span id="profileXpLabel">0 / 10</span></div>' +
        '<div class="pc-bar-track lg"><span class="pc-bar-fill exp" id="profileXpFill" style="width:0%"></span></div>' +
        '</div>' +
        '<div class="profile-stats">' +
        '<div><span class="ps-k">Level</span><span class="ps-v" id="profileLevelVal">1</span></div>' +
        '<div><span class="ps-k">Questions answered</span><span class="ps-v" id="profileQsVal">0</span></div>' +
        '</div>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn-ghost" id="profileCloseBtn">Close</button>' +
        '<button type="button" class="btn-gold" id="profileSaveBtn">Save callsign</button>' +
        '</div>' +
        '<p class="profile-foot" id="profileStatus"></p>' +
        '</div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeProfileModal();
      });
      overlay.querySelector('#profileCloseBtn').addEventListener('click', closeProfileModal);
      overlay.querySelector('#profileSaveBtn').addEventListener('click', async () => {
        const input = overlay.querySelector('#profileNameInput');
        const status = overlay.querySelector('#profileStatus');
        try {
          status.textContent = 'Saving…';
          await saveDisplayName(input.value);
          status.textContent = 'Saved';
          toast('Callsign locked in');
        } catch (e) {
          status.textContent = e.message || 'Save failed';
        }
      });
      overlay.querySelector('#profileNameInput').addEventListener('input', () => {
        const v = overlay.querySelector('#profileNameInput').value || 'S';
        const el = document.getElementById('profileHeroInit');
        const av = document.getElementById('profileHeroAv');
        if (el) el.textContent = initials(v);
        if (av) av.style.setProperty('--av-hue', hueFromName(v));
      });
    }
    fillModal();
    overlay.classList.add('show');
    setTimeout(() => {
      const input = overlay.querySelector('#profileNameInput');
      if (input) input.focus();
    }, 50);
  }

  function fillModal() {
    const p = state.profile || normalizeProfile({});
    const prog = expProgress(p.questionsAnswered);
    const input = document.getElementById('profileNameInput');
    const lv = document.getElementById('profileLevelVal');
    const qs = document.getElementById('profileQsVal');
    const fill = document.getElementById('profileXpFill');
    const lab = document.getElementById('profileXpLabel');
    const init = document.getElementById('profileHeroInit');
    const av = document.getElementById('profileHeroAv');
    if (input) input.value = p.displayName || '';
    if (lv) lv.textContent = String(prog.level);
    if (qs) qs.textContent = String(asInt(p.questionsAnswered));
    if (fill) fill.style.width = prog.pct + '%';
    if (lab) lab.textContent = prog.into + ' / ' + prog.need + ' to LV ' + (prog.level + 1);
    if (init) init.textContent = initials(p.displayName);
    if (av) av.style.setProperty('--av-hue', hueFromName(p.displayName));
  }

  function closeProfileModal() {
    const overlay = document.getElementById('profileModal');
    if (overlay) overlay.classList.remove('show');
  }

  global.StudyProfiles = {
    start,
    open: openProfileModal,
    bumpQuestionsAnswered,
    getProfile: () => state.profile,
    isReady: () => state.ready
  };
})(window);
