/**
 * PlantLog v4 — STATE MODULE
 * State, templates, init, PWA, notifications, lang
 * Lines 88–215 of original monolithic file
 */

// ═══════ INDUSTRY TEMPLATES ═══════
const IND={
  oil:['Safety pressure relief valves','Pipeline corrosion inspection','Fire & gas detection system','Flare stack condition','Emergency shutdown valves','Tank level gauges calibration','Pump mechanical seals','Compressor vibration check','PPE availability & condition','Spill containment condition'],
  power:['Generator output readings','Transformer oil level','Circuit breaker condition','Cooling system inspection','Battery backup systems','Earthing & bonding check','Cable tray condition','Control panel interlocks','Steam trap operation','Turbine bearing temperature'],
  mfg:['Machine guarding condition','Emergency stop buttons','Hydraulic system pressure','Conveyor belt alignment','Lubrication levels check','Air compressor operation','Fire extinguisher placement','Electrical panel condition','Ventilation system','Quality inspection equipment'],
  chemical:['Chemical storage labeling','Bund wall integrity','Fume hood operation','Emergency eyewash stations','Pressure vessel inspection','Leak detection survey','Hazmat PPE availability','Scrubber system operation','Waste disposal records','Safety shower test'],
  water:['Chlorine dosing system','pH monitoring equipment','Turbidity meters calibration','Pump station operation','Filter media condition','UV disinfection units','Sludge level readings','Flow meter accuracy','Overflow protection','SCADA system status'],
  food:['Temperature logger calibration','CIP system operation','Allergen separation check','Pest control records','Cold chain verification','Hygiene station availability','Conveyor cleanliness','Metal detector test','Packaging seal integrity','HACCP record review']
};

// ═══════ STATE ═══════
let S={
  profile:{name:'',title:'',company:'',empid:''},
  trips:[],reports:{},tasks:[],leaveData:{},
  machines:[],plans:[],bills:[],
  templates:['Safety pressure valves','Fire suppression system','Emergency stop buttons','PPE compliance check','Electrical panel condition','Pipe insulation condition'],
  defaultTeam:[],lang:'en'
};
let curTrip=null,curReport=null,sigCanvas,sigCtx,isDrw=false;
let calY,calM,selDay=null,signoffRes='Completed';
let photoCtx=null,tmpPhotos=[];
let taskView='list',taskFilter='all';
let deferredPrompt=null;

function sv(){try{localStorage.setItem('pl3',JSON.stringify(S));}catch(e){}}
function ld(){try{const d=localStorage.getItem('pl3');if(d)S={...S,...JSON.parse(d)};}catch(e){}}
function t(k){return T[S.lang][k]||T.en[k]||k;}

// ═══════ PWA ═══════
function setupPWA(){
  // Dynamic manifest
  const manifest={
    name:'PlantLog',short_name:'PlantLog',
    description:'Field Visit & Plant Report App',
    start_url:'./',display:'standalone',scope:'./',
    background_color:'#ffffff',theme_color:'#1D9E75',
    orientation:'portrait-primary',
    icons:[
      {src:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="80" fill="%231D9E75"/><text y="380" font-size="380" x="66">🏭</text></svg>',sizes:'512x512',type:'image/svg+xml',purpose:'any maskable'},
      {src:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="30" fill="%231D9E75"/><text y="145" font-size="140" x="26">🏭</text></svg>',sizes:'192x192',type:'image/svg+xml'}
    ]
  };
  const blob=new Blob([JSON.stringify(manifest)],{type:'application/json'});
  document.getElementById('pwa-manifest').href=URL.createObjectURL(blob);

  // Service Worker for offline
  if('serviceWorker' in navigator){
    // Try relative sw.js first (GitHub Pages), fall back to inline
    navigator.serviceWorker.register('./sw.js').catch(()=>{
      // Inline SW for single-file mode
      const swCode=`const CACHE='pl4';const A=['./'];self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(A)).then(()=>self.skipWaiting()));});self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim());});self.addEventListener('fetch',e=>{if(e.request.url.includes('script.google.com'))return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});`;
      const swBlob=new Blob([swCode],{type:'application/javascript'});
      navigator.serviceWorker.register(URL.createObjectURL(swBlob)).catch(()=>{});
    });
  }

  // Install prompt
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();deferredPrompt=e;
    document.getElementById('pwa-install-bar').style.display='flex';
  });
  window.addEventListener('appinstalled',()=>{
    document.getElementById('pwa-install-bar').style.display='none';
    showToast('PlantLog installed on your phone! ✓');
  });
}
function installPWA(){if(deferredPrompt){deferredPrompt.prompt();deferredPrompt.userChoice.then(()=>{deferredPrompt=null;document.getElementById('pwa-install-bar').style.display='none';});}}

