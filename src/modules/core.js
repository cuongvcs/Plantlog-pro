'use strict';
// =====================================================
// PlantLog — core.js
// State, translations, navigation, profile, utils
// =====================================================

// ═══════ TRANSLATIONS ═══════
const T={
  en:{
    home:'Home',trips:'Trips',tasks:'Tasks',leave:'Leave',settings:'Settings',
    tripsMonth:'Trips',pendingTasks:'Tasks today',leaveDays:'Leave days',
    upcomingTrips:'Upcoming trips',recentReports:'Recent reports',todayTasks:"Today's tasks",
    noTrips:'No upcoming trips. Tap + to create.',noReports:'No completed reports yet.',noTasks:'No tasks yet. Tap + to add.',
    myTrips:'My Trips',all:'All',planned:'Planned',inProgress:'In Progress',completed:'Completed',
    pending:'Pending',done:'Done',kanban:'Kanban',
    delete:'Delete',openReport:'Open Report',
    tab1:'1 Checklist',tab2:'2 Readings',tab3:'3 Issues',tab4:'4 Team',tab5:'5 Tasks',tab6:'6 Sign-off',
    inspectionChecklist:'INSPECTION CHECKLIST',addCheckItem:'Add item',nextReadings:'Next: Readings →',
    equipmentReadings:'EQUIPMENT READINGS',addReading:'Add reading',nextIssues:'Next: Issues →',
    noIssues:'No issues found.',addIssue:'Add issue',nextTeam:'Next: Team →',
    teamSignoffs:'TEAM & SIGN-OFFS',addTeamMember:'Add member',nextSignoff:'Next: Sign-off →',
    workSummary:'Work summary',result:'Result',remarks:'Remarks',
    engineerSig:'Signature',signHint:'Sign above with finger or stylus',clearSig:'Clear',
    exportPdf:'Export PDF',exportPdfReport:'Export Report',downloadPdf:'Download PDF',
    emailPdf:'Email Report',markCompleted:'Mark completed',
    leavePlanner:'Leave Planner',workTrip:'Work trip',holiday:'Holiday',tripDays:'Trip days',clearDay:'Clear day',
    addTaskForDay:'Add task for this day',
    fullName:'Full name',jobTitle:'Job title',company:'Company',employeeId:'Employee ID',
    defaultTeam:'Default Team',industryTemplates:'Industry templates',
    loadChecklistTemplates:'Load checklist for your industry',checklistTemplates:'Checklist templates',
    manageDefaultItems:'Manage default items',clearData:'Clear all data',
    notifications:'Notifications',enableNotif:'Enable notifications',notifDesc:'Get reminders for trips, tasks & leave',
    newTrip:'New Trip',plantName:'Plant name *',location:'Location',visitDate:'Date *',endDate:'End date',
    purposeScope:'Purpose',contactPerson:'Contact',transport:'Transport',saveTrip:'Save trip',cancel:'Cancel',
    newTask:'New Task',taskTitle:'Task title *',description:'Description',dueDate:'Due date *',time:'Time',
    priority:'Priority',linkedTrip:'Linked trip',saveTask:'Save task',
    itemName:'Item name *',notesOptional:'Notes',addItem:'Add',
    equipmentName:'Equipment *',value:'Value *',unit:'Unit',status:'Status',inSpec:'In spec',outOfRange:'Out of range',notes:'Notes',
    issueTitle:'Title *',details:'Details',severity:'Severity',recommendedAction:'Action',photoEvidence:'Photos',addPhoto:'Add photo',
    name:'Name *',rolePosition:'Role',organization:'Organization',signoffRequired:'Sign-off?',addMember:'Add',
    selectIndustry:'Select your industry:',
    emailReport:'Email Report',recipientEmail:'To *',ccEmail:'CC',subject:'Subject',message:'Message',send:'Send',
    done2:'Done',add:'Add',partial:'Partial',deferred:'Deferred',
    goodMorning:'Good morning',goodAfternoon:'Good afternoon',goodEvening:'Good evening',
    installApp:'Install PlantLog on your phone for offline use',install:'Install',
    taskOverdue:'Overdue',taskDueToday:'Due today',taskUpcoming:'Upcoming',
    noIssuesFound:'No issues.',noReadings:'No readings.',
    inProgress2:'In Progress'
  },
  vi:{
    home:'Trang chủ',trips:'Chuyến đi',tasks:'Nhiệm vụ',leave:'Nghỉ phép',settings:'Cài đặt',
    tripsMonth:'Chuyến đi',pendingTasks:'Việc hôm nay',leaveDays:'Ngày nghỉ',
    upcomingTrips:'Chuyến sắp tới',recentReports:'Báo cáo gần đây',todayTasks:'Nhiệm vụ hôm nay',
    noTrips:'Chưa có chuyến đi. Nhấn + để tạo.',noReports:'Chưa có báo cáo hoàn thành.',noTasks:'Chưa có nhiệm vụ. Nhấn + để thêm.',
    myTrips:'Chuyến của tôi',all:'Tất cả',planned:'Đã lên kế hoạch',inProgress:'Đang thực hiện',completed:'Hoàn thành',
    pending:'Chờ xử lý',done:'Xong',kanban:'Kanban',
    delete:'Xóa',openReport:'Mở báo cáo',
    tab1:'1 Danh mục',tab2:'2 Đo lường',tab3:'3 Sự cố',tab4:'4 Nhóm',tab5:'5 Nhiệm vụ',tab6:'6 Ký duyệt',
    inspectionChecklist:'DANH MỤC KIỂM TRA',addCheckItem:'Thêm mục',nextReadings:'Tiếp: Đo lường →',
    equipmentReadings:'SỐ LIỆU THIẾT BỊ',addReading:'Thêm số liệu',nextIssues:'Tiếp: Sự cố →',
    noIssues:'Không có sự cố.',addIssue:'Thêm sự cố',nextTeam:'Tiếp: Nhóm →',
    teamSignoffs:'NHÓM & KÝ DUYỆT',addTeamMember:'Thêm thành viên',nextSignoff:'Tiếp: Ký duyệt →',
    workSummary:'Tóm tắt công việc',result:'Kết quả',remarks:'Ghi chú',
    engineerSig:'Chữ ký',signHint:'Ký bằng ngón tay hoặc bút cảm ứng',clearSig:'Xóa',
    exportPdf:'Xuất PDF',exportPdfReport:'Xuất báo cáo',downloadPdf:'Tải PDF',
    emailPdf:'Gửi qua email',markCompleted:'Đánh dấu hoàn thành',
    leavePlanner:'Kế hoạch nghỉ phép',workTrip:'Công tác',holiday:'Ngày lễ',tripDays:'Ngày công tác',clearDay:'Xóa ngày',
    addTaskForDay:'Thêm nhiệm vụ cho ngày này',
    fullName:'Họ và tên',jobTitle:'Chức danh',company:'Công ty',employeeId:'Mã nhân viên',
    defaultTeam:'Nhóm mặc định',industryTemplates:'Mẫu theo ngành',
    loadChecklistTemplates:'Tải mẫu kiểm tra theo ngành',checklistTemplates:'Mẫu danh mục',
    manageDefaultItems:'Quản lý mẫu mặc định',clearData:'Xóa tất cả dữ liệu',
    notifications:'Thông báo',enableNotif:'Bật thông báo',notifDesc:'Nhắc nhở chuyến đi, nhiệm vụ & nghỉ phép',
    newTrip:'Chuyến mới',plantName:'Tên nhà máy *',location:'Địa điểm',visitDate:'Ngày thăm *',endDate:'Ngày kết thúc',
    purposeScope:'Mục đích',contactPerson:'Người liên hệ',transport:'Phương tiện',saveTrip:'Lưu chuyến',cancel:'Hủy',
    newTask:'Nhiệm vụ mới',taskTitle:'Tiêu đề *',description:'Mô tả',dueDate:'Ngày hạn *',time:'Giờ',
    priority:'Độ ưu tiên',linkedTrip:'Chuyến liên kết',saveTask:'Lưu nhiệm vụ',
    itemName:'Tên mục *',notesOptional:'Ghi chú',addItem:'Thêm',
    equipmentName:'Thiết bị *',value:'Giá trị *',unit:'Đơn vị',status:'Trạng thái',inSpec:'Đạt chuẩn',outOfRange:'Ngoài phạm vi',notes:'Ghi chú',
    issueTitle:'Tiêu đề *',details:'Chi tiết',severity:'Mức độ',recommendedAction:'Biện pháp',photoEvidence:'Ảnh',addPhoto:'Thêm ảnh',
    name:'Tên *',rolePosition:'Chức vụ',organization:'Đơn vị',signoffRequired:'Cần ký?',addMember:'Thêm',
    selectIndustry:'Chọn ngành để tải mẫu:',
    emailReport:'Gửi báo cáo',recipientEmail:'Đến *',ccEmail:'CC',subject:'Tiêu đề',message:'Nội dung',send:'Gửi',
    done2:'Xong',add:'Thêm',partial:'Một phần',deferred:'Hoãn lại',
    goodMorning:'Chào buổi sáng',goodAfternoon:'Chào buổi chiều',goodEvening:'Chào buổi tối',
    installApp:'Cài PlantLog lên điện thoại để dùng offline',install:'Cài đặt',
    taskOverdue:'Quá hạn',taskDueToday:'Hôm nay',taskUpcoming:'Sắp đến',
    noIssuesFound:'Không có sự cố.',noReadings:'Chưa có số liệu.',
    inProgress2:'Đang thực hiện'
  }
};

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
  trips:[],reports:{},tasks:[],leaveData:{},
  machines:[],plans:[],bills:[],
  inspections:[],
  library:[],  // [{id, name, type:'checklist'|'readings'|'issues', items:[], createdAt}]
  defaultTeam:[],lang:'en'
};
let curTrip=null,curReport=null,sigCanvas,sigCtx,isDrw=false;
let calY,calM,selDay=null,signoffRes='Completed';
let photoCtx=null,tmpPhotos=[];
let taskView='list',taskFilter='all';
let deferredPrompt=null;

