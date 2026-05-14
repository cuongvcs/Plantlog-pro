'use strict';
// =====================================================
// PlantLog Pro — inspection.js
// Daily inspection records: checklist items, readings,
// issues — added anytime during a trip. Selected into
// the report when generating PDF.
// =====================================================

// ═══════ STATE ═══════
let inspTab     = 'all';
let inspTypeVal = 'check';
let editingInspId = null;

// ═══════ OPEN / CLOSE ═══════
function openInspectionScreen(){
  const tr = S.trips.find(t => t.id === curTrip);
  if(!tr) return;
  document.getElementById('insp-screen-title').textContent = tr.plant + ' — Inspections';
  document.getElementById('insp-screen-sub').textContent = fmtDate(tr.date) + (tr.dateEnd&&tr.dateEnd!==tr.date?' → '+fmtDate(tr.dateEnd):'');
  // Default date filter to today if within trip range
  const today = new Date().toISOString().slice(0,10);
  const inTrip = today >= (tr.date||'') && today <= (tr.dateEnd||tr.date||'');
  const df = document.getElementById('insp-date-filter');
  if(df) df.value = inTrip ? today : (tr.date||'');
  inspTab = 'all';
  ['all','check','reading','issue'].forEach(t => {
    const b = document.getElementById('insp-tab-'+t);
    if(b) b.classList.toggle('active', t==='all');
  });
  showScreen('inspection');
}

function closeInspectionScreen(){
  showScreen('trip-detail');
  // Refresh inspection counts on trip detail
  renderTripInspCounts();
}

// ═══════ RENDER INSPECTION SCREEN ═══════
function setInspTab(tab){
  inspTab = tab;
  ['all','check','reading','issue'].forEach(t => {
    const b = document.getElementById('insp-tab-'+t);
    if(b) b.classList.toggle('active', t===tab);
  });
  renderInspectionScreen();
}

function renderInspectionScreen(){
  const body = document.getElementById('insp-body');
  if(!body) return;
  let items = (S.inspections||[]).filter(i => i.tripId === curTrip);

  // Filter by tab type
  if(inspTab !== 'all') items = items.filter(i => i.type === inspTab);

  // Filter by date
  const df = document.getElementById('insp-date-filter');
  const dateFilter = df ? df.value : '';
  if(dateFilter) items = items.filter(i => i.date === dateFilter);

  // Sort: newest first
  items.sort((a,b) => (b.date||'').localeCompare(a.date||'') || (b.createdAt||'').localeCompare(a.createdAt||''));

  // Summary counts
  const all  = (S.inspections||[]).filter(i => i.tripId === curTrip);
  const chk  = all.filter(i => i.type==='check').length;
  const rds  = all.filter(i => i.type==='reading').length;
  const iss  = all.filter(i => i.type==='issue').length;
  const sumEl = document.getElementById('insp-summary-bar');
  if(sumEl) sumEl.textContent = `☑ ${chk} checks  ·  📊 ${rds} readings  ·  ⚠️ ${iss} issues`;

  if(!items.length){
    const typeLabel = {all:'inspection records',check:'checklist items',reading:'readings',issue:'issues'}[inspTab];
    body.innerHTML = `<div class="empty">
      <div class="ei">${inspTab==='check'?'☑':inspTab==='reading'?'📊':inspTab==='issue'?'⚠️':'📋'}</div>
      <div class="et">No ${typeLabel} yet${dateFilter?' for '+fmtDate(dateFilter):''}.<br>Tap ＋ to add one.</div>
    </div>`;
    return;
  }

  // Group by date
  const byDate = {};
  items.forEach(i => { const d=i.date||''; if(!byDate[d]) byDate[d]=[]; byDate[d].push(i); });

  let html = '';
  Object.entries(byDate).forEach(([date, dayItems]) => {
    html += `<div style="font-size:11px;font-weight:700;color:var(--brand);letter-spacing:0.06em;margin:10px 0 5px;padding-left:2px;">
      📅 ${fmtDate(date)} <span style="color:var(--n400);font-weight:500;">(${dayItems.length})</span>
    </div>`;
    dayItems.forEach(item => { html += renderInspCard(item); });
  });

  body.innerHTML = html;
}

