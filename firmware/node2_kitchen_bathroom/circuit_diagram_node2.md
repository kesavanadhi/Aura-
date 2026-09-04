# ESP8266 Node 2: Kitchen & Bathroom Circuit & Wiring Guide

This ESP8266 microcontroller (NodeMCU v2/v3 or WeMos D1 Mini) acts as **Zone 2 Controller** for the Kitchen and Bathroom.

> [!IMPORTANT]
> **Strict Exclusions Enforced:**
> Zero water leakage sensors and zero magnetic door sensors are connected or supported.

---

## 1. ESP8266 NodeMCU Pin Connection Table

| Peripheral | Component | NodeMCU Pin | ESP8266 GPIO | Operating Voltage | Interface Type | Description |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Kitchen MQ-2** | Gas/Smoke Sensor | `A0` | `ADC0` | 5V VCC, AOUT to A0 | Analog Input (0–1023) | Measures combustible gas (LPG) & smoke |
| **Kitchen DHT** | DHT11 / DHT22 | `D2` | `GPIO 4` | 3.3V / 5V | Digital Single-Bus | Ambient kitchen temperature & humidity |
| **Kitchen Light** | Relay Channel 3 | `D1` | `GPIO 5` | 5V VCC, Logic IN | Digital Output (Active LOW) | Task lighting switch |
| **Exhaust Fan** | MOSFET / Relay | `D5` | `GPIO 14` | 5V VCC, Gate/IN | PWM Output (0–255, 1 kHz) | Proportional speed evacuation ventilation |
| **Bathroom PIR** | HC-SR501 | `D6` | `GPIO 12` | 5V VCC, 3.3V OUT | Digital Input | Bathroom human motion detection |
| **Bathroom US** | HC-SR04 Trigger | `D7` | `GPIO 13` | 5V | Digital Output | Obstacle detection trigger pulse |
| **Bathroom US** | HC-SR04 Echo | `D8` | `GPIO 15` | 3.3V (via 1k/2k divider)| Digital Input | Obstacle echo timing pulse |
| **Bathroom Light** | Relay / LED Driver| `D4` (alt `D0`, `D3`) | `GPIO 2` (alt `16`, `0`) | 5V / 3.3V | Digital Output (Active LOW) | Bathroom task lighting switch |

---

## 2. Voltage Level Shifting & Safety Details

1. **HC-SR04 Echo Pin Voltage Divider:**
   - HC-SR04 Echo outputs 5V TTL logic. ESP8266 inputs are rated for 3.3V.
   - Use a simple two-resistor voltage divider:
     - Echo $\rightarrow$ $1\text{ k}\Omega$ resistor $\rightarrow$ `D8 (GPIO 15)` $\rightarrow$ $2\text{ k}\Omega$ resistor $\rightarrow$ GND.
2. **MQ-2 Analog Pin (A0):**
   - NodeMCU boards feature an onboard voltage divider scaling external 0–3.3V down to the 0–1.0V internal ADC range. Connect the MQ-2 analog output pin (AO) directly to `A0`.
3. **Exhaust Fan PWM:**
   - Uses ESP8266's native `analogWrite(PIN_EXHAUST_FAN, pwmValue)` with `analogWriteRange(255)`.
4. **Relay Logic:**
   - Optocoupled 5V relay modules trigger on active LOW logic (`digitalWrite(pin, LOW)` turns light ON, `HIGH` turns light OFF).
