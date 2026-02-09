from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from functools import lru_cache
import osmnx as ox
import networkx as nx
from shapely.geometry import LineString, mapping, Point
from pydantic import BaseModel
from typing import List, Optional, Dict, Tuple
import geopandas as gpd
import pandas as pd
import json
import math
import os

app = FastAPI(title="CivicSense API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
TAMBARAM_CENTER = (12.9229, 80.1275)
TAMBARAM_RADIUS_M = 2000
TOP_CRITICAL_ROADS = 10

# Cache for graph data
_graph_cache = None
_pois_cache = None
_critical_edges_cache = None
_location_pois_cache = None
_drainage_cache = None
_synthetic_drainage_cache = None

def get_gemini_api_key():
    """Get Gemini API key from env or apikey.txt"""
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key and key.strip():
        return key.strip()
    try:
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        path = os.path.join(root, "apikey.txt")
        if os.path.isfile(path):
            with open(path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        return line.strip()
    except Exception:
        pass
    return None

def load_graph():
    """Load and cache the road network graph"""
    global _graph_cache
    if _graph_cache is None:
        print("Loading road network graph...")
        _graph_cache = ox.graph_from_point(TAMBARAM_CENTER, dist=TAMBARAM_RADIUS_M, network_type="drive")
        for u, v, k, data in _graph_cache.edges(keys=True, data=True):
            data["traffic_weight"] = data["length"]
    return _graph_cache

def load_pois():
    """Load public services POIs"""
    global _pois_cache
    if _pois_cache is None:
        print("Loading POIs...")
        tags = {
            "amenity": ["school", "hospital", "university", "college", "clinic", "police", "fire_station", "pharmacy"],
            "building": ["school", "hospital", "university", "college"],
        }
        try:
            _pois_cache = ox.features_from_point(TAMBARAM_CENTER, tags=tags, dist=TAMBARAM_RADIUS_M)
        except Exception:
            _pois_cache = gpd.GeoDataFrame()
    return _pois_cache

def load_critical_edges():
    """Load critical edges based on betweenness centrality"""
    global _critical_edges_cache
    if _critical_edges_cache is None:
        print("Calculating critical edges...")
        G = load_graph()
        try:
            betweenness = nx.edge_betweenness_centrality(G, weight="traffic_weight")
            sorted_edges = sorted(betweenness.items(), key=lambda x: -x[1])
            _critical_edges_cache = [edge for (edge, _) in sorted_edges[:TOP_CRITICAL_ROADS]]
        except Exception:
            _critical_edges_cache = []
    return _critical_edges_cache

def load_location_pois():
    """Load location POIs for text-to-simulation"""
    global _location_pois_cache
    if _location_pois_cache is None:
        print("Loading location POIs...")
        tags = {
            "amenity": ["market", "marketplace", "hospital", "clinic", "school", "university", "college", "police", "fire_station"],
            "building": ["school", "hospital", "university", "college", "retail", "commercial"],
        }
        try:
            _location_pois_cache = ox.features_from_point(TAMBARAM_CENTER, tags=tags, dist=TAMBARAM_RADIUS_M)
        except Exception:
            _location_pois_cache = gpd.GeoDataFrame()
    return _location_pois_cache

def load_drainage():
    """Load drainage features"""
    global _drainage_cache
    if _drainage_cache is None:
        print("Loading drainage features...")
        tags = {
            "waterway": True,
            "man_made": ["drainage", "pipeline", "sewer"],
        }
        try:
            gdf = ox.features_from_point(TAMBARAM_CENTER, tags=tags, dist=TAMBARAM_RADIUS_M)
            if not gdf.empty:
                mask = gdf.get("waterway", pd.Series([False] * len(gdf))).notna()
                mask |= gdf.get("man_made", pd.Series([False] * len(gdf))).isin(["drainage", "pipeline", "sewer"])
                _drainage_cache = gdf[mask]
            else:
                _drainage_cache = gpd.GeoDataFrame()
        except Exception:
            _drainage_cache = gpd.GeoDataFrame()
    return _drainage_cache

def generate_synthetic_drainage():
    """Generate synthetic drainage based on road patterns"""
    global _synthetic_drainage_cache
    if _synthetic_drainage_cache is None:
        print("Generating synthetic drainage...")
        G = load_graph()
        drainage_features = []
        for u, v, k, data in G.edges(keys=True, data=True):
            highway = data.get("highway")
            if highway:
                highway_type = highway[0] if isinstance(highway, list) else highway
                if highway_type in ["residential", "service", "unclassified", "living_street", "tertiary"]:
                    if data.get("geometry") is not None:
                        drainage_features.append({
                            "geometry": data["geometry"],
                            "type": "synthetic_drain",
                            "highway_type": highway_type,
                        })
        if drainage_features:
            _synthetic_drainage_cache = gpd.GeoDataFrame(drainage_features, crs="EPSG:4326")
        else:
            _synthetic_drainage_cache = gpd.GeoDataFrame()
    return _synthetic_drainage_cache

def haversine_m(lat1, lon1, lat2, lon2):
    """Calculate distance in metres between two points"""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_edges_in_radius(graph, center_lat, center_lon, radius_m, max_edges=80):
    """Get edges within radius"""
    candidates = []
    for u, v, k, data in graph.edges(keys=True, data=True):
        if data.get("geometry") is not None:
            mid = data["geometry"].interpolate(0.5, normalized=True)
            lat, lon = mid.y, mid.x
        else:
            yu, xu = graph.nodes[u]["y"], graph.nodes[u]["x"]
            yv, xv = graph.nodes[v]["y"], graph.nodes[v]["x"]
            lat = (yu + yv) / 2
            lon = (xu + xv) / 2
        d = haversine_m(center_lat, center_lon, lat, lon)
        if d <= radius_m:
            candidates.append((d, (u, v)))
    candidates.sort(key=lambda x: x[0])
    return [uv for (_, uv) in candidates[:max_edges]]

MINOR_HIGHWAY_TYPES = {"residential", "service", "unclassified", "living_street", "tertiary", "secondary", "secondary_link", "tertiary_link"}
PRIMARY_HIGHWAY_TYPES = {"motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link"}

def get_highway_type(graph, u, v):
    """Get highway type for edge"""
    data = graph.get_edge_data(u, v)
    if not data:
        return None
    d = next(iter(data.values()))
    h = d.get("highway")
    if h is None:
        return None
    return (h[0] if isinstance(h, list) else h) or None

def filter_edges_by_road_type(graph, edge_tuples, road_filter):
    """Filter edges by road type"""
    if road_filter == "all":
        return list(edge_tuples)
    kept = []
    for (u, v) in edge_tuples:
        h = get_highway_type(graph, u, v)
        if h is None:
            if road_filter == "minor":
                kept.append((u, v))
            continue
        if road_filter == "minor":
            if h in MINOR_HIGHWAY_TYPES:
                kept.append((u, v))
        elif road_filter == "non_primary":
            if h not in PRIMARY_HIGHWAY_TYPES:
                kept.append((u, v))
    return kept

def resolve_location_center(location_type, location_pois_gdf):
    """Resolve location type to coordinates"""
    if location_type == "ward_center":
        return TAMBARAM_CENTER
    if location_pois_gdf.empty:
        return TAMBARAM_CENTER
    type_to_amenity = {
        "market": ["market", "marketplace"],
        "hospital": ["hospital", "clinic"],
        "school": ["school", "university", "college"],
        "commercial": ["retail", "commercial", "market"],
    }
    amenities = type_to_amenity.get(location_type, [location_type])
    for _, row in location_pois_gdf.iterrows():
        geom = row.geometry
        if geom is None:
            continue
        if geom.geom_type == "Point":
            lat, lon = geom.y, geom.x
        else:
            cent = geom.centroid
            lat, lon = cent.y, cent.x
        for col in ("amenity", "building"):
            if col in row.index and row[col] is not None and str(row[col]) != "nan":
                val = str(row[col]).lower()
                if any(a in val for a in amenities):
                    return (lat, lon)
    return TAMBARAM_CENTER

def parse_scenario_with_keywords(user_text):
    """Parse scenario using keyword matching"""
    text = user_text.lower().strip()
    if not text:
        return (False, "Empty input")
    
    location_type = "ward_center"
    if any(word in text for word in ["market", "shopping", "commercial"]):
        location_type = "market"
    elif any(word in text for word in ["hospital", "clinic", "medical"]):
        location_type = "hospital"
    elif any(word in text for word in ["school", "university", "college", "education"]):
        location_type = "school"
    
    radius_m = 400
    if any(word in text for word in ["near", "close", "around", "surrounding"]):
        radius_m = 400
    elif any(word in text for word in ["whole", "entire", "all", "full", "complete"]):
        radius_m = 1500
    elif any(word in text for word in ["within", "inside"]):
        radius_m = 600
    
    road_filter = "minor"
    if any(word in text for word in ["all", "every", "entire", "complete"]):
        road_filter = "all"
    elif any(word in text for word in ["non-primary", "non primary", "secondary", "tertiary"]):
        road_filter = "non_primary"
    
    event = "road_closure"
    if any(word in text for word in ["flood", "flooding", "rain", "water"]):
        event = "flash_flood"
    elif any(word in text for word in ["construction", "repair", "maintenance"]):
        event = "construction"
    
    return (True, {
        "location_type": location_type,
        "radius_m": radius_m,
        "road_filter": road_filter,
        "event": event,
    })

def parse_scenario_with_llm(user_text):
    """Parse scenario using Gemini LLM"""
    api_key = get_gemini_api_key()
    if not api_key or not user_text or not user_text.strip():
        return (False, "API key not found or empty input")
    
    prompt = """You are a parser for an urban traffic simulation. Extract and return ONLY a JSON object:
- "location_type": one of "market", "hospital", "school", "ward_center", "commercial"
- "radius_m": number in metres, 150 to 1500
- "road_filter": one of "minor", "non_primary", "all"
- "event": short label e.g. "flash_flood" or "road_closure"

User input: """
    
    try:
        import google.generativeai as genai
        api_key = api_key.strip()
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        try:
            from google.generativeai.types import GenerationConfig
            gen_config = GenerationConfig(response_mime_type="application/json", max_output_tokens=200)
        except ImportError:
            gen_config = {"response_mime_type": "application/json", "max_output_tokens": 200}
        
        resp = model.generate_content(prompt + user_text.strip()[:500], generation_config=gen_config)
        text = (resp.text or "").strip()
        if not text:
            return (False, "Empty response from API")
        
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        
        out = json.loads(text)
        out.setdefault("location_type", "ward_center")
        out.setdefault("radius_m", 400)
        out.setdefault("road_filter", "minor")
        if not isinstance(out["radius_m"], (int, float)):
            out["radius_m"] = 400
        out["radius_m"] = max(150, min(1500, int(out["radius_m"])))
        return (True, out)
    except Exception as e:
        return (False, f"Error: {str(e)[:150]}")

def scenario_intent_to_blocked_edges(graph, intent, location_pois_gdf):
    """Convert scenario intent to blocked edges"""
    if not intent:
        return []
    lat, lon = resolve_location_center(intent.get("location_type", "ward_center"), location_pois_gdf)
    radius_m = intent.get("radius_m", 400)
    road_filter = intent.get("road_filter", "minor")
    edges_in_radius = get_edges_in_radius(graph, lat, lon, radius_m)
    blocked = filter_edges_by_road_type(graph, edges_in_radius, road_filter)
    seen = set()
    unique = []
    for (u, v) in blocked:
        key = (min(u, v), max(u, v))
        if key not in seen:
            seen.add(key)
            unique.append((u, v))
    return unique

def solve_path(graph, start, end, blocked_list):
    """Calculate shortest path with blocked edges"""
    H = graph.copy()
    for (u, v) in blocked_list:
        if H.has_edge(u, v):
            keys = list(H[u][v].keys())
            for k in keys:
                H.remove_edge(u, v, k)
        if H.has_edge(v, u):
            keys = list(H[v][u].keys())
            for k in keys:
                H.remove_edge(v, u, k)
    try:
        path = nx.shortest_path(H, start, end, weight="traffic_weight")
        length = nx.shortest_path_length(H, start, end, weight="traffic_weight")
        return path, length
    except nx.NetworkXNoPath:
        return None, None

def get_node_coords(graph, node_id):
    """Get coordinates for a node"""
    return (graph.nodes[node_id]['y'], graph.nodes[node_id]['x'])

def get_edge_coords(graph, u, v, key=0):
    """Get coordinates for an edge"""
    data = graph.get_edge_data(u, v).get(key)
    if not data:
        data = graph.get_edge_data(u, v).get(list(graph[u][v].keys())[0])
    if data and "geometry" in data:
        geom = data["geometry"]
        if hasattr(geom, "xy"):
            return [[y, x] for x, y in zip(geom.xy[0], geom.xy[1])]
        return [[geom.centroid.y, geom.centroid.x]]
    return [list(get_node_coords(graph, u)), list(get_node_coords(graph, v))]

# Initialize data on startup
@app.on_event("startup")
async def startup_event():
    print("Initializing CivicSense API...")
    load_graph()
    load_pois()
    load_critical_edges()
    load_location_pois()
    load_drainage()
    generate_synthetic_drainage()
    print("API ready!")

# Pydantic Models
class EdgeRequest(BaseModel):
    u: int
    v: int

class ScenarioRequest(BaseModel):
    text: str
    use_llm: bool = False

class PathRequest(BaseModel):
    start_node: int
    end_node: int
    blocked_edges: List[Tuple[int, int]] = []

class NearestNodeRequest(BaseModel):
    lat: float
    lon: float

class NearestEdgeRequest(BaseModel):
    lat: float
    lon: float

# API Routes
@app.get("/")
def root():
    return {"status": "CivicSense API running", "version": "1.0.0"}

@app.get("/api/roads/geojson")
def roads_geojson():
    """Get all roads as GeoJSON"""
    G = load_graph()
    features = []
    for u, v, k, data in G.edges(keys=True, data=True):
        if "geometry" in data:
            geom = data["geometry"]
        else:
            p1 = (G.nodes[u]["x"], G.nodes[u]["y"])
            p2 = (G.nodes[v]["x"], G.nodes[v]["y"])
            geom = LineString([p1, p2])
        features.append({
            "type": "Feature",
            "geometry": mapping(geom),
            "properties": {
                "u": u,
                "v": v,
                "highway": get_highway_type(G, u, v),
            }
        })
    return {"type": "FeatureCollection", "features": features}

@app.get("/api/pois/geojson")
def pois_geojson():
    """Get POIs as GeoJSON"""
    pois = load_pois()
    if pois.empty:
        return {"type": "FeatureCollection", "features": []}
    
    features = []
    for idx, row in pois.iterrows():
        geom = row.geometry
        if geom is None:
            continue
        if geom.geom_type == "Point":
            lat, lon = geom.y, geom.x
        else:
            cent = geom.centroid
            lat, lon = cent.y, cent.x
        
        name = None
        amenity = None
        for col in ("name", "amenity", "building"):
            if col in row.index and row[col] is not None and str(row[col]) != "nan":
                if col == "name":
                    name = str(row[col])[:50]
                if col == "amenity":
                    amenity = str(row[col])
                break
        
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {"name": name, "amenity": amenity}
        })
    return {"type": "FeatureCollection", "features": features}

