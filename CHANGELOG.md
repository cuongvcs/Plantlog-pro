# 📝 Nhật ký cập nhật (Changelog) — PlantLog Pro

## [v4.13] - 02/11/2026

### 🚀 Bộ Năng Lực Nghiệp Vụ Kỹ Sư Hiện Trường Chuyên Nghiệp (IMP-19 ➔ IMP-24)

#### 🔴 1. [IMP-19] Nhật Ký Dịch Vụ & Bảng Chấm Công Hiện Trường (Daily Service Ticket & Supervisor Timesheet):
- **Phân bổ chi tiết giờ công tác:** Hỗ trợ chấm công thực tế hàng ngày cho các đợt công tác dài ngày (Multi-day Field Trips), chia thành 5 nhóm: Giờ hành chính (Normal Hours), Làm thêm ngoài giờ (OT 1.5x), Làm ca đêm / Chủ nhật (OT 2.0x), Giờ chờ đợi hiện trường do sự cố máy/nhà máy dừng (Standby Hours) và Thời gian di chuyển (Travel Hours).
- **Chữ ký điện tử Giám sát Nhà máy hàng ngày:** Tích hợp Canvas ký trực tiếp trên màn hình di động cho Giám sát viên phía khách hàng (Plant Supervisor) xác nhận công việc từng ngày, có cơ chế High-DPI chống nhòe và nút Xóa ký lại.
- **Thẻ tổng hợp On-site Timesheet:** Tự động tính toán tổng số giờ On-site (Normal + OT + Standby) và Travel Hours, hiển thị trực quan dạng bảng tổng kết trong Chi tiết chuyến đi và nhúng vào Báo cáo kỹ thuật.

#### 🔴 2. [IMP-20] Tình Trạng Nghiệm Thu Bàn Giao Máy (Machine Readiness Status) & Danh Mục Phụ Tùng Khuyến Nghị (Spare Parts BOM):
- **Tình trạng nghiệm thu 3 cấp độ (Traffic Light System):**
  - 🟢 **Ready for Normal Operation:** Thiết bị hoàn toàn sẵn sàng vận hành bình thường.
  - 🟡 **Conditional / Monitored Operation:** Cho phép chạy có điều kiện (kèm ghi chú hạn mức nhiệt độ, áp suất, độ rung hoặc dải tải tối đa).
  - 🔴 **Stop / Out of Service (Hazard):** Nghiêm cấm chạy máy, phát hiện nguy cơ sự cố hoặc nguy hiểm an toàn.
- **Danh mục vật tư khuyến nghị (Recommended Spare Parts BOM):** Cho phép kỹ sư lập bảng vật tư cần thay thế/dự phòng gồm: Mã phụ tùng (Part No), Tên quy cách mô tả, Số lượng và Cấp độ ưu tiên (🔴 Critical - Khẩn cấp, 🟡 Next PM - Đợt bảo trì tới, ⚪ Optional - Dự phòng).
- **Tích hợp PDF Bàn giao:** Khung tình trạng máy với màu sắc nổi bật và Bảng danh mục phụ tùng khuyến nghị được xuất tự động vào trang ký nghiệm thu của tệp PDF Báo cáo kỹ thuật.

