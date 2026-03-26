"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Shield, AlertTriangle, Send, X } from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] rounded-2xl bg-gray-900/50 backdrop-blur-sm shadow-2xl animate-pulse flex flex-col items-center justify-center text-emerald-500/50 border border-white/5">
      <Shield className="w-12 h-12 mb-4 animate-bounce" />
      <span className="font-mono text-sm tracking-widest uppercase">Initializing Satellite Uplink...</span>
    </div>
  )
});

export default function Home() {
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [isAlerting, setIsAlerting] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  const handleSendAlert = async () => {
    setIsAlerting(true);
    try {
      const res = await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedPoint),
      });
      if (res.ok) {
        setAlertSent(true);
        setTimeout(() => setAlertSent(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
    setIsAlerting(false);
  };

  return (
    <main className="h-screen bg-gray-950 text-gray-100 flex flex-col selection:bg-emerald-500/30 overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-red-900/10 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full p-4 md:p-6 flex-1 flex flex-col h-full max-w-[1600px] mx-auto">
        <header className="mb-4 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-md shadow-emerald-500/10">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Groot <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Guardian</span>
              </h1>
            </div>
            <p className="text-gray-400 text-sm pl-12 font-medium">
              Live deforestation detection grid (100m resolution)
            </p>
          </div>
        </header>

        <section className="flex-1 w-full relative flex gap-4 md:gap-6 overflow-hidden min-h-0">
          <div className="flex-1 h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
            <Map onPointSelect={setSelectedPoint} />
          </div>

          {/* Right Sidebar */}
          {selectedPoint && (
            <div className="w-80 h-full bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-red-500/30 p-6 flex flex-col shadow-[0_0_40px_-10px_rgba(239,68,68,0.2)] shrink-0 overflow-y-auto transform transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2 text-red-400 mt-1">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                  <h2 className="font-bold tracking-tight uppercase text-sm">Anomaly Alert</h2>
                </div>
                <button 
                  onClick={() => { setSelectedPoint(null); setAlertSent(false); }} 
                  className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 flex-1">
                <div className="bg-black/50 rounded-xl p-4 border border-white/5">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-semibold">Location</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs text-gray-600 block">Lat</span>
                      <span className="font-mono text-sm text-gray-200">{selectedPoint.lat.toFixed(5)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-600 block">Lng</span>
                      <span className="font-mono text-sm text-gray-200">{selectedPoint.lng.toFixed(5)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/50 rounded-xl p-4 border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 blur-[20px] rounded-full" />
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-semibold">AI Confidence</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-red-500">
                      {(selectedPoint.confidence * 100).toFixed(1)}
                    </span>
                    <span className="text-red-500/60 font-medium">%</span>
                  </div>
                </div>

                <div className="bg-black/50 rounded-xl p-4 border border-white/5 space-y-3">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1 font-semibold">Radar Metrics</p>
                  <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                    <span className="text-gray-400">VV Delta</span>
                    <span className="font-mono font-medium text-amber-100">{selectedPoint.VV_delta.toFixed(2)} dB</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                    <span className="text-gray-400">VH Delta</span>
                    <span className="font-mono font-medium text-amber-100">{selectedPoint.VH_delta.toFixed(2)} dB</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Magnitude</span>
                    <span className="font-mono font-medium text-red-300">{selectedPoint.delta_mag.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSendAlert}
                disabled={isAlerting || alertSent}
                className={`mt-6 w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 uppercase tracking-wider text-sm ${
                  alertSent 
                    ? 'bg-emerald-500 text-white border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                    : isAlerting
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                    : 'bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:shadow-[0_0_25px_rgba(239,68,68,0.4)]'
                }`}
              >
                {alertSent ? (
                  "Alert Activated"
                ) : isAlerting ? (
                  "Transmitting..."
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send Alert Protocol
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
