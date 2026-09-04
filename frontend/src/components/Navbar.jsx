import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  PhoneCall, 
  MapPin, 
  Cpu, 
  Radio, 
  ChevronDown, 
  Activity, 
  ExternalLink,
  Wifi,
  WifiOff
} from 'lucide-react';

export default function Navbar({
  isEmergency,
  hasAttentionRequired = false,
  onAmbulanceClick,
  simMode,
  setSimMode,
  hardwareStatus,
  userLocation,
  onOpenDiagnostics
}) {
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const isHwOnline = Boolean(hardwareStatus?.online);

  // Determine central House Health State
  let houseState = {
    label: 'Home Healthy',
    subtext: 'All living zones optimal',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    dot: 'bg-emerald-400',
    icon: ShieldCheck
  };

  if (isEmergency) {
    houseState = {
      label: 'Emergency Alert',
      subtext: 'Immediate action triggered',
      color: 'text-rose-400',
      bg: 'bg-rose-950/60 border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.4)] animate-pulse',
      dot: 'bg-rose-500 animate-ping',
      icon: ShieldAlert
    };
  } else if (hasAttentionRequired) {
    houseState = {
      label: 'Attention Required',
      subtext: 'Sensor threshold alert',
      color: 'text-amber-400',
      bg: 'bg-amber-950/40 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
      dot: 'bg-amber-400 animate-pulse',
      icon: AlertTriangle
    };
  }

  const StateIcon = houseState.icon;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#080B12]/90 border-b border-white/[0.07] shadow-xl transition-all">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        
        {/* LEFT: Logo & System Identity */}
        <div className="flex items-center gap-3.5 min-w-max">
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <span className="text-white font-black text-lg tracking-wider">A</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-[#080B12] animate-pulse"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white font-sans">
                AURA
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 font-semibold tracking-wider">
                EDGE OS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block leading-tight">
              Autonomous Residential Intelligence
            </p>
          </div>
        </div>

        {/* CENTER: House Health Badge (Level 2 Home State) */}
        <div className="flex items-center justify-center">
          <div className={`flex items-center gap-2.5 px-4 py-1.5 rounded-full border transition-all duration-300 ${houseState.bg}`}>
            <span className={`w-2 h-2 rounded-full ${houseState.dot}`}></span>
            <div className="flex items-center gap-1.5">
              <StateIcon className={`w-4 h-4 ${houseState.color}`} />
              <span className={`text-xs font-bold tracking-wide ${houseState.color}`}>
                {houseState.label}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-normal hidden md:inline border-l border-white/10 pl-2">
              {houseState.subtext}
            </span>
          </div>
        </div>

        {/* RIGHT: Combined Expandable Status, Mode Switcher & Emergency Action */}
        <div className="flex items-center gap-2.5">
          
          {/* Unified System Status Trigger */}
          <button
            onClick={onOpenDiagnostics}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 text-xs font-mono transition-all group active:scale-95 shadow-sm"
            title="Click to view detailed ESP32, MQTT & AI diagnostics"
          >
            <span className={`w-2 h-2 rounded-full ${isHwOnline || simMode ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
              SYSTEM {isHwOnline || simMode ? 'ONLINE' : 'ATTENTION'}
            </span>
            <span className="text-slate-500 hidden lg:inline">•</span>
            <span className="text-slate-400 hidden lg:inline">ESP32 ×2</span>
            <span className="text-slate-500 hidden xl:inline">•</span>
            <span className="text-cyan-400/90 hidden xl:inline">AI Active</span>
            <Activity className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 ml-0.5 transition-colors" />
          </button>

          {/* Mode Selector: Hardware vs Simulator */}
          <div className="relative">
            <button
              onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all ${
                !simMode
                  ? 'bg-blue-950/60 border-blue-500/50 text-blue-300'
                  : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
              }`}
            >
              {!simMode ? <Cpu className="w-3.5 h-3.5 text-blue-400" /> : <Radio className="w-3.5 h-3.5 text-cyan-400" />}
              <span className="font-semibold">
                {!simMode ? 'Hardware' : 'Simulator'}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${!simMode && !isHwOnline ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {modeDropdownOpen && (
              <div 
                className="absolute right-0 mt-1.5 w-48 rounded-xl bg-[#0D1322] border border-white/10 shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 font-mono text-xs"
                onMouseLeave={() => setModeDropdownOpen(false)}
              >
                <div className="px-2.5 py-1 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Operating Mode
                </div>
                <button
                  onClick={() => { setSimMode(false); setModeDropdownOpen(false); }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    !simMode ? 'bg-blue-950 text-blue-300 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Hardware Mode</span>
                  </div>
                  <span className={`text-[10px] ${isHwOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isHwOnline ? '● Live' : '○ Offline'}
                  </span>
                </button>
                <button
                  onClick={() => { setSimMode(true); setModeDropdownOpen(false); }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    simMode ? 'bg-cyan-950 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Simulator Mode</span>
                  </div>
                  <span className="text-[10px] text-emerald-400">● Ready</span>
                </button>
              </div>
            )}
          </div>

          {/* Resident Live GPS Location Pin */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-xl border border-white/10">
            <a
              id="btn-maps-gps"
              href="https://maps.app.goo.gl/D9f7LoYF84iTTBmq9"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-all cursor-pointer text-xs font-mono"
              title="Open Resident Location: https://maps.app.goo.gl/D9f7LoYF84iTTBmq9"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">GPS Map</span>
            </a>
          </div>

        </div>

      </div>
    </header>
  );
}
