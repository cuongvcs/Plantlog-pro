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
    resetTripTAFields();
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
      tr.ta=tr.transport.toLowerCase().includes('flight')?getTripTAFields():(tr.ta||null);
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
  const trip={id:'trip_'+Date.now(),plant,date,dateEnd:document.getElementById('nt-date-end').value||date,location:document.getElementById('nt-location').value,purpose:document.getElementById('nt-purpose').value,contact:document.getElementById('nt-contact').value,transport:tripTransport,flight:tripTransport.toLowerCase().includes('flight')?getTripFlightFields():null,ta:tripTransport.toLowerCase().includes('flight')?getTripTAFields():null,status:'planned',createdAt:new Date().toISOString()};
  S.trips.push(trip);
  S.reports[trip.id]={checklist:S.templates.map((tmpl,i)=>({id:'ci'+i+Date.now(),name:tmpl,result:'',note:''})),readings:[],issues:[],team:[...S.defaultTeam.map(m=>({...m,id:'tm'+Date.now()+Math.random()}))],signoff:{summary:'',result:'Completed',remarks:''},signature:'',reportTasks:[],reportTaskNotes:{}};
  sv();closeModal('modal-new-trip');clearForm();
  Store.commit('trip:save');
  showToast(t('saveTrip')+' ✓');
  if(Notification.permission==='granted')scheduleNotifications();
  // Offer to generate TA PDF immediately if this trip has flight info
  if(trip.flight && trip.ta && trip.ta.taNo){
    setTimeout(async ()=>{
      const ok = await appConfirm('Flight trip created!\n\nGenerate Travel Authorization PDF now?', {
        title: 'Travel Authorization',
        confirmText: 'Generate PDF',
        icon: '✈️'
      });
      if(ok){
        generateTAPdf(trip.id);
      }
    }, 600);
  }
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

  // Status order: in_progress first, planned second, completed last
  const statusOrder={in_progress:0,planned:1,completed:2};
  trips.sort((a,b)=>{
    const sa=statusOrder[a.status||'planned']??1;
    const sb=statusOrder[b.status||'planned']??1;
    if(sa!==sb) return sa-sb;
    // Within same status: in_progress/planned → earliest date first; completed → latest first
    const dateA=new Date(a.date||0), dateB=new Date(b.date||0);
    return sa===2 ? dateB-dateA : dateA-dateB;
  });

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
    const wk=typeof getTripWeekLabel==='function'?getTripWeekLabel(tr.date,tr.dateEnd):'';
    const tripTasks=(S.tasks||[]).filter(tk=>tk.tripId===tr.id);
    const doneTasks=tripTasks.filter(tk=>tk.status==='done'||tk.status==='completed');
    const pct=tripTasks.length?Math.round(doneTasks.length/tripTasks.length*100):0;
    return `<div class="tc ${tr.status}" onclick="openTripDetail('${tr.id}')">
      <div class="ch">
        <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;margin-right:8px;">
          <div class="ct" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tr.plant}</div>
          ${wk?`<span class="badge-week">${wk}</span>`:''}
        </div>
        <span class="badge ${bc}" style="flex-shrink:0;">${bt}</span>
      </div>
      <div class="cs">${fmtDate(tr.date)}${tr.location?' · '+tr.location:''}</div>
      ${tr.purpose?`<div style="font-size:12px;color:var(--g500);margin-top:4px;">${tr.purpose.substring(0,55)}${tr.purpose.length>55?'...':''}</div>`:''}
      ${tripTasks.length?`
        <div class="tc-progress-bar">
          <div class="tc-progress-fill" style="width:${pct}%;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--n500);margin-top:3px;font-weight:600;">
          <span>📋 Tasks: ${doneTasks.length}/${tripTasks.length}</span>
          <span>${pct}%</span>
        </div>`:''}
    </div>`;
  }).join('');
}
function openTripDetail(id){
  curTrip=id;
  const tr=S.trips.find(t=>t.id===id);if(!tr)return;
  const wk=typeof getTripWeekLabel==='function'?getTripWeekLabel(tr.date,tr.dateEnd):'';
  const nameEl=document.getElementById('detail-plant-name');
  if(nameEl){
    nameEl.innerHTML=`<span>${tr.plant}</span>${wk?` <span class="badge-week" style="background:rgba(255,255,255,0.22);color:#fff;border-color:rgba(255,255,255,0.4);font-size:11px;vertical-align:middle;margin-left:6px;">${wk}</span>`:''}`;
  }
  document.getElementById('detail-date').textContent=fmtDate(tr.date)+(tr.location?' · '+tr.location:'');
  // render bills for this trip
  setTimeout(()=>renderTripBills(id),50);
  const tripBills = (S.bills || []).filter(b => b.tripId === id);
  const totalVND = tripBills.reduce((acc, b) => acc + (parseFloat(b.vndAmount) || (b.currency === 'VND' ? parseFloat(b.amount) || 0 : 0)), 0);
  const expenseSummaryHtml = tripBills.length ? `
    <div class="trip-expense-summary-badge" style="margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:13px;">💰</span>
        <span style="font-size:12px;font-weight:700;color:var(--n800);">Expenses Total:</span>
      </div>
      <div style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--am);">
        ${totalVND ? totalVND.toLocaleString() + ' VND' : tripBills.length + ' bills'} (${tripBills.length})
      </div>
    </div>` : '';

  document.getElementById('trip-detail-card').innerHTML=`
    <div style="margin-bottom:10px;"><span class="badge ${tr.status==='completed'?'bg':tr.status==='in_progress'?'bb':'ba'}">${tr.status==='in_progress'?t('inProgress'):tr.status==='completed'?t('completed'):t('planned')}</span></div>
    ${expenseSummaryHtml}
    ${kv(t('plantName').replace(' *',''),tr.plant)}${kv(t('location'),tr.location||'—')}${kv(t('visitDate').replace(' *',''),fmtDate(tr.date))}
    ${tr.dateEnd&&tr.dateEnd!==tr.date?kv(t('endDate'),fmtDate(tr.dateEnd)):''}
    ${kv(t('purposeScope'),tr.purpose||'—')}${kv(t('contactPerson'),tr.contact||'—')}${kv(t('transport'),tr.transport||'—')}
    ${tr.flight&&formatTripFlightInfo(tr.flight)?kv('Flight Details',formatTripFlightInfo(tr.flight).replace(/\n/g,'<br>')):''}`;
  // Load trip note
  const noteEl=document.getElementById('trip-note-input');
  if(noteEl)noteEl.value=tr.notes||'';
  renderTripStatusToggle(tr);
  renderTripInspCounts();
  if(typeof renderTripTimesheets==='function') renderTripTimesheets(id);
  if(typeof renderTripSafety==='function') renderTripSafety(id);
  if(typeof renderTripSavedReports==='function') renderTripSavedReports();
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
  const gv=id=>{const e=document.getElementById(id);return e?e.value:'';};
  return {
    num:gv('nt-fl-num'), airline:gv('nt-fl-airline'), from:gv('nt-fl-from'), to:gv('nt-fl-to'),
    depart:gv('nt-fl-depart'), arrive:gv('nt-fl-arrive'),
    ret_num:gv('nt-fl-ret-num'), ret_airline:gv('nt-fl-ret-airline'), ret_from:gv('nt-fl-ret-from'),
    ret_to:gv('nt-fl-ret-to'), ret_depart:gv('nt-fl-ret-depart'), ret_arrive:gv('nt-fl-ret-arrive'),
    pnr:gv('nt-fl-pnr')
  };
}

