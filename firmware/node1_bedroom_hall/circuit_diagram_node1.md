# ESP32 Node 1: Bedroom & Hallway Circuit & Wiring Guide

This ESP32 microcontroller acts as **Zone A Controller** for the Bedroom and Hallway.

> [!IMPORTANT]
> **Strict Exclusions Enforced:**
> Zero water leakage sensors and zero magnetic door sensors are connected or supported.

---

## 1. Pin Connection Table

| Peripheral | Component | ESP32 GPIO | Operating Voltage | Interface Type | Description |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Bedroom PIR** | HC-SR501 | `GPIO 13` | 5V VCC, 3.3V OUT | Digital Input | High on human motion detection |
| **Bedroom LDR** | GL5528 Module | `GPIO 34` | 3.3V | Analog Input (ADC1_CH6) | Ambient daylight lux sensing |
| **Bedroom Light** | Relay Channel 1 | `GPIO 25` | 5V VCC, Logic IN | Digital Output | Active LOW switching for light LED |
| **Bedroom Fan** | 2N2222 / MOSFET | `GPIO 18` | 5V Motor, Logic PWM | PWM Output | Speed regulation (0–255 duty cycle) |
| **Curtain Servo** | SG90 Micro Servo | `GPIO 19` | 5V VCC, PWM Signal | PWM Output (50Hz) | 0° closed, 90° open |
| **Hall PIR** | HC-SR501 | `GPIO 14` | 5V VCC, 3.3V OUT | Digital Input | Hallway presence detection |
| **Hall Ultrasonic** | HC-SR04 Trigger | `GPIO 26` | 5V | Digital Output | 10 µs pulse to trigger ping |
| **Hall Ultrasonic** | HC-SR04 Echo | `GPIO 27` | 3.3V (via divider) | Digital Input | Obstacle sensing for indoor nav |
| **Hall Light** | Relay Channel 2 | `GPIO 32` | 5V VCC, Logic IN | Digital Output | Active LOW switching for hall light |
| **Hall Fan** | 2N2222 / MOSFET | `GPIO 21` | 5V Motor, Logic PWM | PWM Output | Variable ventilation speed |
| **Alarm Buzzer** | 5V Active Piezo | `GPIO 22` | 5V | Digital Output | High triggers local rescue tone |

---

## 2. Power Distribution & Level Shifting
* **5V Rail:** Powers HC-SR501 sensors, HC-SR04 ultrasonic modules, SG90 servo motor, relay coil, and DC mini fans.
* **3.3V Rail:** ESP32 power and LDR analog reference.
* **Echo Voltage Divider:** HC-SR04 Echo output is 5V. Use a $1\text{k}\Omega / 2\text{k}\Omega$ voltage divider to step down to $3.3\text{V}$ before connecting to `GPIO 27`.
