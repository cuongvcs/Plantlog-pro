/**
 * PlantLog PRO — Google Apps Script Backend
 * Database: 'PlantLog Pro Database' (separate from old PlantLog Database)
 *
 * REQUIRED: After pasting this code, go to:
 *   Project Settings (⚙️) → Script Properties
 *   OR just run any function — it will prompt you to authorize
 *   Click "Review Permissions" → "Advanced" → "Go to PlantLog (unsafe)" → Allow
 *   This grants: Drive, Spreadsheets, and External URL fetch permissions.
 *
 * SETUP STEPS:
 * 1. Go to script.google.com → New project → name it 'PlantLog Pro Backend'
 * 2. Paste this entire file → Save (Ctrl+S)
 * 3. Run setupSheets() once → approve permissions
 *    → Creates a NEW file 'PlantLog Pro Database' in your Google Drive
 * 4. Deploy → New deployment → Web app
 *    Execute as: Me | Who has access: Anyone
 * 5. Copy the /exec URL → paste into PlantLog Pro → Settings → Sync
 */

const SN={TRIPS:'Trips',TASKS:'Tasks',LEAVE:'Leave',REPORTS:'Reports',
  CHECKLIST:'Checklist',READINGS:'Readings',ISSUES:'Issues',TEAM:'Team',
  BILLS:'Bills',MACHINES:'Machines',PLANS:'Plans',LOG:'SyncLog',REMINDERS:'Reminders'};

const COLS={
  trips:    ['ID','Plant','Location','Date','DateEnd','Purpose','Contact','Transport','Status','Notes','Flight','SavedReports','CreatedAt'],
  tasks:    ['ID','Title','Description','Category','DateStart','TimeStart','DateEnd','TimeEnd','Hours','Minutes','Priority','Period','Machine','Plan','TripID','Status','Checklist','ChecklistJson','PartsJson','FlightJson','FilesJson','AutoDuration','DurationMins','CreatedAt','UpdatedAt'],
  leave:    ['Date','Type','Note'],
  reports:   ['TripID','SignoffSummary','SignoffResult','SignoffRemarks','SignedAt'],
  reminders: ['ID','Title','Freq','Weekday','Monthday','YearMonth','YearDay','Time','Note','NotifyTele','NotifyCalendar','Status','CreatedAt'],
  checklist:['TripID','ItemID','Name','Result','Note'],
  readings: ['TripID','Type','Name','Tag','Value','Unit','Status','Condition','Notes'],
  issues:   ['TripID','Title','Description','Severity','IssueStatus','Action','PhotoCount'],
  team:     ['TripID','Name','Role','Organization','SignoffRequired'],
  bills:    ['ID','TripID','Date','BillNumber','Detail','Amount','Currency','VndAmount','Category','Notes','PhotoCount','PhotosJson','CreatedAt'],
  machines: ['Name'],
  plans:    ['Name'],
  log:      ['Timestamp','Action','Entity','EntityID','Status','Details']
};

function db_(){
  const f=DriveApp.getFilesByName('PlantLog Pro Database');
  return f.hasNext()?SpreadsheetApp.open(f.next()):SpreadsheetApp.create('PlantLog Pro Database');
}

