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
| **Giai đoạn 4** | Yêu cầu vận chuyển + Duyệt + Điều hành chuyến (US-01, US-03, DR-02, DR-03) + Thông báo | 🟡 Kế tiếp | Ngày 4 |
| **Giai đoạn 5** | Các tác vụ hệ thống tự động (CS-01..03: đóng chuyến -6h, chốt hủy tuần, mở khóa) | 🔴 Chưa làm | Ngày 5 |
| **Giai đoạn 6** | Tìm kiếm AI Gemini (US-02) + Dự phòng CS-05 + Sự cố (CM-04) + Admin (AD-01..03) | 🔴 Chưa làm | Ngày 6 |
| **Giai đoạn 7** | Docker, Nginx, tối ưu giao diện Stitch, tài liệu hướng dẫn deploy VPS | 🔴 Chưa làm | Ngày 7 |

---

## 2. BẢNG THEO DÕI CHI TIẾT TỪNG CHỨC NĂNG

### 2.1. Chức năng Dùng chung (Common - CM)
| Mã | Tên chức năng | Trạng thái | Tầng Backend | Giao diện Frontend | Ghi chú & Commit |
| :---: | :--- | :---: | :---: | :---: | :--- |
| `CM-01` | Đăng ký tài khoản (User / Driver) | 🟢 Đã xong | `[x]` | `[x]` | Role cố định, không đổi SĐT sau đăng ký |
| `CM-02` | Đăng nhập hệ thống (JWT) | 🟢 Đã xong | `[x]` | `[x]` | Kiểm tra trạng thái khóa (LOCKED_TEMP, LOCKED_PERM) |
| `CM-03` | Quản lý hồ sơ cá nhân (Họ tên, email, avatar, đổi mật khẩu) | 🟢 Đã xong | `[x]` | `[x]` | Upload avatar qua Multer |
| `CM-EXTRA` | Quên & Đặt lại mật khẩu (Token 15p) | 🟢 Đã xong | `[x]` | `[x]` | Xác thực SĐT + Email, JWT Token an toàn |
| `CM-04` | Báo cáo sự cố (User / Driver gửi báo cáo) | 🔴 Chưa làm | `[ ]` | `[ ]` | Đính kèm chuyến xe liên quan (Giai đoạn 6) |

### 2.2. Chức năng Tài xế (Driver - DR)
| Mã | Tên chức năng | Trạng thái | Tầng Backend | Giao diện Frontend | Ghi chú & Commit |
| :---: | :--- | :---: | :---: | :---: | :--- |
| `DR-01` | Tạo chuyến xe (>= 24h, ORS routing, snapshot xe) | 🟢 Đã xong | `[x]` | `[x]` | Kiểm tra chồng lịch không đệm, snapshot sức chứa, polyline |
| `DR-02` | Quản lý yêu cầu vận chuyển (Xem danh sách, Chấp nhận, Từ chối) | 🔴 Chưa làm | `[ ]` | `[ ]` | Khóa nguyên tử khi chấp nhận, hiện SĐT |
| `DR-03` | Điều hành chuyến xe (Bắt đầu, Cập nhật tiến trình đón/trả/giao, Kết thúc) | 🔴 Chưa làm | `[ ]` | `[ ]` | Chỉ hoàn thành khi tất cả request đã kết thúc |
| `DR-04` | Quản lý phương tiện (Thêm xe kèm ảnh, Bật/Tắt hoạt động) | 🟢 Đã xong | `[x]` | `[x]` | Không trùng loại xe + biển số; không tắt xe đang chạy |
| `DR-05` | Quản lý danh sách chuyến & Hủy chuyến | 🟢 Đã xong | `[x]` | `[x]` | Hủy chuyến chuyển request thành CANCELLED & báo User |

### 2.3. Chức năng Người dùng (User - US)
| Mã | Tên chức năng | Trạng thái | Tầng Backend | Giao diện Frontend | Ghi chú & Commit |
| :---: | :--- | :---: | :---: | :---: | :--- |
| `US-01` | Tạo yêu cầu vận chuyển (Đi nhờ / Gửi đồ) | 🔴 Chưa làm | `[ ]` | `[ ]` | Kiểm tra điểm đón/trả <= 2km lộ trình polyline |
| `US-02` | Tìm kiếm chuyến xe bằng AI (Gemini tự nhiên) & Bộ lọc | 🔴 Chưa làm | `[ ]` | `[ ]` | Dự phòng tự động nếu AI lỗi |
| `US-03` | Theo dõi trạng thái & Hủy yêu cầu | 🔴 Chưa làm | `[ ]` | `[ ]` | Chỉ hủy được khi chuyến chưa IN_PROGRESS |

### 2.4. Chức năng Quản trị viên (Admin - AD)
| Mã | Tên chức năng | Trạng thái | Tầng Backend | Giao diện Frontend | Ghi chú & Commit |
| :---: | :--- | :---: | :---: | :---: | :--- |
| `AD-01` | Quản lý tài khoản & Mở khóa tài khoản | 🔴 Chưa làm | `[ ]` | `[ ]` | Bắt buộc nhập lý do, ghi audit_logs, đổi REVOKED |
| `AD-02` | Quản lý và xử lý sự cố (4 trạng thái) | 🔴 Chưa làm | `[ ]` | `[ ]` | Không nhảy cóc, gửi notification mỗi lần đổi |
| `AD-03` | Thống kê chuyến theo ngày (Hoạt động / Kết thúc) | 🔴 Chưa làm | `[ ]` | `[ ]` | Bộ lọc theo ngày, xem chi tiết từng chuyến |

### 2.5. Cơ chế Hệ thống Tự động (System - CS)
| Mã | Tên cơ chế | Trạng thái | Test Unit/Integration | Cron Job | Ghi chú & Commit |
| :---: | :--- | :---: | :---: | :---: | :--- |
| `CS-01` | Đóng chuyến -6h & Hết hạn yêu cầu PENDING | 🔴 Chưa làm | `[ ]` | `[ ]` | Quét mỗi phút + chạy bù khi reboot |
| `CS-02` | Chốt tỷ lệ hủy tuần (T2-CN, giờ VN) & Khóa tài khoản | 🔴 Chưa làm | `[x]` Unit test | `[ ]` | Tỷ lệ > 5%: lần 1 khóa 2 tuần, lần 2 khóa vĩnh viễn |
| `CS-03` | Tự động mở khóa tài khoản LOCKED_TEMP sau 14 ngày | 🔴 Chưa làm | `[ ]` | `[ ]` | Quét định kỳ hằng giờ |
| `CS-04` | Kiểm tra sức chứa & Chống chồng lịch nguyên tử | 🔴 Chưa làm | `[x]` Unit test | `[ ]` | Transaction + SELECT FOR UPDATE |
| `CS-05` | Dự phòng khi AI / Map gặp lỗi | 🔴 Chưa làm | `[ ]` | `[ ]` | Map lỗi: chặn tạo chuyến & thông báo; AI lỗi: fallback bộ lọc |

---

## 3. LỊCH SỬ CẬP NHẬT VÀ TIẾN TRÌNH THỰC HIỆN
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
