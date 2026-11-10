/**
 * Tính khoảng cách đường cong mặt cầu (Haversine formula) giữa 2 tọa độ GPS (km)
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
 * Tính khoảng cách ngắn nhất từ một điểm (lat, lng) đến đường lộ trình polyline (km)
 */
export function checkDistanceToPolyline(
  lat: number,
  lng: number,
  polyline: Array<[number, number]>
): number {
  if (!polyline || polyline.length === 0) return 999;

  let minDistance = Infinity;
  // Duyệt qua các điểm của polyline để tìm điểm gần nhất
  for (let i = 0; i < polyline.length; i++) {
    const d = getDistanceKm(lat, lng, polyline[i][0], polyline[i][1]);
    if (d < minDistance) {
      minDistance = d;
    }
  }

  return Math.round(minDistance * 100) / 100;
}
