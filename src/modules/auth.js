'use strict';
// =====================================================
// PlantLog — auth.js
// PIN security, lock/unlock, session management
// =====================================================

// ═══════ SECURITY / AUTH ═══════
const SEC_KEY = 'plprosec1';  // PlantLog Pro PIN key (separate from old app)

// Simple hash — enough for local PIN protection
// SHA-256 hash via Web Crypto — async but we use sync FNV fallback for instant UI
// PIN is stored as SHA-256 hex when Web Crypto available, FNV-1a otherwise
let _hashMode = 'fnv';  // updated to 'sha256' after first async hash
function hashPIN(pin) {
  // FNV-1a 32-bit (synchronous fallback — used for lock screen checks)
  let h = 0x811c9dc5;
  for (let i = 0; i < pin.length; i++) {
    h ^= pin.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return 'fnv_' + h.toString(16).padStart(8,'0');
}
async function hashPINAsync(pin, salt) {
  // Try crypto.subtle SHA-256 for compatibility with older stored hashes
  const s = (salt !== undefined) ? salt : 'plprosalt_';
  try {
    const enc = new TextEncoder().encode(s + pin);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const hex = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    return 'sha_' + hex;
  } catch(e) {
    return hashPIN(pin); // FNV fallback
  }
}

function getStoredHash() {
  try { return localStorage.getItem(SEC_KEY) || ''; } catch(e) { return ''; }
}
function storeHash(hash) {
  try { localStorage.setItem(SEC_KEY, hash); } catch(e) {}
}
function hasPIN() { return !!getStoredHash(); }

// ── Lock screen state ──────────────────────────────────────
let pinBuffer = '';
let pinMode = 'login';
let _pendingScreen = null;    // 'login' | 'setup_new' | 'setup_confirm' | 'change_old'
let pinFirst = '';        // stores first entry during setup confirm step
let _lockTimer = null;
let _isLocked = false;
const AUTO_LOCK_MS = 5 * 60 * 1000;  // 5 minutes

function resetAutoLock() {
  clearTimeout(_lockTimer);
  if (hasPIN()) {
    _lockTimer = setTimeout(lockApp, AUTO_LOCK_MS);
  }
}

document.addEventListener('touchstart', resetAutoLock, { passive: true });
document.addEventListener('click', resetAutoLock);

function lockApp() {
  if (!hasPIN()) return;
  _isLocked = true;
  _settingsUnlocked = false;
  pinBuffer = '';
  pinMode = 'login';
  updatePinDots('lock');
  document.getElementById('lock-title').textContent = 'Enter PIN';
  document.getElementById('lock-error').textContent = '';
  document.getElementById('lock-forgot').style.display = 'block';
  document.getElementById('screen-lock').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function unlockApp() {
  _isLocked = false;
  document.getElementById('screen-lock').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  resetAutoLock();
}

// ── PIN key handlers (lock screen) ────────────────────────
function pinKey(digit) {
  if (pinBuffer.length >= 4) return;
  pinBuffer += digit;
  updatePinDots('lock');
  if (pinBuffer.length === 4) {
    setTimeout(() => checkPIN(), 80);
  }
}

function pinBackspace() {
  if (pinBuffer.length > 0) {
    pinBuffer = pinBuffer.slice(0, -1);
    updatePinDots('lock');
  }
}

function updatePinDots(which) {
  const prefix = which === 'lock' ? 'pd' : 'mpd';
  const buf = which === 'lock' ? pinBuffer : modalPinBuffer;
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(prefix + i);
    if (dot) dot.classList.toggle('filled', i < buf.length);
  }
}

function checkPIN() {
  const stored = getStoredHash();
  const entered = pinBuffer;
  pinBuffer = ''; // clear immediately

  if (!stored) { unlockApp(); return; }

  // Try FNV hash first (current format)
  const fnvHash = hashPIN(entered);
  if (fnvHash === stored) {
    unlockApp(); updatePinDots('lock'); return;
  }

  // Try all SHA-256 variants (from older app versions)
  // This handles PINs set with old code using crypto.subtle
  const salts = ['plprosalt_', 'pl4salt_', 'plsalt_', ''];
  let matched = false;

  if (stored.startsWith('sha_')) {
    // Try each salt variant
    const shaChecks = salts.map(salt =>
      hashPINAsync(entered, salt).then(h => {
        if (h === stored && !matched) {
          matched = true;
          // Upgrade to FNV so future logins are instant
          storeHash(fnvHash);
          unlockApp();
          updatePinDots('lock');
        }
      }).catch(() => {})
    );
    Promise.all(shaChecks).then(() => {
      if (!matched) showPINError();
    });
    return;
  }

  // No match found
  showPINError();
}

function showPINError() {
  for(let i=0;i<4;i++){
    const d=document.getElementById('pd'+i);
    if(d){d.classList.remove('filled');d.classList.add('error');}
  }
  const le=document.getElementById('lock-error');
  if(le) le.textContent='Incorrect PIN — try again';
  setTimeout(()=>{
    for(let i=0;i<4;i++){const d=document.getElementById('pd'+i);if(d)d.classList.remove('error');}
    const le2=document.getElementById('lock-error');
    if(le2) le2.textContent='';
    pinBuffer='';
    updatePinDots('lock');
  }, 800);
}

function pinForgot() {
  if (confirm('Reset PIN?\n\nThis will remove PIN protection. You will need to set a new PIN in Settings.')) {
    storeHash('');
    unlockApp();
    showToast('PIN removed. Set a new PIN in Settings.');
    updatePINStatusLabel();
  }
}

// ── Modal PIN (setup / change) ─────────────────────────────
let modalPinBuffer = '';
let modalPinStep = 'new';    // 'old' | 'new' | 'confirm'
let modalPinFirst = '';

function openChangePIN() {
  modalPinBuffer = '';
  modalPinFirst = '';
  document.getElementById('pin-modal-error').textContent = '';
  document.getElementById('pin-modal-remove').style.display = hasPIN() ? '' : 'none';
  if (hasPIN()) {
    modalPinStep = 'old';
    document.getElementById('pin-modal-title').textContent = 'Change PIN';
    document.getElementById('pin-modal-sub').textContent = 'Enter your current PIN first';
  } else {
    modalPinStep = 'new';
    document.getElementById('pin-modal-title').textContent = 'Set App PIN';
    document.getElementById('pin-modal-sub').textContent = 'Choose a 4-digit PIN to protect your app';
  }
  updatePinDots('modal');
  openModal('modal-pin');
}

function modalPinKey(digit) {
  if (modalPinBuffer.length >= 4) return;
  modalPinBuffer += digit;
  updatePinDots('modal');
  if (modalPinBuffer.length === 4) {
    setTimeout(() => processModalPIN(), 80);
  }
}

function modalPinBackspace() {
  if (modalPinBuffer.length > 0) {
    modalPinBuffer = modalPinBuffer.slice(0, -1);
    updatePinDots('modal');
  }
}

function processModalPIN() {
  if (modalPinStep === 'old') {
    // Verify current PIN — handle both sha_ and fnv_ formats
    const stored=getStoredHash();
    const syncMatch=hashPIN(modalPinBuffer)===stored;
    const doVerify=(match)=>{
      if(match){
        // Check if this was a Settings gate request
        if (_pendingScreen === 'settings') {
          _settingsUnlocked = true; _pendingScreen = null;
          closeModal('modal-pin'); modalPinBuffer = '';
          document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
          document.getElementById('screen-settings').classList.add('active');
          updatePINStatusLabel();
          return;
        }
        modalPinBuffer=''; modalPinStep='new'; updatePinDots('modal');
        document.getElementById('pin-modal-sub').textContent='Enter your new 4-digit PIN';
        document.getElementById('pin-modal-error').textContent='';
      } else { flashModalError('Incorrect current PIN'); }
    };
    if(stored.startsWith('sha_')){hashPINAsync(modalPinBuffer).then(h=>doVerify(h===stored)).catch(()=>doVerify(hashPIN(modalPinBuffer)===stored));}
    else{doVerify(syncMatch);}
  } else if (modalPinStep === 'new') {
    if (modalPinBuffer === '0000' || modalPinBuffer === '1234' || modalPinBuffer === '1111') {
      flashModalError('PIN too simple — choose another');
      return;
    }
    modalPinFirst = modalPinBuffer;
    modalPinBuffer = '';
    modalPinStep = 'confirm';
    updatePinDots('modal');
    document.getElementById('pin-modal-sub').textContent = 'Confirm your PIN';
    document.getElementById('pin-modal-error').textContent = '';
  } else if (modalPinStep === 'confirm') {
    if (modalPinBuffer === modalPinFirst) {
      // Store as FNV (synchronous, always available on any device/browser)
      const pinHash = hashPIN(modalPinBuffer);
      storeHash(pinHash);
      updatePINStatusLabel();
      resetAutoLock();
      closeModal('modal-pin');
      showToast('PIN set successfully 🔐');
    } else {
      flashModalError("PINs don't match — try again");
      modalPinBuffer = '';
      modalPinStep = 'new';
      modalPinFirst = '';
      updatePinDots('modal');
      setTimeout(() => {
        document.getElementById('pin-modal-sub').textContent = 'Choose a 4-digit PIN';
        document.getElementById('pin-modal-error').textContent = '';
      }, 1200);
    }
  }
}

function flashModalError(msg) {
  for (let i = 0; i < 4; i++) {
    const d = document.getElementById('mpd' + i);
    if (d) { d.classList.remove('filled'); d.classList.add('error'); }
  }
  document.getElementById('pin-modal-error').textContent = msg;
  setTimeout(() => {
    for (let i = 0; i < 4; i++) {
      const d = document.getElementById('mpd' + i);
      if (d) d.classList.remove('error');
    }
    modalPinBuffer = '';
    updatePinDots('modal');
  }, 800);
}

function removePIN() {
  if (!confirm('Remove PIN protection?\n\nAnyone with access to your device will be able to open the app.')) return;
  storeHash('');
  closeModal('modal-pin');
  showToast('PIN removed');
  updatePINStatusLabel();
  clearTimeout(_lockTimer);
}

function updatePINStatusLabel() {
  const el = document.getElementById('pin-status-label');
  if (el) el.textContent = hasPIN() ? 'Active — tap to change or remove' : 'Tap to set up a 4-digit PIN';
  const lockRow = document.getElementById('lock-now-row');
  if (lockRow) lockRow.style.display = hasPIN() ? '' : 'none';
}

// ── Startup auth check ─────────────────────────────────────
function authInit() {
  const appEl  = document.getElementById('app');
  const lockEl = document.getElementById('screen-lock');

  function showApp()  { if(appEl) appEl.style.display  = 'flex'; if(lockEl) lockEl.style.display = 'none'; }
  function showLock() { if(lockEl) lockEl.style.display = 'flex'; if(appEl) appEl.style.display = 'none'; }
  function hideLock() { if(lockEl) lockEl.style.display = 'none'; }

  if (hasPIN()) {
    lockApp();
  } else {
    hideLock();
    showApp();
    setTimeout(() => {
      try {
        if (!hasPIN()) showToast('💡 Tip: Set a PIN in Settings to protect your data');
      } catch(e) {}
    }, 3000);
  }
  try { updatePINStatusLabel(); } catch(e){}
}

// ── pinDel alias (used by old HTML references) ──────────────
function pinDel() { pinBackspace(); }

// ── showResetPIN ─────────────────────────────────────────────
function showResetPIN() {
  document.getElementById('lock-forgot').style.display = 'block';
  if (confirm('Reset your PIN?\n\nYou will lose PIN protection until you set a new one in Settings → Change PIN.')) {
    storeHash('');
    unlockApp();
    showToast('PIN removed — set a new PIN in Settings');
    updatePINStatusLabel();
  }
}

// ── Settings lock: requires re-auth to enter Settings ────────
let _settingsUnlocked = false;

function requireSettingsPIN() {
  // If no PIN set, or already authenticated this session, allow
  if (!hasPIN() || _settingsUnlocked) return true;
  // Show settings lock modal
  openChangePIN(); // reuse the PIN modal — it verifies current PIN first
  return false;
}

// Override showScreen to gate Settings behind PIN
const _origShowScreen = showScreen;
// We patch this at the call site instead — see showScreen below

// ── chPinKey / chPinDel aliases (used by old HTML if present) ─
function chPinKey(d) { modalPinKey(d); }
function chPinDel() { modalPinBackspace(); }

// ── settingsPinKey / settingsPinDel (also alias to modal) ─────
function settingsPinKey(d) { modalPinKey(d); }
function settingsPinDel() { modalPinBackspace(); }