#### 🟠 3. [IMP-21] Hộp Công Cụ Kỹ Thuật Hiện Trường (Field Engineering Toolbox - 100% Offline):
- **Màn hình Hộp công cụ mới (`screen-toolbox`):** Truy cập nhanh từ Trang chủ hoặc Cài đặt, hoạt động 100% không cần kết nối mạng.
- **Bộ chuyển đổi Áp suất đa đơn vị:** Tính toán chuyển đổi tức thì 2 chiều giữa `bar`, `psi`, `kPa`, `MPa` và `kg/cm²`.
- **Bộ chuyển đổi Nhiệt độ & Lưu lượng:** Tính toán chuyển đổi giữa `°C`, `°F`, `Kelvin` và lưu lượng chất lỏng/khí `m³/h`, `L/min`, `GPM`.
- **Máy tính Dòng điện Động cơ 3 pha (3-Phase Motor FLA Calculator):**
  - **Tùy chọn đơn vị công suất kW / HP:** Bổ sung nút chuyển đổi tức thời giữa Kilowatt (`kW`) và Mã lực (`HP` - $1\text{ HP} \approx 0.7457\text{ kW}$), tự động quy đổi giá trị đầu vào mà không cần kỹ sư tính tay.
  - **Tối ưu bố cục giao diện công nghiệp:** Bố trí tuần tự các hàng: Hàng 1 (Motor Power với nút chuyển đổi kW/HP), Hàng 2 (Line Voltage), Hàng 3 (Power Factor - cos φ), Hàng 4 (Efficiency - η nằm ngay dưới dòng Power Factor) giúp nhập liệu trực quan, rõ ràng trên điện thoại.
  - **Tính toán toàn diện:** Tính chính xác dòng đầy tải (Full Load Amps) dựa trên công suất (kW/HP), điện áp (V), hệ số công suất ($\cos\varphi$) và hiệu suất động cơ ($\eta$); tự động đưa ra khuyến nghị dải cài đặt Rơ-le nhiệt bảo vệ (Overload Relay), Cỡ Aptomat MCCB và tiết diện dây đồng tối thiểu.
- **Bộ tính toán Thang đo Tín hiệu Đo lường 4-20mA (Instrumentation Scaler):** Chuyển đổi 2 chiều giữa dòng điện điều khiển $4 - 20\text{ mA}$, Tỉ lệ phần trăm $0 - 100\%$ và Giá trị đo thực tế (Process Variable: Bar, °C, RPM, m³/h...) theo dải hiệu chuẩn Zero (LRV) và Span (URV).

#### 🟠 4. [IMP-22] Sổ Tay Ghi Chú Nhanh & Chụp Ảnh Nhãn Mác (Quick Field Scratchpad & Nameplate Snapper):
- **Nút chụp nhanh "⚡ Quick Snap" trên Trang chủ:** Bật tức thì camera chụp ảnh nhãn mác máy (Nameplate), van, cảm biến hoặc tủ điện.
- **Tự động nén ảnh giữ độ nét văn bản:** Nén ảnh trực tiếp tại Client (`max 1000px`, chất lượng `0.72`) giúp các ký tự thông số trên tem nhãn sắc nét rõ ràng mà dung lượng file cực nhỏ (< 120KB).
- **Phân loại thẻ thông minh (Category Chips):** Phân loại theo Nameplate, Thông số (Param), Báo động (Alarm), Ý tưởng (Idea).
- **Tích hợp Voice-to-Text & Chuyển đổi 1 chạm sang Task / Trip:** Kỹ sư có thể đọc ghi chú bằng giọng nói, lưu lại và chuyển ngay thành Công việc (Task) cần làm hoặc gắn vào Chuyến đi đang thực hiện.

#### 🔴 5. [IMP-23] An Toàn Hiện Trường EHS, Giấy Phép Công Tác & 4 Bước LOTO (Site Safety Checklist):
- **Quản lý Giấy phép công tác (Work Permit):** Lưu số giấy phép, thời hạn hiệu lực và lựa chọn các loại giấy phép rủi ro cao (Làm việc trên cao, Không gian hạn chế, Hàn cắt sinh nhiệt, Đào đất, Nâng hạ, Hóa chất).
- **Quy trình 4 điểm cô lập năng lượng (LOTO 4-Point Verification Checklist):**
  - [1] Cô lập nguồn điện (Electrical Power Isolated).
  - [2] Xả áp khí nén/thủy lực (Pneumatic/Hydraulic Depressurized).
  - [3] Treo thẻ cảnh báo cấm đóng điện (Danger Tags Hung).
  - [4] Thử nghiệm năng lượng bằng không (Zero-Energy Verified & Tried).
- **Mã ổ khóa & Ảnh hiện trường LOTO:** Ghi nhận mã ổ khóa an toàn (Padlock IDs) và chụp ảnh hiện trường điểm khóa thẻ để làm bằng chứng tuân thủ an toàn EHS.
- **Cuộc gọi khẩn cấp 1 chạm (Emergency Call):** Nút quay số trực tiếp đến Phòng Điều Khiển Trung Tâm (CCR), Ban An Toàn EHS và Trạm Y Tế nhà máy ngay khi có sự cố.

