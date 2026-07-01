'use strict';
// =====================================================
// PlantLog — report.js
// Field report: checklist, readings, issues, PDF export
// =====================================================

// ═══════ STEPS ═══════
function gotoStep(n){
  for(let i=0;i<6;i++){
    const el=document.getElementById('step-'+i);
    if(el) el.style.display=(i===n)?'':'none';
    const tabsEl=document.getElementById('step-tabs');
    if(tabsEl&&tabsEl.children[i]){
      const tab=tabsEl.children[i];
      tab.classList.remove('active','done');
      if(i===n) tab.classList.add('active');
      else if(i<n) tab.classList.add('done');
    }
  }
  try{
    if(n===0) renderChecklist();
    if(n===1) renderReadings();
    if(n===2) renderIssues();
    if(n===3) renderTeam();
    if(n===4) renderReportTaskPicker();
    if(n===5){
      // Step 5 = Sign-off: just update date, don't auto-save
      try{ updateSigDate(); }catch(e){}
    }
  }catch(e){ console.warn('gotoStep render error step'+n+':', e.message); }
}

// ═══════ REPORT TASK PICKER ═══════

function renderReportTaskPicker(){
  if(!curReport)return;
  if(!curReport.reportTasks)curReport.reportTasks=[];
  if(!curReport.reportTaskNotes)curReport.reportTaskNotes={};

  const pickerList=document.getElementById('task-picker-list');
  const pickerEmpty=document.getElementById('task-picker-empty');
  const preview=document.getElementById('report-tasks-preview');
  if(!pickerList)return;

  // Only tasks belonging to curTrip — sorted by date ascending
  const allTasks=[...S.tasks]
    .filter(tk=>tk.tripId===curTrip)
    .sort((a,b)=>{
      const da=a.dateStart||a.date||'';
      const db=b.dateStart||b.date||'';
      return da.localeCompare(db)||a.title.localeCompare(b.title);
    });

  // Auto-select all trip tasks that haven't been explicitly deselected
  if(allTasks.length && curReport.reportTasks.length===0){
    curReport.reportTasks=allTasks.map(tk=>tk.id);
    sv();
  }

  if(!allTasks.length){
    pickerList.innerHTML='';
    if(pickerEmpty)pickerEmpty.style.display='';
  } else {
    if(pickerEmpty)pickerEmpty.style.display='none';
    const catCfg=id=>({work:{icon:'🔧',col:'var(--gd)',bg:'var(--gl)'},leave:{icon:'🌴',col:'#92400E',bg:'var(--al)'},travel:{icon:'✈️',col:'#1E40AF',bg:'var(--bl)'}}[id]||{icon:'📋',col:'var(--g600)',bg:'var(--g100)'});
    pickerList.innerHTML=allTasks.map(tk=>{
      const sel=curReport.reportTasks.includes(tk.id);
      const cc=catCfg(tk.category||'work');
      const dateStr=tk.dateStart||tk.date||'';
      const timeStr=tk.timeStart||(tk.time||'');
      const dur=calcDuration(tk);
      const statusColor=tk.status==='done'?'var(--gd)':tk.status==='in_progress'?'#92400E':'var(--g400)';
      const statusLabel=tk.status==='done'?'Done':tk.status==='in_progress'?'In Progress':'Pending';
      return `<div class="task-pick-item${sel?' selected':''}" onclick="toggleReportTask('${tk.id}')">
        <div class="task-pick-cb">✓</div>
        <div class="task-pick-info">
          <div class="task-pick-title">${tk.title}</div>
          <div class="task-pick-meta">
            ${dateStr?`<span>📅 ${fmtDate(dateStr)}${timeStr?' '+timeStr:''}</span>`:''}
            ${dur?`<span>⏱ ${dur}</span>`:''}
            <span style="background:${cc.bg};color:${cc.col};padding:1px 6px;border-radius:8px;">${cc.icon} ${(tk.category||'work')}</span>
            <span style="color:${statusColor};">● ${statusLabel}</span>
            ${tk.machine?`<span>🔩 ${tk.machine}</span>`:''}
            ${tk.plan?`<span>📁 ${tk.plan}</span>`:''}
          </div>
        </div>
      </div>`;
    }).join('');
  }

  renderReportTasksPreview();
}

function toggleReportTask(id){
  if(!curReport.reportTasks)curReport.reportTasks=[];
  const idx=curReport.reportTasks.indexOf(id);
  if(idx>=0)curReport.reportTasks.splice(idx,1);
  else curReport.reportTasks.push(id);
  sv();
  renderReportTaskPicker();
}

function selectAllReportTasks(){
  if(!curReport)return;
  curReport.reportTasks=S.tasks.map(t=>t.id);
  sv();renderReportTaskPicker();
}

function clearAllReportTasks(){
  if(!curReport)return;
  curReport.reportTasks=[];
  sv();renderReportTaskPicker();
}

function saveReportTaskNote(id){
  if(!curReport)return;
  if(!curReport.reportTaskNotes)curReport.reportTaskNotes={};
  const el=document.getElementById('rtn-'+id);
  if(el){curReport.reportTaskNotes[id]=el.value;sv();svAndSync('report_task_note');}
}

function renderReportTasksPreview(){
  const preview=document.getElementById('report-tasks-preview');
  const taskList=document.getElementById('report-tasks-list');
  const countEl=document.getElementById('selected-task-count');
  if(!preview||!taskList)return;

  const selected=(curReport.reportTasks||[]);
  if(countEl)countEl.textContent=selected.length;

  if(!selected.length){
    preview.style.display='none';
    return;
  }
  preview.style.display='';

  const catCfg=id=>({work:{icon:'🔧',col:'var(--gd)',cls:'work'},leave:{icon:'🌴',col:'#92400E',cls:'leave'},travel:{icon:'✈️',col:'#1E40AF',cls:'travel'}}[id]||{icon:'📋',col:'var(--g600)',cls:''});

  // Group by date
  const tasks=selected.map(id=>S.tasks.find(t=>t.id===id)).filter(Boolean);
  tasks.sort((a,b)=>(b.dateStart||b.date||'').localeCompare(a.dateStart||a.date||'')||a.title.localeCompare(b.title));

  // Group into date buckets
  const byDate={};
  tasks.forEach(tk=>{
    const d=tk.dateStart||tk.date||'(No date)';
    if(!byDate[d])byDate[d]=[];
    byDate[d].push(tk);
  });

  let html='';
  Object.entries(byDate).forEach(([dateKey,dayTasks])=>{
    if(dateKey!=='(No date)'){
      html+=`<div style="font-size:11px;font-weight:700;color:#00843D;letter-spacing:0.05em;padding:8px 0 4px;border-top:1px solid var(--g200);margin-top:4px;">${fmtDate(dateKey)}</div>`;
    }
    dayTasks.forEach(tk=>{
      const cc=catCfg(tk.category||'work');
      const note=(curReport.reportTaskNotes||{})[tk.id]||'';
      const dur=calcDuration(tk);
      const timeStr=tk.timeStart?(tk.timeEnd?`${tk.timeStart} – ${tk.timeEnd}`:tk.timeStart):'';
      const statusIcon=tk.status==='done'?'✅':tk.status==='in_progress'?'🔄':'⏳';
      html+=`<div class="rpt-task-card ${cc.cls}">
        <div class="rpt-task-body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div class="rpt-task-title">${statusIcon} ${tk.title}</div>
            <button onclick="toggleReportTask('${tk.id}')" style="flex-shrink:0;width:20px;height:20px;border-radius:50%;border:none;background:var(--rl);color:var(--red);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;">×</button>
          </div>
          <div class="rpt-task-meta">
            ${timeStr?`<span>⏰ ${timeStr}</span>`:''}
            ${dur?`<span>⏱ ${dur}</span>`:''}
            <span style="color:${cc.col};">${cc.icon} ${tk.category||'work'}</span>
            ${tk.machine?`<span>🔩 ${tk.machine}</span>`:''}
            ${tk.plan?`<span>📁 ${tk.plan}</span>`:''}
            ${tk.priority?`<span style="color:${tk.priority==='high'?'var(--red)':tk.priority==='critical'?'var(--purple)':'var(--g500)'};">▲ ${tk.priority}</span>`:''}
          </div>
          ${tk.checklist&&tk.checklist.length?`
          <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
            <div style="flex:1;height:3px;background:var(--g200);border-radius:2px;overflow:hidden;">
              <div style="height:100%;background:var(--green);width:${Math.round((tk.checklist.filter(c=>c.done).length/tk.checklist.length)*100)}%;border-radius:2px;"></div>
            </div>
            <span style="font-size:10px;color:var(--g500);">${tk.checklist.filter(c=>c.done).length}/${tk.checklist.length}</span>
          </div>`:''}
          <textarea class="rpt-task-notes" id="rtn-${tk.id}" placeholder="Add work notes for this task in the report…" onchange="saveReportTaskNote('${tk.id}')" rows="2">${note}</textarea>
        </div>
      </div>`;
    });
  });

  taskList.innerHTML=html;
}

