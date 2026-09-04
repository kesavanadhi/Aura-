import time
import json
from datetime import datetime
from typing import Dict, Any, Optional, Callable
from config import settings
from logger import log_emergency, log_ai

class AlertManager:
    """
    Emergency and Life-Safety Event Coordinator.
    Subscribes to aura/emergency and forwards to Zone 1 actuators while preventing infinite loops.
    """
    def __init__(self, publish_mqtt_fn: Optional[Callable[[str, str], None]] = None):
        self.publish_mqtt = publish_mqtt_fn
        self.active_emergency: Optional[Dict[str, Any]] = None
        self.last_handled_event_id: str = ""
        self.last_handled_time: float = 0.0

    def set_publisher(self, fn: Callable[[str, str], None]):
        self.publish_mqtt = fn

    def handle_emergency_message(self, payload_str: str):
        """
        Receives inbound emergency notification (e.g. from ESP32 hardware button on GPIO 4
        or dashboard) and applies emergency priority policy.
        """
        try:
            data = json.loads(payload_str)
        except Exception:
            data = {"event": "GENERIC_EMERGENCY", "raw": payload_str}

        event_type = data.get("event", "EMERGENCY_ALERT")
        sender = data.get("source", "")

        # Prevent infinite echo loops if the edge server was the sender
        if sender == "edge_ai_server":
            return

        now = time.time()
        event_sig = f"{event_type}_{data.get('timestamp', '')}"
        if event_sig == self.last_handled_event_id and (now - self.last_handled_time < 3.0):
            return  # Suppress rapid duplicate echo

        self.last_handled_event_id = event_sig
        self.last_handled_time = now

        log_emergency(f"Zone 1 emergency event triggered: {event_type}")

        self.active_emergency = {
            "type": event_type,
            "timestamp": datetime.now().isoformat(),
            "details": data
        }

        # Command Zone 1 actuators: Turn lights ON, sound buzzer
        if self.publish_mqtt:
            control_cmd = {
                "bedroom_light": True,
                "hall_light": True,
                "buzzer_active": True
            }
            self.publish_mqtt(settings.TOPIC_CONTROL, json.dumps(control_cmd, separators=(',', ':')))
            log_emergency("Zone 1 Actuators Engaged: Bedroom Light ON, Hall Light ON, Rescue Buzzer SOUNDING")

    def handle_fall_detection(self, fall_data: Dict[str, Any]):
        """
        Called by local computer vision engine when a confirmed fall occurs.
        """
        log_emergency(f"Local AI Vision Fall Detection Verified: {fall_data.get('confidence', 0.0):.2f}")
        self.active_emergency = fall_data

        if self.publish_mqtt:
            # 1. Publish to aura/ai/fall
            self.publish_mqtt(settings.TOPIC_AI_FALL, json.dumps(fall_data, separators=(',', ':')))

            # 2. Publish to aura/emergency
            emergency_notice = {
                "node_id": settings.NODE_ID,
                "zone": settings.ZONE_NAME,
                "event": "POSSIBLE_FALL",
                "severity": "CRITICAL",
                "confidence": fall_data.get("confidence", 0.91),
                "timestamp": datetime.now().isoformat(),
                "source": "edge_ai_server"
            }
            self.publish_mqtt(settings.TOPIC_EMERGENCY, json.dumps(emergency_notice, separators=(',', ':')))

            # 3. Direct actuator safety intervention
            control_cmd = {
                "bedroom_light": True,
                "hall_light": True,
                "buzzer_active": True
            }
            self.publish_mqtt(settings.TOPIC_CONTROL, json.dumps(control_cmd, separators=(',', ':')))

    def dismiss_emergency(self):
        self.active_emergency = None
        log_ai("Emergency cleared by user -> Silencing buzzer and returning to auto mode")
        if self.publish_mqtt:
            control_cmd = {
                "buzzer_active": False
            }
            self.publish_mqtt(settings.TOPIC_CONTROL, json.dumps(control_cmd, separators=(',', ':')))
