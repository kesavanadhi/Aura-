from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

# Telemetry Schemas
class BedroomTelemetry(BaseModel):
    occupancy: bool = False
    ambient_lux: int = 450
    curtain_state: str = "OPEN"
    last_motion_time: Optional[float] = None

class HallTelemetry(BaseModel):
    occupancy: bool = False
    obstacle_distance_cm: float = 150.0
    last_motion_time: Optional[float] = None

class KitchenTelemetry(BaseModel):
    gas_ppm: int = 220
    temperature_c: float = 24.5
    humidity_pct: float = 55.0
    hazard_type: Optional[str] = None  # None, "LPG_LEAK", "SMOKE", "THERMAL_FIRE"

class BathroomTelemetry(BaseModel):
    occupancy: bool = False
    obstacle_distance_cm: float = 120.0
    last_motion_time: Optional[float] = None

class FullTelemetry(BaseModel):
    timestamp: float = Field(default_factory=lambda: datetime.now().timestamp())
    bedroom: BedroomTelemetry = Field(default_factory=BedroomTelemetry)
    hall: HallTelemetry = Field(default_factory=HallTelemetry)
    kitchen: KitchenTelemetry = Field(default_factory=KitchenTelemetry)
    bathroom: BathroomTelemetry = Field(default_factory=BathroomTelemetry)

# Actuator Control States
class ActuatorStates(BaseModel):
    bedroom_light: bool = False
    bedroom_fan_pwm: int = 0          # 0 - 255
    curtain_servo_angle: int = 90      # 0 (Closed) - 90 (Open)
    hall_light: bool = False
    hall_fan_pwm: int = 0             # 0 - 255
    buzzer_active: bool = False
    kitchen_light: bool = False
    exhaust_fan: bool = False
    exhaust_fan_speed_pct: int = 0    # 0 - 100% proportional speed
    bathroom_light: bool = False
    emergency_light_mode: bool = False

# Energy Intelligence State
class EnergyMetrics(BaseModel):
    current_power_watts: float = 0.0
    cumulative_saved_kwh: float = 0.420
    active_appliances_count: int = 0
    energy_saving_mode: bool = True
    last_auto_shutdown_event: Optional[str] = None

# Context Engine State
class ContextState(BaseModel):
    current_context: str = "NORMAL_DAYTIME"
    daytime_mode: bool = True
    ambient_light_dimmed: bool = False
    climate_condition: str = "MODERATE"  # "COLD_WINTER", "MODERATE", "WARM_HOT"
    climate_fan_target_pwm: int = 120
    active_hazards: List[str] = []
    active_emergency: Optional[str] = None
    reasoning_logs: List[str] = []

# Emergency Incident Model (Fall, Gas, Fire)
class AmbulanceDispatchInfo(BaseModel):
    contact_number: str = "108"
    dial_action: str = "tel:108"
    gps_coordinates: str = "12.9716° N, 77.5946° E"
    google_maps_url: str = "https://www.google.com/maps/search/?api=1&query=12.9716,77.5946"
    status: str = "READY_TO_DISPATCH"

class EmergencyIncident(BaseModel):
    event_id: str
    type: str  # "POSSIBLE_FALL", "GAS_LEAK_LPG", "SMOKE_HAZARD", "THERMAL_FIRE"
    room: str
    person: str = "Registered Resident"
    timestamp: str
    severity: str  # "WARNING", "CRITICAL"
    evidence_snapshot_url: Optional[str] = None
    evidence_clip_url: Optional[str] = None
    gemini_triage_summary: str = "Awaiting AI triage analysis..."
    ambulance_dispatch: AmbulanceDispatchInfo = Field(default_factory=AmbulanceDispatchInfo)
    contacts_notified: List[str] = []
    resolved: bool = False

# Navigation Models
class MapNode(BaseModel):
    id: str
    name: str
    zone: str
    x: int
    y: int
    is_blocked: bool = False
    emergency: bool = False

class NavigationRequest(BaseModel):
    start_room: str = "Bedroom"
    destination_room: str = "Kitchen"

class NavigationResult(BaseModel):
    start_room: str
    destination_room: str
    safe_route: List[str]
    route_coordinates: List[Dict[str, Any]]
    path_status: str  # "SAFE", "OBSTACLE_DETECTED_REROUTED", "PATH_BLOCKED"
    voice_guidance: str
    detected_obstacles: List[str] = []

# Accessibility & Voice Command Models
class VoiceCommandRequest(BaseModel):
    transcript: str

class VoiceCommandResponse(BaseModel):
    transcript: str
    wake_word_detected: bool = False
    command_understood: bool = False
    action_taken: str
    spoken_feedback: str
    actuators: Optional[ActuatorStates] = None
