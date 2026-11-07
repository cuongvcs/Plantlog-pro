'use strict';
// =====================================================
// PlantLog — bills.js
// Expense bills, bills screen, bills PDF export
// =====================================================

// ═══════ BILLS HELPERS ═══════

// Smart amount formatter: VND = no decimals, others = up to 2 decimals
function fmtAmt(val, currency) {
  const v = parseFloat(val) || 0;
  const cur = (currency || 'VND').toUpperCase();
  // VND is always whole numbers
  if (cur === 'VND') return v.toLocaleString(undefined, {maximumFractionDigits: 0});
  // Other currencies: show decimals only if they exist
  const hasDec = (v % 1) !== 0;
  return v.toLocaleString(undefined, {
    minimumFractionDigits: hasDec ? 2 : 0,
    maximumFractionDigits: 2
  });
}

function getPaymentStyle(pm) {
  const val = pm || '1-Cash';
  if (val.includes('Bank')) {
    return { icon: '🏦', val, bg: '#DBEAFE', color: '#1E40AF', border: '#2563EB', badgeHtml: `<span style="background:#DBEAFE;color:#1E40AF;border:1px solid #93C5FD;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:600;">🏦 2-Bank transfer</span>` };
  }
  if (val.includes('Credit') || val.includes('Card')) {
    return { icon: '💳', val, bg: '#EDE9FE', color: '#5B21B6', border: '#7C3AED', badgeHtml: `<span style="background:#EDE9FE;color:#5B21B6;border:1px solid #C4B5FD;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:600;">💳 3-Credit card</span>` };
  }
  return { icon: '💵', val, bg: '#DCFCE7', color: '#166534', border: '#059669', badgeHtml: `<span style="background:#DCFCE7;color:#166534;border:1px solid #86EFAC;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:600;">💵 1-Cash</span>` };
}

function toggleVNDRow(){
  const cur=document.getElementById('bill-currency');
  const row=document.getElementById('bill-vnd-row');
  if(row)row.style.display=(cur&&cur.value!=='VND')?'':'none';
  if(cur&&cur.value==='VND'){
    const v=document.getElementById('bill-vnd');if(v)v.value='';
  }
  updateVNDHint();
}
function updateVNDHint(){
  const hint=document.getElementById('bill-vnd-hint');
  if(!hint)return;
  const amt=parseFloat(document.getElementById('bill-amount').value)||0;
  const cur=document.getElementById('bill-currency');
  const vnd=parseFloat(document.getElementById('bill-vnd').value)||0;
  if(amt&&vnd&&cur&&cur.value!=='VND'){
    const rate=Math.round(vnd/amt);
    hint.textContent=`≈ ${rate.toLocaleString()} VND per 1 ${cur.value}`;
  } else {
    hint.textContent='';
  }
}

// ═══════ BILLS SCREEN ═══════
let billFilter = 'all';

