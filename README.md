# 🏭 PlantLog Pro

**Field Visit & Plant Report App** — Modular PWA for field engineers.

---

## Project Structure

```
plantlog-pro/
├── src/
│   ├── index.html          ← HTML layout only (~1100 lines)
│   ├── styles.css          ← Design system (~640 lines)
│   ├── sw.js               ← Service worker (caches all modules)
│   ├── 404.html            ← GitHub Pages SPA redirect
│   └── modules/
│       ├── core.js         ← State, Store, i18n, navigation    ~360 lines
│       ├── auth.js         ← PIN security, lock screen         ~320 lines
│       ├── trips.js        ← Trips, calendar, dashboard        ~460 lines
│       ├── tasks.js        ← Tasks, kanban, flights            ~580 lines
│       ├── report.js       ← 6-step report, PDF export         ~650 lines
│       ├── bills.js        ← Expense bills, bills PDF          ~400 lines
│       └── sync.js         ← Google Sheets sync                ~575 lines
├── PlantLog_GoogleAppsScript.gs
├── .github/workflows/deploy.yml
└── README.md
```

---

## 🚀 How to run on GitHub Pages

### Step 1 — Create repository

1. Go to **github.com** → **New repository**
2. Name it: `plantlog` (or any name)
3. Set to **Public**
4. Do NOT initialize with README (you have one)
5. Click **Create repository**

### Step 2 — Upload files

**Option A — GitHub website (easiest):**
1. Open your new repo on GitHub
2. Click **Add file → Upload files**
3. Drag the entire **contents** of this ZIP (not the ZIP itself):
   - Upload: `src/` folder, `README.md`, `PlantLog_GoogleAppsScript.gs`
4. Also create `.github/workflows/deploy.yml` — click **Add file → Create new file**
   - Type `.github/workflows/deploy.yml` as the filename
   - Paste the content from the `deploy.yml` file in this ZIP
5. Click **Commit changes**

**Option B — Git command line:**
```bash
git clone https://github.com/YOUR_USERNAME/plantlog.git
cd plantlog
# Copy all files from this ZIP into the folder
git add .
git commit -m "Initial PlantLog Pro"
git push origin main
```

### Step 3 — Enable GitHub Pages

1. In your repo → **Settings** → **Pages** (left sidebar)
2. Under **Source**: select **GitHub Actions**
3. Save

### Step 4 — Deploy

- The app deploys **automatically** every time you push to `main`
- After the first push, wait ~2 minutes
- Your app is live at: `https://YOUR_USERNAME.github.io/plantlog/`

### Step 5 — Set up Google Sheets (for data sync)

1. Go to **script.google.com** → New project
2. Paste the contents of `PlantLog_GoogleAppsScript.gs`
3. Click **Save** → Run **setupSheets** → approve permissions
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the `/exec` URL
6. In the app: **Settings → Google Sheets Sync** → paste URL → **Sync**

---

## 🔧 Making changes

### Edit a feature
- **Task logic?** → edit `src/modules/tasks.js`
- **Trip display?** → edit `src/modules/trips.js`
- **PDF report?** → edit `src/modules/report.js`
- **Bills?** → edit `src/modules/bills.js`
- **Security/PIN?** → edit `src/modules/auth.js`
- **Google Sheets sync?** → edit `src/modules/sync.js`
- **Colors/fonts/layout?** → edit `src/styles.css`
- **HTML structure?** → edit `src/index.html`

### Add a new feature (example: Equipment tracker)
1. Create `src/modules/equipment.js`
2. Add to `index.html`:
   ```html
   <script src="modules/equipment.js"></script>
   ```
3. Add cache entry in `sw.js`:
   ```js
   './modules/equipment.js',
   ```
4. Register listeners in `equipment.js`:
   ```js
   Store.on('equipment:save', () => renderEquipmentList());
   ```

### Module communication rule
**Modules never call each other directly.**
They communicate only through the Store:
```js
// ✅ Correct — commit to Store
Store.commit('task:save', task);

// ❌ Wrong — don't call another module's function
renderTripList(); // from inside tasks.js
```

---

## 📱 Install on phone

**Android (Chrome):** ⋮ menu → Add to Home Screen  
**iPhone (Safari):** Share button → Add to Home Screen

---

## 🔐 Security

1. Open the app → **Settings → Security → PIN & Security**
2. Set a 4-digit PIN
3. App locks automatically after 5 minutes
4. Settings screen requires PIN to access

---

*PlantLog Pro · Modular PWA · MIT License*
