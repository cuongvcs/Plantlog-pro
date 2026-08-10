# 📝 Nhật ký cập nhật (Changelog) — PlantLog Pro

## [v4.6] - 10/08/2026

### 🔄 Sửa lỗi Auto-Start 7h sáng & Bảo vệ trạng thái Active khi tải dữ liệu từ Sheets

#### 1. 🤖 Sửa lỗi Google Apps Script Cloud Trigger (`autoStartInSheets`)
- **Nguyên nhân cũ:** Chuỗi so sánh ô ngày dạng `Date` object (`"Mon Aug 10 2026..." <= "2026-08-10"`) trả về `false`, khiến trigger 7h sáng bị bỏ qua âm thầm và không bao giờ tự động cập nhật ô dữ liệu trên Google Sheets sang `in_progress`.
- **Khắc phục:** Thêm hàm `parseSheetDateStr_()` chuẩn hóa ô ngày về định dạng chuẩn `YYYY-MM-DD` trước khi so sánh.
- Đảm bảo đúng 7h sáng, Google Apps Script **cập nhật trực tiếp cột Status trên Google Sheets sang `in_progress`** và gửi thông báo Telegram chính xác (`🔄 Active`).

#### 2. 📱 Bảo vệ trạng thái Active trên Web App (`loadFromSheets` & `autoStartTodayItems`)
- **Bảo vệ trạng thái cục bộ:** Khi mở app và kéo dữ liệu từ Google Sheets về (`loadFromSheets`), nếu các công việc / chuyến đi cục bộ đang ở trạng thái `in_progress` hoặc `done`, ứng dụng sẽ bảo vệ trạng thái này, không bị hạ cấp đè ngược lại về `planned`/`pending` nếu dữ liệu trên Sheets chưa kịp cập nhật.
- **Kích hoạt tự động khi tải dữ liệu:** Tự động gọi `autoStartTodayItems()` ngay sau khi kéo dữ liệu thành công từ Google Sheets.
- **Bổ sung Service Worker v11:** Đảm bảo tự động xóa cache cũ và nạp ngay logic mới khi truy cập ứng dụng.

---

## [v4.5] - 08/08/2026

### 💳 Thêm tùy chọn & Phân màu Hình thức thanh toán (Payment Method for Bills)

#### 1. 📝 Ô chọn Hình thức thanh toán khi Tạo/Sửa Hóa đơn (`modal-add-bill`)
- Bổ sung ô chọn Dropdown **Payment method** với 3 tùy chọn:
  1. `1-Cash` (💵 Tiền mặt)
  2. `2-Bank transfer` (🏦 Chuyển khoản)
  3. `3-Credit card` (💳 Thẻ tín dụng)

#### 2. 🎨 Phân biệt màu sắc trực quan trên giao diện ứng dụng (App UI Color Coding)
- **`1-Cash`**: Badge nhãn nền xanh lá (`#DCFCE7`), chữ xanh đậm (`#166534`) + Viền điểm nhấn cạnh trái 4px xanh emerald (`#059669`).
- **`2-Bank transfer`**: Badge nhãn nền xanh dương (`#DBEAFE`), chữ xanh navy (`#1E40AF`) + Viền điểm nhấn cạnh trái 4px xanh lam (`#2563EB`).
- **`3-Credit card`**: Badge nhãn nền tím (`#EDE9FE`), chữ tím đậm (`#5B21B6`) + Viền điểm nhấn cạnh trái 4px tím (`#7C3AED`).

#### 3. 🛠️ Sửa lỗi Đồng bộ 2 chiều với Google Sheets
- Cập nhật trường `paymentMethod` trong tất cả 5 hàm `buildBills()` đóng gói dữ liệu và 5 hàm `loadFromSheets()` giải mã dữ liệu trên toàn bộ dự án (`src/index.html`, `plantlog_pro_mobile.html`, `plantlog_debug.html`, `src/modules/sync.js`, `src/js/sync.js`).
- Khắc phục triệt để hiện tượng đổi hình thức thanh toán trên App thành `Bank transfer` / `Credit card` nhưng trên Google Sheets bị trả ngược về `Cash`.
- Cập nhật cấu trúc cột `PaymentMethod` trong `COLS.bills` trên mã nguồn Google Apps Script Backend (`PlantLog_GoogleAppsScript_Pro.gs` & `PlantLog_GoogleAppsScript.gs`).

