from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import osmnx as ox
import networkx as nx
from shapely.geometry import LineString, mapping
from pydantic import BaseModel

app = FastAPI()

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading digital ward (Tambaram)...")

# ---------------- LOAD GRAPH (LAT-LON) ----------------
location_point = (12.9229, 80.1275)
G_latlon = ox.graph_from_point(location_point, dist=2000, network_type="drive")

# ---------------- PROJECTED GRAPH (FOR AI) ----------------
G_proj = ox.projection.project_graph(G_latlon)

largest_cc = max(nx.strongly_connected_components(G_proj), key=len)
G_proj = G_proj.subgraph(largest_cc).copy()

for u, v, k, data in G_proj.edges(keys=True, data=True):
    data["traffic_weight"] = data["length"]

nodes = list(G_proj.nodes)
source = nodes[0]
target = nodes[-1]

base_length = nx.shortest_path_length(
    G_proj, source, target, weight="traffic_weight"
)

# ---------------- MODELS ----------------
class EdgeRequest(BaseModel):
    u: int
    v: int

# ---------------- ROUTES ----------------
@app.get("/")
def root():
    return {"status": "SmartWard AI backend running"}

@app.get("/roads_geojson")
def roads_geojson():
    features = []

    for u, v, k, data in G_latlon.edges(keys=True, data=True):

        if "geometry" in data:
            geom = data["geometry"]
        else:
            p1 = (G_latlon.nodes[u]["x"], G_latlon.nodes[u]["y"])
            p2 = (G_latlon.nodes[v]["x"], G_latlon.nodes[v]["y"])
            geom = LineString([p1, p2])

        features.append({
            "type": "Feature",
            "geometry": mapping(geom),
            "properties": {
                "u": u,
                "v": v
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }

@app.post("/simulate_edge")
def simulate_edge(req: EdgeRequest):
    G_closed = G_proj.copy()

    if not G_closed.has_edge(req.u, req.v):
        return {"error": "Edge not found"}

    key = list(G_closed[req.u][req.v].keys())[0]
    G_closed.remove_edge(req.u, req.v, key)

    try:
        new_len = nx.shortest_path_length(
            G_closed, source, target, weight="traffic_weight"
        )
    except nx.NetworkXNoPath:
        return {
            "result": "Destination unreachable",
            "risk": "HIGH"
        }

    increase = ((new_len - base_length) / base_length) * 100

    risk = "LOW"
    if increase > 25:
        risk = "HIGH"
    elif increase > 10:
        risk = "MEDIUM"

    return {
        "original_distance": round(base_length, 2),
        "new_distance": round(new_len, 2),
        "increase_pct": round(increase, 2),
        "risk": risk
    }
