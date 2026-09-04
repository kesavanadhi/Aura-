# PROJECT AURA — Zone 1 AI Edge Server (Bedroom + Hallway)

Autonomous cognitive residential monitoring and decision engine for **PROJECT AURA Zone 1** (ESP32 Bedroom & Hallway). 

This AI Edge Server connects to your local MQTT broker, ingests high-speed sensor telemetry from the ESP32 Node 1, runs local computer-vision fall detection on your USB camera, computes explainable multi-sensor automation decisions (lighting, ventilation, and motorized curtains), and coordinates life-safety emergency alarms.

---

## 1. Project Architecture

```
                                  +-----------------------------+
                                  |     USB Plug Webcam /       |
                                  |     Integrated Camera       |
                                  +--------------+--------------+
                                                 | DirectShow / MediaCapture
                                                 v
+-------------------+       MQTT TCP      +-----------------------------+       HTTP MJPEG      +----------------------+
|   Zone 1 ESP32    | <-----------------> |   AURA Zone 1 AI Edge Server| <-------------------> |    AURA Dashboard    |
| (Bedroom+Hallway) |      Port 1883      |   (Python Service)          |        Port 8001      |   (React Web App)    |
+-------------------+                     +-----------------------------+                       +----------------------+
         |                                               ^
         v                                               |
[PIR, LDR, US, Servo, LEDs, Fan]              [Local Fall Detection CV]
```

### Key Modules:
- **`main.py`**: Service orchestrator and event loop.
- **`config.py`**: Configuration manager loading from `.env` and defaults.
- **`mqtt_handler.py`**: Resilient reconnecting MQTT client for telemetry and control.
- **`occupancy_ai.py`**: Multi-sensor occupancy estimation with temporal debouncing & hysteresis.
- **`decision_engine.py`**: Central deterministic policy engine outputting explainable actuation decisions.
- **`fall_detection.py`**: Real-time USB camera frame grabber and local computer-vision fall detector.
- **`alert_manager.py`**: Emergency push button and fall alert dispatcher with echo loop suppression.
- **`telemetry.py`**: Zone 1 telemetry parser and dataclass models.
- **`logger.py`**: Structured logging with standardized tags (`[MQTT]`, `[AI]`, `[EMERGENCY]`, `[CAMERA]`).

---

## 2. Hardware Pinout Map (Zone 1 ESP32)

