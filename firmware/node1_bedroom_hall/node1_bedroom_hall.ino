/*
 * ==============================================================================
 * PROJECT AURA — Autonomous User-Responsive Residential Assistant
 * ESP32 Node 1: Bedroom & Hallway Controller
 * ==============================================================================
 * SENSORS & ACTUATORS CONNECTED:
 * - Bedroom: PIR Motion Sensor (GPIO 13)
 *            LDR Lux Sensor (GPIO 34 Analog ADC1_CH6)
 *            Bed Light Relay (GPIO 25, Active LOW)
 *            Bed Ceiling Fan PWM (GPIO 18)
 *            Window Curtain Servo (GPIO 19, 0° Closed to 90° Open)
 * - Hall:    PIR Motion Sensor (GPIO 14)
 *            HC-SR04 Obstacle Ultrasonic: Trig (GPIO 26) / Echo (GPIO 27)
 *            Hall Light Relay (GPIO 32, Active LOW)
 *            Hall Ceiling Fan PWM (GPIO 21)
 *            Rescue Piezo Buzzer (GPIO 22, Alarm Sounder)
 *
 * NOTE: Strictly NO water leakage sensor and NO magnetic door sensor.
 * ==============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// ==============================================================================
// 1. CONFIGURATION (Update with your Wi-Fi and Laptop/Broker IP)
// ==============================================================================
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// MQTT Broker IP (IP address of your PC/laptop running the backend)
const char* MQTT_BROKER = "192.168.1.100"; 
const int   MQTT_PORT   = 1883;

// MQTT Topics
const char* TOPIC_TELEMETRY = "aura/telemetry/node1";
const char* TOPIC_CONTROL   = "aura/control/node1";
const char* TOPIC_EMERGENCY = "aura/emergency";

// ==============================================================================
// 2. PIN DEFINITIONS — ESP32 NODE 1
// ==============================================================================
#define PIN_BEDROOM_PIR        13
#define PIN_BEDROOM_LDR        34  // Analog ADC1_CH6
#define PIN_BEDROOM_LIGHT      25  // Active LOW Relay
#define PIN_BEDROOM_FAN_PWM    18
#define PIN_CURTAIN_SERVO      19

#define PIN_HALL_PIR           14
#define PIN_HALL_US_TRIG       26
#define PIN_HALL_US_ECHO       27
#define PIN_HALL_LIGHT         32  // Active LOW Relay
#define PIN_HALL_FAN_PWM       21
#define PIN_BUZZER             22  // Rescue Alert Buzzer

// PWM Channels for Fans
#define PWM_CH_BED_FAN         0
#define PWM_CH_HALL_FAN        1
#define PWM_FREQ               5000
#define PWM_RES                8   // 0 to 255

WiFiClient espClient;
PubSubClient mqttClient(espClient);
Servo curtainServo;

unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 250; // 4 Hz real-time telemetry stream

// Current Actuator State Cache
bool bedLightState = false;
bool hallLightState = false;
bool buzzerActive = false;
int  curtainAngle = 90;

// ==============================================================================
// 3. WIFI INITIALIZATION
// ==============================================================================
void setupWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Connected successfully!");
  Serial.print("[WiFi] ESP32 Node 1 IP Address: ");
  Serial.println(WiFi.localIP());
}

// ==============================================================================
// 4. MQTT MESSAGE RECEIVER & ACTUATOR CONTROL
// ==============================================================================
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.printf("[MQTT Inbound] %s: %s\n", topic, message.c_str());

  // Handle Remote Control Overrides
  if (String(topic) == TOPIC_CONTROL) {
    // Bedroom Light
    if (message.indexOf("\"bedroom_light\":true") >= 0) {
      bedLightState = true;
      digitalWrite(PIN_BEDROOM_LIGHT, LOW); // Active LOW relay
      Serial.println("[Actuator] Bed Light -> ON");
    } else if (message.indexOf("\"bedroom_light\":false") >= 0) {
      bedLightState = false;
      digitalWrite(PIN_BEDROOM_LIGHT, HIGH);
      Serial.println("[Actuator] Bed Light -> OFF");
    }

    // Hall Light
    if (message.indexOf("\"hall_light\":true") >= 0) {
      hallLightState = true;
      digitalWrite(PIN_HALL_LIGHT, LOW);
      Serial.println("[Actuator] Hall Light -> ON");
    } else if (message.indexOf("\"hall_light\":false") >= 0) {
      hallLightState = false;
      digitalWrite(PIN_HALL_LIGHT, HIGH);
      Serial.println("[Actuator] Hall Light -> OFF");
    }

    // Bedroom Fan PWM
    int bedFanIdx = message.indexOf("\"bedroom_fan_pwm\":");
    if (bedFanIdx >= 0) {
      int pwm = message.substring(bedFanIdx + 18).toInt();
      pwm = constrain(pwm, 0, 255);
      ledcWrite(PWM_CH_BED_FAN, pwm);
      Serial.printf("[Actuator] Bed Fan PWM -> %d\n", pwm);
    }

    // Hall Fan PWM
    int hallFanIdx = message.indexOf("\"hall_fan_pwm\":");
    if (hallFanIdx >= 0) {
      int pwm = message.substring(hallFanIdx + 15).toInt();
      pwm = constrain(pwm, 0, 255);
      ledcWrite(PWM_CH_HALL_FAN, pwm);
      Serial.printf("[Actuator] Hall Fan PWM -> %d\n", pwm);
    }

    // Curtain Servo Angle (0° = Closed, 90° = Open)
    int servoIdx = message.indexOf("\"curtain_servo_angle\":");
    if (servoIdx >= 0) {
      int angle = message.substring(servoIdx + 22).toInt();
      angle = constrain(angle, 0, 90);
      curtainAngle = angle;
      curtainServo.write(curtainAngle);
      Serial.printf("[Actuator] Curtain Servo -> %d deg\n", curtainAngle);
    }

    // Rescue Buzzer Alarm
    if (message.indexOf("\"buzzer_active\":true") >= 0) {
      buzzerActive = true;
      digitalWrite(PIN_BUZZER, HIGH);
      Serial.println("[Actuator] Rescue Buzzer -> ALARM ON (RED)");
    } else if (message.indexOf("\"buzzer_active\":false") >= 0) {
      buzzerActive = false;
      digitalWrite(PIN_BUZZER, LOW);
      Serial.println("[Actuator] Rescue Buzzer -> SILENT (YELLOW STANDBY)");
    }

  } else if (String(topic) == TOPIC_EMERGENCY) {
    // High-Priority Emergency Action: Turn on all corridor/bedroom lights and activate Rescue Buzzer
    Serial.println("[EMERGENCY] Priority Alert Broadcast Received! Activating Lights & Alarm.");
    digitalWrite(PIN_BEDROOM_LIGHT, LOW);
    digitalWrite(PIN_HALL_LIGHT, LOW);
    digitalWrite(PIN_BUZZER, HIGH);
    buzzerActive = true;
  }
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting to Broker...");
    String clientId = "AURA-ESP32-Node1-" + String(random(0xffff), HEX);
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println(" Connected!");
      mqttClient.subscribe(TOPIC_CONTROL);
      mqttClient.subscribe(TOPIC_EMERGENCY);
    } else {
      Serial.printf(" Failed (rc=%d), retrying in 2s...\n", mqttClient.state());
      delay(2000);
    }
  }
}

// ==============================================================================
// 5. ULTRASONIC OBSTACLE SENSOR READING
// ==============================================================================
float measureUltrasonicDistance() {
  digitalWrite(PIN_HALL_US_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_HALL_US_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_HALL_US_TRIG, LOW);
  
  long duration = pulseIn(PIN_HALL_US_ECHO, HIGH, 25000); // 25ms timeout (~4m max)
  if (duration == 0) return 400.0;
  return (duration * 0.0343) / 2.0; // Distance in cm
}

// ==============================================================================
// 6. SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n==========================================================");
  Serial.println("  PROJECT AURA — ESP32 NODE 1: Bedroom & Hallway Node");
  Serial.println("==========================================================");

  // Pin Modes
  pinMode(PIN_BEDROOM_PIR, INPUT);
  pinMode(PIN_BEDROOM_LDR, INPUT);
  pinMode(PIN_BEDROOM_LIGHT, OUTPUT);
  digitalWrite(PIN_BEDROOM_LIGHT, HIGH); // Default OFF (Active LOW relay)

  pinMode(PIN_HALL_PIR, INPUT);
  pinMode(PIN_HALL_US_TRIG, OUTPUT);
  pinMode(PIN_HALL_US_ECHO, INPUT);
  pinMode(PIN_HALL_LIGHT, OUTPUT);
  digitalWrite(PIN_HALL_LIGHT, HIGH);   // Default OFF

  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);         // Default Silent Standby

  // PWM Configuration for Bedroom and Hall Fans
  ledcSetup(PWM_CH_BED_FAN, PWM_FREQ, PWM_RES);
  ledcAttachPin(PIN_BEDROOM_FAN_PWM, PWM_CH_BED_FAN);
  ledcWrite(PWM_CH_BED_FAN, 0);

  ledcSetup(PWM_CH_HALL_FAN, PWM_FREQ, PWM_RES);
  ledcAttachPin(PIN_HALL_FAN_PWM, PWM_CH_HALL_FAN);
  ledcWrite(PWM_CH_HALL_FAN, 0);

  // Servo Setup for Curtains
  curtainServo.attach(PIN_CURTAIN_SERVO);
  curtainServo.write(curtainAngle); // Default 90° Open

  // Network Setup
  setupWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
  reconnectMQTT();
}

// ==============================================================================
// 7. MAIN LOOP & TELEMETRY STREAM (4 Hz)
// ==============================================================================
void loop() {
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;

    // 1. Read Bedroom Sensors
    bool bedOccupancy = digitalRead(PIN_BEDROOM_PIR) == HIGH;
    int  bedLuxRaw    = analogRead(PIN_BEDROOM_LDR);
    int  bedLux       = map(bedLuxRaw, 0, 4095, 0, 1000); // Lux conversion approximation
    bedLux = constrain(bedLux, 0, 1000);

    // 2. Read Hallway Sensors
    bool hallOccupancy = digitalRead(PIN_HALL_PIR) == HIGH;
    float hallDistance = measureUltrasonicDistance();

    // 3. Construct JSON Telemetry Payload
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

    // 4. Publish to Central Dashboard & Gateway
    mqttClient.publish(TOPIC_TELEMETRY, payload.c_str());
  }
}
