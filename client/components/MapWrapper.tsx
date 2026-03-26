"use client";

import dynamic from 'next/dynamic';
import { Shield } from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] rounded-2xl bg-gray-900/50 backdrop-blur-sm animate-pulse flex flex-col items-center justify-center text-emerald-500/50 border border-white/5 shadow-2xl">
      <Shield className="w-12 h-12 mb-4 animate-bounce" />
      <span className="font-mono text-sm tracking-widest uppercase">Initializing Satellite Uplink...</span>
    </div>
  )
});

export default function MapWrapper() {
  return <Map />;
}