function formatTripFlightInfo(fl){
  if(!fl) return '';
  const lines = [];
  const outNum = fl.num || fl.flightNo || '';
  const outAirline = fl.airline || '';
  const outFrom = fl.from || '';
  const outTo = fl.to || '';
  const outDepart = fl.depart || fl.departTime || '';
  const outArrive = fl.arrive || fl.arriveTime || '';

  if(outNum || outFrom || outTo || outAirline){
    let str = outNum;
    if(outAirline) str += (str ? ` (${outAirline})` : outAirline);
    if(outFrom || outTo) str += (str ? ': ' : '') + `${outFrom||'—'} -> ${outTo||'—'}`;
    if(outDepart || outArrive) str += ` (${outDepart||''}${outDepart&&outArrive?'–':''}${outArrive||''})`;
    if(str.trim()) lines.push(str.trim());
  }

  const retNum = fl.ret_num || fl.retNum || '';
  const retAirline = fl.ret_airline || fl.retAirline || '';
  const retFrom = fl.ret_from || fl.retFrom || '';
  const retTo = fl.ret_to || fl.retTo || '';
  const retDepart = fl.ret_depart || fl.retDepart || '';
  const retArrive = fl.ret_arrive || fl.retArrive || '';

  if(retNum || retFrom || retTo || retAirline){
    let str = 'Return: ' + retNum;
    if(retAirline) str += (retNum ? ` (${retAirline})` : retAirline);
    if(retFrom || retTo) str += (retNum||retAirline ? ': ' : '') + `${retFrom||'—'} -> ${retTo||'—'}`;
    if(retDepart || retArrive) str += ` (${retDepart||''}${retDepart&&retArrive?'–':''}${retArrive||''})`;
    if(str.trim()) lines.push(str.trim());
  }

  if(fl.pnr){
    lines.push(`PNR: ${fl.pnr}`);
  }

  return lines.join('\n');
}

// ── Travel Authorization (TA) fields — separate from flight ──
function getTripTAFields(){
  const gv=id=>{const e=document.getElementById(id);return e?e.value:'';};
  return {
    taNo:        gv('nt-ta-no'),
    taClass:     gv('nt-ta-class')||'E',
    allocation:  gv('nt-ta-allocation'),
    entity:      gv('nt-ta-entity'),
    extension:   gv('nt-ta-extension'),
    requestDate: gv('nt-ta-reqdate')
  };
}

