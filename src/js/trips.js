/**
 * PlantLog v4 — TRIPS MODULE
 * Trip CRUD, edit, notes, flight
 * Lines 858–1110 of original monolithic file
 */

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
  const q=(document.getElementById('trip-search')?.value||'').toLowerCase().trim();
  if(q)trips=trips.filter(tr=>
    (tr.plant||'').toLowerCase().includes(q)||
    (tr.location||'').toLowerCase().includes(q)||
    (tr.purpose||'').toLowerCase().includes(q)||
    (tr.contact||'').toLowerCase().includes(q)
  );

  // Date range
  const df=document.getElementById('trip-from')?.value||'';
  const dt=document.getElementById('trip-to')?.value||'';
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
  const tr=S.trips.find(tr=>tr.id===curTrip);if(!tr)return;
  if(tr.status==='planned'){tr.status='in_progress';sv();}
  document.getElementById('report-plant-name').textContent=tr.plant;
  document.getElementById('report-date').textContent=fmtDate(tr.date);
  curReport=S.reports[tr.id]||{checklist:[],readings:[],issues:[],team:[],signoff:{summary:'',result:'Completed',remarks:''},signature:'',reportTasks:[],reportTaskNotes:{}};
  if(!curReport.reportTasks)curReport.reportTasks=[];
  if(!curReport.reportTaskNotes)curReport.reportTaskNotes={};
  S.reports[tr.id]=curReport;
  gotoStep(0);showScreen('report');updateSigDate();
  document.getElementById('signoff-summary').value=curReport.signoff.summary||'';
  document.getElementById('signoff-remarks').value=curReport.signoff.remarks||'';
  signoffRes=curReport.signoff.result||'Completed';
  document.querySelectorAll('.ropt').forEach(b=>b.classList.toggle('sel',b.textContent.includes(signoffRes)));
  if(curReport.signature){const img=new Image();img.onload=()=>{sigCtx.clearRect(0,0,sigCanvas.width,sigCanvas.height);sigCtx.drawImage(img,0,0);};img.src=curReport.signature;}
  else sigCtx.clearRect(0,0,sigCanvas.width,sigCanvas.height);
}
