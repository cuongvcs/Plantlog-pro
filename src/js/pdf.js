/**
 * PlantLog v4 — PDF MODULE
 * PDF report + bills export
 * Lines 1814–1972 of original monolithic file
 */

// ═══════ PDF ═══════
function populateReportName(){
  const trip=S.trips.find(tr=>tr.id===curTrip);
  if(!trip)return;
  const input=document.getElementById('report-name-input');
  if(!input)return;
  // Set default name if empty
  if(!input.value.trim()){
    input.value=`Plant Visit Report — ${trip.plant}${trip.date?' — '+fmtDate(trip.date):''}`;
  }
  updateReportNamePreview();
}
function updateReportNamePreview(){
  const input=document.getElementById('report-name-input');
  const trip=S.trips.find(tr=>tr.id===curTrip);
  const name=(input&&input.value.trim())||(trip?`Plant Visit Report — ${trip.plant}`:'Report');
  const titleEl=document.getElementById('preview-report-title');
  const subEl=document.getElementById('preview-report-sub');
  if(titleEl)titleEl.textContent=name;
  if(subEl&&trip)subEl.textContent=`${trip.plant}  ·  ${fmtDate(trip.date)}`;
}
function buildPDFPreview(){
  if(!curTrip||!curReport)return;
  const trip=S.trips.find(tr=>tr.id===curTrip);if(!trip)return;
  const r=curReport;const p=S.profile;
  const pc=r.checklist.filter(c=>c.result==='pass').length;
  const fc=r.checklist.filter(c=>c.result==='fail').length;
  document.getElementById('pdf-preview-content').innerHTML=`
    <div class="ps" style="border-bottom:2px solid var(--g200);margin-bottom:14px;">
      <div style="background:#00843D;border-radius:var(--rs);padding:12px 14px;margin-bottom:10px;color:#fff;">
        <div style="font-size:14px;font-weight:700;" id="preview-report-title">Plant Visit Report</div>
        <div style="font-size:12px;opacity:0.85;margin-top:3px;" id="preview-report-sub"></div>
      </div>
      ${pr('Plant',trip.plant)}${pr('Location',trip.location||'—')}${pr('Date',fmtDate(trip.date))}
      ${pr('Engineer',p.name||'—')}${pr('Title',p.title||'—')}${pr('Company',p.company||'—')}
    </div>
    <div class="ps"><div class="pst">Checklist (${r.checklist.length})</div>
      ${pr('Passed',pc+' items')}${pr('Failed',fc+' items')}
      ${fc>0?`<div style="font-size:11px;color:var(--red);margin-top:4px;">Failed: ${r.checklist.filter(c=>c.result==='fail').map(c=>c.name).join(', ')}</div>`:''}
    </div>
    <div class="ps"><div class="pst">Readings (${r.readings.length})</div>
      ${r.readings.length?r.readings.map(rd=>pr(rd.name+(rd.tag?' ['+rd.tag+']':''),rd.value+' '+rd.unit+(rd.status==='bad'?' ⚠':''))).join(''):'<div style="font-size:12px;color:var(--g500);">None</div>'}
    </div>
    <div class="ps"><div class="pst">Issues (${r.issues.length})</div>
      ${r.issues.length?r.issues.map(is=>`<div style="margin-bottom:6px;"><span class="badge ${is.severity==='low'?'bb':is.severity==='medium'?'ba':'br'}" style="font-size:10px;">${is.severity.toUpperCase()}</span> <span style="font-size:13px;font-weight:500;">${is.title}</span>${is.photos&&is.photos.length?` <span style="font-size:11px;color:var(--g500);">(${is.photos.length} photo${is.photos.length>1?'s':''})</span>`:''}</div>`).join(''):'<div style="font-size:12px;color:var(--g500);">None</div>'}
    </div>
    <div class="ps"><div class="pst">Team (${(r.team||[]).length})</div>
      ${r.team&&r.team.length?r.team.map(m=>pr(m.name,m.role||'—')).join(''):'<div style="font-size:12px;color:var(--g500);">None</div>'}
    </div>
    <div class="ps">${(()=>{
      const sel=(r.reportTasks||[]);
      if(!sel.length)return'<div class="pst" style="color:var(--g400);">Tasks (none selected)</div>';
      const tasks=sel.map(id=>S.tasks.find(t=>t.id===id)).filter(Boolean).sort((a,b)=>(b.dateStart||b.date||'').localeCompare(a.dateStart||a.date||'')||a.title.localeCompare(b.title));
      const catIcon=c=>({work:'🔧',leave:'🌴',travel:'✈️'}[c]||'📋');
      const statusIcon=s=>s==='done'?'✅':s==='in_progress'?'🔄':'⏳';
      // Group by date
      const byDate={};
      tasks.forEach(tk=>{const d=tk.dateStart||tk.date||'';if(!byDate[d])byDate[d]=[];byDate[d].push(tk);});
      let out=`<div class="pst">Tasks in Report (${tasks.length})</div>`;
      Object.entries(byDate).forEach(([dateKey,dayTasks])=>{
        if(dateKey)out+=`<div style="font-size:11px;font-weight:700;color:#00843D;padding:4px 0;border-bottom:1px solid #e8f5ee;margin-bottom:4px;">${fmtDate(dateKey)}</div>`;
        dayTasks.forEach(tk=>{
          const note=(r.reportTaskNotes||{})[tk.id]||'';
          const dur=calcDuration(tk);
          const timeStr=tk.timeStart?(tk.timeEnd?`${tk.timeStart}–${tk.timeEnd}`:tk.timeStart):'';
          out+=`<div style="margin-bottom:8px;padding:6px 8px;background:var(--g50);border-radius:6px;border-left:3px solid ${tk.category==='leave'?'var(--amber)':tk.category==='travel'?'var(--blue)':'var(--green)'};">
            <div style="font-size:12px;font-weight:500;">${statusIcon(tk.status)} ${tk.title}</div>
            <div style="font-size:11px;color:var(--g500);margin-top:2px;display:flex;flex-wrap:wrap;gap:6px;">
              ${timeStr?`<span>⏰ ${timeStr}</span>`:''}
              ${dur?`<span>⏱ ${dur}</span>`:''}
              <span>${catIcon(tk.category||'work')} ${tk.category||'work'}</span>
              ${tk.machine?`<span>🔩 ${tk.machine}</span>`:''}
              ${tk.plan?`<span>📁 ${tk.plan}</span>`:''}
              ${tk.checklist&&tk.checklist.length?`<span>${tk.checklist.filter(c=>c.done).length}/${tk.checklist.length} items</span>`:''}
            </div>
            ${note?`<div style="font-size:11px;color:var(--g600);margin-top:4px;font-style:italic;">${note}</div>`:''}
          </div>`;
        });
      });
      return out;
    })()}</div>

    <div class="ps" style="border:none;"><div class="pst">Sign-off</div>
      ${pr('Result',r.signoff.result||'—')}
      ${r.signoff.summary?`<div style="font-size:12px;color:var(--g700);margin-top:6px;">${r.signoff.summary}</div>`:''}
      ${r.signature?`<div style="margin-top:8px;"><img src="${r.signature}" style="max-width:180px;border:1px solid var(--g200);border-radius:6px;padding:3px;"></div>`:'<div style="font-size:12px;color:var(--red);">⚠ No signature</div>'}
    </div>`;
}
function pr(l,v){return `<div class="pr"><span>${l}</span><span>${v}</span></div>`;}
function exportPDF(){
  if(typeof window.jspdf==='undefined'){showToast('PDF loading...');setTimeout(exportPDF,1500);return;}
  const{jsPDF}=window.jspdf;
  const trip=S.trips.find(tr=>tr.id===curTrip);const r=curReport;const p=S.profile;
  if(!trip||!r)return;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=210,mg=16;let y=20,pageNum=1;
  const R=W-mg;
  const reportTitle=(document.getElementById('report-name-input')&&document.getElementById('report-name-input').value.trim())||`Plant Visit Report — ${trip.plant}`;
  doc.setFillColor(0,132,61);doc.rect(0,0,W,36,'F');
  doc.setTextColor(255,255,255);
  const titleLines=doc.splitTextToSize(reportTitle,W-mg*2);
  doc.setFontSize(titleLines.length>1?10:13);doc.setFont('helvetica','bold');
  doc.text(titleLines,mg,titleLines.length>1?9:12);
  const afterTitle=titleLines.length>1?9+titleLines.length*4.5:18;
  doc.setFontSize(8.5);doc.setFont('helvetica','normal');
  doc.text(`${trip.plant}  ·  ${fmtDate(trip.date)}`,mg,afterTitle+1);
  doc.text(`${p.name||'Engineer'}${p.title?' · '+p.title:''}${p.company?' · '+p.company:''}`,mg,afterTitle+6);
  y=42;
  const rtxt=(str,yy,col)=>{if(col)doc.setTextColor(...col);const tw=doc.getTextWidth(String(str));doc.text(String(str),R-tw,yy);if(col)doc.setTextColor(33,37,41);};
  const addPN=()=>{doc.setFontSize(7);doc.setTextColor(150,150,150);doc.setFont('helvetica','normal');rtxt(`Page ${pageNum}`,289);doc.text('PlantLog  ·  '+new Date().toLocaleDateString('en-GB'),mg,289);};
  const sec=title=>{if(y>265){doc.addPage();y=20;pageNum++;addPN();}doc.setFillColor(241,243,245);doc.rect(mg,y-4,W-mg*2,8,'F');doc.setTextColor(0,132,61);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text(title,mg+2,y+1);doc.setTextColor(33,37,41);y+=8;};
  const kv2=(l,v)=>{doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(100,100,100);doc.text(l,mg,y);doc.setTextColor(33,37,41);doc.setFont('helvetica','bold');const lines=doc.splitTextToSize(String(v),W-mg*2-30);lines.forEach((ln,li)=>{const tw=doc.getTextWidth(ln);doc.text(ln,R-tw,y+li*5);});doc.setFont('helvetica','normal');y+=lines.length*5+1;if(y>270){doc.addPage();y=20;pageNum++;addPN();}};
  const ln=()=>{doc.setDrawColor(220,220,220);doc.line(mg,y,W-mg,y);y+=4;};
  const chk=()=>{if(y>265){doc.addPage();y=20;pageNum++;addPN();}};
  sec('TRIP INFO');
  kv2('Plant',trip.plant);kv2('Location',trip.location||'—');kv2('Date',fmtDate(trip.date));
  if(trip.dateEnd&&trip.dateEnd!==trip.date)kv2('End Date',fmtDate(trip.dateEnd));
  kv2('Purpose',trip.purpose||'—');
  if(trip.contact)kv2('Contact',trip.contact);
  if(trip.transport)kv2('Transport',trip.transport);
  if(trip.notes){doc.setFontSize(8);doc.setTextColor(100,100,100);const nl=doc.splitTextToSize(trip.notes,W-mg*2-4);doc.text(nl,mg+2,y);y+=nl.length*4+2;}
  ln();
  sec(`CHECKLIST (${r.checklist.length})`);
  r.checklist.forEach(c=>{const sym=c.result==='pass'?'PASS':c.result==='fail'?'FAIL':c.result==='na'?'N/A':'—';const col=c.result==='pass'?[15,110,86]:c.result==='fail'?[226,75,74]:[100,100,100];doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);const nl=doc.splitTextToSize('• '+c.name,W-mg*2-22);doc.text(nl,mg+2,y);doc.setFont('helvetica','bold');rtxt(sym,y,col);doc.setTextColor(33,37,41);doc.setFont('helvetica','normal');y+=nl.length*5;chk();});ln();
  sec(`READINGS (${r.readings.length})`);
  r.readings.forEach(rd=>{const isCond=rd.type==='condition'||(!rd.value&&rd.condition);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);const nl=doc.splitTextToSize('• '+rd.name+(rd.tag?' ['+rd.tag+']':''),W-mg*2-40);doc.text(nl,mg+2,y);doc.setFont('helvetica','bold');if(isCond){const cond=rd.condition||'ok';rtxt(cond==='ok'?'OK':cond==='notok'?'NOT OK':'OTHER',y,cond==='ok'?[15,110,86]:cond==='notok'?[226,75,74]:[245,158,11]);}else{rtxt((rd.value||'')+(rd.unit?' '+rd.unit:''),y,rd.status==='bad'?[226,75,74]:rd.status==='na'?[100,100,100]:[15,110,86]);}doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);if(rd.notes){doc.setFontSize(8);doc.setTextColor(120,120,120);doc.text(rd.notes,mg+6,y+5);y+=5;}y+=nl.length*5;chk();});
  if(!r.readings.length){doc.setFontSize(9);doc.text('None.',mg+2,y);y+=5;}ln();
  sec(`ISSUES (${r.issues.length})`);
  r.issues.forEach(is=>{const sc=is.severity==='critical'?[91,33,182]:is.severity==='high'?[226,75,74]:is.severity==='medium'?[245,158,11]:[55,138,221];const istLabel={'pending':'Pending','waiting_part':'Waiting part','processing':'Processing','done':'Done'}[is.istatus||'pending']||'Pending';const istCol={pending:[100,100,100],waiting_part:[55,138,221],processing:[245,158,11],done:[15,110,86]}[is.istatus||'pending'];doc.setFontSize(9);doc.setFont('helvetica','bold');doc.setTextColor(...sc);doc.text(`[${is.severity.toUpperCase()}]`,mg+2,y);doc.setTextColor(33,37,41);const tl=doc.splitTextToSize(is.title,W-mg*2-50);doc.text(tl,mg+22,y);doc.setFontSize(8);doc.setFont('helvetica','normal');rtxt(istLabel,y,istCol);y+=tl.length*5;if(is.description){doc.setFontSize(8);doc.setTextColor(80,80,80);const dl=doc.splitTextToSize(is.description,W-mg*2-6);doc.text(dl,mg+4,y);y+=dl.length*4+2;}if(is.action){doc.setFontSize(8);doc.setTextColor(80,80,80);const al=doc.splitTextToSize('→ '+is.action,W-mg*2-6);doc.text(al,mg+4,y);y+=al.length*4+2;}if(is.photos&&is.photos.length){is.photos.forEach(ph=>{try{doc.addImage(ph,'JPEG',mg+4,y,35,26);y+=28;}catch(e){}chk();});}chk();});
  if(!r.issues.length){doc.setFontSize(9);doc.text('None.',mg+2,y);y+=5;}ln();
  if(r.team&&r.team.length){sec(`TEAM (${r.team.length})`);r.team.forEach(m=>{doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);doc.text('• '+m.name+(m.role?' — '+m.role:''),mg+2,y);doc.setFont('helvetica','bold');rtxt(m.signoff==='yes'?'SIGNOFF':'ATTEND',y,m.signoff==='yes'?[15,110,86]:[100,100,100]);doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);y+=5;chk();});ln();}
  const rptTaskIds=r.reportTasks||[];
  if(rptTaskIds.length){sec(`TASKS IN REPORT (${rptTaskIds.length})`);const rptTasks=rptTaskIds.map(id=>S.tasks.find(t=>t.id===id)).filter(Boolean).sort((a,b)=>(b.dateStart||b.date||'').localeCompare(a.dateStart||a.date||'')||a.title.localeCompare(b.title));const byDate={};rptTasks.forEach(tk=>{const d=tk.dateStart||tk.date||'';if(!byDate[d])byDate[d]=[];byDate[d].push(tk);});Object.entries(byDate).forEach(([dk,dayTasks])=>{if(dk){doc.setFillColor(228,240,232);doc.rect(mg,y-3,W-mg*2,7,'F');doc.setTextColor(0,100,50);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text(fmtDate(dk),mg+3,y+1);doc.setTextColor(33,37,41);doc.setFont('helvetica','normal');y+=8;chk();}dayTasks.forEach(tk=>{const timeStr=tk.timeStart?(tk.timeEnd?`${tk.timeStart}–${tk.timeEnd}`:tk.timeStart):'';const dur=calcDuration(tk);const titleLine='• '+tk.title+(timeStr?' ('+timeStr+')':'')+(dur?' '+dur:'')+(tk.status==='done'?' — Done':'');doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(33,37,41);const tl=doc.splitTextToSize(titleLine,W-mg*2-4);doc.text(tl,mg+2,y);y+=tl.length*5;const meta=[tk.machine?'Machine: '+tk.machine:'',tk.plan?'Plan: '+tk.plan:'',tk.priority&&tk.priority!=='medium'?'Priority: '+tk.priority:''].filter(Boolean).join('  ·  ');if(meta){doc.setFontSize(8);doc.setTextColor(120,120,120);doc.text(meta,mg+6,y);y+=4;}if(tk.checklist&&tk.checklist.length){const done=tk.checklist.filter(c=>c.done).length;doc.setFontSize(8);doc.setTextColor(100,100,100);doc.text(`Checklist: ${done}/${tk.checklist.length} items`,mg+6,y);y+=4;}const note=(r.reportTaskNotes||{})[tk.id];if(note){doc.setFontSize(8);doc.setTextColor(80,80,80);const nl=doc.splitTextToSize('Notes: '+note,W-mg*2-8);doc.text(nl,mg+6,y);y+=nl.length*4+1;}y+=3;chk();});});ln();}
  sec('SIGN-OFF');kv2('Result',r.signoff&&r.signoff.result||'Completed');if(r.signoff&&r.signoff.summary)kv2('Summary',r.signoff.summary);if(r.signoff&&r.signoff.remarks)kv2('Remarks',r.signoff.remarks);y+=4;
  if(y>240){doc.addPage();y=20;pageNum++;addPN();}
  doc.setDrawColor(200,200,200);doc.rect(mg,y,W-mg*2,34);doc.setFontSize(8);doc.setTextColor(100,100,100);doc.text('Signature:',mg+4,y+7);doc.setFont('helvetica','bold');doc.setTextColor(33,37,41);doc.text(p.name||'Engineer',mg+4,y+29);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100,100,100);rtxt(new Date().toLocaleDateString('en-GB'),y+29);
  if(r.signature&&r.signature.length>100){try{doc.addImage(r.signature,'PNG',mg+40,y+4,65,25);}catch(e){}}
  addPN();
  const safePlant=(trip.plant||'Report').replace(/[^a-zA-Z0-9\s]/g,'').replace(/\s+/g,'_').slice(0,30);
  doc.save(`PlantLog_${safePlant}_${(trip.date||'').replace(/-/g,'')}.pdf`);showToast('PDF downloaded ✓');
}