function cellStr(v){
  if(v===null||v===undefined||v==='')return'';
  if(v instanceof Date){return isNaN(v.getTime())?'':Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');}
  return String(v);
}

function ensureSheet(ss,name,hdrs){
  let sh=ss.getSheetByName(name);
  if(!sh){
    sh=ss.insertSheet(name);
    sh.getRange(1,1,1,hdrs.length).setValues([hdrs]).setBackground('#1D9E75').setFontColor('#fff').setFontWeight('bold');
    sh.setFrozenRows(1);
    return sh;
  }
  // Update headers if needed
  const need=hdrs.length;
  if(sh.getMaxColumns()<need)sh.insertColumnsAfter(sh.getMaxColumns(),need-sh.getMaxColumns());
  const ex=sh.getRange(1,1,1,sh.getLastColumn()||1).getValues()[0];
  let diff=ex.length<need;
  for(let i=0;i<need&&!diff;i++)if(ex[i]!==hdrs[i])diff=true;
  if(diff){
    sh.getRange(1,1,1,need).setValues([hdrs]).setBackground('#1D9E75').setFontColor('#fff').setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readSheet(ss,name,hdrs){
  const sh=ensureSheet(ss,name,hdrs);
  const data=sh.getDataRange().getValues();
  if(data.length<=1)return[];
  const h=data[0].map(String);
  return data.slice(1).filter(r=>r[0]!==''&&r[0]!==null&&r[0]!==undefined).map(r=>{
    const o={};h.forEach((k,i)=>{o[k]=cellStr(r[i]);});return o;
  });
}

function writeSheet(ss,name,hdrs,rows){
  const sh=ensureSheet(ss,name,hdrs);
  const last=sh.getLastRow();
  if(last>1)sh.getRange(2,1,last-1,sh.getMaxColumns()).clearContent();
  if(!rows||!rows.length)return;
  const safe=rows.map(row=>
    hdrs.map((_,i)=>{
      const c=row[i];
      if(c===null||c===undefined)return'';
      if(c instanceof Date)return cellStr(c);
      if(typeof c==='object')return JSON.stringify(c);
      return c;
    })
  );
  sh.getRange(2,1,safe.length,hdrs.length).setValues(safe);
}

function log_(a,e,id,d){
  try{const sh=ensureSheet(db_(),SN.LOG,COLS.log);sh.appendRow([new Date().toISOString(),a,e,id||'','OK',d||'']);}catch(x){}
}

function doGet(e){
  try{
    const act=(e.parameter&&e.parameter.action)||'ping';
    const s=db_();
    if(act==='ping')return json_({ok:true,result:{message:'PlantLog API running',ts:new Date().toISOString()}});
    const d={};
    if(act==='getAll'||act==='getTrips')   d.trips=readSheet(s,SN.TRIPS,COLS.trips);
    if(act==='getAll'||act==='getTasks')   d.tasks=readSheet(s,SN.TASKS,COLS.tasks);
    if(act==='getAll'||act==='getLeave')   d.leave=readSheet(s,SN.LEAVE,COLS.leave);
    if(act==='getAll'||act==='getBills')   d.bills=readSheet(s,SN.BILLS,COLS.bills);
    if(act==='getAll'||act==='getReports') d.reports=readSheet(s,SN.REPORTS,COLS.reports);
    return json_({ok:true,data:d});
  }catch(x){return json_({ok:false,error:x.message});}
}

function doPost(e){
  try{
    const body=JSON.parse(e.postData?e.postData.contents:'{}');
    const act=body.action;
    // syncAll uses body.payload, file actions use body directly
    if(act==='syncAll')  return json_({ok:true,result:syncAll(body.payload)});
    if(act==='syncReminders') return json_(syncReminders(body.payload));
    if(act==='ping')     return json_({ok:true,result:{message:'PlantLog Pro API running'}});
    if(act==='uploadFile') return json_(uploadFileToDrive(body));
    if(act==='listFiles')  return json_(listTaskFiles(body));
    if(act==='syncToCalendar')   return json_(syncPlantLogToCalendar(body));
    if(act==='syncFromCalendar') return json_(syncCalendarToPlantLog(body));
    if(act==='getCalendarEvents') return json_(getUpcomingCalendarEvents(body));
    return json_({ok:false,error:'Unknown action: '+act});
  }catch(x){return json_({ok:false,error:x.message+'|'+x.stack});}
}

function syncAll(p){
  const s=db_();const r={};

  if(p.trips&&p.trips.length){
    writeSheet(s,SN.TRIPS,COLS.trips,p.trips.map(t=>[
      t.id,t.plant,t.location,t.date,t.dateEnd,
      t.purpose,t.contact,t.transport,t.status,
      t.notes||'', t.flight||'',
      t.savedReports||'',
      t.createdAt
    ]));r.trips=p.trips.length;
  }

  if(p.tasks&&p.tasks.length){
    writeSheet(s,SN.TASKS,COLS.tasks,p.tasks.map(t=>[
      t.id,t.title,t.desc,t.category,
      t.dateStart,t.timeStart,t.dateEnd,t.timeEnd,
      t.hours,t.minutes,
      t.priority,t.period,t.machine,t.plan,t.tripId,t.status,
      t.checklist,t.checklistJson,
      t.partsJson||'',
      t.flightJson||'',
      t.filesJson||'',
      t.autoDuration||'false',
      t.durationMins||'',
      t.createdAt,t.updatedAt
    ]));r.tasks=p.tasks.length;
  }

  if(p.leaveData&&Object.keys(p.leaveData).length){
    const rows=Object.entries(p.leaveData).map(([d,t])=>[d,t,'']);
    writeSheet(s,SN.LEAVE,COLS.leave,rows);r.leave=rows.length;
  }

  if(p.bills&&p.bills.length){
    writeSheet(s,SN.BILLS,COLS.bills,p.bills.map(b=>[
      b.id,b.tripId,b.date,b.billNumber,
      b.detail,b.amount||0,b.currency,b.vndAmount||0,b.category,
      b.notes,b.photoCount||0,
      b.photosJson||'[]',
      b.createdAt
    ]));r.bills=p.bills.length;
  }

  if(p.machines&&p.machines.length)writeSheet(s,SN.MACHINES,COLS.machines,p.machines.map(m=>[m]));
  if(p.plans&&p.plans.length)writeSheet(s,SN.PLANS,COLS.plans,p.plans.map(m=>[m]));

  if(p.reports){
    const cl=[],rd=[],is=[],tm=[],rp=[];
    Object.entries(p.reports).forEach(([tid,rep])=>{
      if(!rep)return;
      const so=rep.signoff||{};
      rp.push([tid,so.summary||'',so.result||'',so.remarks||'',new Date().toISOString()]);
      (rep.checklist||[]).forEach(c=>cl.push([tid,c.id||'',c.name||'',c.result||'',c.note||'']));
      (rep.readings||[]).forEach(r=>rd.push([tid,r.type||'',r.name||'',r.tag||'',r.value||'',r.unit||'',r.status||'',r.condition||'',r.notes||'']));
      (rep.issues||[]).forEach(i=>is.push([tid,i.title||'',i.description||'',i.severity||'',i.istatus||'pending',i.action||'',0]));
      (rep.team||[]).forEach(m=>tm.push([tid,m.name||'',m.role||'',m.org||'',m.signoff||'']));
    });
    if(rp.length)writeSheet(s,SN.REPORTS,COLS.reports,rp);
    if(cl.length)writeSheet(s,SN.CHECKLIST,COLS.checklist,cl);
    if(rd.length)writeSheet(s,SN.READINGS,COLS.readings,rd);
    if(is.length)writeSheet(s,SN.ISSUES,COLS.issues,is);
    if(tm.length)writeSheet(s,SN.TEAM,COLS.team,tm);
    r.reports=rp.length;
  }

  try{s.getSheets().forEach(sh=>{if(sh.getLastColumn()>0)sh.autoResizeColumns(1,sh.getLastColumn());});}catch(x){}
  log_('SYNC_ALL','All','',JSON.stringify(r));
  return r;
}

function setupSheets(){
  const s=db_();
  [['Trips',COLS.trips],['Tasks',COLS.tasks],['Leave',COLS.leave],['Reports',COLS.reports],['Reminders',COLS.reminders],
   ['Checklist',COLS.checklist],['Readings',COLS.readings],['Issues',COLS.issues],['Team',COLS.team],
   ['Bills',COLS.bills],['Machines',COLS.machines],['Plans',COLS.plans],['SyncLog',COLS.log]
  ].forEach(([n,h])=>ensureSheet(s,n,h));
  try{const d=s.getSheetByName('Sheet1');if(d&&s.getSheets().length>1)s.deleteSheet(d);}catch(x){}
  const url=s.getUrl();
  Logger.log('✅ PlantLog Pro Database ready!');
  Logger.log('Spreadsheet URL: '+url);
  Logger.log('');
  Logger.log('Next step: Deploy as Web App → copy the /exec URL → paste into PlantLog Pro Settings');
  return url;
}

/**
 * Upload a file to Google Drive folder "PlantLog Raw Data"
 * Expects: {action:'uploadFile', taskId, fileName, mimeType, dataBase64}
 */
function uploadFileToDrive(p){
  try{
    // Get or create PlantLog Raw Data folder
    var folderName = 'PlantLog Raw Data';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    // If a subfolder path is specified, create/get each level
    // Supports nested paths like "Bills Images/TripName_Date"
    if(p.folder){
      var parts = p.folder.split('/');
      for(var pi=0; pi<parts.length; pi++){
        var part = parts[pi].trim();
        if(!part) continue;
        var subFolders = folder.getFoldersByName(part);
        folder = subFolders.hasNext() ? subFolders.next() : folder.createFolder(part);
      }
    }

    // Decode base64 data
    var bytes = Utilities.base64Decode(p.dataBase64);
    var blob = Utilities.newBlob(bytes, p.mimeType, p.fileName);

    // Create file in folder
    var file = folder.createFile(blob);
    file.setDescription('PlantLog Task: ' + (p.taskId||''));
    // Make file accessible to anyone with the link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Use direct download URL format for better compatibility
    var fileId = file.getId();
    var viewUrl = 'https://drive.google.com/file/d/' + fileId + '/view';

    return {
      ok:       true,
      fileId:   fileId,
      fileName: file.getName(),
      fileUrl:  viewUrl,
      mimeType: p.mimeType,
      taskId:   p.taskId
    };
  } catch(e){
    return {ok:false, error: e.message};
  }
}

/**
 * List files attached to a task (by taskId in description)
 * Expects: {action:'listFiles', taskId}
 */
function listTaskFiles(p){
  try{
    var folderName = 'PlantLog Raw Data';
    var folders = DriveApp.getFoldersByName(folderName);
    if(!folders.hasNext()) return {ok:true, files:[]};
    var folder = folders.next();
    var files = folder.getFiles();
    var result = [];
    var search = 'PlantLog Task: ' + p.taskId;
    while(files.hasNext()){
      var f = files.next();
      if(f.getDescription() === search){
        result.push({
          fileId:   f.getId(),
          fileName: f.getName(),
          fileUrl:  f.getUrl(),
          mimeType: f.getMimeType()
        });
      }
    }
    return {ok:true, files:result};
  } catch(e){
    return {ok:false, error:e.message};
  }
}

/**
 * Run this to test file upload is working.
 * Check Execution Log for result.
 */
function testUpload(){
  var result = uploadFileToDrive({
    taskId: 'test_123',
    fileName: 'test.txt',
    mimeType: 'text/plain',
    dataBase64: Utilities.base64Encode('PlantLog test file')
  });
  Logger.log(JSON.stringify(result));
  if(result.ok) Logger.log('SUCCESS! File URL: ' + result.fileUrl);
  else Logger.log('FAILED: ' + result.error);
}

function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}

/**
 * Run this function to see your database URL in the Logs
 */
function getDatabaseUrl(){
  const url=db_().getUrl();
  Logger.log('PlantLog Pro Database: '+url);
  return url;
}

/**
 * Run this to verify the API is working correctly
 */
function testAPI(){
  const s=db_();
  Logger.log('Database: '+s.getName()+' ('+s.getId()+')');
  Logger.log('Sheets: '+s.getSheets().map(sh=>sh.getName()).join(', '));
  Logger.log('Trips: '+readSheet(s,SN.TRIPS,COLS.trips).length+' rows');
  Logger.log('Tasks: '+readSheet(s,SN.TASKS,COLS.tasks).length+' rows');
  Logger.log('Bills: '+readSheet(s,SN.BILLS,COLS.bills).length+' rows');
}


// ═══════════════════════════════════════════════════════════
// TELEGRAM DAILY NOTIFICATIONS
// Runs on a schedule — sends reminders WITHOUT the app being open
//
// SETUP:
// 1. Run setupTelegramTrigger() ONCE to create the daily trigger
// 2. Run deleteTelegramTrigger() to remove it
// 3. Edit NOTIFY_HOUR below to change what time you get notifications
// ═══════════════════════════════════════════════════════════

var NOTIFY_HOUR = 7;  // 7 AM — change this to your preferred hour (0-23)

/**
 * Run this ONCE to set up the daily notification trigger.
 * After running, notifications will send automatically every day.
 */
function setupTelegramTrigger() {
  // Remove any existing triggers for sendDailyNotifications
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'sendDailyTelegramNotifications') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Create new daily trigger at NOTIFY_HOUR
  ScriptApp.newTrigger('sendDailyTelegramNotifications')
    .timeBased()
    .everyDays(1)
    .atHour(NOTIFY_HOUR)
    .create();

  Logger.log('✓ Daily Telegram trigger set for ' + NOTIFY_HOUR + ':00 every day');
  Logger.log('  Run deleteTelegramTrigger() to remove it');
}

/**
 * Remove the daily trigger.
 */
function deleteTelegramTrigger() {
  var removed = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'sendDailyTelegramNotifications') {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });
  Logger.log(removed > 0 ? '✓ Trigger removed' : 'No trigger found');
}

