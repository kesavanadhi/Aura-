import json
from pathlib import Path
from typing import Dict, Any

RAG_DIR = Path(__file__).resolve().parent

def load_rag_document(filename: str) -> Dict[str, Any]:
    file_path = RAG_DIR / filename
    if not file_path.exists():
        raise FileNotFoundError(f"RAG document {filename} not found in {RAG_DIR}")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

# Pre-load core RAG documents
HARDWARE_REGISTRY = load_rag_document("hardware_registry.json")
MQTT_CONTRACT = load_rag_document("mqtt_contract.json")
TELEMETRY_SCHEMA = load_rag_document("telemetry_schema.json")
ACTUATOR_CONTRACT = load_rag_document("actuator_contract.json")
SAFETY_RULES = load_rag_document("safety_rules.json")
DECISION_RULES = load_rag_document("decision_rules.json")
VOICE_COMMAND_MAP = load_rag_document("voice_command_map.json")

__all__ = [
    "HARDWARE_REGISTRY",
    "MQTT_CONTRACT",
    "TELEMETRY_SCHEMA",
    "ACTUATOR_CONTRACT",
    "SAFETY_RULES",
    "DECISION_RULES",
    "VOICE_COMMAND_MAP",
    "load_rag_document",
    "RAG_DIR"
]
