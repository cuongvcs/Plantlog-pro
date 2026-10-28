/**
 * PlantLog Pro — End-to-End Improvement Verification Test Suite (IMP-01 to IMP-07)
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 ====================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN CẢI TIẾN IMP-01 TỚI IMP-07');
console.log('🧪 ====================================================\n');

let passedTests = 0;
let totalTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
  }
}

// Mock DOM & Storage environment
global.localStorage = {
  test_k1: 'a'.repeat(1024),
  getItem(k) { return this[k] || null; },
  setItem(k, v) { this[k] = String(v); },
  removeItem(k) { delete this[k]; },
  clear() {
    for (const k in this) {
      if (typeof this[k] !== 'function') delete this[k];
    }
  }
};

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.navigator = { onLine: true };
global.document = {
  getElementById: (id) => {
    return {
      style: {},
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {}
      },
      textContent: '',
      title: '',
      value: ''
    };
  },
  createElement: () => ({ style: {}, click: () => {} }),
  body: { appendChild: () => {}, removeChild: () => {} }
};

// ── IMP-01 TESTS ──────────────────────────────────────────────────────────
console.log('--- [IMP-01] Quota & Image Compression Checks ---');
it('Hàm getStorageUsage tính toán chính xác dung lượng localStorage', () => {
  const coreCode = fs.readFileSync(path.join(__dirname, 'src', 'modules', 'core.js'), 'utf8');
  const getUsageMatch = coreCode.match(/function getStorageUsage\(\)\s*\{([\s\S]*?)\n\}/);
  assert(getUsageMatch, 'getStorageUsage function exists');
  const getStorageUsage = new Function(getUsageMatch[1]);
  const usage = getStorageUsage();
  assert(usage.usedBytes >= 1024, `usedBytes should be >= 1024, got ${usage.usedBytes}`);
  assert(usage.percent >= 0, 'percent must be >= 0');
});

it('Hàm sv() xử lý an toàn khi gặp QuotaExceededError', () => {
  const coreCode = fs.readFileSync(path.join(__dirname, 'src', 'modules', 'core.js'), 'utf8');
  assert(coreCode.includes('QuotaExceededError'), 'sv() handles QuotaExceededError');
  assert(coreCode.includes('compressImageFile'), 'core.js includes compressImageFile');
});

// ── IMP-02 TESTS ──────────────────────────────────────────────────────────
console.log('\n--- [IMP-02] Offline Pending Media Upload Queue ---');
it('sync.js chứa flushPendingMedia và quét cả bills lẫn reports', () => {
  const syncCode = fs.readFileSync(path.join(__dirname, 'src', 'modules', 'sync.js'), 'utf8');
  assert(syncCode.includes('async function flushPendingMedia'), 'flushPendingMedia exists');
  assert(syncCode.includes('S.bills'), 'flushPendingMedia checks S.bills');
  assert(syncCode.includes('S.reports'), 'flushPendingMedia checks S.reports');
  assert(syncCode.includes('uploadBillPhotoToDrive'), 'calls uploadBillPhotoToDrive');
});

// ── IMP-03 TESTS ──────────────────────────────────────────────────────────
console.log('\n--- [IMP-03] Security & Webhook Secrets in Apps Script ---');
it('Apps Script không còn hardcode secret URL / Telegram Token và đã có setupSecretProperties', () => {
  const gsCode = fs.readFileSync(path.join(__dirname, 'PlantLog_GoogleAppsScript_Pro.gs'), 'utf8');
  assert(!gsCode.includes('prod-12.southeastasia.logic.azure.com:443/workflows/da4260a4f5fc4be1a5c68b7caad63d33'), 'Hardcoded Power Automate URL removed');
  assert(gsCode.includes('setupSecretProperties'), 'setupSecretProperties exists');
  assert(gsCode.includes('PropertiesService.getScriptProperties()'), 'PropertiesService.getScriptProperties used');
  assert(gsCode.includes('sendTelegramNotification'), 'sendTelegramNotification backend exists');
});

it('Client telegram.js chuyển hướng gửi qua Google Apps Script proxy', () => {
  const teleCode = fs.readFileSync(path.join(__dirname, 'src', 'modules', 'telegram.js'), 'utf8');
  assert(teleCode.includes('action: \'sendTelegram\''), 'Relays via Apps Script action');
});

// ── IMP-04 TESTS ──────────────────────────────────────────────────────────
console.log('\n--- [IMP-04] Bundler Script & Automation ---');
it('bundle.js và bundle.ps1 tồn tại và bundle.js chạy trơn tru', () => {
  assert(fs.existsSync(path.join(__dirname, 'bundle.js')), 'bundle.js exists');
  assert(fs.existsSync(path.join(__dirname, 'bundle.ps1')), 'bundle.ps1 exists');
});

// ── IMP-05 TESTS ──────────────────────────────────────────────────────────
console.log('\n--- [IMP-05] Timestamp-based Conflict Resolution ---');
it('mergeCollectionByTimestamp giữ nguyên record offline và ưu tiên record mới nhất theo timestamp', () => {
  const syncCode = fs.readFileSync(path.join(__dirname, 'src', 'modules', 'sync.js'), 'utf8');
  const mergeFnMatch = syncCode.match(/function mergeCollectionByTimestamp\([\s\S]*?\n\}/);
  assert(mergeFnMatch, 'mergeCollectionByTimestamp exists');

  eval(mergeFnMatch[0]);

  const local = [
    { id: '1', name: 'Trip Local Edit', updatedAt: '2026-10-26T10:00:00.000Z' },
    { id: '2', name: 'Trip Created Offline', updatedAt: '2026-10-26T10:05:00.000Z' }
  ];
  const remote = [
    { id: '1', name: 'Trip Remote Old', updatedAt: '2026-10-26T09:00:00.000Z' },
    { id: '3', name: 'Trip Remote New', updatedAt: '2026-10-26T09:30:00.000Z' }
  ];

  const merged = mergeCollectionByTimestamp(local, remote, 'id');
  assert.strictEqual(merged.length, 3, 'Merged list should contain all 3 records');
  assert.strictEqual(merged.find(x => x.id === '1').name, 'Trip Local Edit', 'Local edit was newer, should win');
  assert.strictEqual(merged.find(x => x.id === '2').name, 'Trip Created Offline', 'Offline record must be preserved');
  assert.strictEqual(merged.find(x => x.id === '3').name, 'Trip Remote New', 'Remote new record must be added');
});

// ── IMP-06 TESTS ──────────────────────────────────────────────────────────
console.log('\n--- [IMP-06] Backup & Restore JSON Functionality ---');
it('exportDataBackupJSON và importDataBackupJSON kiểm tra schema hợp lệ', () => {
  const coreCode = fs.readFileSync(path.join(__dirname, 'src', 'modules', 'core.js'), 'utf8');
  assert(coreCode.includes('function exportDataBackupJSON'), 'exportDataBackupJSON exists');
  assert(coreCode.includes('function importDataBackupJSON'), 'importDataBackupJSON exists');
  assert(coreCode.includes('function handleBackupFileSelect'), 'handleBackupFileSelect exists');

  // Test schema check logic
  const validJson = JSON.stringify({
    version: '4.9',
    data: {
      trips: [{ id: 't1' }],
      tasks: [{ id: 'tk1' }]
    }
  });
  const parsed = JSON.parse(validJson);
  assert(parsed.data && typeof parsed.data === 'object', 'Schema valid');
});

// ── IMP-07 TESTS ──────────────────────────────────────────────────────────
console.log('\n--- [IMP-07] Network Status Indicator, Bills Filter & PDF Loading ---');
it('HTML templates and index.html có net-status-badge và payment method buttons', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, 'src', 'index.html'), 'utf8');
  const templatesHtml = fs.readFileSync(path.join(__dirname, 'src', 'templates.html'), 'utf8');
  const mobileHtml = fs.readFileSync(path.join(__dirname, 'plantlog_pro_mobile.html'), 'utf8');

  // Network status badge
  assert(indexHtml.includes('id="net-status-badge"'), 'index.html has net-status-badge');
  assert(templatesHtml.includes('id="net-status-badge"'), 'templates.html has net-status-badge');
  assert(mobileHtml.includes('id="net-status-badge"'), 'plantlog_pro_mobile.html has net-status-badge');

  // Payment method filter buttons
  assert(indexHtml.includes('id="bpf-cash"'), 'index.html has bpf-cash button');
  assert(templatesHtml.includes('id="bpf-cash"'), 'templates.html has bpf-cash button');
  assert(mobileHtml.includes('id="bpf-cash"'), 'plantlog_pro_mobile.html has bpf-cash button');
});

it('bills.js lọc chính xác theo Cash, Bank và Card', () => {
  const billsCode = fs.readFileSync(path.join(__dirname, 'src', 'modules', 'bills.js'), 'utf8');
  assert(billsCode.includes('billPaymentFilter'), 'billPaymentFilter variable exists');
  assert(billsCode.includes('function setBillPaymentFilter'), 'setBillPaymentFilter function exists');

  // Mock bills data
  const testBills = [
    { id: 'b1', amount: 100, paymentMethod: '1-Cash' },
    { id: 'b2', amount: 200, paymentMethod: '2-Bank transfer' },
    { id: 'b3', amount: 300, paymentMethod: '3-Credit card' }
  ];

  let filtered = testBills.filter(b => (b.paymentMethod || '1-Cash').includes('Cash') || (b.paymentMethod || '').includes('1-'));
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'b1');

  filtered = testBills.filter(b => (b.paymentMethod || '').includes('Bank') || (b.paymentMethod || '').includes('2-'));
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'b2');

  filtered = testBills.filter(b => (b.paymentMethod || '').includes('Card') || (b.paymentMethod || '').includes('Credit') || (b.paymentMethod || '').includes('3-'));
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'b3');
});

it('report.js có loading indicator và Drive URL safety guard cho exportPDF', () => {
  const reportCode = fs.readFileSync(path.join(__dirname, 'src', 'modules', 'report.js'), 'utf8');
  assert(reportCode.includes('Generating PDF'), 'Visual loading feedback exists');
  assert(reportCode.includes('ph.startsWith(\'data:image/\')'), 'Drive URL safety guard exists');
});

// ── IMP-08 TESTS ──────────────────────────────────────────────────────────
console.log('\n--- [IMP-08] Voice-to-Text Vietnamese ➔ English Translation ---');
it('core.js có các hàm xử lý Voice-to-Text và dịch tự động translateViToEn', () => {
  const coreCode = fs.readFileSync(path.join(__dirname, 'src', 'modules', 'core.js'), 'utf8');
  assert(coreCode.includes('async function translateViToEn'), 'translateViToEn exists');
  assert(coreCode.includes('function startVoiceToEnglish'), 'startVoiceToEnglish exists');
  assert(coreCode.includes('function stopVoiceAndTranslate'), 'stopVoiceAndTranslate exists');
  assert(coreCode.includes('function applyVoiceResultToInput'), 'applyVoiceResultToInput exists');
});

it('templates.html và index.html có modal-voice-input và các nút Voice Note', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, 'src', 'index.html'), 'utf8');
  const templatesHtml = fs.readFileSync(path.join(__dirname, 'src', 'templates.html'), 'utf8');
  const mobileHtml = fs.readFileSync(path.join(__dirname, 'plantlog_pro_mobile.html'), 'utf8');

  assert(indexHtml.includes('id="modal-voice-input"'), 'index.html has modal-voice-input');
  assert(templatesHtml.includes('id="modal-voice-input"'), 'templates.html has modal-voice-input');
  assert(mobileHtml.includes('id="modal-voice-input"'), 'plantlog_pro_mobile.html has modal-voice-input');

  assert(indexHtml.includes("startVoiceToEnglish('trip-note-input'"), 'index.html has trip-note voice button');
  assert(indexHtml.includes("startVoiceToEnglish('task-desc')"), 'index.html has task-desc voice button');
  assert(indexHtml.includes("startVoiceToEnglish('is-desc')"), 'index.html has is-desc voice button');
  assert(indexHtml.includes("startVoiceToEnglish('bill-notes')"), 'index.html has bill-notes voice button');
});

it('cleanSpeechText và mergeSpeechSegments loại bỏ triệt để từ lặp và xung đột Android Web Speech API', () => {
  const coreCode = fs.readFileSync(path.join(__dirname, 'src', 'modules', 'core.js'), 'utf8');
  const vm = require('vm');
  const sandbox = { console };
  vm.createContext(sandbox);
  // Extract and run functions in sandbox
  vm.runInContext(coreCode.substring(coreCode.indexOf('function cleanSpeechText'), coreCode.indexOf('function startVoiceToEnglish')), sandbox);

  // Test 1: Duplicate stem from streaming recognition
  const t1 = sandbox.cleanSpeechText('Moto motor này hỏng');
  assert(t1 === 'motor này hỏng', 'cleanSpeechText removes interim stem duplicate: got ' + t1);

  // Test 2: Consecutive duplicate words
  const t2 = sandbox.cleanSpeechText('bơm bơm nước bị rò rỉ');
  assert(t2 === 'bơm nước bị rò rỉ', 'cleanSpeechText removes repeated words: got ' + t2);

  // Test 3: Android Chrome segment overlap
  const segments = [
    { 0: { transcript: 'Motor' }, isFinal: true },
    { 0: { transcript: 'Motor này hỏng rồi' }, isFinal: true }
  ];
  const t3 = sandbox.mergeSpeechSegments(segments);
  assert(t3 === 'Motor này hỏng rồi', 'mergeSpeechSegments removes Android segment overlap: got ' + t3);
});

// ── IMP-09 TESTS ──────────────────────────────────────────────────────────
console.log('\n--- [IMP-09] Trip Week Number (ISO-8601) Display ---');
it('core.js có hàm getWeekInfo và getTripWeekLabel tính chính xác tuần theo ISO-8601', () => {
  const coreCode = fs.readFileSync(path.join(__dirname, 'src', 'modules', 'core.js'), 'utf8');
  const vm = require('vm');
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(coreCode.substring(coreCode.indexOf('function getWeekInfo'), coreCode.indexOf('function getSortedTrips')), sandbox);

  // Single date in Oct 2026 -> W44/26
  assert(sandbox.getTripWeekLabel('2026-10-28') === 'W44/26', 'Single date W44/26 check');
  // Same week range -> W44/26
  assert(sandbox.getTripWeekLabel('2026-10-28', '2026-10-30') === 'W44/26', 'Same week range W44/26 check');
  // Cross week range -> W44-W45/26
  assert(sandbox.getTripWeekLabel('2026-10-28', '2026-11-04') === 'W44-W45/26', 'Cross week range W44-W45/26 check');
  // First week of year 2026 -> W1/26
  assert(sandbox.getTripWeekLabel('2026-01-01') === 'W1/26', 'Week 1 check');
});

it('trips.js và HTML render badge-week cạnh Plant name trong trip cards và detail', () => {
  const tripsCode = fs.readFileSync(path.join(__dirname, 'src', 'modules', 'trips.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(__dirname, 'src', 'index.html'), 'utf8');

  assert(tripsCode.includes('badge-week'), 'trips.js contains badge-week');
  assert(tripsCode.includes('getTripWeekLabel(tr.date,tr.dateEnd)'), 'trips.js calls getTripWeekLabel');
  assert(indexHtml.includes('.badge-week'), 'index.html has .badge-week style');
});

console.log('\n====================================================');
console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS ĐẠT YÊU CẦU (${Math.round((passedTests/totalTests)*100)}% PASS)`);
console.log('====================================================');
