import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Car,
  MapPin,
  Calendar,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Info,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { vehicleService } from '../../services/vehicleService';
import { tripService } from '../../services/tripService';
import { mapService } from '../../services/mapService';
import { Vehicle, RouteResult } from '../../types';
import { RouteMap } from '../../components/map/RouteMap';

// Danh sách các thành phố phổ biến tại Việt Nam để chọn nhanh
const POPULAR_LOCATIONS = [
  { name: 'Hà Nội', lat: 21.0285, lng: 105.8542 },
  { name: 'Hải Phòng', lat: 20.8449, lng: 106.6881 },
  { name: 'Quảng Ninh', lat: 20.9505, lng: 107.0734 },
  { name: 'Nam Định', lat: 20.4344, lng: 106.1764 },
  { name: 'Thái Bình', lat: 20.4463, lng: 106.3366 },
  { name: 'Ninh Bình', lat: 20.2506, lng: 105.9745 },
  { name: 'Thanh Hóa', lat: 19.8067, lng: 105.7852 },
  { name: 'Nghệ An', lat: 18.6734, lng: 105.6813 },
  { name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022 },
  { name: 'TP. Hồ Chí Minh', lat: 10.8231, lng: 106.6297 },
];

export const CreateTrip: React.FC = () => {
  const navigate = useNavigate();

  // Danh sách xe & chọn xe
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(true);

  // Điểm xuất phát
  const [originName, setOriginName] = useState<string>('Hà Nội');
  const [originLat, setOriginLat] = useState<number>(21.0285);
  const [originLng, setOriginLng] = useState<number>(105.8542);

  // Điểm đến
  const [destName, setDestName] = useState<string>('Nam Định');
  const [destLat, setDestLat] = useState<number>(20.4344);
  const [destLng, setDestLng] = useState<number>(106.1764);

  // Chế độ click bản đồ: 'origin' hoặc 'destination'
  const [mapPickMode, setMapPickMode] = useState<'origin' | 'destination'>('origin');

  // Thời gian khởi hành (mặc định 25 giờ sau để thỏa mãn điều kiện >= 24h)
  const defaultDeparture = new Date(Date.now() + 25 * 60 * 60 * 1000);
  const formatDateTimeLocal = (d: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [departureTime, setDepartureTime] = useState<string>(formatDateTimeLocal(defaultDeparture));

  // Kết quả tính toán lộ trình từ Map Adapter
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

  // Tự động tính toán tuyến đường khi tọa độ thay đổi
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
    } catch (err: any) {
      console.error('Lỗi tính lộ trình:', err);
    } finally {
      setCalculatingRoute(false);
    }
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
    return diffHours >= 23.95; // Cho phép sai số vài giây
  };

  // Tính thời gian đến dự kiến (ETA)
  const calculateETAString = () => {
    if (!departureTime || !routeResult) return null;
    const dep = new Date(departureTime);
    const eta = new Date(dep.getTime() + routeResult.duration_min * 60 * 1000);
    return eta.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
      });

      navigate('/driver/trips');
    } catch (err: any) {
      if (err.response?.data?.error?.code === 'VEHICLE_SCHEDULE_CONFLICT') {
        setErrorMessage('Phương tiện đã có lịch trình di chuyển trong khoảng thời gian này. Vui lòng chọn giờ hoặc xe khác.');
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
            Thiết lập lộ trình, thời gian khởi hành và chia sẻ sức chứa xe với người có nhu cầu.
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
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

            {/* 2. Điểm xuất phát & Điểm đến */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center mb-1">
                <Navigation className="w-4 h-4 mr-2 text-emerald-600" />
                Lộ trình di chuyển
              </h2>

              {/* Nút chọn chế độ click bản đồ */}
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
                  Chọn Điểm xuất phát trên map
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
                  Chọn Điểm đến trên map
                </button>
              </div>

              {/* Điểm xuất phát */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-2"></span>
                  Điểm xuất phát:
                </label>
                <input
                  type="text"
                  value={originName}
                  onChange={(e) => setOriginName(e.target.value)}
                  placeholder="Ví dụ: Bến xe Mỹ Đình, Hà Nội"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  Tọa độ: {originLat}, {originLng}
                </div>
              </div>

              {/* Điểm đến */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 mr-2"></span>
                  Điểm đến:
                </label>
                <input
                  type="text"
                  value={destName}
                  onChange={(e) => setDestName(e.target.value)}
                  placeholder="Ví dụ: Trung tâm TP. Nam Định"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  Tọa độ: {destLat}, {destLng}
                </div>
              </div>

              {/* Danh sách địa điểm gợi ý nhanh */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Chọn nhanh địa phương:
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
                        } else {
                          setDestName(loc.name);
                          setDestLat(loc.lat);
                          setDestLng(loc.lng);
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

            {/* 3. Thời gian khởi hành */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
              <label className="block text-sm font-bold text-slate-900 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
                Thời gian khởi hành
              </label>

              <input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                required
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 font-medium ${
                  isDepartureValid()
                    ? 'border-slate-300 focus:ring-emerald-500'
                    : 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500'
                }`}
              />

              {!isDepartureValid() ? (
                <p className="text-xs text-rose-600 font-semibold flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  Quy định DR-01: Chuyến xe phải được đăng trước ít nhất 24 giờ.
                </p>
              ) : (
                <p className="text-xs text-emerald-700 font-medium flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Thời gian hợp lệ (cách hiện tại trên 24 giờ).
                </p>
              )}
            </div>

            {/* Nút bấm Tạo chuyến */}
            <button
              type="submit"
              disabled={submitting || !isDepartureValid() || calculatingRoute}
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

          {/* Cột phải: Bản đồ lộ trình & Tổng quan ETA (7 cột) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Thẻ tóm tắt thông số lộ trình */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {originName} → {destName}
                  </h3>
                </div>
                {calculatingRoute && (
                  <span className="text-xs text-emerald-600 font-semibold animate-pulse">
                    Đang tính toán tuyến đường...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium block">Khoảng cách dự kiến</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {routeResult ? `${routeResult.distance_km} km` : '—'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium block">Thời gian di chuyển</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {routeResult
                      ? `${Math.floor(routeResult.duration_min / 60)}h ${routeResult.duration_min % 60}m`
                      : '—'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                  <span className="text-xs text-slate-500 font-medium block">Giờ đến dự kiến (ETA)</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {calculateETAString() || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bản đồ Leaflet tương tác */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center">
                  <MapPin className="w-4 h-4 mr-1 text-emerald-600" />
                  Bản đồ lộ trình OpenStreetMap (OpenRouteService)
                </span>
                <span className="text-[11px] text-slate-500">
                  Đang chọn: <strong className={mapPickMode === 'origin' ? 'text-emerald-600' : 'text-rose-600'}>
                    {mapPickMode === 'origin' ? 'Điểm xuất phát (Xanh)' : 'Điểm đến (Đỏ)'}
                  </strong>
                </span>
              </div>

              <RouteMap
                origin={{ lat: originLat, lng: originLng, label: originName }}
                destination={{ lat: destLat, lng: destLng, label: destName }}
                polylineCoordinates={routeResult?.coordinates}
                onSelectPoint={handleMapClick}
                height="450px"
              />

              <div className="mt-3 flex items-center text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl">
                <Info className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                <span>
                  Bạn có thể click trực tiếp lên bất kỳ vị trí nào trên bản đồ để chọn tọa độ điểm xuất phát hoặc điểm đến chính xác.
                </span>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
