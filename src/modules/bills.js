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

function setBillFilter(f) {
  billFilter = f;
  ['all','trip','month'].forEach(id => {
    const el = document.getElementById('bf-' + id);
    if (el) el.classList.toggle('active', id === f);
  });
  renderBillsScreen();
}

function openAddBillFromScreen() {
  // Open add bill modal without pre-selecting a trip
  editingBillId = null;
  tmpBillPhotos = [];
  document.getElementById('bill-modal-title').textContent = 'Add Bill';
  document.getElementById('bill-edit-id').textContent = '';
  document.getElementById('bill-save-btn').textContent = '💾 Save Bill';
  ['bill-detail','bill-number','bill-amount','bill-notes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('bill-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('bill-currency').value = 'VND';
  document.getElementById('bill-category').value = 'other';
  const vndElS=document.getElementById('bill-vnd');if(vndElS)vndElS.value='';
  toggleVNDRow();
  renderBillPhotoGrid();
  // Populate trip selector for linking
  const tripSel = document.getElementById('bill-trip-select');
  if (tripSel) {
    tripSel.innerHTML = '<option value="">No trip link</option>' +
      S.trips.map(t => `<option value="${t.id}">${t.plant} (${fmtDate(t.date)})</option>`).join('');
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

  if (billFilter === 'month') {
    bills = bills.filter(b => (b.date || '').startsWith(thisMonth));
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
  return `<div style="padding:10px 12px;border-bottom:1px solid var(--g100);">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
      <div style="flex:1;min-width:0;">
        ${b.billNumber ? `<div style="font-size:10px;font-weight:600;color:var(--g500);letter-spacing:0.04em;">RECEIPT #${b.billNumber}</div>` : ''}
        <div style="font-size:13px;font-weight:600;color:var(--g800);margin-top:1px;">${b.detail}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
          <span style="background:var(--al);color:#92400E;padding:1px 7px;border-radius:10px;font-size:10px;">${catIcon} ${catLabel}</span>
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

function deleteBillFromScreen(id) {
  if (!confirm('Delete this bill?')) return;
  S.bills = S.bills.filter(b => b.id !== id);
  sv(); renderBillsScreen(); renderDash(); svAndSync('bill_delete');
}

// ── Bill Export PDF ──────────────────────────────────────────
function openBillExport() {
  const sel = document.getElementById('bill-pdf-trip');
  if (sel) {
    sel.innerHTML = '<option value="all">All trips</option>' +
      S.trips.map(t => `<option value="${t.id}">${t.plant} — ${fmtDate(t.date)}</option>`).join('');
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
        return `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid var(--g100);">
          <div><div style="font-weight:500;">${catIcon} ${b.billNumber?'[#'+b.billNumber+'] ':''}${b.detail}</div>
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
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
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
        const meta=[catLabel,b.notes].filter(Boolean).join('  ·  ');if(meta){doc.setFontSize(8);doc.setTextColor(120,120,120);doc.text(meta,mg+6,y);y+=4;}
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
  doc.save(`Bills_${safeName}_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.pdf`);showToast('Bills PDF downloaded ✓');
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

