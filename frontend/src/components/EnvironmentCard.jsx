import React from 'react';
import { 
  CloudSun, 
  Thermometer, 
  Wind, 
  Droplets, 
  Gauge,
  Sparkles
} from 'lucide-react';

export default function EnvironmentCard({ telemetry, actuators }) {
  const tempC = telemetry?.kitchen?.temperature_c || 24.5;
  const gasPpm = telemetry?.kitchen?.gas_ppm || 220;
  const humidity = telemetry?.kitchen?.humidity_pct || 55;
  const exhaustPct = actuators?.exhaust_fan_speed_pct || (actuators?.exhaust_fan ? 100 : 0);

  // Air quality rating
  let airQuality = "Good";
  let airColor = "text-emerald-400";
  let airBg = "bg-emerald-950/80 border-emerald-700/60";

  if (gasPpm >= 1200) {
    airQuality = "Hazard";
    airColor = "text-rose-400";
    airBg = "bg-rose-950 border-rose-700";
  } else if (gasPpm >= 500) {
    airQuality = "Moderate";
    airColor = "text-amber-400";
    airBg = "bg-amber-950 border-amber-700";
  }

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <CloudSun className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              ENVIRONMENT &amp; CLIMATE
            </h3>
            <p className="text-[11px] text-slate-400">
              Living condition metrics &amp; automated ventilation
            </p>
          </div>
        </div>

        <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold border ${airBg} ${airColor}`}>
          Air: {airQuality}
        </span>
      </div>

      {/* 4 Large Typography Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Temperature */}
        <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Temperature</span>
            <Thermometer className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white tracking-tight">
            {tempC}°C
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1">
            Target: 22–25°C
          </span>
        </div>

        {/* Air Quality */}
        <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Air Quality</span>
            <Gauge className={`w-4 h-4 ${airColor}`} />
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight ${airColor}`}>
            {airQuality}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1">
            MQ-2: {gasPpm} ppm
          </span>
        </div>

        {/* Humidity */}
        <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Humidity</span>
            <Droplets className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white tracking-tight">
            {humidity}%
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1">
            Optimal: 40–60%
          </span>
        </div>

        {/* Kitchen Exhaust */}
        <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Kitchen Exhaust</span>
            <Wind className={`w-4 h-4 ${exhaustPct > 0 ? 'text-emerald-400' : 'text-slate-500'}`} />
          </div>
          <div className="text-2xl font-black font-mono text-white tracking-tight">
            {exhaustPct}%
          </div>
          <span className={`text-[10px] font-mono mt-1 ${exhaustPct > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
            {exhaustPct > 0 ? 'Evacuation Active' : 'Standby'}
          </span>
        </div>

      </div>

    </div>
  );
}
