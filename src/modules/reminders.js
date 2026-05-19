'use strict';
// =====================================================
// PlantLog Pro — reminders.js
// Recurring reminders: daily / weekly / monthly / yearly
// Shows on calendar, sends via Telegram
// =====================================================

let reminderTab = 'all';
let editingReminderId = null;

// ═══════ SCREEN ═══════
function setReminderTab(tab){
  reminderTab = tab;
  ['all','daily','weekly','monthly','yearly'].forEach(t => {
    const b = document.getElementById('rem-tab-'+t);
    if(b) b.classList.toggle('active', t === tab);
  });
  renderRemindersScreen();
}

function renderRemindersScreen(){
  const body = document.getElementById('reminders-body');
  if(!body) return;
  let items = (S.reminders||[]);
  if(reminderTab !== 'all') items = items.filter(r => r.freq === reminderTab);
  items = items.sort((a,b) => (a.title||'').localeCompare(b.title||''));

  if(!items.length){
    body.innerHTML = `<div class="empty">
      <div class="ei">🔔</div>
      <div class="et">No reminders yet.<br>Tap ＋ to add a recurring reminder.</div>
    </div>`;
    return;
  }

  const freqLabel = {daily:'Daily', weekly:'Weekly', monthly:'Monthly', yearly:'Yearly'};
  const freqIcon  = {daily:'📅', weekly:'📆', monthly:'🗓', yearly:'📋'};

  body.innerHTML = items.map(r => {
    const when = getReminderWhenLabel(r);
    const isActive = r.status !== 'paused';
    const nextDate = getNextReminderDate(r);
    const daysUntil = nextDate ? Math.ceil((nextDate - new Date()) / 86400000) : null;
    const urgency = daysUntil !== null && daysUntil <= 1
      ? 'var(--red)' : daysUntil !== null && daysUntil <= 7
      ? 'var(--am)' : 'var(--n300)';

    return `<div style="background:#fff;border-radius:var(--r);box-shadow:var(--sh);
              border:1px solid var(--n150);border-left:3px solid ${urgency};
              padding:12px 14px;margin-bottom:8px;opacity:${isActive?1:0.6};">
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <div style="font-size:22px;flex-shrink:0;">${freqIcon[r.freq]||'🔔'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:700;color:var(--n800);margin-bottom:3px;">${r.title}</div>
          <div style="font-size:12px;color:var(--n500);">${freqLabel[r.freq]||r.freq} · ${when}</div>
          ${r.note ? `<div style="font-size:12px;color:var(--n600);margin-top:3px;">${r.note}</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
            ${r.notifyTele ? '<span style="font-size:10px;background:var(--bl);color:var(--bd);border-radius:3px;padding:1px 6px;font-weight:700;">✈️ Telegram</span>' : ''}
            ${r.notifyCalendar ? '<span style="font-size:10px;background:var(--brand-light);color:var(--brand-dark);border-radius:3px;padding:1px 6px;font-weight:700;">📅 Calendar</span>' : ''}
            ${nextDate ? `<span style="font-size:10px;color:${urgency};font-weight:700;">
              Next: ${fmtDate(nextDate.toISOString().slice(0,10))}
              ${daysUntil === 0 ? ' (Today!)' : daysUntil === 1 ? ' (Tomorrow)' : daysUntil > 0 ? ` (${daysUntil}d)` : ''}
            </span>` : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;">
          <button onclick="toggleReminderStatus('${r.id}')"
            style="padding:4px 10px;border-radius:var(--rs);border:1px solid var(--n200);
                   background:${isActive?'var(--brand-light)':'var(--n100)'};
                   color:${isActive?'var(--brand-dark)':'var(--n500)'};
                   font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);">
            ${isActive ? '✅ On' : '⏸ Off'}
          </button>
          <button onclick="editReminder('${r.id}')"
            style="padding:4px 10px;border-radius:var(--rs);border:1px solid var(--n200);
                   background:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font);color:var(--n600);">
            ✏️ Edit
          </button>
          <button onclick="deleteReminder('${r.id}')"
            style="padding:4px 10px;border-radius:var(--rs);border:1px solid rgba(185,28,28,0.2);
                   background:var(--rl);font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font);color:var(--rd);">
            🗑
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ═══════ NEXT DATE CALCULATION ═══════
function getNextReminderDate(r){
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  try{
    if(r.freq === 'daily'){
      const next = new Date(today);
      const [h,m] = (r.time||'08:00').split(':').map(Number);
      next.setHours(h,m,0,0);
      if(next <= now) next.setDate(next.getDate()+1);
      return next;
    }
    if(r.freq === 'weekly'){
      const wd = parseInt(r.weekday||1); // 0=Sun,1=Mon...
      const next = new Date(today);
      const dif = (wd - today.getDay() + 7) % 7;
      next.setDate(today.getDate() + (dif === 0 ? 7 : dif));
      return next;
    }
    if(r.freq === 'monthly'){
      const day = parseInt(r.monthday||1);
      let next = new Date(today.getFullYear(), today.getMonth(), day);
      if(next <= today) next = new Date(today.getFullYear(), today.getMonth()+1, day);
      return next;
    }
    if(r.freq === 'yearly'){
      const month = parseInt(r.yearMonth||1) - 1;
      const day   = parseInt(r.yearDay||1);
      let next = new Date(today.getFullYear(), month, day);
      if(next <= today) next = new Date(today.getFullYear()+1, month, day);
      return next;
    }
  }catch(e){}
  return null;
}

function getReminderWhenLabel(r){
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const time = r.time || '08:00';
  if(r.freq === 'daily')   return `Every day at ${time}`;
  if(r.freq === 'weekly')  return `Every ${days[parseInt(r.weekday||1)]} at ${time}`;
  if(r.freq === 'monthly') return `${ordinal_(parseInt(r.monthday||1))} of every month at ${time}`;
  if(r.freq === 'yearly')  return `Every ${months[parseInt(r.yearMonth||1)-1]} ${r.yearDay||1} at ${time}`;
  return '';
}

function ordinal_(n){
  const s=['th','st','nd','rd'];
  const v=n%100;
  return n+(s[(v-20)%10]||s[v]||s[0]);
}

// ═══════ CALENDAR INTEGRATION ═══════
// Returns reminder dots for a given date
function getRemindersForDate(dateStr){
  const d = new Date(dateStr);
  return (S.reminders||[]).filter(r => {
    if(r.status === 'paused' || !r.notifyCalendar) return false;
    const [y,m,day] = dateStr.split('-').map(Number);
    if(r.freq === 'daily')   return true;
    if(r.freq === 'weekly')  return d.getDay() === parseInt(r.weekday||1);
    if(r.freq === 'monthly') return day === parseInt(r.monthday||1);
    if(r.freq === 'yearly')  return m === parseInt(r.yearMonth||1) && day === parseInt(r.yearDay||1);
    return false;
  });
}

// ═══════ ADD / EDIT ═══════
function openAddReminder(){
  editingReminderId = null;
  document.getElementById('reminder-modal-title').textContent = 'Add Reminder';
  const el = id => document.getElementById(id);
  if(el('rem-title'))   el('rem-title').value   = '';
  if(el('rem-note'))    el('rem-note').value    = '';
  if(el('rem-time'))    el('rem-time').value    = '08:00';
  if(el('rem-weekday')) el('rem-weekday').value = '1';
  if(el('rem-monthday'))el('rem-monthday').value= '1';
  if(el('rem-year-month')) el('rem-year-month').value = '01';
  if(el('rem-year-day'))   el('rem-year-day').value   = '1';
  if(el('rem-notify-tele')) el('rem-notify-tele').checked = true;
  if(el('rem-notify-cal'))  el('rem-notify-cal').checked  = true;
  setReminderFreq('monthly');
  setReminderStatus('active');
  openModal('modal-add-reminder');
}

function editReminder(id){
  const r = (S.reminders||[]).find(x => x.id === id);
  if(!r) return;
  editingReminderId = id;
  document.getElementById('reminder-modal-title').textContent = 'Edit Reminder';
  const el = id => document.getElementById(id);
  if(el('rem-title'))    el('rem-title').value    = r.title||'';
  if(el('rem-note'))     el('rem-note').value     = r.note||'';
  if(el('rem-time'))     el('rem-time').value     = r.time||'08:00';
  if(el('rem-weekday'))  el('rem-weekday').value  = r.weekday||'1';
  if(el('rem-monthday')) el('rem-monthday').value = r.monthday||'1';
  if(el('rem-year-month')) el('rem-year-month').value = r.yearMonth||'01';
  if(el('rem-year-day'))   el('rem-year-day').value   = r.yearDay||1;
  if(el('rem-notify-tele')) el('rem-notify-tele').checked = r.notifyTele !== false;
  if(el('rem-notify-cal'))  el('rem-notify-cal').checked  = r.notifyCalendar !== false;
  setReminderFreq(r.freq||'monthly');
  setReminderStatus(r.status||'active');
  openModal('modal-add-reminder');
}

function setReminderFreq(freq){
  ['daily','weekly','monthly','yearly'].forEach(f => {
    const b = document.getElementById('rfreq-'+f);
    if(b) b.classList.toggle('sel', f === freq);
  });
  const fv = document.getElementById('rem-freq');
  if(fv) fv.value = freq;
  // Show/hide relevant fields
  const show = (id, visible) => { const e=document.getElementById(id); if(e) e.style.display=visible?'':'none'; };
  show('rem-daily-fields',   freq === 'daily');
  show('rem-weekly-fields',  freq === 'weekly');
  show('rem-monthly-fields', freq === 'monthly');
  show('rem-yearly-fields',  freq === 'yearly');
}

function setReminderStatus(status){
  const sv = document.getElementById('rem-status');
  if(sv) sv.value = status;
  ['active','paused'].forEach(s => {
    const b = document.getElementById('rst-'+s);
    if(b) b.classList.toggle('sel', s === status);
  });
}

function toggleReminderStatus(id){
  const r = (S.reminders||[]).find(x => x.id === id);
  if(!r) return;
  r.status = r.status === 'paused' ? 'active' : 'paused';
  sv(); renderRemindersScreen();
  showToast(r.status === 'active' ? '✅ Reminder active' : '⏸ Reminder paused');
}

function deleteReminder(id){
  if(!confirm('Delete this reminder?')) return;
  S.reminders = (S.reminders||[]).filter(r => r.id !== id);
  sv(); renderRemindersScreen();
  showToast('Deleted');
}

function saveReminder(){
  const title = (document.getElementById('rem-title')||{}).value.trim();
  if(!title){ showToast('Enter a title'); return; }
  const freq  = (document.getElementById('rem-freq')||{}).value || 'monthly';
  const reminder = {
    id:             editingReminderId || ('rem_'+Date.now()),
    title,
    freq,
    weekday:        (document.getElementById('rem-weekday')||{}).value  || '1',
    monthday:       (document.getElementById('rem-monthday')||{}).value || '1',
    yearMonth:      (document.getElementById('rem-year-month')||{}).value || '01',
    yearDay:        (document.getElementById('rem-year-day')||{}).value  || '1',
    time:           (document.getElementById('rem-time')||{}).value      || '08:00',
    note:           (document.getElementById('rem-note')||{}).value.trim(),
    notifyTele:     document.getElementById('rem-notify-tele') ? document.getElementById('rem-notify-tele').checked : true,
    notifyCalendar: document.getElementById('rem-notify-cal')  ? document.getElementById('rem-notify-cal').checked  : true,
    status:         (document.getElementById('rem-status')||{}).value || 'active',
    createdAt:      editingReminderId
      ? ((S.reminders||[]).find(r=>r.id===editingReminderId)||{}).createdAt || new Date().toISOString()
      : new Date().toISOString()
  };

  if(!S.reminders) S.reminders = [];
  if(editingReminderId){
    const idx = S.reminders.findIndex(r => r.id === editingReminderId);
    if(idx >= 0) S.reminders[idx] = reminder; else S.reminders.push(reminder);
  } else {
    S.reminders.push(reminder);
  }
  sv();
  closeModal('modal-add-reminder');
  renderRemindersScreen();
  showToast(editingReminderId ? 'Reminder updated ✓' : 'Reminder saved ✓');
  editingReminderId = null;
}

// ═══════ IN-APP CHECK (runs on startup) ═══════
function checkRemindersToday(){
  const today = new Date().toISOString().slice(0,10);
  const dueToday = (S.reminders||[]).filter(r => {
    if(r.status === 'paused') return false;
    const next = getNextReminderDate(r);
    return next && next.toISOString().slice(0,10) === today;
  });
  if(!dueToday.length) return;

  // Show in-app toasts
  setTimeout(() => {
    dueToday.forEach(r => showToast('🔔 ' + r.title));
  }, 2000);

  // Send via Telegram if configured
  const cfg = S.telegramConfig || {};
  if(cfg.token && cfg.chatId){
    const p = S.profile || {};
    dueToday.forEach(async r => {
      if(!r.notifyTele) return;
      const freqLabel = {daily:'Daily',weekly:'Weekly',monthly:'Monthly',yearly:'Yearly'}[r.freq]||r.freq;
      const msg = '🔔 <b>Reminder — PlantLog</b>\n\n'
        + '<b>' + r.title + '</b>\n'
        + 'Repeat: ' + freqLabel + '\n'
        + (r.time ? 'Time: ' + r.time + '\n' : '')
        + (r.note ? '\n' + r.note + '\n' : '')
        + '\n— ' + (p.name||'PlantLog Pro');
      try{
        await fetch('https://api.telegram.org/bot'+cfg.token+'/sendMessage',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({chat_id:cfg.chatId, text:msg, parse_mode:'HTML'})
        });
      }catch(e){ console.warn('Reminder Telegram error:',e.message); }
    });
  }
}

// Called from calendar render to mark reminder dates
function getRemindersForMonth(year, month){
  const result = {};
  (S.reminders||[]).filter(r => r.status !== 'paused').forEach(r => {
    // Check each day of the month
    const daysInMonth = new Date(year, month+1, 0).getDate();
    for(let d = 1; d <= daysInMonth; d++){
      const dateStr = year+'-'+String(month+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      const next = getNextReminderDate(r, new Date(dateStr));
      if(next && next.toISOString().slice(0,10) === dateStr){
        if(!result[dateStr]) result[dateStr] = [];
        result[dateStr].push(r);
      }
    }
  });
  return result;
}
