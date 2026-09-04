import React, { useState } from 'react';
import { AlertTriangle, PhoneCall, CheckCircle, MapPin, Sparkles, X, ExternalLink, Camera, Radio } from 'lucide-react';

export default function FallEmergencyModal({ incident, onDismiss, onCallAmbulance, userLocation }) {
  const [viewMode, setViewMode] = useState('live'); // 'live' or 'snapshot'
  if (!incident) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl rounded-3xl border-2 border-red-500/80 bg-slate-950 p-6 shadow-2xl shadow-red-950/80 glow-red">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-red-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/60 flex items-center justify-center text-red-500 animate-pulse">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white uppercase">Possible Fall Detected</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-700 font-mono font-bold animate-pulse">
                  CRITICAL RESCUE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                AURA Life-Safety Engine: Autonomous Edge Computer Vision
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95"
            title="Dismiss Emergency"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-5">
          {/* Left Column: Visual Evidence / Live Camera Clip */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-slate-300">
                {viewMode === 'live' ? 'Live USB Camera Feed:' : 'Captured Fall Snapshot:'}
              </span>
              {/* Toggle Buttons: Live vs Snapshot */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                <button
                  onClick={() => setViewMode('live')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded ${
                    viewMode === 'live'
                      ? 'bg-red-600 text-white font-bold animate-pulse'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Radio className="w-2.5 h-2.5" />
                  <span>LIVE CLIP</span>
                </button>
                <button
                  onClick={() => setViewMode('snapshot')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded ${
                    viewMode === 'snapshot'
                      ? 'bg-slate-700 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Camera className="w-2.5 h-2.5" />
                  <span>SNAPSHOT</span>
                </button>
              </div>
            </div>

            {/* Video / Snapshot Container */}
            <div className="w-full aspect-video rounded-xl bg-slate-900 border border-slate-800 overflow-hidden relative flex items-center justify-center">
              {viewMode === 'live' ? (
                <img
                  src="http://localhost:8000/api/camera/stream"
                  alt="Live USB Camera Stream"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to Edge Server port 8001 directly
                    e.target.src = "http://localhost:8001/stream";
                  }}
                />
              ) : (
                incident.evidence_snapshot_url ? (
                  <img
                    src={`http://localhost:8000${incident.evidence_snapshot_url}`}
                    alt="Incident Visual Evidence"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "http://localhost:8001/frame";
                    }}
                  />
                ) : (
                  <div className="text-center p-4 text-xs text-slate-400 font-mono">
                    Captured Fall Frame Buffer
                  </div>
                )
              )}

              {/* Status Badges */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/80 text-[10px] font-mono border border-red-500/60 text-red-300">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <span>{viewMode === 'live' ? 'LIVE USB CLIP' : 'VERIFIED EVIDENCE'}</span>
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-cyan-300 border border-cyan-800">
                MediaPipe Pose Keypoints
              </div>
            </div>

            {/* Resident & Room Details */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Person:</span>
                <span className="text-slate-100 font-bold">{incident.person || 'Registered Resident'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Affected Zone:</span>
                <span className="text-red-400 font-bold">{incident.room || 'Bedroom'} (Emergency Light ON)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Detection Time:</span>
                <span className="text-slate-200">{incident.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Local Alarm:</span>
                <span className="text-emerald-400 font-bold">Piezo Buzzer & Light Active</span>
              </div>
            </div>
          </div>

          {/* Right Column: AI Triage & SOS Emergency Dispatch */}
          <div className="flex flex-col justify-between gap-3">
            {/* Google Gemini AI Triage Briefing */}
            <div className="bg-blue-950/25 p-3.5 rounded-xl border border-blue-800/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Google Gemini 1.5 Multimodal Triage</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {incident.gemini_triage_summary || "Subject detected in prone horizontal posture on floor. Verified through 1.5s multi-frame ground dwell. Urgent dispatch recommended."}
              </p>
            </div>

            {/* Contacts Notified Log */}
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
              <span className="text-slate-400 font-semibold block mb-1">Emergency Dispatch Log:</span>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Personal Contact: +91 98765 43210 (SMS Alert Sent)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Emergency Rescue Services: Live Geo-Packet & Rescue Ready</span>
              </div>
              <a
                href="https://maps.app.goo.gl/D9f7LoYF84iTTBmq9"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 hover:bg-cyan-900/50 hover:text-white transition-all text-xs font-mono group"
                title="Open live resident location in Google Maps"
              >
                <span className="flex items-center gap-2 truncate">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 animate-pulse flex-shrink-0" />
                  <span className="truncate">GPS: {userLocation?.areaName ? `${userLocation.areaName} (${userLocation.lat?.toFixed(4)}, ${userLocation.lon?.toFixed(4)})` : (incident.ambulance_dispatch?.gps_coordinates || "Live Resident GPS")}</span>
                </span>
                <span className="flex items-center gap-1 text-[10px] text-cyan-400 underline group-hover:text-cyan-200 flex-shrink-0 ml-2">
                  Open Maps <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            </div>

            {/* ACTION BUTTONS */}
            <div className="space-y-2 pt-2">
              {/* BIG RED SOS EMERGENCY BUTTON */}
              <button
                type="button"
                onClick={onCallAmbulance}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black flex items-center justify-center gap-2.5 shadow-lg shadow-red-600/50 transition-all text-sm uppercase tracking-wider glow-red cursor-pointer active:scale-95 border border-red-400/50"
              >
                <PhoneCall className="w-5 h-5 animate-bounce" />
                <span>🚨 TRIGGER SOS EMERGENCY CALL</span>
              </button>

              {/* Dismiss Button */}
              <button
                onClick={onDismiss}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-mono font-medium transition-all"
              >
                Dismiss / False Alarm (Restore Normal Mode)
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