function sv(){try{localStorage.setItem('plpro1',JSON.stringify(S));}catch(e){}}
function ld(){try{const d=localStorage.getItem('plpro1');if(d)S={...S,...JSON.parse(d)};}catch(e){}}
function t(k){return T[S.lang][k]||T.en[k]||k;}

// ═══════ PWA ═══════
function setupPWA(){
  // ── Clear old PlantLog v4 caches on every load ─────
  if('caches' in window){
    caches.keys().then(keys=>keys.forEach(k=>{
      if(k!=='plantlog-pro-v7'){
        console.log('[PlantLog] Deleting old cache:',k);
        caches.delete(k);
      }
    }));
  }
  // Unregister any old service workers not pointing to our sw.js
  if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(regs=>{
      regs.forEach(reg=>{
        const url=reg.active&&reg.active.scriptURL||'';
        if(url&&!url.endsWith('sw.js')){
          console.log('[PlantLog] Unregistering old SW:',url);
          reg.unregister();
        }
      });
    });
  }

  // Manifest is now a static file (manifest.json) — no dynamic blob needed
  // This ensures reliable PWA install and standalone mode (no address bar)

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
function safeRun(fn, name){
  try { fn(); }
  catch(e) { console.warn('PlantLog init error in '+name+':', e.message); }
}