// ═══════ CHECKLIST ═══════
function renderChecklist(){
  if(!curReport)return;
  const el=document.getElementById('checklist-items');
  if(!curReport.checklist.length){el.innerHTML=`<div class="empty" style="padding:16px 0;"><div class="et">${t('addCheckItem')}</div></div>`;return;}
  el.innerHTML=curReport.checklist.map((item,i)=>`
    <div class="ci">
      <div class="ci-info"><div class="ci-name">${item.name}</div>${item.note?`<div class="ci-note">${item.note}</div>`:''}</div>
      <div style="display:flex;gap:4px;">
        <button class="rb pass ${item.result==='pass'?'act':''}" onclick="setCheck(${i},'pass')">✓</button>
        <button class="rb fail ${item.result==='fail'?'act':''}" onclick="setCheck(${i},'fail')">✕</button>
        <button class="rb na ${item.result==='na'?'act':''}" onclick="setCheck(${i},'na')">–</button>
      </div>
      <button class="db" onclick="delCheck(${i})">×</button>
    </div>`).join('');
}
function setCheck(i,r){curReport.checklist[i].result=r;sv();renderChecklist();}
function delCheck(i){curReport.checklist.splice(i,1);sv();renderChecklist();}
function addCheckItem(){
  const name=document.getElementById('ci-name').value.trim();if(!name){showToast('Name required');return;}
  curReport.checklist.push({id:'ci'+Date.now(),name,note:document.getElementById('ci-note').value,result:''});
  sv();closeModal('modal-add-check');document.getElementById('ci-name').value='';document.getElementById('ci-note').value='';renderChecklist();
}

