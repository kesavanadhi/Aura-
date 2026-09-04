import time
import logging
import re
from typing import Dict, Any, Optional, List, Tuple
from app.rag import (
    HARDWARE_REGISTRY,
    MQTT_CONTRACT,
    TELEMETRY_SCHEMA,
    ACTUATOR_CONTRACT,
    SAFETY_RULES,
    DECISION_RULES,
    VOICE_COMMAND_MAP
)
from app.services.command_validator import command_validator
from app.services.device_state_service import device_state_service, ActuatorConfirmationPhase

logger = logging.getLogger("AURA_RAG")

class RAGGroundingService:
    """
    RAG Grounding & Anti-Hallucination Layer for Project AURA.
    Enforces the 8-level Source of Truth Priority and the 9-step decision cycle:
    Sense -> Validate -> Retrieve -> Understand -> Predict -> Decide -> Validate Command -> Act -> Verify -> Assist.
    """
    def __init__(self, stale_telemetry_seconds: float = 8.0):
        self.stale_telemetry_seconds = stale_telemetry_seconds
        self.forbidden_hardware = set(HARDWARE_REGISTRY.get("forbidden_hardware", []))
        self.disclaimer_responses = HARDWARE_REGISTRY.get("disclaimer_responses", {})

    def evaluate_user_query(
        self,
        query: str,
        current_telemetry: Dict[str, Any],
        telemetry_timestamp: float,
        is_hardware_online: bool,
        is_emergency_active: bool = False
    ) -> Dict[str, Any]:
        """
        Evaluates a user natural language query or command through the strict RAG pipeline.
        Returns the standard structured AI response.
        """
        query_lower = query.strip().lower()

        # Step 1: Detect queries about forbidden/non-existent hardware
        for forbidden in self.forbidden_hardware:
            forbidden_clean = forbidden.replace("_", " ")
            if forbidden_clean in query_lower or forbidden in query_lower:
                return self._create_unsupported_response(
                    query=query,
                    reason=f"Field '{forbidden}' is NOT AVAILABLE IN CURRENT AURA HARDWARE.",
                    disclaimer="NOT AVAILABLE IN CURRENT AURA HARDWARE"
                )

        # Check explicit disclaimer queries (e.g. "bedroom temperature", "water leak")
        if "bedroom" in query_lower and ("temp" in query_lower or "temperature" in query_lower):
            return self._create_unsupported_response(
                query=query,
                reason="Bedroom temperature is not available in Zone 1 hardware.",
                disclaimer="Bedroom temperature is not available in Zone 1 hardware."
            )
        if "hall" in query_lower and ("temp" in query_lower or "temperature" in query_lower):
            return self._create_unsupported_response(
                query=query,
                reason="Hall temperature is not available in Zone 1 hardware.",
                disclaimer="Hall temperature is not available in Zone 1 hardware."
            )
        if "bathroom" in query_lower and ("temp" in query_lower or "temperature" in query_lower):
            return self._create_unsupported_response(
                query=query,
                reason="Bathroom temperature is not available in Zone 2 hardware.",
                disclaimer="Bathroom temperature is not available in Zone 2 hardware."
            )
        if "water" in query_lower and ("leak" in query_lower or "leakage" in query_lower):
            return self._create_unsupported_response(
                query=query,
                reason="Water leakage sensor is not available in AURA hardware.",
                disclaimer="NOT AVAILABLE IN CURRENT AURA HARDWARE"
            )
        if "door" in query_lower and ("sensor" in query_lower or "magnetic" in query_lower or "open" in query_lower and "close" not in query_lower):
            return self._create_unsupported_response(
                query=query,
                reason="Magnetic door sensor is not available in AURA hardware.",
                disclaimer="NOT AVAILABLE IN CURRENT AURA HARDWARE"
            )
        if "co2" in query_lower or "carbon dioxide" in query_lower:
            return self._create_unsupported_response(
                query=query,
                reason="CO2 sensor is not available in AURA hardware.",
                disclaimer="NOT AVAILABLE IN CURRENT AURA HARDWARE"
            )

        # Step 2: Telemetry Freshness Check
        now = time.time()
        telemetry_age = now - telemetry_timestamp if telemetry_timestamp > 0 else 999.0
        is_stale = (telemetry_age > self.stale_telemetry_seconds)

        # Step 3: Check for Conditional / Environmental Reasoning queries first
        # (e.g. "Turn on the kitchen fan because the kitchen is hot" or "exhaust fan when hot")
        is_conditional = any(w in query_lower for w in ("because", "since", "due to", "hot", "warm", "temp", "smoke", "gas"))
        if is_conditional and ("exhaust" in query_lower or "fan" in query_lower or "hot" in query_lower or "smoke" in query_lower or "gas" in query_lower):
            return self._evaluate_kitchen_reasoning(
                query=query,
                current_telemetry=current_telemetry,
                is_emergency_active=is_emergency_active,
                is_stale=is_stale,
                telemetry_age=telemetry_age
            )

        # Step 4: Match against Voice Command Map (Deterministic RAG Command Registry)
        matched_cmd = self._lookup_voice_command(query_lower)
        if matched_cmd:
            return self._execute_deterministic_command(
                query=query,
                matched_cmd=matched_cmd,
                current_telemetry=current_telemetry,
                is_emergency_active=is_emergency_active,
                is_stale=is_stale,
                telemetry_age=telemetry_age
            )

        # Step 5: Environmental / Telemetry Query Interpretation (e.g. general questions)
        if "exhaust" in query_lower or "hot" in query_lower or "smoke" in query_lower or "gas" in query_lower:
            return self._evaluate_kitchen_reasoning(
                query=query,
                current_telemetry=current_telemetry,
                is_emergency_active=is_emergency_active,
                is_stale=is_stale,
                telemetry_age=telemetry_age
            )

        if "temperature" in query_lower or "temp" in query_lower:
            # Only Kitchen has temperature sensor (DHT11)
            kitchen_data = current_telemetry.get("kitchen", {})
            temp = kitchen_data.get("temperature_c")
            humid = kitchen_data.get("humidity_pct")
            if temp is not None:
                sources = ["LIVE DEVICE TELEMETRY: kitchen.temperature_c", "HARDWARE_REGISTRY: zone2.kitchen_dht11_temp"]
                conf = 0.98 if not is_stale else 0.70
                return {
                    "grounding": {
                        "sources_used": sources,
                        "data_complete": True,
                        "confidence": conf
                    },
                    "observation": {
                        "kitchen_temperature_c": temp,
                        "kitchen_humidity_pct": humid,
                        "telemetry_age_seconds": round(telemetry_age, 1)
                    },
                    "interpretation": f"Kitchen temperature is {temp:.1f}°C with {humid:.0f}% humidity (DHT11 sensor). Note: Bedroom and Hall have no temperature sensors in Zone 1 hardware.",
                    "decision": {
                        "action_required": False
                    },
                    "command": {
                        "zone": "",
                        "topic": "",
                        "payload": {}
                    },
                    "validation": {
                        "hardware_supported": True,
                        "mqtt_supported": True,
                        "payload_supported": True,
                        "safety_passed": True
                    },
                    "execution": {
                        "status": "NOT_SENT"
                    }
                }
            else:
                return self._create_insufficient_data_response(query, "Temperature reading is not available from telemetry.")

        # Default Fallback for ungrounded queries: Never Guess
        return self._create_insufficient_data_response(
            query=query,
            reason="INSUFFICIENT DATA: Command or query could not be grounded in project contracts or live telemetry."
        )

    def _lookup_voice_command(self, query_lower: str) -> Optional[Dict[str, Any]]:
        """Finds matching deterministic voice command from RAG registry."""
        normalized = re.sub(r'\b(the|please|can you|could you|now)\b', '', query_lower)
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        commands = VOICE_COMMAND_MAP.get("commands", [])
        for cmd in commands:
            for phrase in cmd.get("phrases", []):
                if phrase in query_lower or phrase in normalized:
                    return cmd
        return None

    def _execute_deterministic_command(
        self,
        query: str,
        matched_cmd: Dict[str, Any],
        current_telemetry: Dict[str, Any],
        is_emergency_active: bool,
        is_stale: bool,
        telemetry_age: float
    ) -> Dict[str, Any]:
        """Executes a matched deterministic command through the anti-hallucination validator."""
        topic = matched_cmd["topic"]
        payload = matched_cmd["payload"]
        zone = matched_cmd["zone"]
        actuator = matched_cmd["actuator"]

        # Validate with Command Validator
        val_res = command_validator.validate_command(
            topic=topic,
            payload=payload,
            is_emergency_active=is_emergency_active
        )

        sources_used = [
            "RAG KNOWLEDGE BASE: voice_command_map.json",
            f"FIRMWARE / HARDWARE CONTRACT: {zone} {actuator}",
            f"MQTT SCHEMA: {topic}"
        ]

        if val_res["status"] == "BLOCKED":
            return {
                "grounding": {
                    "sources_used": sources_used,
                    "data_complete": True,
                    "confidence": 0.50
                },
                "observation": {
                    "raw_query": query,
                    "matched_actuator": actuator
                },
                "interpretation": f"Command rejected: {val_res['reason']}",
                "decision": {
                    "action_required": False
                },
                "command": {
                    "zone": zone,
                    "topic": topic,
                    "payload": payload
                },
                "validation": {
                    "hardware_supported": False,
                    "mqtt_supported": topic in MQTT_CONTRACT.get("allowed_topics", []),
                    "payload_supported": False,
                    "safety_passed": False,
                    "block_reason": val_res["reason"]
                },
                "execution": {
                    "status": "BLOCKED"
                }
            }

        # Successful validation
        confidence = 0.98 if not is_stale else 0.85

        return {
            "grounding": {
                "sources_used": sources_used,
                "data_complete": True,
                "confidence": confidence
            },
            "observation": {
                "raw_query": query,
                "matched_actuator": actuator,
                "desired_state": payload
            },
            "interpretation": matched_cmd.get("spoken_feedback", f"Setting {actuator}"),
            "decision": {
                "action_required": True
            },
            "command": {
                "zone": zone,
                "topic": topic,
                "payload": payload
            },
            "validation": {
                "hardware_supported": True,
                "mqtt_supported": True,
                "payload_supported": True,
                "safety_passed": True
            },
            "execution": {
                "status": "VALIDATED"
            }
        }

    def _evaluate_kitchen_reasoning(
        self,
        query: str,
        current_telemetry: Dict[str, Any],
        is_emergency_active: bool,
        is_stale: bool,
        telemetry_age: float
    ) -> Dict[str, Any]:
        """Evaluates kitchen temperature/exhaust fan decisions with full grounding."""
        kitchen_data = current_telemetry.get("kitchen", {})
        temp = kitchen_data.get("temperature_c")
        gas = kitchen_data.get("gas_ppm")

        if temp is None or gas is None:
            return self._create_insufficient_data_response(query, "Kitchen telemetry not available.")

        sources = [
            "LIVE DEVICE TELEMETRY: kitchen.temperature_c, kitchen.gas_ppm",
            "HARDWARE_REGISTRY: zone2.kitchen_mq2, zone2.kitchen_dht11_temp",
            "ACTUATOR_CONTRACT: zone2.exhaust_fan_speed_pct",
            "DECISION_RULES: configured_thresholds.kitchen_exhaust"
        ]

        if is_stale and not is_emergency_active:
            return {
                "grounding": {
                    "sources_used": sources,
                    "data_complete": False,
                    "confidence": 0.60
                },
                "observation": {
                    "kitchen_temperature_c": temp,
                    "telemetry_age_seconds": round(telemetry_age, 1)
                },
                "interpretation": f"Telemetry is stale ({telemetry_age:.1f}s old). Automated actuation inhibited per fail-safe policy.",
                "decision": {
                    "action_required": False
                },
                "command": {
                    "zone": "",
                    "topic": "",
                    "payload": {}
                },
                "validation": {
                    "hardware_supported": True,
                    "mqtt_supported": True,
                    "payload_supported": True,
                    "safety_passed": False,
                    "block_reason": "STALE_TELEMETRY"
                },
                "execution": {
                    "status": "BLOCKED"
                }
            }

        # Calculate speed based on project thresholds: > 26.0°C proportional speed
        if temp > 26.0:
            speed = min(100, max(30, int(30 + ((temp - 26.0) / (45.0 - 26.0)) * 70)))
        else:
            speed = 0

        payload = {"exhaust_fan_speed_pct": speed}
        topic = "aura/control/node2"
        val_res = command_validator.validate_command(topic, payload, is_emergency_active)

        return {
            "grounding": {
                "sources_used": sources,
                "data_complete": True,
                "confidence": 0.96
            },
            "observation": {
                "kitchen_temperature_c": temp,
                "gas_ppm_mapped_adc": gas,
                "configured_trigger_c": 26.0
            },
            "interpretation": f"Kitchen temperature is {temp:.1f}°C (Threshold: 26.0°C). Computed exhaust speed: {speed}%.",
            "decision": {
                "action_required": speed > 0
            },
            "command": {
                "zone": "zone2",
                "topic": topic,
                "payload": payload
            },
            "validation": {
                "hardware_supported": True,
                "mqtt_supported": True,
                "payload_supported": True,
                "safety_passed": True
            },
            "execution": {
                "status": "VALIDATED" if val_res["status"] == "VALID" else "BLOCKED"
            }
        }

    def _create_unsupported_response(self, query: str, reason: str, disclaimer: str) -> Dict[str, Any]:
        return {
            "grounding": {
                "sources_used": ["HARDWARE_REGISTRY: forbidden_hardware", "RAG KNOWLEDGE BASE"],
                "data_complete": False,
                "confidence": 0.0
            },
            "observation": {
                "query": query
            },
            "interpretation": disclaimer,
            "decision": {
                "action_required": False
            },
            "command": {
                "zone": "",
                "topic": "",
                "payload": {}
            },
            "validation": {
                "hardware_supported": False,
                "mqtt_supported": False,
                "payload_supported": False,
                "safety_passed": False,
                "block_reason": reason
            },
            "execution": {
                "status": "BLOCKED"
            }
        }

    def _create_insufficient_data_response(self, query: str, reason: str) -> Dict[str, Any]:
        return {
            "grounding": {
                "sources_used": ["RAG KNOWLEDGE BASE"],
                "data_complete": False,
                "confidence": 0.0
            },
            "observation": {
                "query": query
            },
            "interpretation": "INSUFFICIENT DATA",
            "decision": {
                "action_required": False
            },
            "command": {
                "zone": "",
                "topic": "",
                "payload": {}
            },
            "validation": {
                "hardware_supported": False,
                "mqtt_supported": False,
                "payload_supported": False,
                "safety_passed": False,
                "block_reason": reason
            },
            "execution": {
                "status": "BLOCKED"
            }
        }

rag_service = RAGGroundingService()