function populateBillSelectors(){
  // Trip selector
  const tripSel = document.getElementById('bf-trip-select');
  if(tripSel){
    const trips = [...(S.trips||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const cur = tripSel.value;
    tripSel.innerHTML = '<option value="">— All Trips —</option>' +
      trips.map(t=>`<option value="${t.id}" ${t.id===cur?'selected':''}>${t.plant} (${fmtDate(t.date)})</option>`).join('');
  }
  // Year selector
  updateBillYearOptions();
}

function updateBillYearOptions(){
  const yearSel = document.getElementById('bf-year-select');
  if(!yearSel) return;
  const years = [...new Set((S.bills||[]).map(b=>(b.date||'').slice(0,4)).filter(Boolean))].sort().reverse();
  const now = new Date().getFullYear().toString();
  if(!years.includes(now)) years.unshift(now);
  const cur = yearSel.value || now;
  yearSel.innerHTML = years.map(y=>`<option value="${y}" ${y===cur?'selected':''}>${y}</option>`).join('');
  updateBillMonthOptions();
}

function updateBillMonthOptions(){
  const yearSel  = document.getElementById('bf-year-select');
  const monthSel = document.getElementById('bf-month-select');
  if(!monthSel) return;
  const year = (yearSel && yearSel.value) || new Date().getFullYear().toString();
  const months = [
    ['01','January'],['02','February'],['03','March'],['04','April'],
    ['05','May'],['06','June'],['07','July'],['08','August'],
    ['09','September'],['10','October'],['11','November'],['12','December']
  ];
  const now = new Date();
  const curMonth = year === now.getFullYear().toString()
    ? String(now.getMonth()+1).padStart(2,'0')
    : '01';
  const cur = monthSel.value || curMonth;
  monthSel.innerHTML = months.map(([v,l])=>`<option value="${v}" ${v===cur?'selected':''}>${l} ${year}</option>`).join('');
}

function setBillFilter(f) {
  billFilter = f;
  // Update active tab
  ['all','trip','month'].forEach(id => {
    const el = document.getElementById('bf-' + id);
    if(el) el.classList.toggle('active', id === f);
  });
  // Show/hide selectors
  const tripDiv  = document.getElementById('bf-trip-selector');
  const monthDiv = document.getElementById('bf-month-selector');
  if(tripDiv)  tripDiv.style.display  = f === 'trip'  ? '' : 'none';
  if(monthDiv) monthDiv.style.display = f === 'month' ? '' : 'none';
  // Populate options when switching to that view
  if(f === 'trip')  populateBillSelectors();
  if(f === 'month') updateBillYearOptions();
  renderBillsScreen();
}

// ═══════ PAYMENT METHOD FILTER (IMP-07) ═══════
let billPaymentFilter = 'all';

function setBillPaymentFilter(pm) {
  billPaymentFilter = pm;
  ['all','cash','bank','card'].forEach(k => {
    const el = document.getElementById('bpf-' + k);
    if(el) el.classList.toggle('active', k === pm);
  });
  renderBillsScreen();
}

function openAddBillFromScreen() {
  // Open add bill modal without pre-selecting a trip
  editingBillId = null;
  tmpBillPhotos = [];
  _savingBill = false;
  const _sb3=document.getElementById('bill-save-btn');
  if(_sb3){ _sb3.disabled=false; _sb3.textContent='💾 Save Bill'; }
  document.getElementById('bill-modal-title').textContent = 'Add Bill';
  document.getElementById('bill-edit-id').textContent = '';
  document.getElementById('bill-save-btn').textContent = '💾 Save Bill';
  ['bill-detail','bill-number','bill-amount','bill-notes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('bill-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('bill-currency').value = 'VND';
  document.getElementById('bill-category').value = 'other';
  const pmEl = document.getElementById('bill-payment-method'); if (pmEl) pmEl.value = '1-Cash';
  const vndElS=document.getElementById('bill-vnd');if(vndElS)vndElS.value='';
  toggleVNDRow();
  renderBillPhotoGrid();
  // Populate trip selector for linking
  const tripSel = document.getElementById('bill-trip-select');
  if (tripSel) {
    const trips = typeof getSortedTrips==='function' ? getSortedTrips() : [...(S.trips||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    tripSel.innerHTML = '<option value="">No trip link</option>' +
      trips.map(t => `<option value="${t.id}">${t.plant} (${fmtDate(t.date)})</option>`).join('');
  }
  document.getElementById('bill-save-btn').dataset.tripid = '';
  openModal('modal-add-bill');
}

function renderBillsScreen() {
  const body = document.getElementById('bills-screen-body');
  if (!body) return;

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const s = v => (v === null || v === undefined) ? '' : String(v);

  let bills = [...(S.bills || [])];

  if (billFilter === 'trip') {
    const selTrip = document.getElementById('bf-trip-select');
    const tripVal = selTrip ? selTrip.value : '';
    if(tripVal) bills = bills.filter(b => b.tripId === tripVal);
  }
  if (billFilter === 'month') {
    const yearSel  = document.getElementById('bf-year-select');
    const monthSel = document.getElementById('bf-month-select');
    const year  = (yearSel  && yearSel.value)  || new Date().getFullYear().toString();
    const month = (monthSel && monthSel.value) || String(new Date().getMonth()+1).padStart(2,'0');
    bills = bills.filter(b => (b.date||'').startsWith(`${year}-${month}`));
  }

  // Lọc theo hình thức thanh toán (IMP-07)
  if (billPaymentFilter === 'cash') {
    bills = bills.filter(b => (b.paymentMethod || '1-Cash').includes('Cash') || (b.paymentMethod || '').includes('1-'));
  } else if (billPaymentFilter === 'bank') {
    bills = bills.filter(b => (b.paymentMethod || '').includes('Bank') || (b.paymentMethod || '').includes('2-'));
  } else if (billPaymentFilter === 'card') {
    bills = bills.filter(b => (b.paymentMethod || '').includes('Card') || (b.paymentMethod || '').includes('Credit') || (b.paymentMethod || '').includes('3-'));
  }

  bills.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (!bills.length) {
    body.innerHTML = `<div class="empty"><div class="ei">💳</div>
      <div class="et">No bills yet.<br>Tap + to add your first expense.</div></div>`;
    return;
  }

  // Grand totals by currency
  const byCur = {};
  bills.forEach(b => {
    const c = b.currency || 'VND';
    byCur[c] = (byCur[c] || 0) + (parseFloat(b.amount) || 0);
  });
  // Grand total in VND
  const grandVND = bills.reduce((s,b)=>{
    if((b.currency||'VND')==='VND') return s+(parseFloat(b.amount)||0);
    return s+(parseFloat(b.vndAmount)||0);
  },0);

  let html = '';

  // Total summary card — VND grand total prominent, then each currency
  html += `<div class="card" style="margin-bottom:10px;">
    <div style="font-size:11px;font-weight:700;color:var(--g500);letter-spacing:0.07em;margin-bottom:8px;">TOTAL EXPENSES (${bills.length} bills)</div>
    ${grandVND?`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:2px solid var(--amber);margin-bottom:4px;">
      <span style="font-size:13px;font-weight:700;color:#92400E;">Grand Total (VND)</span>
      <span style="font-size:20px;font-weight:700;color:#92400E;">${fmtAmt(grandVND, "VND")} ₫</span>
    </div>`:''}
    ${Object.entries(byCur).map(([c, t]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid var(--g100);">
        <span style="font-size:12px;color:var(--g500);">${c}</span>
        <span style="font-size:14px;font-weight:600;color:var(--g700);">${fmtAmt(t, c)}</span>
      </div>`).join('')}
    <div style="margin-top:10px;display:flex;gap:8px;">
      <button class="btn btn-p btn-full" onclick="openBillExport()">📄 Export Bills PDF</button>
    </div>
  </div>`;

  if (billFilter === 'trip') {
    // Group by trip
    const byTrip = {};
    bills.forEach(b => {
      const key = b.tripId || '__none__';
      if (!byTrip[key]) byTrip[key] = [];
      byTrip[key].push(b);
    });
    Object.entries(byTrip).forEach(([tripId, tripBills]) => {
      const trip = S.trips.find(t => t.id === tripId);
      const tripName = trip ? trip.plant : 'No trip linked';
      const tripDate = trip ? fmtDate(trip.date) : '';
      const tripTotal = {};
      tripBills.forEach(b => { const c = b.currency||'VND'; tripTotal[c] = (tripTotal[c]||0) + (parseFloat(b.amount)||0); });
      const totalStr = Object.entries(tripTotal).map(([c,t]) => `${fmtAmt(t, c)} ${c}`).join(' + ');
      html += `<div style="display:flex;justify-content:space-between;align-items:center;background:#00843D;color:#fff;border-radius:var(--rs) var(--rs) 0 0;padding:8px 12px;">
        <div>
          <div style="font-size:13px;font-weight:600;">🏭 ${tripName}</div>
          ${tripDate ? `<div style="font-size:11px;opacity:0.8;">${tripDate}</div>` : ''}
        </div>
        <div style="font-size:13px;font-weight:700;">${totalStr}</div>
      </div>
      <div style="background:#fff;border-radius:0 0 var(--rs) var(--rs);box-shadow:var(--sh);margin-bottom:12px;">
        ${tripBills.sort((a,b)=>b.date.localeCompare(a.date)).map(b => renderBillRow(b)).join('')}
      </div>`;
    });
  } else {
    // Group by date
    const byDate = {};
    bills.forEach(b => {
      const d = b.date || '';
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(b);
    });
    Object.entries(byDate).forEach(([dateKey, dayBills]) => {
      const dayTotal = {};
      dayBills.forEach(b => { const c = b.currency||'VND'; dayTotal[c] = (dayTotal[c]||0) + (parseFloat(b.amount)||0); });
      const dTotalStr = Object.entries(dayTotal).map(([c,t]) => `${fmtAmt(t, c)} ${c}`).join(' + ');
      const trip = dayBills[0].tripId ? S.trips.find(t => t.id === dayBills[0].tripId) : null;
      html += `<div class="bill-day-header">
        <div>
          <div class="bill-day-label">📅 ${fmtDate(dateKey)}</div>
          ${trip ? `<div style="font-size:10px;color:#92400E;margin-top:1px;">🏭 ${trip.plant}</div>` : ''}
        </div>
        <div class="bill-day-total">${dTotalStr}</div>
      </div>
      <div style="background:#fff;border-radius:0 0 var(--rs) var(--rs);box-shadow:var(--sh);margin-bottom:10px;">
        ${dayBills.map(b => renderBillRow(b)).join('')}
      </div>`;
    });
  }

  body.innerHTML = html;
}

function renderBillRow(b) {
  const amt = fmtAmt(b.amount, b.currency);
  const hasVND = b.currency !== 'VND' && b.vndAmount;
  const vndAmt = hasVND ? fmtAmt(b.vndAmount, 'VND') : null;
  const catIcon = {accommodation:'🏨',travel:'✈️',meals:'🍽',parts:'🔩',tools:'🔧',other:'📋'}[b.category] || '📋';
  const catLabel = {accommodation:'Accommodation',travel:'Travel',meals:'Meals',parts:'Parts/Materials',tools:'Tools',other:'Other'}[b.category] || 'Other';
  const pm = getPaymentStyle(b.paymentMethod || b.paymentTerm);
  return `<div style="padding:10px 12px;border-bottom:1px solid var(--g100);border-left:4px solid ${pm.border};margin-bottom:2px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
      <div style="flex:1;min-width:0;">
        ${b.billNumber ? `<div style="font-size:10px;font-weight:600;color:var(--g500);letter-spacing:0.04em;">RECEIPT #${b.billNumber}</div>` : ''}
        <div style="font-size:13px;font-weight:600;color:var(--g800);margin-top:1px;">${b.detail}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;align-items:center;">
          <span style="background:var(--al);color:#92400E;padding:1px 7px;border-radius:10px;font-size:10px;">${catIcon} ${catLabel}</span>
          ${pm.badgeHtml}
          ${b.notes ? `<span style="font-size:11px;color:var(--g500);">${b.notes}</span>` : ''}
        </div>
        ${b.photos && b.photos.length ? `<div class="bill-photo-strip" style="margin-top:6px;">
          ${b.photos.map((p,pi) => `<img class="bill-photo-thumb" src="${p}" onclick="viewBillPhoto('${b.id}',${pi})" title="Tap to view">`).join('')}
        </div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;">
        <div class="bill-amount">${amt} ${b.currency||''}</div>
        ${vndAmt?`<div style="font-size:11px;color:var(--g500);text-align:right;margin-top:1px;">= ${vndAmt} ₫</div>`:''}
        <div style="display:flex;gap:4px;">
          <button onclick="openEditBill('${b.id}');event.stopPropagation()" style="width:28px;height:28px;border-radius:6px;border:1px solid var(--g200);background:#fff;cursor:pointer;font-size:13px;" title="Edit">✏️</button>
          <button onclick="deleteBillFromScreen('${b.id}')" class="db" title="Delete">×</button>
        </div>
      </div>
    </div>
  </div>`;
}

async function deleteBillFromScreen(id) {
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
  sv(); renderBillsScreen(); renderDash();

  // IMP-31: Single-row Trip Claim update when bill is deleted
  if(tripIdOfDeleted && typeof calculateTripTotalClaim === 'function'){
    const claim = (S.tripClaims || []).find(c => String(c.tripId) === String(tripIdOfDeleted));
    if(claim){
      claim.totalClaim = calculateTripTotalClaim(tripIdOfDeleted);
      claim.updatedAt = new Date().toISOString();
      if(typeof syncSingleTripClaim === 'function'){
        syncSingleTripClaim(claim);
      }
    }
  }

  svAndSync('bill_delete');
}

// ── Bill Export PDF ──────────────────────────────────────────
function openBillExport() {
  const sel = document.getElementById('bill-pdf-trip');
  if (sel) {
    const trips = typeof getSortedTrips==='function' ? getSortedTrips() : [...(S.trips||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    sel.innerHTML = '<option value="all">All trips</option>' +
      trips.map(t => `<option value="${t.id}">${t.plant} — ${fmtDate(t.date)}</option>`).join('');
    sel.onchange = () => { updateBillExportTitle(); buildBillPDFPreview(); };
  }
  // Always reset title on open so it auto-generates fresh
  updateBillExportTitle();
  buildBillPDFPreview();
  showScreen('bill-export');
}

function updateBillExportTitle() {
  const sel = document.getElementById('bill-pdf-trip');
  const titleEl = document.getElementById('bill-pdf-title');
  if (!titleEl) return;
  const tripId = sel ? sel.value : 'all';
  if (tripId === 'all') {
    titleEl.value = 'Expense Report — All Trips';
  } else {
    const tr = S.trips.find(t => t.id === tripId);
    if (tr) {
      const from = fmtDate(tr.date);
      const to = tr.dateEnd && tr.dateEnd !== tr.date ? ' to ' + fmtDate(tr.dateEnd) : '';
      titleEl.value = `Expense Report — ${tr.plant} — ${from}${to}`;
    }
  }
}

function buildBillPDFPreview() {
  const previewEl = document.getElementById('bill-pdf-preview');
  if (!previewEl) return;
  const tripFilter = document.getElementById('bill-pdf-trip') ? document.getElementById('bill-pdf-trip').value : 'all';
  const now = new Date();

  let bills = [...(S.bills || [])];
  if (tripFilter !== 'all') bills = bills.filter(b => b.tripId === tripFilter);
  bills.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (!bills.length) { previewEl.innerHTML = '<div class="empty"><div class="et">No bills to export.</div></div>'; return; }

  const byCur = {};
  bills.forEach(b => {
    const c = b.currency||'VND'; byCur[c] = (byCur[c]||0) + (parseFloat(b.amount)||0);
  });
  // Per-currency only — no grand VND total in summary
  const totalStr = Object.entries(byCur).map(([c,t]) =>
    `<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid var(--g100);">
      <span style="color:var(--g600);font-weight:500;">${c}</span>
      <span style="font-weight:700;color:#92400E;">${fmtAmt(t, c)} ${c}</span>
    </div>`).join('');
  const exportDate = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});

  const byDate = {};
  bills.forEach(b => { const d = b.date||''; if(!byDate[d]) byDate[d]=[]; byDate[d].push(b); });

  const previewTitle = (document.getElementById('bill-pdf-title') ? document.getElementById('bill-pdf-title').value : '') || 'Expense Report';
  let html = `<div class="pprev">
    <div class="ps">
      <div style="background:#00843D;color:#fff;border-radius:var(--rs);padding:12px;margin-bottom:10px;">
        <div style="font-size:14px;font-weight:700;" id="bill-preview-title">${previewTitle}</div>
        <div style="font-size:11px;opacity:0.8;margin-top:3px;">Date: ${exportDate}</div>
        <div style="font-size:11px;opacity:0.7;margin-top:1px;">${bills.length} bills</div>
      </div>
      <div style="font-size:10px;font-weight:700;color:var(--g500);letter-spacing:0.08em;margin-bottom:6px;">EXPENSE SUMMARY</div>
      ${totalStr}
    </div>`;

  Object.entries(byDate).forEach(([dateKey, dayBills]) => {
    const dt = {}; dayBills.forEach(b=>{const c=b.currency||'VND';dt[c]=(dt[c]||0)+(parseFloat(b.amount)||0);});
    const dtStr = Object.entries(dt).map(([c,t])=>`${fmtAmt(t, c)} ${c}`).join(' + ');
    const trip = dayBills[0].tripId ? S.trips.find(t=>t.id===dayBills[0].tripId) : null;
    html += `<div class="ps">
      <div style="display:flex;justify-content:space-between;background:var(--al);border-radius:5px;padding:5px 8px;margin-bottom:6px;">
        <div><div style="font-size:11px;font-weight:700;color:#92400E;">📅 ${fmtDate(dateKey)}</div>
        ${trip?`<div style="font-size:10px;color:#92400E;">🏭 ${trip.plant}</div>`:''}</div>
        <div style="font-size:12px;font-weight:700;color:#92400E;">${dtStr}</div>
      </div>
      ${dayBills.map(b=>{
        const catIcon={accommodation:'🏨',travel:'✈️',meals:'🍽',parts:'🔩',tools:'🔧',other:'📋'}[b.category]||'📋';
        const pm=getPaymentStyle(b.paymentMethod||b.paymentTerm);
        return `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid var(--g100);border-left:3px solid ${pm.border};padding-left:6px;margin-bottom:2px;">
          <div><div style="font-weight:500;">${catIcon} ${b.billNumber?'[#'+b.billNumber+'] ':''}${b.detail} ${pm.badgeHtml}</div>
          ${b.notes?`<div style="font-size:10px;color:var(--g500);">${b.notes}</div>`:''}
          ${b.photos&&b.photos.length?`<div style="font-size:10px;color:var(--blue);">📷 ${b.photos.length} photo${b.photos.length>1?'s':''}</div>`:''}
          </div>
          <div style="font-weight:700;color:#92400E;flex-shrink:0;margin-left:8px;">${fmtAmt(b.amount, b.currency)} ${b.currency||''}</div>
        </div>`;
      }).join('')}
    </div>`;
  });
  html += '</div>';
  previewEl.innerHTML = html;

  // Update preview title live
  const titleInput = document.getElementById('bill-pdf-title');
  const prevTitle = document.getElementById('bill-preview-title');
  if (titleInput && prevTitle) prevTitle.textContent = titleInput.value || 'Expense Report';
}

function exportBillsPDF() {
  if(typeof window.jspdf==='undefined'){showToast('PDF loading...');setTimeout(exportBillsPDF,1500);return;}
  const{jsPDF}=window.jspdf;
  const tripFilter=document.getElementById('bill-pdf-trip')?document.getElementById('bill-pdf-trip').value:'all';
  const reportTitle=(document.getElementById('bill-pdf-title')?document.getElementById('bill-pdf-title').value.trim():'')||'Expense Report';
  const p=S.profile;
  let bills=[...(S.bills||[])];
  if(tripFilter!=='all')bills=bills.filter(b=>b.tripId===tripFilter);
  bills.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  if(!bills.length){showToast('No bills to export');return;}
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  const W=210,mg=16;let y=20,pageNum=1;const R=W-mg;
  const rtxt=(str,yy,col)=>{if(col)doc.setTextColor(...col);const tw=doc.getTextWidth(String(str));doc.text(String(str),R-tw,yy);if(col)doc.setTextColor(33,37,41);};
  const chk=()=>{if(y>265){doc.addPage();y=20;pageNum++;addPN();}};
  const addPN=()=>{doc.setFontSize(7);doc.setTextColor(150,150,150);doc.setFont('helvetica','normal');rtxt(`Page ${pageNum}`,289);doc.text('PlantLog Bills  ·  '+new Date().toLocaleDateString('en-GB'),mg,289);};
  const sec=(title)=>{doc.setFillColor(241,243,245);doc.rect(mg,y-4,W-mg*2,8,'F');doc.setTextColor(0,132,61);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text(title,mg+2,y+1);doc.setTextColor(33,37,41);doc.setFont('helvetica','normal');y+=9;chk();};
  doc.setFillColor(0,132,61);doc.rect(0,0,W,36,'F');doc.setTextColor(255,255,255);
  const tl=doc.splitTextToSize(reportTitle,W-mg*2);doc.setFontSize(tl.length>1?11:15);doc.setFont('helvetica','bold');doc.text(tl,mg,tl.length>1?9:13);
  doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.text('Date: '+new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}),mg,22);doc.text(`${p.name||'Engineer'}${p.title?' · '+p.title:''}${p.company?' · '+p.company:''}`,mg,28);y=42;
  const computeTotals=(bs)=>{const byCur={};let vt=0;bs.forEach(b=>{const c=b.currency||'VND';byCur[c]=(byCur[c]||0)+(parseFloat(b.amount)||0);if(c==='VND')vt+=(parseFloat(b.amount)||0);else vt+=(parseFloat(b.vndAmount)||0);});return{byCur,vndTotal:vt};};
  const{byCur:allByCur,vndTotal:grandVND}=computeTotals(bills);
  sec(`EXPENSE SUMMARY  (${bills.length} bills)`);
  doc.setFontSize(9);doc.setFont('helvetica','normal');Object.entries(allByCur).forEach(([c,t])=>{doc.setTextColor(80,80,80);doc.text(c,mg+4,y);doc.setFont('helvetica','bold');rtxt(fmtAmt(t,c)+' '+c,y,[100,60,0]);doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);y+=5;});
  doc.setDrawColor(220,220,220);doc.line(mg,y,W-mg,y);y+=6;
  const byTrip={};bills.forEach(b=>{const k=b.tripId||'__none__';if(!byTrip[k])byTrip[k]=[];byTrip[k].push(b);});
  const tripCount=Object.keys(byTrip).length;
  if(tripCount>1){sec('SUMMARY BY TRIP');Object.entries(byTrip).forEach(([tid,tb])=>{const tr=S.trips.find(t=>t.id===tid);const{byCur:tC,vndTotal:tV}=computeTotals(tb);const brk=Object.entries(tC).map(([c,t])=>fmtAmt(t,c)+' '+c).join('  ·  ');doc.setFontSize(9);doc.setFont('helvetica','bold');doc.setTextColor(33,37,41);doc.text(`${tr?tr.plant:'No trip'}${tr&&tr.date?' ('+fmtDate(tr.date)+')':''}`,mg+2,y);rtxt(fmtAmt(tV,'VND')+' VND',y,[146,64,14]);y+=4;doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(130,130,130);doc.text(brk,mg+4,y);y+=6;chk();});doc.setDrawColor(220,220,220);doc.line(mg,y,W-mg,y);y+=6;}
  sec('BILL DETAILS');
  Object.entries(byTrip).forEach(([tid,tripBills])=>{
    const trip=S.trips.find(t=>t.id===tid);const{byCur:tCur,vndTotal:tVND}=computeTotals(tripBills);
    if(tripCount>1){doc.setFillColor(0,132,61);doc.rect(mg,y-3,W-mg*2,8,'F');doc.setTextColor(255,255,255);doc.setFontSize(9);doc.setFont('helvetica','bold');doc.text('🏭 '+(trip?trip.plant:'No trip'),mg+3,y+1);rtxt(fmtAmt(tVND,'VND')+' VND',y+1,[255,220,150]);doc.setTextColor(33,37,41);doc.setFont('helvetica','normal');y+=10;chk();}
    const byDate={};tripBills.forEach(b=>{const d=b.date||'';if(!byDate[d])byDate[d]=[];byDate[d].push(b);});
    Object.entries(byDate).forEach(([dk,dayBills])=>{
      const{byCur:dCur,vndTotal:dVND}=computeTotals(dayBills);const dtStr=Object.entries(dCur).map(([c,t])=>fmtAmt(t,c)+' '+c).join(' + ');
      doc.setFillColor(254,243,199);doc.rect(mg,y-3,W-mg*2,7,'F');doc.setFontSize(8.5);doc.setFont('helvetica','bold');doc.setTextColor(120,53,15);doc.text(fmtDate(dk),mg+3,y+1);rtxt(dVND?dtStr+' = '+fmtAmt(dVND,'VND')+' VND':dtStr,y+1,[120,53,15]);doc.setTextColor(33,37,41);doc.setFont('helvetica','normal');y+=8;chk();
      dayBills.forEach(b=>{
        const catLabel={accommodation:'Accommodation',travel:'Travel',meals:'Meals',parts:'Parts/Materials',tools:'Tools',other:'Other'}[b.category]||'Other';
        if(b.billNumber){doc.setFontSize(7.5);doc.setTextColor(140,140,140);doc.text('Receipt #'+b.billNumber,mg+4,y);y+=4;chk();}
        const bl=doc.splitTextToSize('• '+b.detail,W-mg*2-42);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);doc.text(bl,mg+2,y);doc.setFont('helvetica','bold');rtxt(fmtAmt(b.amount,b.currency)+' '+(b.currency||'VND'),y,[146,64,14]);doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);y+=bl.length*5;
        if(b.currency!=='VND'&&b.vndAmount){doc.setFontSize(8);doc.setTextColor(120,80,0);rtxt('= '+fmtAmt(b.vndAmount,'VND')+' VND',y);y+=4;}
        const meta=[catLabel,b.paymentMethod||b.paymentTerm||'1-Cash',b.notes].filter(Boolean).join('  ·  ');if(meta){doc.setFontSize(8);doc.setTextColor(120,120,120);doc.text(meta,mg+6,y);y+=4;}
        if(b.photos&&b.photos.length){const mx=Math.min(b.photos.length,3);chk();for(let pi=0;pi<mx;pi++){try{if(y+28>265){doc.addPage();y=20;pageNum++;addPN();}doc.addImage(b.photos[pi],'JPEG',mg+6+(pi*36),y,30,23);}catch(e){}}if(mx>0)y+=26;}
        y+=2;chk();
      });
      doc.setDrawColor(245,158,11);doc.line(mg+4,y,W-mg,y);y+=3;doc.setFontSize(8);doc.setFont('helvetica','bold');doc.setTextColor(120,53,15);doc.text('Day subtotal:',mg+6,y+1);rtxt(dVND?fmtAmt(dVND,'VND')+' VND  ('+dtStr+')':dtStr,y+1,[120,53,15]);doc.setTextColor(33,37,41);doc.setFont('helvetica','normal');y+=7;chk();y+=3;
    });
    if(tripCount>1){const{byCur:tC2,vndTotal:tV2}=computeTotals(tripBills);const brk2=Object.entries(tC2).map(([c,t])=>fmtAmt(t,c)+' '+c).join('  ·  ');doc.setDrawColor(0,132,61);doc.line(mg,y,W-mg,y);y+=3;doc.setFontSize(9);doc.setFont('helvetica','bold');doc.setTextColor(33,37,41);doc.text(`Total — ${trip?trip.plant:'No trip'}`,mg+2,y+1);rtxt(fmtAmt(tV2,'VND')+' VND  ('+brk2+')',y+1,[0,132,61]);y+=8;chk();y+=3;}
  });
  doc.setDrawColor(0,132,61);doc.line(mg,y,W-mg,y);y+=4;doc.setFontSize(11);doc.setFont('helvetica','bold');doc.setTextColor(33,37,41);doc.text('GRAND TOTAL',mg+2,y+1);rtxt(fmtAmt(grandVND,'VND')+' VND',y+1,[146,64,14]);y+=7;doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(120,120,120);const brkAll=Object.entries(allByCur).map(([c,t])=>fmtAmt(t,c)+' '+c).join('  ·  ');if(brkAll){doc.text(brkAll,mg+2,y);y+=5;}
  addPN();
  const safeName=reportTitle.replace(/[^a-zA-Z0-9\s]/g,'').replace(/\s+/g,'_').slice(0,40);
  const safeName2=reportTitle.replace(/[^a-zA-Z0-9\s]/g,'').replace(/\s+/g,'_').slice(0,40);
  const bFileName=`Bills_${safeName2}_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.pdf`;
  // Pass tripId so the Drive upload links to correct trip
  const billsTripId = (tripFilter && tripFilter !== 'all') ? tripFilter : (curTrip||null);
  showPdfSaveOptions(doc, bFileName, 'bills', billsTripId);
}

