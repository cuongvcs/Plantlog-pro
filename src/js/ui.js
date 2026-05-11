/**
 * PlantLog v4 — UI MODULE
 * Screen nav, modals, toast
 * Lines 216–282 of original monolithic file
 */


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
