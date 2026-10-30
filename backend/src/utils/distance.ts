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