// ═══════ NOTIFICATIONS ═══════
async function requestNotifications(){
  if(!('Notification' in window)){showToast('Notifications not supported on this browser');return;}
  const perm=await Notification.requestPermission();
  if(perm==='granted'){
    showToast('Notifications enabled ✓');
    document.getElementById('notif-status').textContent='Enabled';
    document.getElementById('notif-prompt').style.display='none';
    scheduleNotifications();
  } else {
    showToast('Please allow notifications in browser settings');
    document.getElementById('notif-status').textContent='Not allowed';
  }
}
function scheduleNotifications(){
  if(Notification.permission!=='granted')return;
  const now=new Date();
  const today=now.toISOString().slice(0,10);
  const tomorrow=new Date(now.getTime()+86400000).toISOString().slice(0,10);
  // Check upcoming trips
  S.trips.filter(tr=>tr.status!=='completed'&&(tr.date===today||tr.date===tomorrow)).forEach(tr=>{
    const msg=tr.date===today?`🏭 Trip today: ${tr.plant}`:`🏭 Trip tomorrow: ${tr.plant} (${tr.location||''})`;
    setTimeout(()=>new Notification('PlantLog – Trip Reminder',{body:msg,icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%231D9E75"/><text y=".9em" font-size="70" x="15">🏭</text></svg>'}),500);
  });
  // Check due tasks
  S.tasks.filter(tk=>tk.status!=='done'&&(tk.date===today||tk.date===tomorrow)).forEach(tk=>{
    const msg=tk.date===today?`📋 Task due today: ${tk.title}`:`📋 Task due tomorrow: ${tk.title}`;
    setTimeout(()=>new Notification('PlantLog – Task Reminder',{body:msg,icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%231D9E75"/><text y=".9em" font-size="70" x="15">📋</text></svg>'}),1000);
  });
}
function checkNotifPrompt(){
  if('Notification' in window&&Notification.permission==='default'){
    document.getElementById('notif-prompt').style.display='flex';
  } else if(Notification.permission==='granted'){
    document.getElementById('notif-status').textContent='Enabled';
    scheduleNotifications();
  }
}

// ═══════ LANG ═══════
function setLang(l){
  S.lang=l;sv();
  document.getElementById('lang-en').classList.toggle('act',l==='en');
  document.getElementById('lang-vi').classList.toggle('act',l==='vi');
  document.body.style.fontFamily=l==='vi'?"'Be Vietnam Pro',sans-serif":"'DM Sans',sans-serif";
  applyT();renderDash();renderTripList();renderCalendar();renderTasks();
}
function applyT(){document.querySelectorAll('[data-t]').forEach(el=>{const v=T[S.lang][el.getAttribute('data-t')];if(v)el.textContent=v;});}

// ═══════ INIT ═══════
function init(){
  ld();setupPWA();
  // Hide app initially — authInit() will show it after PIN check
  document.getElementById('app').style.display='none';
  const now=new Date();calY=now.getFullYear();calM=now.getMonth();
  document.getElementById('today-date').textContent=now.toLocaleDateString(S.lang==='vi'?'vi-VN':'en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  loadProfile();renderDash();renderTripList();renderCalendar();renderTasks();
  initSig();renderTemplates();renderDefaultTeam();
  setLang(S.lang||'en');checkNotifPrompt();updateGSStatus();
}