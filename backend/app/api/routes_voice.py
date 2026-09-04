from fastapi import APIRouter
from app.models.schemas import VoiceCommandRequest, VoiceCommandResponse
from app.core.voice_assistant import voice_assistant
from app.core.decision_engine import decision_engine
from app.api.routes_control import broadcast_mqtt_actuators
from app.iot.mqtt_manager import mqtt_manager
from app.iot.simulator import simulator
from app.services.rag_service import rag_service

router = APIRouter(prefix="/api/voice", tags=["Accessibility Voice Assistant"])

@router.post("/command", response_model=VoiceCommandResponse)
async def process_voice_command(req: VoiceCommandRequest):
    hw_status = mqtt_manager.get_hardware_status()
    # Prioritize live hardware telemetry over simulated telemetry if hardware is online
    current_telemetry = mqtt_manager.hardware_telemetry if hw_status["online"] else simulator.tick_stream()
    
    result = voice_assistant.process_voice_input(
        transcript=req.transcript,
        current_telemetry=current_telemetry,
        is_hardware_online=hw_status["online"]
    )

    # Broadcast resulting actuator states to physical ESP nodes through validated pipeline!
    broadcast_mqtt_actuators(decision_engine.current_actuators)
    return result
