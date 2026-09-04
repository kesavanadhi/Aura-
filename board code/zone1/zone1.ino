#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// =========================================================================
// PROJECT AURA — ZONE 1 (Bedroom & Hallway Controller)
// Hardware: ESP32 Node 1
// OLED display removed as per hardware configuration.
// DC Fans driven via Transistor / MOSFET (Active-HIGH, NO Relay).
// Dual-pin outputs configured for Bedroom Fan, Hall Fan & Buzzer.
// =========================================================================

// Network & MQTT Configuration
const char* WIFI_SSID = "Nothing Phone (3a)_Isan";
const char* WIFI_PASS = "chog1869";

const char* MQTT_BROKER = "172.16.133.140";
const int MQTT_PORT = 1883;

const char* TOPIC_TELEMETRY = "aura/telemetry/node1";
const char* TOPIC_CONTROL   = "aura/control/node1";
const char* TOPIC_STATUS    = "aura/status/node1";
const char* TOPIC_EMERGENCY = "aura/emergency";

// =========================================================================
// Hardware Pinout Definitions (ESP32 Node 1)
// =========================================================================
// Bedroom Sensors & Actuators
#define PIN_BEDROOM_PIR         13
#define PIN_BEDROOM_LDR         34
#define PIN_BEDROOM_LIGHT       25
#define PIN_CURTAIN_SERVO       19

// Fan Driver (Transistor/MOSFET, NO Relay)
// Dual-driven on GPIO 18 & GPIO 12 to guarantee connection regardless of wiring
#define PIN_BEDROOM_FAN_PWM     18
#define PIN_BEDROOM_FAN_PWM_ALT 12

// Hallway Sensors & Actuators
#define PIN_HALL_PIR            14
#define PIN_HALL_US_TRIG        26
#define PIN_HALL_US_ECHO        27
#define PIN_HALL_LIGHT          32

// Hall Fan (Dual-driven on GPIO 21 & GPIO 23, OLED freed GPIO 21)
#define PIN_HALL_FAN_PWM        21
#define PIN_HALL_FAN_PWM_ALT    23

// Rescue Buzzer (Dual-driven on GPIO 22 & GPIO 33, OLED freed GPIO 22)
#define PIN_BUZZER              22
#define PIN_BUZZER_ALT          33

// Emergency Push Button
#define PIN_EMERGENCY_BUTTON    4

// PWM Configuration for DC Fan Motors (1000 Hz ensures high starting torque)
#define PWM_FREQ 1000
#define PWM_RES  8

// =========================================================================
// Global Objects and State
// =========================================================================
WiFiClient espClient;
PubSubClient mqttClient(espClient);
Servo curtainServo;

unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 1000;

bool bedLightState = false;
bool hallLightState = false;
int bedFanPwm = 0;
int hallFanPwm = 0;
bool buzzerActive = false;
int curtainAngle = 90;
String lastCommandId = "";

// Emergency button debounce state
bool lastButtonReading = HIGH;
unsigned long lastButtonDebounceTime = 0;
const unsigned long BUTTON_DEBOUNCE_DELAY_MS = 250;
bool emergencyTriggered = false;

// RELAY / LED POLARITY FOR LIGHTS:
// Set to false for standard LEDs and active-HIGH logic (HIGH = ON, LOW = OFF).
// Set to true only if using inverted active-LOW relay boards.
const bool RELAY_ACTIVE_LOW = false;

inline void setRelay(int pin, bool state) {
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(pin, state ? LOW : HIGH);
  } else {
    digitalWrite(pin, state ? HIGH : LOW);
  }
}

// DC Fan Motor Control with Anti-Stall Kickstart (No Relay used for Fans)
void setBedroomFanSpeed(int pwmVal) {
  int targetPwm = constrain(pwmVal, 0, 255);
  // Anti-stall kickstart: DC brush fans stall below ~80 PWM if started cold
  if (bedFanPwm == 0 && targetPwm > 0 && targetPwm < 150) {
    analogWrite(PIN_BEDROOM_FAN_PWM, 255);
    analogWrite(PIN_BEDROOM_FAN_PWM_ALT, 255);
    delay(80);
  }
  bedFanPwm = targetPwm;
  analogWrite(PIN_BEDROOM_FAN_PWM, bedFanPwm);
  analogWrite(PIN_BEDROOM_FAN_PWM_ALT, bedFanPwm);
  Serial.printf("[Fan] Bedroom Fan PWM -> %d (GPIO 18 & 12)\n", bedFanPwm);
}

