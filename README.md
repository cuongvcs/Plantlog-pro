# 🏭 PlantLog Pro

**Field Visit & Plant Report App** — Modular PWA for field engineers.  
Deployed via GitHub Pages · Works offline · Google Sheets sync · No build step required.

---

## Project Structure

```
src/
├── index.html          ← HTML layout only (~1100 lines)
├── styles.css          ← Design system (~1000 lines)
├── sw.js               ← Service worker — caches all modules
├── 404.html            ← GitHub Pages SPA redirect
└── modules/
    ├── core.js         ← State (key:plpro1), Store, i18n, navigation     ~380 lines
    ├── auth.js         ← PIN security, lock screen (key:plprosec1)        ~320 lines
    ├── trips.js        ← Trips CRUD, calendar, dashboard, filters          ~480 lines
    ├── tasks.js        ← Tasks, kanban, parts/materials, flights           ~830 lines
    ├── report.js       ← 6-step report, PDF export                        ~650 lines
    ├── bills.js        ← Expense bills, bills PDF                         ~400 lines
    └── sync.js         ← Google Sheets sync (database: PlantLog Pro)      ~575 lines
```

---

## Changelog

### v4.3 — Parts & Materials + Export

**Parts / Materials per Work task**
- Toggle button "🔩 Add parts / materials required" in Work task modal
- Each part is a **card** showing all fields clearly:
  - Part No. (monospace, prominent)
  - Description (full width)
  - Brand / Manufacturer
  - Quantity
  - Machine / Assembly
  - Status: ❌ Not Yet · 📦 On Order · ✅ Ready (colour-coded dropdown)
- Parts visible in task detail view with status badges
- Parts data saved to localStorage and synced to Google Sheets (PartsJson column)

**Parts export — Settings**
- 📊 **Parts List → Excel** — downloads CSV file, opens directly in Microsoft Excel
  - Columns: No., Task, Date, Trip, Part No., Description, Brand, Qty, Machine/Assembly, Status
  - UTF-8 BOM for correct Thai/Vietnamese character support in Excel
- 📄 **Parts List → PDF** — landscape A4 PDF report
  - Header with engineer name, company, date, total count
  - Summary: Ready / On Order / Not Yet counts
  - Full parts table — alternating rows, status colour-coded
  - Auto page break when table exceeds page height

**Clarification: MD file = app changelog (this README), not a parts export**

---

### v4.2 — Security & Trip Status

**PIN security fixed**
- Storage key changed: `pl3` → `plpro1` (separate from old PlantLog app)
- PIN hash key: `plsec4` → `plprosec1`
- PIN salt: `pl4salt_` → `plprosalt_`
- PIN pad now displays correctly as 3×4 grid (`.pin-pad` CSS was missing)

**Trip status change**
- Status toggle bar added to trip detail: 📋 Planned · 🔄 Active · ✅ Done
- Tap any status to change — saves immediately, updates trip card colour
- `setTripStatus()` and `renderTripStatusToggle()` functions added to trips.js

**Settings data now persists correctly**
- Root cause: same `localStorage` key as old app caused data to be overwritten
- Now fully isolated with `plpro1` key

---

### v4.1 — Database separation

**PlantLog Pro uses its own database**
- Google Sheets database: `PlantLog Pro Database` (separate from `PlantLog Database`)
- New Apps Script project: `PlantLog Pro Backend`
- Run `setupSheets()` to create the new spreadsheet automatically
- Old app data is never touched

**New helper functions in Apps Script**
- `getDatabaseUrl()` — logs the spreadsheet URL
- `testAPI()` — verifies connection and row counts

---

### v4.0 — Modular architecture

**Split from 5000-line single file into 7 modules**
- `core.js` — state, Store pattern, i18n, navigation
- `auth.js` — PIN security, lock screen
- `trips.js` — trips CRUD, calendar, dashboard, filters
- `tasks.js` — tasks CRUD, kanban, flights (travel), parts (work)
- `report.js` — 6-step field report, PDF export
- `bills.js` — expense bills, VND equivalent, bills PDF
- `sync.js` — Google Sheets push/pull with safe date/time converters

**Data load fixes (Google Sheets)**
- `safeDate(v)` — handles Date objects, ISO strings, slash dates, Excel serials
- `safeTime(v)` — only returns `HH:MM`, never a date string
- Prevents `1899-12-30` bug from corrupted time fields

**New columns added to Google Sheets**
- Trips: `Flight` (JSON — outbound + return flight details)
- Tasks: `FlightJson`, `PartsJson`
- Bills: `VndAmount` (VND equivalent from credit card)

**Cache management**
- SW cache: `plantlog-pro-v2` (old `plantlog-v4` cache auto-deleted on first load)
- Forces fresh file download after every update

---

### v3.x — Feature additions (pre-modular, in plantlog_v4.html)

- Bills tab with VND equivalent column and trip linking
- Flight details on Travel tasks and Trips (outbound + return, PNR)
- Trip notes — inline textarea per trip, auto-saves
- Filter + search on Trips and Tasks screens (text search + date range)
- Parts / Materials section (initial version)
- Today's Tasks on Home — all categories grouped by status with quick toggle
- PIN security — SHA-256 hash, auto-lock 5 min
- Photo picker — Camera vs Gallery bottom sheet
- `1899-12-30` date bug fixed (time fields leaking into date display)
- Task stats grid (4 columns: Total / Pending / Active / Done)
- Calendar CSS fixed (`.cc`, `.cgrid`, `.cn`, `.chdr` classes)

---

## Module Communication

All cross-module calls go through the **Store**:

```js
// ✅ Correct
Store.commit('task:save');        // triggers renderTasks() + renderDash() + sync

// ❌ Wrong — don't call another module's function directly
renderTripList();  // from inside tasks.js
```

Store events:
| Event | Triggers |
|---|---|
| `trip:save` | `renderTripList()`, `renderDash()` |
| `trip:delete` | `renderTripList()`, `renderDash()` |
| `task:save` | `renderTasks()`, `renderDash()`, `renderCalendar()` |
| `task:status` | `renderTasks()`, `renderDash()` |
| `bill:save` | `renderBillsScreen()`, `renderDash()` |
| `leave:save` | `renderCalendar()`, `renderDash()` |
| `*` (wildcard) | `svAndSync()` — auto-syncs to Google Sheets |

---

## GitHub Pages Deployment

1. Push to `main` branch → auto-deploys via `.github/workflows/deploy.yml`
2. URL: `https://YOUR_USERNAME.github.io/plantlog/`

**Files to update after each change:**
- Bug in trips → upload `src/modules/trips.js`
- UI change → upload `src/styles.css`
- New feature → upload relevant module + `src/index.html`
- Always upload `src/sw.js` with bumped cache version to force refresh

---

## Google Sheets Setup

1. **script.google.com** → New project → paste `PlantLog_GoogleAppsScript.gs`
2. Run `setupSheets()` → creates `PlantLog Pro Database` in Google Drive
3. Deploy → Web App → Anyone → copy `/exec` URL
4. PlantLog Pro → Settings → Google Sheets → paste URL → Sync

---

*PlantLog Pro · Modular PWA · MIT License*
