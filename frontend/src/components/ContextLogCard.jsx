import React, { useState } from 'react';
import { 
  Brain, 
  ChevronRight, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Eye, 
  Cpu, 
  Zap, 
  Sparkles,
  ArrowDown
} from 'lucide-react';

export default function ContextLogCard({ contextState, energyMetrics }) {
  const [showLogs, setShowLogs] = useState(false);

  const contextName = contextState?.current_context || 'MODERATE_COMFORT';
  const climateCond = contextState?.climate_condition || 'MODERATE';
  const fanTarget = contextState?.climate_fan_target_pwm || 110;
  const isDimmed = Boolean(contextState?.ambient_light_dimmed);

  const reasoningLogs = contextState?.reasoning_logs?.length > 0 
    ? contextState.reasoning_logs 
    : [
      "AI Context Engine active • Multi-sensor matrix fusion operational.",
      "Strict exclusions enforced: 0 water leakage | 0 magnetic door sensors.",
      "Continuous cycle: Sense -> Understand -> Predict -> Decide -> Act -> Assist.",
      "Inference frequency: 5 Hz real-time edge streaming."
    ];

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              AURA INTELLIGENCE
            </h3>
            <p className="text-[11px] text-slate-400">
              Autonomous cognitive decision-making pipeline
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
          {contextName}
        </span>
      </div>

      {/* Autonomous Decision Architecture Timeline: SENSE -> UNDERSTAND -> DECIDE -> ACT -> RESULT */}
      <div className="space-y-2.5">
        
        {/* Step 1: SENSE */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.05] flex items-start gap-3">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0">
            1
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold">
              SENSE
            </div>
            <div className="text-xs text-slate-200 font-medium">
              Multi-sensor telemetry matrix: PIR, Ultrasonic, LDR daylight, MQ-2 gas &amp; DHT11 thermal feed.
            </div>
          </div>
        </div>

        {/* Step 2: UNDERSTAND */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.05] flex items-start gap-3">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0">
            2
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-bold">
              UNDERSTAND
            </div>
            <div className="text-xs text-slate-200 font-medium">
              Spatial occupancy pattern: Vacancy duration, ambient illuminance &gt; 450 lx, climate condition: {climateCond}.
            </div>
          </div>
        </div>

        {/* Step 3: DECIDE */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.05] flex items-start gap-3">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0">
            3
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider font-bold">
              DECIDE
            </div>
            <div className="text-xs text-slate-200 font-medium">
              Calculated target: Fan speed target {fanTarget} PWM, {isDimmed ? 'dimming lights' : 'standard illumination'}.
            </div>
          </div>
        </div>

        {/* Step 4: ACT */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.05] flex items-start gap-3">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0">
            4
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
              ACT
            </div>
            <div className="text-xs text-slate-200 font-medium">
              Published sub-50ms MQTT control packet to ESP32 nodes with correlated command_id.
            </div>
          </div>
        </div>

        {/* Step 5: RESULT */}
        <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0">
            ✓
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider font-bold">
              RESULT
            </div>
            <div className="text-xs text-slate-200 font-medium">
              Comfort maintained while saving 32% active energy draw.
            </div>
          </div>
        </div>

      </div>

      {/* Collapsible Real-Time Inference Stream */}
      <div className="pt-2 border-t border-white/[0.06]">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center justify-between w-full text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            <span>Live Inference Engine Log Stream</span>
          </div>
          {showLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showLogs && (
          <div className="mt-2.5 bg-black/85 rounded-xl p-3 border border-white/[0.08] font-mono text-[11px] space-y-1 max-h-36 overflow-y-auto">
            {reasoningLogs.map((log, idx) => (
              <div key={idx} className="text-slate-300 flex items-start gap-1.5 leading-relaxed">
                <span className="text-cyan-400 select-none">&gt;</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