@app.get("/api/critical-roads/geojson")
def critical_roads_geojson():
    """Get critical roads as GeoJSON"""
    G = load_graph()
    critical_edges = load_critical_edges()
    features = []
    for edge in critical_edges:
        u, v, k = edge[0], edge[1], edge[2]
        coords = get_edge_coords(G, u, v, k)
        if len(coords) >= 2:
            features.append({
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": [[x, y] for y, x in coords]},
                "properties": {"u": u, "v": v, "critical": True}
            })
    return {"type": "FeatureCollection", "features": features}

@app.get("/api/drainage/geojson")
def drainage_geojson():
    """Get drainage features as GeoJSON"""
    drainage = load_drainage()
    synthetic = generate_synthetic_drainage()
    features = []
    
    if not drainage.empty:
        for idx, row in drainage.iterrows():
            geom = row.geometry
            if geom is None:
                continue
            if geom.geom_type in ["LineString", "MultiLineString"]:
                if geom.geom_type == "LineString":
                    coords = [[x, y] for x, y in zip(geom.xy[0], geom.xy[1])]
                else:
                    coords = []
                    for line in geom.geoms:
                        coords.extend([[x, y] for x, y in zip(line.xy[0], line.xy[1])])
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "LineString", "coordinates": coords},
                    "properties": {"type": "osm_drainage"}
                })
    
    if not synthetic.empty:
        for idx, row in synthetic.iterrows():
            geom = row.geometry
            if geom is not None and geom.geom_type == "LineString":
                coords = [[x, y] for x, y in zip(geom.xy[0], geom.xy[1])]
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "LineString", "coordinates": coords},
                    "properties": {"type": "synthetic_drainage"}
                })
    
    return {"type": "FeatureCollection", "features": features}

