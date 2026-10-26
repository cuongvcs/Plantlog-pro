# 🏭 THÔNG TIN TOÀN BỘ DỰ ÁN PLANTLOG PRO (PROJECT INFO)

> **Tên ứng dụng:** VCS PlantLog Pro  
> **Khẩu hiệu:** Field Visit & Plant Report Progressive Web App  
> **Phiên bản hiện tại:** v4.8 (Cập nhật ngày 25/09/2026)  
> **Thư mục dự án:** `d:\AI Lean\Plantlog-pro-main\`  
> **Giấy phép:** MIT License  

---

## 1. 🎯 MỤC TIÊU VÀ ĐỐI TƯỢNG SỬ DỤNG

### 1.1. Đối tượng sử dụng
* **Kỹ sư hiện trường (Field Service Engineers):** Các kỹ sư bảo trì, kỹ thuật viên lắp đặt, chuyên gia vận hành thường xuyên đi công tác tại các nhà máy, trạm năng lượng, xưởng sản xuất, giàn khoan, khu công nghiệp.
* **Quản lý kỹ thuật (Technical Leads / Service Managers):** Cần theo dõi lịch trình công tác, tiến độ hoàn thành nhiệm vụ, báo cáo kỹ thuật và kiểm soát hóa đơn chi phí phát sinh tức thì.

### 1.2. Mục tiêu dự án
* **Thay thế hoàn toàn sổ tay và biểu mẫu giấy:** Số hóa 100% quy trình lập kế hoạch công tác, kiểm tra thiết bị, ghi chép thông số và ký duyệt biên bản nghiệm thu hiện trường.
* **Hoạt động không phụ thuộc Internet (Offline-First):** Đảm bảo kỹ sư làm việc bình thường ở những khu vực sóng yếu hoặc không có sóng (tầng hầm, nhà máy xa xôi, giàn khoan). Dữ liệu được lưu trữ cục bộ và tự động đồng bộ lên đám mây khi có mạng.
* **Tự động hóa thông minh (Automation):** Tự động gửi thông báo lịch làm việc qua Telegram mỗi 7h sáng, tự động chuyển trạng thái công việc khi đến ngày, tự động đồng bộ lịch trình bay sang Microsoft Lists của doanh nghiệp.
* **Tiết kiệm chi phí vận hành:** Kiến trúc Serverless 100% miễn phí — lưu trữ trên Google Sheets, tính toán qua Google Apps Script, hosting qua GitHub Pages, không tốn chi phí thuê máy chủ hàng tháng.

---

## 2. 💻 KIẾN TRÚC CÔNG NGHỆ (TECH STACK)

| Thành phần | Công nghệ sử dụng | Vai trò & Đặc điểm |
|---|---|---|
| **Frontend Core** | HTML5, Vanilla JavaScript (ES6+), Vanilla CSS | Không dùng framework nặng, không qua bước build (Zero-build), hiệu năng cực cao, tải tức thì |
| **Giao diện & UI** | Custom Design Tokens (Vars CSS) | Phong cách Industrial Precision kết hợp nét tối giản hiện đại của Linear/Notion/Trello; Font: *Plus Jakarta Sans* + *Syne* + *Fira Code* |
| **Lưu trữ Cục bộ** | `localStorage` (Key: `plpro1`) | Lưu toàn bộ state ứng dụng, cô lập dữ liệu hoàn toàn với các phiên bản cũ |
| **Bảo mật** | Web Crypto API (SHA-256) | Mã hóa mã PIN 4 số với salt bảo mật (`plprosalt_`), tự động khóa màn hình sau 5 phút |
| **PWA & Offline** | Service Worker v13 & Cache Storage | Lưu cache file tĩnh, chiến lược Network-First cho điều hướng và Cache-First cho tài nguyên |
| **Xuất tài liệu** | `jsPDF` (v2.5.1) | Kết xuất trực tiếp file PDF chuyên nghiệp trên trình duyệt (Báo cáo kỹ thuật, Bảng kê chi phí, Danh sách vật tư) |
| **Backend API** | Google Apps Script (Serverless) | Xử lý các endpoint REST API `doGet` / `doPost`, phân quyền người dùng, hẹn giờ Cloud Trigger |
| **Cơ sở dữ liệu** | Google Sheets (`PlantLog Pro Database`) | Cơ sở dữ liệu quan hệ dạng bảng tính đám mây, dễ dàng xem và quản lý trực tiếp bằng Google Drive |
| **Hosting & CI/CD** | GitHub Pages & GitHub Actions | Tự động triển khai từ thư mục `src/` mỗi khi có commit đẩy lên nhánh `main` |
| **Tích hợp bên ngoài** | Telegram Bot API, Google Calendar API, Power Automate Webhook | Đẩy thông báo tự động, đồng bộ lịch công tác, đồng bộ dữ liệu sang SharePoint / Microsoft Lists |

---

## 3. 📊 CẤU TRÚC DỮ LIỆU GOOGLE SHEETS (DATABASE SCHEMA)

Cơ sở dữ liệu Google Sheets mang tên **`PlantLog Pro Database`** bao gồm 14 sheet tab với các cột trường thông tin chuẩn hóa:

| Tên Sheet Tab | Mô tả dữ liệu | Danh sách các cột (Columns) |
|---|---|---|
| **`Trips`** | Danh sách chuyến công tác | `ID`, `Plant`, `Location`, `Date`, `DateEnd`, `Purpose`, `Contact`, `Transport`, `Status`, `Notes`, `Flight`, `TA`, `SavedReports`, `CreatedAt` |
| **`Flight_TA_Schedule`** | Bảng lịch bay bóc tách riêng (Sync Microsoft Lists) | `TripID`, `TACode`, `Plant`, `Location`, `Date`, `DateEnd`, `Purpose`, `OutboundDepart`, `OutboundArrive`, `ReturnDepart`, `ReturnArrive` |
| **`Tasks`** | Danh mục nhiệm vụ & công việc | `ID`, `Title`, `Description`, `Category`, `DateStart`, `TimeStart`, `DateEnd`, `TimeEnd`, `Hours`, `Minutes`, `Priority`, `Period`, `Machine`, `Plan`, `TripID`, `Status`, `Checklist`, `ChecklistJson`, `PartsJson`, `FlightJson`, `FilesJson`, `AutoDuration`, `DurationMins`, `CreatedAt`, `UpdatedAt` |
| **`Bills`** | Hóa đơn chi phí công tác | `ID`, `TripID`, `Date`, `BillNumber`, `Detail`, `Amount`, `Currency`, `VndAmount`, `Category`, `PaymentMethod`, `Notes`, `PhotoCount`, `PhotosJson`, `CreatedAt` |
| **`Reports`** | Báo cáo hiện trường và ký duyệt | `TripID`, `SignoffSummary`, `SignoffResult`, `SignoffRemarks`, `SignedAt` |
| **`Reminders`** | Danh sách nhắc việc định kỳ | `ID`, `Title`, `Freq`, `Weekday`, `Monthday`, `YearMonth`, `YearDay`, `Time`, `Note`, `NotifyTele`, `NotifyCalendar`, `Status`, `CreatedAt` |
| **`Checklist`** | Chi tiết các mục kiểm tra hiện trường | `TripID`, `ItemID`, `Name`, `Result`, `Note` |
| **`Readings`** | Số liệu đo đạc thông số kỹ thuật | `TripID`, `Type`, `Name`, `Tag`, `Value`, `Unit`, `Status`, `Condition`, `Notes` |
| **`Issues`** | Danh sách sự cố phát hiện tại máy | `TripID`, `Title`, `Description`, `Severity`, `IssueStatus`, `Action`, `PhotoCount` |
| **`Team`** | Thành viên đoàn công tác & người ký | `TripID`, `Name`, `Role`, `Organization`, `SignoffRequired` |
| **`Leave`** | Lịch đăng ký nghỉ phép của kỹ sư | `Date`, `Type`, `Note` |
| **`Machines`** | Danh mục thiết bị / máy móc | `Name` |
| **`Plans`** | Danh mục kế hoạch / dự án | `Name` |
| **`SyncLog`** | Nhật ký lịch sử các phiên đồng bộ | `Timestamp`, `Action`, `Entity`, `EntityID`, `Status`, `Details` |

---

## 4. 🚀 TÍNH NĂNG VÀ NGHIỆP VỤ CHI TIẾT

### 4.1. Quản lý Chuyến công tác (Trips)
* **Vòng đời trạng thái:** `planned` (Đã lên kế hoạch) ➔ `in_progress` (Đang thực hiện) ➔ `done` (Hoàn thành).
* **Cơ chế Auto-Start thông minh:**
  * **Trên Cloud:** Vào lúc 7:00 sáng mỗi ngày, Cloud Trigger của Google Apps Script (`autoStartInSheets`) tự động rà soát, so sánh ngày hiện tại và cập nhật trực tiếp trạng thái trên Google Sheets từ `planned` sang `in_progress`.
  * **Trên App:** Hàm `autoStartTodayItems()` tự động kiểm tra khi mở app, bảo vệ trạng thái cục bộ không bị hạ cấp đè ngược lại bởi dữ liệu cũ từ Sheets và đồng bộ ngay lên Cloud.
* **Sắp xếp chuyến mới nhất:** Hàm `getSortedTrips()` đảm bảo tất cả các dropdown chọn chuyến công tác (ở Task modal, Bill modal, Export PDF) luôn ưu tiên chuyến gần nhất lên trên cùng.
* **Chi tiết vé máy bay (Flight Info):** Lưu trữ đầy đủ hãng hàng không, số hiệu chuyến bay, chặng đi/về (`From -> To`), giờ cất cánh/hạ cánh và mã đặt chỗ (`PNR`).

### 4.2. Quản lý Nhiệm vụ & Kanban (Tasks)
* **Phân loại đa dạng:** Work (Sửa chữa/bảo trì), Travel (Di chuyển), Meeting (Họp), Training (Đào tạo), Leave (Nghỉ phép).
* **Giao diện làm việc đôi:** Chuyển đổi linh hoạt giữa Dạng danh sách (`List view`) và Bảng công việc (`Kanban view`).
* **Quản lý Linh kiện / Phụ tùng (Parts & Materials):**
  * Đính kèm danh sách linh kiện cần thay thế hoặc chuẩn bị cho từng công việc.
  * Mỗi linh kiện lưu: Số phụ tùng (Part No.), Mô tả, Hãng sản xuất, Số lượng, Máy móc lắp đặt, và Trạng thái có mã màu (*❌ Not Yet · 📦 On Order · ✅ Ready*).
  * **Xuất dữ liệu:** Xuất danh sách phụ tùng ra file **Excel (CSV với UTF-8 BOM)** đọc chuẩn tiếng Việt hoặc tệp **PDF A4 nằm ngang**.

### 4.3. Báo cáo Hiện trường 6 bước & Xuất PDF Kỹ thuật
* **Quy trình 6 bước chuẩn mực:**
  1. **Checklist:** Kiểm tra từng hạng mục (Đạt `✓`, Lỗi `✕`, Không áp dụng `–`).
  2. **Readings:** Đo đạc điện áp, dòng điện, nhiệt độ, áp suất, độ rung...
  3. **Issues:** Ghi nhận sự cố, phân loại mức độ nghiêm trọng, giải pháp đề xuất kèm chụp ảnh hiện trường.
  4. **Team:** Khai báo danh sách kỹ sư, đại diện khách hàng tham gia nghiệm thu.
  5. **Tasks:** Tổng hợp các việc đã làm, hiển thị rõ ràng nội dung Mô tả công việc (`Task Description`).
  6. **Sign-off:** Ký duyệt trực tiếp trên màn hình cảm ứng điện thoại bằng ngón tay hoặc bút cảm ứng (`Canvas signature`).
* **Xuất file PDF chuyên nghiệp (`exportReportPDF`):**
  * Tự động tính toán tổng số giờ: **Tổng giờ làm việc (`Total Work Hours`)**, **Tổng giờ di chuyển (`Total Travel Hours`)**, **Tổng giờ nghỉ (`Total Leave Hours`)**.
  * Định dạng thông tin chuyến bay không bị tràn chữ, chuẩn hóa ký tự Unicode để tương thích hoàn toàn font Helvetica PDF.
  * Bổ sung đầy đủ thông tin kỹ sư lập báo cáo (Tên, Chức danh, Công ty) khớp 100% với giao diện xem trước.

### 4.4. Quản lý Hóa đơn & Chi phí (Bills & Expenses)
* Nhập số hóa đơn, ngày thanh toán, nội dung, số tiền, loại tiền (VND, USD, EUR, THB...) và tự động tính quy đổi ra VND (`VndAmount`).
* **3 Hình thức thanh toán với mã màu nhận diện trực quan:**
  * 💵 **`1-Cash`**: Nhãn xanh lá, đường viền trái 4px màu ngọc lục bảo (`#059669`).
  * 🏦 **`2-Bank transfer`**: Nhãn xanh dương, đường viền trái 4px màu xanh lam (`#2563EB`).
  * 💳 **`3-Credit card`**: Nhãn tím, đường viền trái 4px màu tím đậm (`#7C3AED`).
