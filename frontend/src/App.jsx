import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DigitalTwinMap from './components/DigitalTwinMap';
import FallEmergencyModal from './components/FallEmergencyModal';
import SafetyGuardianCard from './components/SafetyGuardianCard';
import VoiceAssistantCard from './components/VoiceAssistantCard';
import ContextLogCard from './components/ContextLogCard';
import EnergyAnalyticsCard from './components/EnergyAnalyticsCard';
import DeviceControlsCard from './components/DeviceControlsCard';
import JuryDemoControls from './components/JuryDemoControls';
import MQTTDiagnosticPanel from './components/MQTTDiagnosticPanel';
import EnvironmentCard from './components/EnvironmentCard';
import FallDetectionAICard from './components/FallDetectionAICard';

import { 
  Home, 
  Layers, 
  Sliders, 
  ShieldAlert, 
  CloudSun, 
  Zap, 
  Mic, 
  Activity,
  HelpCircle,
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Video
} from 'lucide-react';

export default function App() {
  // Baseline Simulator Telemetry
  const [simTelemetry, setSimTelemetry] = useState({
    bedroom: { occupancy: false, ambient_lux: 450, curtain_state: 'OPEN' },
    hall: { occupancy: false, obstacle_distance_cm: 140.0 },
    kitchen: { gas_ppm: 220, temperature_c: 24.5, humidity_pct: 55.0 },
    bathroom: { occupancy: false, obstacle_distance_cm: 120.0 }
  });

  // Physical Hardware Telemetry (From ESP32 Nodes)
  const [hardwareTelemetry, setHardwareTelemetry] = useState(null);

  // Hardware Connection Status
  const [hardwareStatus, setHardwareStatus] = useState({
    online: false,
    broker_connected: false,
    node1_online: false,
    node2_online: false
  });

  // Actuator States
  const [actuators, setActuators] = useState({
    bedroom_light: false,
    bedroom_fan_pwm: 0,
    curtain_servo_angle: 90,
    hall_light: false,
    hall_fan_pwm: 0,
    buzzer_active: false,
    kitchen_light: false,
    exhaust_fan: false,
    exhaust_fan_speed_pct: 0,
    bathroom_light: false
  });

  const [contextState, setContextState] = useState({
    current_context: 'ECO_STANDBY',
    ambient_light_dimmed: false,
    climate_condition: 'MODERATE',
    climate_fan_target_pwm: 110,
    reasoning_logs: []
  });

  const [energyMetrics, setEnergyMetrics] = useState({
    current_power_watts: 152.8,
    cumulative_saved_kwh: 0.9258,
    last_auto_shutdown_event: "Auto-cutoff active • Vacancy monitoring >45s"
  });

  const [activeEmergency, setActiveEmergency] = useState(null);
  const [navResult, setNavResult] = useState(null);
  const [obstacles, setObstacles] = useState([]);
  const [voiceResponse, setVoiceResponse] = useState(null);
  const [activeStep, setActiveStep] = useState(null);
  const [activeTargetInfo, setActiveTargetInfo] = useState(null);
  const [highlightedCard, setHighlightedCard] = useState(null);
  const [simMode, setSimMode] = useState(true); // true = Simulator, false = Hardware
  const [activeTab, setActiveTab] = useState('overview'); 
  const [deviceFilter, setDeviceFilter] = useState('all'); // 'all' | 'lights' | 'fans'
  const [manualOverrides, setManualOverrides] = useState({});
  const [deviceStates, setDeviceStates] = useState(null);
  const [mqttDiagnostics, setMqttDiagnostics] = useState(null);

  // Modals
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);

  // Live Resident Geolocation
  const [userLocation, setUserLocation] = useState({
    lat: 12.9716,
    lon: 77.5946,
    areaName: 'Detecting Location...',
    mapsUrl: 'https://maps.app.goo.gl/D9f7LoYF84iTTBmq9'
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({
            lat: latitude,
            lon: longitude,
            areaName: `Live GPS (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
            mapsUrl: 'https://maps.app.goo.gl/D9f7LoYF84iTTBmq9'
          });
        },
        async () => {
          try {
            const r = await fetch('https://ipapi.co/json/');
            if (r.ok) {
              const d = await r.json();
              if (d.latitude && d.longitude) {
                setUserLocation({
                  lat: d.latitude,
                  lon: d.longitude,
                  areaName: `${d.city || 'Local Area'}, ${d.region_code || d.country_name || ''}`,
                  mapsUrl: 'https://maps.app.goo.gl/D9f7LoYF84iTTBmq9'
                });
              }
            }
          } catch (e) {}
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    }
  }, []);

  // Active telemetry stream
  const currentTelemetry = simMode ? simTelemetry : (hardwareStatus.online ? hardwareTelemetry : null);

  // Real-Time WebSocket Connection
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('ws://localhost:8000/ws/telemetry');

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.sim_telemetry) {
              setSimTelemetry(data.sim_telemetry);
            } else if (data.telemetry && simMode) {
              setSimTelemetry(data.telemetry);
            }

            if (data.hardware_telemetry !== undefined) {
              setHardwareTelemetry(data.hardware_telemetry);
            }

            if (data.hardware_status) {
              setHardwareStatus(data.hardware_status);
            }

            if (data.actuators) setActuators(data.actuators);
            if (data.device_states) setDeviceStates(data.device_states);
            if (data.mqtt_diagnostics) setMqttDiagnostics(data.mqtt_diagnostics);
            if (data.manual_overrides !== undefined) setManualOverrides(data.manual_overrides);
            if (data.context) setContextState(data.context);
            if (data.energy) setEnergyMetrics(data.energy);
            if (data.active_emergency !== undefined) setActiveEmergency(data.active_emergency);
          } catch (err) {
            console.error('WebSocket parse error:', err);
          }
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWebSocket, 1500);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connectWebSocket, 2000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [simMode]);

  // Initial hardware check
  useEffect(() => {
    const checkHw = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/hardware/status');
        if (res.ok) {
          const data = await res.json();
          if (data.hardware) setHardwareStatus(data.hardware);
          if (data.telemetry) setHardwareTelemetry(data.telemetry);
        }
      } catch (e) {}
    };
    checkHw();
  }, []);

  // Device Actuation Override
  const handleToggleDevice = async (device, state) => {
    setActuators((prev) => {
      const updated = { ...prev, [device]: state };
      if (device === 'exhaust_fan') {
        updated.exhaust_fan_speed_pct = state ? 100 : 0;
      } else if (device === 'exhaust_fan_speed_pct') {
        updated.exhaust_fan = state > 0;
      }
      return updated;
    });

    setManualOverrides((prev) => ({ ...prev, [device]: state }));

    try {
      const res = await fetch('http://localhost:8000/api/control/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device, state })
      });
      const data = await res.json();
      if (data.actuators) setActuators(data.actuators);
      if (data.active_overrides) setManualOverrides(data.active_overrides);
    } catch (err) {
      console.error('Device override failed:', err);
    }
  };

  // Reset Auto Mode
  const handleResetAutoMode = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/control/reset-auto', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.actuators) setActuators(data.actuators);
      setManualOverrides({});
    } catch (err) {
      console.error('Reset auto mode failed:', err);
    }
  };

  // Adjust Simulation
  const handleAdjustSimulation = async (adjustments) => {
    setSimTelemetry((prev) => {
      const updated = { ...prev };
      if (adjustments.kitchen_temp !== undefined) {
        updated.kitchen = { ...updated.kitchen, temperature_c: adjustments.kitchen_temp };
      }
      if (adjustments.gas_ppm !== undefined) {
        updated.kitchen = { ...updated.kitchen, gas_ppm: adjustments.gas_ppm };
      }
      return updated;
    });

    try {
      await fetch('http://localhost:8000/api/simulator/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustments)
      });
    } catch (err) {
      console.warn('Simulator adjust error:', err);
    }
  };

  // Switch Mode
  const handleModeSwitch = async (mode) => {
    setSimMode(mode);
    try {
      await fetch('http://localhost:8000/api/simulator/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: mode })
      });
    } catch (err) {
      console.warn('Mode switch error:', err);
    }
  };

  // Voice Command
  const handleVoiceCommand = async (transcript) => {
    try {
      const res = await fetch('http://localhost:8000/api/voice/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      });
      if (res.ok) {
        const data = await res.json();
        setVoiceResponse(data);
        if (data.actuators) setActuators(data.actuators);
      }
    } catch (err) {
      console.warn('Voice API error:', err);
    }
  };

  // Emergency Handlers
  const handleDismissEmergency = async () => {
    try {
      await fetch('http://localhost:8000/api/emergency/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Dismissed by resident from dashboard' })
      });
      setActiveEmergency(null);
    } catch (err) {
      console.error('Dismiss failed:', err);
    }
  };

  const handleCallAmbulance = async () => {
    try {
      await fetch('http://localhost:8000/api/emergency/ambulance/call', { method: 'POST' });
      alert(`108 EMERGENCY HELPLINE DISPATCHED!\nResident Location: ${userLocation.areaName}\nLive Google Maps Route: ${userLocation.mapsUrl}`);
    } catch (err) {
      alert("Dialing 108 Emergency Ambulance Helpline...");
    }
  };

  const handleSimulateGas = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/emergency/hazard/simulate', { method: 'POST' });
      const data = await res.json();
      if (data.incident) setActiveEmergency(data.incident);
    } catch (err) {
      console.error('Simulate gas failed:', err);
    }
  };

  // Scenario Step Trigger with Auto-Scroll, Highlighting, Filter & Tab Opening
  const handleTriggerStep = async (stepId, targetCardId, targetDesc, targetTab, filter) => {
    setActiveStep(stepId);
    setActiveTargetInfo({ stepId, targetDesc, stepLabel: `Scenario ${stepId}` });

    // Apply device filter if specified
    if (filter) {
      setDeviceFilter(filter);
    } else if (targetTab === 'controls') {
      setDeviceFilter('all');
    }

    // Critical Fall Alert & Triage initialization
    if (stepId === 8) {
      setActiveEmergency({
        type: 'POSSIBLE_FALL',
        person: 'Registered Resident',
        room: 'Bedroom',
        timestamp: new Date().toLocaleTimeString(),
        gemini_triage_summary: 'Subject detected in horizontal prone posture. Immediate SOS dispatch recommended.',
        ambulance_dispatch: {
          gps_coordinates: `${userLocation.lat?.toFixed(4)}, ${userLocation.lon?.toFixed(4)}`,
          status: 'SOS_READY'
        }
      });
    }

    // Open related tab whenever targetTab is specified
    if (targetTab) {
      setActiveTab(targetTab);
    }

    // Smooth scroll and highlight related element after tab mount
    setTimeout(() => {
      const elId = targetCardId || 'card-digital-twin';
      const el = document.getElementById(elId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedCard(elId);
        setTimeout(() => {
          setHighlightedCard(null);
        }, 3200);
      }
    }, 180);

    try {
      const res = await fetch(`http://localhost:8000/api/simulator/step/${stepId}`, { method: 'POST' });
      const data = await res.json();
      if (data.voice_response) setVoiceResponse({ spoken_feedback: data.voice_response });
    } catch (err) {
      console.error(`Step ${stepId} trigger failed:`, err);
    }
  };

  const handleResetDemo = async () => {
    setActiveStep(null);
    setActiveEmergency(null);
    setActiveTargetInfo(null);
    setHighlightedCard(null);
    try {
      await fetch('http://localhost:8000/api/simulator/reset', { method: 'POST' });
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  // Determine if attention is required
  const gasVal = currentTelemetry?.kitchen?.gas_ppm || 220;
  const tempVal = currentTelemetry?.kitchen?.temperature_c || 24.5;
  const hasAttentionRequired = gasVal >= 500 || tempVal > 35 || obstacles.length > 0;

  // Overview Hero Metrics Data
  const isAnyOccupied = Boolean(currentTelemetry?.bedroom?.occupancy || currentTelemetry?.hall?.occupancy || currentTelemetry?.bathroom?.occupancy);

  const getCardWrapperClass = (cardId) => {
    const isHighlighted = highlightedCard === cardId;
    return `transition-all duration-500 rounded-2xl ${
      isHighlighted 
        ? 'ring-4 ring-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.6)] transform scale-[1.01]' 
        : ''
    }`;
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      
      {/* Top Application Header Shell */}
      <Navbar
        isEmergency={activeEmergency !== null}
        hasAttentionRequired={hasAttentionRequired}
        onAmbulanceClick={handleCallAmbulance}
        simMode={simMode}
        setSimMode={handleModeSwitch}
        hardwareStatus={hardwareStatus}
        userLocation={userLocation}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 p-4 md:p-6 max-w-[1680px] w-full mx-auto space-y-5">
        
        {/* Scenario Lab (Collapsible Scenario Engine) */}
        <JuryDemoControls
          onTriggerStep={handleTriggerStep}
          onReset={handleResetDemo}
          activeStep={activeStep}
          simMode={simMode}
          activeTargetInfo={activeTargetInfo}
          onTriggerSOS={handleCallAmbulance}
        />

        {/* Primary Horizontal Navigation Tabs (Dedicated Views) */}
        <nav className="flex items-center justify-between border-b border-white/[0.07] pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/10 text-xs font-mono shadow-inner overflow-x-auto">
            
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Home className="w-3.5 h-3.5 text-cyan-400" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('twin')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'twin'
                  ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Digital Twin</span>
            </button>

            <button
              onClick={() => setActiveTab('controls')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'controls'
                  ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Smart Controls</span>
            </button>

            <button
              onClick={() => setActiveTab('fall')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'fall'
                  ? 'bg-gradient-to-r from-red-600/30 to-rose-600/30 text-rose-300 font-bold border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-rose-400" />
              <span>Fall Detection AI</span>
            </button>

            <button
              onClick={() => setActiveTab('safety')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'safety'
                  ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Safety</span>
            </button>

            <button
              onClick={() => setActiveTab('climate')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'climate'
                  ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CloudSun className="w-3.5 h-3.5 text-amber-400" />
              <span>Climate</span>
            </button>

            <button
              onClick={() => setActiveTab('energy')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'energy'
                  ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Energy</span>
            </button>

            <button
              onClick={() => setActiveTab('voice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'voice'
                  ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-blue-400" />
              <span>Voice</span>
            </button>

            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'diagnostics'
                  ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Diagnostics</span>
            </button>

          </div>

          <div className="text-xs font-mono text-slate-400 hidden lg:flex items-center gap-2">
            <span>Residential OS:</span>
            <span className="text-emerald-400 font-bold">5 Hz Live Sync</span>
          </div>
        </nav>

        {/* =========================================================================
            VIEW 1: OVERVIEW PAGE (3-Column Intelligent Command Center)
           ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            
            {/* Top Overview Section: Large Hero Card (AURA Home Status) */}
            <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Left: Headline & AI House State */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold">
                      AURA Home Status
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold">
                      Autonomous Active
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {activeEmergency 
                      ? "Emergency Action Active — Alerting Resident & Helpline" 
                      : hasAttentionRequired 
                        ? "Sensor Attention Required — Automatic Compensation Active" 
                        : "Everything is operating normally."}
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Sense → Understand → Predict → Decide → Act • Sub-50ms Edge IoT closed loop
                  </p>
                </div>

                {/* Right: 5 Compact Level 2 Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-xs">
                  
                  {/* Metric 1: Temperature */}
                  <div className="glass-card rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 block">Temperature</span>
                    <span className="text-base font-bold text-white">{tempVal}°C</span>
                  </div>

                  {/* Metric 2: Air Quality */}
                  <div className="glass-card rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 block">Air Quality</span>
                    <span className={`text-base font-bold ${gasVal >= 500 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {gasVal >= 1200 ? 'Hazard' : gasVal >= 500 ? 'Elevated' : 'Good'}
                    </span>
                  </div>

                  {/* Metric 3: Occupancy */}
                  <div className="glass-card rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 block">Occupancy</span>
                    <span className="text-base font-bold text-cyan-300 truncate block">
                      {isAnyOccupied ? 'Active' : 'Vacant'}
                    </span>
                  </div>

                  {/* Metric 4: Active Energy */}
                  <div className="glass-card rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 block">Power</span>
                    <span className="text-base font-bold text-emerald-400">{energyMetrics.current_power_watts}W</span>
                  </div>

                  {/* Metric 5: Safety */}
                  <div className="glass-card rounded-xl p-2.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block">Safety</span>
                    <span className={`text-base font-bold ${activeEmergency ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {activeEmergency ? 'Alert' : '100% Secure'}
                    </span>
                  </div>

                </div>

              </div>

              {/* Sub-Card: CURRENT AI ACTION with "Why?" Button */}
              <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 rounded-xl p-3 border border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                        Current AI Action
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">•</span>
                      <span className="text-[11px] font-mono text-slate-300">
                        {isAnyOccupied 
                          ? "Resident active in room → Adaptive illumination & ventilation maintained"
                          : "Bedroom vacant >45s → Standby eco-cutoff applied to inactive loads"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 mt-1">
                      <span className="text-emerald-400">→ Bed light {actuators.bedroom_light ? 'ON' : 'OFF'}</span>
                      <span>•</span>
                      <span className="text-cyan-300">→ Fan {Math.round((actuators.bedroom_fan_pwm / 255) * 100)}%</span>
                      <span>•</span>
                      <span className="text-emerald-400">→ +32% Energy Saved</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsWhyModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/70 text-cyan-300 hover:text-white text-xs font-mono font-semibold transition-all shadow-sm active:scale-95 whitespace-nowrap self-start sm:self-center"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Why?</span>
                </button>
              </div>

            </div>

            {/* 3-Column Responsive Dashboard Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* LEFT COLUMN (Desktop 4 cols): Smart Actuators (Spacious, No Overlap) */}
              <div className="lg:col-span-4 space-y-5">
                <div id="card-device-controls" className={getCardWrapperClass('card-device-controls')}>
                  <DeviceControlsCard
                    actuators={actuators}
                    deviceStates={deviceStates}
                    onToggleDevice={handleToggleDevice}
                    manualOverrides={manualOverrides}
                    onResetAutoMode={handleResetAutoMode}
                    isHardwareMode={!simMode}
                    isFullView={false}
                    deviceFilter={deviceFilter}
                    onSetDeviceFilter={setDeviceFilter}
                  />
                </div>
              </div>

              {/* CENTER COLUMN (Desktop 5 cols): Hero Digital Twin + AURA Intelligence */}
              <div className="lg:col-span-5 space-y-5">
                <div id="card-digital-twin" className={getCardWrapperClass('card-digital-twin')}>
                  <DigitalTwinMap
                    telemetry={currentTelemetry}
                    actuators={actuators}
                    deviceStates={deviceStates}
                    isHardwareMode={!simMode}
                    hardwareStatus={hardwareStatus}
                    activeEmergency={activeEmergency}
                    navRoute={navResult}
                    obstacles={obstacles}
                    onRoomClick={() => {}}
                  />
                </div>
                <div className={getCardWrapperClass('card-context-log')}>
                  <ContextLogCard
                    contextState={contextState}
                    energyMetrics={energyMetrics}
                  />
                </div>
              </div>

              {/* RIGHT COLUMN (Desktop 3 cols): Safety + Voice + Environment */}
              <div className="lg:col-span-3 space-y-5">
                <div id="card-safety-guardian" className={getCardWrapperClass('card-safety-guardian')}>
                  <SafetyGuardianCard
                    simMode={simMode}
                    telemetry={simTelemetry}
                    hardwareTelemetry={hardwareTelemetry}
                    hardwareStatus={hardwareStatus}
                    actuators={actuators}
                    hazardIncident={activeEmergency?.type !== 'POSSIBLE_FALL' ? activeEmergency : null}
                    onSimulateGas={handleSimulateGas}
                    onAdjustKitchen={handleAdjustSimulation}
                    userLocation={userLocation}
                  />
                </div>
                <div id="card-voice-assistant" className={getCardWrapperClass('card-voice-assistant')}>
                  <VoiceAssistantCard
                    onSendCommand={handleVoiceCommand}
                    lastResponse={voiceResponse}
                    onDirectActuate={handleToggleDevice}
                    telemetry={currentTelemetry}
                  />
                </div>
                <div id="card-environment-climate" className={getCardWrapperClass('card-environment-climate')}>
                  <EnvironmentCard
                    telemetry={currentTelemetry}
                    actuators={actuators}
                  />
                </div>
              </div>

            </div>

          </div>
        )}

        {/* =========================================================================
            VIEW 2: DEDICATED DIGITAL TWIN VIEW
           ========================================================================= */}
        {activeTab === 'twin' && (
          <div className="space-y-5 max-w-5xl mx-auto">
            <div id="card-digital-twin" className={getCardWrapperClass('card-digital-twin')}>
              <DigitalTwinMap
                telemetry={currentTelemetry}
                actuators={actuators}
                deviceStates={deviceStates}
                isHardwareMode={!simMode}
                hardwareStatus={hardwareStatus}
                activeEmergency={activeEmergency}
                navRoute={navResult}
                obstacles={obstacles}
                onRoomClick={() => {}}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ContextLogCard
                contextState={contextState}
                energyMetrics={energyMetrics}
              />
              <EnvironmentCard
                telemetry={currentTelemetry}
                actuators={actuators}
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 3: SMART CONTROLS VIEW
           ========================================================================= */}
        {activeTab === 'controls' && (
          <div className="max-w-5xl mx-auto space-y-5">
            <div id="card-device-controls" className={getCardWrapperClass('card-device-controls')}>
              <DeviceControlsCard
                actuators={actuators}
                deviceStates={deviceStates}
                onToggleDevice={handleToggleDevice}
                manualOverrides={manualOverrides}
                onResetAutoMode={handleResetAutoMode}
                isHardwareMode={!simMode}
                isFullView={true}
                deviceFilter={deviceFilter}
                onSetDeviceFilter={setDeviceFilter}
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 4: FALL DETECTION AI VIEW (LAPTOP CAMERA POSE & SOS)
           ========================================================================= */}
        {activeTab === 'fall' && (
          <div className="max-w-5xl mx-auto space-y-5">
            <div id="card-fall-ai" className={getCardWrapperClass('card-fall-ai')}>
              <FallDetectionAICard
                onTriggerSOS={handleCallAmbulance}
                onSimulateFall={() => handleTriggerStep(7, 'card-fall-ai', 'Fall Pattern Confirmed', 'fall')}
                activeEmergency={activeEmergency}
                userLocation={userLocation}
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 5: SAFETY GUARDIAN VIEW
           ========================================================================= */}
        {activeTab === 'safety' && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div id="card-safety-guardian" className={getCardWrapperClass('card-safety-guardian')}>
              <SafetyGuardianCard
                simMode={simMode}
                telemetry={simTelemetry}
                hardwareTelemetry={hardwareTelemetry}
                hardwareStatus={hardwareStatus}
                actuators={actuators}
                hazardIncident={activeEmergency?.type !== 'POSSIBLE_FALL' ? activeEmergency : null}
                onSimulateGas={handleSimulateGas}
                onAdjustKitchen={handleAdjustSimulation}
                userLocation={userLocation}
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 5: CLIMATE VIEW
           ========================================================================= */}
        {activeTab === 'climate' && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div id="card-environment-climate" className={getCardWrapperClass('card-environment-climate')}>
              <EnvironmentCard
                telemetry={currentTelemetry}
                actuators={actuators}
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 6: ENERGY INTELLIGENCE VIEW
           ========================================================================= */}
        {activeTab === 'energy' && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div id="card-energy-analytics" className={getCardWrapperClass('card-energy-analytics')}>
              <EnergyAnalyticsCard
                energyMetrics={energyMetrics}
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 7: VOICE ASSISTANT VIEW
           ========================================================================= */}
        {activeTab === 'voice' && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div id="card-voice-assistant" className={getCardWrapperClass('card-voice-assistant')}>
              <VoiceAssistantCard
                onSendCommand={handleVoiceCommand}
                lastResponse={voiceResponse}
                onDirectActuate={handleToggleDevice}
                telemetry={currentTelemetry}
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 8: DIAGNOSTICS VIEW
           ========================================================================= */}
        {activeTab === 'diagnostics' && (
          <div className="max-w-5xl mx-auto space-y-5">
            <MQTTDiagnosticPanel
              mqttDiagnostics={mqttDiagnostics}
              hardwareStatus={hardwareStatus}
              deviceStates={deviceStates}
            />
          </div>
        )}

      </main>

      {/* Critical Fall Emergency Modal */}
      {activeEmergency && activeEmergency.type === 'POSSIBLE_FALL' && (
        <FallEmergencyModal
          incident={activeEmergency}
          onDismiss={handleDismissEmergency}
          onCallAmbulance={handleCallAmbulance}
          userLocation={userLocation}
        />
      )}

      {/* "Why?" AI Reasoning Explanation Modal */}
      {isWhyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-xl rounded-3xl border border-cyan-500/40 bg-[#080B14] p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    AURA Cognitive Decision Rationale
                  </h3>
                  <p className="text-xs text-slate-400">
                    Transparent Edge AI reasoning breakdown
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWhyModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <span className="text-[10px] text-cyan-400 font-bold block mb-1 uppercase">1. Sensory Evidence Trigger</span>
                <p className="text-slate-300 font-sans text-xs leading-relaxed">
                  Zone 1 PIR motion sensors registered continuous negative occupancy in the Bedroom for &gt; 45 seconds while ambient daylight lux was 450 lx.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <span className="text-[10px] text-indigo-400 font-bold block mb-1 uppercase">2. Knowledge Graph &amp; Rule Weighting</span>
                <p className="text-slate-300 font-sans text-xs leading-relaxed">
                  The Decision Engine fused environmental metrics (ambient temp: 24.5°C, humidity: 55%). Rule 11 ("Vacant Energy Cutoff") and Rule 3 ("Thermal Modulation") took priority over continuous lighting.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <span className="text-[10px] text-emerald-400 font-bold block mb-1 uppercase">3. Autonomous Actuation Result</span>
                <p className="text-slate-300 font-sans text-xs leading-relaxed">
                  Bedroom light was safely turned OFF, fan was reduced to 110 PWM (43%) to sustain air circulation, preventing approximately 32% active energy wastage without compromising resident safety.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsWhyModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Understood
              </button>
            </div>

          </div>
        </div>
      )}

      {/* System Status Deep Diagnostics Modal */}
      {isDiagnosticsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#080B14] p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    System Health &amp; Hardware Diagnostics
                  </h3>
                  <p className="text-xs text-slate-400">
                    ESP32 Node 1, ESP8266 Node 2, MQTT Broker &amp; Actuator ACK Grounding
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDiagnosticsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <MQTTDiagnosticPanel
              mqttDiagnostics={mqttDiagnostics}
              hardwareStatus={hardwareStatus}
              deviceStates={deviceStates}
            />

          </div>
        </div>
      )}

      {/* Futuristic Command Center Footer */}
      <footer className="glass-panel py-3 px-6 border-t border-white/[0.06] text-center text-xs text-slate-500 font-mono flex flex-wrap items-center justify-center gap-3 mt-auto">
        <span className="text-slate-400 font-semibold">AURA v2.0 EDGE</span>
        <span>•</span>
        <span>Autonomous User-Responsive Residential Assistant</span>
        <span>•</span>
        <span className="text-cyan-400/90">Edge AI + Dual Microcontrollers</span>
        <span>•</span>
        <span>Cognitive Residential Ambient Living Ecosystem</span>
      </footer>

    </div>
  );
}
