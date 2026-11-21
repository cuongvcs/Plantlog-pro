'use strict';
// =====================================================
// PlantLog — reliability.js   (IMP-35 / IMP-36)
// Reliability & UX infrastructure layer. Loaded right after core.js.
//   REL-01  Auto-backup: rolling daily snapshots (IndexedDB)
//   REL-02  genId(): collision-safe record IDs
//   REL-03  S.schemaVersion + versioned migrations
//   REL-04  Service-Worker "new version" banner (no silent swap)
//   ARC-01  IndexedDB mirror, quota-overflow safety net & recovery
//   UX-07   Undo for deletes (6 s window)
//   UX-10   Accessibility pass (aria-labels, keyboard activation)
// All functions are plain globals (single-script bundle) and every
// browser API is feature-detected so the layer degrades gracefully.
// =====================================================

var SCHEMA_VERSION = 2;
var MIRROR_DB = 'PlantLogDB';
var MIRROR_STORE = 'kv';
var MIRROR_BACKUP_SLOTS = 3;
var MIRROR_DEBOUNCE_MS = 800;
var UNDO_WINDOW_MS = 6000;
const DEFAULT_CHECK_TEMPLATES = [
  'Safety pressure valves', 'Fire suppression system', 'Emergency stop buttons',
  'PPE compliance check', 'Electrical panel condition', 'Pipe insulation condition'
];

// ═══════ REL-02: collision-safe IDs ═══════
// Format stays "<prefix><epochMs>_<random>" so existing string handling
// (slice, includes, sorting by prefix) keeps working.
function genId(prefix) {
  let rnd = '';
  try {
    if (typeof crypto !== 'undefined' && crypto) {
      if (typeof crypto.randomUUID === 'function') {
        rnd = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      } else if (typeof crypto.getRandomValues === 'function') {
        const a = new Uint32Array(1);
        crypto.getRandomValues(a);
        rnd = a[0].toString(36);
      }
    }
  } catch (e) { /* fall through to Math.random */ }
  if (!rnd) rnd = Math.random().toString(36).slice(2, 10);
  return (prefix || '') + Date.now() + '_' + rnd;
}

// ═══════ REL-03: schema versioning & migrations ═══════
function _isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

// Idempotent: guarantees every collection exists with the right type.
function ensureStateShape(st) {
  if (!_isObj(st)) return st;
  ['trips', 'tasks', 'bills', 'machines', 'plans', 'inspections', 'assets', 'scratchpad',
    'library', 'reminders', 'tripClaims', 'defaultTeam'].forEach(k => {
    if (!Array.isArray(st[k])) st[k] = [];
  });
  ['reports', 'leaveData', 'deletedIds'].forEach(k => {
    if (!_isObj(st[k])) st[k] = {};
  });
  if (!Array.isArray(st.templates)) st.templates = DEFAULT_CHECK_TEMPLATES.slice();
  if (!_isObj(st.profile)) st.profile = { name: '', title: '', company: '', empid: '', signature: '' };
  if (!_isObj(st.creditCard)) st.creditCard = { budget: 50000000, cardName: 'Corporate Credit Card', transfers: [] };
  if (!Array.isArray(st.creditCard.transfers)) st.creditCard.transfers = [];
  if (!_isObj(st.telegramConfig)) st.telegramConfig = { token: '', chatId: '', notifyTrips: true, notifyTasks: true, notifyLeave: true };
  if (!_isObj(st.calendarConfig)) st.calendarConfig = { calId: '', pushTrips: true, pushTasks: true, pullEvents: true };
  return st;
}

// Remove duplicate ids (keep the most recently updated) and give id-less records one.
function _dedupeById(list) {
  const byId = new Map();
  let changed = false;
  const stamp = x => new Date(x.updatedAt || x.createdAt || 0).getTime() || 0;
  list.forEach(item => {
    if (!_isObj(item)) { changed = true; return; }        // drop null / primitives
    if (item.id === undefined || item.id === null || item.id === '') {
      item.id = genId('rec_'); changed = true;
    }
    const prev = byId.get(item.id);
    if (!prev) { byId.set(item.id, item); return; }
    changed = true;
    if (stamp(item) >= stamp(prev)) byId.set(item.id, item);
  });
  return { list: Array.from(byId.values()), changed };
}

