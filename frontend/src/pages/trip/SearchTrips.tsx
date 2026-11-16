import React, { useState, useEffect, useRef } from 'react';
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
  XCircle,
  Zap,
  Fuel,
  Bot,
  RotateCcw
} from 'lucide-react';
import { tripService } from '../../services/tripService';
import { Trip, AiSearchCriteria } from '../../types';

export const SearchTrips: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Chế độ tìm kiếm: 'FILTER' (Bộ lọc thường) hoặc 'AI' (Gemini AI)
  const [searchMode, setSearchMode] = useState<'FILTER' | 'AI'>('FILTER');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResultMeta, setAiResultMeta] = useState<{
    explanation?: string;
    is_fallback?: boolean;
    criteria?: AiSearchCriteria;
  } | null>(null);

  // Bộ lọc tìm kiếm
  const [originName, setOriginName] = useState<string>('');
  const [originLat, setOriginLat] = useState<number | null>(null);
  const [originLng, setOriginLng] = useState<number | null>(null);

  const [destName, setDestName] = useState<string>('');
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);

  const [departureDate, setDepartureDate] = useState<string>('');
  const [requestType, setRequestType] = useState<'ALL' | 'RIDE' | 'PACKAGE'>('ALL');
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [cargoWeightKg, setCargoWeightKg] = useState<number>(5);

  // Gợi ý địa điểm Autocomplete
  const [originSuggestions, setOriginSuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [destSuggestions, setDestSuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);

  const originDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const destDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Xử lý gõ và gợi ý điểm xuất phát
  const handleOriginChange = (val: string) => {
    setOriginName(val);
    setOriginLat(null);
    setOriginLng(null);
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
        console.warn('Lỗi tìm kiếm gợi ý điểm xuất phát:', err);
      } finally {
        setSearchingOrigin(false);
      }
    }, 350);
  };

  // Xử lý gõ và gợi ý điểm đến
  const handleDestChange = (val: string) => {
    setDestName(val);
    setDestLat(null);
    setDestLng(null);
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
        console.warn('Lỗi tìm kiếm gợi ý điểm đến:', err);
      } finally {
        setSearchingDest(false);
      }
    }, 350);
  };

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (originName.trim()) params.origin_name = originName.trim();
      if (destName.trim()) params.dest_name = destName.trim();
      if (originLat !== null && originLng !== null) {
        params.pickup_lat = originLat;
        params.pickup_lng = originLng;
      }
      if (destLat !== null && destLng !== null) {
        params.dropoff_lat = destLat;
        params.dropoff_lng = destLng;
      }
      if (departureDate) params.departure_date = departureDate;
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

  const handleAiSearch = async (promptOverride?: string) => {
    const textToSearch = promptOverride || aiPrompt;
    if (!textToSearch.trim()) return;

    try {
      setAiLoading(true);
      setError(null);
      const res = await tripService.searchTripsWithAi(textToSearch.trim());
      setTrips(res.trips);
      setAiResultMeta({
        explanation: res.explanation,
        is_fallback: res.is_fallback,
        criteria: res.extracted_criteria,
      });
      if (promptOverride) {
        setAiPrompt(promptOverride);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Không thể tìm kiếm bằng AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleResetAiSearch = () => {
    setAiPrompt('');
    setAiResultMeta(null);
    fetchTrips();
  };

  const aiPromptChips = [
    'Tìm xe từ Đà Nẵng đi Hội An chiều mai 2 người',
    'Cần gửi kiện hàng từ Hà Nội về Thái Bình thứ 7 này',
    'Tìm xe từ Quận 1 đi Vũng Tàu sáng Chủ Nhật',
    'Xe từ Bến xe Mỹ Đình về Hải Phòng hôm nay',
  ];

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
        {/* Chuyển đổi chế độ: Tìm theo Bộ lọc vs Tìm bằng Gemini AI */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setSearchMode('FILTER');
                setAiResultMeta(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                searchMode === 'FILTER'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Bộ lọc truyền thống</span>
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('AI')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                searchMode === 'AI'
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 text-white shadow-md'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Tìm kiếm Gemini AI (US-02)</span>
            </button>
          </div>

          <span className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-3 py-1 rounded-full border border-purple-100 flex items-center">
            <Zap className="w-3 h-3 mr-1 text-purple-600" />
            Hỗ trợ tự nhiên: Ngữ cảnh ngày giờ & Bán kính ≤ 15 km
          </span>
        </div>

        {/* CHẾ ĐỘ 1: TÌM BẰNG GEMINI AI */}
        {searchMode === 'AI' && (
          <div className="space-y-4">
            <div className="relative">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Bot className="w-5 h-5 text-purple-600 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAiSearch();
                      }
                    }}
                    placeholder="Nhập yêu cầu: 'Tìm xe từ Đà Nẵng đi Hội An chiều mai 2 người' hoặc 'Gửi đồ từ Hà Nội về Thái Bình'..."
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/20 text-slate-800 placeholder-slate-400"
                  />
                </div>
                <button
                  type="button"
                  disabled={aiLoading || !aiPrompt.trim()}
                  onClick={() => handleAiSearch()}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {aiLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>AI đang bóc tách...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Tìm kiếm bằng AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Gợi ý mẫu câu lệnh */}
            <div className="flex items-center flex-wrap gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500 flex items-center">
                <Sparkles className="w-3 h-3 mr-1 text-purple-500" />
                Gợi ý mẫu:
              </span>
              {aiPromptChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAiSearch(chip)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200/80 hover:bg-purple-100 hover:border-purple-300 transition-colors text-left"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Khung kết quả phân tích của AI */}
            {aiResultMeta && (
              <div className={`p-4 rounded-2xl border ${
                aiResultMeta.is_fallback
                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                  : 'bg-gradient-to-r from-purple-50 via-indigo-50 to-teal-50 border-purple-200 text-purple-950'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <Bot className={`w-4 h-4 ${aiResultMeta.is_fallback ? 'text-amber-600' : 'text-purple-600'}`} />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {aiResultMeta.is_fallback ? 'Bộ phân tích dự phòng thông minh (CS-05)' : 'Gemini AI đã thấu hiểu yêu cầu'}
                      </span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed">
                      {aiResultMeta.explanation}
                    </p>
                    {aiResultMeta.criteria && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        {aiResultMeta.criteria.origin_name && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-white/80 border border-slate-200 font-bold text-slate-800">
                            📍 Đi: {aiResultMeta.criteria.origin_name}
                          </span>
                        )}
                        {aiResultMeta.criteria.dest_name && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-white/80 border border-slate-200 font-bold text-slate-800">
                            🏁 Đến: {aiResultMeta.criteria.dest_name}
                          </span>
                        )}
                        {aiResultMeta.criteria.departure_date && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-white/80 border border-slate-200 font-bold text-slate-800">
                            📅 Ngày: {aiResultMeta.criteria.departure_date}
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-lg bg-white/80 border border-slate-200 font-bold text-slate-800">
                          {aiResultMeta.criteria.type === 'PACKAGE' ? '📦 Gửi kiện hàng' : `👥 Đi nhờ (${aiResultMeta.criteria.passenger_count || 1} người)`}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleResetAiSearch}
                    className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 transition-colors flex items-center text-xs font-bold space-x-1"
                    title="Xóa tìm kiếm AI"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Làm mới</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHẾ ĐỘ 2: BỘ LỌC TRUYỀN THỐNG */}
        {searchMode === 'FILTER' && (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Điểm xuất phát:
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                <input
                  type="text"
                  value={originName}
                  onChange={(e) => handleOriginChange(e.target.value)}
                  placeholder="Gõ tên đường, quận, trường học, bến xe..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {searchingOrigin && (
                  <span className="absolute right-3 top-2.5 text-[10px] text-emerald-600 font-semibold animate-pulse">
                    Đang tìm...
                  </span>
                )}
              </div>

              {originSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                  {originSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setOriginName(item.name);
                        setOriginLat(item.lat);
                        setOriginLng(item.lng);
                        setOriginSuggestions([]);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 border-b border-slate-100 last:border-b-0 flex items-start space-x-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2 text-slate-700">{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Điểm đến:
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={destName}
                  onChange={(e) => handleDestChange(e.target.value)}
                  placeholder="Gõ địa chỉ, quận, địa danh đến..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {searchingDest && (
                  <span className="absolute right-3 top-2.5 text-[10px] text-emerald-600 font-semibold animate-pulse">
                    Đang tìm...
                  </span>
                )}
              </div>

              {destSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                  {destSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setDestName(item.name);
                        setDestLat(item.lat);
                        setDestLng(item.lng);
                        setDestSuggestions([]);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-rose-50 border-b border-slate-100 last:border-b-0 flex items-start space-x-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5 text-rose-500 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2 text-slate-700">{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ngày đi (tùy chọn):
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
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

            {requestType === 'ALL' && (
              <div className="hidden lg:block">
                {/* Spacer giữ cân bằng lưới 5 cột */}
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
        )}
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
                  <div className="space-y-2 mb-3">
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

                  {/* Khoảng cách giữa điểm xuất phát/kết thúc của xe và điểm đón/giao của bạn */}
                  {(trip.pickup_distance_km !== undefined || trip.dropoff_distance_km !== undefined) && (
                    <div className="mb-3.5 p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5 text-[11px]">
                      {trip.pickup_distance_km !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 flex items-center">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 flex-shrink-0" />
                            Xuất phát cách nơi bạn đi:
                          </span>
                          <strong className="text-emerald-900 font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-xs">
                            {trip.pickup_distance_km} km
                          </strong>
                        </div>
                      )}
                      {trip.dropoff_distance_km !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 flex items-center">
                            <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5 flex-shrink-0" />
                            Đến nơi cách điểm bạn đến:
                          </span>
                          <strong className="text-rose-900 font-bold bg-white px-2 py-0.5 rounded-md border border-rose-200 shadow-xs">
                            {trip.dropoff_distance_km} km
                          </strong>
                        </div>
                      )}
                    </div>
                  )}

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

                  {/* Thông tin Phương tiện & Mức hỗ trợ nhiên liệu */}
                  {trip.vehicle && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span className="flex items-center text-slate-700 font-semibold truncate max-w-[60%]">
                        <Car className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{trip.vehicle.brand_model}</span>
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          trip.vehicle.fuel_type === 'ELECTRIC'
                            ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {trip.vehicle.fuel_type === 'ELECTRIC' ? (
                          <>
                            <Zap className="w-3 h-3 mr-1 text-cyan-600" />
                            Xe điện
                          </>
                        ) : (
                          <>
                            <Fuel className="w-3 h-3 mr-1 text-amber-600" />
                            {trip.vehicle.fuel_type === 'DIESEL' ? 'Dầu' : 'Xăng'}
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Chi phí nhiên liệu cho chuyến xe */}
                  {trip.estimated_fuel_cost && trip.estimated_fuel_cost > 0 && (
                    <div className="mt-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs flex items-center justify-between">
                      <span className="text-[11px] text-emerald-800 font-medium">
                        Chi phí {trip.vehicle?.fuel_type === 'ELECTRIC' ? 'sạc điện' : 'nhiên liệu'} cho chuyến xe:
                      </span>
                      <strong className="text-emerald-900 font-extrabold text-xs">
                        {trip.estimated_fuel_cost.toLocaleString('vi-VN')} đ
                      </strong>
                    </div>
                  )}

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
