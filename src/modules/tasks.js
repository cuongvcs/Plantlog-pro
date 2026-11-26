// =====================================================
// PlantLog — tasks.js
// Task CRUD, kanban, sub-checklist, flight details
// =====================================================

// ═══════ TASKS ═══════
function populateTaskTripSelect() {
  const sel = document.getElementById('task-trip');
  if (!sel) return;
  const trips = typeof getSortedTrips === 'function' ? getSortedTrips() : [...(S.trips || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  sel.innerHTML = '<option value="">None</option>' + trips.map(tr => `<option value="${tr.id}">${tr.plant} (${fmtDate(tr.date)})</option>`).join('');
}

// ── TASK TRIP FILTER FUNCTIONS (IMP-59) ──────────────────────────────────
function populateTaskFilterTripSelect() {
  const sel = document.getElementById('task-filter-trip');
  if (!sel) return;
  const currentVal = sel.value;
  const trips = (S.trips || []).slice().sort((a, b) => {
    const da = a.dateStart || a.date || '';
    const db = b.dateStart || b.date || '';
    return db.localeCompare(da);
  });
  let html = '<option value="">All Trips</option>';
  html += '<option value="__none__">📋 No Trip (Unassigned)</option>';
  trips.forEach(tr => {
    const dStr = tr.date ? (typeof fmtDate === 'function' ? fmtDate(tr.date) : tr.date) : '';
    const isLeave = (tr.type === 'leave') || /leave|nghỉ/i.test(tr.purpose || tr.plant || '');
    const isBase = typeof isTripBasePlant === 'function' && isTripBasePlant(tr);
    const prefix = isLeave ? '🌴' : isBase ? '🏢' : '🧳';
    const st = tr.status === 'in_progress' ? ' [Active]' : tr.status === 'completed' ? ' [Done]' : ' [Planned]';
    html += `<option value="${tr.id}">${prefix} ${tr.plant || 'Trip'}${dStr ? ' (' + dStr + ')' : ''}${st}</option>`;
  });
  sel.innerHTML = html;
  if (currentVal) sel.value = currentVal;
}

function toggleTaskTripFilter() {
  const row = document.getElementById('task-trip-filter-row');
  if (!row) return;
  const isHidden = (row.style.display === 'none' || !row.style.display);
  row.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    populateTaskFilterTripSelect();
    const sel = document.getElementById('task-filter-trip');
    if (sel) sel.focus();
  }
}

function toggleTaskDateRow() {
  const row = document.getElementById('task-date-row');
  if (!row) return;
  const isHidden = (row.style.display === 'none' || !row.style.display);
  row.style.display = isHidden ? 'flex' : 'none';
  if (isHidden) {
    const fromEl = document.getElementById('task-from');
    if (fromEl) fromEl.focus();
  }
}

function onTaskTripFilterChange() {
  updateTaskFilterButtonsState();
  renderTasks();
}

function resetTaskTripFilter() {
  const sel = document.getElementById('task-filter-trip');
  if (sel) sel.value = '';
  updateTaskFilterButtonsState();
  renderTasks();
}

function clearTaskFilters() {
  taskPageLimit = 35;
  const searchEl = document.getElementById('task-search');
  if (searchEl) searchEl.value = '';
  const fromEl = document.getElementById('task-from');
  if (fromEl) fromEl.value = '';
  const toEl = document.getElementById('task-to');
  if (toEl) toEl.value = '';
  const tripSel = document.getElementById('task-filter-trip');
  if (tripSel) tripSel.value = '';
  const dateRow = document.getElementById('task-date-row');
  if (dateRow) dateRow.style.display = 'none';
  const tripRow = document.getElementById('task-trip-filter-row');
  if (tripRow) tripRow.style.display = 'none';
  updateTaskFilterButtonsState();
  renderTasks();
}

function filterTasksByTrip(tripId) {
  taskPageLimit = 35;
  if (typeof showScreen === 'function') showScreen('tasks');
  const tripRow = document.getElementById('task-trip-filter-row');
  if (tripRow) tripRow.style.display = 'block';
  populateTaskFilterTripSelect();
  const tripSel = document.getElementById('task-filter-trip');
  if (tripSel) tripSel.value = tripId || '';
  updateTaskFilterButtonsState();
  renderTasks();
}

function updateTaskFilterButtonsState() {
  const dateFrom = (document.getElementById('task-from') || {}).value;
  const dateTo = (document.getElementById('task-to') || {}).value;
  const hasDate = !!(dateFrom || dateTo);
  const dateBtn = document.getElementById('task-date-toggle-btn');
  if (dateBtn) {
    if (hasDate) {
      dateBtn.style.background = 'var(--brand)';
      dateBtn.style.color = '#fff';
      dateBtn.style.borderColor = 'var(--brand)';
    } else {
      dateBtn.style.background = 'var(--gl)';
      dateBtn.style.color = 'var(--green)';
      dateBtn.style.borderColor = 'rgba(0,132,61,0.25)';
    }
  }

  const tripSel = document.getElementById('task-filter-trip');
  const selTripId = tripSel ? tripSel.value : '';
  const hasTrip = !!selTripId;
  const tripBtn = document.getElementById('task-trip-toggle-btn');
  if (tripBtn) {
    if (hasTrip) {
      tripBtn.style.background = 'var(--brand)';
      tripBtn.style.color = '#fff';
      tripBtn.style.borderColor = 'var(--brand)';
      if (selTripId === '__none__') {
        tripBtn.innerHTML = '📋 No Trip';
      } else {
        const trObj = (S.trips || []).find(t => String(t.id) === String(selTripId));
        const plant = trObj ? (trObj.plant || 'Trip') : 'Trip';
        const shortPlant = plant.length > 14 ? plant.substring(0, 12) + '…' : plant;
        tripBtn.innerHTML = '🧳 ' + shortPlant;
      }
    } else {
      tripBtn.style.background = 'var(--gl)';
      tripBtn.style.color = 'var(--green)';
      tripBtn.style.borderColor = 'rgba(0,132,61,0.25)';
      tripBtn.innerHTML = '🧳 Filter by trip';
    }
  }
}
function populateMachineSelect() {
  const sel = document.getElementById('task-machine'); if (!sel) return;
  const machines = S.machines || [];
  sel.innerHTML = '<option value="">None</option>' + machines.map(m => `<option value="${m}">${m}</option>`).join('');
}
function populatePlanSelect() {
  const sel = document.getElementById('task-plan'); if (!sel) return;
  const plans = S.plans || [];
  sel.innerHTML = '<option value="">None</option>' + plans.map(p => `<option value="${p}">${p}</option>`).join('');
}
async function addNewMachine() {
  const name = await appPrompt('Enter new machine / equipment name:', '', {
    title: 'Add Machine',
    placeholder: 'e.g. Pump #1, Air Compressor A',
    confirmText: 'Add'
  });
  if (!name || !name.trim()) return;
  if (!S.machines) S.machines = [];
  if (!S.machines.includes(name.trim())) S.machines.push(name.trim());
  sv(); populateMachineSelect();
  document.getElementById('task-machine').value = name.trim();
}
async function addNewPlan() {
  const name = await appPrompt('Enter new plan / project name:', '', {
    title: 'Add Plan / Project',
    placeholder: 'e.g. Overhaul 2026, Q4 Inspection',
    confirmText: 'Add'
  });
  if (!name || !name.trim()) return;
  if (!S.plans) S.plans = [];
  if (!S.plans.includes(name.trim())) S.plans.push(name.trim());
  sv(); populatePlanSelect();
  document.getElementById('task-plan').value = name.trim();
}
let taskCat = 'all', taskStatusFilter = 'all';
// Global helper — always returns today's date string
function todayStr() { return typeof localDateStr === 'function' ? localDateStr() : new Date().toISOString().slice(0, 10); }

let editingTaskId = null;
let editingTripId = null;

function setTaskCat(cat) {
  taskPageLimit = 35;
  taskCat = cat;
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  const tabs = document.getElementById('cat-tabs');
  if (tabs) {
    const idx = { 'all': 0, 'work': 1, 'leave': 2, 'travel': 3, 'kanban': 4 }[cat] || 0;
    tabs.children[idx].classList.add('active');
  }
  // Hide status filter row for kanban
  const sfRowEl = document.querySelector('#screen-tasks .task-filter, #screen-tasks .tf-btn'); const sfRow = sfRowEl ? sfRowEl.parentElement : null;
  renderTasks();
}
function setStatusFilter(sf) {
  taskPageLimit = 35;
  taskStatusFilter = sf;
  ['all', 'pending', 'in_progress', 'done'].forEach(id => {
    const el = document.getElementById('sf-' + id);
    if (el) el.classList.toggle('active', id === sf);
  });
  renderTasks();
}
// Legacy setTaskView kept for compatibility
function setTaskView(view, filter) {
  if (view === 'kanban') setTaskCat('kanban');
  else { setTaskCat('all'); setStatusFilter(filter); }
}

function openNewTaskModal(prefillDate, prefillCat) {
  editingTaskId = null;
  document.getElementById('task-modal-title').textContent = 'New Task';
  document.getElementById('task-edit-id').textContent = '';
  // Clear all fields
  ['task-title', 'task-desc', 'task-date-start', 'task-time-start', 'task-date-end', 'task-time-end', 'task-hours', 'task-minutes', 'task-assignee-name', 'task-assignee-email'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const autoSendEl = document.getElementById('task-send-email-on-save');
  if (autoSendEl) autoSendEl.checked = false;
  populateAssigneeDatalist();
  onTaskAssigneeEmailChange();
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-period').value = 'weekly';
  selectTaskCat(prefillCat || 'work');
  if (prefillDate) document.getElementById('task-date-start').value = prefillDate;
  populateTaskTripSelect(); populateMachineSelect(); populatePlanSelect();
  const tripFilterEl = document.getElementById('task-filter-trip');
  const selTripId = tripFilterEl ? tripFilterEl.value : '';
  if (selTripId && selTripId !== '__none__') {
    const tripSelect = document.getElementById('task-trip');
    if (tripSelect) tripSelect.value = selTripId;
  }
  resetTaskCheckItems();
  resetPartRows();
  resetTaskFileItems();
  resetTaskFlightFields();
  setAutoDuration(false);  // default: manual
  openModal('modal-new-task');
}

function openEditTaskModal(id) {
  const tk = S.tasks.find(t => t.id === id); if (!tk) return;
  editingTaskId = id;
  document.getElementById('task-modal-title').textContent = 'Edit Task';
  document.getElementById('task-edit-id').textContent = '#' + id.slice(-6);
  document.getElementById('task-title').value = tk.title || '';
  document.getElementById('task-desc').value = tk.desc || '';
  document.getElementById('task-date-start').value = tk.dateStart || tk.date || '';
  document.getElementById('task-time-start').value = (tk.timeStart !== undefined && tk.timeStart !== null) ? tk.timeStart : (tk.time || '');
  document.getElementById('task-date-end').value = tk.dateEnd || '';
  document.getElementById('task-time-end').value = (tk.timeEnd !== undefined && tk.timeEnd !== null) ? tk.timeEnd : ''; setTimeout(updateAutoDurationPreview, 50);
  setAutoDuration(tk.autoDuration === true);
  if (!tk.autoDuration) {
    document.getElementById('task-hours').value = tk.hours || '';
    document.getElementById('task-minutes').value = tk.minutes || '';
  }
  document.getElementById('task-priority').value = tk.priority || 'medium';
  document.getElementById('task-period').value = tk.period || 'weekly';
  const nameEl = document.getElementById('task-assignee-name');
  if (nameEl) nameEl.value = tk.assigneeName || tk.assignee_name || '';
  const emailEl = document.getElementById('task-assignee-email');
  if (emailEl) emailEl.value = tk.assigneeEmail || tk.assignee_email || '';
  const autoSendEl = document.getElementById('task-send-email-on-save');
  if (autoSendEl) autoSendEl.checked = false;
  populateAssigneeDatalist();
  onTaskAssigneeEmailChange();
  selectTaskCat(tk.category || 'work');
  populateTaskTripSelect(); populateMachineSelect(); populatePlanSelect();
  resetTaskCheckItems();
  if (tk.checklist) loadTaskCheckItems(tk.checklist);
  resetPartRows();
  if (tk.parts && tk.parts.length) loadPartRows(tk.parts);
  resetTaskFileItems();
  if (tk.files && tk.files.length) loadTaskFileItems(tk.files);
  resetTaskFlightFields();
  if (tk.flight && tk.category === 'travel') loadTaskFlightFields(tk.flight);
  setTimeout(() => {
    if (tk.machine) document.getElementById('task-machine').value = tk.machine;
    if (tk.plan) document.getElementById('task-plan').value = tk.plan;
    if (tk.tripId) document.getElementById('task-trip').value = tk.tripId;
  }, 60);
  openModal('modal-new-task');
}

// ── FLIGHT TOGGLE & AUTO-SUGGEST FUNCTIONS (IMP-44) ─────────────────────────────
function detectFlightAirline(fNum) {
  if (!fNum) return '';
  const fn = String(fNum).trim().toUpperCase();
  if (fn.startsWith('VN')) return 'VietNam Airline';
  if (fn.startsWith('VJ')) return 'VietJet Air';
  if (fn.startsWith('QH')) return 'Bamboo Airways';
  if (fn.startsWith('VU')) return 'Vietravel Airlines';
  if (fn.startsWith('TG')) return 'Thai Airways';
  if (fn.startsWith('SQ')) return 'Singapore Airlines';
  return '';
}

function autoSuggestTripFlightCities() {
  const plantEl = document.getElementById('nt-plant');
  const plantVal = (plantEl ? plantEl.value : '').toLowerCase();
  const fromEl = document.getElementById('nt-fl-from');
  const toEl = document.getElementById('nt-fl-to');
  const retFromEl = document.getElementById('nt-fl-ret-from');
  const retToEl = document.getElementById('nt-fl-ret-to');

  const userBase = (S.profile && (S.profile.plantBase || S.profile.base)) || 'DaNang';
  const baseLower = userBase.toLowerCase();
  let defaultFrom = userBase;
  let defaultTo = 'Ho Chi Minh';

  if (plantVal.includes(baseLower) || plantVal.includes('danang') || plantVal.includes('đà nẵng') || plantVal.includes('quangnam')) {
    defaultFrom = 'Ho Chi Minh';
    defaultTo = userBase;
  } else if (plantVal.includes('hanoi') || plantVal.includes('hà nội') || plantVal.includes('bacninh') || plantVal.includes('bacgiang') || plantVal.includes('haiphong')) {
    defaultFrom = userBase;
    defaultTo = 'Ha Noi';
  } else {
    // DongNai, BinhDuong, LongAn, CanTho, HCM...
    defaultFrom = userBase;
    defaultTo = 'Ho Chi Minh';
  }

  // Auto-fill if currently empty or was previously auto-filled
  if (fromEl && (!fromEl.value.trim() || fromEl.dataset.autofilled === '1')) {
    fromEl.value = defaultFrom;
    fromEl.dataset.autofilled = '1';
  }
  if (toEl && (!toEl.value.trim() || toEl.dataset.autofilled === '1')) {
    toEl.value = defaultTo;
    toEl.dataset.autofilled = '1';
  }
  if (retFromEl && (!retFromEl.value.trim() || retFromEl.dataset.autofilled === '1')) {
    retFromEl.value = defaultTo;
    retFromEl.dataset.autofilled = '1';
  }
  if (retToEl && (!retToEl.value.trim() || retToEl.dataset.autofilled === '1')) {
    retToEl.value = defaultFrom;
    retToEl.dataset.autofilled = '1';
  }
}

function onTripFlightNumInput(isReturn) {
  const numId = isReturn ? 'nt-fl-ret-num' : 'nt-fl-num';
  const airlineId = isReturn ? 'nt-fl-ret-airline' : 'nt-fl-airline';
  const numEl = document.getElementById(numId);
  const airlineEl = document.getElementById(airlineId);
  if (!numEl || !airlineEl) return;

  const detected = detectFlightAirline(numEl.value);
  if (detected && (!airlineEl.value || airlineEl.dataset.autofilled === '1')) {
    airlineEl.value = detected;
    airlineEl.dataset.autofilled = '1';
  }
}

function toggleTripFlight() {
  const sel = document.getElementById('nt-transport');
  const sec = document.getElementById('trip-flight-section');
  if (!sec) return;
  const show = sel && (sel.value.toLowerCase().includes('flight'));
  sec.style.display = show ? '' : 'none';
  if (show) {
    autoSuggestTripFlightCities();
  }
}
function toggleTripReturnFlight() {
  const chk = document.getElementById('nt-fl-has-return');
  const sec = document.getElementById('nt-fl-return-section');
  if (sec) sec.style.display = (chk && chk.checked) ? '' : 'none';
}
function toggleReturnFlight() {
  const chk = document.getElementById('fl-has-return');
  const sec = document.getElementById('fl-return-section');
  if (sec) sec.style.display = (chk && chk.checked) ? '' : 'none';
}

// ═══════ AUTO DURATION TOGGLE ═══════
function toggleAutoDuration() {
  const cb = document.getElementById('task-auto-duration');
  const on = cb ? !cb.checked : false;
  setAutoDuration(on);
}

function setAutoDuration(on) {
  const cb = document.getElementById('task-auto-duration');
  const track = document.getElementById('task-auto-duration-track');
  const thumb = document.getElementById('task-auto-duration-thumb');
  const manual = document.getElementById('task-manual-duration');
  const preview = document.getElementById('task-auto-duration-preview');
  if (cb) cb.checked = on;
  if (track) track.style.background = on ? 'var(--brand)' : 'var(--n300)';
  if (thumb) thumb.style.transform = on ? 'translateX(16px)' : 'translateX(0)';
  if (manual) manual.style.display = on ? 'none' : '';
  if (preview) preview.style.display = on ? '' : 'none';
  if (on) updateAutoDurationPreview();
}

function updateAutoDurationPreview() {
  const cb = document.getElementById('task-auto-duration');
  if (!cb || !cb.checked) return;
  const ds = (document.getElementById('task-date-start') || {}).value || '';
  const de = (document.getElementById('task-date-end') || {}).value || ds;
  const ts = (document.getElementById('task-time-start') || {}).value || '';
  const te = (document.getElementById('task-time-end') || {}).value || '';
  const el = document.getElementById('task-auto-duration-result');
  if (!el) return;
  if (!ds || !ts || !te) { el.textContent = '—'; return; }
  const d = calcDurationFromTimes(ds, de || ds, ts, te);
  el.textContent = d ? d.label : 'Invalid time range';
}

function calcDurationFromTimes(ds, de, ts, te) {
  try {
    const start = new Date(ds + 'T' + ts);
    const end = new Date((de || ds) + 'T' + te);
    if (isNaN(start) || isNaN(end)) return null;
    const diff = end - start;
    if (diff <= 0) return null;
    const totalMins = Math.round(diff / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const label = h > 0 && m > 0 ? h + 'h ' + m + 'm' : h > 0 ? h + 'h' : m + 'm';
    return { totalMins, h, m, label };
  } catch (e) { return null; }
}

function selectTaskCat(cat) {
  // Update active button
  ['work', 'leave', 'travel'].forEach(c => {
    const btn = document.getElementById('cat-' + c);
    if (btn) { btn.classList.remove('sel'); btn.classList.toggle('sel', c === cat); }
  });
  const catEl = document.getElementById('task-cat-val');
  if (catEl) catEl.value = cat;

  // Helper: show/hide element by id
  const show = (id, visible) => { const e = document.getElementById(id); if (e) e.style.display = visible ? '' : 'none'; };

  // Classification (priority/period/machine/plan) — work only
  const classEl = document.getElementById('task-classification-section');
  if (classEl) classEl.style.display = (cat === 'work') ? '' : 'none';

  // Trip link — work and travel only
  show('task-trip-section', cat !== 'leave');

  // Flight details — travel only
  show('task-flight-section', cat === 'travel');
  // Wire time fields to update auto-duration preview when changed
  ['task-time-start', 'task-time-end', 'task-date-start', 'task-date-end'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._autoDurBound) {
      el.addEventListener('change', updateAutoDurationPreview);
      el._autoDurBound = true;
    }
  });
  if (cat !== 'travel') resetTaskFlightFields();

  // Parts toggle + section — work only
  show('task-parts-toggle-row', cat === 'work');
  if (cat !== 'work') show('task-parts-section', false);

  // Files — work only
  show('task-files-section', cat === 'work');

  // Sub-checklist — work only
  const clEl = document.getElementById('task-checklist-section');
  if (clEl) clEl.style.display = (cat === 'work') ? '' : 'none';
}
function getSelectedCat() {
  for (const c of ['work', 'leave', 'travel']) {
    const btn = document.getElementById('cat-' + c);
    if (btn && btn.classList.contains('sel')) return c;
  } return 'work';
}

function saveNewTask() {
  const title = document.getElementById('task-title').value.trim();
  const dateStart = document.getElementById('task-date-start').value;
  if (!title || !dateStart) { showToast('Title and start date are required'); return; }
  const now = new Date().toISOString();
  const assigneeName = (document.getElementById('task-assignee-name') || {}).value ? document.getElementById('task-assignee-name').value.trim() : '';
  const assigneeEmail = (document.getElementById('task-assignee-email') || {}).value ? document.getElementById('task-assignee-email').value.trim() : '';
  const autoSendEmail = !!((document.getElementById('task-send-email-on-save') || {}).checked);
  const existingTk = editingTaskId ? (S.tasks.find(t => t.id === editingTaskId) || {}) : {};

  const task = {
    id: editingTaskId || (typeof genId === 'function' ? genId('task_') : ('task_' + Date.now())),
    title,
    desc: document.getElementById('task-desc').value,
    category: getSelectedCat(),
    dateStart,
    timeStart: document.getElementById('task-time-start').value,
    dateEnd: document.getElementById('task-date-end').value || dateStart,
    timeEnd: document.getElementById('task-time-end').value,
    autoDuration: (document.getElementById('task-auto-duration') || {}).checked || false,
    hours: (document.getElementById('task-auto-duration') || {}).checked ? '' : (document.getElementById('task-hours').value || ''),
    minutes: (document.getElementById('task-auto-duration') || {}).checked ? '' : (document.getElementById('task-minutes').value || ''),
    priority: document.getElementById('task-priority').value,
    period: document.getElementById('task-period').value,
    machine: document.getElementById('task-machine').value,
    plan: document.getElementById('task-plan').value,
    tripId: document.getElementById('task-trip').value,
    status: editingTaskId ? (existingTk.status || 'pending') : 'pending',
    assigneeName: assigneeName || existingTk.assigneeName || '',
    assigneeEmail: assigneeEmail || existingTk.assigneeEmail || '',
    completionNotes: existingTk.completionNotes || '',
    // legacy compat
    date: dateStart,
    time: document.getElementById('task-time-start').value,
    createdAt: editingTaskId ? (existingTk.createdAt || now) : now,
    updatedAt: now,
    checklist: [...taskCheckItems],
    parts: [...taskPartsItems],
    files: [...taskFileItems],
    flight: (document.getElementById('task-cat-val') && document.getElementById('task-cat-val').value === 'travel') ? getTaskFlightFields() : null
  };
  if (editingTaskId) {
    const idx = S.tasks.findIndex(t => t.id === editingTaskId);
    if (idx >= 0) S.tasks[idx] = task; else S.tasks.push(task);
  } else {
    S.tasks.push(task);
  }
  const wasEditing = !!editingTaskId;
  sv(); closeModal('modal-new-task'); editingTaskId = null;
  Store.commit('task:save');
  showToast((wasEditing ? 'Task updated' : 'Task saved') + ' ✓');
  if (autoSendEmail && task.assigneeEmail && task.assigneeEmail.includes('@')) {
    setTimeout(() => { sendTaskAssignmentEmail(task); }, 250);
  }
  if (Notification.permission === 'granted') scheduleNotifications();
}

function calcDuration(tk) {
  if (tk.hours || tk.minutes) {
    const h = parseInt(tk.hours) || 0, m = parseInt(tk.minutes) || 0;
    return h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
  }
  // Only calculate from dates if ALL four values are valid non-empty strings
  const ds = tk.dateStart || tk.date || '';
  const de = tk.dateEnd || ds;
  const ts = tk.timeStart || '';
  const te = tk.timeEnd || '';
  // Guard: date must match YYYY-MM-DD format
  const dateRx = /^\d{4}-\d{2}-\d{2}$/;
  const timeRx = /^\d{2}:\d{2}$/;
  if (ds && de && ts && te && dateRx.test(ds) && dateRx.test(de) && timeRx.test(ts) && timeRx.test(te)) {
    try {
      const s = new Date(ds + 'T' + ts);
      const e = new Date(de + 'T' + te);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
      const diff = e - s; if (diff <= 0) return '';
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
      return h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
    } catch (e) { }
  }
  return '';
}

function catConfig(cat) {
  return {
    work: { label: 'Work', icon: '🔧', color: 'var(--green)', bg: 'var(--gl)', text: 'var(--gd)' },
    leave: { label: 'Leave', icon: '🌴', color: 'var(--amber)', bg: 'var(--al)', text: '#92400E' },
    travel: { label: 'Travel', icon: '✈️', color: 'var(--blue)', bg: 'var(--bl)', text: '#1E40AF' },
  }[cat] || { label: 'Task', icon: '📋', color: 'var(--g400)', bg: 'var(--g100)', text: 'var(--g600)' };
}
function prioConfig(p) {
  return { high: { dot: 'prio-high', label: 'High' }, medium: { dot: 'prio-medium', label: 'Med' }, low: { dot: 'prio-low', label: 'Low' }, critical: { dot: '', label: 'Critical', extra: 'background:var(--pl);color:var(--purple);' } }[p] || { dot: 'prio-low', label: p };
}
function periodLabel(p) { return { daily: 'Day', weekly: 'Week', monthly: 'Month', yearly: 'Year' }[p] || p || ''; }

let taskPageLimit = 35;
let _taskSearchDebounceTimer = null;

function onTaskSearchInput() {
  clearTimeout(_taskSearchDebounceTimer);
  _taskSearchDebounceTimer = setTimeout(() => {
    taskPageLimit = 35;
    renderTasks();
  }, 180);
}

function loadMoreTasks() {
  taskPageLimit += 35;
  renderTasks();
}

function renderTasks() {
  const body = document.getElementById('task-list-body');
  if (!body) return;
  const today = todayStr();

  if (taskCat === 'kanban') {
    renderKanban(body, today); return;
  }

  // Filter by category
  let tasks = S.tasks.slice();
  if (taskCat !== 'all') tasks = tasks.filter(tk => (tk.category || 'work') === taskCat);
  if (taskStatusFilter !== 'all') tasks = tasks.filter(tk => tk.status === taskStatusFilter);

  // Filter by trip (IMP-59)
  const tripFilterEl = document.getElementById('task-filter-trip');
  const optCount = (tripFilterEl && tripFilterEl.options) ? tripFilterEl.options.length : 0;
  if (tripFilterEl && optCount <= 1 && (S.trips || []).length > 0) {
    populateTaskFilterTripSelect();
  }
  const selTripId = tripFilterEl ? tripFilterEl.value : '';
  if (selTripId === '__none__') {
    tasks = tasks.filter(tk => !tk.tripId);
  } else if (selTripId) {
    tasks = tasks.filter(tk => String(tk.tripId) === String(selTripId));
  }

  // Text search — title, desc, machine, plan, trip plant
  const tq = ((document.getElementById('task-search') || {}).value || '').toLowerCase().trim();
  if (tq) tasks = tasks.filter(tk => {
    if ((tk.title || '').toLowerCase().includes(tq)) return true;
    if ((tk.desc || '').toLowerCase().includes(tq)) return true;
    if ((tk.machine || '').toLowerCase().includes(tq)) return true;
    if ((tk.plan || '').toLowerCase().includes(tq)) return true;
    const tr = S.trips.find(t => t.id === tk.tripId);
    return !!(tr && (tr.plant || '').toLowerCase().includes(tq));
  });

  const tdfEl = document.getElementById('task-from'); const tdf = tdfEl ? tdfEl.value : '';
  const tdtEl = document.getElementById('task-to'); const tdt = tdtEl ? tdtEl.value : '';
  if (tdf) tasks = tasks.filter(tk => (tk.dateStart || tk.date || '') >= tdf);
  if (tdt) tasks = tasks.filter(tk => (tk.dateStart || tk.date || '') <= tdt);

  // Active filter label
  const tlbl = document.getElementById('task-active-filter');
  if (tlbl) {
    const tp = [];
    if (tq) tp.push('"' + tq + '"');
    if (tdf || tdt) tp.push((tdf || 'start') + ' → ' + (tdt || 'end'));
    if (selTripId) {
      if (selTripId === '__none__') {
        tp.push('No Trip');
      } else {
        const trObj = (S.trips || []).find(t => String(t.id) === String(selTripId));
        tp.push('Trip: ' + (trObj ? trObj.plant : selTripId));
      }
    }
    tlbl.style.display = tp.length ? '' : 'none';
    tlbl.textContent = tp.length ? 'Showing ' + tasks.length + ' task' + (tasks.length !== 1 ? 's' : '') + ' · ' + tp.join(' · ') : '';
  }

  if (typeof updateTaskFilterButtonsState === 'function') updateTaskFilterButtonsState();

  tasks.sort((a, b) => (b.dateStart || b.date || '').localeCompare(a.dateStart || a.date || ''));
  // Summary stats
  const total = tasks.length;
  const pend = tasks.filter(t => t.status === 'pending').length;
  const inp = tasks.filter(t => t.status === 'in_progress').length;
  const done = tasks.filter(t => t.status === 'done').length;
  const over = tasks.filter(t => (t.dateEnd || t.date || t.dateStart || '') < today && t.status !== 'done').length;

  let html = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;">
    <div style="background:var(--surface);border:1px solid var(--n150);border-radius:var(--r);padding:10px 6px;text-align:center;box-shadow:var(--sh);">
      <div style="font-family:var(--font-hd);font-size:20px;font-weight:700;color:var(--n700);line-height:1;">${total}</div>
      <div style="font-size:10px;color:var(--n400);margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Total</div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--n150);border-radius:var(--r);padding:10px 6px;text-align:center;box-shadow:var(--sh);">
      <div style="font-family:var(--font-hd);font-size:20px;font-weight:700;color:var(--n500);line-height:1;">${pend}</div>
      <div style="font-size:10px;color:var(--n400);margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Pending</div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--n150);border-radius:var(--r);padding:10px 6px;text-align:center;box-shadow:var(--sh);">
      <div style="font-family:var(--font-hd);font-size:20px;font-weight:700;color:var(--amber);line-height:1;">${inp}</div>
      <div style="font-size:10px;color:var(--n400);margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Active</div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--n150);border-radius:var(--r);padding:10px 6px;text-align:center;box-shadow:var(--sh);">
      <div style="font-family:var(--font-hd);font-size:20px;font-weight:700;color:var(--brand);line-height:1;">${done}</div>
      <div style="font-size:10px;color:var(--n400);margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Done</div>
    </div>
  </div>`;

  if (!tasks.length) {
    const emptyMsg = selTripId ? (selTripId === '__none__' ? 'No unassigned tasks found.<br>Tap + to add.' : 'No tasks found for this trip.<br>Tap + to add a task for this trip.') : `No ${taskCat === 'all' ? 'tasks' : taskCat + ' tasks'} yet.<br>Tap + to add.`;
    html += `<div class="empty"><div class="ei">${taskCat === 'leave' ? '🌴' : taskCat === 'travel' ? '✈️' : '📋'}</div><div class="et">${emptyMsg}</div></div>`;
    body.innerHTML = html; return;
  }

  const displayTasks = tasks.slice(0, taskPageLimit);
  html += displayTasks.map(tk => {
    const isOver = (tk.dateEnd || tk.date || tk.dateStart || '') < today && tk.status !== 'done';
    const cat = tk.category || 'work';
    const cc = catConfig(cat);
    const pc = prioConfig(tk.priority);
    const dur = calcDuration(tk);
    const dStart = tk.dateStart || tk.date || '';
    // Only use dateEnd if it's a valid YYYY-MM-DD date, not a time or empty string
    const dateRx = /^\d{4}-\d{2}-\d{2}$/;
    const dEnd = (tk.dateEnd && dateRx.test(tk.dateEnd)) ? tk.dateEnd : dStart;
    const dateRange = (dStart && dEnd && dStart !== dEnd) ? `${fmtDate(dStart)} → ${fmtDate(dEnd)}` : fmtDate(dStart);
    const trObj = tk.tripId ? (S.trips || []).find(tr => String(tr.id) === String(tk.tripId)) : null;
    const trip = trObj ? trObj.plant : '';
    const tripBadge = (trObj && typeof getTripTypeBadge === 'function') ? getTripTypeBadge(trObj) : '';
    return `<div class="task-card-v4" onclick="openTaskDetail('${tk.id}')">
      <div class="tc-bar ${isOver ? 'overdue' : cat}"></div>
      <div class="tc-body">
        <div class="tc-head">
          <div class="tc-title">${tk.title}</div>
          <div class="tc-badges">
            ${periodLabel(tk.period) ? `<span class="period-badge">${periodLabel(tk.period)}</span>` : ''}
            <span class="prio-chip prio-${tk.priority || 'medium'}">${pc.label || 'Med'}</span>
          </div>
        </div>
        ${tk.desc ? `<div style="font-size:12px;color:var(--g500);margin-bottom:6px;line-height:1.4;">${tk.desc.substring(0, 70)}${tk.desc.length > 70 ? '…' : ''}</div>` : ''}
        <div class="tc-meta">
          <span class="tc-meta-item">📅 ${dateRange}</span>
          ${tk.timeStart ? `<span class="tc-meta-item">⏰ ${tk.timeStart}${tk.timeEnd ? ' – ' + tk.timeEnd : ''}</span>` : ''}
          ${dur ? `<span class="tc-meta-item">⏱ ${dur}</span>` : ''}
          ${tk.machine ? `<span class="tc-meta-item">🔩 ${tk.machine}</span>` : ''}
          ${tk.plan ? `<span class="tc-meta-item">📁 ${tk.plan}</span>` : ''}
          ${trip ? `<span class="tc-meta-item">🏭 ${trip} ${tripBadge}</span>` : ''}
          ${(tk.assigneeEmail || tk.assigneeName) ? `<span class="tc-meta-item" style="color:var(--brand);font-weight:600;">👤 ${escHtml(tk.assigneeName || tk.assigneeEmail.split('@')[0])}</span>` : ''}
          ${tk.completionNotes ? `<span class="tc-meta-item" style="color:var(--green);font-weight:600;" title="${escHtml(tk.completionNotes)}">📝 Note</span>` : ''}
          ${isOver ? `<span class="tc-meta-item" style="color:var(--red);font-weight:600;">⚠ Overdue</span>` : ''}
        </div>
        ${tk.status === 'in_progress' && (tk.assigneeEmail || tk.assigneeName) ? `
        <div style="margin-top:6px;margin-bottom:6px;display:inline-flex;align-items:center;gap:4px;background:#FEF3C7;color:#B45309;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">
          🔔 In Progress by ${escHtml(tk.assigneeName || tk.assigneeEmail.split('@')[0])} · Review &amp; Close
        </div>` : ''}
        ${tk.checklist && tk.checklist.length ? (() => {
        const doneC = tk.checklist.filter(c => c.done).length;
        const totalC = tk.checklist.length;
        const pct = Math.round((doneC / totalC) * 100);
        const barColor = pct === 100 ? 'var(--green)' : pct > 0 ? 'var(--blue)' : 'var(--n300)';
        return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <div style="flex:1;height:5px;background:var(--n150);border-radius:3px;overflow:hidden;">
              <div style="height:100%;border-radius:3px;background:${barColor};width:${pct}%;transition:width 0.3s ease;"></div>
            </div>
            <span style="font-size:10px;font-weight:700;color:${pct === 100 ? 'var(--green)' : 'var(--n500)'};flex-shrink:0;">${doneC}/${totalC} (${pct}%)</span>
          </div>`;
      })() : ''}
        <div class="tc-footer">
          <span class="badge" style="background:${cc.bg};color:${cc.text};font-size:10px;">${cc.icon} ${cc.label}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <div class="status-seg">
              <button class="ss-btn ${tk.status === 'pending' ? 'active-p' : ''}" onclick="event.stopPropagation();setTaskStatus('${tk.id}','pending')" title="Pending">○</button>
              <button class="ss-btn ${tk.status === 'in_progress' ? 'active-ip' : ''}" onclick="event.stopPropagation();setTaskStatus('${tk.id}','in_progress')" title="In Progress">◑</button>
              <button class="ss-btn ${tk.status === 'done' ? 'active-d' : ''}" onclick="event.stopPropagation();setTaskStatus('${tk.id}','done')" title="Done">●</button>
            </div>
            <button class="db" onclick="event.stopPropagation();deleteTask('${tk.id}')" style="flex-shrink:0;">×</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  if (tasks.length > taskPageLimit) {
    const remaining = tasks.length - taskPageLimit;
    html += `<div style="text-align:center;padding:16px 0 24px;">
      <button type="button" class="btn btn-o" onclick="loadMoreTasks()"
        style="border-radius:24px;padding:9px 24px;font-weight:600;font-size:13px;display:inline-flex;align-items:center;gap:6px;box-shadow:var(--sh);background:var(--surface);">
        <span>📥 Load More Tasks (${remaining} remaining)</span>
      </button>
    </div>`;
  }

  body.innerHTML = html;
}

function renderKanban(body, today) {
  const PRIO = { high: 1, medium: 2, low: 3 };

  const COLS = [
    { key: 'pending', label: 'Pending', color: '#6B7280' },
    { key: 'in_progress', label: 'In Progress', color: '#D97706' },
    { key: 'done', label: 'Done', color: '#10B981' },
  ];

  // Normalise a raw status string → one of the three keys
  function normStatus(raw) {
    const s = (raw || '').toLowerCase().replace(/[\s_-]+/g, '');
    if (s === 'done' || s === 'completed' || s === 'complete') return 'done';
    if (s === 'inprogress' || s === 'active' || s === 'started') return 'in_progress';
    return 'pending';
  }

  // All tasks, no category filter (board shows everything)
  const allTasks = (S.tasks || []);

  // Sort: priority first (high→medium→low), then date ascending
  const sorted = allTasks.slice().sort((a, b) => {
    const pa = PRIO[a.priority || 'medium'] || 2;
    const pb = PRIO[b.priority || 'medium'] || 2;
    if (pa !== pb) return pa - pb;
    const da = a.dateStart || a.date || '';
    const db = b.dateStart || b.date || '';
    return da.localeCompare(db);
  });

  // Build 3 columns
  const cols = {};
  COLS.forEach(c => { cols[c.key] = []; });
  sorted.forEach(tk => {
    const st = normStatus(tk.status);
    if (cols[st]) cols[st].push(tk);
  });

  let html = '<div class="kanban-board">';

  COLS.forEach(col => {
    const items = cols[col.key];
    const overdue = col.key !== 'done'
      ? items.filter(tk => {
        const d = tk.dateEnd || tk.dateStart || tk.date || '';
        return d && d < today;
      }).length
      : 0;

    html += '<div class="kb-col">';
    // Column header
    html += '<div class="kb-col-hdr">';
    html += '<span class="kb-col-title" style="color:' + col.color + ';">' +
      (col.key === 'pending' ? '⏳' : col.key === 'in_progress' ? '🔄' : '✅') + ' ' + col.label + '</span>';
    html += '<div style="display:flex;gap:4px;align-items:center;">';
    if (overdue) html += '<span class="kb-count" style="background:#FEE2E2;color:#DC2626;">⚠ ' + overdue + '</span>';
    html += '<span class="kb-count">' + items.length + '</span>';
    html += '</div></div>'; // close header

    // Cards
    if (items.length === 0) {
      html += '<div style="text-align:center;padding:24px 8px;font-size:11px;color:var(--n400);">No tasks</div>';
    } else {
      items.forEach(tk => {
        const cat = tk.category || 'work';
        const cc = catConfig(cat);
        const prio = tk.priority || 'medium';
        const isOver = col.key !== 'done' && (tk.dateEnd || tk.dateStart || tk.date || '') < today;
        const prioColor = prio === 'high' ? '#DC2626' : prio === 'low' ? '#9CA3AF' : '#D97706';
        const prioLabel = prio === 'high' ? '🔴 High' : prio === 'low' ? '⚪ Low' : '🟡 Med';
        const catIcon = cat === 'leave' ? '🌴' : cat === 'travel' ? '✈️' : '🔧';
        const trip = tk.tripId ? (S.trips || []).find(t => t.id === tk.tripId) : null;

        // Duration string
        let durStr = '';
        if (tk.autoDuration && tk.timeStart && tk.timeEnd) {
          const d = calcDurationFromTimes(tk.dateStart || tk.date, tk.dateEnd || tk.dateStart || tk.date, tk.timeStart, tk.timeEnd);
          if (d) durStr = d.label;
        } else if (tk.hours || tk.minutes) {
          durStr = (parseInt(tk.hours || 0) > 0 ? tk.hours + 'h ' : '') + ((parseInt(tk.minutes || 0) > 0) ? tk.minutes + 'm' : '');
        }

        html += '<div class="kb-card" onclick="openTaskDetail(this.dataset.id)" data-id="' + tk.id + '" ' +
          'style="position:relative;cursor:pointer;border-left:4px solid ' + prioColor + ';">';

        // Title
        html += '<div style="font-size:13px;font-weight:600;color:var(--n800);margin-bottom:4px;line-height:1.3;">' +
          (isOver ? '<span style="color:#DC2626;">⚠ </span>' : '') + tk.title + '</div>';

        // Date + time
        const dateStr = fmtDate(tk.dateStart || tk.date || '');
        const timeStr = tk.timeStart ? (tk.timeStart + (tk.timeEnd ? ' – ' + tk.timeEnd : '')) : '';
        if (dateStr || timeStr) {
          html += '<div style="font-size:11px;color:var(--n500);margin-bottom:5px;">' +
            (dateStr ? '📅 ' + dateStr : '') +
            (timeStr ? ' · ⏰ ' + timeStr : '') +
            (durStr ? ' · ⏱ ' + durStr : '') +
            '</div>';
        }

        // Badges row
        html += '<div style="display:flex;flex-wrap:wrap;gap:3px;">';
        html += '<span style="background:' + prioColor + '20;color:' + prioColor +
          ';border-radius:4px;padding:2px 6px;font-size:9px;font-weight:700;">' + prioLabel + '</span>';
        html += '<span style="background:' + cc.bg + ';color:' + cc.text +
          ';border-radius:4px;padding:2px 6px;font-size:9px;font-weight:600;">' + catIcon + ' ' + cc.label + '</span>';
        if (tk.machine) html += '<span style="background:#EFF6FF;color:#2563EB;border-radius:4px;padding:2px 5px;font-size:9px;">⚙️ ' + tk.machine + '</span>';
        if (trip) {
          const tripBadge = typeof getTripTypeBadge === 'function' ? getTripTypeBadge(trip) : '';
          html += '<span style="background:#F0FDF4;color:#15803D;border-radius:4px;padding:2px 5px;font-size:9px;">🏭 ' + trip.plant + '</span>' + (tripBadge ? ' ' + tripBadge : '');
        }
        html += '</div>';

        // Status buttons - use data attributes to avoid quote escaping
        const isPend = col.key === 'pending';
        const isInP = col.key === 'in_progress';
        const isDone = col.key === 'done';
        html += '<div class="kb-status-row" data-id="' + tk.id + '">';
        html += '<button data-st="pending"   onclick="kbSetStatus(this)" ' +
          'style="flex:1;padding:4px 2px;border:1px solid ' + (isPend ? '#6B7280' : 'var(--n200)') + ';border-radius:4px;' +
          'background:' + (isPend ? '#F3F4F6' : '#fff') + ';font-size:10px;font-weight:600;cursor:pointer;' +
          'color:' + (isPend ? '#374151' : 'var(--n400)') + ';">○ Pend</button>';
        html += '<button data-st="in_progress" onclick="kbSetStatus(this)" ' +
          'style="flex:1;padding:4px 2px;border:1px solid ' + (isInP ? '#D97706' : 'var(--n200)') + ';border-radius:4px;' +
          'background:' + (isInP ? '#FFFBEB' : '#fff') + ';font-size:10px;font-weight:600;cursor:pointer;' +
          'color:' + (isInP ? '#D97706' : 'var(--n400)') + ';">◑ Active</button>';
        html += '<button data-st="done" onclick="kbSetStatus(this)" ' +
          'style="flex:1;padding:4px 2px;border:1px solid ' + (isDone ? '#10B981' : 'var(--n200)') + ';border-radius:4px;' +
          'background:' + (isDone ? '#ECFDF5' : '#fff') + ';font-size:10px;font-weight:600;cursor:pointer;' +
          'color:' + (isDone ? '#10B981' : 'var(--n400)') + ';">● Done</button>';
        html += '</div>';

        html += '</div>'; // close kb-card
      });
    }

    html += '</div>'; // close kb-col
  });

  html += '</div>'; // close kanban-board
  body.innerHTML = html;
}


function setTaskStatus(id, status) {
  if (typeof triggerHaptic === 'function') triggerHaptic('light');
  const tk = S.tasks.find(t => t.id === id); if (!tk) return;
  tk.status = status; tk.updatedAt = new Date().toISOString();
  Store.commit('task:status');
}
async function deleteTask(id) {
  const tk = S.tasks.find(t => t.id === id);
  const title = tk ? tk.title : 'Task';
  const ok = await appConfirm(`Delete task "${title}"?`, {
    title: 'Delete Task',
    danger: true,
    confirmText: 'Delete Task',
    icon: '🗑️'
  });
  if (!ok) return;
  if (typeof triggerHaptic === 'function') triggerHaptic('warning');
  // UX-07: Snapshot state before deletion so the user can undo within 6 seconds
  if (typeof takeUndoSnapshot === 'function') takeUndoSnapshot('Task: ' + title);
  if (!S.deletedIds) S.deletedIds = {};
  S.deletedIds[id] = Date.now();
  S.tasks = S.tasks.filter(t => t.id !== id);
  sv();
  renderTasks();
  renderDash();
  renderCalendar();
  svAndSync('task_delete');
  if (typeof showUndoToast === 'function') showUndoToast(`Task "${title}" deleted`);
}
function toggleDetailCheck(taskId, checkId) {
  const tk = S.tasks.find(t => t.id === taskId);
  if (!tk || !tk.checklist) return;
  const ci = tk.checklist.find(c => c.id === checkId);
  if (ci) { ci.done = !ci.done; tk.updatedAt = new Date().toISOString(); }
  sv(); svAndSync('checklist');
}

function openTaskDetail(id) {
  const tk = S.tasks.find(t => t.id === id); if (!tk) return;
  const today = todayStr();
  const isOver = (tk.dateEnd || tk.date || tk.dateStart || '') < today && tk.status !== 'done';
  const cat = tk.category || 'work'; const cc = catConfig(cat);
  const dur = calcDuration(tk);
  const trObj = tk.tripId ? (S.trips || []).find(tr => String(tr.id) === String(tk.tripId)) : null;
  const trip = trObj ? trObj.plant : '';
  const tripBadge = (trObj && typeof getTripTypeBadge === 'function') ? getTripTypeBadge(trObj) : '';
  const dStart = tk.dateStart || tk.date || '';
  // Only use dateEnd if it's a real YYYY-MM-DD, not empty/time string
  const _dateRx = /^\d{4}-\d{2}-\d{2}$/;
  const dEnd = (tk.dateEnd && _dateRx.test(tk.dateEnd)) ? tk.dateEnd : dStart;
  // Only show times if they look like HH:MM
  const _timeRx = /^\d{2}:\d{2}/;
  const showTimeStart = tk.timeStart && _timeRx.test(tk.timeStart);
  const showTimeEnd = tk.timeEnd && _timeRx.test(tk.timeEnd);
  document.getElementById('task-detail-content').innerHTML = `
    <div class="detail-hero">
      <span class="detail-cat-badge" style="background:${cc.bg};color:${cc.text};">${cc.icon} ${cc.label}${isOver ? ' · <span style=color:var(--red)>Overdue</span>' : ''}</span>
      <div class="detail-title">${tk.title}</div>
      ${tk.desc ? `<div style="font-size:13px;color:var(--g600);line-height:1.5;">${tk.desc}</div>` : ''}
    </div>
    <div class="detail-grid" style="margin-bottom:14px;">
      <div class="dg-item"><div class="dg-label">Start</div><div class="dg-val">${fmtDate(dStart)}${showTimeStart ? ' ⏰ ' + tk.timeStart : ''}</div></div>
      <div class="dg-item"><div class="dg-label">End</div><div class="dg-val">${fmtDate(dEnd)}${showTimeEnd ? ' ⏰ ' + tk.timeEnd : ''}</div></div>
      ${dur ? `<div class="dg-item"><div class="dg-label">Duration</div><div class="dg-val">${dur}</div></div>` : ''}
      <div class="dg-item"><div class="dg-label">Priority</div><div class="dg-val">${tk.priority || '—'}</div></div>
      <div class="dg-item"><div class="dg-label">Period</div><div class="dg-val">${periodLabel(tk.period) || '—'}</div></div>
      ${tk.machine ? `<div class="dg-item"><div class="dg-label">Machine</div><div class="dg-val">${tk.machine}</div></div>` : ''}
      ${tk.plan ? `<div class="dg-item"><div class="dg-label">Plan</div><div class="dg-val">${tk.plan}</div></div>` : ''}
      ${trip ? `<div class="dg-item"><div class="dg-label">Trip</div><div class="dg-val" style="cursor:pointer;color:var(--brand);" onclick="closeModal('modal-task-detail');filterTasksByTrip('${tk.tripId}')">${trip} ${tripBadge} 🔍</div></div>` : ''}
      ${(tk.assigneeEmail || tk.assigneeName) ? `<div class="dg-item"><div class="dg-label">Assignee</div><div class="dg-val" style="color:var(--brand);font-weight:600;">👤 ${escHtml(tk.assigneeName ? tk.assigneeName + ' (' + (tk.assigneeEmail || 'No email') + ')' : tk.assigneeEmail)}</div></div>` : ''}
    </div>
    ${tk.completionNotes ? `
    <div style="margin-bottom:12px;background:var(--gl);border:1px solid rgba(0,132,61,0.25);border-radius:var(--rs);padding:10px 12px;">
      <div style="font-size:10px;font-weight:700;color:var(--brand);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">📝 TECHNICIAN COMPLETION NOTE</div>
      <div style="font-size:12.5px;color:var(--n800);line-height:1.4;">${escHtml(tk.completionNotes)}</div>
    </div>` : ''}
    ${(tk.files && tk.files.length) ? `<div style="margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;color:var(--n400);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">📎 ATTACHMENTS (${tk.files.length})</div>
      <div style="display:flex;flex-direction:column;gap:5px;">
        ${tk.files.map(f => {
    const icon = f.mimeType && f.mimeType.includes('pdf') ? '📄' : f.mimeType && f.mimeType.includes('sheet') ? '📊' : f.mimeType && f.mimeType.includes('word') ? '📝' : '📎';
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--n50);border-radius:var(--rs);border:1px solid var(--n150);">'
      + '<span style="font-size:18px;">' + icon + '</span>'
      + '<div style="flex:1;min-width:0;font-size:13px;font-weight:500;color:var(--n800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + f.fileName + '</div>'
      + (f.fileUrl ? '<a href="' + f.fileUrl + '" target="_blank" style="padding:5px 12px;border-radius:var(--rs);background:var(--brand);color:#fff;font-size:11px;font-weight:700;text-decoration:none;display:inline-block;">Open</a>' : '')
      + '</div>';
  }).join('')}
      </div>
    </div>`: ''}
    ${(tk.parts && tk.parts.length) ? `<div style="margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;color:var(--n400);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">🔩 PARTS / MATERIALS (${tk.parts.length})</div>
      <div style="background:var(--n50);border-radius:var(--rs);overflow:hidden;border:1px solid var(--n150);">
        ${tk.parts.map(p => { const sc = { ready: { bg: 'var(--brand-light)', color: 'var(--brand-dark)', label: '✅ Ready' }, on_order: { bg: 'var(--bl)', color: 'var(--bd)', label: '📦 On Order' }, notyet: { bg: 'var(--rl)', color: 'var(--rd)', label: '❌ Not Yet' } }[p.status || 'notyet']; return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--n150);"><div style="flex:1;min-width:0;">' + (p.partNo ? '<div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--brand);">' + p.partNo + '</div>' : '') + '<div style="font-size:13px;font-weight:500;color:var(--n800);">' + (p.desc || '(no description)') + '</div><div style="font-size:11px;color:var(--n500);margin-top:2px;display:flex;gap:8px;flex-wrap:wrap;">' + (p.brand ? '<span>🏷 ' + p.brand + '</span>' : '') + (p.machine ? '<span>⚙️ ' + p.machine + '</span>' : '') + '<span>Qty: ' + (p.qty || 1) + '</span></div></div><span style="background:' + sc.bg + ';color:' + sc.color + ';padding:3px 9px;border-radius:4px;font-size:10px;font-weight:700;white-space:nowrap;">' + sc.label + '</span></div>'; }).join('')}
      </div>
    </div>`: ''}
    ${tk.checklist && tk.checklist.length ? `
    <div style="font-size:11px;font-weight:600;color:var(--g500);margin-bottom:6px;">CHECKLIST (${tk.checklist.filter(c => c.done).length}/${tk.checklist.length})</div>
    <div style="background:var(--g100);border-radius:var(--rs);padding:8px 10px;margin-bottom:12px;">
      ${tk.checklist.map(ci => `<div style="display:flex;align-items:center;gap:7px;padding:4px 0;border-bottom:1px solid var(--g200);">
        <span style="width:16px;height:16px;border-radius:50%;background:${ci.done ? 'var(--green)' : 'var(--g300)'};display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;flex-shrink:0;">${ci.done ? '✓' : ''}</span>
        <span style="font-size:12px;${ci.done ? 'text-decoration:line-through;color:var(--g400);' : ''}">${ci.text}</span>
        <button onclick="toggleDetailCheck('${tk.id}','${ci.id}');openTaskDetail('${tk.id}')" style="margin-left:auto;font-size:10px;border:1px solid var(--g300);background:var(--surface);border-radius:4px;padding:2px 7px;cursor:pointer;color:var(--g600);">${ci.done ? 'Undo' : 'Done'}</button>
      </div>`).join('')}
    </div>`: ''
    }
    <div style="font-size:11px;font-weight:600;color:var(--g500);margin-bottom:8px;">STATUS</div>
    <div class="status-seg" style="display:inline-flex;margin-bottom:14px;">
      <button class="ss-btn ${tk.status === 'pending' ? 'active-p' : ''}" style="padding:8px 14px;font-size:13px;" onclick="setTaskStatus('${tk.id}','pending');openTaskDetail('${tk.id}')">○ Pending</button>
      <button class="ss-btn ${tk.status === 'in_progress' ? 'active-ip' : ''}" style="padding:8px 14px;font-size:13px;" onclick="setTaskStatus('${tk.id}','in_progress');openTaskDetail('${tk.id}')">◑ In Progress</button>
      <button class="ss-btn ${tk.status === 'done' ? 'active-d' : ''}" style="padding:8px 14px;font-size:13px;" onclick="setTaskStatus('${tk.id}','done');openTaskDetail('${tk.id}')">● Done</button>
    </div>
    ${(tk.status === 'in_progress' && (tk.assigneeEmail || tk.assigneeName)) ? `
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:var(--rs);padding:10px 12px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div style="font-size:12px;color:#92400E;line-height:1.4;">
        <strong>🔔 Technician is working on this task.</strong><br>
        Once verified completed on site, mark as Complete to finalize.
      </div>
      <button class="btn btn-sm btn-p" onclick="markTaskCompleteFromDetail('${tk.id}')" style="background:#059669;border-color:#059669;color:#fff;white-space:nowrap;font-size:11px;font-weight:700;padding:6px 12px;border-radius:14px;cursor:pointer;">✅ Mark Complete</button>
    </div>` : ''}
    ${tk.assigneeEmail ? `
    <div style="background:var(--n50);border:1px solid var(--n200);border-radius:var(--rs);padding:10px 12px;margin-bottom:14px;">
      <div style="font-size:10px;font-weight:700;color:var(--brand);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">👤 ASSIGNED COLLABORATION</div>
      <div style="font-size:12px;color:var(--n700);margin-bottom:8px;">
        Assigned to <strong>${escHtml(tk.assigneeName || 'Technician')}</strong> &lt;${escHtml(tk.assigneeEmail)}&gt;
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn btn-sm btn-o" onclick="sendTaskAssignmentEmail('${tk.id}')" style="font-size:11px;padding:5px 10px;border-radius:15px;">✉️ Resend Email</button>
        <button class="btn btn-sm btn-o" onclick="openTaskMailto('${tk.id}')" style="font-size:11px;padding:5px 10px;border-radius:15px;">📨 Mail Client</button>
        <button class="btn btn-sm btn-o" onclick="copyTaskMagicLink('${tk.id}')" style="font-size:11px;padding:5px 10px;border-radius:15px;">🔗 Copy Magic Link</button>
        <button class="btn btn-sm btn-o" onclick="openTaskWebView('${tk.id}')" style="font-size:11px;padding:5px 10px;border-radius:15px;">🌐 Open Web View</button>
      </div>
    </div>` : ''}
    <div style="display:flex;gap:8px;">
      <button class="btn btn-o" style="flex:1;" onclick="closeModal('modal-task-detail');openEditTaskModal('${tk.id}')">✏️ Edit</button>
      <button class="btn btn-d btn-sm" onclick="deleteTask('${tk.id}');closeModal('modal-task-detail')">🗑 Delete</button>
      <button class="btn btn-o btn-sm" onclick="closeModal('modal-task-detail')">Close</button>
    </div>`;
  openModal('modal-task-detail');
}

function markTaskCompleteFromDetail(id) {
  const tk = (S.tasks || []).find(t => String(t.id) === String(id));
  if (!tk) return;
  tk.status = 'done';
  tk.updatedAt = new Date().toISOString();
  if (typeof Store !== 'undefined' && Store.commit) {
    Store.commit('task:status');
  } else {
    sv();
    renderTasks();
  }
  if (typeof triggerHaptic === 'function') triggerHaptic('success');
  closeModal('modal-task-detail');
  showToast('✓ Task verified and marked Complete!');
  if (typeof svAndSync === 'function') {
    svAndSync('task_complete');
  }
}

function openTaskForDay() {
  if (!selDay) return;
  if (typeof triggerHaptic === 'function') triggerHaptic('success');
  closeModal('modal-task-detail');
  openNewTaskModal(selDay, taskCat === 'kanban' ? 'work' : taskCat === 'all' ? 'work' : taskCat);
}

// ── TASK SUB-CHECKLIST ───────────────────────────────────────
let taskCheckItems = [];  // [{id, text, done}] for current modal

function toggleTaskChecklist() {
  const body = document.getElementById('task-cl-body');
  const btn = document.getElementById('task-cl-toggle');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : '';
  btn.textContent = isOpen ? '＋ Add items' : '▲ Collapse';
  if (!isOpen) {
    renderTaskCheckTemplates();
    renderTaskCheckItems();
  }
}

function renderTaskCheckTemplates() {
  const el = document.getElementById('task-cl-templates');
  if (!el) return;
  const templates = S.templates || [];
  if (!templates.length) { el.innerHTML = '<span style="font-size:11px;color:var(--g400);">No templates yet — add in Settings</span>'; return; }
  el.innerHTML = templates.map((tmpl, i) => {
    const already = taskCheckItems.some(ci => ci.text === tmpl);
    return `<button onclick="addTemplateToTaskCheck(${i})"
      style="padding:4px 9px;border-radius:20px;font-size:11px;border:1px solid ${already ? 'var(--green)' : 'var(--g300)'};background:${already ? 'var(--gl)' : '#fff'};color:${already ? 'var(--gd)' : 'var(--g600)'};cursor:pointer;font-family:var(--font);transition:all 0.15s;"
      ${already ? 'disabled' : ''}>
      ${already ? '✓ ' : ''} ${tmpl}
    </button>`;
  }).join('');
}

function addTemplateToTaskCheck(idx) {
  const tmpl = S.templates[idx];
  if (!tmpl || taskCheckItems.some(ci => ci.text === tmpl)) return;
  taskCheckItems.push({ id: (typeof genId === 'function' ? genId('tci_') : 'tci_' + Date.now() + '_' + idx), text: tmpl, done: false });
  renderTaskCheckTemplates();
  renderTaskCheckItems();
  updateTaskCheckSummary();
}

function addTaskCheckItem() {
  const input = document.getElementById('task-cl-input');
  const text = (input.value || '').trim();
  if (!text) return;
  taskCheckItems.push({ id: (typeof genId === 'function' ? genId('tci_') : 'tci_' + Date.now()), text, done: false });
  input.value = '';
  renderTaskCheckItems();
  updateTaskCheckSummary();
}

function toggleTaskCheckDone(id) {
  const item = taskCheckItems.find(ci => ci.id === id);
  if (item) item.done = !item.done;
  renderTaskCheckItems();
  updateTaskCheckSummary();
}

function removeTaskCheckItem(id) {
  taskCheckItems = taskCheckItems.filter(ci => ci.id !== id);
  renderTaskCheckItems();
  renderTaskCheckTemplates();
  updateTaskCheckSummary();
}

function renderTaskCheckItems() {
  const el = document.getElementById('task-cl-items');
  if (!el) return;
  if (!taskCheckItems.length) { el.innerHTML = ''; return; }
  el.innerHTML = taskCheckItems.map(ci => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--g100);">
      <button onclick="toggleTaskCheckDone('${ci.id}')"
        style="width:20px;height:20px;border-radius:50%;border:1.5px solid ${ci.done ? 'var(--green)' : 'var(--g300)'};
        background:${ci.done ? 'var(--green)' : '#fff'};color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">
        ${ci.done ? '✓' : ''}
      </button>
      <span style="flex:1;font-size:13px;color:var(--g800);${ci.done ? 'text-decoration:line-through;color:var(--g400);' : ''}">
        ${ci.text}
      </span>
      <button onclick="removeTaskCheckItem('${ci.id}')"
        style="width:20px;height:20px;border-radius:50%;border:none;background:var(--g100);color:var(--g500);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;">×</button>
    </div>`).join('');
}

function updateTaskCheckSummary() {
  const el = document.getElementById('task-cl-summary');
  if (!el) return;
  if (!taskCheckItems.length) { el.textContent = ''; return; }
  const done = taskCheckItems.filter(ci => ci.done).length;
  el.textContent = `${taskCheckItems.length} items · ${done} done`;
}

function loadTaskCheckItems(items) {
  taskCheckItems = (items || []).map(ci => ({ ...ci }));
  updateTaskCheckSummary();
  // If there are items, auto-expand
  if (taskCheckItems.length) {
    const body = document.getElementById('task-cl-body');
    const btn = document.getElementById('task-cl-toggle');
    if (body) body.style.display = '';
    if (btn) btn.textContent = '▲ Collapse';
    renderTaskCheckTemplates();
    renderTaskCheckItems();
  }
}

// ═══════ PARTS / MATERIALS ═══════
let taskPartsItems = [];  // [{id, partNo, desc, brand, qty, machine, status}]

function togglePartsSection() {
  const sec = document.getElementById('task-parts-section');
  const btn = document.getElementById('task-parts-toggle-btn');
  const catEl = document.getElementById('task-cat-val'); const cat = catEl ? catEl.value : 'work';
  if (cat !== 'work') return;
  const open = sec.style.display !== 'none';
  sec.style.display = open ? 'none' : '';
  btn.textContent = open ? '🔩 Add parts / materials required' : '🔩 Hide parts section';
  btn.style.borderStyle = open ? 'dashed' : 'solid';
  btn.style.borderColor = open ? 'var(--n300)' : 'var(--brand)';
  btn.style.color = open ? 'var(--n500)' : 'var(--brand)';
  if (!open) renderPartRows();
}

function addPartRow() {
  const id = 'part_' + Date.now();
  taskPartsItems.push({ id, partNo: '', desc: '', brand: '', qty: '1', machine: '', status: 'notyet' });
  renderPartRows();
}

function removePartRow(id) {
  taskPartsItems = taskPartsItems.filter(p => p.id !== id);
  renderPartRows();
}

function updatePartField(id, field, value) {
  const p = taskPartsItems.find(p => p.id === id);
  if (p) p[field] = value;
}

function renderPartRows() {
  const container = document.getElementById('task-parts-rows');
  const empty = document.getElementById('task-parts-empty');
  if (!container) return;
  if (!taskPartsItems.length) {
    container.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  const SC = {
    ready: { bg: 'var(--brand-light)', color: 'var(--brand-dark)', label: '✅ Ready' },
    on_order: { bg: 'var(--bl)', color: 'var(--bd)', label: '📦 On Order' },
    notyet: { bg: 'var(--rl)', color: 'var(--rd)', label: '❌ Not Yet' }
  };
  container.innerHTML = taskPartsItems.map((p, idx) => {
    const sc = SC[p.status] || SC.notyet;
    const num = idx + 1;
    return `
    <div style="background:var(--surface);border:1px solid var(--n150);border-radius:var(--r);margin-bottom:10px;overflow:hidden;box-shadow:var(--sh);">
      <!-- Card header: part number + status + delete -->
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--n50);border-bottom:1px solid var(--n150);">
        <div style="background:var(--brand);color:#fff;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;flex-shrink:0;">#${num}</div>
        <input class="fi" value="${p.partNo}" placeholder="Part / Item No."
          style="flex:1;font-size:13px;font-weight:700;padding:5px 8px;font-family:var(--mono);letter-spacing:0.05em;"
          oninput="updatePartField('${p.id}','partNo',this.value)"
          title="Part number">
        <select style="border:none;border-radius:var(--rs);padding:5px 8px;font-family:var(--font);font-size:11px;font-weight:700;cursor:pointer;background:${sc.bg};color:${sc.color};flex-shrink:0;"
          onchange="updatePartField('${p.id}','status',this.value);renderPartRows()">
          <option value="notyet"   ${p.status === 'notyet' ? 'selected' : ''}>❌ Not Yet</option>
          <option value="on_order" ${p.status === 'on_order' ? 'selected' : ''}>📦 On Order</option>
          <option value="ready"    ${p.status === 'ready' ? 'selected' : ''}>✅ Ready</option>
        </select>
        <button onclick="removePartRow('${p.id}')"
          style="width:28px;height:28px;border-radius:50%;border:none;background:var(--rl);color:var(--rd);cursor:pointer;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">×</button>
      </div>
      <!-- Card body: all fields in 2-column grid -->
      <div style="padding:10px 12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="grid-column:1/-1;">
          <div style="font-size:10px;font-weight:700;color:var(--n400);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:3px;">Description *</div>
          <input class="fi" value="${p.desc}" placeholder="Part description / name"
            style="font-size:13px;padding:7px 10px;"
            oninput="updatePartField('${p.id}','desc',this.value)">
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--n400);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:3px;">Brand / Mfr.</div>
          <input class="fi" value="${p.brand}" placeholder="e.g. Fisher, Emerson"
            style="font-size:13px;padding:7px 10px;"
            oninput="updatePartField('${p.id}','brand',this.value)">
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--n400);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:3px;">Quantity</div>
          <input class="fi" type="number" value="${p.qty || 1}" min="1"
            style="font-size:13px;padding:7px 10px;"
            oninput="updatePartField('${p.id}','qty',this.value)">
        </div>
        <div style="grid-column:1/-1;">
          <div style="font-size:10px;font-weight:700;color:var(--n400);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:3px;">Machine / Assembly</div>
          <input class="fi" value="${p.machine}" placeholder="e.g. Pressco FCV-301, Pump A"
            style="font-size:13px;padding:7px 10px;"
            oninput="updatePartField('${p.id}','machine',this.value)">
        </div>
      </div>
    </div>`;
  }).join('');
}

function resetPartRows() {
  taskPartsItems = [];
  renderPartRows();
  const sec = document.getElementById('task-parts-section');
  const btn = document.getElementById('task-parts-toggle-btn');
  if (sec) sec.style.display = 'none';
  if (btn) { btn.textContent = '🔩 Add parts / materials required'; btn.style.borderStyle = 'dashed'; btn.style.borderColor = 'var(--n300)'; btn.style.color = 'var(--n500)'; }
}

function loadPartRows(parts) {
  taskPartsItems = (parts || []).map(p => ({ ...p, id: p.id || 'part_' + Date.now() + '_' + Math.random() }));
  if (taskPartsItems.length) {
    const sec = document.getElementById('task-parts-section');
    const btn = document.getElementById('task-parts-toggle-btn');
    if (sec) sec.style.display = '';
    if (btn) { btn.textContent = '🔩 Hide parts section'; btn.style.borderStyle = 'solid'; btn.style.borderColor = 'var(--brand)'; btn.style.color = 'var(--brand)'; }
  }
  renderPartRows();
}

function resetTaskFlightFields() {
  ['fl-depart-num', 'fl-depart-airline', 'fl-depart-from', 'fl-depart-to', 'fl-depart-date', 'fl-depart-time', 'fl-arrive-time', 'fl-depart-terminal', 'fl-return-num', 'fl-return-airline', 'fl-return-from', 'fl-return-to', 'fl-return-date', 'fl-return-time', 'fl-return-arrive', 'fl-return-terminal', 'fl-pnr'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  const hasRet = document.getElementById('fl-has-return'); if (hasRet) hasRet.checked = false;
  const retSec = document.getElementById('fl-return-section'); if (retSec) retSec.style.display = 'none';
  const flSec = document.getElementById('task-flight-section'); if (flSec) flSec.style.display = 'none';
}
function loadTaskFlightFields(f) {
  if (!f) return;
  const flds = ['fl-depart-num', 'fl-depart-airline', 'fl-depart-from', 'fl-depart-to', 'fl-depart-date', 'fl-depart-time', 'fl-arrive-time', 'fl-depart-terminal', 'fl-return-num', 'fl-return-airline', 'fl-return-from', 'fl-return-to', 'fl-return-date', 'fl-return-time', 'fl-return-arrive', 'fl-return-terminal', 'fl-pnr'];
  const keys = ['depart_num', 'depart_airline', 'depart_from', 'depart_to', 'depart_date', 'depart_time', 'arrive_time', 'depart_terminal', 'return_num', 'return_airline', 'return_from', 'return_to', 'return_date', 'return_time', 'return_arrive', 'return_terminal', 'pnr'];
  flds.forEach((id, i) => { const e = document.getElementById(id); if (e) e.value = f[keys[i]] || ''; });
  const hasReturn = !!(f.return_num || f.return_from);
  const hasRet = document.getElementById('fl-has-return'); if (hasRet) hasRet.checked = hasReturn;
  const retSec = document.getElementById('fl-return-section'); if (retSec) retSec.style.display = hasReturn ? '' : 'none';
  const flSec = document.getElementById('task-flight-section'); if (flSec) flSec.style.display = '';
}
function getTaskFlightFields() {
  const flds = ['fl-depart-num', 'fl-depart-airline', 'fl-depart-from', 'fl-depart-to', 'fl-depart-date', 'fl-depart-time', 'fl-arrive-time', 'fl-depart-terminal', 'fl-return-num', 'fl-return-airline', 'fl-return-from', 'fl-return-to', 'fl-return-date', 'fl-return-time', 'fl-return-arrive', 'fl-return-terminal', 'fl-pnr'];
  const keys = ['depart_num', 'depart_airline', 'depart_from', 'depart_to', 'depart_date', 'depart_time', 'arrive_time', 'depart_terminal', 'return_num', 'return_airline', 'return_from', 'return_to', 'return_date', 'return_time', 'return_arrive', 'return_terminal', 'pnr'];
  const o = {}; flds.forEach((id, i) => { const e = document.getElementById(id); o[keys[i]] = e ? e.value : ''; }); return o;
}
function resetTaskCheckItems() {
  taskCheckItems = [];
  const body = document.getElementById('task-cl-body');
  const btn = document.getElementById('task-cl-toggle');
  if (body) body.style.display = 'none';
  if (btn) btn.textContent = '＋ Add items';
  const itemsEl = document.getElementById('task-cl-items');
  if (itemsEl) itemsEl.innerHTML = '';
  const sumEl = document.getElementById('task-cl-summary');
  if (sumEl) sumEl.textContent = '';
}




// ═══════ TASK FILE ATTACHMENTS ═══════
let taskFileItems = []; // {fileId, fileName, fileUrl, mimeType} — loaded for current modal

function pickTaskFile() {
  const input = document.getElementById('task-file-input');
  if (input) input.click();
}

function renderTaskFilesList() {
  const list = document.getElementById('task-files-list');
  const empty = document.getElementById('task-files-empty');
  if (!list) return;
  if (!taskFileItems.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  const iconFor = (mime) => {
    if (!mime) return '📎';
    if (mime.includes('pdf')) return '📄';
    if (mime.includes('word') || mime.includes('document')) return '📝';
    if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return '📊';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return '📑';
    if (mime.includes('image')) return '🖼️';
    if (mime.includes('text')) return '📃';
    return '📎';
  };
  list.innerHTML = taskFileItems.map((f, i) => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;
                background:var(--n50);border-radius:var(--rs);border:1px solid var(--n150);margin-bottom:5px;">
      <span style="font-size:20px;flex-shrink:0;">${iconFor(f.mimeType)}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;color:var(--n800);
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.fileName}</div>
        <div style="font-size:10px;color:${f.fileId ? 'var(--brand)' : 'var(--amber)'};">
          ${f.fileId ? '✓ Saved to Google Drive' : '⚠ Local only — no Drive URL'}
        </div>
      </div>
      ${f.fileUrl ? `<button onclick="window.open('${f.fileUrl}','_blank')"
        style="flex-shrink:0;padding:5px 10px;border:1px solid var(--brand);border-radius:var(--rs);
               background:var(--brand-light);color:var(--brand-dark);font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);">
        Open</button>` : ''}
      <button onclick="removeTaskFile(${i})"
        style="flex-shrink:0;width:26px;height:26px;border-radius:50%;border:none;
               background:var(--rl);color:var(--rd);cursor:pointer;font-size:14px;font-weight:700;">×</button>
    </div>`).join('');
}

function removeTaskFile(idx) {
  taskFileItems.splice(idx, 1);
  renderTaskFilesList();
}

async function handleTaskFiles(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  const url = getGSUrl();
  const canUpload = url && url.includes('/exec');

  const uploading = document.getElementById('task-file-uploading');
  const btn = document.getElementById('task-file-btn');
  if (uploading) uploading.style.display = '';
  if (btn) btn.disabled = true;

  const taskId = editingTaskId || (typeof genId === 'function' ? genId('task_') : ('task_' + Date.now()));

  for (const file of files) {
    try {
      if (file.size > 10 * 1024 * 1024) {
        showToast('File too large (max 10MB): ' + file.name);
        continue;
      }
      if (canUpload) {
        showToast('Uploading ' + file.name + '…');
        const base64 = await fileToBase64(file);
        const payload = JSON.stringify({
          action: 'uploadFile',
          taskId: taskId,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          dataBase64: base64
        });
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: payload
        });
        let data;
        try { data = await resp.json(); }
        catch (e) { data = { ok: false, error: 'Invalid response' }; }
        if (data && data.ok) {
          taskFileItems.push({
            fileId: data.fileId,
            fileName: data.fileName,
            fileUrl: data.fileUrl,
            mimeType: data.mimeType || file.type
          });
          showToast('✓ ' + file.name + ' saved to Drive');
        } else {
          taskFileItems.push({ fileId: '', fileName: file.name, fileUrl: '', mimeType: file.type });
          const errMsg = data ? (data.error || JSON.stringify(data)) : 'No response from server';
          showToast('⚠ ' + file.name + ' failed: ' + errMsg.substring(0, 80));
          console.error('Upload error:', errMsg, 'Response:', data);
        }
      } else {
        // No GS URL — save file reference locally only
        taskFileItems.push({ fileId: '', fileName: file.name, fileUrl: '', mimeType: file.type || '' });
        showToast('📎 ' + file.name + ' added (set GS URL to upload to Drive)');
      }
    } catch (err) {
      taskFileItems.push({ fileId: '', fileName: file.name, fileUrl: '', mimeType: file.type || '' });
      showToast('⚠ Upload error — file saved locally: ' + (err.message || ''));
    }
  }

  if (uploading) uploading.style.display = 'none';
  if (btn) btn.disabled = false;
  e.target.value = '';
  renderTaskFilesList();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result.split(',')[1]);
    r.onerror = () => reject(new Error('File read failed'));
    r.readAsDataURL(file);
  });
}

function resetTaskFileItems() {
  taskFileItems = [];
  renderTaskFilesList();
  const empty = document.getElementById('task-files-empty');
  if (empty) empty.style.display = '';
}

function loadTaskFileItems(files) {
  taskFileItems = (files || []).map(f => ({ ...f }));
  renderTaskFilesList();
}

// ═══════ PARTS EXPORT (Excel + PDF) ═══════

function _collectAllParts() {
  return S.tasks
    .filter(tk => tk.parts && tk.parts.length)
    .sort((a, b) => (b.dateStart || b.date || '').localeCompare(a.dateStart || a.date || ''))
    .flatMap(tk =>
      (tk.parts || []).map(p => {
        const trip = tk.tripId ? S.trips.find(t => t.id === tk.tripId) : null;
        return {
          task: tk.title,
          date: fmtDate(tk.dateStart || tk.date || ''),
          trip: trip ? trip.plant : '—',
          partNo: p.partNo || '',
          desc: p.desc || '',
          brand: p.brand || '',
          qty: p.qty || 1,
          machine: p.machine || '',
          status: { ready: 'Ready', on_order: 'On Order', notyet: 'Not Yet' }[p.status || 'notyet'] || 'Not Yet'
        };
      })
    );
}

// ── Export to Excel (CSV that opens in Excel) ──────────
function exportPartsExcel() {
  const parts = _collectAllParts();
  if (!parts.length) { showToast('No parts data found'); return; }

  const headers = ['No.', 'Task', 'Date', 'Trip', 'Part No.', 'Description', 'Brand', 'Qty', 'Machine/Assembly', 'Status'];
  const rows = parts.map((p, i) => [
    i + 1, p.task, p.date, p.trip, p.partNo, p.desc, p.brand, p.qty, p.machine, p.status
  ]);

  // Build CSV with BOM for Excel UTF-8
  const esc = v => `"${String(v).replace(/"/g, '""')}"`;
  let csv = '\uFEFF'; // BOM
  csv += headers.map(esc).join(',') + '\r\n';
  rows.forEach(r => { csv += r.map(esc).join(',') + '\r\n'; });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PlantLog_Parts_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('Parts list downloaded (Excel CSV) ✓');
}

// ── Export to PDF ──────────────────────────────────────
function exportPartsPDF() {
  if (typeof window.jspdf === 'undefined') { showToast('PDF loading…'); setTimeout(exportPartsPDF, 1500); return; }
  const { jsPDF } = window.jspdf;
  const parts = _collectAllParts();
  if (!parts.length) { showToast('No parts data found'); return; }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  if (typeof attachPdfTextNormalizer === 'function') attachPdfTextNormalizer(doc);
  const W = 297, mg = 12;
  const p = S.profile;
  let y = 20;

  // Header
  doc.setFillColor(10, 122, 58); doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('Parts & Materials Report', mg, 12);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`${p.name || 'Engineer'}${p.company ? ' · ' + p.company : ''}  ·  ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, mg, 19);
  doc.text(`Total: ${parts.length} part${parts.length !== 1 ? 's' : ''}`, mg, 24);
  y = 34;

  // Status summary bar
  const ready = parts.filter(p => p.status === 'Ready').length;
  const onOrder = parts.filter(p => p.status === 'On Order').length;
  const notYet = parts.filter(p => p.status === 'Not Yet').length;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.setTextColor(10, 122, 58); doc.text(`Ready: ${ready}`, mg, y);
  doc.setTextColor(27, 95, 180); doc.text(`On Order: ${onOrder}`, mg + 40, y);
  doc.setTextColor(192, 57, 43); doc.text(`Not Yet: ${notYet}`, mg + 90, y);
  doc.setTextColor(33, 37, 41); y += 6;

  // Table headers
  const cols = [
    { label: '#', w: 8, key: '_n' },
    { label: 'Task', w: 48, key: 'task' },
    { label: 'Date', w: 22, key: 'date' },
    { label: 'Trip', w: 22, key: 'trip' },
    { label: 'Part No.', w: 28, key: 'partNo' },
    { label: 'Description', w: 52, key: 'desc' },
    { label: 'Brand', w: 24, key: 'brand' },
    { label: 'Qty', w: 12, key: 'qty' },
    { label: 'Machine', w: 38, key: 'machine' },
    { label: 'Status', w: 22, key: 'status' },
  ];
  const ROW_H = 7;

  const drawHeader = () => {
    doc.setFillColor(241, 243, 245);
    doc.rect(mg, y - 4, W - mg * 2, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    let x = mg;
    cols.forEach(c => { doc.text(c.label, x + 1, y); x += c.w; });
    doc.setDrawColor(200, 200, 200); doc.line(mg, y + 2, W - mg, y + 2);
    y += 6;
  };

  drawHeader();

  const statusColor = {
    'Ready': [10, 122, 58],
    'On Order': [27, 95, 180],
    'Not Yet': [192, 57, 43]
  };

  parts.forEach((p, i) => {
    if (y > 185) { doc.addPage(); y = 16; drawHeader(); }
    const row = { ...p, _n: i + 1 };
    if (i % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(mg, y - 4, W - mg * 2, ROW_H, 'F'); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(33, 37, 41);
    let x = mg;
    cols.forEach(c => {
      const val = String(row[c.key] || '');
      if (c.key === 'status') {
        const sc = statusColor[val] || [120, 120, 120];
        doc.setTextColor(...sc); doc.setFont('helvetica', 'bold');
      }
      const truncated = doc.splitTextToSize(val, c.w - 2)[0] || '';
      doc.text(truncated, x + 1, y);
      if (c.key === 'status') { doc.setTextColor(33, 37, 41); doc.setFont('helvetica', 'normal'); }
      x += c.w;
    });
    doc.setDrawColor(235, 235, 235); doc.line(mg, y + 2, W - mg, y + 2);
    y += ROW_H;
  });

  // Footer
  doc.setFontSize(7); doc.setTextColor(150, 150, 150);
  doc.text(`PlantLog Pro · Parts Report · ${new Date().toLocaleDateString('en-GB')}`, mg, 200);

  doc.save(`PlantLog_Parts_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pdf`);
  showToast('Parts PDF downloaded ✓');
}


// Kanban helper: set status from button click (avoids quote escaping)
function kbSetStatus(btn) {
  event.stopPropagation();
  const row = btn.closest('[data-id]');
  if (!row) return;
  const id = row.getAttribute('data-id');
  const st = btn.getAttribute('data-st');
  if (id && st) setTaskStatus(id, st);
}

// ═══════ TASK ASSIGNMENT & EMAIL NOTIFICATION (IMP-61) ═══════
function populateAssigneeDatalist() {
  const dl = document.getElementById('task-assignee-history');
  if (!dl) return;
  const seen = new Set();
  const opts = [];
  (S.tasks || []).forEach(tk => {
    const email = (tk.assigneeEmail || tk.assignee_email || '').trim();
    if (email && !seen.has(email.toLowerCase())) {
      seen.add(email.toLowerCase());
      const name = (tk.assigneeName || tk.assignee_name || '').trim();
      opts.push(`<option value="${escHtml(email)}">${name ? escHtml(name) : escHtml(email)}</option>`);
    }
  });
  dl.innerHTML = opts.join('');
}

function onTaskAssigneeEmailChange() {
  const emailEl = document.getElementById('task-assignee-email');
  const sendBtn = document.getElementById('task-send-email-btn');
  const mailtoBtn = document.getElementById('task-mailto-btn');
  const toggleLbl = document.getElementById('task-send-email-toggle-lbl');
  const nameEl = document.getElementById('task-assignee-name');
  if (!emailEl) return;
  const email = emailEl.value.trim();
  const hasEmail = email.includes('@');
  if (sendBtn) sendBtn.style.display = hasEmail ? 'inline-flex' : 'none';
  if (mailtoBtn) mailtoBtn.style.display = hasEmail ? 'inline-flex' : 'none';
  if (toggleLbl) toggleLbl.style.display = hasEmail ? 'inline-flex' : 'none';

  // Auto-fill name if known from past tasks
  if (hasEmail && nameEl && !nameEl.value.trim()) {
    const prev = (S.tasks || []).find(t => (t.assigneeEmail || '').toLowerCase() === email.toLowerCase() && t.assigneeName);
    if (prev) nameEl.value = prev.assigneeName;
  }
}

function getTaskMagicLink(task) {
  if (!task || !task.id) return '';
  const gsUrl = (typeof getGSUrl === 'function') ? getGSUrl() : (S.gsUrl || localStorage.getItem('plantlog_gs_url') || '');
  if (!gsUrl) return '';
  const cleanUrl = gsUrl.split('?')[0];
  let token = '';
  try {
    token = btoa('PL_TASK:' + String(task.id)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  } catch (e) {
    token = encodeURIComponent(String(task.id));
  }
  return cleanUrl + '?action=taskView&id=' + encodeURIComponent(task.id) + '&token=' + encodeURIComponent(token);
}

function buildTaskAssignmentEmailContent(task) {
  if (!task) return null;
  const plantObj = task.tripId ? (S.trips || []).find(t => String(t.id) === String(task.tripId)) : null;
  const plantName = plantObj ? (plantObj.plant + (plantObj.location ? ' - ' + plantObj.location : '')) : 'General Field Service';
  const tripTitle = plantObj ? plantObj.plant : '';
  const dateRange = (task.dateStart && task.dateEnd && task.dateStart !== task.dateEnd)
    ? (task.dateStart + ' to ' + task.dateEnd)
    : (task.dateStart || task.date || 'TBD');
  const timeRange = task.timeStart ? (task.timeStart + (task.timeEnd ? ' - ' + task.timeEnd : '')) : '';
  const dur = calcDuration(task);
  const prioUpper = (task.priority || 'MEDIUM').toUpperCase();
  const catUpper = (task.category || 'WORK').toUpperCase();
  const sender = (S.user && S.user.name) || (S.company && S.company.name) || 'Lead Service Engineer';
  const senderContact = (S.user && (S.user.phone || S.user.email)) || '';
  const magicLink = getTaskMagicLink(task);

  const subject = `[PlantLog Pro] Task Assignment: ${task.title} — ${tripTitle || plantName}`;

  // Plain text body for mailto and non-HTML mail clients
  let textBody = `=== PLANTLOG PRO · FIELD TASK ASSIGNMENT ===\n\n`;
  textBody += `Dear ${task.assigneeName || 'Colleague'},\n\n`;
  textBody += `You have been assigned a task on PlantLog Pro:\n\n`;
  textBody += `• Title: ${task.title}\n`;
  textBody += `• Priority: [${prioUpper}] · Category: [${catUpper}] · Status: [${(task.status || 'pending').toUpperCase()}]\n`;
  textBody += `• Plant / Location: ${plantName}\n`;
  if (task.machine) textBody += `• Machine / Equipment Tag: ${task.machine}\n`;
  if (task.plan) textBody += `• Plan / Work Order: ${task.plan}\n`;
  textBody += `• Schedule: ${dateRange}${timeRange ? ' (' + timeRange + ')' : ''}${dur ? ' · Duration: ' + dur : ''}\n\n`;

  if (task.desc) {
    textBody += `DESCRIPTION / SCOPE OF WORK:\n${task.desc}\n\n`;
  }

  if (task.checklist && task.checklist.length) {
    const doneCount = task.checklist.filter(c => c.done).length;
    textBody += `SUB-CHECKLIST (${doneCount}/${task.checklist.length} done):\n`;
    task.checklist.forEach((c, idx) => {
      textBody += `  [${c.done ? 'X' : ' '}] ${idx + 1}. ${c.text || c.name}\n`;
    });
    textBody += `\n`;
  }

  if (task.parts && task.parts.length) {
    textBody += `REQUIRED PARTS / MATERIALS:\n`;
    task.parts.forEach((p, idx) => {
      textBody += `  • Part #${p.partNo || idx + 1}: ${p.desc || ''} (Qty: ${p.qty || 1})\n`;
    });
    textBody += `\n`;
  }

  if (magicLink) {
    textBody += `----------------------------------------\n`;
    textBody += `👉 INTERACTIVE ONLINE UPDATE (No app installation required):\n`;
    textBody += `${magicLink}\n`;
    textBody += `(Tap link to complete checklist & update progress)\n`;
    textBody += `----------------------------------------\n\n`;
  }

  textBody += `Assigned by: ${sender}${senderContact ? ' (' + senderContact + ')' : ''}\n`;
  textBody += `PlantLog Pro Industrial Mobile System`;

  // HTML Body for Google Apps Script MailApp / Gmail
  const prioColor = task.priority === 'high' ? '#DC2626' : task.priority === 'low' ? '#2563EB' : '#D97706';
  let htmlChecklist = '';
  if (task.checklist && task.checklist.length) {
    const doneCount = task.checklist.filter(c => c.done).length;
    htmlChecklist = `<div style="margin-top:16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 14px;">
      <div style="font-size:11px;font-weight:700;color:#64748B;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">Sub-Checklist (${doneCount}/${task.checklist.length})</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#1E293B;">
        ${task.checklist.map((c, i) => `
          <tr style="border-bottom:1px solid #EDF2F7;">
            <td style="padding:6px 4px;width:24px;vertical-align:top;font-size:14px;">${c.done ? '✅' : '⬜'}</td>
            <td style="padding:6px 4px;${c.done ? 'text-decoration:line-through;color:#94A3B8;' : ''}"><strong>${i + 1}.</strong> ${escHtml(c.text || c.name)}</td>
          </tr>
        `).join('')}
      </table>
    </div>`;
  }

  let htmlParts = '';
  if (task.parts && task.parts.length) {
    htmlParts = `<div style="margin-top:14px;background:#F1F5F9;border-radius:8px;padding:10px 14px;">
      <div style="font-size:11px;font-weight:700;color:#475569;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">🔩 Parts / Materials</div>
      <div style="font-size:12.5px;color:#334155;">
        ${task.parts.map(p => `• <strong>${escHtml(p.partNo || '')}</strong> ${escHtml(p.desc || '')} (Qty: ${p.qty || 1})`).join('<br>')}
      </div>
    </div>`;
  }

  const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);border:1px solid #E2E8F0;">
    <div style="background:linear-gradient(135deg,#00843D 0%,#005A29 100%);padding:20px 24px;color:#FFFFFF;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#86EFAC;">PLANTLOG PRO · FIELD TASK</span>
        <span style="background:${prioColor};color:#FFFFFF;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">${prioUpper}</span>
      </div>
      <h2 style="margin:10px 0 4px;font-size:20px;font-weight:700;color:#FFFFFF;line-height:1.3;">${escHtml(task.title)}</h2>
      <div style="font-size:13px;color:#DCFCE7;">🏭 ${escHtml(plantName)}</div>
    </div>
    <div style="padding:20px 24px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr>
          <td style="padding:6px 0;width:50%;font-size:12.5px;color:#64748B;">📅 Schedule: <strong style="color:#0F172A;">${dateRange}</strong></td>
          <td style="padding:6px 0;width:50%;font-size:12.5px;color:#64748B;">⏰ Time: <strong style="color:#0F172A;">${timeRange || '—'}</strong></td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12.5px;color:#64748B;">🔩 Machine Tag: <strong style="color:#0F172A;">${escHtml(task.machine || '—')}</strong></td>
          <td style="padding:6px 0;font-size:12.5px;color:#64748B;">📁 Plan / Ref: <strong style="color:#0F172A;">${escHtml(task.plan || '—')}</strong></td>
        </tr>
      </table>
      ${task.desc ? `
      <div style="background:#F8FAFC;border-left:3px solid #00843D;padding:12px 14px;border-radius:0 8px 8px 0;margin-bottom:16px;">
        <div style="font-size:11px;font-weight:700;color:#64748B;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">Description</div>
        <div style="font-size:13.5px;color:#1E293B;line-height:1.5;">${escHtml(task.desc).replace(/\n/g, '<br>')}</div>
      </div>` : ''}
      ${htmlChecklist}
      ${htmlParts}
      ${magicLink ? `
      <div style="margin-top:24px;text-align:center;">
        <a href="${magicLink}" target="_blank" style="display:inline-block;background:#00843D;color:#FFFFFF;text-decoration:none;padding:14px 28px;border-radius:24px;font-size:14.5px;font-weight:700;box-shadow:0 3px 10px rgba(0,132,61,0.35);letter-spacing:0.02em;">
          👉 Open &amp; Update Task Progress (Online Form)
        </a>
        <div style="font-size:12px;color:#64748B;margin-top:10px;">Direct link: <a href="${magicLink}" target="_blank" style="color:#00843D;font-weight:600;text-decoration:underline;">${escHtml(magicLink)}</a></div>
      </div>` : ''}
    </div>
    <div style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:14px 24px;font-size:12px;color:#64748B;">
      <div>Assigned by: <strong style="color:#1E293B;">${escHtml(sender)}</strong> ${senderContact ? '· ' + escHtml(senderContact) : ''}</div>
      <div style="margin-top:3px;font-size:11px;color:#94A3B8;">PlantLog Pro Industrial Management System</div>
    </div>
  </div>
</body>
</html>`;

  return { subject, textBody, htmlBody, magicLink };
}

function resolveTaskObj(taskIdOrTask) {
  if (!taskIdOrTask) return null;
  if (typeof taskIdOrTask === 'object') return taskIdOrTask;
  return (S.tasks || []).find(t => String(t.id) === String(taskIdOrTask)) || null;
}

function openTaskMailto(taskIdOrTask) {
  const task = resolveTaskObj(taskIdOrTask);
  if (!task) { showToast('Task not found'); return; }
  const email = (task.assigneeEmail || '').trim();
  if (!email || !email.includes('@')) {
    showToast('Please specify a valid Assignee Email first');
    return;
  }

  const content = buildTaskAssignmentEmailContent(task);
  if (!content) return;
  const mailtoUri = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(content.subject)}&body=${encodeURIComponent(content.textBody)}`;
  window.location.href = mailtoUri;
  showToast('Opened in email client ✓');
}

