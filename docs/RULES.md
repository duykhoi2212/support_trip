# TÀI LIỆU QUY TẮC HỆ THỐNG VÀ THIẾT KẾ (SYSTEM RULES & DESIGN SYSTEM)

Dự án: **Nền tảng kết nối đi nhờ và gửi đồ theo chuyến xe tích hợp AI hỗ trợ điều phối**  
Ngôn ngữ hiển thị: **Tiếng Việt** | Định dạng thời gian hiển thị: **Giờ Việt Nam (Asia/Ho_Chi_Minh - UTC+7)** | Lưu trữ CSDL: **UTC**

---

## 1. QUY TẮC MÃ NGUỒN VÀ KỸ THUẬT (CODING RULES)

### 1.1. Ngôn ngữ & Đặt tên
- **Backend & Database**: 100% tiếng Anh cho tên biến, tên hàm, tên bảng, tên cột, tên Enum, tên file, tên route.
- **Frontend**: Tên component, biến, hook, hàm bằng tiếng Anh.
- **Nội dung hiển thị (UI, Toast, Message, Error response)**: 100% **Tiếng Việt** thân thiện, rõ ràng, chính xác.
- **Response Format chuẩn**:
  ```json
  // Thành công:
  {
    "success": true,
    "data": { ... },
    "message": "Thao tác thành công" // tùy chọn
  }

  // Thất bại:
  {
    "success": false,
    "error": {
      "code": "TRIP_CAPACITY_EXCEEDED",
      "message": "Chuyến xe không còn đủ chỗ trống cho yêu cầu này."
    }
  }
  ```

### 1.2. Phân tầng & Kiến trúc (Modular Monolith)
- **Routes/Middleware**: Chỉ xác thực JWT, phân quyền `requireRole(['DRIVER'])`, validate request body/params bằng **Zod**.
- **Controller**: Nhận input đã validate, gọi Service, trả response HTTP status phù hợp. Tuyệt đối **không** viết nghiệp vụ logic tại Controller.
- **Service**: Nơi tập trung toàn bộ business logic. Mọi thao tác ghi dữ liệu nhạy cảm hoặc thay đổi trạng thái đều phải dùng `prisma.$transaction`.
- **Adapters**:
  - `map-adapter`: Bọc gọi OpenRouteService, có timeout (10s), try/catch xử lý fallback hoặc ném mã lỗi `MAP_SERVICE_UNAVAILABLE`.
  - `ai-adapter`: Bọc gọi Gemini SDK, có prompt engineering chặt chẽ ép kiểu structured JSON (Schema Output), xử lý timeout và fallback sang tìm kiếm SQL thông thường nếu AI lỗi.

### 1.3. Quy ước Git & Commit
- Tiền tố commit theo mã chức năng quy định:
  - `feat(DR-01): tao chuyen xe kem lo trinh tu ORS`
  - `feat(US-01): tao yeu cau di nho kem kiem tra 2km`
  - `fix(CS-01): sua loi cron job dong chuyen -6h`
  - `chore(db): khoi tao prisma schema va migration`

---

## 2. HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM)

> Chuẩn bị sẵn bộ Token đồng bộ với Tailwind CSS để khi có bản thiết kế từ Google Stitch có thể tích hợp ngay lập tức.

### 2.1. Tông màu chủ đạo (Color Palette)
> Nguồn chuẩn: [UI_UX_SPEC.md](./UI_UX_SPEC.md). Khi có mâu thuẫn, UI_UX_SPEC.md được ưu tiên.

- **Primary (Emerald - Màu thương hiệu)** — dùng class Tailwind `emerald-*`:
  - `emerald-50`: `#ecfdf5` (nền nhạt)
  - `emerald-600`: `#059669` (màu chính: nút, liên kết, logo)
  - `emerald-700`: `#047857` (hover)
- **Accent (Cam hổ phách - Cảnh báo / Gói hàng)**:
  - `accent-500`: `#f59e0b`
  - `accent-600`: `#d97706`
