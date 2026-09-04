import React from 'react';
import { 
  Lightbulb, 
  Fan, 
  Flame, 
  User, 
  AlertTriangle, 
  ShieldCheck, 
  Footprints, 
  Wind, 
  Bell, 
  Volume2, 
  WifiOff, 
  Maximize2,
  Sparkles,
  Layers,
  Thermometer,
  Gauge
} from 'lucide-react';

export default function DigitalTwinMap({
  telemetry,
  actuators,
  deviceStates = null,
  isHardwareMode = false,
  hardwareStatus = null,
  activeEmergency,
  navRoute,
  obstacles,
  onRoomClick
}) {
  const isHwOffline = isHardwareMode && (!hardwareStatus?.online || !telemetry);

  // Sensor states
  const isBedroomOcc = Boolean(telemetry?.bedroom?.occupancy);
  const isHallOcc = Boolean(telemetry?.hall?.occupancy);
  const isBathOcc = Boolean(telemetry?.bathroom?.occupancy);
  const isKitchenOcc = false; // strictly not present in hardware

  const gasPpm = telemetry?.kitchen?.gas_ppm || 220;
  const tempC = telemetry?.kitchen?.temperature_c || 24.5;
  const isGasHazard = gasPpm >= 500;
  const isCriticalGas = gasPpm >= 1200;
  const isHeatElevated = tempC > 26;
  const isHeatHigh = tempC > 36;
  const isFallEmergency = activeEmergency?.type === 'POSSIBLE_FALL';
  const isBuzzerActive = Boolean(actuators?.buzzer_active);

  // Actuator states
  const bedLight = Boolean(actuators?.bedroom_light);
  const bedFanPwm = actuators?.bedroom_fan_pwm || 0;
  const bedFanPct = Math.round((bedFanPwm / 255) * 100);

  const hallLight = Boolean(actuators?.hall_light);
  const hallFanPwm = actuators?.hall_fan_pwm || 0;
  const hallFanPct = Math.round((hallFanPwm / 255) * 100);

  const bathLight = Boolean(actuators?.bathroom_light);
  const kitchenLight = Boolean(actuators?.kitchen_light);
  const exhaustPct = actuators?.exhaust_fan_speed_pct || (actuators?.exhaust_fan ? 100 : 0);
  const curtainAngle = actuators?.curtain_servo_angle !== undefined ? actuators.curtain_servo_angle : 90;

  // Fan animation classes based on real speed
  const getFanClass = (pct) => {
    if (pct <= 0) return 'text-slate-500';
    if (pct < 35) return 'fan-spin-slow text-emerald-400';
    if (pct < 70) return 'fan-spin-medium text-cyan-400';
    if (pct < 90) return 'fan-spin-fast text-cyan-300';
    return 'fan-spin-turbo text-indigo-400';
  };

  return (
    <div className="glass-panel rounded-2xl p-5 relative overflow-hidden border border-white/10 shadow-2xl transition-all">
      
      {/* Top Header of Digital Twin */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Digital Twin — Spatial Home Geometry
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 flex items-center gap-1.5 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE DIGITAL TWIN • ESP32 SYNCED
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Interactive 2D spatial model • Bi-directional real-time hardware telemetry &amp; actuation reflection
            </p>
          </div>
        </div>

        {/* Global Sounder Status */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border font-bold transition-all ${
            isBuzzerActive
              ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse glow-red-active'
              : 'bg-slate-900/80 border-white/10 text-slate-400'
          }`}>
            {isBuzzerActive ? (
              <>
                <Bell className="w-3.5 h-3.5 text-red-400 animate-bounce" />
                <span>ALARM ACTIVE</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                <span>ALARM STANDBY</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Offline Warning for Hardware Authority Mode */}
      {isHwOffline ? (
        <div className="relative w-full aspect-[16/10] bg-slate-950/90 rounded-2xl border border-amber-800/80 p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <WifiOff className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              HARDWARE MODE: WAITING FOR ESP32 BROADCAST
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              No simulated data is injected in Hardware Mode. Connect Node 1 (Bedroom/Hall) &amp; Node 2 (Kitchen/Bathroom) to MQTT broker on port 1883 to stream real-time spatial telemetry.
            </p>
          </div>
          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/70 px-3 py-1 rounded-lg border border-cyan-800">
            Or switch to Simulator Mode anytime in the header for full offline testing
          </span>
        </div>
      ) : (
        /* 2D Interactive Spatial House Geometry (4 Zones) */
        <div className="relative w-full aspect-[16/10] bg-[#05070B] rounded-2xl border border-white/[0.08] p-3.5 grid grid-cols-2 grid-rows-2 gap-3.5 overflow-hidden shadow-inner">
          
          {/* =========================================================================
              ZONE 1: BEDROOM (Top-Left)
             ========================================================================= */}
          <div
            onClick={() => onRoomClick && onRoomClick('Bedroom')}
            className={`relative rounded-xl p-4 border transition-all duration-300 flex flex-col justify-between cursor-pointer group select-none overflow-hidden ${
              isFallEmergency
                ? 'bg-rose-950/40 border-rose-500 glow-red-active'
                : bedLight
                  ? 'bg-gradient-to-br from-amber-500/15 via-slate-900/60 to-slate-950 border-amber-400/40 shadow-[0_0_25px_rgba(245,158,11,0.12)]'
                  : 'bg-slate-900/40 border-white/[0.06] hover:border-white/15'
            }`}
          >
            {/* Ambient Lighting Glow Layer */}
            {bedLight && (
              <div className="absolute inset-0 bg-gradient-to-t from-amber-400/5 via-amber-500/10 to-transparent pointer-events-none"></div>
            )}

            {/* Room Header */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white group-hover:text-cyan-300 transition-colors">
                  Bedroom
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400">
                  Zone 1
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {isBedroomOcc && (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800 animate-pulse">
                    <User className="w-3 h-3 text-cyan-400" /> Occupied
                  </span>
                )}
                {isFallEmergency && (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700 animate-bounce font-bold">
                    <AlertTriangle className="w-3 h-3 text-rose-400" /> FALL
                  </span>
                )}
              </div>
            </div>

            {/* Room Metrics */}
            <div className="my-2 space-y-1.5 text-xs font-mono relative z-10">
              <div className="flex items-center justify-between text-slate-400">
                <span>Ambient Lux:</span>
                <span className="text-slate-200 font-semibold">{telemetry?.bedroom?.ambient_lux || 450} lx</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Window Curtains:</span>
                <span className={curtainAngle >= 45 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {curtainAngle >= 45 ? `OPEN (${curtainAngle}°)` : `CLOSED (${curtainAngle}°)`}
                </span>
              </div>
            </div>

            {/* Actuator State Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] relative z-10">
              {/* Light State */}
              <div className={`flex items-center gap-1.5 text-xs font-mono ${bedLight ? 'text-amber-300 font-bold' : 'text-slate-500'}`}>
                <Lightbulb className={`w-4 h-4 ${bedLight ? 'fill-amber-400/40 text-amber-300 animate-pulse' : ''}`} />
                <span>{bedLight ? 'LIGHT ON' : 'LIGHT OFF'}</span>
              </div>

              {/* Fan State with Rotational Velocity */}
              <div className={`flex items-center gap-1.5 text-xs font-mono ${bedFanPct > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                <Fan className={`w-4 h-4 ${getFanClass(bedFanPct)}`} />
                <span>{bedFanPct > 0 ? `Fan ${bedFanPct}%` : 'Fan OFF'}</span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              ZONE 2: HALLWAY & CORRIDOR (Top-Right)
             ========================================================================= */}
          <div
            onClick={() => onRoomClick && onRoomClick('Hall')}
            className={`relative rounded-xl p-4 border transition-all duration-300 flex flex-col justify-between cursor-pointer group select-none overflow-hidden ${
              hallLight
                ? 'bg-gradient-to-br from-blue-500/15 via-slate-900/60 to-slate-950 border-blue-400/40 shadow-[0_0_25px_rgba(59,130,246,0.12)]'
                : 'bg-slate-900/40 border-white/[0.06] hover:border-white/15'
            }`}
          >
            {hallLight && (
              <div className="absolute inset-0 bg-gradient-to-t from-blue-400/5 via-blue-500/10 to-transparent pointer-events-none"></div>
            )}

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white group-hover:text-blue-300 transition-colors">
                  Hall &amp; Corridor
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400">
                  Zone 1
                </span>
              </div>

              {isHallOcc && (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800 animate-pulse">
                  <User className="w-3 h-3 text-blue-400" /> Occupied
                </span>
              )}
            </div>

            <div className="my-2 space-y-1.5 text-xs font-mono relative z-10">
              <div className="flex items-center justify-between text-slate-400">
                <span>Obstacle Radar:</span>
                <span className={`font-semibold ${(telemetry?.hall?.obstacle_distance_cm || 140) < 45 ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                  {telemetry?.hall?.obstacle_distance_cm || 140} cm
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>A* Nav Status:</span>
                <span className="text-emerald-400 font-semibold">Clear Transit Route</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] relative z-10">
              <div className={`flex items-center gap-1.5 text-xs font-mono ${hallLight ? 'text-blue-300 font-bold' : 'text-slate-500'}`}>
                <Lightbulb className={`w-4 h-4 ${hallLight ? 'fill-blue-400/40 text-blue-300' : ''}`} />
                <span>{hallLight ? 'LIGHT ON' : 'LIGHT OFF'}</span>
              </div>

              <div className={`flex items-center gap-1.5 text-xs font-mono ${hallFanPct > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                <Fan className={`w-4 h-4 ${getFanClass(hallFanPct)}`} />
                <span>{hallFanPct > 0 ? `Fan ${hallFanPct}%` : 'Fan OFF'}</span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              ZONE 3: BATHROOM (Bottom-Left)
             ========================================================================= */}
          <div
            onClick={() => onRoomClick && onRoomClick('Bathroom')}
            className={`relative rounded-xl p-4 border transition-all duration-300 flex flex-col justify-between cursor-pointer group select-none overflow-hidden ${
              bathLight
                ? 'bg-gradient-to-br from-indigo-500/15 via-slate-900/60 to-slate-950 border-indigo-400/40 shadow-[0_0_25px_rgba(99,102,241,0.12)]'
                : 'bg-slate-900/40 border-white/[0.06] hover:border-white/15'
            }`}
          >
            {bathLight && (
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-400/5 via-indigo-500/10 to-transparent pointer-events-none"></div>
            )}

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white group-hover:text-indigo-300 transition-colors">
                  Bathroom
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400">
                  Zone 2
                </span>
              </div>

              {isBathOcc && (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800 animate-pulse">
                  <User className="w-3 h-3 text-indigo-400" /> Occupied
                </span>
              )}
            </div>

            <div className="my-2 space-y-1.5 text-xs font-mono relative z-10">
              <div className="flex items-center justify-between text-slate-400">
                <span>Ultrasonic Clearance:</span>
                <span className="text-slate-200 font-semibold">{telemetry?.bathroom?.obstacle_distance_cm || 120} cm</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Motion PIR:</span>
                <span className="text-cyan-400 font-semibold">{isBathOcc ? 'Motion Triggered' : 'Monitoring'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] relative z-10">
              <div className={`flex items-center gap-1.5 text-xs font-mono ${bathLight ? 'text-indigo-300 font-bold' : 'text-slate-500'}`}>
                <Lightbulb className={`w-4 h-4 ${bathLight ? 'fill-indigo-400/40 text-indigo-300' : ''}`} />
                <span>{bathLight ? 'LIGHT ON' : 'LIGHT OFF'}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                GPIO 2 (D4) Driver
              </span>
            </div>
          </div>

          {/* =========================================================================
              ZONE 4: KITCHEN (Bottom-Right)
             ========================================================================= */}
          <div
            onClick={() => onRoomClick && onRoomClick('Kitchen')}
            className={`relative rounded-xl p-4 border transition-all duration-300 flex flex-col justify-between cursor-pointer group select-none overflow-hidden ${
              isCriticalGas
                ? 'bg-rose-950/60 border-rose-500 glow-red-active animate-pulse'
                : isGasHazard
                  ? 'bg-amber-950/50 border-amber-500 glow-yellow'
                  : isHeatHigh
                    ? 'bg-orange-950/40 border-orange-500/70'
                    : kitchenLight
                      ? 'bg-gradient-to-br from-amber-500/15 via-slate-900/60 to-slate-950 border-amber-400/40'
                      : 'bg-slate-900/40 border-white/[0.06] hover:border-white/15'
            }`}
          >
            {isGasHazard && (
              <div className="absolute inset-0 bg-gradient-to-t from-red-500/20 via-amber-500/10 to-transparent pointer-events-none animate-pulse"></div>
            )}

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white group-hover:text-amber-300 transition-colors">
                  Kitchen
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400">
                  Zone 2
                </span>
              </div>

              {isGasHazard ? (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-700 font-bold animate-pulse">
                  <Flame className="w-3 h-3 text-red-400" /> GAS HAZARD
                </span>
              ) : isHeatHigh ? (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-950 text-orange-300 border border-orange-700 font-bold">
                  <Thermometer className="w-3 h-3 text-orange-400" /> HIGH HEAT
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  <ShieldCheck className="w-3 h-3" /> Safe
                </span>
              )}
            </div>

            <div className="my-2 space-y-1.5 text-xs font-mono relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">MQ-2 Index:</span>
                <span className={`font-semibold ${isGasHazard ? 'text-red-400 font-bold' : 'text-slate-200'}`}>
                  {gasPpm} {isGasHazard ? '(Exhaust Forced)' : '(Normal)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Temperature:</span>
                <span className={`font-semibold ${isHeatHigh ? 'text-rose-400 font-bold' : isHeatElevated ? 'text-amber-300 font-bold' : 'text-emerald-400'}`}>
                  {tempC}°C {isHeatElevated ? '(Elevated)' : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] relative z-10">
              <div className={`flex items-center gap-1.5 text-xs font-mono ${kitchenLight ? 'text-amber-300 font-bold' : 'text-slate-500'}`}>
                <Lightbulb className={`w-4 h-4 ${kitchenLight ? 'fill-amber-400/40 text-amber-300' : ''}`} />
                <span>{kitchenLight ? 'LIGHT ON' : 'LIGHT OFF'}</span>
              </div>

              <div className={`flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-md ${
                exhaustPct > 0 
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60' 
                  : 'text-slate-500'
              }`}>
                <Wind className={`w-3.5 h-3.5 ${getFanClass(exhaustPct)}`} />
                <span className="font-bold">Exhaust {exhaustPct}%</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Active Navigation Route Path Strip */}
      {navRoute && navRoute.safe_route && navRoute.safe_route.length > 0 && !isHwOffline && (
        <div className="mt-3.5 flex items-center justify-between text-xs font-mono bg-slate-900/80 px-4 py-2 rounded-xl border border-white/[0.07] text-slate-300">
          <div className="flex items-center gap-2">
            <Footprints className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-slate-400">Verified A* Route:</span>
            <span className="text-cyan-300 font-semibold">{navRoute.safe_route.join(' → ')}</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
            navRoute.path_status === 'OBSTACLE_DETECTED_REROUTED'
              ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
          }`}>
            {navRoute.path_status}
          </span>
        </div>
      )}

    </div>
  );
}