function loadTripTAFields(ta){
  const sv=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v||'';};
  ta=ta||{};
  sv('nt-ta-no', ta.taNo);
  sv('nt-ta-class', ta.taClass||'E');
  sv('nt-ta-allocation', ta.allocation);
  sv('nt-ta-entity', ta.entity);
  sv('nt-ta-extension', ta.extension);
  sv('nt-ta-reqdate', ta.requestDate);
}

function resetTripTAFields(){
  loadTripTAFields({});
}

function kv(l,v){
  if(l==='Flight Details'||l==='Chi tiết chuyến bay'){
    return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--g100);font-size:11px;align-items:flex-start;"><span style="color:var(--g500);white-space:nowrap;margin-right:8px;">${l}</span><span style="font-weight:500;text-align:right;max-width:75%;font-size:11px;line-height:1.4;word-break:break-word;color:var(--g800);">${v}</span></div>`;
  }
  return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--g100);font-size:13px;"><span style="color:var(--g500);">${l}</span><span style="font-weight:500;text-align:right;max-width:60%;">${v}</span></div>`;
}

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
  resetTripTAFields();
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
  resetTripTAFields();
  if(tr.flight)loadTripFlightFields(tr.flight);
  else toggleTripFlight();
  if(tr.ta)loadTripTAFields(tr.ta);
  openModal('modal-new-trip');
}
async function deleteTripCurrent(){
  const ok = await appConfirm('Delete this trip and all its associated reports? This cannot be undone.', {
    title: 'Delete Trip',
    danger: true,
    confirmText: 'Delete Trip',
    icon: '🗑️'
  });
  if(!ok) return;
  if (!S.deletedIds) S.deletedIds = {};
  S.deletedIds[curTrip] = Date.now();
  S.trips=S.trips.filter(tr=>tr.id!==curTrip);
  delete S.reports[curTrip];
  sv();
  showScreen('trips');
  renderTripList();
  svAndSync('trip_delete');
}

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
  const tr = S.trips.find(t=>t.id===curTrip);
  if(!tr){ showToast('No trip selected'); return; }

  // Init report data
  if(!S.reports[tr.id]){
    const defTeam = (S.defaultTeam||[]).map(m=>({...m,id:'tm'+Date.now()+'_'+Math.random()}));
    S.reports[tr.id]={
      checklist:[],readings:[],issues:[],team:defTeam,
      signoff:{summary:'',result:'Completed',remarks:''},
      signature:'',reportTasks:[],reportTaskNotes:{}
    };
  }
  curReport=S.reports[tr.id];
  if(!curReport.reportTasks)     curReport.reportTasks=[];
  if(!curReport.reportTaskNotes) curReport.reportTaskNotes={};
  if(!curReport.signoff)         curReport.signoff={summary:'',result:'Completed',remarks:''};
  S.reports[tr.id]=curReport;

  // Check if trip has inspection records → show picker
  // Otherwise go straight to report
  const hasInspections=(S.inspections||[]).some(i=>i.tripId===curTrip);
  if(hasInspections){
    openReportInspPicker();
  } else {
    openReportDirect(0);
  }
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
    const hasReminder=typeof getRemindersForDate==='function'&&getRemindersForDate(key).length>0;
    let cls='cc'+(isToday&&!type?' today':type?' '+type:'')+(hasTask?' has-task':'');
    const reminderDot=hasReminder?'<div style="position:absolute;bottom:2px;right:2px;width:5px;height:5px;border-radius:50%;background:var(--am);"></div>':'';
    html+=`<div class="${cls}" style="position:relative;" onclick="selCalDay('${key}',${d})">${d}${reminderDot}</div>`;
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

  // Reminders for this day
  const dayReminders = typeof getRemindersForDate==='function' ? getRemindersForDate(key) : [];
  if(dayReminders.length){
    html+=`<div style="background:var(--al);border-radius:var(--rs);padding:8px 10px;margin-bottom:8px;">`;
    dayReminders.forEach(r=>{
      html+=`<div style="display:flex;align-items:center;gap:8px;padding:3px 0;">
        <span style="font-size:14px;">🔔</span>
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--ad);">${r.title}</div>
          ${r.note?`<div style="font-size:11px;color:var(--am);">${r.note}</div>`:''}
        </div>
      </div>`;
    });
    html+='</div>';
  }

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
  upEl.innerHTML=upcoming.length?upcoming.map(tr=>{
    const wk=typeof getTripWeekLabel==='function'?getTripWeekLabel(tr.date,tr.dateEnd):'';
    return `<div class="tc ${tr.status}" onclick="openTripDetail('${tr.id}')">
      <div class="ch">
        <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;margin-right:8px;">
          <div class="ct" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tr.plant}</div>
          ${wk?`<span class="badge-week">${wk}</span>`:''}
        </div>
        <span class="badge ${tr.status==='in_progress'?'bb':'ba'}" style="flex-shrink:0;">${tr.status==='in_progress'?t('inProgress'):t('planned')}</span>
      </div>
      <div class="cs">${fmtDate(tr.date)}${tr.location?' · '+tr.location:''}</div>
    </div>`;
  }).join(''):`<div style="font-size:13px;color:var(--g500);padding:8px 0;">${t('noTrips')}</div>`;
  const completed=S.trips.filter(tr=>tr.status==='completed').sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3);
  const recEl=document.getElementById('recent-reports');
  recEl.innerHTML=completed.length?completed.map(tr=>{
    const wk=typeof getTripWeekLabel==='function'?getTripWeekLabel(tr.date,tr.dateEnd):'';
    return `<div class="card" style="cursor:pointer;" onclick="openTripDetail('${tr.id}')">
      <div class="ch">
        <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;margin-right:8px;">
          <div class="ct" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tr.plant}</div>
          ${wk?`<span class="badge-week">${wk}</span>`:''}
        </div>
        <span class="badge bg" style="flex-shrink:0;">${t('completed')}</span>
      </div>
      <div class="cs">${fmtDate(tr.date)}</div>
    </div>`;
  }).join(''):`<div style="font-size:13px;color:var(--g500);padding:8px 0;">${t('noReports')}</div>`;
}

