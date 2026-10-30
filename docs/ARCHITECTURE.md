# KIẾN TRÚC HỆ THỐNG VÀ CẤU TRÚC DỰ ÁN (PROJECT ARCHITECTURE)

Dự án: **Nền tảng kết nối đi nhờ và gửi đồ theo chuyến xe tích hợp AI hỗ trợ điều phối**
Kiến trúc: **Monorepo (Frontend + Backend + Docs)**

---

## 1. CẤU TRÚC THƯ MỤC CHUẨN (KHÔNG FILE THỪA)

```text
Final_Project/
├── .gitignore
├── README.md
├── docker-compose.yml           # Chạy toàn bộ hệ thống (Nginx, Backend, Postgres)
├── docker-compose.dev.yml       # Môi trường phát triển cục bộ (chỉ Postgres)
│
├── docs/                        # Tài liệu hướng dẫn & theo dõi tiến độ
│   ├── ROADMAP.md               # Kế hoạch 7 ngày & Flow quy trình nghiệp vụ
│   ├── RULES.md                 # Quy tắc mã nguồn, bảo mật & Design system
│   ├── PROGRESS.md              # Bảng theo dõi tiến độ chi tiết (tick xanh/đỏ)
│   └── ARCHITECTURE.md          # Tài liệu kiến trúc phân tầng
│
├── backend/                     # Node.js 20 + Express + TypeScript + Prisma
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma        # 9 bảng chuẩn theo file DBML
│   │   ├── migrations/
│   │   └── seed.ts              # Dữ liệu mẫu (1 admin, 2 driver, 3 xe, 3 user, chuyến)
│   ├── src/
│   │   ├── app.ts               # Express configuration, cors, error handler
│   │   ├── server.ts            # Khởi động server, kết nối DB & cron jobs
│   │   ├── config/              # Biến môi trường (.env zod validate)
│   │   ├── middlewares/         # JWT auth, requireRole, errorHandler, rateLimiter
│   │   ├── modules/             # Modular Monolith theo từng nghiệp vụ
│   │   │   ├── auth-account/    # CM-01, CM-02, CM-03
│   │   │   │   ├── routes.ts
│   │   │   │   ├── controller.ts
│   │   │   │   ├── service.ts
│   │   │   │   └── schema.ts    # Zod schemas
│   │   │   ├── vehicle/         # DR-04
│   │   │   ├── trip/            # DR-01, DR-05
│   │   │   ├── transport-request/ # US-01, US-03, DR-02, DR-03
│   │   │   ├── notification/    # Polling notifications
│   │   │   ├── incident/        # CM-04, AD-02
│   │   │   ├── statistics/      # AD-03
│   │   │   ├── audit-log/       # Ghi log mở khóa, nhạy cảm
│   │   │   ├── file-storage/    # Multer upload ảnh vào uploads/
│   │   │   └── scheduler/       # CS-01, CS-02, CS-03 (node-cron + catch-up)
│   │   ├── adapters/            # Giao tiếp với dịch vụ bên ngoài
│   │   │   ├── map/             # OpenRouteService adapter (timeout, fallback)
│   │   │   └── ai/              # Google Gemini adapter (structured output)
│   │   └── utils/               # Helper: turf distance, date-fns-tz, response formatter
│   ├── tests/                   # Unit test: 2km check, cancellation rate, capacity
│   └── uploads/                 # Lưu ảnh xe, avatar (volume mount trong Docker)
│
└── frontend/                    # React + Vite + TypeScript + Tailwind
    ├── Dockerfile
    ├── nginx.conf               # Nginx cho frontend production build
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js       # Đồng bộ màu sắc & font từ RULES.md
    ├── index.html
    └── src/
        ├── App.tsx              # React Router & Auth provider
        ├── main.tsx
        ├── assets/
        ├── components/          # Reusable UI components
        │   ├── common/          # Button, Input, Modal, Badge, Toast, Navbar
        │   ├── map/             # Leaflet Route Viewer, Point Selector
        │   └── notifications/   # Notification dropdown & polling hook
        ├── layouts/             # AppLayout, DriverLayout, AdminLayout, AuthLayout
        ├── pages/               # Từng màn hình chức năng
        │   ├── auth/            # Login, Register
        │   ├── user/            # Home, Search (Normal & AI), Create Request, My Requests
        │   ├── driver/          # Manage Trips, Create Trip, Manage Vehicles, Requests
        │   └── admin/           # Users list, Incidents, Trip Statistics
        ├── services/            # Axios API client & typed endpoints
        ├── hooks/               # useAuth, usePollingNotifications
        ├── types/               # Type definitions
        └── utils/               # Formatters (currency, date-fns VN, status helpers)
```

---

## 2. NGUYÊN TẮC QUẢN LÝ DỰ ÁN SẠCH (ZERO-WASTE REPO)

1. **Không file rác**: Thư mục `.temp`, `dist`, `build`, `node_modules`, `.env`, `uploads/*` (ngoại trừ `.gitkeep`) đều được cấu hình trong `.gitignore` chuẩn.
2. **Loại bỏ trùng lặp mã (DRY)**:
   - Các validation rules (VD: định dạng số điện thoại Việt Nam, độ dài mật khẩu >= 8) được chuẩn hóa bằng Zod.
   - Các Enum trạng thái đồng bộ hoàn toàn giữa Prisma Schema và TypeScript Types ở frontend.
3. **Phân vùng trách nhiệm rõ ràng (Separation of Concerns)**:
   - Không thực thi SQL / Prisma query trực tiếp trong Controller.
   - Mọi nghiệp vụ thay đổi dữ liệu liên quan đến nhiều bảng đều nằm trong `prisma.$transaction`.
