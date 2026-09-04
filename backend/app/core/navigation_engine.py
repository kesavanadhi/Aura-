import heapq
from typing import Dict, List, Tuple, Optional
from app.models.schemas import MapNode, NavigationResult

class DynamicIndoorNavigator:
    """
    Dynamic Indoor Navigation Engine using A* Pathfinding.
    Monitors 4 rooms (Bedroom, Hall, Kitchen, Bathroom) and reroutes
    dynamically when Ultrasonic/ToF obstacle sensors detect obstructions.
    """
    def __init__(self):
        # 2D Topological Map Representation
        self.nodes: Dict[str, MapNode] = {
            "BEDROOM": MapNode(id="BEDROOM", name="Bedroom", zone="Bedroom", x=100, y=100),
            "BEDROOM_DOOR": MapNode(id="BEDROOM_DOOR", name="Bedroom Waypoint", zone="Bedroom", x=200, y=100),
            "HALL_NORTH": MapNode(id="HALL_NORTH", name="Hall Main Entry", zone="Hall", x=320, y=100),
            "HALL_CENTRAL": MapNode(id="HALL_CENTRAL", name="Hall Crossway", zone="Hall", x=320, y=200),
            "HALL_SOUTH": MapNode(id="HALL_SOUTH", name="Hall South Corridor", zone="Hall", x=320, y=320),
            "KITCHEN_DOOR": MapNode(id="KITCHEN_DOOR", name="Kitchen Waypoint", zone="Kitchen", x=440, y=320),
            "KITCHEN": MapNode(id="KITCHEN", name="Kitchen Area", zone="Kitchen", x=540, y=320),
            "BATHROOM_DOOR": MapNode(id="BATHROOM_DOOR", name="Bathroom Waypoint", zone="Bathroom", x=200, y=320),
            "BATHROOM": MapNode(id="BATHROOM", name="Bathroom Area", zone="Bathroom", x=100, y=320),
            # Bypass Corridor for dynamic rerouting if Hall Central is blocked!
            "HALL_BYPASS": MapNode(id="HALL_BYPASS", name="Hall West Alternate Path", zone="Hall", x=260, y=200)
        }
        
        # Adjacency Graph with Euclidean distances
        self.graph: Dict[str, List[Tuple[str, float]]] = {
            "BEDROOM": [("BEDROOM_DOOR", 100.0)],
            "BEDROOM_DOOR": [("BEDROOM", 100.0), ("HALL_NORTH", 120.0)],
            "HALL_NORTH": [("BEDROOM_DOOR", 120.0), ("HALL_CENTRAL", 100.0), ("HALL_BYPASS", 115.0)],
            "HALL_CENTRAL": [("HALL_NORTH", 100.0), ("HALL_SOUTH", 120.0), ("HALL_BYPASS", 60.0)],
            "HALL_BYPASS": [("HALL_NORTH", 115.0), ("HALL_CENTRAL", 60.0), ("HALL_SOUTH", 130.0)],
            "HALL_SOUTH": [("HALL_CENTRAL", 120.0), ("HALL_BYPASS", 130.0), ("KITCHEN_DOOR", 120.0), ("BATHROOM_DOOR", 120.0)],
            "KITCHEN_DOOR": [("HALL_SOUTH", 120.0), ("KITCHEN", 100.0)],
            "KITCHEN": [("KITCHEN_DOOR", 100.0)],
            "BATHROOM_DOOR": [("HALL_SOUTH", 120.0), ("BATHROOM", 100.0)],
            "BATHROOM": [("BATHROOM_DOOR", 100.0)]
        }
        
        # Simulated or detected obstacles
        self.active_obstacles: List[str] = []

    def set_obstacle(self, node_id: str, is_blocked: bool):
        if node_id in self.nodes:
            self.nodes[node_id].is_blocked = is_blocked
            if is_blocked and node_id not in self.active_obstacles:
                self.active_obstacles.append(node_id)
            elif not is_blocked and node_id in self.active_obstacles:
                self.active_obstacles.remove(node_id)

    def update_sensor_obstacles(self, hall_distance_cm: float, bathroom_distance_cm: float):
        """Updates obstacles based on real HC-SR04 / ToF distance telemetry."""
        # Threshold: an object within 45 cm is considered a blocking obstacle
        self.set_obstacle("HALL_CENTRAL", hall_distance_cm < 45.0)
        self.set_obstacle("BATHROOM_DOOR", bathroom_distance_cm < 35.0)

    def _heuristic(self, a_id: str, b_id: str) -> float:
        a = self.nodes[a_id]
        b = self.nodes[b_id]
        return ((a.x - b.x)**2 + (a.y - b.y)**2)**0.5

    def calculate_route(self, start_room: str, destination_room: str) -> NavigationResult:
        start_key = start_room.upper()
        dest_key = destination_room.upper()

        if start_key not in self.nodes or dest_key not in self.nodes:
            return NavigationResult(
                start_room=start_room,
                destination_room=destination_room,
                safe_route=[],
                route_coordinates=[],
                path_status="INVALID_ROOM",
                voice_guidance=f"Invalid location requested: {start_room} to {destination_room}."
            )

        # A* Pathfinding
        open_set: List[Tuple[float, str]] = []
        heapq.heappush(open_set, (0.0, start_key))
        came_from: Dict[str, str] = {}
        g_score: Dict[str, float] = {node_id: float('inf') for node_id in self.nodes}
        g_score[start_key] = 0.0

        while open_set:
            current_f, current_node = heapq.heappop(open_set)

            if current_node == dest_key:
                # Reconstruct path
                path: List[str] = []
                curr = current_node
                while curr in came_from:
                    path.append(curr)
                    curr = came_from[curr]
                path.append(start_key)
                path.reverse()
                
                coords = [{"name": self.nodes[n].name, "x": self.nodes[n].x, "y": self.nodes[n].y} for n in path]
                
                status = "SAFE"
                if any(self.nodes[n].id in self.active_obstacles for n in self.nodes):
                    if "HALL_BYPASS" in path:
                        status = "OBSTACLE_DETECTED_REROUTED"

                guidance = self._generate_voice_guidance(path, status)
                return NavigationResult(
                    start_room=start_room,
                    destination_room=destination_room,
                    safe_route=path,
                    route_coordinates=coords,
                    path_status=status,
                    voice_guidance=guidance,
                    detected_obstacles=self.active_obstacles.copy()
                )

            for neighbor, weight in self.graph.get(current_node, []):
                # Skip if neighbor is blocked by dynamic obstacle
                if self.nodes[neighbor].is_blocked:
                    continue

                tentative_g = g_score[current_node] + weight
                if tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current_node
                    g_score[neighbor] = tentative_g
                    f_score = tentative_g + self._heuristic(neighbor, dest_key)
                    heapq.heappush(open_set, (f_score, neighbor))

        # No safe route found
        return NavigationResult(
            start_room=start_room,
            destination_room=destination_room,
            safe_route=[],
            route_coordinates=[],
            path_status="PATH_BLOCKED",
            voice_guidance=f"Caution: All indoor routes to {destination_room} are currently blocked by detected obstacles.",
            detected_obstacles=self.active_obstacles.copy()
        )

    def _generate_voice_guidance(self, path: List[str], status: str) -> str:
        if not path:
            return "No valid path available."
        names = [self.nodes[n].name for n in path if n in self.nodes]
        if not names:
            return "Navigating to destination."
        if len(names) == 1:
            return f"You are already in {names[0]}."
        if status == "OBSTACLE_DETECTED_REROUTED":
            return f"Obstacle detected in central corridor. Dynamically rerouting via alternate path to reach {names[-1]}. Path clear."
        via_str = f" through {names[1]}" if len(names) > 2 else ""
        return f"Safe path verified. Proceed from {names[0]}{via_str} towards {names[-1]}. Route is clear."

indoor_navigator = DynamicIndoorNavigator()
