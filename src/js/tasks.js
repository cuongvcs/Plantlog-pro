/**
 * PlantLog v4 — TASKS MODULE
 * Task manager, kanban, filters
 * Lines 283–857 of original monolithic file
 */

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
    const idx={'all':0,'work':1,'leave':2,'travel':3,'kanban':4}[cat]??0;
    tabs.children[idx].classList.add('active');
  }
  // Hide status filter row for kanban
  const sfRow=document.querySelector('#screen-tasks .task-filter, #screen-tasks .tf-btn')?.parentElement;
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
  if(tk.dateStart&&tk.dateEnd&&tk.timeStart&&tk.timeEnd){
    try{
      const s=new Date(tk.dateStart+'T'+tk.timeStart);
      const e=new Date(tk.dateEnd+'T'+tk.timeEnd);
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
  const tq=(document.getElementById('task-search')?.value||'').toLowerCase().trim();
  if(tq)tasks=tasks.filter(tk=>{
    if((tk.title||'').toLowerCase().includes(tq))return true;
    if((tk.desc||'').toLowerCase().includes(tq))return true;
    if((tk.machine||'').toLowerCase().includes(tq))return true;
    if((tk.plan||'').toLowerCase().includes(tq))return true;
    const tr=S.trips.find(t=>t.id===tk.tripId);
    return !!(tr&&(tr.plant||'').toLowerCase().includes(tq));
  });

  // Date range filter
  const tdf=document.getElementById('task-from')?.value||'';
  const tdt=document.getElementById('task-to')?.value||'';
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

  let html=`<div class="task-stats">
    <div class="ts-box"><div class="ts-num" style="color:var(--g700);">${total}</div><div class="ts-lbl">Total</div></div>
    <div class="ts-box"><div class="ts-num" style="color:var(--g500);">${pend}</div><div class="ts-lbl">Pending</div></div>
    <div class="ts-box"><div class="ts-num" style="color:var(--amber);">${inp}</div><div class="ts-lbl">In Progress</div></div>
    <div class="ts-box"><div class="ts-num" style="color:var(--green);">${done}</div><div class="ts-lbl">Done</div></div>
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
    const dEnd=tk.dateEnd||dStart;
    const dateRange=dStart===dEnd?fmtDate(dStart):`${fmtDate(dStart)} → ${fmtDate(dEnd)}`;
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
          <div class="tc-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${dateRange}</div>
          ${tk.timeStart?`<div class="tc-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${tk.timeStart}${tk.timeEnd?' – '+tk.timeEnd:''}</div>`:''}
          ${dur?`<div class="tc-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${dur}</div>`:''}
          ${tk.machine?`<div class="tc-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8l-2 4h12z"/></svg>${tk.machine}</div>`:''}
          ${tk.plan?`<div class="tc-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>${tk.plan}</div>`:''}
          ${trip?`<div class="tc-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>${trip}</div>`:''}
          ${isOver?`<div class="tc-meta-item" style="color:var(--red);">⚠ Overdue</div>`:''}
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
  const dEnd=tk.dateEnd||dStart;
  document.getElementById('task-detail-content').innerHTML=`
    <div class="detail-hero">
      <span class="detail-cat-badge" style="background:${cc.bg};color:${cc.text};">${cc.icon} ${cc.label}${isOver?' · <span style=color:var(--red)>Overdue</span>':''}</span>
      <div class="detail-title">${tk.title}</div>
      ${tk.desc?`<div style="font-size:13px;color:var(--g600);line-height:1.5;">${tk.desc}</div>`:''}
    </div>
    <div class="detail-grid" style="margin-bottom:14px;">
      <div class="dg-item"><div class="dg-label">Start</div><div class="dg-val">${fmtDate(dStart)}${tk.timeStart?' '+tk.timeStart:''}</div></div>
      <div class="dg-item"><div class="dg-label">End</div><div class="dg-val">${fmtDate(dEnd)}${tk.timeEnd?' '+tk.timeEnd:''}</div></div>
      ${dur?`<div class="dg-item"><div class="dg-label">Duration</div><div class="dg-val">${dur}</div></div>`:''}
      <div class="dg-item"><div class="dg-label">Priority</div><div class="dg-val">${tk.priority||'—'}</div></div>
      <div class="dg-item"><div class="dg-label">Period</div><div class="dg-val">${periodLabel(tk.period)||'—'}</div></div>
      ${tk.machine?`<div class="dg-item"><div class="dg-label">Machine</div><div class="dg-val">${tk.machine}</div></div>`:''}
      ${tk.plan?`<div class="dg-item"><div class="dg-label">Plan</div><div class="dg-val">${tk.plan}</div></div>`:''}
      ${trip?`<div class="dg-item"><div class="dg-label">Trip</div><div class="dg-val">${trip}</div></div>`:''}
    </div>
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

