'use strict';
// =====================================================
// PlantLog — tasks.js
// Task CRUD, kanban, sub-checklist, flight details
// =====================================================

// ═══════ TASKS ═══════
function populateTaskTripSelect(){
  const sel=document.getElementById('task-trip');
  if(!sel)return;
  sel.innerHTML='<option value="">None</option>'+S.trips.map(tr=>`<option value="${tr.id}">${tr.plant} (${fmtDate(tr.date)})</option>`).join('');
}
function populateMachineSelect(){
  const sel=document.getElementById('task-machine');if(!sel)return;
  const machines=S.machines||[];
  sel.innerHTML='<option value="">None</option>'+machines.map(m=>`<option value="${m}">${m}</option>`).join('');
}
function populatePlanSelect(){
  const sel=document.getElementById('task-plan');if(!sel)return;
  const plans=S.plans||[];
  sel.innerHTML='<option value="">None</option>'+plans.map(p=>`<option value="${p}">${p}</option>`).join('');
}
function addNewMachine(){
  const name=prompt('New machine / equipment name:');
  if(!name||!name.trim())return;
  if(!S.machines)S.machines=[];
  if(!S.machines.includes(name.trim()))S.machines.push(name.trim());
  sv();populateMachineSelect();
  document.getElementById('task-machine').value=name.trim();
}
function addNewPlan(){
  const name=prompt('New plan / project name:');
  if(!name||!name.trim())return;
  if(!S.plans)S.plans=[];
  if(!S.plans.includes(name.trim()))S.plans.push(name.trim());
  sv();populatePlanSelect();
  document.getElementById('task-plan').value=name.trim();
}
let taskCat='all', taskStatusFilter='all';
// Global helper — always returns today's date string
function todayStr(){ return new Date().toISOString().slice(0,10); }

let editingTaskId=null;
let editingTripId=null;

function setTaskCat(cat){
  taskCat=cat;
  document.querySelectorAll('.cat-tab').forEach(b=>b.classList.remove('active'));
  const tabs=document.getElementById('cat-tabs');
  if(tabs){
    const idx={'all':0,'work':1,'leave':2,'travel':3,'kanban':4}[cat]||0;
    tabs.children[idx].classList.add('active');
  }
  // Hide status filter row for kanban
  const sfRowEl=document.querySelector('#screen-tasks .task-filter, #screen-tasks .tf-btn'); const sfRow=sfRowEl?sfRowEl.parentElement:null;
  renderTasks();
}
function setStatusFilter(sf){
  taskStatusFilter=sf;
  ['all','pending','in_progress','done'].forEach(id=>{
    const el=document.getElementById('sf-'+id);
    if(el)el.classList.toggle('active',id===sf);
  });
  renderTasks();
}
// Legacy setTaskView kept for compatibility
function setTaskView(view,filter){
  if(view==='kanban')setTaskCat('kanban');
  else{setTaskCat('all');setStatusFilter(filter);}
}