const STATE_MIGRATIONS = [
  {
    to: 1, // baseline: collections must exist (older builds omitted several)
    run(st) { ensureStateShape(st); }
  },
  {
    to: 2, // v4.14: unique ids for trips/tasks/bills/assets/notes (Date.now() ids could collide)
    run(st) {
      ['trips', 'tasks', 'bills', 'assets', 'scratchpad'].forEach(k => {
        const r = _dedupeById(st[k]);
        if (r.changed) st[k] = r.list;
      });
    }
  }
];

// Returns { from, to, migrated }. Never downgrades data written by a newer build.
function migrateState(st) {
  const target = st || (typeof S !== 'undefined' ? S : null);
  if (!_isObj(target)) return { from: 0, to: 0, migrated: false };
  const from = Number(target.schemaVersion) || 0;
  ensureStateShape(target);
  if (from > SCHEMA_VERSION) {
    console.warn('[Migrate] Data schema v' + from + ' is newer than this app (v' + SCHEMA_VERSION + ') - left untouched');
    return { from, to: from, migrated: false };
  }
  let ran = false;
  STATE_MIGRATIONS.forEach(m => {
    if (from < m.to) {
      try { m.run(target); ran = true; }
      catch (e) { console.warn('[Migrate] step v' + m.to + ' failed:', e); }
    }
  });
  if (from < SCHEMA_VERSION) target.schemaVersion = SCHEMA_VERSION;
  return { from, to: target.schemaVersion || from, migrated: ran };
}

// ═══════ ARC-01 / REL-01: IndexedDB mirror + rolling daily backups ═══════
// localStorage stays the synchronous primary store. Every sv() is mirrored
// (debounced) into IndexedDB, which has no 5 MB cap, and the previous day's
// state is rotated into bak_0..bak_2 once per day. If a localStorage write
// fails (quota) the mirror still holds the newest state and is restored at
// the next boot.
var StorageMirror = {
  _db: null,
  _open() {
    if (this._db) return this._db;
    const p = new Promise((resolve, reject) => {
      try {
        if (typeof indexedDB === 'undefined' || !indexedDB) return reject(new Error('IndexedDB unavailable'));
        const req = indexedDB.open(MIRROR_DB, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(MIRROR_STORE)) db.createObjectStore(MIRROR_STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
        req.onblocked = () => reject(new Error('IndexedDB blocked'));
      } catch (e) { reject(e); }
    });
    p.catch(() => { this._db = null; });
    this._db = p;
    return p;
  },
  get(key) {
    return this._open().then(db => new Promise((resolve, reject) => {
      const r = db.transaction(MIRROR_STORE, 'readonly').objectStore(MIRROR_STORE).get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    }));
  },
  put(key, val) {
    return this._open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(MIRROR_STORE, 'readwrite');
      tx.objectStore(MIRROR_STORE).put(val, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    }));
  }
};

let _mirrorTimer = null;
let _mirrorPending = null;     // { json, ts }
let _mirrorBusy = false;
let _mirrorHold = false;       // true while a boot-time recovery decision is pending
let _bootInfo = { hadLocal: false, parseError: false };

function _dayKey(ts) { return typeof localDateStr === 'function' ? localDateStr(new Date(ts)) : new Date(ts).toISOString().slice(0, 10); }

function scheduleMirror(json, immediate) {
  _mirrorPending = { json, ts: (typeof S !== 'undefined' && S && S._savedAt) || Date.now() };
  clearTimeout(_mirrorTimer);
  if (immediate) { flushMirror(); return; }
  _mirrorTimer = setTimeout(flushMirror, MIRROR_DEBOUNCE_MS);
}

async function flushMirror() {
  if (_mirrorPending === null || _mirrorHold) return;
  if (_mirrorBusy) { _mirrorTimer = setTimeout(flushMirror, MIRROR_DEBOUNCE_MS); return; }
  const job = _mirrorPending;
  _mirrorPending = null;
  _mirrorBusy = true;
  try {
    const prev = await StorageMirror.get('state');
    // Rotate: when the stored state belongs to an earlier day, keep it as a daily snapshot.
    if (prev && prev.json && _dayKey(prev.ts) !== _dayKey(job.ts)) {
      for (let i = MIRROR_BACKUP_SLOTS - 1; i > 0; i--) {
        const older = await StorageMirror.get('bak_' + (i - 1));
        if (older) await StorageMirror.put('bak_' + i, older);
      }
      await StorageMirror.put('bak_0', prev);
    }
    await StorageMirror.put('state', { ts: job.ts, json: job.json });
  } catch (e) {
    console.warn('[Mirror] write skipped:', e && e.message);
  } finally {
    _mirrorBusy = false;
    if (_mirrorPending !== null) _mirrorTimer = setTimeout(flushMirror, MIRROR_DEBOUNCE_MS);
  }
}

