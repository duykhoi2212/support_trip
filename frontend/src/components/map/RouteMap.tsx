import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface RoutePoint {
  lat: number;
  lng: number;
  label?: string;
}

interface RouteMapProps {
  origin?: RoutePoint | null;
  destination?: RoutePoint | null;
  polylineCoordinates?: Array<[number, number]> | null;
  onSelectPoint?: (point: { lat: number; lng: number }) => void;
  height?: string;
  className?: string;
}

// Marker biểu tượng Điểm xuất phát (Màu xanh lá Emerald)
const createOriginIcon = () =>
  L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="background-color: #059669; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); border: 2px solid white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m17 7-5-5-5 5"/></svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

// Marker biểu tượng Điểm đến (Màu đỏ Rose)
const createDestIcon = () =>
  L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="background-color: #e11d48; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); border: 2px solid white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

export const RouteMap: React.FC<RouteMapProps> = ({
  origin,
  destination,
  polylineCoordinates,
  onSelectPoint,
  height = '420px',
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Mặc định trung tâm bản đồ tại Việt Nam (Hà Nội: 21.0285, 105.8542)
      const map = L.map(mapContainerRef.current, {
        center: [21.0285, 105.8542],
        zoom: 7,
      });

      // Lớp bản đồ OpenStreetMap chuẩn
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;

      // Xử lý sự kiện click trên bản đồ
      if (onSelectPoint) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          onSelectPoint({
            lat: Math.round(e.latlng.lat * 10000) / 10000,
            lng: Math.round(e.latlng.lng * 10000) / 10000,
          });
        });
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Cập nhật các Marker và Tuyến Polyline khi props thay đổi
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Vẽ Marker Điểm xuất phát
    if (origin && typeof origin.lat === 'number' && typeof origin.lng === 'number') {
      const originMarker = L.marker([origin.lat, origin.lng], {
        icon: createOriginIcon(),
      }).bindPopup(`<b>Điểm xuất phát:</b><br/>${origin.label || 'Tọa độ: ' + origin.lat + ', ' + origin.lng}`);
      layerGroup.addLayer(originMarker);
      bounds.extend([origin.lat, origin.lng]);
    }

    // 2. Vẽ Marker Điểm đến
    if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number') {
      const destMarker = L.marker([destination.lat, destination.lng], {
        icon: createDestIcon(),
      }).bindPopup(`<b>Điểm đến:</b><br/>${destination.label || 'Tọa độ: ' + destination.lat + ', ' + destination.lng}`);
      layerGroup.addLayer(destMarker);
      bounds.extend([destination.lat, destination.lng]);
    }

    // 3. Vẽ Tuyến đường Polyline (Màu Emerald-600 nét 5px theo RULES.md)
    if (polylineCoordinates && polylineCoordinates.length > 1) {
      const polyline = L.polyline(polylineCoordinates, {
        color: '#059669',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      });
      layerGroup.addLayer(polyline);

      // Mở rộng khung nhìn bao trọn tuyến đường
      polylineCoordinates.forEach(([lat, lng]) => bounds.extend([lat, lng]));
    }

    // Tự động căn chỉnh khung hình vừa khít các điểm
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [origin, destination, polylineCoordinates]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm ${className}`}>
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-0" />
      {onSelectPoint && (
        <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Click bản đồ để chọn tọa độ</span>
        </div>
      )}
    </div>
  );
};