#### 🟠 6. [IMP-24] Hồ Sơ Lý Lịch Thiết Bị & Dòng Thời Gian Bảo Trì (Asset Passport & Service Timeline):
- **Màn hình Hồ sơ Thiết bị mới (`screen-assets`):** Quản lý toàn bộ danh mục tài sản máy móc thiết bị của các nhà máy/khách hàng (Tag No, Tên thiết bị, Hãng/Model, Số Serial, Thông số kỹ thuật, Vị trí). Tự động kế thừa và chuyển đổi từ `S.machines` cũ để bảo toàn dữ liệu.
- **Bộ quét Dòng thời gian Lịch sử Bảo trì (Maintenance Timeline Scanner):** Tự động liên kết và trích xuất toàn bộ dữ liệu lịch sử từ các Chuyến đi (`trips`), Phiếu chấm công (`timesheets`), Nhật ký công việc (`tasks`) và Báo cáo (`reports`) có chứa Tag thiết bị.
- **Sổ tay bảo dưỡng trực quan:** Kỹ sư có thể xem toàn bộ các lần bảo dưỡng, thay thế phụ tùng và xử lý sự cố của thiết bị trong quá khứ theo thứ tự thời gian.

#### 🟢 7. Đồng Bộ Đa Bảng Dữ Liệu Hiện Trường Lên Google Sheets (Multi-Sheet Google Cloud Sync):
- **Tạo mới 3 Sheet chuyên dụng trong Google Spreadsheet:**
  - **`QuickSnap`**: Lưu trữ toàn bộ ghi chú nhanh hiện trường (ID, Category, Title, Notes, TripID, Plant, Photo thumbnail, Timestamps).
  - **`SiteSafety`**: Quản lý tập trung hồ sơ an toàn lao động, giấy phép công tác và biên bản 4 điểm cô lập LOTO (TripID, Plant, PermitNo, ValidUntil, PermitTypes, PadlockID, Electrical/Pneumatic Isolated, Danger Tag, Zero-Energy, CCR/EHS/Medical Phones, Photo, UpdatedAt).
  - **`ServiceTickets`**: Bảng chấm công tổng hợp theo ngày công tác phục vụ kế toán, nghiệm thu và thanh toán dịch vụ (ID, TripID, Plant, Date, Normal Hours, OT 1.5x, OT 2.0x, Standby Hours, Travel Hours, Total On-site Hours, Summary, Supervisor Name, Supervisor Signature, Timestamps).
- **Cập nhật Backend Google Apps Script (`PlantLog_GoogleAppsScript.gs` & `PlantLog_GoogleAppsScript_Pro.gs`):** Khai báo bảng định danh `SN` và cột `COLS` chuẩn hóa; tích hợp tạo bảng tự động qua `setupSheets()`, hỗ trợ xuất dữ liệu qua `doGet` (`getAll`) và lưu dữ liệu toàn diện qua `doPost` (`syncAll`).
- **Đồng bộ 2 chiều chống xung đột tại Client (`sync.js`):** Tự động nén ảnh chứng từ/ảnh LOTO/chữ ký trước khi đẩy lên cloud, hỗ trợ giải thuật so khớp thời gian `mergeCollectionByTimestamp` đảm bảo dữ liệu ghi offline không bị ghi đè.

#### 🔧 8. Tinh Chỉnh Sắp Xếp Chuyến Đi Mới Nhất & Hoàn Thiện Đồng Bộ Đám Mây Đa Bảng (Cloud Sync Reliability):
- **Sắp xếp Chuyến đi mới nhất lên trên cùng (Trip Sorting in Quick Snap):**
  - Trong modal Chụp nhanh (`openQuickScratchModal`) và modal Gán chuyến đi (`openAttachScratchTripModal`), danh sách chuyến đi trong menu chọn (`scratch-trip-select`) và bộ chọn chuyến đi được tự động sắp xếp theo thứ tự ngày giảm dần (`b.date - a.date`), đưa các chuyến đi mới nhất/hiện tại lên ngay đầu danh sách giúp kỹ sư chọn nhanh mà không cần cuộn tìm.