function emailBillsReport() {
  const title = document.getElementById('bill-pdf-title') ? document.getElementById('bill-pdf-title').value.trim() : 'Expense Report';
  const tripFilter = document.getElementById('bill-pdf-trip') ? document.getElementById('bill-pdf-trip').value : 'all';
  let bills = [...(S.bills||[])];
  if (tripFilter !== 'all') bills = bills.filter(b=>b.tripId===tripFilter);
  const byCur = {};
  bills.forEach(b=>{const c=b.currency||'VND';byCur[c]=(byCur[c]||0)+(parseFloat(b.amount)||0);});
  const totalStr = Object.entries(byCur).map(([c,t])=>fmtAmt(t, c)+' '+c).join(' + ');
  document.getElementById('email-subject').value = title;
  document.getElementById('email-body').value =
    `Please find attached the expense report.\n\nTitle: ${title}\nBills: ${bills.length}\nTotal: ${totalStr}\nPrepared by: ${S.profile.name||'Engineer'}\nDate: ${new Date().toLocaleDateString('en-GB')}\n\nPlease download and attach the PDF from the app.\n\nBest regards,\n${S.profile.name||'Engineer'}`;
  openModal('modal-email');
}

// ═══════════════════════════════════════════════════════════
// ✈️ TRIP CLAIM & REIMBURSEMENT TRACKER (IMP-31)
// ═══════════════════════════════════════════════════════════

