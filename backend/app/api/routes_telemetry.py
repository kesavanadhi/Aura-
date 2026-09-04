from fastapi import APIRouter
from app.iot.simulator import simulator
from app.core.context_engine import context_engine
from app.core.decision_engine import decision_engine
from app.vision.fall_detector import fall_detector
from app.core.safety_guardian import safety_guardian

router = APIRouter(prefix="/api/telemetry", tags=["Telemetry"])

@router.get("")
async def get_current_telemetry():
    # Fetch latest telemetry (physical or simulated)
    telemetry = simulator.tick_stream()
    
    # Process through Context Engine
    ctx_res = context_engine.update_telemetry(telemetry, decision_engine.current_actuators)
    
    # Determine any active emergency
    active_emerg = fall_detector.active_emergency or safety_guardian.active_hazard_incident
    
    # Process through Decision Engine
    actuators = decision_engine.process_decisions(telemetry, ctx_res["context"], active_emerg)
    
    return {
        "telemetry": telemetry,
        "actuators": actuators,
        "context": ctx_res["context"],
        "energy": ctx_res["energy"],
        "active_emergency": active_emerg
    }
