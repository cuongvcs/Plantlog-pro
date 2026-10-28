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
  defaultTeam:[],lang:'en',
  telegramConfig:{token:'',chatId:'',notifyTrips:true,notifyTasks:true,notifyLeave:true},
  calendarConfig:{calId:'',pushTrips:true,pushTasks:true,pullEvents:true},
  reminders:[]  // [{id, title, freq:'daily'|'weekly'|'monthly'|'yearly', weekday, monthday, yearMonth, yearDay, time, note, notifyTele, notifyCalendar, status:'active'|'paused', createdAt}]
};
let curTrip=null,curReport=null,sigCanvas,sigCtx,isDrw=false;
let calY,calM,selDay=null,signoffRes='Completed';
let photoCtx=null,tmpPhotos=[];
let taskView='list',taskFilter='all';
let deferredPrompt=null;

function sv(){
  try{
    localStorage.setItem('plpro1',JSON.stringify(S));
  }catch(e){
    console.error('[PlantLog] LocalStorage save error:', e);
    if(e.name==='QuotaExceededError'||e.code===22||e.code===1014||(e.message&&e.message.toLowerCase().includes('quota'))){
      if(typeof showToast==='function'){
        showToast('⚠️ Bộ nhớ máy bị đầy (LocalStorage Quota)! Vui lòng xóa bớt ảnh hoặc đồng bộ dữ liệu.', 6000);
      }
    }
  }
}
function ld(){try{const d=localStorage.getItem('plpro1');if(d)S={...S,...JSON.parse(d)};}catch(e){}}
function t(k){return T[S.lang][k]||T.en[k]||k;}

// ═══════ STORAGE & IMAGE OPTIMIZATION (IMP-01) ═══════
function getStorageUsage(){
  try {
    let total = 0;
    for (let x in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, x)) {
        total += ((localStorage[x].length + x.length) * 2);
      }
    }
    return {
      usedBytes: total,
      usedMB: (total / (1024 * 1024)).toFixed(2),
      percent: Math.min(100, Math.round((total / (5 * 1024 * 1024)) * 100))
    };
  } catch(e) {
    return { usedBytes: 0, usedMB: '0', percent: 0 };
  }
}

/**
 * Nén ảnh tự động tại Client qua Canvas (IMP-01)
 * Giảm dung lượng ảnh từ 3MB - 12MB xuống ~150KB - 250KB JPEG (giảm 97%)
 * @param {File|Blob|string} source - Tệp ảnh hoặc Data URL
 * @param {number} [maxDimension=1280] - Chiều tối đa (width/height)
 * @param {number} [quality=0.72] - Chất lượng nén JPEG (0 - 1)
 * @returns {Promise<string>} Chuỗi Data URL đã được nén
 */
function compressImageFile(source, maxDimension = 1280, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!source) return resolve('');

    // Nếu là Blob/File không phải ảnh (PDF, text, ...), đọc thẳng DataURL
    if (source instanceof Blob && source.type && !source.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = e => resolve(e.target.result);
      r.onerror = reject;
      r.readAsDataURL(source);
      return;
    }

    const processImg = (img) => {
      try {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;

        if (!w || !h) {
          return resolve(typeof source === 'string' ? source : '');
        }

        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            h = Math.round((h * maxDimension) / w);
            w = maxDimension;
          } else {
            w = Math.round((w * maxDimension) / h);
            h = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(typeof source === 'string' ? source : '');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch (err) {
        console.warn('[compressImageFile] Canvas compression error:', err);
        if (typeof source === 'string') resolve(source);
        else {
          const r = new FileReader();
          r.onload = e => resolve(e.target.result);
          r.onerror = reject;
          r.readAsDataURL(source);
        }
      }
    };

    const img = new Image();
    if (typeof source === 'string') {
      img.onload = () => processImg(img);
      img.onerror = () => resolve(source);
      img.src = source;
    } else if (source instanceof Blob) {
      const objUrl = URL.createObjectURL(source);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        processImg(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        const r = new FileReader();
        r.onload = ev => resolve(ev.target.result);
        r.onerror = reject;
        r.readAsDataURL(source);
      };
      img.src = objUrl;
    } else {
      resolve('');
    }
  });
}

