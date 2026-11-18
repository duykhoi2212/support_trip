import React, { useState } from 'react';
import {
  Car,
  X,
  Users,
  Box,
  Scale,
  Fuel,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Maximize2,
  Image as ImageIcon,
  ArrowLeft,
  Palette,
  Tag,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { AdminUserVehicle } from '../../types';
import { getFuelTypeLabel, getVehicleTypeLabel } from '../../lib/formatters';

interface AdminVehicleDetailModalProps {
  vehicle: AdminUserVehicle;
  driverName: string;
  onClose: () => void;
}

export const AdminVehicleDetailModal: React.FC<AdminVehicleDetailModalProps> = ({
  vehicle,
  driverName,
  onClose,
}) => {
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; label: string } | null>(null);

  const isElectric = vehicle.fuel_type === 'ELECTRIC';
  const fuelUnit = isElectric ? 'kWh/100km' : 'Lít/100km';

  // Đánh giá tình trạng hạn đăng kiểm
  const getInspectionStatus = () => {
    if (!vehicle.inspection_expiry_date) {
      return {
        label: 'Chưa cập nhật ngày hết hạn',
        className: 'bg-slate-100 text-slate-600 border-slate-200',
        icon: <Clock className="w-3.5 h-3.5 mr-1" />,
      };
    }
    const expiry = new Date(vehicle.inspection_expiry_date);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Đã quá hạn (${Math.abs(diffDays)} ngày)`,
        className: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: <AlertTriangle className="w-3.5 h-3.5 mr-1" />,
      };
    }
    if (diffDays <= 30) {
      return {
        label: `Sắp hết hạn (còn ${diffDays} ngày)`,
        className: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: <AlertTriangle className="w-3.5 h-3.5 mr-1" />,
      };
    }
    return {
      label: `Còn hiệu lực (${diffDays} ngày)`,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1" />,
    };
  };

  const inspectionStatus = getInspectionStatus();

  const photoItems = [
    {
      key: 'photo',
      label: 'Ảnh thực tế phương tiện',
      url: vehicle.photo_url,
      required: true,
    },
    {
      key: 'inspection',
      label: 'Ảnh giấy / tem đăng kiểm',
      url: vehicle.inspection_photo_url,
      required: false,
    },
    {
      key: 'fuel',
      label: 'Ảnh minh chứng tiêu thụ nhiên liệu',
      url: vehicle.fuel_photo_url,
      required: false,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 flex-shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 truncate">
                    Hồ sơ phương tiện: {vehicle.plate_number}
                  </h3>
                  {vehicle.is_deleted ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                      Đã xóa
                    </span>
                  ) : vehicle.status === 'ACTIVE' ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Đang hoạt động
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      Tạm ngưng
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Chủ phương tiện: <strong className="text-slate-700">{driverName}</strong>
                  {vehicle._count !== undefined && (
                    <span className="ml-2">
                      • Đã vận hành: <strong className="text-emerald-700">{vehicle._count.trips}</strong> chuyến
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Bố cục giống Form Đăng ký Phương tiện (chế độ chỉ đọc) */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Nhóm 1: Thông tin cơ bản */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
                <Tag className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                1. Thông tin định danh phương tiện
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Loại phương tiện</label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900">
                    {getVehicleTypeLabel(vehicle.type)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Biển số xe</label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-slate-900">
                    {vehicle.plate_number}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Hãng & Dòng xe</label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900">
                    {vehicle.brand_model || 'Chưa cập nhật'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Màu sắc</label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 flex items-center">
                    <Palette className="w-4 h-4 mr-2 text-slate-400" />
                    {vehicle.color || 'Chưa cập nhật'}
                  </div>
                </div>
              </div>
            </div>

            {/* Nhóm 2: Thông số sức chứa */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
                <Box className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                2. Sức chứa hành khách & khoang hàng
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 flex items-center mb-1">
                    <Users className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Số ghế cho khách
                  </div>
                  <div className="text-lg font-extrabold text-slate-900">{vehicle.seat_count} chỗ</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 flex items-center mb-1">
                    <Box className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                    Diện tích khoang cốp
                  </div>
                  <div className="text-lg font-extrabold text-slate-900">{vehicle.cargo_area_m2} m²</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 flex items-center mb-1">
                    <Scale className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                    Tải trọng tối đa
                  </div>
                  <div className="text-lg font-extrabold text-slate-900">{vehicle.cargo_max_kg} kg</div>
                </div>
              </div>
            </div>

            {/* Nhóm 3: Nhiên liệu & Đăng kiểm */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
                <Fuel className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                3. Nhiên liệu & Hạn đăng kiểm
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Loại nhiên liệu</label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900">
                    {getFuelTypeLabel(vehicle.fuel_type)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Mức tiêu thụ tiêu chuẩn
                  </label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900">
                    {vehicle.fuel_consumption} {fuelUnit}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Ngày hết hạn đăng kiểm
                  </label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 flex items-center justify-between gap-2">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                      {vehicle.inspection_expiry_date
                        ? new Date(vehicle.inspection_expiry_date).toLocaleDateString('vi-VN')
                        : 'Chưa cập nhật'}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${inspectionStatus.className}`}
                    >
                      {inspectionStatus.icon}
                      {inspectionStatus.label}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Ngày đăng ký trên GoX
                  </label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-2 text-emerald-600" />
                    {new Date(vehicle.created_at).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Nhóm 4: Bộ 3 ảnh hồ sơ phương tiện */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
                <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                4. Hình ảnh hồ sơ phương tiện (Bấm vào ảnh để phóng to)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {photoItems.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden flex flex-col"
                  >
                    <div className="px-3 py-2 border-b border-slate-200/80 bg-white text-xs font-semibold text-slate-700 truncate">
                      {item.label}
                    </div>
                    {item.url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewPhoto({ url: item.url!, label: item.label })}
                        className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden group focus:outline-none"
                        title="Bấm để xem ảnh phóng to"
                      >
                        <img
                          src={item.url}
                          alt={item.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center px-2.5 py-1 rounded-lg bg-white/95 text-slate-900 text-[11px] font-bold shadow">
                            <Maximize2 className="w-3.5 h-3.5 mr-1" /> Phóng to
                          </span>
                        </div>
                      </button>
                    ) : (
                      <div className="aspect-[4/3] w-full flex flex-col items-center justify-center text-slate-400 text-xs p-3 text-center">
                        <ImageIcon className="w-7 h-7 mb-1.5 text-slate-300" />
                        <span>Tài xế chưa tải ảnh này</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-400">Mã phương tiện: #{vehicle.id}</span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Quay lại hồ sơ tài xế
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Phóng to ảnh */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-white px-2">
              <span className="text-sm font-semibold">
                {previewPhoto.label} — {vehicle.plate_number}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Đóng ảnh phóng to"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewPhoto.url}
              alt={previewPhoto.label}
              className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/15 bg-slate-900"
            />
          </div>
        </div>
      )}
    </>
  );
};
