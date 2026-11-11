'use strict';
// =====================================================
// PlantLog — sync.js
// Google Sheets sync, loadFromSheets, svAndSync
// =====================================================

// ═══════ GOOGLE SHEETS SYNC ═══════
function getGSUrl() { return S.gsUrl || ''; }
function getGSApiKey() { return S.gsApiKey || ''; }

function toggleGSApiKeyVisibility() {
  const inp = document.getElementById('gs-api-key');
  const btn = document.getElementById('gs-api-key-toggle');
  if (!inp) return;
  const isPwd = inp.type === 'password';
  inp.type = isPwd ? 'text' : 'password';
  if (btn) btn.textContent = isPwd ? '🙈' : '👁️';
}

function syncGSInputsToState_() {
  const urlEl = document.getElementById('gs-url');
  const keyEl = document.getElementById('gs-api-key');
  let changed = false;
  if (urlEl && urlEl.value.trim() && urlEl.value.trim() !== S.gsUrl) {
    S.gsUrl = urlEl.value.trim();
    changed = true;
  }
  if (keyEl && keyEl.value.trim() !== (S.gsApiKey || '')) {
    S.gsApiKey = keyEl.value.trim();
    changed = true;
  }
  if (changed) sv();
}

function gsUrlChanged() {
  syncGSInputsToState_();
  // Hide old result when user types
  const res = document.getElementById('gs-test-result');
  if (res) res.style.display = 'none';
}

function toggleGSGuide() {
  const body = document.getElementById('gs-guide-body');
  const arrow = document.getElementById('gs-guide-arrow');
  if (body) { const open = body.style.display === 'none'; body.style.display = open ? '' : 'none'; if (arrow) arrow.textContent = open ? '▲' : '▼'; }
}

function showGSResult(msg, type) {
  // type: 'ok' | 'warn' | 'error'
  const el = document.getElementById('gs-test-result');
  if (!el) return;
  const colors = { ok: { bg: 'var(--gl)', color: 'var(--gd)' }, warn: { bg: 'var(--al)', color: '#92400E' }, error: { bg: 'var(--rl)', color: '#991B1B' } };
  const c = colors[type] || colors.warn;
  el.style.background = c.bg; el.style.color = c.color; el.style.display = 'block';
  el.textContent = msg;
}

function updateGSStatus() {
  const el = document.getElementById('gsheet-status');
  const urlEl = document.getElementById('gs-url');
  const keyEl = document.getElementById('gs-api-key');
  const bar = document.getElementById('gs-status-bar');
  if (keyEl) keyEl.value = S.gsApiKey || '';
  if (S.gsUrl) {
    const keyBadge = S.gsApiKey ? '🔐 Key set' : '⚠ No API Key';
    if (el) el.textContent = S.lastSync ? `Last sync: ${new Date(S.lastSync).toLocaleString()} · ${keyBadge}` : `Connected (${keyBadge}) — not synced yet`;
    if (urlEl) urlEl.value = S.gsUrl;
    if (bar) {
      bar.style.display = 'flex';
      bar.style.background = (S.lastSync && S.gsApiKey) ? 'var(--gl)' : 'var(--al)';
      const icon = document.getElementById('gs-status-icon');
      const title = document.getElementById('gs-status-title');
      const sub = document.getElementById('gs-status-sub');
      if (icon) icon.textContent = (S.lastSync && S.gsApiKey) ? '✅' : '⚠️';
      if (title) title.style.color = (S.lastSync && S.gsApiKey) ? 'var(--gd)' : '#92400E';
      if (title) title.textContent = S.lastSync ? (S.gsApiKey ? 'Connected & synced' : 'Synced — add API Secret Key') : 'URL saved — sync to verify';
      if (sub) sub.style.color = (S.lastSync && S.gsApiKey) ? 'var(--gd)' : '#92400E';
      if (sub) sub.textContent = S.lastSync ? 'Last sync: ' + new Date(S.lastSync).toLocaleString() : S.gsUrl.substring(0, 45) + '...';
    }
  } else {
    if (bar) bar.style.display = 'none';
    if (el) el.textContent = 'Not connected';
  }
  if (typeof renderSettingsAbout === 'function') renderSettingsAbout();
}

// Google Apps Script CORS fix:
// GET requests work fine (GAS handles CORS for GET)
// POST must use text/plain to avoid CORS preflight, carrying apiKey in JSON body
async function gsPost(url, body) {
  try {
    const apiKey = getGSApiKey();
    const reqBody = { ...(body || {}) };
    if (apiKey && !reqBody.apiKey) reqBody.apiKey = apiKey;
    const r = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(reqBody),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    return await r.json();
  } catch (e) {
    throw new Error('FETCH_FAILED: ' + e.message);
  }
}

async function gsGet(url, params) {
  const apiKey = getGSApiKey();
  const fullParams = { ...(params || {}) };
  if (apiKey && !fullParams.apiKey) fullParams.apiKey = apiKey;
  const qs = Object.entries(fullParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const fullUrl = url + (qs ? '?' + qs : '');
  const r = await fetch(fullUrl, { method: 'GET', mode: 'cors' });
  return await r.json();
}

async function testGSConnection() {
  const url = (document.getElementById('gs-url').value || '').trim();
  const keyEl = document.getElementById('gs-api-key');
  const apiKey = keyEl ? keyEl.value.trim() : getGSApiKey();

  if (!url) { showGSResult('⚠ Paste your Apps Script URL first', 'warn'); return; }
  if (!url.includes('script.google.com')) { showGSResult('❌ URL must be a script.google.com address', 'error'); return; }

  S.gsUrl = url;
  S.gsApiKey = apiKey;
  sv();
  updateGSStatus();

  if (!url.endsWith('/exec') && !url.includes('/exec?')) { showGSResult('⚠ URL should end with /exec — check your deployment URL', 'warn'); return; }

  showGSResult('Testing connection & verifying API Key...', 'warn');

  try {
    const data = await gsGet(url, { action: 'ping' });
    if (data && data.ok) {
      showGSResult('✅ Authorized & Connected! Google Sheet is ready.', 'ok');
      S.lastSync = null; sv(); updateGSStatus();
    } else if (data && data.code === 401) {
      showGSResult('❌ Unauthorized: Invalid API Secret Key. Check Sheet "Settings" -> api_secret.', 'error');
    } else {
      showGSResult('⚠ Received response but got error: ' + ((data && data.error) || 'unknown'), 'warn');
    }
  } catch (e) {
    // CORS blocks GET test from some browsers — this is expected
    // The sync (POST with text/plain) usually works even when GET test fails
    showGSResult('⚠ Browser CORS blocked GET test (normal). Tap "Sync all data" to verify URL & API Key.', 'warn');
    const btn = document.getElementById('gs-sync-btn');
    if (btn) { btn.style.background = 'var(--amber)'; btn.textContent = '⬆ Try sync to verify'; }
    setTimeout(() => { if (btn) { btn.style.background = ''; btn.textContent = '⬆ Sync all data'; } }, 4000);
  }
}

// Compress bill & field photos to small JPEG thumbnails before sending
const compressPhoto = async dataUrl => {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    return (typeof dataUrl === 'string' && dataUrl.startsWith('http')) ? dataUrl : '';
  }
  if (dataUrl.length < 3000) return dataUrl;
  if (typeof window === 'undefined' || typeof Image === 'undefined') return dataUrl;
  try {
    return await new Promise(resolve => {
      const timeout = setTimeout(() => resolve(''), 2500);
      const img = new Image();
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const MAX = 180;
          let w = img.width, h = img.height;
          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', 0.4));
        } catch (ex) { resolve(''); }
      };
      img.onerror = () => { clearTimeout(timeout); resolve(''); };
      img.src = dataUrl;
    });
  } catch (e) { return ''; }
};

/**
 * IMP-27: Incremental Single-Note Sync for QuickSnap
 * Pushes only the newly created or modified Quick Note to Google Sheets
 */
async function syncSingleQuickSnap(item) {
  if (!item || !item.id) return { ok: false, error: 'No item specified' };
  const url = getGSUrl();
  if (!url) {
    item.synced = false;
    return { ok: false, offline: true };
  }

  // Compress photo if present
  let photoStr = String(item.photo || '');
  if (photoStr.startsWith('data:image')) {
    try {
      if (typeof compressPhoto === 'function') {
        photoStr = await compressPhoto(photoStr);
      }
    } catch (e) { }
  }

  const s = v => (v === null || v === undefined) ? '' : String(v);
  const tr = (S.trips || []).find(t => t.id === item.tripId);
  const payload = {
    action: 'upsertQuickSnap',
    item: {
      id: s(item.id),
      category: s(item.category) || 'general',
      title: s(item.title),
      notes: s(item.notes || item.text),
      tripId: s(item.tripId),
      tripPlant: tr ? s(tr.plant) : (s(item.tripPlant) || ''),
      photo: photoStr,
      createdAt: s(item.createdAt || new Date().toISOString()),
      updatedAt: s(item.updatedAt || new Date().toISOString())
    }
  };

  try {
    const res = await gsPost(url, payload);
    if (res && res.ok) {
      item.synced = true;
      sv();
      // Dynamically add synced badge if item card is visible
      const card = document.getElementById(`scratch-item-${item.id}`);
      if (card) {
        const badgeBox = card.querySelector('.scratch-badge-container');
        if (badgeBox && !badgeBox.querySelector('.scratch-badge-synced')) {
          const badge = document.createElement('span');
          badge.className = 'scratch-badge-synced';
          badge.title = 'Synced to Google Sheets';
          badge.textContent = '☁️ Synced';
          badgeBox.appendChild(badge);
        }
      }
      showToast('☁️ Note synced to Google Sheet ✓');
      return { ok: true, mode: res.mode, id: item.id };
    } else if (res && res.error && res.error.includes('Unknown action')) {
      // Backend GAS not updated with IMP-27 yet; fallback to debounced full sync
      console.warn('Backend GAS missing upsertQuickSnap, falling back to full sync');
      if (typeof svAndSync === 'function') svAndSync('quick_scratch');
      return { ok: false, fallback: true };
    } else {
      item.synced = false;
      sv();
      return { ok: false, error: (res && res.error) || 'Sync failed' };
    }
  } catch (err) {
    console.warn('Single snap sync network error:', err);
    item.synced = false;
    return { ok: false, error: err.message };
  }
}