function openTaskMailtoFromModal() {
  const tempTask = getTempTaskFromModal();
  if (!tempTask) return;
  openTaskMailto(tempTask);
}

function getTempTaskFromModal() {
  const title = (document.getElementById('task-title') || {}).value || 'Task';
  const email = ((document.getElementById('task-assignee-email') || {}).value || '').trim();
  if (!email || !email.includes('@')) {
    showToast('Please enter a valid Assignee Email');
    return null;
  }
  return {
    id: editingTaskId || ('temp_' + Date.now()),
    title: title.trim(),
    desc: (document.getElementById('task-desc') || {}).value || '',
    category: getSelectedCat(),
    dateStart: (document.getElementById('task-date-start') || {}).value || todayStr(),
    timeStart: (document.getElementById('task-time-start') || {}).value || '',
    dateEnd: (document.getElementById('task-date-end') || {}).value || '',
    timeEnd: (document.getElementById('task-time-end') || {}).value || '',
    priority: (document.getElementById('task-priority') || {}).value || 'medium',
    period: (document.getElementById('task-period') || {}).value || 'weekly',
    machine: (document.getElementById('task-machine') || {}).value || '',
    plan: (document.getElementById('task-plan') || {}).value || '',
    tripId: (document.getElementById('task-trip') || {}).value || '',
    status: editingTaskId ? ((S.tasks || []).find(t => t.id === editingTaskId) || {}).status || 'pending' : 'pending',
    assigneeName: ((document.getElementById('task-assignee-name') || {}).value || '').trim(),
    assigneeEmail: email,
    checklist: [...taskCheckItems],
    parts: [...taskPartsItems],
    createdAt: editingTaskId ? ((S.tasks || []).find(t => t.id === editingTaskId) || {}).createdAt || new Date().toISOString() : new Date().toISOString()
  };
}

