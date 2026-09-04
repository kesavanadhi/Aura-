import time
import random
from typing import Dict, Any, Optional
from app.models.schemas import FullTelemetry, BedroomTelemetry, HallTelemetry, KitchenTelemetry, BathroomTelemetry
from app.vision.fall_detector import fall_detector
from app.core.safety_guardian import safety_guardian
from app.core.navigation_engine import indoor_navigator
from app.core.voice_assistant import voice_assistant

class HackathonScenarioSimulator:
    """
    Simulates real-time IoT sensory streams and orchestrates the
    11-Step Hackathon Jury Demonstration without requiring physical hardware.
    """
    def __init__(self):
        self.simulation_enabled: bool = True
        self.current_telemetry = FullTelemetry()
        
        # Base realistic baselines
        self.base_temp: float = 24.5
        self.base_lux: int = 420
        self.base_gas_ppm: int = 210

    def tick_stream(self) -> FullTelemetry:
        """Adds slight natural fluctuations to telemetry during standby."""
        if not self.simulation_enabled:
            return self.current_telemetry

        # Micro fluctuations
        self.current_telemetry.timestamp = time.time()
        self.current_telemetry.kitchen.temperature_c = round(self.base_temp + random.uniform(-0.2, 0.2), 1)
        self.current_telemetry.kitchen.humidity_pct = round(54.0 + random.uniform(-0.5, 0.5), 1)
        self.current_telemetry.kitchen.gas_ppm = int(self.base_gas_ppm + random.randint(-8, 8))
        self.current_telemetry.bedroom.ambient_lux = max(10, int(self.base_lux + random.randint(-15, 15)))
        return self.current_telemetry
    def adjust_values(self, adjustments: Dict[str, Any]) -> FullTelemetry:
        """Adjusts simulated sensor parameters dynamically."""
        if "kitchen_temp" in adjustments:
            val = float(adjustments["kitchen_temp"])
            self.base_temp = val
            self.current_telemetry.kitchen.temperature_c = round(val, 1)
        if "gas_ppm" in adjustments:
            val = int(adjustments["gas_ppm"])
            self.base_gas_ppm = val
            self.current_telemetry.kitchen.gas_ppm = val
        if "humidity_pct" in adjustments:
            self.current_telemetry.kitchen.humidity_pct = float(adjustments["humidity_pct"])
        if "ambient_lux" in adjustments:
            val = int(adjustments["ambient_lux"])
            self.base_lux = val
            self.current_telemetry.bedroom.ambient_lux = val
        if "obstacle_distance_cm" in adjustments:
            self.current_telemetry.hall.obstacle_distance_cm = float(adjustments["obstacle_distance_cm"])
        if "bedroom_occupancy" in adjustments:
            self.current_telemetry.bedroom.occupancy = bool(adjustments["bedroom_occupancy"])
        if "hall_occupancy" in adjustments:
            self.current_telemetry.hall.occupancy = bool(adjustments["hall_occupancy"])
        if "bathroom_occupancy" in adjustments:
            self.current_telemetry.bathroom.occupancy = bool(adjustments["bathroom_occupancy"])
        return self.current_telemetry

    # The 11 Demonstration Step Handlers
    def step1_enter_bedroom(self) -> Dict[str, Any]:
        """Step 1: Person enters bedroom -> Occupancy triggers lighting & fan."""
        self.current_telemetry.bedroom.occupancy = True
        self.base_lux = 380  # Dim ambient light so light turns on
        return {"step": 1, "description": "Person entered Bedroom. Occupancy verified."}

    def step2_daylight_dimmer_test(self) -> Dict[str, Any]:
        """Step 2: Bright daylight enters Bedroom -> LDR senses >650 lux -> Light auto dims/off."""
        self.current_telemetry.bedroom.ambient_lux = 850
        self.base_lux = 850
        return {"step": 2, "description": "Daylight spike (850 lux) detected. LDR dimmer engaged."}

    def step3_climate_cold_test(self) -> Dict[str, Any]:
        """Step 3: Rainy/Winter climate -> Temperature drops <22°C -> Fan throttled down/off."""
        self.current_telemetry.kitchen.temperature_c = 19.5
        self.base_temp = 19.5
        return {"step": 3, "description": "Cold/Rainy climate (19.5°C) simulated. Fan auto-throttled."}

    def step4_voice_command_test(self, command: str = "AURA, turn on the hall light") -> Dict[str, Any]:
        """Step 4: Resident issues wake-word command."""
        res = voice_assistant.process_voice_input(command, self.current_telemetry)
        return {"step": 4, "transcript": command, "voice_response": res.spoken_feedback}

    def step5_navigation_request(self, dest: str = "Kitchen") -> Dict[str, Any]:
        """Step 5: Request indoor navigation to destination."""
        nav = indoor_navigator.calculate_route("Bedroom", dest)
        return {"step": 5, "destination": dest, "route": nav.safe_route, "guidance": nav.voice_guidance}

    def step6_obstacle_recalculation(self) -> Dict[str, Any]:
        """Step 6: Obstacle appears in Hall Central -> Dynamic rerouting via Bypass path."""
        self.current_telemetry.hall.obstacle_distance_cm = 22.0  # Obstacle within 22 cm
        indoor_navigator.update_sensor_obstacles(22.0, 150.0)
        nav = indoor_navigator.calculate_route("Bedroom", "Kitchen")
        return {
            "step": 6,
            "obstacle_location": "HALL_CENTRAL",
            "rerouted_path": nav.safe_route,
            "guidance": nav.voice_guidance
        }

    def step7_8_fall_detection(self) -> Dict[str, Any]:
        """Steps 7 & 8: Simulated fall detected & verified -> Snapshot captured -> Emergency triggered."""
        incident = fall_detector.trigger_simulated_fall("Bedroom")
        return {
            "step": "7 & 8",
            "event_id": incident.event_id,
            "status": "CRITICAL_FALL_CONFIRMED",
            "evidence_snapshot": incident.evidence_snapshot_url,
            "triage": incident.gemini_triage_summary
        }

    def step9_call_ambulance_108(self) -> Dict[str, Any]:
        """Step 9: User clicks 'SOS Emergency Call' button."""
        return {
            "step": 9,
            "action": "TRIGGER_SOS_EMERGENCY_CALL",
            "number": "EMERGENCY_SERVICES",
            "gps": "12.9716° N, 77.5946° E",
            "google_maps_url": "https://www.google.com/maps/search/?api=1&query=12.9716,77.5946",
            "status": "SOS_EMERGENCY_CALL_DISPATCHED"
        }

    def step10_gas_leak_hazard(self) -> Dict[str, Any]:
        """Step 10: MQ-2 sensor spikes to 1450 ppm -> LPG classification -> Exhaust fan + Alarm."""
        self.current_telemetry.kitchen.gas_ppm = 1450
        self.base_gas_ppm = 1450
        incident = safety_guardian.evaluate_hazard(1450, 26.0, 55.0)
        return {
            "step": 10,
            "gas_ppm": 1450,
            "hazard_classification": "GAS_LEAK_LPG",
            "exhaust_fan_engaged": True,
            "snapshot_url": incident.evidence_snapshot_url if incident else None
        }

    def step11_vacant_energy_cutoff(self) -> Dict[str, Any]:
        """Step 11: Resident leaves -> Rooms vacant -> Unnecessary appliances auto shut off -> Energy saved."""
        self.current_telemetry.bedroom.occupancy = False
        self.current_telemetry.hall.occupancy = False
        self.current_telemetry.bathroom.occupancy = False
        return {
            "step": 11,
            "occupancy": "ALL_VACANT",
            "action": "ENERGY_INTELLIGENCE_AUTO_SHUTDOWN",
            "savings_logged": "+0.009 kWh"
        }

    def reset_all(self):
        """Resets scenario simulator to clean initial state."""
        self.base_temp = 24.5
        self.base_lux = 420
        self.base_gas_ppm = 210
        self.current_telemetry = FullTelemetry()
        fall_detector.dismiss_emergency()
        safety_guardian.dismiss_hazard()
        indoor_navigator.set_obstacle("HALL_CENTRAL", False)
        indoor_navigator.set_obstacle("BATHROOM_DOOR", False)

simulator = HackathonScenarioSimulator()
