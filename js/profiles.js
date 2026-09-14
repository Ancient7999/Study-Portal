/* Study Portal — Profiles (Anonymous Auth + Firestore) */
(function (global) {
  const LEVEL_EVERY = 10; // 10 correct answers → +1 level

  function levelFromAnswered(n) {
    return 1 + Math.floor(Math.max(0, n | 0) / LEVEL_EVERY);
  }
  function asInt(n) {
    return Math.floor(Number(n) || 0);
  }

  const state = {
    ready: false,
    user: null,
    profile: null,
    error: null
  };

  function toast(msg) {
    if (typeof showToast === 'function') showToast(msg, 2800);
    else if (typeof portalToast === 'function') portalToast(msg);
  }

  function ensureFirebase() {
    if (!global.firebase) throw new Error('Firebase SDK missing');
    if (!global.FIREBASE_CONFIG) throw new Error('FIREBASE_CONFIG missing');
    if (!firebase.apps.length) firebase.initializeApp(global.FIREBASE_CONFIG);
    return {
      auth: firebase.auth(),
      db: firebase.firestore()
    };
  }

  function defaultName() {
    const n = Math.floor(1000 + Math.random() * 9000);
    return 'Scholar ' + n;
  }

  async function ensureProfile(uid) {
    const { db } = ensureFirebase();
    const ref = db.collection('profiles').doc(uid);
    const snap = await ref.get();
    const now = Date.now();
    if (snap.exists) {
      const data = snap.data();
      // normalize fields
      const questionsAnswered = (data.questionsAnswered | 0);
      const level = data.level | 0 || levelFromAnswered(questionsAnswered);
      const profile = Object.assign({}, data, {
        displayName: (data.displayName || defaultName()).slice(0, 40),
        questionsAnswered,
        level,
        updatedAt: data.updatedAt || now
      });
      state.profile = profile;
      return profile;
    }
    const profile = {
      displayName: defaultName(),
      photoURL: '',
      bio: '',
      mood: '',
      questionsAnswered: 0,
      level: 1,
      createdAt: now,
      updatedAt: now
    };
    await ref.set(profile);
    state.profile = profile;
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
    const uid = state.user.uid;
    const questionsAnswered = (state.profile && state.profile.questionsAnswered) | 0;
    const payload = {
      displayName: cleaned,
      photoURL: (state.profile && state.profile.photoURL) || '',
      bio: (state.profile && state.profile.bio) || '',
      mood: (state.profile && state.profile.mood) || '',
      questionsAnswered,
      level: Math.floor(levelFromAnswered(questionsAnswered)),
      questionsAnswered: Math.floor(questionsAnswered),
      createdAt: (state.profile && state.profile.createdAt) || Date.now(),
      updatedAt: Date.now()
    };
    await db.collection('profiles').doc(uid).set(payload, { merge: false });
    state.profile = payload;
    renderChip();
    return payload;
  }

  async function bumpQuestionsAnswered(by) {
    const add = Math.max(1, by | 0);
    try {
      if (!state.user) await start();
      const { db } = ensureFirebase();
      const uid = state.user.uid;
      const ref = db.collection('profiles').doc(uid);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const cur = snap.exists ? snap.data() : null;
        const questionsAnswered = ((cur && cur.questionsAnswered) | 0) + add;
        const level = levelFromAnswered(questionsAnswered);
        const payload = {
          displayName: (cur && cur.displayName) || (state.profile && state.profile.displayName) || defaultName(),
          photoURL: (cur && cur.photoURL) || '',
          bio: (cur && cur.bio) || '',
          mood: (cur && cur.mood) || '',
          questionsAnswered,
          level,
          createdAt: (cur && cur.createdAt) || Date.now(),
          updatedAt: Date.now()
        };
        tx.set(ref, payload);
        state.profile = payload;
      });
      renderChip();
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
      chip.textContent = 'Profile';
      return;
    }
    chip.innerHTML =
      '<span class="pc-name"></span><span class="pc-meta"></span>';
    chip.querySelector('.pc-name').textContent = p.displayName || 'Profile';
    chip.querySelector('.pc-meta').textContent =
      'Lv ' + (p.level || 1) + ' · ' + ((p.questionsAnswered | 0)) + ' Qs';
  }

  function openProfileModal() {
    let overlay = document.getElementById('profileModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'profileModal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML =
        '<div class="modal-card profile-card" role="dialog" aria-modal="true" aria-labelledby="profileTitle">' +
        '<h3 id="profileTitle">Your profile</h3>' +
        '<p class="profile-help">Pick a display name. Level rises every 10 questions you answer correctly.</p>' +
        '<label class="profile-label" for="profileNameInput">Display name</label>' +
        '<input id="profileNameInput" class="profile-input" maxlength="40" autocomplete="nickname" />' +
        '<div class="profile-stats">' +
        '<div><span class="ps-k">Level</span><span class="ps-v" id="profileLevelVal">1</span></div>' +
        '<div><span class="ps-k">Questions answered</span><span class="ps-v" id="profileQsVal">0</span></div>' +
        '</div>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn-ghost" id="profileCloseBtn">Close</button>' +
        '<button type="button" class="btn-gold" id="profileSaveBtn">Save name</button>' +
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
          fillModal();
          status.textContent = 'Saved';
          toast('Profile saved');
        } catch (e) {
          status.textContent = e.message || 'Save failed';
        }
      });
    }
    fillModal();
    overlay.classList.add('show');
    const input = overlay.querySelector('#profileNameInput');
    setTimeout(() => input && input.focus(), 50);
  }

  function fillModal() {
    const p = state.profile || { displayName: '', level: 1, questionsAnswered: 0 };
    const input = document.getElementById('profileNameInput');
    const lv = document.getElementById('profileLevelVal');
    const qs = document.getElementById('profileQsVal');
    if (input) input.value = p.displayName || '';
    if (lv) lv.textContent = String(p.level || 1);
    if (qs) qs.textContent = String(p.questionsAnswered | 0);
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
