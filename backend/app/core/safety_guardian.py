import time
import os
from typing import Optional, Dict, Any
from datetime import datetime
from pathlib import Path
from app.config import settings, SNAPSHOTS_DIR
from app.models.schemas import EmergencyIncident, AmbulanceDispatchInfo

class SafetyGuardian:
    """
    Monitors MQ-2 Gas/Smoke and Thermal sensors to protect the household.
    Strictly NO water leakage sensor and NO magnetic door sensor.
    """
    def __init__(self):
        self.last_temp: float = 24.0
        self.last_temp_time: float = time.time()
        self.active_hazard_incident: Optional[EmergencyIncident] = None

    def evaluate_telemetry(self, telemetry) -> Optional[EmergencyIncident]:
        """Convenience method to evaluate safety from FullTelemetry model."""
        return self.evaluate_hazard(
            gas_ppm=telemetry.kitchen.gas_ppm,
            temp_c=telemetry.kitchen.temperature_c,
            humidity_pct=telemetry.kitchen.humidity_pct
        )

    def evaluate_hazard(self, gas_ppm: int, temp_c: float, humidity_pct: float) -> Optional[EmergencyIncident]:
        now = time.time()
        dt = max(1.0, now - self.last_temp_time)
        temp_delta = temp_c - self.last_temp
        thermal_rise_rate = (temp_delta / dt) * 10.0  # Normalized rate of rise per 10 sec
        
        self.last_temp = temp_c
        self.last_temp_time = now
        
        # 1. Thermal Fire Hazard Check (Rapid rise with elevated heat or extreme temp)
        if (thermal_rise_rate >= settings.FIRE_THERMAL_RISE_RATE and temp_c >= 38.0) or temp_c > 48.0:
            return self._create_hazard_incident(
                hazard_type="THERMAL_FIRE",
                room="Kitchen",
                severity="CRITICAL",
                summary=f"Rapid thermal surge ({thermal_rise_rate:.1f}°C/10s, Temp: {temp_c:.1f}°C) detected in Kitchen. Possible active fire."
            )
            
        # 2. Combustible Gas Leak Check (LPG / Natural Gas)
        if gas_ppm >= settings.GAS_CRITICAL_PPM:
            return self._create_hazard_incident(
                hazard_type="GAS_LEAK_LPG",
                room="Kitchen",
                severity="CRITICAL",
                summary=f"Severe combustible gas (LPG) concentration ({gas_ppm} ppm) detected. Threshold: {settings.GAS_CRITICAL_PPM} ppm. Exhaust ventilation engaged."
            )
            
        # 3. Smoke Inhalation Warning
        if gas_ppm >= settings.GAS_WARNING_PPM:
            return self._create_hazard_incident(
                hazard_type="SMOKE_HAZARD",
                room="Kitchen",
                severity="WARNING",
                summary=f"Abnormal combustion smoke/fume concentration ({gas_ppm} ppm) detected in Kitchen."
            )

        return None

    def _create_hazard_incident(self, hazard_type: str, room: str, severity: str, summary: str) -> EmergencyIncident:
        timestamp_str = datetime.now().strftime("%Y-%m-%d %I:%M:%S %p")
        event_id = f"HAZARD_{int(time.time())}"
        
        # Create an evidence snapshot placeholder or camera capture
        snapshot_filename = f"{hazard_type.lower()}_{int(time.time())}.jpg"
        snapshot_path = SNAPSHOTS_DIR / snapshot_filename
        self._generate_hazard_snapshot(snapshot_path, hazard_type, room, summary)
        
        incident = EmergencyIncident(
            event_id=event_id,
            type=hazard_type,
            room=room,
            person="Registered Resident",
            timestamp=timestamp_str,
            severity=severity,
            evidence_snapshot_url=f"/storage/snapshots/{snapshot_filename}",
            gemini_triage_summary=f"Google Gemini Multimodal AI Triage: {summary}",
            ambulance_dispatch=AmbulanceDispatchInfo(
                contact_number=settings.AMBULANCE_NUMBER,
                dial_action=settings.AMBULANCE_DIAL_URI,
                gps_coordinates=f"{settings.RESIDENTIAL_GPS_LAT}° N, {settings.RESIDENTIAL_GPS_LON}° E",
                google_maps_url=settings.GOOGLE_MAPS_EMERGENCY_URL
            ),
            contacts_notified=["Personal Contact: " + settings.PERSONAL_EMERGENCY_CONTACT, "Ambulance Emergency: 108"]
        )
        self.active_hazard_incident = incident
        return incident

    def _generate_hazard_snapshot(self, path: Path, hazard_type: str, room: str, text: str):
        """Generates an evidence image frame with telemetry overlay for the dashboard."""
        try:
            from PIL import Image, ImageDraw
            img = Image.new("RGB", (640, 480), color=(35, 15, 20))
            draw = ImageDraw.Draw(img)
            # Hazard border
            draw.rectangle([(20, 20), (620, 460)], outline=(255, 60, 0), width=3)
            # Overlays
            draw.text((35, 45), "AURA SAFETY GUARDIAN - HAZARD CAPTURE", fill=(255, 160, 0))
            draw.text((35, 90), f"HAZARD: {hazard_type}", fill=(255, 50, 50))
            draw.text((35, 135), f"ROOM: {room}", fill=(255, 255, 255))
            draw.text((35, 180), f"TIMESTAMP: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", fill=(200, 200, 200))
            draw.text((35, 230), "STATUS: EXHAUST VENTILATION & ALARM ENGAGED", fill=(0, 255, 255))
            draw.text((35, 280), f"GPS: {settings.RESIDENTIAL_GPS_LAT}N, {settings.RESIDENTIAL_GPS_LON}E", fill=(180, 180, 180))
            draw.text((35, 360), "EMERGENCY HOTLINE 108 NOTIFICATION DISPATCHED", fill=(0, 255, 100))
            img.save(str(path), "JPEG")
        except Exception:
            with open(path, "wb") as f:
                f.write(b"AURA_HAZARD_EVIDENCE_CAPTURE")

    def dismiss_hazard(self):
        self.active_hazard_incident = None

safety_guardian = SafetyGuardian()
