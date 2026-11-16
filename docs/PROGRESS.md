# BẢNG THEO DÕI TIẾN ĐỘ DỰ ÁN (PROJECT PROGRESS TRACKER)

Dự án: **Nền tảng kết nối đi nhờ và gửi đồ theo chuyến xe tích hợp AI hỗ trợ điều phối**  
Trạng thái ký hiệu:
- 🟢 `[x]` : **Đã hoàn thành & Kiểm tra đạt**
- 🟡 `[-]` : **Đang thực hiện**
- 🔴 `[ ]` : **Chưa thực hiện**

---

## 1. BẢNG TỔNG QUAN TIẾN ĐỘ CÁC GIAI ĐOẠN

| Giai đoạn | Mô tả nội dung chính | Trạng thái | Ngày dự kiến |
| :---: | :--- | :---: | :---: |
| **Giai đoạn 1** | Khởi tạo monorepo (FE + BE), Prisma schema từ DBML, migration, seed, unit test core | 🟢 **Đã hoàn thành** | Ngày 1 |
| **Giai đoạn 2** | Auth + Phân quyền (requireRole) + Hồ sơ cá nhân + Quên mật khẩu (CM-01..03) | 🟢 **Đã hoàn thành** | Ngày 2 |
| **Giai đoạn 3** | Quản lý Phương tiện + Tạo chuyến + Quản lý chuyến (DR-04, DR-01, DR-05) + Map ORS | 🟢 **Đã hoàn thành** | Ngày 3 |
| **Giai đoạn 4** | Yêu cầu vận chuyển + Duyệt + Điều hành chuyến (US-01, US-03, DR-02, DR-03) + Thông báo | 🟢 **Đã hoàn thành** | Ngày 4 |
| **Giai đoạn 5** | Các tác vụ hệ thống tự động (CS-01..03: đóng chuyến -6h, chốt hủy tuần, mở khóa) | 🟢 **Đã hoàn thành** | Ngày 5 |
| **Giai đoạn 6** | Tìm kiếm AI Gemini (US-02) + Dự phòng CS-05 + Sự cố (CM-04) + Admin (AD-01..03) | 🟢 **Đã hoàn thành** | Ngày 6 |
| **Giai đoạn 7** | Docker, Nginx, tối ưu giao diện Stitch, tài liệu hướng dẫn deploy VPS | 🟡 **Kế tiếp (Chặng cuối)** | Ngày 7 |

---

## 2. BẢNG THEO DÕI CHI TIẾT TỪNG CHỨC NĂNG

### 2.1. Chức năng Dùng chung (Common - CM)
| Mã | Tên chức năng | Trạng thái | Tầng Backend | Giao diện Frontend | Ghi chú & Commit |
| :---: | :--- | :---: | :---: | :---: | :--- |
| `CM-01` | Đăng ký tài khoản (User / Driver) | 🟢 Đã xong | `[x]` | `[x]` | Role cố định, không đổi SĐT sau đăng ký |
| `CM-02` | Đăng nhập hệ thống (JWT) | 🟢 Đã xong | `[x]` | `[x]` | Kiểm tra trạng thái khóa (LOCKED_TEMP, LOCKED_PERM) |
| `CM-03` | Quản lý hồ sơ cá nhân (Họ tên, email, avatar, đổi mật khẩu) | 🟢 Đã xong | `[x]` | `[x]` | Upload avatar qua Multer |
| `CM-EXTRA` | Quên & Đặt lại mật khẩu (Token 15p) | 🟢 Đã xong | `[x]` | `[x]` | Xác thực SĐT + Email, JWT Token an toàn |
| `CM-04` | Báo cáo sự cố (User / Driver gửi báo cáo) | 🟢 Đã xong | `[x]` | `[x]` | Gửi sự cố từ Lịch sử chuyến đi (`IncidentReport`) |

