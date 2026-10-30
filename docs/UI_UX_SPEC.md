# ĐẶC TẢ GIAO DIỆN & LUỒNG FRONTEND (UI/UX SPECIFICATION)
> Dự án: Nền tảng kết nối đi nhờ và gửi đồ theo chuyến xe tích hợp AI hỗ trợ điều phối.  
> Target: Frontend React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons + React Router v6.

---

## 1. NGUYÊN TẮC THIẾT KẾ & HỆ THỐNG DESIGN SYSTEM
- **Ngôn ngữ người dùng (Toàn bộ UI):** 100% TIẾNG VIỆT (Nhãn, Tiêu đề, Hướng dẫn, Placeholder, Toast, Modal cảnh báo, Lỗi form).
- **Quy ước mã nguồn:** Tên Component, Biến, Interface TypeScript, API Client bằng TIẾNG ANH.
- **Màu sắc Semantics (Tailwind):**
  - Primary: `emerald-600` (Hover: `emerald-700`, Light: `emerald-50`)
  - Neutral / Base: `slate-900` (Text chính), `slate-600` (Text phụ), `slate-100` (Background nền)
  - Status Success (ACCEPTED, COMPLETED, ACTIVE): `emerald-500` / `green-600`
  - Status Warning (PENDING, PROCESSING, LOCKED_TEMP): `amber-500` / `orange-500`
  - Status Danger (REJECTED, CANCELLED, FAILED, LOCKED_PERM): `rose-500` / `red-600`
  - Status Neutral (CLOSED, EXPIRED, INACTIVE): `slate-400`
- **Phạm vi giao diện:** 
  - KHÔNG có cổng thanh toán / ví tiền.
  - KHÔNG có tính năng chat / gọi điện qua web (chỉ hiển thị Số điện thoại khi ACCEPTED).
  - KHÔNG có bản đồ GPS realtime theo dõi vị trí xe chạy.
  - Thông báo: Icon quả chuông + Polling (15-30 giây gọi GET `/notifications/unread-count`).

---

## 2. KIẾN TRÚC ROUTING (REACT ROUTER DOM)

### 2.1 Public Routes
- `/`: Trang chủ tìm kiếm chuyến (Tìm kiếm AI + Lọc thông thường, Danh sách chuyến nổi bật).
- `/login`: Đăng nhập.
- `/register`: Đăng ký tài khoản (chọn vai trò `USER` hoặc `DRIVER`).
- `/trips/:id`: Chi tiết lộ trình chuyến đi công khai (vẽ tuyến Leaflet OpenStreetMap).

### 2.2 Shared Authenticated Routes (`USER`, `DRIVER`, `ADMIN`)
- `/profile`: Thông tin cá nhân, cập nhật Avatar, đổi mật khẩu.
- `/incidents/create`: Gửi báo cáo sự cố.
- `/incidents/mine`: Danh sách sự cố bản thân đã báo cáo.
- `/notifications`: Trung tâm thông báo.

### 2.3 User Routes (Role: `USER`)
- `/user/requests`: Danh sách yêu cầu đi nhờ & gửi đồ của tôi.
- `/user/requests/:id`: Chi tiết yêu cầu (trạng thái, hiển thị SĐT tài xế khi ACCEPTED, tiến trình nhận/giao).
- `/user/trips/:tripId/book`: Form tạo yêu cầu đi nhờ hoặc gửi hàng lên chuyến xe cụ thể.

### 2.4 Driver Routes (Role: `DRIVER`)
- `/driver/vehicles`: Quản lý danh sách phương tiện (Thêm xe, bật/tắt hoạt động, xem ảnh xe).
- `/driver/trips`: Quản lý danh sách chuyến xe của tôi (Bộ lọc trạng thái).
- `/driver/trips/create`: Tạo chuyến xe mới (Chọn xe, chọn tuyến trên Leaflet, ngày giờ >= 24h).
- `/driver/trips/:id/manage`: Màn hình điều hành chuyến (Duyệt yêu cầu PENDING, xem SĐT khách ACCEPTED, cập nhật tiến trình đón/trả, hoàn thành chuyến).

