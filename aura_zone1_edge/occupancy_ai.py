import time
from datetime import datetime
from typing import Dict, Any, Tuple
from config import settings
from telemetry import Zone1Telemetry
from logger import log_ai

class OccupancyAI:
    """
    Multi-sensor intelligent occupancy estimator with hysteresis & debounce.
    Combines passive infrared (PIR) motion with ultrasonic corridor depth.
    """
    def __init__(self):
        self.last_bedroom_motion_time = 0.0
        self.last_hall_motion_time = 0.0

        self.bedroom_occupied = False
        self.hall_occupied = False
        self.confidence_bedroom = 0.5
        self.confidence_hall = 0.5

    def evaluate(self, telemetry: Zone1Telemetry) -> Tuple[bool, bool, Dict[str, Any]]:
        now = time.time()

        # 1. Bedroom PIR Evaluation with Temporal Hold
        if telemetry.bedroom.occupancy:
            self.last_bedroom_motion_time = now
            if not self.bedroom_occupied:
                log_ai("Bedroom motion detected -> Room OCCUPIED")
            self.bedroom_occupied = True
            self.confidence_bedroom = 0.95
        else:
            elapsed = now - self.last_bedroom_motion_time
            if elapsed < settings.OCCUPANCY_TIMEOUT_SEC:
                # Still within hold window (resident could be sitting/resting)
                self.bedroom_occupied = True
                # Decay confidence slightly over elapsed hold time
                decay = (elapsed / settings.OCCUPANCY_TIMEOUT_SEC) * 0.25
                self.confidence_bedroom = max(0.70, 0.95 - decay)
            else:
                if self.bedroom_occupied:
                    log_ai(f"No bedroom motion for {int(elapsed)}s -> Room VACANT")
                self.bedroom_occupied = False
                self.confidence_bedroom = 0.90

        # 2. Hallway PIR + Ultrasonic Corroboration
        hall_pir = telemetry.hall.occupancy
        hall_us_dist = telemetry.hall.obstacle_distance_cm
        has_corridor_obstacle = (0 < hall_us_dist < settings.ULTRASONIC_OBSTACLE_CM)

        if hall_pir or has_corridor_obstacle:
            self.last_hall_motion_time = now
            if not self.hall_occupied:
                log_ai(f"Hallway presence detected (PIR={hall_pir}, US={hall_us_dist:.1f}cm) -> Hall OCCUPIED")
            self.hall_occupied = True
            self.confidence_hall = 0.98 if (hall_pir and has_corridor_obstacle) else 0.91
        else:
            elapsed_hall = now - self.last_hall_motion_time
            if elapsed_hall < (settings.OCCUPANCY_TIMEOUT_SEC / 2.0):
                self.hall_occupied = True
                self.confidence_hall = 0.75
            else:
                if self.hall_occupied:
                    log_ai(f"Hallway clear for {int(elapsed_hall)}s -> Hall VACANT")
                self.hall_occupied = False
                self.confidence_hall = 0.92

        overall_occupied = self.bedroom_occupied or self.hall_occupied
        overall_confidence = round((self.confidence_bedroom + self.confidence_hall) / 2.0, 2)

        payload = {
            "node_id": settings.NODE_ID,
            "zone": settings.ZONE_NAME,
            "bedroom_occupied": self.bedroom_occupied,
            "hall_occupied": self.hall_occupied,
            "zone1_overall_occupied": overall_occupied,
            "confidence": overall_confidence,
            "timestamp": datetime.now().isoformat(),
            "source": "edge_ai"
        }

        return self.bedroom_occupied, self.hall_occupied, payload