let currentBillsView = 'bills'; // 'bills' | 'claims' | 'card'
let tripClaimStatusFilter = 'all'; // 'all' | 'Not yet' | 'Processing' | 'Done'
let _editingClaimStatus = 'Not yet';

/**
 * Switch view between Expense Bills, Trip Claims Summary, and Credit Card Tracker
 */
function switchBillsView(view) {
  currentBillsView = view;
  const tabBills = document.getElementById('view-tab-bills');
  const tabClaims = document.getElementById('view-tab-claims');
  const tabCard = document.getElementById('view-tab-card');
  const billsFilterBar = document.getElementById('bills-filter-bar');
  const billsBody = document.getElementById('bills-screen-body');
  const claimsView = document.getElementById('claims-view-container');
  const cardView = document.getElementById('card-view-container');
  const topTitle = document.getElementById('bills-topbar-title');
  const addBtn = document.getElementById('bills-add-btn');
  const topSyncBtn = document.getElementById('claims-sync-btn');

  if (view === 'claims') {
    if (tabBills) { tabBills.className = 'btn btn-sm btn-o'; }
    if (tabClaims) { tabClaims.className = 'btn btn-sm btn-p'; }
    if (tabCard) { tabCard.className = 'btn btn-sm btn-o'; }
    if (billsFilterBar) billsFilterBar.style.display = 'none';
    if (billsBody) billsBody.style.display = 'none';
    if (claimsView) claimsView.style.display = 'flex';
    if (cardView) cardView.style.display = 'none';
    if (topTitle) topTitle.textContent = '✈️ Trip Claims Summary';
    if (addBtn) addBtn.style.display = 'none';
    if (topSyncBtn) topSyncBtn.style.display = 'inline-flex';
    renderTripClaimsScreen();
  } else if (view === 'card') {
    if (tabBills) { tabBills.className = 'btn btn-sm btn-o'; }
    if (tabClaims) { tabClaims.className = 'btn btn-sm btn-o'; }
    if (tabCard) { tabCard.className = 'btn btn-sm btn-p'; }
    if (billsFilterBar) billsFilterBar.style.display = 'none';
    if (billsBody) billsBody.style.display = 'none';
    if (claimsView) claimsView.style.display = 'none';
    if (cardView) cardView.style.display = 'flex';
    if (topTitle) topTitle.textContent = '💳 Credit Card Tracker';
    if (addBtn) addBtn.style.display = 'none';
    if (topSyncBtn) topSyncBtn.style.display = 'none';
    renderCreditCardScreen();
  } else {
    if (tabBills) { tabBills.className = 'btn btn-sm btn-p'; }
    if (tabClaims) { tabClaims.className = 'btn btn-sm btn-o'; }
    if (tabCard) { tabCard.className = 'btn btn-sm btn-o'; }
    if (billsFilterBar) billsFilterBar.style.display = 'block';
    if (billsBody) billsBody.style.display = 'block';
    if (claimsView) claimsView.style.display = 'none';
    if (cardView) cardView.style.display = 'none';
    if (topTitle) topTitle.textContent = '💳 Expense Bills';
    if (addBtn) addBtn.style.display = 'inline-flex';
    if (topSyncBtn) topSyncBtn.style.display = 'none';
    renderBillsScreen();
  }
}

/**
 * Calculate total claim amount (VND) from all bills linked to a trip
 */
function calculateTripTotalClaim(tripId) {
  if (!tripId || !Array.isArray(S.bills)) return 0;
  const tripBills = S.bills.filter(b => String(b.tripId) === String(tripId));
  return tripBills.reduce((sum, b) => {
    if ((b.currency || 'VND').toUpperCase() === 'VND') {
      return sum + (parseFloat(b.amount) || 0);
    }
    return sum + (parseFloat(b.vndAmount) || 0);
  }, 0);
}

