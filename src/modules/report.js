'use strict';
// =====================================================
// PlantLog — report.js
// Field report: checklist, readings, issues, PDF export
// =====================================================

// ═══════ STEPS ═══════
function gotoStep(n){
  for(let i=0;i<6;i++){
    const el=document.getElementById('step-'+i);if(el)el.style.display=i===n?'':'none';
    const tab=document.getElementById('step-tabs').children[i];
    if(tab){tab.classList.remove('active','done');if(i===n)tab.classList.add('active');else if(i<n)tab.classList.add('done');}
  }
  if(n===0)renderChecklist();
  if(n===1)renderReadings();
  if(n===2)renderIssues();
  if(n===3)renderTeam();
  if(n===4)renderReportTaskPicker();
  if(n===5)saveSignoff();
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

  // All tasks — show all, sorted by date then category
  const allTasks=[...S.tasks].sort((a,b)=>{
    const da=a.dateStart||a.date||'';
    const db=b.dateStart||b.date||'';
    return db.localeCompare(da)||a.title.localeCompare(b.title);
  });

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
      <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-bottom:${is.action?'4px':'0'};">
        <span style="font-size:10px;font-weight:600;color:var(--g500);">STATUS:</span>
        ${['pending','waiting_part','processing','done'].map(st=>{
          const sc=isStatusCfg[st];
          const active=((is.istatus||'pending')===st);
          return `<button onclick="setIssueStatus(${i},'${st}')" style="padding:3px 8px;border-radius:12px;border:1px solid ${active?'transparent':'var(--g300)'};background:${active?sc.bg:'#fff'};color:${active?sc.color:'var(--g500)'};font-size:10px;font-weight:${active?'600':'400'};cursor:pointer;font-family:var(--font);transition:all 0.15s;">${sc.label}</button>`;
        }).join('')}
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
  const files=Array.from(e.target.files);if(!files.length)return;
  const ctx=e.target.dataset&&e.target.dataset.context;
  let loaded=0;const photos=[];
  files.forEach(f=>{
    const r=new FileReader();
    r.onload=ev=>{
      photos.push(ev.target.result);
      if(++loaded===files.length){
        if(ctx==='bill'){
          tmpBillPhotos.push(...photos);
          renderBillPhotoGrid();
        } else if(ctx==='issue'&&typeof photoCtx==='number'){
          if(!curReport.issues[photoCtx].photos)curReport.issues[photoCtx].photos=[];
          curReport.issues[photoCtx].photos.push(...photos);
          sv();renderIssues();photoCtx=null;
        } else {
          tmpPhotos.push(...photos);renderTmpPhotos();
        }
        // Reset
        e.target.dataset.context='';
        _photoCtxPending=null;
      }
    };
    r.readAsDataURL(f);
  });
  e.target.value='';
}
function addPhotoToIssue(idx){photoCtx=idx;_photoCtxPending='issue';openPhotoSheet('issue');}
function delIPhoto(iIdx,pIdx){curReport.issues[iIdx].photos.splice(pIdx,1);sv();renderIssues();}
function handlePhoto(e){
  const files=Array.from(e.target.files);if(!files.length)return;
  const context=e.target.dataset&&e.target.dataset.context;
  let loaded=0;const photos=[];
  files.forEach(f=>{const r=new FileReader();r.onload=ev=>{photos.push(ev.target.result);if(++loaded===files.length){
    if(context==='bill'){
      tmpBillPhotos.push(...photos);
      renderBillPhotoGrid();
      e.target.dataset.context='';
    } else if(photoCtx!==null&&typeof photoCtx==='number'){
      if(!curReport.issues[photoCtx].photos)curReport.issues[photoCtx].photos=[];
      curReport.issues[photoCtx].photos.push(...photos);
      sv();renderIssues();photoCtx=null;
    } else {
      tmpPhotos.push(...photos);renderTmpPhotos();
    }
  }};r.readAsDataURL(f);});
  e.target.value='';
}
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
function saveSignoff(){if(!curReport)return;curReport.signoff={summary:document.getElementById('signoff-summary').value,result:signoffRes,remarks:document.getElementById('signoff-remarks').value};curReport.signature=sigCanvas.toDataURL();sv();svAndSync('report');}

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
function initSig(){
  sigCanvas=document.getElementById('sigCanvas');sigCtx=sigCanvas.getContext('2d');
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
      const tasks=sel.map(id=>S.tasks.find(t=>t.id===id)).filter(Boolean).sort((a,b)=>(b.dateStart||b.date||'').localeCompare(a.dateStart||a.date||'')||a.title.localeCompare(b.title));
      const catIcon=c=>({work:'🔧',leave:'🌴',travel:'✈️'}[c]||'📋');
      const statusIcon=s=>s==='done'?'✅':s==='in_progress'?'🔄':'⏳';
      // Group by date
      const byDate={};
      tasks.forEach(tk=>{const d=tk.dateStart||tk.date||'';if(!byDate[d])byDate[d]=[];byDate[d].push(tk);});
      let out=`<div class="pst">Tasks in Report (${tasks.length})</div>`;
      Object.entries(byDate).forEach(([dateKey,dayTasks])=>{
        if(dateKey)out+=`<div style="font-size:11px;font-weight:700;color:#00843D;padding:4px 0;border-bottom:1px solid #e8f5ee;margin-bottom:4px;">${fmtDate(dateKey)}</div>`;
        dayTasks.forEach(tk=>{
          const note=(r.reportTaskNotes||{})[tk.id]||'';
          const dur=calcDuration(tk);
          const timeStr=tk.timeStart?(tk.timeEnd?`${tk.timeStart}–${tk.timeEnd}`:tk.timeStart):'';
          out+=`<div style="margin-bottom:8px;padding:6px 8px;background:var(--g50);border-radius:6px;border-left:3px solid ${tk.category==='leave'?'var(--amber)':tk.category==='travel'?'var(--blue)':'var(--green)'};">
            <div style="font-size:12px;font-weight:500;">${statusIcon(tk.status)} ${tk.title}</div>
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
  if(typeof window.jspdf==='undefined'){showToast('PDF loading...');setTimeout(exportPDF,1500);return;}
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
  doc.save(`PlantLog_${safePlant}_${(trip.date||'').replace(/-/g,'')}.pdf`);showToast('PDF downloaded ✓');
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
function markCompleted(){const trip=S.trips.find(tr=>tr.id===curTrip);if(trip){trip.status='completed';sv();showToast('Completed ✓');renderDash();renderTripList();svAndSync('trip_complete');}}