### 2.2. Chức năng Tài xế (Driver - DR)
| Mã | Tên chức năng | Trạng thái | Tầng Backend | Giao diện Frontend | Ghi chú & Commit |
| :---: | :--- | :---: | :---: | :---: | :--- |
| `DR-01` | Tạo chuyến xe (>= 24h, ORS routing, snapshot xe) | 🟢 Đã xong | `[x]` | `[x]` | Kiểm tra chồng lịch không đệm, snapshot sức chứa, polyline |
| `DR-02` | Quản lý yêu cầu vận chuyển (Xem danh sách, Chấp nhận, Từ chối) | 🟢 Đã xong | `[x]` | `[x]` | Khóa nguyên tử khi chấp nhận, ẩn/hiện SĐT theo trạng thái ACCEPTED |
| `DR-03` | Điều hành chuyến xe (Bắt đầu, Cập nhật tiến trình đón/trả/giao, Kết thúc) | 🟢 Đã xong | `[x]` | `[x]` | Chỉ hoàn thành khi tất cả request đã kết thúc |
| `DR-04` | Quản lý phương tiện (Thêm xe kèm ảnh, Bật/Tắt hoạt động) | 🟢 Đã xong | `[x]` | `[x]` | Không trùng loại xe + biển số; không tắt xe đang chạy |
| `DR-05` | Quản lý danh sách chuyến & Hủy chuyến | 🟢 Đã xong | `[x]` | `[x]` | Hủy chuyến chuyển request thành CANCELLED & báo User |

### 2.3. Chức năng Người dùng (User - US)
| Mã | Tên chức năng | Trạng thái | Tầng Backend | Giao diện Frontend | Ghi chú & Commit |
| :---: | :--- | :---: | :---: | :---: | :--- |
| `US-01` | Tạo yêu cầu vận chuyển (Đi nhờ / Gửi đồ) | 🟢 Đã xong | `[x]` | `[x]` | Kiểm tra trắc địa <= 2km từ polyline thực tế, upload ảnh hàng, tự tính m2 |
| `US-02` | Tìm kiếm chuyến xe bằng AI (Gemini tự nhiên) & Bộ lọc | 🟢 Đã xong | `[x]` | `[x]` | Bóc tách ngôn ngữ tự nhiên, kết nối bộ lọc <= 15km |
| `US-03` | Theo dõi trạng thái & Hủy yêu cầu | 🟢 Đã xong | `[x]` | `[x]` | Chỉ hủy khi chưa IN_PROGRESS, hoàn trả sức chứa xe nguyên tử |

### 2.4. Chức năng Quản trị viên (Admin - AD)
| Mã | Tên chức năng | Trạng thái | Tầng Backend | Giao diện Frontend | Ghi chú & Commit |
| :---: | :--- | :---: | :---: | :---: | :--- |
| `AD-01` | Quản lý tài khoản & Mở khóa tài khoản | 🟢 Đã xong | `[x]` | `[x]` | Bắt buộc nhập lý do (>=10 ký tự), ghi audit_logs, đổi REVOKED vi phạm |
| `AD-02` | Quản lý và xử lý sự cố (4 trạng thái) | 🟢 Đã xong | `[x]` | `[x]` | Không nhảy cóc: NOT_RECEIVED -> RECEIVED -> PROCESSING -> RESOLVED, gửi notification |
| `AD-03` | Thống kê chuyến theo ngày (Hoạt động / Kết thúc) | 🟢 Đã xong | `[x]` | `[x]` | Bộ lọc theo ngày/tuần/tháng, xem chi tiết từng chuyến, KPI tổng quan |