// ═════════════════════════════════════════════════════
// DAILY SERVICE TICKETS & TIMESHEET (IMP-19)
// ═════════════════════════════════════════════════════
let editingTicketId = null;
let ticketSigCanvas, ticketSigCtx, isTicketDrawing = false;
let _tempTicketSigDataUrl = '';

function renderTripTimesheets(tripId) {
  const tr = S.trips.find(t => t.id === tripId);
  const container = document.getElementById('trip-timesheets-section');
  if (!container || !tr) return;

  tr.timesheets = tr.timesheets || [];
  const tickets = tr.timesheets;

  // Totals
  let totalNormal = 0, totalOt15 = 0, totalOt20 = 0, totalStandby = 0;
  tickets.forEach(tk => {
    totalNormal += (parseFloat(tk.normalHours) || 0);
    totalOt15 += (parseFloat(tk.ot15Hours) || 0);
    totalOt20 += (parseFloat(tk.ot20Hours) || 0);
    totalStandby += (parseFloat(tk.standbyHours) || 0);
  });
  const totalAll = totalNormal + totalOt15 + totalOt20 + totalStandby;

  container.innerHTML = `
    <div class="card" style="padding:14px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:14px;">⏱️</span>
          <div style="font-size:11px;font-weight:700;color:var(--g500);letter-spacing:0.08em;text-transform:uppercase;">
            Daily Timesheets & Tickets (${tickets.length})
          </div>
        </div>
        <button onclick="openServiceTicketModal()" class="btn btn-sm btn-p" style="padding:4px 10px;font-size:11px;">
          ＋ Add Ticket
        </button>
      </div>

      <!-- Hours summary bar -->
      <div class="ts-summary-banner">
        <div class="ts-sum-col">
          <div class="ts-sum-lbl">Normal</div>
          <div class="ts-sum-val">${totalNormal}h</div>
        </div>
        <div class="ts-sum-col">
          <div class="ts-sum-lbl">OT 1.5x</div>
          <div class="ts-sum-val" style="color:var(--am);">${totalOt15}h</div>
        </div>
        <div class="ts-sum-col">
          <div class="ts-sum-lbl">OT 2.0x</div>
          <div class="ts-sum-val" style="color:var(--red);">${totalOt20}h</div>
        </div>
        <div class="ts-sum-col">
          <div class="ts-sum-lbl">Standby</div>
          <div class="ts-sum-val" style="color:var(--blue);">${totalStandby}h</div>
        </div>
        <div class="ts-sum-col ts-sum-total">
          <div class="ts-sum-lbl">Total</div>
          <div class="ts-sum-val" style="color:var(--brand);">${totalAll}h</div>
        </div>
      </div>

      <!-- Tickets list -->
      <div id="trip-tickets-list" style="margin-top:10px;">
        ${!tickets.length ? `
          <div style="text-align:center;padding:12px;font-size:12px;color:var(--n400);background:var(--n50);border-radius:var(--rs);">
            No daily tickets recorded yet. Tap <b>＋ Add Ticket</b> to log hours and get daily customer sign-off.
          </div>
        ` : tickets.map((tk) => {
          const hasSig = !!tk.signature;
          return `
            <div class="ts-ticket-card">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
                <div>
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span style="font-size:12px;font-weight:700;color:var(--n800);">📅 ${fmtDate(tk.date)}</span>
                    <span class="ts-badge-norm">${tk.normalHours || 0}h Norm</span>
                    ${parseFloat(tk.ot15Hours) > 0 ? `<span class="ts-badge-ot15">+${tk.ot15Hours}h OT 1.5x</span>` : ''}
                    ${parseFloat(tk.ot20Hours) > 0 ? `<span class="ts-badge-ot20">+${tk.ot20Hours}h OT 2.0x</span>` : ''}
                    ${parseFloat(tk.standbyHours) > 0 ? `<span class="ts-badge-stby">${tk.standbyHours}h Standby</span>` : ''}
                  </div>
                </div>
                <div style="display:flex;gap:4px;">
                  <button class="ts-btn-edit" onclick="openServiceTicketModal('${tk.id}')" title="Edit ticket">✍️</button>
                  <button class="ts-btn-del" onclick="deleteServiceTicket('${tk.id}')" title="Delete">🗑️</button>
                </div>
              </div>

              ${tk.workSummary ? `
                <div style="font-size:12px;color:var(--n700);line-height:1.4;margin-bottom:6px;background:var(--n50);padding:6px 8px;border-radius:4px;">
                  ${tk.workSummary}
                </div>
              ` : ''}

              <!-- Customer Sign-off status -->
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;border-top:1px dashed var(--n200);padding-top:6px;">
                <div style="font-size:11px;color:var(--n500);">
                  Supervisor: <b>${tk.supervisorName || 'Customer Supervisor'}</b>
                </div>
                ${hasSig ? `
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:10px;font-weight:700;color:var(--green);">✓ SIGNED</span>
                    <img src="${tk.signature}" style="height:26px;max-width:70px;object-fit:contain;border:1px solid var(--n200);border-radius:3px;background:#fff;">
                  </div>
                ` : `
                  <span style="font-size:10px;font-weight:700;color:var(--amber);">⚠️ Pending Signature</span>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function openServiceTicketModal(ticketId = null) {
  const tr = S.trips.find(t => t.id === curTrip);
  if (!tr) return;

  editingTicketId = ticketId;
  const modalTitle = document.getElementById('ticket-modal-title');
  const dateInput = document.getElementById('tkt-date');
  const normInput = document.getElementById('tkt-norm');
  const ot15Input = document.getElementById('tkt-ot15');
  const ot20Input = document.getElementById('tkt-ot20');
  const stbyInput = document.getElementById('tkt-stby');
  const travelInput = document.getElementById('tkt-travel');
  const summaryInput = document.getElementById('tkt-summary');
  const superInput = document.getElementById('tkt-supervisor');

  _tempTicketSigDataUrl = '';

  if (ticketId) {
    tr.timesheets = tr.timesheets || [];
    const tk = tr.timesheets.find(t => t.id === ticketId);
    if (tk) {
      if (modalTitle) modalTitle.textContent = 'Edit Service Ticket';
      if (dateInput) dateInput.value = tk.date || '';
      if (normInput) normInput.value = tk.normalHours !== undefined ? tk.normalHours : 8;
      if (ot15Input) ot15Input.value = tk.ot15Hours || 0;
      if (ot20Input) ot20Input.value = tk.ot20Hours || 0;
      if (stbyInput) stbyInput.value = tk.standbyHours || 0;
      if (travelInput) travelInput.value = tk.travelHours || 0;
      if (summaryInput) summaryInput.value = tk.workSummary || '';
      if (superInput) superInput.value = tk.supervisorName || '';
      _tempTicketSigDataUrl = tk.signature || '';
    }
  } else {
    if (modalTitle) modalTitle.textContent = 'New Daily Service Ticket';
    if (dateInput) dateInput.value = todayStr();
    if (normInput) normInput.value = 8;
    if (ot15Input) ot15Input.value = 0;
    if (ot20Input) ot20Input.value = 0;
    if (stbyInput) stbyInput.value = 0;
    if (travelInput) travelInput.value = 0;
    if (summaryInput) summaryInput.value = '';
    if (superInput) superInput.value = tr.contact || '';
  }

  openModal('modal-service-ticket');
  // Delay canvas init until modal is rendered
  setTimeout(() => {
    initTicketSigCanvas();
  }, 150);
}

function initTicketSigCanvas() {
  ticketSigCanvas = document.getElementById('ticketSigCanvas');
  if (!ticketSigCanvas) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = ticketSigCanvas.getBoundingClientRect();
  const cssW = rect.width || 340;
  const cssH = 110;

  ticketSigCanvas.width = Math.round(cssW * dpr);
  ticketSigCanvas.height = Math.round(cssH * dpr);
  ticketSigCanvas.style.width = cssW + 'px';
  ticketSigCanvas.style.height = cssH + 'px';

  ticketSigCtx = ticketSigCanvas.getContext('2d');
  ticketSigCtx.scale(dpr, dpr);
  ticketSigCtx.strokeStyle = '#0F172A';
  ticketSigCtx.lineWidth = 2.2;
  ticketSigCtx.lineCap = 'round';
  ticketSigCtx.lineJoin = 'round';

  ticketSigCtx.fillStyle = '#fafafa';
  ticketSigCtx.fillRect(0, 0, cssW, cssH);

  if (_tempTicketSigDataUrl) {
    const img = new Image();
    img.onload = () => {
      ticketSigCtx.drawImage(img, 0, 0, cssW, cssH);
    };
    img.src = _tempTicketSigDataUrl;
  }

  const getPos = e => {
    const r = ticketSigCanvas.getBoundingClientRect();
    const cx = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
    const cy = (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY);
    return { x: cx - r.left, y: cy - r.top };
  };

  const startDraw = e => {
    isTicketDrawing = true;
    const p = getPos(e);
    ticketSigCtx.beginPath();
    ticketSigCtx.moveTo(p.x, p.y);
    if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
  };

  const moveDraw = e => {
    if (!isTicketDrawing) return;
    const p = getPos(e);
    ticketSigCtx.lineTo(p.x, p.y);
    ticketSigCtx.stroke();
    if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
  };

  const endDraw = () => {
    if (isTicketDrawing) {
      isTicketDrawing = false;
      try {
        _tempTicketSigDataUrl = ticketSigCanvas.toDataURL('image/png');
      } catch(e) {}
    }
  };

  ticketSigCanvas.onmousedown = startDraw;
  ticketSigCanvas.onmousemove = moveDraw;
  ticketSigCanvas.onmouseup = endDraw;
  ticketSigCanvas.ontouchstart = startDraw;
  ticketSigCanvas.ontouchmove = moveDraw;
  ticketSigCanvas.ontouchend = endDraw;
}

function clearTicketSig() {
  if (!ticketSigCanvas || !ticketSigCtx) return;
  const rect = ticketSigCanvas.getBoundingClientRect();
  const cssW = rect.width || 340;
  const cssH = 110;
  ticketSigCtx.fillStyle = '#fafafa';
  ticketSigCtx.fillRect(0, 0, cssW, cssH);
  _tempTicketSigDataUrl = '';
  triggerHaptic('light');
}

function saveServiceTicket() {
  const tr = S.trips.find(t => t.id === curTrip);
  if (!tr) return;

  const date = (document.getElementById('tkt-date') || {}).value || todayStr();
  const normalHours = parseFloat((document.getElementById('tkt-norm') || {}).value) || 0;
  const ot15Hours = parseFloat((document.getElementById('tkt-ot15') || {}).value) || 0;
  const ot20Hours = parseFloat((document.getElementById('tkt-ot20') || {}).value) || 0;
  const standbyHours = parseFloat((document.getElementById('tkt-stby') || {}).value) || 0;
  const travelHours = parseFloat((document.getElementById('tkt-travel') || {}).value) || 0;
  const workSummary = (document.getElementById('tkt-summary') || {}).value.trim();
  const supervisorName = (document.getElementById('tkt-supervisor') || {}).value.trim();

  // Capture canvas dataURL
  let sig = _tempTicketSigDataUrl;
  if (!sig && ticketSigCanvas) {
    try {
      const data = ticketSigCanvas.toDataURL('image/png');
      if (data.length > 1000) sig = data;
    } catch(e) {}
  }

  tr.timesheets = tr.timesheets || [];

  if (editingTicketId) {
    const tk = tr.timesheets.find(t => t.id === editingTicketId);
    if (tk) {
      tk.date = date;
      tk.normalHours = normalHours;
      tk.ot15Hours = ot15Hours;
      tk.ot20Hours = ot20Hours;
      tk.standbyHours = standbyHours;
      tk.travelHours = travelHours;
      tk.workSummary = workSummary;
      tk.summary = workSummary;
      tk.supervisorName = supervisorName;
      if (sig) {
        tk.signature = sig;
        tk.supervisorSig = sig;
      }
      tk.updatedAt = new Date().toISOString();
    }
  } else {
    const newTk = {
      id: 'tkt_' + Date.now(),
      date,
      normalHours,
      ot15Hours,
      ot20Hours,
      standbyHours,
      travelHours,
      workSummary,
      summary: workSummary,
      supervisorName,
      signature: sig || '',
      supervisorSig: sig || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    tr.timesheets.push(newTk);
  }

  sv();
  closeModal('modal-service-ticket');
  renderTripTimesheets(curTrip);
  triggerHaptic('success');
  showToast('Service ticket saved ✓');
  if (typeof svAndSync === 'function') svAndSync('service_ticket');
}

async function deleteServiceTicket(ticketId) {
  const tr = S.trips.find(t => t.id === curTrip);
  if (!tr) return;

  const ok = await appConfirm('Delete this daily service ticket?', {
    title: 'Delete Service Ticket',
    danger: true,
    confirmText: 'Delete',
    icon: '🗑️'
  });
  if (!ok) return;

  if (!S.deletedIds) S.deletedIds = {};
  S.deletedIds[ticketId] = Date.now();

  tr.timesheets = (tr.timesheets || []).filter(t => t.id !== ticketId);
  sv();
  renderTripTimesheets(curTrip);
  triggerHaptic('light');
  showToast('Service ticket deleted');
  if (typeof svAndSync === 'function') svAndSync('service_ticket_delete');
}

// ═════════════════════════════════════════════════════
// SITE SAFETY, EHS & LOTO CHECKLIST (IMP-23)
// ═════════════════════════════════════════════════════
let _tempLotoPhoto = '';

function renderTripSafety(tripId) {
  const tr = S.trips.find(t => t.id === tripId);
  const container = document.getElementById('trip-safety-section');
  if (!container || !tr) return;

  tr.safety = tr.safety || {};
  const s = tr.safety;
  const loto = s.loto || {};
  const contacts = s.emergencyContacts || {};
  const permitTypes = s.permitTypes || [];

  const permitLabels = {
    height: 'Work at Height',
    confined: 'Confined Space',
    hotwork: 'Hot Work',
    electrical: 'Electrical Isolation',
    chemical: 'Chemical / Pressure'
  };

  container.innerHTML = `
    <div class="card" style="padding:14px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:14px;">🦺</span>
          <div style="font-size:11px;font-weight:700;color:var(--g500);letter-spacing:0.08em;text-transform:uppercase;">
            Site Safety, Work Permits & LOTO
          </div>
        </div>
        <button onclick="openTripSafetyModal()" class="btn btn-sm btn-o" style="padding:4px 10px;font-size:11px;">
          ✏️ Edit Safety
        </button>
      </div>

      <!-- Work Permit info -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:4px;">
        <div style="font-size:12px;color:var(--n700);">
          Permit No: <b>${s.permitNo || '—'}</b>
        </div>
        ${s.validUntil ? `<div style="font-size:11px;color:var(--n500);">Valid until: <b>${fmtDate(s.validUntil)}</b></div>` : ''}
      </div>

      ${permitTypes.length ? `
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
          ${permitTypes.map(p => `<span class="badge-permit">${permitLabels[p] || p}</span>`).join('')}
        </div>
      ` : `
        <div style="font-size:11px;color:var(--n400);margin-bottom:6px;">No specific high-risk permits declared.</div>
      `}

      <!-- LOTO Checklist summary -->
      <div class="loto-status-box">
        <div style="font-size:11px;font-weight:700;color:var(--n700);margin-bottom:4px;display:flex;justify-content:space-between;">
          <span>🔒 LOTO Status (Padlock: ${loto.padlockId || 'N/A'})</span>
          ${loto.zeroEnergyVerified ? `<span style="color:var(--green);font-size:10px;font-weight:700;">✓ ZERO ENERGY VERIFIED</span>` : `<span style="color:var(--amber);font-size:10px;font-weight:700;">⚠️ Unverified</span>`}
        </div>
        <div class="loto-check-grid">
          <div class="loto-check-item ${loto.electricalIsolated ? 'checked' : ''}">
            ${loto.electricalIsolated ? '✅' : '⚪'} Electrical Locked
          </div>
          <div class="loto-check-item ${loto.pneumaticIsolated ? 'checked' : ''}">
            ${loto.pneumaticIsolated ? '✅' : '⚪'} Pneumatic/Valve Locked
          </div>
          <div class="loto-check-item ${loto.dangerTagHung ? 'checked' : ''}">
            ${loto.dangerTagHung ? '✅' : '⚪'} Danger Tag Hung
          </div>
          <div class="loto-check-item ${loto.zeroEnergyVerified ? 'checked' : ''}">
            ${loto.zeroEnergyVerified ? '✅' : '⚪'} Zero Energy Checked
          </div>
        </div>
        ${loto.photo ? `
          <div style="margin-top:6px;display:flex;align-items:center;gap:6px;">
            <img src="${loto.photo}" onclick="previewImage('${loto.photo}')"
              style="height:40px;width:40px;object-fit:cover;border-radius:4px;border:1px solid var(--n200);cursor:pointer;">
            <span style="font-size:11px;color:var(--n500);">LOTO Padlock Photo Proof Attached ✓</span>
          </div>
        ` : ''}
      </div>

      <!-- Emergency Hotline buttons -->
      <div style="margin-top:10px;">
        <div style="font-size:10px;font-weight:700;color:var(--n500);letter-spacing:0.06em;margin-bottom:4px;text-transform:uppercase;">
          Plant Emergency Hotlines
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${contacts.ccrPhone ? `
            <a href="tel:${contacts.ccrPhone}" class="btn-emergency-call" title="Call DCS/Control Room">
              📞 CCR: ${contacts.ccrPhone}
            </a>
          ` : ''}
          ${contacts.ehsPhone ? `
            <a href="tel:${contacts.ehsPhone}" class="btn-emergency-call" title="Call Plant Safety Lead">
              🦺 EHS: ${contacts.ehsPhone}
            </a>
          ` : ''}
          ${contacts.medicalPhone ? `
            <a href="tel:${contacts.medicalPhone}" class="btn-emergency-call" style="background:#FEE2E2;color:#991B1B;border-color:#FCA5A5;" title="Call Plant Medical">
              🚑 Med: ${contacts.medicalPhone}
            </a>
          ` : ''}
          ${!contacts.ccrPhone && !contacts.ehsPhone && !contacts.medicalPhone ? `
            <span style="font-size:11px;color:var(--n400);font-style:italic;">No emergency phone numbers configured.</span>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function openTripSafetyModal() {
  const tr = S.trips.find(t => t.id === curTrip);
  if (!tr) return;

  tr.safety = tr.safety || {};
  const s = tr.safety;
  const loto = s.loto || {};
  const contacts = s.emergencyContacts || {};
  const permitTypes = s.permitTypes || [];

  const pno = document.getElementById('safe-permit-no');
  const validEl = document.getElementById('safe-valid-until');
  const padEl = document.getElementById('safe-padlock-id');
  const ccrEl = document.getElementById('safe-phone-ccr');
  const ehsEl = document.getElementById('safe-phone-ehs');
  const medEl = document.getElementById('safe-phone-med');

  if (pno) pno.value = s.permitNo || '';
  if (validEl) validEl.value = s.validUntil || tr.dateEnd || tr.date || '';
  if (padEl) padEl.value = loto.padlockId || '';
  if (ccrEl) ccrEl.value = contacts.ccrPhone || '';
  if (ehsEl) ehsEl.value = contacts.ehsPhone || '';
  if (medEl) medEl.value = contacts.medicalPhone || '';

  // Checkboxes
  ['height', 'confined', 'hotwork', 'electrical', 'chemical'].forEach(p => {
    const cb = document.getElementById('safe-ptype-' + p);
    if (cb) cb.checked = permitTypes.includes(p);
  });

  const cbElec = document.getElementById('safe-loto-elec');
  const cbPneu = document.getElementById('safe-loto-pneu');
  const cbTag = document.getElementById('safe-loto-tag');
  const cbZero = document.getElementById('safe-loto-zero');

  if (cbElec) cbElec.checked = !!loto.electricalIsolated;
  if (cbPneu) cbPneu.checked = !!loto.pneumaticIsolated;
  if (cbTag) cbTag.checked = !!loto.dangerTagHung;
  if (cbZero) cbZero.checked = !!loto.zeroEnergyVerified;

  _tempLotoPhoto = loto.photo || '';
  const photoPrev = document.getElementById('safe-loto-photo-prev');
  if (photoPrev) {
    if (_tempLotoPhoto) {
      photoPrev.src = _tempLotoPhoto;
      photoPrev.style.display = 'block';
    } else {
      photoPrev.src = '';
      photoPrev.style.display = 'none';
    }
  }

  openModal('modal-trip-safety');
}

async function handleLotoPhotoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    showToast('Compressing LOTO photo...');
    const compressed = await compressImageFile(file, 1280, 0.72);
    _tempLotoPhoto = compressed;
    const photoPrev = document.getElementById('safe-loto-photo-prev');
    if (photoPrev) {
      photoPrev.src = compressed;
      photoPrev.style.display = 'block';
    }
    triggerHaptic('light');
    showToast('LOTO photo loaded ✓');
  } catch(err) {
    console.error('LOTO photo error:', err);
    showToast('Failed to load image');
  }
}

function clearLotoPhoto() {
  _tempLotoPhoto = '';
  const photoPrev = document.getElementById('safe-loto-photo-prev');
  if (photoPrev) {
    photoPrev.src = '';
    photoPrev.style.display = 'none';
  }
  const input = document.getElementById('safe-loto-file');
  if (input) input.value = '';
}

function saveTripSafety() {
  const tr = S.trips.find(t => t.id === curTrip);
  if (!tr) return;

  const permitNo = (document.getElementById('safe-permit-no') || {}).value.trim();
  const validUntil = (document.getElementById('safe-valid-until') || {}).value;
  const padlockId = (document.getElementById('safe-padlock-id') || {}).value.trim();
  const ccrPhone = (document.getElementById('safe-phone-ccr') || {}).value.trim();
  const ehsPhone = (document.getElementById('safe-phone-ehs') || {}).value.trim();
  const medicalPhone = (document.getElementById('safe-phone-med') || {}).value.trim();

  const permitTypes = [];
  ['height', 'confined', 'hotwork', 'electrical', 'chemical'].forEach(p => {
    const cb = document.getElementById('safe-ptype-' + p);
    if (cb && cb.checked) permitTypes.push(p);
  });

  const electricalIsolated = !!(document.getElementById('safe-loto-elec') || {}).checked;
  const pneumaticIsolated = !!(document.getElementById('safe-loto-pneu') || {}).checked;
  const dangerTagHung = !!(document.getElementById('safe-loto-tag') || {}).checked;
  const zeroEnergyVerified = !!(document.getElementById('safe-loto-zero') || {}).checked;

  tr.safety = {
    permitNo,
    validUntil,
    permitTypes,
    loto: {
      padlockId,
      electricalIsolated,
      pneumaticIsolated,
      dangerTagHung,
      zeroEnergyVerified,
      photo: _tempLotoPhoto || ''
    },
    emergencyContacts: {
      ccrPhone,
      ehsPhone,
      medicalPhone
    },
    updatedAt: new Date().toISOString()
  };

  sv();
  closeModal('modal-trip-safety');
  renderTripSafety(curTrip);
  triggerHaptic('success');
  showToast('Site Safety & LOTO updated ✓');
  if (typeof svAndSync === 'function') svAndSync('trip_safety');
}


