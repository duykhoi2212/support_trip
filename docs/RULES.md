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
