#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// ================================================================
// PROJECT AURA - ESP8266 NODE 2 (Zone 2 Controller)
// Kitchen & Bathroom Controller
// Bathroom Light migrated to GPIO 2 (D4) with multi-pin mirroring
// ================================================================

const char* WIFI_SSID = "Nothing Phone (3a)_Isan";
const char* WIFI_PASS = "chog1869";

const char* MQTT_BROKER = "172.16.133.140";
const int MQTT_PORT = 1883;

const char* TOPIC_TELEMETRY = "aura/telemetry/node2";
const char* TOPIC_CONTROL   = "aura/control/node2";
const char* TOPIC_STATUS    = "aura/status/node2";
const char* TOPIC_EMERGENCY = "aura/emergency";

// Hardware Pinout Definitions (ESP8266 NodeMCU)
#define PIN_KITCHEN_MQ2     A0   // ADC0
#define PIN_KITCHEN_LIGHT   5    // D1 (GPIO 5)
#define PIN_DHT_DATA        4    // D2 (GPIO 4)
#define PIN_EXHAUST_FAN     14   // D5 (GPIO 14, PWM)

#define PIN_BATHROOM_PIR    12   // D6 (GPIO 12)
#define PIN_BATHROOM_US_TRIG 13  // D7 (GPIO 13)
#define PIN_BATHROOM_US_ECHO 15  // D8 (GPIO 15)

// Bathroom Light Pins:
// Migrated from weak/RTC GPIO 16 (D0) to GPIO 2 (D4).
// Also mirrored on GPIO 16 (D0) and GPIO 0 (D3) to guarantee switching
#define PIN_BATHROOM_LIGHT      2   // D4 (GPIO 2) — PRIMARY RELIABLE PIN
#define PIN_BATHROOM_LIGHT_ALT1 16  // D0 (GPIO 16) — LEGACY BACKWARD COMPATIBLE
#define PIN_BATHROOM_LIGHT_ALT2 0   // D3 (GPIO 0) — SECONDARY ALTERNATIVE

#define DHTTYPE DHT11
DHT dht(PIN_DHT_DATA, DHTTYPE);

WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 1000;

bool kitchenLightState = false;
bool bathroomLightState = false;
int exhaustFanPwm = 0;
String lastCommandId = "";

void setupWiFi() {
  Serial.println();
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("[WiFi] Connected");
  Serial.print("[WiFi] IP: ");
  Serial.println(WiFi.localIP());
}

void setExhaustFanSpeed(int percent) {
  percent = constrain(percent, 0, 100);
  exhaustFanPwm = map(percent, 0, 100, 0, 255);

  analogWrite(PIN_EXHAUST_FAN, exhaustFanPwm);

  Serial.print("[Fan] Speed: ");
  Serial.print(percent);
  Serial.print("% PWM: ");
  Serial.println(exhaustFanPwm);
}

// RELAY / LED POLARITY:
// Inverted active-LOW relay / LED boards (LOW = ON, HIGH = OFF)
// Fixes reversed light behavior where OFF turned LED on and ON turned LED off.
const bool RELAY_ACTIVE_LOW = true;

inline void setRelay(int pin, bool state) {
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(pin, state ? LOW : HIGH);
  } else {
    digitalWrite(pin, state ? HIGH : LOW);
  }
}

inline void setBathroomLight(bool state) {
  bathroomLightState = state;
  setRelay(PIN_BATHROOM_LIGHT, state);
  setRelay(PIN_BATHROOM_LIGHT_ALT1, state);
  setRelay(PIN_BATHROOM_LIGHT_ALT2, state);
  Serial.printf("[Actuator] Bathroom Light -> %s (GPIO 2, 16, 0)\n", state ? "ON" : "OFF");
}

// Robust JSON value extractors
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
  return (sub.indexOf("true") >= 0 || sub.indexOf("1") >= 0);
}

