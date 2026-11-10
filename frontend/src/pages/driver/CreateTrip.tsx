import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Car,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Info,
  Sparkles,
  ChevronRight,
  Search,
  RotateCcw,
  Milestone,
  Route as RouteIcon
} from 'lucide-react';
import { vehicleService } from '../../services/vehicleService';
import { tripService } from '../../services/tripService';
import { mapService } from '../../services/mapService';
import { Vehicle, RouteResult } from '../../types';
import { RouteMap } from '../../components/map/RouteMap';

// Danh sách các địa điểm & bến xe phổ biến tại Việt Nam
const POPULAR_LOCATIONS = [
  { name: 'Bến xe Mỹ Đình, Hà Nội', lat: 21.0285, lng: 105.7782 },
  { name: 'Bến xe Giáp Bát, Hà Nội', lat: 20.9806, lng: 105.8415 },
  { name: 'Bến xe Nước Ngầm, Hà Nội', lat: 20.9631, lng: 105.8465 },
  { name: 'Sân bay Nội Bài, Hà Nội', lat: 21.2212, lng: 105.8072 },
  { name: 'TP. Nam Định (Tỉnh Nam Định)', lat: 20.4344, lng: 106.1764 },
  { name: 'TP. Hải Phòng (Cảng Hải Phòng)', lat: 20.8449, lng: 106.6881 },
  { name: 'TP. Thái Bình', lat: 20.4463, lng: 106.3366 },
  { name: 'TP. Ninh Bình', lat: 20.2506, lng: 105.9745 },
  { name: 'TP. Thanh Hóa', lat: 19.8067, lng: 105.7852 },
  { name: 'TP. Vinh, Nghệ An', lat: 18.6734, lng: 105.6813 },
  { name: 'Cầu Rồng, Đà Nẵng', lat: 16.0612, lng: 108.2279 },
  { name: 'Bến xe Miền Đông, TP.HCM', lat: 10.8142, lng: 106.7118 },
  { name: 'Sân bay Tân Sơn Nhất, TP.HCM', lat: 10.8185, lng: 106.6588 },
];