- **Kích hoạt Đồng bộ tự động (`svAndSync`):**
  - Tích hợp `svAndSync` ngay khi Lưu/Xóa Ghi chú Quick Snap, Lưu/Xóa Bảng chấm công Service Ticket và Lưu Hồ sơ An toàn LOTO. Mọi thay đổi hiện trường lập tức được đồng bộ lên Google Sheets trong nền mà không cần chờ người dùng nhấn nút thủ công.
- **Tương thích ánh xạ thuộc tính hai chiều (Dual Property Mappings):**
  - Chuẩn hóa đồng bộ hai chiều trong `sync.js` giữa các trường `summary` / `workSummary`, `supervisorSig` / `signature`, `notes` / `text` đảm bảo dữ liệu ghi chú, tóm tắt công việc và chữ ký giám sát được truyền tải đầy đủ 100% lên các sheet `QuickSnap` và `ServiceTickets`.
- **Cơ chế chống treo luồng & bảo vệ tràn ô bảng tính (Google Sheets Cell Overflow Guard):**
  - Bổ sung cơ chế Timeout an toàn (2.5 giây) và kiểm tra chuỗi rỗng trong `compressPhoto()` của client, chống nguy cơ treo vĩnh viễn tiến trình đồng bộ khi gặp ảnh/chữ ký lỗi.
  - Thêm cơ chế tự động giới hạn độ dài chuỗi tối đa 49,000 ký tự trong hàm `writeSheet()` của `PlantLog_GoogleAppsScript.gs` và `PlantLog_GoogleAppsScript_Pro.gs`, ngăn chặn triệt để ngoại lệ vượt giới hạn 50,000 ký tự của Google Sheets (`Cells cannot contain more than 50,000 characters`) khi lưu ảnh và chữ ký số.

---

## [v4.12] - 02/11/2026

### 🚀 Tối Ưu Lối Tắt Truy Cập Lịch Kế Hoạch (IMP-17) & Nâng Cấp Toàn Diện Cơ Chế Chữ Ký Nghiệm Thu (IMP-18)

#### 🔴 1. [IMP-17] Lối Tắt Truy Cập Nhanh Lịch & Kế Hoạch (Calendar & Leave Planner Quick Access):
- **Clickable Dashboard Stat Cards:** Cả 3 thẻ thống kê trên Trang chủ (`Trips`, `Tasks today`, `Leave days`) được chuyển đổi thành các nút tương tác trực tiếp (`.clickable` có hiệu ứng nhấp `scale(0.96)`):
  - Nhấp **Trips** ➔ Mở ngay màn hình Chuyến đi (`screen-trips`).
  - Nhấp **Tasks today** ➔ Mở ngay màn hình Công việc hôm nay (`screen-tasks`).
  - Nhấp **Leave days** ➔ Mở thẳng màn hình Lịch kế hoạch công tác & Nghỉ phép (`screen-leave`), loại bỏ hoàn toàn việc phải vào Settings cuộn trang.
- **Tối ưu vị trí nút Lịch (Di chuyển từ Home sang Trips & giữ ở Tasks):** Để đảm bảo dòng lời chào kỹ sư trên Trang chủ (`Good afternoon, Van Cuong Ngo`) luôn có không gian hiển thị rộng rãi, không bị che khuất hay co nghẽn trên các màn hình di động hẹp, nút Lịch `📅` đã được chuyển sang thanh Topbar của màn hình **Trips (`screen-trips`)** (ngay cạnh nút `＋ Add Trip`) và giữ vững ở màn hình **Tasks (`screen-tasks`)** (cạnh nút `＋ Add Task`). Tại Trang chủ, kỹ sư vẫn có thể mở Lịch tức thì với 1 chạm vào ô thống kê `Leave days`.
- **Lối tắt trên thanh công cụ Tasks:** Bổ sung icon `📅` cạnh nút `＋ Add Task` trên Topbar màn hình Tasks (`screen-tasks`), giúp kỹ sư dễ dàng chuyển đổi qua lại giữa danh mục công việc và Lịch tháng.
- **Điều hướng quay lại thông minh (`window._prevScreen`):** Nút quay lại `←` trên màn hình `screen-leave` tự động ghi nhớ ngữ cảnh màn hình trước đó, đưa người dùng quay lại đúng màn hình Home, Tasks hoặc Settings mà họ vừa xuất phát.