// ═══════ READINGS ═══════
function renderReadings(){
  if(!curReport)return;
  const el=document.getElementById('reading-items');
  if(!curReport.readings.length){el.innerHTML=`<div class="empty" style="padding:16px 0;"><div class="et">${t('noReadings')}</div></div>`;return;}
  el.innerHTML=curReport.readings.map((r,i)=>{
    const isCond=r.type==='condition'||(!r.value&&r.condition);
    if(isCond){
      const cond=r.condition||'ok';
      const condColor=cond==='ok'?'var(--gd)':cond==='notok'?'var(--red)':'#92400E';
      const condBg=cond==='ok'?'var(--gl)':cond==='notok'?'var(--rl)':'var(--al)';
      const condLabel=cond==='ok'?'✅ OK':cond==='notok'?'❌ Not OK':'⚠️ Other';
      return `<div class="ri">
        <div class="ri-info"><div class="ri-name">${r.name}</div>${r.tag?`<div class="ri-tag">${r.tag}</div>`:''}<div style="font-size:10px;color:var(--g500);">Condition</div></div>
        <div class="rv"><span class="badge" style="background:${condBg};color:${condColor};font-size:11px;">${condLabel}</span></div>
        <button class="db" onclick="delReading(${i})" style="margin-left:4px;">×</button>
      </div>`;
    } else {
      return `<div class="ri">
        <div class="ri-info"><div class="ri-name">${r.name}</div>${r.tag?`<div class="ri-tag">${r.tag}</div>`:''}<div style="font-size:10px;color:var(--g500);">Measurement</div></div>
        <div class="rv"><div class="rnum ${r.status==='bad'?'bad':'ok'}">${r.value} ${r.unit}</div><span class="badge ${r.status==='ok'?'bg':r.status==='bad'?'br':'bgr'}" style="font-size:10px;">${r.status==='ok'?t('inSpec'):r.status==='bad'?t('outOfRange'):'N/A'}</span></div>
        <button class="db" onclick="delReading(${i})" style="margin-left:4px;">×</button>
      </div>`;
    }
  }).join('');
}
let rdType='condition'; // 'condition' | 'measurement'
function setReadingType(type){
  rdType=type;
  const condBtn=document.getElementById('rd-type-cond');
  const measBtn=document.getElementById('rd-type-meas');
  const condF=document.getElementById('rd-cond-fields');
  const measF=document.getElementById('rd-meas-fields');
  if(condBtn){condBtn.style.border=`1.5px solid ${type==='condition'?'var(--green)':'var(--g300)'}`;condBtn.style.background=type==='condition'?'var(--gl)':'#fff';condBtn.style.color=type==='condition'?'var(--gd)':'var(--g600)';}
  if(measBtn){measBtn.style.border=`1.5px solid ${type==='measurement'?'var(--green)':'var(--g300)'}`;measBtn.style.background=type==='measurement'?'var(--gl)':'#fff';measBtn.style.color=type==='measurement'?'var(--gd)':'var(--g600)';}
  if(condF)condF.style.display=type==='condition'?'':'none';
  if(measF)measF.style.display=type==='measurement'?'':'none';
}
function addReading(){
  const name=document.getElementById('rd-name').value.trim();
  if(!name){showToast('Equipment name required');return;}
  if(rdType==='measurement'){
    const value=document.getElementById('rd-value').value.trim();
    if(!value){showToast('Value required for measurement');return;}
    curReport.readings.push({
      type:'measurement',name,value,
      unit:document.getElementById('rd-unit').value,
      tag:document.getElementById('rd-tag').value,
      status:document.getElementById('rd-status').value,
      notes:document.getElementById('rd-notes').value
    });
  } else {
    curReport.readings.push({
      type:'condition',name,
      condition:document.getElementById('rd-condition').value,
      tag:document.getElementById('rd-tag').value,
      notes:document.getElementById('rd-notes').value,
      value:'',unit:'',
      status:document.getElementById('rd-condition').value==='ok'?'ok':document.getElementById('rd-condition').value==='notok'?'bad':'na'
    });
  }
  sv();closeModal('modal-add-reading');
  ['rd-name','rd-tag','rd-value','rd-unit','rd-notes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('rd-status').value='ok';
  document.getElementById('rd-condition').value='ok';
  setReadingType('condition');
  renderReadings();
}
function delReading(i){curReport.readings.splice(i,1);sv();renderReadings();}

// ═══════ ISSUES + PHOTOS ═══════
function renderIssues(){
  if(!curReport)return;
  const el=document.getElementById('issue-items');const emp=document.getElementById('issue-empty');
  if(!curReport.issues.length){el.innerHTML='';emp.style.display='';return;}
  emp.style.display='none';
  const isStatusCfg={
    pending:{label:'⏳ Pending',bg:'var(--g100)',color:'var(--g600)'},
    waiting_part:{label:'🔧 Waiting part',bg:'var(--bl)',color:'#1E40AF'},
    processing:{label:'🔄 Processing',bg:'var(--al)',color:'#92400E'},
    done:{label:'✅ Done',bg:'var(--gl)',color:'var(--gd)'}
  };
  el.innerHTML=curReport.issues.map((is,i)=>{
    const isc=isStatusCfg[is.istatus||'pending']||isStatusCfg.pending;
    return `<div class="issue sev-${is.severity}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <div style="font-size:13px;font-weight:600;flex:1;padding-right:8px;">${is.title}</div>
        <div style="display:flex;gap:5px;align-items:center;flex-shrink:0;">
          <span class="badge ${is.severity==='low'?'bb':is.severity==='medium'?'ba':is.severity==='critical'?'bp':'br'}" style="font-size:10px;">${is.severity}</span>
          <button class="db" onclick="delIssue(${i})">×</button>
        </div>
      </div>
      ${is.description?`<div style="font-size:12px;color:var(--g600);margin-bottom:6px;">${is.description}</div>`:''}
      <div style="margin:6px 0 4px;">
        <div style="font-size:10px;font-weight:700;color:var(--n500);letter-spacing:0.06em;margin-bottom:5px;">STATUS</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;">
          ${['pending','waiting_part','processing','done'].map(st=>{
            const sc=isStatusCfg[st];
            const active=((is.istatus||'pending')===st);
            return `<button data-ii="${i}" data-st="${st}" onclick="setIssueStatusBtn(this)"
              style="padding:6px 10px;border-radius:8px;
              border:2px solid ${active?sc.color:'var(--n200)'};
              background:${active?sc.bg:'#fff'};
              color:${active?sc.color:'var(--n400)'};
              font-size:11px;font-weight:${active?'700':'400'};
              cursor:pointer;font-family:var(--font);
              transition:all 0.15s;
              box-shadow:${active?'0 1px 4px rgba(0,0,0,0.12)':'none'};
            ">${sc.label}</button>`;
          }).join('')}
        </div>
      </div>
      ${is.action?`<div style="font-size:11px;color:var(--g500);margin-top:2px;font-style:italic;">→ ${is.action}</div>`:''}
      ${is.photos&&is.photos.length?`<div class="pgrid" style="margin-top:6px;">${is.photos.map((p,pi)=>`<div class="pthumb"><img src="${p}"><button class="pdel" onclick="delIPhoto(${i},${pi})">×</button></div>`).join('')}<div class="padd" onclick="addPhotoToIssue(${i})"><span>📷</span></div></div>`:''}
    </div>`;
  }).join('');
}
// ── PHOTO PICKER ────────────────────────────────────────────
let _photoCtxPending = null;  // stores context while sheet is open

function triggerPhoto(){
  photoCtx=null;tmpPhotos=[];
  _photoCtxPending='tmpPhoto';
  openPhotoSheet('issue');
}

function addPhotoToIssueFixed(idx){
  photoCtx=idx;
  _photoCtxPending='issue';
  openPhotoSheet('issue');
}

function openPhotoSheet(ctx){
  _photoCtxPending=ctx;
  document.getElementById('photo-source-sheet').classList.add('open');
}

function pickPhotoSource(source){
  closeModal('photo-source-sheet');
  const input=document.getElementById('photoInput');
  // Set capture attribute based on source
  if(source==='camera'){
    input.setAttribute('capture','environment');
  } else {
    input.removeAttribute('capture');
  }
  // Store context so handlePhoto knows what to do
  input.dataset.context=_photoCtxPending||'tmpPhoto';
  // Small delay lets the modal close animation finish before native picker opens
  setTimeout(()=>input.click(), 120);
}

function handlePhoto(e){
  const files = Array.from(e.target.files);
  if(!files.length) return;
  const context = (e.target.dataset && e.target.dataset.context) || '';
  let loaded = 0;
  const photos = [];

  files.forEach(f => {
    const r = new FileReader();
    r.onload = ev => {
      photos.push(ev.target.result);
      if(++loaded === files.length){
        if(context === 'bill'){
          // Get trip + bill IDs from the open modal
          const ts     = document.getElementById('bill-trip-select');
          const tripId = (ts && ts.value) || (document.getElementById('bill-save-btn').dataset.tripid||'');
          const billId = editingBillId || '';
          // Call Drive-aware handler
          handleBillPhotos(photos, billId, tripId);
          e.target.dataset.context = '';
          _photoCtxPending = null;
        } else if(context === 'issue' && typeof photoCtx === 'number'){
          if(!curReport.issues[photoCtx].photos) curReport.issues[photoCtx].photos = [];
          curReport.issues[photoCtx].photos.push(...photos);
          sv(); renderIssues(); photoCtx = null;
          e.target.dataset.context = '';
          _photoCtxPending = null;
        } else {
          tmpPhotos.push(...photos);
          renderTmpPhotos();
        }
      }
    };
    r.readAsDataURL(f);
  });
  e.target.value = '';
}
function addPhotoToIssue(idx){photoCtx=idx;_photoCtxPending='issue';openPhotoSheet('issue');}
function delIPhoto(iIdx,pIdx){curReport.issues[iIdx].photos.splice(pIdx,1);sv();renderIssues();}

function renderTmpPhotos(){
  const g=document.getElementById('issue-photo-grid');if(!g)return;
  g.innerHTML=tmpPhotos.map((p,i)=>`<div class="pthumb"><img src="${p}"><button class="pdel" onclick="delTmpPhoto(${i})">×</button></div>`).join('')+`<div class="padd" onclick="triggerPhoto()"><span>📷</span><span>${t('addPhoto')}</span></div>`;
}
function delTmpPhoto(i){tmpPhotos.splice(i,1);renderTmpPhotos();}
function addIssue(){
  const title=document.getElementById('is-title').value.trim();if(!title){showToast('Title required');return;}
  curReport.issues.push({
    title,
    description:document.getElementById('is-desc').value,
    severity:document.getElementById('is-sev').value,
    istatus:document.getElementById('is-istatus').value,
    action:document.getElementById('is-action').value,
    photos:[...tmpPhotos]
  });
  sv();closeModal('modal-add-issue');
  ['is-title','is-desc','is-action'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('is-sev').value='medium';
  document.getElementById('is-istatus').value='pending';
  tmpPhotos=[];renderIssues();
}
function delIssue(i){curReport.issues.splice(i,1);sv();renderIssues();}
function setIssueStatusBtn(btn){
  const i = parseInt(btn.dataset.ii);
  const status = btn.dataset.st;
  setIssueStatus(i, status);
}

function setIssueStatus(i,status){
  if(!curReport||!curReport.issues[i])return;
  curReport.issues[i].istatus=status;
  sv();renderIssues();
}

// ═══════ TEAM ═══════
function renderTeam(){
  if(!curReport)return;
  const el=document.getElementById('team-members-list');
  if(!curReport.team||!curReport.team.length){el.innerHTML=`<div class="empty" style="padding:16px 0;"><div class="et">${t('addTeamMember')}</div></div>`;return;}
  el.innerHTML=curReport.team.map((m,i)=>`
    <div class="tm">
      <div class="tav">${(m.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}</div>
      <div class="ti"><div class="tn">${m.name}</div><div class="tr2">${[m.role,m.org].filter(Boolean).join(' · ')}</div></div>
      ${m.signoff==='yes'?`<span class="badge bg" style="font-size:10px;">Signoff</span>`:`<span class="badge bgr" style="font-size:10px;">Attend</span>`}
      <button class="db" onclick="delMember(${i})">×</button>
    </div>`).join('');
}
function addTeamMember(){
  const name=document.getElementById('tm-name').value.trim();if(!name){showToast('Name required');return;}
  if(!curReport.team)curReport.team=[];
  curReport.team.push({id:'tm'+Date.now(),name,role:document.getElementById('tm-role').value,org:document.getElementById('tm-org').value,signoff:document.getElementById('tm-signoff').value});
  sv();closeModal('modal-add-member');['tm-name','tm-role','tm-org'].forEach(id=>document.getElementById(id).value='');document.getElementById('tm-signoff').value='yes';renderTeam();
}
function delMember(i){curReport.team.splice(i,1);sv();renderTeam();}
function renderDefaultTeam(){
  const el=document.getElementById('default-team-list');if(!el)return;
  if(!S.defaultTeam||!S.defaultTeam.length){el.innerHTML=`<div style="font-size:12px;color:var(--g500);padding:6px 0;">No default members.</div>`;return;}
  el.innerHTML=S.defaultTeam.map((m,i)=>`<div class="tm"><div class="tav">${(m.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}</div><div class="ti"><div class="tn">${m.name}</div><div class="tr2">${m.role||''}</div></div><button class="db" onclick="rmDefaultMember(${i})">×</button></div>`).join('');
}
function addDefaultTeamMember(){
  const name=document.getElementById('dt-name').value.trim();if(!name)return;
  if(!S.defaultTeam)S.defaultTeam=[];
  S.defaultTeam.push({name,role:document.getElementById('dt-role').value,signoff:'yes'});
  sv();document.getElementById('dt-name').value='';document.getElementById('dt-role').value='';renderDefaultTeam();
}
function rmDefaultMember(i){S.defaultTeam.splice(i,1);sv();renderDefaultTeam();}

// ═══════ SIGNOFF ═══════
function selRes(btn,val){signoffRes=val;document.querySelectorAll('.ropt').forEach(b=>b.classList.remove('sel'));btn.classList.add('sel');}
function saveSignoff(){
  if(!curReport) return;
  const sumEl=document.getElementById('signoff-summary');
  const remEl=document.getElementById('signoff-remarks');
  curReport.signoff={
    summary: sumEl?sumEl.value:'',
    result:  signoffRes||'Completed',
    remarks: remEl?remEl.value:''
  };
  try{
    if(sigCanvas&&sigCtx) curReport.signature=sigCanvas.toDataURL();
  }catch(e){ curReport.signature=''; }
  sv();
  svAndSync('report');
}

function checkAndExport(){
  // Work summary is required before export
  const summary=(document.getElementById('signoff-summary').value||'').trim();
  if(!summary){
    // Highlight the field and show a message
    const el=document.getElementById('signoff-summary');
    if(el){
      el.style.borderColor='var(--red)';
      el.style.boxShadow='0 0 0 3px rgba(220,38,38,0.12)';
      el.focus();
      el.placeholder='⚠ Required — describe the work done before exporting';
      setTimeout(()=>{
        el.style.borderColor='';el.style.boxShadow='';
        el.placeholder='...';
      },3000);
    }
    showToast('⚠ Please fill in the Work Summary before exporting');
    return;
  }
  showScreen('export');
}

// ═══════ SIGNATURE ═══════
// Stored signature (from uploaded image)
const STORED_SIG_B64 = 'data:image/png;base64,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';

function loadStoredSignature(){
  if(!sigCanvas||!sigCtx) initSig();
  if(!sigCtx) return;
  const img = new Image();
  img.onload = function(){
    sigCtx.clearRect(0,0,sigCanvas.width,sigCanvas.height);
    // Draw centered on canvas
    const scale = Math.min(sigCanvas.width/img.width, sigCanvas.height/img.height);
    const nw = img.width*scale, nh = img.height*scale;
    const x = (sigCanvas.width-nw)/2, y = (sigCanvas.height-nh)/2;
    sigCtx.drawImage(img, x, y, nw, nh);
  };
  img.src = STORED_SIG_B64;
  showToast('Signature loaded ✓');
}

function initSig(){
  sigCanvas=document.getElementById('sigCanvas');
  if(!sigCanvas){ console.warn('sigCanvas not found'); return; }
  sigCtx=sigCanvas.getContext('2d');
  if(!sigCtx){ console.warn('Cannot get 2d context'); return; }
  sigCtx.strokeStyle='#1E3A5F';sigCtx.lineWidth=2;sigCtx.lineCap='round';sigCtx.lineJoin='round';
  const gp=e=>{const r=sigCanvas.getBoundingClientRect();const sc=sigCanvas.width/r.width;return e.touches?{x:(e.touches[0].clientX-r.left)*sc,y:(e.touches[0].clientY-r.top)*sc}:{x:(e.clientX-r.left)*sc,y:(e.clientY-r.top)*sc};};
  sigCanvas.addEventListener('mousedown',e=>{isDrw=true;const p=gp(e);sigCtx.beginPath();sigCtx.moveTo(p.x,p.y);});
  sigCanvas.addEventListener('mousemove',e=>{if(!isDrw)return;const p=gp(e);sigCtx.lineTo(p.x,p.y);sigCtx.stroke();});
  sigCanvas.addEventListener('mouseup',()=>isDrw=false);
  sigCanvas.addEventListener('touchstart',e=>{e.preventDefault();isDrw=true;const p=gp(e);sigCtx.beginPath();sigCtx.moveTo(p.x,p.y);},{passive:false});
  sigCanvas.addEventListener('touchmove',e=>{e.preventDefault();if(!isDrw)return;const p=gp(e);sigCtx.lineTo(p.x,p.y);sigCtx.stroke();},{passive:false});
  sigCanvas.addEventListener('touchend',()=>isDrw=false);
}
function clearSig(){sigCtx.clearRect(0,0,sigCanvas.width,sigCanvas.height);if(curReport){curReport.signature='';sv();}}
function updateSigDate(){const el=document.getElementById('sig-name-date');if(el)el.textContent=(S.profile.name||'Engineer')+' · '+new Date().toLocaleDateString(S.lang==='vi'?'vi-VN':'en-GB',{day:'numeric',month:'short',year:'numeric'});}

// ═══════ PDF ═══════
function populateReportName(){
  const trip=S.trips.find(tr=>tr.id===curTrip);
  if(!trip)return;
  const input=document.getElementById('report-name-input');
  if(!input)return;
  // Set default name if empty
  if(!input.value.trim()){
    input.value=`Plant Visit Report — ${trip.plant}${trip.date?' — '+fmtDate(trip.date):''}`;
  }
  updateReportNamePreview();
}
function updateReportNamePreview(){
  const input=document.getElementById('report-name-input');
  const trip=S.trips.find(tr=>tr.id===curTrip);
  const name=(input&&input.value.trim())||(trip?`Plant Visit Report — ${trip.plant}`:'Report');
  const titleEl=document.getElementById('preview-report-title');
  const subEl=document.getElementById('preview-report-sub');
  if(titleEl)titleEl.textContent=name;
  if(subEl&&trip)subEl.textContent=`${trip.plant}  ·  ${fmtDate(trip.date)}`;
}
function buildPDFPreview(){
  if(!curTrip||!curReport)return;
  const trip=S.trips.find(tr=>tr.id===curTrip);if(!trip)return;
  const r=curReport;const p=S.profile;
  const pc=r.checklist.filter(c=>c.result==='pass').length;
  const fc=r.checklist.filter(c=>c.result==='fail').length;
  document.getElementById('pdf-preview-content').innerHTML=`
    <div class="ps" style="border-bottom:2px solid var(--g200);margin-bottom:14px;">
      <div style="background:#00843D;border-radius:var(--rs);padding:12px 14px;margin-bottom:10px;color:#fff;">
        <div style="font-size:14px;font-weight:700;" id="preview-report-title">Plant Visit Report</div>
        <div style="font-size:12px;opacity:0.85;margin-top:3px;" id="preview-report-sub"></div>
      </div>
      ${pr('Plant',trip.plant)}${pr('Location',trip.location||'—')}${pr('Date',fmtDate(trip.date))}
      ${pr('Engineer',p.name||'—')}${pr('Title',p.title||'—')}${pr('Company',p.company||'—')}
    </div>
    <div class="ps"><div class="pst">Checklist (${r.checklist.length})</div>
      ${pr('Passed',pc+' items')}${pr('Failed',fc+' items')}
      ${fc>0?`<div style="font-size:11px;color:var(--red);margin-top:4px;">Failed: ${r.checklist.filter(c=>c.result==='fail').map(c=>c.name).join(', ')}</div>`:''}
    </div>
    <div class="ps"><div class="pst">Readings (${r.readings.length})</div>
      ${r.readings.length?r.readings.map(rd=>pr(rd.name+(rd.tag?' ['+rd.tag+']':''),rd.value+' '+rd.unit+(rd.status==='bad'?' ⚠':''))).join(''):'<div style="font-size:12px;color:var(--g500);">None</div>'}
    </div>
    <div class="ps"><div class="pst">Issues (${r.issues.length})</div>
      ${r.issues.length?r.issues.map(is=>`<div style="margin-bottom:6px;"><span class="badge ${is.severity==='low'?'bb':is.severity==='medium'?'ba':'br'}" style="font-size:10px;">${is.severity.toUpperCase()}</span> <span style="font-size:13px;font-weight:500;">${is.title}</span>${is.photos&&is.photos.length?` <span style="font-size:11px;color:var(--g500);">(${is.photos.length} photo${is.photos.length>1?'s':''})</span>`:''}</div>`).join(''):'<div style="font-size:12px;color:var(--g500);">None</div>'}
    </div>
    <div class="ps"><div class="pst">Team (${(r.team||[]).length})</div>
      ${r.team&&r.team.length?r.team.map(m=>pr(m.name,m.role||'—')).join(''):'<div style="font-size:12px;color:var(--g500);">None</div>'}
    </div>
    <div class="ps">${(()=>{
      const sel=(r.reportTasks||[]);
      if(!sel.length)return'<div class="pst" style="color:var(--g400);">Tasks (none selected)</div>';
      const tasks=sel.map(id=>S.tasks.find(t=>t.id===id)).filter(Boolean).sort((a,b)=>(a.dateStart||a.date||'').localeCompare(b.dateStart||b.date||'')||a.title.localeCompare(b.title));
      const catIcon=c=>({work:'🔧',leave:'🌴',travel:'✈️'}[c]||'📋');
      const statusIcon=s=>s==='done'?'✅':s==='in_progress'?'🔄':'⏳';

      // ── Calculate total duration for work tasks with autoDuration ON ──
      let totalAutoMins = 0;
      let autoCount = 0;
      tasks.forEach(tk=>{
        if(tk.category==='work' && tk.autoDuration){
          const d = calcDurationFromTimes(tk.dateStart||tk.date, tk.dateEnd||tk.dateStart||tk.date, tk.timeStart, tk.timeEnd);
          if(d){ totalAutoMins += d.totalMins; autoCount++; }
        }
      });
      const totalH = Math.floor(totalAutoMins/60);
      const totalM = totalAutoMins % 60;
      const totalLabel = totalAutoMins > 0
        ? (totalH>0&&totalM>0 ? totalH+'h '+totalM+'m' : totalH>0 ? totalH+'h' : totalM+'m')
        : '—';

      // Group by date
      const byDate={};
      tasks.forEach(tk=>{const d=tk.dateStart||tk.date||'';if(!byDate[d])byDate[d]=[];byDate[d].push(tk);});
      let out=`<div class="pst">Tasks in Report (${tasks.length})</div>`;

      // ── Total work hours summary banner ──
      if(autoCount>0){
        out+=`<div style="background:var(--brand-light);border-radius:var(--rs);padding:8px 12px;margin-bottom:8px;
                          display:flex;justify-content:space-between;align-items:center;
                          border:1px solid rgba(15,123,62,0.2);">
          <span style="font-size:12px;color:var(--brand-dark);font-weight:600;">⏱ Total Work Hours (${autoCount} tasks)</span>
          <span style="font-size:16px;font-weight:800;color:var(--brand);font-family:var(--font-hd);">${totalLabel}</span>
        </div>`;
      }

      Object.entries(byDate).forEach(([dateKey,dayTasks])=>{
        if(dateKey)out+=`<div style="font-size:11px;font-weight:700;color:#00843D;padding:4px 0;border-bottom:1px solid #e8f5ee;margin-bottom:4px;">${fmtDate(dateKey)}</div>`;
        dayTasks.forEach(tk=>{
          const note=(r.reportTaskNotes||{})[tk.id]||'';
          // Use auto-calculated duration if enabled, else manual
          let dur='', autoTag='';
          if(tk.category==='work' && tk.autoDuration){
            const d = calcDurationFromTimes(tk.dateStart||tk.date, tk.dateEnd||tk.dateStart||tk.date, tk.timeStart, tk.timeEnd);
            if(d){ dur=d.label; autoTag='<span style="background:var(--brand-light);color:var(--brand-dark);border-radius:3px;padding:1px 5px;font-size:9px;font-weight:700;">AUTO</span>'; }
          } else {
            dur = calcDuration(tk);
          }
          const timeStr=tk.timeStart?(tk.timeEnd?`${tk.timeStart}–${tk.timeEnd}`:tk.timeStart):'';
          out+=`<div style="margin-bottom:8px;padding:6px 8px;background:var(--g50);border-radius:6px;border-left:3px solid ${tk.category==='leave'?'var(--amber)':tk.category==='travel'?'var(--blue)':'var(--green)'};">
            <div style="font-size:12px;font-weight:500;display:flex;align-items:center;gap:6px;">${statusIcon(tk.status)} ${tk.title} ${autoTag}</div>
            <div style="font-size:11px;color:var(--g500);margin-top:2px;display:flex;flex-wrap:wrap;gap:6px;">
              ${timeStr?`<span>⏰ ${timeStr}</span>`:''}
              ${dur?`<span>⏱ ${dur}</span>`:''}
              <span>${catIcon(tk.category||'work')} ${tk.category||'work'}</span>
              ${tk.machine?`<span>🔩 ${tk.machine}</span>`:''}
              ${tk.plan?`<span>📁 ${tk.plan}</span>`:''}
              ${tk.checklist&&tk.checklist.length?`<span>${tk.checklist.filter(c=>c.done).length}/${tk.checklist.length} items</span>`:''}
            </div>
            ${note?`<div style="font-size:11px;color:var(--g600);margin-top:4px;font-style:italic;">${note}</div>`:''}
          </div>`;
        });
      });
      return out;
    })()}</div>

    <div class="ps" style="border:none;"><div class="pst">Sign-off</div>
      ${pr('Result',r.signoff.result||'—')}
      ${r.signoff.summary?`<div style="font-size:12px;color:var(--g700);margin-top:6px;">${r.signoff.summary}</div>`:''}
      ${r.signature?`<div style="margin-top:8px;"><img src="${r.signature}" style="max-width:180px;border:1px solid var(--g200);border-radius:6px;padding:3px;"></div>`:'<div style="font-size:12px;color:var(--red);">⚠ No signature</div>'}
    </div>`;
}
function pr(l,v){return `<div class="pr"><span>${l}</span><span>${v}</span></div>`;}
function exportPDF(){
  if(typeof window.jspdf==='undefined'){
    // Try loading jsPDF dynamically if CDN missed
    showToast('Loading PDF library…');
    if(!document._jspdfLoading){
      document._jspdfLoading=true;
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload=()=>{ document._jspdfLoading=false; setTimeout(exportPDF,300); };
      s.onerror=()=>{ document._jspdfLoading=false; showToast('PDF failed to load. Check internet connection.'); };
      document.head.appendChild(s);
    } else {
      setTimeout(exportPDF,1000);
    }
    return;
  }
  const{jsPDF}=window.jspdf;
  const trip=S.trips.find(tr=>tr.id===curTrip);const r=curReport;const p=S.profile;
  if(!trip||!r)return;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=210,mg=16;let y=20,pageNum=1;
  const R=W-mg;
  const reportTitle=(document.getElementById('report-name-input')&&document.getElementById('report-name-input').value.trim())||`Plant Visit Report — ${trip.plant}`;
  doc.setFillColor(0,132,61);doc.rect(0,0,W,36,'F');
  doc.setTextColor(255,255,255);
  const titleLines=doc.splitTextToSize(reportTitle,W-mg*2);
  doc.setFontSize(titleLines.length>1?10:13);doc.setFont('helvetica','bold');
  doc.text(titleLines,mg,titleLines.length>1?9:12);
  const afterTitle=titleLines.length>1?9+titleLines.length*4.5:18;
  doc.setFontSize(8.5);doc.setFont('helvetica','normal');
  doc.text(`${trip.plant}  ·  ${fmtDate(trip.date)}`,mg,afterTitle+1);
  doc.text(`${p.name||'Engineer'}${p.title?' · '+p.title:''}${p.company?' · '+p.company:''}`,mg,afterTitle+6);
  y=42;
  const rtxt=(str,yy,col)=>{if(col)doc.setTextColor(...col);const tw=doc.getTextWidth(String(str));doc.text(String(str),R-tw,yy);if(col)doc.setTextColor(33,37,41);};
  const addPN=()=>{doc.setFontSize(7);doc.setTextColor(150,150,150);doc.setFont('helvetica','normal');rtxt(`Page ${pageNum}`,289);doc.text('PlantLog  ·  '+new Date().toLocaleDateString('en-GB'),mg,289);};
  const sec=title=>{if(y>265){doc.addPage();y=20;pageNum++;addPN();}doc.setFillColor(241,243,245);doc.rect(mg,y-4,W-mg*2,8,'F');doc.setTextColor(0,132,61);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text(title,mg+2,y+1);doc.setTextColor(33,37,41);y+=8;};
  const kv2=(l,v)=>{doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(100,100,100);doc.text(l,mg,y);doc.setTextColor(33,37,41);doc.setFont('helvetica','bold');const lines=doc.splitTextToSize(String(v),W-mg*2-30);lines.forEach((ln,li)=>{const tw=doc.getTextWidth(ln);doc.text(ln,R-tw,y+li*5);});doc.setFont('helvetica','normal');y+=lines.length*5+1;if(y>270){doc.addPage();y=20;pageNum++;addPN();}};
  const ln=()=>{doc.setDrawColor(220,220,220);doc.line(mg,y,W-mg,y);y+=4;};
  const chk=()=>{if(y>265){doc.addPage();y=20;pageNum++;addPN();}};
  sec('TRIP INFO');
  kv2('Plant',trip.plant);kv2('Location',trip.location||'—');kv2('Date',fmtDate(trip.date));
  if(trip.dateEnd&&trip.dateEnd!==trip.date)kv2('End Date',fmtDate(trip.dateEnd));
  kv2('Purpose',trip.purpose||'—');
  if(trip.contact)kv2('Contact',trip.contact);
  if(trip.transport)kv2('Transport',trip.transport);
  if(trip.notes){doc.setFontSize(8);doc.setTextColor(100,100,100);const nl=doc.splitTextToSize(trip.notes,W-mg*2-4);doc.text(nl,mg+2,y);y+=nl.length*4+2;}
  ln();
  sec(`CHECKLIST (${r.checklist.length})`);
  r.checklist.forEach(c=>{const sym=c.result==='pass'?'PASS':c.result==='fail'?'FAIL':c.result==='na'?'N/A':'—';const col=c.result==='pass'?[15,110,86]:c.result==='fail'?[226,75,74]:[100,100,100];doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);const nl=doc.splitTextToSize('• '+c.name,W-mg*2-22);doc.text(nl,mg+2,y);doc.setFont('helvetica','bold');rtxt(sym,y,col);doc.setTextColor(33,37,41);doc.setFont('helvetica','normal');y+=nl.length*5;chk();});ln();
  sec(`READINGS (${r.readings.length})`);
  r.readings.forEach(rd=>{const isCond=rd.type==='condition'||(!rd.value&&rd.condition);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);const nl=doc.splitTextToSize('• '+rd.name+(rd.tag?' ['+rd.tag+']':''),W-mg*2-40);doc.text(nl,mg+2,y);doc.setFont('helvetica','bold');if(isCond){const cond=rd.condition||'ok';rtxt(cond==='ok'?'OK':cond==='notok'?'NOT OK':'OTHER',y,cond==='ok'?[15,110,86]:cond==='notok'?[226,75,74]:[245,158,11]);}else{rtxt((rd.value||'')+(rd.unit?' '+rd.unit:''),y,rd.status==='bad'?[226,75,74]:rd.status==='na'?[100,100,100]:[15,110,86]);}doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);if(rd.notes){doc.setFontSize(8);doc.setTextColor(120,120,120);doc.text(rd.notes,mg+6,y+5);y+=5;}y+=nl.length*5;chk();});
  if(!r.readings.length){doc.setFontSize(9);doc.text('None.',mg+2,y);y+=5;}ln();
  sec(`ISSUES (${r.issues.length})`);
  r.issues.forEach(is=>{const sc=is.severity==='critical'?[91,33,182]:is.severity==='high'?[226,75,74]:is.severity==='medium'?[245,158,11]:[55,138,221];const istLabel={'pending':'Pending','waiting_part':'Waiting part','processing':'Processing','done':'Done'}[is.istatus||'pending']||'Pending';const istCol={pending:[100,100,100],waiting_part:[55,138,221],processing:[245,158,11],done:[15,110,86]}[is.istatus||'pending'];doc.setFontSize(9);doc.setFont('helvetica','bold');doc.setTextColor(...sc);doc.text(`[${is.severity.toUpperCase()}]`,mg+2,y);doc.setTextColor(33,37,41);const tl=doc.splitTextToSize(is.title,W-mg*2-50);doc.text(tl,mg+22,y);doc.setFontSize(8);doc.setFont('helvetica','normal');rtxt(istLabel,y,istCol);y+=tl.length*5;if(is.description){doc.setFontSize(8);doc.setTextColor(80,80,80);const dl=doc.splitTextToSize(is.description,W-mg*2-6);doc.text(dl,mg+4,y);y+=dl.length*4+2;}if(is.action){doc.setFontSize(8);doc.setTextColor(80,80,80);const al=doc.splitTextToSize('→ '+is.action,W-mg*2-6);doc.text(al,mg+4,y);y+=al.length*4+2;}if(is.photos&&is.photos.length){is.photos.forEach(ph=>{try{doc.addImage(ph,'JPEG',mg+4,y,35,26);y+=28;}catch(e){}chk();});}chk();});
  if(!r.issues.length){doc.setFontSize(9);doc.text('None.',mg+2,y);y+=5;}ln();
  if(r.team&&r.team.length){sec(`TEAM (${r.team.length})`);r.team.forEach(m=>{doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);doc.text('• '+m.name+(m.role?' — '+m.role:''),mg+2,y);doc.setFont('helvetica','bold');rtxt(m.signoff==='yes'?'SIGNOFF':'ATTEND',y,m.signoff==='yes'?[15,110,86]:[100,100,100]);doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);y+=5;chk();});ln();}
  const rptTaskIds=r.reportTasks||[];
  if(rptTaskIds.length){sec(`TASKS IN REPORT (${rptTaskIds.length})`);const rptTasks=rptTaskIds.map(id=>S.tasks.find(t=>t.id===id)).filter(Boolean).sort((a,b)=>(b.dateStart||b.date||'').localeCompare(a.dateStart||a.date||'')||a.title.localeCompare(b.title));const byDate={};rptTasks.forEach(tk=>{const d=tk.dateStart||tk.date||'';if(!byDate[d])byDate[d]=[];byDate[d].push(tk);});Object.entries(byDate).forEach(([dk,dayTasks])=>{if(dk){doc.setFillColor(228,240,232);doc.rect(mg,y-3,W-mg*2,7,'F');doc.setTextColor(0,100,50);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text(fmtDate(dk),mg+3,y+1);doc.setTextColor(33,37,41);doc.setFont('helvetica','normal');y+=8;chk();}dayTasks.forEach(tk=>{const timeStr=tk.timeStart?(tk.timeEnd?`${tk.timeStart}–${tk.timeEnd}`:tk.timeStart):'';const dur=calcDuration(tk);const titleLine='• '+tk.title+(timeStr?' ('+timeStr+')':'')+(dur?' '+dur:'')+(tk.status==='done'?' — Done':'');doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);const tl=doc.splitTextToSize(titleLine,W-mg*2-4);doc.text(tl,mg+2,y);y+=tl.length*5;const meta=[tk.machine?'Machine: '+tk.machine:'',tk.plan?'Plan: '+tk.plan:'',tk.priority&&tk.priority!=='medium'?'Priority: '+tk.priority:''].filter(Boolean).join('  ·  ');if(meta){doc.setFontSize(8);doc.setTextColor(120,120,120);doc.text(meta,mg+6,y);y+=4;}if(tk.checklist&&tk.checklist.length){const done=tk.checklist.filter(c=>c.done).length;doc.setFontSize(8);doc.setTextColor(100,100,100);doc.text(`Checklist: ${done}/${tk.checklist.length} items`,mg+6,y);y+=4;}const note=(r.reportTaskNotes||{})[tk.id];if(note){doc.setFontSize(8);doc.setTextColor(80,80,80);const nl=doc.splitTextToSize('Notes: '+note,W-mg*2-8);doc.text(nl,mg+6,y);y+=nl.length*4+1;}y+=3;chk();});});ln();}
  sec('SIGN-OFF');kv2('Result',r.signoff&&r.signoff.result||'Completed');if(r.signoff&&r.signoff.summary)kv2('Summary',r.signoff.summary);if(r.signoff&&r.signoff.remarks)kv2('Remarks',r.signoff.remarks);y+=4;
  if(y>240){doc.addPage();y=20;pageNum++;addPN();}
  doc.setDrawColor(200,200,200);doc.rect(mg,y,W-mg*2,34);doc.setFontSize(8);doc.setTextColor(100,100,100);doc.text('Signature:',mg+4,y+7);doc.setFont('helvetica','bold');doc.setTextColor(33,37,41);doc.text(p.name||'Engineer',mg+4,y+29);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100,100,100);rtxt(new Date().toLocaleDateString('en-GB'),y+29);
  if(r.signature&&r.signature.length>100){try{doc.addImage(r.signature,'PNG',mg+40,y+4,65,25);}catch(e){}}
  addPN();
  const safePlant=(trip.plant||'Report').replace(/[^a-zA-Z0-9\s]/g,'').replace(/\s+/g,'_').slice(0,30);
  const fileName=`PlantLog_${safePlant}_${(trip.date||'').replace(/-/g,'')}.pdf`;
  // Store PDF blob for Drive upload option
  window._lastPdfDoc = doc;
  window._lastPdfName = fileName;
  window._lastPdfType = 'report';
  // Show save options modal
  showPdfSaveOptions(doc, fileName, 'report');
}

// ── PDF Save Options ────────────────────────────────────
function showPdfSaveOptions(doc, fileName, type, overrideTripId){
  // Always download locally first
  doc.save(fileName);
  // Show Drive upload option if GS URL is configured
  const gsUrl = getGSUrl ? getGSUrl() : (S.gsUrl||'');
  if(gsUrl && gsUrl.includes('/exec')){
    setTimeout(()=>{
      if(confirm('✅ PDF downloaded!\n\nAlso save to Google Drive (PlantLog Raw Data/Reports)?')){
        savePdfToDrive(doc, fileName, type, overrideTripId);
      }
    }, 500);
  } else {
    showToast('PDF downloaded ✓');
  }
}

async function savePdfToDrive(doc, fileName, type, overrideTripId){
  showToast('Uploading to Google Drive…');
  try{
    const gsUrl = getGSUrl ? getGSUrl() : (S.gsUrl||'');
    if(!gsUrl) return;

    // Convert PDF to base64
    const pdfBlob = doc.output('arraybuffer');
    const uint8 = new Uint8Array(pdfBlob);
    let binary = '';
    uint8.forEach(b => binary += String.fromCharCode(b));
    const base64 = btoa(binary);

    const tripId = overrideTripId || curTrip;
    const trip = S.trips.find(t => t.id === tripId);
    const resp = await fetch(gsUrl, {
      method: 'POST',
      headers: {'Content-Type':'text/plain'},
      body: JSON.stringify({
        action:    'uploadFile',
        taskId:    'report_' + (tripId||''),
        fileName:  fileName,
        mimeType:  'application/pdf',
        dataBase64: base64,
        folder:    'Reports'
      })
    });
    const data = await resp.json();
    if(data && data.ok){
      showToast('Saved to Google Drive ✓');
      // Save file reference to trip — persist to BOTH localStorage AND Google Sheets
      if(trip){
        if(!trip.savedReports) trip.savedReports = [];
        // Keep only latest per type (replace old one)
        trip.savedReports = trip.savedReports.filter(r => r.type !== type);
        trip.savedReports.push({
          type:      type,
          name:      fileName,
          fileId:    data.fileId,
          fileUrl:   data.fileUrl,
          createdAt: new Date().toISOString()
        });
        // Persist to localStorage immediately
        sv();
        // Also push to Google Sheets so it survives app reload + sync
        svAndSync('trip_report_saved');
        // Re-render trip detail
        if(typeof renderTripInspCounts === 'function') renderTripInspCounts();
        renderTripSavedReports();
      }
    } else {
      showToast('Drive upload failed: '+(data?data.error:'No response'));
    }
  } catch(e){
    showToast('Upload error: '+e.message);
    console.error('Drive upload error:', e);
  }
}

function renderTripSavedReports(){
  const el = document.getElementById('trip-saved-reports');
  if(!el || !curTrip) return;
  const trip = S.trips.find(t => t.id === curTrip);
  if(!trip || !trip.savedReports || !trip.savedReports.length){
    el.innerHTML = '';
    return;
  }
  el.innerHTML = '<div class="sec" style="margin-top:12px;">📁 SAVED REPORTS</div>' +
    trip.savedReports.map(r => {
      const icon = r.type==='bills' ? '💰' : r.type==='ta' ? '🛫' : '📋';
      const label = r.type==='bills' ? 'Expense Report' : r.type==='ta' ? 'Travel Authorization' : 'Trip Report';
      const date = r.createdAt ? fmtDate(r.createdAt.slice(0,10)) : '';
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff;border-radius:var(--r-sm);border:1px solid var(--n150);margin-bottom:6px;">
        <span style="font-size:20px;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;color:var(--n800);">${label}</div>
          <div style="font-size:11px;color:var(--n400);margin-top:1px;">${date} · ${r.name}</div>
        </div>
        <a href="${r.fileUrl}" target="_blank"
          style="padding:5px 12px;background:var(--brand);color:#fff;border-radius:var(--rs);font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;">
          Open ↗
        </a>
      </div>`;
    }).join('');
}

