import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
SNAPSHOTS_DIR = STORAGE_DIR / "snapshots"
CLIPS_DIR = STORAGE_DIR / "clips"

SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)
CLIPS_DIR.mkdir(parents=True, exist_ok=True)

class SystemConfig(BaseModel):
    # System Identity
    PROJECT_NAME: str = "AURA"
    PROJECT_TITLE: str = "Autonomous User-Responsive Residential Assistant"
    VERSION: str = "2.0.0"
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # MQTT Broker Settings
    MQTT_BROKER_HOST: str = os.getenv("MQTT_BROKER_HOST", "127.0.0.1")
    MQTT_BROKER_PORT: int = int(os.getenv("MQTT_BROKER_PORT", "1883"))
    MQTT_KEEPALIVE: int = 60
    
    # MQTT Topics
    TOPIC_TELEMETRY_NODE1: str = "aura/telemetry/node1"  # Bedroom & Hall
    TOPIC_TELEMETRY_NODE2: str = "aura/telemetry/node2"  # Kitchen & Bathroom
    TOPIC_CONTROL_NODE1: str = "aura/control/node1"
    TOPIC_CONTROL_NODE2: str = "aura/control/node2"
    TOPIC_STATUS_NODE1: str = "aura/status/node1"
    TOPIC_STATUS_NODE2: str = "aura/status/node2"
    TOPIC_EMERGENCY: str = "aura/emergency"
    
    # Ambient Light (LDR) Settings
    # When natural lux is above this during daytime, light is dimmed or turned off
    LDR_DAYLIGHT_THRESHOLD_LUX: int = 650
    
    # Climate & Temperature Fan Modulation Thresholds (°C)
    TEMP_COLD_WINTER_THRESHOLD: float = 22.0  # Cold/Rainy/Winter: Fan Off/Very Low (PWM 0-40)
    TEMP_MODERATE_THRESHOLD: float = 26.0     # Moderate: Fan Low (PWM 120)
    TEMP_WARM_THRESHOLD: float = 30.0         # Warm: Fan Medium (PWM 180)
    # Above 30.0°C: Fan High (PWM 255)
    
    # Safety Guardian (MQ-2 Gas / Smoke & Thermal Fire)
    GAS_WARNING_PPM: int = 600
    GAS_CRITICAL_PPM: int = 1200
    FIRE_THERMAL_RISE_RATE: float = 2.5  # °C increase per 10 seconds indicates rapid fire
    
    # Fall Detection Parameters (MediaPipe Pose on Edge Laptop)
    FALL_ASPECT_RATIO_THRESHOLD: float = 1.35  # Bounding box Width / Height > 1.35 (horizontal)
    FALL_TORSO_ANGLE_THRESHOLD: float = 60.0   # Degrees tilt from vertical
    FALL_VERIFICATION_SECONDS: float = 1.5     # Continuous ground dwell to verify fall
    FALL_BUFFER_SECONDS: int = 5               # 5-second circular video clip buffer
    
    # 108 Ambulance & Emergency Dispatch Settings
    AMBULANCE_NUMBER: str = "108"
    AMBULANCE_DIAL_URI: str = "tel:108"
    RESIDENTIAL_GPS_LAT: float = 12.9716
    RESIDENTIAL_GPS_LON: float = 77.5946
    GOOGLE_MAPS_EMERGENCY_URL: str = "https://www.google.com/maps/search/?api=1&query=12.9716,77.5946"
    PERSONAL_EMERGENCY_CONTACT: str = "+919876543210"
    
    # Google Gemini Multimodal AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
    # Energy Intelligence
    EMPTY_ROOM_TIMEOUT_SECONDS: int = 45  # Auto shut off lights/fan after 45s without motion
    TYPICAL_LIGHT_WATTAGE: float = 12.0   # Watts
    TYPICAL_FAN_WATTAGE: float = 55.0     # Watts
    
    # Strictly Excluded Sensors (Documented as False flags to guarantee zero usage)
    ENABLE_WATER_LEAKAGE_SENSOR: bool = False
    ENABLE_MAGNETIC_DOOR_SENSOR: bool = False

settings = SystemConfig()
