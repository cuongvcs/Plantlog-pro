'use strict';
// =====================================================
// PlantLog — fieldtools.js
// Field Engineering Toolbox (IMP-21), Quick Field Scratchpad (IMP-22),
// and Asset Passport & Equipment Service History (IMP-24)
// =====================================================

// ═════════════════════════════════════════════════════
// 1. FIELD ENGINEERING TOOLBOX (IMP-21)
// Offline Unit Converters & Real-time Field Calculators
// ═════════════════════════════════════════════════════

let curToolboxTab = 'pressure';

function openToolboxScreen() {
  showScreen('toolbox');
  switchToolboxTab(curToolboxTab || 'pressure');
}

function switchToolboxTab(tab) {
  curToolboxTab = tab;
  ['pressure', 'tempflow', 'electrical', 'signal'].forEach(t => {
    const btn = document.getElementById('tb-tab-' + t);
    const pane = document.getElementById('tb-pane-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
    if (pane) pane.style.display = (t === tab) ? '' : 'none';
  });
  triggerHaptic('light');
}

// ── Pressure Converter ─────────────────────────────
let _isConvertingPressure = false;
function onPressureInput(source) {
  if (_isConvertingPressure) return;
  _isConvertingPressure = true;
  try {
    const el = document.getElementById('press-' + source);
    if (!el) return;
    const rawVal = parseFloat(el.value);
    if (isNaN(rawVal)) {
      ['bar', 'psi', 'kpa', 'mpa', 'kgcm2'].forEach(k => {
        if (k !== source) {
          const target = document.getElementById('press-' + k);
          if (target) target.value = '';
        }
      });
      return;
    }

    // Convert source to bar
    let bar = 0;
    if (source === 'bar') bar = rawVal;
    else if (source === 'psi') bar = rawVal / 14.50377377;
    else if (source === 'kpa') bar = rawVal / 100;
    else if (source === 'mpa') bar = rawVal * 10;
    else if (source === 'kgcm2') bar = rawVal / 1.0197162;

    const roundSmart = (n, dec = 3) => {
      if (Math.abs(n) < 0.0001 && n !== 0) return n.toExponential(3);
      return parseFloat(n.toFixed(dec)).toString();
    };

    if (source !== 'bar') {
      const e = document.getElementById('press-bar');
      if (e) e.value = roundSmart(bar, 3);
    }
    if (source !== 'psi') {
      const e = document.getElementById('press-psi');
      if (e) e.value = roundSmart(bar * 14.50377377, 2);
    }
    if (source !== 'kpa') {
      const e = document.getElementById('press-kpa');
      if (e) e.value = roundSmart(bar * 100, 1);
    }
    if (source !== 'mpa') {
      const e = document.getElementById('press-mpa');
      if (e) e.value = roundSmart(bar * 0.1, 4);
    }
    if (source !== 'kgcm2') {
      const e = document.getElementById('press-kgcm2');
      if (e) e.value = roundSmart(bar * 1.0197162, 3);
    }
  } finally {
    _isConvertingPressure = false;
  }
}

function clearPressureInputs() {
  ['bar', 'psi', 'kpa', 'mpa', 'kgcm2'].forEach(k => {
    const target = document.getElementById('press-' + k);
    if (target) target.value = '';
  });
}

// ── Temperature & Flow Converter ───────────────────
let _isConvertingTemp = false;
function onTempInput(source) {
  if (_isConvertingTemp) return;
  _isConvertingTemp = true;
  try {
    const el = document.getElementById('temp-' + source);
    if (!el) return;
    const rawVal = parseFloat(el.value);
    if (isNaN(rawVal)) {
      ['c', 'f', 'k'].forEach(k => {
        if (k !== source) {
          const target = document.getElementById('temp-' + k);
          if (target) target.value = '';
        }
      });
      return;
    }

    let degC = 0;
    if (source === 'c') degC = rawVal;
    else if (source === 'f') degC = (rawVal - 32) * (5 / 9);
    else if (source === 'k') degC = rawVal - 273.15;

    const round = (n, dec = 2) => parseFloat(n.toFixed(dec)).toString();
    if (source !== 'c') {
      const e = document.getElementById('temp-c');
      if (e) e.value = round(degC, 2);
    }
    if (source !== 'f') {
      const e = document.getElementById('temp-f');
      if (e) e.value = round((degC * 9 / 5) + 32, 2);
    }
    if (source !== 'k') {
      const e = document.getElementById('temp-k');
      if (e) e.value = round(degC + 273.15, 2);
    }
  } finally {
    _isConvertingTemp = false;
  }
}

let _isConvertingFlow = false;
function onFlowInput(source) {
  if (_isConvertingFlow) return;
  _isConvertingFlow = true;
  try {
    const el = document.getElementById('flow-' + source);
    if (!el) return;
    const rawVal = parseFloat(el.value);
    if (isNaN(rawVal)) {
      ['m3h', 'lmin', 'gpm'].forEach(k => {
        if (k !== source) {
          const target = document.getElementById('flow-' + k);
          if (target) target.value = '';
        }
      });
      return;
    }

    let m3h = 0;
    if (source === 'm3h') m3h = rawVal;
    else if (source === 'lmin') m3h = rawVal * 0.06;
    else if (source === 'gpm') m3h = rawVal * 0.2271247;

    const round = (n, dec = 2) => parseFloat(n.toFixed(dec)).toString();
    if (source !== 'm3h') {
      const e = document.getElementById('flow-m3h');
      if (e) e.value = round(m3h, 2);
    }
    if (source !== 'lmin') {
      const e = document.getElementById('flow-lmin');
      if (e) e.value = round(m3h / 0.06, 1);
    }
    if (source !== 'gpm') {
      const e = document.getElementById('flow-gpm');
      if (e) e.value = round(m3h / 0.2271247, 2);
    }
  } finally {
    _isConvertingFlow = false;
  }
}

// ── 3-Phase Electrical Calculator ──────────────────
function calc3PhaseMotor() {
  const kw = parseFloat((document.getElementById('motor-kw') || {}).value) || 0;
  const volt = parseFloat((document.getElementById('motor-volt') || {}).value) || 380;
  const pf = parseFloat((document.getElementById('motor-pf') || {}).value) || 0.85;
  const eff = parseFloat((document.getElementById('motor-eff') || {}).value) || 0.90;

  const resEl = document.getElementById('motor-result-fla');
  const olEl = document.getElementById('motor-result-overload');
  const cbEl = document.getElementById('motor-result-cb');
  const cableEl = document.getElementById('motor-result-cable');

  if (kw <= 0 || volt <= 0 || pf <= 0 || eff <= 0) {
    if (resEl) resEl.textContent = '—';
    if (olEl) olEl.textContent = '—';
    if (cbEl) cbEl.textContent = '—';
    if (cableEl) cableEl.textContent = '—';
    return;
  }

  // I = (P * 1000) / (sqrt(3) * V * pf * eff)
  const fla = (kw * 1000) / (Math.sqrt(3) * volt * pf * eff);
  const flaRound = fla.toFixed(1);
  const olMin = (fla * 1.05).toFixed(1);
  const olMax = (fla * 1.15).toFixed(1);
  const cbRating = Math.ceil(fla * 1.5 / 5) * 5; // Standard step CB approx

  // Cable copper approximation ~ 4.5A per mm2 for general tray installation
  let cableSize = '2.5 mm²';
  if (fla > 90) cableSize = '50 mm²';
  else if (fla > 65) cableSize = '35 mm²';
  else if (fla > 45) cableSize = '25 mm²';
  else if (fla > 30) cableSize = '16 mm²';
  else if (fla > 22) cableSize = '10 mm²';
  else if (fla > 15) cableSize = '6 mm²';
  else if (fla > 10) cableSize = '4 mm²';

  if (resEl) resEl.textContent = `${flaRound} A`;
  if (olEl) olEl.textContent = `${olMin} A – ${olMax} A`;
  if (cbEl) cbEl.textContent = `~${cbRating} A`;
  if (cableEl) cableEl.textContent = `${cableSize} (Cu)`;
}

// ── 4-20mA Signal Converter ────────────────────────
let _isConvertingSignal = false;
function onSignalInput(source) {
  if (_isConvertingSignal) return;
  _isConvertingSignal = true;
  try {
    const minVal = parseFloat((document.getElementById('sig-min') || {}).value) || 0;
    const maxVal = parseFloat((document.getElementById('sig-max') || {}).value) || 100;
    const span = maxVal - minVal;

    const round = (n, dec = 2) => parseFloat(n.toFixed(dec)).toString();

    if (source === 'ma') {
      const ma = parseFloat((document.getElementById('sig-ma') || {}).value);
      if (isNaN(ma)) {
        document.getElementById('sig-pct').value = '';
        document.getElementById('sig-pv').value = '';
        return;
      }
      const pct = ((ma - 4) / 16) * 100;
      const pv = minVal + (pct / 100) * span;
      document.getElementById('sig-pct').value = round(pct, 1);
      document.getElementById('sig-pv').value = round(pv, 2);
    } else if (source === 'pct') {
      const pct = parseFloat((document.getElementById('sig-pct') || {}).value);
      if (isNaN(pct)) {
        document.getElementById('sig-ma').value = '';
        document.getElementById('sig-pv').value = '';
        return;
      }
      const ma = 4 + (pct / 100) * 16;
      const pv = minVal + (pct / 100) * span;
      document.getElementById('sig-ma').value = round(ma, 2);
      document.getElementById('sig-pv').value = round(pv, 2);
    } else if (source === 'pv') {
      const pv = parseFloat((document.getElementById('sig-pv') || {}).value);
      if (isNaN(pv) || span === 0) {
        document.getElementById('sig-ma').value = '';
        document.getElementById('sig-pct').value = '';
        return;
      }
      const pct = ((pv - minVal) / span) * 100;
      const ma = 4 + (pct / 100) * 16;
      document.getElementById('sig-ma').value = round(ma, 2);
      document.getElementById('sig-pct').value = round(pct, 1);
    }
  } finally {
    _isConvertingSignal = false;
  }
}

// ═════════════════════════════════════════════════════
// 2. QUICK FIELD SCRATCHPAD & NAMEPLATE SNAPPER (IMP-22)
// Instant field notes, photo scanner, and 1-click converters
// ═════════════════════════════════════════════════════

let _scratchPhotoBase64 = '';
let _scratchSelectedCategory = 'nameplate';

function initScratchpadStore() {
  if (!S.scratchpad) S.scratchpad = [];
}

function openQuickScratchModal(prefillCategory = 'nameplate') {
  initScratchpadStore();
  _scratchPhotoBase64 = '';
  _scratchSelectedCategory = prefillCategory || 'nameplate';

  const titleEl = document.getElementById('scratch-title');
  const textEl = document.getElementById('scratch-text');
  const photoPreview = document.getElementById('scratch-photo-preview');
  const tripSelect = document.getElementById('scratch-trip-select');

  if (titleEl) titleEl.value = '';
  if (textEl) textEl.value = '';
  if (photoPreview) {
    photoPreview.src = '';
    photoPreview.style.display = 'none';
  }

  // Populate trips dropdown
  if (tripSelect) {
    let opts = '<option value="">-- No Linked Trip (Unassigned) --</option>';
    (S.trips || []).forEach(tr => {
      const sel = (curTrip && tr.id === curTrip) ? ' selected' : '';
      opts += `<option value="${tr.id}"${sel}>🏭 ${tr.plant} (${fmtDate(tr.date)})</option>`;
    });
    tripSelect.innerHTML = opts;
  }

  // Highlight category chip
  selectScratchCategory(_scratchSelectedCategory);
  openModal('modal-quick-scratch');
}

function selectScratchCategory(cat) {
  _scratchSelectedCategory = cat;
  const chips = document.querySelectorAll('.scratch-cat-chip');
  chips.forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-cat') === cat);
  });
}