function emailPDF(){
  const trip=S.trips.find(tr=>tr.id===curTrip);if(!trip)return;
  const rName=(document.getElementById('report-name-input')&&document.getElementById('report-name-input').value.trim())||`Plant Visit Report — ${trip.plant}`;
  document.getElementById('email-subject').value=`${rName} — ${fmtDate(trip.date)}`;
  document.getElementById('email-body').value=`Dear Team,\n\nPlease find attached the plant visit report:\n\nPlant: ${trip.plant}\nDate: ${fmtDate(trip.date)}\nLocation: ${trip.location||'—'}\nEngineer: ${S.profile.name||'Engineer'}\nResult: ${(curReport&&curReport.signoff)?.result||'Completed'}\n\nBest regards,\n${S.profile.name||'Engineer'}\n${S.profile.title||''}\n${S.profile.company||''}`;
  openModal('modal-email');
}
function sendEmail(){
  const to=document.getElementById('email-to').value.trim();if(!to){showToast('Email required');return;}
  const subj=encodeURIComponent(document.getElementById('email-subject').value);
  const body=encodeURIComponent(document.getElementById('email-body').value);
  const cc=document.getElementById('email-cc').value.trim();
  window.location.href=`mailto:${to}${cc?'?cc='+cc+'&':'?'}subject=${subj}&body=${body}`;
  closeModal('modal-email');showToast('Opening email... attach the PDF');
}
function markCompleted(){
  const trip=S.trips.find(tr=>tr.id===curTrip);
  if(trip){
    trip.status='completed'; sv();
    showToast('Trip marked as completed ✓');
    renderDash(); renderTripList();
    svAndSync('trip_complete');
    showScreen('trip-detail');
    if(typeof renderTripSavedReports==='function') renderTripSavedReports();
  }
}