| Component | ESP32 GPIO Pin | Type / Function |
| :--- | :--- | :--- |
| **Bedroom PIR Sensor** | `GPIO 13` | Digital Input |
| **Bedroom LDR (Light Sensor)** | `GPIO 34` | Analog Input (ADC1) |
| **Bedroom Light (Relay / LED)** | `GPIO 25` | Digital Output (Active-HIGH) |
| **Bedroom Fan PWM** | `GPIO 12` | PWM Output (`ledcAttach` / `ledcWrite`) |
| **Bedroom Curtain Servo** | `GPIO 19` | Servo PWM (0° closed, 90° open) |
| **Hallway PIR Sensor** | `GPIO 14` | Digital Input |
| **Hallway Ultrasonic TRIG** | `GPIO 26` | Digital Output (Trigger pulse) |
| **Hallway Ultrasonic ECHO** | `GPIO 27` | Digital Input (Echo pulse) |
| **Hallway Light (Relay / LED)** | `GPIO 32` | Digital Output (Active-HIGH) |
| **Hallway Fan PWM** | `GPIO 23` | PWM Output (`ledcAttach` / `ledcWrite`) |
| **Piezo Buzzer** | `GPIO 33` | Digital Output (Active-HIGH) |
| **Emergency Push Button** | `GPIO 4` | Digital Input (`INPUT_PULLUP`) |
| **OLED Display (1.3" SH1106)** | `SDA: GPIO 21`, `SCL: GPIO 22` | I2C Display (128x64) |

---

## 3. MQTT Topic Map

| Topic | Direction | Payload Example | Description |
| :--- | :--- | :--- | :--- |
| `aura/telemetry/node1` | Node 1 $\rightarrow$ Edge | `{"node_id":"esp32_node1","bedroom":{"occupancy":true,"ambient_lux":420,"curtain_state":"OPEN"},"hall":{"occupancy":false,"obstacle_distance_cm":140.0}}` | Raw sensor feed at 1 Hz |
| `aura/control/node1` | Edge $\rightarrow$ Node 1 | `{"bedroom_light":true,"hall_light":false,"bedroom_fan_pwm":160,"curtain_servo_angle":90,"buzzer_active":false}` | Actuator commands |
| `aura/ai/occupancy` | Edge $\rightarrow$ Broker | `{"node_id":"esp32_node1","bedroom_occupied":true,"hall_occupied":false,"confidence":0.95}` | Estimated occupancy |
| `aura/ai/decision` | Edge $\rightarrow$ Broker | `{"node_id":"esp32_node1","decision":"BEDROOM_LIGHT_ON","reason":"Bedroom occupied and ambient light is low","confidence":0.94}` | Explainable AI policy log |
| `aura/ai/fall` | Edge $\rightarrow$ Broker | `{"node_id":"esp32_node1","event":"FALL_DETECTED","confidence":0.92,"timestamp":"2026-09-04T04:26:00"}` | Verified CV fall alert |
| `aura/emergency` | Bi-directional | `{"node_id":"esp32_node1","event":"EMERGENCY_BUTTON_PRESSED","status":"ACTIVE"}` | Life-safety panic alerts |

---

## 4. Installation & Setup

### Step 1: Create or Use Python 3.10+ Environment
```bash
# Verify Python
python --version
```

### Step 2: Install Dependencies
```bash
cd d:\new1\aura_zone1_edge
pip install -r requirements.txt
```

### Step 3: Configure Environment
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Ensure `MQTT_BROKER` matches your laptop's IP (e.g. `172.16.133.140`).

---

## 5. Running the AI Edge Server

Start the edge server with Python:
```bash
python main.py
```

Expected Startup Logs:
```text
[2026-09-04 04:30:00] [INFO] ==========================================================
[2026-09-04 04:30:00] [INFO] PROJECT AURA — ZONE 1 AI EDGE SERVER
[2026-09-04 04:30:00] [INFO] Autonomous Cognitive Resident Assistant & Edge Vision
[2026-09-04 04:30:00] [INFO] Target Broker: 172.16.133.140:1883
[2026-09-04 04:30:00] [INFO] ==========================================================
[2026-09-04 04:30:01] [CAMERA] Live USB Camera stream server started at http://0.0.0.0:8001/stream
[2026-09-04 04:30:01] [MQTT] Connecting to broker 172.16.133.140:1883...
[2026-09-04 04:30:01] [MQTT] Connected to broker 172.16.133.140:1883
[2026-09-04 04:30:01] [MQTT] Subscribed to: aura/telemetry/node1, aura/emergency, aura/control/node1
[2026-09-04 04:30:01] [AI] Fall detection engine started on Edge Server
[2026-09-04 04:30:01] [AI] AURA Zone 1 AI Edge Server is fully operational and listening for telemetry.
```

---

## 6. Live USB Camera Clip in Website

The AI Edge Server runs a continuous high-speed MJPEG video stream on port `8001`:
- **Direct Stream URL**: `http://localhost:8001/stream` (or `http://172.16.133.140:8001/stream` on mobile)
- **Snapshot URL**: `http://localhost:8001/frame`

In the AURA Dashboard:
- Open the **Possible Fall Detected** modal or camera card.
- The live video stream will automatically render the real-time USB plug camera clip.
- When a fall is confirmed, the exact evidence frame is saved to `captured_events/fall_<timestamp>.jpg` and displayed with landmark overlays.

---

## 7. Testing & Verification

### Test 1: Test Inbound Telemetry Processing
Run a mock telemetry publish using PowerShell:
```powershell
python -c "
import paho.mqtt.publish as pub
payload = '{\"node_id\":\"esp32_node1\",\"bedroom\":{\"occupancy\":true,\"ambient_lux\":180,\"curtain_state\":\"OPEN\"},\"hall\":{\"occupancy\":false,\"obstacle_distance_cm\":135.0}}'
pub.single('aura/telemetry/node1', payload=payload, hostname='172.16.133.140', port=1883)
"
```
Observe the Edge Server terminal output:
`[AI] Bedroom light decision: ON (Bedroom occupied and ambient light is low)`

### Test 2: Test Emergency Push Button
Publish an emergency button event:
```powershell
python -c "
import paho.mqtt.publish as pub
pub.single('aura/emergency', payload='{\"node_id\":\"esp32_node1\",\"event\":\"EMERGENCY_BUTTON_PRESSED\"}', hostname='172.16.133.140', port=1883)
"
```
Observe:
- `[EMERGENCY] Zone 1 emergency event triggered: EMERGENCY_BUTTON_PRESSED`
- Actuators immediately command all lights ON and buzzer sounding.

---

## 8. Troubleshooting

- **`rc=-2` or Connection Refused**:
  Check that the embedded broker in PROJECT AURA backend is running on `172.16.133.140:1883` or `127.0.0.1:1883`.
- **USB Camera Not Detected**:
  Verify the USB camera is plugged in. On Windows, check Settings $\rightarrow$ Privacy & Security $\rightarrow$ Camera $\rightarrow$ "Let desktop apps access your camera" is toggled **ON**.