function init(){
  ld(); setupPWA();
  // ALWAYS initialize calendar vars first
  const now = new Date();
  calY = now.getFullYear();
  calM  = now.getMonth();

  // Set today label safely
  const todayEl = document.getElementById('today-date');
  if(todayEl) todayEl.textContent = now.toLocaleDateString(
    S.lang==='vi'?'vi-VN':'en-GB',
    {weekday:'long',day:'numeric',month:'long',year:'numeric'}
  );

  // Run all render functions safely — a crash in one won't stop the rest
  safeRun(loadProfile,      'loadProfile');
  safeRun(renderDash,       'renderDash');
  safeRun(renderTripList,   'renderTripList');
  safeRun(renderCalendar,   'renderCalendar');
  safeRun(renderTasks,      'renderTasks');
  safeRun(initSig,          'initSig');
  safeRun(renderTemplates,  'renderTemplates');
  safeRun(renderDefaultTeam,'renderDefaultTeam');
  safeRun(() => setLang(S.lang||'en'), 'setLang');
  safeRun(checkNotifPrompt, 'checkNotifPrompt');
  safeRun(updateGSStatus,   'updateGSStatus');

  // Auth MUST run last — it controls app visibility
  // Do NOT hide app before this — a crash would leave it blank
  safeRun(authInit, 'authInit');

  // Auto-load from Google Sheets on start if URL is configured
  setTimeout(()=>{
    try{
      const gsUrl = (S && S.gsUrl) ? S.gsUrl : '';
      if(gsUrl && gsUrl.includes('/exec')){
        showToast('⟳ Syncing data…');
        loadFromSheets(false);
      }
    }catch(e){ console.warn('Auto-load error:', e); }
  }, 1000);
}

