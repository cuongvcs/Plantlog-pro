'use strict';
// =====================================================
// PlantLog Pro — telegram.js
// Telegram Bot notifications: upcoming events, trip reports
// =====================================================

// ═══════ SETTINGS ═══════
function openTelegramSettings(){
  const cfg = S.telegramConfig || {};
  const el = id => document.getElementById(id);
  if(el('tele-token'))   el('tele-token').value   = cfg.token   || '';
  if(el('tele-chatid'))  el('tele-chatid').value  = cfg.chatId  || '';
  if(el('tele-notify-trips'))  el('tele-notify-trips').checked  = cfg.notifyTrips  !== false;
  if(el('tele-notify-tasks'))  el('tele-notify-tasks').checked  = cfg.notifyTasks  !== false;
  if(el('tele-notify-leave'))  el('tele-notify-leave').checked  = cfg.notifyLeave  !== false;
  const res = document.getElementById('tele-result');
  if(res) res.style.display = 'none';
  openModal('modal-telegram');
}

function saveTelegramSettings(){
  const token  = (document.getElementById('tele-token')  || {}).value || '';
  const chatId = (document.getElementById('tele-chatid') || {}).value || '';
  if(!S.telegramConfig) S.telegramConfig = {};
  S.telegramConfig = {
    token:        token.trim(),
    chatId:       chatId.trim(),
    notifyTrips:  document.getElementById('tele-notify-trips')  ? document.getElementById('tele-notify-trips').checked  : true,
    notifyTasks:  document.getElementById('tele-notify-tasks')  ? document.getElementById('tele-notify-tasks').checked  : true,
    notifyLeave:  document.getElementById('tele-notify-leave')  ? document.getElementById('tele-notify-leave').checked  : true,
  };
  sv();
  updateTelegramStatusLabel();
  closeModal('modal-telegram');
  showToast(token ? '✓ Telegram configured' : 'Telegram settings cleared');
}

function updateTelegramStatusLabel(){
  const el = document.getElementById('tele-status');
  if(!el) return;
  const cfg = S.telegramConfig || {};
  el.textContent = cfg.token && cfg.chatId
    ? '✓ Connected · notifications active'
    : 'Not configured';
}

// ═══════ SEND MESSAGE ═══════
async function sendTelegramMessage(text){
  const cfg = S.telegramConfig || {};
  if(!cfg.token || !cfg.chatId) return false;
  try{
    const url = `https://api.telegram.org/bot${cfg.token}/sendMessage`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        chat_id:    cfg.chatId,
        text:       text,
        parse_mode: 'HTML'
      })
    });
    const data = await resp.json();
    return data.ok === true;
  }catch(e){
    console.warn('[Telegram] Send error:', e.message);
    return false;
  }
}

async function testTelegram(){
  const token  = (document.getElementById('tele-token')  || {}).value || '';
  const chatId = (document.getElementById('tele-chatid') || {}).value || '';
  const res = document.getElementById('tele-result');
  if(!token || !chatId){
    if(res){ res.style.display=''; res.style.background='var(--rl)'; res.style.color='var(--rd)'; res.textContent='Please enter both Bot Token and Chat ID first.'; }
    return;
  }
  if(res){ res.style.display=''; res.style.background='var(--n100)'; res.style.color='var(--n600)'; res.textContent='Sending test message…'; }
  const p = S.profile || {};
  const msg = `🏭 <b>PlantLog Pro — Test Message</b>

✅ Your Telegram notifications are working!

<b>Engineer:</b> ${p.name||'—'}
<b>Company:</b>  ${p.company||'—'}
<b>App:</b> VCS PlantLog Pro
<b>Time:</b> ${new Date().toLocaleString('en-GB')}`;

  try{
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const resp = await fetch(url,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({chat_id:chatId, text:msg, parse_mode:'HTML'})
    });
    const data = await resp.json();
    if(data.ok){
      if(res){ res.style.background='var(--brand-light)'; res.style.color='var(--brand-dark)'; res.textContent='✓ Test message sent! Check your Telegram.'; }
    } else {
      if(res){ res.style.background='var(--rl)'; res.style.color='var(--rd)'; res.textContent='Error: '+(data.description||'Unknown error'); }
    }
  }catch(e){
    if(res){ res.style.background='var(--rl)'; res.style.color='var(--rd)'; res.textContent='Network error: '+e.message; }
  }
}