// Re-render every view after state was replaced (restore / recovery / undo).
function refreshAllViews() {
  ['loadProfile', 'renderDash', 'renderTripList', 'renderCalendar', 'renderTasks',
    'renderTemplates', 'renderDefaultTeam', 'updateGSStatus', 'renderSettingsAbout',
    'renderBillsScreen', 'renderScratchpadList', 'renderAssetList'].forEach(name => {
    try { if (typeof window !== 'undefined' && typeof window[name] === 'function') window[name](); }
    catch (e) { /* a view that is not mounted must never block the others */ }
  });
  try {
    if (typeof currentBillsView !== 'undefined') {
      if (currentBillsView === 'card' && typeof renderCreditCardScreen === 'function') renderCreditCardScreen();
      else if (currentBillsView === 'claims' && typeof renderTripClaimsScreen === 'function') renderTripClaimsScreen();
    }
  } catch (e) { }
}

function applyRecoveredState(rec, reason) {
  let parsed = null;
  try { parsed = JSON.parse(rec && rec.json); } catch (e) { return false; }
  if (!_isObj(parsed)) return false;
  const clean = (typeof sanitizeJsonKeys_ === 'function') ? sanitizeJsonKeys_(parsed) : parsed;
  S = { ...S, ...clean };
  migrateState(S);
  sv();
  refreshAllViews();
  return true;
}

// Called once from init(): decides whether localStorage or the mirror holds the truth.
async function recoverFromMirror() {
  try {
    const rec = await StorageMirror.get('state');
    const localTs = Number(S._savedAt) || 0;
    let chosen = null, reason = '';

    if (_bootInfo.parseError || !_bootInfo.hadLocal) {
      chosen = (rec && rec.json) ? rec : null;
      if (!chosen) {
        for (let i = 0; i < MIRROR_BACKUP_SLOTS && !chosen; i++) {
          const b = await StorageMirror.get('bak_' + i);
          if (b && b.json) chosen = b;
        }
      }
      reason = _bootInfo.parseError ? 'corrupt' : 'missing';
    } else if (rec && rec.json && Number(rec.ts) > localTs + 1000) {
      chosen = rec; reason = 'newer';   // a previous localStorage write failed (quota)
    }

    if (chosen && applyRecoveredState(chosen, reason)) {
      if (typeof showToast === 'function') {
        showToast(reason === 'newer'
          ? '🛟 Restored latest data from device backup (browser storage was full)'
          : '🛟 Data restored from automatic backup ✓', 5000);
      }
      return true;
    }
    // First run after upgrade: seed the mirror from the current state.
    if (!rec && _bootInfo.hadLocal) scheduleMirror(JSON.stringify(S));
    return false;
  } catch (e) {
    console.warn('[Recover] skipped:', e && e.message);
    return false;
  } finally {
    _mirrorHold = false;
    if (_mirrorPending !== null) flushMirror();
  }
}

async function listAutoBackups() {
  const slots = [['state', 'Latest'], ['bak_0', 'Daily 1'], ['bak_1', 'Daily 2'], ['bak_2', 'Daily 3'], ['pre_restore', 'Before last restore']];
  const out = [];
  for (const [key, label] of slots) {
    try {
      const rec = await StorageMirror.get(key);
      if (!rec || !rec.json) continue;
      let info = { trips: '?', tasks: '?', bills: '?' };
      try {
        const p = JSON.parse(rec.json);
        info = { trips: (p.trips || []).length, tasks: (p.tasks || []).length, bills: (p.bills || []).length };
      } catch (e) { }
      out.push({ key, label, ts: rec.ts, rec, ...info });
    } catch (e) { break; }
  }
  return out;
}

async function refreshBackupStatus() {
  const el = document.getElementById('auto-backup-status');
  const aboutEl = document.getElementById('about-backup-status');
  let text = 'Not available on this browser';
  try {
    const rec = await StorageMirror.get('state');
    text = rec && rec.ts ? 'Last backup: ' + new Date(rec.ts).toLocaleString() : 'Waiting for first backup…';
  } catch (e) { }
  if (el) el.textContent = text;
  if (aboutEl) aboutEl.textContent = text.replace('Last backup: ', '');
  return text;
}

