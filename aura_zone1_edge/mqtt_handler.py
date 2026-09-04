import time
import json
import paho.mqtt.client as mqtt
from typing import Callable, Optional, Dict, Any

from config import settings
from logger import log_mqtt, log_error, log_ai

class MqttHandler:
    """
    Robust Reconnecting MQTT Client for AURA Zone 1 AI Edge Server.
    Subscribes to telemetry, emergency, and control topics.
    Publishes AI occupancy, AI decisions, AI fall events, and actuator commands.
    """
    def __init__(
        self,
        on_telemetry_cb: Optional[Callable[[str], None]] = None,
        on_emergency_cb: Optional[Callable[[str], None]] = None,
        on_manual_control_cb: Optional[Callable[[Dict[str, Any]], None]] = None
    ):
        self.on_telemetry = on_telemetry_cb
        self.on_emergency = on_emergency_cb
        self.on_manual_control = on_manual_control_cb

        self.client: Optional[mqtt.Client] = None
        self.connected = False
        self.is_running = False

    def start(self):
        self.is_running = True
        client_id = f"AURA-AI-Edge-Server-{int(time.time())}"

        # Support both paho-mqtt v1.x and v2.x using standard MQTT 3.1.1 protocol
        try:
            self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=client_id, protocol=mqtt.MQTTv311)
        except Exception:
            self.client = mqtt.Client(client_id=client_id, protocol=mqtt.MQTTv311)

        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)

        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message

        try:
            log_mqtt(f"Connecting to broker {settings.MQTT_BROKER}:{settings.MQTT_PORT}...")
            self.client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, keepalive=settings.MQTT_KEEPALIVE)
            self.client.loop_start()
        except Exception as e:
            if settings.MQTT_BROKER != "127.0.0.1":
                try:
                    log_mqtt(f"Broker at {settings.MQTT_BROKER} unreachable, falling back to local broker 127.0.0.1:{settings.MQTT_PORT}...")
                    self.client.connect("127.0.0.1", settings.MQTT_PORT, keepalive=settings.MQTT_KEEPALIVE)
                    self.client.loop_start()
                    return
                except Exception:
                    pass
            log_error(f"MQTT initial connection error: {e}. Auto-reconnect active in background.")
            try:
                self.client.loop_start()
            except Exception:
                pass

    def stop(self):
        self.is_running = False
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            log_mqtt("MQTT client disconnected.")

    def publish(self, topic: str, payload: str, qos: int = 0):
        if not self.client or not self.connected:
            return
        try:
            self.client.publish(topic, payload, qos=qos)
        except Exception as e:
            log_error(f"Failed to publish to {topic}: {e}")

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            self.connected = True
            log_mqtt(f"Connected to broker {settings.MQTT_BROKER}:{settings.MQTT_PORT}")

            # Subscriptions
            self.client.subscribe(settings.TOPIC_TELEMETRY, qos=0)
            self.client.subscribe(settings.TOPIC_EMERGENCY, qos=1)
            self.client.subscribe(settings.TOPIC_CONTROL, qos=0)

            log_mqtt(f"Subscribed to: {settings.TOPIC_TELEMETRY}, {settings.TOPIC_EMERGENCY}, {settings.TOPIC_CONTROL}")
        else:
            self.connected = False
            log_error(f"MQTT connect failed with result code {rc}")

    def _on_disconnect(self, client, userdata, flags_or_rc, rc=None, properties=None):
        self.connected = False
        log_mqtt(f"MQTT Disconnected from broker. Reconnection will proceed in {settings.MQTT_RECONNECT_DELAY}s...")

    def _on_message(self, client, userdata, msg):
        topic = msg.topic
        try:
            payload_str = msg.payload.decode("utf-8", errors="ignore")
        except Exception:
            return

        if topic == settings.TOPIC_TELEMETRY:
            if self.on_telemetry:
                self.on_telemetry(payload_str)

        elif topic == settings.TOPIC_EMERGENCY:
            if self.on_emergency:
                self.on_emergency(payload_str)

        elif topic == settings.TOPIC_CONTROL:
            # Check if this was a manual control command from website
            if self.on_manual_control:
                try:
                    data = json.loads(payload_str)
                    if isinstance(data, dict):
                        self.on_manual_control(data)
                except Exception:
                    pass
