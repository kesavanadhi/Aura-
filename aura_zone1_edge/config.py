import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
CAPTURED_EVENTS_DIR = BASE_DIR / "captured_events"
LOGS_DIR = BASE_DIR / "logs"
MODELS_DIR = BASE_DIR / "models"

CAPTURED_EVENTS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Helper to read .env file manually if python-dotenv is not installed
def load_env_file():
    env_path = BASE_DIR / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip())

load_env_file()

class Settings:
    # Node ID
    NODE_ID: str = os.getenv("NODE_ID", "esp32_node1")
    ZONE_NAME: str = os.getenv("ZONE_NAME", "Zone 1 (Bedroom + Hallway)")

    # MQTT Broker Configuration
    MQTT_BROKER: str = os.getenv("MQTT_BROKER", "172.16.133.140")
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", "1883"))
    MQTT_USERNAME: str = os.getenv("MQTT_USERNAME", "")
    MQTT_PASSWORD: str = os.getenv("MQTT_PASSWORD", "")
    MQTT_KEEPALIVE: int = int(os.getenv("MQTT_KEEPALIVE", "60"))
    MQTT_RECONNECT_DELAY: int = int(os.getenv("MQTT_RECONNECT_DELAY", "3"))

    # MQTT Topics
    TOPIC_TELEMETRY: str = "aura/telemetry/node1"
    TOPIC_CONTROL: str = "aura/control/node1"
    TOPIC_AI_OCCUPANCY: str = "aura/ai/occupancy"
    TOPIC_AI_DECISION: str = "aura/ai/decision"
    TOPIC_AI_FALL: str = "aura/ai/fall"
    TOPIC_EMERGENCY: str = "aura/emergency"

    # AI Occupancy & Comfort Configuration
    LDR_DARK_THRESHOLD_LUX: int = int(os.getenv("LDR_DARK_THRESHOLD_LUX", "350"))
    LDR_BRIGHT_THRESHOLD_LUX: int = int(os.getenv("LDR_BRIGHT_THRESHOLD_LUX", "650"))
    OCCUPANCY_TIMEOUT_SEC: float = float(os.getenv("OCCUPANCY_TIMEOUT_SEC", "20.0"))
    ULTRASONIC_OBSTACLE_CM: float = float(os.getenv("ULTRASONIC_OBSTACLE_CM", "80.0"))

    # Fan Speed Rules
    FAN_COMFORT_PWM: int = int(os.getenv("FAN_COMFORT_PWM", "160"))
    FAN_MAX_PWM: int = int(os.getenv("FAN_MAX_PWM", "240"))

    # USB Camera & Fall Detection Settings
    CAMERA_INDEX: int = int(os.getenv("CAMERA_INDEX", "0"))
    CAMERA_FPS: int = int(os.getenv("CAMERA_FPS", "20"))
    FALL_CONFIDENCE_THRESHOLD: float = float(os.getenv("FALL_CONFIDENCE_THRESHOLD", "0.85"))
    FALL_TEMPORAL_WINDOW_SEC: float = float(os.getenv("FALL_TEMPORAL_WINDOW_SEC", "1.5"))
    FALL_COOLDOWN_SEC: float = float(os.getenv("FALL_COOLDOWN_SEC", "10.0"))

    # Live Camera HTTP Streaming Server
    STREAM_SERVER_PORT: int = int(os.getenv("STREAM_SERVER_PORT", "8001"))
    STREAM_SERVER_HOST: str = os.getenv("STREAM_SERVER_HOST", "0.0.0.0")

settings = Settings()