function renderInspCard(item){
  if(item.type === 'check'){
    const res = item.result;
    const resColor = res==='pass'?'var(--brand)':res==='fail'?'var(--red)':res==='na'?'var(--n400)':'var(--n300)';
    const resLabel = res==='pass'?'✅ Pass':res==='fail'?'❌ Fail':res==='na'?'— N/A':'⬜ Pending';
    return `<div style="background:#fff;border-radius:var(--r);box-shadow:var(--sh);border:1px solid var(--n150);border-left:3px solid ${resColor};padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;color:var(--n800);">${item.name}</div>
        ${item.note?`<div style="font-size:11px;color:var(--n500);margin-top:2px;">${item.note}</div>`:''}
      </div>
      <span style="color:${resColor};font-size:12px;font-weight:700;flex-shrink:0;">${resLabel}</span>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button onclick="editInspectionItem('${item.id}')" style="width:26px;height:26px;border-radius:var(--rs);border:1px solid var(--n200);background:#fff;cursor:pointer;font-size:12px;">✏️</button>
        <button onclick="deleteInspectionItem('${item.id}')" style="width:26px;height:26px;border-radius:var(--rs);border:1px solid rgba(192,57,43,0.2);background:var(--rl);cursor:pointer;font-size:12px;color:var(--rd);">×</button>
      </div>
    </div>`;
  }
  if(item.type === 'reading'){
    const isCond = item.rdType === 'condition';
    const valColor = isCond
      ? (item.condition==='ok'?'var(--brand)':item.condition==='notok'?'var(--red)':'var(--amber)')
      : (item.measStatus==='bad'?'var(--red)':item.measStatus==='na'?'var(--n400)':'var(--brand)');
    const valText = isCond
      ? (item.condition==='ok'?'✅ OK':item.condition==='notok'?'❌ Not OK':'⚠ Other')
      : ((item.value||'?')+' '+(item.unit||''));
    return `<div style="background:#fff;border-radius:var(--r);box-shadow:var(--sh);border:1px solid var(--n150);border-left:3px solid ${valColor};padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;color:var(--n800);">${item.name}
          ${item.tag?`<span style="font-family:var(--mono);font-size:10px;color:var(--brand);margin-left:6px;">[${item.tag}]</span>`:''}
        </div>
        ${item.notes?`<div style="font-size:11px;color:var(--n500);margin-top:2px;">${item.notes}</div>`:''}
      </div>
      <span style="color:${valColor};font-family:var(--mono);font-size:13px;font-weight:700;flex-shrink:0;">${valText}</span>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button onclick="editInspectionItem('${item.id}')" style="width:26px;height:26px;border-radius:var(--rs);border:1px solid var(--n200);background:#fff;cursor:pointer;font-size:12px;">✏️</button>
        <button onclick="deleteInspectionItem('${item.id}')" style="width:26px;height:26px;border-radius:var(--rs);border:1px solid rgba(192,57,43,0.2);background:var(--rl);cursor:pointer;font-size:12px;color:var(--rd);">×</button>
      </div>
    </div>`;
  }
  if(item.type === 'issue'){
    const sevColor = {critical:'var(--purple)',high:'var(--red)',medium:'var(--amber)',low:'var(--blue)'}[item.severity]||'var(--n400)';
    const statusLabel = {pending:'⏳',waiting_part:'🔧',processing:'🔄',done:'✅'}[item.istatus||'pending']||'⏳';
    return `<div style="background:#fff;border-radius:var(--r);box-shadow:var(--sh);border:1px solid var(--n150);border-left:3px solid ${sevColor};padding:10px 12px;margin-bottom:6px;">
      <div style="display:flex;align-items:flex-start;gap:8px;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <span style="background:${sevColor};color:#fff;border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700;text-transform:uppercase;">${item.severity}</span>
            <span style="font-size:13px;font-weight:700;color:var(--n800);">${item.title}</span>
          </div>
          ${item.description?`<div style="font-size:12px;color:var(--n600);margin-top:3px;">${item.description}</div>`:''}
          ${item.action?`<div style="font-size:11px;color:var(--n500);margin-top:3px;">→ ${item.action}</div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;">
          <span style="font-size:16px;">${statusLabel}</span>
          <div style="display:flex;gap:4px;">
            <button onclick="editInspectionItem('${item.id}')" style="width:26px;height:26px;border-radius:var(--rs);border:1px solid var(--n200);background:#fff;cursor:pointer;font-size:12px;">✏️</button>
            <button onclick="deleteInspectionItem('${item.id}')" style="width:26px;height:26px;border-radius:var(--rs);border:1px solid rgba(192,57,43,0.2);background:var(--rl);cursor:pointer;font-size:12px;color:var(--rd);">×</button>
          </div>
        </div>
      </div>
    </div>`;
  }
  return '';
}

// ═══════ ADD / EDIT ITEM ═══════
function openAddInspectionItem(){
  editingInspId = null;
  document.getElementById('insp-modal-title').textContent = 'Add Inspection Item';
  document.getElementById('insp-save-btn').textContent = '💾 Save';
  document.getElementById('insp-date').value = new Date().toISOString().slice(0,10);
  setInspType('check');
  // Clear all fields
  ['insp-check-name','insp-check-note','insp-rd-name','insp-rd-tag',
   'insp-rd-value','insp-rd-unit','insp-rd-notes',
   'insp-issue-title','insp-issue-desc','insp-issue-action'].forEach(id=>{
    const e=document.getElementById(id); if(e) e.value='';
  });
  setInspCheckResult('');
  setRdType('condition'); setCondResult('ok'); setMeasStatus('ok');
  setIssueSev('medium');
  document.getElementById('insp-type-row').style.display = '';
  openModal('modal-add-insp');
}

function editInspectionItem(id){
  const item = (S.inspections||[]).find(i => i.id === id);
  if(!item) return;
  editingInspId = id;
  document.getElementById('insp-modal-title').textContent = 'Edit Item';
  document.getElementById('insp-save-btn').textContent = '💾 Update';
  document.getElementById('insp-date').value = item.date||'';
  document.getElementById('insp-type-row').style.display = 'none'; // can't change type
  setInspType(item.type);

  if(item.type === 'check'){
    document.getElementById('insp-check-name').value = item.name||'';
    document.getElementById('insp-check-note').value = item.note||'';
    setInspCheckResult(item.result||'');
  } else if(item.type === 'reading'){
    document.getElementById('insp-rd-name').value  = item.name||'';
    document.getElementById('insp-rd-tag').value   = item.tag||'';
    document.getElementById('insp-rd-notes').value = item.notes||'';
    setRdType(item.rdType||'condition');
    if(item.rdType==='condition'){ setCondResult(item.condition||'ok'); }
    else { document.getElementById('insp-rd-value').value=item.value||''; document.getElementById('insp-rd-unit').value=item.unit||''; setMeasStatus(item.measStatus||'ok'); }
  } else if(item.type === 'issue'){
    document.getElementById('insp-issue-title').value  = item.title||'';
    document.getElementById('insp-issue-desc').value   = item.description||'';
    document.getElementById('insp-issue-action').value = item.action||'';
    setIssueSev(item.severity||'medium');
  }
  openModal('modal-add-insp');
}

function deleteInspectionItem(id){
  if(!confirm('Delete this inspection record?')) return;
  S.inspections = (S.inspections||[]).filter(i => i.id !== id);
  sv(); renderInspectionScreen(); renderTripInspCounts();
  showToast('Deleted');
}

// ═══════ TYPE / RESULT HELPERS ═══════
function setInspType(type){
  inspTypeVal = type;
  document.getElementById('insp-type-val').value = type;
  ['check','reading','issue'].forEach(t => {
    const btn = document.getElementById('it-'+t);
    if(btn){ btn.classList.toggle('sel', t===type); }
  });
  document.getElementById('insp-check-fields').style.display   = type==='check'?'':'none';
  document.getElementById('insp-reading-fields').style.display = type==='reading'?'':'none';
  document.getElementById('insp-issue-fields').style.display   = type==='issue'?'':'none';
}
function setInspCheckResult(r){
  ['pass','fail','na'].forEach(v=>{
    const b=document.getElementById('icr-'+v); if(b) b.classList.toggle('sel',v===r);
  });
  const h=document.getElementById('insp-check-name');
  if(h) h.dataset.result = r;
  // Store on a hidden input
  let hi = document.getElementById('insp-check-result-val');
  if(!hi){ hi=document.createElement('input'); hi.type='hidden'; hi.id='insp-check-result-val'; document.getElementById('insp-check-fields').appendChild(hi); }
  hi.value = r;
}
function setRdType(type){
  document.getElementById('insp-rd-type').value = type;
  ['cond','meas'].forEach(t=>{
    const b=document.getElementById('rdt-'+t); if(b) b.classList.toggle('sel',t===(type==='condition'?'cond':'meas'));
  });
  document.getElementById('insp-cond-fields').style.display = type==='condition'?'':'none';
  document.getElementById('insp-meas-fields').style.display = type==='measurement'?'':'none';
}
function setCondResult(r){
  document.getElementById('insp-cond-val').value = r;
  ['ok','notok','other'].forEach(v=>{const b=document.getElementById('cond-'+v);if(b)b.classList.toggle('sel',v===r);});
}
function setMeasStatus(r){
  document.getElementById('insp-meas-status').value = r;
  ['ok','bad','na'].forEach(v=>{const b=document.getElementById('meas-'+v);if(b)b.classList.toggle('sel',v===r);});
}
function setIssueSev(sev){
  document.getElementById('insp-issue-sev').value = sev;
  ['low','medium','high','critical'].forEach(v=>{const b=document.getElementById('isev-'+v);if(b)b.classList.toggle('sel',v===sev);});
}

// ═══════ SAVE ═══════
function saveInspectionItem(){
  const type = document.getElementById('insp-type-val').value;
  const date = document.getElementById('insp-date').value;
  if(!date){ showToast('Select a date'); return; }

  let item = { id: editingInspId||('insp_'+Date.now()), tripId: curTrip, type, date };

  if(type === 'check'){
    const name = document.getElementById('insp-check-name').value.trim();
    if(!name){ showToast('Enter item name'); return; }
    const rv = document.getElementById('insp-check-result-val');
    item.name   = name;
    item.result = rv ? rv.value : '';
    item.note   = document.getElementById('insp-check-note').value.trim();
  } else if(type === 'reading'){
    const name = document.getElementById('insp-rd-name').value.trim();
    if(!name){ showToast('Enter reading name'); return; }
    const rdType = document.getElementById('insp-rd-type').value;
    item.name     = name;
    item.tag      = document.getElementById('insp-rd-tag').value.trim();
    item.rdType   = rdType;
    item.notes    = document.getElementById('insp-rd-notes').value.trim();
    if(rdType === 'condition'){
      item.condition = document.getElementById('insp-cond-val').value;
    } else {
      const val = document.getElementById('insp-rd-value').value.trim();
      if(!val){ showToast('Enter a value'); return; }
      item.value      = val;
      item.unit       = document.getElementById('insp-rd-unit').value.trim();
      item.measStatus = document.getElementById('insp-meas-status').value;
    }
  } else if(type === 'issue'){
    const title = document.getElementById('insp-issue-title').value.trim();
    if(!title){ showToast('Enter issue title'); return; }
    item.title       = title;
    item.severity    = document.getElementById('insp-issue-sev').value;
    item.description = document.getElementById('insp-issue-desc').value.trim();
    item.action      = document.getElementById('insp-issue-action').value.trim();
    item.istatus     = 'pending';
    item.photos      = [];
  }

  item.createdAt = editingInspId
    ? ((S.inspections||[]).find(i=>i.id===editingInspId)||{}).createdAt || new Date().toISOString()
    : new Date().toISOString();

  if(!S.inspections) S.inspections=[];
  if(editingInspId){
    const idx = S.inspections.findIndex(i=>i.id===editingInspId);
    if(idx>=0) S.inspections[idx] = item;
  } else {
    S.inspections.push(item);
  }
  sv();
  closeModal('modal-add-insp');
  renderInspectionScreen();
  renderTripInspCounts();
  showToast(editingInspId ? 'Updated ✓' : 'Saved ✓');
  editingInspId = null;
}

// ═══════ TRIP DETAIL COUNTS ═══════
function renderTripInspCounts(){
  const el = document.getElementById('trip-insp-counts');
  if(!el || !curTrip) return;
  const items = (S.inspections||[]).filter(i => i.tripId === curTrip);
  if(!items.length){ el.innerHTML=''; return; }
  const chk = items.filter(i=>i.type==='check').length;
  const rds = items.filter(i=>i.type==='reading').length;
  const iss = items.filter(i=>i.type==='issue').length;
  const chip = (icon,count,color) => count?`<span style="background:${color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">${icon} ${count}</span>`:'';
  el.innerHTML = chip('☑',chk,'var(--brand-light)')+chip('📊',rds,'var(--bl)')+chip('⚠️',iss,'var(--rl)');
}

// ═══════ REPORT PICKER ═══════
let ripTab = 'check';
let ripSelected = {check:new Set(), reading:new Set(), issue:new Set()};

function openReportInspPicker(){
  const tr = S.trips.find(t=>t.id===curTrip);
  const nameEl = document.getElementById('rip-trip-name');
  if(nameEl && tr) nameEl.textContent = tr.plant+' · '+fmtDate(tr.date);

  // Pre-select items already in curReport
  ripSelected = {check:new Set(), reading:new Set(), issue:new Set()};
  if(curReport){
    (curReport.checklist||[]).forEach(c => { if(c.inspId) ripSelected.check.add(c.inspId); });
    (curReport.readings||[]).forEach(r  => { if(r.inspId)  ripSelected.reading.add(r.inspId); });
    (curReport.issues||[]).forEach(i    => { if(i.inspId)  ripSelected.issue.add(i.inspId); });
  }

  ripTab = 'check';
  renderRipTab();
  openModal('modal-report-insp-picker');
}

function setRipTab(tab){
  ripTab = tab;
  ['check','reading','issue'].forEach(t=>{
    const b=document.getElementById('rip-tab-'+t);
    if(b){ b.style.background=t===tab?'var(--brand)':'transparent'; b.style.color=t===tab?'#fff':'var(--n500)'; }
  });
  renderRipTab();
}

function renderRipTab(){
  const list = document.getElementById('rip-list');
  if(!list) return;
  const items = (S.inspections||[]).filter(i=>i.tripId===curTrip && i.type===ripTab);

  if(!items.length){
    const label={check:'checklist items',reading:'readings',issue:'issues'}[ripTab];
    list.innerHTML=`<div style="text-align:center;padding:20px;color:var(--n400);font-size:13px;">No ${label} recorded for this trip.<br><button onclick="closeModal('modal-report-insp-picker');openInspectionScreen()" style="color:var(--brand);background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;font-family:var(--font);">+ Add ${ripTab}</button></div>`;
    return;
  }

  items.sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.name||a.title||'').localeCompare(b.name||b.title||''));
  list.innerHTML = items.map(item=>{
    const sel = ripSelected[ripTab].has(item.id);
    const label = item.type==='check'?item.name:(item.type==='reading'?item.name:item.title)||'';
    const sub   = item.type==='check'?(item.result?{pass:'✅ Pass',fail:'❌ Fail',na:'— N/A'}[item.result]||'Pending':'Pending')
                 :item.type==='reading'?(item.rdType==='condition'?({ok:'OK',notok:'Not OK',other:'Other'}[item.condition]||'—'):(item.value+' '+(item.unit||'')))
                 :({low:'Low',medium:'Medium',high:'High',critical:'Critical'}[item.severity]||'Medium');
    return `<div onclick="ripToggle('${item.id}')"
      style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--n100);cursor:pointer;background:${sel?'var(--brand-light)':'#fff'};transition:background 0.1s;">
      <div style="width:22px;height:22px;border-radius:6px;border:1.5px solid ${sel?'var(--brand)':'var(--n300)'};background:${sel?'var(--brand)':'#fff'};display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;transition:all 0.1s;">
        ${sel?'<span style="color:#fff;">✓</span>':''}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:${sel?'700':'500'};color:var(--n800);line-height:1.3;">${label}</div>
        <div style="font-size:11px;color:var(--n500);margin-top:1px;">${fmtDate(item.date)} · ${sub}</div>
      </div>
    </div>`;
  }).join('');
}

function ripToggle(id){
  if(ripSelected[ripTab].has(id)) ripSelected[ripTab].delete(id);
  else ripSelected[ripTab].add(id);
  renderRipTab();
}
function ripSelectAll(){
  (S.inspections||[]).filter(i=>i.tripId===curTrip&&i.type===ripTab).forEach(i=>ripSelected[ripTab].add(i.id));
  renderRipTab();
}
function ripClearAll(){ ripSelected[ripTab].clear(); renderRipTab(); }

function applyInspectionPicker(){
  if(!curReport) return;

  // Apply selected checklist items
  const selChecks   = [...ripSelected.check];
  const selReadings = [...ripSelected.reading];
  const selIssues   = [...ripSelected.issue];
  const insp        = S.inspections||[];

  // Build checklist from selected check items
  const existingInspIds = new Set((curReport.checklist||[]).map(c=>c.inspId).filter(Boolean));
  selChecks.forEach(id => {
    if(existingInspIds.has(id)) return;
    const item = insp.find(i=>i.id===id);
    if(!item) return;
    curReport.checklist.push({id:'ci'+Date.now()+'_'+Math.random(), inspId:id, name:item.name, note:item.note||'', result:item.result||''});
  });
  // Remove unchecked ones that were added from inspections
  curReport.checklist = (curReport.checklist||[]).filter(c => !c.inspId || selChecks.includes(c.inspId));

  // Build readings
  const existingRdIds = new Set((curReport.readings||[]).map(r=>r.inspId).filter(Boolean));
  selReadings.forEach(id => {
    if(existingRdIds.has(id)) return;
    const item = insp.find(i=>i.id===id);
    if(!item) return;
    curReport.readings.push({
      id:'rd'+Date.now()+'_'+Math.random(), inspId:id,
      name:item.name, tag:item.tag||'', type:item.rdType||'condition',
      value:item.value||'', unit:item.unit||'',
      condition:item.condition||'ok', status:item.measStatus||'ok', notes:item.notes||''
    });
  });
  curReport.readings = (curReport.readings||[]).filter(r => !r.inspId || selReadings.includes(r.inspId));

  // Build issues
  const existingIssIds = new Set((curReport.issues||[]).map(i=>i.inspId).filter(Boolean));
  selIssues.forEach(id => {
    if(existingIssIds.has(id)) return;
    const item = insp.find(i=>i.id===id);
    if(!item) return;
    curReport.issues.push({
      id:'is'+Date.now()+'_'+Math.random(), inspId:id,
      title:item.title, description:item.description||'',
      severity:item.severity||'medium', action:item.action||'',
      photos:[], istatus:item.istatus||'pending'
    });
  });
  curReport.issues = (curReport.issues||[]).filter(i => !i.inspId || selIssues.includes(i.inspId));

  sv();
  closeModal('modal-report-insp-picker');
  const total = selChecks.length + selReadings.length + selIssues.length;
  showToast(`${total} item${total!==1?'s':''} added to report ✓`);

  // Go back to report at checklist step
  gotoStep(0);
}
