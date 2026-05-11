/**
 * PlantLog v4 — DASHBOARD MODULE
 * Dashboard render, home screen
 * Lines 1701–1813 of original monolithic file
 */

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

// ═══════ INDUSTRY TEMPLATES (FIXED) ═══════
function loadIndustryTemplate(ind){
  const items=IND[ind];if(!items||!items.length)return;
  S.templates=[...items];sv();
  closeModal('modal-industry');
  showToast('Loaded '+items.length+' items ✓');
  // Immediately show in template editor
  openModal('modal-check-templates');
}

// ═══════ CHECKLIST TEMPLATES ═══════
function renderTemplates(){
  const el=document.getElementById('template-list');if(!el)return;
  el.innerHTML=S.templates.length
    ?S.templates.map((tmpl,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--g100);"><div style="flex:1;font-size:13px;">${tmpl}</div><button class="db" onclick="rmTemplate(${i})">×</button></div>`).join('')
    :`<div style="font-size:12px;color:var(--g500);padding:8px 0;">No templates. Add below or use Industry Templates.</div>`;
}
function addTemplate(){const v=document.getElementById('tmpl-new').value.trim();if(!v)return;S.templates.push(v);sv();document.getElementById('tmpl-new').value='';renderTemplates();}
function rmTemplate(i){S.templates.splice(i,1);sv();renderTemplates();}
