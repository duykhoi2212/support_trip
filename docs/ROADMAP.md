# KẾ HOẠCH DỰ ÁN VÀ QUY TRÌNH NGHIỆP VỤ (ROADMAP & BUSINESS FLOWS)

Dự án: **Nền tảng kết nối đi nhờ và gửi đồ theo chuyến xe tích hợp AI hỗ trợ điều phối**  
Thời lượng cam kết: **7 Ngày**  
Mục tiêu: Đồ án tốt nghiệp hoàn chỉnh, kiến trúc chuẩn mực, logic xử lý chặt chẽ không có kẽ hở dữ liệu.

---

## 1. CÁC QUY TRÌNH NGHIỆP VỤ CỐT LÕI (BUSINESS FLOWS)

### 1.1. Luồng 1: Tạo Chuyến Xe (DRIVER)
```mermaid
sequenceDiagram
    autonumber
    actor Driver as Tài xế (DRIVER)
    participant FE as Frontend
    participant API as Backend (Trip Module)
    participant Map as Map Adapter (ORS)
    participant DB as PostgreSQL (Prisma)

    Driver->>FE: Nhập điểm đi, điểm đến, giờ khởi hành, chọn xe
    FE->>API: POST /trips (origin, destination, departure_time, vehicle_id)
    API->>API: Validate departure_time >= now + 24h
    API->>DB: Kiểm tra xe thuộc tài xế & đang ACTIVE
    API->>Map: Gọi OpenRouteService lấy polyline, distance, duration
    alt ORS lỗi/timeout
        API-->>FE: Lỗi 503 "Dịch vụ bản đồ tạm thời gián đoạn. Không thể tạo chuyến."
    else ORS thành công
        API->>API: Tính ETA = departure_time + duration
        API->>DB: Kiểm tra chồng lịch xe: KHÔNG CÓ chuyến nào trùng khoảng [departure_time, ETA]
        alt Bị chồng lịch
            API-->>FE: Lỗi 409 "Phương tiện đã có lịch trình trong khung giờ này."
        else Hợp lệ
            API->>DB: Tạo Trip (lưu snapshot sức chứa xe: seat_capacity, package_capacity)
            DB-->>API: Trip created (status = OPEN)
            API-->>FE: 201 Created (Thông tin chuyến xe)
        end
    end
```

### 1.2. Luồng 2: Tìm Kiếm Chuyến Xe (USER) - Thường & AI
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng (USER)
    participant FE as Frontend
    participant API as Backend (Search Module)
    participant AI as AI Adapter (Gemini)
    participant DB as PostgreSQL

    alt Tìm kiếm thường (Bộ lọc)
        User->>FE: Chọn điểm đi, đến, ngày đi, loại (RIDE/PACKAGE), số lượng/kích thước
        FE->>API: GET /trips/search?from=...&to=...&date=...&type=...
        API->>DB: Truy vấn chuyến OPEN, departure_time > now + 6h, còn sức chứa
        DB-->>API: Danh sách chuyến
        API-->>FE: Kết quả tìm kiếm
    else Tìm kiếm bằng AI (Ngôn ngữ tự nhiên)
        User->>FE: Nhập: "Tôi muốn tìm xe từ Hà Nội về Thái Bình chiều thứ 7 này đi 2 người"
        FE->>API: POST /trips/search/ai { prompt: "..." }
        API->>AI: Gửi prompt với system instructions phân tích (origin, destination, date, type, passengers)
        alt AI thành công
            AI-->>API: Structured JSON { from, to, date, type, count }
            API->>DB: Lọc chuyến OPEN trong CSDL theo tiêu chí trích xuất
            DB-->>API: Chuyến xe thực tế
            API-->>FE: Kết quả chuyến xe kèm tóm tắt AI
        else AI gặp lỗi/timeout (CS-05 Fallback)
            API-->>FE: Báo AI không thể phân tích và tự động chuyển sang form bộ lọc thủ công
        end
    end
