'use client';

import dynamic from 'next/dynamic';
import { DeforestationData } from '@/lib/loadData';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-slate-950 text-slate-400">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="font-medium animate-pulse">Initializing Map Environment...</p>
      </div>
    </div>
  ),
});

interface MapWrapperProps {
  data: DeforestationData[];
}

export default function MapWrapper({ data }: MapWrapperProps) {
  return <MapView data={data} />;
}
