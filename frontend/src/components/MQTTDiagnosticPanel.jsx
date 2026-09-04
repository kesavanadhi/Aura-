import React, { useState } from 'react';
import { Activity, Server, Cpu, CheckCircle2, Clock, AlertTriangle, Send, RefreshCw, Terminal, ArrowRightLeft } from 'lucide-react';

export default function MQTTDiagnosticPanel({ mqttDiagnostics, hardwareStatus, deviceStates }) {
  const [isSendingPing, setIsSendingPing] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  const brokerConnected = Boolean(mqttDiagnostics?.broker_connected);
  const nodes = mqttDiagnostics?.nodes || {};
  const node1 = nodes?.esp32_node1 || {};
  const node2 = nodes?.esp8266_node2 || {};
  const lastCommand = mqttDiagnostics?.last_command;
  const lastAck = mqttDiagnostics?.last_ack || deviceStates?.last_ack;

  const getNodeBadge = (status) => {
    if (status === 'LIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          LIVE (&lt;3s)
        </span>
      );
    }
    if (status === 'STALE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-950/80 text-amber-300 border border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          STALE (3-8s)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-950/80 text-rose-300 border border-rose-500/60">
        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
        OFFLINE (&gt;8s)
      </span>
    );
  };

  const handleTestPing = async (nodeId, devKey, val) => {
    setIsSendingPing(true);
    setPingResult(null);
    try {
      const res = await fetch('/api/control/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: devKey, state: val })
      });
      const data = await res.json();
      setPingResult({
        success: res.ok,
        time: new Date().toLocaleTimeString(),
        data
      });
    } catch (e) {
      setPingResult({
        success: false,
        time: new Date().toLocaleTimeString(),
        error: String(e)
      });
    } finally {
      setIsSendingPing(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-cyan-500/30 shadow-2xl space-y-5 bg-slate-950/80 backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                MQTT Bidirectional Diagnostic & Grounding Hub
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 uppercase">
                Real-Time Telemetry Inspection
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Correlated command_id tracing • Real device ACK feedback • Decoupled zero-latency streaming
            </p>
          </div>
        </div>

        {/* Broker Connection Status */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-xl flex items-center gap-2 border font-mono text-xs font-semibold ${
            brokerConnected
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
              : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
          }`}>
            <Server className="w-3.5 h-3.5" />
            <span>Broker: {brokerConnected ? 'CONNECTED' : 'DISCONNECTED'} (Port 1883)</span>
          </div>
        </div>
      </div>

      {/* Nodes Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Node 1: ESP32 Zone 1 */}
        <div className="rounded-xl p-4 bg-slate-900/70 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">ESP32 — Zone 1</span>
            </div>
            {getNodeBadge(node1.status || (hardwareStatus?.node1_online ? 'LIVE' : 'OFFLINE'))}
          </div>

          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Telemetry Topic:</span>
              <span className="text-cyan-300">aura/telemetry/node1</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Control Topic:</span>
              <span className="text-indigo-300">aura/control/node1</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Status ACK Topic:</span>
              <span className="text-emerald-300">aura/status/node1</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Age (Latency):</span>
              <span className={node1.age_ms !== null && node1.age_ms < 3000 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {node1.age_ms !== null ? `${node1.age_ms} ms` : 'No packets'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Last Ingestion:</span>
              <span className="text-slate-300 truncate max-w-[180px]">{node1.last_received || 'Never'}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
            <button
              onClick={() => handleTestPing('esp32_node1', 'bedroom_light', true)}
              disabled={isSendingPing}
              className="flex-1 text-[10px] font-mono py-1.5 px-2.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Send className="w-3 h-3" />
              Test Ping: Bed Light ON
            </button>
            <button
              onClick={() => handleTestPing('esp32_node1', 'bedroom_light', false)}
              disabled={isSendingPing}
              className="flex-1 text-[10px] font-mono py-1.5 px-2.5 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              Bed Light OFF
            </button>
          </div>
        </div>

        {/* Node 2: ESP8266 Zone 2 */}
        <div className="rounded-xl p-4 bg-slate-900/70 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">ESP8266 — Zone 2</span>
            </div>
            {getNodeBadge(node2.status || (hardwareStatus?.node2_online ? 'LIVE' : 'OFFLINE'))}
          </div>

          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Telemetry Topic:</span>
              <span className="text-purple-300">aura/telemetry/node2</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Control Topic:</span>
              <span className="text-indigo-300">aura/control/node2</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Status ACK Topic:</span>
              <span className="text-emerald-300">aura/status/node2</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Age (Latency):</span>
              <span className={node2.age_ms !== null && node2.age_ms < 3000 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {node2.age_ms !== null ? `${node2.age_ms} ms` : 'No packets'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Last Ingestion:</span>
              <span className="text-slate-300 truncate max-w-[180px]">{node2.last_received || 'Never'}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
            <button
              onClick={() => handleTestPing('esp8266_node2', 'kitchen_light', true)}
              disabled={isSendingPing}
              className="flex-1 text-[10px] font-mono py-1.5 px-2.5 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-300 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Send className="w-3 h-3" />
              Test Ping: Kitchen Light ON
            </button>
            <button
              onClick={() => handleTestPing('esp8266_node2', 'kitchen_light', false)}
              disabled={isSendingPing}
              className="flex-1 text-[10px] font-mono py-1.5 px-2.5 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              Kitchen Light OFF
            </button>
          </div>
        </div>
      </div>

      {/* Closed-Loop Command & ACK Correlation Card */}
      <div className="rounded-xl p-4 bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            <span>Closed-Loop Command ID &amp; Physical ACK Pipeline</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Bidirectional State Correlation
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Last Outbound Command */}
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px] font-semibold">LAST CLOUD COMMAND</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                lastCommand?.status === 'SENT' ? 'bg-indigo-950 text-indigo-300 border border-indigo-700' :
                lastCommand?.status === 'BLOCKED' ? 'bg-rose-950 text-rose-300 border border-rose-700' :
                'bg-slate-800 text-slate-400'
              }`}>
                {lastCommand?.status || 'IDLE'}
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Topic:</span>
                <span className="text-indigo-300">{lastCommand?.topic || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Command ID:</span>
                <span className="text-amber-300 font-bold">{lastCommand?.command_id || '—'}</span>
              </div>
              <div className="mt-1 p-2 rounded bg-black/60 text-[10px] text-slate-300 overflow-x-auto max-h-20">
                {lastCommand?.payload ? JSON.stringify(lastCommand.payload, null, 2) : 'No outbound command recorded'}
              </div>
            </div>
          </div>

          {/* Last Inbound Status Confirmation (ACK) */}
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px] font-semibold">LAST PHYSICAL ACKNOWLEDGEMENT</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                lastAck?.status === 'EXECUTED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                'bg-slate-800 text-slate-400'
              }`}>
                {lastAck ? 'EXECUTED ✓' : 'AWAITING ACK'}
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Node ID:</span>
                <span className="text-emerald-300">{lastAck?.node_id || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Correlated Cmd ID:</span>
                <span className="text-amber-300 font-bold">{lastAck?.command_id || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Confirmed At:</span>
                <span className="text-slate-300">
                  {lastAck?.timestamp ? new Date(lastAck.timestamp * 1000).toLocaleTimeString() : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Feedback:</span>
                <span className="text-emerald-400 font-bold">{lastAck?.status || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
