/*
 * ==============================================================================
 * PROJECT AURA — Autonomous User-Responsive Residential Assistant
 * Node 2: Kitchen & Bathroom IoT Controller (ESP8266 NodeMCU / D1 Mini)
 * ==============================================================================
 * SENSORS & ACTUATORS CONNECTED:
 * - Kitchen:  MQ-2 Combustible Gas & Smoke Sensor (Analog Pin A0, 0-1023 ADC)
 *             DHT11 / DHT22 Temp & Humidity Sensor (Pin D2 / GPIO 4)
 *             Kitchen Light Relay (Pin D1 / GPIO 5, Active LOW)
 *             Exhaust Fan (Pin D5 / GPIO 14, Hardware PWM 0-255 Speed & Relay)
 * - Bathroom: HC-SR501 PIR Motion Sensor (Pin D6 / GPIO 12)
 *             HC-SR04 Obstacle Ultrasonic: Trig (Pin D7 / GPIO 13) / Echo (Pin D8 / GPIO 15)
 *             Bathroom Light Relay / LED (Pin D0 / GPIO 16, Active LOW)
 *
 * NOTE: Strictly NO water leakage sensor and NO magnetic door sensor.
 * ==============================================================================
 */

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// ==============================================================================
// 1. CONFIGURATION (Update with your Wi-Fi and Laptop/Broker IP)
// ==============================================================================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASS     = "YOUR_WIFI_PASSWORD";

// MQTT Broker IP (IP address of your PC/laptop running the backend)
const char* MQTT_BROKER   = "192.168.1.100"; 
const int   MQTT_PORT     = 1883;

// MQTT Topics
const char* TOPIC_TELEMETRY = "aura/telemetry/node2";
const char* TOPIC_CONTROL   = "aura/control/node2";
const char* TOPIC_EMERGENCY = "aura/emergency";

// ==============================================================================
// 2. PIN DEFINITIONS — ESP8266 NODE 2 (NodeMCU / WeMos D1 Mini)
// ==============================================================================
#define PIN_KITCHEN_MQ2        A0   // Analog ADC0 for Gas/Smoke (0 - 1023)
#define PIN_KITCHEN_LIGHT      5    // D1 (GPIO 5) -> Relay Channel 3 (Active LOW)
#define PIN_DHT_DATA           4    // D2 (GPIO 4) -> DHT22 / DHT11 Data line
#define PIN_EXHAUST_FAN        14   // D5 (GPIO 14) -> PWM Output for Fan Speed (0 - 255)

#define PIN_BATHROOM_PIR       12   // D6 (GPIO 12) -> HC-SR501 Bathroom Motion
#define PIN_BATHROOM_US_TRIG   13   // D7 (GPIO 13) -> Ultrasonic Trig Pulse
#define PIN_BATHROOM_LIGHT     2    // D4 (GPIO 2) -> Primary Reliable Pin
#define PIN_BATHROOM_LIGHT_ALT 16   // D0 (GPIO 16) -> Legacy Pin Mirror
// DHT Sensor Setup (Supports DHT22 or DHT11)
#define DHTTYPE DHT11
DHT dht(PIN_DHT_DATA, DHTTYPE);

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Timing & State Variables
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 250; // 4 Hz refresh rate

bool kitchenLightState  = false;
bool bathroomLightState = false;
int  exhaustFanPwm      = 0;     // 0 - 255

// ==============================================================================
// 3. WIFI SETUP
// ==============================================================================
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
  Serial.println("[WiFi] Connected successfully!");
  Serial.print("[WiFi] ESP8266 Node 2 IP Address: ");
  Serial.println(WiFi.localIP());
}

// ==============================================================================
// 4. EXHAUST FAN SPEED MODULATION (0 - 100% mapped to 0 - 255 PWM)
// ==============================================================================
void setExhaustFanSpeed(int percent) {
  percent = constrain(percent, 0, 100);
  exhaustFanPwm = map(percent, 0, 100, 0, 255);
  analogWrite(PIN_EXHAUST_FAN, exhaustFanPwm);
  Serial.printf("[Actuator] Exhaust Fan: %d%% | PWM: %d/255\n", percent, exhaustFanPwm);
}

// ==============================================================================
// 5. MQTT INBOUND DISPATCHER
// ==============================================================================
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.printf("[MQTT Inbound] %s: %s\n", topic, message.c_str());

  if (String(topic) == TOPIC_CONTROL) {
    // Kitchen Light Control
    if (message.indexOf("\"kitchen_light\":true") >= 0) {
      kitchenLightState = true;
      digitalWrite(PIN_KITCHEN_LIGHT, LOW);
      Serial.println("[Actuator] Kitchen Light -> ON");
    } else if (message.indexOf("\"kitchen_light\":false") >= 0) {
      kitchenLightState = false;
      digitalWrite(PIN_KITCHEN_LIGHT, HIGH);
      Serial.println("[Actuator] Kitchen Light -> OFF");
    }

    // Bathroom Light Control
    if (message.indexOf("\"bathroom_light\":true") >= 0) {
      bathroomLightState = true;
      digitalWrite(PIN_BATHROOM_LIGHT, LOW);
      Serial.println("[Actuator] Bathroom Light -> ON");
    } else if (message.indexOf("\"bathroom_light\":false") >= 0) {
      bathroomLightState = false;
      digitalWrite(PIN_BATHROOM_LIGHT, HIGH);
      Serial.println("[Actuator] Bathroom Light -> OFF");
    }

    // Proportional Exhaust Fan Control
    int speedIdx = message.indexOf("\"exhaust_fan_speed_pct\":");
    if (speedIdx >= 0) {
      int valStart = speedIdx + 24;
      int speedVal = message.substring(valStart).toInt();
      setExhaustFanSpeed(speedVal);
    } else if (message.indexOf("\"exhaust_fan\":true") >= 0) {
      setExhaustFanSpeed(100);
    } else if (message.indexOf("\"exhaust_fan\":false") >= 0) {
      setExhaustFanSpeed(0);
    }
  } else if (String(topic) == TOPIC_EMERGENCY) {
    Serial.println("[EMERGENCY] Hazard / Fall detected! Activating safety ventilation.");
    digitalWrite(PIN_KITCHEN_LIGHT, LOW);
    digitalWrite(PIN_BATHROOM_LIGHT, LOW);
    setExhaustFanSpeed(100);
  }
}