### 2.5. Cơ chế Hệ thống Tự động (System - CS)
| Mã | Tên cơ chế | Trạng thái | Test Unit/Integration | Cron Job | Ghi chú & Commit |
| :---: | :--- | :---: | :---: | :---: | :--- |
| `CS-01` | Đóng chuyến -6h & Hết hạn yêu cầu PENDING | 🟢 Đã xong | `[x]` | `[x]` | Quét mỗi phút + chạy bù khi reboot |
| `CS-02` | Chốt tỷ lệ hủy tuần (T2-CN, giờ VN) & Khóa tài khoản | 🟢 Đã xong | `[x]` | `[x]` | Tỷ lệ > 5%: lần 1 khóa 2 tuần, lần 2 khóa vĩnh viễn |
| `CS-03` | Tự động mở khóa tài khoản LOCKED_TEMP sau 14 ngày | 🟢 Đã xong | `[x]` | `[x]` | Quét định kỳ hằng giờ + chạy bù khi reboot |
| `CS-04` | Kiểm tra sức chứa & Chống chồng lịch nguyên tử | 🟢 Đã xong | `[x]` | `[x]` | Transaction + SELECT FOR UPDATE |
| `CS-05` | Dự phòng khi AI / Map gặp lỗi | 🟢 Đã xong | `[x]` | `[x]` | Regex Fallback Engine tự động khi Gemini API lỗi/hết quota |

---

## 3. LỊCH SỬ CẬP NHẬT VÀ TIẾN TRÌNH THỰC HIỆN
- **2026-11-16 (Giai đoạn 6 - CHẶNG 3: HỆ THỐNG QUẢN TRỊ VIÊN ADMIN DASHBOARD - AD-01, AD-02, AD-03)**:
  - **AD-01: Quản lý & Mở khóa tài khoản**:
    - Backend: Xây dựng `AdminService.getUsers` và `AdminService.unlockUser` với bộ lọc vai trò, trạng thái vi phạm, từ khóa.
    - Cơ chế mở khóa kiểm toán: Bắt buộc Admin nhập lý do giải trình ($\ge 10$ ký tự), chuyển trạng thái `User.status = 'ACTIVE'`, thu hồi vi phạm `Violation.status = 'REVOKED'`, ghi vết vào `audit_logs` (`UNLOCK_ACCOUNT`) và gửi `Notification` thông báo cho người dùng.
    - Frontend: Trang `/admin/users` với giao diện bảng hiện đại, bộ lọc trực quan, thẻ trạng thái, thông tin chi tiết vi phạm và modal mở khóa tài khoản.
  - **AD-02: Quy trình Xử lý Sự cố 4 bước chuẩn mực**:
    - Backend: Xây dựng `AdminService.getIncidents` và `AdminService.updateIncidentStatus`.
    - Máy trạng thái nghiêm ngặt (chống nhảy cóc): `NOT_RECEIVED` ➔ `RECEIVED` ➔ `PROCESSING` ➔ `RESOLVED`.
    - Tự động ghi nhận `handled_by`, `result_note` và gửi thông báo tiến trình cho người báo cáo qua từng bước.
    - Frontend: Trang `/admin/incidents` với thanh tiến trình 4 bước trực quan, bộ lọc tabs theo trạng thái, modal nhập kết luận giải quyết sự cố.
  - **AD-03: Thống kê & Báo cáo Vận hành Chuyến xe theo Ngày**:
    - Backend: Xây dựng `AdminService.getStatisticsOverview` và `AdminService.getTripsByDate` tính toán các KPI vận hành: tổng chuyến, hoàn thành, hủy, tỷ lệ hủy (%), tổng lượt phục vụ, tổng chi phí nhiên liệu/sạc chia sẻ và tiến trình phân rã theo ngày.
    - Frontend: Trang `/admin/statistics` với 4 thẻ KPI Dashboard, biểu đồ thanh tỷ lệ theo ngày (`daily_breakdown`) và bảng tra cứu chuyến xe chi tiết theo từng ngày (kèm thông tin tài xế, xe, số khách, lộ trình và chi phí nhiên liệu).
  - **Điều hướng & Phân quyền**: Đăng ký các tuyến đường bảo vệ `ADMIN` trong `App.tsx`, liên kết trực tiếp trên Navbar và Profile Dropdown.
  - **Kiểm thử**: Viết mới `backend/tests/admin-dashboard.test.ts` (11 tests). Toàn bộ **79/79 Vitest tests passed 100%** trên CSDL Neon Cloud. Build Frontend & Backend đạt **0 lỗi**.