bool hasFalse(const String& msg, const String& key) {
  int idx = msg.indexOf(key);
  if (idx < 0) return false;
  int end = msg.indexOf(',', idx);
  if (end < 0) end = msg.indexOf('}', idx);
  if (end < 0) end = msg.length();
  String sub = msg.substring(idx, end);
  return (sub.indexOf("false") >= 0 || sub.indexOf("0") >= 0);
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

void publishActuatorStatus() {
  if (!mqttClient.connected()) return;
  int exhaustPct = map(exhaustFanPwm, 0, 255, 0, 100);
  String payload = "{";
  payload += "\"node_id\":\"esp8266_node2\",";
  if (lastCommandId.length() > 0) {
    payload += "\"command_id\":\"" + lastCommandId + "\",";
    payload += "\"status\":\"EXECUTED\",";
  }
  payload += "\"actuators\":{";
  payload += "\"kitchen_light\":" + String(kitchenLightState ? "true" : "false") + ",";
  payload += "\"bathroom_light\":" + String(bathroomLightState ? "true" : "false") + ",";
  payload += "\"exhaust_fan_speed_pct\":" + String(exhaustPct);
  payload += "}";
  payload += "}";
  mqttClient.publish(TOPIC_STATUS, payload.c_str());
  Serial.print("[Status Acknowledged] ");
  Serial.println(payload);
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("[MQTT] ");
  Serial.print(topic);
  Serial.print(" : ");
  Serial.println(message);

  if (String(topic) == TOPIC_CONTROL) {
    String cmdId = extractString(message, "\"command_id\"");
    if (cmdId.length() > 0) {
      lastCommandId = cmdId;
    }

    // Kitchen Light
    if (hasTrue(message, "\"kitchen_light\"")) {
      kitchenLightState = true;
      setRelay(PIN_KITCHEN_LIGHT, true);
      Serial.println("[Actuator] Kitchen Light -> ON");
    }
    else if (hasFalse(message, "\"kitchen_light\"")) {
      kitchenLightState = false;
      setRelay(PIN_KITCHEN_LIGHT, false);
      Serial.println("[Actuator] Kitchen Light -> OFF");
    }

    // Bathroom Light (Updated pin routing)
    if (hasTrue(message, "\"bathroom_light\"")) {
      setBathroomLight(true);
    }
    else if (hasFalse(message, "\"bathroom_light\"")) {
      setBathroomLight(false);
    }

    // Exhaust Fan
    int fanSpeed = extractInt(message, "\"exhaust_fan_speed_pct\"");
    if (fanSpeed >= 0) {
      setExhaustFanSpeed(fanSpeed);
    }
    else if (hasTrue(message, "\"exhaust_fan\"")) {
      setExhaustFanSpeed(100);
    }
    else if (hasFalse(message, "\"exhaust_fan\"")) {
      setExhaustFanSpeed(0);
    }
    publishActuatorStatus();
  }

  if (String(topic) == TOPIC_EMERGENCY) {
    Serial.println("[EMERGENCY] Safety mode activated");
    setRelay(PIN_KITCHEN_LIGHT, true);
    setBathroomLight(true);
    kitchenLightState = true;
    setExhaustFanSpeed(100);
    publishActuatorStatus();
  }
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting...");
    String clientId = "AURA-ESP8266-Node2-" + String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println(" Connected");
      mqttClient.subscribe(TOPIC_CONTROL);
      mqttClient.subscribe(TOPIC_EMERGENCY);
      publishActuatorStatus();
      Serial.println("[MQTT] Subscribed");
    }
    else {
      Serial.print(" Failed rc=");
      Serial.println(mqttClient.state());
      delay(2000);
    }
  }
}

float measureBathroomDistance() {
  digitalWrite(PIN_BATHROOM_US_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_BATHROOM_US_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_BATHROOM_US_TRIG, LOW);

  long duration = pulseIn(PIN_BATHROOM_US_ECHO, HIGH, 25000);
  if (duration == 0) return 400.0;
  return (duration * 0.0343) / 2.0;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("==========================================================");
  Serial.println("PROJECT AURA - ESP8266 NODE 2 (Zone 2 Controller)");
  Serial.println("Kitchen & Bathroom • Bathroom Light on D4/GPIO 2");
  Serial.println("==========================================================");

  pinMode(PIN_KITCHEN_LIGHT, OUTPUT);
  setRelay(PIN_KITCHEN_LIGHT, false);

  pinMode(PIN_EXHAUST_FAN, OUTPUT);
  analogWriteRange(255);
  analogWriteFreq(1000);
  analogWrite(PIN_EXHAUST_FAN, 0);

  pinMode(PIN_BATHROOM_PIR, INPUT);

  pinMode(PIN_BATHROOM_US_TRIG, OUTPUT);
  digitalWrite(PIN_BATHROOM_US_TRIG, LOW);
  pinMode(PIN_BATHROOM_US_ECHO, INPUT);

  // Bathroom Light Pins setup
  pinMode(PIN_BATHROOM_LIGHT, OUTPUT);
  pinMode(PIN_BATHROOM_LIGHT_ALT1, OUTPUT);
  pinMode(PIN_BATHROOM_LIGHT_ALT2, OUTPUT);
  setBathroomLight(false);

  dht.begin();
  setupWiFi();

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
  mqttClient.setBufferSize(512);

  reconnectMQTT();
}

void loop() {
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;

    int rawGas = analogRead(PIN_KITCHEN_MQ2);
    int mappedGas = constrain(map(rawGas, 0, 1023, 100, 2000), 100, 2000);

    float temp = dht.readTemperature();
    float hum = dht.readHumidity();

    if (isnan(temp)) temp = 24.5;
    if (isnan(hum)) hum = 55.0;

    bool bathOcc = (digitalRead(PIN_BATHROOM_PIR) == HIGH);
    float bathDist = measureBathroomDistance();

    String payload = "{";
    payload += "\"node_id\":\"esp8266_node2\",";
    payload += "\"kitchen\":{";
    payload += "\"gas_ppm\":" + String(mappedGas) + ",";
    payload += "\"temperature_c\":" + String(temp, 1) + ",";
    payload += "\"humidity_pct\":" + String(hum, 1);
    payload += "},";
    payload += "\"bathroom\":{";
    payload += "\"occupancy\":" + String(bathOcc ? "true" : "false") + ",";
    payload += "\"obstacle_distance_cm\":" + String(bathDist, 1);
    payload += "}";
    payload += "}";

    mqttClient.publish(TOPIC_TELEMETRY, payload.c_str());
  }
}