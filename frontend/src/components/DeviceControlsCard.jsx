import React from 'react';
import { 
  Sliders, 
  Lightbulb, 
  Fan, 
  Wind, 
  Bell, 
  Maximize2, 
  RotateCcw, 
  Sparkles,
  X,
  Filter
} from 'lucide-react';

export default function DeviceControlsCard({
  actuators,
  onToggleDevice,
  manualOverrides = {},
  onResetAutoMode,
  isHardwareMode = false,
  deviceStates = null,
  isFullView = false,
  deviceFilter = 'all', // 'all' | 'lights' | 'fans'
  onSetDeviceFilter
}) {
  // Actuator values
  const isBedLight = Boolean(actuators?.bedroom_light);
  const bedFanPwm = actuators?.bedroom_fan_pwm || 0;
  const bedFanPct = Math.round((bedFanPwm / 255) * 100);

  const isHallLight = Boolean(actuators?.hall_light);
  const hallFanPwm = actuators?.hall_fan_pwm || 0;
  const hallFanPct = Math.round((hallFanPwm / 255) * 100);

  const isKitchenLight = Boolean(actuators?.kitchen_light);
  const exhaustPct = actuators?.exhaust_fan_speed_pct !== undefined 
    ? actuators.exhaust_fan_speed_pct 
    : (actuators?.exhaust_fan ? 100 : 0);

  const isBathLight = Boolean(actuators?.bathroom_light);
  const curtainAngle = actuators?.curtain_servo_angle !== undefined ? actuators.curtain_servo_angle : 90;
  const isBuzzerActive = Boolean(actuators?.buzzer_active);

  const overrideCount = Object.keys(manualOverrides || {}).length;
  const isManualActive = overrideCount > 0;

  // Ultra-reliable toggle switch with rigid fixed dimensions (zero overlap)
  const ToggleSwitch = ({ isOn, onToggle, activeColor = 'bg-emerald-500' }) => (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Toggle device state"
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        isOn ? `${activeColor} shadow-md shadow-emerald-500/20` : 'bg-slate-800'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          isOn ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  // Responsive grid: single column in sidebar, multi-column in full view
  const gridClasses = isFullView 
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3.5";

  // Filter checks
  const showLights = deviceFilter === 'all' || deviceFilter === 'lights';
  const showFans = deviceFilter === 'all' || deviceFilter === 'fans';
  const showAlarms = deviceFilter === 'all';

  return (
    <div id="card-device-controls" className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 shadow-xl space-y-4">
      
      {/* Header & Mode Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex-shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white tracking-wide truncate">
                Smart Actuator Controls
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                isHardwareMode
                  ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                  : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
              }`}>
                {isHardwareMode ? 'ESP32 Nodes' : 'Simulated'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Direct tactile controls with immediate feedback &amp; smooth sliders
            </p>
          </div>
        </div>

        {/* Override / Auto Status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isManualActive ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-amber-950/70 text-amber-300 border border-amber-700/60 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                Manual ({overrideCount})
              </span>
              {onResetAutoMode && (
                <button
                  onClick={onResetAutoMode}
                  className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/70 text-cyan-300 hover:text-white transition-all flex items-center gap-1 active:scale-95 shadow-sm"
                  title="Restore full autonomous AI mode"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore AI Auto
                </button>
              )}
            </div>
          ) : (
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-900/90 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
              AI Auto
            </span>
          )}
        </div>
      </div>

      {/* FILTER BAR: Allows filtering by All, Lights Only, Fans Only */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-xl border border-white/10">
          <button
            onClick={() => onSetDeviceFilter && onSetDeviceFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              deviceFilter === 'all'
                ? 'bg-cyan-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All (9)
          </button>
          <button
            onClick={() => onSetDeviceFilter && onSetDeviceFilter('lights')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
              deviceFilter === 'lights'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <Lightbulb className="w-3 h-3" />
            <span>Lights Only (5)</span>
          </button>
          <button
            onClick={() => onSetDeviceFilter && onSetDeviceFilter('fans')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
              deviceFilter === 'fans'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            <Fan className="w-3 h-3" />
            <span>Fans Only (3)</span>
          </button>
        </div>

        {/* Active Filter Notice Badge */}
        {deviceFilter !== 'all' && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-500/40 text-cyan-300 text-[11px]">
            <span>Filter: <strong>{deviceFilter === 'lights' ? '💡 Light Controllers Only' : '🌀 Fan Controllers Only'}</strong></span>
            {onSetDeviceFilter && (
              <button 
                onClick={() => onSetDeviceFilter('all')}
                className="text-slate-400 hover:text-white ml-1 p-0.5 rounded"
                title="Clear filter and show all devices"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid of Spacious, Non-Overlapping Device Control Cards */}
      <div className={gridClasses}>
        
        {/* ========================================================
            LIGHT CONTROLLERS
           ======================================================== */}

        {/* 1. Bedroom Light */}
        {showLights && (
          <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isBedLight ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40' : 'bg-slate-800/80 text-slate-400'
                }`}>
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">Bedroom Light</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">Zone 1 • GPIO 25</div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-1">
                <ToggleSwitch
                  isOn={isBedLight}
                  onToggle={() => onToggleDevice('bedroom_light', !isBedLight)}
                  activeColor="bg-amber-500"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 text-[11px]">State:</span>
              <span className={`font-bold text-[11px] ${isBedLight ? 'text-amber-300' : 'text-slate-500'}`}>
                {isBedLight ? '● ILLUMINATED' : '○ OFF'}
              </span>
            </div>
          </div>
        )}

        {/* 2. Window Curtains (Ambient Light Modulation) */}
        {showLights && (
          <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40 flex items-center justify-center flex-shrink-0">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">Window Curtains</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">SG90 Servo • GPIO 19</div>
                </div>
              </div>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-emerald-300 flex-shrink-0">
                {curtainAngle}°
              </span>
            </div>
            <div className="space-y-1 pt-1">
              <input
                type="range"
                min="0"
                max="90"
                value={curtainAngle}
                onChange={(e) => onToggleDevice('curtain_servo_angle', parseInt(e.target.value))}
                className="w-full accent-emerald-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0° (Closed)</span>
                <span className="text-emerald-400 font-semibold">{curtainAngle}°</span>
                <span>90° (Open)</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Hall Light */}
        {showLights && (
          <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isHallLight ? 'bg-blue-400/20 text-blue-300 ring-1 ring-blue-400/40' : 'bg-slate-800/80 text-slate-400'
                }`}>
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">Hallway Light</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">Zone 1 • GPIO 32</div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-1">
                <ToggleSwitch
                  isOn={isHallLight}
                  onToggle={() => onToggleDevice('hall_light', !isHallLight)}
                  activeColor="bg-blue-500"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 text-[11px]">State:</span>
              <span className={`font-bold text-[11px] ${isHallLight ? 'text-blue-300' : 'text-slate-500'}`}>
                {isHallLight ? '● ILLUMINATED' : '○ OFF'}
              </span>
            </div>
          </div>
        )}

        {/* 4. Kitchen Light */}
        {showLights && (
          <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isKitchenLight ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40' : 'bg-slate-800/80 text-slate-400'
                }`}>
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">Kitchen Light</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">Zone 2 • GPIO 5 (D1)</div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-1">
                <ToggleSwitch
                  isOn={isKitchenLight}
                  onToggle={() => onToggleDevice('kitchen_light', !isKitchenLight)}
                  activeColor="bg-amber-500"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 text-[11px]">State:</span>
              <span className={`font-bold text-[11px] ${isKitchenLight ? 'text-amber-300' : 'text-slate-500'}`}>
                {isKitchenLight ? '● ILLUMINATED' : '○ OFF'}
              </span>
            </div>
          </div>
        )}

        {/* 5. Bathroom Light */}
        {showLights && (
          <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isBathLight ? 'bg-indigo-400/20 text-indigo-300 ring-1 ring-indigo-400/40' : 'bg-slate-800/80 text-slate-400'
                }`}>
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">Bathroom Light</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">Zone 2 • GPIO 2 (D4)</div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-1">
                <ToggleSwitch
                  isOn={isBathLight}
                  onToggle={() => onToggleDevice('bathroom_light', !isBathLight)}
                  activeColor="bg-indigo-500"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 text-[11px]">State:</span>
              <span className={`font-bold text-[11px] ${isBathLight ? 'text-indigo-300' : 'text-slate-500'}`}>
                {isBathLight ? '● ILLUMINATED' : '○ OFF'}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================
            FAN CONTROLLERS
           ======================================================== */}

        {/* 6. Bedroom Fan */}
        {showFans && (
          <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  bedFanPct > 0 ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/40' : 'bg-slate-800/80 text-slate-400'
                }`}>
                  <Fan className={`w-4 h-4 ${bedFanPct > 0 ? 'fan-spin-medium text-cyan-300' : ''}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">Bedroom Fan</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">Transistor • GPIO 18/12</div>
                </div>
              </div>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-cyan-300 flex-shrink-0">
                {bedFanPct}%
              </span>
            </div>
            <div className="space-y-1 pt-1">
              <input
                type="range"
                min="0"
                max="255"
                value={bedFanPwm}
                onChange={(e) => onToggleDevice('bedroom_fan_pwm', parseInt(e.target.value))}
                className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0 PWM</span>
                <span className="text-cyan-400 font-semibold">{bedFanPwm} PWM</span>
                <span>255 PWM</span>
              </div>
            </div>
          </div>
        )}

        {/* 7. Hall Fan */}
        {showFans && (
          <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  hallFanPct > 0 ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/40' : 'bg-slate-800/80 text-slate-400'
                }`}>
                  <Fan className={`w-4 h-4 ${hallFanPct > 0 ? 'fan-spin-medium text-cyan-300' : ''}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">Hallway Fan</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">Transistor • GPIO 21/23</div>
                </div>
              </div>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-cyan-300 flex-shrink-0">
                {hallFanPct}%
              </span>
            </div>
            <div className="space-y-1 pt-1">
              <input
                type="range"
                min="0"
                max="255"
                value={hallFanPwm}
                onChange={(e) => onToggleDevice('hall_fan_pwm', parseInt(e.target.value))}
                className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0 PWM</span>
                <span className="text-cyan-400 font-semibold">{hallFanPwm} PWM</span>
                <span>255 PWM</span>
              </div>
            </div>
          </div>
        )}

        {/* 8. Kitchen Exhaust Fan */}
        {showFans && (
          <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  exhaustPct > 0 ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40' : 'bg-slate-800/80 text-slate-400'
                }`}>
                  <Wind className={`w-4 h-4 ${exhaustPct > 0 ? 'fan-spin-fast text-emerald-300' : ''}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">Kitchen Exhaust</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">Proportional • GPIO 14</div>
                </div>
              </div>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-emerald-300 flex-shrink-0">
                {exhaustPct}%
              </span>
            </div>
            <div className="space-y-1 pt-1">
              <input
                type="range"
                min="0"
                max="100"
                value={exhaustPct}
                onChange={(e) => onToggleDevice('exhaust_fan_speed_pct', parseInt(e.target.value))}
                className="w-full accent-emerald-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0% (Off)</span>
                <span className="text-emerald-400 font-semibold">{exhaustPct}% Turbo</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            ALARMS & BUZZER
           ======================================================== */}

        {/* 9. Rescue Buzzer */}
        {showAlarms && (
          <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isBuzzerActive ? 'bg-red-500/25 text-red-400 ring-1 ring-red-400/50 animate-pulse' : 'bg-slate-800/80 text-slate-400'
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">Rescue Buzzer</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">Alarm • GPIO 22/33</div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-1">
                <ToggleSwitch
                  isOn={isBuzzerActive}
                  onToggle={() => onToggleDevice('buzzer_active', !isBuzzerActive)}
                  activeColor="bg-red-500"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Alarm State:</span>
              <span className={`font-bold text-[11px] ${isBuzzerActive ? 'text-red-400' : 'text-slate-500'}`}>
                {isBuzzerActive ? '● SOUNDING ALARM' : '○ Standby'}
              </span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