- **Neutral (Xám Slate cao cấp)**:
  - Nền trang (Light): `#f8fafc` (Slate 50)
  - Nền Card/Panel: `#ffffff`
  - Viền & Phân cách: `#e2e8f0` (Slate 200)
  - Chữ chính: `#0f172a` (Slate 900)
  - Chữ phụ: `#64748b` (Slate 500)
- **Trạng thái (Status)**:
  - Success (ACCEPTED, COMPLETED, ACTIVE): `emerald-500` / `green-600`
  - Warning (PENDING, PROCESSING, LOCKED_TEMP): `amber-500` / `orange-500`
  - Danger (REJECTED, CANCELLED, FAILED, LOCKED_PERM): `rose-500` / `red-600`
  - Neutral (CLOSED, EXPIRED, INACTIVE): `slate-400`

### 2.2. Font chữ & Typography
- **Font gia đình**: `Inter` hoặc `Be Vietnam Pro` (tối ưu tiếng Việt không bị lỗi dấu, hiện đại, sắc nét).
- **Cỡ chữ & Trọng số**:
  - Tiêu đề H1: `28px` - `32px`, Font-weight 700 (Bold)
  - Tiêu đề H2: `22px` - `24px`, Font-weight 600 (Semibold)
  - Tiêu đề H3 / Card Title: `18px` - `20px`, Font-weight 600
  - Body Text: `14px` - `16px`, Font-weight 400 (Regular)
  - Meta / Tag / Chú thích: `12px` - `13px`, Font-weight 500 (Medium)

### 2.3. Quy chuẩn Thành phần Giao diện (UI Components)
- **Bo góc (Border Radius)**: Chuẩn `rounded-xl` (12px) cho card và modal, `rounded-lg` (8px) cho input và button.
- **Đổ bóng (Elevation)**: Nhẹ nhàng `shadow-sm` cho card thường, `shadow-lg` cho modal/dropdown.
- **Bản đồ Leaflet**: Sử dụng CartoDB Positron hoặc OSM tile layer có độ tương phản chuẩn, polyline tuyến màu `emerald-600` nét 5px, marker điểm đón màu xanh lá, điểm trả màu đỏ.
- **Thẻ trạng thái (Status Badges)**:
  - `OPEN`: Nền xanh lá nhạt, chữ xanh đậm.
  - `CLOSED`: Nền xám nhạt, chữ xám đậm.
  - `IN_PROGRESS`: Nền xanh dương nhạt, chữ xanh dương đậm (có hiệu ứng pulse nhẹ).
  - `COMPLETED`: Nền tím/xanh ngọc nhạt.
  - `CANCELLED` / `FAILED`: Nền đỏ nhạt, chữ đỏ sẫm.

---

## 3. QUY TẮC NGHIỆP VỤ MỚI VỀ TÍNH TOÁN VÀ ĐIỀU HÀNH CHUYẾN XE (HUB-TO-HUB & FUEL SHARING)

### 3.1. Mô hình Hub-to-Hub (Tập trung tại điểm xuất phát & kết thúc)
- **Điểm đón/trả cố định**: Bỏ form nhập điểm đón/trả tùy biến của người dùng khi tạo yêu cầu. Người dùng tự di chuyển đến điểm xuất phát của chuyến xe và tự rời đi từ điểm kết thúc của chuyến xe.
- **Bộ lọc tìm kiếm bán kính 15km**: Khi người dùng tìm chuyến bằng điểm đi và điểm đến mong muốn, hệ thống so sánh khoảng cách địa lý (Haversine/Turf):
  - Khoảng cách giữa điểm đi của khách và điểm xuất phát của chuyến $\le 15\text{ km}$.
  - Khoảng cách giữa điểm đến của khách và điểm kết thúc của chuyến $\le 15\text{ km}$.
  - Hiển thị thông tin khoảng cách này trên thẻ chuyến xe để người dùng cân nhắc.

