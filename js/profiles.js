/* Study Portal — Profiles (Anonymous Auth + claim/register + Firestore)*/
(function (global) {
  const LEVEL_EVERY = 10;
  function levelFromXp(n) {
    return 1 + Math.floor(Math.max(0, n | 0) / LEVEL_EVERY);
  }
  function asInt(n) {
    return Math.floor(Number(n) || 0);
  }
  function expProgress(xp) {
    const q = asInt(xp);
    const into = q % LEVEL_EVERY;
    return {
      into,
      need: LEVEL_EVERY,
      pct: Math.min(100, (into / LEVEL_EVERY) * 100),
      level: levelFromXp(q)
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
    lastLevel: null,
    authBusy: false,
    authTab: 'register'
  };
  function toast(msg) {
    if (typeof showToast === 'function') showToast(msg, 2800);
    else if (typeof portalToast === 'function') portalToast(msg);
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
    const xp = asInt(data && data.xp) || questionsAnswered; // migration
    const level = asInt((data && data.level) || levelFromXp(xp)) || 1;
    return {
      displayName: String((data && data.displayName) || defaultName()).slice(0, 16),
      photoURL: (data && data.photoURL) || '',
      bio: (data && data.bio) || '',
      mood: (data && data.mood) || '',
      questionsAnswered,
      xp,
      level,
      createdAt: (data && data.createdAt) || Date.now(),
      updatedAt: (data && data.updatedAt) || Date.now()
    };
  }

  function isAnonymousUser(user) {
    return !!(user && user.isAnonymous);
  }

  function accountLabel(user) {
    if (!user) return '';
    if (user.isAnonymous) return 'Guest';
    if (user.email) return user.email;
    const g = (user.providerData || []).find(function (p) {
      return p && p.providerId === 'google.com';
    });
    if (g && g.email) return g.email;
    if (g && g.displayName) return g.displayName;
    return 'Registered account';
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

  function updatePortalFoot() {
  const foot = document.getElementById('portalFoot');
  if (!foot) return;
  const guest = isAnonymousUser(state.user);
  foot.textContent = guest
    ? 'Study Portal · progress saved on this device'
    : 'Study Portal';
}

async function afterAuthUser(user) {
  state.user = user;
  await ensureProfile(user.uid);
  if (global.StudyProgress && typeof StudyProgress.onAuthReady === 'function') {
    await StudyProgress.onAuthReady(user);
  }
  state.ready = true;
  state.error = null;
  renderChip();
  fillModal();
  updatePortalFoot();
}

  async function start() {
    try {
      const { auth } = ensureFirebase();
      if (global.StudyProgress && typeof StudyProgress.start === 'function') {
        await StudyProgress.start();
      }
      await new Promise(function (resolve, reject) {
        let settled = false;
        const unsub = auth.onAuthStateChanged(async function (user) {
          try {
            if (!user) {
              const cred = await auth.signInAnonymously();
              await afterAuthUser(cred.user);
            } else {
              await afterAuthUser(user);
            }
            if (!settled) {
              settled = true;
              resolve();
            } else {
              // Later auth changes (claim / sign-in)
              renderChip();
              fillModal();
            }
          } catch (e) {
            if (!settled) {
              settled = true;
              unsub();
              reject(e);
            } else {
              console.warn('auth state update failed', e);
            }
          }
        }, reject);
      });
      return state.profile;
    } catch (e) {
      console.error(e);
      state.error = e;
      state.ready = false;
      throw e;
    }
  }

  /* lobbies, panes and presence listen for this to keep your callsign and level current */
  function emitProfile() {
    try { global.dispatchEvent(new CustomEvent('study:profile', { detail: Object.assign({}, state.profile) })); } catch (e) {}
  }
  async function saveDisplayName(name) {
    const cleaned = String(name || '').trim().slice(0, 16);
    if (cleaned.length < 1) throw new Error('Name is required');
    if (!state.user) await start();
    const { db } = ensureFirebase();
    const q = asInt(state.profile && state.profile.questionsAnswered);
    const xp = asInt(state.profile && state.profile.xp) || q;
    const payload = normalizeProfile({
    displayName: cleaned,
    photoURL: (state.profile && state.profile.photoURL) || '',
    bio: (state.profile && state.profile.bio) || '',
    mood: (state.profile && state.profile.mood) || '',
    questionsAnswered: q,
    xp,
    level: levelFromXp(xp),
    createdAt: (state.profile && state.profile.createdAt) || Date.now(),
    updatedAt: Date.now()
});
    await db.collection('profiles').doc(state.user.uid).set(payload);
    state.profile = payload;
    renderChip();
    fillModal();
    emitProfile();
    return payload;
  }

  function celebrateLevelUp(newLevel) {
    const chip = document.getElementById('profileChip');
    if (chip) {
      chip.classList.remove('lvl-up');
      void chip.offsetWidth;
      chip.classList.add('lvl-up');
      setTimeout(function () {
        chip.classList.remove('lvl-up');
      }, 1400);
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
    celebrateLevelUp._t = setTimeout(function () {
      tag.classList.remove('show');
    }, 1600);
    toast('Level ' + newLevel + ' — nice');
  }

  async function bumpQuestionsAnswered(questionsAdd, xpAdd) {
  const qAdd = Math.max(0, questionsAdd | 0) || 1;
  const xAdd = Math.max(1, xpAdd | 0);
  try {
    if (!state.user) await start();
    const { db } = ensureFirebase();
    const uid = state.user.uid;
    const ref = db.collection('profiles').doc(uid);
    let leveled = null;
    await db.runTransaction(async function (tx) {
      const snap = await tx.get(ref);
      const cur = snap.exists ? normalizeProfile(snap.data()) : normalizeProfile({});
      const questionsAnswered = asInt(cur.questionsAnswered) + qAdd;
      const xp = asInt(cur.xp) + xAdd;
      const level = levelFromXp(xp);
      const payload = normalizeProfile(
        Object.assign({}, cur, {
          questionsAnswered,
          xp,
          level,
          updatedAt: Date.now()
        })
      );
      tx.set(ref, payload);
      if (state.lastLevel != null && level > state.lastLevel) leveled = level;
      state.lastLevel = level;
      state.profile = payload;
    });
    renderChip();
    fillModal();
    emitProfile();
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
      chip.addEventListener('click', function () {
        openProfileModal();
      });
      const dock = document.getElementById('timerDock');
      if (dock && dock.parentNode) dock.parentNode.insertBefore(chip, dock);
      else document.body.appendChild(chip);
    }
    const p = state.profile;
    if (!p) {
      chip.innerHTML = '<span class="pc-name">Profile</span>';
      return;
    }
    const prog = expProgress(p.xp || p.questionsAnswered);
    const hue = hueFromName(p.displayName);
    const guest = isAnonymousUser(state.user);
    chip.innerHTML =
      '<span class="pc-avatar" style="--av-hue:' +
      hue +
      '"><span class="pc-av-aura"></span><span class="pc-av-core">' +
      initials(p.displayName) +
      '</span></span>' +
      '<span class="pc-body">' +
      '<span class="pc-top"><span class="pc-name"></span><span class="pc-lvl">LV ' +
      prog.level +
      '</span></span>' +
      '<span class="pc-bars">' +
      '<span class="pc-bar-row"><span class="pc-bar-lab exp">XP</span>' +
      '<span class="pc-bar-track"><span class="pc-bar-fill exp" style="width:' +
      prog.pct +
      '%"></span></span></span>' +
      '</span>' +
      '<span class="pc-meta"></span>' +
      '</span>';
    chip.querySelector('.pc-name').textContent = p.displayName;
    chip.querySelector('.pc-meta').textContent = guest ? 'Guest' : '';
  }

  function setAuthStatus(msg, isError) {
    const el = document.getElementById('profileAuthStatus');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('is-error', !!isError);
  }

  function friendlyAuthError(e) {
    const code = (e && e.code) || '';
    const map = {
      'auth/email-already-in-use': 'That email is already registered — try Sign in.',
      'auth/credential-already-in-use': 'That account already exists — signing you in and merging progress…',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/user-not-found': 'No account found with that email.',
      'auth/popup-blocked': 'Popup was blocked — trying redirect…',
      'auth/popup-closed-by-user': 'Sign-in window closed before finishing.',
      'auth/cancelled-popup-request': 'Sign-in cancelled.',
      'auth/network-request-failed': 'Network error — check your connection.',
      'auth/operation-not-allowed': 'This sign-in method is not enabled yet in Firebase Console.',
      'auth/account-exists-with-different-credential': 'An account already exists with a different sign-in method.'
    };
    if (map[code]) return map[code];
    return (e && e.message) || 'Something went wrong. Please try again.';
  }

  async function mergeAfterAccountSwitch(guestSnapshot) {
    if (global.StudyProgress && typeof StudyProgress.pullAndMerge === 'function') {
      await StudyProgress.pullAndMerge(guestSnapshot || null);
    }
  }

  async function handleCredentialInUse(error, guestSnapshot) {
    const { auth } = ensureFirebase();
    const cred = error.credential;
    if (!cred) throw error;
    setAuthStatus('Account exists — signing in and carrying over your progress…');
    const result = await auth.signInWithCredential(cred);
    state.user = result.user;
    await ensureProfile(result.user.uid);
    await mergeAfterAccountSwitch(guestSnapshot);
    renderChip();
    fillModal();
    toast('Signed in — progress carried over');
    return result.user;
  }

  async function registerWithEmail(email, password) {
    const { auth } = ensureFirebase();
    const user = auth.currentUser;
    const guestSnap =
      global.StudyProgress && StudyProgress.snapshotLocal ? StudyProgress.snapshotLocal() : null;
    const cred = firebase.auth.EmailAuthProvider.credential(email, password);
    if (user && user.isAnonymous) {
      try {
        const linked = await user.linkWithCredential(cred);
        state.user = linked.user;
        await ensureProfile(linked.user.uid);
        await mergeAfterAccountSwitch(guestSnap);
        toast('Account created — progress saved to your profile');
        return linked.user;
      } catch (e) {
        if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') {
          return handleCredentialInUse(
            Object.assign(e, {
              credential: e.credential || cred
            }),
            guestSnap
          );
        }
        throw e;
      }
    }
    // Not anonymous — create / sign in fresh
    try {
      const created = await auth.createUserWithEmailAndPassword(email, password);
      state.user = created.user;
      await ensureProfile(created.user.uid);
      await mergeAfterAccountSwitch(guestSnap);
      toast('Account created');
      return created.user;
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        const signed = await auth.signInWithEmailAndPassword(email, password);
        state.user = signed.user;
        await ensureProfile(signed.user.uid);
        await mergeAfterAccountSwitch(guestSnap);
        toast('Signed in — progress carried over');
        return signed.user;
      }
      throw e;
    }
  }

  async function signInWithEmail(email, password) {
    const { auth } = ensureFirebase();
    const guestSnap =
      global.StudyProgress && StudyProgress.snapshotLocal ? StudyProgress.snapshotLocal() : null;
    const signed = await auth.signInWithEmailAndPassword(email, password);
    state.user = signed.user;
    await ensureProfile(signed.user.uid);
    await mergeAfterAccountSwitch(guestSnap);
    toast('Signed in — progress synced');
    return signed.user;
  }


  async function signOutKeepSession() {
    const { auth } = ensureFirebase();
    // Prefer staying registered; optional sign-out returns to anonymous
    await auth.signOut();
    const cred = await auth.signInAnonymously();
    state.user = cred.user;
    await ensureProfile(cred.user.uid);
    if (global.StudyProgress && typeof StudyProgress.pullAndMerge === 'function') {
      await StudyProgress.pullAndMerge();
    }
    renderChip();
    fillModal();
    toast('Signed out — continuing as guest');
  }

  function authSectionHTML() {
    return (
      '<div class="profile-auth" id="profileAuthSection">' +
      '<div class="profile-auth-banner" id="profileAuthBanner"></div>' +
      '<div class="profile-auth-body" id="profileAuthBody">' +
      '<div class="profile-auth-tabs" role="tablist">' +
      '<button type="button" class="profile-auth-tab is-active" data-auth-tab="register" id="profileAuthTabRegister">Create account</button>' +
      '<button type="button" class="profile-auth-tab" data-auth-tab="signin" id="profileAuthTabSignin">Sign in</button>' +
      '</div>' +
      '<p class="profile-auth-lead" id="profileAuthLead">Claim this guest progress so it follows you on any device.</p>' +
      '<form class="profile-auth-form" id="profileAuthForm" novalidate>' +
      '<label class="profile-label" for="profileAuthEmail">Email</label>' +
      '<input id="profileAuthEmail" name="email" class="profile-input" type="email" autocomplete="username" placeholder="you@example.com" />' +
      '<label class="profile-label" for="profileAuthPassword">Password</label>' +
      '<input id="profileAuthPassword" name="password" class="profile-input" type="password" autocomplete="new-password" placeholder="At least 6 characters" />' +
      '</form>' +
      '<div class="profile-auth-actions">' +
      '<button type="button" class="btn-gold" id="profileAuthEmailBtn">Register</button>' +
            '</div>' +
      '<p class="profile-auth-status" id="profileAuthStatus"></p>' +
      '</div>' +
      '<div class="profile-auth-signed" id="profileAuthSigned" hidden>' +
      '<p class="profile-auth-signed-line" id="profileAuthSignedLine"></p>' +
      '<button type="button" class="btn-ghost" id="profileSignOutBtn">Sign out</button>' +
      '</div>' +
      '<div class="profile-pomo-row" id="profilePomoRow">' +
      '<div class="profile-pomo-text">' +
      '<span class="profile-pomo-title">Pomodoro timer</span>' +
      '<span class="profile-pomo-sub">Focus dock &amp; break reminders</span>' +
      '</div>' +
      '<label class="profile-switch" title="Toggle Pomodoro timer">' +
      '<input type="checkbox" id="profilePomoToggle" checked />' +
      '<span class="profile-switch-slider" aria-hidden="true"></span>' +
      '</label>' +
      '</div>' +
      '<div class="profile-pomo-row" id="profileQualityRow">' +
      '<div class="profile-pomo-text">' +
      '<span class="profile-pomo-title">Basic quality</span>' +
      '<span class="profile-pomo-sub">Flat colors, no animations</span>' +
      '</div>' +
      '<label class="profile-switch" title="Use basic colors and disable animations">' +
      '<input type="checkbox" id="profileQualityToggle" />' +
      '<span class="profile-switch-slider" aria-hidden="true"></span>' +
      '</label>' +
      '</div>' +
      '<div class="profile-pomo-row" id="profileCursorRow">' +
      '<div class="profile-pomo-text">' +
      '<span class="profile-pomo-title">Custom cursor</span>' +
      '<span class="profile-pomo-sub">Fancy mouse pointer skins</span>' +
      '</div>' +
      '<label class="profile-switch" title="Toggle custom cursor">' +
      '<input type="checkbox" id="profileCursorToggle" checked />' +
      '<span class="profile-switch-slider" aria-hidden="true"></span>' +
      '</label>' +
      '</div>' +
      '</div>'
    );
  }

  function wireAuthUI(overlay) {
    const tabReg = overlay.querySelector('#profileAuthTabRegister');
    const tabIn = overlay.querySelector('#profileAuthTabSignin');
    const emailBtn = overlay.querySelector('#profileAuthEmailBtn');
    const signOutBtn = overlay.querySelector('#profileSignOutBtn');
    const pass = overlay.querySelector('#profileAuthPassword');

    function setTab(tab) {
      state.authTab = tab;
      if (tabReg) tabReg.classList.toggle('is-active', tab === 'register');
      if (tabIn) tabIn.classList.toggle('is-active', tab === 'signin');
      if (emailBtn) emailBtn.textContent = tab === 'register' ? 'Register' : 'Sign in';
      if (pass) pass.autocomplete = tab === 'register' ? 'new-password' : 'current-password';
      const lead = overlay.querySelector('#profileAuthLead');
      if (lead) {
        lead.textContent =
          tab === 'register'
            ? 'Claim this guest progress so it follows you on any device.'
            : 'Welcome back — sign in to restore progress on this device.';
      }
      setAuthStatus('');
    }

    if (tabReg && !tabReg._wired) {
      tabReg._wired = true;
      tabReg.addEventListener('click', function () {
        setTab('register');
      });
    }
    if (tabIn && !tabIn._wired) {
      tabIn._wired = true;
      tabIn.addEventListener('click', function () {
        setTab('signin');
      });
    }
    if (emailBtn && !emailBtn._wired) {
      emailBtn._wired = true;
      emailBtn.addEventListener('click', async function () {
        if (state.authBusy) return;
        const email = (overlay.querySelector('#profileAuthEmail').value || '').trim();
        const password = overlay.querySelector('#profileAuthPassword').value || '';
        if (!email || !password) {
          setAuthStatus('Enter email and password.', true);
          return;
        }
        state.authBusy = true;
        setAuthStatus(state.authTab === 'register' ? 'Creating account…' : 'Signing in…');
        try {
          if (state.authTab === 'register') await registerWithEmail(email, password);
          else await signInWithEmail(email, password);
          setAuthStatus('Done — progress is linked to your account.');
          fillModal();
        } catch (e) {
          console.warn(e);
          setAuthStatus(friendlyAuthError(e), true);
        } finally {
          state.authBusy = false;
        }
      });
    }
    if (signOutBtn && !signOutBtn._wired) {
      signOutBtn._wired = true;
      signOutBtn.addEventListener('click', async function () {
        if (state.authBusy) return;
        state.authBusy = true;
        try {
          await signOutKeepSession();
        } catch (e) {
          setAuthStatus(friendlyAuthError(e), true);
        } finally {
          state.authBusy = false;
        }
      });
    }
    const pomoToggle = overlay.querySelector('#profilePomoToggle');
    if (pomoToggle && !pomoToggle._wired) {
      pomoToggle._wired = true;
      pomoToggle.addEventListener('change', function () {
        const on = !!pomoToggle.checked;
        if (typeof global.setPomodoroEnabled === 'function') {
          global.setPomodoroEnabled(on);
        } else if (global.StudyProgress && typeof StudyProgress.setPomodoroEnabled === 'function') {
          StudyProgress.setPomodoroEnabled(on);
        } else {
          try {
            localStorage.setItem('pt1_pomodoro_enabled', on ? '1' : '0');
          } catch (e) {}
        }
        toast(on ? 'Pomodoro timer on' : 'Pomodoro timer off');
      });
    }
    const qualityToggle = overlay.querySelector('#profileQualityToggle');
    if (qualityToggle && !qualityToggle._wired) {
      qualityToggle._wired = true;
      qualityToggle.addEventListener('change', function () {
        const basic = !!qualityToggle.checked;
        if (global.StudyPrefs && typeof StudyPrefs.setQuality === 'function') {
          StudyPrefs.setQuality(basic ? 'basic' : 'full');
        } else {
          try {
            localStorage.setItem('pt1_quality_mode', basic ? 'basic' : 'full');
            document.documentElement.setAttribute('data-quality', basic ? 'basic' : 'full');
          } catch (e) {}
        }
        toast(basic ? 'Basic quality on' : 'Full visual quality on');
      });
    }
    const cursorToggle = overlay.querySelector('#profileCursorToggle');
    if (cursorToggle && !cursorToggle._wired) {
      cursorToggle._wired = true;
      cursorToggle.addEventListener('change', function () {
        const on = !!cursorToggle.checked;
        if (global.StudyPrefs && typeof StudyPrefs.setCustomCursor === 'function') {
          StudyPrefs.setCustomCursor(on);
        } else {
          try {
            localStorage.setItem('pt1_custom_cursor', on ? '1' : '0');
            document.documentElement.setAttribute('data-custom-cursor', on ? 'on' : 'off');
          } catch (e) {}
        }
        toast(on ? 'Custom cursor on' : 'System cursor on');
      });
    }
    setTab(state.authTab || 'register');
  }

  function updateAuthPanel() {
    const banner = document.getElementById('profileAuthBanner');
    const body = document.getElementById('profileAuthBody');
    const signed = document.getElementById('profileAuthSigned');
    const signedLine = document.getElementById('profileAuthSignedLine');
    const user = state.user;
    if (!banner) return;
    if (isAnonymousUser(user)) {
      banner.className = 'profile-auth-banner is-guest';
      banner.innerHTML =
        '<strong>You’re on a guest account</strong> — progress can be lost if you clear browser data.';
      if (body) body.hidden = false;
      if (signed) signed.hidden = true;
    } else if (user) {
      banner.className = 'profile-auth-banner is-registered';
      banner.innerHTML = '<strong>Signed in as</strong> ' + escapeHtml(accountLabel(user));
      if (body) body.hidden = true;
      if (signed) signed.hidden = false;
      if (signedLine) {
        signedLine.textContent =
          'Your quiz progress, mastery, and achievements sync with this account.';
      }
    } else {
      banner.className = 'profile-auth-banner';
      banner.textContent = '';
    }
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function openProfileModal() {
    let overlay = document.getElementById('profileModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'profileModal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML =
        '<div class="modal-card profile-card" role="dialog" aria-modal="true" aria-labelledby="profileTitle">' +
        '<div class="profile-card-top"><button type="button" class="icon-btn modal-x" id="profileCloseBtn" aria-label="Close" title="Close">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" fill="currentColor"/></svg></button></div>' +
        '<div class="profile-hero">' +
        '<div class="profile-hero-av" id="profileHeroAv"><span class="pc-av-aura"></span><span class="pc-av-core" id="profileHeroInit">S</span></div>' +
        '<div class="profile-hero-text">' +
        '<h3 id="profileTitle">Commander profile</h3>' +
        '<p class="profile-help">Callsign, rank, and sortie count.</p>' +
        '</div></div>' +
        '<form class="profile-name-form" id="profileNameForm" autocomplete="off" novalidate>' +
        '<label class="profile-label" for="profileNameInput">Callsign</label>' +
        '<div class="profile-name-row">' +
        '<input id="profileNameInput" name="pp-callsign" class="profile-input" type="text" maxlength="16" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="text" enterkeyhint="done" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other" aria-describedby="profileStatus" placeholder="Your display name" />' +
        '<button type="submit" class="btn-ghost btn-sm profile-save-btn" id="profileSaveBtn" disabled title="Change the name first">Save</button>' +
        '</div>' +
        '</form>' +
        '<div class="profile-xp-wrap">' +
        '<div class="profile-xp-head"><span>EXP</span><span id="profileXpLabel">0 / 10</span></div>' +
        '<div class="pc-bar-track lg"><span class="pc-bar-fill exp" id="profileXpFill" style="width:0%"></span></div>' +
        '</div>' +
        '<div class="profile-stats">' +
        '<div><span class="ps-k">Level</span><span class="ps-v" id="profileLevelVal">1</span></div>' +
        '<div><span class="ps-k">Questions answered</span><span class="ps-v" id="profileQsVal">0</span></div>' +
        '</div>' +
        authSectionHTML() +
        '<div class="modal-actions profile-actions"></div>' +
        '<p class="profile-foot" id="profileStatus"></p>' +
        '</div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeProfileModal();
      });
      overlay.querySelector('#profileCloseBtn').addEventListener('click', closeProfileModal);
      async function confirmAndSave() {
        const input = overlay.querySelector('#profileNameInput');
        const status = overlay.querySelector('#profileStatus');
        const next = String(input.value || '').trim().slice(0, 16);
        const cur = String(input.dataset.saved != null ? input.dataset.saved : ((state.profile && state.profile.displayName) || '')).trim();
        if (!next) { status.textContent = 'Name is required'; input.focus(); return; }
        if (next === cur) { status.textContent = 'That is already your callsign'; return; }
        const ok = global.StudyConfirm && StudyConfirm.ask
          ? await StudyConfirm.ask({ title: 'Change your callsign to "' + next + '"?', text: 'Lobby seats and party panes show the new name right away.', confirm: 'Confirm', cancel: 'Cancel', icon: 'edit' })
          : true;
        if (!ok) { status.textContent = ''; input.focus(); return; }
        try {
          status.textContent = 'Saving…';
          await saveDisplayName(next);
          status.textContent = 'Saved';
          if (input) input.dataset.saved = String(input.value || '').trim();
          syncSaveBtn();
          toast('Callsign locked in');
        } catch (e) {
          status.textContent = e.message || 'Save failed';
        }
      }
      overlay.querySelector('#profileNameForm').addEventListener('submit', function (e) { e.preventDefault(); confirmAndSave(); });
      overlay.querySelector('#profileAuthForm').addEventListener('submit', function (e) { e.preventDefault(); });
      overlay.querySelector('#profileNameInput').addEventListener('input', function () {
        syncSaveBtn();
        const v = overlay.querySelector('#profileNameInput').value || 'S';
        const el = document.getElementById('profileHeroInit');
        const av = document.getElementById('profileHeroAv');
        if (el) el.textContent = initials(v);
        if (av) av.style.setProperty('--av-hue', hueFromName(v));
      });
      wireAuthUI(overlay);
    } else {
      wireAuthUI(overlay);
    }
    fillModal();
    raise(overlay);
    overlay.classList.add('show');
    setTimeout(function () {
      const input = overlay.querySelector('#profileNameInput');
      if (input) input.focus();
    }, 50);
  }

  /* the inline Save stays disabled until the callsign differs from the saved one */
  function syncSaveBtn() {
    const input = document.getElementById('profileNameInput');
    const btn = document.getElementById('profileSaveBtn');
    if (!input || !btn) return;
    const next = String(input.value || '').trim();
    const cur = String(input.dataset.saved != null ? input.dataset.saved : ((state.profile && state.profile.displayName) || '')).trim();
    const changed = !!next && next !== cur;
    btn.disabled = !changed;
    btn.title = changed ? 'Save the new callsign' : 'Change the name first';
  }
  function fillModal() {
    const p = state.profile || normalizeProfile({});
    const prog = expProgress(p.xp || p.questionsAnswered);
    const input = document.getElementById('profileNameInput');
    const lv = document.getElementById('profileLevelVal');
    const qs = document.getElementById('profileQsVal');
    const fill = document.getElementById('profileXpFill');
    const lab = document.getElementById('profileXpLabel');
    const init = document.getElementById('profileHeroInit');
    const av = document.getElementById('profileHeroAv');
    if (input) { input.value = p.displayName || ''; input.dataset.saved = input.value; }
    syncSaveBtn();
    if (lv) lv.textContent = String(prog.level);
    if (qs) qs.textContent = String(asInt(p.questionsAnswered));
    if (fill) fill.style.width = prog.pct + '%';
    if (lab) lab.textContent = prog.into + ' / ' + prog.need + ' to LV ' + (prog.level + 1);
    if (init) init.textContent = initials(p.displayName);
    if (av) av.style.setProperty('--av-hue', hueFromName(p.displayName));
    updateAuthPanel();
    const pomoToggle = document.getElementById('profilePomoToggle');
    if (pomoToggle) {
      var enabled = true;
      if (global.StudyProgress && typeof StudyProgress.getPomodoroEnabled === 'function') {
        enabled = StudyProgress.getPomodoroEnabled();
      } else {
        try {
          var raw = localStorage.getItem('pt1_pomodoro_enabled');
          if (raw === '0' || raw === 'false') enabled = false;
        } catch (e) {}
      }
      pomoToggle.checked = !!enabled;
    }
    const qualityToggle = document.getElementById('profileQualityToggle');
    if (qualityToggle) {
      var basic = false;
      if (global.StudyPrefs && typeof StudyPrefs.isBasic === 'function') {
        basic = StudyPrefs.isBasic();
      } else {
        try {
          var q = localStorage.getItem('pt1_quality_mode');
          basic = q === 'basic' || q === '1' || q === 'true';
        } catch (e) {}
      }
      qualityToggle.checked = !!basic;
    }
    const cursorToggle = document.getElementById('profileCursorToggle');
    if (cursorToggle) {
      var curOn = true;
      if (global.StudyPrefs && typeof StudyPrefs.isCustomCursorEnabled === 'function') {
        curOn = StudyPrefs.isCustomCursorEnabled();
      } else {
        try {
          var c = localStorage.getItem('pt1_custom_cursor');
          if (c === '0' || c === 'false' || c === 'off') curOn = false;
        } catch (e) {}
      }
      cursorToggle.checked = !!curOn;
    }
  }

  function closeProfileModal() {
    const overlay = document.getElementById('profileModal');
    if (overlay) overlay.classList.remove('show');
  }

  /* —— stacked panels (profile → achievements) ——
     Overlays are siblings at <body> level with the same z-index, so whichever was created
     last used to win. raise() moves the overlay being opened to the end of <body> and one
     z-index step above every other open overlay, so the newest panel is always on top. */
  function overlayZ(el) { return parseInt(getComputedStyle(el).zIndex, 10) || 0; }
  function openOverlays() {
    return Array.prototype.slice.call(document.querySelectorAll('.modal-overlay.show'))
      .map(function (el, i) { return { el: el, z: overlayZ(el), i: i }; })
      .sort(function (a, b) { return (a.z - b.z) || (a.i - b.i); })
      .map(function (x) { return x.el; });
  }
  function raise(el) {
    if (!el) return;
    if (el.parentNode !== document.body || el !== document.body.lastElementChild) document.body.appendChild(el);
    el.style.zIndex = '';
    let z = overlayZ(el) || 80;
    openOverlays().forEach(function (o) { if (o !== el) z = Math.max(z, overlayZ(o) + 1); });
    el.style.zIndex = String(z);
  }
  function topOverlay() { const all = openOverlays(); return all[all.length - 1] || null; }
  const LAYERED = { profileModal: '#profileCloseBtn', achievementsModal: '#achievementsCloseBtn' };
  // Esc closes the top-most layer first (achievements before the profile under it).
  // Registered on window in the capture phase before the quiz engine's own Esc handler.
  global.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (global.StudyConfirm && StudyConfirm.isOpen && StudyConfirm.isOpen()) return; // the confirm dialog takes Esc first
    const top = topOverlay();
    if (!top || !LAYERED[top.id]) return;
    const btn = top.querySelector(LAYERED[top.id]);
    e.preventDefault();
    e.stopImmediatePropagation();
    if (btn) btn.click(); else top.classList.remove('show');
  }, true);
  global.StudyLayers = { raise: raise, top: topOverlay, open: openOverlays };

  global.StudyProfiles = {
    start: start,
    open: openProfileModal,
    bumpQuestionsAnswered: bumpQuestionsAnswered,
    getProfile: function () {
      return state.profile;
    },
    getUser: function () {
      return state.user;
    },
    isReady: function () {
      return state.ready;
    },
    isAnonymous: function () {
      return isAnonymousUser(state.user);
    }
  };
})(window);
