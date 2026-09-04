import React from 'react';
import { 
  Zap, 
  Leaf, 
  TrendingUp, 
  Clock, 
  BarChart3,
  Sparkles
} from 'lucide-react';

export default function EnergyAnalyticsCard({ energyMetrics }) {
  const currentWatts = energyMetrics?.current_power_watts !== undefined ? energyMetrics.current_power_watts : 152.8;
  const savedKwh = energyMetrics?.cumulative_saved_kwh || 0.9258;
  const savedWh = (savedKwh * 1000).toFixed(1);
  const lastEvent = energyMetrics?.last_auto_shutdown_event || "Standby • Auto-cutoff primed for >45s vacancy";

  const zoneShares = [
    { room: "Bedroom (Rest & Sleep)", pct: 42, color: "from-cyan-500 to-blue-500" },
    { room: "Hallway (Transit Corridor)", pct: 35, color: "from-blue-500 to-indigo-500" },
    { room: "Kitchen (Cooking & Prep)", pct: 18, color: "from-amber-500 to-orange-500" },
    { room: "Bathroom (Hygiene)", pct: 5, color: "from-purple-500 to-pink-500" }
  ];

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              ENERGY INTELLIGENCE
            </h3>
            <p className="text-[11px] text-slate-400">
              Autonomous load modulation &amp; real-time energy conservation
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-semibold flex items-center gap-1">
          <Leaf className="w-3 h-3 text-emerald-400" />
          Eco Optimized
        </span>
      </div>

      {/* 3 Compact Hero Metrics */}
      <div className="grid grid-cols-3 gap-2.5">
        
        {/* Current Power */}
        <div className="glass-card rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Current Power
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
            {currentWatts} <span className="text-xs font-normal text-slate-400">W</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1">
            4-Zone active
          </span>
        </div>

        {/* Energy Saved */}
        <div className="glass-card rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Energy Saved
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1">
            {savedWh} <span className="text-xs font-normal text-emerald-500">Wh</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono mt-1">
            Autonomous
          </span>
        </div>

        {/* Estimated Saving */}
        <div className="glass-card rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Est. Saving
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 mt-1 flex items-center">
            +32%
          </div>
          <span className="text-[10px] text-cyan-400/80 font-mono mt-1 flex items-center gap-0.5">
            <TrendingUp className="w-2.5 h-2.5" /> vs baseline
          </span>
        </div>

      </div>

      {/* Visual Spatial Utilization Bars (No Paragraph Clutter) */}
      <div className="space-y-2 pt-1 font-mono">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Zone Power Consumption Profile:</span>
          </span>
          <span className="text-slate-500">Real-time split</span>
        </div>

        <div className="space-y-2">
          {zoneShares.map((z, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">{z.room}</span>
                <span className="text-slate-200 font-bold">{z.pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${z.color} rounded-full transition-all duration-500`}
                  style={{ width: `${z.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Last Cutoff Timestamp */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center gap-1.5 text-[11px] font-mono text-slate-400 truncate">
        <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <span className="truncate">{lastEvent}</span>
      </div>

    </div>
  );
}