### 3.2. Cơ chế Tính toán và Hiển thị Chi phí Nhiên liệu / Sạc điện (Cost Sharing)
- **Bản chất**: GoX không thu cước vận tải thương mại. Khoản tiền hiển thị là khoản chi phí hỗ trợ nhiên liệu/sạc điện chia sẻ tự nguyện giữa các thành viên.
- **Khi chuyến xe chưa khởi hành (`OPEN` hoặc `CLOSED`)**:
  - Trên thẻ tìm kiếm chuyến xe và trang Chi tiết chuyến xe: **TUYỆT ĐỐI CHỈ HIỂN THỊ TỔNG CHI PHÍ NHIÊN LIỆU CHO TOÀN BỘ CHUYẾN XE** (`Chi phí nhiên liệu cho chuyến xe: xxx đ` hoặc `Chi phí sạc điện cho chuyến xe: xxx đ`).
  - **Không** hiển thị con số ước tính chia sẻ mỗi người vì số lượng người tham gia thực tế chưa được chốt.
- **Thời điểm tính toán & chốt chi phí**:
  - Chỉ khi tài xế bấm nút **"Bắt đầu hành trình"** (`startTrip`), hệ thống mới tính toán và chốt mức hỗ trợ cho từng yêu cầu.
- **Công thức phân bổ chi phí có trọng số**:
  - Tổng số suất tham gia trên xe:
    $$U = \sum_{req \in ACCEPTED} (\text{req.type} == 'RIDE' \ ? \ \text{passenger\_count} : 1)$$
    (Mỗi kiện hàng tính 1 suất; Yêu cầu đi nhờ tính theo số lượng người đăng ký).
  - Đơn giá mỗi suất: $\text{costPerUnit} = \text{Math.round}(\text{trip.estimated\_fuel\_cost} / U)$.
  - Khoản hỗ trợ của từng yêu cầu: $\text{shared\_fuel\_cost} = \text{costPerUnit} \times (\text{req.type} == 'RIDE' \ ? \ \text{passenger\_count} : 1)$.
  - *Ví dụ*: Một yêu cầu đi nhờ 3 người và 3 yêu cầu gửi đồ (mỗi yêu cầu 1 kiện) $\rightarrow$ Tổng $U = 6$ suất. Đơn giá chia 6; yêu cầu đi nhờ 3 người chịu $3 \times \text{costPerUnit}$ (gấp 3 lần so với 1 yêu cầu gửi đồ).
- **Hiển thị sau khi khởi hành**:
  - Người dùng xem trong "Chi tiết chuyến xe" và "Yêu cầu của tôi" sẽ thấy số tiền hỗ trợ nhiên liệu chính thức cần gửi tài xế khi đến nơi.
  - Tài xế chỉ thấy số tiền chi phí hỗ trợ trong trang "Điều hành chuyến" và "Chi tiết yêu cầu" **SAU KHI** đã bấm "Bắt đầu hành trình".

### 3.3. Quy tắc Kích hoạt Thao tác Điều hành Chuyến (Driver Operations)
- Các nút **"Đã đón khách lên xe"** và **"Đã nhận hàng vào cốp"** trong trang Điều hành chuyến xe chỉ được **kích hoạt (clickable)** khi tài xế đã bấm **"Bắt đầu hành trình"** (`trip.status === 'IN_PROGRESS'`).
- Khi chuyến xe vẫn đang ở trạng thái `OPEN` hoặc `CLOSED`, các nút này ở trạng thái vô hiệu hóa (disabled) kèm thông báo hướng dẫn tài xế bấm bắt đầu hành trình trước.
- Backend API cũng kiểm tra chặt chẽ điều kiện `trip.status === 'IN_PROGRESS'` tại hàm `updateProgress`, từ chối cập nhật đón/trả nếu chuyến chưa bắt đầu.
