import sys
import time
import json
import signal
from pathlib import Path
from typing import Dict, Any

# Ensure local edge server package is in Python path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import settings
from logger import edge_logger, log_mqtt, log_ai, log_emergency, log_camera, log_error
from telemetry import Zone1Telemetry
from occupancy_ai import OccupancyAI
from decision_engine import DecisionEngine
from alert_manager import AlertManager
from fall_detection import LocalFallDetector
from mqtt_handler import MqttHandler

class Zone1EdgeServer:
    """
    Complete AI Edge Server for PROJECT AURA — Zone 1 (Bedroom + Hallway).
    Provides real-time multi-sensor intelligence, explainable actuation policies,
    local computer-vision fall detection, and life-safety emergency coordination.
    """
    def __init__(self):
        edge_logger.info("==========================================================")
        edge_logger.info("PROJECT AURA — ZONE 1 AI EDGE SERVER")
        edge_logger.info("Autonomous Cognitive Resident Assistant & Edge Vision")
        edge_logger.info(f"Target Broker: {settings.MQTT_BROKER}:{settings.MQTT_PORT}")
        edge_logger.info("==========================================================")

        self.is_running = False

        # 1. Initialize Subsystems
        self.occupancy_ai = OccupancyAI()
        self.decision_engine = DecisionEngine()
        self.alert_manager = AlertManager()

        # 2. Local CV Fall Detection with Camera Live Streaming
        self.fall_detector = LocalFallDetector(on_fall_callback=self._on_fall_detected)

        # 3. MQTT Handler
        self.mqtt_handler = MqttHandler(
            on_telemetry_cb=self._on_telemetry_received,
            on_emergency_cb=self._on_emergency_received,
            on_manual_control_cb=self._on_manual_control_received
        )

        # Link alert manager to MQTT publisher
        self.alert_manager.set_publisher(self.mqtt_handler.publish)

        # Telemetry processing rate limiter (avoid excessive processing)
        self.last_telemetry_log_time = 0.0

    def start(self):
        self.is_running = True

        # Start Camera & Local Fall Detection Engine
        self.fall_detector.start()

        # Start MQTT Connection
        self.mqtt_handler.start()

        log_ai("AURA Zone 1 AI Edge Server is fully operational and listening for telemetry.")

        # Keep main thread alive
        try:
            while self.is_running:
                time.sleep(0.5)
        except (KeyboardInterrupt, SystemExit):
            self.stop()

    def stop(self):
        if not self.is_running:
            return
        self.is_running = False
        edge_logger.info("Shutting down AI Edge Server gracefully...")
        self.fall_detector.stop()
        self.mqtt_handler.stop()
        edge_logger.info("AI Edge Server stopped.")

    def _on_telemetry_received(self, raw_payload: str):
        now = time.time()
        telemetry = Zone1Telemetry.parse(raw_payload)
        if not telemetry:
            return

        if now - self.last_telemetry_log_time >= 5.0:
            log_mqtt(f"Telemetry received from {telemetry.node_id} (Bed Lux={telemetry.bedroom.ambient_lux}, Hall US={telemetry.hall.obstacle_distance_cm:.1f}cm)")
            self.last_telemetry_log_time = now

        # 1. Evaluate Sensor Intelligence & Multi-Sensor Occupancy
        bed_occ, hall_occ, occ_payload = self.occupancy_ai.evaluate(telemetry)

        # Publish AI Occupancy Event to aura/ai/occupancy
        self.mqtt_handler.publish(
            settings.TOPIC_AI_OCCUPANCY,
            json.dumps(occ_payload, separators=(',', ':'))
        )

        # 2. Evaluate Explainable Actuation Decisions
        decisions = self.decision_engine.evaluate(telemetry, bed_occ, hall_occ)

        # Publish each explainable AI decision to aura/ai/decision
        for dec in decisions:
            self.mqtt_handler.publish(
                settings.TOPIC_AI_DECISION,
                json.dumps(dec, separators=(',', ':'))
            )

        # 3. Synchronize Actuator States to Hardware if decisions were made
        if decisions:
            actuator_cmd = self.decision_engine.get_actuator_control_payload()
            actuator_cmd["source"] = "edge_ai_server"
            self.mqtt_handler.publish(
                settings.TOPIC_CONTROL,
                json.dumps(actuator_cmd, separators=(',', ':'))
            )

    def _on_emergency_received(self, payload_str: str):
        log_emergency(f"Inbound emergency signal on {settings.TOPIC_EMERGENCY}")
        self.alert_manager.handle_emergency_message(payload_str)

    def _on_manual_control_received(self, control_dict: Dict[str, Any]):
        # Distinguish between edge server commands and external website commands
        source = control_dict.get("source", "")
        if source == "edge_ai_server":
            return

        for dev, val in control_dict.items():
            if dev in ["bedroom_light", "hall_light", "bedroom_fan_pwm", "hall_fan_pwm", "curtain_servo_angle", "buzzer_active"]:
                self.decision_engine.set_manual_override(dev, val)

    def _on_fall_detected(self, fall_data: Dict[str, Any]):
        self.alert_manager.handle_fall_detection(fall_data)

def main():
    server = Zone1EdgeServer()

    def sig_handler(sig, frame):
        server.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, sig_handler)
    signal.signal(signal.SIGTERM, sig_handler)

    server.start()

if __name__ == "__main__":
    main()
