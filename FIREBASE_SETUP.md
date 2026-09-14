# Firebase setup (Study Portal)

Banks stay on GitHub Pages. Firebase is for **Auth + profiles + scores + chat + live cursors** later. Rules are already in `firebase/` — you deploy them to **your** project (this account cannot log into Firebase for you).

## 1) Create the Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/).
2. **Add project** → name it (e.g. `study-portal`) → continue.
3. Google Analytics: optional (Off is fine for class use).
4. Create project → **Continue**.

## 2) Enable the products you’ll need

In the left menu of your project:

| Product | Path | Why |
|--------|------|-----|
| **Authentication** | Build → Authentication → Get started → Sign-in method → **Anonymous** (default guest) + **Email/Password** + **Google** | Guest entry, claim/register, scores |
| **Firestore** | Build → Firestore Database → Create database → **Start in production mode** → pick a region close to you | Profiles, scores, chat |
| **Realtime Database** | Build → Realtime Database → Create → **Start in locked mode** → region | Live cursors / presence |
| **Storage** | Build → Storage → Get started → production rules → region | Avatars (optional) |

Production / locked mode is fine: you’ll overwrite rules from this repo next.

## 3) Register a web app (get config)

1. Project overview → **Add app** → **Web** (`</>`).
2. App nickname: `study-portal-web` → Register (Hosting optional — Pages already hosts the UI).
3. Copy the `firebaseConfig` object.
4. In this repo: copy `js/firebase-config.example.js` → `js/firebase-config.js` and paste your values.
5. `js/firebase-config.js` is gitignored so you don’t commit it by accident.

## 4) Deploy the shipped rules (CLI)

On your computer (Node.js installed):

```bash
npm install -g firebase-tools
firebase login
cd study-portal   # this project folder (repo root)
cp .firebaserc.example .firebaserc
# edit .firebaserc → replace YOUR_FIREBASE_PROJECT_ID
firebase use YOUR_FIREBASE_PROJECT_ID
firebase deploy --only firestore:rules,firestore:indexes,database,storage
```

Success looks like each ruleset **released**.

### Or paste in the Console (no CLI)

- **Firestore** → Rules → paste `firebase/firestore.rules` → Publish  
- **Realtime Database** → Rules → paste contents of `firebase/database.rules.json` → Publish  
- **Storage** → Rules → paste `firebase/storage.rules` → Publish  

## 5) What the rules allow (summary)

- **profiles/{uid}** — only you write your profile; signed-in users can read  
- **progress/{uid}** — only you read/write your solo progress (mastery, achievements, forms, pomodoroEnabled)  
- **scores/** — you can create your own score rows; no edits/deletes  
- **leaderboards/.../entries/{uid}** — only you upsert your best %  
- **rooms/.../messages** — signed-in create/read; edit blocked; delete own  
- **RTDB presence / chat / parties / lobbies / invites** — auth required; own presence; party members ≤4; whisper pair scoped  
- **RTDB rooms/.../cursors|presence** — only write your own uid path  
- **Storage avatars/{uid}/** — only you upload &lt;2MB images  
- **Storage banks/** — public read, no client writes (optional cloud banks later)  
- Everything else: **denied**

## 6) Budget / free tier tips

- Set a Google Cloud **budget alert** ($5 / $10) under Billing.  
- Keep chat + cursors inside small rooms (not site-wide broadcast).  
- Banks on GitHub Pages = almost no Firebase bandwidth for quizzes.

## 7) Wire the HTML later

Online tiles stay locked until you add the Firebase JS SDK and turn features on. Rules can (and should) be live **before** you unlock the UI.

## Account claiming (Email / Google) — required for progress sync

Guest users start with **Anonymous** auth. To claim progress (and sync across devices):

1. **Authentication → Sign-in method**
   - **Anonymous** — Enable (keep as default entry)
   - **Email/Password** — Enable (no need for Email link)
   - **Google** — Enable → set a support email
2. **Authentication → Settings → Authorized domains**
   - Include `ancient7999.github.io`
   - Include `localhost` (for local testing)
3. **Publish updated Firestore rules** (GitHub Pages does **not** deploy rules):
   - Console → Firestore → Rules → paste `firebase/firestore.rules` → **Publish**
   - Or CLI: `firebase deploy --only firestore:rules`
4. Confirm `progress/{uid}` is allowed (self read/write) after publish — used for mastery, achievements, form best %, and Pomodoro preference.

Without steps 1–3, “Register / Sign in / Continue with Google” in the profile modal will fail with `auth/operation-not-allowed` or redirect errors.

## Checklist

- [ ] Project created  
- [ ] Auth method enabled  
- [ ] Firestore + RTDB + Storage created  
- [ ] Web app config in `js/firebase-config.js`  
- [ ] Rules deployed  
- [ ] Budget alert set  


## Chat / party / lobby rules deploy

Repo rules do **not** auto-deploy with GitHub Pages. After pulling rules changes:

```bash
firebase deploy --only database
```

Or paste `firebase/database.rules.json` into Firebase Console → Realtime Database → Rules.
