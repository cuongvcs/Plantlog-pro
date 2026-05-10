/**
 * PlantLog v4 — Google Apps Script Backend
 * DEPLOY: script.google.com → New project → paste → Save
 * Run setupSheets() once → Deploy → Web app → Anyone → copy URL
 */

const SN={TRIPS:'Trips',TASKS:'Tasks',LEAVE:'Leave',REPORTS:'Reports',
  CHECKLIST:'Checklist',READINGS:'Readings',ISSUES:'Issues',TEAM:'Team',
  BILLS:'Bills',MACHINES:'Machines',PLANS:'Plans',LOG:'SyncLog'};

const COLS={
  trips:    ['ID','Plant','Location','Date','DateEnd','Purpose','Contact','Transport','Status','Notes','CreatedAt'],
  tasks:    ['ID','Title','Description','Category','DateStart','TimeStart','DateEnd','TimeEnd','Hours','Minutes','Priority','Period','Machine','Plan','TripID','Status','Checklist','ChecklistJson','CreatedAt','UpdatedAt'],
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
  const f=DriveApp.getFilesByName('PlantLog Database');
  return f.hasNext()?SpreadsheetApp.open(f.next()):SpreadsheetApp.create('PlantLog Database');
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
    const act=(e.parameter&&e.parameter.action)||'getAll';
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
    const act=body.action,p=body.payload;
    if(act==='syncAll')return json_({ok:true,result:syncAll(p)});
    if(act==='ping')return json_({ok:true,result:{message:'PlantLog API running'}});
    return json_({ok:false,error:'Unknown action: '+act});
  }catch(x){return json_({ok:false,error:x.message+'|'+x.stack});}
}

function syncAll(p){
  const s=db_();const r={};

  if(p.trips&&p.trips.length){
    writeSheet(s,SN.TRIPS,COLS.trips,p.trips.map(t=>[
      t.id,t.plant,t.location,t.date,t.dateEnd,
      t.purpose,t.contact,t.transport,t.status,
      t.notes||'',t.createdAt
    ]));r.trips=p.trips.length;
  }

  if(p.tasks&&p.tasks.length){
    writeSheet(s,SN.TASKS,COLS.tasks,p.tasks.map(t=>[
      t.id,t.title,t.desc,t.category,
      t.dateStart,t.timeStart,t.dateEnd,t.timeEnd,
      t.hours,t.minutes,
      t.priority,t.period,t.machine,t.plan,t.tripId,t.status,
      t.checklist,t.checklistJson,
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
  Logger.log('PlantLog Database ready: '+s.getUrl());
  return s.getUrl();
}

function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