async function sendTaskAssignmentEmail(taskIdOrTask) {
  const task = resolveTaskObj(taskIdOrTask);
  if (!task) { showToast('Task not found'); return; }
  const email = (task.assigneeEmail || '').trim();
  if (!email || !email.includes('@')) {
    showToast('Please specify a valid Assignee Email first');
    return;
  }

  const gasUrl = (typeof getGSUrl === 'function') ? getGSUrl() : (S.gsUrl || localStorage.getItem('plantlog_gs_url') || '');
  const apiKey = (typeof getGSApiKey === 'function') ? getGSApiKey() : (S.gsApiKey || S.apiKey || localStorage.getItem('plantlog_gs_api_key') || localStorage.getItem('plantlog_api_key') || '');

  if (!navigator.onLine || !gasUrl) {
    showToast('Offline or Google Sheets not connected. Opening email client...');
    setTimeout(() => { openTaskMailto(task); }, 250);
    return;
  }

  showToast('Sending task assignment email...');
  try {
    const payload = {
      action: 'assignTaskEmail',
      apiKey: apiKey,
      secret: apiKey,
      gasUrl: gasUrl,
      task: task,
      assigneeEmail: email,
      assigneeName: task.assigneeName || '',
      senderName: (S.user && S.user.name) || (S.company && S.company.name) || 'Lead Service Engineer'
    };

    let data = null;
    if (typeof gsPost === 'function') {
      data = await gsPost(gasUrl, payload);
    } else {
      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      data = await res.json();
    }

    if (data && data.ok) {
      showToast(`Email dispatched directly to ${email} ✓`);
    } else {
      // Seamless fallback to user's email client if backend MailApp is not configured or pending deployment
      showToast('Opening email client to dispatch assignment...');
      setTimeout(() => { openTaskMailto(task); }, 350);
    }
  } catch (err) {
    // Seamless fallback to user's email client
    showToast('Opening email client to dispatch assignment...');
    setTimeout(() => { openTaskMailto(task); }, 350);
  }
}

function sendTaskAssignmentEmailFromModal() {
  const tempTask = getTempTaskFromModal();
  if (!tempTask) return;
  sendTaskAssignmentEmail(tempTask);
}

function copyTaskMagicLink(taskId) {
  const task = resolveTaskObj(taskId);
  if (!task) { showToast('Task not found'); return; }
  const link = getTaskMagicLink(task);
  if (!link) {
    showToast('Google Apps Script URL is not configured yet');
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(() => {
      showToast('Action link copied to clipboard ✓');
    }).catch(() => {
      prompt('Copy this Action Link:', link);
    });
  } else {
    prompt('Copy this Action Link:', link);
  }
}

function openTaskWebView(taskId) {
  const task = resolveTaskObj(taskId);
  if (!task) { showToast('Task not found'); return; }
  const link = getTaskMagicLink(task);
  if (!link) {
    showToast('Google Apps Script URL is not configured yet');
    return;
  }
  window.open(link, '_blank');
}
