import { Car, Package, ShieldCheck, Sparkles, Navigation, Users } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight block leading-tight">
                DiNho & GuiDo AI
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Kết nối chuyến xe & Điều phối thông minh
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Giai đoạn 1: Sẵn sàng
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden mb-12">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border border-white/20">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Đồ án tốt nghiệp đại học</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-4">
              Nền tảng kết nối đi nhờ & gửi đồ tích hợp AI điều phối
            </h1>
            <p className="text-primary-100 text-base sm:text-lg mb-8 leading-relaxed">
              Tối ưu hóa các chuyến xe đường dài thực tế. Chia sẻ chỗ ngồi và không gian chở hàng, kết hợp tìm kiếm ngôn ngữ tự nhiên tiếng Việt và tính toán lộ trình chính xác.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Bán kính ≤ 2km</div>
                  <div className="text-xs text-primary-200">Đón trả chuẩn lộ trình</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Khóa nguyên tử</div>
                  <div className="text-xs text-primary-200">Chống vượt sức chứa xe</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-sky-300" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Minh bạch kết nối</div>
                  <div className="text-xs text-primary-200">Hiện SĐT sau duyệt</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4">
              <Car className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Tài xế (DRIVER)</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Quản lý phương tiện, đăng tải chuyến xe trước ≥ 24h, duyệt yêu cầu nguyên tử và điều hành tiến trình chuyến đi.
            </p>
            <span className="text-xs font-semibold text-primary-600 inline-flex items-center">
              DR-01 → DR-05
            </span>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-secondary-50 text-secondary-600 flex items-center justify-center mb-4">
              <Package className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Người dùng (USER)</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Tìm chuyến xe bằng bộ lọc hoặc câu hỏi tự nhiên với AI Gemini, đặt chỗ đi nhờ hoặc gửi nhiều kiện hàng linh hoạt.
            </p>
            <span className="text-xs font-semibold text-secondary-600 inline-flex items-center">
              US-01 → US-03
            </span>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Quản trị viên & Tự động</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Xử lý sự cố, mở khóa có ghi vết audit log, hệ thống tự động đóng chuyến ở -6h và xử phạt tỷ lệ hủy tuần quá 5%.
            </p>
            <span className="text-xs font-semibold text-amber-600 inline-flex items-center">
              AD-01 → AD-03, CS-01 → CS-05
            </span>
          </div>
        </div>

        {/* System Rules & Progress Snapshot */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
            <span>Tiến độ giai đoạn 1 (Khởi tạo CSDL & Monorepo)</span>
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">1. Cấu trúc Monorepo (Backend + Frontend)</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Đã hoàn thành</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">2. Prisma Schema chuẩn 9 bảng từ DBML + route_polyline</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Đã hoàn thành</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">3. File Migration SQL kèm Partial Unique Index (PostgreSQL)</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Đã hoàn thành</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">4. File Seed dữ liệu mẫu (1 Admin, 2 Tài xế, 2 Xe, 3 User, 2 Chuyến)</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Đã hoàn thành</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">5. Bộ Unit Test các thuật toán cốt lõi (2km, chồng lịch, sức chứa, tỷ lệ hủy)</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Đã hoàn thành</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          Đồ án tốt nghiệp đại học • Nền tảng kết nối đi nhờ và gửi đồ theo chuyến xe tích hợp AI hỗ trợ điều phối
        </div>
      </footer>
    </div>
  );
}
