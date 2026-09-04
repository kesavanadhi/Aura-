import React, { useState, useMemo } from 'react';
import { 
  FlaskConical, 
  Play, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Compass, 
  ExternalLink, 
  Search, 
  X, 
  PhoneCall 
} from 'lucide-react';

export default function JuryDemoControls({ 
  onTriggerStep, 
  onReset, 
  activeStep, 
  simMode, 
  activeTargetInfo,
  onTriggerSOS 
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState(activeStep || 1);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const scenarios = useMemo(() => [
    {
      id: 1,
      name: "Person Enters Bedroom",
      category: "Occupancy",
      desc: "PIR motion sensor detects human entry into bedroom. AURA immediately commands Bedroom Light ON and spins Ceiling Fan to 43% comfort speed.",
      sensorTrigger: "PIR Motion = Active (High) in Bedroom",
      aiDecision: "Adaptive Occupancy Rule -> Restore resident comfort",
      actuatorAction: "Bedroom Light -> ON | Bedroom Fan -> 110 PWM (43%)",
      flow: ["PIR Motion Sensed", "Occupancy Validated", "Bedroom Light ON", "Fan 43% Started"],
      targetCard: "card-digital-twin",
      targetTab: "overview",
      targetDesc: "Bedroom Digital Twin & Light Controls"
    },
    {
      id: 2,
      name: "Daylight LDR Dimming",
      category: "Lighting",
      desc: "Ambient daylight lux exceeds 650 lx from window. AURA autonomously dims artificial lighting, showing only light-related controllers.",
      sensorTrigger: "LDR Daylight Lux > 650 lx in Bedroom",
      aiDecision: "Energy Harvesting Rule -> Shed redundant artificial lumens",
      actuatorAction: "Bedroom Light -> Dimmed / OFF | Curtains -> 90° Open",
      flow: ["Ambient Lux >650 lx", "High Natural Light", "Bedroom Light Dimmed", "Energy Conserved"],
      targetCard: "card-device-controls",
      targetTab: "controls",
      deviceFilter: "lights",
      targetDesc: "Smart Actuator Controls (Light Controllers Only)"
    },
    {
      id: 3,
      name: "Climate Fan Modulation",
      category: "Climate",
      desc: "Temperature drops below 22°C (rain/cold). AURA reduces fan speed, showing only fan-related controllers.",
      sensorTrigger: "Ambient Temperature < 22°C (Cold/Rain)",
      aiDecision: "Thermal Modulation Rule -> Eliminate cold draft",
      actuatorAction: "Ceiling Fan Target -> 0 PWM (Standby)",
      flow: ["Ambient Temp <22°C", "Rain / Cold Detected", "PWM Reduced to 0", "Chill Prevented"],
      targetCard: "card-device-controls",
      targetTab: "controls",
      deviceFilter: "fans",
      targetDesc: "Smart Actuator Controls (Fan Controllers Only)"
    },
    {
      id: 4,
      name: "Google Assistant Voice",
      category: "Voice",
      desc: "Resident speaks voice command ('Turn on kitchen light'). Google Assistant NLP parses intent and executes correlated MQTT packet.",
      sensorTrigger: "Microphone Audio Stream -> Web Speech API",
      aiDecision: "NLP Intent Classification -> Kitchen Light Actuation",
      actuatorAction: "Kitchen Light -> ON | Spoken Feedback Delivered",
      flow: ["Wake Word Spoken", "NLP Intent Parsed", "Actuator Executed", "Voice Confirmation"],
      targetCard: "card-voice-assistant",
      targetTab: "voice",
      targetDesc: "Voice Assistant Hub"
    },
    {
      id: 5,
      name: "Dynamic Indoor Route (A*)",
      category: "Guidance",
      desc: "Calculates optimal obstacle-free indoor navigation route from Bedroom to Kitchen across corridor waypoints.",
      sensorTrigger: "Navigation Destination Request -> Kitchen",
      aiDecision: "A* Spatial Graph Solver -> Compute safe waypoint sequence",
      actuatorAction: "Verified Safe Route -> Bedroom -> Hall -> Kitchen",
      flow: ["Route Requested", "A* Algorithm Runs", "Waypoints Verified", "Turn-by-Turn Audio"],
      targetCard: "card-digital-twin",
      targetTab: "twin",
      targetDesc: "Digital Twin 2D Navigation Path"
    },
    {
      id: 6,
      name: "Obstacle Dynamic Bypass",
      category: "Guidance",
      desc: "Hallway ultrasonic sensor detects obstacle within 45 cm. AURA instantly flags blockage and dynamically recalculates bypass route.",
      sensorTrigger: "Hallway Ultrasonic Ping < 45 cm (Obstacle Detected)",
      aiDecision: "Dynamic Reroute Engine -> Invalidate blocked hallway node",
      actuatorAction: "Instant Bypass Path Generated -> Audio guidance updated",
      flow: ["Hall Ping <45cm", "Obstacle Flagged", "A* Reroutes Instantly", "Safe Path Verified"],
      targetCard: "card-digital-twin",
      targetTab: "twin",
      targetDesc: "Digital Twin Obstacle Reroute"
    },
    {
      id: 7,
      name: "Fall Detection AI (Pose)",
      category: "Safety",
      desc: "Edge computer vision pose estimation detects rapid resident fall. Displays live pose skeleton using laptop camera.",
      sensorTrigger: "Laptop Camera MediaPipe Pose -> Fall Pattern Confirmed",
      aiDecision: "Life-Safety Rule -> Immediate local rescue protocol",
      actuatorAction: "Rescue Piezo Buzzer -> ACTIVE | All Zone Lights -> ON",
      flow: ["Camera Pose Detected", "Emergency Alert Triggered", "Piezo Buzzer & Lights ON", "SOS Ready"],
      targetCard: "card-fall-ai",
      targetTab: "fall",
      targetDesc: "Fall Detection AI (Laptop Camera Pose Stream)"
    },
    {
      id: 8,
      name: "Critical Fall Alert & Triage",
      category: "Safety",
      desc: "Multimodal triage summarizes resident visual evidence. Features SOS button to immediately trigger the emergency call.",
      sensorTrigger: "Unresponsive Resident Post-Fall Confirmation",
      aiDecision: "Emergency Triage Pipeline -> Multimodal Incident Briefing",
      actuatorAction: "Trigger SOS Emergency Call | Emergency Services & Rescue Dispatched",
      flow: ["Multimodal Triage", "Resident Visual Snapshot", "SOS Emergency Call Triggered", "GPS Transmitted"],
      targetCard: "card-fall-ai",
      targetTab: "fall",
      isSOS: true,
      targetDesc: "Critical Fall Alert & SOS Emergency Call"
    },
    {
      id: 9,
      name: "MQ-2 Gas & Heat Exhaust",
      category: "Safety",
      desc: "Kitchen MQ-2 sensor detects combustible gas or heat rise above threshold. AURA forces kitchen exhaust fan to 100% turbo evacuation.",
      sensorTrigger: "MQ-2 Gas Index > 500 ppm or Temp > 35°C",
      aiDecision: "Hazard Mitigation Rule -> Force proportional turbo evacuation",
      actuatorAction: "Kitchen Exhaust Fan -> 100% Turbo Evacuation",
      flow: ["Gas / Heat Rise", "Safety Threshold Exceeded", "Exhaust Fan 100% Turbo", "Evacuation Alert"],
      targetCard: "card-safety-guardian",
      targetTab: "safety",
      targetDesc: "Safety Guardian (Gas & Exhaust Fan)"
    },
    {
      id: 10,
      name: "Vacant Energy Cutoff",
      category: "Energy",
      desc: "All living zones remain vacant for >45 seconds. AURA automatically cuts power to idle lights and fans, logging cumulative Wh saved.",
      sensorTrigger: "Continuous Vacancy Timer > 45 Seconds across All Zones",
      aiDecision: "Eco Standby Optimization -> Zero phantom energy draw",
      actuatorAction: "Idle Lights & Fans -> OFF | +32% Cumulative Savings Logged",
      flow: ["Room Vacant >45s", "Auto Cutoff Triggered", "All Loads Standby", "Cumulative Savings Logged"],
      targetCard: "card-energy-analytics",
      targetTab: "energy",
      targetDesc: "Energy Analytics & Auto-Cutoff"
    }
  ], []);

  const categories = useMemo(() => {
    return ['All', 'Occupancy', 'Lighting', 'Climate', 'Voice', 'Guidance', 'Safety', 'Energy'];
  }, []);

  const filteredScenarios = useMemo(() => {
    return scenarios.filter(s => {
      const matchCategory = selectedCategory === 'All' || s.category === selectedCategory;
      const q = searchFilter.trim().toLowerCase();
      if (!q) return matchCategory;
      const matchText = 
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.sensorTrigger.toLowerCase().includes(q) ||
        s.actuatorAction.toLowerCase().includes(q);
      return matchCategory && matchText;
    });
  }, [scenarios, selectedCategory, searchFilter]);

  const currentScenario = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0];

  const handleRun = (scenarioToRun = currentScenario) => {
    setSelectedScenarioId(scenarioToRun.id);
    if (onTriggerStep) {
      onTriggerStep(
        scenarioToRun.id, 
        scenarioToRun.targetCard, 
        scenarioToRun.targetDesc, 
        scenarioToRun.targetTab,
        scenarioToRun.deviceFilter
      );
    }
  };

  const handleSelectScenario = (scen) => {
    setSelectedScenarioId(scen.id);
    if (onTriggerStep) {
      onTriggerStep(
        scen.id, 
        scen.targetCard, 
        scen.targetDesc, 
        scen.targetTab,
        scen.deviceFilter
      );
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 shadow-xl transition-all">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex-shrink-0">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                SCENARIO LAB
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-700/60 font-semibold">
                10 Living Scenarios
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Simulate and inspect edge AI reasoning, sensor triggers &amp; hardware actuation in real time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-all border border-white/10 active:scale-95 shadow-sm"
            title="Reset system to clean baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset System</span>
            <span className="sm:hidden">Reset</span>
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 transition-all"
            title={isCollapsed ? "Expand Scenario Lab" : "Collapse Scenario Lab"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Scenario Engine */}
      {!isCollapsed && (
        <div className="mt-4 pt-3.5 border-t border-white/[0.06] space-y-3.5">
          
          {/* SEARCH BOX & QUICK FILTER ROW */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Real-time Search Box */}
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search scenario title, sensor, or keyword (e.g. Person Enters, Gas, Fan, Fall)..."
                className="w-full bg-slate-900/90 border border-white/15 rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 shadow-inner"
              />
              {searchFilter && (
                <button 
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Run Current Scenario Button */}
            <button
              onClick={() => handleRun(currentScenario)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/25 active:scale-95 flex-shrink-0"
              title="Execute selected scenario and inspect target component"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Run Scenario {currentScenario.id} &amp; Open Tab</span>
            </button>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono no-scrollbar">
            <span className="text-slate-500 text-[10px] uppercase font-semibold mr-1 flex-shrink-0">Filter:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60 font-bold shadow-sm'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 border border-white/[0.05]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Scenario Selection Cards Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[168px] overflow-y-auto pr-1">
            {filteredScenarios.length > 0 ? (
              filteredScenarios.map((scen) => {
                const isSelected = scen.id === currentScenario.id;
                return (
                  <button
                    key={scen.id}
                    onClick={() => handleSelectScenario(scen)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all group ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-500/70 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400/40'
                        : 'bg-slate-900/40 hover:bg-slate-800/60 border-white/[0.06] text-slate-300'
                    }`}
                  >
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                      isSelected ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400'
                    }`}>
                      #{scen.id}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                        {scen.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {scen.category} • {scen.targetDesc.split('(')[0]}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="col-span-full p-4 text-center text-xs font-mono text-slate-500 bg-slate-900/30 rounded-xl">
                No scenarios matched "{searchFilter}". Try another title or select "All".
              </div>
            )}
          </div>

          {/* ACTIVE SELECTED SCENARIO DETAIL CARD */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.08] space-y-3 font-mono shadow-lg">
            
            {/* Title, Category & Direct Action Link */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white font-sans">
                    Scenario {currentScenario.id}: {currentScenario.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/60 font-semibold">
                    {currentScenario.category}
                  </span>
                  {currentScenario.deviceFilter && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold">
                      Filters: {currentScenario.deviceFilter === 'lights' ? '💡 Lights Only' : '🌀 Fans Only'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed">
                  {currentScenario.desc}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                
                {/* PROMINENT SOS BUTTON FOR SCENARIO 8 */}
                {currentScenario.id === 8 && (
                  <button
                    onClick={() => {
                      if (onTriggerSOS) onTriggerSOS();
                      handleRun(currentScenario);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/50 active:scale-95 glow-red border border-red-400/60 animate-pulse"
                    title="Click to trigger emergency SOS call immediately"
                  >
                    <PhoneCall className="w-4 h-4 animate-bounce" />
                    <span>🚨 SOS EMERGENCY CALL</span>
                  </button>
                )}

                <button
                  onClick={() => handleRun(currentScenario)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 hover:text-white text-xs transition-all active:scale-95 whitespace-nowrap shadow-sm shadow-cyan-950"
                  title={`Open ${currentScenario.targetTab} tab and highlight ${currentScenario.targetDesc}`}
                >
                  <Compass className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>Open Tab: {currentScenario.targetTab.toUpperCase()}</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                </button>
              </div>
            </div>

            {/* 3-Step Execution Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-white/[0.05]">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                  1. Sensor Trigger
                </span>
                <span className="text-cyan-300 font-semibold leading-snug block">
                  {currentScenario.sensorTrigger}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-white/[0.05]">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                  2. Edge AI Reasoning
                </span>
                <span className="text-indigo-300 font-semibold leading-snug block">
                  {currentScenario.aiDecision}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-white/[0.05]">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                  3. Actuator Action
                </span>
                <span className="text-emerald-400 font-semibold leading-snug block">
                  {currentScenario.actuatorAction}
                </span>
              </div>
            </div>

            {/* Workflow Progression Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-slate-400">
              <span className="text-slate-500 font-semibold">Live Workflow:</span>
              {currentScenario.flow.map((step, idx) => (
                <React.Fragment key={idx}>
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-white/[0.05] text-slate-300">
                    {step}
                  </span>
                  {idx < currentScenario.flow.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
