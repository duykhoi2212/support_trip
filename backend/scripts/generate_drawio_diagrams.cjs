/**
 * Script sinh file Sequence Diagram định dạng .draw / .drawio
 * CÓ KHUNG ALT (LUỒNG NGOẠI LỆ) CHUẨN XÁC 100% THEO FILE MẪU NGƯỜI DÙNG (UC-CM-04_bao_cao_su_co.drawio)
 * Đảm bảo số lượng bước và số thứ tự khớp 1-1 tuyệt đối với luồng đặc tả.
 */

const fs = require('fs');
const path = require('path');

function removeVietnameseTones(str) {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str;
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

const diagrams = [
  // 1. CM-01: Đăng ký tài khoản (Tổng 8 bước: 3 bước đầu + 3 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "CM-01",
    name: "Sơ đồ tuần tự: Đăng ký tài khoản",
    title: "Sơ đồ tuần tự: Đăng ký tài khoản (CM-01)",
    participants: [
      { id: "guest", name: "Người dùng (Guest)", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 850 }
    ],
    preSteps: [
      { from: "guest", to: "fe", text: "1. Nhập thông tin đăng ký (Họ tên, SĐT, Email, Mật khẩu, Vai trò)", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi yêu cầu đăng ký (POST /auth/register)", isReturn: false },
      { from: "be", to: "db", text: "3. Kiểm tra tính duy nhất của Số điện thoại & Email", isReturn: false }
    ],
    alt: {
      successLabel: "[Thông tin hợp lệ]",
      successSteps: [
        { from: "be", to: "db", text: "4. Băm mật khẩu (bcrypt) và lưu User mới (status: ACTIVE)", isReturn: false },
        { from: "be", to: "fe", text: "5. Sinh JWT Access Token & phản hồi đăng ký thành công", isReturn: true },
        { from: "fe", to: "guest", text: "6. Lưu Token và chuyển hướng vào Dashboard", isReturn: true }
      ],
      failLabel: "[SĐT hoặc Email đã tồn tại]",
      failSteps: [
        { from: "be", to: "fe", text: "7. Phản hồi lỗi 409 (Số điện thoại hoặc Email đã tồn tại)", isReturn: true },
        { from: "fe", to: "guest", text: "8. Hiển thị thông báo lỗi yêu cầu nhập lại", isReturn: true }
      ]
    }
  },

  // 2. CM-02: Đăng nhập hệ thống (Tổng 8 bước: 3 bước đầu + 3 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "CM-02",
    name: "Sơ đồ tuần tự: Đăng nhập hệ thống",
    title: "Sơ đồ tuần tự: Đăng nhập hệ thống (CM-02)",
    participants: [
      { id: "user", name: "Người dùng / Tài xế / Admin", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 850 }
    ],
    preSteps: [
      { from: "user", to: "fe", text: "1. Nhập Số điện thoại và Mật khẩu", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi thông tin đăng nhập (POST /auth/login)", isReturn: false },
      { from: "be", to: "db", text: "3. Truy vấn tìm tài khoản theo Số điện thoại", isReturn: false }
    ],
    alt: {
      successLabel: "[Đúng mật khẩu & Tài khoản ACTIVE]",
      successSteps: [
        { from: "be", to: "be", text: "4. So khớp mật khẩu băm & tạo JWT Access Token", isSelf: true },
        { from: "be", to: "fe", text: "5. Phản hồi đăng nhập thành công kèm thông tin User", isReturn: true },
        { from: "fe", to: "user", text: "6. Lưu Token và điều hướng giao diện theo vai trò", isReturn: true }
      ],
      failLabel: "[Sai mật khẩu hoặc Tài khoản bị khóa]",
      failSteps: [
        { from: "be", to: "fe", text: "7. Phản hồi lỗi (Sai thông tin hoặc tài khoản đang bị khóa)", isReturn: true },
        { from: "fe", to: "user", text: "8. Hiển thị thông báo từ chối đăng nhập", isReturn: true }
      ]
    }
  },

  // 3. CM-03: Quản lý hồ sơ cá nhân (Tổng 7 bước: 2 bước đầu + 3 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "CM-03",
    name: "Sơ đồ tuần tự: Quản lý hồ sơ cá nhân",
    title: "Sơ đồ tuần tự: Quản lý hồ sơ cá nhân (CM-03)",
    participants: [
      { id: "user", name: "Người dùng (USER/DRIVER)", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 850 }
    ],
    preSteps: [
      { from: "user", to: "fe", text: "1. Nhập thông tin chỉnh sửa & chọn file ảnh avatar mới", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi form cập nhật hồ sơ (PUT /users/profile kèm avatar)", isReturn: false }
    ],
    alt: {
      successLabel: "[File ảnh hợp lệ <= 5MB]",
      successSteps: [
        { from: "be", to: "db", text: "3. Lưu ảnh tĩnh & cập nhật avatar_url, họ tên vào CSDL", isReturn: false },
        { from: "be", to: "fe", text: "4. Phản hồi kết quả cập nhật hồ sơ thành công", isReturn: true },
        { from: "fe", to: "user", text: "5. Cập nhật thông tin hiển thị trên Navbar & giao diện", isReturn: true }
      ],
      failLabel: "[File quá dung lượng hoặc sai định dạng]",
      failSteps: [
        { from: "be", to: "fe", text: "6. Phản hồi lỗi 400 (Dung lượng file vượt quá 5MB)", isReturn: true },
        { from: "fe", to: "user", text: "7. Hiển thị thông báo lỗi từ chối upload ảnh", isReturn: true }
      ]
    }
  },

  // 4. CM-04: Quên & Đặt lại mật khẩu (Tổng 8 bước: 3 bước đầu + 3 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "CM-04",
    name: "Sơ đồ tuần tự: Quên & Đặt lại mật khẩu",
    title: "Sơ đồ tuần tự: Quên & Đặt lại mật khẩu (CM-04)",
    participants: [
      { id: "user", name: "Người dùng (USER/DRIVER)", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 850 }
    ],
    preSteps: [
      { from: "user", to: "fe", text: "1. Nhập Số điện thoại và Email xác thực", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi yêu cầu xác minh (POST /auth/forgot-password)", isReturn: false },
      { from: "be", to: "db", text: "3. Kiểm tra tính khớp nối giữa SĐT và Email trong bảng users", isReturn: false }
    ],
    alt: {
      successLabel: "[Thông tin khớp nối hợp lệ]",
      successSteps: [
        { from: "be", to: "fe", text: "4. Cấp Reset Token (hạn 15 phút) & mở form nhập pass mới", isReturn: true },
        { from: "fe", to: "be", text: "5. Gửi mật khẩu mới kèm Reset Token (POST /auth/reset-password)", isReturn: false },
        { from: "be", to: "db", text: "6. Xác thực Token, băm mật khẩu mới & cập nhật CSDL", isReturn: false }
      ],
      failLabel: "[Sai thông tin hoặc Token hết hạn]",
      failSteps: [
        { from: "be", to: "fe", text: "7. Phản hồi lỗi (Không tìm thấy tài khoản hoặc Token hết hạn)", isReturn: true },
        { from: "fe", to: "user", text: "8. Thông báo lỗi yêu cầu xác minh lại", isReturn: true }
      ]
    }
  },

  // 5. CM-05: Báo cáo sự cố & Khiếu nại (Đúng y chang file mẫu của bạn: 8 bước)
  {
    id: "CM-05",
    name: "Sơ đồ tuần tự: Báo cáo sự cố",
    title: "Sơ đồ tuần tự: Báo cáo sự cố & Khiếu nại (CM-05)",
    participants: [
      { id: "user", name: "Người dùng / Tài xế", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 850 }
    ],
    preSteps: [
      { from: "user", to: "fe", text: "1. Chọn chuyến/yêu cầu liên quan, nhập nội dung", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi báo cáo sự cố (POST /incidents)", isReturn: false },
      { from: "be", to: "db", text: "3. Kiểm tra chuyến/yêu cầu thuộc người báo", isReturn: false }
    ],
    alt: {
      successLabel: "[Hợp lệ]",
      successSteps: [
        { from: "be", to: "db", text: "4. Lưu sự cố mới (trạng thái: Chưa tiếp nhận)", isReturn: false },
        { from: "be", to: "fe", text: "5. Phản hồi thành công kèm mã sự cố", isReturn: true },
        { from: "fe", to: "user", text: "6. Hiển thị thông báo sự cố đã gửi thành công", isReturn: true }
      ],
      failLabel: "[Không hợp lệ]",
      failSteps: [
        { from: "be", to: "fe", text: "7. Phản hồi lỗi không tìm thấy hoặc không có quyền", isReturn: true },
        { from: "fe", to: "user", text: "8. Báo gửi khiếu nại không thành công", isReturn: true }
      ]
    }
  },

  // 6. DR-01: Quản lý phương tiện (Tổng 7 bước: 2 bước đầu + 3 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "DR-01",
    name: "Sơ đồ tuần tự: Quản lý phương tiện",
    title: "Sơ đồ tuần tự: Quản lý phương tiện (DR-01)",
    participants: [
      { id: "driver", name: "Tài xế (DRIVER)", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 850 }
    ],
    preSteps: [
      { from: "driver", to: "fe", text: "1. Nhập thông tin xe (Loại xe, Biển số, Số ghế, Tải trọng, Ảnh)", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi thông tin phương tiện (POST /vehicles)", isReturn: false }
    ],
    alt: {
      successLabel: "[Chưa tồn tại loại xe & biển số này]",
      successSteps: [
        { from: "be", to: "db", text: "3. Lưu thông tin xe vào bảng vehicles (status: ACTIVE)", isReturn: false },
        { from: "be", to: "fe", text: "4. Phản hồi thông tin phương tiện vừa tạo thành công", isReturn: true },
        { from: "fe", to: "driver", text: "5. Cập nhật và hiển thị xe trong danh sách phương tiện", isReturn: true }
      ],
      failLabel: "[Đã tồn tại cặp Loại xe + Biển số]",
      failSteps: [
        { from: "be", to: "fe", text: "6. Phản hồi lỗi 409 (Phương tiện đã được đăng ký)", isReturn: true },
        { from: "fe", to: "driver", text: "7. Hiển thị thông báo biển số xe đã tồn tại", isReturn: true }
      ]
    }
  },

  // 7. DR-02: Đăng bài tạo chuyến xe (Tổng 10 bước: 4 bước đầu + 4 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "DR-02",
    name: "Sơ đồ tuần tự: Đăng bài tạo chuyến xe",
    title: "Sơ đồ tuần tự: Đăng bài tạo chuyến xe (DR-02)",
    participants: [
      { id: "driver", name: "Tài xế (DRIVER)", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "ors", name: "OpenRouteService", type: "box", cx: 850 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 1090 }
    ],
    preSteps: [
      { from: "driver", to: "fe", text: "1. Chọn điểm đi, điểm đến, giờ khởi hành (>= 24h) và chọn xe", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi yêu cầu tạo chuyến xe (POST /trips)", isReturn: false },
      { from: "be", to: "ors", text: "3. Gọi OpenRouteService lấy polyline, distance, duration", isReturn: false },
      { from: "be", to: "db", text: "4. Kiểm tra chống chồng lịch xe trong khoảng [departure_time, ETA]", isReturn: false }
    ],
    alt: {
      successLabel: "[ORS thành công & Xe không bị chồng lịch]",
      successSteps: [
        { from: "be", to: "db", text: "5. Lưu Trip mới (status: OPEN) kèm snapshot sức chứa xe", isReturn: false },
        { from: "be", to: "fe", text: "6. Phản hồi tạo chuyến thành công kèm mã chuyến và lộ trình", isReturn: true },
        { from: "fe", to: "driver", text: "7. Hiển thị chi tiết chuyến xe vừa tạo trên bản đồ", isReturn: true }
      ],
      failLabel: "[Lỗi ORS bản đồ hoặc Xe bị chồng lịch]",
      failSteps: [
        { from: "be", to: "fe", text: "8. Phản hồi mã lỗi (503 dịch vụ bản đồ lỗi hoặc 409 chồng lịch)", isReturn: true },
        { from: "fe", to: "driver", text: "9. Hiển thị cảnh báo lỗi tạo chuyến xe", isReturn: true }
      ]
    }
  },

  // 8. DR-03: Xét duyệt yêu cầu vận chuyển (Tổng 9 bước: 3 bước đầu + 4 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "DR-03",
    name: "Sơ đồ tuần tự: Duyệt yêu cầu vận chuyển",
    title: "Sơ đồ tuần tự: Duyệt yêu cầu vận chuyển (DR-03)",
    participants: [
      { id: "driver", name: "Tài xế (DRIVER)", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 850 }
    ],
    preSteps: [
      { from: "driver", to: "fe", text: "1. Nhấn nút chấp nhận yêu cầu (POST /requests/:id/accept)", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi lệnh xét duyệt yêu cầu vận chuyển", isReturn: false },
      { from: "be", to: "db", text: "3. Bắt đầu Transaction, khóa dòng Trip (SELECT FOR UPDATE) & check sức chứa", isReturn: false }
    ],
    alt: {
      successLabel: "[Đủ sức chứa trống]",
      successSteps: [
        { from: "be", to: "db", text: "4. Cập nhật yêu cầu = ACCEPTED & cộng dồn sức chứa đã đặt", isReturn: false },
        { from: "be", to: "db", text: "5. Tạo Notification thông báo đã được duyệt gửi cho Khách", isReturn: false },
        { from: "be", to: "fe", text: "6. Commit Transaction & phản hồi thành công kèm SĐT khách", isReturn: true },
        { from: "fe", to: "driver", text: "7. Cập nhật trạng thái ACCEPTED và hiển thị nút gọi điện", isReturn: true }
      ],
      failLabel: "[Quá tải / Không đủ chỗ]",
      failSteps: [
        { from: "be", to: "fe", text: "8. Rollback Transaction & báo lỗi không còn đủ chỗ trống", isReturn: true },
        { from: "fe", to: "driver", text: "9. Hiển thị cảnh báo chuyến xe đã hết chỗ", isReturn: true }
      ]
    }
  },

  // 9. DR-04: Điều hành hành trình chuyến xe (Tổng 8 bước: 3 bước đầu + 3 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "DR-04",
    name: "Sơ đồ tuần tự: Điều hành hành trình",
    title: "Sơ đồ tuần tự: Điều hành hành trình chuyến xe (DR-04)",
    participants: [
      { id: "driver", name: "Tài xế (DRIVER)", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 850 }
    ],
    preSteps: [
      { from: "driver", to: "fe", text: "1. Nhấn 'Hoàn thành chuyến đi' khi xe về đích", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi yêu cầu hoàn tất chuyến (POST /trips/:id/complete)", isReturn: false },
      { from: "be", to: "db", text: "3. Kiểm tra trạng thái đón/trả của toàn bộ yêu cầu trên chuyến", isReturn: false }
    ],
    alt: {
      successLabel: "[Tất cả yêu cầu đã hoàn tất đón/trả]",
      successSteps: [
        { from: "be", to: "db", text: "4. Đổi Trip sang COMPLETED & chuyển các yêu cầu sang COMPLETED", isReturn: false },
        { from: "be", to: "fe", text: "5. Phản hồi thông báo hoàn thành chuyến xe thành công", isReturn: true },
        { from: "fe", to: "driver", text: "6. Hiển thị màn hình tổng kết chuyến xe hoàn tất", isReturn: true }
      ],
      failLabel: "[Còn yêu cầu chưa được xử lý đón/trả]",
      failSteps: [
        { from: "be", to: "fe", text: "7. Phản hồi lỗi 400 (Chưa cập nhật xong tiến trình hành khách)", isReturn: true },
        { from: "fe", to: "driver", text: "8. Cảnh báo tài xế phải xử lý hết khách trước khi đóng chuyến", isReturn: true }
      ]
    }
  },

  // 10. DR-05: Quản lý danh sách chuyến & Hủy chuyến xe (Tổng 8 bước: 2 bước đầu + 4 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "DR-05",
    name: "Sơ đồ tuần tự: Quản lý & Hủy chuyến xe",
    title: "Sơ đồ tuần tự: Quản lý & Hủy chuyến xe (DR-05)",
    participants: [
      { id: "driver", name: "Tài xế (DRIVER)", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 850 }
    ],
    preSteps: [
      { from: "driver", to: "fe", text: "1. Chọn chuyến cần hủy, nhập lý do hủy và xác nhận", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi yêu cầu hủy chuyến xe (POST /trips/:id/cancel)", isReturn: false }
    ],
    alt: {
      successLabel: "[Chuyến chưa chạy (OPEN hoặc CLOSED)]",
      successSteps: [
        { from: "be", to: "db", text: "3. Đổi Trip = CANCELLED & hủy tất cả yêu cầu (không phạt khách)", isReturn: false },
        { from: "be", to: "db", text: "4. Tạo danh sách Notification gửi đến từng hành khách bị hủy", isReturn: false },
        { from: "be", to: "fe", text: "5. Commit Transaction & phản hồi thông báo hủy chuyến thành công", isReturn: true },
        { from: "fe", to: "driver", text: "6. Cập nhật trạng thái chuyến xe là 'Đã hủy'", isReturn: true }
      ],
      failLabel: "[Chuyến xe đang chạy IN_PROGRESS]",
      failSteps: [
        { from: "be", to: "fe", text: "7. Phản hồi lỗi 400 (Chuyến đang chạy, không thể hủy)", isReturn: true },
        { from: "fe", to: "driver", text: "8. Hướng dẫn tài xế chuyển sang báo cáo sự cố khẩn cấp", isReturn: true }
      ]
    }
  },

  // 11. US-01: Tìm kiếm chuyến xe bằng AI & Bộ lọc (Tổng 8 bước: 2 bước đầu + 4 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "US-01",
    name: "Sơ đồ tuần tự: Tìm kiếm chuyến xe",
    title: "Sơ đồ tuần tự: Tìm kiếm chuyến xe (AI & Bộ lọc) (US-01)",
    participants: [
      { id: "user", name: "Người dùng (USER)", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "ai", name: "Google Gemini AI", type: "box", cx: 850 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 1090 }
    ],
    preSteps: [
      { from: "user", to: "fe", text: "1. Nhập câu tìm kiếm ngôn ngữ tự nhiên", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi câu truy vấn tìm kiếm (POST /trips/search/ai)", isReturn: false }
    ],
    alt: {
      successLabel: "[Google Gemini phân tích thành công]",
      successSteps: [
        { from: "be", to: "ai", text: "3. Gửi prompt trích xuất: origin, dest, date, passengers", isReturn: false },
        { from: "ai", to: "be", text: "4. Phản hồi JSON thực thể cấu trúc chuẩn", isReturn: true },
        { from: "be", to: "db", text: "5. Lọc các chuyến xe OPEN thỏa mãn tiêu chí trong CSDL", isReturn: false },
        { from: "be", to: "fe", text: "6. Trả về danh sách chuyến xe phù hợp kèm tóm tắt AI", isReturn: true }
      ],
      failLabel: "[Gemini AI lỗi hoặc mạng gián đoạn (CS-05)]",
      failSteps: [
        { from: "be", to: "fe", text: "7. Kích hoạt fallback tự động chuyển sang bộ lọc thủ công", isReturn: true },
        { from: "fe", to: "user", text: "8. Hiển thị form bộ lọc để người dùng tìm kiếm bình thường", isReturn: true }
      ]
    }
  },

  // 12. US-02: Tạo yêu cầu vận chuyển & Kiểm tra bán kính 2km (Tổng 9 bước: 3 bước đầu + 4 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "US-02",
    name: "Sơ đồ tuần tự: Tạo yêu cầu vận chuyển",
    title: "Sơ đồ tuần tự: Tạo yêu cầu vận chuyển & Check 2km (US-02)",
    participants: [
      { id: "user", name: "Người dùng (USER)", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "turf", name: "Thư viện Turf.js", type: "box", cx: 850 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 1090 }
    ],
    preSteps: [
      { from: "user", to: "fe", text: "1. Chọn chuyến xe, chọn loại (RIDE/PACKAGE), chọn điểm đón/trả", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi yêu cầu đặt chỗ (POST /requests)", isReturn: false },
      { from: "be", to: "turf", text: "3. Giải mã route_polyline và đo khoảng cách điểm đón/trả tới tuyến", isReturn: false }
    ],
    alt: {
      successLabel: "[Khoảng cách cả 2 điểm đều <= 2.0 km]",
      successSteps: [
        { from: "turf", to: "be", text: "4. Xác nhận khoảng cách hợp lệ (<= 2km)", isReturn: true },
        { from: "be", to: "db", text: "5. Lưu TransportRequest mới (status: PENDING) và PackageItem", isReturn: false },
        { from: "be", to: "db", text: "6. Tạo Notification gửi đến Tài xế thông báo có yêu cầu mới", isReturn: false },
        { from: "fe", to: "user", text: "7. Hiển thị thông báo 'Yêu cầu đã gửi thành công, vui lòng chờ duyệt'", isReturn: true }
      ],
      failLabel: "[Điểm đón hoặc điểm trả cách tuyến > 2.0 km]",
      failSteps: [
        { from: "be", to: "fe", text: "8. Phản hồi lỗi 400 (Vượt quá bán kính cho phép 2.0 km)", isReturn: true },
        { from: "fe", to: "user", text: "9. Hiển thị cảnh báo yêu cầu chọn lại điểm đón/trả gần tuyến hơn", isReturn: true }
      ]
    }
  },

  // 13. US-03: Theo dõi trạng thái & Hủy yêu cầu vận chuyển (Tổng 8 bước: 2 bước đầu + 4 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "US-03",
    name: "Sơ đồ tuần tự: Theo dõi & Hủy yêu cầu",
    title: "Sơ đồ tuần tự: Theo dõi & Hủy yêu cầu (US-03)",
    participants: [
      { id: "user", name: "Người dùng (USER)", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 850 }
    ],
    preSteps: [
      { from: "user", to: "fe", text: "1. Chọn yêu cầu cần hủy trong danh sách cá nhân và nhập lý do", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi lệnh hủy yêu cầu (POST /requests/:id/cancel)", isReturn: false }
    ],
    alt: {
      successLabel: "[Chuyến xe chưa bắt đầu chạy (khác IN_PROGRESS)]",
      successSteps: [
        { from: "be", to: "db", text: "3. Đổi status = CANCELLED, hoàn sức chứa xe & đánh dấu tính phạt", isReturn: false },
        { from: "be", to: "db", text: "4. Tạo Notification gửi đến Tài xế thông báo khách đã hủy yêu cầu", isReturn: false },
        { from: "be", to: "fe", text: "5. Commit Transaction & phản hồi hủy yêu cầu thành công", isReturn: true },
        { from: "fe", to: "user", text: "6. Cập nhật trạng thái yêu cầu sang 'Đã hủy'", isReturn: true }
      ],
      failLabel: "[Chuyến xe đang di chuyển IN_PROGRESS]",
      failSteps: [
        { from: "be", to: "fe", text: "7. Phản hồi lỗi 400 (Chuyến xe đang di chuyển, không thể hủy)", isReturn: true },
        { from: "fe", to: "user", text: "8. Cảnh báo không thể hủy chuyến khi tài xế đã xuất phát", isReturn: true }
      ]
    }
  },

  // 14. AD-01: Quản trị tài khoản & Mở khóa tài khoản (Tổng 9 bước: 3 bước đầu + 4 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "AD-01",
    name: "Sơ đồ tuần tự: Quản trị tài khoản",
    title: "Sơ đồ tuần tự: Quản trị tài khoản & Mở khóa (AD-01)",
    participants: [
      { id: "admin", name: "Quản trị viên (ADMIN)", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 850 }
    ],
    preSteps: [
      { from: "admin", to: "fe", text: "1. Chọn tài khoản bị khóa, xem chi tiết tỷ lệ hủy và vi phạm", isReturn: false },
      { from: "admin", to: "fe", text: "2. Nhấn 'Mở khóa tài khoản' và nhập lý do can thiệp", isReturn: false },
      { from: "fe", to: "be", text: "3. Gửi yêu cầu mở khóa (POST /admin/users/:id/unlock)", isReturn: false }
    ],
    alt: {
      successLabel: "[Có nhập lý do can thiệp bắt buộc]",
      successSteps: [
        { from: "be", to: "db", text: "4. Đổi User = ACTIVE, thu hồi ViPham = REVOKED & ghi AuditLog", isReturn: false },
        { from: "be", to: "db", text: "5. Tạo Notification thông báo tài khoản đã được mở khóa cho User", isReturn: false },
        { from: "be", to: "fe", text: "6. Commit Transaction & phản hồi mở khóa thành công", isReturn: true },
        { from: "fe", to: "admin", text: "7. Cập nhật trạng thái tài khoản trên bảng quản trị sang ACTIVE", isReturn: true }
      ],
      failLabel: "[Thiếu lý do can thiệp kiểm toán]",
      failSteps: [
        { from: "be", to: "fe", text: "8. Phản hồi lỗi 400 (Bắt buộc nhập lý do mở khóa)", isReturn: true },
        { from: "fe", to: "admin", text: "9. Yêu cầu quản trị viên điền lý do phục vụ lưu vết kiểm toán", isReturn: true }
      ]
    }
  },

  // 15. AD-02: Quản lý và xử lý sự cố (Tổng 8 bước: 3 bước đầu + 3 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "AD-02",
    name: "Sơ đồ tuần tự: Quản lý sự cố",
    title: "Sơ đồ tuần tự: Quản lý và xử lý sự cố (AD-02)",
    participants: [
      { id: "admin", name: "Quản trị viên (ADMIN)", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 850 }
    ],
    preSteps: [
      { from: "admin", to: "fe", text: "1. Chọn sự cố, chọn trạng thái kế tiếp và nhập ghi chú", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi yêu cầu cập nhật sự cố (PUT /admin/incidents/:id)", isReturn: false },
      { from: "be", to: "db", text: "3. Kiểm tra quy tắc chuyển trạng thái (NOT_RECEIVED->RECEIVED->PROCESSING->RESOLVED)", isReturn: false }
    ],
    alt: {
      successLabel: "[Chuyển trạng thái tuần tự đúng quy trình]",
      successSteps: [
        { from: "be", to: "db", text: "4. Cập nhật trạng thái sự cố, lưu handled_by & ghi chú giải quyết", isReturn: false },
        { from: "be", to: "fe", text: "5. Phản hồi thành công & gửi thông báo tiến trình cho người báo", isReturn: true },
        { from: "fe", to: "admin", text: "6. Giao diện cập nhật trạng thái sự cố mới", isReturn: true }
      ],
      failLabel: "[Chuyển trạng thái nhảy cóc sai quy trình]",
      failSteps: [
        { from: "be", to: "fe", text: "7. Phản hồi lỗi 400 (Quy trình trạng thái không hợp lệ)", isReturn: true },
        { from: "fe", to: "admin", text: "8. Yêu cầu quản trị viên tuân thủ đúng thứ tự tiếp nhận sự cố", isReturn: true }
      ]
    }
  },

  // 16. AD-03: Báo cáo thống kê hoạt động chuyến xe (Tổng 7 bước: 2 bước đầu + 3 bước hợp lệ + 2 bước ngoại lệ)
  {
    id: "AD-03",
    name: "Sơ đồ tuần tự: Thống kê chuyến xe",
    title: "Sơ đồ tuần tự: Báo cáo thống kê chuyến xe (AD-03)",
    participants: [
      { id: "admin", name: "Quản trị viên (ADMIN)", type: "actor", cx: 130 },
      { id: "fe", name: "Giao diện web", type: "box", cx: 370 },
      { id: "be", name: "Máy chủ ứng dụng", type: "box", cx: 610 },
      { id: "db", name: "PostgreSQL", type: "db", cx: 850 }
    ],
    preSteps: [
      { from: "admin", to: "fe", text: "1. Chọn khoảng thời gian thống kê (from_date, to_date)", isReturn: false },
      { from: "fe", to: "be", text: "2. Gửi yêu cầu lấy thống kê (GET /admin/statistics/trips)", isReturn: false }
    ],
    alt: {
      successLabel: "[Khoảng thời gian hợp lệ (from_date <= to_date)]",
      successSteps: [
        { from: "be", to: "db", text: "3. Truy vấn bảng trips và transport_requests tính tổng KPI", isReturn: false },
        { from: "be", to: "fe", text: "4. Trả về dữ liệu JSON thống kê chuyến, tỷ lệ hoàn thành & lấp đầy", isReturn: true },
        { from: "fe", to: "admin", text: "5. Render thẻ KPI tổng quan và vẽ biểu đồ xu hướng", isReturn: true }
      ],
      failLabel: "[Khoảng ngày không hợp lệ (from_date > to_date)]",
      failSteps: [
        { from: "be", to: "fe", text: "6. Phản hồi lỗi 400 (Ngày bắt đầu phải nhỏ hơn ngày kết thúc)", isReturn: true },
        { from: "fe", to: "admin", text: "7. Cảnh báo quản trị viên chọn lại khoảng thời gian hợp lệ", isReturn: true }
      ]
    }
  }
];

function generateDiagramXml(diagram) {
  const parts = diagram.participants;
  const preSteps = diagram.preSteps || [];
  const successSteps = diagram.alt ? diagram.alt.successSteps : [];
  const failSteps = diagram.alt ? diagram.alt.failSteps : [];

  const totalStepsCount = preSteps.length + successSteps.length + failSteps.length;
  const startY = 167;
  const stepGap = 50;

  // Tính toán tọa độ Y
  let currentY = startY;
  const preStepData = preSteps.map((s, i) => {
    const y = currentY;
    currentY += stepGap;
    return { ...s, y, num: i + 1 };
  });

  const frameStartY = currentY - 15;
  const successStartNum = preSteps.length + 1;
  const successStepData = successSteps.map((s, i) => {
    const y = currentY + 15;
    currentY += stepGap;
    return { ...s, y, num: successStartNum + i };
  });

  const dividerY = currentY + 15;
  currentY += 45; // Khoảng cách sau divider

  const failStartNum = successStartNum + successSteps.length;
  const failStepData = failSteps.map((s, i) => {
    const y = currentY;
    currentY += stepGap;
    return { ...s, y, num: failStartNum + i };
  });

  const frameEndY = currentY + 15;
  const frameHeight = frameEndY - frameStartY;
  const endY = frameEndY + 30;
  const pageHeight = endY + 60;
  const pageWidth = parts[parts.length - 1].cx + 150;

  const partMap = {};
  parts.forEach(p => { partMap[p.id] = p; });

  let cellId = 1;
  const nextId = () => `c_${++cellId}`;

  let xml = `  <diagram id="${diagram.id}" name="${escapeXml(diagram.name)}">\n`;
  xml += `    <mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageWidth}" pageHeight="${pageHeight}" math="0" shadow="0">\n`;
  xml += `      <root>\n`;
  xml += `        <mxCell id="0" />\n`;
  xml += `        <mxCell id="1" parent="0" />\n`;

  // 1. Tiêu đề
  const titleId = nextId();
  xml += `        <mxCell id="${titleId}" value="${escapeXml(diagram.title)}" style="text;html=1;align=left;verticalAlign=middle;fontSize=16;fontStyle=1;" vertex="1" parent="1">\n`;
  xml += `          <mxGeometry x="20" y="8" width="700" height="28" as="geometry" />\n`;
  xml += `        </mxCell>\n`;

  // 2. Lifelines & Headers
  parts.forEach(p => {
    const headerId = nextId();
    const lineId = nextId();

    if (p.type === "actor") {
      xml += `        <mxCell id="${headerId}" value="${escapeXml(p.name)}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=13;fontStyle=1;" vertex="1" parent="1">\n`;
      xml += `          <mxGeometry x="${p.cx - 15}" y="48" width="30" height="52" as="geometry" />\n`;
      xml += `        </mxCell>\n`;
    } else if (p.type === "db") {
      xml += `        <mxCell id="${headerId}" value="${escapeXml(p.name)}" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=10;fillColor=#f5f5f5;strokeColor=#666666;fontSize=13;fontStyle=1;" vertex="1" parent="1">\n`;
      xml += `          <mxGeometry x="${p.cx - 45}" y="62" width="90" height="56" as="geometry" />\n`;
      xml += `        </mxCell>\n`;
    } else {
      xml += `        <mxCell id="${headerId}" value="${escapeXml(p.name)}" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;fontSize=13;fontStyle=1;" vertex="1" parent="1">\n`;
      xml += `          <mxGeometry x="${p.cx - 70}" y="72" width="140" height="44" as="geometry" />\n`;
      xml += `        </mxCell>\n`;
    }

    xml += `        <mxCell id="${lineId}" style="endArrow=none;dashed=1;html=1;strokeColor=#999999;" edge="1" parent="1">\n`;
    xml += `          <mxGeometry relative="1" as="geometry">\n`;
    xml += `            <mxPoint x="${p.cx}" y="122" as="sourcePoint" />\n`;
    xml += `            <mxPoint x="${p.cx}" y="${endY}" as="targetPoint" />\n`;
    xml += `          </mxGeometry>\n`;
    xml += `        </mxCell>\n`;
  });

  // 3. Render PreSteps
  preStepData.forEach(step => {
    xml += renderStepXml(step, partMap, nextId);
  });

  // 4. Render Alt Frame (nếu có alt)
  if (diagram.alt) {
    const frameX = 50;
    const frameWidth = parts[parts.length - 1].cx - frameX + 80;

    // umlFrame
    const frameId = nextId();
    xml += `        <mxCell id="${frameId}" value="Nếu" style="shape=umlFrame;whiteSpace=wrap;html=1;pointerEvents=0;width=50;height=22;fillColor=none;strokeColor=#666666;fontSize=11;fontStyle=1;" vertex="1" parent="1">\n`;
    xml += `          <mxGeometry x="${frameX}" y="${frameStartY}" width="${frameWidth}" height="${frameHeight}" as="geometry" />\n`;
    xml += `        </mxCell>\n`;

    // Success Label
    const successLabelId = nextId();
    xml += `        <mxCell id="${successLabelId}" value="${escapeXml(diagram.alt.successLabel)}" style="text;html=1;align=left;verticalAlign=middle;fontSize=11;fontStyle=1;whiteSpace=wrap;" vertex="1" parent="1">\n`;
    xml += `          <mxGeometry x="${frameX + 58}" y="${frameStartY + 2}" width="560" height="20" as="geometry" />\n`;
    xml += `        </mxCell>\n`;

    // Success Steps
    successStepData.forEach(step => {
      xml += renderStepXml(step, partMap, nextId);
    });

    // Dashed Divider line
    const dividerId = nextId();
    xml += `        <mxCell id="${dividerId}" style="endArrow=none;dashed=1;html=1;strokeColor=#666666;" edge="1" parent="1">\n`;
    xml += `          <mxGeometry relative="1" as="geometry">\n`;
    xml += `            <mxPoint x="${frameX}" y="${dividerY}" as="sourcePoint" />\n`;
    xml += `            <mxPoint x="${frameX + frameWidth}" y="${dividerY}" as="targetPoint" />\n`;
    xml += `          </mxGeometry>\n`;
    xml += `        </mxCell>\n`;

    // Fail Label
    const failLabelId = nextId();
    xml += `        <mxCell id="${failLabelId}" value="${escapeXml(diagram.alt.failLabel)}" style="text;html=1;align=left;verticalAlign=middle;fontSize=11;fontStyle=1;whiteSpace=wrap;" vertex="1" parent="1">\n`;
    xml += `          <mxGeometry x="${frameX + 8}" y="${dividerY + 4}" width="560" height="20" as="geometry" />\n`;
    xml += `        </mxCell>\n`;

    // Fail Steps
    failStepData.forEach(step => {
      xml += renderStepXml(step, partMap, nextId);
    });
  }

  xml += `      </root>\n`;
  xml += `    </mxGraphModel>\n`;
  xml += `  </diagram>\n`;

  return xml;
}

function renderStepXml(step, partMap, nextId) {
  const fromCx = partMap[step.from].cx;
  const toCx = partMap[step.to].cx;
  const stepId = nextId();
  let xml = "";

  if (step.isSelf) {
    const edgeStyle = `html=1;verticalAlign=bottom;fontSize=11;labelBackgroundColor=none;endArrow=block;endFill=1;edgeStyle=orthogonalEdgeStyle;curved=0;`;
    xml += `        <mxCell id="${stepId}" value="${escapeXml(step.text)}" style="${edgeStyle}" edge="1" parent="1">\n`;
    xml += `          <mxGeometry relative="1" as="geometry">\n`;
    xml += `            <mxPoint x="${fromCx}" y="${step.y}" as="sourcePoint" />\n`;
    xml += `            <mxPoint x="${fromCx}" y="${step.y + 24}" as="targetPoint" />\n`;
    xml += `            <Array as="points">\n`;
    xml += `              <mxPoint x="${fromCx + 45}" y="${step.y}" />\n`;
    xml += `              <mxPoint x="${fromCx + 45}" y="${step.y + 24}" />\n`;
    xml += `            </Array>\n`;
    xml += `          </mxGeometry>\n`;
    xml += `        </mxCell>\n`;
  } else if (step.isReturn) {
    const edgeStyle = `html=1;verticalAlign=bottom;fontSize=11;labelBackgroundColor=none;endArrow=open;endFill=0;endSize=8;dashed=1;`;
    xml += `        <mxCell id="${stepId}" value="${escapeXml(step.text)}" style="${edgeStyle}" edge="1" parent="1">\n`;
    xml += `          <mxGeometry relative="1" as="geometry">\n`;
    xml += `            <mxPoint x="${fromCx}" y="${step.y}" as="sourcePoint" />\n`;
    xml += `            <mxPoint x="${toCx}" y="${step.y}" as="targetPoint" />\n`;
    xml += `          </mxGeometry>\n`;
    xml += `        </mxCell>\n`;
  } else {
    const edgeStyle = `html=1;verticalAlign=bottom;fontSize=11;labelBackgroundColor=none;endArrow=block;endFill=1;`;
    xml += `        <mxCell id="${stepId}" value="${escapeXml(step.text)}" style="${edgeStyle}" edge="1" parent="1">\n`;
    xml += `          <mxGeometry relative="1" as="geometry">\n`;
    xml += `            <mxPoint x="${fromCx}" y="${step.y}" as="sourcePoint" />\n`;
    xml += `            <mxPoint x="${toCx}" y="${step.y}" as="targetPoint" />\n`;
    xml += `          </mxGeometry>\n`;
    xml += `        </mxCell>\n`;
  }
  return xml;
}

function generateFullDrawio() {
  let xml = `<mxfile host="app.diagrams.net">\n`;
  diagrams.forEach(diag => {
    xml += generateDiagramXml(diag);
  });
  xml += `</mxfile>\n`;
  return xml;
}

const outDir = path.join(__dirname, '..', '..', 'docs');
const singleDir = path.join(outDir, 'drawio_tung_chuc_nang');

if (!fs.existsSync(singleDir)) {
  fs.mkdirSync(singleDir, { recursive: true });
}

// 1. Tạo file tổng hợp chứa 16 tab có alt
const fullXml = generateFullDrawio();
const fullDrawioPath = path.join(outDir, 'He_Thong_So_Do_Tuan_Tu.drawio');
const fullDrawPath = path.join(outDir, 'He_Thong_So_Do_Tuan_Tu.draw');

fs.writeFileSync(fullDrawioPath, fullXml, 'utf8');
fs.writeFileSync(fullDrawPath, fullXml, 'utf8');

// 2. Xuất từng file .draw riêng cho từng chức năng có alt
diagrams.forEach(diag => {
  let singleXml = `<mxfile host="app.diagrams.net">\n`;
  singleXml += generateDiagramXml(diag);
  singleXml += `</mxfile>\n`;

  const cleanName = removeVietnameseTones(diag.id + "_" + diag.name.replace(/Sơ đồ tuần tự:\s*/, ''))
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_');
  const fileName = `${cleanName}.draw`;
  const filePath = path.join(singleDir, fileName);
  fs.writeFileSync(filePath, singleXml, 'utf8');
});

console.log("Đã cập nhật xong toàn bộ 16 file .draw có khung ALT (luồng ngoại lệ) chuẩn xác!");
