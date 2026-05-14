'use strict';
// =====================================================
// PlantLog Pro — library.js
// Inspection Library: reusable checklists, readings,
// issue templates. Report start picker.
// =====================================================

// ═══════ LIBRARY STATE ═══════
let libTab = 'checklist';
let editingLibId = null;
let libClItems  = [];  // temp checklist items while editing
let libRdItems  = [];  // temp reading items while editing

// ═══════ LIBRARY SCREEN ═══════
function setLibTab(tab){
  libTab = tab;
  ['checklist','readings','issues'].forEach(t => {
    const btn = document.getElementById('lib-tab-'+t);
    if(btn) btn.classList.toggle('active', t===tab);
  });
  renderLibrary();
}

function renderLibrary(){
  const body = document.getElementById('lib-body');
  if(!body) return;
  const items = (S.library||[]).filter(i => i.type === libTab);

  if(!items.length){
    const typeLabel = {checklist:'checklist',readings:'reading template',issues:'issue template'}[libTab]||libTab;
    body.innerHTML = `<div class="empty">
      <div class="ei">${libTab==='checklist'?'☑':libTab==='readings'?'📊':'⚠️'}</div>
      <div class="et">No ${typeLabel}s saved yet.<br>Tap + to create one.</div>
    </div>`;
    return;
  }

  body.innerHTML = items
    .sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''))
    .map(item => {
      const count = (item.items||[]).length;
      const typeIcon = {checklist:'☑',readings:'📊',issues:'⚠️'}[item.type]||'📋';
      return `<div class="card" style="margin-bottom:8px;">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <div style="font-size:22px;flex-shrink:0;">${typeIcon}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-family:var(--font-hd);font-size:14px;font-weight:700;color:var(--n800);margin-bottom:3px;">${item.name}</div>
            <div style="font-size:12px;color:var(--n500);">
              ${count} ${item.type==='checklist'?'item':(item.type==='readings'?'reading':'template')}${count!==1?'s':''}
              ${item.createdAt?'· '+fmtDate(item.createdAt.slice(0,10)):''}
            </div>
            <!-- Preview items -->
            ${(item.items||[]).slice(0,3).map(it =>
              `<div style="font-size:11px;color:var(--n600);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${item.type==='checklist'?'• '+(it.name||it):
                  item.type==='readings'?'• '+(it.name||it.tag||it)+' ['+(it.type||'condition')+']'+(it.unit?' ('+it.unit+')':''):
                  '⚠ '+(it.name||it.title||it)}
              </div>`
            ).join('')}
            ${count>3?`<div style="font-size:11px;color:var(--n400);margin-top:2px;">+${count-3} more…</div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;">
            <button onclick="editLibraryItem('${item.id}')"
              style="padding:5px 10px;border:1px solid var(--n200);border-radius:var(--rs);background:#fff;font-size:11px;font-weight:600;color:var(--n600);cursor:pointer;">✏️ Edit</button>
            <button onclick="deleteLibraryItem('${item.id}')"
              style="padding:5px 10px;border:1px solid rgba(192,57,43,0.2);border-radius:var(--rs);background:var(--rl);font-size:11px;font-weight:600;color:var(--rd);cursor:pointer;">🗑 Delete</button>
          </div>
        </div>
      </div>`;
    }).join('');
}

function deleteLibraryItem(id){
  if(!confirm('Delete this library item?')) return;
  S.library = (S.library||[]).filter(i => i.id !== id);
  sv(); renderLibrary();
  showToast('Deleted');
}

// ═══════ ADD / EDIT LIBRARY ITEM ═══════
function openAddLibraryItem(){
  editingLibId = null;
  libClItems = [];
  libRdItems = [];
  document.getElementById('lib-modal-title').textContent = 'Add to Library';
  document.getElementById('lib-item-name').value = '';
  document.getElementById('lib-item-type').value = libTab;
  document.getElementById('lib-item-type').disabled = false;
  document.getElementById('lib-type-row').style.display = '';
  if(document.getElementById('lib-issue-sev')) document.getElementById('lib-issue-sev').value = 'medium';
  if(document.getElementById('lib-issue-desc')) document.getElementById('lib-issue-desc').value = '';
  if(document.getElementById('lib-issue-action')) document.getElementById('lib-issue-action').value = '';
  renderLibItemFields();
  openModal('modal-add-library');
}

function editLibraryItem(id){
  const item = (S.library||[]).find(i => i.id === id);
  if(!item) return;
  editingLibId = id;
  document.getElementById('lib-modal-title').textContent = 'Edit Library Item';
  document.getElementById('lib-item-name').value = item.name||'';
  document.getElementById('lib-item-type').value = item.type||'checklist';
  document.getElementById('lib-item-type').disabled = true; // can't change type when editing
  // Load existing items
  if(item.type==='checklist'){
    libClItems = (item.items||[]).map(i => typeof i==='string'?{id:'lci_'+Date.now()+'_'+Math.random(),text:i}:{...i});
    libRdItems = [];
  } else if(item.type==='readings'){
    libRdItems = (item.items||[]).map(i => ({...i, id:i.id||'lrd_'+Date.now()+'_'+Math.random()}));
    libClItems = [];
  } else {
    // issues — single template item
    libClItems = []; libRdItems = [];
    const it = (item.items||[])[0]||{};
    if(document.getElementById('lib-issue-sev')) document.getElementById('lib-issue-sev').value = it.severity||'medium';
    if(document.getElementById('lib-issue-desc')) document.getElementById('lib-issue-desc').value = it.desc||'';
    if(document.getElementById('lib-issue-action')) document.getElementById('lib-issue-action').value = it.action||'';
  }
  renderLibItemFields();
  openModal('modal-add-library');
}

function renderLibItemFields(){
  const type = document.getElementById('lib-item-type').value;
  document.getElementById('lib-checklist-fields').style.display = type==='checklist'?'':'none';
  document.getElementById('lib-readings-fields').style.display  = type==='readings'?'':'none';
  document.getElementById('lib-issues-fields').style.display    = type==='issues'?'':'none';
  if(type==='checklist') renderLibClItems();
  if(type==='readings')  renderLibRdItems();
}

// ── Checklist lib items ──
function addLibClItem(){
  const inp = document.getElementById('lib-cl-input');
  const val = inp.value.trim();
  if(!val) return;
  libClItems.push({id:'lci_'+Date.now(), text:val});
  inp.value='';
  renderLibClItems();
  inp.focus();
}
function removeLibClItem(id){ libClItems=libClItems.filter(i=>i.id!==id); renderLibClItems(); }
function renderLibClItems(){
  const el = document.getElementById('lib-cl-items');
  if(!el) return;
  el.innerHTML = libClItems.map(i=>`
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--n100);">
      <span style="flex:1;font-size:13px;color:var(--n800);">• ${i.text}</span>
      <button onclick="removeLibClItem('${i.id}')" style="width:22px;height:22px;border-radius:50%;border:none;background:var(--n100);color:var(--n500);cursor:pointer;font-size:13px;">×</button>
    </div>`).join('');
}

// ── Readings lib items ──
function addLibRdItem(){
  const name = document.getElementById('lib-rd-name').value.trim();
  if(!name){ showToast('Enter a reading name'); return; }
  const tag  = document.getElementById('lib-rd-tag').value.trim();
  const type = document.getElementById('lib-rd-type').value;
  const unit = document.getElementById('lib-rd-unit').value.trim();
  libRdItems.push({id:'lrd_'+Date.now(), name, tag, type, unit});
  ['lib-rd-name','lib-rd-tag','lib-rd-unit'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  renderLibRdItems();
}
function removeLibRdItem(id){ libRdItems=libRdItems.filter(i=>i.id!==id); renderLibRdItems(); }
function renderLibRdItems(){
  const el = document.getElementById('lib-rd-items');
  if(!el) return;
  el.innerHTML = libRdItems.map(i=>`
    <div style="display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--n100);">
      <div style="flex:1;min-width:0;">
        <span style="font-size:13px;font-weight:600;color:var(--n800);">${i.name}</span>
        ${i.tag?`<span style="font-family:var(--mono);font-size:10px;color:var(--brand);margin-left:6px;">[${i.tag}]</span>`:''}
        <span style="font-size:10px;color:var(--n400);margin-left:6px;">${i.type}${i.unit?' · '+i.unit:''}</span>
      </div>
      <button onclick="removeLibRdItem('${i.id}')" style="width:22px;height:22px;border-radius:50%;border:none;background:var(--n100);color:var(--n500);cursor:pointer;font-size:13px;">×</button>
    </div>`).join('');
}

function saveLibraryItem(){
  const name = document.getElementById('lib-item-name').value.trim();
  if(!name){ showToast('Enter a name'); return; }
  const type = document.getElementById('lib-item-type').value;

  let items = [];
  if(type==='checklist'){
    if(!libClItems.length){ showToast('Add at least one item'); return; }
    items = libClItems.map(i=>({id:i.id, name:i.text}));
  } else if(type==='readings'){
    if(!libRdItems.length){ showToast('Add at least one reading point'); return; }
    items = libRdItems.map(i=>({...i}));
  } else {
    items = [{
      name,
      severity: document.getElementById('lib-issue-sev').value,
      desc:     document.getElementById('lib-issue-desc').value.trim(),
      action:   document.getElementById('lib-issue-action').value.trim()
    }];
  }

  if(!S.library) S.library=[];
  if(editingLibId){
    const idx = S.library.findIndex(i=>i.id===editingLibId);
    if(idx>=0) S.library[idx]={...S.library[idx], name, items, updatedAt:new Date().toISOString()};
  } else {
    S.library.push({id:'lib_'+Date.now(), name, type, items, createdAt:new Date().toISOString()});
  }
  sv();
  closeModal('modal-add-library');
  renderLibrary();
  showToast(editingLibId?'Updated ✓':'Saved to library ✓');
  editingLibId=null;
}

// ═══════ REPORT START PICKER ═══════
function openReportWithPicker(){
  const tr = S.trips.find(t=>t.id===curTrip);
  if(!tr) return;

  // Show trip name
  const nameEl = document.getElementById('report-start-trip-name');
  if(nameEl) nameEl.textContent = `Trip: ${tr.plant} · ${fmtDate(tr.date)}`;

  // Show continue button if report already has data
  const existing = S.reports[tr.id];
  const hasData = existing && (
    (existing.checklist&&existing.checklist.length) ||
    (existing.readings&&existing.readings.length) ||
    (existing.issues&&existing.issues.length)
  );
  const continueDiv = document.getElementById('report-start-continue');
  if(continueDiv) continueDiv.style.display = hasData ? '' : 'none';
  if(hasData){
    const btn = document.getElementById('btn-continue-report');
    if(btn){
      const total = (existing.checklist||[]).length + (existing.readings||[]).length + (existing.issues||[]).length;
      btn.textContent = `▶ Continue (${total} item${total!==1?'s':''} already saved)`;
    }
  }

  // Populate template options from library
  const tplEl = document.getElementById('report-start-templates');
  if(tplEl){
    const checklists = (S.library||[]).filter(i=>i.type==='checklist');
    const readings   = (S.library||[]).filter(i=>i.type==='readings');
    const issues     = (S.library||[]).filter(i=>i.type==='issues');

    let html = '';
    if(!checklists.length && !readings.length && !issues.length){
      html = `<div style="font-size:12px;color:var(--n400);padding:6px 0;">No templates saved yet.
        <button onclick="closeModal('modal-report-start');showScreen('library')"
          style="color:var(--brand);background:none;border:none;cursor:pointer;font-size:12px;font-weight:600;text-decoration:underline;font-family:var(--font);">
          Go to Library →
        </button>
      </div>`;
    } else {
      const makeChip = (item, type) =>
        `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--n50);border-radius:var(--rs);margin-bottom:6px;border:1px solid var(--n150);">
          <span style="font-size:16px;">${type==='checklist'?'☑':type==='readings'?'📊':'⚠️'}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:var(--n800);">${item.name}</div>
            <div style="font-size:11px;color:var(--n500);">${(item.items||[]).length} item${(item.items||[]).length!==1?'s':''}</div>
          </div>
          <button onclick="loadLibraryIntoReport('${item.id}')"
            style="background:var(--brand);color:#fff;border:none;border-radius:var(--rs);padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);">
            Load
          </button>
        </div>`;
      [...checklists,...readings,...issues].forEach(item => { html += makeChip(item, item.type); });
    }
    tplEl.innerHTML = html;
  }

  openModal('modal-report-start');
}

function loadLibraryIntoReport(libId){
  const item = (S.library||[]).find(i=>i.id===libId);
  if(!item) return;
  const tr = S.trips.find(t=>t.id===curTrip);
  if(!tr) return;

  // Initialize or get existing report
  if(!S.reports[tr.id]){
    S.reports[tr.id]={checklist:[],readings:[],issues:[],team:[],signoff:{summary:'',result:'Completed',remarks:''},signature:'',reportTasks:[],reportTaskNotes:{}};
  }
  curReport = S.reports[tr.id];

  if(item.type==='checklist'){
    // Append items, skip duplicates
    const existing = new Set((curReport.checklist||[]).map(c=>c.name));
    (item.items||[]).forEach(i=>{
      if(!existing.has(i.name)){
        curReport.checklist.push({id:'ci'+Date.now()+'_'+Math.random(), name:i.name, note:'', result:''});
      }
    });
    showToast(`Loaded ${item.items.length} checklist items ✓`);
  } else if(item.type==='readings'){
    const existingTags = new Set((curReport.readings||[]).map(r=>r.tag||r.name));
    (item.items||[]).forEach(i=>{
      if(!existingTags.has(i.tag||i.name)){
        curReport.readings.push({
          id:'rd'+Date.now()+'_'+Math.random(),
          name:i.name, tag:i.tag||'', type:i.type||'condition',
          unit:i.unit||'', value:'', condition:'ok', status:'ok', notes:''
        });
      }
    });
    showToast(`Loaded ${item.items.length} reading points ✓`);
  } else if(item.type==='issues'){
    const tmpl = (item.items||[])[0]||{};
    curReport.issues.push({
      id:'is'+Date.now(), title:item.name,
      description:tmpl.desc||'', severity:tmpl.severity||'medium',
      action:tmpl.action||'', photos:[], istatus:'pending'
    });
    showToast(`Issue template loaded ✓`);
  }

  sv();
  closeModal('modal-report-start');
  // Open report at the right step
  const step = {checklist:0, readings:1, issues:2}[item.type]||0;
  openReportDirect(step);
}

function startReportBlank(){
  closeModal('modal-report-start');
  openReportDirect(0);
}

function startReportContinue(){
  closeModal('modal-report-start');
  openReportDirect(0);
}

function openReportDirect(step){
  const tr = S.trips.find(t=>t.id===curTrip);
  if(!tr) return;
  if(tr.status==='planned'){ tr.status='in_progress'; sv(); }
  document.getElementById('report-plant-name').textContent = tr.plant;
  document.getElementById('report-date').textContent = fmtDate(tr.date);
  if(!S.reports[tr.id]){
    S.reports[tr.id]={checklist:[],readings:[],issues:[],team:[],signoff:{summary:'',result:'Completed',remarks:''},signature:'',reportTasks:[],reportTaskNotes:{}};
  }
  curReport = S.reports[tr.id];
  if(!curReport.reportTasks) curReport.reportTasks=[];
  if(!curReport.reportTaskNotes) curReport.reportTaskNotes={};
  S.reports[tr.id] = curReport;
  gotoStep(step);
  showScreen('report');
  updateSigDate();
  document.getElementById('signoff-summary').value = curReport.signoff.summary||'';
  document.getElementById('signoff-remarks').value = curReport.signoff.remarks||'';
  signoffRes = curReport.signoff.result||'Completed';
  document.querySelectorAll('.ropt').forEach(b=>b.classList.toggle('sel',b.textContent.includes(signoffRes)));
  if(curReport.signature){
    const img=new Image();
    img.onload=()=>{sigCtx.clearRect(0,0,sigCanvas.width,sigCanvas.height);sigCtx.drawImage(img,0,0);};
    img.src=curReport.signature;
  } else {
    sigCtx.clearRect(0,0,sigCanvas.width,sigCanvas.height);
  }
}
