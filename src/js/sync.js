/**
 * PlantLog v4 — SYNC MODULE
 * Google Sheets sync & load
 * Lines 1990–2348 of original monolithic file
 */

// ═══════ GOOGLE SHEETS SYNC ═══════
function getGSUrl(){return S.gsUrl||'';}

function gsUrlChanged(){
  const url=document.getElementById('gs-url').value.trim();
  // Hide old result when user types
  const res=document.getElementById('gs-test-result');
  if(res)res.style.display='none';
}

function toggleGSGuide(){
  const body=document.getElementById('gs-guide-body');
  const arrow=document.getElementById('gs-guide-arrow');
  if(body){const open=body.style.display==='none';body.style.display=open?'':'none';if(arrow)arrow.textContent=open?'▲':'▼';}
}

function showGSResult(msg, type){
  // type: 'ok' | 'warn' | 'error'
  const el=document.getElementById('gs-test-result');
  if(!el)return;
  const colors={ok:{bg:'var(--gl)',color:'var(--gd)'},warn:{bg:'var(--al)',color:'#92400E'},error:{bg:'var(--rl)',color:'#991B1B'}};
  const c=colors[type]||colors.warn;
  el.style.background=c.bg;el.style.color=c.color;el.style.display='block';
  el.textContent=msg;
}

function updateGSStatus(){
  const el=document.getElementById('gsheet-status');
  const urlEl=document.getElementById('gs-url');
  const bar=document.getElementById('gs-status-bar');
  if(S.gsUrl){
    if(el)el.textContent=S.lastSync?'Last sync: '+new Date(S.lastSync).toLocaleString():'Connected — not synced yet';
    if(urlEl)urlEl.value=S.gsUrl;
    if(bar){
      bar.style.display='flex';
      bar.style.background=S.lastSync?'var(--gl)':'var(--al)';
      const icon=document.getElementById('gs-status-icon');
      const title=document.getElementById('gs-status-title');
      const sub=document.getElementById('gs-status-sub');
      if(icon)icon.textContent=S.lastSync?'✅':'⚠️';
      if(title)title.style.color=S.lastSync?'var(--gd)':'#92400E';
      if(title)title.textContent=S.lastSync?'Connected & synced':'URL saved — sync to verify';
      if(sub)sub.style.color=S.lastSync?'var(--gd)':'#92400E';
      if(sub)sub.textContent=S.lastSync?'Last sync: '+new Date(S.lastSync).toLocaleString():S.gsUrl.substring(0,45)+'...';
    }
  } else {
    if(bar)bar.style.display='none';
    if(el)el.textContent='Not connected';
  }
}

// Google Apps Script CORS fix:
// GET requests work fine (GAS handles CORS for GET)
// POST must use no-cors mode OR form-encoded via iframe trick
// Best approach: use fetch with mode:'cors' — GAS doPost supports it when deployed as "Anyone"
async function gsPost(url, body){
  // Primary: direct fetch (works when GAS is deployed as "Anyone" access)
  try{
    const r=await fetch(url,{
      method:'POST',
      body:JSON.stringify(body),
      headers:{'Content-Type':'text/plain;charset=utf-8'} // text/plain avoids preflight CORS
    });
    return await r.json();
  }catch(e){
    throw new Error('FETCH_FAILED: '+e.message);
  }
}

async function gsGet(url, params){
  const qs=Object.entries(params||{}).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&');
  const fullUrl=url+(qs?'?'+qs:'');
  const r=await fetch(fullUrl,{method:'GET',mode:'cors'});
  return await r.json();
}