function openNewTaskModal(prefillDate, prefillCat){
  editingTaskId=null;
  document.getElementById('task-modal-title').textContent='New Task';
  document.getElementById('task-edit-id').textContent='';
  // Clear all fields
  ['task-title','task-desc','task-date-start','task-time-start','task-date-end','task-time-end','task-hours','task-minutes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=id.includes('time-start')?'08:00':id.includes('time-end')?'17:00':'';});
  document.getElementById('task-priority').value='medium';
  document.getElementById('task-period').value='weekly';
  selectTaskCat(prefillCat||'work');
  if(prefillDate)document.getElementById('task-date-start').value=prefillDate;
  populateTaskTripSelect();populateMachineSelect();populatePlanSelect();
  resetTaskCheckItems();
  resetPartRows();
  resetTaskFlightFields();
  openModal('modal-new-task');
}

function openEditTaskModal(id){
  const tk=S.tasks.find(t=>t.id===id);if(!tk)return;
  editingTaskId=id;
  document.getElementById('task-modal-title').textContent='Edit Task';
  document.getElementById('task-edit-id').textContent='#'+id.slice(-6);
  document.getElementById('task-title').value=tk.title||'';
  document.getElementById('task-desc').value=tk.desc||'';
  document.getElementById('task-date-start').value=tk.dateStart||tk.date||'';
  document.getElementById('task-time-start').value=tk.timeStart||tk.time||'08:00';
  document.getElementById('task-date-end').value=tk.dateEnd||'';
  document.getElementById('task-time-end').value=tk.timeEnd||'17:00';
  document.getElementById('task-hours').value=tk.hours||'';
  document.getElementById('task-minutes').value=tk.minutes||'';
  document.getElementById('task-priority').value=tk.priority||'medium';
  document.getElementById('task-period').value=tk.period||'weekly';
  selectTaskCat(tk.category||'work');
  populateTaskTripSelect();populateMachineSelect();populatePlanSelect();
  resetTaskCheckItems();
  if(tk.checklist)loadTaskCheckItems(tk.checklist);
  resetPartRows();
  if(tk.parts&&tk.parts.length)loadPartRows(tk.parts);
  resetTaskFlightFields();
  if(tk.flight&&tk.category==='travel')loadTaskFlightFields(tk.flight);
  setTimeout(()=>{
    if(tk.machine)document.getElementById('task-machine').value=tk.machine;
    if(tk.plan)document.getElementById('task-plan').value=tk.plan;
    if(tk.tripId)document.getElementById('task-trip').value=tk.tripId;
  },60);
  openModal('modal-new-task');
}

// ── FLIGHT TOGGLE FUNCTIONS ─────────────────────────────
function toggleTripFlight(){
  const sel=document.getElementById('nt-transport');
  const sec=document.getElementById('trip-flight-section');
  if(!sec)return;
  const show=sel&&(sel.value.toLowerCase().includes('flight'));
  sec.style.display=show?'':'none';
}
function toggleTripReturnFlight(){
  const chk=document.getElementById('nt-fl-has-return');
  const sec=document.getElementById('nt-fl-return-section');
  if(sec)sec.style.display=(chk&&chk.checked)?'':'none';
}
function toggleReturnFlight(){
  const chk=document.getElementById('fl-has-return');
  const sec=document.getElementById('fl-return-section');
  if(sec)sec.style.display=(chk&&chk.checked)?'':'none';
}

function selectTaskCat(cat){
  ['work','leave','travel'].forEach(c=>{
    const btn=document.getElementById('cat-'+c);
    if(btn){btn.classList.remove('sel');btn.classList.toggle('sel',c===cat);}
  });
  if(document.getElementById('task-cat-val'))document.getElementById('task-cat-val').value=cat;
  // Show/hide trip section (hide for leave)
  const ts=document.getElementById('task-trip-section');
  if(ts)ts.style.display=(cat==='leave')?'none':'';
  // Show flight details only for travel
  const fs=document.getElementById('task-flight-section');
  if(fs)fs.style.display=(cat==='travel')?'':'none';
  // Show parts toggle only for work
  const pt=document.getElementById('task-parts-toggle-row');
  if(pt)pt.style.display=(cat==='work')?'':'none';
  // Hide parts section if switching away from work
  if(cat!=='work'){
    const ps=document.getElementById('task-parts-section');
    if(ps)ps.style.display='none';
  }
}
function getSelectedCat(){
  for(const c of['work','leave','travel']){
    const btn=document.getElementById('cat-'+c);
    if(btn&&btn.classList.contains('sel'))return c;
  }return'work';
}

function saveNewTask(){
  const title=document.getElementById('task-title').value.trim();
  const dateStart=document.getElementById('task-date-start').value;
  if(!title||!dateStart){showToast('Title and start date are required');return;}
  const now=new Date().toISOString();
  const task={
    id: editingTaskId||('task_'+Date.now()),
    title,
    desc:document.getElementById('task-desc').value,
    category:getSelectedCat(),
    dateStart,
    timeStart:document.getElementById('task-time-start').value,
    dateEnd:document.getElementById('task-date-end').value||dateStart,
    timeEnd:document.getElementById('task-time-end').value,
    hours:document.getElementById('task-hours').value,
    minutes:document.getElementById('task-minutes').value,
    priority:document.getElementById('task-priority').value,
    period:document.getElementById('task-period').value,
    machine:document.getElementById('task-machine').value,
    plan:document.getElementById('task-plan').value,
    tripId:document.getElementById('task-trip').value,
    status: editingTaskId?(S.tasks.find(t=>t.id===editingTaskId)||{}).status||'pending':'pending',
    // legacy compat
    date:dateStart,
    time:document.getElementById('task-time-start').value,
    createdAt: editingTaskId?(S.tasks.find(t=>t.id===editingTaskId)||{}).createdAt||now:now,
    updatedAt:now,
    checklist:[...taskCheckItems],
    parts:[...taskPartsItems],
    flight:(document.getElementById('task-cat-val')&&document.getElementById('task-cat-val').value==='travel')?getTaskFlightFields():null
  };
  if(editingTaskId){
    const idx=S.tasks.findIndex(t=>t.id===editingTaskId);
    if(idx>=0)S.tasks[idx]=task;else S.tasks.push(task);
  } else {
    S.tasks.push(task);
  }
  const wasEditing=!!editingTaskId;
  sv();closeModal('modal-new-task');editingTaskId=null;
  Store.commit('task:save');
  showToast((wasEditing?'Task updated':'Task saved')+' ✓');
  if(Notification.permission==='granted')scheduleNotifications();
}

function calcDuration(tk){
  if(tk.hours||tk.minutes){
    const h=parseInt(tk.hours)||0,m=parseInt(tk.minutes)||0;
    return h>0&&m>0?`${h}h ${m}m`:h>0?`${h}h`:`${m}m`;
  }
  // Only calculate from dates if ALL four values are valid non-empty strings
  const ds=tk.dateStart||tk.date||'';
  const de=tk.dateEnd||ds;
  const ts=tk.timeStart||'';
  const te=tk.timeEnd||'';
  // Guard: date must match YYYY-MM-DD format
  const dateRx=/^\d{4}-\d{2}-\d{2}$/;
  const timeRx=/^\d{2}:\d{2}$/;
  if(ds&&de&&ts&&te&&dateRx.test(ds)&&dateRx.test(de)&&timeRx.test(ts)&&timeRx.test(te)){
    try{
      const s=new Date(ds+'T'+ts);
      const e=new Date(de+'T'+te);
      if(isNaN(s.getTime())||isNaN(e.getTime()))return'';
      const diff=e-s;if(diff<=0)return'';
      const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000);
      return h>0&&m>0?`${h}h ${m}m`:h>0?`${h}h`:`${m}m`;
    }catch(e){}
  }
  return'';
}

function catConfig(cat){
  return{
    work:{label:'Work',icon:'🔧',color:'var(--green)',bg:'var(--gl)',text:'var(--gd)'},
    leave:{label:'Leave',icon:'🌴',color:'var(--amber)',bg:'var(--al)',text:'#92400E'},
    travel:{label:'Travel',icon:'✈️',color:'var(--blue)',bg:'var(--bl)',text:'#1E40AF'},
  }[cat]||{label:'Task',icon:'📋',color:'var(--g400)',bg:'var(--g100)',text:'var(--g600)'};
}
function prioConfig(p){
  return{high:{dot:'prio-high',label:'High'},medium:{dot:'prio-medium',label:'Med'},low:{dot:'prio-low',label:'Low'},critical:{dot:'',label:'Critical',extra:'background:var(--pl);color:var(--purple);'}}[p]||{dot:'prio-low',label:p};
}
function periodLabel(p){return{daily:'Day',weekly:'Week',monthly:'Month',yearly:'Year'}[p]||p||'';}

