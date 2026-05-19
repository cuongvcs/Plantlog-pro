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
  BILLS:'Bills',MACHINES:'Machines',PLANS:'Plans',LOG:'SyncLog'};

const COLS={
  trips:    ['ID','Plant','Location','Date','DateEnd','Purpose','Contact','Transport','Status','Notes','Flight','SavedReports','CreatedAt'],
  tasks:    ['ID','Title','Description','Category','DateStart','TimeStart','DateEnd','TimeEnd','Hours','Minutes','Priority','Period','Machine','Plan','TripID','Status','Checklist','ChecklistJson','PartsJson','FlightJson','FilesJson','AutoDuration','DurationMins','CreatedAt','UpdatedAt'],
  leave:    ['Date','Type','Note'],
  reports:  ['TripID','SignoffSummary','SignoffResult','SignoffRemarks','SignedAt'],
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
    if(act==='ping')     return json_({ok:true,result:{message:'PlantLog Pro API running'}});
    if(act==='uploadFile') return json_(uploadFileToDrive(body));
    if(act==='listFiles')  return json_(listTaskFiles(body));
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
  [['Trips',COLS.trips],['Tasks',COLS.tasks],['Leave',COLS.leave],['Reports',COLS.reports],
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
