"use client";

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const aoiCoordinates: [number, number][] = [
    [-11.47592, 27.72151],
    [-11.53689, 27.73018],
    [-11.50899, 27.81996],
    [-11.45377, 27.80758],
  [-11.47592, 27.72151]// close the ring
];

export default function Map({ onPointSelect }: { onPointSelect?: (p: any) => void }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
    });

    fetch('/api/deforestation')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setData(data);
      })
      .catch(console.error);
  }, []);

  const gridLines = useMemo(() => {
    const lines = [];
    const minLat = -11.54;
    const maxLat = -11.45;
    const minLng = 27.72;
    const maxLng = 27.82;
    const step = 0.0009; // ~100m in degrees
    
    // Horizontal lines
    for (let lat = minLat; lat <= maxLat; lat += step) {
      lines.push(<Polyline key={`lat-${lat}`} positions={[[lat, minLng], [lat, maxLng]]} pathOptions={{ color: 'rgba(255,255,255,0.3)', weight: 1, dashArray: '4' }} interactive={false} />);
    }
    // Vertical lines
    for (let lng = minLng; lng <= maxLng; lng += step) {
      lines.push(<Polyline key={`lng-${lng}`} positions={[[minLat, lng], [maxLat, lng]]} pathOptions={{ color: 'rgba(255,255,255,0.3)', weight: 1, dashArray: '4' }} interactive={false} />);
    }
    return lines;
  }, []);

  return (
    <>
      <div className="absolute inset-0 pointer-events-none z-[400] bg-gradient-to-t from-gray-950/80 via-transparent to-transparent opacity-100 transition-opacity duration-700 hover:opacity-0" />
      
      <MapContainer 
        center={[-11.49, 27.77]} 
        zoom={13} 
        style={{ height: '100%', width: '100%', minHeight: '600px' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />

        <Polygon 
          positions={aoiCoordinates} 
          pathOptions={{ 
            color: '#10b981', 
            fillColor: 'transparent',
            weight: 3,
            dashArray: '5, 10'
          }}
        />

        {/* 100m Gridlines */}
        {gridLines}

        {/* Deforested Points */}
        {data.map((pt, i) => (
          <CircleMarker
            key={i}
            center={[pt.lat, pt.lng]}
            radius={6}
            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }}
            eventHandlers={{
              click: () => onPointSelect && onPointSelect(pt)
            }}
          >
            <Popup>
              Confidence: {(pt.confidence * 100).toFixed(1)}%<br/>
              Click to view details in sidebar.
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </>
  );
}
