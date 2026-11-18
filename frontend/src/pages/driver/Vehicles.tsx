import { useState, useEffect, useRef } from 'react';
import {
  Car,
  Plus,
  ShieldCheck,
  PowerOff,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Zap,
  Fuel,
  FileText
} from 'lucide-react';
import { vehicleService } from '../../services/vehicleService';
import { Vehicle, VehicleType, FuelType } from '../../types';

export const Vehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Xem ảnh phóng to (Lightbox)
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Form states cho Modal THÊM xe
  const [type, setType] = useState<VehicleType>('CAR');
  const [plateNumber, setPlateNumber] = useState('');
  const [brandModel, setBrandModel] = useState('');
  const [color, setColor] = useState('');
  const [seatCount, setSeatCount] = useState<number>(4);
  const [cargoAreaM2, setCargoAreaM2] = useState<number>(0.8);
  const [cargoMaxKg, setCargoMaxKg] = useState<number>(100);
  const [fuelType, setFuelType] = useState<FuelType>('GASOLINE');
  const [fuelConsumption, setFuelConsumption] = useState<number>(7.0);
  const [inspectionExpiryDate, setInspectionExpiryDate] = useState<string>('');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [inspectionPhotoFile, setInspectionPhotoFile] = useState<File | null>(null);
  const [inspectionPhotoPreview, setInspectionPhotoPreview] = useState<string | null>(null);
  const [fuelPhotoFile, setFuelPhotoFile] = useState<File | null>(null);
  const [fuelPhotoPreview, setFuelPhotoPreview] = useState<string | null>(null);

  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // States cho Modal SỬA xe
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editBrandModel, setEditBrandModel] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editSeatCount, setEditSeatCount] = useState<number>(4);
  const [editCargoAreaM2, setEditCargoAreaM2] = useState<number>(0.8);
  const [editCargoMaxKg, setEditCargoMaxKg] = useState<number>(100);
  const [editFuelType, setEditFuelType] = useState<FuelType>('GASOLINE');
  const [editFuelConsumption, setEditFuelConsumption] = useState<number>(7.0);
  const [editInspectionExpiryDate, setEditInspectionExpiryDate] = useState<string>('');

  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editInspectionPhotoFile, setEditInspectionPhotoFile] = useState<File | null>(null);
  const [editInspectionPhotoPreview, setEditInspectionPhotoPreview] = useState<string | null>(null);
  const [editFuelPhotoFile, setEditFuelPhotoFile] = useState<File | null>(null);
  const [editFuelPhotoPreview, setEditFuelPhotoPreview] = useState<string | null>(null);

  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // States cho Modal XÓA xe
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inspectionFileInputRef = useRef<HTMLInputElement>(null);
  const fuelFileInputRef = useRef<HTMLInputElement>(null);

  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editInspectionFileInputRef = useRef<HTMLInputElement>(null);
  const editFuelFileInputRef = useRef<HTMLInputElement>(null);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const data = await vehicleService.getMyVehicles();
      setVehicles(data);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'Không thể tải danh sách phương tiện.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Tự điều chỉnh gợi ý mức tiêu thụ khi đổi loại nhiên liệu
  const handleFuelTypeChange = (ft: FuelType) => {
    setFuelType(ft);
    if (ft === 'ELECTRIC') {
      setFuelConsumption(12.5);
    } else {
      setFuelConsumption(7.0);
    }
  };

  const handleEditFuelTypeChange = (ft: FuelType) => {
    setEditFuelType(ft);
    if (ft === 'ELECTRIC') {
      setEditFuelConsumption(12.5);
    } else {
      setEditFuelConsumption(7.0);
    }
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
      formData.append('fuel_type', fuelType);
      formData.append('fuel_consumption', fuelConsumption.toString());
      if (inspectionExpiryDate) {
        formData.append('inspection_expiry_date', inspectionExpiryDate);
      }
      formData.append('photo', photoFile);
      if (inspectionPhotoFile) {
        formData.append('inspection_photo', inspectionPhotoFile);
      }
      if (fuelPhotoFile) {
        formData.append('fuel_photo', fuelPhotoFile);
      }

      await vehicleService.createVehicle(formData);
      setMessage({ type: 'success', text: `Thêm phương tiện biển số ${plateNumber.toUpperCase()} thành công!` });
      setShowAddModal(false);
      resetAddForm();
      fetchVehicles();
    } catch (err: any) {
      setModalError(err.response?.data?.error?.message || err.message || 'Thêm phương tiện thất bại.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleOpenEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditBrandModel(vehicle.brand_model || '');
    setEditColor(vehicle.color || '');
    setEditSeatCount(vehicle.seat_count);
    setEditCargoAreaM2(vehicle.cargo_area_m2);
    setEditCargoMaxKg(vehicle.cargo_max_kg);
    setEditFuelType(vehicle.fuel_type || 'GASOLINE');
    setEditFuelConsumption(vehicle.fuel_consumption || (vehicle.fuel_type === 'ELECTRIC' ? 12.5 : 7.0));
    setEditInspectionExpiryDate(
      vehicle.inspection_expiry_date ? vehicle.inspection_expiry_date.split('T')[0] : ''
    );
    setEditPhotoFile(null);
    setEditPhotoPreview(vehicle.photo_url || null);
    setEditInspectionPhotoFile(null);
    setEditInspectionPhotoPreview(vehicle.inspection_photo_url || null);
    setEditFuelPhotoFile(null);
    setEditFuelPhotoPreview(vehicle.fuel_photo_url || null);
    setEditError(null);
  };

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    setEditError(null);
    setEditSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('brand_model', editBrandModel.trim());
      formData.append('color', editColor.trim());
      formData.append('seat_count', editSeatCount.toString());
      formData.append('cargo_area_m2', editCargoAreaM2.toString());
      formData.append('cargo_max_kg', editCargoMaxKg.toString());
      formData.append('fuel_type', editFuelType);
      formData.append('fuel_consumption', editFuelConsumption.toString());
      if (editInspectionExpiryDate) {
        formData.append('inspection_expiry_date', editInspectionExpiryDate);
      }
      if (editPhotoFile) {
        formData.append('photo', editPhotoFile);
      }
      if (editInspectionPhotoFile) {
        formData.append('inspection_photo', editInspectionPhotoFile);
      }
      if (editFuelPhotoFile) {
        formData.append('fuel_photo', editFuelPhotoFile);
      }

      await vehicleService.updateVehicle(editingVehicle.id, formData);
      setMessage({ type: 'success', text: `Cập nhật thông tin xe biển số ${editingVehicle.plate_number} thành công!` });
      setEditingVehicle(null);
      fetchVehicles();
    } catch (err: any) {
      setEditError(err.response?.data?.error?.message || err.message || 'Cập nhật phương tiện thất bại.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (vehicle: Vehicle) => {
    setDeletingVehicle(vehicle);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingVehicle) return;

    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const msg = await vehicleService.deleteVehicle(deletingVehicle.id);
      setMessage({ type: 'success', text: msg || `Đã xóa phương tiện ${deletingVehicle.plate_number}.` });
      setDeletingVehicle(null);
      fetchVehicles();
    } catch (err: any) {
      setDeleteError(err.response?.data?.error?.message || err.message || 'Không thể xóa phương tiện.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setType('CAR');
    setPlateNumber('');
    setBrandModel('');
    setColor('');
    setSeatCount(4);
    setCargoAreaM2(0.8);
    setCargoMaxKg(100);
    setFuelType('GASOLINE');
    setFuelConsumption(7.0);
    setInspectionExpiryDate('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setInspectionPhotoFile(null);
    setInspectionPhotoPreview(null);
    setFuelPhotoFile(null);
    setFuelPhotoPreview(null);
    setModalError(null);
  };

  const handleToggleStatus = async (vehicle: Vehicle) => {
    setActionLoadingId(vehicle.id);
    setMessage(null);
    try {
      if (vehicle.status === 'ACTIVE') {
        await vehicleService.deactivateVehicle(vehicle.id);
        setMessage({ type: 'success', text: `Đã tạm ngừng sử dụng phương tiện ${vehicle.plate_number}.` });
      } else {
        await vehicleService.activateVehicle(vehicle.id);
        setMessage({ type: 'success', text: `Đã kích hoạt lại phương tiện ${vehicle.plate_number}.` });
      }
      fetchVehicles();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'Không thể thay đổi trạng thái phương tiện.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getVehicleTypeName = (t: VehicleType) => {
    switch (t) {
      case 'CAR':
        return 'Ô tô (4-7 chỗ)';
      case 'VAN':
        return 'Xe bán tải / Van';
      case 'TRUCK':
        return 'Xe tải nhỏ';
      default:
        return t;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header & Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
            GoX – Quản lý đội xe của bạn
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Phương tiện di chuyển
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Đăng ký và quản lý xe ô tô, xe van, xe tải an toàn kỹ thuật để mở chuyến đi nhờ và chia sẻ chi phí nhiên liệu / tiền sạc.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetAddForm();
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm phương tiện mới</span>
        </button>
      </div>

      {/* Thông báo Feedback */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-2xl flex items-start space-x-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Danh sách phương tiện */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white p-6 rounded-3xl border border-slate-200 h-64">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
              <div className="h-24 bg-slate-100 rounded-xl mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Bạn chưa đăng ký phương tiện nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            Hãy thêm phương tiện đầu tiên để bắt đầu đăng chuyến đi và nhận chia sẻ hành trình với hành khách.
          </p>
          <button
            type="button"
            onClick={() => {
              resetAddForm();
              setShowAddModal(true);
            }}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm phương tiện ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => {
            const isInspectionExpired =
              v.inspection_expiry_date && new Date(v.inspection_expiry_date) < new Date();

            return (
              <div
                key={v.id}
                className={`bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col ${
                  v.status === 'ACTIVE' ? 'border-slate-200' : 'border-slate-200 opacity-80'
                }`}
              >
                {/* Ảnh xe */}
                <div className="h-48 w-full bg-slate-100 relative overflow-hidden group">
                  <img
                    src={v.photo_url}
                    alt={v.plate_number}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-white border border-white/20">
                      {getVehicleTypeName(v.type)}
                    </span>
                    {v.fuel_type === 'ELECTRIC' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-600/90 backdrop-blur-md text-white border border-cyan-400/30 flex items-center">
                        <Zap className="w-3 h-3 mr-1 text-cyan-200" />
                        Xe điện ⚡
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-600/90 backdrop-blur-md text-white border border-amber-400/30 flex items-center">
                        <Fuel className="w-3 h-3 mr-1 text-amber-200" />
                        {v.fuel_type === 'DIESEL' ? 'Dầu' : 'Xăng'}
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3">
                    {v.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                        Đang hoạt động
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

                    <p className="text-sm font-semibold text-slate-700 mb-3">
                      {v.brand_model || 'Chưa cập nhật dòng xe'}
                    </p>

                    {/* Huy hiệu Tiêu thụ & Đăng kiểm */}
                    <div className="space-y-2 mb-4">
                      {/* Tiêu thụ nhiên liệu/sạc */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <span className="text-slate-500 flex items-center font-medium">
                          {v.fuel_type === 'ELECTRIC' ? (
                            <Zap className="w-3.5 h-3.5 mr-1 text-cyan-600" />
                          ) : (
                            <Fuel className="w-3.5 h-3.5 mr-1 text-amber-600" />
                          )}
                          {v.fuel_type === 'ELECTRIC' ? 'Mức tiêu thụ điện:' : 'Mức tiêu hao:'}
                        </span>
                        <strong className="text-slate-900 font-bold">
                          {v.fuel_consumption || (v.fuel_type === 'ELECTRIC' ? 12.5 : 7.0)}{' '}
                          {v.fuel_type === 'ELECTRIC' ? 'kWh/100km' : 'L/100km'}
                        </strong>
                      </div>

                      {/* Trạng thái Đăng kiểm */}
                      <div
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                          isInspectionExpired
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : v.inspection_expiry_date
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}
                      >
                        <span className="flex items-center font-medium">
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          Đăng kiểm an toàn:
                        </span>
                        <strong>
                          {v.inspection_expiry_date
                            ? isInspectionExpired
                              ? `Hết hạn (${new Date(v.inspection_expiry_date).toLocaleDateString('vi-VN')})`
                              : `Hạn: ${new Date(v.inspection_expiry_date).toLocaleDateString('vi-VN')}`
                            : 'Chưa cập nhật'}
                        </strong>
                      </div>

                      {/* Nút xem ảnh giấy tờ đính kèm nếu có */}
                      <div className="flex items-center space-x-2 pt-1">
                        {v.inspection_photo_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(v.inspection_photo_url!)}
                            className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Xem sổ đăng kiểm
                          </button>
                        )}
                        {v.fuel_photo_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(v.fuel_photo_url!)}
                            className="text-[11px] text-slate-700 hover:text-slate-800 font-semibold flex items-center bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                          >
                            <Fuel className="w-3 h-3 mr-1" />
                            Ảnh tem/ODO
                          </button>
                        )}
                      </div>
                    </div>

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

                  {/* Nút hành động: Sửa, Xóa & Bật/Tắt */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(v)}
                        className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-colors"
                        title="Chỉnh sửa thông tin xe"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(v)}
                        className="p-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                        title="Xóa phương tiện"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(v)}
                      disabled={actionLoadingId === v.id}
                      className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        v.status === 'ACTIVE'
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
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
                          <span>Kích hoạt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm Phương Tiện Mới */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Thêm phương tiện mới</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tuân thủ an toàn kỹ thuật & định mức năng lượng</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                >
                  <option value="CAR">Ô tô (4-7 chỗ)</option>
                  <option value="VAN">Xe bán tải / Van</option>
                  <option value="TRUCK">Xe tải nhỏ</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Biển số xe
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
                  placeholder="Ví dụ: VinFast VF5, Toyota Vios 2022..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              {/* Loại nhiên liệu & Mức tiêu hao */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Nhiên liệu & Năng lượng (Dùng tính chi phí chia sẻ)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Loại nhiên liệu / nguồn điện
                    </label>
                    <select
                      value={fuelType}
                      onChange={(e) => handleFuelTypeChange(e.target.value as FuelType)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="GASOLINE">Xăng (RON 95 / E5)</option>
                      <option value="DIESEL">Dầu Diesel</option>
                      <option value="ELECTRIC">Điện (EV - Tiền sạc) ⚡</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {fuelType === 'ELECTRIC' ? 'Mức tiêu thụ (kWh/100km)' : 'Mức tiêu hao (Lít/100km)'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={fuelConsumption}
                      onChange={(e) => setFuelConsumption(parseFloat(e.target.value) || 0.1)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hạn đăng kiểm an toàn kỹ thuật (Theo sổ kiểm định)
                  </label>
                  <input
                    type="date"
                    value={inspectionExpiryDate}
                    onChange={(e) => setInspectionExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
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
                  1. Ảnh chụp phương tiện (Bắt buộc, ≤ 5MB)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-3 text-center cursor-pointer transition-colors bg-slate-50 relative overflow-hidden"
                >
                  {photoPreview ? (
                    <div className="relative h-28 w-full">
                      <img src={photoPreview} alt="Xem trước ảnh xe" className="w-full h-full object-cover rounded-xl" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-semibold rounded-xl opacity-0 hover:opacity-100 transition-opacity">
                        Nhấn để thay đổi ảnh
                      </div>
                    </div>
                  ) : (
                    <div className="py-3">
                      <ImageIcon className="w-7 h-7 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-600 font-semibold">Tải lên ảnh chụp rõ biển số xe</p>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setPhotoFile(f);
                        setPhotoPreview(URL.createObjectURL(f));
                      }
                    }}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Upload ảnh Đăng kiểm & Ảnh tiêu thụ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    2. Ảnh Giấy Đăng Kiểm (Tùy chọn)
                  </label>
                  <div
                    onClick={() => inspectionFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-2.5 text-center cursor-pointer transition-colors bg-slate-50 relative"
                  >
                    {inspectionPhotoPreview ? (
                      <div className="relative h-20 w-full">
                        <img
                          src={inspectionPhotoPreview}
                          alt="Đăng kiểm"
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                    ) : (
                      <div className="py-2">
                        <FileText className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <p className="text-[10px] text-slate-600 font-semibold">Chụp sổ/giấy kiểm định</p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={inspectionFileInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setInspectionPhotoFile(f);
                          setInspectionPhotoPreview(URL.createObjectURL(f));
                        }
                      }}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    3. Ảnh Tem Năng lượng / ODO
                  </label>
                  <div
                    onClick={() => fuelFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-2.5 text-center cursor-pointer transition-colors bg-slate-50 relative"
                  >
                    {fuelPhotoPreview ? (
                      <div className="relative h-20 w-full">
                        <img
                          src={fuelPhotoPreview}
                          alt="Tem năng lượng"
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                    ) : (
                      <div className="py-2">
                        <Fuel className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <p className="text-[10px] text-slate-600 font-semibold">Chụp tem / đồng hồ xe</p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fuelFileInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setFuelPhotoFile(f);
                          setFuelPhotoPreview(URL.createObjectURL(f));
                        }
                      }}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-colors"
                >
                  {modalSubmitting ? 'Đang lưu...' : 'Thêm phương tiện'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa Phương Tiện */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Chỉnh sửa phương tiện</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Biển số: {editingVehicle.plate_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingVehicle(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hãng & Dòng xe
                  </label>
                  <input
                    type="text"
                    value={editBrandModel}
                    onChange={(e) => setEditBrandModel(e.target.value)}
                    placeholder="Toyota Vios, VinFast VF5..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Màu sắc
                  </label>
                  <input
                    type="text"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    placeholder="Trắng, Đen, Đỏ..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              {/* Loại nhiên liệu & Mức tiêu hao */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Nhiên liệu & Năng lượng
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Loại nhiên liệu / nguồn điện
                    </label>
                    <select
                      value={editFuelType}
                      onChange={(e) => handleEditFuelTypeChange(e.target.value as FuelType)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="GASOLINE">Xăng (RON 95 / E5)</option>
                      <option value="DIESEL">Dầu Diesel</option>
                      <option value="ELECTRIC">Điện (EV - Tiền sạc) ⚡</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {editFuelType === 'ELECTRIC' ? 'Mức tiêu thụ (kWh/100km)' : 'Mức tiêu hao (Lít/100km)'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={editFuelConsumption}
                      onChange={(e) => setEditFuelConsumption(parseFloat(e.target.value) || 0.1)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hạn đăng kiểm an toàn kỹ thuật
                  </label>
                  <input
                    type="date"
                    value={editInspectionExpiryDate}
                    onChange={(e) => setEditInspectionExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
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
                    value={editSeatCount}
                    onChange={(e) => setEditSeatCount(parseInt(e.target.value) || 1)}
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
                    value={editCargoAreaM2}
                    onChange={(e) => setEditCargoAreaM2(parseFloat(e.target.value) || 0)}
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
                    value={editCargoMaxKg}
                    onChange={(e) => setEditCargoMaxKg(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                  />
                </div>
              </div>

              {/* 3 Khung tải ảnh khi sửa xe */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Ảnh xe */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Ảnh xe
                  </label>
                  <div
                    onClick={() => editFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-2 text-center cursor-pointer transition-colors bg-slate-50 relative overflow-hidden"
                  >
                    {editPhotoPreview ? (
                      <div className="relative h-20 w-full">
                        <img src={editPhotoPreview} alt="Xem trước" className="w-full h-full object-cover rounded-lg" />
                      </div>
                    ) : (
                      <div className="py-2">
                        <ImageIcon className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <p className="text-[10px] text-slate-500 font-semibold">Tải ảnh xe</p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={editFileInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setEditPhotoFile(f);
                          setEditPhotoPreview(URL.createObjectURL(f));
                        }
                      }}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Ảnh đăng kiểm */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Ảnh đăng kiểm
                  </label>
                  <div
                    onClick={() => editInspectionFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-2 text-center cursor-pointer transition-colors bg-slate-50 relative overflow-hidden"
                  >
                    {editInspectionPhotoPreview ? (
                      <div className="relative h-20 w-full">
                        <img src={editInspectionPhotoPreview} alt="Đăng kiểm" className="w-full h-full object-cover rounded-lg" />
                      </div>
                    ) : (
                      <div className="py-2">
                        <FileText className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <p className="text-[10px] text-slate-500 font-semibold">Tải đăng kiểm</p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={editInspectionFileInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setEditInspectionPhotoFile(f);
                          setEditInspectionPhotoPreview(URL.createObjectURL(f));
                        }
                      }}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Ảnh ODO / Mức nhiên liệu */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    {editFuelType === 'ELECTRIC' ? 'Ảnh ODO / Pin' : 'Ảnh ODO / Xăng'}
                  </label>
                  <div
                    onClick={() => editFuelFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-2 text-center cursor-pointer transition-colors bg-slate-50 relative overflow-hidden"
                  >
                    {editFuelPhotoPreview ? (
                      <div className="relative h-20 w-full">
                        <img src={editFuelPhotoPreview} alt="Nhiên liệu" className="w-full h-full object-cover rounded-lg" />
                      </div>
                    ) : (
                      <div className="py-2">
                        <Fuel className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <p className="text-[10px] text-slate-500 font-semibold">Tải ảnh ODO</p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={editFuelFileInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setEditFuelPhotoFile(f);
                          setEditFuelPhotoPreview(URL.createObjectURL(f));
                        }
                      }}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-colors"
                >
                  {editSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem ảnh phóng to (Lightbox) */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Đóng (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImage}
              alt="Ảnh phóng to"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Phương Tiện */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Xóa phương tiện</h3>
                <p className="text-xs text-slate-500 font-mono">Biển số: {deletingVehicle.plate_number}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Bạn có chắc chắn muốn xóa phương tiện <strong>{deletingVehicle.brand_model || deletingVehicle.plate_number}</strong> ({deletingVehicle.plate_number}) khỏi danh sách xe của bạn?
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 mb-4">
              <strong>Lưu ý:</strong> Nếu phương tiện đang gắn với các chuyến xe chưa kết thúc (đang mở hoặc đang di chuyển), hệ thống sẽ từ chối xóa để đảm bảo an toàn chuyến đi.
            </div>

            {deleteError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingVehicle(null)}
                disabled={deleteSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 transition-colors"
              >
                {deleteSubmitting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
