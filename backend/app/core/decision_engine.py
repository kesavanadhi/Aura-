from typing import Tuple, Dict, Any, Optional
from app.models.schemas import FullTelemetry, ActuatorStates, ContextState, EmergencyIncident
from app.config import settings

class AIDecisionEngine:
    """
    Evaluates Context Engine states and executes autonomous actuation:
    Predict -> Decide -> Act
    Supports manual user overrides and intensity adjustments.
    """
    def __init__(self):
        self.current_actuators = ActuatorStates()
        self.manual_overrides: Dict[str, Any] = {}

    def process_decisions(
        self,
        telemetry: FullTelemetry,
        context: ContextState,
        active_emergency: Optional[EmergencyIncident] = None
    ) -> ActuatorStates:
        states = self.current_actuators

        # 1. EMERGENCY PRIORITY OVERRIDE (Fall or Fire/Gas) - Safety critical, highest priority
        if active_emergency is not None:
            if active_emergency.type == "POSSIBLE_FALL":
                states.bedroom_light = True
                states.hall_light = True
                states.buzzer_active = True
                states.emergency_light_mode = True
                return states
                
            elif active_emergency.type in ["GAS_LEAK_LPG", "SMOKE_HAZARD", "THERMAL_FIRE"]:
                states.exhaust_fan = True
                states.exhaust_fan_speed_pct = 100
                states.kitchen_light = True
                states.hall_light = True
                states.buzzer_active = True
                states.emergency_light_mode = True
                return states

        # Normal Autonomous Mode
        states.emergency_light_mode = False
        if "buzzer_active" in self.manual_overrides:
            states.buzzer_active = bool(self.manual_overrides["buzzer_active"])
        else:
            states.buzzer_active = False

        # 2. BEDROOM AUTONOMOUS CONTROL
        if "bedroom_light" in self.manual_overrides:
            states.bedroom_light = bool(self.manual_overrides["bedroom_light"])
        else:
            if telemetry.bedroom.occupancy:
                # Daytime LDR Dimming: If ambient lux is high, keep light off/dimmed
                if context.ambient_light_dimmed:
                    states.bedroom_light = False
                else:
                    states.bedroom_light = True
            else:
                # Empty room cutoff
                states.bedroom_light = False

        if "bedroom_fan_pwm" in self.manual_overrides:
            states.bedroom_fan_pwm = int(self.manual_overrides["bedroom_fan_pwm"])
        else:
            if telemetry.bedroom.occupancy:
                states.bedroom_fan_pwm = context.climate_fan_target_pwm
            else:
                states.bedroom_fan_pwm = 0

        if "curtain_servo_angle" in self.manual_overrides:
            states.curtain_servo_angle = int(self.manual_overrides["curtain_servo_angle"])

        # 3. HALL AUTONOMOUS CONTROL
        if "hall_light" in self.manual_overrides:
            states.hall_light = bool(self.manual_overrides["hall_light"])
        else:
            if telemetry.hall.occupancy:
                if context.ambient_light_dimmed:
                    states.hall_light = False
                else:
                    states.hall_light = True
            else:
                states.hall_light = False

        if "hall_fan_pwm" in self.manual_overrides:
            states.hall_fan_pwm = int(self.manual_overrides["hall_fan_pwm"])
        else:
            if telemetry.hall.occupancy:
                states.hall_fan_pwm = context.climate_fan_target_pwm
            else:
                states.hall_fan_pwm = 0

        # 4. KITCHEN AUTONOMOUS CONTROL
        if "kitchen_light" in self.manual_overrides:
            states.kitchen_light = bool(self.manual_overrides["kitchen_light"])
        else:
            kitchen_temp = telemetry.kitchen.temperature_c
            gas_ppm = telemetry.kitchen.gas_ppm
            # Auto-on if hazard/emergency or high cooking heat detected (> 32°C)
            if active_emergency or gas_ppm >= settings.GAS_WARNING_PPM or kitchen_temp > 32.0:
                states.kitchen_light = True
            else:
                states.kitchen_light = False

        if "exhaust_fan" in self.manual_overrides:
            states.exhaust_fan = bool(self.manual_overrides["exhaust_fan"])
            if "exhaust_fan_speed_pct" in self.manual_overrides:
                states.exhaust_fan_speed_pct = int(self.manual_overrides["exhaust_fan_speed_pct"])
            else:
                states.exhaust_fan_speed_pct = 100 if states.exhaust_fan else 0
        elif "exhaust_fan_speed_pct" in self.manual_overrides:
            speed = int(self.manual_overrides["exhaust_fan_speed_pct"])
            states.exhaust_fan_speed_pct = speed
            states.exhaust_fan = speed > 0
        else:
            kitchen_temp = telemetry.kitchen.temperature_c
            gas_ppm = telemetry.kitchen.gas_ppm

            if gas_ppm >= settings.GAS_WARNING_PPM or active_emergency:
                states.exhaust_fan = True
                states.exhaust_fan_speed_pct = 100
            elif kitchen_temp > 26.0:
                temp_ratio = (kitchen_temp - 26.0) / (45.0 - 26.0)
                speed = min(100, max(30, int(30 + temp_ratio * 70)))
                states.exhaust_fan = True
                states.exhaust_fan_speed_pct = speed
            else:
                states.exhaust_fan = False
                states.exhaust_fan_speed_pct = 0

        # 5. BATHROOM AUTONOMOUS CONTROL
        if "bathroom_light" in self.manual_overrides:
            states.bathroom_light = bool(self.manual_overrides["bathroom_light"])
        else:
            # Active occupancy if PIR is triggered OR ultrasonic detects obstacle within 80cm
            is_occupied = telemetry.bathroom.occupancy or (
                0.0 < telemetry.bathroom.obstacle_distance_cm < 80.0
            )
            states.bathroom_light = is_occupied

        self.current_actuators = states
        return states

    def manual_override(self, device: str, state: Any) -> ActuatorStates:
        """Handles manual user overrides from dashboard controls with persistent retention."""
        self.manual_overrides[device] = state
        if hasattr(self.current_actuators, device):
            setattr(self.current_actuators, device, state)
        # Helper for synchronized exhaust fan toggle and speed
        if device == "exhaust_fan":
            if not state:
                self.current_actuators.exhaust_fan_speed_pct = 0
                self.manual_overrides["exhaust_fan_speed_pct"] = 0
            elif self.current_actuators.exhaust_fan_speed_pct == 0:
                self.current_actuators.exhaust_fan_speed_pct = 100
                self.manual_overrides["exhaust_fan_speed_pct"] = 100
        elif device == "exhaust_fan_speed_pct":
            self.current_actuators.exhaust_fan = state > 0
            self.manual_overrides["exhaust_fan"] = state > 0
        elif device == "bedroom_fan_pwm":
            pass
        elif device == "hall_fan_pwm":
            pass

        return self.current_actuators

    def clear_override(self, device: str) -> ActuatorStates:
        """Clears a specific manual override, returning device to autonomous control."""
        self.manual_overrides.pop(device, None)
        return self.current_actuators

    def clear_all_overrides(self) -> ActuatorStates:
        """Clears all manual overrides, restoring full AI Cognitive Mode."""
        self.manual_overrides.clear()
        return self.current_actuators

    def get_override_status(self) -> Dict[str, Any]:
        """Returns the current active overrides dictionary."""
        return dict(self.manual_overrides)

decision_engine = AIDecisionEngine()