#### 🔴 2. [IMP-18] Khắc Phục Triệt Để Hiển Thị Chữ Ký Báo Cáo & Quản Lý Chữ Ký Cá Nhân (Signature Engine):
- **Khắc phục lỗi mất chữ ký khi Open Report:**
  - Viết lại hàm `renderReportSignature(sigDataUrl)` và kích hoạt tự động trong `gotoStep(5)` ngay khi Bước 6 (Sign-off) hiển thị thực tế trên DOM với kích thước thật, xóa bỏ hoàn toàn hiện tượng vẽ vào Canvas ẩn (`display: none`) gây mất chữ ký.
  - Khắc phục triệt để lỗi tỷ lệ điểm ảnh Retina High-DPI (`dpr`): Tự động tính toán kích thước vẽ theo hệ tọa độ CSS (`cssW`, `cssH`), ngăn chặn hoàn toàn hiện tượng chữ ký bị phóng to 4x – 9x văng ra ngoài khung nhìn của Canvas.
- **Quản lý Chữ ký Cá nhân trong Hồ sơ (Settings ➔ Profile):**
  - Bổ sung trường `S.profile.signature` lưu bền vững trong `localStorage`.
  - Tích hợp khung xem trước chữ ký (thumbnail preview) trong màn hình Cài đặt cùng nút `📁 Upload` ảnh chữ ký và nút `✕ Clear`.
- **Cơ chế Nạp & Tải chữ ký đa năng tại Bước Sign-off:**
  - Nút **"✍️ Dùng chữ ký của tôi" (`useMySig`)**: Tự động ưu tiên lấy chữ ký cá nhân đã lưu trong Profile của kỹ sư để điền vào Canvas và tự động cập nhật ngay vào `curReport.signature` + `sv()`.
  - Nút **"💾 Lưu mặc định" (`saveDefaultSig`)**: Cho phép lưu chữ ký vừa vẽ trực tiếp trên màn hình làm chữ ký mặc định trong Profile để tái sử dụng mãi mãi.
  - Nút **"📁 Tải ảnh" (`uploadSig`)**: Hỗ trợ nạp tệp ảnh chữ ký (PNG/JPG) trực tiếp từ máy ảnh hoặc thư viện ảnh trên điện thoại.
  - Tự động bắt sự kiện `mouseup` và `touchend` để lưu tức thì nét vẽ vào `curReport.signature`, đảm bảo file PDF nghiệm thu luôn có chữ ký 100%.

---

## [v4.11] - 01/11/2026

### 🎨 Triển Khai Toàn Diện Giai Đoạn 4: Hoàn Thiện Trải Nghiệm Người Dùng (UI/UX) & Tương Tác Hiện Trường (IMP-10 ➔ IMP-16)

#### 🔴 1. [IMP-10] Đồng Bộ Thanh Điều Hướng (Bottom Navigation) Chuẩn 5 Tab Trên Toàn Bộ Màn Hình:
- **Nhất quán kiến trúc điều hướng:** Thanh Bottom Navigation chuẩn 5 nút (`Home`, `Trips`, `Tasks`, `Bills`, `Settings`) xuất hiện đồng nhất trên tất cả màn hình chính, bao gồm cả Trang chủ (`screen-home`) và Màn hình Nghỉ phép (`screen-leave`).
- **Tự động theo dõi tab hoạt động (`updateBottomNav`):** Mỗi khi chuyển màn hình qua `showScreen(id)`, ứng dụng tự động kích hoạt trạng thái `.active` đúng cho tab tương ứng, xóa bỏ hoàn toàn hiện tượng sáng nhầm tab hoặc mất thanh điều hướng khi điều hướng sâu.
- **Nút quay lại chuẩn:** Bổ sung nút quay lại trực quan (`⬅ Quay lại`) trên màn hình Nghỉ phép (`screen-leave`) giúp kỹ sư quay về màn hình trước mượt mà.

