'use strict';
// =====================================================
// PlantLog — sync.js
// Google Sheets sync, loadFromSheets, svAndSync
// =====================================================

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
      partsJson:     tk.parts&&tk.parts.length?JSON.stringify(tk.parts):'',
      flightJson:    tk.flight?JSON.stringify(tk.flight):'',
      filesJson:     tk.files&&tk.files.length?JSON.stringify(tk.files):'',
      createdAt:     s(tk.createdAt),
      updatedAt:     s(tk.updatedAt)||new Date().toISOString()
    };
  });

  const enrichedTrips=(S.trips||[]).map(tr=>({
    id:         s(tr.id),
    plant:      s(tr.plant),
    location:   s(tr.location),
    date:       s(tr.date),
    dateEnd:    s(tr.dateEnd),
    purpose:    s(tr.purpose),
    contact:    s(tr.contact),
    transport:  s(tr.transport),
    status:     s(tr.status)||'planned',
    notes:         s(tr.notes),
    flight:        tr.flight?JSON.stringify(tr.flight):'',
    savedReports:  tr.savedReports&&tr.savedReports.length?JSON.stringify(tr.savedReports):'',
    createdAt:     s(tr.createdAt)
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
        vndAmount:  parseFloat(s(b.vndAmount))||0,
        category:   s(b.category)||'other',
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

async function loadFromSheets(silent){
  const url=getGSUrl();
  if(!url){if(!silent){showToast('Set your Google Sheet URL first');openModal('modal-gsheet');}return;}
  if(!silent)showToast('Loading from Google Sheets…');
  try{
    const data=await gsGet(url,{action:'getAll'});
    if(data.ok&&data.data){
      const d=data.data;

      // ── Universal safe converters ─────────────────────────
      // Converts any value to a clean YYYY-MM-DD string or ''
      const safeDate=v=>{
        if(v===null||v===undefined||v==='')return'';
        if(v instanceof Date){
          if(isNaN(v.getTime()))return'';
          return v.toISOString().slice(0,10);
        }
        const s=String(v).trim();
        // Already YYYY-MM-DD
        if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
        // ISO with time: 2026-05-11T00:00:00.000Z
        if(/^\d{4}-\d{2}-\d{2}T/.test(s))return s.slice(0,10);
        // Slash format: 2026/05/11
        if(/^\d{4}\/\d{2}\/\d{2}$/.test(s))return s.replace(/\//g,'-');
        // Excel serial number
        if(/^\d{5}$/.test(s)){
          const d=new Date(Math.round((parseFloat(s)-25569)*86400*1000));
          if(!isNaN(d.getTime()))return d.toISOString().slice(0,10);
        }
        // Try parsing as date string, but only accept YYYY-MM-DD result
        try{
          const d=new Date(s);
          if(!isNaN(d.getTime())&&s.length>=8){
            const iso=d.toISOString().slice(0,10);
            if(iso>'1900-01-01')return iso;
          }
        }catch(e){}
        return'';
      };
      // Safe time: returns HH:MM or ''
      const safeTime=v=>{
        if(!v&&v!==0)return'';
        const s=String(v).trim();
        if(/^\d{2}:\d{2}/.test(s))return s.slice(0,5);
        return'';
      };
      // Safe string
      const ss=v=>v===null||v===undefined?'':String(v).trim();

      if(d.trips&&d.trips.length){
        const strV=v=>safeDate(v)||ss(v);
        S.trips=d.trips.map(tr=>({
          id:        ss(tr.ID),
          plant:     ss(tr.Plant),
          location:  ss(tr.Location),
          date:      safeDate(tr.Date),
          dateEnd:   safeDate(tr.DateEnd),
          purpose:   ss(tr.Purpose),
          contact:   ss(tr.Contact),
          transport: ss(tr.Transport),
          status:    ss(tr.Status)||'planned',
          notes:     ss(tr.Notes),
          flight:       tr.Flight?(()=>{try{return JSON.parse(ss(tr.Flight));}catch(e){return null;}})():null,
          savedReports: (()=>{
            const raw = ss(tr.SavedReports||tr.savedReports||'');
            if(!raw) return [];
            try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[]; }
            catch(e){ return []; }
          })(),
          createdAt: ss(tr.CreatedAt)
        }));
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
          const ds=safeDate(tk.DateStart||tk.Date);
          const de=safeDate(tk.DateEnd)||ds;
          const ts=safeTime(tk.TimeStart||tk.Time);
          const te=safeTime(tk.TimeEnd);
          return {
            id:           ss(tk.ID),
            title:        ss(tk.Title),
            desc:         ss(tk.Description),
            category:     ss(tk.Category)||'work',
            dateStart:    ds,
            timeStart:    ts,
            dateEnd:      de,
            timeEnd:      te,
            hours:        ss(tk.Hours),
            minutes:      ss(tk.Minutes),
            priority:     ss(tk.Priority)||'medium',
            period:       ss(tk.Period),
            machine:      ss(tk.Machine),
            plan:         ss(tk.Plan),
            tripId:       ss(tk.TripID),
            status:       ss(tk.Status)||'pending',
            checklist:    cl,
            flight:       tk.FlightJson?(()=>{try{return JSON.parse(ss(tk.FlightJson));}catch(e){return null;}})():null,
            files:        tk.FilesJson?(()=>{try{return JSON.parse(ss(tk.FilesJson));}catch(e){return [];}})():[],
            date:         ds,
            time:         ts,
            createdAt:    ss(tk.CreatedAt),
            updatedAt:    ss(tk.UpdatedAt)
          };
        });
      }
      if(d.leave&&d.leave.length){
        S.leaveData={};
        d.leave.forEach(l=>{
          const lDate=safeDate(l.Date)||ss(l.Date);
          if(lDate&&l.Type)S.leaveData[lDate]=ss(l.Type);
        });
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
            id:         ss(b.ID),
            tripId:     ss(b.TripID),
            date:       safeDate(b.Date)||ss(b.Date),
            billNumber: strB(b.BillNumber),
            detail:     strB(b.Detail),
            amount:     parseFloat(strB(b.Amount))||0,
            currency:   strB(b.Currency)||'VND',
            vndAmount:  parseFloat(strB(b.VndAmount||b.vndAmount))||0,
            category:   strB(b.Category)||'other',
            notes:      strB(b.Notes),
            photos:     photos,
            createdAt:  strB(b.CreatedAt)
          };
        });
      }
      sv();renderDash();renderTripList();renderTasks();renderCalendar();
      if(typeof renderTripSavedReports==='function') renderTripSavedReports();
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

// ═══════ BILLS ═══════
let editingBillId=null;
let tmpBillPhotos=[];
const BILL_CAT_LABELS={accommodation:'🏨 Accommodation',travel:'✈️ Travel',meals:'🍽 Meals',parts:'🔩 Parts/Materials',tools:'🔧 Tools',other:'📋 Other'};

function renderTripBills(tripId){
  const el=document.getElementById('trip-bills-section');
  if(!el)return;
  const bills=(S.bills||[]).filter(b=>b.tripId===tripId).sort((a,b)=>b.date.localeCompare(a.date));
  // Compute totals — VND grand total + per-currency breakdown
  const totalVND=bills.reduce((s,b)=>{
    if(b.currency==='VND')return s+(parseFloat(b.amount)||0);
    return s+(parseFloat(b.vndAmount)||0);
  },0);
  const byCur={};
  bills.forEach(b=>{const c=b.currency||'VND';byCur[c]=(byCur[c]||0)+(parseFloat(b.amount)||0);});

  let html=`<div style="font-size:11px;font-weight:700;color:#00843D;letter-spacing:0.07em;text-transform:uppercase;margin:12px 0 8px;">Expense Bills</div>`;

  if(bills.length){
    // Show: each currency on left, grand VND total on right
    const curLines=Object.entries(byCur).map(([c,t])=>
      `<div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.9);margin-top:2px;">${fmtAmt(t, c)} <span style="font-size:10px;opacity:0.8;">${c}</span></div>`
    ).join('');
    html+=`<div class="bill-total-bar">
      <div>
        <div class="bill-total-label">Expenses (${bills.length} bills)</div>
        ${curLines}
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:rgba(255,255,255,0.7);margin-bottom:2px;">Grand Total</div>
        <div class="bill-total-amount">${fmtAmt(totalVND, "VND")} <span style="font-size:12px;">VND</span></div>
      </div>
    </div>`;

    // Group by date
    const byDate={};
    bills.forEach(b=>{
      const d=b.date||'';
      if(!byDate[d])byDate[d]=[];
      byDate[d].push(b);
    });

    Object.entries(byDate).forEach(([dateKey,dayBills])=>{
      const dayTotal=dayBills.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
      const dc=dayBills[0].currency||'VND';
      html+=`<div class="bill-day-header">
        <div class="bill-day-label">📅 ${fmtDate(dateKey)}</div>
        <div class="bill-day-total">${fmtAmt(dayTotal, "VND")} ${dc}</div>
      </div>`;

      dayBills.forEach(b=>{
        const amt=fmtAmt(b.amount, b.currency);
        html+=`<div class="bill-card">
          <div class="bill-head">
            <div style="flex:1;min-width:0;">
              ${b.billNumber?`<div class="bill-num">Receipt #${b.billNumber}</div>`:''}
              <div class="bill-detail-text">${b.detail}</div>
              <div class="bill-meta">
                <span style="background:var(--al);color:#92400E;padding:1px 7px;border-radius:10px;font-size:10px;">${BILL_CAT_LABELS[b.category]||b.category||'Other'}</span>
                ${b.notes?`<span style="color:var(--g500);">${b.notes}</span>`:''}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;margin-left:10px;">
              <div class="bill-amount">${amt} ${b.currency||''}</div>
              <div style="display:flex;gap:4px;">
                <button onclick="openEditBill('${b.id}')" style="width:26px;height:26px;border-radius:6px;border:1px solid var(--g200);background:#fff;cursor:pointer;font-size:13px;" title="Edit">✏️</button>
                <button onclick="deleteBill('${b.id}')" class="db" title="Delete">×</button>
              </div>
            </div>
          </div>
          ${b.photos&&b.photos.length?`
          <div class="bill-photo-strip">
            ${b.photos.map((p,pi)=>`<img class="bill-photo-thumb" src="${p}" onclick="viewBillPhoto('${b.id}',${pi})" title="Tap to view">`).join('')}
          </div>`:''}
        </div>`;
      });
    });
  } else {
    html+=`<div style="text-align:center;padding:16px;font-size:13px;color:var(--g400);">No bills recorded yet.<br>Tap below to add your first expense.</div>`;
  }
  html+=`<button class="btn btn-o btn-full" style="margin-top:8px;" onclick="openAddBill('${tripId}')">＋ Add expense bill</button>`;
  el.innerHTML=html;
}

function viewBillPhoto(billId, photoIdx){
  const b=S.bills.find(x=>x.id===billId);
  if(!b||!b.photos||!b.photos[photoIdx]) return;
  const src = b.photos[photoIdx];
  // If it's a Drive URL → open directly in browser
  if(src.startsWith('https://')){
    window.open(src,'_blank');
    return;
  }
  // Otherwise show inline overlay for base64 images
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;';
  overlay.onclick=()=>overlay.remove();
  const img=document.createElement('img');
  img.src=src;
  img.style.cssText='max-width:95vw;max-height:80vh;border-radius:8px;object-fit:contain;';
  const close=document.createElement('div');
  close.textContent='✕ Tap anywhere to close';
  close.style.cssText='color:rgba(255,255,255,0.6);font-size:13px;';
  overlay.appendChild(img);overlay.appendChild(close);
  document.body.appendChild(overlay);
}

function openAddBill(tripId){
  editingBillId=null;
  tmpBillPhotos=[];
  _savingBill=false;  // reset guard when opening modal
  document.getElementById('bill-modal-title').textContent='Add Bill';
  document.getElementById('bill-edit-id').textContent='';
  document.getElementById('bill-save-btn').textContent='💾 Save Bill';
  ['bill-detail','bill-number','bill-amount','bill-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('bill-date').value=new Date().toISOString().slice(0,10);
  document.getElementById('bill-currency').value='VND';
  document.getElementById('bill-category').value='other';
  const vndElR=document.getElementById('bill-vnd');if(vndElR)vndElR.value='';
  toggleVNDRow();
  renderBillPhotoGrid();
  // Populate trip selector
  const ts=document.getElementById('bill-trip-select');
  if(ts){
    ts.innerHTML='<option value="">No trip link</option>'+S.trips.map(t=>`<option value="${t.id}"${t.id===tripId?' selected':''}>${t.plant} (${fmtDate(t.date)})</option>`).join('');
  }
  document.getElementById('bill-save-btn').dataset.tripid=tripId||'';
  openModal('modal-add-bill');
}

function openEditBill(id){
  const b=S.bills.find(x=>x.id===id);if(!b)return;
  editingBillId=id;
  _savingBill=false;  // reset guard when opening modal
  // Load photos: use photoMeta (with Drive URLs) if available, else fall back to photos array
  if(b.photoMeta && b.photoMeta.length){
    tmpBillPhotos = b.photoMeta.map(m=>({src:m.src||m.driveUrl, driveUrl:m.driveUrl||'', fileId:m.fileId||''}));
  } else {
    tmpBillPhotos = (b.photos||[]).map(p=>({src:p, driveUrl:p.startsWith('https://')?p:'', fileId:''}));
  }
  document.getElementById('bill-modal-title').textContent='Edit Bill';
  document.getElementById('bill-edit-id').textContent='#'+id.slice(-6);
  document.getElementById('bill-save-btn').textContent='💾 Update Bill';
  document.getElementById('bill-date').value=b.date||'';
  document.getElementById('bill-number').value=b.billNumber||'';
  document.getElementById('bill-detail').value=b.detail||'';
  document.getElementById('bill-amount').value=b.amount||'';
  document.getElementById('bill-currency').value=b.currency||'VND';
  const vndEl2=document.getElementById('bill-vnd');
  if(vndEl2)vndEl2.value=(b.currency!=='VND'&&b.vndAmount)?b.vndAmount:'';
  toggleVNDRow();
  document.getElementById('bill-category').value=b.category||'other';
  document.getElementById('bill-notes').value=b.notes||'';
  document.getElementById('bill-save-btn').dataset.tripid=b.tripId||'';
  const ts2=document.getElementById('bill-trip-select');
  if(ts2){
    ts2.innerHTML='<option value="">No trip link</option>'+S.trips.map(t=>`<option value="${t.id}"${t.id===b.tripId?' selected':''}>${t.plant} (${fmtDate(t.date)})</option>`).join('');
  }
  renderBillPhotoGrid();
  openModal('modal-add-bill');
}

let _savingBill = false;  // guard against double-submit

async function saveBill(){
  // ── Prevent double-submit (async function runs over multiple seconds) ──
  if(_savingBill) return;
  _savingBill = true;

  const saveBtn = document.getElementById('bill-save-btn');
  // origText captured below after origBtnText
  const origBtnText = saveBtn ? saveBtn.textContent : '💾 Save Bill';
  if(saveBtn){ saveBtn.disabled = true; saveBtn.textContent = '⟳ Saving…'; }

  try{
    const detail=document.getElementById('bill-detail').value.trim();
    const amount=document.getElementById('bill-amount').value;
    if(!detail||!amount){
      showToast('Detail and amount are required');
      _savingBill=false;
      if(saveBtn){ saveBtn.disabled=false; saveBtn.textContent='💾 '+( editingBillId?'Update':'Save')+' Bill'; }
      return;
    }
    const ts=document.getElementById('bill-trip-select');
    const tripId=(ts&&ts.value)||document.getElementById('bill-save-btn').dataset.tripid||'';
    const cur=document.getElementById('bill-currency').value;
    const vndEl=document.getElementById('bill-vnd');
    const vndAmt=cur==='VND'?parseFloat(amount)||0:(vndEl&&vndEl.value?parseFloat(vndEl.value)||0:0);

    // Lock billId at start — never changes even during async uploads
    const billId = editingBillId || ('bill_'+Date.now());

    // Upload any remaining local base64 photos before saving
    const gsUrl = getGSUrl ? getGSUrl() : (S&&S.gsUrl||'');
    if(gsUrl && gsUrl.includes('/exec')){
      const hasLocal = tmpBillPhotos.some(p => (p.src||p||'').toString().startsWith('data:'));
      if(hasLocal){
        showToast('Uploading photos…');
        if(saveBtn) saveBtn.textContent = '⟳ Uploading photos…';
        for(let i=0;i<tmpBillPhotos.length;i++){
          const p=tmpBillPhotos[i];
          const src=p.src||(typeof p==='string'?p:'');
          if(!src.startsWith('data:')) continue;
          const result = await uploadBillPhotoToDrive(p, billId, tripId);
          if(result) tmpBillPhotos[i]=result;
        }
      }
    }

    // Build photos array: Drive URL where available, else base64
    const savedPhotos = tmpBillPhotos.map(p=>{
      if(typeof p==='string') return p;
      return p.driveUrl || p.src || '';
    }).filter(Boolean);

    const bill={
      id: billId,
      tripId,
      date:       document.getElementById('bill-date').value,
      billNumber: document.getElementById('bill-number').value,
      detail,
      amount:     parseFloat(amount)||0,
      currency:   cur,
      vndAmount:  vndAmt,
      category:   document.getElementById('bill-category').value,
      notes:      document.getElementById('bill-notes').value,
      photos:     savedPhotos,
      photoMeta:  tmpBillPhotos.filter(p=>p&&p.fileId).map(p=>({
        src:      p.driveUrl||p.src,
        driveUrl: p.driveUrl,
        fileId:   p.fileId
      })),
      createdAt: editingBillId
        ? (S.bills.find(b=>b.id===editingBillId)||{}).createdAt || new Date().toISOString()
        : new Date().toISOString()
    };

    if(editingBillId){
      const idx=S.bills.findIndex(b=>b.id===editingBillId);
      if(idx>=0) S.bills[idx]=bill; else S.bills.push(bill);
    } else {
      if(!S.bills) S.bills=[];
      S.bills.push(bill);
    }

    editingBillId=null;
    tmpBillPhotos=[];
    Store.commit('bill:save');
    closeModal('modal-add-bill');
    showToast('Bill saved ✓');
    if(tripId) renderTripBills(tripId);

  } catch(e) {
    console.error('[saveBill]', e);
    showToast('Error saving bill: '+e.message);
    if(saveBtn){ saveBtn.disabled=false; saveBtn.textContent='💾 '+( editingBillId?'Update':'Save')+' Bill'; }
  } finally {
    _savingBill = false;
  }
}

function deleteBill(id){
  if(!confirm('Delete this bill?'))return;
  S.bills=S.bills.filter(b=>b.id!==id);
  sv();
  if(curTrip)renderTripBills(curTrip);
  svAndSync('bill_delete');
}

function triggerBillPhoto(){
  _photoCtxPending='bill';
  openPhotoSheet('bill');
}

// ── tmpBillPhotos format:
// {src: 'data:...' or 'https://drive...', driveUrl:'', fileId:'', uploading:false}
// Items with driveUrl are already on Drive; others are local base64

function renderBillPhotoGrid(){
  const g=document.getElementById('bill-photo-grid');
  if(!g) return;
  g.innerHTML = tmpBillPhotos.map((p,i)=>{
    const src = p.driveUrl || p.src || (typeof p==='string'?p:'');
    const isDrive = !!(p.driveUrl || p.fileId);
    const isUploading = p.uploading;
    return `<div class="pthumb" style="position:relative;">
      <img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block;" onclick="viewBillPhotoTemp(${i})">
      ${isUploading
        ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;border-radius:var(--rs);">
             <span style="font-size:10px;color:#fff;font-weight:700;">⟳</span>
           </div>`
        : `<button class="pdel" onclick="removeBillPhoto(${i})" style="position:absolute;top:3px;right:3px;">×</button>
           ${isDrive ? '<span style="position:absolute;bottom:3px;left:3px;background:rgba(15,123,62,0.85);border-radius:3px;padding:1px 4px;font-size:9px;color:#fff;font-weight:700;">✓Drive</span>' : ''}`
      }
    </div>`;
  }).join('')
  + `<div class="padd" onclick="triggerBillPhoto()">
       <span style="font-size:20px;">📷</span>
       <span style="font-size:10px;">Add photo</span>
     </div>`;
}

function viewBillPhotoTemp(i){
  const p = tmpBillPhotos[i];
  if(!p) return;
  const src = p.driveUrl || p.src || (typeof p==='string'?p:'');
  if(p.driveUrl){
    window.open(p.driveUrl, '_blank');
    return;
  }
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;';
  overlay.onclick=()=>overlay.remove();
  const img=document.createElement('img');
  img.src=src;
  img.style.cssText='max-width:95vw;max-height:80vh;border-radius:8px;object-fit:contain;';
  overlay.appendChild(img);
  document.body.appendChild(overlay);
}

function removeBillPhoto(i){
  tmpBillPhotos.splice(i,1);
  renderBillPhotoGrid();
}

// ── Upload a single photo to Drive ──────────────────────
async function uploadBillPhotoToDrive(photoObj, billId, tripId){
  const gsUrl = getGSUrl ? getGSUrl() : (S&&S.gsUrl||'');
  if(!gsUrl || !gsUrl.includes('/exec')) return null;

  // Build folder path: Bills Images/TripName_Date
  let folderName = 'No Trip';
  if(tripId){
    const trip = (S.trips||[]).find(t=>t.id===tripId);
    if(trip){
      const safe = (trip.plant||'Trip').replace(/[^a-zA-Z0-9\s]/g,'').replace(/\s+/g,'_').slice(0,30);
      const d = (trip.date||'').replace(/-/g,'');
      folderName = safe + (d?'_'+d:'');
    }
  }

  const src = photoObj.src || (typeof photoObj==='string' ? photoObj : '');
  if(!src) return null;

  // Extract base64 from data URI
  const base64 = src.includes(',') ? src.split(',')[1] : src;
  const mimeType = src.startsWith('data:') ? src.split(';')[0].replace('data:','') : 'image/jpeg';
  const ext = mimeType.includes('png')?'png':'jpg';
  const fileName = `bill_${billId||'x'}_${Date.now()}.${ext}`;

  try{
    const resp = await fetch(gsUrl, {
      method:'POST',
      headers:{'Content-Type':'text/plain'},
      body: JSON.stringify({
        action:    'uploadFile',
        taskId:    'bill_'+billId,
        fileName:  fileName,
        mimeType:  mimeType,
        dataBase64: base64,
        folder:    'Bills Images/' + folderName
      })
    });
    const data = await resp.json();
    if(data && data.ok){
      return {src:data.fileUrl, driveUrl:data.fileUrl, fileId:data.fileId};
    }
  }catch(e){
    console.warn('[Bills] Photo upload error:', e.message);
  }
  return null;
}

// ── Handle photo selection: upload immediately if GS URL set ──
async function handleBillPhotos(newPhotos, billId, tripId){
  const gsUrl = getGSUrl ? getGSUrl() : (S&&S.gsUrl||'');
  const canUpload = gsUrl && gsUrl.includes('/exec');

  for(const src of newPhotos){
    const photoObj = {src, driveUrl:'', fileId:'', uploading:canUpload};
    tmpBillPhotos.push(photoObj);
  }
  renderBillPhotoGrid();

  if(!canUpload) return; // Save as local base64 only

  // Upload each new local photo
  for(let i=0; i<tmpBillPhotos.length; i++){
    const p = tmpBillPhotos[i];
    if(p.driveUrl || !p.src || !p.src.startsWith('data:')) continue; // already on Drive or not a data URI
    p.uploading = true;
    renderBillPhotoGrid();

    const result = await uploadBillPhotoToDrive(p, billId||('bill_'+Date.now()), tripId);
    if(result){
      tmpBillPhotos[i] = {...result, uploading:false};
    } else {
      tmpBillPhotos[i].uploading = false;
    }
    renderBillPhotoGrid();
  }
}