/**
 * Main function called by the daily trigger.
 * Reads data from Google Sheets and sends Telegram messages.
 */
function sendDailyTelegramNotifications() {
  var ss = db_();
  if (!ss) { Logger.log('Cannot open database'); return; }

  // Read Telegram config from a Settings sheet (or hardcode below)
  var cfg = getTelegramConfig_(ss);
  if (!cfg || !cfg.token || !cfg.chatId) {
    Logger.log('Telegram not configured. Run saveTelegramConfig() first.');
    return;
  }

  var today    = formatDate_(new Date());
  var tomorrow = formatDate_(new Date(Date.now() + 86400000));
  var msgs     = [];

  // ── Read trips ──────────────────────────────────────────
  var trips = readSheet(ss, SN.TRIPS, COLS.trips);

  // Trips starting tomorrow
  var upcomingTrips = trips.filter(function(t) {
    return t.Date === tomorrow && t.Status !== 'completed';
  });
  if (upcomingTrips.length) {
    var msg = '🏭 <b>Trip Tomorrow — PlantLog Reminder</b>\n\n';
    upcomingTrips.forEach(function(t) {
      msg += '<b>Plant:</b>     ' + (t.Plant||'—') + '\n';
      if (t.Location)  msg += '<b>Location:</b>  ' + t.Location + '\n';
      msg += '<b>Date:</b>      ' + formatDateDisplay_(t.Date) + '\n';
      if (t.Purpose)   msg += '<b>Purpose:</b>   ' + t.Purpose + '\n';
      if (t.Contact)   msg += '<b>Contact:</b>   ' + t.Contact + '\n';
      if (t.Transport) msg += '<b>Transport:</b> ' + t.Transport + '\n';
      msg += '\n';
    });
    msgs.push(msg);
  }

  // ── Read tasks ───────────────────────────────────────────
  var tasks = readSheet(ss, SN.TASKS, COLS.tasks);

  // Tasks starting today (not done)
  var todayTasks = tasks.filter(function(t) {
    return t.DateStart === today && t.Status !== 'done';
  });
  if (todayTasks.length) {
    var msg2 = '✅ <b>Tasks Today — PlantLog</b>\n\n';
    todayTasks.slice(0, 8).forEach(function(t) {
      var cat = t.Category || 'work';
      var icon = cat==='leave' ? '🌴' : cat==='travel' ? '✈️' : '🔧';
      msg2 += icon + ' <b>' + (t.Title||'Task') + '</b>\n';
      if (t.TimeStart) msg2 += '   ⏰ ' + t.TimeStart + (t.TimeEnd?' – '+t.TimeEnd:'') + '\n';
      if (t.Machine)   msg2 += '   ⚙️ ' + t.Machine + '\n';
    });
    if (todayTasks.length > 8) msg2 += '   ...and ' + (todayTasks.length-8) + ' more\n';
    msgs.push(msg2);
  }

  // Trips active today (in progress)
  var activeTrips = trips.filter(function(t) {
    return t.Date <= today && (t.DateEnd||t.Date) >= today && t.Status === 'in_progress';
  });
  if (activeTrips.length) {
    var msg3 = '📍 <b>Active Trip Today — PlantLog</b>\n\n';
    activeTrips.forEach(function(t) {
      msg3 += '<b>' + (t.Plant||'—') + '</b>\n';
      msg3 += 'Day ' + (daysBetween_(t.Date, today)+1) + ' of trip\n';
      if (t.Contact) msg3 += 'Contact: ' + t.Contact + '\n';
      msg3 += '\n';
    });
    msgs.push(msg3);
  }

  // Send all messages
  if (msgs.length === 0) {
    Logger.log('Nothing to notify today (' + today + ')');
    return;
  }

  var sent = 0;
  msgs.forEach(function(m) {
    var ok = sendTelegramMsg_(cfg.token, cfg.chatId, m);
    if (ok) sent++;
    Utilities.sleep(500); // small delay between messages
  });
  // Also check recurring reminders
  try { checkAndSendReminders_(cfg, today); } catch(e) { Logger.log('Reminders error: ' + e.message); }

  Logger.log('Sent ' + sent + '/' + msgs.length + ' Telegram messages for ' + today);
}

