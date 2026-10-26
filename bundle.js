/**
 * PlantLog Pro — Automated Bundler Script (IMP-04)
 * Ghép các file module trong src/modules/ vào src/index.html và đồng bộ sang plantlog_pro_mobile.html
 * Tự động tăng phiên bản cache của Service Worker (sw.js)
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const MODULES_DIR = path.join(ROOT_DIR, 'src', 'modules');
const INDEX_HTML_PATH = path.join(ROOT_DIR, 'src', 'index.html');
const MOBILE_HTML_PATH = path.join(ROOT_DIR, 'plantlog_pro_mobile.html');
const SW_PATH = path.join(ROOT_DIR, 'src', 'sw.js');

const MODULE_ORDER = [
  'core.js',
  'auth.js',
  'trips.js',
  'tasks.js',
  'report.js',
  'inspection.js',
  'library.js',
  'telegram.js',
  'calendar.js',
  'reminders.js',
  'bills.js',
  'sync.js'
];

function bundle() {
  console.log('📦 [PlantLog Bundler] Bắt đầu đóng gói mã nguồn...');

  // 1. Kiểm tra sự tồn tại của các module
  for (const mod of MODULE_ORDER) {
    const modPath = path.join(MODULES_DIR, mod);
    if (!fs.existsSync(modPath)) {
      console.error(`❌ Không tìm thấy module: ${modPath}`);
      process.exit(1);
    }
  }

  // 2. Gom nội dung các module
  let bundleCode = "'use strict';\n";
  for (const mod of MODULE_ORDER) {
    const modPath = path.join(MODULES_DIR, mod);
    let content = fs.readFileSync(modPath, 'utf8');
    // Chuẩn hóa xuống dòng và bỏ 'use strict'; trùng lặp ở đầu module
    content = content.replace(/\r\n/g, '\n').replace(/^['"]use strict['"];?\n?/, '');
    bundleCode += `\n// ====== ${mod} ======\n` + content.trim() + '\n';
  }

  // 3. Kiểm tra cú pháp JavaScript của bundle code
  try {
    new Function(bundleCode);
    console.log('✅ Cú pháp JavaScript hợp lệ (Syntax validation passed)!');
  } catch (err) {
    console.error('❌ Lỗi cú pháp JavaScript trong bundle:', err.message);
    process.exit(1);
  }

  // 4. Đọc index.html và thay thế đoạn script module
  const indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8').replace(/\r\n/g, '\n');
  const scriptTagStartRegex = /<script>\s*['"]use strict['"];\s*(\r?\n)+\/\/ ====== core\.js ======/;
  const scriptTagEnd = '</script>\n</body>\n</html>';

  const match = indexHtml.match(scriptTagStartRegex);
  const endIndex = indexHtml.lastIndexOf(scriptTagEnd);

  if (!match || endIndex === -1) {
    console.error('❌ Không xác định được vị trí thẻ <script> module trong src/index.html');
    process.exit(1);
  }

  const startIndex = match.index;
  const newIndexHtml = indexHtml.substring(0, startIndex) +
    `<script>\n${bundleCode}\n</script>\n</body>\n</html>\n`;

  fs.writeFileSync(INDEX_HTML_PATH, newIndexHtml, 'utf8');
  console.log('✅ Đã cập nhật thành công: src/index.html');

  // 5. Đồng bộ sang plantlog_pro_mobile.html
  fs.writeFileSync(MOBILE_HTML_PATH, newIndexHtml, 'utf8');
  console.log('✅ Đã đồng bộ sang: plantlog_pro_mobile.html');

  // 6. Tự động tăng phiên bản cache của Service Worker (sw.js)
  if (fs.existsSync(SW_PATH)) {
    let swContent = fs.readFileSync(SW_PATH, 'utf8');
    const versionMatch = swContent.match(/const CACHE = 'plantlog-pro-v(\d+)';/);
    if (versionMatch) {
      const currentVer = parseInt(versionMatch[1], 10);
      const nextVer = currentVer + 1;
      swContent = swContent.replace(
        `const CACHE = 'plantlog-pro-v${currentVer}';`,
        `const CACHE = 'plantlog-pro-v${nextVer}';`
      );
      swContent = swContent.replace(
        `// PlantLog Pro Service Worker v${currentVer}`,
        `// PlantLog Pro Service Worker v${nextVer}`
      );
      fs.writeFileSync(SW_PATH, swContent, 'utf8');
      console.log(`🚀 Đã nâng cấp Service Worker Cache: v${currentVer} ➔ v${nextVer}`);
    }
  }

  console.log('🎉 [PlantLog Bundler] Hoàn tất đóng gói toàn bộ hệ thống!');
}

bundle();
