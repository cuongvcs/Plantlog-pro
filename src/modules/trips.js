'use strict';
// =====================================================
// PlantLog — trips.js
// Trip CRUD, calendar, dashboard, filters
// =====================================================

// ═══════ TRIPS ═══════
function saveNewTrip(){
  const plant=document.getElementById('nt-plant').value.trim();
  const date=document.getElementById('nt-date').value;
  if(!plant||!date){showToast('Plant name and date required');return;}
  const clearForm=()=>{
    ['nt-plant','nt-location','nt-date','nt-date-end','nt-purpose','nt-contact'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('nt-transport').value='';
    resetTripFlightFields();
    document.getElementById('trip-modal-title').textContent='New Trip';
    document.getElementById('trip-edit-badge').textContent='';
    document.getElementById('trip-save-btn').textContent='Save trip';
  };
  if(editingTripId){
    const tr=S.trips.find(t=>t.id===editingTripId);
    if(tr){
      tr.plant=plant;tr.date=date;
      tr.dateEnd=document.getElementById('nt-date-end').value||date;
      tr.location=document.getElementById('nt-location').value;
      tr.purpose=document.getElementById('nt-purpose').value;
      tr.contact=document.getElementById('nt-contact').value;
      tr.transport=document.getElementById('nt-transport').value;
      tr.flight=tr.transport.toLowerCase().includes('flight')?getTripFlightFields():null;
      tr.updatedAt=new Date().toISOString();
      // notes preserved — not in the edit modal, edited inline
    }
    editingTripId=null;
    sv();closeModal('modal-new-trip');clearForm();
    Store.commit('trip:save');
    showToast('Trip updated ✓');
    if(curTrip)openTripDetail(curTrip);
    return;
  }
  const tripTransport=document.getElementById('nt-transport').value;
  const trip={id:'trip_'+Date.now(),plant,date,dateEnd:document.getElementById('nt-date-end').value||date,location:document.getElementById('nt-location').value,purpose:document.getElementById('nt-purpose').value,contact:document.getElementById('nt-contact').value,transport:tripTransport,flight:tripTransport.toLowerCase().includes('flight')?getTripFlightFields():null,status:'planned',createdAt:new Date().toISOString()};
  S.trips.push(trip);
  S.reports[trip.id]={checklist:S.templates.map((tmpl,i)=>({id:'ci'+i+Date.now(),name:tmpl,result:'',note:''})),readings:[],issues:[],team:[...S.defaultTeam.map(m=>({...m,id:'tm'+Date.now()+Math.random()}))],signoff:{summary:'',result:'Completed',remarks:''},signature:'',reportTasks:[],reportTaskNotes:{}};
  sv();closeModal('modal-new-trip');clearForm();
  Store.commit('trip:save');
  showToast(t('saveTrip')+' ✓');
  if(Notification.permission==='granted')scheduleNotifications();
}
// ── FILTER HELPERS ──────────────────────────────────────────
function toggleTripDateRow(){
  const row=document.getElementById('trip-date-row');
  const btn=document.getElementById('trip-date-toggle');
  const open=row&&row.style.display!=='none';
  if(row)row.style.display=open?'none':'';
  if(btn){btn.style.background=open?'#fff':'var(--gl)';btn.style.borderColor=open?'var(--g200)':'var(--green)';btn.style.color=open?'var(--g600)':'var(--gd)';}
}
function clearTripDates(){
  const f=document.getElementById('trip-from');const t=document.getElementById('trip-to');
  if(f)f.value='';if(t)t.value='';renderTripList();
}
function toggleTaskDateRow(){
  const row=document.getElementById('task-date-row');
  const btn=document.getElementById('task-date-toggle');
  const open=row&&row.style.display!=='none';
  if(row)row.style.display=open?'none':'';
  if(btn){btn.style.background=open?'#fff':'var(--gl)';btn.style.borderColor=open?'var(--g200)':'var(--green)';btn.style.color=open?'var(--g600)':'var(--gd)';}
}
function clearTaskDates(){
  const f=document.getElementById('task-from');const t=document.getElementById('task-to');
  if(f)f.value='';if(t)t.value='';renderTasks();
}

let _tripStatusFilter='all';
function filterTrips(f){
  _tripStatusFilter=f;
  ['all','planned','active','done'].forEach(k=>{
    const b=document.getElementById('trip-f-'+k);
    if(b)b.classList.toggle('active',
      (k==='all'&&f==='all')||(k==='planned'&&f==='planned')||
      (k==='active'&&f==='in_progress')||(k==='done'&&f==='completed')
    );
  });
  renderTripList();
}
function renderTripList(filter){
  if(filter!==undefined)_tripStatusFilter=filter;
  const f=_tripStatusFilter||'all';
  const list=document.getElementById('trip-list');
  let trips=S.trips.filter(tr=>f==='all'||tr.status===f);

  // Text search
  const q=((document.getElementById('trip-search')||{}).value||'').toLowerCase().trim();
  if(q)trips=trips.filter(tr=>
    (tr.plant||'').toLowerCase().includes(q)||
    (tr.location||'').toLowerCase().includes(q)||
    (tr.purpose||'').toLowerCase().includes(q)||
    (tr.contact||'').toLowerCase().includes(q)
  );

  // Date range
  const dfEl=document.getElementById('trip-from'); const df=dfEl?dfEl.value:'';
  const dtEl=document.getElementById('trip-to'); const dt=dtEl?dtEl.value:'';
  if(df)trips=trips.filter(tr=>(tr.dateEnd||tr.date||'')>=df);
  if(dt)trips=trips.filter(tr=>(tr.date||'')<=dt);

  trips.sort((a,b)=>new Date(b.date)-new Date(a.date));

  // Active filter label
  const lbl=document.getElementById('trip-active-filter');
  if(lbl){
    const parts=[];
    if(q)parts.push(`"${q}"`);
    if(df||dt)parts.push(`${df||'start'} → ${dt||'end'}`);
    lbl.style.display=parts.length?'':'none';
    lbl.textContent=parts.length?`Showing ${trips.length} trip${trips.length!==1?'s':''} · ${parts.join(' · ')}`:''
  }

  if(!trips.length){
    list.innerHTML=`<div class="empty"><div class="ei">🔍</div><div class="et">${q||df||dt?'No trips match your search.':t('noTrips')}</div></div>`;
    return;
  }
  list.innerHTML=trips.map(tr=>{
    const bc=tr.status==='completed'?'bg':tr.status==='in_progress'?'bb':'ba';
    const bt=tr.status==='in_progress'?t('inProgress'):tr.status==='completed'?t('completed'):t('planned');
    return `<div class="tc ${tr.status}" onclick="openTripDetail('${tr.id}')">
      <div class="ch"><div class="ct">${tr.plant}</div><span class="badge ${bc}">${bt}</span></div>
      <div class="cs">${fmtDate(tr.date)}${tr.location?' · '+tr.location:''}</div>
      ${tr.purpose?`<div style="font-size:12px;color:var(--g500);margin-top:4px;">${tr.purpose.substring(0,55)}${tr.purpose.length>55?'...':''}</div>`:''}
    </div>`;
  }).join('');
}
function openTripDetail(id){
  curTrip=id;
  const tr=S.trips.find(t=>t.id===id);if(!tr)return;
  document.getElementById('detail-plant-name').textContent=tr.plant;
  document.getElementById('detail-date').textContent=fmtDate(tr.date)+(tr.location?' · '+tr.location:'');
  // render bills for this trip
  setTimeout(()=>renderTripBills(id),50);
  document.getElementById('trip-detail-card').innerHTML=`
    <div style="margin-bottom:10px;"><span class="badge ${tr.status==='completed'?'bg':tr.status==='in_progress'?'bb':'ba'}">${tr.status==='in_progress'?t('inProgress'):tr.status==='completed'?t('completed'):t('planned')}</span></div>
    ${kv(t('plantName').replace(' *',''),tr.plant)}${kv(t('location'),tr.location||'—')}${kv(t('visitDate').replace(' *',''),fmtDate(tr.date))}
    ${tr.dateEnd&&tr.dateEnd!==tr.date?kv(t('endDate'),fmtDate(tr.dateEnd)):''}
    ${kv(t('purposeScope'),tr.purpose||'—')}${kv(t('contactPerson'),tr.contact||'—')}${kv(t('transport'),tr.transport||'—')}`;
  // Load trip note
  const noteEl=document.getElementById('trip-note-input');
  if(noteEl)noteEl.value=tr.notes||'';
  renderTripStatusToggle(tr);
  renderTripInspCounts();
  showScreen('trip-detail');
}
function resetTripFlightFields(){
  const etf0=document.getElementById('nt-fl-num');if(etf0)etf0.value='';
  const etf1=document.getElementById('nt-fl-airline');if(etf1)etf1.value='';
  const etf2=document.getElementById('nt-fl-from');if(etf2)etf2.value='';
  const etf3=document.getElementById('nt-fl-to');if(etf3)etf3.value='';
  const etf4=document.getElementById('nt-fl-depart');if(etf4)etf4.value='';
  const etf5=document.getElementById('nt-fl-arrive');if(etf5)etf5.value='';
  const etf6=document.getElementById('nt-fl-ret-num');if(etf6)etf6.value='';
  const etf7=document.getElementById('nt-fl-ret-airline');if(etf7)etf7.value='';
  const etf8=document.getElementById('nt-fl-ret-from');if(etf8)etf8.value='';
  const etf9=document.getElementById('nt-fl-ret-to');if(etf9)etf9.value='';
  const etf10=document.getElementById('nt-fl-ret-depart');if(etf10)etf10.value='';
  const etf11=document.getElementById('nt-fl-ret-arrive');if(etf11)etf11.value='';
  const etf12=document.getElementById('nt-fl-pnr');if(etf12)etf12.value='';
  const hasRet=document.getElementById('nt-fl-has-return');if(hasRet)hasRet.checked=false;
  const retSec=document.getElementById('nt-fl-return-section');if(retSec)retSec.style.display='none';
  const flSec=document.getElementById('trip-flight-section');if(flSec)flSec.style.display='none';
}

function loadTripFlightFields(flight){
  if(!flight)return;
  const etf0=document.getElementById('nt-fl-num');if(etf0)etf0.value=flight['num']||'';
  const etf1=document.getElementById('nt-fl-airline');if(etf1)etf1.value=flight['airline']||'';
  const etf2=document.getElementById('nt-fl-from');if(etf2)etf2.value=flight['from']||'';
  const etf3=document.getElementById('nt-fl-to');if(etf3)etf3.value=flight['to']||'';
  const etf4=document.getElementById('nt-fl-depart');if(etf4)etf4.value=flight['depart']||'';
  const etf5=document.getElementById('nt-fl-arrive');if(etf5)etf5.value=flight['arrive']||'';
  const etf6=document.getElementById('nt-fl-ret-num');if(etf6)etf6.value=flight['ret_num']||'';
  const etf7=document.getElementById('nt-fl-ret-airline');if(etf7)etf7.value=flight['ret_airline']||'';
  const etf8=document.getElementById('nt-fl-ret-from');if(etf8)etf8.value=flight['ret_from']||'';
  const etf9=document.getElementById('nt-fl-ret-to');if(etf9)etf9.value=flight['ret_to']||'';
  const etf10=document.getElementById('nt-fl-ret-depart');if(etf10)etf10.value=flight['ret_depart']||'';
  const etf11=document.getElementById('nt-fl-ret-arrive');if(etf11)etf11.value=flight['ret_arrive']||'';
  const etf12=document.getElementById('nt-fl-pnr');if(etf12)etf12.value=flight['pnr']||'';
  const hasReturn=!!(flight.ret_num||flight.ret_from);
  const hasRet=document.getElementById('nt-fl-has-return');if(hasRet)hasRet.checked=hasReturn;
  const retSec=document.getElementById('nt-fl-return-section');if(retSec)retSec.style.display=hasReturn?'':'none';
  const flSec=document.getElementById('trip-flight-section');if(flSec)flSec.style.display='';
}

function getTripFlightFields(){
  return {'num':document.getElementById('nt-fl-num')?document.getElementById('nt-fl-num').value:'', 'airline':document.getElementById('nt-fl-airline')?document.getElementById('nt-fl-airline').value:'', 'from':document.getElementById('nt-fl-from')?document.getElementById('nt-fl-from').value:'', 'to':document.getElementById('nt-fl-to')?document.getElementById('nt-fl-to').value:'', 'depart':document.getElementById('nt-fl-depart')?document.getElementById('nt-fl-depart').value:'', 'arrive':document.getElementById('nt-fl-arrive')?document.getElementById('nt-fl-arrive').value:'', 'ret_num':document.getElementById('nt-fl-ret-num')?document.getElementById('nt-fl-ret-num').value:'', 'ret_airline':document.getElementById('nt-fl-ret-airline')?document.getElementById('nt-fl-ret-airline').value:'', 'ret_from':document.getElementById('nt-fl-ret-from')?document.getElementById('nt-fl-ret-from').value:'', 'ret_to':document.getElementById('nt-fl-ret-to')?document.getElementById('nt-fl-ret-to').value:'', 'ret_depart':document.getElementById('nt-fl-ret-depart')?document.getElementById('nt-fl-ret-depart').value:'', 'ret_arrive':document.getElementById('nt-fl-ret-arrive')?document.getElementById('nt-fl-ret-arrive').value:'', 'pnr':document.getElementById('nt-fl-pnr')?document.getElementById('nt-fl-pnr').value:''};
}

function kv(l,v){return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--g100);font-size:13px;"><span style="color:var(--g500);">${l}</span><span style="font-weight:500;text-align:right;max-width:60%;">${v}</span></div>`;}

function openNewTripModal(){
  editingTripId=null;
  document.getElementById('trip-modal-title').textContent='New Trip';
  document.getElementById('trip-edit-badge').textContent='';
  document.getElementById('trip-save-btn').textContent='Save trip';
  ['nt-plant','nt-location','nt-date','nt-date-end','nt-purpose','nt-contact'].forEach(id=>{
    const e=document.getElementById(id);if(e)e.value='';
  });
  document.getElementById('nt-transport').value='';
  resetTripFlightFields();
  openModal('modal-new-trip');
}
function openEditTrip(){
  const tr=S.trips.find(t=>t.id===curTrip);if(!tr)return;
  editingTripId=tr.id;
  document.getElementById('trip-modal-title').textContent='Edit Trip';
  document.getElementById('trip-edit-badge').textContent='#'+tr.id.slice(-6);
  document.getElementById('trip-save-btn').textContent='Update trip';
  document.getElementById('nt-plant').value=tr.plant||'';
  document.getElementById('nt-location').value=tr.location||'';
  document.getElementById('nt-date').value=tr.date||'';
  document.getElementById('nt-date-end').value=tr.dateEnd||'';
  document.getElementById('nt-purpose').value=tr.purpose||'';
  document.getElementById('nt-contact').value=tr.contact||'';
  document.getElementById('nt-transport').value=tr.transport||'';
  resetTripFlightFields();
  if(tr.flight)loadTripFlightFields(tr.flight);
  else toggleTripFlight();
  openModal('modal-new-trip');
}
function deleteTripCurrent(){if(!confirm('Delete this trip?'))return;S.trips=S.trips.filter(tr=>tr.id!==curTrip);delete S.reports[curTrip];sv();showScreen('trips');renderTripList();}

function setTripStatus(status){
  const tr=S.trips.find(t=>t.id===curTrip);
  if(!tr)return;
  tr.status=status;
  Store.commit('trip:save');
  // Re-render the status toggle
  renderTripStatusToggle(tr);
  showToast('Status updated: '+{planned:'Planned',in_progress:'In Progress',completed:'Completed'}[status]);
}

function renderTripStatusToggle(tr){
  const el=document.getElementById('trip-status-toggle');
  if(!el||!tr)return;
  const statuses=[
    {key:'planned',    label:'📋 Planned',  bg:'var(--al)',          color:'var(--ad)'},
    {key:'in_progress',label:'🔄 Active',   bg:'var(--bl)',          color:'var(--bd)'},
    {key:'completed',  label:'✅ Done',     bg:'var(--brand-light)', color:'var(--brand-dark)'}
  ];
  el.innerHTML=statuses.map(s=>`
    <button onclick="setTripStatus('${s.key}')"
      style="flex:1;padding:8px 4px;border:none;border-radius:5px;cursor:pointer;
             font-family:var(--font);font-size:11px;font-weight:700;
             transition:all 0.15s;
             background:${tr.status===s.key?s.bg:'transparent'};
             color:${tr.status===s.key?s.color:'var(--n500)'};">
      ${s.label}
    </button>`).join('');
}

let _noteSaveTimer=null;
function saveTripNote(){
  const tr=S.trips.find(t=>t.id===curTrip);if(!tr)return;
  const val=document.getElementById('trip-note-input').value;
  tr.notes=val;
  // Debounce: save after 800ms of no typing
  clearTimeout(_noteSaveTimer);
  _noteSaveTimer=setTimeout(()=>{
    sv();
    // Show saved indicator
    const ind=document.getElementById('trip-note-saved');
    if(ind){ind.style.opacity='1';setTimeout(()=>ind.style.opacity='0',1500);}
    svAndSync('trip_note');
  },800);
}
function openReport(){
  // Init report if needed, then open inspection picker
  const tr = S.trips.find(t=>t.id===curTrip);
  if(!tr) return;
  if(!S.reports[tr.id]){
    S.reports[tr.id]={checklist:[],readings:[],issues:[],team:[...S.defaultTeam.map(m=>({...m,id:'tm'+Date.now()+Math.random()}))],signoff:{summary:'',result:'Completed',remarks:''},signature:'',reportTasks:[],reportTaskNotes:{}};
  }
  curReport = S.reports[tr.id];
  if(!curReport.reportTasks) curReport.reportTasks=[];
  if(!curReport.reportTaskNotes) curReport.reportTaskNotes={};
  document.getElementById('report-plant-name').textContent = tr.plant;
  document.getElementById('report-date').textContent = fmtDate(tr.date);
  // Open inspection picker so user can select items
  openReportInspPicker();
}

// ═══════ CALENDAR ═══════
function renderCalendar(){
  const now=new Date();
  // Guard: initialize if not set (can happen before init() completes)
  if(calY===undefined||calY===null||isNaN(calY)){calY=now.getFullYear();}
  if(calM===undefined||calM===null||isNaN(calM)){calM=now.getMonth();}
  document.getElementById('cal-month-label').textContent=new Date(calY,calM,1).toLocaleDateString(S.lang==='vi'?'vi-VN':'en-US',{month:'long',year:'numeric'});
  const grid=document.getElementById('cal-grid');
  const days=S.lang==='vi'?['CN','T2','T3','T4','T5','T6','T7']:['Su','Mo','Tu','We','Th','Fr','Sa'];
  let html=days.map(d=>`<div class="cc chdr">${d}</div>`).join('');
  const first=new Date(calY,calM,1).getDay();
  const dim=new Date(calY,calM+1,0).getDate();
  const prev=new Date(calY,calM,0).getDate();
  const prefix=`${calY}-${String(calM+1).padStart(2,'0')}-`;
  for(let i=0;i<first;i++)html+=`<div class="cc other">${prev-first+i+1}</div>`;
  for(let d=1;d<=dim;d++){
    const key=prefix+String(d).padStart(2,'0');
    const type=S.leaveData[key];
    const isToday=calY===now.getFullYear()&&calM===now.getMonth()&&d===now.getDate();
    const hasTask=S.tasks.some(tk=>tk.date===key&&tk.status!=='done');
    let cls='cc'+(isToday&&!type?' today':type?' '+type:'')+(hasTask?' has-task':'');
    html+=`<div class="${cls}" onclick="selCalDay('${key}',${d})">${d}</div>`;
  }
  grid.innerHTML=html;updateLeaveSummary();
}
function changeMonth(dir){calM+=dir;if(calM<0){calM=11;calY--;}if(calM>11){calM=0;calY++;}renderCalendar();}
function selCalDay(key,d){
  selDay=key;
  document.getElementById('sel-day-ed').style.display='';
  const dayLabel=new Date(calY,calM,d).toLocaleDateString(S.lang==='vi'?'vi-VN':'en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('sel-day-lbl').textContent=dayLabel;

  const dayTasks=S.tasks.filter(tk=>(tk.dateStart||tk.date||'')=== key);
  const dayTrips=S.trips.filter(tr=>{
    const start=tr.date||'';const end=tr.dateEnd||start;
    return key>=start&&key<=end;
  });
  const leaveType=S.leaveData[key]||null;
  const leaveLabels={trip:'🏭 Work trip',leave:'🌴 Leave',wfh:'💻 WFH',holiday:'🎉 Holiday'};

  const dtl=document.getElementById('day-task-list');
  let html='';

  // Leave / day type banner
  if(leaveType){
    const lc={trip:'var(--gl)',leave:'var(--al)',wfh:'var(--bl)',holiday:'var(--rl)'}[leaveType]||'var(--g100)';
    const ltc={trip:'var(--gd)',leave:'#92400E',wfh:'#1E40AF',holiday:'#991B1B'}[leaveType]||'var(--g600)';
    html+=`<div style="background:${lc};color:${ltc};border-radius:var(--rs);padding:8px 10px;margin-bottom:10px;font-size:12px;font-weight:600;">${leaveLabels[leaveType]||leaveType}</div>`;
  }

  // Trips on this day
  if(dayTrips.length){
    html+=`<div style="font-size:11px;font-weight:700;color:#00843D;letter-spacing:0.05em;margin-bottom:5px;">TRIPS</div>`;
    dayTrips.forEach(tr=>{
      const bc=tr.status==='completed'?'bg':tr.status==='in_progress'?'bb':'ba';
      const bs=tr.status==='completed'?t('completed'):tr.status==='in_progress'?t('inProgress'):t('planned');
      html+=`<div onclick="openTripDetail('${tr.id}')" style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--g100);cursor:pointer;">
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--g800);">🏭 ${tr.plant}</div>
          <div style="font-size:10px;color:var(--g500);">${tr.location||''}${tr.dateEnd&&tr.dateEnd!==tr.date?' · until '+fmtDate(tr.dateEnd):''}</div>
        </div>
        <span class="badge ${bc}" style="font-size:10px;">${bs}</span>
      </div>`;
    });
    html+='<div style="height:10px;"></div>';
  }

  // Tasks on this day
  if(dayTasks.length){
    html+=`<div style="font-size:11px;font-weight:700;color:#00843D;letter-spacing:0.05em;margin-bottom:5px;">TASKS (${dayTasks.length})</div>`;
    dayTasks.forEach(tk=>{
      const catIcon={work:'🔧',leave:'🌴',travel:'✈️'}[tk.category||'work']||'📋';
      const timeStr=tk.timeStart?(tk.timeEnd?`${tk.timeStart}–${tk.timeEnd}`:tk.timeStart):'';
      const dur=calcDuration(tk);
      const cycle={'pending':'in_progress','in_progress':'done','done':'pending'};
      const nextStatus=cycle[tk.status]||'pending';
      const statusIcon=tk.status==='done'?'✅':tk.status==='in_progress'?'🔄':'⏳';
      html+=`<div style="padding:7px 0;border-bottom:1px solid var(--g100);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="flex:1;cursor:pointer;" onclick="openTaskDetail('${tk.id}')">
            <div style="font-size:12px;font-weight:500;color:var(--g800);">${catIcon} ${tk.title}</div>
            ${timeStr||dur||tk.machine?`<div style="font-size:10px;color:var(--g500);margin-top:2px;">${[timeStr,dur,tk.machine].filter(Boolean).join(' · ')}</div>`:''}
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            <span style="font-size:14px;">${statusIcon}</span>
            <button onclick="setTaskStatus('${tk.id}','${nextStatus}');selCalDay('${key}',${d})" style="font-size:10px;padding:3px 8px;border-radius:12px;border:1px solid var(--g300);background:#fff;cursor:pointer;font-family:var(--font);color:var(--g600);">→</button>
          </div>
        </div>
      </div>`;
    });
    html+='<div style="height:4px;"></div>';
  }

  if(!dayTrips.length&&!dayTasks.length&&!leaveType){
    html=`<div style="text-align:center;padding:16px 0;font-size:12px;color:var(--g400);">Nothing scheduled for this day.</div>`;
  }

  html+=`<button onclick="openNewTaskModal('${key}','work')" style="width:100%;margin-top:6px;padding:8px;border-radius:var(--rs);border:1px dashed var(--g300);background:transparent;font-family:var(--font);font-size:12px;color:var(--green);cursor:pointer;">＋ Add task for this day</button>`;

  dtl.innerHTML=html;
}
function setDayType(type){if(!selDay)return;if(type===null)delete S.leaveData[selDay];else S.leaveData[selDay]=type;sv();renderCalendar();svAndSync('leave');}
function updateLeaveSummary(){
  const pfx=`${calY}-${String(calM+1).padStart(2,'0')}-`;
  let trip=0,leave=0,wfh=0;
  Object.entries(S.leaveData).forEach(([k,v])=>{if(k.startsWith(pfx)){if(v==='trip')trip++;else if(v==='leave')leave++;else if(v==='wfh')wfh++;}});
  document.getElementById('lv-trip').textContent=trip;
  document.getElementById('lv-leave').textContent=leave;
  document.getElementById('lv-wfh').textContent=wfh;
}

// ═══════ DASHBOARD ═══════
function renderDash(){
  const now=new Date();const today=now.toISOString().slice(0,10);
  const thisM=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  document.getElementById('stat-trips').textContent=S.trips.filter(tr=>tr.date&&tr.date.startsWith(thisM)).length;
  const todayTasks=S.tasks.filter(tk=>tk.date===today&&tk.status!=='done');
  document.getElementById('stat-tasks').textContent=todayTasks.length;
  document.getElementById('stat-leave').textContent=Object.entries(S.leaveData).filter(([k,v])=>k.startsWith(thisM)&&v==='leave').length;
  const h=now.getHours();
  document.getElementById('greeting').textContent=(h<12?t('goodMorning'):h<17?t('goodAfternoon'):t('goodEvening'))+', '+(S.profile.name||'Engineer');
  document.getElementById('today-date').textContent=now.toLocaleDateString(S.lang==='vi'?'vi-VN':'en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  // ── Today's Work — ALL work tasks for today, grouped by status ──
  const allTodayWork=S.tasks.filter(tk=>{
    const d=tk.dateStart||tk.date||'';
    return d===today;  // ALL categories: work, leave, travel
  }).sort((a,b)=>(a.timeStart||a.time||'').localeCompare(b.timeStart||b.time||'')||a.title.localeCompare(b.title));

  const htt=document.getElementById('home-tasks');
  const lbl=document.getElementById('today-date-label');
  if(lbl)lbl.textContent=allTodayWork.length?allTodayWork.length+' task'+(allTodayWork.length>1?'s':''):'';

  // Also update stat to show ALL today work tasks (not just pending)
  document.getElementById('stat-tasks').textContent=allTodayWork.length;

  if(!allTodayWork.length){
    htt.innerHTML=`<div style="background:#fff;border-radius:var(--r);box-shadow:var(--sh);border:1px solid rgba(0,0,0,0.05);padding:20px;text-align:center;margin-bottom:10px;">
      <div style="font-size:28px;margin-bottom:6px;">✅</div>
      <div style="font-size:13px;color:var(--g400);">No work tasks scheduled for today.</div>
      <button onclick="openNewTaskModal(todayStr(),'work')" style="margin-top:10px;background:var(--green);color:#fff;border:none;border-radius:var(--rs);padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font);">＋ Add today's task</button>
    </div>`;
  } else {
    // Group into 3 status buckets
    const groups=[
      {key:'in_progress', label:'🔄 In Progress', color:'var(--amber)', bg:'var(--al)', txtColor:'#92400E'},
      {key:'pending',     label:'⏳ Pending',     color:'var(--g400)', bg:'var(--g100)', txtColor:'var(--g600)'},
      {key:'done',        label:'✅ Done',        color:'var(--green)', bg:'var(--gl)', txtColor:'var(--gd)'}
    ];
    // Empty message per category type
    const leaveToday=allTodayWork.filter(tk=>(tk.category||'work')==='leave');
    const travelToday=allTodayWork.filter(tk=>(tk.category||'work')==='travel');
    let out='';
    groups.forEach(g=>{
      const items=allTodayWork.filter(tk=>tk.status===g.key);
      if(!items.length)return;
      out+=`<div style="margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:${g.bg};border-radius:var(--rs) var(--rs) 0 0;border-bottom:2px solid ${g.color};">
          <span style="font-size:12px;font-weight:700;color:${g.txtColor};">${g.label}</span>
          <span style="font-size:10px;font-weight:600;color:${g.txtColor};opacity:0.7;">${items.length} task${items.length>1?'s':''}</span>
        </div>
        <div style="background:#fff;border-radius:0 0 var(--r) var(--r);box-shadow:var(--sh);border:1px solid rgba(0,0,0,0.05);border-top:none;">
          ${items.map(tk=>{
            const dur=calcDuration(tk);
            const timeStr=tk.timeStart?(tk.timeEnd?`${tk.timeStart}–${tk.timeEnd}`:tk.timeStart):'';
            const cycle={pending:'in_progress',in_progress:'done',done:'pending'};
            const nextS=cycle[tk.status]||'pending';
            const nextLabel={pending:'→ Start',in_progress:'→ Done',done:'↺ Reopen'}[tk.status];
            const nextBg={pending:'var(--al)',in_progress:'var(--gl)',done:'var(--g100)'}[tk.status];
            const nextColor={pending:'#92400E',in_progress:'var(--gd)',done:'var(--g600)'}[tk.status];
            return `<div style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-bottom:1px solid var(--g100);">
              <div style="flex:1;min-width:0;cursor:pointer;" onclick="openTaskDetail('${tk.id}')">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                  ${(()=>{const cc=catConfig(tk.category||'work');return `<span style="background:${cc.bg};color:${cc.text};padding:1px 7px;border-radius:4px;font-size:10px;font-weight:600;">${cc.icon} ${(tk.category||'work').charAt(0).toUpperCase()+(tk.category||'work').slice(1)}</span>`})()}
                </div>
                <div style="font-size:13px;font-weight:600;color:var(--g800);${tk.status==='done'?'text-decoration:line-through;color:var(--g400);':''}line-height:1.3;">${tk.title}</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
                  ${timeStr?`<span style="font-size:10px;color:var(--g500);">⏰ ${timeStr}</span>`:''}
                  ${dur?`<span style="font-size:10px;color:var(--g500);">⏱ ${dur}</span>`:''}
                  ${tk.machine?`<span style="font-size:10px;color:var(--g500);">🔩 ${tk.machine}</span>`:''}
                  ${tk.plan?`<span style="font-size:10px;color:var(--g500);">📁 ${tk.plan}</span>`:''}
                  ${tk.checklist&&tk.checklist.length?`<span style="font-size:10px;color:var(--g500);">${tk.checklist.filter(c=>c.done).length}/${tk.checklist.length} items</span>`:''}
                </div>
              </div>
              <button onclick="setTaskStatus('${tk.id}','${nextS}');renderDash();"
                style="flex-shrink:0;padding:5px 10px;border-radius:var(--rs);border:none;background:${nextBg};color:${nextColor};font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);white-space:nowrap;">
                ${nextLabel}
              </button>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    });
    htt.innerHTML=out;
  }

  const upcoming=S.trips.filter(tr=>tr.status!=='completed').sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,3);
  const upEl=document.getElementById('upcoming-trips');
  upEl.innerHTML=upcoming.length?upcoming.map(tr=>`<div class="tc ${tr.status}" onclick="openTripDetail('${tr.id}')"><div class="ch"><div class="ct">${tr.plant}</div><span class="badge ${tr.status==='in_progress'?'bb':'ba'}">${tr.status==='in_progress'?t('inProgress'):t('planned')}</span></div><div class="cs">${fmtDate(tr.date)}${tr.location?' · '+tr.location:''}</div></div>`).join(''):`<div style="font-size:13px;color:var(--g500);padding:8px 0;">${t('noTrips')}</div>`;
  const completed=S.trips.filter(tr=>tr.status==='completed').sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3);
  const recEl=document.getElementById('recent-reports');
  recEl.innerHTML=completed.length?completed.map(tr=>`<div class="card" style="cursor:pointer;" onclick="openTripDetail('${tr.id}')"><div class="ch"><div class="ct">${tr.plant}</div><span class="badge bg">${t('completed')}</span></div><div class="cs">${fmtDate(tr.date)}</div></div>`).join(''):`<div style="font-size:13px;color:var(--g500);padding:8px 0;">${t('noReports')}</div>`;
}