/**
 * IMP-31: Incremental Single-Row Sync for TripClaims
 * Updates only the targeted trip claim on Google Sheets in-place
 */
async function syncSingleTripClaim(item) {
  if (!item || !item.tripId) return { ok: false, error: 'No item or tripId specified' };
  const url = getGSUrl();
  if (!url) {
    return { ok: false, offline: true };
  }

  const s = v => (v === null || v === undefined) ? '' : String(v);
  const payload = {
    action: 'upsertTripClaim',
    item: {
      tripId: s(item.tripId),
      fromDate: s(item.fromDate),
      toDate: s(item.toDate),
      weekNo: s(item.weekNo),
      travelDetail: s(item.travelDetail),
      totalClaim: typeof item.totalClaim === 'number' ? item.totalClaim : (parseFloat(item.totalClaim) || 0),
      dateRequest: s(item.dateRequest),
      dateApproved: s(item.dateApproved),
      processDate: s(item.processDate),
      doneDate: s(item.doneDate),
      paymentStatus: s(item.paymentStatus || 'Not yet'),
      comment: s(item.comment),
      updatedAt: s(item.updatedAt || new Date().toISOString())
    }
  };

  try {
    const res = await gsPost(url, payload);
    if (res && res.ok) {
      showToast('☁️ Claim synced to Google Sheet ✓');
      return { ok: true, mode: res.mode, tripId: item.tripId };
    } else if (res && res.error && res.error.includes('Unknown action')) {
      console.warn('Backend GAS missing upsertTripClaim, falling back to full sync');
      if (typeof svAndSync === 'function') svAndSync('trip_claim');
      return { ok: false, fallback: true };
    } else {
      return { ok: false, error: (res && res.error) || 'Sync failed' };
    }
  } catch (err) {
    console.warn('Single trip claim sync network error:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * IMP-31: Compare trip claims in chronological order
 * Sorts from Week 1 (early in year) down to Week 52/53 (late in year)
 */
function compareTripClaimsChronological(a, b) {
  const da = String(a.fromDate || a.date || '').trim();
  const db = String(b.fromDate || b.date || '').trim();
  if (!da && !db) return String(a.tripId || '').localeCompare(String(b.tripId || ''));
  if (!da) return 1;
  if (!db) return -1;

  const infoA = typeof getWeekInfo === 'function' ? getWeekInfo(da) : null;
  const infoB = typeof getWeekInfo === 'function' ? getWeekInfo(db) : null;

  if (infoA && infoB) {
    if (infoA.year !== infoB.year) return infoA.year - infoB.year;
    if (infoA.week !== infoB.week) return infoA.week - infoB.week;
  }

  if (da !== db) return da.localeCompare(db);
  const ea = String(a.toDate || a.dateEnd || '').trim();
  const eb = String(b.toDate || b.dateEnd || '').trim();
  if (ea !== eb) return ea.localeCompare(eb);
  return String(a.tripId || '').localeCompare(String(b.tripId || ''));
}

/**
 * IMP-31: Dedicated One-Click Sync for All Trip Claims
 * Computes claims for all trips and pushes them to the TripClaims sheet immediately
 */
async function syncAllTripClaims() {
  const url = getGSUrl();
  if (!url) {
    showToast('⚠️ Google Sheets URL not configured in Settings');
    return;
  }

  const syncBtn = document.getElementById('btn-sync-all-claims');
  const topSyncBtn = document.getElementById('claims-sync-btn');
  if (syncBtn) { syncBtn.disabled = true; syncBtn.innerHTML = '⟳ Syncing claims…'; }
  if (topSyncBtn) { topSyncBtn.disabled = true; topSyncBtn.innerHTML = '⟳…'; }

  try {
    if (!S.tripClaims) S.tripClaims = [];
    const claims = (S.trips || []).map(tr => {
      let claim = S.tripClaims.find(c => String(c.tripId) === String(tr.id));
      const totalClaim = typeof calculateTripTotalClaim === 'function' ? calculateTripTotalClaim(tr.id) : 0;
      const weekLabel = typeof getTripWeekLabel === 'function' ? getTripWeekLabel(tr.date, tr.dateEnd) : '';
      if (!claim) {
        claim = {
          tripId: tr.id,
          dateRequest: '',
          dateApproved: '',
          processDate: '',
          doneDate: '',
          paymentStatus: 'Not yet',
          comment: '',
          createdAt: new Date().toISOString()
        };
        S.tripClaims.push(claim);
      }
      claim.fromDate = tr.date || '';
      claim.toDate = tr.dateEnd || tr.date || '';
      claim.weekNo = weekLabel || '';
      claim.travelDetail = `${tr.plant}${tr.location ? ' • ' + tr.location : ''}${tr.purpose ? ' (' + tr.purpose + ')' : ''}`;
      claim.totalClaim = totalClaim;
      claim.updatedAt = claim.updatedAt || new Date().toISOString();
      return claim;
    });

    // IMP-31: Sort claims chronologically ascending (Week 1 -> Week 53)
    claims.sort(compareTripClaimsChronological);
    sv();

    // Try fast batch claims sync first
    const res = await gsPost(url, { action: 'syncTripClaims', claims: claims });
    if (res && res.ok) {
      showToast(`☁️ Synced ${claims.length} Trip Claims to Google Sheet ✓`);
      if (typeof renderTripClaimsScreen === 'function') renderTripClaimsScreen();
      return { ok: true, count: claims.length };
    } else {
      // Fallback to full syncToSheets
      console.warn('Batch claims sync returned non-ok, falling back to syncToSheets:', res);
      await syncToSheets();
      showToast(`☁️ Synced ${claims.length} Trip Claims to Google Sheet ✓`);
      if (typeof renderTripClaimsScreen === 'function') renderTripClaimsScreen();
      return { ok: true, fallback: true };
    }
  } catch (err) {
    console.warn('syncAllTripClaims error, falling back to syncToSheets:', err);
    try {
      await syncToSheets();
      showToast('☁️ Synced Trip Claims to Google Sheet ✓');
    } catch (e2) {
      showToast('❌ Sync failed: ' + err.message);
    }
  } finally {
    if (syncBtn) { syncBtn.disabled = false; syncBtn.innerHTML = '☁️ Sync All Trip Claims to Google Sheet'; }
    if (topSyncBtn) { topSyncBtn.disabled = false; topSyncBtn.innerHTML = '☁️ Sync'; }
  }
}

/**
 * IMP-27: Incremental Single-Note Deletion on Google Sheets
 * Deletes only the targeted row without clearing or rewriting the sheet
 */
async function deleteSingleQuickSnap(id) {
  if (!id) return { ok: false, error: 'No id' };
  const url = getGSUrl();
  if (!url) return { ok: false, offline: true };

  try {
    const res = await gsPost(url, {
      action: 'deleteQuickSnap',
      id: String(id)
    });
    if (res && res.ok) {
      return { ok: true, id: id };
    } else if (res && res.error && res.error.includes('Unknown action')) {
      // Fallback to debounced svAndSync
      if (typeof svAndSync === 'function') svAndSync('scratch_delete');
      return { ok: false, fallback: true };
    }
    return { ok: false, error: (res && res.error) || 'Delete failed' };
  } catch (err) {
    console.warn('Single snap delete network error:', err);
    return { ok: false, error: err.message };
  }
}

async function syncToSheets() {
  syncGSInputsToState_();
  const url = getGSUrl();
  if (!url) { updateGSStatus(); openModal('modal-gsheet'); showGSResult('⚠ Paste your Apps Script URL first', 'warn'); return; }

  const btn = document.getElementById('gs-sync-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Syncing...'; }
  showToast('Syncing to Google Sheets…');

  // IMP-02: Tải bù ảnh nền offline lên Google Drive trước khi gửi dữ liệu lên Sheets
  try { await flushPendingMedia(); } catch (x) { }

  // ── Every field explicitly cast to String to prevent type issues ──
  const s = v => (v === null || v === undefined) ? '' : String(v);

  const enrichedTasks = (S.tasks || []).map(tk => {
    const cl = tk.checklist || [];
    return {
      id: s(tk.id),
      title: s(tk.title),
      desc: s(tk.desc),
      category: s(tk.category) || 'work',
      dateStart: s(tk.dateStart || tk.date),
      timeStart: s(tk.timeStart || tk.time),
      dateEnd: s(tk.dateEnd || tk.dateStart || tk.date),
      timeEnd: s(tk.timeEnd),
      hours: s(tk.hours),
      minutes: s(tk.minutes),
      priority: s(tk.priority) || 'medium',
      period: s(tk.period),
      machine: s(tk.machine),
      plan: s(tk.plan),
      tripId: s(tk.tripId),
      status: s(tk.status) || 'pending',
      checklist: cl.map(c => (c.done ? '[x] ' : '[ ] ') + s(c.text || c.name)).join(' | '),
      checklistJson: JSON.stringify(cl),
      partsJson: tk.parts && tk.parts.length ? JSON.stringify(tk.parts) : '',
      flightJson: tk.flight ? JSON.stringify(tk.flight) : '',
      filesJson: tk.files && tk.files.length ? JSON.stringify(tk.files) : '',
      autoDuration: tk.autoDuration ? 'true' : 'false',
      durationMins: (() => {
        if (tk.autoDuration && tk.category === 'work') {
          try {
            const s = new Date((tk.dateStart || tk.date) + 'T' + (tk.timeStart || '00:00'));
            const e = new Date((tk.dateEnd || tk.dateStart || tk.date) + 'T' + (tk.timeEnd || '00:00'));
            const d = e - s;
            return d > 0 ? Math.round(d / 60000) : '';
          } catch (ex) { return ''; }
        }
        if (tk.hours || tk.minutes) return (parseInt(tk.hours || 0) * 60) + (parseInt(tk.minutes || 0));
        return '';
      })(),
      createdAt: s(tk.createdAt),
      updatedAt: s(tk.updatedAt) || new Date().toISOString()
    };
  });

  const enrichedTrips = (S.trips || []).map(tr => ({
    id: s(tr.id),
    plant: s(tr.plant),
    location: s(tr.location),
    date: s(tr.date),
    dateEnd: s(tr.dateEnd),
    purpose: s(tr.purpose),
    contact: s(tr.contact),
    transport: s(tr.transport),
    status: s(tr.status) || 'planned',
    notes: s(tr.notes),
    flight: tr.flight ? JSON.stringify(tr.flight) : '',
    ta: tr.ta ? JSON.stringify(tr.ta) : '',
    savedReports: tr.savedReports && tr.savedReports.length ? JSON.stringify(tr.savedReports) : '',
    createdAt: s(tr.createdAt)
  }));

  // Build compressed bills array
  const buildBills = async () => {
    const result = [];
    for (const b of (S.bills || [])) {
      const photos = b.photos || [];
      const compressed = [];
      for (const p of photos.slice(0, 3)) {  // max 3 photos per bill
        const cp = await compressPhoto(p);
        if (cp) compressed.push(cp);
      }
      result.push({
        id: s(b.id),
        tripId: s(b.tripId),
        date: s(b.date),
        billNumber: s(b.billNumber),
        detail: s(b.detail),
        amount: parseFloat(s(b.amount)) || 0,
        currency: s(b.currency) || 'VND',
        vndAmount: parseFloat(s(b.vndAmount)) || 0,
        category: s(b.category) || 'other',
        paymentMethod: s(b.paymentMethod || b.paymentTerm) || '1-Cash',
        notes: s(b.notes),
        photoCount: photos.length,
        photosJson: JSON.stringify(compressed),
        createdAt: s(b.createdAt)
      });
    }
    return result;
  };
  const enrichedBills = await buildBills();

  // IMP-22: Build QuickSnap (Scratchpad) payload
  const buildQuickSnap = async () => {
    const result = [];
    for (const sc of (S.scratchpad || [])) {
      const tr = (S.trips || []).find(t => t.id === sc.tripId);
      let photoStr = s(sc.photo);
      if (photoStr.startsWith('data:image')) {
        photoStr = await compressPhoto(photoStr);
      }
      result.push({
        id: s(sc.id),
        category: s(sc.category) || 'nameplate',
        title: s(sc.title),
        notes: s(sc.notes || sc.text),
        tripId: s(sc.tripId),
        tripPlant: tr ? s(tr.plant) : '',
        photo: photoStr,
        createdAt: s(sc.createdAt),
        updatedAt: s(sc.updatedAt || sc.createdAt)
      });
    }
    return result;
  };
  const enrichedQuickSnap = await buildQuickSnap();

  // IMP-23: Build Site Safety & LOTO payload from trips
  const buildSiteSafety = async () => {
    const result = [];
    for (const tr of (S.trips || [])) {
      if (tr.safety) {
        const sf = tr.safety;
        const loto = sf.loto || {};
        const em = sf.emergencyContacts || {};
        let lotoPhoto = s(loto.photo);
        if (lotoPhoto.startsWith('data:image')) {
          lotoPhoto = await compressPhoto(lotoPhoto);
        }
        result.push({
          tripId: s(tr.id),
          plant: s(tr.plant),
          permitNo: s(sf.permitNo),
          validUntil: s(sf.validUntil),
          permitTypes: Array.isArray(sf.permitTypes) ? sf.permitTypes.join(', ') : s(sf.permitTypes),
          padlockId: s(loto.padlockId),
          electricalIsolated: !!loto.electricalIsolated,
          pneumaticIsolated: !!loto.pneumaticIsolated,
          dangerTagHung: !!loto.dangerTagHung,
          zeroEnergyVerified: !!loto.zeroEnergyVerified,
          ccrPhone: s(em.ccrPhone),
          ehsPhone: s(em.ehsPhone),
          medicalPhone: s(em.medicalPhone),
          photo: lotoPhoto,
          updatedAt: s(sf.updatedAt || tr.updatedAt || tr.createdAt)
        });
      }
    }
    return result;
  };
  const enrichedSiteSafety = await buildSiteSafety();

  // IMP-19: Build Daily Service Tickets (Timesheets) payload from trips
  const buildServiceTickets = async () => {
    const result = [];
    for (const tr of (S.trips || [])) {
      if (Array.isArray(tr.timesheets)) {
        for (const tk of tr.timesheets) {
          const norm = parseFloat(tk.normalHours) || 0;
          const ot15 = parseFloat(tk.ot15Hours) || 0;
          const ot20 = parseFloat(tk.ot20Hours) || 0;
          const stby = parseFloat(tk.standbyHours) || 0;
          const trv = parseFloat(tk.travelHours) || 0;
          const total = norm + ot15 + ot20 + stby;
          let sigStr = s(tk.supervisorSig || tk.signature);
          if (sigStr.startsWith('data:image')) {
            sigStr = await compressPhoto(sigStr);
          }
          result.push({
            id: s(tk.id),
            tripId: s(tr.id),
            plant: s(tr.plant),
            date: s(tk.date),
            normalHours: norm,
            ot15Hours: ot15,
            ot20Hours: ot20,
            standbyHours: stby,
            travelHours: trv,
            totalHours: total,
            summary: s(tk.summary || tk.workSummary),
            supervisorName: s(tk.supervisorName),
            supervisorSig: sigStr,
            createdAt: s(tk.createdAt),
            updatedAt: s(tk.updatedAt || tk.createdAt)
          });
        }
      }
    }
    return result;
  };
  const enrichedServiceTickets = await buildServiceTickets();

  // IMP-31: Build Trip Claims payload
  const buildTripClaims = () => {
    const list = (S.trips || []).map(tr => {
      const claim = (S.tripClaims || []).find(c => String(c.tripId) === String(tr.id)) || {};
      const totalClaim = typeof calculateTripTotalClaim === 'function' ? calculateTripTotalClaim(tr.id) : 0;
      const weekLabel = typeof getTripWeekLabel === 'function' ? getTripWeekLabel(tr.date, tr.dateEnd) : '';
      return {
        tripId: s(tr.id),
        fromDate: s(tr.date),
        toDate: s(tr.dateEnd || tr.date),
        weekNo: s(weekLabel),
        travelDetail: `${s(tr.plant)}${tr.location ? ' • ' + s(tr.location) : ''}${tr.purpose ? ' (' + s(tr.purpose) + ')' : ''}`,
        totalClaim: totalClaim,
        dateRequest: s(claim.dateRequest),
        dateApproved: s(claim.dateApproved),
        processDate: s(claim.processDate),
        doneDate: s(claim.doneDate),
        paymentStatus: s(claim.paymentStatus || 'Not yet'),
        comment: s(claim.comment),
        updatedAt: s(claim.updatedAt || new Date().toISOString())
      };
    });
    return list.sort(compareTripClaimsChronological);
  };
  const enrichedTripClaims = buildTripClaims();

  const reports = {};
  Object.entries(S.reports || {}).forEach(([id, rep]) => {
    if (!rep) return;
    reports[id] = {
      checklist: (rep.checklist || []).map(c => ({ id: s(c.id), name: s(c.name), result: s(c.result), note: s(c.note) })),
      readings: (rep.readings || []).map(r => ({ name: s(r.name), tag: s(r.tag), value: s(r.value), unit: s(r.unit), status: s(r.status), type: s(r.type), condition: s(r.condition), notes: s(r.notes) })),
      issues: (rep.issues || []).map(i => ({ title: s(i.title || i.Title), description: s(i.description || i.Description), severity: s(i.severity || i.Severity) || 'medium', istatus: s(i.IssueStatus || i.istatus) || 'pending', action: s(i.action || i.Action), photos: [] })),
      team: (rep.team || []).map(m => ({ name: s(m.name), role: s(m.role), org: s(m.org), signoff: s(m.signoff) })),
      signoff: { summary: s(rep.signoff && rep.signoff.summary), result: s(rep.signoff && rep.signoff.result), remarks: s(rep.signoff && rep.signoff.remarks) },
      signature: ''
    };
  });

  const payload = {
    trips: enrichedTrips, tasks: enrichedTasks,
    leaveData: S.leaveData || {}, reports,
    machines:S.machines||[], plans:S.plans||[],
    bills:enrichedBills,
    reminders:(S.reminders||[]),
    quickSnap:enrichedQuickSnap,
    siteSafety:enrichedSiteSafety,
    serviceTickets:enrichedServiceTickets,
    tripClaims:enrichedTripClaims,
    creditCard:S.creditCard||{}
  };

  try {
    const data = await gsPost(url, { action: 'syncAll', payload });
    if (btn) { btn.disabled = false; btn.textContent = '⬆ Sync all data'; }
    if (data && data.ok) {
      const res = data.result || {};
      S.lastSync = new Date().toISOString();
      (S.scratchpad || []).forEach(sc => { sc.synced = true; });
      sv(); updateGSStatus();

      const snapPart = res.quicksnap !== undefined ? ` · ${res.quicksnap} snaps` : '';
      const ticketPart = res.tickets !== undefined ? ` · ${res.tickets} tickets` : '';
      const safetyPart = res.safety !== undefined ? ` · ${res.safety} safety` : '';
      const claimPart = res.tripClaims !== undefined ? ` · ${res.tripClaims} claims` : '';

      if (res.tripClaims === undefined && res.quicksnap === undefined) {
        showGSResult(`✅ Synced! ${res.trips || 0} trips · ${res.tasks || 0} tasks · ${res.bills || 0} bills\n⚠️ Google Apps Script chưa có code TripClaims/QuickSnap. Vui lòng copy PlantLog_GoogleAppsScript.gs và Triển khai (Deploy) Bản mới trên Google Sheet.`, 'warn');
        showToast('Synced (Cần cập nhật Apps Script cho TripClaims)');
      } else {
        showGSResult(`✅ Synced! ${res.trips || 0} trips · ${res.tasks || 0} tasks · ${res.bills || 0} bills${snapPart}${ticketPart}${claimPart}`, 'ok');
        showToast(`Synced to Google Sheets ✓ (${res.tripClaims !== undefined ? res.tripClaims : (res.quicksnap || 0)} items)`);
      }
    } else {
      showGSResult('❌ Sync error: ' + ((data && data.error) || 'Unknown'), 'error');
      showToast('Sync failed — check error in sync panel');
    }
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = '⬆ Sync all data'; }
    showGSResult('❌ Network error. Check URL ends in /exec and access is Anyone.', 'error');
    showToast('Could not reach Google Sheet');
  }
}

// ═══════ PER-ITEM TIMESTAMP MERGE (IMP-05) ═══════
/**
 * So sánh & Gộp danh sách dữ liệu 2 chiều theo Timestamp (IMP-05)
 * Chống ghi đè mất dữ liệu offline khi đồng bộ từ Google Sheets
 */
function mergeCollectionByTimestamp(localList, remoteList, idKey = 'id') {
  localList = Array.isArray(localList) ? localList : [];
  remoteList = Array.isArray(remoteList) ? remoteList : [];

  const localMap = new Map();
  for (const item of localList) {
    if (item && item[idKey]) localMap.set(String(item[idKey]), item);
  }

  const merged = [];
  const processedIds = new Set();

  for (const remote of remoteList) {
    const id = String(remote[idKey] || '');
    if (!id) continue;

    // IMP-25: Tombstone check - Do not resurrect locally deleted items
    if (typeof S !== 'undefined' && S && S.deletedIds && S.deletedIds[id]) {
      const deletedAt = S.deletedIds[id];
      const remoteTime = new Date(remote.updatedAt || remote.createdAt || 0).getTime();
      if (remoteTime <= deletedAt) {
        continue; // Skip resurrecting deleted item
      } else {
        // Item was updated remotely after the local deletion
        delete S.deletedIds[id];
      }
    }

    processedIds.add(id);

    const local = localMap.get(id);
    if (!local) {
      // Bản ghi mới từ Google Sheets mà máy chưa có
      merged.push(remote);
    } else {
      // Cả 2 đều có -> So sánh updatedAt
      const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
      const remoteTime = new Date(remote.updatedAt || remote.createdAt || 0).getTime();

      if (localTime > remoteTime) {
        // Cục bộ mới sửa offline -> Giữ nguyên dữ liệu cục bộ
        merged.push(local);
      } else {
        // Sheets mới hơn hoặc bằng -> Lấy remote, nhưng giữ lại các trường cục bộ quan trọng (như ảnh chất lượng cao hoặc photoMeta)
        if (local.photoMeta && (!remote.photoMeta || !remote.photoMeta.length)) {
          remote.photoMeta = local.photoMeta;
        }
        if (Array.isArray(local.photos) && local.photos.some(p => typeof p === 'string' && p.includes('drive.google.com'))) {
          remote.photos = local.photos;
        }
        merged.push(remote);
      }
    }
  }

  // Giữ lại các bản ghi được tạo mới Offline chưa kịp đồng bộ lên Sheets
  for (const local of localList) {
    const id = String(local[idKey] || '');
    if (id && !processedIds.has(id)) {
      console.log(`[Sync Merge] Preserving offline local ${idKey}:`, id);
      merged.push(local);
    }
  }

  return merged;
}

async function loadFromSheets(silent) {
  syncGSInputsToState_();
  const url = getGSUrl();
  if (!url) { if (!silent) { showToast('Set your Google Sheet URL first'); openModal('modal-gsheet'); } return; }
  if (!silent) showToast('Loading from Google Sheets…');
  try {
    const data = await gsGet(url, { action: 'getAll' });
    if (data.ok && data.data) {
      const d = data.data;

      // ── Universal safe converters ─────────────────────────
      // Converts any value to a clean YYYY-MM-DD string or ''
      // safeNum: strips locale formatting (commas, spaces) before parseFloat
      const safeNum = v => {
        if (v === null || v === undefined || v === '') return 0;
        const cleaned = String(v).replace(/,/g, '').replace(/\s/g, '').trim();
        return parseFloat(cleaned) || 0;
      };
      const safeDate = v => {
        if (v === null || v === undefined || v === '') return '';
        if (v instanceof Date) {
          if (isNaN(v.getTime())) return '';
          return v.toISOString().slice(0, 10);
        }
        const s = String(v).trim();
        // Already YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        // ISO with time: 2026-05-11T00:00:00.000Z
        if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
        // Slash format: 2026/05/11
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, '-');
        // Excel serial number
        if (/^\d{5}$/.test(s)) {
          const d = new Date(Math.round((parseFloat(s) - 25569) * 86400 * 1000));
          if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        }
        // Try parsing as date string, but only accept YYYY-MM-DD result
        try {
          const d = new Date(s);
          if (!isNaN(d.getTime()) && s.length >= 8) {
            const iso = d.toISOString().slice(0, 10);
            if (iso > '1900-01-01') return iso;
          }
        } catch (e) { }
        return '';
      };
      // Safe time: returns HH:MM or ''
      const safeTime = v => {
        if (!v && v !== 0) return '';
        const s = String(v).trim();
        if (!s || s === 'null' || s === 'undefined') return '';

        // ── 12-hour format from getDisplayValues(): "6:30 AM" / "6:30 PM" ──
        const ampm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
        if (ampm) {
          let h = parseInt(ampm[1]);
          const m = ampm[2];
          const period = ampm[3].toUpperCase();
          if (period === 'AM' && h === 12) h = 0;
          if (period === 'PM' && h !== 12) h += 12;
          return String(h).padStart(2, '0') + ':' + m;
        }

        // ── 24-hour format: "06:30" / "6:30" / "06:30:00" ──
        const h24 = s.match(/^(\d{1,2}):(\d{2})/);
        if (h24) {
          return h24[1].padStart(2, '0') + ':' + h24[2];
        }

        // ── ISO with T: "1899-12-30T06:30:00.000Z" ──
        const isoT = s.match(/T(\d{2}:\d{2})/);
        if (isoT) return isoT[1];

        // ── Date object toString: "Sat Dec 30 1899 06:30:00 GMT+0700" ──
        const dobj = s.match(/(\d{2}):(\d{2}):(\d{2})/);
        if (dobj) return dobj[1] + ':' + dobj[2];

        // ── Excel serial decimal: 0.270833 = 06:30 ──
        const num = parseFloat(s);
        if (!isNaN(num) && num > 0 && num < 1) {
          const totalMins = Math.round(num * 24 * 60);
          return String(Math.floor(totalMins / 60)).padStart(2, '0') + ':'
            + String(totalMins % 60).padStart(2, '0');
        }
        return '';
      };
      // Safe string
      const ss = v => v === null || v === undefined ? '' : String(v).trim();

      if (d.trips && d.trips.length) {
        const strV = v => safeDate(v) || ss(v);
        const existingTrips = S.trips || [];
        const remoteTrips = d.trips.map(tr => {
          const st = ss(tr.Status) || 'planned';
          const localTr = existingTrips.find(x => x.id === ss(tr.ID));
          const finalSt = (localTr && (localTr.status === 'in_progress' || localTr.status === 'done') && st === 'planned') ? localTr.status : st;
          return {
            id: ss(tr.ID),
            plant: ss(tr.Plant),
            location: ss(tr.Location),
            date: safeDate(tr.Date),
            dateEnd: safeDate(tr.DateEnd),
            purpose: ss(tr.Purpose),
            contact: ss(tr.Contact),
            transport: ss(tr.Transport),
            status: finalSt,
            notes: ss(tr.Notes),
            flight: tr.Flight ? (() => { try { return JSON.parse(ss(tr.Flight)); } catch (e) { return null; } })() : null,
            ta: tr.TA ? (() => { try { return JSON.parse(ss(tr.TA)); } catch (e) { return null; } })() : null,
            savedReports: (() => {
              const raw = ss(tr.SavedReports || tr.savedReports || '');
              if (!raw) return [];
              try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
              catch (e) { return []; }
            })(),
            createdAt: ss(tr.CreatedAt),
            updatedAt: ss(tr.UpdatedAt || tr.CreatedAt)
          };
        });
        S.trips = mergeCollectionByTimestamp(existingTrips, remoteTrips, 'id');
      }
      if (d.tasks && d.tasks.length) {
        // Helper: safely convert any value to string, handle Date objects
        const str = v => {
          if (v === null || v === undefined || v === '') return '';
          if (v instanceof Date) return v.toISOString(); // keep full ISO including time
          return String(v);
        };
        const num = v => parseFloat(str(v)) || 0;
        const existingTasks = S.tasks || [];
        const remoteTasks = d.tasks.map(tk => {
          let cl = [];
          try {
            const cj = str(tk.ChecklistJson || tk.checklistJson || '');
            if (cj.startsWith('[')) cl = JSON.parse(cj);
            else { const c2 = str(tk.Checklist || ''); if (c2.startsWith('[')) cl = JSON.parse(c2); }
          } catch (e) { cl = []; }
          const ds = safeDate(tk.DateStart || tk.Date);
          const de = safeDate(tk.DateEnd) || ds;
          const ts = safeTime(tk.TimeStart || tk.Time);
          const te = safeTime(tk.TimeEnd);
          // Parse parts JSON
          let pts = [];
          try {
            const pj = ss(tk.PartsJson || '');
            if (pj.startsWith('[')) pts = JSON.parse(pj);
          } catch (e) { pts = []; }

          return {
            id: ss(tk.ID),
            title: ss(tk.Title),
            desc: ss(tk.Description),
            category: ss(tk.Category) || 'work',
            dateStart: ds,
            timeStart: ts,
            dateEnd: de,
            timeEnd: te,
            hours: safeNum(tk.Hours) || ss(tk.Hours),
            minutes: safeNum(tk.Minutes) || ss(tk.Minutes),
            autoDuration: (ss(tk.AutoDuration) || '').toLowerCase() === 'true',
            durationMins: ss(tk.DurationMins) ? parseInt(ss(tk.DurationMins)) || 0 : 0,
            priority: (() => {
              const raw = (ss(tk.Priority) || 'medium').toLowerCase().trim();
              if (raw === 'high') return 'high';
              if (raw === 'low') return 'low';
              return 'medium';
            })(),
            period: ss(tk.Period),
            machine: ss(tk.Machine),
            plan: ss(tk.Plan),
            tripId: ss(tk.TripID),
            status: (() => {
              const raw = (ss(tk.Status) || 'pending').toLowerCase().trim();
              let stVal = 'pending';
              if (raw.includes('progress') || raw === 'in_progress') stVal = 'in_progress';
              else if (raw === 'done' || raw === 'complete' || raw === 'completed') stVal = 'done';
              const localTk = (S.tasks || []).find(x => x.id === ss(tk.ID));
              if (localTk && (localTk.status === 'in_progress' || localTk.status === 'done') && stVal === 'pending') {
                return localTk.status;
              }
              return stVal;
            })(),
            checklist: cl,
            parts: pts,
            flight: tk.FlightJson ? (() => { try { return JSON.parse(ss(tk.FlightJson)); } catch (e) { return null; } })() : null,
            files: tk.FilesJson ? (() => { try { return JSON.parse(ss(tk.FilesJson)); } catch (e) { return []; } })() : [],
            savedReports: tk.SavedReports ? (() => { try { const p = JSON.parse(ss(tk.SavedReports)); return Array.isArray(p) ? p : []; } catch (e) { return []; } })() : [],
            date: ds,
            time: ts,
            createdAt: ss(tk.CreatedAt),
            updatedAt: ss(tk.UpdatedAt || tk.CreatedAt)
          };
        });
        S.tasks = mergeCollectionByTimestamp(existingTasks, remoteTasks, 'id');
      }
      if (d.leave && d.leave.length) {
        S.leaveData = {};
        d.leave.forEach(l => {
          const lDate = safeDate(l.Date) || ss(l.Date);
          if (lDate && l.Type) S.leaveData[lDate] = ss(l.Type);
        });
      }
      // Load bills
      if (d.bills && d.bills.length) {
        const strB = v => v === null || v === undefined ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
        const existingBills = S.bills || [];
        const remoteBills = d.bills.map(b => {
          let photos = [];
          try {
            const pj = strB(b.PhotosJson || b.photosJson || '');
            if (pj && pj.startsWith('[')) photos = JSON.parse(pj);
          } catch (e) { photos = []; }
          return {
            id: ss(b.ID),
            tripId: ss(b.TripID),
            date: safeDate(b.Date) || ss(b.Date),
            billNumber: strB(b.BillNumber),
            detail: strB(b.Detail),
            amount: safeNum(b.Amount),
            currency: strB(b.Currency) || 'VND',
            vndAmount: safeNum(b.VndAmount || b.vndAmount),
            category: strB(b.Category) || 'other',
            paymentMethod: strB(b.PaymentMethod || b.paymentMethod || b.PaymentTerm || b.paymentTerm) || '1-Cash',
            notes: strB(b.Notes),
            photos: photos,
            createdAt: strB(b.CreatedAt),
            updatedAt: strB(b.UpdatedAt || b.CreatedAt)
          };
        });
        S.bills = mergeCollectionByTimestamp(existingBills, remoteBills, 'id');
      }

      // IMP-22: Load QuickSnap (Scratchpad)
      if (d.quicksnap && Array.isArray(d.quicksnap)) {
        const existingScratch = S.scratchpad || [];
        const remoteScratch = d.quicksnap.map(q => ({
          id: ss(q.ID),
          category: ss(q.Category) || 'general',
          title: ss(q.Title),
          text: ss(q.Notes),
          notes: ss(q.Notes),
          tripId: ss(q.TripID),
          photo: ss(q.Photo),
          createdAt: ss(q.CreatedAt),
          updatedAt: ss(q.UpdatedAt || q.CreatedAt),
          synced: true
        }));
        S.scratchpad = mergeCollectionByTimestamp(existingScratch, remoteScratch, 'id');
      }

      // IMP-23: Load Site Safety & LOTO and attach to trips
      if (d.safety && d.safety.length) {
        d.safety.forEach(sf => {
          const tr = (S.trips || []).find(t => t.id === ss(sf.TripID));
          if (tr) {
            const remoteUpdated = new Date(ss(sf.UpdatedAt) || 0).getTime();
            const localUpdated = new Date((tr.safety && tr.safety.updatedAt) || 0).getTime();
            if (!tr.safety || remoteUpdated >= localUpdated) {
              const types = ss(sf.PermitTypes).split(',').map(x => x.trim()).filter(Boolean);
              tr.safety = {
                permitNo: ss(sf.PermitNo),
                validUntil: safeDate(sf.ValidUntil),
                permitTypes: types,
                loto: {
                  padlockId: ss(sf.PadlockID),
                  electricalIsolated: ss(sf.ElectricalIsolated) === 'YES' || ss(sf.ElectricalIsolated) === 'true',
                  pneumaticIsolated: ss(sf.PneumaticIsolated) === 'YES' || ss(sf.PneumaticIsolated) === 'true',
                  dangerTagHung: ss(sf.DangerTagHung) === 'YES' || ss(sf.DangerTagHung) === 'true',
                  zeroEnergyVerified: ss(sf.ZeroEnergyVerified) === 'YES' || ss(sf.ZeroEnergyVerified) === 'true',
                  photo: ss(sf.Photo) || (tr.safety && tr.safety.loto && tr.safety.loto.photo) || ''
                },
                emergencyContacts: {
                  ccrPhone: ss(sf.CCRPhone),
                  ehsPhone: ss(sf.EHSPhone),
                  medicalPhone: ss(sf.MedicalPhone)
                },
                updatedAt: ss(sf.UpdatedAt) || new Date().toISOString()
              };
            }
          }
        });
      }

      // IMP-19: Load Daily Service Tickets and attach to trips
      if (d.tickets && d.tickets.length) {
        const ticketsByTrip = {};
        d.tickets.forEach(tk => {
          const tid = ss(tk.TripID);
          if (!tid) return;
          if (!ticketsByTrip[tid]) ticketsByTrip[tid] = [];
          ticketsByTrip[tid].push({
            id: ss(tk.ID),
            date: safeDate(tk.Date),
            normalHours: safeNum(tk.NormalHours),
            ot15Hours: safeNum(tk.OT15Hours),
            ot20Hours: safeNum(tk.OT20Hours),
            standbyHours: safeNum(tk.StandbyHours),
            travelHours: safeNum(tk.TravelHours),
            summary: ss(tk.Summary),
            workSummary: ss(tk.Summary),
            supervisorName: ss(tk.SupervisorName),
            supervisorSig: ss(tk.SupervisorSig),
            signature: ss(tk.SupervisorSig),
            createdAt: ss(tk.CreatedAt),
            updatedAt: ss(tk.UpdatedAt || tk.CreatedAt)
          });
        });

        (S.trips || []).forEach(tr => {
          if (ticketsByTrip[tr.id]) {
            const existingTickets = tr.timesheets || [];
            tr.timesheets = mergeCollectionByTimestamp(existingTickets, ticketsByTrip[tr.id], 'id');
          }
        });
      }

      // IMP-31: Load Trip Claims
      if (d.tripClaims && Array.isArray(d.tripClaims)) {
        const existingClaims = S.tripClaims || [];
        const remoteClaims = d.tripClaims.map(c => ({
          tripId: ss(c.TripID),
          fromDate: safeDate(c.FromDate),
          toDate: safeDate(c.ToDate),
          weekNo: ss(c.WeekNo),
          travelDetail: ss(c.TravelDetail),
          totalClaim: safeNum(c.TotalClaim),
          dateRequest: safeDate(c.DateRequest),
          dateApproved: safeDate(c.DateApproved),
          processDate: safeDate(c.ProcessDate),
          doneDate: safeDate(c.DoneDate),
          paymentStatus: ss(c.PaymentStatus) || 'Not yet',
          comment: ss(c.Comment),
          updatedAt: ss(c.UpdatedAt || c.CreatedAt)
        }));
        S.tripClaims = mergeCollectionByTimestamp(existingClaims, remoteClaims, 'tripId');
      }

      // Sync Reminders from cloud
      if (d.reminders && Array.isArray(d.reminders)) {
        const existingRem = S.reminders || [];
        const remoteRem = d.reminders.map(r => ({
          id: ss(r.ID),
          title: ss(r.Title),
          freq: ss(r.Freq) || 'monthly',
          weekday: ss(r.Weekday) || '1',
          monthday: ss(r.Monthday) || '1',
          yearMonth: ss(r.YearMonth) || '01',
          yearDay: ss(r.YearDay) || '1',
          time: safeTime(r.Time) || '08:00',
          note: ss(r.Note),
          notifyTele: String(r.NotifyTele).toLowerCase() !== 'false',
          notifyCalendar: String(r.NotifyCalendar).toLowerCase() !== 'false',
          status: ss(r.Status) || 'active',
          createdAt: ss(r.CreatedAt)
        }));
        S.reminders = mergeCollectionByTimestamp(existingRem, remoteRem, 'id');
      }

      sv();
      try { if (typeof autoStartTodayItems === 'function') autoStartTodayItems(); } catch (e) { }
      renderDash(); renderTripList(); renderTasks(); renderCalendar();
      if (typeof renderTripSavedReports === 'function') renderTripSavedReports();
      if (typeof renderTripTimesheets === 'function' && typeof curTrip !== 'undefined' && curTrip) {
        renderTripTimesheets(curTrip);
      }
      if (typeof renderTripSafety === 'function' && typeof curTrip !== 'undefined' && curTrip) {
        renderTripSafety(curTrip);
      }
      if (typeof renderTripClaimsScreen === 'function') renderTripClaimsScreen();
      showGSResult('✅ Data loaded from Google Sheets successfully!', 'ok');
      showToast('Loaded from Google Sheets ✓');
    } else {
      showGSResult('⚠ No data found or load error: ' + (data && data.error || 'Unknown'), 'warn');
    }
  } catch (e) {
    showGSResult('❌ Could not load data. Check your URL and internet connection.', 'error');
    showToast('Load failed — check URL');
  }
}

// Auto-sync debounced — triggers 350ms after delete or 2.5s after other actions
let syncTimer = null;
function svAndSync(source) {
  sv();
  if (!S.gsUrl) return;
  clearTimeout(syncTimer);
  const delay = (typeof source === 'string' && source.includes('delete')) ? 350 : 2500;
  syncTimer = setTimeout(() => {
    // Show subtle indicator
    const el = document.getElementById('gsheet-status');
    if (el) el.textContent = 'Syncing…';
    syncToSheets().then(() => { }).catch(() => { });
  }, delay);
}

// ═══════ BILLS ═══════
let editingBillId = null;
let tmpBillPhotos = [];
const BILL_CAT_LABELS = { accommodation: '🏨 Accommodation', travel: '✈️ Travel', meals: '🍽 Meals', parts: '🔩 Parts/Materials', tools: '🔧 Tools', other: '📋 Other' };

function renderTripBills(tripId) {
  const el = document.getElementById('trip-bills-section');
  if (!el) return;
  const bills = (S.bills || []).filter(b => b.tripId === tripId).sort((a, b) => b.date.localeCompare(a.date));
  // Compute totals — VND grand total + per-currency breakdown
  const totalVND = bills.reduce((s, b) => {
    if (b.currency === 'VND') return s + (parseFloat(b.amount) || 0);
    return s + (parseFloat(b.vndAmount) || 0);
  }, 0);
  const byCur = {};
  bills.forEach(b => { const c = b.currency || 'VND'; byCur[c] = (byCur[c] || 0) + (parseFloat(b.amount) || 0); });

  let html = `<div style="font-size:11px;font-weight:700;color:#00843D;letter-spacing:0.07em;text-transform:uppercase;margin:12px 0 8px;">Expense Bills</div>`;

  if (bills.length) {
    // Show: each currency on left, grand VND total on right
    const curLines = Object.entries(byCur).map(([c, t]) =>
      `<div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.9);margin-top:2px;">${fmtAmt(t, c)} <span style="font-size:10px;opacity:0.8;">${c}</span></div>`
    ).join('');
    html += `<div class="bill-total-bar">
      <div>
        <div class="bill-total-label">Expenses (${bills.length} bills)</div>
        ${curLines}
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:rgba(255,255,255,0.7);margin-bottom:2px;">Grand Total</div>
        <div class="bill-total-amount">${fmtAmt(totalVND, "VND")} <span style="font-size:12px;">VND</span></div>
      </div>
    </div>`;

    // Group by date
    const byDate = {};
    bills.forEach(b => {
      const d = b.date || '';
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(b);
    });

    Object.entries(byDate).forEach(([dateKey, dayBills]) => {
      const dayTotal = dayBills.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
      const dc = dayBills[0].currency || 'VND';
      html += `<div class="bill-day-header">
        <div class="bill-day-label">📅 ${fmtDate(dateKey)}</div>
        <div class="bill-day-total">${fmtAmt(dayTotal, "VND")} ${dc}</div>
      </div>`;

      dayBills.forEach(b => {
        const amt = fmtAmt(b.amount, b.currency);
        html += `<div class="bill-card">
          <div class="bill-head">
            <div style="flex:1;min-width:0;">
              ${b.billNumber ? `<div class="bill-num">Receipt #${b.billNumber}</div>` : ''}
              <div class="bill-detail-text">${b.detail}</div>
              <div class="bill-meta">
                <span style="background:var(--al);color:#92400E;padding:1px 7px;border-radius:10px;font-size:10px;">${BILL_CAT_LABELS[b.category] || b.category || 'Other'}</span>
                ${b.notes ? `<span style="color:var(--g500);">${b.notes}</span>` : ''}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;margin-left:10px;">
              <div class="bill-amount">${amt} ${b.currency || ''}</div>
              <div style="display:flex;gap:4px;">
                <button onclick="openEditBill('${b.id}')" style="width:26px;height:26px;border-radius:6px;border:1px solid var(--g200);background:var(--surface);cursor:pointer;font-size:13px;" title="Edit">✏️</button>
                <button onclick="deleteBill('${b.id}')" class="db" title="Delete">×</button>
              </div>
            </div>
          </div>
          ${b.photos && b.photos.length ? `
          <div class="bill-photo-strip">
            ${b.photos.map((p, pi) => `<img class="bill-photo-thumb" src="${p}" onclick="viewBillPhoto('${b.id}',${pi})" title="Tap to view">`).join('')}
          </div>`: ''}
        </div>`;
      });
    });
  } else {
    html += `<div style="text-align:center;padding:16px;font-size:13px;color:var(--g400);">No bills recorded yet.<br>Tap below to add your first expense.</div>`;
  }
  html += `<button class="btn btn-o btn-full" style="margin-top:8px;" onclick="openAddBill('${tripId}')">＋ Add expense bill</button>`;
  el.innerHTML = html;
}

function viewBillPhoto(billId, photoIdx) {
  const b = S.bills.find(x => x.id === billId);
  if (!b || !b.photos || !b.photos[photoIdx]) return;
  const src = b.photos[photoIdx];
  // If it's a Drive URL → open directly in browser
  if (src.startsWith('https://')) {
    window.open(src, '_blank');
    return;
  }
  // Otherwise show inline overlay for base64 images
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;';
  overlay.onclick = () => overlay.remove();
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'max-width:95vw;max-height:80vh;border-radius:8px;object-fit:contain;';
  const close = document.createElement('div');
  close.textContent = '✕ Tap anywhere to close';
  close.style.cssText = 'color:rgba(255,255,255,0.6);font-size:13px;';
  overlay.appendChild(img); overlay.appendChild(close);
  document.body.appendChild(overlay);
}

function openAddBill(tripId) {
  editingBillId = null;
  tmpBillPhotos = [];
  _savingBill = false;  // reset guard when opening modal
  // Always re-enable button when opening add
  const _sb2 = document.getElementById('bill-save-btn');
  if (_sb2) { _sb2.disabled = false; _sb2.textContent = '💾 Save Bill'; }
  document.getElementById('bill-modal-title').textContent = 'Add Bill';
  document.getElementById('bill-edit-id').textContent = '';
  document.getElementById('bill-save-btn').textContent = '💾 Save Bill';
  ['bill-detail', 'bill-number', 'bill-amount', 'bill-notes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('bill-date').value = typeof localDateStr === 'function' ? localDateStr() : new Date().toISOString().slice(0, 10);
  document.getElementById('bill-currency').value = 'VND';
  document.getElementById('bill-category').value = 'other';
  const vndElR = document.getElementById('bill-vnd'); if (vndElR) vndElR.value = '';
  toggleVNDRow();
  renderBillPhotoGrid();
  // Populate trip selector
  const ts = document.getElementById('bill-trip-select');
  if (ts) {
    ts.innerHTML = '<option value="">No trip link</option>' + S.trips.map(t => `<option value="${t.id}"${t.id === tripId ? ' selected' : ''}>${t.plant} (${fmtDate(t.date)})</option>`).join('');
  }
  document.getElementById('bill-save-btn').dataset.tripid = tripId || '';
  openModal('modal-add-bill');
}

function openEditBill(id) {
  const b = S.bills.find(x => x.id === id); if (!b) return;
  editingBillId = id;
  _savingBill = false;  // reset guard when opening modal
  // Always re-enable button when opening edit (may have been left disabled)
  const _sb = document.getElementById('bill-save-btn');
  if (_sb) { _sb.disabled = false; _sb.textContent = '💾 Update Bill'; }
  // Load photos: normalise to {src, driveUrl, fileId} format
  tmpBillPhotos = (b.photos || []).map(p => {
    if (typeof p === 'object' && p.src) return p;
    const url = typeof p === 'string' ? p : (p.driveUrl || p.src || '');
    return { src: url, driveUrl: url.startsWith('https://') ? url : '', fileId: '' };
  });
  document.getElementById('bill-modal-title').textContent = 'Edit Bill';
  document.getElementById('bill-edit-id').textContent = '#' + id.slice(-6);
  document.getElementById('bill-save-btn').textContent = '💾 Update Bill';
  document.getElementById('bill-date').value = b.date || '';
  document.getElementById('bill-number').value = b.billNumber || '';
  document.getElementById('bill-detail').value = b.detail || '';
  document.getElementById('bill-amount').value = b.amount || '';
  document.getElementById('bill-currency').value = b.currency || 'VND';
  const vndEl2 = document.getElementById('bill-vnd');
  if (vndEl2) vndEl2.value = (b.currency !== 'VND' && b.vndAmount) ? b.vndAmount : '';
  toggleVNDRow();
  document.getElementById('bill-category').value = b.category || 'other';
  const pmEl3 = document.getElementById('bill-payment-method'); if (pmEl3) pmEl3.value = b.paymentMethod || b.paymentTerm || '1-Cash';
  document.getElementById('bill-notes').value = b.notes || '';
  document.getElementById('bill-save-btn').dataset.tripid = b.tripId || '';
  const ts2 = document.getElementById('bill-trip-select');
  if (ts2) {
    ts2.innerHTML = '<option value="">No trip link</option>' + S.trips.map(t => `<option value="${t.id}"${t.id === b.tripId ? ' selected' : ''}>${t.plant} (${fmtDate(t.date)})</option>`).join('');
  }
  renderBillPhotoGrid();
  openModal('modal-add-bill');
}

let _savingBill = false;  // guard against double-submit

async function saveBill() {
  // ── Prevent double-submit (async function runs over multiple seconds) ──
  if (_savingBill) return;
  _savingBill = true;

  const saveBtn = document.getElementById('bill-save-btn');
  // origText captured below after origBtnText
  const origBtnText = saveBtn ? saveBtn.textContent : '💾 Save Bill';
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⟳ Saving…'; }

  try {
    const detail = document.getElementById('bill-detail').value.trim();
    const amount = document.getElementById('bill-amount').value;
    if (!detail || !amount) {
      showToast('Detail and amount are required');
      _savingBill = false;
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 ' + (editingBillId ? 'Update' : 'Save') + ' Bill'; }
      return;
    }
    const ts = document.getElementById('bill-trip-select');
    const tripId = (ts && ts.value) || document.getElementById('bill-save-btn').dataset.tripid || '';
    const cur = document.getElementById('bill-currency').value;
    const vndEl = document.getElementById('bill-vnd');
    const vndAmt = cur === 'VND' ? parseFloat(amount) || 0 : (vndEl && vndEl.value ? parseFloat(vndEl.value) || 0 : 0);

    // Lock billId at start — never changes even during async uploads
    const billId = editingBillId || ('bill_' + Date.now());

    // Upload local photos to Drive now (at save time — reliable, no race conditions)
    const gsUrl = getGSUrl ? getGSUrl() : (S && S.gsUrl || '');
    const canUpload = gsUrl && gsUrl.includes('/exec');
    const localPhotos = tmpBillPhotos.filter(p => {
      const src = (typeof p === 'string') ? p : (p.src || '');
      return src.startsWith('data:');
    });

    if (canUpload && localPhotos.length) {
      if (saveBtn) saveBtn.textContent = '⟳ Uploading ' + localPhotos.length + ' photo' + (localPhotos.length > 1 ? 's' : '') + '…';
      for (let i = 0; i < tmpBillPhotos.length; i++) {
        const p = tmpBillPhotos[i];
        const src = (typeof p === 'string') ? p : (p.src || '');
        if (!src.startsWith('data:')) continue;  // skip already-uploaded
        const result = await uploadBillPhotoToDrive(src, billId, tripId);
        if (result) {
          tmpBillPhotos[i] = result;  // replace with Drive URL object
        }
      }
    }

    // Build final photos array: Drive URL or base64 fallback
    const savedPhotos = tmpBillPhotos.map(p => {
      if (typeof p === 'string') return p;
      return p.driveUrl || p.src || '';
    }).filter(Boolean);

    const bill = {
      id: billId,
      tripId,
      date: document.getElementById('bill-date').value,
      billNumber: document.getElementById('bill-number').value,
      detail,
      amount: parseFloat(amount) || 0,
      currency: cur,
      vndAmount: vndAmt,
      category: document.getElementById('bill-category').value,
      paymentMethod: document.getElementById('bill-payment-method') ? document.getElementById('bill-payment-method').value : '1-Cash',
      notes: document.getElementById('bill-notes').value,
      photos: savedPhotos,
      photoMeta: tmpBillPhotos.filter(p => p && p.fileId).map(p => ({
        src: p.driveUrl || p.src,
        driveUrl: p.driveUrl,
        fileId: p.fileId
      })),
      createdAt: editingBillId
        ? (S.bills.find(b => b.id === editingBillId) || {}).createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingBillId) {
      const idx = S.bills.findIndex(b => b.id === editingBillId);
      if (idx >= 0) S.bills[idx] = bill; else S.bills.push(bill);
    } else {
      if (!S.bills) S.bills = [];
      S.bills.push(bill);
    }

    editingBillId = null;
    tmpBillPhotos = [];
    // Re-enable button BEFORE closing modal (important!)
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Save Bill'; }
    Store.commit('bill:save');
    closeModal('modal-add-bill');
    showToast('Bill saved ✓');
    if (tripId) renderTripBills(tripId);

    // IMP-31: Single-row Trip Claim update when bill changes
    if (tripId && typeof calculateTripTotalClaim === 'function') {
      const claim = (S.tripClaims || []).find(c => String(c.tripId) === String(tripId));
      if (claim) {
        claim.totalClaim = calculateTripTotalClaim(tripId);
        claim.updatedAt = new Date().toISOString();
        if (typeof syncSingleTripClaim === 'function') {
          syncSingleTripClaim(claim);
        }
      }
    }

  } catch (e) {
    console.error('[saveBill]', e);
    showToast('Error saving bill: ' + e.message);
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 ' + (editingBillId ? 'Update' : 'Save') + ' Bill'; }
  } finally {
    _savingBill = false;
  }
}

async function deleteBill(id) {
  const ok = await appConfirm('Delete this expense bill? This cannot be undone.', {
    title: 'Delete Bill',
    danger: true,
    confirmText: 'Delete Bill',
    icon: '🧾'
  });
  if (!ok) return;
  const billToDelete = (S.bills || []).find(b => b.id === id);
  const tripIdOfDeleted = billToDelete ? billToDelete.tripId : '';
  if (!S.deletedIds) S.deletedIds = {};
  S.deletedIds[id] = Date.now();
  S.bills = S.bills.filter(b => b.id !== id);
  sv();
  if (curTrip) renderTripBills(curTrip);
  if (typeof renderBillsScreen === 'function') renderBillsScreen();
  if (typeof currentBillsView !== 'undefined' && currentBillsView === 'card' && typeof renderCreditCardScreen === 'function') {
    renderCreditCardScreen();
  }

  // IMP-31: Single-row Trip Claim update when bill is deleted
  if (tripIdOfDeleted && typeof calculateTripTotalClaim === 'function') {
    const claim = (S.tripClaims || []).find(c => String(c.tripId) === String(tripIdOfDeleted));
    if (claim) {
      claim.totalClaim = calculateTripTotalClaim(tripIdOfDeleted);
      claim.updatedAt = new Date().toISOString();
      if (typeof syncSingleTripClaim === 'function') {
        syncSingleTripClaim(claim);
      }
    }
  }

  svAndSync('bill_delete');
}

function triggerBillPhoto() {
  _photoCtxPending = 'bill';
  openPhotoSheet('bill');
}

// ── tmpBillPhotos: array of {src, driveUrl, fileId}
// src  = local base64 (data:...) or Drive URL (https://...)
// Photos are kept locally until Save — uploaded ONLY during saveBill()

function renderBillPhotoGrid() {
  const g = document.getElementById('bill-photo-grid');
  if (!g) return;
  g.innerHTML = tmpBillPhotos.map((p, i) => {
    const src = (typeof p === 'string') ? p : (p.driveUrl || p.src || '');
    const isDrive = src.startsWith('https://');
    return `<div class="pthumb" style="position:relative;">
      <img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block;"
        onclick="${isDrive ? `window.open('` + src + `','_blank')` : `viewBillPhotoLocal(${i})`}">
      <button class="pdel" onclick="removeBillPhoto(${i})"
        style="position:absolute;top:3px;right:3px;">×</button>
      ${isDrive ? `<span style="position:absolute;bottom:2px;left:2px;
        background:rgba(15,123,62,0.85);border-radius:3px;padding:1px 4px;
        font-size:8px;color:#fff;font-weight:700;">✓</span>` : ''}
    </div>`;
  }).join('')
    + `<div class="padd" onclick="triggerBillPhoto()">
       <span style="font-size:20px;">📷</span>
       <span style="font-size:10px;">Add photo</span>
     </div>`;
}

function viewBillPhotoLocal(i) {
  const p = tmpBillPhotos[i];
  const src = (typeof p === 'string') ? p : (p.src || '');
  if (!src) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;';
  overlay.onclick = () => overlay.remove();
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'max-width:95vw;max-height:80vh;border-radius:8px;object-fit:contain;';
  const hint = document.createElement('div');
  hint.textContent = 'Tap anywhere to close';
  hint.style.cssText = 'color:rgba(255,255,255,0.5);font-size:12px;';
  overlay.appendChild(img); overlay.appendChild(hint);
  document.body.appendChild(overlay);
}

function removeBillPhoto(i) {
  tmpBillPhotos.splice(i, 1);
  renderBillPhotoGrid();
}

// ── Upload one photo to Drive ─────────────────────────────
async function uploadBillPhotoToDrive(src, billId, tripId) {
  const gsUrl = getGSUrl ? getGSUrl() : (S && S.gsUrl || '');
  if (!gsUrl || !gsUrl.includes('/exec')) return null;
  if (!src || !src.startsWith('data:')) return null;

  let folderName = 'No_Trip';
  if (tripId) {
    const trip = (S.trips || []).find(t => t.id === tripId);
    if (trip) {
      const safe = (trip.plant || 'Trip').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 25);
      const d = (trip.date || '').replace(/-/g, '');
      folderName = safe + (d ? '_' + d : '');
    }
  }

  const base64 = src.split(',')[1];
  const mimeType = src.split(';')[0].replace('data:', '');
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const fileName = `bill_${(billId || 'x').slice(-8)}_${Date.now()}.${ext}`;

  try {
    const data = await gsPost(gsUrl, {
      action: 'uploadFile', taskId: 'bill_' + billId,
      fileName, mimeType, dataBase64: base64,
      folder: 'Bills Images/' + folderName
    });
    if (data && data.ok) return { src: data.fileUrl, driveUrl: data.fileUrl, fileId: data.fileId };
  } catch (e) { console.warn('[Bill photo]', e.message); }
  return null;
}

// ── Simple add: just store locally, no background upload ─
async function handleBillPhotos(newPhotos, billId, tripId) {
  // Store as simple objects — uploaded during saveBill()
  for (let src of newPhotos) {
    // Safeguard: nếu ảnh base64 lớn hơn 250KB, tự động nén trước khi lưu vào tmpBillPhotos
    if (typeof src === 'string' && src.startsWith('data:image/') && src.length > 250000 && typeof compressImageFile === 'function') {
      try { src = await compressImageFile(src, 1280, 0.72); } catch (x) { }
    }
    tmpBillPhotos.push({ src, driveUrl: '', fileId: '' });
  }
  renderBillPhotoGrid();
}

// ═══════ BACKGROUND MEDIA QUEUE (IMP-02) ═══════
let _flushingMedia = false;

/**
 * Hàng đợi quét và tải bù ảnh Offline lên Google Drive (IMP-02)
 * Tự động kích hoạt khi có mạng (online event) hoặc khi bắt đầu Đồng bộ (Sync)
 */
async function flushPendingMedia() {
  if (_flushingMedia) return;
  const gsUrl = getGSUrl ? getGSUrl() : (S && S.gsUrl || '');
  if (!gsUrl || !gsUrl.includes('/exec')) return;

  _flushingMedia = true;
  let uploadCount = 0;

  try {
    // 1. Quét hóa đơn (Bills)
    if (Array.isArray(S.bills)) {
      for (const bill of S.bills) {
        if (!Array.isArray(bill.photos)) continue;
        for (let i = 0; i < bill.photos.length; i++) {
          const src = bill.photos[i];
          if (typeof src === 'string' && src.startsWith('data:')) {
            try {
              const res = await uploadBillPhotoToDrive(src, bill.id, bill.tripId);
              if (res && res.driveUrl) {
                bill.photos[i] = res.driveUrl;
                if (!bill.photoMeta) bill.photoMeta = [];
                bill.photoMeta.push({
                  src: res.driveUrl,
                  driveUrl: res.driveUrl,
                  fileId: res.fileId
                });
                uploadCount++;
              }
            } catch (upErr) {
              console.warn('[flushPendingMedia] Bill photo upload failed:', upErr);
            }
          }
        }
      }
    }

    // 2. Quét sự cố trong Báo cáo (Report Issues)
    if (S.reports && typeof S.reports === 'object') {
      for (const [tripId, rep] of Object.entries(S.reports)) {
        if (!rep || !Array.isArray(rep.issues)) continue;
        for (const issue of rep.issues) {
          if (!Array.isArray(issue.photos)) continue;
          for (let i = 0; i < issue.photos.length; i++) {
            const src = issue.photos[i];
            if (typeof src === 'string' && src.startsWith('data:')) {
              try {
                const res = await uploadBillPhotoToDrive(src, 'issue_' + (issue.title || '').slice(0, 10), tripId);
                if (res && res.driveUrl) {
                  issue.photos[i] = res.driveUrl;
                  uploadCount++;
                }
              } catch (upErr) {
                console.warn('[flushPendingMedia] Issue photo upload failed:', upErr);
              }
            }
          }
        }
      }
    }

    if (uploadCount > 0) {
      sv(); // Lưu state mới (đã giải phóng Base64, thay bằng driveUrl)
      if (typeof showToast === 'function') {
        showToast(`✓ Đã tải bù ${uploadCount} ảnh offline lên Google Drive!`);
      }
      console.log(`[flushPendingMedia] Successfully uploaded ${uploadCount} offline photos to Drive.`);
    }
  } catch (e) {
    console.warn('[flushPendingMedia] Error flushing offline media:', e);
  } finally {
    _flushingMedia = false;
  }
}

// Lắng nghe sự kiện Online để tự động kích hoạt đẩy ảnh bù
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[PlantLog] Network back online, checking pending media queue…');
    setTimeout(flushPendingMedia, 2500);
  });
}