function emailPDF(){
  const trip=S.trips.find(tr=>tr.id===curTrip);if(!trip)return;
  const rName=(document.getElementById('report-name-input')&&document.getElementById('report-name-input').value.trim())||`Plant Visit Report — ${trip.plant}`;
  document.getElementById('email-subject').value=`${rName} — ${fmtDate(trip.date)}`;
  document.getElementById('email-body').value=`Dear Team,\n\nPlease find attached the plant visit report:\n\nPlant: ${trip.plant}\nDate: ${fmtDate(trip.date)}\nLocation: ${trip.location||'—'}\nEngineer: ${S.profile.name||'Engineer'}\nResult: ${curReport?.signoff?.result||'Completed'}\n\nBest regards,\n${S.profile.name||'Engineer'}\n${S.profile.title||''}\n${S.profile.company||''}`;
  openModal('modal-email');
}
function sendEmail(){
  const to=document.getElementById('email-to').value.trim();if(!to){showToast('Email required');return;}
  const subj=encodeURIComponent(document.getElementById('email-subject').value);
  const body=encodeURIComponent(document.getElementById('email-body').value);
  const cc=document.getElementById('email-cc').value.trim();
  window.location.href=`mailto:${to}${cc?'?cc='+cc+'&':'?'}subject=${subj}&body=${body}`;
  closeModal('modal-email');showToast('Opening email... attach the PDF');
}
function markCompleted(){const trip=S.trips.find(tr=>tr.id===curTrip);if(trip){trip.status='completed';sv();showToast('Completed ✓');renderDash();renderTripList();svAndSync('trip_complete');}}
