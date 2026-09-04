import json
import time
import logging
from typing import Optional, Callable, Dict, Any
from app.config import settings
from app.models.schemas import FullTelemetry
from app.services.command_validator import command_validator
from app.services.device_state_service import device_state_service

logger = logging.getLogger("AURA_MQTT")

class MQTTManager:
    """
    Manages persistent bidirectional MQTT connection to distributed ESP32/ESP8266 nodes.
    Supports asynchronous non-blocking telemetry ingestion, command_id correlation,
    and freshness tracking (LIVE, STALE, OFFLINE).
    """
    def __init__(self):
        self.client = None
        self.connected = False
        self.telemetry_callback: Optional[Callable] = None
        self.last_node1_time: float = 0.0
        self.last_node2_time: float = 0.0
        self.hardware_telemetry = FullTelemetry()

        # Telemetry State Model: latestTelemetry[node_id]
        self.latest_telemetry: Dict[str, Dict[str, Any]] = {
            "esp32_node1": {
                "received_at": None,
                "received_at_epoch": 0.0,
                "source": "mqtt",
                "topic": settings.TOPIC_TELEMETRY_NODE1,
                "node_id": "esp32_node1",
                "data": {},
                "age_ms": None,
                "status": "OFFLINE"
            },
            "esp8266_node2": {
                "received_at": None,
                "received_at_epoch": 0.0,
                "source": "mqtt",
                "topic": settings.TOPIC_TELEMETRY_NODE2,
                "node_id": "esp8266_node2",
                "data": {},
                "age_ms": None,
                "status": "OFFLINE"
            }
        }

        # Track last outbound command
        self.last_command: Optional[Dict[str, Any]] = None

        self._init_client()

    def _init_client(self):
        try:
            import paho.mqtt.client as mqtt
            self.client = mqtt.Client(client_id="AURA_Edge_Gateway")
            self.client.on_connect = self._on_connect
            self.client.on_message = self._on_message
            self.client.on_disconnect = self._on_disconnect
        except Exception as e:
            logger.warning(f"MQTT initialization warning: {e}")

    def start(self, on_telemetry_callback: Optional[Callable] = None):
        self.telemetry_callback = on_telemetry_callback
        if self.client:
            try:
                self.client.connect_async(settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, settings.MQTT_KEEPALIVE)
                self.client.loop_start()
            except Exception as e:
                logger.info(f"MQTT Broker at {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT} not reachable. Running in Local Virtual Twin mode: {e}")

    def stop(self):
        if self.client:
            try:
                self.client.loop_stop()
                self.client.disconnect()
            except Exception:
                pass

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.connected = True
            logger.info("Connected to MQTT Broker successfully.")
            client.subscribe(settings.TOPIC_TELEMETRY_NODE1)
            client.subscribe(settings.TOPIC_TELEMETRY_NODE2)
            client.subscribe(settings.TOPIC_STATUS_NODE1)
            client.subscribe(settings.TOPIC_STATUS_NODE2)
            client.subscribe(settings.TOPIC_EMERGENCY)
        else:
            self.connected = False
            logger.warning(f"Failed to connect to MQTT broker, return code {rc}")

    def _on_disconnect(self, client, userdata, rc):
        self.connected = False
        logger.info("Disconnected from MQTT Broker.")

    def _format_iso(self, epoch: float) -> str:
        return time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(epoch)) + f".{int(epoch % 1 * 1000):03d}Z"

    def _on_message(self, client, userdata, msg):
        try:
            now = time.time()
            iso_now = self._format_iso(now)
            payload = json.loads(msg.payload.decode())
            node_id = payload.get("node_id", "")

            # 1. Zone 1 Telemetry (aura/telemetry/node1)
            if node_id == "esp32_node1" or "bedroom" in payload:
                self.last_node1_time = now
                self.latest_telemetry["esp32_node1"] = {
                    "received_at": iso_now,
                    "received_at_epoch": now,
                    "source": "mqtt",
                    "topic": msg.topic,
                    "node_id": "esp32_node1",
                    "data": payload,
                    "age_ms": 0,
                    "status": "LIVE"
                }
                if "bedroom" in payload:
                    b = payload["bedroom"]
                    self.hardware_telemetry.bedroom.occupancy = bool(b.get("occupancy", False))
                    self.hardware_telemetry.bedroom.ambient_lux = int(b.get("ambient_lux", 450))
                    self.hardware_telemetry.bedroom.curtain_state = str(b.get("curtain_state", "OPEN"))
                if "hall" in payload:
                    h = payload["hall"]
                    self.hardware_telemetry.hall.occupancy = bool(h.get("occupancy", False))
                    self.hardware_telemetry.hall.obstacle_distance_cm = float(h.get("obstacle_distance_cm", 140.0))

            # 2. Zone 2 Telemetry (aura/telemetry/node2)
            if node_id in ("esp32_node2", "esp8266_node2") or "kitchen" in payload:
                self.last_node2_time = now
                self.latest_telemetry["esp8266_node2"] = {
                    "received_at": iso_now,
                    "received_at_epoch": now,
                    "source": "mqtt",
                    "topic": msg.topic,
                    "node_id": "esp8266_node2",
                    "data": payload,
                    "age_ms": 0,
                    "status": "LIVE"
                }
                if "kitchen" in payload:
                    k = payload["kitchen"]
                    self.hardware_telemetry.kitchen.gas_ppm = int(k.get("gas_ppm", 220))
                    self.hardware_telemetry.kitchen.temperature_c = float(k.get("temperature_c", 24.5))
                    self.hardware_telemetry.kitchen.humidity_pct = float(k.get("humidity_pct", 55.0))
                if "bathroom" in payload:
                    bt = payload["bathroom"]
                    self.hardware_telemetry.bathroom.occupancy = bool(bt.get("occupancy", False))
                    self.hardware_telemetry.bathroom.obstacle_distance_cm = float(bt.get("obstacle_distance_cm", 120.0))

            # 3. Handle Actuator Status Feedback (aura/status/node1 or aura/status/node2)
            if msg.topic == settings.TOPIC_STATUS_NODE1:
                device_state_service.handle_status_feedback("esp32_node1", payload)
            elif msg.topic == settings.TOPIC_STATUS_NODE2:
                device_state_service.handle_status_feedback("esp8266_node2", payload)

            self.hardware_telemetry.timestamp = now
            if self.telemetry_callback:
                self.telemetry_callback(msg.topic, payload)
        except Exception as e:
            logger.error(f"Error parsing MQTT payload on {msg.topic}: {e}")

    def update_freshness(self):
        """Calculates age_ms and freshness state (LIVE, STALE, OFFLINE) for each node."""
        now = time.time()
        for node, rec in self.latest_telemetry.items():
            epoch = rec.get("received_at_epoch", 0.0)
            if epoch == 0.0:
                rec["age_ms"] = None
                rec["status"] = "OFFLINE"
            else:
                age_ms = int((now - epoch) * 1000)
                rec["age_ms"] = age_ms
                if age_ms < 3000:
                    rec["status"] = "LIVE"
                elif age_ms <= 8000:
                    rec["status"] = "STALE"
                else:
                    rec["status"] = "OFFLINE"

    def get_hardware_status(self) -> dict:
        self.update_freshness()
        now = time.time()
        node1_active = self.latest_telemetry["esp32_node1"]["status"] in ("LIVE", "STALE")
        node2_active = self.latest_telemetry["esp8266_node2"]["status"] in ("LIVE", "STALE")
        is_online = node1_active or node2_active
        return {
            "online": is_online,
            "broker_connected": self.connected,
            "node1_online": node1_active,
            "node2_online": node2_active,
            "node1_status": self.latest_telemetry["esp32_node1"]["status"],
            "node2_status": self.latest_telemetry["esp8266_node2"]["status"],
            "node1_age_ms": self.latest_telemetry["esp32_node1"]["age_ms"],
            "node2_age_ms": self.latest_telemetry["esp8266_node2"]["age_ms"],
            "last_node1_sec_ago": round(now - self.last_node1_time, 1) if self.last_node1_time > 0 else None,
            "last_node2_sec_ago": round(now - self.last_node2_time, 1) if self.last_node2_time > 0 else None,
        }

    def publish_control(self, node: str, payload: dict, is_emergency_active: bool = False) -> dict:
        """
        Anti-Hallucination publishing pipeline:
        Command ID injection -> Command Validator -> State Tracking -> MQTT Publish -> Device Feedback.
        Never publishes if validation fails.
        """
        topic = settings.TOPIC_CONTROL_NODE1 if node in ("node1", "esp32_node1", "zone1") else settings.TOPIC_CONTROL_NODE2
        
        # Inject unique command_id if not present
        command_id = payload.get("command_id") or f"cmd_{int(time.time() * 1000) % 100000000}"
        source = payload.get("source", "aura_cloud")

        # Strict validation before MQTT (strip metadata for validation if needed, or allow command_id)
        control_payload = {k: v for k, v in payload.items() if k not in ("command_id", "source")}
        val_res = command_validator.validate_command(topic, control_payload, is_emergency_active)
        if val_res["status"] == "BLOCKED":
            logger.warning(f"[Anti-Hallucination Blocked] {topic} : {val_res['reason']}")
            self.last_command = {
                "topic": topic,
                "command_id": command_id,
                "payload": payload,
                "timestamp": time.time(),
                "status": "BLOCKED",
                "reason": val_res["reason"]
            }
            return {
                "status": "BLOCKED",
                "reason": val_res["reason"],
                "published": False,
                "command_id": command_id
            }

        sanitized_payload = dict(val_res["payload"])
        sanitized_payload["command_id"] = command_id
        sanitized_payload["source"] = source

        # Record command sent (Phase 4: MQTT_COMMAND_SENT) with command_id correlation
        for key, val in val_res["payload"].items():
            device_state_service.record_command_sent(key, val, command_id)

        if self.client and self.connected:
            try:
                # Compact JSON format without spaces for exact microcontroller substring matching
                payload_str = json.dumps(sanitized_payload, separators=(',', ':'))
                self.client.publish(topic, payload_str)
                logger.info(f"Published validated control command to {topic} (cmd_id: {command_id}): {payload_str}")
                self.last_command = {
                    "topic": topic,
                    "command_id": command_id,
                    "payload": sanitized_payload,
                    "timestamp": time.time(),
                    "status": "SENT"
                }
                return {
                    "status": "PUBLISHED",
                    "topic": topic,
                    "command_id": command_id,
                    "payload": sanitized_payload,
                    "published": True
                }
            except Exception as e:
                logger.warning(f"Failed to publish to {topic}: {e}")
                self.last_command = {
                    "topic": topic,
                    "command_id": command_id,
                    "payload": sanitized_payload,
                    "timestamp": time.time(),
                    "status": "FAILED",
                    "reason": str(e)
                }
                return {
                    "status": "FAILED",
                    "reason": str(e),
                    "published": False,
                    "command_id": command_id
                }
        else:
            logger.warning(f"MQTT Broker Offline: Could not publish command to {topic}")
            self.last_command = {
                "topic": topic,
                "command_id": command_id,
                "payload": sanitized_payload,
                "timestamp": time.time(),
                "status": "MQTT_OFFLINE",
                "reason": "MQTT Broker Offline"
            }
            return {
                "status": "MQTT_OFFLINE",
                "topic": topic,
                "reason": "MQTT Broker Offline",
                "payload": sanitized_payload,
                "published": False,
                "command_id": command_id
            }

    def publish_emergency(self, emergency_payload: dict):
        if self.client and self.connected:
            try:
                payload_str = json.dumps(emergency_payload, separators=(',', ':'))
                self.client.publish(settings.TOPIC_EMERGENCY, payload_str)
                logger.info(f"Published EMERGENCY broadcast to {settings.TOPIC_EMERGENCY}: {payload_str}")
            except Exception as e:
                logger.warning(f"Failed to broadcast emergency: {e}")

    def get_diagnostic_info(self) -> Dict[str, Any]:
        """Returns visible MQTT diagnostics for the dashboard diagnostic panel."""
        self.update_freshness()
        return {
            "broker_connected": self.connected,
            "broker_host": settings.MQTT_BROKER_HOST,
            "broker_port": settings.MQTT_BROKER_PORT,
            "nodes": {
                "esp32_node1": {
                    "status": self.latest_telemetry["esp32_node1"]["status"],
                    "age_ms": self.latest_telemetry["esp32_node1"]["age_ms"],
                    "last_received": self.latest_telemetry["esp32_node1"]["received_at"]
                },
                "esp8266_node2": {
                    "status": self.latest_telemetry["esp8266_node2"]["status"],
                    "age_ms": self.latest_telemetry["esp8266_node2"]["age_ms"],
                    "last_received": self.latest_telemetry["esp8266_node2"]["received_at"]
                }
            },
            "last_command": self.last_command,
            "last_ack": device_state_service.last_ack,
            "latest_telemetry": self.latest_telemetry
        }

mqtt_manager = MQTTManager()