// ── Save Telegram config to the database spreadsheet ────────
// Run this once after updating token/chatId below
function saveTelegramConfig() {
  // ┌─────────────────────────────────────────────────┐
  // │  EDIT YOUR TOKEN AND CHAT ID HERE               │
  var TOKEN   = 'YOUR_BOT_TOKEN_HERE';   // from @BotFather
  var CHAT_ID = 'YOUR_CHAT_ID_HERE';     // your Telegram user ID
  // └─────────────────────────────────────────────────┘

  var ss = db_();
  if (!ss) return;

  // Store in a Settings sheet
  var sheetName = 'Settings';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  sheet.getRange('A1:B3').setValues([
    ['Key', 'Value'],
    ['tele_token', TOKEN],
    ['tele_chatid', CHAT_ID]
  ]);
  Logger.log('✓ Telegram config saved to Settings sheet');
}

// ── Internal helpers ─────────────────────────────────────────
function getTelegramConfig_(ss) {
  // First try Settings sheet
  try {
    var sheet = ss.getSheetByName('Settings');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      var cfg = {};
      data.forEach(function(row) {
        if (row[0]==='tele_token')  cfg.token  = row[1];
        if (row[0]==='tele_chatid') cfg.chatId = String(row[1]);
      });
      if (cfg.token && cfg.chatId) return cfg;
    }
  } catch(e) {}
  return null;
}