// ═══════════════════════════════════════════════════════════
// TRAVEL AUTHORIZATION (TA) PDF
// Generates a landscape table matching the company TA form
// ═══════════════════════════════════════════════════════════
function generateTAPdf(tripId){
  if(typeof window.jspdf==='undefined'){
    showToast('Loading PDF library…');
    if(!document._jspdfLoading){
      document._jspdfLoading=true;
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload=()=>{ document._jspdfLoading=false; setTimeout(()=>generateTAPdf(tripId),300); };
      s.onerror=()=>{ document._jspdfLoading=false; showToast('PDF failed to load. Check internet connection.'); };
      document.head.appendChild(s);
    } else {
      setTimeout(()=>generateTAPdf(tripId),1000);
    }
    return;
  }

  const trip=S.trips.find(tr=>tr.id===tripId);
  if(!trip){ showToast('Trip not found'); return; }
  if(!trip.flight){ showToast('No flight info — add flight details first'); return; }

  const{jsPDF}=window.jspdf;
  const p  = S.profile||{};
  const fl = trip.flight||{};
  const ta = trip.ta||{};

  // ── Helpers ──
  function timePeriod(t){
    if(!t) return '';
    const h=parseInt((t||'').split(':')[0]);
    return isNaN(h)?'':(h<12?'AM':'PM');
  }
  function fmtFlight(num){
    // "FD635" → "FD 635"
    return (num||'').replace(/^([A-Za-z]+)(\d+)$/,'$1 $2');
  }
  function ddmmyyyy(iso){
    if(!iso) return '';
    return iso.slice(8,10)+'-'+iso.slice(5,7)+'-'+iso.slice(0,4);
  }

  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const W=297,H=210,mg=10;
  const tableW=W-mg*2;

  // ── TITLE — bold, underlined ──
  doc.setFont('helvetica','bold');
  doc.setFontSize(12);
  doc.setTextColor(0,0,0);
  const titleText='TRAVEL REQUEST AUTHORISATION';
  doc.text(titleText,mg,13);
  const titleW=doc.getTextWidth(titleText);
  doc.setLineWidth(0.5);
  doc.setDrawColor(0,0,0);
  doc.line(mg,14.5,mg+titleW,14.5); // underline

  // ── MONTH box — top right ──
  const tripMonth=trip.date?new Date(trip.date+'T00:00').toLocaleString('en-US',{month:'short'}):'';
  doc.setFontSize(9);
  doc.setFont('helvetica','bold');
  doc.text('MONTH :',(W-mg)-38,10);
  doc.setLineWidth(0.5);
  doc.rect((W-mg)-22,5,22,7);
  doc.setFontSize(10);
  doc.text(tripMonth,(W-mg)-11,10,{align:'center'});

  // ── COLUMN DEFINITIONS ──
  // Exact widths matching sample proportions
  const cols=[
    {key:'ta',    w:15, label:'TA No'},
    {key:'trav',  w:27, label:'Traveller'},
    {key:'date',  w:22, label:'Date of Travel'},
    {key:'from',  w:18, label:'From'},          // } Destination
    {key:'to',    w:18, label:'To'},             // }
    {key:'flight',w:26, label:'Flight'},
    {key:'class', w:11, label:'Class'},
    {key:'plant', w:28, label:'Plant visited'},
    {key:'purp',  w:40, label:'Purpose of visit'},
    {key:'alloc', w:19, label:'Allocation by\npercentage to\neach plant'},
    {key:'ent',   w:19, label:'Entity to be re-\ncharged'},
    {key:'ext',   w:22, label:'Date of Extension\nof travel on\npersonal basis (if\nany)'},
    {key:'reqby', w:27, label:'REQUESTED BY\n(Signature) / Date'},
    {key:'appby', w:27, label:'APPROVED BY\n(Signature) / Date'},
  ];
  const totalW=cols.reduce((s,c)=>s+c.w,0);
  const scale=tableW/totalW;
  cols.forEach(c=>{ c.w=c.w*scale; c.x=0; });
  // compute x positions
  let cx=mg;
  cols.forEach(c=>{ c.x=cx; cx+=c.w; });

  const fromIdx=cols.findIndex(c=>c.key==='from');
  const toIdx  =cols.findIndex(c=>c.key==='to');
  const destX  =cols[fromIdx].x;
  const destW  =cols[fromIdx].w+cols[toIdx].w;

  // ── ROW HEIGHTS ──
  const row0H=6;  // white row: empty except "Destination" label over From+To
  const row1H=14; // yellow header row with all column labels
  const dataH=22; // data row
  const emptyH=7; // empty rows

  let y=18;

  // ── ROW 0: white — only "Destination" centered over From+To ──
  doc.setFillColor(255,255,255);
  doc.setDrawColor(0,0,0);
  doc.setLineWidth(0.3);
  // Draw outer border for the full row
  doc.rect(mg,y,tableW,row0H,'S');
  // Draw cell borders for all cols (white)
  cols.forEach(c=>doc.rect(c.x,y,c.w,row0H,'S'));
  // "Destination" label in small font centered over From+To span
  doc.setFont('helvetica','normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0,0,0);
  doc.text('Destination',destX+destW/2,y+row0H/2+1,{align:'center'});
  // Double border below Destination span (matches the sample thick border)
  doc.setLineWidth(0.5);
  doc.rect(destX,y,destW,row0H,'S');
  y+=row0H;

  // ── ROW 1: full yellow — all column headers ──
  doc.setFillColor(255,235,59);
  doc.setDrawColor(0,0,0);
  doc.setLineWidth(0.3);
  doc.rect(mg,y,tableW,row1H,'FD');
  cols.forEach(c=>doc.rect(c.x,y,c.w,row1H,'S'));

  doc.setFont('helvetica','bold');
  doc.setFontSize(6);
  doc.setTextColor(0,0,0);
  cols.forEach(c=>{
    const lines=c.label.split('\n');
    const lh=3.2;
    let ty=y+row1H/2-(lines.length-1)*lh/2+0.5;
    lines.forEach(l=>{
      doc.text(l,c.x+c.w/2,ty,{align:'center'});
      ty+=lh;
    });
  });
  y+=row1H;

  // ── DATA ROW ──
  const hasReturn=!!(fl.ret_num||fl.ret_from);
  const dateOut=ddmmyyyy(trip.date);
  const dateRet=(trip.dateEnd&&trip.dateEnd!==trip.date)?ddmmyyyy(trip.dateEnd):'';
  const fromCity=fl.from||'';
  const toCity  =fl.to||'';
  const retFrom =fl.ret_from||toCity;
  const retTo   =fl.ret_to  ||fromCity;
  const flOut   =fmtFlight(fl.num||'')+(fl.depart?'      '+timePeriod(fl.depart):'');
  const flRet   =hasReturn?(fmtFlight(fl.ret_num||'')+(fl.ret_depart?'      '+timePeriod(fl.ret_depart):'')):'' ;
  const cls     =ta.taClass||'E';
  const reqDate =ta.requestDate?ddmmyyyy(ta.requestDate):(trip.createdAt?ddmmyyyy(trip.createdAt.slice(0,10)):'');

  doc.setFont('helvetica','normal');
  doc.setFontSize(7);
  doc.setTextColor(0,0,0);
  doc.setLineWidth(0.3);
  doc.rect(mg,y,tableW,dataH,'S');
  cols.forEach(c=>doc.rect(c.x,y,c.w,dataH,'S'));

  function cellText(idx,line1,line2){
    const c=cols[idx];
    const lh=4;
    if(line2){
      // Two lines: top quarter and bottom quarter
      const y1=y+dataH*0.28;
      const y2=y+dataH*0.72;
      if(line1){ const w1=doc.splitTextToSize(String(line1),c.w-2); doc.text(w1,c.x+1,y1); }
      if(line2){ const w2=doc.splitTextToSize(String(line2),c.w-2); doc.text(w2,c.x+1,y2); }
    } else if(line1){
      const wrapped=doc.splitTextToSize(String(line1),c.w-2);
      const startY=y+dataH/2-(wrapped.length-1)*lh/2+1;
      wrapped.forEach((wl,wi)=>doc.text(wl,c.x+1,startY+wi*lh));
    }
  }

  cellText(0,  ta.taNo||'');
  cellText(1,  p.name||'');
  cellText(2,  dateOut, hasReturn?dateRet:'');
  cellText(3,  fromCity, hasReturn?retFrom:'');
  cellText(4,  toCity,   hasReturn?retTo:'');
  cellText(5,  flOut,    hasReturn?flRet:'');
  cellText(6,  cls,      hasReturn?cls:'');
  cellText(7,  trip.plant||'');
  cellText(8,  trip.purpose||'');
  cellText(9,  ta.allocation||'');
  cellText(10, ta.entity||'');
  cellText(11, ta.extension?ddmmyyyy(ta.extension):'');

  // Requested By: signature at bottom, date below signature
  const rc=cols[12];
  // Signature image in bottom portion of cell
  try{
    if(typeof STORED_SIG_B64!=='undefined'&&STORED_SIG_B64){
      // Place signature at bottom-left, small
      doc.addImage(STORED_SIG_B64,'PNG',rc.x+1,y+dataH*0.3,rc.w*0.55,dataH*0.55);
    }
  }catch(e){}
  if(reqDate){
    doc.setFontSize(6);
    doc.text(reqDate,rc.x+rc.w/2,y+dataH-2,{align:'center'});
  }

  // Approved By: blank
  // (already drawn by forEach above)

  y+=dataH;

  // ── EMPTY ROWS filling the rest of the page ──
  const remaining=Math.floor((H-y-6)/emptyH);
  const numEmpty=Math.max(remaining,15);
  for(let i=0;i<numEmpty;i++){
    if(y+emptyH>H-4) break;
    doc.rect(mg,y,tableW,emptyH,'S');
    cols.forEach(c=>doc.rect(c.x,y,c.w,emptyH,'S'));
    y+=emptyH;
  }

  // ── FOOTER ──
  doc.setFontSize(6);
  doc.setTextColor(160,160,160);
  doc.text('Generated by VCS PlantLog Pro · '+new Date().toLocaleDateString('en-GB'),mg,H-2);

  const safePlant=(trip.plant||'TA').replace(/[^a-zA-Z0-9\s]/g,'').replace(/\s+/g,'_').slice(0,25);
  const fn2=`TA_${(ta.taNo||'NoNum').replace(/[^a-zA-Z0-9]/g,'')}_${safePlant}_${(trip.date||'').replace(/-/g,'')}.pdf`;
  showPdfSaveOptions(doc,fn2,'ta',tripId);
}


