import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.iot.simulator import simulator
from app.core.context_engine import context_engine
from app.core.decision_engine import decision_engine
from app.core.navigation_engine import indoor_navigator
from app.core.safety_guardian import safety_guardian
from app.vision.fall_detector import fall_detector
from app.core.voice_assistant import voice_assistant
from app.models.schemas import ActuatorStates

def test_aura_suite():
    print("\n--- TEST 1: Context Engine & LDR Daytime Dimmer ---")
    telemetry = simulator.current_telemetry
    telemetry.bedroom.occupancy = True
    telemetry.bedroom.ambient_lux = 800  # High daylight
    ctx_res = context_engine.update_telemetry(telemetry, ActuatorStates())
    assert ctx_res["is_daylight_sufficient"] is True
    actuators = decision_engine.process_decisions(telemetry, ctx_res["context"])
    assert actuators.bedroom_light is False  # Daylight dimmer auto-switched off light
    print("PASS: LDR Daytime Dimmer successfully auto-off/dimmed light!")

    print("\n--- TEST 2: Climate-Adaptive Fan Speed (<22°C Winter/Rainy) ---")
    telemetry.kitchen.temperature_c = 20.0
    ctx_res = context_engine.update_telemetry(telemetry, ActuatorStates())
    assert ctx_res["context"].climate_condition == "COLD_WINTER"
    assert ctx_res["target_fan_pwm"] == 0
    actuators = decision_engine.process_decisions(telemetry, ctx_res["context"])
    assert actuators.bedroom_fan_pwm == 0
    print("PASS: Cold/Rainy climate throttled fan speed to 0 PWM!")

    print("\n--- TEST 3: Dynamic Indoor Navigation & Obstacle Rerouting ---")
    # Normal route Bedroom -> Kitchen
    indoor_navigator.set_obstacle("HALL_CENTRAL", False)
    nav_clear = indoor_navigator.calculate_route("Bedroom", "Kitchen")
    assert "HALL_CENTRAL" in nav_clear.safe_route
    print(f"PASS: Normal route clear: {' -> '.join(nav_clear.safe_route)}")

    # Inject obstacle in Hall Central
    indoor_navigator.set_obstacle("HALL_CENTRAL", True)
    nav_reroute = indoor_navigator.calculate_route("Bedroom", "Kitchen")
    assert "HALL_BYPASS" in nav_reroute.safe_route
    assert "HALL_CENTRAL" not in nav_reroute.safe_route
    assert nav_reroute.path_status == "OBSTACLE_DETECTED_REROUTED"
    print(f"PASS: Dynamic reroute via Bypass: {' -> '.join(nav_reroute.safe_route)}")

    print("\n--- TEST 4: Fall Detection & 108 Ambulance Dispatch ---")
    incident = fall_detector.trigger_simulated_fall("Bedroom")
    assert incident.type == "POSSIBLE_FALL"
    assert incident.ambulance_dispatch.contact_number == "108"
    assert incident.ambulance_dispatch.dial_action == "tel:108"
    assert "108" in incident.ambulance_dispatch.dial_action
    print(f"PASS: Emergency incident verified. Ambulance Hotline: {incident.ambulance_dispatch.contact_number}")
    print(f"PASS: Evidence Snapshot URL: {incident.evidence_snapshot_url}")

    print("\n--- TEST 5: Safety Guardian Gas Hazard Classification ---")
    hazard = safety_guardian.evaluate_hazard(1400, 25.0, 50.0)
    assert hazard is not None
    assert hazard.type == "GAS_LEAK_LPG"
    assert hazard.severity == "CRITICAL"
    print(f"PASS: MQ-2 concentration 1400 ppm classified as: {hazard.type}")

    print("\n--- TEST 6: Voice Assistant Wake-Word 'AURA' ---")
    voice_res = voice_assistant.process_voice_input("AURA, turn on the hall light", telemetry)
    assert voice_res.wake_word_detected is True
    assert decision_engine.current_actuators.hall_light is True
    print(f"PASS: Wake-word detected. Action: {voice_res.action_taken}. Feedback: {voice_res.spoken_feedback}")

    print("\n==================================================")
    print("  ALL 6 AURA BACKEND SUITE TESTS PASSED 100%!     ")
    print("==================================================\n")

if __name__ == "__main__":
    test_aura_suite()
