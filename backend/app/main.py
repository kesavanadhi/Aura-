import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel
from app.config import settings, STORAGE_DIR, BASE_DIR
from app.iot.mqtt_manager import mqtt_manager
from app.iot.simulator import simulator
from app.core.context_engine import context_engine
from app.core.decision_engine import decision_engine
from app.vision.fall_detector import fall_detector
from app.core.safety_guardian import safety_guardian
from app.services.device_state_service import device_state_service
from app.services.rag_service import rag_service

from app.api.routes_telemetry import router as telemetry_router
from app.api.routes_control import router as control_router, broadcast_mqtt_actuators
from app.api.routes_navigation import router as navigation_router
from app.api.routes_emergency import router as emergency_router
from app.api.routes_voice import router as voice_router
from app.api.routes_simulator import router as simulator_router
from app.api.routes_camera import router as camera_router

from app.iot.mini_broker import SimpleMQTTBroker

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start Embedded MQTT Broker on 0.0.0.0:1883
    broker = SimpleMQTTBroker(host="0.0.0.0", port=settings.MQTT_BROKER_PORT)
    broker_task = asyncio.create_task(broker.start())
    await asyncio.sleep(0.3)
    
    # Startup: Start MQTT client
    mqtt_manager.start()
    yield
    # Shutdown: Stop MQTT client & Broker
    mqtt_manager.stop()
    broker_task.cancel()

app = FastAPI(
    title=f"{settings.PROJECT_NAME} - {settings.PROJECT_TITLE}",
    version=settings.VERSION,
    description="Cognitive Smart Living Ecosystem Backend powered by Edge AI and Google Gemini Intelligence.",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Storage (for incident camera captures)
app.mount("/storage", StaticFiles(directory=str(STORAGE_DIR)), name="storage")

# Register API Routers
app.include_router(telemetry_router)
app.include_router(control_router)
app.include_router(navigation_router)
app.include_router(emergency_router)
app.include_router(voice_router)
app.include_router(simulator_router)
app.include_router(camera_router)

@app.get("/api/system/status")
async def root_status():
    return {
        "system": settings.PROJECT_NAME,
        "title": settings.PROJECT_TITLE,
        "status": "ONLINE",
        "cognitive_cycle": "Sense -> Understand -> Predict -> Decide -> Act -> Assist",
        "version": settings.VERSION,
        "exclusions_enforced": {
            "water_leakage_sensor": False,
            "magnetic_door_sensor": False
        }
    }

@app.get("/api/hardware/status")
async def get_hardware_status():
    hw_status = mqtt_manager.get_hardware_status()
    return {
        "hardware": hw_status,
        "telemetry": mqtt_manager.hardware_telemetry.model_dump() if hw_status["online"] else None
    }

# Real-time WebSocket Broadcaster for Central Dashboard
@app.websocket("/ws/telemetry")
async def telemetry_websocket(websocket: WebSocket):
    await websocket.accept()
    last_broadcast_dict = None
    try:
        while True:
            hw_status = mqtt_manager.get_hardware_status()
            sim_telemetry = simulator.tick_stream()
            hw_telemetry = mqtt_manager.hardware_telemetry

            # Decide active telemetry stream based on simulation_enabled or hardware presence
            active_telemetry = sim_telemetry if simulator.simulation_enabled else hw_telemetry
            
            # 2. Context Processing
            ctx_res = context_engine.update_telemetry(active_telemetry, decision_engine.current_actuators)
            
            # 3. Emergency Interceptor
            active_emerg = fall_detector.active_emergency or safety_guardian.active_hazard_incident
            
            # 4. Decision Engine Actuation
            actuators = decision_engine.process_decisions(active_telemetry, ctx_res["context"], active_emerg)

            # 5. Broadcast to physical hardware whenever states change
            current_act_dict = actuators.model_dump()
            if current_act_dict != last_broadcast_dict:
                broadcast_mqtt_actuators(actuators)
                last_broadcast_dict = current_act_dict

            payload = {
                "telemetry": active_telemetry.model_dump(),
                "sim_telemetry": sim_telemetry.model_dump(),
                "hardware_telemetry": hw_telemetry.model_dump() if hw_status["online"] else None,
                "hardware_status": hw_status,
                "actuators": actuators.model_dump(),
                "device_states": device_state_service.get_summary_state(),
                "mqtt_diagnostics": mqtt_manager.get_diagnostic_info(),
                "manual_overrides": decision_engine.get_override_status(),
                "is_manual_mode": len(decision_engine.manual_overrides) > 0,
                "context": ctx_res["context"].model_dump(),
                "energy": ctx_res["energy"].model_dump(),
                "active_emergency": active_emerg.model_dump() if active_emerg else None
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(0.3)  # ~3.3 Hz streaming for silky-smooth performance without browser lag
    except WebSocketDisconnect:
        pass
    except Exception:
        pass

@app.get("/api/mqtt/diagnostics")
async def get_mqtt_diagnostics_endpoint():
    """Diagnostic endpoint returning live MQTT broker, node health, freshness, and last command/ACK."""
    return mqtt_manager.get_diagnostic_info()

class RAGQueryRequest(BaseModel):
    query: str

@app.post("/api/rag/query")
async def rag_query_endpoint(req: RAGQueryRequest):
    """
    RAG Grounding & Anti-Hallucination Query Endpoint.
    Enforces strict source of truth priority, validates queries against hardware registry,
    and returns structured decision with zero hallucination.
    """
    hw_status = mqtt_manager.get_hardware_status()
    current_telemetry = mqtt_manager.hardware_telemetry if hw_status["online"] else simulator.tick_stream()
    active_emerg = fall_detector.active_emergency or safety_guardian.active_hazard_incident

    result = rag_service.evaluate_user_query(
        query=req.query,
        current_telemetry=current_telemetry.model_dump(),
        telemetry_timestamp=current_telemetry.timestamp,
        is_hardware_online=hw_status["online"],
        is_emergency_active=active_emerg is not None
    )

    # If action required and validated, actuate and record confirmation phase
    if result.get("decision", {}).get("action_required"):
        cmd = result.get("command", {})
        payload = cmd.get("payload", {})
        zone = cmd.get("zone", "zone1")
        for dev, val in payload.items():
            decision_engine.manual_override(dev, val)
        node_id = "node1" if zone == "zone1" else "node2"
        mqtt_res = mqtt_manager.publish_control(node_id, payload, is_emergency_active=active_emerg is not None)
        result["execution"]["status"] = mqtt_res.get("status", "PUBLISHED")
        result["execution"]["mqtt_details"] = mqtt_res
    return result

@app.get("/api/rag/knowledge")
async def get_rag_knowledge():
    """Returns the machine-readable RAG knowledge base documents and contracts."""
    from app.rag import (
        HARDWARE_REGISTRY,
        MQTT_CONTRACT,
        TELEMETRY_SCHEMA,
        ACTUATOR_CONTRACT,
        SAFETY_RULES,
        DECISION_RULES,
        VOICE_COMMAND_MAP
    )
    return {
        "hardware_registry": HARDWARE_REGISTRY,
        "mqtt_contract": MQTT_CONTRACT,
        "telemetry_schema": TELEMETRY_SCHEMA,
        "actuator_contract": ACTUATOR_CONTRACT,
        "safety_rules": SAFETY_RULES,
        "decision_rules": DECISION_RULES,
        "voice_command_map": VOICE_COMMAND_MAP
    }

# Mount Built Frontend Dashboard (Vite dist) so http://localhost:8000 directly loads the UI
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend_dist")

