<<<<<<< HEAD
# AURA — Autonomous User-Responsive Residential Assistant
### *A Cognitive, Adaptive, and Accessible Smart Living Ecosystem Powered by Edge AI, Hybrid ESP32 + ESP8266 Distributed IoT Nodes, and Google Intelligence*

---

[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-1.5%20Multimodal%20AI-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Google MediaPipe](https://img.shields.io/badge/Google%20MediaPipe-Edge%20Pose%20Estimation-0097A7?logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![ESP32 + ESP8266](https://img.shields.io/badge/IoT-ESP32%20%2B%20ESP8266-E7352C?logo=espressif&logoColor=white)](https://www.espressif.com/)
[![MQTT](https://img.shields.io/badge/MQTT-Mosquitto%20Broker-660066?logo=eclipse-mosquitto&logoColor=white)](https://mqtt.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📑 Table of Contents
1. [Executive Summary & Vision](#-executive-summary--vision)
2. [The Core Cognitive Cycle](#-the-core-cognitive-cycle)
3. [Strict Negative Constraints](#-strict-negative-constraints)
4. [Google Technology Stack Integration](#-google-technology-stack-integration)
5. [System Architecture Diagram](#-system-architecture-diagram)
6. [Fall Detection Emergency Architecture & 108 Ambulance Dispatch](#-fall-detection-emergency-architecture--108-ambulance-dispatch)
7. [Physical 4-Zone Prototype Specification](#-physical-4-zone-prototype-specification)
8. [Hardware Bill of Materials (BOM) & Microcontroller Pinouts](#-hardware-bill-of-materials-bom--microcontroller-pinouts)
9. [Core System Modules](#-core-system-modules)
10. [MQTT Topic Registry & Communication Schemas](#-mqtt-topic-registry--communication-schemas)
11. [Central AI Web Dashboard Overview](#-central-ai-web-dashboard-overview)
12. [11-Step Hackathon Jury Demonstration Script](#-11-step-hackathon-jury-demonstration-script)
13. [Installation, Setup & Quickstart Guide](#-installation-setup--quickstart-guide)

---

## 🌟 Executive Summary & Vision

Conventional "smart homes" are fundamentally fragmented: users are burdened with countless mobile applications, manual toggle switches, and reactive notifications that demand human intervention. They do not understand human context, cannot adapt to environmental shifts, and fail to provide autonomous emergency interventions.

**AURA (Autonomous User-Responsive Residential Assistant)** transcends traditional IoT automation. Designed from the ground up as a **national-level hackathon ecosystem**, AURA functions as an omnipresent, cognitive residential companion. It blends on-device **Edge Computer Vision on a standard Laptop**, distributed **ESP32 (Zone 1) & ESP8266 (Zone 2) IoT Nodes**, and **Google Cloud & Gemini AI** to deliver:

* **Zero-Touch Contextual Living:** Automatically orchestrates lights, fans, curtains, and servos based on human presence, natural daylight levels, and ambient room temperature.
* **Proactive Life Safety:** Edge-computed human fall detection that records video evidence, invokes Google Gemini multimodal triage, activates local rescue alarms, and enables one-click dialing of the **108 National Ambulance Emergency Service**.
* **Hazard Intelligence:** Differentiates combustible gas leaks (LPG) from toxic smoke and rapid thermal fire spikes using MQ-2 and thermal gradient modeling, capturing instantaneous visual evidence snapshots.
* **Dynamic Indoor Navigation:** Topological $A^*$ indoor pathfinding that reroutes users in real-time around sudden obstacles detected by ultrasonic sensors.
* **Ambient Accessibility:** Natural voice interaction with wake-word detection (`"AURA"`) and synthesized auditory feedback for visually or mobility-impaired residents.

---

## 🔄 The Core Cognitive Cycle

AURA executes an unceasing, multi-threaded perception-action loop:

$$\mathbf{Sense} \longrightarrow \mathbf{Understand} \longrightarrow \mathbf{Predict} \longrightarrow \mathbf{Decide} \longrightarrow \mathbf{Act} \longrightarrow \mathbf{Assist}$$

```
  [ SENSE ]       --> Distributed sensors (PIR, LDR, DHT22, MQ-2, Ultrasonic) + Laptop Webcam
      |
[ UNDERSTAND ]    --> Multi-Sensor Fusion & Google MediaPipe Pose Extraction
      |
 [ PREDICT ]      --> Trajectory modeling, thermal rise rates & occupant intent estimation
      |
  [ DECIDE ]      --> AI Decision Engine + Google Gemini Multimodal Triage Heuristics
      |
   [ ACT ]        --> Autonomous actuation over MQTT (Relays, PWM Fans, Servos, Alarms)
      |
  [ ASSIST ]      --> Digital Twin HUD, Voice Feedback, Family Push Alerts & 108 Emergency Dispatch
```

---

## 🚫 Strict Negative Constraints

> [!IMPORTANT]
> **Definitive Sensor Exclusion Policy:**
> Under no circumstances does AURA include, support, or reference:
> * ❌ **Water leakage sensors**
> * ❌ **Magnetic door sensors**
> 
> These two sensors have been **completely eliminated** from all hardware schematics, firmware source code, MQTT data structures, backend database models, state machines, dashboard widgets, and documentation. Gas and fire hazards are monitored strictly via MQ-2 electrochemical sensors and DHT temperature sensors; presence and security are handled through PIR and Computer Vision.

---

## 🔷 Google Technology Stack Integration

AURA leverages the Google ecosystem to bridge local Edge AI with cutting-edge Cloud Multimodal Reasoning:

| Google Technology | Operational Role in AURA |
| :--- | :--- |
| **Google Gemini 1.5 Flash / Pro** | **Multimodal Incident Triage & Context Reasoning:** Ingests captured camera snapshots during falls or fires to classify severity, generate medical triage briefings, and translate vague human speech (*"AURA, it's chilly and dark"*) into precise environmental actions. |
| **Google MediaPipe Pose** | **Edge Vision Pose Estimation:** Runs locally on the Laptop at 30 FPS. Analyzes 33 skeletal body landmarks, torso verticality index, and kinetic drop velocities without sending raw video off the laptop. |
| **Google Firebase** | **Cloud Synchronization & Alert Dispatch:** Mirrors real-time room telemetry to Firebase Realtime Database and dispatches push alerts with image evidence URLs via Firebase Cloud Messaging (FCM). |
| **Google Maps Geolocation API** | **108 Ambulance Rapid Dispatch Routing:** Attaches the resident's pinpoint GPS coordinates and an automated routing link directly to the 108 Ambulance emergency payload. |
| **Web Speech / Google Speech API** | **Natural Voice Interaction & Wake-Word Engine:** Continuously monitors for `"AURA"` wake-word, processes accessibility commands, and speaks dynamic navigation directions. |

---

## 🏗️ System Architecture Diagram

```
+-------------------------------------------------------------------------------------------------------------+
|                                        SMART ENVIRONMENT (4 ZONES)                                          |
|                                                                                                             |
|  [ BEDROOM ]                     [ HALL ]                      [ KITCHEN ]                 [ BATHROOM ]     |
|  * Laptop Webcam (Pose AI)       * PIR Motion Sensor           * MQ-2 Gas/Smoke Sensor     * PIR Motion     |
|  * PIR Motion Sensor             * Ultrasonic Obstacle (US-1)  * DHT22 Temp & Humidity     * Ultrasonic     |
|  * Ambient LDR Lux Sensor        * Light Relay (LED)           * Kitchen Light Relay         Obstacle (US-2)|
|  * Light Relay (LED)             * PWM Variable Fan            * Exhaust Ventilation Fan   * Light Relay    |
|  * PWM Adaptive Fan              * Audible Rescue Buzzer                                                    |
|  * Servo Curtain Motor                                                                                      |
+-------------------------------------------------------------------------------------------------------------+
               |                                                                |
               v                                                                v
+-----------------------------------------------+              +-----------------------------------------------+
|             ESP32 NODE 1 (Zone A)             |              |            ESP8266 NODE 2 (Zone B)            |
|          Bedroom + Hall Controller            |              |          Kitchen + Bathroom Controller        |
+-----------------------------------------------+              +-----------------------------------------------+
               |                                                                |
               +-----------------------+                +-----------------------+
                                       |                |
                                       v                v
                       +------------------------------------------------+
                       |              MQTT BROKER (Mosquitto)           |
                       |    Publish/Subscribe Telemetry & Control       |
                       +------------------------------------------------+
                                               |
                                               v
+-------------------------------------------------------------------------------------------------------------+
|                                      EDGE AI GATEWAY & BACKEND (LAPTOP)                                     |
|                                                                                                             |
|  +---------------------------+  +--------------------------+  +-------------------------------------------+ |
|  |    Edge Vision Pipeline   |  |   AURA Context Engine    |  |          AI Decision Engine               | |
|  | * Google MediaPipe Pose   |  | * Sensor Fusion          |  | * Climate Fan Regulator (< 22°C Auto-Off)| |
|  | * Fall Velocity & Aspect  |  | * Daytime LDR Dimmer     |  | * Gas/Fire Safety Interceptor             | |
|  | * 5-Sec Video Clip Buffer |  | * Occupancy State Matrix |  | * Appliance Actuation Dispatcher          | |
|  +---------------------------+  +--------------------------+  +-------------------------------------------+ |
|                                                                                                             |
|  +---------------------------+  +--------------------------+  +-------------------------------------------+ |
|  |    Indoor Navigation      |  |  Voice Assistant HUD     |  |       Google Cloud Integration            | |
|  | * A* Grid Pathfinding     |  | * 'AURA' Wake-Word Engine|  | * Google Gemini 1.5 Multimodal Triage     | |
|  | * Dynamic Obstacle Reroute|  | * Speech Synthesis (TTS) |  | * Google Maps 108 Emergency Route         | |
|  +---------------------------+  +--------------------------+  +-------------------------------------------+ |
+-------------------------------------------------------------------------------------------------------------+
                                               |
                                               v
+-------------------------------------------------------------------------------------------------------------+
|                                     CENTRAL AI WEB DASHBOARD (REACT 18)                                     |
|                                                                                                             |
|  [ Interactive Digital Twin 2D Floorplan ]  [ Live Context Engine Feed ]  [ Safety Guardian Alert Center ]  |
|  [ Emergency Fall Modal + 'Call 108' ]      [ Dynamic Indoor Route Map ]  [ Energy & Space Analytics HUD ]  |
+-------------------------------------------------------------------------------------------------------------+
```

---

## 🚨 Fall Detection Emergency Architecture & 108 Ambulance Dispatch

AURA treats fall detection as an **autonomous, life-critical alerting pipeline**:

```
 [ Laptop Webcam Feed (30 FPS) ]
                |
                v
 [ Google MediaPipe Pose Extraction ]  --> Calculates 33 coordinates, Torso Verticality Index (TVI)
                |
                v
 [ Posture & Velocity Classifier ]     --> Computes bounding-box aspect ratio (> 1.6) & downward velocity
                |
                v
   < Possible Fall Detected? >
        | Yes
        v
 [ Multi-Frame Verification (1.5s) ]   --> Confirms person remains horizontally static on floor (not sitting)
        |
        +---> [ Capture Evidence Snapshot & 5-Second Replay Video Buffer ]
        |
        +---> [ Identify Zone: 'Bedroom' | Target: 'Registered Resident' ]
        |
        +---> [ Emergency Zone Actuation: Illuminate Bedroom Lights + Sound Alarm Buzzer ]
        |
        +---> [ Google Gemini Multimodal Triage ]: Evaluates posture severity & signs of injury
        |
        +---> [ Voice Alert Synthesizer ]: "Emergency assistance required in Bedroom!"
        |
        v
+-------------------------------------------------------------------------------------------------------------+
|                                    CENTRAL DASHBOARD CRITICAL SCREEN                                        |
|                                                                                                             |
|  ⚠️ POSSIBLE FALL DETECTED                                                                                  |
|  * Person: Registered User                     * Room: Bedroom (Emergency Zone Activated)                   |
|  * Time: 10:42:15 AM                           * Status: Critical Assistance Required                       |
|  * Visual Evidence: [ Live Video Clip Replay + High-Resolution Snapshot Frame ]                             |
|  * AI Triage: "Subject is prone on floor with sudden posture collapse. Gemini confirms urgent triage."      |
|                                                                                                             |
|   +---------------------------------------+       +---------------------------------------+                 |
|   |   📞 CALL AMBULANCE (108)             |       |   ✅ FALSE ALARM / DISMISS            |                 |
|   |   (Auto-dials 108 + Dispatches GPS)   |       |   (Restores Normal State)             |                 |
|   +---------------------------------------+       +---------------------------------------+                 |
+-------------------------------------------------------------------------------------------------------------+
```

---

## 🏠 Physical 4-Zone Prototype Specification

A miniature residential model is partitioned into four monitored living zones:

```
+------------------------------------+------------------------------------+
|                                    |                                    |
|              BEDROOM               |                HALL                |
|  * Laptop Webcam (Fall Detection)  |  * PIR Motion Sensor               |
|  * PIR Motion Sensor               |  * Ultrasonic Obstacle Sensor      |
|  * LDR Ambient Light Sensor        |  * Warm White Light LED            |
|  * Soft Warm Light LED             |  * Variable Speed DC Fan           |
|  * DC Comfort Fan                  |  * High-Decibel Emergency Buzzer   |
|  * Servo Motor (Curtain Control)   |                                    |
|                                    |                                    |
+------------------------------------+------------------------------------+
|                                    |                                    |
|              KITCHEN               |              BATHROOM              |
|  * MQ-2 Combustible Gas & Smoke    |  * PIR Motion Sensor               |
|  * DHT22 Temp & Humidity Sensor    |  * Ultrasonic Obstacle Sensor      |
|  * Bright Task Light LED           |  * Moisture-Safe LED Light         |
|  * High-Torque Exhaust Fan         |                                    |
|                                    |                                    |
+------------------------------------+------------------------------------+
```

---

## 🔌 Hardware Bill of Materials (BOM) & Microcontroller Pinouts

### Core Hardware Components

| Category | Component Description | Quantity | Primary Function |
| :--- | :--- | :---: | :--- |
| **Microcontrollers** | ESP32-WROOM-32 (Node 1) & ESP8266 NodeMCU (Node 2) | 2 (1x ESP32, 1x ESP8266) | Distributed IoT edge sensor & actuator nodes across 4 living zones |
| **Edge Compute** | Standard Laptop (Windows/Linux/macOS) | 1 | Runs Edge AI vision, FastAPI backend, WebSockets, React UI |
| **Computer Vision** | Laptop Integrated HD Webcam / USB Camera | 1 | Real-time human posture analysis & fall detection |
| **Presence Sensing** | HC-SR501 Passive Infrared (PIR) Sensors | 3 | Real-time room occupancy & human movement detection |
| **Ambient Light** | Photoresistor (LDR) Module with Analog Out | 2 | Daylight sensing for autonomous light dimming/shutdown |
| **Climate & Air** | DHT11 or DHT22 Temperature/Humidity Sensor | 1 | Ambient thermal tracking for climate-adaptive fan speeds |
| **Hazard Sensing** | MQ-2 Semiconductor Gas / Smoke Sensor | 1 | LPG, flammable gas, and combustion smoke detection |
| **Navigation** | HC-SR04 Ultrasonic / VL53L0X ToF Sensors | 2 | Real-time obstacle detection for indoor navigation |
| **Power Switching** | 4-Channel 5V Relay Module (Optocoupled) | 1 | Switching lights and ventilation fans |
| **Mechanics** | SG90 9g Micro Servo Motors | 2 | Window curtain opening/closing & motorized servo latch |
| **Audio Alert** | 5V Active Piezo Buzzer | 1 | Local audible alarm for falls, gas leaks, and fires |
| **Actuators** | 5V DC Mini Fans & High-Brightness LEDs | 4 | Miniature prototypes of fans and room lights |

---

### ESP32 Node 1 Pinout (Bedroom & Hall)

*Subscribes to: `aura/control/node1` | Publishes to: `aura/telemetry/node1`*

| Component | Pin Type | ESP32 GPIO | Description / Notes |
| :--- | :---: | :---: | :--- |
| **Bedroom PIR Sensor** | Digital Input | `GPIO 13` | High on occupancy detection |
| **Bedroom LDR Sensor** | Analog Input | `GPIO 34` | ADC1 Channel 6 (0–4095 Lux indicator) |
| **Bedroom Light (Relay Ch 1)** | Digital Output | `GPIO 25` | Active LOW relay trigger for bedroom light |
| **Bedroom Fan (PWM MOSFET)** | PWM Output | `GPIO 18` | 8-bit resolution PWM for fan speed modulation |
| **Curtain Servo Motor** | PWM Output | `GPIO 19` | 50 Hz PWM (0° closed, 90° open) |
| **Hall PIR Sensor** | Digital Input | `GPIO 14` | High on occupancy detection |
| **Hall Ultrasonic Trigger** | Digital Output | `GPIO 26` | 10 µs pulse to initiate distance measurement |
| **Hall Ultrasonic Echo** | Digital Input | `GPIO 27` | Obstacle sensing for indoor navigation |
| **Hall Light (Relay Ch 2)** | Digital Output | `GPIO 32` | Active LOW relay trigger for hall light |
| **Hall Fan (PWM MOSFET)** | PWM Output | `GPIO 21` | 8-bit resolution PWM for hall fan |
| **Emergency Rescue Buzzer** | Digital Output | `GPIO 22` | High triggers pulsing emergency tone |

---

### ESP8266 Node 2 Pinout (Kitchen & Bathroom — NodeMCU / D1 Mini)

*Subscribes to: `aura/control/node2` | Publishes to: `aura/telemetry/node2`*

| Component | NodeMCU Pin | ESP8266 GPIO | Interface / Description |
| :--- | :---: | :---: | :--- |
| **Kitchen MQ-2 Gas Sensor** | `A0` | `ADC0` | 10-bit Analog Input (0–1023 mapped to 100–2000 ppm) |
| **Kitchen DHT11 / DHT22** | `D2` | `GPIO 4` | Digital Single-Bus protocol (Temperature & Humidity) |
| **Kitchen Light (Relay Ch 3)** | `D1` | `GPIO 5` | Active LOW relay trigger for kitchen task lighting |
| **Exhaust Fan (MOSFET / Relay)** | `D5` | `GPIO 14` | Hardware PWM (0–255 speed modulation via `analogWrite`) |
| **Bathroom PIR Sensor** | `D6` | `GPIO 12` | High on bathroom human motion (HC-SR501) |
| **Bathroom Ultrasonic Trigger** | `D7` | `GPIO 13` | 10 µs pulse to initiate distance measurement |
| **Bathroom Ultrasonic Echo** | `D8` | `GPIO 15` | Echo timing pulse (3.3V via 1k/2k voltage divider) |
| **Bathroom Light (LED Driver)**| `D0` | `GPIO 16` | Active LOW relay / transistor trigger |

---

## 🧠 Core System Modules

### 1. AI Context Engine
Fuses multi-sensor telemetry into higher-order human contexts:
* Correlates room occupancy, daylight lux, temperature, air quality, and time of day.
* Generates continuous contextual states: `OCCUPIED_DAYTIME`, `OCCUPIED_COOL_EVENING`, `UNATTENDED_DRAIN`, `HAZARD_GAS_LEAK`, `CRITICAL_FALL_EVENT`.

### 2. Autonomous Climate & Daylight Automation
* **Daytime Ambient Light Adaptive Dimming:** Uses LDR readings during daylight hours. When natural lux exceeds the comfortable ambient threshold ($> 650\text{ lux}$), indoor lights automatically dim or switch off completely.
* **Thermal & Climate-Adaptive Fan Modulation:** Continuously monitors the DHT22 thermal reading. When cold weather, winter, or rainy conditions are detected ($T < 22^\circ\text{C}$), fan speeds are automatically reduced to low or turned off to prevent thermal discomfort.

### 3. Edge AI Fall Detection & 108 Emergency Assistance
* Runs Google MediaPipe Pose directly on the Edge Laptop webcam.
* Evaluates Torso Verticality Index (TVI), Bounding Box Aspect Ratio, and Centroid Fall Velocity.
* Verified falls trigger a 5-second video buffer capture, room light activation, audible alarm, Google Gemini multimodal incident triage, and a prominent **"Call Ambulance (108)"** button on the dashboard.

### 4. Safety Guardian (Gas Classification & Fire Capture)
* Ingests MQ-2 analog ppm signatures and thermal rise rates ($\Delta T / \Delta t$).
* Differentiates combustible gas leaks (LPG) from toxic smoke and extreme thermal fires.
* Instantly triggers high-volume exhaust ventilation, illuminates evacuation paths, captures camera visual evidence, and notifies emergency services.

### 5. Accessibility Assistant with "AURA" Wake-Word
* Resident speaks `"AURA"` $\rightarrow$ System chimes and enters Voice Command Mode.
* Supports commands:
  * *"AURA, turn on the hall light."*
  * *"AURA, guide me to the kitchen."*
  * *"AURA, what is the temperature?"*
  * *"AURA, activate accessibility mode."*
* Responds with clear synthesized audio feedback (Text-to-Speech).

### 6. Dynamic Indoor Navigation with Obstacle Avoidance
* Models a 2D topological grid covering Bedroom, Hall, Kitchen, and Bathroom.
* Computes real-time shortest paths using the $A^*$ pathfinding algorithm.
* When ultrasonic sensors detect an obstacle (e.g., fallen chair, moving obstruction), the system recalculates an alternate safe path instantaneously, rendering safe vs. blocked paths on the dashboard while providing auditory turn-by-turn guidance.

### 7. Energy & Space Intelligence
* Detects when rooms become vacant.
* Automatically cuts power to unnecessary lights and fans after a configurable timeout ($45\text{ seconds}$).
* Computes real-time wattage and cumulative kWh energy savings (with optional INA219 current sensor support).
* Visualizes room utilization heatmaps and daily dwell-time distribution across the 4 zones.

### 8. Interactive Digital Twin
* Real-time 2D floorplan visualization of the miniature home.
* Synchronized with sub-100ms latency via WebSockets.
* Renders live occupant presence, appliance power states, temperature badges, air quality status, and animated navigation paths.

---

## 📡 MQTT Topic Registry & Communication Schemas

### Topic Hierarchy

| Topic | Direction | Payload Format | Purpose |
| :--- | :---: | :---: | :--- |
| `aura/telemetry/node1` | Node 1 $\rightarrow$ Gateway | JSON | Bedroom & Hall sensors (PIR, LDR, Ultrasonic) |
| `aura/telemetry/node2` | Node 2 $\rightarrow$ Gateway | JSON | Kitchen & Bathroom sensors (MQ-2, DHT22, Ultrasonic, PIR) |
| `aura/control/node1` | Gateway $\rightarrow$ Node 1 | JSON | Actuator commands (Bedroom/Hall lights, fans, servos, buzzer) |
| `aura/control/node2` | Gateway $\rightarrow$ Node 2 | JSON | Actuator commands (Kitchen/Bathroom lights, exhaust fan) |
| `aura/emergency` | Gateway $\leftrightarrow$ All | JSON | Global emergency trigger (Fall detected, gas leak, fire) |

---

### Telemetry Payload Sample (`aura/telemetry/node1`)

```json
{
  "node_id": "esp32_node1",
  "timestamp": 1725358800,
  "bedroom": {
    "occupancy": true,
    "ambient_lux": 820,
    "curtain_state": "OPEN"
  },
  "hall": {
    "occupancy": false,
    "obstacle_distance_cm": 142.5
  }
}
```

---

### Control Payload Sample (`aura/control/node1`)

```json
{
  "target_node": "esp32_node1",
  "bedroom": {
    "light_state": false,
    "fan_speed_pwm": 0,
    "curtain_servo_angle": 90
  },
  "hall": {
    "light_state": true,
    "fan_speed_pwm": 180,
    "buzzer_state": false
  }
}
```

---

### Emergency Payload Sample (`aura/emergency`)

```json
{
  "event_id": "EMERG_20260903_001",
  "type": "POSSIBLE_FALL",
  "person": "Registered Resident",
  "room": "Bedroom",
  "timestamp": "2026-09-03T10:42:15Z",
  "severity": "CRITICAL",
  "evidence": {
    "snapshot_url": "/api/emergency/snapshots/fall_001.jpg",
    "video_buffer_url": "/api/emergency/clips/fall_001.mp4",
    "gemini_triage_summary": "Subject detected in horizontal static collapse near bedside. High probability of emergency fall."
  },
  "ambulance_dispatch": {
    "contact_number": "108",
    "dial_action": "tel:108",
    "gps_coordinates": "12.9716° N, 77.5946° E",
    "google_maps_url": "https://maps.google.com/?q=12.9716,77.5946"
  }
}
```

---

## 💻 Central AI Web Dashboard Overview

The web dashboard is built using **React 18 + Tailwind CSS** with a modern cyber-medical aesthetic:

1. **Live Environment Hub:** Real-time cards displaying temperature, humidity, daylight lux, and gas ppm with color-coded safety indicators.
2. **AI Context Log:** Live terminal showing real-time inference steps from the AURA Context Engine.
3. **Interactive Digital Twin:** SVG/Canvas 2D floorplan showing rooms, active lights, rotating fan animations, occupancy glows, and hazard rings.
4. **Dynamic Navigation Map:** Visual floorplan grid displaying the calculated safe route with interactive buttons to inject obstacles and observe real-time rerouting.
5. **Fall Detection & Emergency Modal:** Pops up immediately on confirmed fall. Displays the 5-second video buffer, captured high-res image, Gemini AI triage summary, and the prominent red **"Call Ambulance (108)"** button.
6. **Safety Guardian Center:** Live gas/smoke breakdown gauge (Normal / Warning / Critical) and thermal rise monitor with snapshot capture.
7. **Voice Assistant HUD:** Visualizer responding to `"AURA"` wake-word with live transcription and synthesized spoken responses.
8. **Energy & Space Intelligence:** Real-time watts consumed, cumulative kWh saved by auto-off rules, and room utilization pie charts.
9. **Device Control & Overrides:** Manual override switches for all lights, fans, curtains, and test triggers.
10. **Dual Mode Toggle (Live Hardware / Hackathon Simulator):** Allows judges to seamlessly test every feature with or without physical ESP32 boards plugged in.

---

## 🎬 11-Step Hackathon Jury Demonstration Script

Follow this sequence to deliver an unforgettable national-hackathon presentation:

| Step | Action / Trigger | System Reaction & Observable Outcome |
| :---: | :--- | :--- |
| **1** | **Person enters Bedroom** | PIR detects occupancy $\rightarrow$ AURA Context Engine infers presence $\rightarrow$ Bedroom light turns on automatically; fan adjusts according to temperature. |
| **2** | **Daytime Ambient Light Test** | Flashlight or bright ambient light hits Bedroom LDR $\rightarrow$ Lux exceeds threshold $\rightarrow$ Bedroom light automatically dims and turns off to conserve power. |
| **3** | **Climate / Cold Weather Test** | Simulated temperature drops below $22^\circ\text{C}$ $\rightarrow$ Climate Fan Controller reduces fan speed or turns fan off. |
| **4** | **Wake-Word Voice Command** | Presenter says: *"AURA, turn on the hall light"* $\rightarrow$ System chimes, shows listening HUD, turns on Hall light, and responds: *"Hall light activated."* |
| **5** | **Indoor Navigation Request** | Presenter selects destination: **"Kitchen"** $\rightarrow$ A* pathfinding calculates shortest route from Bedroom $\rightarrow$ Hall $\rightarrow$ Kitchen $\rightarrow$ Safe green path highlights on Digital Twin. |
| **6** | **Obstacle Detection & Reroute** | Presenter places hand/object in front of Hall Ultrasonic sensor $\rightarrow$ Sensor detects obstacle at $25\text{ cm}$ $\rightarrow$ System dynamically marks Hall path as BLOCKED, recalculates alternate safe path, and announces: *"Obstacle detected in Hallway. Recalculating route."* |
| **7** | **Simulated Fall Detection** | Presenter executes a safe horizontal posture shift in front of webcam $\rightarrow$ Google MediaPipe detects rapid downward velocity and horizontal aspect ratio ($> 1.6$). |
| **8** | **Multi-Frame Verification & Capture**| Fall holds for $1.5\text{ s}$ $\rightarrow$ Snapshot captured, 5-second video buffer saved, Bedroom light illuminates, local buzzer sounds. |
| **9** | **Emergency Screen & 108 Ambulance Call** | Dashboard launches Emergency Screen with captured image, Google Gemini triage summary, and **"Call Ambulance (108)"** button. Presenter clicks the button $\rightarrow$ Triggers 108 emergency dialer and dispatches Google Maps geolocation. |
| **10** | **Gas / Smoke Hazard Test** | Presenter triggers MQ-2 sensor test $\rightarrow$ Safety Guardian identifies gas concentration ($> 1200\text{ ppm}$), classifies hazard as LPG leak, captures camera snapshot, activates kitchen exhaust fan, and flashes red hazard alert. |
| **11** | **Vacant Room Energy Cutoff** | Presenter leaves Bedroom $\rightarrow$ Motion ceases $\rightarrow$ After timeout, AURA switches off bedroom devices and updates cumulative **Energy Saved** counter on dashboard. |

---

## 🚀 Installation, Setup & Quickstart Guide

### Prerequisites
* **Laptop:** Python 3.10+, Node.js 18+, Webcam, Microphone, Speaker.
* **Microcontroller IDE:** Arduino IDE 2.x with ESP32 board package installed.
* **MQTT Broker:** Local Mosquitto broker or integrated Python MQTT bridge.

---

### Step 1: Clone & Directory Structure
```bash
git clone https://github.com/your-username/AURA-Smart-Living.git
cd AURA-Smart-Living
```

The repository is structured as:
```
d:/new1/
├── README.md                           # Master Project Documentation
├── backend/                            # FastAPI Edge AI Gateway
│   ├── app/
│   │   ├── main.py                     # App entrypoint & WebSockets
│   │   ├── config.py                   # Environment & GPIO configurations
│   │   ├── core/                       # AI Context, Decision, Navigation & Safety Engines
│   │   ├── vision/                     # MediaPipe Fall Detector & Clip Buffer
│   │   ├── iot/                        # MQTT Client & Scenario Simulator
│   │   └── api/                        # REST & WebSocket API endpoints
│   ├── requirements.txt                # Python dependencies
│   └── run_backend.py                  # Backend startup script
├── firmware/                           # ESP32 Arduino C++ source code
│   ├── node1_bedroom_hall/             # Node 1 firmware & circuit diagram
│   └── node2_kitchen_bathroom/         # Node 2 firmware & circuit diagram
├── frontend/                           # React 18 + Tailwind CSS Dashboard
│   ├── src/components/                 # Digital Twin, Fall Modal, Voice HUD, Analytics
│   ├── package.json
│   └── vite.config.js
└── demo/                               # Automated 11-step hackathon test runner
```

---

### Step 2: Backend & Edge AI Setup
1. Create and activate a Python virtual environment:
   ```bash
   cd backend
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set your Google Gemini API key (optional for cloud triage; offline fallback included):
   ```bash
   set GEMINI_API_KEY="your-gemini-api-key"
   ```
4. Start the Edge AI Gateway:
   ```bash
   python run_backend.py
   ```
   *FastAPI server will be active at `http://localhost:8000` with interactive Swagger docs at `http://localhost:8000/docs`.*

---

### Step 3: Frontend Web Dashboard Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *The Central AI Dashboard will launch at `http://localhost:5173`.*

---

### Step 4: Microcontroller Firmware Flashing (Physical Hardware Mode)
1. **Node 1 (Bedroom & Hallway — ESP32):**
   - Open `firmware/node1_bedroom_hall/node1_bedroom_hall.ino` (or `board code/zone1/zone1.ino`) in Arduino IDE.
   - Select **Board: ESP32 Dev Module** and choose your COM port.
   - Update WiFi credentials (`ssid`, `password`) and laptop MQTT broker IP.
   - Click **Upload**.
2. **Node 2 (Kitchen & Bathroom — ESP8266):**
   - Open `firmware/node2_kitchen_bathroom/node2_kitchen_bathroom.ino` (or `board code/zone2/zone2.ino`) in Arduino IDE.
   - Select **Board: NodeMCU 1.0 (ESP-12E Module)** or **Generic ESP8266 Module** and choose your COM port.
   - Update WiFi credentials (`ssid`, `password`) and laptop MQTT broker IP.
   - Click **Upload**.

---

### Step 5: Zero-Hardware Hackathon Demonstration Mode
If presenting at a venue without physical ESP32 breadboards connected:
1. Open the dashboard at `http://localhost:5173`.
2. Toggle the top navigation switch from **"Hardware Mode"** to **"Simulation Mode"**.
3. Use the **"Demonstration Controls"** panel or execute `python demo/scenario_runner.py` to trigger all 11 evaluation steps in real-time!

---

## ⚖️ License
This project is licensed under the **MIT License** — feel free to use and adapt for academic, research, and hackathon applications.
=======
# Aura-
it for iot 
>>>>>>> 405bb861e2ac0bd6539410b679f1ae3fd16e5c01
