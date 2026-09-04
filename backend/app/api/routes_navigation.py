from fastapi import APIRouter
from pydantic import BaseModel
from app.core.navigation_engine import indoor_navigator
from app.models.schemas import NavigationRequest, NavigationResult

router = APIRouter(prefix="/api/navigation", tags=["Indoor Navigation"])

class ObstacleToggleRequest(BaseModel):
    node_id: str
    is_blocked: bool

@router.get("/nodes")
async def get_navigation_map():
    return {
        "nodes": indoor_navigator.nodes,
        "graph": indoor_navigator.graph,
        "active_obstacles": indoor_navigator.active_obstacles
    }

@router.post("/route", response_model=NavigationResult)
async def calculate_safe_route(req: NavigationRequest):
    result = indoor_navigator.calculate_route(req.start_room, req.destination_room)
    return result

@router.post("/obstacle")
async def toggle_map_obstacle(req: ObstacleToggleRequest):
    indoor_navigator.set_obstacle(req.node_id, req.is_blocked)
    return {
        "node_id": req.node_id,
        "is_blocked": req.is_blocked,
        "active_obstacles": indoor_navigator.active_obstacles
    }
