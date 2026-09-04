import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Send, 
  Radio, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';

export default function VoiceAssistantCard({ 
  onSendCommand, 
  lastResponse, 
  onDirectActuate, 
  telemetry 
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [customText, setCustomText] = useState('');
  const [speechStatus, setSpeechStatus] = useState('Standby');
  const [recentCommands, setRecentCommands] = useState([
    { text: "Turn on bedroom light", response: "Bedroom light switched on.", time: "10:24 AM" },
    { text: "Set fan to 43%", response: "Bedroom fan adjusted to 110 PWM.", time: "10:22 AM" },
    { text: "Check kitchen air", response: "Kitchen air quality is good (220 ppm).", time: "10:15 AM" }
  ]);
  const [showQuickCommands, setShowQuickCommands] = useState(false);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef(null);

  // Initialize Persistent Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechStatus('Web Speech API not supported in this browser. Type commands below.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechStatus('Listening for command...');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        setTranscript(currentText);

        if (finalTranscript.trim()) {
          handleExecute(finalTranscript.trim());
          setTimeout(() => {
            if (shouldListenRef.current) {
              setTranscript('');
            }
          }, 2000);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          setSpeechStatus('Listening...');
          return;
        }
        if (event.error === 'not-allowed') {
          shouldListenRef.current = false;
          setIsListening(false);
          setSpeechStatus('Microphone blocked. Please allow mic.');
          return;
        }
        console.warn('Speech warning:', event.error);
      };

      recognition.onend = () => {
        if (shouldListenRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (shouldListenRef.current) {
              try {
                recognition.start();
              } catch (err) {
                setTimeout(() => {
                  if (shouldListenRef.current) {
                    try { recognition.start(); } catch (e) {}
                  }
                }, 300);
              }
            }
          }, 150);
        } else {
          setIsListening(false);
          setSpeechStatus('Standby');
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Speech setup error:', err);
    }

    return () => {
      shouldListenRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const toggleListening = async () => {
    if (!recognitionRef.current) {
      setSpeechStatus('Web Speech API not supported. Type commands below.');
      return;
    }

    if (shouldListenRef.current) {
      shouldListenRef.current = false;
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
      setSpeechStatus('Standby');
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.warn('Mic permission error:', err);
      }

      shouldListenRef.current = true;
      setTranscript('');
      setSpeechStatus('Listening...');
      try {
        recognitionRef.current.start();
      } catch (e) {
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            if (shouldListenRef.current) {
              try { recognitionRef.current.start(); } catch (err2) {}
            }
          }, 200);
        } catch (err3) {}
      }
    }
  };

  const speakFeedback = (text) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (e) {}
    }
  };

  const handleExecute = (rawText) => {
    if (!rawText || !rawText.trim()) return;
    const text = rawText.trim();
    const lower = text.toLowerCase();

    if (onSendCommand) {
      onSendCommand(text);
    }

    let feedback = '';

    // NLP Routing
    if (lower.includes('bedroom light') || lower.includes('bed light')) {
      const isOff = lower.includes('off') || lower.includes('shut') || lower.includes('stop');
      if (onDirectActuate) onDirectActuate('bedroom_light', !isOff);
      feedback = isOff ? 'Bedroom light switched off.' : 'Bedroom light switched on.';
    } else if (lower.includes('hall light')) {
      const isOff = lower.includes('off') || lower.includes('shut');
      if (onDirectActuate) onDirectActuate('hall_light', !isOff);
      feedback = isOff ? 'Hall light switched off.' : 'Hall light switched on.';
    } else if (lower.includes('kitchen light')) {
      const isOff = lower.includes('off') || lower.includes('shut');
      if (onDirectActuate) onDirectActuate('kitchen_light', !isOff);
      feedback = isOff ? 'Kitchen light switched off.' : 'Kitchen light switched on.';
    } else if (lower.includes('bathroom light')) {
      const isOff = lower.includes('off') || lower.includes('shut');
      if (onDirectActuate) onDirectActuate('bathroom_light', !isOff);
      feedback = isOff ? 'Bathroom light switched off.' : 'Bathroom light switched on.';
    } else if (lower.includes('fan')) {
      if (lower.includes('off') || lower.includes('stop')) {
        if (onDirectActuate) {
          onDirectActuate('bedroom_fan_pwm', 0);
          onDirectActuate('hall_fan_pwm', 0);
        }
        feedback = 'Ceiling fans powered off.';
      } else {
        if (onDirectActuate) onDirectActuate('bedroom_fan_pwm', 180);
        feedback = 'Ceiling fan set to 70% speed.';
      }
    } else if (lower.includes('exhaust')) {
      if (lower.includes('off') || lower.includes('stop')) {
        if (onDirectActuate) onDirectActuate('exhaust_fan_speed_pct', 0);
        feedback = 'Kitchen exhaust fan stopped.';
      } else {
        if (onDirectActuate) onDirectActuate('exhaust_fan_speed_pct', 100);
        feedback = 'Kitchen exhaust fan set to maximum turbo.';
      }
    } else if (lower.includes('curtain')) {
      if (lower.includes('close')) {
        if (onDirectActuate) onDirectActuate('curtain_servo_angle', 0);
        feedback = 'Bedroom window curtains closed.';
      } else {
        if (onDirectActuate) onDirectActuate('curtain_servo_angle', 90);
        feedback = 'Bedroom window curtains opened.';
      }
    } else if (lower.includes('buzzer') || lower.includes('alarm')) {
      if (onDirectActuate) onDirectActuate('buzzer_active', false);
      feedback = 'Rescue alarm silenced.';
    } else {
      feedback = `Command applied: "${text}".`;
    }

    if (feedback) {
      speakFeedback(feedback);
    }

    // Add to top of recent commands (Keep last 3)
    setRecentCommands(prev => [
      { text, response: feedback, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...prev.slice(0, 2)
    ]);

    setCustomText('');
  };

  const quickCommands = [
    "Turn on bedroom light",
    "Turn off bedroom light",
    "Turn on hall light",
    "Turn on kitchen light",
    "Open bedroom curtains",
    "Turn off fans",
    "Start kitchen exhaust",
    "Silence alarm"
  ];

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          {/* Google 4-Color Dots */}
          <div className="flex items-center gap-1 p-1.5 rounded-xl bg-slate-900/90 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-[#4285F4]"></span>
            <span className="w-2 h-2 rounded-full bg-[#EA4335]"></span>
            <span className="w-2 h-2 rounded-full bg-[#FBBC05]"></span>
            <span className="w-2 h-2 rounded-full bg-[#34A853]"></span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              VOICE ASSISTANT
            </h3>
            <p className="text-[11px] text-slate-400">
              Google Assistant integration &amp; Edge NLP Voice Hub
            </p>
          </div>
        </div>

        <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
          isListening 
            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600 animate-pulse'
            : 'bg-slate-900 text-slate-400 border border-white/10'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
          {isListening ? '🎙 Listening' : '● Standby'}
        </span>
      </div>

      {/* Hero Listening / Trigger Strip */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.06] flex items-center gap-3.5 shadow-inner">
        <button
          onClick={toggleListening}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all duration-200 active:scale-95 flex items-center gap-2 flex-shrink-0 ${
            isListening
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-2 ring-rose-400 animate-pulse'
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md'
          }`}
        >
          {isListening ? (
            <>
              <Mic className="w-4 h-4 animate-bounce" />
              <span>Listening...</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Start Listening</span>
            </>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-mono text-slate-400">
              {speechStatus}
            </span>
            {isListening && (
              <div className="flex items-center gap-1 h-2.5">
                <span className="w-1 h-2.5 bg-[#4285F4] rounded-full assistant-bar-1"></span>
                <span className="w-1 h-2.5 bg-[#EA4335] rounded-full assistant-bar-2"></span>
                <span className="w-1 h-2.5 bg-[#FBBC05] rounded-full assistant-bar-3"></span>
                <span className="w-1 h-2.5 bg-[#34A853] rounded-full assistant-bar-4"></span>
              </div>
            )}
          </div>
          <div className="text-xs font-medium text-slate-200 truncate">
            {transcript || (isListening ? 'Speak your command freely...' : 'Click button to issue voice control')}
          </div>
        </div>
      </div>

      {/* Last 3 Executed Commands (Clean Hierarchy) */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
          Recent Command History (Last 3)
        </span>
        <div className="space-y-1.5 font-mono text-xs">
          {recentCommands.map((cmd, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-slate-900/40 border border-white/[0.04] flex items-start justify-between gap-2">
              <div>
                <div className="text-slate-200 font-semibold">
                  "{cmd.text}"
                </div>
                <div className="text-[11px] text-cyan-400/90 mt-0.5">
                  AURA: {cmd.response}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                {cmd.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Collapsible Quick Commands */}
      <div className="pt-2 border-t border-white/[0.06]">
        <button
          onClick={() => setShowQuickCommands(!showQuickCommands)}
          className="flex items-center justify-between w-full text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <span>Quick Commands Chips</span>
          {showQuickCommands ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showQuickCommands && (
          <div className="flex flex-wrap gap-1.5 mt-2 animate-in fade-in duration-150">
            {quickCommands.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => handleExecute(cmd)}
                className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-white/[0.06] transition-all active:scale-95"
              >
                "{cmd}"
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Text Command Fallback */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleExecute(customText)}
          placeholder="Or type command: Turn on bedroom light..."
          className="flex-1 bg-slate-950/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
        />
        <button
          onClick={() => handleExecute(customText)}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 border border-white/10"
        >
          <Send className="w-3 h-3 text-cyan-400" />
          <span>Send</span>
        </button>
      </div>

    </div>
  );
}