// ═══════ DAILY NOTIFICATIONS ═══════
// Called on app start — checks for upcoming events and notifies
async function checkAndSendDailyNotifications(){
  const cfg = S.telegramConfig || {};
  if(!cfg.token || !cfg.chatId) return;

  const today     = new Date().toISOString().slice(0,10);
  const tomorrow  = new Date(Date.now() + 86400000).toISOString().slice(0,10);
  const p         = S.profile || {};

  // Avoid sending twice in same day
  const lastSent = localStorage.getItem('plpro_tele_last');
  if(lastSent === today) return;

  const messages = [];

  // ── Upcoming trips (starting tomorrow) ──
  if(cfg.notifyTrips !== false){
    const upcomingTrips = (S.trips||[]).filter(t =>
      t.date === tomorrow && t.status !== 'completed'
    );
    if(upcomingTrips.length){
      let msg = `🏭 <b>Trip Tomorrow — PlantLog Reminder</b>\n\n`;
      upcomingTrips.forEach(t => {
        msg += `<b>Plant:</b> ${t.plant}\n`;
        msg += `<b>Date:</b> ${fmtDate(t.date)}\n`;
        if(t.location) msg += `<b>Location:</b> ${t.location}\n`;
        if(t.purpose)  msg += `<b>Purpose:</b> ${t.purpose}\n`;
        if(t.contact)  msg += `<b>Contact:</b> ${t.contact}\n`;
        if(t.transport)msg += `<b>Transport:</b> ${t.transport}\n`;
        msg += '\n';
      });
      msg += `— ${p.name||'PlantLog Pro'}`;
      messages.push(msg);
    }
  }

  // ── Tasks due today ──
  if(cfg.notifyTasks !== false){
    const todayTasks = (S.tasks||[]).filter(t =>
      (t.dateStart||t.date||'') === today && t.status !== 'done'
    );
    if(todayTasks.length){
      let msg = `✅ <b>Tasks Due Today — PlantLog</b>\n\n`;
      todayTasks.slice(0,8).forEach(t => {
        const cat = t.category||'work';
        const icon = cat==='leave'?'🌴':cat==='travel'?'✈️':'🔧';
        msg += `${icon} <b>${t.title}</b>\n`;
        if(t.timeStart) msg += `   ⏰ ${t.timeStart}${t.timeEnd?' – '+t.timeEnd:''}\n`;
        if(t.machine)   msg += `   ⚙️ ${t.machine}\n`;
      });
      if(todayTasks.length > 8) msg += `   ...and ${todayTasks.length-8} more\n`;
      msg += `\n— ${p.name||'PlantLog Pro'}`;
      messages.push(msg);
    }
  }

  // ── Leave / Travel starting today ──
  if(cfg.notifyLeave !== false){
    const todayLeave  = Object.entries(S.leaveData||{}).find(([d,t]) => d===today && t!=='work');
    const todayTravel = (S.tasks||[]).filter(t =>
      t.category==='travel' && (t.dateStart||t.date||'')===today
    );
    if(todayLeave || todayTravel.length){
      let msg = `📅 <b>Schedule Today — PlantLog</b>\n\n`;
      if(todayLeave){
        const lbl = {leave:'🌴 Annual Leave',wfh:'🏠 Work From Home',holiday:'🎉 Holiday'}[todayLeave[1]]||todayLeave[1];
        msg += `${lbl}\n`;
      }
      todayTravel.forEach(t => {
        msg += `✈️ <b>Travel:</b> ${t.title}\n`;
        const trip = t.tripId ? (S.trips||[]).find(tr=>tr.id===t.tripId) : null;
        if(trip) msg += `   🏭 ${trip.plant}\n`;
      });
      msg += `\n— ${p.name||'PlantLog Pro'}`;
      messages.push(msg);
    }
  }

  // Send all messages
  if(messages.length){
    let allSent = true;
    for(const m of messages){
      const ok = await sendTelegramMessage(m);
      if(!ok) allSent = false;
    }
    if(allSent) localStorage.setItem('plpro_tele_last', today);
  }
}