* Hỗ trợ chụp và đính kèm ảnh chụp hóa đơn chứng từ.
* Xuất file **PDF Bảng kê chi phí** theo từng chuyến đi, phục vụ thanh toán công tác phí nhanh gọn với phòng kế toán.

### 4.5. Nhắc việc định kỳ & Quản lý Nghỉ phép (Reminders & Leave)
* Thiết lập nhắc việc theo chu kỳ: Hàng ngày, hàng tuần, hàng tháng hoặc hàng năm.
* Tự động gửi thông báo nhắc nhở qua Telegram và tạo sự kiện trên Google Calendar.
* Lịch xem trực quan toàn bộ các ngày đi công tác và ngày nghỉ phép theo từng tháng.

---

## 5. 🌐 HỆ THỐNG TÍCH HỢP TỰ ĐỘNG HÓA

### 5.1. Telegram Bot
* **Thông báo sáng (7:00 AM):** Server Apps Script tự động kích hoạt trigger gửi danh sách các chuyến đi đang hoạt động, các nhiệm vụ cần làm trong ngày và các lịch nhắc việc đến nhóm Telegram kỹ thuật.
* **Thông báo tức thì khi hoàn thành chuyến đi:** Ngay khi kỹ sư bấm hoàn thành báo cáo ("*Mark completed*"), ứng dụng tự động gửi toàn bộ bản tổng kết chuyến đi (Thông tin chuyến, kết quả kiểm tra, người ký, chi phí) tới Telegram Bot.