- **2026-11-16 (Giai đoạn 6 - CHẶNG 2: TÌM KIẾM AI GEMINI (US-02), DỰ PHÒNG CS-05 & HỆ THỐNG LỊCH SỬ CHUYẾN XE)**:
  - **AI Adapter Gemini (`US-02`)**: Tích hợp `backend/src/adapters/ai/gemini.ts` kết nối Google Gemini API (`gemini-1.5-flash`), phân tích câu tự nhiên tiếng Việt bóc tách điểm xuất phát, điểm đến, ngày giờ và số người/kiện hàng.
  - **Cơ chế Dự phòng Thông minh (`CS-05`)**: Tích hợp Regex Fallback Engine xử lý mượt mà khi API key thiếu/lỗi/hết quota, tự động bóc tách từ khóa mà không làm gián đoạn trải nghiệm người dùng.
  - **Giao diện Tìm kiếm AI**: Bổ sung tab tìm kiếm bằng AI trên `SearchTrips.tsx`, các prompt mẫu (chips), banner hiển thị kết quả phân tích AI và nút làm mới.
  - **Lịch sử Chuyến xe Tài xế (`/driver/history`)**: Trang quản lý các chuyến `COMPLETED` / `CANCELLED`, kèm 4 thẻ Dashboard thống kê: tổng chuyến thành công, chuyến hủy, lượt khách phục vụ và tổng tiền chi phí nhiên liệu/sạc đã nhận.
  - **Lịch sử Chuyến xe Người dùng (`/user/history`)**: Trang quản lý các yêu cầu đi nhờ/gửi đồ đã hoàn thành/hủy, thông tin xe, số tiền đã đóng góp và modal **"Báo cáo sự cố"** gửi trực tiếp lên CSDL cho Admin.
  - **Điều hướng Navbar**: Bổ sung menu "Lịch sử chuyến xe" (Tài xế) và "Lịch sử chuyến đi" (Người dùng) trên Navbar và Profile Dropdown.
  - **Kiểm thử**: Viết mới `backend/tests/ai-search-history.test.ts` (9 tests), toàn bộ **68/68 Vitest tests passed 100%**.
- **2026-11-16 (Giai đoạn 6 - CHẶNG 1: HOÀN THIỆN ĐIỀU PHỐI HUB-TO-HUB & CƠ CHẾ CHIA SẺ CHI PHÍ NHIÊN LIỆU)**:
  - **Mô hình Hub-to-Hub**: Loại bỏ việc nhập điểm đón/trả tùy biến của khách hàng. Điểm đón/trả mặc định gắn liền với điểm xuất phát và kết thúc của chuyến xe.
  - **Bộ lọc tìm kiếm 15km & Autocomplete**: Tích hợp gợi ý địa điểm thông minh (Autocomplete Geocoding) trên trang chủ `/` và trang tìm kiếm `/trips`. Hệ thống lọc chuyến xe có điểm xuất phát cách điểm đi $\le 15\text{ km}$ và điểm kết thúc cách điểm đến $\le 15\text{ km}$, kèm thông số khoảng cách trực quan trên thẻ chuyến.
  - **Cơ chế tính chi phí nhiên liệu/sạc điện chia sẻ**:
    - Khi duyệt chuyến/tìm kiếm: Thẻ chuyến xe và Chi tiết chuyến xe hiển thị tổng chi phí nhiên liệu cho toàn bộ chuyến xe (`Chi phí nhiên liệu/sạc điện cho chuyến xe: xxx đ`). Tuyệt đối không hiển thị con số chia sẻ mỗi người khi xe chưa chạy.
    - Thời điểm chốt chi phí: Chỉ khi tài xế bấm nút **"Bắt đầu hành trình"** (`startTrip`), hệ thống mới tính toán chia đều cho tổng số người/suất tham gia thực tế trên xe.
    - Công thức trọng số: Đi nhờ $N$ người tính $N$ suất (ví dụ: đi 3 người tính chi phí x3 so với 1 kiện hàng); gửi đồ tính 1 suất.
    - Cập nhật số tiền hỗ trợ vào chi tiết chuyến xe và thông báo cho từng hành khách.
  - **Kích hoạt nút điều hành chuyến**: Các nút "Đã đón khách lên xe" và "Đã nhận hàng vào cốp" trong trang Điều hành chuyến xe chỉ được kích hoạt khi tài xế đã bấm "Bắt đầu hành trình" (`trip.status === 'IN_PROGRESS'`).
  - **Liên kết trải nghiệm**: Bổ sung nút "Xem chi tiết chuyến xe" trong trang "Yêu cầu của tôi" (`MyRequests.tsx`).
