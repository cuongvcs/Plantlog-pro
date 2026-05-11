/**
 * PlantLog v4 — REPORTS MODULE
 * Report steps, checklist, readings, issues, team, signoff, tasks picker
 * Lines 1111–1592 of original monolithic file
 */

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