async function testGSConnection(){
  const url=document.getElementById('gs-url').value.trim();
  if(!url){showGSResult('⚠ Paste your Apps Script URL first','warn');return;}
  if(!url.includes('script.google.com')){showGSResult('❌ URL must be a script.google.com address','error');return;}
  if(!url.endsWith('/exec')&&!url.includes('/exec?')){showGSResult('⚠ URL should end with /exec — check your deployment URL','warn');S.gsUrl=url;sv();updateGSStatus();return;}

  showGSResult('Testing connection...','warn');
  // Save URL immediately regardless of test result
  S.gsUrl=url;sv();updateGSStatus();

  try{
    const data=await gsGet(url,{action:'ping'});
    if(data.ok){
      showGSResult('✅ Connected! Google Sheet is ready.','ok');
      S.lastSync=null;sv();updateGSStatus();
    } else {
      showGSResult('⚠ Received response but got error: '+(data.error||'unknown'),'warn');
    }
  }catch(e){
    // CORS blocks GET test from some browsers — this is expected
    // The sync (POST with text/plain) usually works even when GET test fails
    showGSResult('⚠ Browser CORS blocked the test (this is normal). Tap "Sync all data" to verify the connection actually works.','warn');
    const btn=document.getElementById('gs-sync-btn');
    if(btn){btn.style.background='var(--amber)';btn.textContent='⬆ Try sync to verify';}
    setTimeout(()=>{if(btn){btn.style.background='';btn.textContent='⬆ Sync all data';}},4000);
  }
}

async function syncToSheets(){
  const url=getGSUrl();
  if(!url){updateGSStatus();openModal('modal-gsheet');showGSResult('⚠ Paste your Apps Script URL first','warn');return;}

  const btn=document.getElementById('gs-sync-btn');
  if(btn){btn.disabled=true;btn.textContent='Syncing...';}
  showToast('Syncing to Google Sheets…');

  // ── Every field explicitly cast to String to prevent type issues ──
  const s=v=>(v===null||v===undefined)?'':String(v);

  const enrichedTasks=(S.tasks||[]).map(tk=>{
    const cl=tk.checklist||[];
    return {
      id:            s(tk.id),
      title:         s(tk.title),
      desc:          s(tk.desc),
      category:      s(tk.category)||'work',
      dateStart:     s(tk.dateStart||tk.date),
      timeStart:     s(tk.timeStart||tk.time),
      dateEnd:       s(tk.dateEnd||tk.dateStart||tk.date),
      timeEnd:       s(tk.timeEnd),
      hours:         s(tk.hours),
      minutes:       s(tk.minutes),
      priority:      s(tk.priority)||'medium',
      period:        s(tk.period),
      machine:       s(tk.machine),
      plan:          s(tk.plan),
      tripId:        s(tk.tripId),
      status:        s(tk.status)||'pending',
      checklist:     cl.map(c=>(c.done?'[x] ':'[ ] ')+s(c.text||c.name)).join(' | '),
      checklistJson: JSON.stringify(cl),
      createdAt:     s(tk.createdAt),
      updatedAt:     s(tk.updatedAt)||new Date().toISOString()
    };
  });

  const enrichedTrips=(S.trips||[]).map(tr=>({
    id:        s(tr.id),        plant:     s(tr.plant),
    location:  s(tr.location),  date:      s(tr.date),
    dateEnd:   s(tr.dateEnd),   purpose:   s(tr.purpose),
    contact:   s(tr.contact),   transport: s(tr.transport),
    status:    s(tr.status)||'planned',
    notes:     s(tr.notes),
    createdAt: s(tr.createdAt)
  }));

  // Compress bill photos to small JPEG thumbnails (max 200px) before sending
  const compressPhoto=async dataUrl=>{
    try{
      return await new Promise(resolve=>{
        const img=new Image();
        img.onload=()=>{
          const MAX=300;
          let w=img.width,h=img.height;
          if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}
          if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}
          const c=document.createElement('canvas');c.width=w;c.height=h;
          c.getContext('2d').drawImage(img,0,0,w,h);
          resolve(c.toDataURL('image/jpeg',0.5));
        };
        img.onerror=()=>resolve('');
        img.src=dataUrl;
      });
    }catch(e){return '';}
  };

  // Build compressed bills array
  const buildBills=async()=>{
    const result=[];
    for(const b of (S.bills||[])){
      const photos=b.photos||[];
      const compressed=[];
      for(const p of photos.slice(0,3)){  // max 3 photos per bill
        const cp=await compressPhoto(p);
        if(cp)compressed.push(cp);
      }
      result.push({
        id:         s(b.id),
        tripId:     s(b.tripId),
        date:       s(b.date),
        billNumber: s(b.billNumber),
        detail:     s(b.detail),
        amount:     parseFloat(s(b.amount))||0,
        currency:   s(b.currency)||'VND',
        category:   s(b.category)||'other',
        paymentMethod: s(b.paymentMethod||b.paymentTerm)||'1-Cash',
        notes:      s(b.notes),
        photoCount: photos.length,
        photosJson: JSON.stringify(compressed),
        createdAt:  s(b.createdAt)
      });
    }
    return result;
  };
  const enrichedBills=await buildBills();

  const reports={};
  Object.entries(S.reports||{}).forEach(([id,rep])=>{
    if(!rep)return;
    reports[id]={
      checklist:(rep.checklist||[]).map(c=>({id:s(c.id),name:s(c.name),result:s(c.result),note:s(c.note)})),
      readings: (rep.readings||[]).map(r=>({name:s(r.name),tag:s(r.tag),value:s(r.value),unit:s(r.unit),status:s(r.status),type:s(r.type),condition:s(r.condition),notes:s(r.notes)})),
      issues:   (rep.issues||[]).map(i=>({title:s(i.title),description:s(i.description),severity:s(i.severity),istatus:s(i.istatus)||'pending',action:s(i.action)})),
      team:     (rep.team||[]).map(m=>({name:s(m.name),role:s(m.role),org:s(m.org),signoff:s(m.signoff)})),
      signoff:  {summary:s(rep.signoff&&rep.signoff.summary),result:s(rep.signoff&&rep.signoff.result),remarks:s(rep.signoff&&rep.signoff.remarks)},
      signature:''
    };
  });

  const payload={
    trips:enrichedTrips, tasks:enrichedTasks,
    leaveData:S.leaveData||{}, reports,
    machines:S.machines||[], plans:S.plans||[],
    bills:enrichedBills
  };

  try{
    const data=await gsPost(url,{action:'syncAll',payload});
    if(btn){btn.disabled=false;btn.textContent='⬆ Sync all data';}
    if(data&&data.ok){
      const res=data.result||{};
      S.lastSync=new Date().toISOString();sv();updateGSStatus();
      showGSResult(`✅ Synced! ${res.trips||0} trips · ${res.tasks||0} tasks · ${res.leave||0} leave · ${res.bills||0} bills`,'ok');
      showToast('Synced to Google Sheets ✓');
    } else {
      showGSResult('❌ Sync error: '+((data&&data.error)||'Unknown'),'error');
      showToast('Sync failed — check error in sync panel');
    }
  }catch(e){
    if(btn){btn.disabled=false;btn.textContent='⬆ Sync all data';}
    showGSResult('❌ Network error. Check URL ends in /exec and access is Anyone.','error');
    showToast('Could not reach Google Sheet');
  }
}

