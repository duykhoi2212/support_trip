import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Car,
  Users,
  Package,
  Weight,
  Sparkles,
  ArrowRight,
  XCircle
} from 'lucide-react';
import { tripService } from '../../services/tripService';
import { Trip } from '../../types';

export const SearchTrips: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc tìm kiếm
  const [originName, setOriginName] = useState<string>('');
  const [destName, setDestName] = useState<string>('');
  const [requestType, setRequestType] = useState<'ALL' | 'RIDE' | 'PACKAGE'>('ALL');
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [cargoWeightKg, setCargoWeightKg] = useState<number>(5);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (originName.trim()) params.origin_name = originName.trim();
      if (destName.trim()) params.dest_name = destName.trim();
      if (requestType !== 'ALL') params.type = requestType;
      if (requestType === 'RIDE' && passengerCount > 0) params.passenger_count = passengerCount;
      if (requestType === 'PACKAGE' && cargoWeightKg > 0) params.cargo_weight_kg = cargoWeightKg;

      const results = await tripService.searchTrips(params);
      setTrips(results);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Không thể tìm kiếm chuyến xe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [requestType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrips();
  };

  const quickCities = [
    'Hà Nội',
    'Bến xe Mỹ Đình',
    'Bến xe Giáp Bát',
    'Hải Phòng',
    'Ninh Bình',
    'Đà Nẵng',
    'TP.HCM',
    'Bến xe Miền Đông',
  ];

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden mb-8">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 border border-white/20">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>GoX – Kết nối hành trình, tối ưu chuyến đi</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-2">
            Tìm chuyến xe đi nhờ & gửi đồ tiện lợi
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            Đi chung cùng tài xế xác thực, gửi kiện hàng nhanh gọn dọc lộ trình thực tế với công nghệ định tuyến đường bộ chuẩn xác.
          </p>
        </div>
      </div>

      {/* Box Tìm kiếm chuyên sâu */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mb-10">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          {/* Tabs loại hình */}
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
            <button
              type="button"
              onClick={() => setRequestType('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                requestType === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả chuyến xe
            </button>
            <button
              type="button"
              onClick={() => setRequestType('RIDE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-1.5 ${
                requestType === 'RIDE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Đi nhờ xe</span>
            </button>
            <button
              type="button"
              onClick={() => setRequestType('PACKAGE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-1.5 ${
                requestType === 'PACKAGE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Gửi hàng</span>
            </button>
          </div>

          {/* Hàng ô nhập điểm xuất phát, điểm đến & bộ lọc */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Điểm xuất phát:
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                <input
                  type="text"
                  value={originName}
                  onChange={(e) => setOriginName(e.target.value)}
                  placeholder="Tỉnh/Thành, Bến xe..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Điểm đến:
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={destName}
                  onChange={(e) => setDestName(e.target.value)}
                  placeholder="Tỉnh/Thành, Điểm đến..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {requestType === 'RIDE' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số ghế cần:
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {requestType === 'PACKAGE' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Khối lượng kiện (kg):
                </label>
                <div className="relative">
                  <Weight className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={cargoWeightKg}
                    onChange={(e) => setCargoWeightKg(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                <span>{loading ? 'Đang tìm kiếm...' : 'Tìm chuyến xe'}</span>
              </button>
            </div>
          </div>

          {/* Quick chip chọn nhanh */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-slate-400 font-medium">Gợi ý địa điểm:</span>
            {quickCities.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => {
                  if (!originName) setOriginName(city);
                  else setDestName(city);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                {city}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Danh sách kết quả */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">
          Chuyến xe đang mở ({trips.length})
        </h2>
        <span className="text-xs text-slate-400">
          Hệ thống tự động khóa nhận yêu cầu trước giờ đi 6 tiếng
        </span>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white p-6 rounded-3xl border border-slate-200 h-64">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
              <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2 mb-6"></div>
              <div className="h-10 bg-slate-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Không tìm thấy chuyến xe nào phù hợp
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Hiện tại chưa có chuyến xe mở khớp với tiêu chí tìm kiếm của bạn. Hãy thử thay đổi địa điểm hoặc quay lại sau nhé!
          </p>
          <button
            type="button"
            onClick={() => {
              setOriginName('');
              setDestName('');
              setRequestType('ALL');
              fetchTrips();
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            Xem tất cả chuyến xe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => {
            const availableSeats = trip.seats_total - trip.seats_reserved;
            const availableArea = (trip.cargo_area_total_m2 - trip.cargo_area_reserved_m2).toFixed(1);
            const availableWeight = trip.cargo_weight_total_kg - trip.cargo_weight_reserved_kg;

            const isSeatsFull = availableSeats <= 0;
            const isCargoFull = Number(availableArea) <= 0 || availableWeight <= 0;
            const isTripFull = isSeatsFull && isCargoFull;

            return (
              <div
                key={trip.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6">
                  {/* Mã chuyến & Badge thông minh */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      {trip.code}
                    </span>

                    {isTripFull ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <XCircle className="w-3 h-3 mr-1 text-rose-500" />
                        Đã kín chỗ & cốp
                      </span>
                    ) : isSeatsFull ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Package className="w-3 h-3 mr-1 text-amber-600" />
                        Chỉ nhận gửi hàng (Hết ghế)
                      </span>
                    ) : isCargoFull ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        <Users className="w-3 h-3 mr-1 text-blue-600" />
                        Chỉ nhận đi nhờ (Hết cốp)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                        Đang nhận yêu cầu
                      </span>
                    )}
                  </div>

                  {/* Lộ trình Điểm đi -> Điểm đến */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0 ring-2 ring-emerald-100"></div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Xuất phát</span>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{trip.origin_name}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 flex-shrink-0 ring-2 ring-rose-100"></div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Đến nơi</span>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{trip.dest_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Giờ khởi hành & Thông số */}
                  <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 mb-4 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        Khởi hành:
                      </span>
                      <span className="font-bold text-slate-800">
                        {new Date(trip.departure_time).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        {new Date(trip.departure_time).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        Khoảng cách:
                      </span>
                      <span className="font-semibold text-slate-700">
                        {trip.distance_km} km {trip.duration_min ? `(${Math.round(trip.duration_min / 60)}h${trip.duration_min % 60}m)` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Sức chứa còn lại - Rõ ràng minh bạch */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {/* Ghế */}
                    <div className={`p-2 rounded-xl border ${isSeatsFull ? 'bg-rose-50/80 border-rose-200' : 'bg-emerald-50/60 border-emerald-100'}`}>
                      <div className={`flex items-center justify-center mb-0.5 ${isSeatsFull ? 'text-rose-600' : 'text-emerald-700'}`}>
                        <Users className="w-3 h-3 mr-1" />
                        <span className="text-[10px] font-semibold">{isSeatsFull ? 'Ghế ngồi' : 'Ghế trống'}</span>
                      </div>
                      <span className={`font-extrabold text-[11px] block leading-tight ${isSeatsFull ? 'text-rose-700 font-black' : 'text-emerald-900'}`}>
                        {isSeatsFull ? `Kín ${trip.seats_reserved}/${trip.seats_total}` : `Còn ${availableSeats}/${trip.seats_total}`}
                      </span>
                    </div>

                    {/* Cốp */}
                    <div className={`p-2 rounded-xl border ${Number(availableArea) <= 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-amber-50/60 border-amber-100'}`}>
                      <div className={`flex items-center justify-center mb-0.5 ${Number(availableArea) <= 0 ? 'text-rose-600' : 'text-amber-700'}`}>
                        <Package className="w-3 h-3 mr-1" />
                        <span className="text-[10px] font-semibold">{Number(availableArea) <= 0 ? 'Cốp xe' : 'Cốp trống'}</span>
                      </div>
                      <span className={`font-extrabold text-[11px] block leading-tight ${Number(availableArea) <= 0 ? 'text-rose-700 font-black' : 'text-amber-900'}`}>
                        {Number(availableArea) <= 0 ? 'Hết cốp' : `Còn ${availableArea} m²`}
                      </span>
                    </div>

                    {/* Tải */}
                    <div className={`p-2 rounded-xl border ${availableWeight <= 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-blue-50/60 border-blue-100'}`}>
                      <div className={`flex items-center justify-center mb-0.5 ${availableWeight <= 0 ? 'text-rose-600' : 'text-blue-700'}`}>
                        <Weight className="w-3 h-3 mr-1" />
                        <span className="text-[10px] font-semibold">{availableWeight <= 0 ? 'Tải trọng' : 'Tải trống'}</span>
                      </div>
                      <span className={`font-extrabold text-[11px] block leading-tight ${availableWeight <= 0 ? 'text-rose-700 font-black' : 'text-blue-900'}`}>
                        {availableWeight <= 0 ? 'Hết tải' : `Còn ${availableWeight} kg`}
                      </span>
                    </div>
                  </div>

                  {/* Dòng cập nhật yêu cầu đã duyệt */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span>Đã nhận: <strong className="text-slate-800">{trip.seats_reserved} khách</strong></span>
                    </span>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {trip._count?.transport_requests || 0} yêu cầu tham gia
                    </span>
                  </div>
                </div>

                {/* Footer với Nút Xem lộ trình & Đặt chỗ */}
                <div className="p-4 border-t border-slate-100 bg-white">
                  <Link
                    to={`/trips/${trip.id}`}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 ${
                      isTripFull
                        ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/15 group-hover:translate-x-0.5'
                    }`}
                  >
                    <span>{isTripFull ? 'Xem chi tiết chuyến xe (Đã đầy)' : 'Xem lộ trình & Đặt yêu cầu'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