### 2.5 Admin Routes (Role: `ADMIN`)
- `/admin/users`: Quản lý danh sách tài khoản (Trạng thái khóa, vi phạm tỷ lệ hủy, Modal mở khóa có nhập lý do).
- `/admin/incidents`: Xử lý báo cáo sự cố (Duyệt theo quy trình 4 bước).
- `/admin/statistics`: Báo cáo thống kê chuyến xe theo ngày.

---

## 3. CHI TIẾT MÀN HÌNH VÀ YÊU CẦU TƯƠNG TÁC (SCREENS DETAIL)

### 3.1 Màn hình Tìm chuyến & Tìm kiếm AI (`/`)
- **Khung Tìm kiếm AI:**
  - Ô Textarea nhập câu tự nhiên: *"Ví dụ: Chiều mai mình muốn gửi 1 thùng hoa quả 15kg từ Bến xe Mỹ Đình về Phủ Lý"*.
  - Nút bấm *"Tìm bằng AI"* kèm icon Sparkles.
  - Khi API `/trips/search/ai` phản hồi: Render danh sách kết quả lọc chính xác. Nếu AI lỗi: Hiển thị thông báo nhẹ và tự động bật bộ lọc truyền thống.
- **Bộ lọc thủ công:** Điểm khởi hành, Điểm đến, Ngày đi, Loại hình (`RIDE` / `PACKAGE`), Số ghế / Thể tích cần.
- **Card Chuyến xe:**
  - Lộ trình: Điểm đi $\rightarrow$ Điểm đến (hiển thị khoảng cách km, thời gian dự kiến ETA).
  - Snapshot sức chứa còn lại: Số ghế trống, tải trọng/thể tích chứa đồ còn lại.
  - Thông tin tài xế và loại xe.
  - Nút *"Xem chi tiết & Đặt"* (chỉ bấm được nếu chuyến còn `OPEN` và trước giờ khởi hành > 6 tiếng).

### 3.2 Form Tạo yêu cầu (`/user/trips/:tripId/book`)
- **Tab 1: Đi nhờ (`type = RIDE`)**
  - Số lượng hành khách (`passenger_count`) - Giới hạn bởi số ghế trống của chuyến.
  - Điểm đón (Pickup address) & Điểm trả (Dropoff address). Có nút bấm chọn nhanh trên bản đồ nhỏ Leaflet.
- **Tab 2: Gửi kiện hàng (`type = PACKAGE`)**
  - Điểm lấy hàng & Điểm giao hàng.
  - Danh sách mặt hàng (Dynamic Form Add/Remove `package_items`): Tên mặt hàng, Kích thước (Dài x Rộng x Cao cm), Khối lượng (kg), Upload ảnh kiện hàng.
- **Cảnh báo nghiệp vụ hiển thị trước khi Submit:**
  - *"Lưu ý: Điểm đón và điểm trả phải nằm trong phạm vi cách tuyến xe không quá 2km."*
  - *"Yêu cầu sau khi tạo sẽ ở trạng thái Chờ duyệt (PENDING) và chưa giữ chỗ chính thức cho đến khi tài xế chấp nhận."*

### 3.3 Màn hình Quản lý Yêu cầu của Tôi (`/user/requests`)
- Danh sách dạng Card/Table có Badge trạng thái:
  - `PENDING`: Vàng cam. Có nút *"Hủy yêu cầu"*.
  - `ACCEPTED`: Xanh lục. **Hiện Card Thông tin Tài xế: [Tên tài xế] - [Số điện thoại] - Nút gọi nhanh `tel:...`**.
  - `REJECTED` / `EXPIRED`: Xám.
  - `CANCELLED`: Đỏ nhạt.
- **Thanh tiến trình (Progress Steps):**
  - RIDE: `NOT_PICKED_UP` $\rightarrow$ `PICKED_UP` $\rightarrow$ `DROPPED_OFF`.
  - PACKAGE: `AWAITING_PICKUP` $\rightarrow$ `PICKED_UP` $\rightarrow$ `DELIVERED`.
- Nút *"Hủy yêu cầu"*: Bật Modal cảnh báo: *"Nếu hủy sau khi tài xế đã chấp nhận, lượt hủy này sẽ tính vào tỷ lệ hủy vi phạm của tuần."*