---

## [v4.4] - 28/07/2026

### 🛠️ Sửa lỗi Auto-start & Đồng bộ Google Sheets (Fix Auto-start Trips/Tasks Sync Issue)

#### 🛑 Vấn đề trước khi sửa
- Mỗi 7h sáng khi hệ thống tự động kích hoạt các Trip/Task đến ngày khởi chạy sang trạng thái `in_progress` (Active), thay đổi này chỉ lưu ở bộ nhớ local `localStorage`.
- Khi người dùng mở ứng dụng lên, ứng dụng thực hiện thao tác kéo dữ liệu từ Google Sheets xuống (`loadFromSheets()`), đè lại trạng thái cũ (`planned` / `pending`) lên dữ liệu cục bộ, khiến Trip/Task bị chuyển về trạng thái chưa bắt đầu.

#### ⚡ Chi tiết các thay đổi
1. **Frontend (`src/index.html`, `src/modules/core.js`, `plantlog_pro_mobile.html`)**:
   - Trong hàm `autoStartTodayItems()`, bổ sung lệnh gọi `syncToSheets()` ngay sau khi phát hiện thay đổi trạng thái tự động (`changed === true`).
   - Đảm bảo trạng thái `in_progress` mới được gửi lên Google Sheets ngay lập tức trước khi tiến hành đồng bộ kéo dữ liệu về.

2. **Backend Google Apps Script (`PlantLog_GoogleAppsScript_Pro.gs`, `PlantLog_GoogleAppsScript.gs`)**:
   - Thêm lệnh gọi `autoStartInSheets()` vào ngay đầu hàm `sendDailyTelegramNotifications()` (hàm chạy hẹn giờ trigger tự động trên Google Cloud lúc 7h sáng).
   - Khi trigger 7h sáng chạy, dữ liệu trên Google Sheets sẽ tự động cập nhật trực tiếp dòng của Trips/Tasks từ `planned`/`pending` sang `in_progress`.

### 🔄 Sắp xếp Chuyến công tác (Trips) mới nhất lên đầu trong các danh sách chọn
- Bổ sung hàm hỗ trợ `getSortedTrips()` để sắp xếp tất cả các chuyến công tác theo ngày (`date` / `dateEnd`) giảm dần (mới nhất lên trên cùng).
- Đã áp dụng cho các vị trí danh sách chọn:
  1. Form tạo/sửa Nhiệm vụ (`Linked trip` dropdown trong Task Modal).
  2. Form thêm/sửa Hóa đơn chi phí (`Link to Trip` dropdown trong Add/Edit Bill Modal).
  3. Modal xuất báo cáo PDF Hóa đơn (`Filter by trip` dropdown trong Export Bills PDF).

### 📱 Tự động gửi báo cáo chuyến đi sang Telegram khi bấm "Mark completed"
- Cập nhật hàm `markCompleted()` trong `src/index.html`, `src/modules/report.js`, và `plantlog_pro_mobile.html`.
- Khi người dùng hoàn thành báo cáo và bấm nút **Mark completed** (Đánh dấu hoàn thành), ứng dụng sẽ tự động kích hoạt hàm `sendTripToTelegram(curTrip)` để gửi ngay bản tổng hợp báo cáo chuyến đi (thông tin Trip, danh sách Task, kết quả sign-off, chi phí) tới Telegram Bot nếu đã được cấu hình trong Cài đặt.

---

## [v4.3] - Parts & Materials + Export
- Toggle button "🔩 Add parts / materials required" in Work task modal.
- Parts export to Excel CSV (UTF-8 BOM) and PDF landscape A4.

---

## [v4.2] - Security & Trip Status
- Fixed PIN security isolation with key `plpro1`.
- Added trip status toggle bar (Planned / Active / Done).

---

## [v4.1] - Database separation
- PlantLog Pro uses its own database `PlantLog Pro Database`.
