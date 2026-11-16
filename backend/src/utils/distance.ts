import { point, lineString } from '@turf/helpers';
import pointToLineDistance from '@turf/point-to-line-distance';

/**
 * Kiểm tra xem một tọa độ điểm (lat, lng) có nằm trong bán kính tối đa (mặc định 2km)
 * so với đường lộ trình (danh sách các điểm [lat, lng] hoặc [lng, lat]) hay không.
 */
export function isWithinRouteDistance(
  targetLat: number,
  targetLng: number,
  routeCoords: Array<[number, number]>, // định dạng [latitude, longitude]
  maxDistanceKm: number = 2.0
): { isWithin: boolean; distanceKm: number } {
  if (!routeCoords || routeCoords.length < 2) {
    throw new Error('Lộ trình phải có ít nhất 2 điểm tọa độ');
  }

  // Turf.js sử dụng định dạng GeoJSON chuẩn: [longitude, latitude]
  const turfPoint = point([targetLng, targetLat]);
  const turfLine = lineString(routeCoords.map(([lat, lng]) => [lng, lat]));

  const distanceKm = pointToLineDistance(turfPoint, turfLine, { units: 'kilometers' });

  return {
    isWithin: distanceKm <= maxDistanceKm,
    distanceKm: Math.round(distanceKm * 1000) / 1000,
  };
}

/**
 * Tính khoảng cách trắc địa (Haversine) giữa 2 tọa độ (lat1, lng1) và (lat2, lng2) tính theo km
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
