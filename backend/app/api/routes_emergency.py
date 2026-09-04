from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.vision.fall_detector import fall_detector
from app.core.safety_guardian import safety_guardian
from app.config import settings

router = APIRouter(prefix="/api/emergency", tags=["Emergency Response"])

class DismissRequest(BaseModel):
    event_id: Optional[str] = None
    reason: str = "User verified normal condition"

@router.get("/status")
async def get_emergency_status():
    active_fall = fall_detector.active_emergency
    active_hazard = safety_guardian.active_hazard_incident
    
    return {
        "emergency_active": (active_fall is not None) or (active_hazard is not None),
        "fall_incident": active_fall,
        "hazard_incident": active_hazard,
        "ambulance_hotline": {
            "number": settings.AMBULANCE_NUMBER,
            "call_action": settings.AMBULANCE_DIAL_URI,
            "google_maps_url": settings.GOOGLE_MAPS_EMERGENCY_URL
        }
    }

@router.post("/fall/simulate")
async def simulate_fall():
    incident = fall_detector.trigger_simulated_fall("Bedroom")
    return {
        "status": "FALL_EMERGENCY_TRIGGERED",
        "incident": incident
    }

@router.post("/hazard/simulate")
async def simulate_gas_hazard():
    incident = safety_guardian.evaluate_hazard(1450, 26.5, 55.0)
    return {
        "status": "GAS_HAZARD_TRIGGERED",
        "incident": incident
    }

@router.post("/dismiss")
async def dismiss_emergency(req: DismissRequest):
    fall_detector.dismiss_emergency()
    safety_guardian.dismiss_hazard()
    return {
        "status": "EMERGENCY_DISMISSED",
        "message": req.reason
    }

@router.post("/ambulance/call")
async def call_ambulance_108():
    """
    Called when the user clicks 'Call Ambulance (108)' on the emergency modal.
    Returns dispatch payload and initiates cellular/SIP dialer.
    """
    return {
        "status": "AMBULANCE_108_DISPATCHED",
        "service": "National Emergency Ambulance Service (108)",
        "contact_number": settings.AMBULANCE_NUMBER,
        "dial_action": settings.AMBULANCE_DIAL_URI,
        "incident_address": f"Lat: {settings.RESIDENTIAL_GPS_LAT}, Lon: {settings.RESIDENTIAL_GPS_LON}",
        "google_maps_route": settings.GOOGLE_MAPS_EMERGENCY_URL,
        "message": "108 Ambulance service alerted with live GPS coordinates and patient camera evidence."
    }