// ═══════ SEND TRIP REPORT TO TELEGRAM ═══════
async function sendTripToTelegram(tripId){
  const cfg = S.telegramConfig || {};
  if(!cfg.token || !cfg.chatId){
    showToast('Configure Telegram in Settings first');
    openTelegramSettings();
    return;
  }
  const trip = (S.trips||[]).find(t => t.id === tripId);
  if(!trip){ showToast('Trip not found'); return; }

  const p = S.profile || {};
  const report = S.reports && S.reports[tripId];
  const tripTasks = (S.tasks||[]).filter(t => t.tripId === tripId);
  const tripBills = (S.bills||[]).filter(b => b.tripId === tripId);

  let msg = `🏭 <b>Trip Report — ${trip.plant}</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += `📋 <b>TRIP INFO</b>\n`;
  msg += `<b>Plant:</b>     ${trip.plant}\n`;
  if(trip.location)  msg += `<b>Location:</b>  ${trip.location}\n`;
  msg += `<b>Date:</b>      ${fmtDate(trip.date)}`;
  if(trip.dateEnd && trip.dateEnd !== trip.date) msg += ` → ${fmtDate(trip.dateEnd)}`;
  msg += '\n';
  if(trip.purpose)   msg += `<b>Purpose:</b>   ${trip.purpose}\n`;
  if(trip.contact)   msg += `<b>Contact:</b>   ${trip.contact}\n`;
  if(trip.transport) msg += `<b>Transport:</b> ${trip.transport}\n`;
  const statusLabel = {planned:'📋 Planned',in_progress:'🔄 In Progress',completed:'✅ Completed'}[trip.status]||trip.status;
  msg += `<b>Status:</b>    ${statusLabel}\n\n`;

  // Tasks summary
  if(tripTasks.length){
    msg += `✅ <b>TASKS (${tripTasks.length})</b>\n`;
    const done = tripTasks.filter(t=>t.status==='done').length;
    const inP  = tripTasks.filter(t=>t.status==='in_progress').length;
    const pend = tripTasks.filter(t=>t.status==='pending').length;
    msg += `Done: ${done}  ·  Active: ${inP}  ·  Pending: ${pend}\n`;
    tripTasks.slice(0,5).forEach(t => {
      const icon = t.status==='done'?'✅':t.status==='in_progress'?'🔄':'⏳';
      msg += `${icon} ${t.title}\n`;
    });
    if(tripTasks.length > 5) msg += `... +${tripTasks.length-5} more tasks\n`;
    msg += '\n';
  }

  // Report summary
  if(report){
    if(report.checklist && report.checklist.length){
      const passed = report.checklist.filter(c=>c.result==='pass').length;
      const failed = report.checklist.filter(c=>c.result==='fail').length;
      msg += `☑️ <b>CHECKLIST:</b> ${passed} pass · ${failed} fail · ${report.checklist.length} total\n`;
    }
    if(report.readings && report.readings.length){
      msg += `📊 <b>READINGS:</b> ${report.readings.length} recorded\n`;
    }
    if(report.issues && report.issues.length){
      const crit = report.issues.filter(i=>i.severity==='critical'||i.severity==='high').length;
      msg += `⚠️ <b>ISSUES:</b> ${report.issues.length} total`;
      if(crit) msg += ` · ${crit} high/critical`;
      msg += '\n';
    }
    if(report.signoff && report.signoff.result){
      msg += `📝 <b>Result:</b> ${report.signoff.result}\n`;
    }
    msg += '\n';
  }

  // Bills summary
  if(tripBills.length){
    const totalVND = tripBills.reduce((s,b)=>{
      if((b.currency||'VND')==='VND') return s+(parseFloat(b.amount)||0);
      return s+(parseFloat(b.vndAmount)||0);
    },0);
    const byCur = {};
    tripBills.forEach(b=>{ const c=b.currency||'VND'; byCur[c]=(byCur[c]||0)+(parseFloat(b.amount)||0); });
    msg += `💰 <b>EXPENSES (${tripBills.length} bills)</b>\n`;
    Object.entries(byCur).forEach(([c,t])=>{ msg += `   ${c}: ${fmtAmt(t,c)}\n`; });
    if(totalVND) msg += `   <b>Total ≈ ${fmtAmt(totalVND,'VND')} VND</b>\n`;
    msg += '\n';
  }

  // Saved reports links
  if(trip.savedReports && trip.savedReports.length){
    msg += `📁 <b>SAVED REPORTS</b>\n`;
    trip.savedReports.forEach(r=>{
      const icon = r.type==='bills'?'💰':'📋';
      msg += `${icon} <a href="${r.fileUrl}">${r.name}</a>\n`;
    });
    msg += '\n';
  }

  msg += `━━━━━━━━━━━━━━━━━━━\n`;
  msg += `— ${p.name||'Engineer'}${p.company?' · '+p.company:''}`;
  msg += `\nSent from VCS PlantLog Pro`;

  showToast('Sending to Telegram…');
  const ok = await sendTelegramMessage(msg);
  if(ok){
    showToast('✓ Trip report sent to Telegram!');
  } else {
    showToast('❌ Send failed — check Telegram settings');
  }
}