function sendTelegramMsg_(token, chatId, text) {
  try {
    var url = 'https://api.telegram.org/bot' + token + '/sendMessage';
    var payload = { chat_id: chatId, text: text, parse_mode: 'HTML' };
    var resp = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var data = JSON.parse(resp.getContentText());
    if (!data.ok) Logger.log('Telegram API error: ' + data.description);
    return data.ok === true;
  } catch(e) {
    Logger.log('Telegram send error: ' + e.message);
    return false;
  }
}

function formatDate_(d) {
  // Returns YYYY-MM-DD
  var y = d.getFullYear();
  var m = String(d.getMonth()+1).padStart(2,'0');
  var day = String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+day;
}

function formatDateDisplay_(dateStr) {
  if (!dateStr) return '—';
  try {
    var parts = dateStr.split('-');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return parts[2]+' '+months[parseInt(parts[1])-1]+' '+parts[0];
  } catch(e) { return dateStr; }
}

function daysBetween_(dateStr1, dateStr2) {
  try {
    var d1 = new Date(dateStr1);
    var d2 = new Date(dateStr2);
    return Math.floor((d2-d1)/(1000*60*60*24));
  } catch(e) { return 0; }
}

/**
 * Test the notification system manually.
 * Run this to check it works before setting up the trigger.
 */
function testDailyNotifications() {
  Logger.log('Testing daily notifications...');
  sendDailyTelegramNotifications();
  Logger.log('Done.');
}

/**
 * Run THIS function first to trigger the authorization popup.
 * It will ask for permission to access external URLs (needed for Telegram).
 * After authorizing, run testDailyNotifications() again.
 */
function authorizeScript() {
  // This forces the authorization dialog to appear for ALL required permissions
  try {
    // Test Drive access
    DriveApp.getRootFolder();
    Logger.log('✓ Drive: authorized');
  } catch(e) { Logger.log('Drive: ' + e.message); }

  try {
    // Test Sheets access
    SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('✓ Sheets: authorized');
  } catch(e) { Logger.log('Sheets: may be ok'); }

  try {
    // Test URL Fetch access — this is what was missing
    UrlFetchApp.fetch('https://api.telegram.org', {
      method: 'get', muteHttpExceptions: true
    });
    Logger.log('✓ UrlFetch: authorized');
  } catch(e) {
    Logger.log('UrlFetch error: ' + e.message);
  }

  Logger.log('Authorization complete. Now run testDailyNotifications()');
}

// ═══════════════════════════════════════════════════════════
// GOOGLE CALENDAR SYNC
// Bidirectional sync between PlantLog Pro and Google Calendar
//
// SETUP:
// 1. Run setupCalendarSync() once to configure
// 2. The app will call syncToCalendar/syncFromCalendar via the API
// 3. Or run syncPlantLogToCalendar() manually to push all data
// ═══════════════════════════════════════════════════════════

var CALENDAR_NAME = 'PlantLog Pro';      // Name for the PlantLog calendar
var EVENT_PREFIX  = '[PLP] ';            // Prefix to identify PlantLog events

/**
 * Setup: creates a dedicated Google Calendar for PlantLog events.
 * Run once. Returns the calendar ID to configure in the app.
 */
