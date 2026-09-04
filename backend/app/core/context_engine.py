import time
from typing import Dict, Any, List
from app.config import settings
from app.models.schemas import FullTelemetry, ActuatorStates, ContextState, EnergyMetrics

class AIContextEngine:
    """
    Core Cognitive Engine for AURA:
    Sense -> Understand -> Predict -> Decide -> Act -> Assist
    Fuses telemetry, ambient light, thermal conditions, occupancy, and hazards.
    """
    def __init__(self):
        self.context_state = ContextState()
        self.energy_metrics = EnergyMetrics()
        self.last_motion_times: Dict[str, float] = {
            "bedroom": time.time(),
            "hall": time.time(),
            "kitchen": time.time(),
            "bathroom": time.time()
        }
        self.last_evaluated_time = time.time()
        
    def update_telemetry(self, telemetry: FullTelemetry, current_actuators: ActuatorStates) -> Dict[str, Any]:
        current_time = time.time()
        logs: List[str] = []
        hazards: List[str] = []
        
        # 1. Track Occupancy Timestamps
        if telemetry.bedroom.occupancy:
            self.last_motion_times["bedroom"] = current_time
        if telemetry.hall.occupancy:
            self.last_motion_times["hall"] = current_time
        if telemetry.bathroom.occupancy:
            self.last_motion_times["bathroom"] = current_time

        # 2. Daytime & Ambient Light (LDR) Adaptive Dimming
        # If ambient daylight is high (> threshold), dim or turn off indoor lighting
        is_daylight_sufficient = telemetry.bedroom.ambient_lux >= settings.LDR_DAYLIGHT_THRESHOLD_LUX
        self.context_state.ambient_light_dimmed = is_daylight_sufficient
        
        if is_daylight_sufficient:
            logs.append(f"[Daylight Dimmer] High ambient light detected ({telemetry.bedroom.ambient_lux} lux). Dimming/Auto-off lighting.")

        # 3. Climate & Temperature Adaptive Fan Modulation (Rain/Winter vs. Summer)
        temp = telemetry.kitchen.temperature_c
        if temp < settings.TEMP_COLD_WINTER_THRESHOLD:
            self.context_state.climate_condition = "COLD_WINTER"
            self.context_state.climate_fan_target_pwm = 0  # Turn fan off or lowest tick
            logs.append(f"[Climate Fan] Cold/Rainy climate detected ({temp:.1f}°C < {settings.TEMP_COLD_WINTER_THRESHOLD}°C). Fan throttled to OFF/0 PWM.")
        elif temp < settings.TEMP_MODERATE_THRESHOLD:
            self.context_state.climate_condition = "MODERATE"
            self.context_state.climate_fan_target_pwm = 110  # Gentle breeze
            logs.append(f"[Climate Fan] Moderate climate ({temp:.1f}°C). Fan target 110 PWM (43%).")
        elif temp < settings.TEMP_WARM_THRESHOLD:
            self.context_state.climate_condition = "WARM"
            self.context_state.climate_fan_target_pwm = 180  # Medium
        else:
            self.context_state.climate_condition = "HOT"
            self.context_state.climate_fan_target_pwm = 255  # Maximum cooling

        # 4. Empty Room Inactivity Detection & Energy Intelligence
        dt = current_time - self.last_evaluated_time
        self.last_evaluated_time = current_time
        
        # Compute real-time power consumption
        active_power = 0.0
        if current_actuators.bedroom_light:
            active_power += settings.TYPICAL_LIGHT_WATTAGE
        if current_actuators.bedroom_fan_pwm > 0:
            active_power += settings.TYPICAL_FAN_WATTAGE * (current_actuators.bedroom_fan_pwm / 255.0)
        if current_actuators.hall_light:
            active_power += settings.TYPICAL_LIGHT_WATTAGE
        if current_actuators.hall_fan_pwm > 0:
            active_power += settings.TYPICAL_FAN_WATTAGE * (current_actuators.hall_fan_pwm / 255.0)
        if current_actuators.kitchen_light:
            active_power += settings.TYPICAL_LIGHT_WATTAGE
        if current_actuators.exhaust_fan:
            active_power += 65.0  # High-volume exhaust fan
        if current_actuators.bathroom_light:
            active_power += settings.TYPICAL_LIGHT_WATTAGE
            
        self.energy_metrics.current_power_watts = round(active_power, 1)

        # 5. Check Room Vacancy Auto-Cutoff (> 45 seconds idle)
        bedroom_idle = (current_time - self.last_motion_times["bedroom"]) > settings.EMPTY_ROOM_TIMEOUT_SECONDS
        if bedroom_idle and (current_actuators.bedroom_light or current_actuators.bedroom_fan_pwm > 0):
            logs.append("[Energy Intelligence] Bedroom vacant > 45s. Auto-cutoff saving triggered.")
            self.energy_metrics.cumulative_saved_kwh += 0.005
            self.energy_metrics.last_auto_shutdown_event = f"Bedroom auto-shutdown at {time.strftime('%H:%M:%S')}"

        hall_idle = (current_time - self.last_motion_times["hall"]) > settings.EMPTY_ROOM_TIMEOUT_SECONDS
        if hall_idle and (current_actuators.hall_light or current_actuators.hall_fan_pwm > 0):
            logs.append("[Energy Intelligence] Hall vacant > 45s. Auto-cutoff saving triggered.")
            self.energy_metrics.cumulative_saved_kwh += 0.004
            self.energy_metrics.last_auto_shutdown_event = f"Hall auto-shutdown at {time.strftime('%H:%M:%S')}"

        # 6. Safety Hazards Interceptor
        if telemetry.kitchen.gas_ppm >= settings.GAS_CRITICAL_PPM:
            hazards.append("CRITICAL_GAS_LEAK_LPG")
            logs.append(f"[Safety Alert] CRITICAL Gas concentration detected: {telemetry.kitchen.gas_ppm} ppm!")
        elif telemetry.kitchen.gas_ppm >= settings.GAS_WARNING_PPM:
            hazards.append("GAS_WARNING")
            logs.append(f"[Safety Warning] Elevated gas levels detected: {telemetry.kitchen.gas_ppm} ppm.")

        # Synthesize Context String
        if hazards:
            self.context_state.current_context = f"HAZARD_{hazards[0]}"
        elif self.context_state.active_emergency:
            self.context_state.current_context = f"EMERGENCY_{self.context_state.active_emergency}"
        elif telemetry.bedroom.occupancy or telemetry.hall.occupancy:
            self.context_state.current_context = f"OCCUPIED_{self.context_state.climate_condition}"
        else:
            self.context_state.current_context = "ECO_STANDBY"

        self.context_state.active_hazards = hazards
        self.context_state.reasoning_logs = logs[-8:]  # Keep last 8 logs
        
        return {
            "context": self.context_state,
            "energy": self.energy_metrics,
            "is_daylight_sufficient": is_daylight_sufficient,
            "target_fan_pwm": self.context_state.climate_fan_target_pwm,
            "bedroom_idle": bedroom_idle,
            "hall_idle": hall_idle
        }

context_engine = AIContextEngine()