void setHallFanSpeed(int pwmVal) {
  int targetPwm = constrain(pwmVal, 0, 255);
  if (hallFanPwm == 0 && targetPwm > 0 && targetPwm < 150) {
    analogWrite(PIN_HALL_FAN_PWM, 255);
    analogWrite(PIN_HALL_FAN_PWM_ALT, 255);
    delay(80);
  }
  hallFanPwm = targetPwm;
  analogWrite(PIN_HALL_FAN_PWM, hallFanPwm);
  analogWrite(PIN_HALL_FAN_PWM_ALT, hallFanPwm);
  Serial.printf("[Fan] Hall Fan PWM -> %d (GPIO 21 & 23)\n", hallFanPwm);
}

void setBuzzerState(bool active) {
  buzzerActive = active;
  digitalWrite(PIN_BUZZER, active ? HIGH : LOW);
  digitalWrite(PIN_BUZZER_ALT, active ? HIGH : LOW);
  Serial.printf("[Buzzer] Alarm -> %s (GPIO 22 & 33)\n", active ? "ACTIVE" : "SILENT");
}

// Robust JSON extractors
int extractInt(const String& msg, const String& key) {
  int idx = msg.indexOf(key);
  if (idx < 0) return -1;
  int start = idx + key.length();
  while (start < msg.length() && (msg[start] == ':' || msg[start] == ' ' || msg[start] == '\"')) {
    start++;
  }
  return msg.substring(start).toInt();
}

bool hasTrue(const String& msg, const String& key) {
  int idx = msg.indexOf(key);
  if (idx < 0) return false;
  int end = msg.indexOf(',', idx);
  if (end < 0) end = msg.indexOf('}', idx);
  if (end < 0) end = msg.length();
  String sub = msg.substring(idx, end);
  return (sub.indexOf("true") >= 0);
}

bool hasFalse(const String& msg, const String& key) {
  int idx = msg.indexOf(key);
  if (idx < 0) return false;
  int end = msg.indexOf(',', idx);
  if (end < 0) end = msg.indexOf('}', idx);
  if (end < 0) end = msg.length();
  String sub = msg.substring(idx, end);
  return (sub.indexOf("false") >= 0);
}

String extractString(const String& msg, const String& key) {
  int idx = msg.indexOf(key);
  if (idx < 0) return "";
  int start = msg.indexOf(':', idx);
  if (start < 0) return "";
  start++;
  while (start < msg.length() && (msg[start] == ' ' || msg[start] == '\"')) {
    start++;
  }
  int end = start;
  while (end < msg.length() && msg[end] != '\"' && msg[end] != ',' && msg[end] != '}') {
    end++;
  }
  return msg.substring(start, end);
}

void setupWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] ESP32 Node 1 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Connection timeout. Continuing in loop...");
  }
}

