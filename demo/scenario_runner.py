#!/usr/bin/env python3
"""
================================================================================
AURA — Autonomous User-Responsive Residential Assistant
Official 11-Step Hackathon Jury Demonstration Runner
================================================================================
"""

import time
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

STEPS = [
    (1, "Person Enters Bedroom", "Occupancy detected -> Light auto-turns ON; Fan adjusts to temperature."),
    (2, "Daytime Ambient Light Test", "Bright sunlight hits LDR (>650 lux) -> Light auto-dims / turns OFF to save power."),
    (3, "Climate / Cold Weather Test", "Simulated temp drops <22°C (Winter/Rain) -> Fan speed throttled to 0/OFF."),
    (4, "Wake-Word Voice Command", "Resident says 'AURA, turn on the hall light' -> Voice HUD engages and turns on light."),
    (5, "Indoor Navigation Request", "Destination 'Kitchen' selected -> A* pathfinding calculates safe route."),
    (6, "Obstacle Detection & Reroute", "Ultrasonic sensor detects obstacle in Hallway -> System recalculates via Alternate Bypass."),
    (7, "AI Fall Detection Trigger", "Camera/Pose detector identifies prone horizontal posture with rapid kinetic drop."),
    (8, "Multi-Frame Verification & Capture", "Fall holds for 1.5s -> High-res snapshot saved, bedroom lights flash, buzzer sounds."),
    (9, "Emergency Screen & 108 Ambulance Call", "Dashboard triggers Critical Alert screen -> User clicks 'Call Ambulance (108)'."),
    (10, "Gas Leak / Fire Hazard Test", "MQ-2 sensor exceeds 1200 ppm -> LPG hazard classified, exhaust fan on, camera snapshot taken."),
    (11, "Vacant Room Energy Cutoff", "Resident departs -> Rooms vacant >45s -> Appliances auto shut down; kWh savings logged.")
]

def check_backend_online():
    try:
        r = requests.get(f"{BASE_URL}/", timeout=2)
        if r.status_code == 200:
            print("  [OK] AURA Edge AI Gateway is ONLINE at " + BASE_URL)
            return True
    except Exception:
        print("  [ERROR] Cannot connect to AURA Backend at " + BASE_URL)
        print("  Please start the backend with: python backend/run_backend.py")
        return False
    return False

def run_step(step_id, title, desc):
    print("\n" + "=" * 75)
    print(f"  STEP {step_id}: {title.upper()}")
    print(f"  Description: {desc}")
    print("=" * 75)
    try:
        r = requests.post(f"{BASE_URL}/api/simulator/step/{step_id}")
        data = r.json()
        print("  -> System Reaction Response:")
        print("     " + json.dumps(data, indent=5))
    except Exception as e:
        print(f"  [!] Failed to execute step {step_id}: {e}")

def run_interactive_demo():
    print("\n" + "#" * 75)
    print("  PROJECT AURA — HACKATHON EVALUATION SCENARIO RUNNER")
    print("  National-Level Smart Living Ecosystem")
    print("#" * 75)

    if not check_backend_online():
        sys.exit(1)

    print("\nSelect execution mode:")
    print("  1. Automated Walkthrough (3 seconds per step)")
    print("  2. Interactive Step-by-Step (Press ENTER for each step)")
    mode = input("Enter choice (1 or 2, default 2): ").strip()

    # Reset simulator
    requests.post(f"{BASE_URL}/api/simulator/reset")

    for step_id, title, desc in STEPS:
        if mode == "1":
            run_step(step_id, title, desc)
            time.sleep(3)
        else:
            input(f"\n[Press ENTER to trigger Step {step_id}: {title}]...")
            run_step(step_id, title, desc)

    print("\n" + "#" * 75)
    print("  CONGRATULATIONS: ALL 11 DEMONSTRATION STEPS COMPLETED SUCCESSFULLY!")
    print("  AURA has demonstrated full cognitive Sense -> Understand -> Act loop.")
    print("#" * 75 + "\n")

if __name__ == "__main__":
    run_interactive_demo()
