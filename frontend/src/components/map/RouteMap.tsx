import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, Layers } from 'lucide-react';

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
  distanceKm?: number | null;
  durationMin?: number | null;
  majorRoads?: string[];
}

// Marker biểu tượng Điểm xuất phát (Màu xanh Emerald nổi bật kèm hiệu ứng tỏa sáng)
const createOriginIcon = () =>
  L.divIcon({
    className: 'custom-map-origin-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <div style="position: absolute; width: 36px; height: 36px; background-color: rgba(5, 150, 105, 0.35); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m17 7-5-5-5 5"/></svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });

// Marker biểu tượng Điểm đến (Màu đỏ Rose sang trọng)
const createDestIcon = () =>
  L.divIcon({
    className: 'custom-map-dest-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <div style="position: relative; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });

export const RouteMap: React.FC<RouteMapProps> = ({
  origin,
  destination,
  polylineCoordinates,
  onSelectPoint,
  height = '480px',
  className = '',
  distanceKm,
  durationMin,
  majorRoads = [],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Chế độ bản đồ: 'esri' (Mặc định - chi tiết như Google Maps) hoặc 'osm' (OpenStreetMap)
  const [mapType, setMapType] = useState<'esri' | 'osm'>('esri');

  // Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Trung tâm ban đầu tại Việt Nam (Khu vực đồng bằng Bắc Bộ / Miền Trung: 20.5, 106.0)
      const map = L.map(mapContainerRef.current, {
        center: [20.8, 106.0],
        zoom: 8,
        zoomControl: true,
      });

      // Lớp Esri World Street Map: 100% Miễn phí, không API key, không watermark, chi tiết đường sá Việt Nam
      const esriTile = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, TomTom',
          maxZoom: 19,
        }
      );

      esriTile.addTo(map);
      tileLayerRef.current = esriTile;

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

      // Xử lý chống vỡ ảnh / gray tile: invalidateSize sau khi DOM layout hoàn tất
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 250);

      // Tự động điều chỉnh kích thước nếu container thay đổi size
      const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);

      return () => {
        clearTimeout(timer);
        resizeObserver.disconnect();
        map.remove();
        mapInstanceRef.current = null;
      };
    }
  }, []);

  // Thay đổi Tile Layer khi người dùng bấm nút đổi loại bản đồ
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let newTile: L.TileLayer;
    if (mapType === 'esri') {
      newTile = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, TomTom',
          maxZoom: 19,
        }
      );
    } else {
      newTile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      });
    }

    newTile.addTo(map);
    tileLayerRef.current = newTile;
  }, [mapType]);

  // Cập nhật các Marker và Tuyến Polyline khi dữ liệu thay đổi
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Điểm xuất phát
    if (origin && typeof origin.lat === 'number' && typeof origin.lng === 'number') {
      const originMarker = L.marker([origin.lat, origin.lng], {
        icon: createOriginIcon(),
        title: 'Điểm xuất phát',
      }).bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.5; min-width: 180px;">
          <strong style="color: #059669; display: flex; align-items: center; margin-bottom: 4px;">
            <span style="display: inline-block; width: 8px; height: 8px; background: #059669; border-radius: 50%; margin-right: 6px;"></span>
            Điểm xuất phát
          </strong>
          <div style="color: #1e293b; font-weight: 600;">${origin.label || `Tọa độ: ${origin.lat}, ${origin.lng}`}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Tọa độ: ${origin.lat}, ${origin.lng}</div>
        </div>
      `);
      layerGroup.addLayer(originMarker);
      bounds.extend([origin.lat, origin.lng]);
    }

    // 2. Điểm đến
    if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number') {
      const destMarker = L.marker([destination.lat, destination.lng], {
        icon: createDestIcon(),
        title: 'Điểm đến',
      }).bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.5; min-width: 180px;">
          <strong style="color: #e11d48; display: flex; align-items: center; margin-bottom: 4px;">
            <span style="display: inline-block; width: 8px; height: 8px; background: #e11d48; border-radius: 50%; margin-right: 6px;"></span>
            Điểm đến
          </strong>
          <div style="color: #1e293b; font-weight: 600;">${destination.label || `Tọa độ: ${destination.lat}, ${destination.lng}`}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Tọa độ: ${destination.lat}, ${destination.lng}</div>
        </div>
      `);
      layerGroup.addLayer(destMarker);
      bounds.extend([destination.lat, destination.lng]);
    }

    // 3. Tuyến đường thực tế bám mạng lưới đường bộ (OSRM Polyline)
    if (polylineCoordinates && polylineCoordinates.length > 1) {
      // Viền bóng dưới tạo chiều sâu và độ tương phản cao với nền đường phố
      const polylineShadow = L.polyline(polylineCoordinates, {
        color: '#064e3b',
        weight: 8,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round',
      });
      layerGroup.addLayer(polylineShadow);

      // Tuyến chính màu xanh ngọc GoX Emerald-600
      const polylineMain = L.polyline(polylineCoordinates, {
        color: '#059669',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.5; min-width: 200px;">
          <strong style="color: #059669; font-size: 14px;">Lộ trình di chuyển GoX</strong>
          ${distanceKm ? `<div style="margin-top: 4px;">Quãng đường: <b style="color: #0f172a;">${distanceKm} km</b></div>` : ''}
          ${durationMin ? `<div>Thời gian dự kiến: <b style="color: #0f172a;">${Math.floor(durationMin / 60)}h ${Math.round(durationMin % 60)}m</b></div>` : ''}
          ${majorRoads.length > 0 ? `<div style="font-size: 11px; color: #475569; margin-top: 4px; border-top: 1px solid #e2e8f0; pt: 4px;">Trục đường: ${majorRoads.slice(0, 3).join(' → ')}...</div>` : ''}
        </div>
      `);
      layerGroup.addLayer(polylineMain);

      polylineCoordinates.forEach(([lat, lng]) => bounds.extend([lat, lng]));
    }

    // Tự động căn chỉnh bao trọn toàn bộ lộ trình
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [origin, destination, polylineCoordinates, distanceKm, durationMin, majorRoads]);

  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = L.latLngBounds([]);
    if (origin) bounds.extend([origin.lat, origin.lng]);
    if (destination) bounds.extend([destination.lat, destination.lng]);
    if (polylineCoordinates && polylineCoordinates.length > 0) {
      polylineCoordinates.forEach(([lat, lng]) => bounds.extend([lat, lng]));
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-md ${className}`}>
      {/* Container Leaflet */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-0 bg-slate-100" />

      {/* Thanh điều khiển góc trên bên phải */}
      <div className="absolute top-3 right-3 z-[400] flex items-center space-x-2">
        {/* Nút chuyển đổi loại bản đồ */}
        <button
          type="button"
          onClick={() => setMapType(mapType === 'esri' ? 'osm' : 'esri')}
          title="Chuyển chế độ hiển thị bản đồ"
          className="bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-700 px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-all backdrop-blur-sm"
        >
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <span>{mapType === 'esri' ? 'Bản đồ Esri Chi tiết' : 'Bản đồ OpenStreetMap'}</span>
        </button>

        {/* Nút xem toàn cảnh */}
        <button
          type="button"
          onClick={handleFitBounds}
          title="Căn chỉnh toàn cảnh lộ trình"
          className="bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-700 px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-all backdrop-blur-sm"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Toàn cảnh</span>
        </button>

        {onSelectPoint && (
          <div className="bg-emerald-600/90 text-white px-3 py-1.5 rounded-xl shadow-md text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            <span>Click chọn tọa độ</span>
          </div>
        )}
      </div>

      {/* Thông tin nguồn bản đồ góc dưới */}
      <div className="absolute bottom-1 left-2 z-[400] bg-white/85 backdrop-blur-sm px-2.5 py-0.5 rounded text-[10px] text-slate-600 font-medium border border-slate-200 shadow-sm">
        {mapType === 'esri' ? 'Bản đồ đường sá Esri World Street Map' : 'Bản đồ OpenStreetMap'} • Định tuyến OSRM
      </div>
    </div>
  );
};