async function openAutoBackupRestore() {
  const list = await listAutoBackups();
  if (!list.length) { showToast('No automatic backup found on this device yet'); return; }
  const lines = list.map((x, i) =>
    `${i + 1}) ${x.label} — ${new Date(x.ts).toLocaleString()} (${x.trips} trips, ${x.tasks} tasks, ${x.bills} bills)`).join('\n');
  const ans = await appPrompt('Automatic backups kept on this device:\n' + lines + '\n\nEnter the number to restore:', '1',
    { title: '🛟 Restore Auto-Backup', placeholder: '1' });
  if (ans === null || ans === undefined) return;
  const idx = parseInt(ans, 10) - 1;
  if (!(idx >= 0 && idx < list.length)) { showToast('Invalid selection'); return; }
  const pick = list[idx];
  const ok = await appConfirm('Replace current data with "' + pick.label + '" (' + new Date(pick.ts).toLocaleString() + ')?\nYour current data is saved first as "Before last restore".', {
    title: 'Restore Backup', confirmText: 'Restore', icon: '🛟'
  });
  if (!ok) return;
  try { await StorageMirror.put('pre_restore', { ts: Date.now(), json: JSON.stringify(S) }); } catch (e) { }
  if (applyRecoveredState(pick.rec, 'manual')) showToast('✅ Backup restored');
  else showToast('❌ Could not read that backup');
}

// ═══════ UX-07: undo for deletes ═══════
const UNDO_KEYS = ['trips', 'tasks', 'bills', 'assets', 'scratchpad'];
let _undoSnap = null;
let _undoTimer = null;

function takeUndoSnapshot(label) {
  const snap = { label: label || 'item', at: Date.now(), arrays: {}, reports: { ...(S.reports || {}) } };
  UNDO_KEYS.forEach(k => { snap.arrays[k] = Array.isArray(S[k]) ? S[k].slice() : []; });
  _undoSnap = snap;
  return snap;
}

function hideUndoToast() {
  const el = typeof document !== 'undefined' ? document.getElementById('undo-toast') : null;
  if (el) el.classList.remove('show');
}

function showUndoToast(msg) {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('undo-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'undo-toast';
    el.className = 'undo-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = '';
  const span = document.createElement('span');
  span.textContent = msg;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '↩ Undo';
  btn.setAttribute('aria-label', 'Undo delete');
  btn.onclick = () => undoLastDelete();
  el.appendChild(span);
  el.appendChild(btn);
  el.classList.add('show');
  clearTimeout(_undoTimer);
  _undoTimer = setTimeout(() => { hideUndoToast(); _undoSnap = null; }, UNDO_WINDOW_MS);
}

// Merge-style restore: re-adds the deleted records without discarding anything
// the user created during the undo window.
function undoLastDelete() {
  const snap = _undoSnap;
  if (!snap) return false;
  clearTimeout(_undoTimer);
  _undoSnap = null;
  hideUndoToast();

  const nowIso = new Date().toISOString();
  const restoredIds = [];
  const restoredBillTrips = new Set();
  const restoredNotes = [];

  UNDO_KEYS.forEach(k => {
    const cur = Array.isArray(S[k]) ? S[k] : [];
    const have = new Set(cur.map(x => x && x.id));
    const back = (snap.arrays[k] || []).filter(x => x && x.id !== undefined && !have.has(x.id));
    back.forEach(x => {
      x.updatedAt = nowIso;                 // newer than the tombstone -> wins sync merges
      restoredIds.push(x.id);
      if (k === 'bills' && x.tripId) restoredBillTrips.add(x.tripId);
      if (k === 'scratchpad') restoredNotes.push(x);
    });
    S[k] = cur.concat(back);
  });

  if (!_isObj(S.deletedIds)) S.deletedIds = {};
  if (!_isObj(S.reports)) S.reports = {};
  restoredIds.forEach(id => {
    delete S.deletedIds[id];
    if (snap.reports[id] && !S.reports[id]) S.reports[id] = snap.reports[id];
  });

  if (restoredBillTrips.size && typeof calculateTripTotalClaim === 'function') {
    (S.tripClaims || []).forEach(c => {
      if (restoredBillTrips.has(c.tripId)) {
        c.totalClaim = calculateTripTotalClaim(c.tripId);
        c.updatedAt = nowIso;
      }
    });
  }

  sv();
  refreshAllViews();
  if (S.gsUrl && typeof syncSingleQuickSnap === 'function') {
    restoredNotes.forEach(n => { try { syncSingleQuickSnap(n); } catch (e) { } });
  }
  if (typeof svAndSync === 'function') svAndSync('undo', { skipSave: true });
  if (typeof showToast === 'function') showToast('↩ Restored');
  return restoredIds.length > 0;
}

// ═══════ REL-04: Service Worker update banner ═══════
let _swUpdateRequested = false;
let _swReg = null;

function showUpdateBanner(worker) {
  if (typeof document === 'undefined' || document.getElementById('update-banner')) return;
  const bar = document.createElement('div');
  bar.id = 'update-banner';
  bar.className = 'update-banner';
  bar.setAttribute('role', 'alert');
  const span = document.createElement('span');
  span.textContent = '🔄 A new version is available';
  const reloadBtn = document.createElement('button');
  reloadBtn.type = 'button';
  reloadBtn.textContent = 'Reload';
  reloadBtn.onclick = () => {
    reloadBtn.disabled = true;
    reloadBtn.textContent = 'Updating...';
    _swUpdateRequested = true;
    try {
      if (worker && typeof worker.postMessage === 'function') {
        worker.postMessage('SKIP_WAITING');
      }
    } catch (e) {
      console.warn('[SW update postMessage]', e);
    }
    try {
      if (_swReg && _swReg.waiting) {
        _swReg.waiting.postMessage('SKIP_WAITING');
      }
    } catch (e) {}
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('SKIP_WAITING');
      }
    } catch (e) {}
    // Failsafe: force reload after 350ms even if controllerchange event is suppressed
    setTimeout(() => {
      location.reload();
    }, 350);
  };
  const laterBtn = document.createElement('button');
  laterBtn.type = 'button';
  laterBtn.className = 'ub-later';
  laterBtn.textContent = 'Later';
  laterBtn.onclick = () => bar.remove();
  bar.appendChild(span);
  bar.appendChild(reloadBtn);
  bar.appendChild(laterBtn);
  document.body.appendChild(bar);
}