async function handleScratchPhotoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    showToast('Compressing photo...');
    const compressed = await compressImageFile(file, 1280, 0.72);
    _scratchPhotoBase64 = compressed;
    const preview = document.getElementById('scratch-photo-preview');
    if (preview) {
      preview.src = compressed;
      preview.style.display = 'block';
    }
    triggerHaptic('light');
    showToast('Photo captured ✓');
  } catch (err) {
    console.error('Scratch photo error:', err);
    showToast('Failed to load image');
  }
}

function clearScratchPhoto() {
  _scratchPhotoBase64 = '';
  const preview = document.getElementById('scratch-photo-preview');
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
  const input = document.getElementById('scratch-file-input');
  if (input) input.value = '';
}

function saveQuickScratch() {
  initScratchpadStore();
  const text = (document.getElementById('scratch-text') || {}).value.trim();
  let title = (document.getElementById('scratch-title') || {}).value.trim();
  const tripId = (document.getElementById('scratch-trip-select') || {}).value || null;

  if (!title && !text && !_scratchPhotoBase64) {
    showToast('Please enter text or take a photo');
    return;
  }

  if (!title) {
    // Generate automatic title based on category & time
    const catLabels = {
      nameplate: 'Nameplate Snap',
      defect: 'Field Defect Issue',
      wiring: 'Wiring / Terminal',
      measurement: 'Measurement Note',
      general: 'Quick Note'
    };
    title = `${catLabels[_scratchSelectedCategory] || 'Field Memo'} - ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
  }

  const item = {
    id: 'sp_' + Date.now(),
    title: title,
    text: text,
    photo: _scratchPhotoBase64,
    category: _scratchSelectedCategory,
    tripId: tripId,
    createdAt: new Date().toISOString()
  };

  S.scratchpad.unshift(item);
  sv();
  closeModal('modal-quick-scratch');
  triggerHaptic('success');
  showToast('Quick note saved ✓');

  // Refresh lists if open
  renderScratchpadList();
  renderDash();
}

function renderScratchpadList() {
  initScratchpadStore();
  const container = document.getElementById('scratchpad-list-items');
  const countEl = document.getElementById('scratchpad-count-badge');
  const emptyEl = document.getElementById('scratchpad-empty-state');
  if (!container) return;

  const items = S.scratchpad || [];
  if (countEl) countEl.textContent = items.length;

  if (!items.length) {
    container.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  const catIcons = {
    nameplate: '🏷️ Nameplate',
    defect: '⚠️ Defect',
    wiring: '⚡ Wiring',
    measurement: '📊 Reading',
    general: '📝 Memo'
  };

  container.innerHTML = items.map(sp => {
    const trip = sp.tripId ? (S.trips || []).find(t => t.id === sp.tripId) : null;
    const tripLabel = trip ? `🏭 ${trip.plant}` : 'Unassigned';
    const dateStr = new Date(sp.createdAt).toLocaleDateString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});

    return `
      <div class="scratch-card" id="scratch-item-${sp.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
              <span class="scratch-badge-cat cat-${sp.category}">${catIcons[sp.category] || '📝 Note'}</span>
              <span style="font-size:11px;color:var(--n500);">${dateStr}</span>
              ${sp.tripId ? `<span style="font-size:11px;color:var(--brand);font-weight:600;">${tripLabel}</span>` : ''}
            </div>
            <div style="font-size:13px;font-weight:700;color:var(--n800);margin-bottom:4px;">${sp.title}</div>
            ${sp.text ? `<div style="font-size:12px;color:var(--n600);line-height:1.4;white-space:pre-wrap;margin-bottom:6px;">${sp.text}</div>` : ''}
          </div>
          ${sp.photo ? `
            <img src="${sp.photo}" onclick="previewImage('${sp.photo}')"
              style="width:58px;height:58px;object-fit:cover;border-radius:var(--rs);border:1px solid var(--n200);cursor:pointer;flex-shrink:0;">
          ` : ''}
        </div>
        <div class="scratch-card-actions">
          <button class="scratch-act-btn" onclick="convertScratchToTask('${sp.id}')" title="Convert to formal Task">
            📋 Convert to Task
          </button>
          <button class="scratch-act-btn" onclick="openAttachScratchTripModal('${sp.id}')" title="Assign to Trip">
            🏭 Assign Trip
          </button>
          <button class="scratch-act-btn scratch-act-del" onclick="deleteScratchItem('${sp.id}')" title="Delete">
            ✕ Delete
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openScratchpadManagerModal() {
  renderScratchpadList();
  openModal('modal-scratchpad-manager');
}

async function deleteScratchItem(id) {
  const ok = await appConfirm('Delete this scratchpad note?', {
    title: 'Delete Quick Note',
    danger: true,
    confirmText: 'Delete',
    icon: '🗑️'
  });
  if (!ok) return;

  S.scratchpad = (S.scratchpad || []).filter(s => s.id !== id);
  sv();
  triggerHaptic('light');
  renderScratchpadList();
  showToast('Note deleted');
}

function convertScratchToTask(id) {
  const sp = (S.scratchpad || []).find(s => s.id === id);
  if (!sp) return;

  closeModal('modal-scratchpad-manager');
  // Open task modal with prefilled data
  openNewTaskModal(todayStr(), 'work');

  setTimeout(() => {
    const titleEl = document.getElementById('ntk-title');
    const descEl = document.getElementById('ntk-desc');
    const tripEl = document.getElementById('ntk-trip');

    if (titleEl) titleEl.value = sp.title;
    if (descEl) descEl.value = (sp.text ? sp.text + '\n\n' : '') + `[Imported from Field Scratchpad (${sp.category})]`;
    if (tripEl && sp.tripId) tripEl.value = sp.tripId;

    if (sp.photo) {
      tmpPhotos = [sp.photo];
      renderPhotoStrip();
    }
  }, 200);
}

async function openAttachScratchTripModal(id) {
  const sp = (S.scratchpad || []).find(s => s.id === id);
  if (!sp) return;

  const trips = S.trips || [];
  if (!trips.length) {
    showToast('No trips found. Create a trip first.');
    return;
  }

  const tripListStr = trips.map((t, idx) => `${idx + 1}. ${t.plant} (${fmtDate(t.date)})`).join('\n');
  const res = await appPrompt(`Select Trip number to attach:\n\n${tripListStr}`, {
    title: 'Assign to Trip',
    placeholder: 'Enter trip number (e.g. 1)'
  });

  if (res) {
    const idx = parseInt(res) - 1;
    if (idx >= 0 && idx < trips.length) {
      sp.tripId = trips[idx].id;
      sv();
      renderScratchpadList();
      showToast(`Assigned to ${trips[idx].plant} ✓`);
    } else {
      showToast('Invalid trip number');
    }
  }
}

// ═════════════════════════════════════════════════════
// 3. ASSET PASSPORT & EQUIPMENT SERVICE HISTORY (IMP-24)
// Equipment registry, machine tags, specs & timeline audit
// ═════════════════════════════════════════════════════

let editingAssetId = null;

function ensureAssetsInitialized() {
  if (!S.assets) S.assets = [];

  // Backward compatibility migration from S.machines string array
  if (Array.isArray(S.machines) && S.machines.length) {
    S.machines.forEach(m => {
      const name = (typeof m === 'string') ? m : (m && m.name ? m.name : '');
      if (name && !S.assets.some(a => (a.name || '').toLowerCase() === name.toLowerCase() || (a.tag || '').toLowerCase() === name.toLowerCase())) {
        S.assets.push({
          id: 'ast_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          tag: name.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 12) || 'TAG-01',
          name: name,
          customer: '',
          model: '',
          serial: '',
          spec: '',
          location: '',
          notes: 'Auto-migrated from machine list',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });
  }
}

function openAssetsScreen() {
  ensureAssetsInitialized();
  showScreen('assets');
  renderAssetList();
}

function renderAssetList(query = '') {
  ensureAssetsInitialized();
  const listEl = document.getElementById('asset-list-container');
  const countEl = document.getElementById('asset-total-count');
  const emptyEl = document.getElementById('asset-empty-state');
  if (!listEl) return;

  const q = (query || (document.getElementById('asset-search-input') || {}).value || '').toLowerCase().trim();

  let assets = S.assets || [];
  if (countEl) countEl.textContent = assets.length;

  if (q) {
    assets = assets.filter(a =>
      (a.tag || '').toLowerCase().includes(q) ||
      (a.name || '').toLowerCase().includes(q) ||
      (a.customer || '').toLowerCase().includes(q) ||
      (a.model || '').toLowerCase().includes(q) ||
      (a.serial || '').toLowerCase().includes(q) ||
      (a.location || '').toLowerCase().includes(q)
    );
  }

  if (!assets.length) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  listEl.innerHTML = assets.map(a => {
    // Quick scan service count for this asset
    const historyCount = getAssetHistory(a).length;

    return `
      <div class="asset-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
              <span class="badge-asset-tag">${a.tag || 'NO-TAG'}</span>
              ${a.customer ? `<span style="font-size:11px;color:var(--n500);font-weight:600;">🏭 ${a.customer}</span>` : ''}
            </div>
            <div style="font-size:14px;font-weight:700;color:var(--n800);">${a.name}</div>
          </div>
          <span class="badge ${historyCount > 0 ? 'bg' : 'ba'}" style="font-size:10px;">
            ${historyCount} visit${historyCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div class="asset-specs-grid">
          ${a.model ? `<div><span style="color:var(--n500);">Model:</span> <b>${a.model}</b></div>` : ''}
          ${a.serial ? `<div><span style="color:var(--n500);">S/N:</span> <b>${a.serial}</b></div>` : ''}
          ${a.location ? `<div><span style="color:var(--n500);">Loc:</span> <b>${a.location}</b></div>` : ''}
          ${a.spec ? `<div style="grid-column:span 2;"><span style="color:var(--n500);">Spec:</span> <b>${a.spec}</b></div>` : ''}
        </div>

        ${a.notes ? `<div style="font-size:11px;color:var(--n600);background:var(--n50);padding:5px 8px;border-radius:4px;margin-top:6px;font-style:italic;">💬 ${a.notes}</div>` : ''}

        <div class="asset-card-actions">
          <button class="asset-act-btn asset-act-primary" onclick="openAssetHistoryModal('${a.id}')">
            📜 Service History (${historyCount})
          </button>
          <button class="asset-act-btn" onclick="openEditAssetModal('${a.id}')">
            ✏️ Edit
          </button>
          <button class="asset-act-btn asset-act-del" onclick="deleteAsset('${a.id}')">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openAddAssetModal(assetId = null) {
  ensureAssetsInitialized();
  editingAssetId = assetId;

  const modalTitle = document.getElementById('asset-modal-title');
  const tagInput = document.getElementById('ast-tag');
  const nameInput = document.getElementById('ast-name');
  const custInput = document.getElementById('ast-customer');
  const modelInput = document.getElementById('ast-model');
  const serialInput = document.getElementById('ast-serial');
  const specInput = document.getElementById('ast-spec');
  const locInput = document.getElementById('ast-location');
  const notesInput = document.getElementById('ast-notes');

  if (assetId) {
    const a = S.assets.find(item => item.id === assetId);
    if (!a) return;
    if (modalTitle) modalTitle.textContent = 'Edit Equipment Passport';
    if (tagInput) tagInput.value = a.tag || '';
    if (nameInput) nameInput.value = a.name || '';
    if (custInput) custInput.value = a.customer || '';
    if (modelInput) modelInput.value = a.model || '';
    if (serialInput) serialInput.value = a.serial || '';
    if (specInput) specInput.value = a.spec || '';
    if (locInput) locInput.value = a.location || '';
    if (notesInput) notesInput.value = a.notes || '';
  } else {
    if (modalTitle) modalTitle.textContent = 'New Equipment Passport';
    [tagInput, nameInput, custInput, modelInput, serialInput, specInput, locInput, notesInput].forEach(el => {
      if (el) el.value = '';
    });
  }

  openModal('modal-add-asset');
}

function openEditAssetModal(id) {
  openAddAssetModal(id);
}

function saveAsset() {
  ensureAssetsInitialized();
  const tag = (document.getElementById('ast-tag') || {}).value.trim();
  const name = (document.getElementById('ast-name') || {}).value.trim();
  const customer = (document.getElementById('ast-customer') || {}).value.trim();
  const model = (document.getElementById('ast-model') || {}).value.trim();
  const serial = (document.getElementById('ast-serial') || {}).value.trim();
  const spec = (document.getElementById('ast-spec') || {}).value.trim();
  const location = (document.getElementById('ast-location') || {}).value.trim();
  const notes = (document.getElementById('ast-notes') || {}).value.trim();

  if (!tag || !name) {
    showToast('Equipment Tag and Name are required');
    return;
  }

  if (editingAssetId) {
    const a = S.assets.find(item => item.id === editingAssetId);
    if (a) {
      a.tag = tag;
      a.name = name;
      a.customer = customer;
      a.model = model;
      a.serial = serial;
      a.spec = spec;
      a.location = location;
      a.notes = notes;
      a.updatedAt = new Date().toISOString();
    }
    showToast('Equipment updated ✓');
  } else {
    const newAsset = {
      id: 'ast_' + Date.now(),
      tag, name, customer, model, serial, spec, location, notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    S.assets.unshift(newAsset);
    // Also sync to S.machines for legacy backwards compatibility
    if (!S.machines.includes(name)) S.machines.push(name);
    showToast('Equipment registered ✓');
  }

  sv();
  closeModal('modal-add-asset');
  renderAssetList();
  triggerHaptic('success');
}

async function deleteAsset(id) {
  const ok = await appConfirm('Delete this equipment passport? Historical reports will be preserved.', {
    title: 'Delete Equipment',
    danger: true,
    confirmText: 'Delete',
    icon: '🗑️'
  });
  if (!ok) return;

  S.assets = (S.assets || []).filter(a => a.id !== id);
  sv();
  renderAssetList();
  showToast('Equipment deleted');
}

/**
 * Scan all historical records (Trips, Tasks, Reports, Readings, Issues) matching this Asset
 */
function getAssetHistory(asset) {
  if (!asset) return [];
  const tagL = (asset.tag || '').toLowerCase();
  const nameL = (asset.name || '').toLowerCase();
  const events = [];

  // 1. Scan Tasks
  (S.tasks || []).forEach(tk => {
    const tkMachine = (tk.machine || '').toLowerCase();
    const tkTitle = (tk.title || '').toLowerCase();
    const tkDesc = (tk.desc || '').toLowerCase();

    const matches = (tagL && tkMachine.includes(tagL)) ||
                    (nameL && tkMachine.includes(nameL)) ||
                    (tagL && (tkTitle.includes(tagL) || tkDesc.includes(tagL)));

    if (matches) {
      const trip = tk.tripId ? (S.trips || []).find(t => t.id === tk.tripId) : null;
      events.push({
        type: 'task',
        date: tk.dateStart || tk.date || '',
        title: tk.title,
        detail: tk.desc || '',
        status: tk.status,
        tripName: trip ? trip.plant : '',
        meta: `Status: ${tk.status} · Duration: ${calcDuration(tk) || '—'}`
      });
    }
  });

  // 2. Scan Reports (Readings, Issues, Readiness)
  Object.entries(S.reports || {}).forEach(([tripId, rep]) => {
    const trip = (S.trips || []).find(t => t.id === tripId);
    const tripDate = trip ? trip.date : '';
    const tripName = trip ? trip.plant : 'Report';

    // Readings matching asset tag or name
    (rep.readings || []).forEach(rd => {
      const rdTag = (rd.tag || '').toLowerCase();
      const rdName = (rd.name || '').toLowerCase();
      if ((tagL && rdTag.includes(tagL)) || (nameL && rdName.includes(nameL))) {
        events.push({
          type: 'reading',
          date: tripDate,
          title: `Reading: ${rd.name} = ${rd.value} ${rd.unit}`,
          detail: rd.notes || '',
          tripName: tripName,
          meta: `Status: ${rd.status === 'bad' ? '⚠️ Out of spec' : '✓ In spec'}`
        });
      }
    });

    // Issues matching asset
    (rep.issues || []).forEach(is => {
      const isTitle = (is.title || '').toLowerCase();
      const isDesc = (is.description || '').toLowerCase();
      if ((tagL && (isTitle.includes(tagL) || isDesc.includes(tagL))) ||
          (nameL && (isTitle.includes(nameL) || isDesc.includes(nameL)))) {
        events.push({
          type: 'issue',
          date: tripDate,
          title: `Issue: ${is.title}`,
          detail: is.description || '',
          tripName: tripName,
          meta: `Severity: ${is.severity} · Status: ${is.istatus || 'pending'}`
        });
      }
    });

    // Spare parts recommended for this machine
    (rep.spareParts || []).forEach(sp => {
      const spNotes = (sp.notes || '').toLowerCase();
      const spDesc = (sp.desc || '').toLowerCase();
      if ((tagL && (spNotes.includes(tagL) || spDesc.includes(tagL))) ||
          (nameL && (spNotes.includes(nameL) || spDesc.includes(nameL)))) {
        events.push({
          type: 'sparepart',
          date: tripDate,
          title: `Part: ${sp.partNo || ''} - ${sp.desc} (${sp.qty} ${sp.unit||'pcs'})`,
          detail: sp.notes || '',
          tripName: tripName,
          meta: `Priority: ${sp.priority}`
        });
      }
    });
  });

  // Sort descending by date
  events.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return events;
}

function openAssetHistoryModal(assetId) {
  ensureAssetsInitialized();
  const asset = S.assets.find(a => a.id === assetId);
  if (!asset) return;

  const headerEl = document.getElementById('asset-hist-header');
  const timelineEl = document.getElementById('asset-hist-timeline');
  const emptyEl = document.getElementById('asset-hist-empty');

  if (headerEl) {
    headerEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
        <span class="badge-asset-tag">${asset.tag}</span>
        <span style="font-size:12px;font-weight:700;color:var(--n800);">${asset.name}</span>
      </div>
      <div style="font-size:11px;color:var(--n500);">${asset.customer || 'Factory Asset'}${asset.model ? ' · ' + asset.model : ''}</div>
    `;
  }

  const events = getAssetHistory(asset);

  if (!events.length) {
    if (timelineEl) timelineEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
  } else {
    if (emptyEl) emptyEl.style.display = 'none';
    const typeIcons = {
      task: '🔧',
      reading: '📊',
      issue: '⚠️',
      sparepart: '🔩'
    };
    if (timelineEl) {
      timelineEl.innerHTML = events.map(ev => `
        <div class="asset-timeline-node">
          <div class="asset-tl-icon">${typeIcons[ev.type] || '📌'}</div>
          <div class="asset-tl-content">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
              <div style="font-size:12px;font-weight:700;color:var(--n800);">${ev.title}</div>
              <div style="font-size:10px;color:var(--n500);white-space:nowrap;">${fmtDate(ev.date)}</div>
            </div>
            ${ev.tripName ? `<div style="font-size:10px;color:var(--brand);font-weight:600;">🏭 ${ev.tripName}</div>` : ''}
            ${ev.detail ? `<div style="font-size:11px;color:var(--n600);margin-top:2px;line-height:1.4;">${ev.detail}</div>` : ''}
            <div style="font-size:10px;color:var(--n500);margin-top:3px;">${ev.meta}</div>
          </div>
        </div>
      `).join('');
    }
  }

  openModal('modal-asset-history');
}

/**
 * Returns HTML string of `<option>` elements for Machine / Equipment dropdowns
 */
function getAssetSelectOptions(selectedVal = '') {
  ensureAssetsInitialized();
  const assets = S.assets || [];
  let html = '<option value="">-- Select Equipment / Asset --</option>';

  assets.forEach(a => {
    const label = `[${a.tag}] ${a.name}`;
    const isSel = (selectedVal === label || selectedVal === a.tag || selectedVal === a.name) ? ' selected' : '';
    html += `<option value="${label}"${isSel}>${label}</option>`;
  });

  return html;
}