function setupCalendarSync() {
  // Check if PlantLog calendar already exists
  var calendars = CalendarApp.getAllCalendars();
  var plpCal = null;
  calendars.forEach(function(c) {
    if (c.getName() === CALENDAR_NAME) plpCal = c;
  });

  if (!plpCal) {
    plpCal = CalendarApp.createCalendar(CALENDAR_NAME, {
      summary: 'PlantLog Pro — Field Visits & Tasks',
      color:   CalendarApp.Color.SAGE
    });
    Logger.log('✓ Created calendar: ' + CALENDAR_NAME);
  } else {
    Logger.log('✓ Calendar already exists: ' + CALENDAR_NAME);
  }

  var calId = plpCal.getId();
  Logger.log('Calendar ID: ' + calId);
  Logger.log('Copy this ID into PlantLog Settings → Calendar Sync');

  // Save to Settings sheet
  var ss = db_();
  if (ss) {
    var sheet = ss.getSheetByName('Settings') || ss.insertSheet('Settings');
    var data = sheet.getDataRange().getValues();
    var found = false;
    data.forEach(function(row, i) {
      if (row[0] === 'cal_id') { sheet.getRange(i+1,2).setValue(calId); found = true; }
    });
    if (!found) sheet.appendRow(['cal_id', calId]);
    Logger.log('✓ Calendar ID saved to Settings sheet');
  }
  return calId;
}

// ── Get PlantLog calendar ────────────────────────────────────
function getPlantLogCalendar_() {
  var ss = db_();
  var calId = null;

  // Try Settings sheet first
  if (ss) {
    try {
      var sheet = ss.getSheetByName('Settings');
      if (sheet) {
        var data = sheet.getDataRange().getValues();
        data.forEach(function(row) {
          if (row[0] === 'cal_id') calId = String(row[1]);
        });
      }
    } catch(e) {}
  }

  if (calId) {
    try { return CalendarApp.getCalendarById(calId); } catch(e) {}
  }

  // Fall back to finding by name
  var calendars = CalendarApp.getAllCalendars();
  for (var i = 0; i < calendars.length; i++) {
    if (calendars[i].getName() === CALENDAR_NAME) return calendars[i];
  }

  // Create if not found
  return CalendarApp.createCalendar(CALENDAR_NAME, {color: CalendarApp.Color.SAGE});
}

// ── PUSH: PlantLog → Google Calendar ────────────────────────
function syncPlantLogToCalendar(p) {
  try {
    var cal = getPlantLogCalendar_();
    var ss  = db_();
    var created = 0, updated = 0, skipped = 0;

    // ── Sync Trips ──────────────────────────────────────────
    var trips = readSheet(ss, SN.TRIPS, COLS.trips);
    trips.forEach(function(t) {
      if (!t.Date || t.Status === 'completed') return;
      try {
        var title    = EVENT_PREFIX + '[Trip] ' + (t.Plant || 'Trip');
        var startDt  = new Date(t.Date + 'T08:00:00');
        var endDt    = t.DateEnd ? new Date(t.DateEnd + 'T18:00:00') : new Date(t.Date + 'T18:00:00');
        var desc = '';
        if (t.Location)  desc += 'Location: '  + t.Location  + '\n';
        if (t.Purpose)   desc += 'Purpose: '   + t.Purpose   + '\n';
        if (t.Contact)   desc += 'Contact: '   + t.Contact   + '\n';
        if (t.Transport) desc += 'Transport: ' + t.Transport + '\n';
        desc += 'PlantLog ID: ' + t.ID;

        // Check if event already exists (by PlantLog ID in description)
        var existing = findCalEventById_(cal, t.ID, startDt);
        if (existing) {
          existing.setTitle(title);
          existing.setDescription(desc);
          updated++;
        } else {
          var ev = cal.createEvent(title, startDt, endDt, {description: desc, location: t.Location||''});
          ev.setColor(CalendarApp.EventColor.GREEN);
          created++;
        }
      } catch(e) { skipped++; Logger.log('Trip sync error: ' + e.message); }
    });

    // ── Sync Tasks ──────────────────────────────────────────
    var tasks = readSheet(ss, SN.TASKS, COLS.tasks);
    var today = new Date(); today.setHours(0,0,0,0);
    // Only sync future and recent tasks (within 30 days past)
    var cutoff = new Date(today.getTime() - 30*24*60*60*1000);

    tasks.forEach(function(t) {
      if (!t.DateStart || t.Status === 'done') return;
      try {
        var taskDate = new Date(t.DateStart);
        if (taskDate < cutoff) return;

        var catIcon  = t.Category==='leave'?'🌴':t.Category==='travel'?'✈️':'🔧';
        var title    = EVENT_PREFIX + catIcon + ' ' + (t.Title||'Task');
        var ts       = t.TimeStart||'08:00';
        var te       = t.TimeEnd  ||'17:00';
        var startDt  = new Date(t.DateStart + 'T' + ts + ':00');
        var endDt    = new Date((t.DateEnd||t.DateStart) + 'T' + te + ':00');
        if (endDt <= startDt) endDt = new Date(startDt.getTime() + 3600000);

        var desc = '';
        if (t.Machine)     desc += 'Machine: '     + t.Machine     + '\n';
        if (t.Plan)        desc += 'Plan: '        + t.Plan        + '\n';
        if (t.Priority)    desc += 'Priority: '    + t.Priority    + '\n';
        if (t.Description) desc += t.Description                   + '\n';
        desc += 'PlantLog ID: ' + t.ID;

        var color = t.Category==='leave'  ? CalendarApp.EventColor.YELLOW
                  : t.Category==='travel' ? CalendarApp.EventColor.CYAN
                  : CalendarApp.EventColor.GREEN;

        var existing = findCalEventById_(cal, t.ID, startDt);
        if (existing) {
          existing.setTitle(title);
          existing.setDescription(desc);
          updated++;
        } else {
          var ev = cal.createEvent(title, startDt, endDt, {description: desc});
          ev.setColor(color);
          created++;
        }
      } catch(e) { skipped++; Logger.log('Task sync error: ' + e.message); }
    });

    // ── Sync Leave ───────────────────────────────────────────
    var leave = readSheet(ss, SN.LEAVE, COLS.leave);
    leave.forEach(function(l) {
      if (!l.Date) return;
      try {
        var lDate   = new Date(l.Date);
        if (lDate < cutoff) return;
        var lType   = l.Type || 'leave';
        var lIcon   = lType==='wfh'?'[WFH]':lType==='holiday'?'[Holiday]':'🌴';
        var title   = EVENT_PREFIX + lIcon + ' ' + (lType==='wfh'?'WFH':lType==='holiday'?'Holiday':'Annual Leave');
        var startDt = new Date(l.Date + 'T00:00:00');
        var endDt   = new Date(l.Date + 'T23:59:00');
        var existing = findCalEventById_(cal, 'leave_'+l.Date, startDt);
        if (!existing) {
          var ev = cal.createAllDayEvent(title, new Date(l.Date));
          ev.setColor(CalendarApp.EventColor.YELLOW);
          ev.setDescription('PlantLog ID: leave_'+l.Date);
          created++;
        }
      } catch(e) { skipped++; }
    });

    Logger.log('Calendar sync complete: +'+created+' created, ~'+updated+' updated, '+skipped+' errors');
    return {ok:true, created:created, updated:updated, skipped:skipped};
  } catch(e) {
    Logger.log('syncToCalendar error: ' + e.message);
    return {ok:false, error:e.message};
  }
}