void publishActuatorStatus() {
  if (!mqttClient.connected()) return;
  String payload = "{";
  payload += "\"node_id\":\"esp32_node1\",";
  if (lastCommandId.length() > 0) {
    payload += "\"command_id\":\"" + lastCommandId + "\",";
    payload += "\"status\":\"EXECUTED\",";
  }
  payload += "\"actuators\":{";
  payload += "\"bedroom_light\":" + String(bedLightState ? "true" : "false") + ",";
  payload += "\"hall_light\":" + String(hallLightState ? "true" : "false") + ",";
  payload += "\"bedroom_fan_pwm\":" + String(bedFanPwm) + ",";
  payload += "\"hall_fan_pwm\":" + String(hallFanPwm) + ",";
  payload += "\"curtain_servo_angle\":" + String(curtainAngle) + ",";
  payload += "\"buzzer_active\":" + String(buzzerActive ? "true" : "false");
  payload += "}";
  payload += "}";
  mqttClient.publish(TOPIC_STATUS, payload.c_str());
  Serial.printf("[Status Acknowledged] %s\n", payload.c_str());
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.printf("[MQTT Inbound] %s: %s\n", topic, message.c_str());

  if (String(topic) == TOPIC_CONTROL) {
    String cmdId = extractString(message, "\"command_id\"");
    if (cmdId.length() > 0) {
      lastCommandId = cmdId;
    }

    // Bedroom Light
    if (hasTrue(message, "\"bedroom_light\"")) {
      bedLightState = true;
      setRelay(PIN_BEDROOM_LIGHT, true);
      Serial.println("[Actuator] Bed Light -> ON");
    } else if (hasFalse(message, "\"bedroom_light\"")) {
      bedLightState = false;
      setRelay(PIN_BEDROOM_LIGHT, false);
      Serial.println("[Actuator] Bed Light -> OFF");
    }

    // Hall Light
    if (hasTrue(message, "\"hall_light\"")) {
      hallLightState = true;
      setRelay(PIN_HALL_LIGHT, true);
      Serial.println("[Actuator] Hall Light -> ON");
    } else if (hasFalse(message, "\"hall_light\"")) {
      hallLightState = false;
      setRelay(PIN_HALL_LIGHT, false);
      Serial.println("[Actuator] Hall Light -> OFF");
    }

    // Bedroom Fan PWM (Transistor/MOSFET control, no relay)
    int bedPwm = extractInt(message, "\"bedroom_fan_pwm\"");
    if (bedPwm < 0) bedPwm = extractInt(message, "\"fan_speed_pwm\"");
    if (bedPwm >= 0) {
      setBedroomFanSpeed(bedPwm);
    }

    // Hall Fan PWM (Transistor/MOSFET control, no relay)
    int hallPwm = extractInt(message, "\"hall_fan_pwm\"");
    if (hallPwm >= 0) {
      setHallFanSpeed(hallPwm);
    }

    // Curtain Servo Angle
    int servoAngle = extractInt(message, "\"curtain_servo_angle\"");
    if (servoAngle >= 0) {
      curtainAngle = constrain(servoAngle, 0, 90);
      curtainServo.write(curtainAngle);
      Serial.printf("[Actuator] Curtain Servo -> %d deg\n", curtainAngle);
    }

    // Rescue Buzzer
    if (hasTrue(message, "\"buzzer_active\"") || hasTrue(message, "\"buzzer_state\"")) {
      setBuzzerState(true);
    } else if (hasFalse(message, "\"buzzer_active\"") || hasFalse(message, "\"buzzer_state\"")) {
      setBuzzerState(false);
      emergencyTriggered = false;
    }
    publishActuatorStatus();
  } else if (String(topic) == TOPIC_EMERGENCY) {
    Serial.println("[EMERGENCY] Priority Alert Received!");
    setRelay(PIN_BEDROOM_LIGHT, true);
    setRelay(PIN_HALL_LIGHT, true);
    setBuzzerState(true);
    bedLightState = true;
    hallLightState = true;
    emergencyTriggered = true;
    publishActuatorStatus();
  }
}

void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;

  if (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting to Broker at ");
    Serial.print(MQTT_BROKER);
    Serial.print("...");

    String clientId = "AURA-ESP32-Node1-" + String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println(" Connected!");
      mqttClient.subscribe(TOPIC_CONTROL);
      mqttClient.subscribe(TOPIC_EMERGENCY);
      publishActuatorStatus();
    } else {
      Serial.printf(" Failed (rc=%d), will retry shortly.\n", mqttClient.state());
    }
  }
}