#### 🔴 2. [IMP-11] Hệ Thống Hộp Thoại Tùy Biến Native Sheet (Custom Dialogs - Xóa Bỏ Hoàn Toàn Prompt / Confirm Browser):
- **Loại bỏ hộp thoại nguyên thủy:** Thay thế toàn bộ 18 vị trí gọi `window.confirm()` và `window.prompt()` mặc định của trình duyệt (vốn bị chặn trên PWA standalone hoặc gây gián đoạn giao diện).
- **Hộp thoại Custom Bottom Sheet bất đồng bộ (`appConfirm`, `appPrompt`):**
  - Xây dựng 2 hàm trả về `Promise<boolean>` và `Promise<string|null>` tích hợp trực tiếp vào DOM (`modal-app-confirm`, `modal-app-prompt`).
  - Giao diện bo góc công nghiệp hiện đại, có nút Cancel và nút Confirm rõ ràng, tự động gắn cờ nguy hiểm `btn-danger` đỏ cho các hành động nhạy cảm (Xóa chuyến đi, Xóa nhiệm vụ, Xóa hóa đơn, Reset PIN, Khôi phục bản sao lưu, Xóa toàn bộ dữ liệu).
  - Hỗ trợ phím tắt bàn phím: bấm `Enter` để xác nhận, bấm `Esc` để hủy.

#### 🟠 3. [IMP-12] Giao Diện Co Giãn Đa Thiết Bị (Responsive Tablet/Desktop) & Bảng Kanban 3 Cột Ngang:
- **Mở rộng không gian hiển thị cho Tablet/Laptop:** Định dạng `@media (min-width: 768px)` nâng trần độ rộng tối đa `max-width: 1080px`, căn giữa mượt mà trên iPad, tablet hiện trường và màn hình máy tính văn phòng.
- **Bảng Kanban 3 cột ngang song song (`.kanban-board`):** Trên tablet và màn hình lớn, 3 trạng thái công việc (`To Do`, `In Progress`, `Done`) tự động chuyển thành 3 cột song song có thanh cuộn riêng, giúp quản trị viên và kỹ sư giám sát toàn diện luồng công việc mà không phải cuộn trang dọc liên tục.
- **Bố cục lưới đa cột (Multi-column CSS Grid):** Chuyển đổi danh sách Thẻ chuyến đi (`.trip-card`), thẻ tài liệu thư viện (`.lib-grid`), danh mục cài đặt (`.settings-grid`) và thẻ thống kê (`.stat-grid`) sang dạng 2 - 3 cột cân đối trên màn hình rộng.

#### 🟠 4. [IMP-13] Chế Độ Giao Diện Tối Công Nghiệp (Dark Mode Industrial Slate):
- **Bảng màu Than Chì Công Nghiệp (`[data-theme="dark"]`):** Thiết kế bảng màu tương phản cao chuyên biệt cho môi trường kỹ thuật hiện trường: Nền sâu `#0B131E`, thẻ card `#15202E`, viền kỹ thuật `#233348`, chữ sáng `#F1F5F9`. Giúp giảm mỏi mắt cho kỹ sư khi làm việc ban đêm, trong buồng máy tối và tiết kiệm tối đa pin OLED.
- **Quản lý cấu hình chủ động (`S.theme`):** Hỗ trợ 3 tùy chọn linh hoạt: `Auto` (tự động theo cài đặt hệ thống của điện thoại/máy tính), `Light` (giao diện sáng), `Dark` (giao diện tối).
- **Cụm điều khiển trực quan:** Tích hợp cụm nút chọn giao diện 3 trạng thái (`☀️ Sáng`, `🌙 Tối`, `⚙️ Tự động`) trong màn hình Cài đặt (Settings), lưu cấu hình bền vững vào `localStorage`.