@app.post("/api/scenario/parse")
def parse_scenario(req: ScenarioRequest):
    """Parse natural language scenario description"""
    if req.use_llm:
        success, result = parse_scenario_with_llm(req.text)
    else:
        success, result = parse_scenario_with_keywords(req.text)
    
    if not success:
        raise HTTPException(status_code=400, detail=result)
    
    return {"success": True, "intent": result}

@app.post("/api/scenario/blocked-edges")
def get_blocked_edges(req: ScenarioRequest):
    """Get blocked edges for a scenario"""
    if req.use_llm:
        success, intent = parse_scenario_with_llm(req.text)
    else:
        success, intent = parse_scenario_with_keywords(req.text)
    
    if not success:
        raise HTTPException(status_code=400, detail=intent)
    
    G = load_graph()
    location_pois = load_location_pois()
    blocked = scenario_intent_to_blocked_edges(G, intent, location_pois)
    
    return {
        "blocked_edges": blocked,
        "intent": intent,
        "count": len(blocked)
    }

@app.post("/api/path/calculate")
def calculate_path(req: PathRequest):
    """Calculate shortest path with blocked edges"""
    G = load_graph()
    path, length = solve_path(G, req.start_node, req.end_node, req.blocked_edges)
    
    if path is None:
        return {"success": False, "error": "No path found"}
    
    # Convert path to coordinates
    path_coords = [get_node_coords(G, node) for node in path]
    
    return {
        "success": True,
        "path": path,
        "path_coords": path_coords,
        "length": length
    }

@app.post("/api/map/nearest-node")
def nearest_node(req: NearestNodeRequest):
    """Find nearest node to coordinates"""
    G = load_graph()
    node_id = ox.nearest_nodes(G, req.lon, req.lat)
    coords = get_node_coords(G, node_id)
    return {"node_id": int(node_id), "coords": coords}

@app.post("/api/map/nearest-edge")
def nearest_edge(req: NearestEdgeRequest):
    """Find nearest edge to coordinates"""
    G = load_graph()
    u, v, key = ox.nearest_edges(G, req.lon, req.lat)
    coords = get_edge_coords(G, u, v, key)
    return {
        "u": int(u),
        "v": int(v),
        "key": int(key),
        "coords": coords
    }

@app.post("/api/simulate/edge")
def simulate_edge(req: EdgeRequest):
    """Simulate blocking a single edge"""
    G = load_graph()
    if not G.has_edge(req.u, req.v):
        raise HTTPException(status_code=404, detail="Edge not found")
    
    # This is a simplified simulation - you can enhance this
    return {
        "success": True,
        "edge": {"u": req.u, "v": req.v},
        "message": "Edge blocked"
    }
