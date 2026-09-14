# Study Portal

Static practice hub for GitHub Pages. Question banks are JSON files in this repo and load with relative `fetch` (not the GitHub API).

## What’s included

- **Unified SPA** (`index.html`) — rich glass UI (moods, timer, skins, Forms A–H) with portal home in the same page
- **Unlocked** — Medical Physics → Periodic Test 1 (loads `banks/…` via fetch; no separate exam HTML)
- **Locked** — other subjects + Online tiles (Profiles / Scores / Chat / Live)

## Publish on GitHub Pages (new repo)

1. On GitHub: **New repository** → name it (e.g. `study-portal`) → Public → Create (no README needed if you’ll upload these files).
2. Upload **everything inside this folder** to the **root** of the repo (`index.html` must sit at the repo root, not inside a nested `exam-portal/` folder).
   - Easiest in the browser: **Add file → Upload files** → drag all files and folders in → Commit.
   - Or use Git locally from this folder:
     ```bash
     git init
     git add .
     git commit -m "Initial study portal"
     git branch -M main
     git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
     git push -u origin main
     ```
3. Open the repo on GitHub → **Settings** → **Pages** (left sidebar).
4. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main** / folder **/(root)** → Save
5. Wait 1–2 minutes, then open:
   - `https://YOUR_USER.github.io/YOUR_REPO/`
6. Click **Medical Physics** → **Periodic Test 1**.

If the page 404s, wait a bit longer or confirm `index.html` is at the repo root.

## Local preview

Browsers block `fetch` on `file://`. From this folder:

```bash
python -m http.server 8080
```

Open `http://localhost:8080/`.

## Add another bank later

1. Put JSON under `banks/<subjectId>/...json` (same shape as `banks/medphys/pt1.json`).
2. Register it in `data/catalog.json`.
3. Push; Pages updates automatically.

## Online features

Profiles, Scores, Chat, and Live room are locked UI placeholders for a future backend (e.g. Firebase). Banks stay static project files.

## Firebase (rules shipped)

Security rules for profiles, scores, chat, and live cursors live under `firebase/`.  
Online UI tiles stay locked until you wire the SDK.

Follow **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** to create the project in your account and deploy the rules.