function renderTasks(){
  const body=document.getElementById('task-list-body');
  if(!body)return;
  const today=new Date().toISOString().slice(0,10);

  if(taskCat==='kanban'){
    renderKanban(body, today);return;
  }

  // Filter by category
  let tasks=S.tasks.slice();
  if(taskCat!=='all')tasks=tasks.filter(tk=>(tk.category||'work')===taskCat);
  if(taskStatusFilter!=='all')tasks=tasks.filter(tk=>tk.status===taskStatusFilter);

  // Text search — title, desc, machine, plan, trip plant
  const tq=((document.getElementById('task-search')||{}).value||'').toLowerCase().trim();
  if(tq)tasks=tasks.filter(tk=>{
    if((tk.title||'').toLowerCase().includes(tq))return true;
    if((tk.desc||'').toLowerCase().includes(tq))return true;
    if((tk.machine||'').toLowerCase().includes(tq))return true;
    if((tk.plan||'').toLowerCase().includes(tq))return true;
    const tr=S.trips.find(t=>t.id===tk.tripId);
    return !!(tr&&(tr.plant||'').toLowerCase().includes(tq));
  });

  const tdfEl=document.getElementById('task-from'); const tdf=tdfEl?tdfEl.value:'';
  const tdtEl=document.getElementById('task-to'); const tdt=tdtEl?tdtEl.value:'';
  if(tdf)tasks=tasks.filter(tk=>(tk.dateStart||tk.date||'')>=tdf);
  if(tdt)tasks=tasks.filter(tk=>(tk.dateStart||tk.date||'')<=tdt);

  // Active filter label
  const tlbl=document.getElementById('task-active-filter');
  if(tlbl){const tp=[];if(tq)tp.push('"'+tq+'"');if(tdf||tdt)tp.push((tdf||'start')+' → '+(tdt||'end'));tlbl.style.display=tp.length?'':'none';tlbl.textContent=tp.length?'Showing '+tasks.length+' task'+(tasks.length!==1?'s':'')+' · '+tp.join(' · '):'';}

  tasks.sort((a,b)=>(b.dateStart||b.date||'').localeCompare(a.dateStart||a.date||''));
  // Summary stats
  const total=tasks.length;
  const pend=tasks.filter(t=>t.status==='pending').length;
  const inp=tasks.filter(t=>t.status==='in_progress').length;
  const done=tasks.filter(t=>t.status==='done').length;
  const over=tasks.filter(t=>(t.dateEnd||t.date||t.dateStart||'')< today&&t.status!=='done').length;

  let html=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;">
    <div style="background:#fff;border:1px solid var(--n150);border-radius:var(--r);padding:10px 6px;text-align:center;box-shadow:var(--sh);">
      <div style="font-family:var(--font-hd);font-size:20px;font-weight:700;color:var(--n700);line-height:1;">${total}</div>
      <div style="font-size:10px;color:var(--n400);margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Total</div>
    </div>
    <div style="background:#fff;border:1px solid var(--n150);border-radius:var(--r);padding:10px 6px;text-align:center;box-shadow:var(--sh);">
      <div style="font-family:var(--font-hd);font-size:20px;font-weight:700;color:var(--n500);line-height:1;">${pend}</div>
      <div style="font-size:10px;color:var(--n400);margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Pending</div>
    </div>
    <div style="background:#fff;border:1px solid var(--n150);border-radius:var(--r);padding:10px 6px;text-align:center;box-shadow:var(--sh);">
      <div style="font-family:var(--font-hd);font-size:20px;font-weight:700;color:var(--amber);line-height:1;">${inp}</div>
      <div style="font-size:10px;color:var(--n400);margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Active</div>
    </div>
    <div style="background:#fff;border:1px solid var(--n150);border-radius:var(--r);padding:10px 6px;text-align:center;box-shadow:var(--sh);">
      <div style="font-family:var(--font-hd);font-size:20px;font-weight:700;color:var(--brand);line-height:1;">${done}</div>
      <div style="font-size:10px;color:var(--n400);margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Done</div>
    </div>
  </div>`;

  if(!tasks.length){
    html+=`<div class="empty"><div class="ei">${taskCat==='leave'?'🌴':taskCat==='travel'?'✈️':'📋'}</div><div class="et">No ${taskCat==='all'?'tasks':taskCat+' tasks'} yet.<br>Tap + to add.</div></div>`;
    body.innerHTML=html;return;
  }

  html+=tasks.map(tk=>{
    const isOver=(tk.dateEnd||tk.date||tk.dateStart||'')<today&&tk.status!=='done';
    const cat=tk.category||'work';
    const cc=catConfig(cat);
    const pc=prioConfig(tk.priority);
    const dur=calcDuration(tk);
    const dStart=tk.dateStart||tk.date||'';
    // Only use dateEnd if it's a valid YYYY-MM-DD date, not a time or empty string
    const dateRx=/^\d{4}-\d{2}-\d{2}$/;
    const dEnd=(tk.dateEnd&&dateRx.test(tk.dateEnd))?tk.dateEnd:dStart;
    const dateRange=(dStart&&dEnd&&dStart!==dEnd)?`${fmtDate(dStart)} → ${fmtDate(dEnd)}`:fmtDate(dStart);
    const trip=tk.tripId?(S.trips.find(tr=>tr.id===tk.tripId)||{}).plant||'':'' ;
    return `<div class="task-card-v4" onclick="openTaskDetail('${tk.id}')">
      <div class="tc-bar ${isOver?'overdue':cat}"></div>
      <div class="tc-body">
        <div class="tc-head">
          <div class="tc-title">${tk.title}</div>
          <div class="tc-badges">
            ${periodLabel(tk.period)?`<span class="period-badge">${periodLabel(tk.period)}</span>`:''}
            <span class="prio-dot ${pc.dot}" style="${pc.extra||''}"></span>
          </div>
        </div>
        ${tk.desc?`<div style="font-size:12px;color:var(--g500);margin-bottom:6px;line-height:1.4;">${tk.desc.substring(0,70)}${tk.desc.length>70?'…':''}</div>`:''}
        <div class="tc-meta">
          <span class="tc-meta-item">📅 ${dateRange}</span>
          ${tk.timeStart?`<span class="tc-meta-item">⏰ ${tk.timeStart}${tk.timeEnd?' – '+tk.timeEnd:''}</span>`:''}
          ${dur?`<span class="tc-meta-item">⏱ ${dur}</span>`:''}
          ${tk.machine?`<span class="tc-meta-item">🔩 ${tk.machine}</span>`:''}
          ${tk.plan?`<span class="tc-meta-item">📁 ${tk.plan}</span>`:''}
          ${trip?`<span class="tc-meta-item">🏭 ${trip}</span>`:''}
          ${isOver?`<span class="tc-meta-item" style="color:var(--red);font-weight:600;">⚠ Overdue</span>`:''}
        </div>
        ${tk.checklist&&tk.checklist.length?`<div style="display:flex;align-items:center;gap:5px;margin-bottom:6px;">
          <div style="flex:1;height:4px;background:var(--g200);border-radius:2px;overflow:hidden;">
            <div style="height:100%;border-radius:2px;background:var(--green);width:${Math.round((tk.checklist.filter(c=>c.done).length/tk.checklist.length)*100)}%;transition:width 0.3s;"></div>
          </div>
          <span style="font-size:10px;color:var(--g500);flex-shrink:0;">${tk.checklist.filter(c=>c.done).length}/${tk.checklist.length}</span>
        </div>`:''}
        <div class="tc-footer">
          <span class="badge" style="background:${cc.bg};color:${cc.text};font-size:10px;">${cc.icon} ${cc.label}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <div class="status-seg">
              <button class="ss-btn ${tk.status==='pending'?'active-p':''}" onclick="event.stopPropagation();setTaskStatus('${tk.id}','pending')" title="Pending">○</button>
              <button class="ss-btn ${tk.status==='in_progress'?'active-ip':''}" onclick="event.stopPropagation();setTaskStatus('${tk.id}','in_progress')" title="In Progress">◑</button>
              <button class="ss-btn ${tk.status==='done'?'active-d':''}" onclick="event.stopPropagation();setTaskStatus('${tk.id}','done')" title="Done">●</button>
            </div>
            <button class="db" onclick="event.stopPropagation();deleteTask('${tk.id}')" style="flex-shrink:0;">×</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  body.innerHTML=html;
}

