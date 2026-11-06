import axios from 'axios';
import { config } from '../../config/index.js';
import { AppError } from '../../middlewares/errorHandler.js';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distance_km: number;
  duration_min: number;
  // Danh sách tọa độ [latitude, longitude] để phù hợp với Leaflet & Turf.js
  coordinates: Array<[number, number]>;
  route_polyline: string; // JSON string chứa danh sách [lat, lng]
}

/**
 * Tính khoảng cách đường chim bay giữa 2 tọa độ WGS84 (Haversine formula)
 */
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Giả lập lộ trình mượt mà khi chưa có khóa ORS_API_KEY
 */
function generateMockRoute(origin: RoutePoint, dest: RoutePoint): RouteResult {
  const directDistance = calculateHaversineDistance(origin.lat, origin.lng, dest.lat, dest.lng);
  // Nhân hệ số 1.3 để bù trừ độ quanh co của mạng lưới giao thông đường bộ
  const distance_km = Math.round(Math.max(1, directDistance * 1.3) * 10) / 10;
  // Ước tính vận tốc trung bình 50 km/h (thêm 10 phút đệm xuất phát)
  const duration_min = Math.max(15, Math.round((distance_km / 50) * 60) + 10);

  // Tạo các điểm nội suy để vẽ polyline mượt mà trên Leaflet
  const steps = 10;
  const coordinates: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    // Thêm một chút dao động nhẹ tạo đường cong tự nhiên
    const jitter = i > 0 && i < steps ? (Math.sin(fraction * Math.PI) * 0.005) : 0;
    const lat = origin.lat + (dest.lat - origin.lat) * fraction + jitter;
    const lng = origin.lng + (dest.lng - origin.lng) * fraction + jitter;
    coordinates.push([Math.round(lat * 100000) / 100000, Math.round(lng * 100000) / 100000]);
  }

  return {
    distance_km,
    duration_min,
    coordinates,
    route_polyline: JSON.stringify(coordinates),
  };
}

export const mapAdapter = {
  /**
   * Tính toán lộ trình đường bộ, khoảng cách km, thời gian ETA và polyline
   */
  async getRoute(origin: RoutePoint, dest: RoutePoint): Promise<RouteResult> {
    // 1. Nếu chưa có ORS_API_KEY, tự động dùng Mock Router giả lập để phát triển và kiểm thử
    if (!config.ORS_API_KEY || config.ORS_API_KEY.trim() === '') {
      return generateMockRoute(origin, dest);
    }

    // 2. Khi đã có ORS_API_KEY, gọi API OpenRouteService Directions chuẩn
    try {
      const response = await axios.post(
        'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
        {
          // ORS nhận GeoJSON chuẩn: [longitude, latitude]
          coordinates: [
            [origin.lng, origin.lat],
            [dest.lng, dest.lat],
          ],
        },
        {
          headers: {
            Authorization: config.ORS_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // Timeout 10 giây
        }
      );

      const feature = response.data?.features?.[0];
      if (!feature) {
        throw new Error('ORS không trả về dữ liệu tuyến đường phù hợp');
      }

      const summary = feature.properties?.summary;
      const rawCoords: Array<[number, number]> = feature.geometry?.coordinates || [];

      const distance_km = Math.round(((summary?.distance || 0) / 1000) * 10) / 10;
      const duration_min = Math.round((summary?.duration || 0) / 60);

      // Chuyển đổi từ GeoJSON [lng, lat] sang định dạng Leaflet [lat, lng]
      const coordinates: Array<[number, number]> = rawCoords.map(([lng, lat]) => [lat, lng]);

      return {
        distance_km,
        duration_min,
        coordinates,
        route_polyline: JSON.stringify(coordinates),
      };
    } catch (error: any) {
      console.error('❌ Lỗi OpenRouteService:', error.response?.data || error.message);
      // Quy tắc CS-05: Khi dịch vụ bản đồ lỗi -> Chặn tạo chuyến và thông báo rõ ràng
      throw new AppError(
        503,
        'MAP_SERVICE_UNAVAILABLE',
        'Dịch vụ bản đồ tạm thời gián đoạn hoặc không tìm thấy tuyến đường. Vui lòng thử lại sau.'
      );
    }
  },
};
