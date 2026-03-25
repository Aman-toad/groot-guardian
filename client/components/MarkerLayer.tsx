import { DeforestationData } from '@/lib/loadData';
import { CircleMarker, useMap } from 'react-leaflet';
import React, { useMemo } from 'react';

interface MarkerLayerProps {
  data: DeforestationData[];
  onSelect: (point: DeforestationData) => void;
}

const MarkerLayer = React.memo(({ data, onSelect }: MarkerLayerProps) => {
  const map = useMap();

  return (
    <>
      {data
        .filter(point => point.deforestation === 1)
        .map((point, index) => {
        let color = '#ef4444'; // Only showing Deforestation (red)

        // clamp(delta_mag * 5, 5, 25)
        const radius = Math.max(5, Math.min(25, point.delta_mag * 5));

        // Let's use confidence directly as opacity, with a minimum step
        const opacity = Math.max(0.4, point.confidence);

        return (
          <CircleMarker
            key={index}
            center={[point.lat, point.lng]}
            radius={radius}
            pathOptions={{
              color: '#000000', // Black border so we can see the polygon/marker clearly against the creamy map
              fillColor: color,
              fillOpacity: opacity,
              weight: 1.5, // Thicker border
              opacity: 1
            }}
            eventHandlers={{
              click: () => {
                onSelect(point);
                map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 12));
              }
            }}
          />
        );
      })}
    </>
  );
});

MarkerLayer.displayName = 'MarkerLayer';

export default MarkerLayer;
