from fastapi import APIRouter
from app.iot.simulator import simulator

router = APIRouter(prefix="/api/simulator", tags=["Hackathon Demo Simulator"])

@router.post("/step/{step_id}")
async def trigger_demonstration_step(step_id: int):
    if step_id == 1:
        return simulator.step1_enter_bedroom()
    elif step_id == 2:
        return simulator.step2_daylight_dimmer_test()
    elif step_id == 3:
        return simulator.step3_climate_cold_test()
    elif step_id == 4:
        return simulator.step4_voice_command_test("AURA, turn on the hall light")
    elif step_id == 5:
        return simulator.step5_navigation_request("Kitchen")
    elif step_id == 6:
        return simulator.step6_obstacle_recalculation()
    elif step_id in [7, 8]:
        return simulator.step7_8_fall_detection()
    elif step_id == 9:
        return simulator.step9_call_ambulance_108()
    elif step_id == 10:
        return simulator.step10_gas_leak_hazard()
    elif step_id == 11:
        return simulator.step11_vacant_energy_cutoff()
    return {"error": "Invalid step_id (Valid range: 1 to 11)"}

@router.post("/adjust")
async def adjust_simulation_values(payload: dict):
    updated = simulator.adjust_values(payload)
    return {"status": "ADJUSTMENT_APPLIED", "telemetry": updated.model_dump()}

@router.post("/mode")
async def set_simulator_mode(payload: dict):
    enabled = payload.get("enabled", True)
    simulator.simulation_enabled = enabled
    return {"status": "MODE_UPDATED", "simulation_enabled": simulator.simulation_enabled}

@router.post("/reset")
async def reset_simulation():
    simulator.reset_all()
    return {"status": "SIMULATOR_RESET_COMPLETED"}