```

### 1.3. Luồng 3: Tạo Yêu Cầu & Kiểm Tra Bán Kính 2km (USER)
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng (USER)
    participant FE as Frontend
    participant API as Backend (Request Module)
    participant DB as PostgreSQL

    User->>FE: Chọn chuyến xe, nhập điểm đón, điểm trả, số người hoặc danh sách kiện hàng
    FE->>API: POST /requests { trip_id, type, pickup_point, dropoff_point, items... }
    API->>DB: Kiểm tra trip tồn tại, status == OPEN, departure_time > now + 6h
    API->>DB: Kiểm tra Partial Unique: User chưa có yêu cầu PENDING/ACCEPTED trên chuyến này
    API->>API: Tính khoảng cách từ điểm đón & trả tới Polyline của tuyến đường (Turf.js)
    alt Điểm đón hoặc điểm trả > 2.0 km so với tuyến
        API-->>FE: Lỗi 400 "Điểm đón/trả vượt quá 2km so với lộ trình chuyến xe."
    else Hợp lệ (<= 2km)
        API->>DB: Tạo TransportRequest (status = PENDING) (Chưa chiếm sức chứa)
        API->>DB: Tạo Notification gửi cho Tài xế
        API-->>FE: 201 Created "Yêu cầu đã được gửi, vui lòng chờ tài xế duyệt."
    end
```

### 1.4. Luồng 4: Duyệt Yêu Cầu & Giữ Chỗ Nguyên Tử (DRIVER)
```mermaid
sequenceDiagram
    autonumber
    actor Driver as Tài xế (DRIVER)
    participant API as Backend (Request Module)
    participant DB as PostgreSQL

    Driver->>API: POST /requests/:id/accept
    Note over API,DB: BẮT ĐẦU TRANSACTION (Serializable hoặc Khóa dòng SELECT FOR UPDATE)
    API->>DB: Khóa bản ghi Trip: SELECT * FROM trips WHERE id = trip_id FOR UPDATE
    API->>DB: Kiểm tra trạng thái Trip == OPEN
    API->>DB: Tính tổng sức chứa đã chiếm bởi các request ACCEPTED hiện tại
    API->>API: Kiểm tra (Đã chiếm + Yêu cầu mới) <= Snapshot sức chứa của Trip
    alt Không đủ chỗ / Quá tải
        API-->>Driver: Lỗi 400 "Chuyến xe không còn đủ sức chứa để nhận yêu cầu này."
        Note over API,DB: ROLLBACK TRANSACTION
    else Đủ sức chứa
        API->>DB: UPDATE transport_requests SET status = 'ACCEPTED' WHERE id = :id
        API->>DB: Tạo Notification gửi cho User: "Yêu cầu của bạn đã được chấp nhận!"
        Note over API,DB: COMMIT TRANSACTION
        API-->>Driver: 200 OK. Trả về thông tin kèm SỐ ĐIỆN THOẠI của User
    end
```

### 1.5. Luồng 5: Hủy Yêu Cầu, Tính Tỷ Lệ Hủy & Xử Phạt Vi Phạm (CS-02, CS-03)
```mermaid
flowchart TD
    A[Bắt đầu tính tỷ lệ hủy tuần vào Chủ nhật 23:59 Asia/Ho_Chi_Minh] --> B[Lấy danh sách tất cả USER có yêu cầu với chuyến khởi hành trong tuần T2-CN]
    B --> C{Mẫu số: Tổng số yêu cầu đã từng được xác nhận trong tuần}
    C -- Mẫu số == 0 --> D[Bỏ qua User này trong tuần]
    C -- Mẫu số > 0 --> E[Tử số: Số yêu cầu bị tính hủy]
    
    subgraph Cách tính Tử số & Mẫu số
        E1[User tự hủy sau khi đã ACCEPTED] --> E
        E2[Tài xế đánh dấu FAILED do: WRONG_INFO, UNREACHABLE, ABSENT] --> E
        X1[Yêu cầu bị hủy do Tài xế hủy chuyến] -.->|Loại khỏi CẢ tử số và mẫu số| C
        X2[Yêu cầu FAILED do lý do OTHER] -.->|Không tính vào tử số| E
        X3[Yêu cầu hủy khi đang PENDING / REJECTED / EXPIRED] -.->|Không tính vào tử số| E
    end

    E --> F[Tỷ lệ = Tử số / Mẫu số]
    F --> G{Tỷ lệ > 5%?}
    G -- Không --> H[Bình thường, không xử phạt]
    G -- Có --> I{Số lần vi phạm trước đó của User?}
    I -- Lần đầu (count == 0) --> J[Tạo Violation: Khóa 2 tuần LOCKED_TEMP]
    I -- Lần 2 trở lên --> K[Tạo Violation: Khóa vĩnh viễn LOCKED_PERM]
    J --> L[Gửi Notification thông báo lý do & thời hạn khóa]
    K --> L
```