- **2026-11-12 (Giai đoạn 5 - HOÀN THÀNH TOÀN DIỆN)**:
  - Hoàn thành module Tác vụ Tự động Ngầm (`scheduler`): Tích hợp `node-cron` và tính toán chuẩn múi giờ Việt Nam (`Asia/Ho_Chi_Minh`) bằng `date-fns-tz`.
  - Thực thi cơ chế `CS-01`: Quét tự động mỗi phút (cron `* * * * *`) đóng chuyến xe khi thời gian khởi hành $\le \text{now} + 6\text{h}$, tự động chuyển tất cả yêu cầu `PENDING` thành `EXPIRED` và gửi thông báo in-app cho cả tài xế và hành khách.
  - Thực thi cơ chế `CS-02`: Chốt tỷ lệ hủy tuần (chạy 23:59 Chủ Nhật giờ VN cho tuần T2-CN):
    - Tính mẫu số (tổng yêu cầu đã được xác nhận, loại trừ chuyến bị tài xế hủy).
    - Tính tử số (hủy sau khi duyệt, failed do lỗi khách: `WRONG_INFO`, `UNREACHABLE`, `ABSENT`).
    - Nếu tỷ lệ hủy $> 5\%$: Xử phạt vi phạm lần 1 tạm khóa 14 ngày (`LOCKED_TEMP`), tái phạm lần 2 khóa vĩnh viễn (`LOCKED_PERM`), ghi nhận `AuditLog` hệ thống và gửi thông báo.
  - Thực thi cơ chế `CS-03`: Tự động mở khóa tài khoản `LOCKED_TEMP` sau 14 ngày (quét định kỳ mỗi 10 phút), phục hồi trạng thái `ACTIVE`, ghi `AuditLog` và gửi thông báo mở khóa.
  - Tích hợp cơ chế Chạy bù (Catch-up Bootstrap) trong `server.ts` tự động bù đắp các chuyến xe quá hạn -6h và mở khóa tài khoản khi server khởi động lại.
  - Cung cấp API Controller & Routes `/api/scheduler` cho phép kiểm tra trạng thái và kích hoạt thủ công tác vụ ngầm.
  - Nâng cấp trải nghiệm tài xế: Nhấp thông báo chuyển hướng tức thì sang trang điều hành chuyến `/driver/trips/:id/manage`, bổ sung ảnh chụp kiện hàng trực quan, modal xem chi tiết yêu cầu toàn diện và xem ảnh phóng to.
  - Viết 5 integration tests toàn diện cho Scheduler: Toàn bộ **56/56 vitest tests passed 100%** trên CSDL Neon Cloud.
