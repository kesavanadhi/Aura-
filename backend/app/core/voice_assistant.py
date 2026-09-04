import re
from typing import Dict, Any, Tuple
from app.models.schemas import VoiceCommandResponse, ActuatorStates, FullTelemetry
from app.core.decision_engine import decision_engine
from app.core.navigation_engine import indoor_navigator
from app.services.rag_service import rag_service
from app.services.command_validator import command_validator

class AccessibilityVoiceAssistant:
    """
    Accessibility Assistant with 'AURA' Wake-Word Detection.
    Fully grounded in RAG Knowledge Base and Anti-Hallucination Command Validator.
    """
    WAKE_WORDS = ["aura", "hey aura", "ok aura"]

    def process_voice_input(
        self,
        transcript: str,
        current_telemetry: FullTelemetry,
        is_hardware_online: bool = False,
        is_emergency_active: bool = False
    ) -> VoiceCommandResponse:
        cleaned_text = transcript.strip().lower()
        
        # 1. Detect Wake-Word
        wake_detected = any(cleaned_text.startswith(w) or f" {w} " in f" {cleaned_text} " for w in self.WAKE_WORDS)
        
        # Strip wake word for command analysis
        cmd_text = cleaned_text
        for w in self.WAKE_WORDS:
            cmd_text = cmd_text.replace(w, "").strip()

        if not cmd_text and wake_detected:
            return VoiceCommandResponse(
                transcript=transcript,
                wake_word_detected=True,
                command_understood=True,
                action_taken="WAKE_WORD_ACKNOWLEDGED",
                spoken_feedback="Hello! AURA is active and grounded. How may I assist you?",
                actuators=decision_engine.current_actuators
            )

        # 2. Indoor Navigation Check
        if "guide me" in cmd_text or "navigate" in cmd_text or "route" in cmd_text:
            dest = "Kitchen"
            if "bedroom" in cmd_text:
                dest = "Bedroom"
            elif "hall" in cmd_text:
                dest = "Hall"
            elif "bathroom" in cmd_text:
                dest = "Bathroom"
            elif "kitchen" in cmd_text:
                dest = "Kitchen"
                
            nav = indoor_navigator.calculate_route("Bedroom", dest)
            return VoiceCommandResponse(
                transcript=transcript,
                wake_word_detected=wake_detected,
                command_understood=True,
                action_taken=f"NAVIGATION_TO_{dest.upper()}",
                spoken_feedback=nav.voice_guidance,
                actuators=decision_engine.current_actuators
            )

        # 3. Accessibility Mode Check
        if "accessibility mode" in cmd_text:
            return VoiceCommandResponse(
                transcript=transcript,
                wake_word_detected=wake_detected,
                command_understood=True,
                action_taken="ACCESSIBILITY_MODE_ENGAGED",
                spoken_feedback="Accessibility mode engaged. Audio guidance and high-contrast voice feedback are fully active.",
                actuators=decision_engine.current_actuators
            )

        # 4. RAG Grounding Layer Evaluation
        # Enforces zero hallucination, hardware constraints, and anti-hallucination validation
        rag_result = rag_service.evaluate_user_query(
            query=cmd_text if cmd_text else cleaned_text,
            current_telemetry=current_telemetry.model_dump(),
            telemetry_timestamp=current_telemetry.timestamp,
            is_hardware_online=is_hardware_online,
            is_emergency_active=is_emergency_active
        )

        spoken_feedback = rag_result.get("interpretation", "Command processed.")
        action_taken = "NO_ACTION"

        # If RAG validated an actuator command, apply to decision_engine manual overrides
        if rag_result.get("decision", {}).get("action_required"):
            cmd = rag_result.get("command", {})
            payload = cmd.get("payload", {})
            for dev, val in payload.items():
                decision_engine.manual_override(dev, val)
            action_taken = f"ACTUATOR_{list(payload.keys())[0].upper()}"

        elif rag_result.get("validation", {}).get("block_reason"):
            action_taken = "COMMAND_BLOCKED"
        elif not rag_result.get("grounding", {}).get("data_complete"):
            action_taken = "INSUFFICIENT_DATA"

        return VoiceCommandResponse(
            transcript=transcript,
            wake_word_detected=wake_detected,
            command_understood=True,
            action_taken=action_taken,
            spoken_feedback=spoken_feedback,
            actuators=decision_engine.current_actuators
        )

voice_assistant = AccessibilityVoiceAssistant()