float measureUltrasonicDistance() {
  digitalWrite(PIN_HALL_US_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_HALL_US_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_HALL_US_TRIG, LOW);

  long duration = pulseIn(PIN_HALL_US_ECHO, HIGH, 25000);
  if (duration == 0) return 400.0;
  return (duration * 0.0343) / 2.0;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("==========================================================");
  Serial.println("PROJECT AURA - ESP32 NODE 1 (Zone 1 Controller)");
  Serial.println("Bedroom & Hallway • Fan Transistor Driver • Dual Pins");
  Serial.println("==========================================================");

  // Pin Modes
  pinMode(PIN_BEDROOM_PIR, INPUT);
  pinMode(PIN_BEDROOM_LDR, INPUT);
  pinMode(PIN_BEDROOM_LIGHT, OUTPUT);
  setRelay(PIN_BEDROOM_LIGHT, false);

  pinMode(PIN_HALL_PIR, INPUT);
  pinMode(PIN_HALL_US_TRIG, OUTPUT);
  pinMode(PIN_HALL_US_ECHO, INPUT);
  pinMode(PIN_HALL_LIGHT, OUTPUT);
  setRelay(PIN_HALL_LIGHT, false);

  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_BUZZER_ALT, OUTPUT);
  setBuzzerState(false);

  // Emergency Button on GPIO 4 with internal pull-up
  pinMode(PIN_EMERGENCY_BUTTON, INPUT_PULLUP);

  // Fan Outputs (No relay, transistor/MOSFET driver)
  pinMode(PIN_BEDROOM_FAN_PWM, OUTPUT);
  pinMode(PIN_BEDROOM_FAN_PWM_ALT, OUTPUT);
  pinMode(PIN_HALL_FAN_PWM, OUTPUT);
  pinMode(PIN_HALL_FAN_PWM_ALT, OUTPUT);
  setBedroomFanSpeed(0);
  setHallFanSpeed(0);

  // Servo Attachment
  curtainServo.attach(PIN_CURTAIN_SERVO);
  curtainServo.write(curtainAngle);

  setupWiFi();

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
  mqttClient.setBufferSize(512);

  reconnectMQTT();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      static unsigned long lastReconnectAttempt = 0;
      if (millis() - lastReconnectAttempt > 3000) {
        lastReconnectAttempt = millis();
        reconnectMQTT();
      }
    } else {
      mqttClient.loop();
    }
  }

  // Emergency Push Button Detection (GPIO 4, Active-LOW)
  bool buttonReading = digitalRead(PIN_EMERGENCY_BUTTON);
  if (buttonReading == LOW && lastButtonReading == HIGH) {
    unsigned long now = millis();
    if (now - lastButtonDebounceTime > BUTTON_DEBOUNCE_DELAY_MS) {
      lastButtonDebounceTime = now;
      emergencyTriggered = true;
      setBuzzerState(true);
      setRelay(PIN_BEDROOM_LIGHT, true);
      setRelay(PIN_HALL_LIGHT, true);
      bedLightState = true;
      hallLightState = true;

      Serial.println("[EMERGENCY BUTTON] Physical button pressed on GPIO 4!");

      if (mqttClient.connected()) {
        String emergencyPayload = "{\"node_id\":\"esp32_node1\",\"event\":\"EMERGENCY_BUTTON_PRESSED\",\"status\":\"ACTIVE\",\"source\":\"hardware_button\"}";
        mqttClient.publish(TOPIC_EMERGENCY, emergencyPayload.c_str());
        publishActuatorStatus();
      }
    }
  }
  lastButtonReading = buttonReading;

  // Periodic Telemetry Transmission
  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;

    bool bedOccupancy = (digitalRead(PIN_BEDROOM_PIR) == HIGH);
    int bedLuxRaw = analogRead(PIN_BEDROOM_LDR);
    int bedLux = constrain(map(bedLuxRaw, 0, 4095, 0, 1000), 0, 1000);

    bool hallOccupancy = (digitalRead(PIN_HALL_PIR) == HIGH);
    float hallDistance = measureUltrasonicDistance();

    // Construct telemetry JSON payload
    String payload = "{";
    payload += "\"node_id\":\"esp32_node1\",";
    payload += "\"bedroom\":{";
    payload += "\"occupancy\":" + String(bedOccupancy ? "true" : "false") + ",";
    payload += "\"ambient_lux\":" + String(bedLux) + ",";
    payload += "\"curtain_state\":\"" + String(curtainAngle == 90 ? "OPEN" : "CLOSED") + "\"";
    payload += "},";
    payload += "\"hall\":{";
    payload += "\"occupancy\":" + String(hallOccupancy ? "true" : "false") + ",";
    payload += "\"obstacle_distance_cm\":" + String(hallDistance, 1);
    payload += "}";
    payload += "}";

    if (mqttClient.connected()) {
      mqttClient.publish(TOPIC_TELEMETRY, payload.c_str());
    }
  }
}