/**
 * Get or initialize claim data for a trip
 */
function getTripClaimData(tripId) {
  if (!S.tripClaims) S.tripClaims = [];
  let found = S.tripClaims.find(c => String(c.tripId) === String(tripId));
  if (!found) {
    found = {
      tripId: tripId,
      dateRequest: '',
      dateApproved: '',
      processDate: '',
      doneDate: '',
      paymentStatus: 'Not yet',
      comment: '',
      updatedAt: ''
    };
  }
  return found;
}

/**
 * Filter by payment status in Trip Claims view
 */
function setTripClaimStatusFilter(status) {
  tripClaimStatusFilter = status;
  const chips = ['all', 'notyet', 'proc', 'done'];
  chips.forEach(c => {
    const el = document.getElementById('tcf-' + c);
    if (!el) return;
    const match = (c === 'all' && status === 'all') ||
                  (c === 'notyet' && status === 'Not yet') ||
                  (c === 'proc' && status === 'Processing') ||
                  (c === 'done' && status === 'Done');
    el.classList.toggle('active', match);
  });
  renderTripClaimsScreen();
}

/**
 * Populate Month & Year options for Trip Claims view
 */
function populateTripClaimDateSelectors() {
  const yearSel = document.getElementById('tc-year-select');
  const monthSel = document.getElementById('tc-month-select');
  if (!yearSel || !monthSel) return;

  const currentYearVal = yearSel.value;
  const currentMonthVal = monthSel.value;

  // Extract all years from trips
  const years = [...new Set((S.trips || []).map(t => (t.date || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  const thisYear = new Date().getFullYear().toString();
  if (!years.includes(thisYear)) years.unshift(thisYear);

  let yearOpts = '<option value="">All Years</option>';
  years.forEach(y => {
    const sel = (currentYearVal === y) ? ' selected' : '';
    yearOpts += `<option value="${y}"${sel}>${y}</option>`;
  });
  yearSel.innerHTML = yearOpts;

  // Month options
  const months = [
    ['', 'All Months'],
    ['01', 'January'], ['02', 'February'], ['03', 'March'],
    ['04', 'April'], ['05', 'May'], ['06', 'June'],
    ['07', 'July'], ['08', 'August'], ['09', 'September'],
    ['10', 'October'], ['11', 'November'], ['12', 'December']
  ];
  let monthOpts = '';
  months.forEach(([v, l]) => {
    const sel = (currentMonthVal === v) ? ' selected' : '';
    monthOpts += `<option value="${v}"${sel}>${l}</option>`;
  });
  monthSel.innerHTML = monthOpts;
}

/**
 * Render the entire Trip Claims view
 */
function renderTripClaimsScreen() {
  const container = document.getElementById('tc-claims-list');
  if (!container) return;

  // Auto-populate S.tripClaims for all trips to ensure sync readiness
  if (!S.tripClaims) S.tripClaims = [];
  let stateChanged = false;
  (S.trips || []).forEach(tr => {
    let claim = S.tripClaims.find(c => String(c.tripId) === String(tr.id));
    const totalClaim = calculateTripTotalClaim(tr.id);
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
      stateChanged = true;
    }
    claim.fromDate = tr.date || '';
    claim.toDate = tr.dateEnd || tr.date || '';
    claim.weekNo = weekLabel || '';
    claim.travelDetail = `${tr.plant}${tr.location ? ' • ' + tr.location : ''}${tr.purpose ? ' (' + tr.purpose + ')' : ''}`;
    claim.totalClaim = totalClaim;
  });
  if (stateChanged && typeof sv === 'function') {
    sv();
  }

  populateTripClaimDateSelectors();

  const yearSel = document.getElementById('tc-year-select');
  const monthSel = document.getElementById('tc-month-select');
  const filterYear = yearSel ? yearSel.value : '';
  const filterMonth = monthSel ? monthSel.value : '';

  let trips = typeof getSortedTrips === 'function' ? getSortedTrips() : [...(S.trips || [])];

  // Filter by Year
  if (filterYear) {
    trips = trips.filter(t => (t.date || '').startsWith(filterYear));
  }
  // Filter by Month
  if (filterMonth) {
    trips = trips.filter(t => {
      const parts = (t.date || '').split('-');
      return parts[1] === filterMonth;
    });
  }

  // Filter by Payment Status
  if (tripClaimStatusFilter !== 'all') {
    trips = trips.filter(t => {
      const claim = getTripClaimData(t.id);
      return claim.paymentStatus === tripClaimStatusFilter;
    });
  }

  // Calculate summary stats
  let totalClaimSum = 0;
  let receivedSum = 0;
  let pendingSum = 0;

  trips.forEach(t => {
    const amt = calculateTripTotalClaim(t.id);
    const claim = getTripClaimData(t.id);
    totalClaimSum += amt;
    if (claim.paymentStatus === 'Done') {
      receivedSum += amt;
    } else {
      pendingSum += amt;
    }
  });

  // Update summary strip DOM
  const countLabel = document.getElementById('tc-count-label');
  const grandTotalEl = document.getElementById('tc-grand-total');
  const receivedTotalEl = document.getElementById('tc-received-total');
  const pendingTotalEl = document.getElementById('tc-pending-total');

  if (countLabel) countLabel.textContent = `TRIP CLAIMS (${trips.length} TRIPS)`;
  if (grandTotalEl) grandTotalEl.textContent = `${fmtAmt(totalClaimSum, 'VND')} ₫`;
  if (receivedTotalEl) receivedTotalEl.textContent = `${fmtAmt(receivedSum, 'VND')} ₫`;
  if (pendingTotalEl) pendingTotalEl.textContent = `${fmtAmt(pendingSum, 'VND')} ₫`;

  if (!trips.length) {
    container.innerHTML = `
      <div class="empty">
        <div class="ei">✈️</div>
        <div class="et">No trip claims found</div>
        <div class="es">Try selecting a different month, year, or payment status filter.</div>
      </div>`;
    return;
  }

  // Render Smart Accordion Rows
  let html = '';
  trips.forEach(t => {
    const claim = getTripClaimData(t.id);
    const totalClaim = calculateTripTotalClaim(t.id);
    const weekLabel = typeof getTripWeekLabel === 'function' ? getTripWeekLabel(t.date, t.dateEnd) : '';
    const dateRangeStr = (t.dateEnd && t.dateEnd !== t.date)
      ? `${fmtDate(t.date)} ➔ ${fmtDate(t.dateEnd)}`
      : fmtDate(t.date);

    const tripBillsCount = (S.bills || []).filter(b => String(b.tripId) === String(t.id)).length;
    const isCompleted = t.status === 'completed';
    const isActive = t.status === 'in_progress';
    const isPlanned = t.status === 'planned' || (!isCompleted && !isActive);

    let rowStatusClass = 'claim-row-completed';
    let tripBadgeHtml = `<span class="badge" style="font-size:10px;padding:1px 5px;background:var(--g100);color:var(--green);font-weight:700;">✅ Done</span>`;
    let bodyTripStatusText = `<strong style="color:var(--green);">🟢 Completed</strong>`;
    let bodyTripSubText = 'Finalized';

    if (isActive) {
      rowStatusClass = 'claim-row-active';
      tripBadgeHtml = `<span class="badge" style="font-size:10px;padding:1px 6px;background:#DBEAFE;color:#1E40AF;font-weight:700;border:1px solid #BFDBFE;">🔄 Active</span>`;
      bodyTripStatusText = `<strong style="color:#1E40AF;">🔄 Active (In Progress)</strong>`;
      bodyTripSubText = 'In Progress';
    } else if (isPlanned) {
      rowStatusClass = 'claim-row-planned';
      tripBadgeHtml = `<span class="badge" style="font-size:10px;padding:1px 5px;background:var(--n200);color:var(--n600);font-weight:600;">📋 Planned</span>`;
      bodyTripStatusText = `<strong style="color:var(--n500);">📋 Planned (Not Active)</strong>`;
      bodyTripSubText = 'Upcoming';
    }

    // Status styling
    let statusClass = 'claim-status-notyet';
    let statusBadgeText = '🔴 Not yet';
    if (claim.paymentStatus === 'Processing') {
      statusClass = 'claim-status-proc';
      statusBadgeText = '🟡 Processing';
    } else if (claim.paymentStatus === 'Done') {
      statusClass = 'claim-status-done';
      statusBadgeText = '🟢 Done';
    }

    // Step timeline checks
    const stepReqDone = Boolean(claim.dateRequest);
    const stepApprDone = Boolean(claim.dateApproved);
    const stepProcDone = Boolean(claim.processDate);
    const stepDoneDone = Boolean(claim.doneDate);

    html += `
      <div class="claim-row ${rowStatusClass}" id="claim-row-${t.id}">
        <!-- Single-line Collapsed Header -->
        <div class="claim-row-header" onclick="toggleTripClaimAccordion('${t.id}')">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:wrap;">
              <span style="font-size:13px;font-weight:700;color:var(--n800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🏭 ${t.plant}</span>
              ${tripBadgeHtml}
              ${weekLabel ? `<span class="badge" style="font-size:10px;padding:1px 5px;background:var(--g100);color:var(--green);font-weight:700;">${weekLabel}</span>` : ''}
            </div>
            <div style="font-size:11px;color:var(--n500);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              📅 ${dateRangeStr} ${t.location ? `• ${t.location}` : ''}
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:13px;font-weight:800;color:${isPlanned ? 'var(--n400)' : 'var(--green)'};font-family:var(--mono);">
              ${fmtAmt(totalClaim, 'VND')} ₫
            </div>
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-top:2px;">
              <span class="claim-badge-status ${statusClass}">${statusBadgeText}</span>
              <span class="claim-chevron" id="claim-chevron-${t.id}">▾</span>
            </div>
          </div>
        </div>

        <!-- Expandable Detail Body -->
        <div class="claim-row-body" id="claim-body-${t.id}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:11px;">
            <span style="color:var(--n600);">Trip Status: ${bodyTripStatusText} (${tripBillsCount} bills linked)</span>
            <span style="font-size:10px;color:var(--n400);">${bodyTripSubText}</span>
          </div>

          ${t.purpose ? `<div style="font-size:11px;color:var(--n700);margin-bottom:8px;background:#fff;padding:6px 8px;border-radius:4px;border:1px solid var(--n200);"><strong>Purpose:</strong> ${t.purpose}</div>` : ''}

          <!-- 4-Step Payment Timeline Matrix -->
          <div style="font-size:10px;font-weight:700;color:var(--g500);letter-spacing:0.04em;margin-bottom:4px;">PAYMENT TIMELINE</div>
          <div class="claim-timeline-grid">
            <div class="claim-step-box ${stepReqDone ? 'done' : ''}">
              <div class="claim-step-title">1. Request</div>
              <div class="claim-step-date">${claim.dateRequest ? fmtDate(claim.dateRequest) : '──'}</div>
              <div style="font-size:10px;margin-top:2px;">${stepReqDone ? '🟢' : '⚪'}</div>
            </div>
            <div class="claim-step-box ${stepApprDone ? 'done' : ''}">
              <div class="claim-step-title">2. Approve</div>
              <div class="claim-step-date">${claim.dateApproved ? fmtDate(claim.dateApproved) : '──'}</div>
              <div style="font-size:10px;margin-top:2px;">${stepApprDone ? '🟢' : '⚪'}</div>
            </div>
            <div class="claim-step-box ${stepProcDone ? 'done' : ''}">
              <div class="claim-step-title">3. Process</div>
              <div class="claim-step-date">${claim.processDate ? fmtDate(claim.processDate) : '──'}</div>
              <div style="font-size:10px;margin-top:2px;">${stepProcDone ? '🟢' : '⚪'}</div>
            </div>
            <div class="claim-step-box ${stepDoneDone ? 'done' : ''}">
              <div class="claim-step-title">4. Received</div>
              <div class="claim-step-date">${claim.doneDate ? fmtDate(claim.doneDate) : '──'}</div>
              <div style="font-size:10px;margin-top:2px;">${stepDoneDone ? '🟢' : '⚪'}</div>
            </div>
          </div>

          <!-- Comment Display -->
          ${claim.comment ? `
            <div style="font-size:11px;color:var(--n700);background:#fff;padding:6px 8px;border-radius:4px;border:1px solid var(--n200);margin-top:6px;">
              💬 <strong>Comment:</strong> ${claim.comment}
            </div>` : ''}

          <!-- Action Buttons -->
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button type="button" class="btn btn-sm btn-p" style="flex:1;font-size:11px;padding:6px 10px;" onclick="openEditTripClaimModal('${t.id}')">
              ✏️ Update Claim Info
            </button>
            <button type="button" class="btn btn-sm btn-o" style="font-size:11px;padding:6px 10px;" onclick="filterBillsByTrip('${t.id}')">
              🧾 View Bills (${tripBillsCount})
            </button>
          </div>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

/**
 * Toggle Accordion Row
 */
function toggleTripClaimAccordion(tripId) {
  const row = document.getElementById('claim-row-' + tripId);
  if (row) {
    row.classList.toggle('expanded');
  }
}

/**
 * Filter bills screen by a specific trip
 */
function filterBillsByTrip(tripId) {
  switchBillsView('bills');
  setBillFilter('trip');
  const selTrip = document.getElementById('bf-trip-select');
  if (selTrip) {
    selTrip.value = tripId;
    renderBillsScreen();
  }
}

/**
 * Open Modal to edit Trip Claim dates and status
 */
function openEditTripClaimModal(tripId) {
  const trip = (S.trips || []).find(t => String(t.id) === String(tripId));
  if (!trip) {
    showToast('Trip not found');
    return;
  }

  const claim = getTripClaimData(tripId);
  const totalClaim = calculateTripTotalClaim(tripId);
  const weekLabel = typeof getTripWeekLabel === 'function' ? getTripWeekLabel(trip.date, trip.dateEnd) : '';
  const dateRangeStr = (trip.dateEnd && trip.dateEnd !== trip.date)
    ? `${fmtDate(trip.date)} ➔ ${fmtDate(trip.dateEnd)}`
    : fmtDate(trip.date);

  const plantEl = document.getElementById('tce-plant');
  const weekEl = document.getElementById('tce-week-badge');
  const datesDetailEl = document.getElementById('tce-dates-detail');
  const totalClaimEl = document.getElementById('tce-total-claim');
  const tripIdInput = document.getElementById('tce-trip-id');

  if (plantEl) plantEl.textContent = trip.plant;
  if (weekEl) weekEl.textContent = weekLabel || 'Trip';
  if (datesDetailEl) datesDetailEl.textContent = `${dateRangeStr} ${trip.location ? '• ' + trip.location : ''}`;
  if (totalClaimEl) totalClaimEl.textContent = `${fmtAmt(totalClaim, 'VND')} ₫`;
  if (tripIdInput) tripIdInput.value = tripId;

  // Status
  setTripClaimEditStatus(claim.paymentStatus || 'Not yet');

  // Dates
  const dateReqEl = document.getElementById('tce-date-req');
  const dateApprEl = document.getElementById('tce-date-appr');
  const dateProcEl = document.getElementById('tce-date-proc');
  const dateDoneEl = document.getElementById('tce-date-done');
  const commentEl = document.getElementById('tce-comment');

  if (dateReqEl) dateReqEl.value = claim.dateRequest || '';
  if (dateApprEl) dateApprEl.value = claim.dateApproved || '';
  if (dateProcEl) dateProcEl.value = claim.processDate || '';
  if (dateDoneEl) dateDoneEl.value = claim.doneDate || '';
  if (commentEl) commentEl.value = claim.comment || '';

  openModal('modal-trip-claim-edit');
}

/**
 * Set status in Edit Modal
 */
function setTripClaimEditStatus(status) {
  _editingClaimStatus = status;
  const btns = document.querySelectorAll('.tce-status-btn');
  btns.forEach(b => {
    const s = b.getAttribute('data-status');
    if (s === status) {
      b.style.opacity = '1';
      b.style.boxShadow = '0 0 0 2px var(--brand)';
    } else {
      b.style.opacity = '0.55';
      b.style.boxShadow = 'none';
    }
  });
}

/**
 * Set today's date in a claim date field
 */
function setClaimTodayDate(fieldId) {
  const el = document.getElementById(fieldId);
  if (el) {
    el.value = new Date().toISOString().slice(0, 10);
  }
}

/**
 * Save Trip Claim and trigger cloud sync
 */
function saveTripClaim() {
  const tripIdInput = document.getElementById('tce-trip-id');
  const tripId = tripIdInput ? tripIdInput.value : '';
  if (!tripId) return;

  const trip = (S.trips || []).find(t => String(t.id) === String(tripId));
  if (!trip) return;

  const dateReq = document.getElementById('tce-date-req')?.value || '';
  const dateAppr = document.getElementById('tce-date-appr')?.value || '';
  const dateProc = document.getElementById('tce-date-proc')?.value || '';
  const dateDone = document.getElementById('tce-date-done')?.value || '';
  const comment = document.getElementById('tce-comment')?.value.trim() || '';

  if (!S.tripClaims) S.tripClaims = [];
  let claim = S.tripClaims.find(c => String(c.tripId) === String(tripId));
  if (!claim) {
    claim = { tripId: tripId };
    S.tripClaims.push(claim);
  }

  claim.dateRequest = dateReq;
  claim.dateApproved = dateAppr;
  claim.processDate = dateProc;
  claim.doneDate = dateDone;
  claim.paymentStatus = _editingClaimStatus || 'Not yet';
  claim.comment = comment;
  claim.updatedAt = new Date().toISOString();

  // Populate metadata fields for Google Sheet export
  const totalClaim = calculateTripTotalClaim(tripId);
  const weekLabel = typeof getTripWeekLabel === 'function' ? getTripWeekLabel(trip.date, trip.dateEnd) : '';
  claim.fromDate = trip.date || '';
  claim.toDate = trip.dateEnd || trip.date || '';
  claim.weekNo = weekLabel || '';
  claim.travelDetail = `${trip.plant}${trip.location ? ' • ' + trip.location : ''}${trip.purpose ? ' (' + trip.purpose + ')' : ''}`;
  claim.totalClaim = totalClaim;

  sv();
  closeModal('modal-trip-claim-edit');
  renderTripClaimsScreen();
  showToast('✓ Claim info saved');

  // Sync to Google Sheet (Incremental single-row sync)
  if (typeof syncSingleTripClaim === 'function') {
    syncSingleTripClaim(claim);
  }
}

// ═══════════════════════════════════════════════════════════
// 💳 CREDIT CARD TRACKER (IMP-32)
// ═══════════════════════════════════════════════════════════

let _currentCreditCardSubTab = 'bills'; // 'bills' | 'transfers'

/**
 * Ensure S.creditCard state exists with default values
 */
function ensureCreditCardState() {
  if (!S.creditCard) {
    S.creditCard = {
      budget: 50000000,
      cardName: 'Corporate Credit Card',
      transfers: []
    };
  }
  if (typeof S.creditCard.budget !== 'number') {
    S.creditCard.budget = parseFloat(S.creditCard.budget) || 50000000;
  }
  if (!S.creditCard.cardName) {
    S.creditCard.cardName = 'Corporate Credit Card';
  }
  if (!Array.isArray(S.creditCard.transfers)) {
    S.creditCard.transfers = [];
  }
}

/**
 * Check if a bill was paid by Credit Card
 */
function isCreditCardBill(b) {
  if (!b) return false;
  const pm = String(b.paymentMethod || b.paymentTerm || '');
  return pm.includes('Card') || pm.includes('Credit');
}

/**
 * Populate Month & Year options for Credit Card view
 */
function populateCardDateSelectors() {
  const yearSel = document.getElementById('cc-year-select');
  const monthSel = document.getElementById('cc-month-select');
  if (!yearSel || !monthSel) return;

  const currentYearVal = yearSel.value;
  const currentMonthVal = monthSel.value;

  ensureCreditCardState();

  // Extract years from card bills and transfers
  const cardBillYears = (S.bills || []).filter(isCreditCardBill).map(b => (b.date || '').slice(0, 4)).filter(Boolean);
  const transferYears = (S.creditCard.transfers || []).map(t => (t.date || '').slice(0, 4)).filter(Boolean);
  const years = [...new Set([...cardBillYears, ...transferYears])].sort().reverse();
  const thisYear = new Date().getFullYear().toString();
  if (!years.includes(thisYear)) years.unshift(thisYear);

  let yearOpts = '<option value="">All Years</option>';
  years.forEach(y => {
    const sel = (currentYearVal === y) ? ' selected' : '';
    yearOpts += `<option value="${y}"${sel}>${y}</option>`;
  });
  yearSel.innerHTML = yearOpts;

  // Month options
  const months = [
    ['', 'All Months'],
    ['01', 'January'], ['02', 'February'], ['03', 'March'],
    ['04', 'April'], ['05', 'May'], ['06', 'June'],
    ['07', 'July'], ['08', 'August'], ['09', 'September'],
    ['10', 'October'], ['11', 'November'], ['12', 'December']
  ];
  let monthOpts = '';
  months.forEach(([v, l]) => {
    const sel = (currentMonthVal === v) ? ' selected' : '';
    monthOpts += `<option value="${v}"${sel}>${l}</option>`;
  });
  monthSel.innerHTML = monthOpts;
}

/**
 * Switch sub-tab between Card Bills and Transfer History
 */
function switchCreditCardSubTab(subTab) {
  _currentCreditCardSubTab = subTab;
  const tabBills = document.getElementById('cc-tab-bills');
  const tabTransfers = document.getElementById('cc-tab-transfers');
  const billsContainer = document.getElementById('cc-bills-list-container');
  const transfersContainer = document.getElementById('cc-transfers-list-container');

  if (subTab === 'transfers') {
    if (tabBills) tabBills.classList.remove('active');
    if (tabTransfers) tabTransfers.classList.add('active');
    if (billsContainer) billsContainer.style.display = 'none';
    if (transfersContainer) transfersContainer.style.display = 'block';
  } else {
    if (tabBills) tabBills.classList.add('active');
    if (tabTransfers) tabTransfers.classList.remove('active');
    if (billsContainer) billsContainer.style.display = 'block';
    if (transfersContainer) transfersContainer.style.display = 'none';
  }
}

/**
 * Render the entire Credit Card Screen
 */
function renderCreditCardScreen() {
  ensureCreditCardState();
  populateCardDateSelectors();

  const yearSel = document.getElementById('cc-year-select');
  const monthSel = document.getElementById('cc-month-select');
  const filterYear = yearSel ? yearSel.value : '';
  const filterMonth = monthSel ? monthSel.value : '';

  const budget = parseFloat(S.creditCard.budget) || 0;
  const cardName = S.creditCard.cardName || 'Corporate Credit Card';

  // 1. All-time calculations
  const allCardBills = (S.bills || []).filter(isCreditCardBill);
  const totalAllCardSpent = allCardBills.reduce((sum, b) => {
    if ((b.currency || 'VND').toUpperCase() === 'VND') {
      return sum + (parseFloat(b.amount) || 0);
    }
    return sum + (parseFloat(b.vndAmount) || 0);
  }, 0);

  const totalAllTransferred = (S.creditCard.transfers || []).reduce((sum, t) => {
    return sum + (parseFloat(t.amount) || 0);
  }, 0);

  const totalBalanceDue = Math.max(0, totalAllCardSpent - totalAllTransferred);
  const availableLimit = budget - totalBalanceDue;

  // 2. Filtered calculations for selected month / year
  let filteredBills = [...allCardBills];
  let filteredTransfers = [...(S.creditCard.transfers || [])];

  if (filterYear) {
    filteredBills = filteredBills.filter(b => (b.date || '').startsWith(filterYear));
    filteredTransfers = filteredTransfers.filter(t => (t.date || '').startsWith(filterYear));
  }
  if (filterMonth) {
    filteredBills = filteredBills.filter(b => {
      const parts = (b.date || '').split('-');
      return parts[1] === filterMonth;
    });
    filteredTransfers = filteredTransfers.filter(t => {
      const parts = (t.date || '').split('-');
      return parts[1] === filterMonth;
    });
  }

  // Sort descending by date
  filteredBills.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  filteredTransfers.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const monthSpent = filteredBills.reduce((sum, b) => {
    if ((b.currency || 'VND').toUpperCase() === 'VND') {
      return sum + (parseFloat(b.amount) || 0);
    }
    return sum + (parseFloat(b.vndAmount) || 0);
  }, 0);

  const monthTransferred = filteredTransfers.reduce((sum, t) => {
    return sum + (parseFloat(t.amount) || 0);
  }, 0);

  // 3. Update DOM Displays
  const budgetEl = document.getElementById('cc-budget-display');
  const cardNameEl = document.getElementById('cc-card-name-display');
  const availEl = document.getElementById('cc-avail-display');
  const debtEl = document.getElementById('cc-debt-display');
  const monthLabelEl = document.getElementById('cc-month-label');
  const monthBillCountEl = document.getElementById('cc-month-bill-count');
  const monthSpentEl = document.getElementById('cc-month-spent');
  const monthReimbursedEl = document.getElementById('cc-month-reimbursed');
  const billsBadgeEl = document.getElementById('cc-bills-badge');
  const transfersBadgeEl = document.getElementById('cc-transfers-badge');

  if (budgetEl) budgetEl.textContent = `${fmtAmt(budget, 'VND')} ₫`;
  if (cardNameEl) cardNameEl.textContent = cardName;
  if (availEl) {
    availEl.textContent = `${fmtAmt(availableLimit, 'VND')} ₫`;
    availEl.style.color = availableLimit < 0 ? '#FCA5A5' : '#6EE7B7';
  }
  if (debtEl) {
    debtEl.textContent = `${fmtAmt(totalBalanceDue, 'VND')} ₫`;
    debtEl.style.color = totalBalanceDue > 0 ? '#FCA5A5' : '#E0E7FF';
  }

  // Monthly activity label
  let periodLabel = 'ACTIVITY (ALL TIME)';
  if (filterMonth && filterYear) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(filterMonth, 10) - 1;
    periodLabel = `${monthNames[mIdx] || filterMonth} ${filterYear} ACTIVITY`;
  } else if (filterYear) {
    periodLabel = `${filterYear} ACTIVITY`;
  } else if (filterMonth) {
    periodLabel = `MONTH ${filterMonth} ACTIVITY`;
  }

  if (monthLabelEl) monthLabelEl.textContent = periodLabel.toUpperCase();
  if (monthBillCountEl) monthBillCountEl.textContent = `${filteredBills.length} card bill${filteredBills.length !== 1 ? 's' : ''}`;
  if (monthSpentEl) monthSpentEl.textContent = `${fmtAmt(monthSpent, 'VND')} ₫`;
  if (monthReimbursedEl) monthReimbursedEl.textContent = `${fmtAmt(monthTransferred, 'VND')} ₫`;
  if (billsBadgeEl) billsBadgeEl.textContent = String(filteredBills.length);
  if (transfersBadgeEl) transfersBadgeEl.textContent = String(filteredTransfers.length);

  // 4. Render Bills List
  const billsContainer = document.getElementById('cc-bills-list-container');
  if (billsContainer) {
    if (!filteredBills.length) {
      billsContainer.innerHTML = `
        <div class="empty" style="padding:24px 12px;background:#fff;border-radius:var(--rs);border:1px dashed var(--n200);">
          <div class="ei">💳</div>
          <div class="et">No card expenses found</div>
          <div class="es">Bills paid via "3-Credit card" in this period will appear here.</div>
        </div>`;
    } else {
      let bHtml = '';
      filteredBills.forEach(b => {
        const trip = (S.trips || []).find(t => String(t.id) === String(b.tripId));
        const plantStr = trip ? trip.plant : 'General Expense';
        const amtVND = (b.currency || 'VND').toUpperCase() === 'VND' ? (parseFloat(b.amount) || 0) : (parseFloat(b.vndAmount) || 0);
        bHtml += `
          <div class="cc-item-row expense" onclick="openEditBillFromScreen('${b.id}')" style="cursor:pointer;">
            <div style="flex:1;min-width:0;padding-right:8px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                <span style="font-size:13px;font-weight:700;color:var(--n800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.detail || 'Bill'}</span>
              </div>
              <div style="font-size:11px;color:var(--n500);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                📅 ${fmtDate(b.date)} • 🏭 ${plantStr}
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-size:13px;font-weight:800;color:#DC2626;font-family:var(--mono);">
                -${fmtAmt(amtVND, 'VND')} ₫
              </div>
              <div style="font-size:10px;color:var(--n500);margin-top:2px;">
                💳 Credit Card
              </div>
            </div>
          </div>`;
      });
      billsContainer.innerHTML = bHtml;
    }
  }

  // 5. Render Transfers List
  const transfersContainer = document.getElementById('cc-transfers-list-container');
  if (transfersContainer) {
    if (!filteredTransfers.length) {
      transfersContainer.innerHTML = `
        <div class="empty" style="padding:24px 12px;background:#fff;border-radius:var(--rs);border:1px dashed var(--n200);">
          <div class="ei">🏦</div>
          <div class="et">No transfers recorded</div>
          <div class="es">When the company pays your travel claim, click "Transfer Back to Card" above to clear the card debt.</div>
        </div>`;
    } else {
      let tHtml = '';
      filteredTransfers.forEach(tr => {
        const trip = (S.trips || []).find(t => String(t.id) === String(tr.tripId));
        const plantStr = trip ? ` • 🏭 ${trip.plant}` : '';
        tHtml += `
          <div class="cc-item-row transfer">
            <div style="flex:1;min-width:0;padding-right:8px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                <span style="font-size:13px;font-weight:700;color:#166534;">+${fmtAmt(tr.amount, 'VND')} ₫</span>
                <span class="badge" style="font-size:10px;padding:1px 6px;background:#DCFCE7;color:#166534;font-weight:700;">Reimbursed</span>
              </div>
              <div style="font-size:11px;color:var(--n600);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                📅 ${fmtDate(tr.date)}${plantStr}
              </div>
              ${tr.note ? `<div style="font-size:11px;color:var(--n500);margin-top:2px;font-style:italic;">💬 ${tr.note}</div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
              <button type="button" class="btn btn-sm btn-o" onclick="openTransferBackModal('${tr.id}')" style="font-size:11px;padding:4px 7px;">✏️</button>
              <button type="button" class="btn btn-sm btn-o" onclick="deleteTransferBack('${tr.id}')" style="font-size:11px;padding:4px 7px;color:#DC2626;">🗑️</button>
            </div>
          </div>`;
      });
      transfersContainer.innerHTML = tHtml;
    }
  }

  // Restore sub-tab active state
  switchCreditCardSubTab(_currentCreditCardSubTab);
}

/**
 * Open Modal to set Card Budget & Limit
 */
function openSetCardBudgetModal() {
  ensureCreditCardState();
  const nameInput = document.getElementById('cc-input-name');
  const budgetInput = document.getElementById('cc-input-budget');
  if (nameInput) nameInput.value = S.creditCard.cardName || '';
  if (budgetInput) budgetInput.value = S.creditCard.budget || 50000000;
  updateCardBudgetHint();
  openModal('modal-card-budget');
}

/**
 * Update hint below budget input with formatted VND
 */
function updateCardBudgetHint() {
  const el = document.getElementById('cc-input-budget');
  const hint = document.getElementById('cc-input-budget-hint');
  if (!el || !hint) return;
  const val = parseFloat(el.value) || 0;
  hint.textContent = val > 0 ? `≈ ${fmtAmt(val, 'VND')} VND` : '';
}

/**
 * Save Card Budget & Limit
 */
function saveCardBudget() {
  ensureCreditCardState();
  const nameInput = document.getElementById('cc-input-name');
  const budgetInput = document.getElementById('cc-input-budget');

  const budgetVal = parseFloat(budgetInput ? budgetInput.value : 0);
  if (!budgetVal || budgetVal <= 0) {
    showToast('Please enter a valid card budget / limit');
    return;
  }

  S.creditCard.budget = budgetVal;
  S.creditCard.cardName = (nameInput && nameInput.value.trim()) || 'Corporate Credit Card';
  S.creditCard.updatedAt = new Date().toISOString();

  sv();
  closeModal('modal-card-budget');
  renderCreditCardScreen();
  showToast('✓ Credit card budget updated');
}

/**
 * Open Modal to record a reimbursement payment transferred back to card
 */
function openTransferBackModal(transferId) {
  ensureCreditCardState();
  const idInput = document.getElementById('cc-transfer-id');
  const amtInput = document.getElementById('cc-transfer-amount');
  const dateInput = document.getElementById('cc-transfer-date');
  const tripSel = document.getElementById('cc-transfer-trip');
  const noteInput = document.getElementById('cc-transfer-note');
  const titleEl = document.getElementById('cc-transfer-modal-title');

  // Populate trips dropdown
  if (tripSel) {
    const trips = typeof getSortedTrips === 'function' ? getSortedTrips() : [...(S.trips || [])];
    let opts = '<option value="">— Not linked to specific trip —</option>';
    trips.forEach(t => {
      opts += `<option value="${t.id}">🏭 ${t.plant} (${fmtDate(t.date)})</option>`;
    });
    tripSel.innerHTML = opts;
  }

  if (transferId) {
    const item = (S.creditCard.transfers || []).find(t => String(t.id) === String(transferId));
    if (!item) {
      showToast('Transfer record not found');
      return;
    }
    if (idInput) idInput.value = item.id;
    if (amtInput) amtInput.value = item.amount;
    if (dateInput) dateInput.value = item.date || '';
    if (tripSel) tripSel.value = item.tripId || '';
    if (noteInput) noteInput.value = item.note || '';
    if (titleEl) titleEl.textContent = '✏️ Edit Card Transfer';
  } else {
    if (idInput) idInput.value = '';
    if (amtInput) amtInput.value = '';
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    if (tripSel) tripSel.value = '';
    if (noteInput) noteInput.value = '';
    if (titleEl) titleEl.textContent = '➕ Transfer Back to Card';
  }

  updateCardTransferHint();
  openModal('modal-card-transfer');
}

/**
 * Set today's date in transfer modal
 */
function setCardTransferToday() {
  const el = document.getElementById('cc-transfer-date');
  if (el) el.value = new Date().toISOString().slice(0, 10);
}

/**
 * Update hint below transfer amount input
 */
function updateCardTransferHint() {
  const el = document.getElementById('cc-transfer-amount');
  const hint = document.getElementById('cc-transfer-amount-hint');
  if (!el || !hint) return;
  const val = parseFloat(el.value) || 0;
  hint.textContent = val > 0 ? `≈ ${fmtAmt(val, 'VND')} VND` : '';
}

/**
 * Save Transfer Back to Credit Card
 */
function saveTransferBack() {
  ensureCreditCardState();
  const idInput = document.getElementById('cc-transfer-id');
  const amtInput = document.getElementById('cc-transfer-amount');
  const dateInput = document.getElementById('cc-transfer-date');
  const tripSel = document.getElementById('cc-transfer-trip');
  const noteInput = document.getElementById('cc-transfer-note');

  const amt = parseFloat(amtInput ? amtInput.value : 0);
  if (!amt || amt <= 0) {
    showToast('Please enter a valid amount');
    return;
  }
  const date = dateInput ? dateInput.value : '';
  if (!date) {
    showToast('Please select transfer date');
    return;
  }

  const transferId = idInput && idInput.value;
  if (transferId) {
    const existing = S.creditCard.transfers.find(t => String(t.id) === String(transferId));
    if (existing) {
      existing.amount = amt;
      existing.date = date;
      existing.tripId = tripSel ? tripSel.value : '';
      existing.note = (noteInput && noteInput.value.trim()) || '';
      existing.updatedAt = new Date().toISOString();
    }
  } else {
    const newTransfer = {
      id: 'cct_' + Date.now(),
      amount: amt,
      date: date,
      tripId: tripSel ? tripSel.value : '',
      note: (noteInput && noteInput.value.trim()) || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    S.creditCard.transfers.unshift(newTransfer);
  }

  sv();
  closeModal('modal-card-transfer');
  renderCreditCardScreen();
  showToast('✓ Transferred back to card');
}

/**
 * Delete a transfer back record
 */
async function deleteTransferBack(transferId) {
  if (!transferId) return;
  const ok = await appConfirm('Delete this card transfer record? This cannot be undone.', {
    title: 'Delete Card Transfer',
    danger: true,
    confirmText: 'Delete Record',
    icon: '💳'
  });
  if (!ok) return;

  ensureCreditCardState();
  S.creditCard.transfers = S.creditCard.transfers.filter(t => String(t.id) !== String(transferId));
  sv();
  renderCreditCardScreen();
  showToast('✓ Transfer record deleted');
}



