'use client';

import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { DeforestationData } from '@/lib/loadData';
import InfoPanel from './InfoPanel';
import MarkerLayer from './MarkerLayer';

// Fix Leaflet setup issues with marker icons
import L from 'leaflet';
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  data: DeforestationData[];
}

export default function MapView({ data }: MapViewProps) {
  const [selectedPoint, setSelectedPoint] = useState<DeforestationData | null>(null);

  const center = useMemo<[number, number]>(() => {
    if (!data || data.length === 0) return [0, 0];
    const sumLat = data.reduce((sum, p) => sum + p.lat, 0);
    const sumLng = data.reduce((sum, p) => sum + p.lng, 0);
    return [sumLat / data.length, sumLng / data.length];
  }, [data]);

  // Bounding coords for the polygon
  const polyCoords: [number, number][] = [
    [0.89335, -72.53888],
    [0.83792, -72.53822],
    [0.83642, -72.59882],
    [0.88769, -72.60081],
    [0.89335, -72.53888]
  ];

  // Compute 1km Grid Lines over bounding box
  const minLat = Math.min(...polyCoords.map(c => c[0]));
  const maxLat = Math.max(...polyCoords.map(c => c[0]));
  const minLng = Math.min(...polyCoords.map(c => c[1]));
  const maxLng = Math.max(...polyCoords.map(c => c[1]));

  // ~1 km in degrees
  const stepLat = 1 / 111.32; 
  const stepLng = 1 / (111.32 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));

  const gridLines: [number, number][][] = [];
  for (let lng = minLng; lng <= maxLng; lng += stepLng) {
    gridLines.push([[minLat, lng], [maxLat, lng]]);
  }
  for (let lat = minLat; lat <= maxLat; lat += stepLat) {
    gridLines.push([[lat, minLng], [lat, maxLng]]);
  }

  return (
    <div className="flex w-full h-screen overflow-hidden relative bg-white">
      <div className="w-[70%] h-full relative">
        <MapContainer
          center={center}
          zoom={12}
          style={{ width: '100%', height: '100%', background: '#f8f9fa' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <Polygon 
            positions={polyCoords}
            pathOptions={{ color: 'white', weight: 2, fillOpacity: 0 }}
          />
          {gridLines.map((line, i) => (
            <Polyline 
              key={`grid-${i}`} 
              positions={line as any} 
              pathOptions={{ 
                color: 'white', 
                weight: 1, 
                opacity: 0.3,
                dashArray: '4 4' // Dashed for nicer grid look
              }} 
            />
          ))}
          <MarkerLayer data={data} onSelect={setSelectedPoint} />
        </MapContainer>

        {/* Updated Loading overlay for light theme */}
        {data.length === 0 && (
          <div className="absolute inset-0 z-1000 flex items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-none">
            <div className="text-slate-900 text-xl font-medium animate-pulse">Loading SAR predictions...</div>
          </div>
        )}

        {/* Updated Total Points overlay for light theme */}
        <div className="absolute top-4 left-14 z-1000 bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-lg text-slate-600 text-sm font-medium shadow-md pointer-events-none">
          Total Predictions: <span className="text-blue-600">{data.length}</span>
        </div>
      </div>

      <div className="w-[30%] h-full relative z-1000 shadow-2xl border-l border-slate-200">
        <InfoPanel selectedPoint={selectedPoint} />
      </div>
    </div>
  );
}