function watchServiceWorkerUpdates(reg) {
  if (!reg || typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  _swReg = reg;
  const announce = w => { if (w && navigator.serviceWorker.controller) showUpdateBanner(w); };
  if (reg.waiting) announce(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const nw = reg.installing;
    if (!nw) return;
    nw.addEventListener('statechange', () => { if (nw.state === 'installed') announce(nw); });
  });
  // Reload exactly once, and only when the user asked for the update.
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!_swUpdateRequested || reloading) return;
    reloading = true;
    location.reload();
  });
}

// ═══════ UX-10: accessibility pass ═══════
const A11Y_LABELS = {
  '✕': 'Close', '✖': 'Close', '×': 'Delete', '←': 'Back', '›': 'Open', '＋': 'Add', '+': 'Add',
  '✏️': 'Edit', '✏': 'Edit', '🗑': 'Delete', '🗑️': 'Delete', '☁️': 'Sync', '🔔': 'Reminders',
  '🔍': 'Search', '↓': 'Download', '↑': 'Upload', '📅': 'Calendar', '⚡': 'Quick action'
};
const A11Y_CLICKABLE = '.si[onclick], .sb2[onclick], .home-fin-card[onclick], .tc[onclick], .kb-card[onclick], .cc-item-row[onclick]';

function applyA11y(root) {
  if (typeof document === 'undefined') return;
  const scope = (root && root.querySelectorAll) ? root : document;
  scope.querySelectorAll('button:not([aria-label])').forEach(b => {
    const txt = (b.textContent || '').trim();
    if (/[A-Za-z\u00C0-\u1EF9]{2,}/.test(txt)) return;      // already has readable text
    const label = b.getAttribute('title') || A11Y_LABELS[txt];
    if (label) b.setAttribute('aria-label', label);
  });
  scope.querySelectorAll(A11Y_CLICKABLE).forEach(el => {
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  });
}

function initA11y() {
  if (typeof document === 'undefined') return;
  applyA11y();
  document.addEventListener('keydown', e => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button' && t.tagName !== 'BUTTON') {
      e.preventDefault();
      t.click();
    }
  });
  if (typeof MutationObserver !== 'undefined') {
    const host = document.getElementById('app');
    if (host) {
      let timer = null;
      new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(() => applyA11y(host), 500); })
        .observe(host, { childList: true, subtree: true });
    }
  }
}

// Flush the mirror when the page is hidden so the last edits are not lost.
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushMirror();
    else if (_swReg && typeof _swReg.update === 'function') { try { _swReg.update(); } catch (e) { } }
  });
}

