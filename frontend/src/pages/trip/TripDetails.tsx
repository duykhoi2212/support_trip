import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Car,
  MapPin,
  Clock,
  Users,
  Package,
  Weight,
  AlertCircle,
  ChevronLeft,
  Navigation,
  Search,
  ShieldCheck,
  User as UserIcon,
  ArrowRight
} from 'lucide-react';
import { tripService } from '../../services/tripService';
import { requestService } from '../../services/requestService';
import { useAuth } from '../../context/AuthContext';
import { Trip } from '../../types';
import { RouteMap } from '../../components/map/RouteMap';
import { checkDistanceToPolyline } from '../../utils/geo';

export const TripDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Chế độ đặt: 'RIDE' (Đi nhờ xe) hoặc 'PACKAGE' (Gửi hàng)
  const [requestType, setRequestType] = useState<'RIDE' | 'PACKAGE'>('RIDE');

  // Điểm đón & trả khách/hàng
  const [pickupName, setPickupName] = useState<string>('');
  const [pickupLat, setPickupLat] = useState<number>(0);
  const [pickupLng, setPickupLng] = useState<number>(0);

  const [dropoffName, setDropoffName] = useState<string>('');
  const [dropoffLat, setDropoffLat] = useState<number>(0);
  const [dropoffLng, setDropoffLng] = useState<number>(0);

  // Autocomplete suggestions
  const [pickupSuggestions, setPickupSuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDropoff, setSearchingDropoff] = useState(false);

  const pickupDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropoffDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Form states cho Đi nhờ xe (RIDE)
  const [passengerCount, setPassengerCount] = useState<number>(1);

  // Form states cho Gửi hàng (PACKAGE)
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [packageDesc, setPackageDesc] = useState<string>('');
  const [packageCategory, setPackageCategory] = useState<string>('Đồ dùng cá nhân');
  const [weightKg, setWeightKg] = useState<number>(5);
  const [lengthCm, setLengthCm] = useState<number>(40);
  const [widthCm, setWidthCm] = useState<number>(30);
  const [heightCm, setHeightCm] = useState<number>(20);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Trạng thái nộp yêu cầu
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Lấy dữ liệu chuyến xe
  useEffect(() => {
    if (!id) return;
    const fetchTrip = async () => {
      try {
        setLoading(true);
        const data = await tripService.getTripById(id);
        setTrip(data);

        // Mặc định điền điểm đón/trả trùng với điểm xuất phát và kết thúc của chuyến
        setPickupName(data.origin_name);
        setPickupLat(data.origin_lat);
        setPickupLng(data.origin_lng);

        setDropoffName(data.dest_name);
        setDropoffLat(data.dest_lat);
        setDropoffLng(data.dest_lng);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || err.message || 'Không thể tải thông tin chuyến xe.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [id]);

  // Xử lý tìm kiếm gợi ý điểm đón
  const handlePickupChange = (val: string) => {
    setPickupName(val);
    if (pickupDebounceRef.current) clearTimeout(pickupDebounceRef.current);
    if (!val.trim() || val.trim().length < 2) {
      setPickupSuggestions([]);
      return;
    }

    pickupDebounceRef.current = setTimeout(async () => {
      try {
        setSearchingPickup(true);
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
        setPickupSuggestions(items);
      } catch (err) {
        console.warn('Lỗi tìm kiếm:', err);
      } finally {
        setSearchingPickup(false);
      }
    }, 350);
  };

  // Xử lý tìm kiếm gợi ý điểm trả
  const handleDropoffChange = (val: string) => {
    setDropoffName(val);
    if (dropoffDebounceRef.current) clearTimeout(dropoffDebounceRef.current);
    if (!val.trim() || val.trim().length < 2) {
      setDropoffSuggestions([]);
      return;
    }

    dropoffDebounceRef.current = setTimeout(async () => {
      try {
        setSearchingDropoff(true);
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
        setDropoffSuggestions(items);
      } catch (err) {
        console.warn('Lỗi tìm kiếm:', err);
      } finally {
        setSearchingDropoff(false);
      }
    }, 350);
  };

  // Tính khoảng cách trắc địa từ điểm đón/trả đến lộ trình polyline của xe
  const routeCoords: Array<[number, number]> = trip?.route_polyline
    ? JSON.parse(trip.route_polyline)
    : [];

  const pickupDistanceKm = checkDistanceToPolyline(pickupLat, pickupLng, routeCoords);
  const dropoffDistanceKm = checkDistanceToPolyline(dropoffLat, dropoffLng, routeCoords);

  const isPickupValid = pickupDistanceKm <= 2.0;
  const isDropoffValid = dropoffDistanceKm <= 2.0;

  // Tính diện tích chiếm dụng m2 = (dài * rộng) / 10000
  const calculatedAreaM2 = Math.round(((lengthCm * widthCm) / 10000) * 100) / 100;

  // Chọn ảnh kiện hàng
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

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!trip) return;

    if (!isPickupValid || !isDropoffValid) {
      setFormError('Điểm đón và điểm trả phải nằm trong bán kính tối đa 2.0 km so với tuyến đường của chuyến xe.');
      return;
    }

    setSubmitting(true);
    try {
      if (requestType === 'RIDE') {
        await requestService.createRideRequest({
          trip_id: trip.id,
          pickup_name: pickupName.trim(),
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          dropoff_name: dropoffName.trim(),
          dropoff_lat: dropoffLat,
          dropoff_lng: dropoffLng,
          passenger_count: passengerCount,
        });
      } else {
        if (!photoFile) {
          setFormError('Vui lòng chụp và tải lên ảnh thực tế của kiện hàng.');
          setSubmitting(false);
          return;
        }

        const formData = new FormData();
        formData.append('trip_id', trip.id);
        formData.append('pickup_name', pickupName.trim());
        formData.append('pickup_lat', pickupLat.toString());
        formData.append('pickup_lng', pickupLng.toString());
        formData.append('dropoff_name', dropoffName.trim());
        formData.append('dropoff_lat', dropoffLat.toString());
        formData.append('dropoff_lng', dropoffLng.toString());
        formData.append('recipient_name', recipientName.trim());
        formData.append('recipient_phone', recipientPhone.trim());
        formData.append('description', packageDesc.trim());
        formData.append('category', packageCategory);
        formData.append('weight_kg', weightKg.toString());
        formData.append('length_cm', lengthCm.toString());
        formData.append('width_cm', widthCm.toString());
        formData.append('height_cm', heightCm.toString());
        formData.append('photo', photoFile);

        await requestService.createPackageRequest(formData);
      }

      navigate('/user/requests');
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || err.message || 'Không thể gửi yêu cầu đặt chỗ.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-slate-500 font-medium">Đang tải thông tin chuyến xe...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Không tìm thấy chuyến xe</h2>
        <p className="text-sm text-slate-600 mb-6">{error || 'Chuyến xe không tồn tại hoặc đã bị xóa.'}</p>
        <Link
          to="/"
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  const remainingSeats = trip.seats_total - trip.seats_reserved;
  const remainingArea = Math.round((trip.cargo_area_total_m2 - trip.cargo_area_reserved_m2) * 100) / 100;
  const remainingWeight = Math.round((trip.cargo_weight_total_kg - trip.cargo_weight_reserved_kg) * 10) / 10;
  const isDriver = user?.id === trip.driver_id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header & Quay lại */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-emerald-600 mb-2 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            <span>Quay lại tìm kiếm</span>
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Chi tiết chuyến xe {trip.code}
            </h1>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {trip.status === 'OPEN' ? 'Đang nhận yêu cầu' : trip.status}
            </span>
          </div>
        </div>

        {/* Nếu là tài xế của chuyến xe này */}
        {isDriver && (
          <Link
            to={`/driver/trips/${trip.id}/manage`}
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700 transition-colors"
          >
            <Car className="w-4 h-4 mr-1.5" />
            <span>Chuyển sang Điều hành chuyến</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Cột trái: Thông tin chuyến xe & Bản đồ lộ trình (7 cột) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Lộ trình & Thời gian */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hành trình</span>
              {trip.distance_km && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  {trip.distance_km} km ({Math.floor((trip.duration_min || 0) / 60)}h {(trip.duration_min || 0) % 60}m)
                </span>
              )}
            </div>

            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 mb-6">
              <div className="flex items-start space-x-3 relative">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 z-10 border-2 border-white shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 block">Xuất phát:</span>
                  <p className="text-base font-bold text-slate-900 leading-snug">{trip.origin_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Khởi hành: <strong>{new Date(trip.departure_time).toLocaleString('vi-VN')}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 relative">
                <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 z-10 border-2 border-white shadow-sm">
                  <MapPin className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 block">Đích đến:</span>
                  <p className="text-base font-bold text-slate-900 leading-snug">{trip.dest_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    Dự kiến đến (ETA): {new Date(trip.eta).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Sức chứa còn lại */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-center text-slate-400 mb-1">
                  <Users className="w-4 h-4 mr-1 text-emerald-600" />
                  <span className="font-semibold text-slate-600">Ghế trống</span>
                </div>
                <span className="text-lg font-black text-slate-900">{remainingSeats}</span>
                <span className="text-[11px] text-slate-400 block">/{trip.seats_total} chỗ</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-center text-slate-400 mb-1">
                  <Package className="w-4 h-4 mr-1 text-amber-600" />
                  <span className="font-semibold text-slate-600">Cốp trống</span>
                </div>
                <span className="text-lg font-black text-slate-900">{remainingArea}</span>
                <span className="text-[11px] text-slate-400 block">m²</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-center text-slate-400 mb-1">
                  <Weight className="w-4 h-4 mr-1 text-blue-600" />
                  <span className="font-semibold text-slate-600">Tải trống</span>
                </div>
                <span className="text-lg font-black text-slate-900">{remainingWeight}</span>
                <span className="text-[11px] text-slate-400 block">kg</span>
              </div>
            </div>
          </div>

          {/* Bản đồ lộ trình Esri */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center">
                <Navigation className="w-4 h-4 mr-1.5 text-emerald-600" />
                Lộ trình di chuyển bám đường thực tế
              </span>
              <span className="text-[11px] text-slate-500">Quy tắc đón/trả: bán kính ≤ 2.0 km</span>
            </div>

            <RouteMap
              origin={{ lat: trip.origin_lat, lng: trip.origin_lng, label: trip.origin_name }}
              destination={{ lat: trip.dest_lat, lng: trip.dest_lng, label: trip.dest_name }}
              polylineCoordinates={routeCoords}
              height="380px"
              distanceKm={trip.distance_km}
              durationMin={trip.duration_min}
            />
          </div>

          {/* Thông tin Tài xế & Phương tiện */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base flex-shrink-0">
                {trip.driver?.full_name ? trip.driver.full_name[0] : <UserIcon className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Tài xế</span>
                <h4 className="font-bold text-slate-900 text-sm">{trip.driver?.full_name}</h4>
                <div className="flex items-center text-[11px] text-emerald-700 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Đã xác thực danh tính
                </div>
              </div>
            </div>

            {trip.vehicle && (
              <div className="flex items-center space-x-3 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Phương tiện</span>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {trip.vehicle.brand_model} ({trip.vehicle.color})
                  </h4>
                  <p className="text-xs font-mono font-bold text-slate-600 mt-0.5">{trip.vehicle.plate_number}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Form Đặt chỗ đi nhờ hoặc Gửi hàng (5 cột) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm sticky top-20">
            {/* Tab chuyển đổi RIDE / PACKAGE */}
            <div className="flex rounded-2xl bg-slate-100 p-1 mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => setRequestType('RIDE')}
                className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  requestType === 'RIDE'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Đi nhờ xe</span>
              </button>
              <button
                type="button"
                onClick={() => setRequestType('PACKAGE')}
                className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  requestType === 'PACKAGE'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Gửi hàng hóa</span>
              </button>
            </div>

            {/* Thông báo lỗi form */}
            {formError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {!user ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-600 mb-4">Vui lòng đăng nhập để gửi yêu cầu đi nhờ hoặc gửi hàng.</p>
                <Link
                  to="/login"
                  className="inline-flex items-center px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow hover:bg-emerald-700 transition-colors"
                >
                  Đăng nhập tài khoản
                </Link>
              </div>
            ) : user.role === 'DRIVER' ? (
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 text-amber-800 text-xs leading-relaxed space-y-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="font-bold text-sm text-amber-900">Tài khoản Tài xế không thể đặt chuyến</p>
                </div>
                <p>
                  Bạn đang đăng nhập với tư cách <strong>Tài xế</strong>. Tài xế không sử dụng dịch vụ đi nhờ hoặc gửi hàng như người dùng.
                </p>
                <p className="text-slate-600">
                  Nếu bạn có nhu cầu đi nhờ hoặc gửi đồ, vui lòng đăng xuất và đăng nhập bằng <strong>tài khoản Người dùng</strong> (hoặc đăng ký vai trò Người dùng với cùng Email/SĐT).
                </p>
                <div className="pt-1 flex items-center space-x-2">
                  <Link
                    to="/driver/trips"
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors"
                  >
                    Về Quản lý chuyến xe
                  </Link>
                </div>
              </div>
            ) : trip.status !== 'OPEN' ? (
              <div className="bg-slate-100 p-4 rounded-2xl text-slate-600 text-xs text-center">
                Chuyến xe hiện không mở nhận yêu cầu mới.
              </div>
            ) : requestType === 'RIDE' && remainingSeats <= 0 ? (
              <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 text-rose-800 text-xs leading-relaxed text-center space-y-2">
                <p className="font-bold text-sm text-rose-900">Chuyến xe này đã kín chỗ ngồi (0/{trip.seats_total})</p>
                <p className="text-slate-600">
                  Tất cả các ghế đã được tài xế nhận đủ khách. Bạn có thể chuyển sang tab <strong>Gửi hàng hóa</strong> nếu xe còn chỗ cốp.
                </p>
                {remainingArea > 0 && remainingWeight > 0 && (
                  <button
                    type="button"
                    onClick={() => setRequestType('PACKAGE')}
                    className="mt-2 inline-flex items-center px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors"
                  >
                    Chuyển sang Gửi hàng hóa
                  </button>
                )}
              </div>
            ) : requestType === 'PACKAGE' && (remainingArea <= 0 || remainingWeight <= 0) ? (
              <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 text-rose-800 text-xs leading-relaxed text-center space-y-2">
                <p className="font-bold text-sm text-rose-900">Khoang cốp của xe đã hết sức chứa</p>
                <p className="text-slate-600">
                  Chuyến xe này đã nhận đủ số lượng hoặc tải trọng kiện hàng tối đa.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                {/* 1. Điểm đón khách / nhận hàng */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-1.5"></span>
                      {requestType === 'RIDE' ? 'Điểm đón bạn:' : 'Điểm tài xế nhận hàng:'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPickupValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isPickupValid ? `Cách lộ trình ${pickupDistanceKm} km (Hợp lệ)` : `Cách lộ trình ${pickupDistanceKm} km (> 2km)`}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pickupName}
                      onChange={(e) => handlePickupChange(e.target.value)}
                      placeholder="Gõ tên đường, quận, bến xe đón..."
                      required
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    {searchingPickup && (
                      <span className="absolute right-3 top-2.5 text-[10px] text-emerald-600 font-semibold animate-pulse">
                        Đang tìm...
                      </span>
                    )}
                  </div>

                  {pickupSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto">
                      {pickupSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPickupName(item.name);
                            setPickupLat(item.lat);
                            setPickupLng(item.lng);
                            setPickupSuggestions([]);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 border-b border-slate-100 last:border-b-0"
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Điểm trả khách / giao hàng */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 mr-1.5"></span>
                      {requestType === 'RIDE' ? 'Điểm trả bạn:' : 'Điểm giao hàng:'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isDropoffValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isDropoffValid ? `Cách lộ trình ${dropoffDistanceKm} km (Hợp lệ)` : `Cách lộ trình ${dropoffDistanceKm} km (> 2km)`}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dropoffName}
                      onChange={(e) => handleDropoffChange(e.target.value)}
                      placeholder="Gõ tên đường, quận, địa điểm trả..."
                      required
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    {searchingDropoff && (
                      <span className="absolute right-3 top-2.5 text-[10px] text-emerald-600 font-semibold animate-pulse">
                        Đang tìm...
                      </span>
                    )}
                  </div>

                  {dropoffSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto">
                      {dropoffSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setDropoffName(item.name);
                            setDropoffLat(item.lat);
                            setDropoffLng(item.lng);
                            setDropoffSuggestions([]);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-rose-50 border-b border-slate-100 last:border-b-0"
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Form fields riêng cho RIDE */}
                {requestType === 'RIDE' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số lượng hành khách (Còn trống {remainingSeats} chỗ):
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        min={1}
                        max={remainingSeats}
                        value={passengerCount}
                        onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
                        className="w-24 px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-500">người</span>
                    </div>
                  </div>
                )}

                {/* 4. Form fields riêng cho PACKAGE */}
                {requestType === 'PACKAGE' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Họ tên người nhận:</label>
                        <input
                          type="text"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="Ví dụ: Nguyễn Văn A"
                          required
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">SĐT người nhận:</label>
                        <input
                          type="tel"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder="0912345678"
                          required
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Loại hàng gửi:</label>
                        <select
                          value={packageCategory}
                          onChange={(e) => setPackageCategory(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                          <option value="Đồ dùng cá nhân">Đồ dùng cá nhân</option>
                          <option value="Hàng điện tử">Hàng điện tử</option>
                          <option value="Thực phẩm / Nông sản">Thực phẩm / Nông sản</option>
                          <option value="Tài liệu / Giấy tờ">Tài liệu / Giấy tờ</option>
                          <option value="Khác">Khác</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Mô tả kiện hàng:</label>
                        <input
                          type="text"
                          value={packageDesc}
                          onChange={(e) => setPackageDesc(e.target.value)}
                          placeholder="Ví dụ: Thùng carton, balo..."
                          required
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-500">Dài (cm)</label>
                        <input
                          type="number"
                          min={1}
                          value={lengthCm}
                          onChange={(e) => setLengthCm(parseFloat(e.target.value) || 1)}
                          className="w-full p-1.5 rounded-lg border border-slate-300 text-center font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500">Rộng (cm)</label>
                        <input
                          type="number"
                          min={1}
                          value={widthCm}
                          onChange={(e) => setWidthCm(parseFloat(e.target.value) || 1)}
                          className="w-full p-1.5 rounded-lg border border-slate-300 text-center font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500">Cao (cm)</label>
                        <input
                          type="number"
                          min={1}
                          value={heightCm}
                          onChange={(e) => setHeightCm(parseFloat(e.target.value) || 1)}
                          className="w-full p-1.5 rounded-lg border border-slate-300 text-center font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500">Nặng (kg)</label>
                        <input
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={weightKg}
                          onChange={(e) => setWeightKg(parseFloat(e.target.value) || 1)}
                          className="w-full p-1.5 rounded-lg border border-slate-300 text-center font-bold text-xs"
                        />
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-[11px] text-amber-900 flex justify-between">
                      <span>Diện tích sàn chiếm: <strong>{calculatedAreaM2} m²</strong></span>
                      <span>Cốp xe còn: <strong>{remainingArea} m²</strong></span>
                    </div>

                    {/* Upload ảnh kiện hàng */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Ảnh chụp kiện hàng (Bắt buộc):
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoSelect}
                        required
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200"
                      />
                      {photoPreview && (
                        <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Nút nộp form */}
                <button
                  type="submit"
                  disabled={submitting || !isPickupValid || !isDropoffValid}
                  className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    requestType === 'RIDE'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  }`}
                >
                  {submitting ? (
                    <span>Đang gửi yêu cầu...</span>
                  ) : (
                    <>
                      <span>{requestType === 'RIDE' ? 'Xác nhận đặt chỗ đi nhờ' : 'Xác nhận gửi hàng'}</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  * Số điện thoại của bạn và tài xế chỉ được hiển thị sau khi tài xế duyệt chấp nhận yêu cầu.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