// ═══════ SCREEN NAV ═══════
function showScreen(n){
  // Gate Settings behind PIN if set
  if (n === 'settings' && hasPIN() && !_settingsUnlocked) {
    _pendingScreen = 'settings';
    modalPinBuffer = '';
    modalPinFirst = '';
    modalPinStep = 'old';
    document.getElementById('pin-modal-title').textContent = '🔒 Settings';
    document.getElementById('pin-modal-sub').textContent = 'Enter your PIN to access Settings';
    document.getElementById('pin-modal-error').textContent = '';
    document.getElementById('pin-modal-remove').style.display = 'none';
    updatePinDots('modal');
    openModal('modal-pin');
    return;
  }
  // Reset settings unlock when navigating away
  if (n !== 'settings') _settingsUnlocked = false;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+n).classList.add('active');
  if(n==='home')renderDash();
  if(n==='trips')renderTripList();
  if(n==='tasks')renderTasks();
  if(n==='bills')renderBillsScreen();
  if(n==='export'){saveSignoff();buildPDFPreview();populateReportName();}
  if(n==='leave')renderCalendar();
  if(n==='library')renderLibrary();
  if(n==='inspection')renderInspectionScreen();
  if(n==='settings'&&hasPIN()&&!_settingsUnlocked){
    _pendingScreen='settings';
    openModal('modal-pin');
    return; // Don't navigate yet — openModal will navigate after PIN
  }
  if(n==='bill-export')buildBillPDFPreview();
}
function showToast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800);}
function openModal(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.classList.add('open');
  // Prevent the opening click from immediately re-closing via backdrop listener
  el.addEventListener('click',e=>e.stopPropagation(),{once:true});
  if(id==='modal-check-templates')renderTemplates();
  if(id==='modal-new-task'){populateTaskTripSelect();populateMachineSelect();populatePlanSelect();}
  if(id==='modal-add-reading'){rdType='condition';setReadingType('condition');}
}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('click',e=>{if(e.target.classList.contains('mo'))e.target.classList.remove('open');});

// ═══════ PROFILE ═══════
function loadProfile(){
  document.getElementById('pref-name').value=S.profile.name||'';
  document.getElementById('pref-title').value=S.profile.title||'';
  document.getElementById('pref-company').value=S.profile.company||'';
  document.getElementById('pref-empid').value=S.profile.empid||'';
  updateProfileDisplay();
}
function saveProfile(){
  S.profile.name=document.getElementById('pref-name').value;
  S.profile.title=document.getElementById('pref-title').value;
  S.profile.company=document.getElementById('pref-company').value;
  S.profile.empid=document.getElementById('pref-empid').value;
  sv();updateProfileDisplay();
}
function updateProfileDisplay(){
  const n=S.profile.name||'PL';
  const ini=n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('home-av').textContent=ini;
  document.getElementById('settings-av').textContent=ini;
  document.getElementById('s-name-d').textContent=S.profile.name||'Set your name';
  document.getElementById('s-title-d').textContent=[S.profile.title,S.profile.company].filter(Boolean).join(' · ')||'Add title & company';
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

// ═══════ UTILS ═══════
function fmtDate(d){
  if(!d||d==='—'||d==='undefined'||d==='null'||d==='')return'—';
  // Reject time strings like '08:00', '17:30' — these are NOT dates
  if(/^\d{2}:\d{2}/.test(String(d).trim()))return'—';
  try{
    // Strip any existing time part, keep only YYYY-MM-DD
    const dateOnly=String(d).trim().slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly))return'—';
    const[y,m,day]=dateOnly.split('-').map(Number);
    if(isNaN(y)||isNaN(m)||isNaN(day))return String(d);
    // Use explicit parts to avoid timezone offset issues
    const dt=new Date(y,m-1,day);
    return dt.toLocaleDateString(S.lang==='vi'?'vi-VN':'en-GB',{day:'numeric',month:'short',year:'numeric'});
  }catch(e){return String(d);}
}
function clearAllData(){if(!confirm('Delete ALL data? This cannot be undone.'))return;S={profile:{name:'',title:'',company:'',empid:''},trips:[],reports:{},tasks:[],leaveData:{},machines:[],plans:[],bills:[],inspections:[],library:[],templates:['Safety pressure valves','Fire suppression system','Emergency stop buttons','PPE compliance check','Electrical panel condition','Pipe insulation condition'],defaultTeam:[],lang:S.lang};sv();loadProfile();renderDash();renderTripList();renderCalendar();renderTasks();renderDefaultTeam();showToast('Data cleared');}


// ═══════ STORE — lightweight reactive state ═══════════════
const Store = {
  _listeners: {},
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },
  emit(event, data) {
    (this._listeners[event] || []).forEach(fn => {
      try { fn(data); } catch(e) { console.warn('Store.emit error', event, e); }
    });
  },
  // Commit saves data and fires the relevant event
  commit(action, payload) {
    sv(); // persist to localStorage
    this.emit(action, payload);
    this.emit('*', { action, payload }); // wildcard listener
  }
};

// Wire up global auto-render on data changes
Store.on('trip:save',    () => { renderTripList(); renderDash(); });
Store.on('trip:delete',  () => { renderTripList(); renderDash(); });
Store.on('task:save',    () => { renderTasks(); renderDash(); renderCalendar(); });
Store.on('task:status',  () => { renderTasks(); renderDash(); });
Store.on('bill:save',    () => { renderBillsScreen(); renderDash(); });
Store.on('leave:save',   () => { renderCalendar(); renderDash(); });
Store.on('*',            ({ action }) => {
  // Auto-sync to Google Sheets on any commit
  if (S.gsUrl) svAndSync(action);
});

init();
