import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("AURA_DEVICE_STATE")

class ActuatorConfirmationPhase:
    DECISION_CREATED = "DECISION_CREATED"
    COMMAND_GENERATED = "COMMAND_GENERATED"
    COMMAND_VALIDATED = "COMMAND_VALIDATED"
    MQTT_COMMAND_SENT = "MQTT_COMMAND_SENT"
    DEVICE_RECEIVED = "DEVICE_RECEIVED"
    ACTUATOR_EXECUTED = "ACTUATOR_EXECUTED"
    ACTION_CONFIRMED = "ACTION_CONFIRMED"
    DEVICE_ACK_TIMEOUT = "COMMAND SENT — DEVICE ACK TIMEOUT"

class DeviceStateService:
    """
    Maintains physical actuator state authority and 7-phase confirmation tracking.
    Enforces the 3-State Model:
      1. DESIRED STATE (requested by user or AI)
      2. COMMAND STATE (MQTT_COMMAND_SENT, WAITING_ACK, CONFIRMED, TIMEOUT)
      3. ACTUAL DEVICE STATE (confirmed by physical microcontroller status packet)
    """
    def __init__(self, ack_timeout_seconds: float = 4.0):
        self.ack_timeout_seconds = ack_timeout_seconds

        # Actual confirmed hardware states from aura/status/node1 and aura/status/node2
        self.confirmed_actuators: Dict[str, Any] = {
            "bedroom_light": False,
            "bedroom_fan_pwm": 0,
            "curtain_servo_angle": 90,
            "hall_light": False,
            "hall_fan_pwm": 0,
            "buzzer_active": False,
            "kitchen_light": False,
            "bathroom_light": False,
            "exhaust_fan_speed_pct": 0,
            "exhaust_fan": False
        }

        # Per-actuator confirmation tracking
        self.actuator_tracking: Dict[str, Dict[str, Any]] = {}
        for dev, val in self.confirmed_actuators.items():
            self.actuator_tracking[dev] = {
                "phase": ActuatorConfirmationPhase.ACTION_CONFIRMED,
                "desired_state": val,
                "actual_state": val,
                "command_id": None,
                "timestamp": time.time(),
                "confirmed_at": time.time()
            }

        # Timestamps of last status packet from each node
        self.last_status_time: Dict[str, float] = {
            "esp32_node1": 0.0,
            "esp8266_node2": 0.0
        }

        # Last confirmed ACK event
        self.last_ack: Optional[Dict[str, Any]] = None

    def record_command_sent(self, device: str, desired_value: Any, command_id: Optional[str] = None):
        """Called when a validated command is published over MQTT."""
        now = time.time()
        self.actuator_tracking[device] = {
            "phase": ActuatorConfirmationPhase.MQTT_COMMAND_SENT,
            "desired_state": desired_value,
            "actual_state": self.confirmed_actuators.get(device),
            "command_id": command_id,
            "timestamp": now,
            "confirmed_at": None
        }

    def record_device_received(self, device: str):
        """Called when device acknowledges receipt."""
        if device in self.actuator_tracking:
            self.actuator_tracking[device]["phase"] = ActuatorConfirmationPhase.DEVICE_RECEIVED

    def handle_status_feedback(self, node_id: str, status_payload: Dict[str, Any]):
        """
        Processes physical status update from aura/status/node1 or aura/status/node2.
        Transitions pending commands to ACTUATOR_EXECUTED -> ACTION_CONFIRMED.
        Correlates command_id and marks physical confirmation.
        """
        now = time.time()
        self.last_status_time[node_id] = now
        command_id = status_payload.get("command_id")
        status_text = status_payload.get("status", "EXECUTED")
        actuators = status_payload.get("actuators", {})

        self.last_ack = {
            "node_id": node_id,
            "command_id": command_id,
            "status": status_text,
            "timestamp": now,
            "actuators_count": len(actuators)
        }

        for key, val in actuators.items():
            # Standardize boolean representations
            normalized_val = val
            if isinstance(val, str):
                if val.upper() in ("ON", "TRUE", "HIGH", "1"):
                    normalized_val = True
                elif val.upper() in ("OFF", "FALSE", "LOW", "0"):
                    normalized_val = False

            # Update confirmed state
            self.confirmed_actuators[key] = normalized_val
            if key == "exhaust_fan_speed_pct":
                self.confirmed_actuators["exhaust_fan"] = (normalized_val > 0)
            elif key == "exhaust_fan":
                self.confirmed_actuators["exhaust_fan_speed_pct"] = 100 if normalized_val else 0

            # Update confirmation tracking
            track = self.actuator_tracking.get(key, {})
            desired = track.get("desired_state")

            self.actuator_tracking[key] = {
                "phase": ActuatorConfirmationPhase.ACTION_CONFIRMED,
                "desired_state": desired if desired is not None else normalized_val,
                "actual_state": normalized_val,
                "command_id": command_id or track.get("command_id"),
                "timestamp": now,
                "confirmed_at": now
            }

        logger.info(f"Received physical status ACK from {node_id} (cmd_id: {command_id}): {status_text}")

    def check_timeouts(self):
        """Checks for commands waiting for acknowledgement beyond timeout."""
        now = time.time()
        for key, info in self.actuator_tracking.items():
            phase = info.get("phase")
            if phase in (ActuatorConfirmationPhase.MQTT_COMMAND_SENT, ActuatorConfirmationPhase.DEVICE_RECEIVED):
                elapsed = now - info.get("timestamp", now)
                if elapsed > self.ack_timeout_seconds:
                    info["phase"] = ActuatorConfirmationPhase.DEVICE_ACK_TIMEOUT
                    logger.warning(f"Device ack timeout for {key}: sent {elapsed:.1f}s ago without physical confirmation.")

    def get_three_state_model(self) -> Dict[str, Dict[str, Any]]:
        """
        Returns the explicit 3-State Model:
        - DESIRED: What the user or AI requested
        - COMMAND_STATUS: MQTT_COMMAND_SENT / WAITING_ACK / CONFIRMED / TIMEOUT
        - ACTUAL: What the physical ESP reported
        """
        self.check_timeouts()
        model = {}
        for dev, track in self.actuator_tracking.items():
            desired = track.get("desired_state")
            actual = self.confirmed_actuators.get(dev)
            phase = track.get("phase")
            cmd_id = track.get("command_id")

            if phase == ActuatorConfirmationPhase.ACTION_CONFIRMED:
                status_label = "CONFIRMED ✓"
            elif phase == ActuatorConfirmationPhase.DEVICE_ACK_TIMEOUT:
                status_label = "DEVICE ACK TIMEOUT ⚠️"
            elif phase == ActuatorConfirmationPhase.DEVICE_RECEIVED:
                status_label = "DEVICE RECEIVED / EXECUTING"
            else:
                status_label = "COMMAND SENT / WAITING ⏳"

            model[dev] = {
                "desired": desired,
                "command_status": status_label,
                "actual": actual,
                "confirmed": (phase == ActuatorConfirmationPhase.ACTION_CONFIRMED),
                "command_id": cmd_id,
                "timestamp": track.get("timestamp"),
                "confirmed_at": track.get("confirmed_at")
            }
        return model

    def get_summary_state(self) -> Dict[str, Any]:
        """Returns the full device state snapshot for the dashboard and Digital Twin."""
        self.check_timeouts()
        return {
            "confirmed_actuators": dict(self.confirmed_actuators),
            "three_state_model": self.get_three_state_model(),
            "tracking": {k: dict(v) for k, v in self.actuator_tracking.items()},
            "last_ack": self.last_ack,
            "last_status_age": {
                node: round(time.time() - t, 1) if t > 0 else None
                for node, t in self.last_status_time.items()
            }
        }

device_state_service = DeviceStateService()