// ═══════ DATA BACKUP & RESTORE (IMP-06) ═══════
function exportDataBackupJSON() {
  try {
    const backupObj = {
      app: 'VCS PlantLog Pro',
      version: 'v4.9',
      exportDate: new Date().toISOString(),
      data: S
    };
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `PlantLog_Backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if(typeof showToast === 'function') showToast('✓ Đã xuất file sao lưu JSON thành công!');
  } catch (e) {
    console.error('[Backup]', e);
    if(typeof showToast === 'function') showToast('Lỗi khi xuất file sao lưu: ' + e.message);
  }
}

function importDataBackupJSON() {
  const input = document.getElementById('backup-json-input');
  if (input) {
    input.value = '';
    input.click();
  }
}

function handleBackupFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      const incomingData = parsed.data || parsed;
      if (!incomingData || typeof incomingData !== 'object' || (!incomingData.trips && !incomingData.tasks && !incomingData.profile)) {
        if(typeof showToast === 'function') showToast('❌ Tệp sao lưu không đúng định dạng PlantLog Pro!');
        return;
      }

      if (!confirm('Bạn có chắc chắn muốn khôi phục dữ liệu từ tệp này? Dữ liệu hiện tại sẽ được cập nhật.')) {
        return;
      }

      S = { ...S, ...incomingData };
      sv();
      if(typeof showToast === 'function') showToast('✅ Khôi phục dữ liệu thành công!');

      // Re-render toàn bộ giao diện
      if (typeof renderDash === 'function') renderDash();
      if (typeof renderTripList === 'function') renderTripList();
      if (typeof renderTasks === 'function') renderTasks();
      if (typeof renderCalendar === 'function') renderCalendar();
      if (typeof loadProfile === 'function') loadProfile();
    } catch (err) {
      console.error('[Restore]', err);
      if(typeof showToast === 'function') showToast('❌ Lỗi đọc tệp JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ═══════ NETWORK STATUS INDICATOR (IMP-07) ═══════
function updateNetworkStatus() {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const badge = document.getElementById('net-status-badge');
  const dot = document.getElementById('net-dot');
  const text = document.getElementById('net-text');
  if (!badge || !dot || !text) return;

  if (isOnline) {
    dot.style.background = '#4ADE80';
    text.textContent = 'Online';
    badge.title = 'Đang kết nối Internet';
  } else {
    dot.style.background = '#F87171';
    text.textContent = 'Offline';
    badge.title = 'Mất kết nối Internet - Chạy chế độ Offline';
  }
}
if(typeof window !== 'undefined'){
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
}

// ═══════ PWA ═══════
function setupPWA(){
  // ── Clear old PlantLog v4 caches on every load ─────
  if('caches' in window){
    caches.keys().then(keys=>keys.forEach(k=>{
      if(k!=='plantlog-pro-v9'){
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
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        // SW registered — check for updates
        reg.update();
        console.log('[PlantLog] SW registered:', reg.scope);
      })
      .catch(err => {
        console.warn('[PlantLog] SW registration failed:', err);
        // For single-file mode: try registering an inline SW
        // This enables PWA install prompt on Android
        try {
          const swCode = [
            "const C='plpro-v8';",
            "self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./'])).then(()=>self.skipWaiting()));});",
            "self.addEventListener('activate',e=>{e.waitUntil(clients.claim());});",
            "self.addEventListener('fetch',e=>{",
            "  if(e.request.url.includes('script.google.com')||e.request.url.includes('googleapis.com'))return;",
            "  if(e.request.mode==='navigate'){",
            "    e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')||caches.match('./')));",
            "    return;",
            "  }",
            "  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));",
            "});"
          ].join('\n');
          const blob = new Blob([swCode], {type:'application/javascript'});
          const url = URL.createObjectURL(blob);
          navigator.serviceWorker.register(url).catch(e=>console.warn('[PlantLog] Inline SW failed:',e));
        } catch(e2) {}
      });
  }

  // Install prompt — fires when app meets PWA criteria
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if(!isStandalone){
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      console.log('[PlantLog] Install prompt available');
      const bar = document.getElementById('pwa-install-bar');
      if(bar) bar.style.display = 'flex';
    });
    window.addEventListener('appinstalled', () => {
      console.log('[PlantLog] App installed!');
      deferredPrompt = null;
      const bar = document.getElementById('pwa-install-bar');
      if(bar) bar.style.display = 'none';
      showToast('✓ PlantLog Pro installed!');
    });
    // On mobile phone, if not running in standalone mode, show install bar if not dismissed
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if(isMobile && !localStorage.getItem('plpro_pwa_dismissed')) {
      setTimeout(() => {
        const bar = document.getElementById('pwa-install-bar');
        if(bar) bar.style.display = 'flex';
      }, 1500);
    }
  }
}

function installPWA(){
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if(isStandalone){
    showToast('📱 App is already installed & running!');
    const bar = document.getElementById('pwa-install-bar');
    if(bar) bar.style.display = 'none';
    return;
  }
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(()=>{
      deferredPrompt = null;
      const bar = document.getElementById('pwa-install-bar');
      if(bar) bar.style.display = 'none';
    });
    return;
  }
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if(isIOS){
    alert('📱 Hướng dẫn cài đặt VCS PlantLog Pro trên iPhone / iPad:\n\n1. Bấm biểu tượng Chia sẻ (Share ⎋) ở thanh công cụ Safari bên dưới.\n2. Cuộn xuống chọn "Thêm vào Màn hình chính" (Add to Home Screen).\n3. Bấm "Thêm" ở góc phải để cài đặt.');
  } else {
    alert('📱 Hướng dẫn cài đặt VCS PlantLog Pro trên Android / Chrome:\n\n1. Bấm biểu tượng 3 chấm (⋮) ở góc trên bên phải Chrome.\n2. Chọn "Cài đặt ứng dụng" (Install App) hoặc "Thêm vào Màn hình chính".\n3. Nhấn Bật / Cài đặt.');
  }
}

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
  safeRun(updateNetworkStatus, 'updateNetworkStatus');

  // Auth MUST run last — it controls app visibility
  // Do NOT hide app before this — a crash would leave it blank
  safeRun(authInit, 'authInit');
  // Telegram: update status label + schedule daily notification check
  try{
    updateTelegramStatusLabel();
    if(typeof updateCalendarStatusLabel==='function') updateCalendarStatusLabel();
    // Check reminders on startup
    setTimeout(()=>{ try{if(typeof checkRemindersToday==='function')checkRemindersToday();}catch(e){} }, 2000);
    // Check once on startup (after 3s delay so UI is ready)
    setTimeout(()=>{ try{checkAndSendDailyNotifications();}catch(e){} }, 3000);
  }catch(e){}

  // ── Auto-start trips and tasks whose date has arrived (once per day) ──
  try{ autoStartTodayItems(); }catch(e){ console.warn('autoStart:',e); }

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

  // Auto-sync Google Calendar events (silent, 5s delay)
  setTimeout(()=>{
    try{ if(typeof autoSyncCalendar==='function') autoSyncCalendar(); }
    catch(e){}
  }, 5000);
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
  if(n==='reminders')renderRemindersScreen();
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
function closeModal(id){
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
  if (id === 'modal-voice-input' && typeof _activeRecognition !== 'undefined' && _activeRecognition) {
    try { _activeRecognition.abort(); } catch(e){}
    _activeRecognition = null;
  }
}
document.addEventListener('click',e=>{if(e.target.classList.contains('mo'))closeModal(e.target.id);});

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

// ── ISO-8601 Week Number Calculation (IMP-09) ─────────────────
function getWeekInfo(dateStr){
  if(!dateStr||typeof dateStr!=='string')return null;
  const dateOnly=dateStr.trim().slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly))return null;
  const[y,m,day]=dateOnly.split('-').map(Number);
  if(isNaN(y)||isNaN(m)||isNaN(day))return null;
  const d=new Date(y,m-1,day);
  if(isNaN(d.getTime()))return null;

  d.setHours(0,0,0,0);
  d.setDate(d.getDate()+4-(d.getDay()||7));
  const yearStart=new Date(d.getFullYear(),0,1);
  const weekNo=Math.ceil((((d-yearStart)/86400000)+1)/7);
  const year2d=String(d.getFullYear()).slice(-2);
  return {week:weekNo,year2d,year:d.getFullYear()};
}

function getTripWeekLabel(startDateStr,endDateStr){
  const startInfo=getWeekInfo(startDateStr);
  if(!startInfo)return'';
  const endInfo=(endDateStr&&endDateStr!==startDateStr)?getWeekInfo(endDateStr):null;
  if(!endInfo||(startInfo.week===endInfo.week&&startInfo.year===endInfo.year)){
    return `W${startInfo.week}/${startInfo.year2d}`;
  }
  if(startInfo.year===endInfo.year){
    return `W${startInfo.week}-W${endInfo.week}/${startInfo.year2d}`;
  }
  return `W${startInfo.week}/${startInfo.year2d}-W${endInfo.week}/${endInfo.year2d}`;
}

function getSortedTrips(){
  return [...(S.trips||[])].sort((a,b)=>{
    const dateA = a.dateEnd || a.date || '';
    const dateB = b.dateEnd || b.date || '';
    if(dateA !== dateB) return dateB.localeCompare(dateA);
    return (b.id||'').localeCompare(a.id||'');
  });
}
// ── Auto-start trips and tasks whose date has arrived ────────
function autoStartTodayItems(){
  const today = new Date().toISOString().slice(0,10);
  let changed = false;

  // ── Trips: planned → in_progress if start date reached ──
  (S.trips||[]).forEach(tr=>{
    if(tr.status !== 'planned') return;
    const start = tr.date||'';
    const end   = tr.dateEnd||tr.date||'';
    if(!start) return;
    // Trip starts today or has already started and not ended yet
    if(start <= today && end >= today){
      tr.status = 'in_progress';
      changed = true;
      console.log('[AutoStart] Trip started:', tr.plant, start);
    }
  });

  // ── Tasks: pending → in_progress if start date reached ──
  (S.tasks||[]).forEach(tk=>{
    if(tk.status !== 'pending') return;
    const start = tk.dateStart||tk.date||'';
    if(!start) return;
    const end = tk.dateEnd||tk.dateStart||tk.date||'';
    // Task starts today or is overdue (started in the past, not yet done)
    if(start <= today && end >= today){
      tk.status = 'in_progress';
      changed = true;
    }
  });

  if(changed){
    sv();
    // Auto-sync status update (in_progress) to Google Sheets immediately
    if(typeof syncToSheets === 'function'){
      syncToSheets().catch(e => console.warn('[AutoStart] Sync error:', e));
    }
    // Re-render affected screens
    try{ renderDash(); }catch(e){}
    try{ renderTripList(); }catch(e){}
    try{ renderTasks(); }catch(e){}
    showToast('📅 Schedule updated — tasks & trips set to Active');
  }

  // Mark as run today
  localStorage.setItem('plpro_autostart_date', today);
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

// ═══════ VOICE INPUT & TRANSLATION TO ENGLISH (IMP-08) ═══════
let _activeRecognition = null;
let _voiceTargetInputId = null;
let _voiceCallback = null;
let _lastTranslatedText = '';

async function translateViToEn(text) {
  if (!text || !text.trim()) return '';
  try {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=en&dt=t&q=' + encodeURIComponent(text.trim());
    const res = await fetch(url);
    if (!res.ok) throw new Error('Translate status ' + res.status);
    const data = await res.json();
    if (data && Array.isArray(data[0])) {
      return data[0].map(x => x[0]).filter(Boolean).join('');
    }
  } catch(e) {
    console.warn('[translateViToEn] Error translating:', e);
  }
  return text; // Fallback to original text if offline or error
}

// ── Speech Deduplication & Normalization Helper (IMP-08) ────────
function cleanSpeechText(text) {
  if (!text) return '';
  let cleaned = text.replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ');
  const deduped = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w) continue;
    if (deduped.length > 0) {
      const prev = deduped[deduped.length - 1];
      const prevLower = prev.toLowerCase();
      const currLower = w.toLowerCase();
      // Exact duplicate consecutive word ("motor motor" -> "motor")
      if (currLower === prevLower) continue;
      // Partial interim stem duplicate ("Moto motor" -> "motor")
      if (prevLower.length >= 3 && currLower.startsWith(prevLower)) {
        deduped[deduped.length - 1] = w;
        continue;
      }
      if (currLower.length >= 3 && prevLower.startsWith(currLower)) {
        continue;
      }
    }
    deduped.push(w);
  }
  return deduped.join(' ').trim();
}

function mergeSpeechSegments(results) {
  const finalTexts = [];
  let interimText = '';
  for (let i = 0; i < results.length; ++i) {
    const item = results[i];
    const transcript = item[0] ? item[0].transcript.trim() : '';
    if (!transcript) continue;
    if (item.isFinal) {
      if (finalTexts.length > 0) {
        const last = finalTexts[finalTexts.length - 1].toLowerCase();
        const curr = transcript.toLowerCase();
        // If next segment already includes previous segment (Android Chrome accumulation bug)
        if (curr.startsWith(last)) {
          finalTexts[finalTexts.length - 1] = transcript;
          continue;
        }
        if (last.endsWith(curr)) {
          continue;
        }
      }
      finalTexts.push(transcript);
    } else {
      interimText = transcript;
    }
  }
  let raw = finalTexts.join(' ');
  if (interimText) {
    const rawLower = raw.toLowerCase();
    const interimLower = interimText.toLowerCase();
    if (!rawLower.endsWith(interimLower)) {
      raw = raw ? (raw + ' ' + interimText) : interimText;
    }
  }
  return cleanSpeechText(raw);
}

function startVoiceToEnglish(targetId, onSavedCb) {
  _voiceTargetInputId = targetId;
  _voiceCallback = typeof onSavedCb === 'function' ? onSavedCb : null;
  _lastTranslatedText = '';

  // Always open modal first so user sees the dialog immediately
  if (typeof openModal === 'function') openModal('modal-voice-input');

  const statusEl = document.getElementById('voice-status');
  const viBox = document.getElementById('voice-transcript-vi');
  const enBox = document.getElementById('voice-result-en');
  const stopBtn = document.getElementById('voice-stop-btn');
  const insertBtn = document.getElementById('voice-insert-btn');

  if (viBox) { viBox.value = ''; viBox.placeholder = 'Listening to Vietnamese speech...'; }
  if (enBox) { enBox.value = ''; enBox.placeholder = 'English translation will appear here...'; }
  if (insertBtn) insertBtn.style.display = 'none';

  const SpeechRec = (typeof window !== 'undefined') && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!SpeechRec) {
    if (statusEl) statusEl.textContent = 'ℹ️ Speech recognition not supported in this browser. You can type in Vietnamese below and tap Translate.';
    if (viBox) viBox.placeholder = 'Type Vietnamese here, then tap Translate below...';
    if (stopBtn) { stopBtn.style.display = ''; stopBtn.textContent = '🔄 Translate to English'; }
    return;
  }

  if (statusEl) statusEl.textContent = '🔴 Listening (Vietnamese)... Speak into microphone';
  if (stopBtn) { stopBtn.style.display = ''; stopBtn.textContent = '⏹ Stop & Translate to English'; }

  try {
    if (_activeRecognition) {
      try { _activeRecognition.abort(); } catch(x) {}
    }
    const rec = new SpeechRec();
    rec.lang = 'vi-VN';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      const currentText = mergeSpeechSegments(event.results);
      if (viBox && currentText) viBox.value = currentText;
    };

    rec.onerror = (event) => {
      console.warn('[SpeechRec] Error:', event.error);
      if (event.error === 'not-allowed') {
        if (statusEl) statusEl.textContent = '⚠️ Microphone access denied. Please allow microphone in browser settings.';
      } else if (event.error !== 'no-speech') {
        if (statusEl) statusEl.textContent = '⚠️ Recognition error: ' + event.error;
      }
    };

    rec.onend = () => {
      _activeRecognition = null;
      if (statusEl && statusEl.textContent.includes('Listening')) {
        statusEl.textContent = '⏹ Recording stopped.';
      }
    };

    rec.start();
    _activeRecognition = rec;
  } catch(err) {
    console.error('[startVoiceToEnglish] Init error:', err);
    if (statusEl) statusEl.textContent = '⚠️ Cannot start microphone: ' + err.message;
  }
}

async function stopVoiceAndTranslate() {
  const statusEl = document.getElementById('voice-status');
  const viBox = document.getElementById('voice-transcript-vi');
  const enBox = document.getElementById('voice-result-en');
  const stopBtn = document.getElementById('voice-stop-btn');
  const insertBtn = document.getElementById('voice-insert-btn');

  if (_activeRecognition) {
    try { _activeRecognition.stop(); } catch(x) {}
    _activeRecognition = null;
  }

  const viText = viBox ? cleanSpeechText(viBox.value) : '';
  if (viBox) viBox.value = viText;
  if (!viText) {
    if (statusEl) statusEl.textContent = '⚠️ No speech detected. Please speak again.';
    return;
  }

  if (statusEl) statusEl.textContent = '⏳ Translating to English...';
  if (stopBtn) stopBtn.style.display = 'none';

  const enText = await translateViToEn(viText);
  _lastTranslatedText = enText;

  if (enBox) enBox.value = enText;
  if (statusEl) statusEl.textContent = '✅ Translated successfully!';
  if (insertBtn) {
    insertBtn.style.display = '';
    insertBtn.textContent = '💾 Insert to Notes & Save';
  }
}

function applyVoiceResultToInput() {
  const textToInsert = _lastTranslatedText || (document.getElementById('voice-result-en') && document.getElementById('voice-result-en').value) || (document.getElementById('voice-transcript-vi') && document.getElementById('voice-transcript-vi').value);
  if (!textToInsert) return;

  if (_voiceTargetInputId) {
    const el = document.getElementById(_voiceTargetInputId);
    if (el) {
      const cur = el.value.trim();
      el.value = cur ? cur + '\n' + textToInsert : textToInsert;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  if (_voiceCallback) {
    try { _voiceCallback(); } catch(x) {}
  }

  if (typeof closeModal === 'function') closeModal('modal-voice-input');
  if (typeof showToast === 'function') showToast('🎙️ English notes inserted & saved! ✓');
}

init();

