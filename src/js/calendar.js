/**
 * PlantLog v4 — CALENDAR MODULE
 * Calendar, leave, day detail
 * Lines 1593–1700 of original monolithic file
 */

// ═══════ CALENDAR ═══════
function renderCalendar(){
  const now=new Date();
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