async function loadFromSheets(){
  const url=getGSUrl();
  if(!url){showToast('Set your Google Sheet URL first');openModal('modal-gsheet');return;}
  showToast('Loading from Google Sheets…');
  try{
    const data=await gsGet(url,{action:'getAll'});
    if(data.ok&&data.data){
      const d=data.data;
      if(d.trips&&d.trips.length){
        const strV=v=>v===null||v===undefined?'':v instanceof Date?v.toISOString().slice(0,10):String(v);
        const existingTrips = S.trips || [];
        S.trips=d.trips.map(tr=>{
          const st = strV(tr.Status)||'planned';
          const localTr = existingTrips.find(x=>x.id===strV(tr.ID));
          const finalSt = (localTr && (localTr.status==='in_progress'||localTr.status==='done') && st==='planned') ? localTr.status : st;
          return {
            id:       strV(tr.ID),
            plant:    strV(tr.Plant),
            location: strV(tr.Location),
            date:     strV(tr.Date),
            dateEnd:  strV(tr.DateEnd),
            purpose:  strV(tr.Purpose),
            contact:  strV(tr.Contact),
            transport:strV(tr.Transport),
            status:   finalSt,
          notes:    strV(tr.Notes),
          createdAt:strV(tr.CreatedAt)
        };
      });
    }
      if(d.tasks&&d.tasks.length){
        // Helper: safely convert any value to string, handle Date objects
        const str=v=>{
          if(v===null||v===undefined||v==='')return'';
          if(v instanceof Date)return v.toISOString().slice(0,10);
          return String(v);
        };
        const num=v=>parseFloat(str(v))||0;
        S.tasks=d.tasks.map(tk=>{
          let cl=[];
          try{
            const cj=str(tk.ChecklistJson||tk.checklistJson||'');
            if(cj.startsWith('['))cl=JSON.parse(cj);
            else{const c2=str(tk.Checklist||'');if(c2.startsWith('['))cl=JSON.parse(c2);}
          }catch(e){cl=[];}
          const ds=str(tk.DateStart)||str(tk.Date)||'';
          const de=str(tk.DateEnd)||ds;
          return {
            id:           str(tk.ID),
            title:        str(tk.Title),
            desc:         str(tk.Description),
            category:     str(tk.Category)||'work',
            dateStart:    ds,
            timeStart:    str(tk.TimeStart)||str(tk.Time)||'',
            dateEnd:      de,
            timeEnd:      str(tk.TimeEnd)||'',
            hours:        str(tk.Hours),
            minutes:      str(tk.Minutes),
            priority:     str(tk.Priority)||'medium',
            period:       str(tk.Period),
            machine:      str(tk.Machine),
            plan:         str(tk.Plan),
            tripId:       str(tk.TripID),
            status:       (()=>{
              const raw=(str(tk.Status)||'pending').toLowerCase().trim();
              let stVal = 'pending';
              if(raw.includes('progress')||raw==='in_progress') stVal = 'in_progress';
              else if(raw==='done'||raw==='complete'||raw==='completed') stVal = 'done';
              const localTk = (S.tasks||[]).find(x=>x.id===str(tk.ID));
              if(localTk && (localTk.status==='in_progress'||localTk.status==='done') && stVal==='pending') {
                return localTk.status;
              }
              return stVal;
            })(),
            checklist:    cl,
            date:         ds,
            time:         str(tk.TimeStart)||str(tk.Time)||'',
            createdAt:    str(tk.CreatedAt),
            updatedAt:    str(tk.UpdatedAt)
          };
        });
      }
      if(d.leave&&d.leave.length){
        S.leaveData={};
        d.leave.forEach(l=>{if(l.Date&&l.Type)S.leaveData[l.Date]=l.Type;});
      }
      // Load bills
      if(d.bills&&d.bills.length){
        const strB=v=>v===null||v===undefined?'':v instanceof Date?v.toISOString().slice(0,10):String(v);
        S.bills=d.bills.map(b=>{
          let photos=[];
          try{
            const pj=strB(b.PhotosJson||b.photosJson||'');
            if(pj&&pj.startsWith('['))photos=JSON.parse(pj);
          }catch(e){photos=[];}
          return {
            id:         strB(b.ID),
            tripId:     strB(b.TripID),
            date:       strB(b.Date),
            billNumber: strB(b.BillNumber),
            detail:     strB(b.Detail),
            amount:     parseFloat(strB(b.Amount))||0,
            currency:   strB(b.Currency)||'VND',
            category:   strB(b.Category)||'other',
            paymentMethod: strB(b.PaymentMethod||b.paymentMethod||b.PaymentTerm||b.paymentTerm)||'1-Cash',
            notes:      strB(b.Notes),
            photos:     photos,
            createdAt:  strB(b.CreatedAt)
          };
        });
      }
      sv();
      try{ if(typeof autoStartTodayItems==='function') autoStartTodayItems(); }catch(e){}
      renderDash();renderTripList();renderTasks();renderCalendar();
      showGSResult('✅ Data loaded from Google Sheets successfully!','ok');
      showToast('Loaded from Google Sheets ✓');
    } else {
      showGSResult('⚠ No data found or load error: '+(data&&data.error||'Unknown'),'warn');
    }
  }catch(e){
    showGSResult('❌ Could not load data. Check your URL and internet connection.','error');
    showToast('Load failed — check URL');
  }
}

// Auto-sync debounced — triggers 3s after last save action
let syncTimer=null;
function svAndSync(source){
  sv();
  if(!S.gsUrl)return;
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>{
    // Show subtle indicator
    const el=document.getElementById('gsheet-status');
    if(el)el.textContent='Syncing…';
    syncToSheets().then(()=>{}).catch(()=>{});
  },3000);
}
