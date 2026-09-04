import json
import time
from dataclasses import dataclass, field
from typing import Optional, Dict, Any

@dataclass
class BedroomTelemetry:
    occupancy: bool = False
    ambient_lux: int = 500
    curtain_state: str = "OPEN"

@dataclass
class HallTelemetry:
    occupancy: bool = False
    obstacle_distance_cm: float = 140.0

@dataclass
class Zone1Telemetry:
    node_id: str = "esp32_node1"
    bedroom: BedroomTelemetry = field(default_factory=BedroomTelemetry)
    hall: HallTelemetry = field(default_factory=HallTelemetry)
    timestamp: float = field(default_factory=time.time)
    raw_payload: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def parse(cls, payload_str: str) -> Optional['Zone1Telemetry']:
        try:
            data = json.loads(payload_str)
            if not isinstance(data, dict):
                return None

            node_id = data.get("node_id", "esp32_node1")

            bed_data = data.get("bedroom", {})
            bedroom = BedroomTelemetry(
                occupancy=bool(bed_data.get("occupancy", False)),
                ambient_lux=int(bed_data.get("ambient_lux", 500)),
                curtain_state=str(bed_data.get("curtain_state", "OPEN"))
            )

            hall_data = data.get("hall", {})
            hall = HallTelemetry(
                occupancy=bool(hall_data.get("occupancy", False)),
                obstacle_distance_cm=float(hall_data.get("obstacle_distance_cm", 140.0))
            )

            return cls(
                node_id=node_id,
                bedroom=bedroom,
                hall=hall,
                timestamp=time.time(),
                raw_payload=data
            )
        except Exception:
            return None
