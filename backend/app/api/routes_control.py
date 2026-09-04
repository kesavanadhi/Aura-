from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict
from app.core.decision_engine import decision_engine
from app.iot.mqtt_manager import mqtt_manager
from app.services.device_state_service import device_state_service
from app.services.command_validator import command_validator

router = APIRouter(prefix="/api/control", tags=["Device Control"])

class OverrideRequest(BaseModel):
    device: str
    state: Any

def broadcast_mqtt_actuators(updated_actuators, is_emergency_active: bool = False):
    """Broadcasts actuator states to physical ESP nodes through the validated pipeline."""
    # Node 1: Bedroom & Hall
    node1_payload = {
        "bedroom_light": updated_actuators.bedroom_light,
        "bedroom_fan_pwm": updated_actuators.bedroom_fan_pwm,
        "curtain_servo_angle": updated_actuators.curtain_servo_angle,
        "hall_light": updated_actuators.hall_light,
        "hall_fan_pwm": updated_actuators.hall_fan_pwm,
        "buzzer_active": updated_actuators.buzzer_active
    }
    mqtt_manager.publish_control("node1", node1_payload, is_emergency_active)

    # Node 2: Kitchen & Bathroom
    exhaust_pct = updated_actuators.exhaust_fan_speed_pct
    if exhaust_pct == 0 and updated_actuators.exhaust_fan:
        exhaust_pct = 100
    node2_payload = {
        "kitchen_light": updated_actuators.kitchen_light,
        "bathroom_light": updated_actuators.bathroom_light,
        "exhaust_fan_speed_pct": exhaust_pct
    }
    mqtt_manager.publish_control("node2", node2_payload, is_emergency_active)

@router.post("/override")
async def manual_device_override(req: OverrideRequest):
    # Determine target topic to validate against actuator contract
    topic = "aura/control/node1" if req.device in (
        "bedroom_light", "bedroom_fan_pwm", "curtain_servo_angle",
        "hall_light", "hall_fan_pwm", "buzzer_active", "fan_speed_pwm"
    ) else "aura/control/node2"

    val_res = command_validator.validate_command(topic, {req.device: req.state})
    if val_res["status"] == "BLOCKED":
        raise HTTPException(status_code=400, detail=val_res["reason"])

    updated_actuators = decision_engine.manual_override(req.device, req.state)
    broadcast_mqtt_actuators(updated_actuators)

    return {
        "status": "SUCCESS",
        "device": req.device,
        "new_state": req.state,
        "actuators": updated_actuators,
        "active_overrides": decision_engine.get_override_status(),
        "device_state": device_state_service.get_summary_state()
    }

@router.post("/reset-auto")
async def reset_to_auto_mode():
    """Releases all manual overrides, returning system to full AI Cognitive Mode."""
    updated_actuators = decision_engine.clear_all_overrides()
    broadcast_mqtt_actuators(updated_actuators)
    return {
        "status": "AUTO_MODE_RESTORED",
        "actuators": updated_actuators,
        "active_overrides": {},
        "device_state": device_state_service.get_summary_state()
    }

@router.get("/status")
async def get_control_status():
    """Returns the current actuators, manual overrides, and confirmed physical states."""
    return {
        "actuators": decision_engine.current_actuators,
        "active_overrides": decision_engine.get_override_status(),
        "is_manual_mode": len(decision_engine.manual_overrides) > 0,
        "device_states": device_state_service.get_summary_state()
    }

@router.get("/device-states")
async def get_device_states():
    """Returns physical device confirmation authority snapshot."""
    return device_state_service.get_summary_state()
