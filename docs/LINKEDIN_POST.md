# 🚀 Introducing AURA: Autonomous User-Responsive Residential Assistant
### *Bridging Edge AI, Dual ESP32 IoT Nodes, and Google Multimodal Intelligence for Zero-Touch, Life-Saving Smart Living*

---

### 📝 Ready-to-Publish LinkedIn Post

```markdown
💡 Most "smart homes" today aren't actually smart — they are just remote controls disguised as smartphone apps.

If you have to open an app to switch on a light, tap a screen to adjust a fan when you're shivering, or wear an emergency pendant you left on the nightstand when you fall — technology has failed you.

Over the past few months, our team set out to solve this fundamental problem from the ground up: 
Can a residential home truly UNDERSTAND, PREDICT, and PROTECT its residents without requiring a single touch?

Meet **AURA (Autonomous User-Responsive Residential Assistant)** 🌐💠
A cognitive, adaptive living ecosystem engineered for national-level hackathons and ambient assisted living.

---

### 🔍 The Problems We Solved:

1️⃣ **The Passive Automation Problem:**
Traditional IoT runs on blind timers. AURA introduces **Zero-Touch Contextual Living**:
- ☀️ **Daylight Adaptive Dimming:** Uses photoresistors (LDR) to detect when ambient sunlight exceeds 650 lx, instantly dimming or switching off room lighting to cut energy waste.
- ❄️ **Climate-Aware Thermal Regulation:** Couples DHT sensors to dynamically throttle fan speeds to low or 0 PWM when room temperatures drop below 22°C in rainy or cold seasons.
- ⚡ **Autonomous Energy Cutoff:** Intelligently tracks 4-zone occupancy, automatically de-energizing vacant rooms after 45 seconds to maximize kWh savings.

2️⃣ **The Life-Critical Fall Emergency Delay:**
Falls are the #1 hazard for elderly residents, and victims often lose consciousness before pressing panic buttons.
- 👁️ **Edge Computer Vision:** Standard laptop camera processes skeletal landmarks at 30 FPS using **Google MediaPipe Pose** — tracking Torso Verticality Index (TVI) and downward kinetic velocity without sending raw video feeds off-device.
- 🧠 **Google Gemini 1.5 Multimodal Triage:** Upon fall confirmation (1.5s ground dwell), AURA captures evidence frames, synthesizes an instant medical triage summary, and illuminates the room.
- 🚑 **One-Touch 108 Ambulance Dispatch:** Instantly generates a live emergency packet with pinpoint GPS coordinates and a Google Maps live routing link ready for first responders.

3️⃣ **Hazard Intelligence & Dynamic Indoor Navigation:**
- 🔥 **Electrochemical Gas vs. Fire Differentiation:** Uses MQ-2 and thermal gradients to distinguish combustible LPG leaks from toxic smoke, autonomously engaging high-torque turbo exhaust evacuation.
- 🧭 **A* Topological Navigation with Dynamic Rerouting:** Monitors ultrasonic radar sensors across corridors; if an obstacle is detected, AURA recomputes a safe alternate route with turn-by-turn auditory voice guidance.
- 🗣️ **Ambient Voice Assistant:** Natural voice interaction powered by wake-word detection ("AURA") and accessibility TTS.

---

### 🛠️ Architecture & Tech Stack:
- **Edge Vision & AI Gateway:** Google MediaPipe Pose (Edge 30 FPS) • Google Gemini 1.5 Flash Multimodal • Python 3.11 • FastAPI • WebSockets
- **Distributed Hardware Nodes:** Hybrid ESP32 (Zone 1: Bedroom/Hall) + ESP8266 NodeMCU (Zone 2: Kitchen/Bathroom)
- **Sensor & Actuator Network:** MQ-2, DHT11/22, HC-SR501 PIR, HC-SR04 Ultrasonic, LDRs, 4-Ch Relays, SG90 Servos, PWM Fans
- **IoT Messaging Protocol:** Eclipse Mosquitto MQTT Broker (sub-50ms pub/sub telemetry & control)
- **Central Cockpit UI:** React 18 • Vite • TailwindCSS • 2D Digital Twin HUD with real-time bi-directional state synchronization

---

A huge thank you to everyone who supported us on this journey! Autonomous living isn't just about convenience — it's about life safety, dignity, and accessibility.

Check out the demo video and architecture walkthrough below! 👇

#SmartHome #IoT #EdgeAI #ComputerVision #GoogleGemini #MediaPipe #ESP32 #ESP8266 #FastAPI #ReactJS #Accessibility #Hackathon #Innovation #HealthcareAI #AmbientLiving
```

---

### 📊 Accompanying Media Suggestions for the Post:
1. **Video/GIF 1:** MediaPipe Pose skeleton collapsing into a fall $\rightarrow$ Dashboard triggering the Red Emergency HUD + Google Maps 108 Ambulance dispatch.
2. **Video/GIF 2:** Dynamic A* route rerouting from `BEDROOM -> HALL_CENTRAL -> KITCHEN` to `BEDROOM -> HALL_BYPASS -> KITCHEN` when the ultrasonic obstacle sensor is triggered.
3. **Image 1:** 4-Zone Digital Twin UI showing synchronized sensor telemetry and proportional exhaust fan RPM.
4. **Image 2:** Physical Dual ESP32 prototype wiring diagram with relays and sensors.
