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
  return 'fnv_' + h.toString(16).padStart(8, '0');
}
async function hashPINAsync(pin, salt) {
  // Try crypto.subtle SHA-256 for compatibility with older stored hashes
  const s = (salt !== undefined) ? salt : 'plprosalt_';
  try {
    const enc = new TextEncoder().encode(s + pin);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return 'sha_' + hex;
  } catch (e) {
    return hashPIN(pin); // FNV fallback
  }
}

function getStoredHash() {
  try { return localStorage.getItem(SEC_KEY) || ''; } catch (e) { return ''; }
}
function storeHash(hash) {
  try { localStorage.setItem(SEC_KEY, hash); } catch (e) { }
}
function hasPIN() { return !!getStoredHash(); }

// ── Lock screen state ──────────────────────────────────────
let pinBuffer = '';
let pinMode = 'login';
let _pendingScreen = null;    // 'login' | 'setup_new' | 'setup_confirm' | 'change_old'
let pinFirst = '';        // stores first entry during setup confirm step
let _lockTimer = null;
let _isLocked = false;
let _hiddenAt = 0;

// ── App Lock Configuration Helpers (IMP-58) ──────────────────
function getAutoLockIdleMs() {
  const val = (typeof localStorage !== 'undefined' && localStorage.getItem('plpro_lock_idle')) ||
    (typeof S !== 'undefined' && S.securityConfig && S.securityConfig.idle) || '2m';
  if (val === 'never' || val === '0') return 0;
  if (val === '30s') return 30 * 1000;
  if (val === '1m' || val === '1') return 60 * 1000;
  if (val === '2m' || val === '2') return 2 * 60 * 1000;
  if (val === '3m' || val === '3') return 3 * 60 * 1000;
  if (val === '4m' || val === '4') return 4 * 60 * 1000;
  if (val === '5m' || val === '5') return 5 * 60 * 1000;
  if (val === '10m' || val === '10') return 10 * 60 * 1000;
  const num = parseInt(val, 10);
  return isNaN(num) ? 2 * 60 * 1000 : num * 60 * 1000;
}

function getLockOnExitSetting() {
  return (typeof localStorage !== 'undefined' && localStorage.getItem('plpro_lock_exit')) ||
    (typeof S !== 'undefined' && S.securityConfig && S.securityConfig.exit) || '1m';
}

function getLockOnExitMs() {
  const val = getLockOnExitSetting();
  if (val === 'immediate' || val === '0') return 0;
  if (val === 'never') return -1; // -1 means never lock on background
  if (val === '30s') return 30 * 1000;
  if (val === '1m' || val === '1') return 60 * 1000;
  if (val === '2m' || val === '2') return 2 * 60 * 1000;
  if (val === '3m' || val === '3') return 3 * 60 * 1000;
  if (val === '4m' || val === '4') return 4 * 60 * 1000;
  if (val === '5m' || val === '5') return 5 * 60 * 1000;
  const num = parseInt(val, 10);
  return isNaN(num) ? 60 * 1000 : num * 60 * 1000;
}

function resetAutoLock() {
  clearTimeout(_lockTimer);
  _lockTimer = null;
  if (hasPIN() && !_isLocked) {
    const idleMs = getAutoLockIdleMs();
    if (idleMs > 0) {
      _lockTimer = setTimeout(lockApp, idleMs);
    }
  }
}

// Global user activity listeners in CAPTURE phase so stopPropagation() cannot block reset
if (typeof window !== 'undefined') {
  const ACTIVITY_EVENTS = [
    'touchstart',
    'touchmove',
    'touchend',
    'pointerdown',
    'mousedown',
    'keydown',
    'scroll',
    'input',
    'wheel'
  ];
  ACTIVITY_EVENTS.forEach(evt => {
    window.addEventListener(evt, resetAutoLock, { capture: true, passive: true });
  });
}