// ── PULL: Google Calendar → PlantLog ────────────────────────
function syncCalendarToPlantLog(p) {
  try {
    // Get all user calendars (not just PlantLog one)
    var now      = new Date();
    var start    = p && p.from ? new Date(p.from) : new Date(now.getTime() - 7*24*60*60*1000);
    var end      = p && p.to   ? new Date(p.to)   : new Date(now.getTime() + 90*24*60*60*1000);
    var events   = [];

    // Get events from ALL calendars (user's full calendar)
    var calendars = CalendarApp.getAllCalendars();
    calendars.forEach(function(cal) {
      // Skip PlantLog calendar (those are our own events pushed there)
      if (cal.getName() === CALENDAR_NAME) return;
      if (cal.isHidden()) return;

      try {
        var calEvents = cal.getEvents(start, end);
        calEvents.forEach(function(ev) {
          var title = ev.getTitle();
          // Skip PlantLog-generated events
          if (title.indexOf(EVENT_PREFIX) === 0) return;

          events.push({
            id:          ev.getId(),
            title:       title,
            start:       formatDate_(ev.getStartTime()),
            end:         formatDate_(ev.getEndTime()),
            startTime:   Utilities.formatDate(ev.getStartTime(), Session.getScriptTimeZone(), 'HH:mm'),
            endTime:     Utilities.formatDate(ev.getEndTime(),   Session.getScriptTimeZone(), 'HH:mm'),
            allDay:      ev.isAllDayEvent(),
            location:    ev.getLocation() || '',
            description: ev.getDescription() || '',
            calendar:    cal.getName(),
            color:       cal.getColor() || '#0F7B3E'
          });
        });
      } catch(e) { Logger.log('Calendar read error: '+cal.getName()+': '+e.message); }
    });

    return {ok:true, events:events, count:events.length};
  } catch(e) {
    return {ok:false, error:e.message};
  }
}

// ── Get upcoming events (for app home screen) ────────────────
function getUpcomingCalendarEvents(p) {
  try {
    var now   = new Date();
    var start = now;
    var end   = new Date(now.getTime() + 30*24*60*60*1000); // 30 days ahead
    var events = [];

    CalendarApp.getAllCalendars().forEach(function(cal) {
      if (cal.isHidden()) return;
      try {
        cal.getEvents(start, end).forEach(function(ev) {
          var title = ev.getTitle();
          if (title.indexOf(EVENT_PREFIX) === 0) return; // skip our own
          events.push({
            title:    title,
            start:    formatDate_(ev.getStartTime()),
            startTime:Utilities.formatDate(ev.getStartTime(),Session.getScriptTimeZone(),'HH:mm'),
            allDay:   ev.isAllDayEvent(),
            calendar: cal.getName(),
            color:    cal.getColor() || '#666'
          });
        });
      } catch(e) {}
    });

    // Sort by start date
    events.sort(function(a,b){ return a.start.localeCompare(b.start); });
    return {ok:true, events:events.slice(0,50)}; // max 50 events
  } catch(e) {
    return {ok:false, error:e.message};
  }
}