// ==============================================================================
// 6. MQTT RECONNECT HANDLER
// ==============================================================================
void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting to Broker...");
    String clientId = "AURA-ESP8266-Node2-" + String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println(" Connected!");
      mqttClient.subscribe(TOPIC_CONTROL);
      mqttClient.subscribe(TOPIC_EMERGENCY);
      Serial.println("[MQTT] Subscribed to Node 2 control and emergency topics.");
    } else {
      Serial.printf(" Failed (rc=%d), retrying in 2 seconds...\n", mqttClient.state());
      delay(2000);
    }
  }
}

// ==============================================================================
// 7. ULTRASONIC OBSTACLE DISTANCE MEASUREMENT
// ==============================================================================
float measureBathroomDistance() {
  digitalWrite(PIN_BATHROOM_US_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_BATHROOM_US_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_BATHROOM_US_TRIG, LOW);

  long duration = pulseIn(PIN_BATHROOM_US_ECHO, HIGH, 25000);
  if (duration == 0) {
    return 400.0;
  }
  return (duration * 0.0343) / 2.0;
}

// ==============================================================================
// 8. ARDUINO SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("==========================================================");
  Serial.println("  PROJECT AURA — ESP8266 NODE 2");
  Serial.println("  Kitchen & Bathroom IoT Controller");
  Serial.println("==========================================================");

  // Pin Modes
  pinMode(PIN_KITCHEN_MQ2, INPUT);

  pinMode(PIN_KITCHEN_LIGHT, OUTPUT);
  digitalWrite(PIN_KITCHEN_LIGHT, HIGH); // Default OFF (active LOW)

  pinMode(PIN_BATHROOM_PIR, INPUT);

  pinMode(PIN_BATHROOM_US_TRIG, OUTPUT);
  digitalWrite(PIN_BATHROOM_US_TRIG, LOW);

  pinMode(PIN_BATHROOM_US_ECHO, INPUT);

  pinMode(PIN_BATHROOM_LIGHT, OUTPUT);
  digitalWrite(PIN_BATHROOM_LIGHT, HIGH); // Default OFF (active LOW)

  // Configure ESP8266 Hardware PWM for Exhaust Fan
  pinMode(PIN_EXHAUST_FAN, OUTPUT);
  analogWriteRange(255);  // Standard 8-bit PWM (0 - 255)
  analogWriteFreq(1000);  // 1 kHz PWM frequency
  analogWrite(PIN_EXHAUST_FAN, 0);

  // Start DHT Sensor
  dht.begin();

  // Connect WiFi and MQTT
  setupWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
  reconnectMQTT();
}

// ==============================================================================
// 9. MAIN EXECUTION LOOP
// ==============================================================================
void loop() {
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;

    // 1. Read MQ-2 Gas/Smoke (ADC0 is 10-bit: 0 - 1023)
    int mq2Raw = analogRead(PIN_KITCHEN_MQ2);
    int gasPpm = map(mq2Raw, 0, 1023, 100, 2000);
    gasPpm = constrain(gasPpm, 100, 2000);

    // 2. Read DHT Temperature & Humidity
    float temp  = dht.readTemperature();
    float humid = dht.readHumidity();

    if (isnan(temp))  temp  = 24.5;
    if (isnan(humid)) humid = 52.0;

    // 3. Read Bathroom Occupancy & Obstacle Distance
    bool bathOccupancy = (digitalRead(PIN_BATHROOM_PIR) == HIGH);
    float bathDistance = measureBathroomDistance();

    // 4. Construct JSON Telemetry Payload
    String payload = "{";
    payload += "\"node_id\":\"esp8266_node2\",";
    payload += "\"kitchen\":{";
    payload += "\"gas_ppm\":" + String(gasPpm) + ",";
    payload += "\"temperature_c\":" + String(temp, 1) + ",";
    payload += "\"humidity_pct\":" + String(humid, 1);
    payload += "},";
    payload += "\"bathroom\":{";
    payload += "\"occupancy\":" + String(bathOccupancy ? "true" : "false") + ",";
    payload += "\"obstacle_distance_cm\":" + String(bathDistance, 1);
    payload += "}";
    payload += "}";

    // 5. Publish to MQTT Broker
    mqttClient.publish(TOPIC_TELEMETRY, payload.c_str());
    Serial.println("[Telemetry] " + payload);
  }
}