// Background / Visibility change / App switch handling (IMP-58)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      _hiddenAt = Date.now();
      const exitMs = getLockOnExitMs();
      if (hasPIN() && !_isLocked && exitMs === 0) {
        // Immediate lock on exit / app switch
        lockApp();
      }
    } else if (document.visibilityState === 'visible') {
      const exitMs = getLockOnExitMs();
      if (hasPIN() && !_isLocked && exitMs > 0 && _hiddenAt && (Date.now() - _hiddenAt >= exitMs)) {
        lockApp();
      }
      _hiddenAt = 0;
      resetAutoLock();
    }
  });

  // Also support pagehide (mobile browser swipe-to-close / swipe-away)
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
      const exitMs = getLockOnExitMs();
      if (hasPIN() && !_isLocked && exitMs === 0) {
        lockApp();
      }
    });
  }
}

function lockApp() {
  if (!hasPIN()) return;
  _isLocked = true;
  if (typeof window !== 'undefined') window._appUnlocked = false;
  try { if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('pl_unlocked'); } catch (e) { }
  _settingsUnlocked = false;
  pinBuffer = '';
  pinMode = 'login';
  clearTimeout(_lockTimer);
  _lockTimer = null;
  const lockEl = document.getElementById('screen-lock');
  const appEl = document.getElementById('app');
  if (lockEl) lockEl.style.display = 'flex';
  if (appEl) appEl.style.display = 'none';
  try {
    updatePinDots('lock');
    const titleEl = document.getElementById('lock-title');
    if (titleEl) titleEl.textContent = 'Enter PIN';
    const errEl = document.getElementById('lock-error');
    if (errEl) errEl.textContent = '';
    const forgotEl = document.getElementById('lock-forgot');
    if (forgotEl) forgotEl.style.display = 'block';
  } catch (e) {
    console.warn('[lockApp UI]', e);
  }
}

function unlockApp() {
  _isLocked = false;
  if (typeof window !== 'undefined') window._appUnlocked = true;
  try { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('pl_unlocked', '1'); } catch (e) { }
  const lockStyle = document.getElementById('pl-lock-style');
  if (lockStyle) {
    try { lockStyle.remove(); } catch (e) { }
  }
  const lockEl = document.getElementById('screen-lock');
  if (lockEl) lockEl.style.display = 'none';
  const appEl = document.getElementById('app');
  if (appEl) appEl.style.display = 'flex';
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
      }).catch(() => { })
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
  for (let i = 0; i < 4; i++) {
    const d = document.getElementById('pd' + i);
    if (d) { d.classList.remove('filled'); d.classList.add('error'); }
  }
  const le = document.getElementById('lock-error');
  if (le) le.textContent = 'Incorrect PIN — try again';
  setTimeout(() => {
    for (let i = 0; i < 4; i++) { const d = document.getElementById('pd' + i); if (d) d.classList.remove('error'); }
    const le2 = document.getElementById('lock-error');
    if (le2) le2.textContent = '';
    pinBuffer = '';
    updatePinDots('lock');
  }, 800);
}