#### 🟠 5. [IMP-14] Chuẩn Hóa Vùng Bấm Cảm Ứng (Touch Targets ≥ 44px) & Rung Phản Hồi (Haptic Feedback):
- **Chuẩn hóa công thái học cảm ứng di động:** Mở rộng vùng bấm tối thiểu cho tất cả các nút bấm nhỏ (icon thao tác, nút xóa, nút checklist, nút chụp ảnh, tab lọc chi phí) đạt kích thước chuẩn ≥ 44px × 44px, ngăn ngừa hoàn toàn hiện tượng bấm nhầm khi kỹ sư đang di chuyển hoặc đeo găng tay bảo hộ.
- **Rung phản hồi vật lý (`triggerHaptic`):** Tích hợp Web Vibration API phản hồi xúc giác tinh tế (12ms – 40ms) khi kỹ sư bấm nút checklist Pass/Fail, hoàn tất nhiệm vụ, dịch giọng nói, ký duyệt hoặc thực hiện các thao tác xác nhận quan trọng.

#### 🟡 6. [IMP-15] Nâng Cấp Canvas Chữ Ký Số Sắc Nét Cho Màn Hình Retina (High-DPI Scaling):
- **Tự động cân chỉnh độ phân giải Canvas:** Sử dụng `window.devicePixelRatio` để nhân đôi/nhân ba độ phân giải thực của Canvas ký duyệt trong khi vẫn giữ nguyên kích thước hiển thị CSS.
- **Nét ký sắc nét, mượt mà:** Khắc phục triệt để hiện tượng vỡ hạt, răng cưa của nét mực khi ký trên iPhone, iPad Retina và màn hình độ phân giải cao; chữ ký kết xuất vào tệp PDF biên bản nghiệm thu đạt độ chuyên nghiệp và thẩm mỹ cao nhất.

#### 🟡 7. [IMP-16] Thanh Tiến Độ Công Việc Trên Thẻ Chuyến Đi & Widget Tổng Hợp Chi Phí:
- **Thanh tiến độ % công việc (`renderTripList`):** Tích hợp thanh tiến độ mini kèm tỷ lệ hoàn thành phần trăm trực tiếp trên từng Thẻ Chuyến Đi (VD: `3/5 việc (60%)`), tự động chuyển sang dải xanh ngọc hoàn tất khi đạt 100% nhiệm vụ.
- **Widget tóm tắt chi phí chuyến đi (`openTripDetail`):** Tự động tổng hợp toàn bộ các hóa đơn thuộc chuyến đi và hiển thị nổi bật dạng thẻ tài chính công tác `💰 Tổng chi phí: X.XXX.XXX đ (N hóa đơn)`, giúp kỹ sư và quản lý kiểm soát ngân sách tức thì.

#### ⚙️ 8. Nâng Cấp Hệ Thống Đóng Gói (Bundler) & Service Worker Cache:
- **Đồng bộ hóa CSS tự động (`bundle.js`):** Nâng cấp công cụ đóng gói để tự động đọc `src/styles.css` và inject vào thẻ `<style>` của cả `src/index.html` và `plantlog_pro_mobile.html`, đảm bảo tính toàn vẹn 100% giữa phiên bản module hóa và tệp đơn (standalone file).
- **Nâng cấp Service Worker Cache:** Tự động tăng phiên bản cache từ `plantlog-pro-v32` lên `v33` trong `src/sw.js`, đảm bảo trình duyệt client xóa bộ nhớ đệm cũ và cập nhật ngay lập tức giao diện mới khi online.

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
- **Chuẩn hóa ngôn ngữ Tiếng Anh toàn bộ mục Sao lưu (Backup & Restore):** Chuyển đổi 2 dòng nhãn giao diện ("Xuất dữ liệu dự phòng" ➔ "Export Backup Data (.json)", "Khôi phục từ tệp dự phòng" ➔ "Restore from Backup (.json)") cùng toàn bộ hộp thoại thông báo/xác nhận Toast sang Tiếng Anh đồng bộ với toàn bộ ứng dụng.

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
