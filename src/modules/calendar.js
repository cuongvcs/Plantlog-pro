'use strict';
// =====================================================
// PlantLog Pro — calendar.js
// Google Calendar bidirectional sync
// Pushes trips/tasks/leave to Google Calendar
// Pulls external calendar events into PlantLog
// =====================================================

// ═══════ STATE ═══════
let externalCalEvents = [];  // events pulled from Google Calendar

// ═══════ SETTINGS ═══════
function openCalendarSettings(){
  const cfg = S.calendarConfig || {};
  const el = id => document.getElementById(id);
  if(el('cal-id-input'))     el('cal-id-input').value     = cfg.calId  || '';
  if(el('cal-push-trips'))   el('cal-push-trips').checked  = cfg.pushTrips  !== false;
  if(el('cal-push-tasks'))   el('cal-push-tasks').checked  = cfg.pushTasks  !== false;
  if(el('cal-pull-events'))  el('cal-pull-events').checked = cfg.pullEvents !== false;
  const res = document.getElementById('cal-sync-result');
  if(res) res.style.display = 'none';
  openModal('modal-calendar');
}

function saveCalendarSettings(){
  const calId = (document.getElementById('cal-id-input')||{}).value || '';
  if(!S.calendarConfig) S.calendarConfig = {};
  S.calendarConfig = {
    calId:       calId.trim(),
    pushTrips:   document.getElementById('cal-push-trips')  ? document.getElementById('cal-push-trips').checked   : true,
    pushTasks:   document.getElementById('cal-push-tasks')  ? document.getElementById('cal-push-tasks').checked   : true,
    pullEvents:  document.getElementById('cal-pull-events') ? document.getElementById('cal-pull-events').checked  : true,
  };
  sv();
  updateCalendarStatusLabel();
  showToast(calId ? '✓ Calendar sync configured' : 'Calendar settings cleared');
  if(calId) {
    // Auto-run first sync
    syncToGoogleCalendar();
  } else {
    closeModal('modal-calendar');
  }
}

function updateCalendarStatusLabel(){
  const el = document.getElementById('cal-sync-status');
  if(!el) return;
  const cfg = S.calendarConfig || {};
  el.textContent = cfg.calId
    ? '✓ Connected · tap to sync'
    : 'Not configured';
}

// ═══════ PUSH: PlantLog → Google Calendar ═══════
async function syncToGoogleCalendar(){
  const gsUrl = getGSUrl ? getGSUrl() : (S&&S.gsUrl||'');
  if(!gsUrl){ showToast('Set Google Sheets URL first'); return; }
  const cfg = S.calendarConfig || {};
  if(!cfg.calId){ showToast('Configure calendar in Settings first'); openCalendarSettings(); return; }

  showCalResult('⟳ Pushing to Google Calendar…', 'info');
  showToast('Syncing to Google Calendar…');

  try{
    const resp = await fetch(gsUrl, {
      method:'POST', headers:{'Content-Type':'text/plain'},
      body: JSON.stringify({action:'syncToCalendar', calId:cfg.calId})
    });
    const data = await resp.json();
    if(data && data.ok){
      const r = data.result || data;
      showCalResult(
        `✓ Synced to Google Calendar\n+${r.created||0} created · ~${r.updated||0} updated`,
        'ok'
      );
      showToast('✓ Calendar synced!');
      closeModal('modal-calendar');
    } else {
      showCalResult('❌ Sync failed: '+(data?data.error:'No response'), 'error');
    }
  }catch(e){
    showCalResult('❌ Error: '+e.message, 'error');
  }
}

// ═══════ PULL: Google Calendar → PlantLog ═══════
async function syncFromGoogleCalendar(){
  const gsUrl = getGSUrl ? getGSUrl() : (S&&S.gsUrl||'');
  if(!gsUrl){ showToast('Set Google Sheets URL first'); return; }
  const cfg = S.calendarConfig || {};

  showCalResult('⟳ Pulling events from Google Calendar…', 'info');

  try{
    const resp = await fetch(gsUrl, {
      method:'POST', headers:{'Content-Type':'text/plain'},
      body: JSON.stringify({
        action: 'syncFromCalendar',
        from: new Date(Date.now() - 7*24*60*60*1000).toISOString().slice(0,10),
        to:   new Date(Date.now() + 90*24*60*60*1000).toISOString().slice(0,10)
      })
    });
    const data = await resp.json();
    if(data && data.ok){
      externalCalEvents = data.events || [];
      showCalResult(
        `✓ Pulled ${externalCalEvents.length} event${externalCalEvents.length!==1?'s':''} from your calendars`,
        'ok'
      );
      showToast(`✓ ${externalCalEvents.length} calendar events loaded`);
      // Re-render calendar to show external events
      if(typeof renderCalendar === 'function') renderCalendar();
      closeModal('modal-calendar');
    } else {
      showCalResult('❌ Pull failed: '+(data?data.error:'No response'), 'error');
    }
  }catch(e){
    showCalResult('❌ Error: '+e.message, 'error');
  }
}

// ═══════ CALENDAR DISPLAY HELPERS ═══════

// Get external events for a specific date
function getExternalEventsForDate(dateStr){
  return externalCalEvents.filter(e => e.start === dateStr);
}

// Called during app auto-load to fetch calendar events silently
async function autoSyncCalendar(){
  const cfg = S.calendarConfig || {};
  if(!cfg.calId || !cfg.pullEvents) return;
  const gsUrl = getGSUrl ? getGSUrl() : (S&&S.gsUrl||'');
  if(!gsUrl) return;
  try{
    const resp = await fetch(gsUrl, {
      method:'POST', headers:{'Content-Type':'text/plain'},
      body: JSON.stringify({action:'getCalendarEvents'})
    });
    const data = await resp.json();
    if(data && data.ok && data.events){
      externalCalEvents = data.events;
      if(typeof renderCalendar === 'function') renderCalendar();
    }
  }catch(e){ console.warn('[Calendar] Auto-sync failed:', e.message); }
}

// Show result in the modal
function showCalResult(msg, type){
  const el = document.getElementById('cal-sync-result');
  if(!el) return;
  el.style.display = '';
  el.style.background = type==='ok' ? 'var(--brand-light)' : type==='error' ? 'var(--rl)' : 'var(--bl)';
  el.style.color = type==='ok' ? 'var(--brand-dark)' : type==='error' ? 'var(--rd)' : 'var(--bd)';
  el.textContent = msg;
}
