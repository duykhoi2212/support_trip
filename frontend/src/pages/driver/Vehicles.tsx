import { useState, useEffect, useRef } from 'react';
import { Car, Plus, ShieldCheck, PowerOff, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { vehicleService } from '../../services/vehicleService';
import { Vehicle, VehicleType } from '../../types';

export const Vehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states cho Modal thêm xe
  const [type, setType] = useState<VehicleType>('CAR');
  const [plateNumber, setPlateNumber] = useState('');
  const [brandModel, setBrandModel] = useState('');
  const [color, setColor] = useState('');
  const [seatCount, setSeatCount] = useState<number>(4);
  const [cargoAreaM2, setCargoAreaM2] = useState<number>(0.8);
  const [cargoMaxKg, setCargoMaxKg] = useState<number>(100);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const data = await vehicleService.getMyVehicles();
      setVehicles(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể tải danh sách phương tiện.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh không được vượt quá 5 MB.');
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!photoFile) {
      setModalError('Vui lòng chọn ảnh chụp phương tiện (bắt buộc).');
      return;
    }

    setModalSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('plate_number', plateNumber.trim().toUpperCase());
      formData.append('brand_model', brandModel.trim());
      formData.append('color', color.trim());
      formData.append('seat_count', seatCount.toString());
      formData.append('cargo_area_m2', cargoAreaM2.toString());
      formData.append('cargo_max_kg', cargoMaxKg.toString());
      formData.append('photo', photoFile);

      await vehicleService.createVehicle(formData);
      setMessage({ type: 'success', text: `Thêm phương tiện biển số ${plateNumber.toUpperCase()} thành công!` });
      setShowAddModal(false);
      resetForm();
      fetchVehicles();
    } catch (err: any) {
      setModalError(err.message || 'Thêm phương tiện thất bại.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const resetForm = () => {
    setType('CAR');
    setPlateNumber('');
    setBrandModel('');
    setColor('');
    setSeatCount(4);
    setCargoAreaM2(0.8);
    setCargoMaxKg(100);
    setPhotoFile(null);
    setPhotoPreview(null);
    setModalError(null);
  };

  const handleToggleStatus = async (vehicle: Vehicle) => {
    setActionLoadingId(vehicle.id);
    setMessage(null);

    try {
      if (vehicle.status === 'ACTIVE') {
        await vehicleService.deactivateVehicle(vehicle.id);
        setMessage({ type: 'success', text: `Đã tạm ngừng sử dụng xe ${vehicle.plate_number}.` });
      } else {
        await vehicleService.activateVehicle(vehicle.id);
        setMessage({ type: 'success', text: `Đã kích hoạt lại xe ${vehicle.plate_number}.` });
      }
      fetchVehicles();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Thao tác không thành công.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getVehicleTypeName = (t: VehicleType) => {
    switch (t) {
      case 'MOTORBIKE':
        return 'Xe máy';
      case 'CAR':
        return 'Ô tô (4-7 chỗ)';
      case 'VAN':
        return 'Xe van / Bán tải';
      case 'TRUCK':
        return 'Xe tải chở hàng';
      default:
        return t;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-3">
            <span>Quản lý phương tiện</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Đăng ký và điều hành danh sách xe của bạn để sẵn sàng tạo chuyến xe
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm phương tiện</span>
        </button>
      </div>

      {/* Thông báo Alert */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-start space-x-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Danh sách xe */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Đang tải danh sách phương tiện...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Chưa có phương tiện nào</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Bạn cần đăng ký ít nhất một phương tiện để có thể đăng tải chuyến xe trên hệ thống GoX.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm phương tiện ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className={`bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col ${
                v.status === 'ACTIVE' ? 'border-slate-200' : 'border-slate-200 opacity-75'
              }`}
            >
              {/* Ảnh xe */}
              <div className="h-48 w-full bg-slate-100 relative overflow-hidden group">
                <img
                  src={v.photo_url}
                  alt={v.plate_number}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-white border border-white/20">
                    {getVehicleTypeName(v.type)}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  {v.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                      Sẵn sàng (ACTIVE)
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                      Tạm ngừng (INACTIVE)
                    </span>
                  )}
                </div>
              </div>

              {/* Thông tin xe */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl font-black text-slate-900 tracking-wider">
                      {v.plate_number}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {v.color ? `Màu: ${v.color}` : ''}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-700 mb-4">
                    {v.brand_model || 'Chưa cập nhật dòng xe'}
                  </p>

                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center mb-6">
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Ghế ngồi</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{v.seat_count} chỗ</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Thể tích</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{v.cargo_area_m2} m²</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Tải trọng</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{v.cargo_max_kg} kg</div>
                    </div>
                  </div>
                </div>

                {/* Nút hành động */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Đăng ký: {new Date(v.created_at).toLocaleDateString('vi-VN')}
                  </span>

                  <button
                    onClick={() => handleToggleStatus(v)}
                    disabled={actionLoadingId === v.id}
                    className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      v.status === 'ACTIVE'
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {actionLoadingId === v.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : v.status === 'ACTIVE' ? (
                      <>
                        <PowerOff className="w-3.5 h-3.5" />
                        <span>Tạm ngừng</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Kích hoạt lại</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Thêm Phương Tiện Mới */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <h2 className="text-xl font-extrabold text-slate-900">Thêm phương tiện mới</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start space-x-2 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Loại phương tiện
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as VehicleType)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-slate-800"
                >
                  <option value="CAR">Ô tô (4-7 chỗ)</option>
                  <option value="VAN">Xe van / Xe bán tải</option>
                  <option value="TRUCK">Xe tải chở hàng</option>
                  <option value="MOTORBIKE">Xe máy</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Biển số xe (VD: 29A-888.88)
                  </label>
                  <input
                    type="text"
                    required
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="29A-888.88"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Màu sắc
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Trắng, Đen, Xanh..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Hãng xe & Dòng xe
                </label>
                <input
                  type="text"
                  value={brandModel}
                  onChange={(e) => setBrandModel(e.target.value)}
                  placeholder="Ví dụ: Toyota Vios 2022, Hyundai Porter H150..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số ghế ngồi
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={seatCount}
                    onChange={(e) => setSeatCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Diện tích (m²)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={cargoAreaM2}
                    onChange={(e) => setCargoAreaM2(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tải trọng (kg)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={cargoMaxKg}
                    onChange={(e) => setCargoMaxKg(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Upload ảnh xe bắt buộc */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ảnh chụp phương tiện (Bắt buộc, ≤ 5MB)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-50 relative overflow-hidden"
                >
                  {photoPreview ? (
                    <div className="relative h-32 w-full">
                      <img src={photoPreview} alt="Xem trước" className="w-full h-full object-cover rounded-xl" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-semibold rounded-xl opacity-0 hover:opacity-100 transition-opacity">
                        Nhấn để thay đổi ảnh
                      </div>
                    </div>
                  ) : (
                    <div className="py-4">
                      <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <div className="text-xs font-semibold text-slate-600">Nhấn để chọn tệp hình ảnh</div>
                      <div className="text-[11px] text-slate-400 mt-1">Định dạng: JPG, PNG, WEBP (Tối đa 5MB)</div>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoSelect}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center space-x-2"
                >
                  {modalSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Lưu phương tiện</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

