import { DeforestationData } from '@/lib/loadData';
import { AlertCircle, MapPin, TrendingUp, Info, BellRing } from 'lucide-react';
import { useState } from 'react';

interface InfoPanelProps {
  selectedPoint: DeforestationData | null;
}

export default function InfoPanel({ selectedPoint }: InfoPanelProps) {
  const [isSending, setIsSending] = useState(false);
  const [alertStatus, setAlertStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (!selectedPoint) {
    return (
      <div className="w-full h-full bg-slate-900 border-l border-slate-800 p-6 flex items-center justify-center text-slate-400">
        <div className="text-center flex flex-col items-center">
          <Info className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No point selected</p>
          <p className="text-sm mt-2 opacity-70">Click on a map marker to view structural details.</p>
        </div>
      </div>
    );
  }

  const isDeforestation = selectedPoint.deforestation === 1;
  const confidencePercent = (selectedPoint.confidence * 100).toFixed(1);

  const handleSendAlert = async () => {
    setIsSending(true);
    setAlertStatus('idle');
    try {
      const response = await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selectedPoint.lat,
          lng: selectedPoint.lng,
          confidence: selectedPoint.confidence,
          delta_mag: selectedPoint.delta_mag,
        })
      });
      if (response.ok) {
        setAlertStatus('success');
      } else {
        setAlertStatus('error');
      }
    } catch (e) {
      setAlertStatus('error');
    } finally {
      setIsSending(false);
      setTimeout(() => setAlertStatus('idle'), 3000);
    }
  };

  return (
    <div className="w-full h-full bg-slate-900 border-l border-slate-800 text-slate-200 overflow-y-auto overflow-x-hidden relative">
      {/* Header Section */}
      <div className={`p-6 border-b ${isDeforestation ? 'border-red-900/50 bg-red-950/20' : 'border-green-900/50 bg-green-950/20'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${isDeforestation ? 'text-red-400' : 'text-green-400'}`}>
              {isDeforestation ? 'Deforestation' : 'No Deforestation'}
            </h2>
            <p className="text-sm mt-1 text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> Confidence: <span className="text-white font-medium">{confidencePercent}%</span>
            </p>
          </div>
          {isDeforestation && <AlertCircle className="w-8 h-8 text-red-500" />}
        </div>
        
        {/* Alert Button visible only if it is deforestation */}
        {isDeforestation && (
          <div className="mt-4">
            <button 
              onClick={handleSendAlert}
              disabled={isSending}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BellRing className="w-4 h-4" />
              {isSending ? 'Sending Alert...' : 'Send Alert'}
            </button>
            {alertStatus === 'success' && <p className="text-green-400 text-xs mt-2 text-center">Alert sent successfully!</p>}
            {alertStatus === 'error' && <p className="text-red-400 text-xs mt-2 text-center">Failed to send alert.</p>}
          </div>
        )}
      </div>

      <div className="p-6 space-y-8">
        {/* Change Metrics Section */}
        <section>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            Change Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">VV Delta</p>
              <p className="text-lg font-mono font-medium">{selectedPoint.VV_delta.toFixed(4)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">VH Delta</p>
              <p className="text-lg font-mono font-medium">{selectedPoint.VH_delta.toFixed(4)}</p>
            </div>
            <div className="col-span-2 bg-slate-800 rounded-lg p-4 border border-slate-600 shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
              <p className="text-xs text-slate-400 mb-1">Delta Magnitude</p>
              <p className="text-3xl font-mono font-bold text-blue-400">{selectedPoint.delta_mag.toFixed(4)}</p>
            </div>
          </div>
        </section>

        {/* Signal Features Section */}
        <section>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Signal Features
          </h3>
          <ul className="bg-slate-800/30 rounded-lg border border-slate-700/50 divide-y divide-slate-700/50">
            <li className="flex justify-between p-3 text-sm">
              <span className="text-slate-400">VV Current</span>
              <span className="font-mono">{selectedPoint.VV_current.toFixed(4)} dB</span>
            </li>
            <li className="flex justify-between p-3 text-sm">
              <span className="text-slate-400">VH Current</span>
              <span className="font-mono">{selectedPoint.VH_current.toFixed(4)} dB</span>
            </li>
            <li className="flex justify-between p-3 text-sm">
              <span className="text-slate-400">VV/VH Ratio</span>
              <span className="font-mono">{selectedPoint.VVVH_ratio.toFixed(4)}</span>
            </li>
          </ul>
        </section>

        {/* Location Section */}
        <section>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Location
          </h3>
          <div className="bg-slate-800/50 rounded-lg p-4 font-mono text-sm border border-slate-700/50 flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Latitude:</span>
              <span className="text-slate-300">{selectedPoint.lat.toFixed(6)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Longitude:</span>
              <span className="text-slate-300">{selectedPoint.lng.toFixed(6)}°</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
