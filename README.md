# NỀN TẢNG KẾT NỐI ĐI NHỜ VÀ GỬI ĐỒ THEO CHUYẾN XE (TÍCH HỢP AI ĐIỀU PHỐI)

> **Đồ án tốt nghiệp đại học**  
> Hệ thống kết nối chia sẻ chuyến đi và vận chuyển hàng hóa đường dài theo chuyến xe thực tế, hỗ trợ tìm kiếm ngôn ngữ tự nhiên bằng Google Gemini AI và tính toán lộ trình OpenRouteService.

---

## 📚 TÀI LIỆU DỰ ÁN

- 🗺️ **[Kế hoạch 7 ngày & Luồng nghiệp vụ (ROADMAP)](./docs/ROADMAP.md)**: Quy trình chi tiết (Tạo chuyến, Tìm kiếm AI, Duyệt chỗ nguyên tử, Xử phạt vi phạm hủy chuyến).
- 📋 **[Bảng theo dõi tiến độ chức năng (PROGRESS)](./docs/PROGRESS.md)**: Theo dõi trạng thái từng chức năng theo bảng mã `CM-01..04`, `DR-01..05`, `US-01..03`, `AD-01..03`, `CS-01..05` với ký hiệu trực quan `[x]` / `[ ]`.
- 📐 **[Quy tắc hệ thống & Design System (RULES)](./docs/RULES.md)**: Quy định về mã nguồn, cấu trúc phản hồi tiếng Việt, bảo mật, bảng màu Tailwind và Font chữ.
- 🏗️ **[Kiến trúc hệ thống (ARCHITECTURE)](./docs/ARCHITECTURE.md)**: Cấu trúc thư mục Monorepo chuẩn, phân tầng Modular Monolith.

---

## 🚀 CÔNG NGHỆ CHÍNH

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Leaflet + OpenStreetMap, Lucide Icons.
- **Backend**: Node.js 20, Express, TypeScript, Prisma ORM, node-cron, Multer, Zod.
- **Database**: PostgreSQL 16.
- **External Services**: Google Gemini API, OpenRouteService API.
- **Deploy**: Docker, Docker Compose, Nginx, Let's Encrypt SSL.