### 3.4 Màn hình Tạo Chuyến xe (`/driver/trips/create`)
- Dropdown chọn xe (Chỉ hiển thị các xe `ACTIVE`).
- Input Ngày & Giờ khởi hành: Tự động validate bằng Javascript: phải cách thời điểm hiện tại tối thiểu 24 giờ.
- Bản đồ Leaflet + OpenRouteService (qua Backend API `/map/route`):
  - Nhập điểm xuất phát và điểm kết thúc.
  - Hiển thị polyline tuyến đường đi thực tế, tổng km và thời gian ước tính (ETA).
- Cảnh báo: Chuyến xe không có trạm dừng trung gian và không thể chỉnh sửa sau khi tạo.

### 3.5 Màn hình Điều hành Chuyến xe (`/driver/trips/:id/manage`)
- **Header thông tin chuyến:** Trạng thái (`OPEN`, `CLOSED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), Đồng hồ đếm ngược tới mốc `-6h` (tự động đóng chuyến).
- **Thanh trạng thái sức chứa:** Progress Bar hiển thị % số ghế đã duyệt và % dung tích/tải trọng đã chiếm dụng.
- **Danh sách Yêu cầu chờ duyệt (`PENDING`):**
  - Chi tiết từng yêu cầu (Người gửi, Điểm đón/trả, Loại yêu cầu, Chi tiết kiện hàng nếu có).
  - Nút *"Chấp nhận"* (Gọi API `/requests/:id/accept` - Tự động cập nhật lại sức chứa).
  - Nút *"Từ chối"* (Gọi API `/requests/:id/reject`).
- **Danh sách Yêu cầu đã duyệt (`ACCEPTED`):**
  - Hiển thị thông tin hành khách/người gửi kèm **Số điện thoại**.
  - Dropdown cập nhật nhanh tiến trình (Đã đón/Đã nhận/Đã trả/Đã giao).
  - Nút *"Báo thất bại"* (Mở modal chọn lý do bắt buộc: `WRONG_INFO`, `UNREACHABLE`, `ABSENT`, `OTHER`).
- **Nút hành động chuyến:**
  - *"Bắt đầu chuyến"* (Chuyển sang `IN_PROGRESS`).
  - *"Hoàn thành chuyến"* (Chỉ active khi tất cả yêu cầu đã hoàn tất hoặc failed).
  - *"Hủy chuyến"* (Cảnh báo: Toàn bộ yêu cầu liên quan sẽ bị hủy và thông báo tới người dùng).

### 3.6 Màn hình Quản trị Tài khoản (`/admin/users`)
- Bảng danh sách: Họ tên, Email, Số điện thoại, Vai trò (`USER` / `DRIVER`), Trạng thái tài khoản.
- Cột Tỷ lệ hủy tuần: Hiển thị % hủy tuần.
- Thao tác: Với tài khoản `LOCKED_TEMP` hoặc `LOCKED_PERM`, hiển thị nút *"Mở khóa tài khoản"*.
  - Modal Mở khóa: Bắt buộc nhập ô *"Lý do mở khóa"* (Audit log).

### 3.7 Màn hình Xử lý Sự cố (`/admin/incidents`)
- Bảng danh sách sự cố: Người báo cáo, Tiêu đề, Nội dung, Thời gian, Trạng thái.
- Điều khiển chuyển trạng thái tuần tự: `NOT_RECEIVED` $\rightarrow$ `RECEIVED` $\rightarrow$ `PROCESSING` $\rightarrow$ `RESOLVED`. Không cho phép nhảy cóc.

---

## 4. QUY TẮC TÍCH HỢP API & XỬ LÝ LỖI
1. **API Client (Axios / Fetch wrapper):**
   - Tự động gắn header `Authorization: Bearer <token>`.
   - Bắt mã lỗi từ backend trả về dạng `{ code: string, message: string }` và hiển thị trực tiếp `message` (Tiếng Việt) ra Toast Notification (dùng `react-hot-toast` hoặc `sonner`).
2. **Polling Notifications:**
   - Dùng custom hook `useNotificationPolling(intervalMs = 20000)` để cập nhật số lượng thông báo chưa đọc trên Navbar.
3. **Quản lý Role:**
   - AuthContext lưu trữ `user` và `role`.
   - Thành phần `ProtectedRoute({ allowedRoles: Role[] })` tự động chuyển hướng về trang 403 hoặc `/login` nếu không đúng quyền.