function renderKanban(body, today){
  const cats=taskCat==='all'?['work','leave','travel']:['work','leave','travel'].filter(c=>c===taskCat||taskCat==='all');
  const statuses=[{key:'pending',label:'Pending'},{key:'in_progress',label:'In Progress'},{key:'done',label:'Done'}];
  let html=`<div class="kanban-board">`;
  statuses.forEach(st=>{
    const items=S.tasks.filter(tk=>tk.status===st.key&&(taskCat==='all'||(tk.category||'work')===taskCat))
      .sort((a,b)=>(b.dateStart||b.date||'').localeCompare(a.dateStart||a.date||''));
    const overdue=items.filter(tk=>(tk.dateEnd||tk.date||tk.dateStart||'')<today&&st.key!=='done').length;
    html+=`<div class="kb-col">
      <div class="kb-col-hdr">
        <span class="kb-col-title">${st.label}</span>
        <div style="display:flex;gap:4px;">
          ${overdue?`<span class="kb-count" style="background:var(--rl);color:var(--red);">⚠${overdue}</span>`:''}
          <span class="kb-count">${items.length}</span>
        </div>
      </div>
      ${items.length?items.map(tk=>{
        const isOver=(tk.dateEnd||tk.date||tk.dateStart||'')<today&&st.key!=='done';
        const cat=tk.category||'work';const cc=catConfig(cat);
        return`<div class="kb-card ${isOver?'overdue':cat}" onclick="openTaskDetail('${tk.id}')">
          <div class="kb-card-title">${tk.title}</div>
          <div class="kb-card-meta">${fmtDate(tk.dateStart||tk.date||'')}${tk.timeStart?' · '+tk.timeStart:''}</div>
          <div style="display:flex;gap:4px;margin-top:5px;">
            <span class="badge" style="background:${cc.bg};color:${cc.text};font-size:9px;padding:2px 6px;">${cc.icon} ${cc.label}</span>
            ${tk.period?`<span class="period-badge">${periodLabel(tk.period)}</span>`:''}
          </div>
        </div>`;
      }).join(''):`<div style="text-align:center;padding:20px 10px;font-size:11px;color:var(--g400);">Empty</div>`}
    </div>`;
  });
  html+=`</div>`;
  body.innerHTML=html;
}

function setTaskStatus(id,status){
  const tk=S.tasks.find(t=>t.id===id);if(!tk)return;
  tk.status=status;tk.updatedAt=new Date().toISOString();
  Store.commit('task:status');
}
function deleteTask(id){
  if(!confirm('Delete this task?'))return;
  S.tasks=S.tasks.filter(t=>t.id!==id);sv();renderTasks();renderDash();renderCalendar();
  svAndSync('task_delete');
}
function toggleDetailCheck(taskId, checkId){
  const tk=S.tasks.find(t=>t.id===taskId);
  if(!tk||!tk.checklist)return;
  const ci=tk.checklist.find(c=>c.id===checkId);
  if(ci){ci.done=!ci.done;tk.updatedAt=new Date().toISOString();}
  sv();svAndSync('checklist');
}