### 5.2. Đồng bộ Microsoft Lists & Power Automate (v4.8)
* Backend Google Apps Script tự động lọc các chuyến đi có mã TA (Travel Authorization) hoặc vé bay, bóc tách thành 10 trường dữ liệu cơ bản đưa vào tab riêng **`Flight_TA_Schedule`**.
* Tự động gọi **Webhook Power Automate** để đẩy dữ liệu lên hệ thống SharePoint / Microsoft Lists của tập đoàn với logic Upsert (tự động cập nhật nếu đã có, tránh trùng lặp bản ghi).

---

## 6. 📖 HƯỚNG DẪN THIẾT LẬP VÀ CÀI ĐẶT

### 6.1. Thiết lập Backend Google Apps Script
1. Truy cập [script.google.com](https://script.google.com/) và tạo một dự án mới mang tên `PlantLog Pro Backend`.
2. Sao chép toàn bộ nội dung tệp [`PlantLog_GoogleAppsScript_Pro.gs`](file:///d:/AI%20Lean/Plantlog-pro-main/PlantLog_GoogleAppsScript_Pro.gs) dán vào trình soạn thảo Apps Script và bấm Lưu (Ctrl+S).
3. Chạy hàm `setupSheets()` một lần:
   * Google sẽ yêu cầu cấp quyền truy cập (Drive, Spreadsheets, URL Fetch).
   * Bấm *Review Permissions* ➔ *Advanced* ➔ *Go to PlantLog (unsafe)* ➔ *Allow*.
   * Hệ thống sẽ tự động tạo bảng tính `PlantLog Pro Database` trên Google Drive với đầy đủ 14 sheet tab chuẩn hóa.
4. Bấm **Deploy (Triển khai)** ➔ **New deployment (Triển khai mới)**:
   * Loại: **Web app**.
   * Execute as: **Me** (Tôi).
   * Who has access: **Anyone** (Bất kỳ ai).
5. Sao chép đường dẫn Web App (kết thúc bằng `/exec`).
6. Mở PlantLog Pro trên điện thoại/trình duyệt ➔ vào mục **Settings (Cài đặt)** ➔ **Google Sheets Sync** ➔ dán đường link `/exec` vào và bấm **Sync**.

### 6.2. Cài đặt Web App (PWA) trên Thiết bị Di động
* **Trên iPhone / iPad (Safari):**
  1. Mở liên kết ứng dụng trên trình duyệt Safari.
  2. Bấm vào nút **Chia sẻ** (Share icon ⎋ ở thanh công cụ dưới).
  3. Cuộn xuống và chọn **Thêm vào Màn hình chính (Add to Home Screen)**.
  4. Bấm **Thêm (Add)** ở góc trên bên phải.
* **Trên điện thoại Android (Google Chrome):**
  1. Mở liên kết ứng dụng trên Google Chrome.
  2. Bấm vào biểu tượng **3 chấm (⋮)** ở góc trên bên phải.
  3. Chọn **Cài đặt ứng dụng (Install App)** hoặc **Thêm vào Màn hình chính**.
  4. Xác nhận cài đặt. Ứng dụng sẽ xuất hiện như một app độc lập, toàn màn hình và hoạt động mượt mà không có thanh địa chỉ trình duyệt.

---

## 7. 📜 LỊCH SỬ CÁC PHIÊN BẢN NÂNG CẤP (CHANGELOG SUMMARY)

* **v4.8 (25/09/2026):**
  * Tích hợp đồng bộ dữ liệu sang Microsoft Lists công ty.
  * Tự động bóc tách Sheet tab riêng `Flight_TA_Schedule` gồm 10 trường thông tin chuẩn hóa.
  * Tích hợp Webhook gọi thẳng sang Power Automate.
* **v4.7 (20/09/2026):**
  * Bổ sung mục Mô tả công việc chi tiết (`Task Description`) vào giao diện báo cáo và file PDF xuất ra.
  * Khắc phục triệt để lỗi CSS hiển thị nút chọn Checklist Pass/Fail.
  * Tự động tổng hợp và hiển thị Tổng số giờ làm việc (`Total Work Hours`), giờ di chuyển (`Travel Hours`), giờ nghỉ (`Leave Hours`).
  * Hiển thị chi tiết chuyến bay (`Flight Details`) trong phần TRIP INFO trên PDF chuẩn font không lỗi ký tự.
* **v4.6 (10/08/2026):**
  * Sửa lỗi Cloud Trigger 7h sáng trên Google Apps Script (`parseSheetDateStr_`) đảm bảo cập nhật trạng thái tự động sang `in_progress`.
  * Cơ chế bảo vệ trạng thái Active cục bộ trên app khi kéo dữ liệu từ Sheets về.
  * Nâng cấp Service Worker v11.
* **v4.5 (08/08/2026):**
  * Bổ sung lựa chọn Hình thức thanh toán cho hóa đơn: `1-Cash`, `2-Bank transfer`, `3-Credit card`.
  * Bổ sung viền màu nhận diện hóa đơn và sửa lỗi đồng bộ 2 chiều trường thanh toán lên Google Sheets.
* **v4.4 (28/07/2026):**
  * Khắc phục lỗi reset trạng thái Auto-start khi mở app.
  * Bổ sung hàm `getSortedTrips()` đưa chuyến mới nhất lên đầu danh sách chọn.
  * Tự động gửi báo cáo sang Telegram khi nhấn "Mark completed".
* **v4.3 (15/07/2026):**
  * Bổ sung phân hệ quản lý Vật tư / Phụ tùng (`Parts & Materials`) kèm xuất file Excel và PDF.
* **v4.2 (01/07/2026):**
  * Cô lập mã PIN bảo mật với khóa riêng `plpro1` / `plprosec1`.
  * Thêm thanh chuyển trạng thái nhanh Planned / Active / Done cho chuyến đi.
* **v4.1 & v4.0 (06/2026):**
  * Tách riêng cơ sở dữ liệu `PlantLog Pro Database`.
  * Tái cấu trúc từ file đơn 5.000 dòng thành kiến trúc 7 module chuẩn hóa.