- **2026-11-10 (Giai đoạn 4 - HOÀN THÀNH TOÀN DIỆN)**:
  - Hoàn thành module Yêu cầu vận chuyển (`US-01`): Khách đặt đi nhờ xe (RIDE) hoặc gửi hàng (PACKAGE).
  - Tích hợp kiểm tra trắc địa Turf.js điểm đón/trả phải nằm trong bán kính $\le 2\text{km}$ so với tọa độ uốn lượn thực tế của xe (`route_polyline`).
  - Hỗ trợ gửi hàng đa thông số: upload ảnh chụp kiện hàng, tự động tính diện tích sàn chiếm dụng $m^2 = (dài \times rộng) / 10000$, kiểm tra khối lượng tải tối đa và danh mục hàng gửi.
  - Hoàn thành module Quản lý yêu cầu (`DR-02`): Tài xế duyệt (Chấp nhận / Từ chối kèm lý do). Áp dụng giao dịch nguyên tử Prisma `$transaction` khóa sức chứa xe ngay khi bấm chấp nhận.
  - Thực thi quy tắc bảo mật số điện thoại (Phone Masking): SĐT của hai bên hoàn toàn được giấu kín khi yêu cầu đang `PENDING`, `REJECTED` hoặc `CANCELLED`, và chỉ tự động mở khóa hiển thị khi yêu cầu đạt trạng thái `ACCEPTED`.
  - Hoàn thành module Điều hành chuyến xe (`DR-03`): Trung tâm điều hành chuyến xe `/driver/trips/:id/manage` cho tài xế bắt đầu chuyến (`IN_PROGRESS`), cập nhật tiến trình từng khách (`PICKED_UP` -> `DROPPED_OFF`) hoặc kiện hàng (`PICKED_UP` -> `DELIVERED`), và hoàn thành chuyến xe (`COMPLETED`) khi tất cả yêu cầu đã phục vụ xong.
  - Hoàn thành module Hủy yêu cầu (`US-03`): Khách hàng có thể hủy yêu cầu khi chuyến chưa chạy; nếu yêu cầu đã được duyệt trước đó, hệ thống tự động hoàn trả sức chứa ghế/cốp nguyên tử về lại chuyến xe.
  - Hoàn thành hệ thống Thông báo in-app toàn diện: Tự động gửi thông báo tiếng Việt khi có yêu cầu mới, khi được duyệt/từ chối, khi xe bắt đầu khởi hành, hoàn thành hoặc hủy chuyến.
  - Tích hợp chuông thông báo (Bell notification) trên thanh điều hướng Navbar với bộ đếm badge thời gian thực (polling 20s), popover xem nhanh thông báo, nút "Đánh dấu tất cả đã đọc" và trang toàn bộ thông báo `/notifications`.
  - Xây dựng trang Tìm kiếm chuyến xe `/` và `/trips` với bộ lọc linh hoạt (Điểm đi, Điểm đến, Đi nhờ, Gửi hàng, Sức chứa trống) và xem chi tiết lộ trình kèm bản đồ trực quan `/trips/:id`.
  - Viết 13 Integration Tests toàn diện cho Yêu cầu & Điều hành chuyến: Toàn bộ **47/47 vitest tests passed 100%** trên CSDL Neon Cloud.
- **2026-11-09 (Giai đoạn 3 - NÂNG CẤP HOÀN THIỆN THEO PHẢN HỒI)**:
  - Bổ sung trường "Thời gian kết thúc chuyến dự kiến" (`eta`) cho phép tài xế tùy chỉnh lịch trình hoặc lấy gợi ý tự động từ bản đồ.
  - Nâng cấp cơ chế chống chồng lịch 2 tầng: Ràng buộc cả Tài xế (`driver_id`) và Phương tiện (`vehicle_id`) kèm 1 giờ đệm nghỉ ngơi giữa các chuyến xe liên tiếp.
  - Tích hợp bộ định tuyến OSRM (Open Source Routing Machine) miễn phí 100% không cần API key, trả về tọa độ uốn lượn chính xác bám sát mạng lưới đường cao tốc và quốc lộ Việt Nam.
  - Khắc phục triệt để lỗi nền xám của Leaflet: nhúng CSS trực tiếp vào Vite bundle, tích hợp CartoDB Voyager Tile với tên đường/địa danh tiếng Việt sắc nét và tự động co giãn `ResizeObserver`.
  - Tích hợp thanh tìm kiếm địa điểm thông minh (Geocoding) hỗ trợ tìm bến xe, sân bay, xã/phường/tỉnh trên toàn quốc.
  - Toàn bộ 34/34 Unit & Integration test chạy trên Neon DB đều vượt qua 100%.
