import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from config import settings
from telemetry import Zone1Telemetry
from logger import log_ai

class DecisionEngine:
    """
    Central Explainable AI Decision Engine for Zone 1 (Bedroom + Hallway).
    Calculates deterministic actuation policies based on multi-sensor context,
    hysteresis, and respect for manual user overrides.
    """
    def __init__(self):
        # Current device states
        self.actuator_states = {
            "bedroom_light": False,
            "hall_light": False,
            "bedroom_fan_pwm": 0,
            "hall_fan_pwm": 0,
            "curtain_servo_angle": 90,
            "buzzer_active": False
        }

        # Manual overrides tracking: {device_key: {"value": val, "timestamp": ts}}
        self.manual_overrides: Dict[str, Dict[str, Any]] = {}
        self.manual_override_ttl_sec = 120.0  # 2 minutes auto-revert to AI unless renewed

        self.emergency_mode = False

    def set_manual_override(self, device: str, value: Any):
        """Allows website user to manually set an actuator without instant AI overwriting"""
        self.manual_overrides[device] = {
            "value": value,
            "timestamp": time.time()
        }
        self.actuator_states[device] = value
        log_ai(f"Manual Override applied: {device} = {value} (AI will not overwrite)")

    def clear_manual_override(self, device: Optional[str] = None):
        if device:
            self.manual_overrides.pop(device, None)
            log_ai(f"Manual Override cleared for: {device}")
        else:
            self.manual_overrides.clear()
            log_ai("All manual overrides cleared -> Autonomous AI active")

    def evaluate(self, telemetry: Zone1Telemetry, bed_occupied: bool, hall_occupied: bool) -> List[Dict[str, Any]]:
        """
        Evaluates sensor state and produces list of explainable AI decisions.
        """
        now = time.time()
        decisions: List[Dict[str, Any]] = []

        # Emergency override has absolute highest priority
        if self.emergency_mode:
            self.actuator_states["bedroom_light"] = True
            self.actuator_states["hall_light"] = True
            self.actuator_states["buzzer_active"] = True

            decisions.append({
                "node_id": settings.NODE_ID,
                "device": "emergency_illumination",
                "action": "ALL_LIGHTS_AND_BUZZER_ON",
                "reason": "Emergency Mode Active: Illuminating egress path and sounding rescue alarm",
                "confidence": 1.0,
                "source": "edge_ai",
                "timestamp": datetime.now().isoformat()
            })
            return decisions

        # Expire stale manual overrides
        expired = [d for d, info in self.manual_overrides.items() if now - info["timestamp"] > self.manual_override_ttl_sec]
        for d in expired:
            self.manual_overrides.pop(d, None)

        lux = telemetry.bedroom.ambient_lux

        # -------------------------------------------------------------
        # 1. INTELLIGENT BEDROOM LIGHT DECISION
        # -------------------------------------------------------------
        if "bedroom_light" not in self.manual_overrides:
            current_light = self.actuator_states["bedroom_light"]
            target_light = current_light
            reason = ""
            conf = 0.90

            if bed_occupied and lux < settings.LDR_DARK_THRESHOLD_LUX:
                target_light = True
                reason = f"Bedroom occupied and ambient light is low ({lux} lux < {settings.LDR_DARK_THRESHOLD_LUX})"
                conf = 0.94
            elif not bed_occupied:
                target_light = False
                reason = "Bedroom vacant: turning off lights to conserve energy"
                conf = 0.92
            elif bed_occupied and lux > settings.LDR_BRIGHT_THRESHOLD_LUX:
                target_light = False
                reason = f"Bedroom occupied but sufficient natural daylight ({lux} lux > {settings.LDR_BRIGHT_THRESHOLD_LUX})"
                conf = 0.88

            if target_light != current_light:
                self.actuator_states["bedroom_light"] = target_light
                log_ai(f"Bedroom light decision: {'ON' if target_light else 'OFF'} ({reason})")
                decisions.append({
                    "node_id": settings.NODE_ID,
                    "device": "bedroom_light",
                    "action": "BEDROOM_LIGHT_ON" if target_light else "BEDROOM_LIGHT_OFF",
                    "value": target_light,
                    "reason": reason,
                    "confidence": conf,
                    "source": "edge_ai",
                    "timestamp": datetime.now().isoformat()
                })

        # -------------------------------------------------------------
        # 2. INTELLIGENT HALLWAY LIGHT DECISION
        # -------------------------------------------------------------
        if "hall_light" not in self.manual_overrides:
            current_hall_light = self.actuator_states["hall_light"]
            target_hall_light = current_hall_light
            reason = ""
            conf = 0.92

            if hall_occupied:
                target_hall_light = True
                reason = "Hallway corridor occupancy verified by PIR/Ultrasonic: illuminating walkway"
                conf = 0.96
            else:
                target_hall_light = False
                reason = "Hallway corridor clear: extinguishing corridor light"
                conf = 0.91

            if target_hall_light != current_hall_light:
                self.actuator_states["hall_light"] = target_hall_light
                log_ai(f"Hall light decision: {'ON' if target_hall_light else 'OFF'} ({reason})")
                decisions.append({
                    "node_id": settings.NODE_ID,
                    "device": "hall_light",
                    "action": "HALL_LIGHT_ON" if target_hall_light else "HALL_LIGHT_OFF",
                    "value": target_hall_light,
                    "reason": reason,
                    "confidence": conf,
                    "source": "edge_ai",
                    "timestamp": datetime.now().isoformat()
                })

        # -------------------------------------------------------------
        # 3. INTELLIGENT BEDROOM FAN PWM DECISION
        # -------------------------------------------------------------
        if "bedroom_fan_pwm" not in self.manual_overrides:
            current_fan = self.actuator_states["bedroom_fan_pwm"]
            target_fan = settings.FAN_COMFORT_PWM if bed_occupied else 0
            reason = f"Bedroom {'occupied: comfortable ventilation active' if bed_occupied else 'vacant: fan auto-shutdown'}"

            if target_fan != current_fan:
                self.actuator_states["bedroom_fan_pwm"] = target_fan
                log_ai(f"Fan decision: PWM {target_fan} ({reason})")
                decisions.append({
                    "node_id": settings.NODE_ID,
                    "device": "bedroom_fan",
                    "action": f"SET_BEDROOM_FAN_PWM_{target_fan}",
                    "pwm": target_fan,
                    "reason": reason,
                    "confidence": 0.90,
                    "source": "edge_ai",
                    "timestamp": datetime.now().isoformat()
                })

        # -------------------------------------------------------------
        # 4. INTELLIGENT CURTAIN DECISION
        # -------------------------------------------------------------
        if "curtain_servo_angle" not in self.manual_overrides:
            current_curtain = self.actuator_states["curtain_servo_angle"]
            target_curtain = current_curtain
            reason = ""

            if lux > settings.LDR_BRIGHT_THRESHOLD_LUX:
                target_curtain = 90  # Open
                reason = f"Bright ambient illumination ({lux} lux): opening bedroom curtains for daylighting"
            elif lux < settings.LDR_DARK_THRESHOLD_LUX:
                target_curtain = 0   # Closed
                reason = f"Nighttime darkness ({lux} lux): closing curtains for resident privacy"

            if target_curtain != current_curtain:
                self.actuator_states["curtain_servo_angle"] = target_curtain
                log_ai(f"Curtain decision: {'OPEN' if target_curtain == 90 else 'CLOSED'} ({reason})")
                decisions.append({
                    "node_id": settings.NODE_ID,
                    "device": "curtain_servo",
                    "action": "CURTAINS_OPEN" if target_curtain == 90 else "CURTAINS_CLOSED",
                    "angle": target_curtain,
                    "reason": reason,
                    "confidence": 0.88,
                    "source": "edge_ai",
                    "timestamp": datetime.now().isoformat()
                })

        return decisions

    def get_actuator_control_payload(self) -> Dict[str, Any]:
        """Compact MQTT control payload for aura/control/node1"""
        return {
            "bedroom_light": self.actuator_states["bedroom_light"],
            "hall_light": self.actuator_states["hall_light"],
            "bedroom_fan_pwm": self.actuator_states["bedroom_fan_pwm"],
            "hall_fan_pwm": self.actuator_states["hall_fan_pwm"],
            "curtain_servo_angle": self.actuator_states["curtain_servo_angle"],
            "buzzer_active": self.actuator_states["buzzer_active"]
        }
