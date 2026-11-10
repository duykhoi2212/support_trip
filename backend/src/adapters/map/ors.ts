import axios from 'axios';
import { config } from '../../config/index.js';
import { AppError } from '../../middlewares/errorHandler.js';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteStep {
  name: string;
  distance_km: number;
  duration_min: number;
}

export interface RouteResult {
  distance_km: number;
  duration_min: number;
  // Danh sách tọa độ [latitude, longitude] để phù hợp với Leaflet & Turf.js
  coordinates: Array<[number, number]>;
  route_polyline: string; // JSON string chứa danh sách [lat, lng]
  major_roads?: string[]; // Danh sách các trục đường cao tốc / quốc lộ chính đi qua
  steps?: RouteStep[]; // Danh sách các chặng đường chi tiết
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
    major_roads: ['Đường bộ liên tỉnh'],
    steps: [],
  };
}

/**
 * Gọi dịch vụ OSRM (Open Source Routing Machine) miễn phí không cần API Key
 * Trả về lộ trình bám 100% theo mạng lưới cao tốc, quốc lộ và đường giao thông thực tế tại Việt Nam
 */
async function getOSRMRoute(origin: RoutePoint, dest: RoutePoint): Promise<RouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&steps=true`;
  const response = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'GoX-App/1.0',
    },
  });

  const route = response.data?.routes?.[0];
  if (!route) {
    throw new Error('OSRM không tìm thấy tuyến đường phù hợp');
  }

  const distance_km = Math.round(((route.distance || 0) / 1000) * 10) / 10;
  const duration_min = Math.max(10, Math.round((route.duration || 0) / 60));
  const rawCoords: Array<[number, number]> = route.geometry?.coordinates || [];

  // GeoJSON trả về [lng, lat], chuyển sang [lat, lng] cho Leaflet và Turf.js
  const coordinates: Array<[number, number]> = rawCoords.map(([lng, lat]) => [lat, lng]);

  // Trích xuất các trục đường cao tốc / quốc lộ chính từ steps
  const rawSteps = route.legs?.[0]?.steps || [];
  const major_roads: string[] = [];
  const seenRoads = new Set<string>();

  for (const s of rawSteps) {
    const roadName = s.name?.trim();
    if (roadName && !seenRoads.has(roadName)) {
      seenRoads.add(roadName);
      major_roads.push(roadName);
    }
  }

  const steps: RouteStep[] = rawSteps
    .filter((s: any) => s.name && s.distance > 200)
    .map((s: any) => ({
      name: s.name,
      distance_km: Math.round((s.distance / 1000) * 10) / 10,
      duration_min: Math.round((s.duration / 60) * 10) / 10,
    }));

  return {
    distance_km,
    duration_min,
    coordinates,
    route_polyline: JSON.stringify(coordinates),
    major_roads,
    steps,
  };
}

export const mapAdapter = {
  /**
   * Tính toán lộ trình đường bộ, khoảng cách km, thời gian ETA và polyline
   */
  async getRoute(origin: RoutePoint, dest: RoutePoint): Promise<RouteResult> {
    // 1. Khi đã có ORS_API_KEY, gọi API OpenRouteService Directions chuẩn
    if (config.ORS_API_KEY && config.ORS_API_KEY.trim() !== '') {
      try {
        const response = await axios.post(
          'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
          {
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
            timeout: 10000,
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
        const coordinates: Array<[number, number]> = rawCoords.map(([lng, lat]) => [lat, lng]);

        return {
          distance_km,
          duration_min,
          coordinates,
          route_polyline: JSON.stringify(coordinates),
        };
      } catch (error: any) {
        console.warn('⚠️ ORS gặp sự cố, tự động chuyển hướng sang OSRM:', error.message);
      }
    }

    // 2. Định tuyến thực tế qua OSRM (Hoàn toàn miễn phí, bám sát đường sá Việt Nam)
    try {
      return await getOSRMRoute(origin, dest);
    } catch (osrmError: any) {
      console.warn('⚠️ OSRM không phản hồi (offline/timeout), sử dụng Mock Router:', osrmError.message);
      // 3. Fallback dự phòng Mock Router khi mất kết nối mạng để không làm sập luồng
      return generateMockRoute(origin, dest);
    }
  },
};