- **2026-11-06 (Giai đoạn 3 - HOÀN THÀNH)**:
  - Xây dựng OpenRouteService Map Adapter và module định tuyến (`/api/map/route`) kèm Mock Router thông minh khi chưa có API key.
  - Hoàn thành module Quản lý phương tiện (`DR-04`): thêm xe kèm ảnh chụp upload Multer, bật/tắt hoạt động, chặn tắt xe đang chạy trong chuyến OPEN/CLOSED/IN_PROGRESS.
  - Hoàn thành module Tạo chuyến xe (`DR-01`): kiểm tra thời gian khởi hành >= 24h, snapshot sức chứa xe, chống chồng lịch di chuyển cùng xe nguyên tử, tích hợp tính toán khoảng cách và vẽ polyline.
  - Hoàn thành module Hủy chuyến xe (`DR-05`): kiểm tra chuyến xe OPEN/CLOSED, ghi nhận lý do hủy, chuyển trạng thái và tạo thông báo tự động.
  - Viết 8 integration test cho Vehicle & Trip: 33/33 test passed 100% trên Neon DB.
  - Xây dựng giao diện Frontend: Quản lý phương tiện (`Vehicles.tsx`), Đăng chuyến xe kèm Leaflet Map chọn tọa độ trực quan (`CreateTrip.tsx`), Quản lý danh sách chuyến & Modal hủy chuyến (`MyTrips.tsx`). Cập nhật nhận diện thương hiệu GoX ("Kết nối hành trình – Tối ưu chuyến đi").
- **2026-10-30 (Giai đoạn 2 - HOÀN THÀNH)**:
  - Kết nối Neon PostgreSQL 16 live, đồng bộ 9 bảng và partial unique index.
  - Xây dựng hoàn chỉnh module `auth-account` backend (CM-01, CM-02, CM-03, Quên mật khẩu).
  - Tích hợp Multer upload avatar vào `backend/uploads/` (giới hạn 5MB, JPG/PNG/WEBP).
  - Viết 10 integration test cho Auth: 25/25 test passed 100% trên Neon DB.
  - Xây dựng Frontend UI: Login, Register (chọn vai trò USER/DRIVER), ForgotPassword (2 bước), Profile (đổi thông tin, đổi pass, upload avatar), Navbar với Role badge và AuthContext.
- **2026-10-29 (Giai đoạn 1 - HOÀN THÀNH)**:
  - Khởi tạo kiến trúc Monorepo (`backend/`, `frontend/`, `docs/`).
  - Xây dựng `schema.prisma` chuẩn 100% từ `dbdiagram_cac_bang_chinh.dbml` kèm trường `route_polyline` đã được phê duyệt.
  - Viết file migration SQL với Partial Unique Index `unique_active_user_trip_request` trên PostgreSQL.
  - Viết file `seed.ts` dữ liệu mẫu (1 Admin, 2 Tài xế, 2 Xe, 3 Người dùng, 2 Chuyến xe).
  - Viết 4 bộ Unit Test cốt lõi: Khoảng cách trắc địa 2km Turf.js, Chống trùng lịch không đệm, Kiểm tra sức chứa snapshot, và Thuật toán tỷ lệ hủy tuần > 5%.
  - Khởi tạo Frontend React + Vite + TypeScript + Tailwind với bộ nhận diện thương hiệu chuẩn.