export const CreateTrip: React.FC = () => {
  const navigate = useNavigate();

  // Danh sách xe & chọn xe
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(true);

  // Điểm xuất phát
  const [originName, setOriginName] = useState<string>('Bến xe Mỹ Đình, Hà Nội');
  const [originLat, setOriginLat] = useState<number>(21.0285);
  const [originLng, setOriginLng] = useState<number>(105.7782);

  // Điểm đến
  const [destName, setDestName] = useState<string>('TP. Nam Định');
  const [destLat, setDestLat] = useState<number>(20.4344);
  const [destLng, setDestLng] = useState<number>(106.1764);

  // Chế độ click bản đồ: 'origin' hoặc 'destination'
  const [mapPickMode, setMapPickMode] = useState<'origin' | 'destination'>('origin');

  // Gợi ý tìm kiếm tự động khi gõ trực tiếp vào ô input (Autocomplete)
  const [originSuggestions, setOriginSuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [destSuggestions, setDestSuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [searchingOrigin, setSearchingOrigin] = useState<boolean>(false);
  const [searchingDest, setSearchingDest] = useState<boolean>(false);

  const originDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const destDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Helper format ngày giờ cho input type="datetime-local"
  const formatDateTimeLocal = (d: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Thời gian khởi hành (mặc định 25 giờ sau để thỏa mãn điều kiện >= 24h)
  const defaultDeparture = new Date(Date.now() + 25 * 60 * 60 * 1000);
  const [departureTime, setDepartureTime] = useState<string>(formatDateTimeLocal(defaultDeparture));

  // Thời gian kết thúc chuyến xe dự kiến (ETA)
  const [etaTime, setEtaTime] = useState<string>('');
  const [isEtaManual, setIsEtaManual] = useState<boolean>(false);

  // Kết quả tính toán lộ trình từ OSRM Map Adapter
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState<boolean>(false);

  // Trạng thái nộp form
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tải danh sách xe ACTIVE của tài xế
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoadingVehicles(true);
        const list = await vehicleService.getMyVehicles();
        const activeList = list.filter((v) => v.status === 'ACTIVE');
        setVehicles(activeList);
        if (activeList.length > 0) {
          setSelectedVehicleId(activeList[0].id);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Không thể tải danh sách phương tiện.');
      } finally {
        setLoadingVehicles(false);
      }
    };

    fetchVehicles();
  }, []);

  // Tự động tính toán lộ trình đường bộ khi tọa độ thay đổi
  useEffect(() => {
    if (originLat && originLng && destLat && destLng) {
      handleCalculateRoute();
    }
  }, [originLat, originLng, destLat, destLng]);

  const handleCalculateRoute = async () => {
    try {
      setCalculatingRoute(true);
      const res = await mapService.getRoute(
        { lat: originLat, lng: originLng },
        { lat: destLat, lng: destLng }
      );
      setRouteResult(res);

      // Nếu tài xế chưa chỉnh ETA bằng tay, tự động cập nhật ETA dự kiến
      if (!isEtaManual && departureTime) {
        const depDate = new Date(departureTime).getTime();
        const autoEta = new Date(depDate + res.duration_min * 60 * 1000);
        setEtaTime(formatDateTimeLocal(autoEta));
      }
    } catch (err: any) {
      console.error('Lỗi tính lộ trình:', err);
    } finally {
      setCalculatingRoute(false);
    }
  };

  // Cập nhật ETA khi tài xế đổi giờ khởi hành (nếu chưa chỉnh thủ công)
  useEffect(() => {
    if (!isEtaManual && routeResult && departureTime) {
      const depDate = new Date(departureTime).getTime();
      const autoEta = new Date(depDate + routeResult.duration_min * 60 * 1000);
      setEtaTime(formatDateTimeLocal(autoEta));
    }
  }, [departureTime]);

  // Xử lý tìm kiếm gợi ý địa chỉ khi gõ ô Điểm xuất phát (Debounce 350ms)
  const handleOriginInputChange = (val: string) => {
    setOriginName(val);

    if (originDebounceRef.current) clearTimeout(originDebounceRef.current);
    if (!val.trim() || val.trim().length < 2) {
      setOriginSuggestions([]);
      return;
    }

    originDebounceRef.current = setTimeout(async () => {
      try {
        setSearchingOrigin(true);
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val.trim())}&limit=5`);
        const data = await res.json();
        const items = (data.features || []).map((f: any) => {
          const p = f.properties || {};
          const labelParts = [p.name, p.street, p.district, p.city, p.state].filter(Boolean);
          return {
            name: labelParts.join(', ') || p.name || val,
            lng: Math.round(f.geometry.coordinates[0] * 10000) / 10000,
            lat: Math.round(f.geometry.coordinates[1] * 10000) / 10000,
          };
        });
        setOriginSuggestions(items);
      } catch (err) {
        console.warn('Lỗi tìm địa điểm:', err);
      } finally {
        setSearchingOrigin(false);
      }
    }, 350);
  };

  // Xử lý tìm kiếm gợi ý địa chỉ khi gõ ô Điểm đến (Debounce 350ms)
  const handleDestInputChange = (val: string) => {
    setDestName(val);

    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    if (!val.trim() || val.trim().length < 2) {
      setDestSuggestions([]);
      return;
    }

    destDebounceRef.current = setTimeout(async () => {
      try {
        setSearchingDest(true);
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val.trim())}&limit=5`);
        const data = await res.json();
        const items = (data.features || []).map((f: any) => {
          const p = f.properties || {};
          const labelParts = [p.name, p.street, p.district, p.city, p.state].filter(Boolean);
          return {
            name: labelParts.join(', ') || p.name || val,
            lng: Math.round(f.geometry.coordinates[0] * 10000) / 10000,
            lat: Math.round(f.geometry.coordinates[1] * 10000) / 10000,
          };
        });
        setDestSuggestions(items);
      } catch (err) {
        console.warn('Lỗi tìm địa điểm:', err);
      } finally {
        setSearchingDest(false);
      }
    }, 350);
  };

  // Khi chọn một gợi ý địa chỉ
  const handleSelectOriginSuggestion = (item: { name: string; lat: number; lng: number }) => {
    setOriginName(item.name);
    setOriginLat(item.lat);
    setOriginLng(item.lng);
    setOriginSuggestions([]);
  };

  const handleSelectDestSuggestion = (item: { name: string; lat: number; lng: number }) => {
    setDestName(item.name);
    setDestLat(item.lat);
    setDestLng(item.lng);
    setDestSuggestions([]);
  };

  // Xử lý khi click vào bản đồ
  const handleMapClick = (point: { lat: number; lng: number }) => {
    if (mapPickMode === 'origin') {
      setOriginLat(point.lat);
      setOriginLng(point.lng);
      setOriginName(`Tọa độ (${point.lat}, ${point.lng})`);
    } else {
      setDestLat(point.lat);
      setDestLng(point.lng);
      setDestName(`Tọa độ (${point.lat}, ${point.lng})`);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  // Kiểm tra thời gian khởi hành >= 24h
  const isDepartureValid = () => {
    const depDate = new Date(departureTime).getTime();
    const now = Date.now();
    const diffHours = (depDate - now) / (1000 * 60 * 60);
    return diffHours >= 23.95;
  };

  // Kiểm tra thời gian kết thúc (ETA) phải sau thời gian khởi hành + thời gian chạy xe
  const isEtaValid = () => {
    if (!etaTime) return false;
    const depDate = new Date(departureTime).getTime();
    const etaDate = new Date(etaTime).getTime();
    const minDurationMs = (routeResult?.duration_min || 15) * 60 * 1000;
    return etaDate >= depDate + minDurationMs;
  };

  const handleResetEtaToMinimum = () => {
    if (routeResult && departureTime) {
      const depDate = new Date(departureTime).getTime();
      const autoEta = new Date(depDate + routeResult.duration_min * 60 * 1000);
      setEtaTime(formatDateTimeLocal(autoEta));
      setIsEtaManual(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedVehicleId) {
      setErrorMessage('Vui lòng chọn phương tiện để thực hiện chuyến đi.');
      return;
    }

    if (!isDepartureValid()) {
      setErrorMessage('Thời gian khởi hành phải cách hiện tại ít nhất 24 giờ theo quy định của GoX.');
      return;
    }

    if (!isEtaValid()) {
      setErrorMessage('Thời gian kết thúc chuyến dự kiến phải lớn hơn thời gian khởi hành cộng thời gian di chuyển tối thiểu.');
      return;
    }

    if (!originName.trim() || !destName.trim()) {
      setErrorMessage('Vui lòng nhập tên điểm xuất phát và điểm đến.');
      return;
    }

    if (originLat === destLat && originLng === destLng) {
      setErrorMessage('Điểm xuất phát và điểm đến không được trùng nhau.');
      return;
    }

    setSubmitting(true);
    try {
      await tripService.createTrip({
        vehicle_id: selectedVehicleId,
        origin_name: originName.trim(),
        origin_lat: originLat,
        origin_lng: originLng,
        dest_name: destName.trim(),
        dest_lat: destLat,
        dest_lng: destLng,
        departure_time: new Date(departureTime).toISOString(),
        eta: new Date(etaTime).toISOString(),
      });

      navigate('/driver/trips');
    } catch (err: any) {
      if (err.response?.data?.error?.code === 'SCHEDULE_CONFLICT') {
        setErrorMessage(
          err.response?.data?.error?.message ||
          'Tài xế hoặc phương tiện đã có lịch trình trong khung giờ này (kèm 1 giờ đệm). Vui lòng chọn thời gian khác.'
        );
      } else if (err.response?.data?.error?.code === 'DEPARTURE_TOO_SOON') {
        setErrorMessage('Chuyến xe phải được đăng trước thời gian khởi hành ít nhất 24 giờ.');
      } else {
        setErrorMessage(err.response?.data?.error?.message || err.message || 'Không thể tạo chuyến đi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>GoX – Đăng chuyến mới</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Tạo chuyến xe đường dài
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Định tuyến đường bộ chính xác, tra cứu tự động địa chỉ và tối ưu hóa tuyến đường chuyến xe.
          </p>
        </div>

        <Link
          to="/driver/trips"
          className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
        >
          <span>Quay lại danh sách chuyến</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl flex items-start space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Đã xảy ra lỗi</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Kiểm tra nếu chưa có xe ACTIVE */}
      {!loadingVehicles && vehicles.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Chưa có phương tiện đang hoạt động</h3>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Bạn cần đăng ký ít nhất một phương tiện có trạng thái hoạt động (ACTIVE) trước khi có thể tạo chuyến xe.
          </p>
          <Link
            to="/driver/vehicles"
            className="inline-flex items-center px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-md hover:bg-emerald-700 transition-colors"
          >
            <Car className="w-4 h-4 mr-2" />
            <span>Quản lý & Thêm phương tiện</span>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cột trái: Form cấu hình chuyến xe (5 cột) */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Chọn phương tiện */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <label className="block text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span className="flex items-center">
                  <Car className="w-4 h-4 mr-2 text-emerald-600" />
                  Chọn phương tiện di chuyển
                </span>
                <Link to="/driver/vehicles" className="text-xs font-semibold text-emerald-600 hover:underline">
                  + Thêm xe mới
                </Link>
              </label>

              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand_model || 'Phương tiện'} – {v.plate_number} ({v.type === 'CAR' ? 'Ô tô' : v.type === 'VAN' ? 'Xe Van' : v.type === 'TRUCK' ? 'Xe Tải' : 'Xe máy'})
                  </option>
                ))}
              </select>

              {/* Chi tiết sức chứa snapshot */}
              {selectedVehicle && (
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
                    <span className="block text-[11px] text-emerald-600 font-medium">Ghế chia sẻ</span>
                    <span className="text-base font-bold">{selectedVehicle.seat_count}</span> chỗ
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
                    <span className="block text-[11px] text-amber-600 font-medium">Cốp chứa hàng</span>
                    <span className="text-base font-bold">{selectedVehicle.cargo_area_m2}</span> m²
                  </div>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-800">
                    <span className="block text-[11px] text-blue-600 font-medium">Khối lượng tối đa</span>
                    <span className="text-base font-bold">{selectedVehicle.cargo_max_kg}</span> kg
                  </div>
                </div>
              )}
            </div>

            {/* 2. Điểm xuất phát & Điểm đến với tính năng Gõ gợi ý tự động (Autocomplete) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center mb-1">
                <Navigation className="w-4 h-4 mr-2 text-emerald-600" />
                Lộ trình di chuyển
              </h2>

              {/* Chế độ chọn điểm xuất phát / điểm đến trên Map */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMapPickMode('origin')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    mapPickMode === 'origin'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Click chọn Điểm xuất phát (Xanh)
                </button>
                <button
                  type="button"
                  onClick={() => setMapPickMode('destination')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    mapPickMode === 'destination'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Click chọn Điểm đến (Đỏ)
                </button>
              </div>

              {/* Ô nhập Điểm xuất phát kèm Autocomplete */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-2"></span>
                    Điểm xuất phát:
                  </span>
                  {searchingOrigin && (
                    <span className="text-[10px] text-emerald-600 font-medium animate-pulse">
                      Đang tìm kiếm...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={originName}
                    onChange={(e) => handleOriginInputChange(e.target.value)}
                    placeholder="Gõ tên bến xe, địa điểm, thành phố..."
                    required
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Tọa độ GPS: {originLat}, {originLng}
                </div>

                {/* Danh sách gợi ý Điểm xuất phát */}
                {originSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto">
                    {originSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectOriginSuggestion(item)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-800 border-b border-slate-100 last:border-b-0 transition-colors flex items-start space-x-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-900 leading-snug">{item.name}</p>
                          <p className="text-[10px] text-slate-400">Tọa độ: {item.lat}, {item.lng}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ô nhập Điểm đến kèm Autocomplete */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 mr-2"></span>
                    Điểm đến:
                  </span>
                  {searchingDest && (
                    <span className="text-[10px] text-rose-600 font-medium animate-pulse">
                      Đang tìm kiếm...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={destName}
                    onChange={(e) => handleDestInputChange(e.target.value)}
                    placeholder="Ví dụ: Cầu rồng đà nẵng, Bến xe Miền Đông..."
                    required
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Tọa độ GPS: {destLat}, {destLng}
                </div>

                {/* Danh sách gợi ý Điểm đến */}
                {destSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto">
                    {destSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectDestSuggestion(item)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-rose-50 hover:text-rose-800 border-b border-slate-100 last:border-b-0 transition-colors flex items-start space-x-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-900 leading-snug">{item.name}</p>
                          <p className="text-[10px] text-slate-400">Tọa độ: {item.lat}, {item.lng}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Danh sách địa điểm gợi ý nhanh */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Chọn nhanh bến xe & tỉnh thành:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_LOCATIONS.map((loc) => (
                    <button
                      key={loc.name}
                      type="button"
                      onClick={() => {
                        if (mapPickMode === 'origin') {
                          setOriginName(loc.name);
                          setOriginLat(loc.lat);
                          setOriginLng(loc.lng);
                          setOriginSuggestions([]);
                        } else {
                          setDestName(loc.name);
                          setDestLat(loc.lat);
                          setDestLng(loc.lng);
                          setDestSuggestions([]);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition-colors"
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Thời gian khởi hành & Thời gian kết thúc chuyến */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center mb-1">
                <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
                Thời gian hành trình
              </h2>

              {/* Giờ khởi hành */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Thời gian khởi hành (trước ít nhất 24 giờ):
                </label>
                <input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  required
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                    isDepartureValid()
                      ? 'border-slate-300 focus:ring-emerald-500'
                      : 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500'
                  }`}
                />
                {!isDepartureValid() && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">
                    * Chuyến xe phải được đăng trước thời gian khởi hành ít nhất 24 giờ.
                  </p>
                )}
              </div>

              {/* Giờ kết thúc dự kiến (ETA) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Thời gian kết thúc chuyến dự kiến:
                  </label>
                  {isEtaManual && (
                    <button
                      type="button"
                      onClick={handleResetEtaToMinimum}
                      className="text-[11px] text-emerald-600 hover:underline flex items-center"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Gợi ý tự động
                    </button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={etaTime}
                  onChange={(e) => {
                    setEtaTime(e.target.value);
                    setIsEtaManual(true);
                  }}
                  required
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                    isEtaValid()
                      ? 'border-slate-300 focus:ring-emerald-500'
                      : 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500'
                  }`}
                />
                {!isEtaValid() ? (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">
                    * Thời gian kết thúc phải lớn hơn thời gian khởi hành cộng thời gian chạy xe tối thiểu.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tài xế có thể nới dài thời gian kết thúc để dự phòng nghỉ chân hoặc trả khách đường dài.
                  </p>
                )}
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-800 space-y-1">
                <div className="flex items-center font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 flex-shrink-0" />
                  Quy định chống trùng lịch GoX:
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-700">
                  Hệ thống tự động bảo lưu 1 giờ đệm nghỉ ngơi giữa 2 chuyến xe liên tiếp của bạn và xe của bạn.
                </p>
              </div>
            </div>

            {/* Nút bấm Tạo chuyến */}
            <button
              type="submit"
              disabled={submitting || !isDepartureValid() || !isEtaValid() || calculatingRoute}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <span>Đang xử lý tạo chuyến...</span>
              ) : (
                <>
                  <span>Xác nhận đăng chuyến xe</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Cột phải: Bản đồ lộ trình & Tổng quan ETA & Các chặng đường (7 cột) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Thẻ tóm tắt thông số lộ trình */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-600 animate-pulse"></div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {originName} → {destName}
                  </h3>
                </div>
                {calculatingRoute && (
                  <span className="text-xs text-emerald-600 font-semibold animate-pulse">
                    Đang tính toán tuyến đường OSRM...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium block">Khoảng cách đường bộ</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {routeResult ? `${routeResult.distance_km} km` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {routeResult && routeResult.distance_km > 300 ? 'Chuyến xe liên tỉnh đường dài' : 'Mạng lưới cao tốc & quốc lộ'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium block">Thời gian chạy xe</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {routeResult
                      ? `${Math.floor(routeResult.duration_min / 60)}h ${Math.round(routeResult.duration_min % 60)}m`
                      : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Tốc độ xe ô tô tiêu chuẩn</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                  <span className="text-xs text-slate-500 font-medium block">Giờ đến dự kiến (ETA)</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {etaTime
                      ? new Date(etaTime).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '—'}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                    {isEtaManual ? '(Tài xế tùy chỉnh)' : '(Tự động từ lộ trình)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bảng lộ trình các trục đường cao tốc / quốc lộ đi qua (Itinerary) */}
            {routeResult && routeResult.major_roads && routeResult.major_roads.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center space-x-2 mb-3">
                  <RouteIcon className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Các trục đường chính chuyến xe sẽ đi qua ({routeResult.major_roads.length} đoạn tuyến)
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                  {routeResult.major_roads.map((road, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-slate-800 border border-slate-200 font-medium"
                    >
                      <Milestone className="w-3 h-3 mr-1 text-emerald-600 flex-shrink-0" />
                      {road}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  * Hệ thống dùng các trục đường này và bán kính 2km để đối chiếu khi người dùng gửi yêu cầu đón/trả dọc đường.
                </p>
              </div>
            )}

            {/* Bản đồ Leaflet tương tác với Esri & OSM */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center">
                  <MapPin className="w-4 h-4 mr-1 text-emerald-600" />
                  Bản đồ lộ trình tương tác (Esri World Street Map & OSRM)
                </span>
                <span className="text-[11px] text-slate-500">
                  Đang click chọn: <strong className={mapPickMode === 'origin' ? 'text-emerald-600' : 'text-rose-600'}>
                    {mapPickMode === 'origin' ? 'Điểm xuất phát (Xanh)' : 'Điểm đến (Đỏ)'}
                  </strong>
                </span>
              </div>

              <RouteMap
                origin={{ lat: originLat, lng: originLng, label: originName }}
                destination={{ lat: destLat, lng: destLng, label: destName }}
                polylineCoordinates={routeResult?.coordinates}
                onSelectPoint={handleMapClick}
                height="480px"
                distanceKm={routeResult?.distance_km}
                durationMin={routeResult?.duration_min}
                majorRoads={routeResult?.major_roads}
              />

              <div className="mt-3 flex items-center text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl">
                <Info className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                <span>
                  Bản đồ sử dụng dữ liệu Esri World Street Map không watermark. Bạn có thể gõ trực tiếp tên địa điểm để tìm kiếm tự động hoặc click trực tiếp lên bản đồ để chọn tọa độ.
                </span>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