async function pinForgot() {
  const ok = await appConfirm('Reset PIN?\n\nThis will remove PIN protection. You will need to set a new PIN in Settings.', {
    title: 'Reset PIN',
    danger: true,
    confirmText: 'Reset PIN',
    icon: '🔑'
  });
  if (ok) {
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
    const stored = getStoredHash();
    const syncMatch = hashPIN(modalPinBuffer) === stored;
    const doVerify = (match) => {
      if (match) {
        // Check if this was a Settings gate request
        if (_pendingScreen === 'settings') {
          _settingsUnlocked = true; _pendingScreen = null;
          closeModal('modal-pin'); modalPinBuffer = '';
          document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
          document.getElementById('screen-settings').classList.add('active');
          updatePINStatusLabel();
          if (typeof updateBottomNav === 'function') updateBottomNav('settings');
          if (typeof renderSettingsAbout === 'function') renderSettingsAbout();
          return;
        }
        modalPinBuffer = ''; modalPinStep = 'new'; updatePinDots('modal');
        document.getElementById('pin-modal-sub').textContent = 'Enter your new 4-digit PIN';
        document.getElementById('pin-modal-error').textContent = '';
      } else { flashModalError('Incorrect current PIN'); }
    };
    if (stored.startsWith('sha_')) { hashPINAsync(modalPinBuffer).then(h => doVerify(h === stored)).catch(() => doVerify(hashPIN(modalPinBuffer) === stored)); }
    else { doVerify(syncMatch); }
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

async function removePIN() {
  const ok = await appConfirm('Remove PIN protection?\n\nAnyone with access to your device will be able to open the app.', {
    title: 'Remove PIN',
    danger: true,
    confirmText: 'Remove PIN',
    icon: '🔓'
  });
  if (!ok) return;
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
  const lockCfg = document.getElementById('app-lock-config-rows');
  if (lockCfg) lockCfg.style.display = hasPIN() ? '' : 'none';
  loadAppLockSettings();
}

function saveAppLockSettings() {
  const exitEl = document.getElementById('pref-lock-exit');
  const idleEl = document.getElementById('pref-lock-idle');
  if (exitEl) {
    const exitVal = exitEl.value;
    try { localStorage.setItem('plpro_lock_exit', exitVal); } catch (e) { }
    if (typeof S !== 'undefined') {
      if (!S.securityConfig) S.securityConfig = {};
      S.securityConfig.exit = exitVal;
    }
  }
  if (idleEl) {
    const idleVal = idleEl.value;
    try { localStorage.setItem('plpro_lock_idle', idleVal); } catch (e) { }
    if (typeof S !== 'undefined') {
      if (!S.securityConfig) S.securityConfig = {};
      S.securityConfig.idle = idleVal;
    }
  }
  if (typeof sv === 'function') sv();
  resetAutoLock();
  if (typeof showToast === 'function') showToast('App lock settings saved ✓');
}

function loadAppLockSettings() {
  const exitEl = document.getElementById('pref-lock-exit');
  const idleEl = document.getElementById('pref-lock-idle');
  const exitVal = getLockOnExitSetting();
  const idleVal = (typeof localStorage !== 'undefined' && localStorage.getItem('plpro_lock_idle')) ||
    (typeof S !== 'undefined' && S.securityConfig && S.securityConfig.idle) || '2m';
  if (exitEl) exitEl.value = exitVal;
  if (idleEl) idleEl.value = idleVal;
}

// ── Startup auth check ─────────────────────────────────────
function authInit() {
  const appEl = document.getElementById('app');
  const lockEl = document.getElementById('screen-lock');

  function showApp() {
    const lockStyle = document.getElementById('pl-lock-style');
    if (lockStyle) { try { lockStyle.remove(); } catch (e) { } }
    if (appEl) appEl.style.display = 'flex';
    if (lockEl) lockEl.style.display = 'none';
  }
  function showLock() {
    if (lockEl) lockEl.style.display = 'flex';
    if (appEl) appEl.style.display = 'none';
  }
  function hideLock() {
    const lockStyle = document.getElementById('pl-lock-style');
    if (lockStyle) { try { lockStyle.remove(); } catch (e) { } }
    if (lockEl) lockEl.style.display = 'none';
  }

  if (hasPIN()) {
    // If already authenticated during this active browser session, keep unlocked; otherwise lock
    if (window._appUnlocked || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pl_unlocked') === '1')) {
      unlockApp();
    } else {
      lockApp();
    }
  } else {
    hideLock();
    showApp();
    setTimeout(() => {
      try {
        if (!hasPIN()) showToast('💡 Tip: Set a PIN in Settings to protect your data');
      } catch (e) { }
    }, 3000);
  }
  try { updatePINStatusLabel(); } catch (e) { }
}

// ── pinDel alias (used by old HTML references) ──────────────
function pinDel() { pinBackspace(); }

// ── showResetPIN ─────────────────────────────────────────────
async function showResetPIN() {
  document.getElementById('lock-forgot').style.display = 'block';
  const ok = await appConfirm('Reset your PIN?\n\nYou will lose PIN protection until you set a new one in Settings → Change PIN.', {
    title: 'Reset PIN',
    danger: true,
    confirmText: 'Reset PIN',
    icon: '🔑'
  });
  if (ok) {
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

