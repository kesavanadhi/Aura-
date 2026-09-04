import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Flame, 
  Thermometer, 
  Wind, 
  PhoneCall, 
  Wifi, 
  WifiOff,
  Sliders,
  AlertTriangle,
  Play
} from 'lucide-react';

export default function SafetyGuardianCard({
  simMode,
  telemetry,
  hardwareTelemetry,
  hardwareStatus,
  actuators,
  hazardIncident,
  onSimulateGas,
  onAdjustKitchen,
  userLocation
}) {
  const isHwOnline = Boolean(hardwareStatus?.online && hardwareStatus?.node2_online);

  const activeKitchen = simMode 
    ? telemetry?.kitchen 
    : (isHwOnline ? hardwareTelemetry?.kitchen : null);

  const gasPpm = activeKitchen ? activeKitchen.gas_ppm : null;
  const tempC = activeKitchen ? activeKitchen.temperature_c : null;
  const humidity = activeKitchen ? activeKitchen.humidity_pct : null;

  const isCritical = gasPpm !== null && gasPpm >= 1200;
  const isWarning = gasPpm !== null && gasPpm >= 500 && gasPpm < 1200;
  const isHeatHigh = tempC !== null && tempC > 35;
  const exhaustSpeed = actuators?.exhaust_fan_speed_pct || (actuators?.exhaust_fan ? 100 : 0);

  return (
    <div className={`glass-panel rounded-2xl p-5 border transition-all duration-300 shadow-xl space-y-4 ${
      isCritical ? 'border-red-500/80 glow-red-active' : 'border-white/10'
    }`}>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${
            isCritical 
              ? 'bg-red-500/20 text-red-400' 
              : isWarning 
                ? 'bg-amber-500/20 text-amber-400' 
                : 'bg-emerald-500/10 text-emerald-400'
          }`}>
            {isCritical ? <ShieldAlert className="w-4 h-4 animate-bounce" /> : <ShieldCheck className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Safety Guardian &amp; Hazard Monitor
            </h3>
            <p className="text-[11px] text-slate-400">
              Kitchen gas, temperature &amp; proportional evacuation ventilation
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
          isCritical
            ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse'
            : isWarning
              ? 'bg-amber-950 text-amber-300 border border-amber-700'
              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-red-400' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
          {isCritical ? 'CRITICAL HAZARD' : isWarning ? 'HAZARD WARNING' : 'All systems normal'}
        </span>
      </div>

      {/* Hardware Offline alert in Hardware Mode */}
      {!simMode && !isHwOnline && (
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/60 text-xs text-rose-300 font-mono flex items-center gap-2.5">
          <WifiOff className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>ESP8266 Node 2 offline. Connect to MQTT (1883) to stream live sensors.</span>
        </div>
      )}

      {/* Metric Cards (Gas & Temperature) with Large Typography */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* MQ-2 Gas Metric */}
        <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">MQ-2 Gas / Smoke</span>
            <Flame className={`w-4 h-4 ${isCritical ? 'text-red-400 animate-bounce' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-black font-mono text-white tracking-tight">
            {gasPpm !== null ? (
              <>
                {gasPpm} <span className="text-xs font-normal text-slate-400">ppm</span>
              </>
            ) : (
              <span className="text-rose-400 text-lg">Offline</span>
            )}
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${gasPpm !== null ? Math.min(100, (gasPpm / 2000) * 100) : 0}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
            <span>Threshold: 500 ppm</span>
            <span className={gasPpm >= 500 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
              {gasPpm !== null ? (gasPpm >= 500 ? 'EXHAUST ACTIVE' : 'Clean') : '--'}
            </span>
          </div>
        </div>

        {/* Temperature Metric */}
        <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Kitchen Thermal</span>
            <Thermometer className={`w-4 h-4 ${isHeatHigh ? 'text-rose-400' : 'text-cyan-400'}`} />
          </div>
          <div className="text-2xl font-black font-mono text-white tracking-tight">
            {tempC !== null ? (
              <>
                {tempC}°C
              </>
            ) : (
              <span className="text-rose-400 text-lg">Offline</span>
            )}
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isHeatHigh ? 'bg-rose-500' : tempC > 26 ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${tempC !== null ? Math.min(100, (tempC / 50) * 100) : 0}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
            <span>Humidity: {humidity || 55}%</span>
            <span className={tempC > 26 ? 'text-amber-300 font-semibold' : 'text-slate-400'}>
              {tempC > 26 ? 'Ventilation Mode' : 'Normal'}
            </span>
          </div>
        </div>

      </div>

      {/* Simulator Control Sliders (Available in Simulator Mode) */}
      {simMode && onAdjustKitchen && (
        <div className="p-3 rounded-xl bg-slate-900/40 border border-white/[0.05] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Sliders className="w-3 h-3 text-cyan-400" />
              <span>Simulate Kitchen Gas / Heat:</span>
            </span>
            <button
              onClick={onSimulateGas}
              className="px-2 py-0.5 rounded bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 text-[10px] transition-colors active:scale-95"
            >
              Inject Gas Spike
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Gas PPM: {gasPpm || 220}</span>
              </div>
              <input
                type="range"
                min="100"
                max="1800"
                value={gasPpm || 220}
                onChange={(e) => onAdjustKitchen({ gas_ppm: parseInt(e.target.value) })}
                className="w-full accent-red-400 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Heat: {tempC || 24.5}°C</span>
              </div>
              <input
                type="range"
                min="20"
                max="45"
                step="0.5"
                value={tempC || 24.5}
                onChange={(e) => onAdjustKitchen({ kitchen_temp: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