function openTaskDetail(id){
  const tk=S.tasks.find(t=>t.id===id);if(!tk)return;
  const today=new Date().toISOString().slice(0,10);
  const isOver=(tk.dateEnd||tk.date||tk.dateStart||'')<today&&tk.status!=='done';
  const cat=tk.category||'work';const cc=catConfig(cat);
  const dur=calcDuration(tk);
  const trip=tk.tripId?(S.trips.find(tr=>tr.id===tk.tripId)||{}).plant||'':'' ;
  const dStart=tk.dateStart||tk.date||'';
  // Only use dateEnd if it's a real YYYY-MM-DD, not empty/time string
  const _dateRx=/^\d{4}-\d{2}-\d{2}$/;
  const dEnd=(tk.dateEnd&&_dateRx.test(tk.dateEnd))?tk.dateEnd:dStart;
  // Only show times if they look like HH:MM
  const _timeRx=/^\d{2}:\d{2}/;
  const showTimeStart=tk.timeStart&&_timeRx.test(tk.timeStart);
  const showTimeEnd=tk.timeEnd&&_timeRx.test(tk.timeEnd);
  document.getElementById('task-detail-content').innerHTML=`
    <div class="detail-hero">
      <span class="detail-cat-badge" style="background:${cc.bg};color:${cc.text};">${cc.icon} ${cc.label}${isOver?' · <span style=color:var(--red)>Overdue</span>':''}</span>
      <div class="detail-title">${tk.title}</div>
      ${tk.desc?`<div style="font-size:13px;color:var(--g600);line-height:1.5;">${tk.desc}</div>`:''}
    </div>
    <div class="detail-grid" style="margin-bottom:14px;">
      <div class="dg-item"><div class="dg-label">Start</div><div class="dg-val">${fmtDate(dStart)}${showTimeStart?' ⏰ '+tk.timeStart:''}</div></div>
      <div class="dg-item"><div class="dg-label">End</div><div class="dg-val">${fmtDate(dEnd)}${showTimeEnd?' ⏰ '+tk.timeEnd:''}</div></div>
      ${dur?`<div class="dg-item"><div class="dg-label">Duration</div><div class="dg-val">${dur}</div></div>`:''}
      <div class="dg-item"><div class="dg-label">Priority</div><div class="dg-val">${tk.priority||'—'}</div></div>
      <div class="dg-item"><div class="dg-label">Period</div><div class="dg-val">${periodLabel(tk.period)||'—'}</div></div>
      ${tk.machine?`<div class="dg-item"><div class="dg-label">Machine</div><div class="dg-val">${tk.machine}</div></div>`:''}
      ${tk.plan?`<div class="dg-item"><div class="dg-label">Plan</div><div class="dg-val">${tk.plan}</div></div>`:''}
      ${trip?`<div class="dg-item"><div class="dg-label">Trip</div><div class="dg-val">${trip}</div></div>`:''}
    </div>
    ${(tk.parts&&tk.parts.length)?`<div style="margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;color:var(--n400);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">🔩 PARTS / MATERIALS (${tk.parts.length})</div>
      <div style="background:var(--n50);border-radius:var(--rs);overflow:hidden;border:1px solid var(--n150);">
        ${tk.parts.map(p=>{const sc={ready:{bg:'var(--brand-light)',color:'var(--brand-dark)',label:'✅ Ready'},on_order:{bg:'var(--bl)',color:'var(--bd)',label:'📦 On Order'},notyet:{bg:'var(--rl)',color:'var(--rd)',label:'❌ Not Yet'}}[p.status||'notyet'];return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--n150);"><div style="flex:1;min-width:0;">'+(p.partNo?'<div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--brand);">'+p.partNo+'</div>':'')+'<div style="font-size:13px;font-weight:500;color:var(--n800);">'+(p.desc||'(no description)')+'</div><div style="font-size:11px;color:var(--n500);margin-top:2px;display:flex;gap:8px;flex-wrap:wrap;">'+(p.brand?'<span>🏷 '+p.brand+'</span>':'')+(p.machine?'<span>⚙️ '+p.machine+'</span>':'')+'<span>Qty: '+(p.qty||1)+'</span></div></div><span style="background:'+sc.bg+';color:'+sc.color+';padding:3px 9px;border-radius:4px;font-size:10px;font-weight:700;white-space:nowrap;">'+sc.label+'</span></div>';}).join('')}
      </div>
    </div>`:''}
    ${tk.checklist&&tk.checklist.length?`
    <div style="font-size:11px;font-weight:600;color:var(--g500);margin-bottom:6px;">CHECKLIST (${tk.checklist.filter(c=>c.done).length}/${tk.checklist.length})</div>
    <div style="background:var(--g100);border-radius:var(--rs);padding:8px 10px;margin-bottom:12px;">
      ${tk.checklist.map(ci=>`<div style="display:flex;align-items:center;gap:7px;padding:4px 0;border-bottom:1px solid var(--g200);">
        <span style="width:16px;height:16px;border-radius:50%;background:${ci.done?'var(--green)':'var(--g300)'};display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;flex-shrink:0;">${ci.done?'✓':''}</span>
        <span style="font-size:12px;${ci.done?'text-decoration:line-through;color:var(--g400);':''}">${ci.text}</span>
        <button onclick="toggleDetailCheck('${tk.id}','${ci.id}');openTaskDetail('${tk.id}')" style="margin-left:auto;font-size:10px;border:1px solid var(--g300);background:#fff;border-radius:4px;padding:2px 7px;cursor:pointer;color:var(--g600);">${ci.done?'Undo':'Done'}</button>
      </div>`).join('')}
    </div>`:''
    }
    <div style="font-size:11px;font-weight:600;color:var(--g500);margin-bottom:8px;">STATUS</div>
    <div class="status-seg" style="display:inline-flex;margin-bottom:14px;">
      <button class="ss-btn ${tk.status==='pending'?'active-p':''}" style="padding:8px 14px;font-size:13px;" onclick="setTaskStatus('${tk.id}','pending');openTaskDetail('${tk.id}')">○ Pending</button>
      <button class="ss-btn ${tk.status==='in_progress'?'active-ip':''}" style="padding:8px 14px;font-size:13px;" onclick="setTaskStatus('${tk.id}','in_progress');openTaskDetail('${tk.id}')">◑ In Progress</button>
      <button class="ss-btn ${tk.status==='done'?'active-d':''}" style="padding:8px 14px;font-size:13px;" onclick="setTaskStatus('${tk.id}','done');openTaskDetail('${tk.id}')">● Done</button>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-o" style="flex:1;" onclick="closeModal('modal-task-detail');openEditTaskModal('${tk.id}')">✏️ Edit</button>
      <button class="btn btn-d btn-sm" onclick="deleteTask('${tk.id}');closeModal('modal-task-detail')">🗑 Delete</button>
      <button class="btn btn-o btn-sm" onclick="closeModal('modal-task-detail')">Close</button>
    </div>`;
  openModal('modal-task-detail');
}

function openTaskForDay(){
  if(!selDay)return;
  closeModal('modal-task-detail');
  openNewTaskModal(selDay, taskCat==='kanban'?'work':taskCat==='all'?'work':taskCat);
}

// ── TASK SUB-CHECKLIST ───────────────────────────────────────
let taskCheckItems=[];  // [{id, text, done}] for current modal

function toggleTaskChecklist(){
  const body=document.getElementById('task-cl-body');
  const btn=document.getElementById('task-cl-toggle');
  const isOpen=body.style.display!=='none';
  body.style.display=isOpen?'none':'';
  btn.textContent=isOpen?'＋ Add items':'▲ Collapse';
  if(!isOpen){
    renderTaskCheckTemplates();
    renderTaskCheckItems();
  }
}

function renderTaskCheckTemplates(){
  const el=document.getElementById('task-cl-templates');
  if(!el)return;
  const templates=S.templates||[];
  if(!templates.length){el.innerHTML='<span style="font-size:11px;color:var(--g400);">No templates yet — add in Settings</span>';return;}
  el.innerHTML=templates.map((tmpl,i)=>{
    const already=taskCheckItems.some(ci=>ci.text===tmpl);
    return `<button onclick="addTemplateToTaskCheck(${i})"
      style="padding:4px 9px;border-radius:20px;font-size:11px;border:1px solid ${already?'var(--green)':'var(--g300)'};background:${already?'var(--gl)':'#fff'};color:${already?'var(--gd)':'var(--g600)'};cursor:pointer;font-family:var(--font);transition:all 0.15s;"
      ${already?'disabled':''}>
      ${already?'✓ ':''} ${tmpl}
    </button>`;
  }).join('');
}

function addTemplateToTaskCheck(idx){
  const tmpl=S.templates[idx];
  if(!tmpl||taskCheckItems.some(ci=>ci.text===tmpl))return;
  taskCheckItems.push({id:'tci_'+Date.now()+'_'+idx, text:tmpl, done:false});
  renderTaskCheckTemplates();
  renderTaskCheckItems();
  updateTaskCheckSummary();
}

function addTaskCheckItem(){
  const input=document.getElementById('task-cl-input');
  const text=(input.value||'').trim();
  if(!text)return;
  taskCheckItems.push({id:'tci_'+Date.now(), text, done:false});
  input.value='';
  renderTaskCheckItems();
  updateTaskCheckSummary();
}

function toggleTaskCheckDone(id){
  const item=taskCheckItems.find(ci=>ci.id===id);
  if(item)item.done=!item.done;
  renderTaskCheckItems();
  updateTaskCheckSummary();
}

function removeTaskCheckItem(id){
  taskCheckItems=taskCheckItems.filter(ci=>ci.id!==id);
  renderTaskCheckItems();
  renderTaskCheckTemplates();
  updateTaskCheckSummary();
}

function renderTaskCheckItems(){
  const el=document.getElementById('task-cl-items');
  if(!el)return;
  if(!taskCheckItems.length){el.innerHTML='';return;}
  el.innerHTML=taskCheckItems.map(ci=>`
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--g100);">
      <button onclick="toggleTaskCheckDone('${ci.id}')"
        style="width:20px;height:20px;border-radius:50%;border:1.5px solid ${ci.done?'var(--green)':'var(--g300)'};
        background:${ci.done?'var(--green)':'#fff'};color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">
        ${ci.done?'✓':''}
      </button>
      <span style="flex:1;font-size:13px;color:var(--g800);${ci.done?'text-decoration:line-through;color:var(--g400);':''}">
        ${ci.text}
      </span>
      <button onclick="removeTaskCheckItem('${ci.id}')"
        style="width:20px;height:20px;border-radius:50%;border:none;background:var(--g100);color:var(--g500);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;">×</button>
    </div>`).join('');
}

function updateTaskCheckSummary(){
  const el=document.getElementById('task-cl-summary');
  if(!el)return;
  if(!taskCheckItems.length){el.textContent='';return;}
  const done=taskCheckItems.filter(ci=>ci.done).length;
  el.textContent=`${taskCheckItems.length} items · ${done} done`;
}

function loadTaskCheckItems(items){
  taskCheckItems=(items||[]).map(ci=>({...ci}));
  updateTaskCheckSummary();
  // If there are items, auto-expand
  if(taskCheckItems.length){
    const body=document.getElementById('task-cl-body');
    const btn=document.getElementById('task-cl-toggle');
    if(body)body.style.display='';
    if(btn)btn.textContent='▲ Collapse';
    renderTaskCheckTemplates();
    renderTaskCheckItems();
  }
}

// ═══════ PARTS / MATERIALS ═══════
let taskPartsItems = [];  // [{id, partNo, desc, brand, qty, machine, status}]

function togglePartsSection(){
  const sec = document.getElementById('task-parts-section');
  const btn = document.getElementById('task-parts-toggle-btn');
  const catEl=document.getElementById('task-cat-val'); const cat = catEl?catEl.value:'work';
  if(cat !== 'work') return;
  const open = sec.style.display !== 'none';
  sec.style.display = open ? 'none' : '';
  btn.textContent = open ? '🔩 Add parts / materials required' : '🔩 Hide parts section';
  btn.style.borderStyle = open ? 'dashed' : 'solid';
  btn.style.borderColor = open ? 'var(--n300)' : 'var(--brand)';
  btn.style.color = open ? 'var(--n500)' : 'var(--brand)';
  if(!open) renderPartRows();
}

function addPartRow(){
  const id = 'part_' + Date.now();
  taskPartsItems.push({id, partNo:'', desc:'', brand:'', qty:'1', machine:'', status:'notyet'});
  renderPartRows();
}

function removePartRow(id){
  taskPartsItems = taskPartsItems.filter(p => p.id !== id);
  renderPartRows();
}

function updatePartField(id, field, value){
  const p = taskPartsItems.find(p => p.id === id);
  if(p) p[field] = value;
}

function renderPartRows(){
  const container = document.getElementById('task-parts-rows');
  const empty = document.getElementById('task-parts-empty');
  if(!container) return;
  if(!taskPartsItems.length){
    container.innerHTML = '';
    if(empty) empty.style.display = '';
    return;
  }
  if(empty) empty.style.display = 'none';
  const SC = {
    ready:    {bg:'var(--brand-light)', color:'var(--brand-dark)', label:'✅ Ready'},
    on_order: {bg:'var(--bl)',          color:'var(--bd)',         label:'📦 On Order'},
    notyet:   {bg:'var(--rl)',          color:'var(--rd)',         label:'❌ Not Yet'}
  };
  container.innerHTML = taskPartsItems.map((p, idx) => {
    const sc = SC[p.status] || SC.notyet;
    const num = idx + 1;
    return `
    <div style="background:#fff;border:1px solid var(--n150);border-radius:var(--r);margin-bottom:10px;overflow:hidden;box-shadow:var(--sh);">
      <!-- Card header: part number + status + delete -->
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--n50);border-bottom:1px solid var(--n150);">
        <div style="background:var(--brand);color:#fff;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;flex-shrink:0;">#${num}</div>
        <input class="fi" value="${p.partNo}" placeholder="Part / Item No."
          style="flex:1;font-size:13px;font-weight:700;padding:5px 8px;font-family:var(--mono);letter-spacing:0.05em;"
          oninput="updatePartField('${p.id}','partNo',this.value)"
          title="Part number">
        <select style="border:none;border-radius:var(--rs);padding:5px 8px;font-family:var(--font);font-size:11px;font-weight:700;cursor:pointer;background:${sc.bg};color:${sc.color};flex-shrink:0;"
          onchange="updatePartField('${p.id}','status',this.value);renderPartRows()">
          <option value="notyet"   ${p.status==='notyet'   ?'selected':''}>❌ Not Yet</option>
          <option value="on_order" ${p.status==='on_order' ?'selected':''}>📦 On Order</option>
          <option value="ready"    ${p.status==='ready'    ?'selected':''}>✅ Ready</option>
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
          <input class="fi" type="number" value="${p.qty||1}" min="1"
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

function resetPartRows(){
  taskPartsItems = [];
  renderPartRows();
  const sec = document.getElementById('task-parts-section');
  const btn = document.getElementById('task-parts-toggle-btn');
  if(sec) sec.style.display = 'none';
  if(btn){ btn.textContent='🔩 Add parts / materials required'; btn.style.borderStyle='dashed'; btn.style.borderColor='var(--n300)'; btn.style.color='var(--n500)';}
}

function loadPartRows(parts){
  taskPartsItems = (parts||[]).map(p=>({...p, id:p.id||'part_'+Date.now()+'_'+Math.random()}));
  if(taskPartsItems.length){
    const sec = document.getElementById('task-parts-section');
    const btn = document.getElementById('task-parts-toggle-btn');
    if(sec) sec.style.display = '';
    if(btn){ btn.textContent='🔩 Hide parts section'; btn.style.borderStyle='solid'; btn.style.borderColor='var(--brand)'; btn.style.color='var(--brand)';}
  }
  renderPartRows();
}

function resetTaskFlightFields(){
  ['fl-depart-num','fl-depart-airline','fl-depart-from','fl-depart-to','fl-depart-date','fl-depart-time','fl-arrive-time','fl-depart-terminal','fl-return-num','fl-return-airline','fl-return-from','fl-return-to','fl-return-date','fl-return-time','fl-return-arrive','fl-return-terminal','fl-pnr'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  const hasRet=document.getElementById('fl-has-return');if(hasRet)hasRet.checked=false;
  const retSec=document.getElementById('fl-return-section');if(retSec)retSec.style.display='none';
  const flSec=document.getElementById('task-flight-section');if(flSec)flSec.style.display='none';
}
function loadTaskFlightFields(f){
  if(!f)return;
  const flds=['fl-depart-num','fl-depart-airline','fl-depart-from','fl-depart-to','fl-depart-date','fl-depart-time','fl-arrive-time','fl-depart-terminal','fl-return-num','fl-return-airline','fl-return-from','fl-return-to','fl-return-date','fl-return-time','fl-return-arrive','fl-return-terminal','fl-pnr'];
  const keys=['depart_num','depart_airline','depart_from','depart_to','depart_date','depart_time','arrive_time','depart_terminal','return_num','return_airline','return_from','return_to','return_date','return_time','return_arrive','return_terminal','pnr'];
  flds.forEach((id,i)=>{const e=document.getElementById(id);if(e)e.value=f[keys[i]]||'';});
  const hasReturn=!!(f.return_num||f.return_from);
  const hasRet=document.getElementById('fl-has-return');if(hasRet)hasRet.checked=hasReturn;
  const retSec=document.getElementById('fl-return-section');if(retSec)retSec.style.display=hasReturn?'':'none';
  const flSec=document.getElementById('task-flight-section');if(flSec)flSec.style.display='';
}
function getTaskFlightFields(){
  const flds=['fl-depart-num','fl-depart-airline','fl-depart-from','fl-depart-to','fl-depart-date','fl-depart-time','fl-arrive-time','fl-depart-terminal','fl-return-num','fl-return-airline','fl-return-from','fl-return-to','fl-return-date','fl-return-time','fl-return-arrive','fl-return-terminal','fl-pnr'];
  const keys=['depart_num','depart_airline','depart_from','depart_to','depart_date','depart_time','arrive_time','depart_terminal','return_num','return_airline','return_from','return_to','return_date','return_time','return_arrive','return_terminal','pnr'];
  const o={};flds.forEach((id,i)=>{const e=document.getElementById(id);o[keys[i]]=e?e.value:'';});return o;
}
function resetTaskCheckItems(){
  taskCheckItems=[];
  const body=document.getElementById('task-cl-body');
  const btn=document.getElementById('task-cl-toggle');
  if(body)body.style.display='none';
  if(btn)btn.textContent='＋ Add items';
  const itemsEl=document.getElementById('task-cl-items');
  if(itemsEl)itemsEl.innerHTML='';
  const sumEl=document.getElementById('task-cl-summary');
  if(sumEl)sumEl.textContent='';
}




// ═══════ PARTS EXPORT (Excel + PDF) ═══════

function _collectAllParts(){
  return S.tasks
    .filter(tk => tk.parts && tk.parts.length)
    .sort((a,b)=>(b.dateStart||b.date||'').localeCompare(a.dateStart||a.date||''))
    .flatMap(tk =>
      (tk.parts||[]).map(p => {
        const trip = tk.tripId ? S.trips.find(t=>t.id===tk.tripId) : null;
        return {
          task:    tk.title,
          date:    fmtDate(tk.dateStart||tk.date||''),
          trip:    trip ? trip.plant : '—',
          partNo:  p.partNo||'',
          desc:    p.desc||'',
          brand:   p.brand||'',
          qty:     p.qty||1,
          machine: p.machine||'',
          status:  {ready:'Ready', on_order:'On Order', notyet:'Not Yet'}[p.status||'notyet']||'Not Yet'
        };
      })
    );
}

// ── Export to Excel (CSV that opens in Excel) ──────────
function exportPartsExcel(){
  const parts = _collectAllParts();
  if(!parts.length){ showToast('No parts data found'); return; }

  const headers = ['No.','Task','Date','Trip','Part No.','Description','Brand','Qty','Machine/Assembly','Status'];
  const rows = parts.map((p,i) => [
    i+1, p.task, p.date, p.trip, p.partNo, p.desc, p.brand, p.qty, p.machine, p.status
  ]);

  // Build CSV with BOM for Excel UTF-8
  const esc = v => `"${String(v).replace(/"/g,'""')}"`;
  let csv = '\uFEFF'; // BOM
  csv += headers.map(esc).join(',') + '\r\n';
  rows.forEach(r => { csv += r.map(esc).join(',') + '\r\n'; });

  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PlantLog_Parts_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('Parts list downloaded (Excel CSV) ✓');
}

// ── Export to PDF ──────────────────────────────────────
function exportPartsPDF(){
  if(typeof window.jspdf==='undefined'){ showToast('PDF loading…'); setTimeout(exportPartsPDF,1500); return; }
  const {jsPDF} = window.jspdf;
  const parts = _collectAllParts();
  if(!parts.length){ showToast('No parts data found'); return; }

  const doc = new jsPDF({orientation:'landscape', unit:'mm', format:'a4'});
  const W=297, mg=12;
  const p = S.profile;
  let y = 20;

  // Header
  doc.setFillColor(10,122,58); doc.rect(0,0,W,28,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold'); doc.setFontSize(14);
  doc.text('Parts & Materials Report', mg, 12);
  doc.setFont('helvetica','normal'); doc.setFontSize(8);
  doc.text(`${p.name||'Engineer'}${p.company?' · '+p.company:''}  ·  ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}`, mg, 19);
  doc.text(`Total: ${parts.length} part${parts.length!==1?'s':''}`, mg, 24);
  y = 34;

  // Status summary bar
  const ready    = parts.filter(p=>p.status==='Ready').length;
  const onOrder  = parts.filter(p=>p.status==='On Order').length;
  const notYet   = parts.filter(p=>p.status==='Not Yet').length;
  doc.setFont('helvetica','bold'); doc.setFontSize(9);
  doc.setTextColor(10,122,58);  doc.text(`✓ Ready: ${ready}`, mg, y);
  doc.setTextColor(27,95,180);  doc.text(`⊙ On Order: ${onOrder}`, mg+40, y);
  doc.setTextColor(192,57,43);  doc.text(`✗ Not Yet: ${notYet}`, mg+90, y);
  doc.setTextColor(33,37,41); y += 6;

  // Table headers
  const cols = [
    {label:'#',       w:8,  key:'_n'},
    {label:'Task',    w:48, key:'task'},
    {label:'Date',    w:22, key:'date'},
    {label:'Trip',    w:22, key:'trip'},
    {label:'Part No.',w:28, key:'partNo'},
    {label:'Description',w:52,key:'desc'},
    {label:'Brand',   w:24, key:'brand'},
    {label:'Qty',     w:12, key:'qty'},
    {label:'Machine', w:38, key:'machine'},
    {label:'Status',  w:22, key:'status'},
  ];
  const ROW_H = 7;

  const drawHeader = () => {
    doc.setFillColor(241,243,245);
    doc.rect(mg, y-4, W-mg*2, 7, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5);
    doc.setTextColor(80,80,80);
    let x = mg;
    cols.forEach(c => { doc.text(c.label, x+1, y); x += c.w; });
    doc.setDrawColor(200,200,200); doc.line(mg, y+2, W-mg, y+2);
    y += 6;
  };

  drawHeader();

  const statusColor = {
    'Ready':    [10,122,58],
    'On Order': [27,95,180],
    'Not Yet':  [192,57,43]
  };

  parts.forEach((p, i) => {
    if(y > 185){ doc.addPage(); y = 16; drawHeader(); }
    const row = {...p, _n: i+1};
    if(i%2===0){ doc.setFillColor(250,250,250); doc.rect(mg, y-4, W-mg*2, ROW_H, 'F'); }
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(33,37,41);
    let x = mg;
    cols.forEach(c => {
      const val = String(row[c.key]||'');
      if(c.key==='status'){
        const sc = statusColor[val]||[120,120,120];
        doc.setTextColor(...sc); doc.setFont('helvetica','bold');
      }
      const truncated = doc.splitTextToSize(val, c.w-2)[0]||'';
      doc.text(truncated, x+1, y);
      if(c.key==='status'){ doc.setTextColor(33,37,41); doc.setFont('helvetica','normal'); }
      x += c.w;
    });
    doc.setDrawColor(235,235,235); doc.line(mg, y+2, W-mg, y+2);
    y += ROW_H;
  });

  // Footer
  doc.setFontSize(7); doc.setTextColor(150,150,150);
  doc.text(`PlantLog Pro · Parts Report · ${new Date().toLocaleDateString('en-GB')}`, mg, 200);

  doc.save(`PlantLog_Parts_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.pdf`);
  showToast('Parts PDF downloaded ✓');
}

