# 📝 Nhật ký cập nhật (Changelog) — PlantLog Pro

## [Đề xuất nâng cấp / Upcoming Plan] - Kế hoạch Cải tiến & Tối ưu hóa Hệ thống (22/10/2026)

> Chi tiết kế hoạch và phân tích kỹ thuật được lưu trữ tại tệp: [`IMPROVEMENT_PLAN.md`](file:///d:/AI%20Lean/Plantlog-pro-main/IMPROVEMENT_PLAN.md)

### 📌 Danh mục các hạng mục cải tiến theo mức độ ưu tiên & tính cấp thiết:

1. **🔴 [P0 - Bắt buộc / Khẩn cấp] Nén ảnh tự động tại Client & Chống tràn LocalStorage:** (Hoàn tất - IMP-01)
2. **🟠 [P1 - Rất cần thiết] Hàng đợi tải ảnh nền khi Offline (Background Media Queue):** (Hoàn tất - IMP-02)
3. **🟠 [P1 - Rất cần thiết] Bảo mật Webhook Secret & Token trong Google Apps Script:** (Hoàn tất - IMP-03)
4. **🟠 [P1 - Rất cần thiết] Script đóng gói tự động (Automated Bundler Script):** (Hoàn tất - IMP-04)
5. **🟡 [P2 - Cần thiết] Đồng bộ 2 chiều chống xung đột (Per-Item Timestamp Merge):** (Hoàn tất - IMP-05)
6. **🟡 [P2 - Cần thiết] Sao lưu & Khôi phục dữ liệu thủ công (Backup / Restore JSON):** (Hoàn tất - IMP-06)
7. **🟢 [P3 - Cải thiện UX] Tối ưu hóa RAM xuất PDF & Chỉ báo trạng thái mạng trực quan:** (Hoàn tất - IMP-07)
8. **🎙️ [P2 - Năng suất hiện trường] Nhập giọng nói Tiếng Việt dịch sang Tiếng Anh & Lưu ghi chú:** (Hoàn tất - IMP-08)
9. **📅 [P2 - Kế hoạch & Tiến độ] Tính & Hiển thị Số tuần trong năm (ISO-8601 Week Number):** (Hoàn tất - IMP-09)

---

## [v4.10] - 28/10/2026

### 📅 [IMP-09] Tính & Hiển thị Số tuần trong năm (ISO-8601 Week Number) trên Thẻ Chuyến đi

- **Thuật toán tính số tuần chuẩn ISO-8601 (`getWeekInfo`, `getTripWeekLabel`):** Tự động tính chính xác số tuần trong năm (Week 1 – Week 52/53) từ ngày bắt đầu (`tr.date`) và ngày kết thúc (`tr.dateEnd`) của chuyến đi, bóc tách chuỗi ngày an toàn tuyệt đối tránh lỗi lệch ngày do múi giờ UTC/GMT+7.
- **Định dạng hiển thị chuẩn công nghiệp (`W44/26`):**
  - Chuyến đi trong cùng tuần: hiển thị dạng `W44/26` (Tuần 44 năm 2026).
  - Chuyến đi kéo dài xuyên tuần: tự động hiển thị dải tuần linh hoạt `W44-W45/26`.
  - Chuyến đi xuyên năm: hiển thị `W53/26-W01/27`.
- **Huy hiệu trực quan (`.badge-week`):** Thiết kế huy hiệu xám bạc kỹ thuật tinh tế, đặt ngay bên phải tên Nhà máy (`Plant name`) trên thẻ chuyến đi, không làm vỡ bố cục trên màn hình điện thoại hẹp.
- **Đồng bộ hiển thị trên toàn bộ các màn hình:**
  - Danh sách tất cả chuyến đi (`screen-trips`).
  - Mục Chuyến đi sắp tới (Upcoming Trips) và Báo cáo gần đây trên Trang chủ (`screen-home`).
  - Tiêu đề màn hình Chi tiết chuyến đi (`screen-trip-detail`).

---

## [v4.9] - 26/10/2026

### 🚀 Triển khai Toàn diện Kế hoạch Cải tiến Hệ thống (IMPROVEMENT_PLAN: IMP-01 ➔ IMP-08)

#### 🔴 1. [IMP-01] Nén ảnh tự động tại Client & Chống tràn LocalStorage:
- **Hàm nén Canvas `compressImageFile(source, maxDimension = 1280, quality = 0.72)`:** Tự động điều chỉnh kích thước lớn nhất về 1280px và nén JPEG chất lượng 0.72, giảm dung lượng ảnh camera từ 4MB – 12MB xuống còn ~150KB - 250KB (giảm 97%), bảo toàn độ sắc nét văn bản trên hóa đơn và thiết bị hiện trường.
- **Tích hợp nén trực tiếp:** Áp dụng nén tự động ngay khi chọn ảnh trong `handlePhoto()` (sự cố/hóa đơn/ảnh chụp) và `handleBillPhotos()`.
- **Cơ chế bắt lỗi bộ nhớ `sv()`:** Xử lý ngoại lệ `QuotaExceededError` khi trình duyệt đạt giới hạn lưu trữ, hiển thị Toast cảnh báo trực quan cho kỹ sư thay vì âm thầm bỏ qua gây mất dữ liệu.
- **Tiện ích giám sát dung lượng `getStorageUsage()`:** Cung cấp hàm đo lường dung lượng đã dùng (bytes, MB, tỷ lệ %) của `localStorage`.

#### 🟠 2. [IMP-02] Hàng đợi Upload ảnh nền khi Offline (Background Media Queue):
- **Cơ chế quét tự động `flushPendingMedia()`:** Quét toàn bộ ảnh còn lưu cục bộ dưới dạng Base64 trong hóa đơn (`S.bills`) và sự cố báo cáo (`S.reports`) để tuần tự tải bù lên thư mục Google Drive tương ứng qua `uploadBillPhotoToDrive()`.
- **Tự động thay thế & giải phóng dung lượng:** Sau khi upload Drive thành công, thay thế chuỗi Base64 bằng đường dẫn `driveUrl` và gọi `sv()`, giúp giải phóng ngay lập tức hàng chục MB bộ nhớ cache trên điện thoại.
- **Kích hoạt thông minh:** Tự động chạy khi thiết bị kết nối mạng trở lại (`online` event listener) hoặc khi người dùng bắt đầu quy trình Đồng bộ (`syncToSheets()`).

#### 🟠 3. [IMP-03] Bảo mật Webhook Secret & Token trong Google Apps Script:
- **Loại bỏ Secret URL gán cứng:** Xóa hoàn toàn URL kèm chữ ký bí mật Power Automate khỏi mã nguồn `PlantLog_GoogleAppsScript_Pro.gs` và `PlantLog_GoogleAppsScript.gs`, chuyển sang đọc từ đám mây qua `PropertiesService.getScriptProperties().getProperty('POWER_AUTOMATE_WEBHOOK_URL')`.
- **Hàm cấu hình một chạm `setupSecretProperties()`:** Cho phép thiết lập an toàn Webhook URL, Telegram Token, và Chat ID vào `Script Properties` mà không để lộ trong Git repository.
- **Relay Telegram Backend an toàn:** Bổ sung endpoint `action: 'sendTelegram'` trong Apps Script để gửi tin nhắn Telegram từ máy chủ, tránh lỗi trình duyệt CORS và bảo vệ Bot Token không bị lộ ở client.

#### 🟠 4. [IMP-04] Script Tự Động Đóng Gói Mã Nguồn (Automated Bundler Script):
- **Xây dựng `bundle.js` & `bundle.ps1`:** Đọc tự động 12 module cốt lõi từ `src/modules/` theo đúng thứ tự phụ thuộc, kiểm tra cú pháp JS (`new Function()`), inject vào thẻ `<script>` của `src/index.html` và đồng bộ tức thì sang `plantlog_pro_mobile.html`.
- **Tự động tăng phiên bản Cache Service Worker:** Tự động phát hiện và nâng version trong `src/sw.js` (ví dụ `plantlog-pro-v13` ➔ `v21`), kích hoạt trình duyệt client xóa cache cũ và tải mã nguồn mới nhất khi online.
- **Tiêu chuẩn hóa quy trình phát triển:** Lập trình viên chỉ cần chỉnh sửa các file nhỏ trong `src/modules/` và chạy `node bundle.js` hoặc `./bundle.ps1`.

#### 🟡 5. [IMP-05] Đồng Bộ 2 Chiều Chống Xung Đột (Per-Item Timestamp Merge):
- **Thuật toán gộp thông minh `mergeCollectionByTimestamp()`:** Khi tải dữ liệu từ Google Sheets về (`loadFromSheets()`), tiến hành so khớp theo từng bản ghi (Trips, Tasks, Bills) dựa trên mốc thời gian `updatedAt` / `createdAt` thay vì ghi đè toàn bộ mảng.
- **Bảo vệ dữ liệu ngoại tuyến (Offline Safety):** Các bản ghi mới được tạo offline chưa kịp đồng bộ lên Sheets được giữ nguyên 100%, không bị xóa mất khi kéo dữ liệu từ Sheets về.
- **Ưu tiên chỉnh sửa mới nhất:** Nếu kỹ sư vừa cập nhật công việc hoặc hóa đơn cục bộ (`local.updatedAt > remote.updatedAt`), dữ liệu cục bộ được ưu tiên bảo lưu và sẵn sàng đẩy ngược lên Sheets trong lần đồng bộ tiếp theo.

#### 🟡 6. [IMP-06] Sao Lưu & Khôi Phục Dữ Liệu Thủ Công (Backup / Restore JSON):
- **Xuất tệp dự phòng `exportDataBackupJSON()`:** Bổ sung tính năng tải ngay tệp sao lưu chuẩn `PlantLog_Backup_YYYY-MM-DD.json` về điện thoại/máy tính trong mục Cài đặt.
- **Khôi phục từ tệp `importDataBackupJSON()`:** Cho phép kỹ sư chọn tệp JSON dự phòng để khôi phục toàn bộ trạng thái làm việc (Trips, Tasks, Bills, Báo cáo, Profile) khi đổi máy mới hoặc sau khi xóa dữ liệu trình duyệt.
- **Giao diện trực quan:** Bổ sung nút thao tác trực quan với icon và chỉ dẫn rõ ràng trong màn hình Cài đặt.

#### 🟢 7. [IMP-07] Tối Ưu RAM Xuất PDF, Chỉ Báo Mạng Trực Quan & Bộ Lọc Nhanh Hóa Đơn:
- **Chỉ báo kết nối mạng (Network Status Badge):** Bổ sung huy hiệu trạng thái mạng trực quan ngay trên thanh tiêu đề Home (`net-status-badge`) với đèn chấm xanh `Online` và đỏ `Offline`, tự động cập nhật phản hồi sự kiện mạng theo thời gian thực (`online`/`offline`).
- **Thanh tiến trình & Tối ưu RAM khi xuất PDF:** Bổ sung hiệu ứng phản hồi trực quan khi bấm xuất báo cáo (`⏳ Đang kết xuất tệp PDF...`), tự động khóa tạm nút xuất chống bấm liên tục làm quá tải bộ nhớ trình duyệt, đồng thời ngăn lỗi văng trang khi ảnh sự cố đã tải lên Google Drive URL.
- **Bộ lọc nhanh hình thức thanh toán trên Bills Screen:** Bổ sung thanh 4 nút lọc nhanh ngay trên màn hình Expense Bills (`All PM`, `💵 Cash`, `🏦 Bank`, `💳 Card`), giúp kỹ sư dễ dàng theo dõi và đối soát chi phí theo từng phương thức thanh toán.

#### 🎙️ 8. [IMP-08] Nhập Liệu Giọng Nói Tiếng Việt ➔ Tự Động Dịch Sang Tiếng Anh & Lưu Ghi Chú:
- **Tích hợp Web Speech API (`vi-VN`):** Kỹ sư chỉ cần bấm nút micro 🎙️ trên màn hình và nói tiếng Việt tự nhiên, ứng dụng sẽ nhận diện giọng nói chuẩn xác theo thời gian thực.
- **Tự động dịch sang Tiếng Anh chuẩn kỹ thuật (`translateViToEn`):** Ngay sau khi dừng nói, văn bản tiếng Việt sẽ được tự động dịch sang tiếng Anh chuyên ngành qua Google Translate API (~200ms).
- **Điền & Lưu tự động vào Ghi chú:** Bản dịch tiếng Anh được tự động chèn vào ô nhập tương ứng và gọi hàm lưu ngay lập tức (hỗ trợ tại: *Ghi chú chuyến đi Trip Notes, Mô tả công việc Task Details, Chi tiết sự cố Issue Details, Ghi chú hóa đơn Bill Notes*).
- **Giao diện Tiếng Anh chuẩn hóa:** Toàn bộ thông báo và nhãn thao tác trong Modal Voice Note được thiết kế bằng tiếng Anh đồng bộ với toàn bộ ứng dụng (`Listening (Vietnamese)... Speak into microphone`, `Voice VI ➔ EN`, `Stop & Translate`, `Insert & Save`).
- **Cơ chế an toàn khi Offline:** Nếu thiết bị mất kết nối mạng khiến việc dịch bị gián đoạn, ứng dụng tự động bảo lưu văn bản tiếng Việt gốc vào ghi chú để không bị mất thông tin.
- **Khắc phục triệt để lỗi hiển thị Modal & Cài đặt:** Đã sửa lỗi thẻ `<div>` chưa đóng trong `<div class="frow">` của `modal-add-bill`, khôi phục tính độc lập cho toàn bộ các modal (`modal-pin`, `modal-voice-input`, `modal-gsheet`). Bây giờ cả màn hình **Settings (Cài đặt)** và hộp thoại **Voice Note (`🎙️ VI ➔ EN`)** đều bật lên ngay lập tức và hoạt động ổn định 100%.
- **Khắc phục triệt để lỗi lặp từ giọng nói (Speech Duplication):** Bổ sung 2 hàm xử lý chuyên sâu `mergeSpeechSegments()` và `cleanSpeechText()` để tái cấu trúc trực tiếp từ mảng phân đoạn `event.results` thay vì cộng dồn chuỗi lặp lại qua biến toàn cục. Xóa bỏ hoàn toàn hiện tượng lặp từ ("Moto motor", "motor hỏng motor hỏng") do cơ chế streaming của Web Speech API trên Chrome Android.

---

## [v4.8] - 25/09/2026

### 🔗 Tích hợp Đồng bộ Microsoft Lists & Tự động bóc tách Sheet Tab `Flight_TA_Schedule`

#### 1. 📊 Backend Google Apps Script (`PlantLog_GoogleAppsScript_Pro.gs` & `PlantLog_GoogleAppsScript.gs`)
- **Tự động bóc tách 10 trường dữ liệu riêng:** Tự động tạo và cập nhật Sheet tab **`Flight_TA_Schedule`** mỗi khi đồng bộ chuyến đi.
- **Trường thông tin chuẩn hóa (Bỏ PNR):** `TripID`, `TACode`, `Plant`, `Location`, `Date`, `DateEnd`, `Purpose`, `OutboundDepart`, `OutboundArrive`, `ReturnDepart`, `ReturnArrive`.
- **Hỗ trợ tự động khởi tạo:** Đã tích hợp khởi tạo tự động trong hàm `setupSheets()` với hàng tiêu đề xanh lá chuẩn đẹp.

#### 2. 📋 Tài liệu Kế hoạch Đồng bộ Microsoft Lists via Power Automate
- Xây dựng tài liệu hướng dẫn chi tiết quy trình đồng bộ tự động từ Google Sheets sang Microsoft Lists (SharePoint List) công ty bằng Power Automate trong tệp [`microsoft_lists_integration_plan.md`](file:///C:/Users/ngo.van-cuong/.gemini/antigravity-ide/brain/5363a3f4-76a6-4788-86e5-72d97127c019/microsoft_lists_integration_plan.md).
- Hỗ trợ xử lý tra cứu trùng lặp (Upsert logic: Get Items ➔ Filter Query ➔ Create/Update Item) giúp dữ liệu không bao giờ bị trùng lặp khi người dùng sửa chuyến đi.

---

## [v4.7] - 20/09/2026

### 📝 Bổ sung Mô tả Công việc (`Task Description`) vào Báo cáo Chuyến đi (Trip Report) & PDF

#### 1. 🖥️ Hiển thị trực quan trên giao diện ứng dụng (App UI)
- **Wizard tạo báo cáo (Step 5 Tasks):** Hiển thị ô `Description` (Mô tả chi tiết công việc) trực tiếp trên từng thẻ công việc trong giao diện chỉnh sửa báo cáo với khung viền điểm nhấn nhẹ, bảo lưu định dạng xuống dòng (`white-space: pre-wrap`).
- **Modal xem báo cáo (View Report Modal):** Hiển thị đoạn mô tả `📝 <Description>` dưới dòng thông tin máy (`Machine`) & kế hoạch (`Plan`) của từng nhiệm vụ.

#### 2. 📄 Xuất file PDF Báo cáo (`exportReportPDF`)
- Bổ sung nội dung `Desc: <tk.desc>` dưới dạng khối văn bản đa dòng được căn lề chuẩn và ngắt trang linh hoạt trong tệp PDF báo cáo chuyến đi.
- Áp dụng đồng bộ trên tất cả các điểm truy cập (`src/index.html`, `plantlog_pro_mobile.html`, `plantlog_debug.html`, `src/modules/report.js`, `src/js/reports.js`, `src/js/pdf.js`, `src/js/settings.js`).

#### 3. ✅ Sửa lỗi Hiển thị Trạng thái Lựa chọn Checklist (Checklist UI Fix)
- **Nguyên nhân:** Các quy tắc CSS cho nút chọn Checklist (`.rb`, `.rb.pass`, `.rb.fail`, `.rb.na`, `.act`) bị thiếu trong stylesheet chính (`src/styles.css`, `index.html`, `plantlog_pro_mobile.html`, `plantlog_debug.html`), khiến nút bấm không đổi màu nền khi người dùng bấm chọn.
- **Khắc phục:** 
  - Bổ sung bộ quy tắc CSS chuẩn cho Checklist: khi chọn **PASS (`✓`)** nút bật màu xanh lá nổi bật kèm hiệu ứng bóng (`box-shadow`), **FAIL (`✕`)** bật màu đỏ đậm, **N/A (`–`)** bật màu xám đậm.
#### 4. ⏱️ Bổ sung Tổng số Giờ làm việc (`Total Work Hours`), Giờ di chuyển (`Total Travel Hours`) & Giờ nghỉ (`Total Leave Hours`)
- **Cập nhật:** Tự động tổng hợp và phân loại tổng số giờ làm việc, di chuyển và nghỉ phép dựa trên thời gian thực hiện các nhiệm vụ trong báo cáo.
- **Quy tắc hiển thị linh hoạt:** 
  - Chỉ hiển thị các mục có số giờ > 0 (`> 0h`). Nếu không có nhiệm vụ thuộc danh mục đó (`0h`), ứng dụng sẽ tự động ẩn dòng tương ứng.
- **Vị trí hiển thị:** 
  - Thể hiện trực quan trên khung Banner trong Modal xem báo cáo (`⏱ Total Work Hours`, `✈️ Total Travel Hours`, `🌴 Total Leave Hours`).
  - Xuất hiện dưới dòng `Remarks` trong khung **SIGN-OFF** của file PDF xuất ra với định dạng: `Total Work/Travel/Leave Hours: XXh XXm (X tasks)`.

#### 5. ✈️ Hiển thị Chi tiết Chuyến bay (`Flight Details`) trong mục `TRIP INFO`
- **Cập nhật:** Khi chuyến đi có sử dụng phương tiện máy bay (`Transport: Flight / Flight + rental car`), hệ thống tự động trích xuất thông tin chuyến bay (`trip.flight`) và hiển thị ngay dưới mục `Transport` trong phần **TRIP INFO**.
- **Thông tin chi tiết hiển thị:** Số hiệu chuyến bay, hãng hàng không, chặng bay đi/về (`From → To`), giờ cất cánh/hạ cánh, và mã đặt chỗ (`PNR`).
- **Tối ưu & Khắc phục hoàn toàn trên PDF Export:**
  - **Bổ sung thông tin người lập báo cáo:** Thêm đầy đủ `Engineer`, `Title`, và `Company` vào mục **TRIP INFO** trên tệp PDF xuất ra để **100% khớp dữ liệu với giao diện Xem trước Báo cáo (HTML Modal)**.
  - **Sửa lỗi tràn chữ & lỗi ký tự:** Chuyển đổi ký tự Unicode arrow `→` sang chuẩn ASCII `->` giúp font chữ Helvetica trong PDF tính toán chính xác độ rộng chuỗi (`getTextWidth`), tự động ngắt dòng thông minh mà không bị biến dạng thành `'" ` hoặc bị mất chữ ở lề phải (`DaNang -> Ho Chi Minh`).
  - **Cỡ chữ chuẩn:** Đặt cỡ chữ `8pt` vừa vặn, định khoảng cách dòng hợp lý (`lh = 4mm`), giúp toàn bộ thông tin chặng đi, chặng về và PNR hiển thị đầy đủ, đẹp mắt.
- **Đồng bộ toàn bộ:** Đã cập nhật trên giao diện chi tiết chuyến đi (Trip Detail Card), Modal xem báo cáo (View Report Modal) và tệp PDF xuất ra (`exportReportPDF`).

#### 6. 📊 Tự động bóc tách Sheet tab riêng `Flight_TA_Schedule` cho Microsoft Lists Sync
- **Bổ sung Sheet tab riêng:** Tự động tạo và cập nhật tab **`Flight_TA_Schedule`** trên Google Sheets với đúng 10 trường thông tin cơ bản: `TripID`, `TACode`, `Plant`, `Location`, `Date`, `DateEnd`, `Purpose`, `OutboundDepart`, `OutboundArrive`, `ReturnDepart`, `ReturnArrive`.
- **Cập nhật Backend Apps Script:** Đã bổ sung mã nguồn sẵn sàng trong `PlantLog_GoogleAppsScript_Pro.gs` và `PlantLog_GoogleAppsScript.gs`.
- **Power Automate Integration Plan:** Đã chuẩn bị tài liệu chi tiết quy trình đồng bộ sang Microsoft Lists qua Power Automate trong tệp [`microsoft_lists_integration_plan.md`](file:///C:/Users/ngo.van-cuong/.gemini/antigravity-ide/brain/5363a3f4-76a6-4788-86e5-72d97127c019/microsoft_lists_integration_plan.md).

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