// ── Helper: find existing calendar event by PlantLog ID ─────
function findCalEventById_(cal, plpId, nearDate) {
  try {
    var start = new Date(nearDate.getTime() - 24*60*60*1000);
    var end   = new Date(nearDate.getTime() + 7*24*60*60*1000);
    var events = cal.getEvents(start, end);
    for (var i = 0; i < events.length; i++) {
      if ((events[i].getDescription()||'').indexOf('PlantLog ID: ' + plpId) >= 0) {
        return events[i];
      }
    }
  } catch(e) {}
  return null;
}

/**
 * Manual test: push all data to Google Calendar now.
 */
function testCalendarSync() {
  var result = syncPlantLogToCalendar({});
  Logger.log(JSON.stringify(result));
}

// ─── REMINDERS via GAS trigger ──────────────────────────────
// Called by sendDailyTelegramNotifications() — checks reminders
// and sends Telegram messages for ones due today

function checkAndSendReminders_(cfg, today) {
  var ss = db_();
  if (!ss) return;
  // Read reminders from Settings sheet (synced from app)
  var sheet = ss.getSheetByName('Reminders');
  if (!sheet) return;
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return; // header only

  var msgs = [];
  rows.slice(1).forEach(function(row) {
    var id = row[0], title = row[1], freq = row[2];
    var weekday = row[3], monthday = row[4], yearMonth = row[5], yearDay = row[6];
    var time = row[7]||'08:00', note = row[8], notifyTele = row[9], status = row[11];

    if (status === 'paused' || !notifyTele) return;

    var d = new Date(today);
    var isDue = false;
    if (freq === 'daily') isDue = true;
    if (freq === 'weekly')  isDue = (d.getDay() === parseInt(weekday||1));
    if (freq === 'monthly') isDue = (parseInt(today.split('-')[2]) === parseInt(monthday||1));
    if (freq === 'yearly')  isDue = (today.slice(5,7) === String(yearMonth||'01').padStart(2,'0') &&
                                     parseInt(today.split('-')[2]) === parseInt(yearDay||1));

    if (isDue) {
      var msg = '🔔 <b>Reminder: ' + title + '</b>';
      if (note) msg += '
' + note;
      msg += '
⏰ ' + time;
      msgs.push(msg);
    }
  });

  msgs.forEach(function(m) {
    sendTelegramMsg_(cfg.token, cfg.chatId, m);
    Utilities.sleep(300);
  });
}

// ─── Sync Reminders ─────────────────────────────────────────
function syncReminders(p) {
  var s = db_();
  if (!s || !p || !p.reminders) return {reminders: 0};
  writeSheet(s, SN.REMINDERS, COLS.reminders, p.reminders.map(function(r) {
    return [
      r.id, r.title, r.freq,
      r.weekday||'', r.monthday||'', r.yearMonth||'', r.yearDay||'',
      r.time||'', r.note||'',
      r.notifyTele?'true':'false',
      r.notifyCalendar?'true':'false',
      r.status||'active',
      r.createdAt||new Date().toISOString()
    ];
  }));
  return {reminders: p.reminders.length};
}

// ─── Check and send reminders (runs on schedule) ─────────────
function sendScheduledReminders() {
  var ss  = db_();
  var cfg = getTelegramConfig_(ss);
  if (!cfg || !cfg.token || !cfg.chatId) return;

  var today = formatDate_(new Date());
  var now   = new Date();
  var hour  = now.getHours();

  var reminders = readSheet(ss, SN.REMINDERS, COLS.reminders);

  reminders.forEach(function(r) {
    if (r.Status === 'paused') return;
    if (r.NotifyTele !== 'true') return;
    if (!isDueToday_(r, today)) return;

    // Only send at the right time (within 1 hour of reminder time)
    var remHour = r.Time ? parseInt(r.Time.split(':')[0]) : 8;
    if (Math.abs(hour - remHour) > 1) return;

    var freqLabel = {daily:'Daily',weekly:'Weekly',monthly:'Monthly',yearly:'Yearly'}[r.Freq] || r.Freq;
    var msg = '🔔 <b>Reminder — PlantLog</b>

'
      + '<b>' + (r.Title||'Reminder') + '</b>
'
      + 'Repeat: ' + freqLabel + '
'
      + (r.Time ? 'Time: ' + r.Time + '
' : '')
      + (r.Note ? '
' + r.Note + '
' : '');

    sendTelegramMsg_(cfg.token, cfg.chatId, msg);
    Utilities.sleep(300);
  });
}

function isDueToday_(r, today) {
  var d = new Date(today);
  var freq = r.Freq;
  if (freq === 'daily') return true;
  if (freq === 'weekly') {
    var dow = d.getDay(); // 0=Sun
    return String(dow) === String(r.Weekday);
  }
  if (freq === 'monthly') {
    return String(d.getDate()) === String(r.Monthday);
  }
  if (freq === 'yearly') {
    var mm = String(d.getMonth()+1).padStart(2,'0');
    var dd = String(d.getDate()).padStart(2,'0');
    return mm === String(r.YearMonth) && dd === String(r.YearDay).padStart(2,'0');
  }
  return false;
}

/**
 * Set up a trigger to check reminders every hour.
 * Run this once after setupTelegramTrigger().
 */
function setupReminderTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'sendScheduledReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendScheduledReminders')
    .timeBased().everyHours(1).create();
  Logger.log('Reminder trigger set: checks every hour');
}