---

## 2. KẾ HOẠCH THỰC HIỆN 7 NGÀY (7-DAY ROADMAP)

| Ngày | Giai đoạn & Nội dung công việc | Mã chức năng liên quan | Deliverables / Kết quả kiểm tra |
| :--- | :--- | :--- | :--- |
| **Ngày 1** | **Khởi tạo kiến trúc Monorepo & CSDL chuẩn**<br>- Thiết lập thư mục `backend/` và `frontend/`<br>- Cài đặt dependencies, cấu hình TypeScript, ESLint, Zod<br>- Viết `schema.prisma` chính xác 100% từ file DBML<br>- Chạy Prisma migration, Seed dữ liệu mẫu đầy đủ roles<br>- Unit tests cho các hàm helper cốt lõi (khoảng cách 2km Turf.js, tính tỷ lệ hủy) | Khung nền tảng | - Monorepo chạy được lệnh dev cả 2 bên<br>- PostgreSQL có đủ 9 bảng, migration sạch sẽ<br>- Seed 1 admin, 2 tài xế, 3 xe, 3 user |
| **Ngày 2** | **Xác thực, Phân quyền & Quản lý Hồ sơ**<br>- Module `auth-account` (JWT, bcrypt, cookie/bearer)<br>- Middleware phân quyền `requireRole` (USER, DRIVER, ADMIN)<br>- APIs: Đăng ký, Đăng nhập, Xem/Sửa hồ sơ, Đổi mật khẩu, Upload avatar qua multer<br>- Giao diện Login, Register, Profile | CM-01<br>CM-02<br>CM-03 | - Đăng ký role cố định, không đổi SĐT<br>- Đăng nhập nhận JWT hợp lệ<br>- Quản lý thông tin & avatar lưu tại `uploads/` |
| **Ngày 3** | **Quản lý Phương tiện & Điều phối Chuyến xe**<br>- Module `vehicle` (Thêm xe kèm ảnh, bật/tắt, chặn trùng biển số)<br>- Module `map-adapter` (Kết nối OpenRouteService lấy polyline & ETA)<br>- Module `trip` (Tạo chuyến >= 24h, kiểm tra chồng lịch không đệm, snapshot sức chứa, xem danh sách, hủy chuyến)<br>- UI Tài xế: Quản lý xe, Bản đồ tạo chuyến & xem lộ trình Leaflet | DR-04<br>DR-01<br>DR-05 | - Tạo xe thành công với ảnh upload<br>- ORS vẽ tuyến đường chính xác trên bản đồ<br>- Chặn tạo chuyến nếu xe trùng lịch |
| **Ngày 4** | **Yêu cầu Vận chuyển, Duyệt Chỗ & Quản lý Chuyến**<br>- Module `transport-request` (Tạo yêu cầu RIDE / PACKAGE, kiểm tra 2km polyline)<br>- Duyệt yêu cầu nguyên tử: `SELECT ... FOR UPDATE` kiểm tra snapshot sức chứa<br>- Điều hành tiến trình: Picked Up, Dropped Off, Delivered, Failed (kèm lý do)<br>- Module `notification` (Polling, đánh dấu đã đọc, chuông thông báo)<br>- UI Người dùng gửi yêu cầu, UI Tài xế duyệt & điều hành chuyến | US-01<br>US-03<br>DR-02<br>DR-03 | - Kiểm tra 2km chuẩn xác<br>- Khóa nguyên tử chống vượt sức chứa<br>- Hiển thị SĐT 2 bên ngay sau khi ACCEPTED |
| **Ngày 5** | **Các Tác vụ Hệ thống Định kỳ (Cron Jobs)**<br>- Module `scheduler` (Node-cron):<br>  + **CS-01**: Mỗi phút quét đóng chuyến trước 6h & chuyển yêu cầu PENDING thành EXPIRED<br>  + **CS-02**: Chốt tỷ lệ hủy tuần (T2-CN, giờ VN), xử phạt khóa tài khoản<br>  + **CS-03**: Mở khóa tự động cho LOCKED_TEMP sau 14 ngày<br>  + Cơ chế chạy bù (catch-up) khi server reboot | CS-01<br>CS-02<br>CS-03<br>CS-04 | - Test mô phỏng mốc -6h hoạt động chính xác<br>- Test mô phỏng chốt tỷ lệ hủy > 5% khóa tài khoản |
| **Ngày 6** | **Tìm kiếm Thông minh với Gemini AI & Sự cố & Admin**<br>- Module `ai-adapter`: Prompt Gemini trích xuất ý định tiếng Việt ra structured query<br>- Cơ chế CS-05: Fallback tự động sang tìm kiếm thường khi AI lỗi<br>- Module `incident` (Báo cáo sự cố, chuyển trạng thái 4 bước có thông báo)<br>- Module `admin` (Mở khóa tài khoản có lý do + audit log, thống kê chuyến theo ngày)<br>- UI Admin Dashboard, UI Tìm kiếm AI | US-02<br>CS-05<br>CM-04<br>AD-01<br>AD-02<br>AD-03 | - Tìm kiếm AI hiểu tiếng Việt tự nhiên<br>- Admin xem thống kê, mở khóa tài khoản ghi log đầy đủ |
| **Ngày 7** | **Đóng gói Docker, Tối ưu Giao diện, Test & Hướng dẫn VPS**<br>- Tích hợp bản thiết kế giao diện từ Google Stitch (nếu có)<br>- Dockerfile tối ưu multi-stage build cho Frontend & Backend<br>- File `docker-compose.yml` (PostgreSQL, Backend, Nginx reverse proxy, Volume uploads)<br>- Viết tài liệu hướng dẫn triển khai VPS chi tiết (SSL Certbot, script backup CSDL)<br>- Rà soát toàn bộ lỗi và hoàn thiện đồ án | Đóng gói & Triển khai | - Chạy thử nghiệm thành công 100% trên môi trường Docker<br>- Sẵn sàng bảo vệ đồ án tốt nghiệp |

