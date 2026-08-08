# 📝 Nhật ký cập nhật (Changelog) — PlantLog Pro

## [v4.5] - 08/08/2026

### 💳 Thêm tùy chọn Hình thức thanh toán (Payment Method) khi Tạo/Sửa Hóa đơn
- **Form Tạo/Sửa Hóa đơn (`modal-add-bill`)**: Bổ sung ô chọn Dropdown **Payment method** với 3 tùy chọn:
  1. `1-Cash` (💵 Tiền mặt)
  2. `2-Bank transfer` (🏦 Chuyển khoản)
  3. `3-Credit card` (💳 Thẻ tín dụng)
- **Hiển thị Badge trên danh sách Hóa đơn**: Hiển thị nhãn Badge tượng hình tương ứng (`💵 1-Cash`, `🏦 2-Bank transfer`, `💳 3-Credit card`) trên thẻ hóa đơn.
- **Xuất Báo cáo PDF**: Hiển thị Hình thức thanh toán trong danh sách chi tiết hóa đơn (PDF Export & Preview).
- **Đồng bộ Google Sheets & Apps Script Backend**: Thêm cột `PaymentMethod` vào mảng đồng bộ dữ liệu `sync.js` và bảng dữ liệu `SN.BILLS` trên Apps Script (`PlantLog_GoogleAppsScript_Pro.gs` & `PlantLog_GoogleAppsScript.gs`).

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
