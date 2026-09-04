import logging
from typing import Dict, Any, Tuple, Optional
from app.rag import (
    HARDWARE_REGISTRY,
    MQTT_CONTRACT,
    ACTUATOR_CONTRACT,
    SAFETY_RULES
)

logger = logging.getLogger("AURA_VALIDATOR")

class CommandValidator:
    """
    Anti-Hallucination Command Validator.
    Sits strictly between AI/Voice/Decision Layer and MQTT Publishing.
    Enforces hardware contracts, value constraints, and safety invariants.
    """
    def __init__(self):
        self.allowed_topics = set(MQTT_CONTRACT.get("allowed_topics", []))
        self.forbidden_hardware = set(HARDWARE_REGISTRY.get("forbidden_hardware", []))
        self.forbidden_fields = set(ACTUATOR_CONTRACT.get("forbidden_fields", []))
        self.zone1_actuators = ACTUATOR_CONTRACT.get("zone1", {}).get("supported_fields", {})
        self.zone2_actuators = ACTUATOR_CONTRACT.get("zone2", {}).get("supported_fields", {})

    def validate_command(
        self,
        topic: str,
        payload: Dict[str, Any],
        is_emergency_active: bool = False
    ) -> Dict[str, Any]:
        """
        Validates an outbound MQTT payload before transmission.
        Returns {"status": "VALID", ...} or {"status": "BLOCKED", "reason": "...", "mqtt_publish": False}
        """
        # 1. Topic Verification
        if topic not in self.allowed_topics:
            return {
                "status": "BLOCKED",
                "reason": f"Topic '{topic}' is not in MQTT contract. Allowed: {sorted(list(self.allowed_topics))}",
                "mqtt_publish": False
            }

        if not isinstance(payload, dict) or not payload:
            return {
                "status": "BLOCKED",
                "reason": "Payload must be a non-empty JSON dictionary.",
                "mqtt_publish": False
            }

        # Determine target zone from topic
        if topic == "aura/control/node1":
            zone = "zone1"
            allowed_specs = self.zone1_actuators
        elif topic == "aura/control/node2":
            zone = "zone2"
            allowed_specs = self.zone2_actuators
        elif topic == "aura/emergency":
            # Emergency broadcast topic
            return {
                "status": "VALID",
                "zone": "emergency",
                "topic": topic,
                "payload": payload,
                "mqtt_publish": True
            }
        else:
            return {
                "status": "BLOCKED",
                "reason": f"Topic '{topic}' is not a valid control topic.",
                "mqtt_publish": False
            }

        # 2. Check for Hallucinated / Forbidden Fields
        for key in payload.keys():
            if key in self.forbidden_hardware or key in self.forbidden_fields:
                return {
                    "status": "BLOCKED",
                    "reason": f"Field '{key}' is FORBIDDEN / NOT AVAILABLE IN CURRENT AURA HARDWARE.",
                    "mqtt_publish": False
                }

        # 3. Validate Each Actuator Field & Value Range
        sanitized_payload = {}
        for key, value in payload.items():
            # Allow container objects if they match room groups, but unwrap/verify items
            if key in ("bedroom", "hall", "kitchen", "bathroom") and isinstance(value, dict):
                for subkey, subval in value.items():
                    res = self._validate_field(zone, subkey, subval, allowed_specs, is_emergency_active)
                    if not res["valid"]:
                        return {
                            "status": "BLOCKED",
                            "reason": res["reason"],
                            "mqtt_publish": False
                        }
                    sanitized_payload[res["normalized_key"]] = res["value"]
                continue

            res = self._validate_field(zone, key, value, allowed_specs, is_emergency_active)
            if not res["valid"]:
                return {
                    "status": "BLOCKED",
                    "reason": res["reason"],
                    "mqtt_publish": False
                }
            sanitized_payload[res["normalized_key"]] = res["value"]

        return {
            "status": "VALID",
            "zone": zone,
            "topic": topic,
            "payload": sanitized_payload,
            "mqtt_publish": True
        }

    def _validate_field(
        self,
        zone: str,
        key: str,
        value: Any,
        allowed_specs: Dict[str, Any],
        is_emergency_active: bool
    ) -> Dict[str, Any]:
        """Validates a single field against hardware schema and safety rules."""
        # Check aliases
        normalized_key = key
        spec = None

        if key in allowed_specs:
            spec = allowed_specs[key]
        else:
            # Check for aliases (e.g. fan_speed_pwm -> bedroom_fan_pwm, exhaust_fan -> exhaust_fan_speed_pct)
            for standard_key, s in allowed_specs.items():
                aliases = s.get("aliases", [])
                if key in aliases or key == standard_key:
                    normalized_key = standard_key
                    spec = s
                    break

        if not spec:
            return {
                "valid": False,
                "reason": f"Actuator '{key}' does not exist in {zone} hardware contract."
            }

        expected_type = spec.get("type")

        # Emergency Safety Invariant
        if is_emergency_active:
            # Cannot turn off safety lighting, buzzer, or ventilation during emergency
            if normalized_key in ("bedroom_light", "hall_light", "kitchen_light", "bathroom_light", "buzzer_active"):
                if value is False or value == 0:
                    return {
                        "valid": False,
                        "reason": f"Safety Violation: Cannot turn OFF '{normalized_key}' while Emergency Protocol is active."
                    }
            if normalized_key == "exhaust_fan_speed_pct":
                if isinstance(value, (int, float)) and value < 100:
                    return {
                        "valid": False,
                        "reason": "Safety Violation: Exhaust fan must run at 100% while Emergency Protocol is active."
                    }

        # Type & Range Verification
        if expected_type == "boolean":
            if not isinstance(value, bool):
                # Accept 0 or 1 converted to bool
                if value in (0, 1):
                    value = bool(value)
                else:
                    return {
                        "valid": False,
                        "reason": f"Actuator '{key}' expects boolean (true/false), got {type(value).__name__} ({value})."
                    }
            return {"valid": True, "normalized_key": normalized_key, "value": value}

        elif expected_type == "integer":
            if not isinstance(value, (int, float)):
                return {
                    "valid": False,
                    "reason": f"Actuator '{key}' expects integer number, got {type(value).__name__} ({value})."
                }
            val_int = int(round(value))
            min_val = spec.get("min", 0)
            max_val = spec.get("max", 255)
            if val_int < min_val or val_int > max_val:
                return {
                    "valid": False,
                    "reason": f"Value {val_int} for '{key}' is out of valid range [{min_val}, {max_val}]."
                }
            return {"valid": True, "normalized_key": normalized_key, "value": val_int}

        return {
            "valid": False,
            "reason": f"Unsupported specification type '{expected_type}' for '{key}'."
        }

command_validator = CommandValidator()