---

## 3. CÁC ĐỀ XUẤT KỸ THUẬT QUAN TRỌNG ĐỂ HỆ THỐNG TRƠN TRU

1. **Thuật toán tính khoảng cách 2km tới Polyline của tuyến đường**:
   - ORS trả về lộ trình dạng GeoJSON LineString hoặc Encoded Polyline.
   - Sử dụng thư viện `@turf/point-to-line-distance` (chuẩn tính toán trắc địa WGS84) để tính khoảng cách vuông góc ngắn nhất từ tọa độ điểm đón/trả đến Polyline.
   - Đảm bảo độ chính xác tuyệt đối, nhanh chóng và không phụ thuộc API bên ngoài khi tính khoảng cách.

2. **Chống Overbooking & Tranh chấp dữ liệu (Race Condition)**:
   - Dùng Transaction mức cao nhất hoặc raw SQL query trong Prisma:
     `SELECT id, seat_capacity, package_capacity FROM trips WHERE id = $1 FOR UPDATE;`
   - Tính tổng các request đã `ACCEPTED` + request đang được duyệt, so sánh trực tiếp với snapshot của Trip. Nếu vượt quá, lập tức Rollback và trả mã `INSUFFICIENT_CAPACITY`.

3. **Tính toán Tỷ lệ hủy theo đúng tuần Giờ Việt Nam (`Asia/Ho_Chi_Minh`)**:
   - Sử dụng thư viện `date-fns-tz` hoặc `dayjs` để xác định chính xác ranh giới đầu tuần (Thứ Hai 00:00:00) và cuối tuần (Chủ Nhật 23:59:59) theo giờ Việt Nam, bất kể VPS đặt ở timezone nào.

4. **Cơ chế Catch-up (Chạy bù) của Cron Job**:
   - Khi Backend khởi động lại, hàm `bootstrapScheduler()` sẽ ngay lập tức chạy quét các chuyến có `departure_time <= now + 6h` mà vẫn còn `OPEN` để chuyển về `CLOSED`, và huỷ các request `PENDING` thành `EXPIRED` để tránh tình trạng hệ thống bị tắt qua mốc -6h mà dữ liệu không được cập nhật.
