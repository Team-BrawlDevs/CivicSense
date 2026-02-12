from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Tuple
import osmnx as ox
import networkx as nx
from shapely.geometry import LineString, mapping, Point
import geopandas as gpd
import pandas as pd
import json
import math
import os
import random

app = FastAPI(title="CivicSense API", version="2.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

# OSM highway classification
MINOR_HIGHWAY_TYPES = {"residential", "service", "unclassified", "living_street", "tertiary", "secondary", "secondary_link", "tertiary_link"}
PRIMARY_HIGHWAY_TYPES = {"motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link"}

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

def get_edge_name(graph, u, v, key=0):
    """Return OSM street/road name for edge (u, v). Uses 'name', then 'ref', then highway type."""
    data = graph.get_edge_data(u, v)
    if not data:
        return None
    d = data.get(key)
    if d is None:
        d = next(iter(data.values()))
    name = d.get("name")
    if name is not None and str(name).strip():
        return (name[0] if isinstance(name, list) else name).strip()
    ref = d.get("ref")
    if ref is not None and str(ref).strip():
        return (ref[0] if isinstance(ref, list) else ref).strip()
    ht = get_highway_type(graph, u, v)
    if ht:
        return ht.replace("_", " ").title() + " road"
    return None

def get_node_street_names(graph, node_id):
    """Return list of unique street names for all edges incident to this node"""
    names = []
    seen = set()
    for _, v, k, data in graph.out_edges(node_id, keys=True, data=True):
        name = get_edge_name(graph, node_id, v, k)
        if name and name not in seen:
            seen.add(name)
            names.append(name)
    for u, _, k, data in graph.in_edges(node_id, keys=True, data=True):
        name = get_edge_name(graph, u, node_id, k)
        if name and name not in seen:
            seen.add(name)
            names.append(name)
    return names

def get_intersection_label(graph, node_id, max_streets=4):
    """Return a short label for an intersection, e.g. 'Valachery Main Road / Kamarajar St'."""
    names = get_node_street_names(graph, node_id)
    if not names:
        return None
    names = sorted(names)[:max_streets]
    return " / ".join(names)

def get_minor_roads_without_drainage(graph):
    """Return list of {name, highway_type} for minor roads where formal drainage is often missing."""
    roads = []
    seen_names = set()
    for u, v, k, data in graph.edges(keys=True, data=True):
        highway = data.get("highway")
        if not highway:
            continue
        highway_type = highway[0] if isinstance(highway, list) else highway
        if highway_type not in ["residential", "service", "unclassified", "living_street", "tertiary"]:
            continue
        name = get_edge_name(graph, u, v, k)
        if name and name not in seen_names:
            seen_names.add(name)
            roads.append({"name": name, "highway_type": highway_type})
    return roads[:15]

def get_blocked_road_names(graph, blocked_edges):
    """Return list of unique OSM street names for blocked edges"""
    names = []
    seen = set()
    for (u, v) in blocked_edges:
        data = graph.get_edge_data(u, v)
        if not data:
            continue
        for key in data:
            name = get_edge_name(graph, u, v, key)
            if name and name not in seen:
                seen.add(name)
                names.append(name)
                break
    return names

def resolve_location_name(location_type, location_pois_gdf):
    """Resolve location_type to an OSM place name"""
    if location_type == "ward_center":
        return "ward center"
    if location_pois_gdf.empty:
        return location_type.replace("_", " ")
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
        for col in ("amenity", "building"):
            if col not in row.index or row[col] is None or str(row[col]) == "nan":
                continue
            val = str(row[col]).lower()
            if not any(a in val for a in amenities):
                continue
            if "name" in row.index and row["name"] is not None and str(row["name"]).strip():
                return str(row["name"]).strip()[:60]
            return str(row[col]).strip()[:60]
    return location_type.replace("_", " ")

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
    elif any(word in text for word in ["ward", "center", "centre", "area"]):
        location_type = "ward_center"
    
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
    elif any(word in text for word in ["minor", "small", "residential", "local", "side"]):
        road_filter = "minor"
    
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
    
    prompt = """You are a parser for an urban traffic simulation. The user describes a scenario (e.g. flash flood, road closure).
Extract and return ONLY a JSON object with exactly these keys (no other text, no markdown):
- "location_type": one of "market", "hospital", "school", "ward_center", "commercial"
- "radius_m": number in metres, 150 to 1500 (use 400 for "near", 800 for "around", 1500 for "whole area")
- "road_filter": one of "minor", "non_primary", "all" (minor = residential/small roads, non_primary = all except main highways, all = every road)
- "event": short label e.g. "flash_flood" or "road_closure" (optional)

Examples:
User: "Simulate a flash flood near the market that blocks all minor roads" -> {"location_type": "market", "radius_m": 400, "road_filter": "minor", "event": "flash_flood"}
User: "Block non-primary roads around the hospital" -> {"location_type": "hospital", "radius_m": 500, "road_filter": "non_primary", "event": "road_closure"}
User: "Close every road in the ward center" -> {"location_type": "ward_center", "radius_m": 600, "road_filter": "all", "event": "full_closure"}

User input: """
    
    try:
        from google import genai
        from google.genai import types

        api_key = api_key.strip()
        client = genai.Client(api_key=api_key)
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            max_output_tokens=200,
        )

        resp = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt + user_text.strip()[:500],
            config=config,
        )
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
        
    except json.JSONDecodeError as e:
        return (False, f"Invalid JSON response. Try rephrasing your scenario.")
    except ImportError as e:
        return (False, f"Missing google-genai package. Run: pip install google-genai")
    except Exception as e:
        error_msg = str(e)
        if "API_KEY" in error_msg or "api_key" in error_msg.lower() or "authentication" in error_msg.lower() or "403" in error_msg or "401" in error_msg:
            return (False, f"API key error: Check your GEMINI_API_KEY in apikey.txt or environment.")
        elif "429" in error_msg or "quota" in error_msg.lower() or "exceeded" in error_msg.lower():
            return (False, f"⚠️ Free tier quota exceeded. Wait a minute or check your quota at: https://ai.dev/rate-limit")
        elif "404" in error_msg and "model" in error_msg.lower():
            return (False, f"Model not found. Please update the model name in the code.")
        else:
            return (False, f"Error: {error_msg[:150]}")

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

def get_edge_midpoint(graph, u, v):
    """Get midpoint coordinates of an edge"""
    data = graph.get_edge_data(u, v)
    if not data:
        p1 = get_node_coords(graph, u)
        p2 = get_node_coords(graph, v)
        return ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
    
    d = next(iter(data.values()))
    if "geometry" in d:
        geom = d["geometry"]
        mid_point = geom.interpolate(0.5, normalized=True)
        return (mid_point.y, mid_point.x)
    else:
        p1 = get_node_coords(graph, u)
        p2 = get_node_coords(graph, v)
        return ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)

def compute_risk_scores(graph, blocked_edges, critical_edges, drainage_gdf, synthetic_drainage_gdf,
                       pois_gdf, path_detour_percent=0):
    """Compute flood, traffic, and emergency access risk scores (0–100, higher = worse)"""
    scores = {"flood_risk": 0, "traffic_risk": 0, "emergency_access_risk": 0,
              "flood_reason": "", "traffic_reason": "", "emergency_reason": ""}

    # Flood risk
    total_drainage = len(drainage_gdf) if not drainage_gdf.empty else 0
    synthetic_drainage = len(synthetic_drainage_gdf) if not synthetic_drainage_gdf.empty else 0
    h_types = ["residential", "service", "unclassified", "living_street", "tertiary"]
    minor_roads_count = 0
    for u, v, k, d in graph.edges(keys=True, data=True):
        h = d.get("highway")
        if not h:
            continue
        ht = h[0] if isinstance(h, list) else h
        if ht in h_types:
            minor_roads_count += 1
    if total_drainage > 0:
        scores["flood_risk"] = min(100, 15 + (0 if minor_roads_count < 50 else 20))
        scores["flood_reason"] = "Some OSM drainage present; minor roads may still flood."
    elif synthetic_drainage > 0:
        scores["flood_risk"] = min(100, 45 + min(25, synthetic_drainage // 20))
        scores["flood_reason"] = "No formal OSM drainage; only inferred along roads."
    else:
        scores["flood_risk"] = min(100, 70 + min(30, minor_roads_count // 10))
        scores["flood_reason"] = "No drainage data; high flood risk in low-lying areas."

    # Traffic risk
    n_blocked = len(blocked_edges)
    blocked_set = set((min(u, v), max(u, v)) for (u, v) in blocked_edges)
    n_bottlenecks = sum(1 for e in critical_edges[:15]
                        if (min(e[0], e[1]), max(e[0], e[1])) in blocked_set)
    traffic_from_blocked = min(60, n_blocked * 8)
    traffic_from_detour = min(30, path_detour_percent * 0.5)
    traffic_from_bottlenecks = min(25, n_bottlenecks * 12)
    scores["traffic_risk"] = min(100, int(traffic_from_blocked + traffic_from_detour + traffic_from_bottlenecks))
    reasons = []
    if n_blocked > 0:
        reasons.append(f"{n_blocked} blocked roads")
    if path_detour_percent > 5:
        reasons.append(f"{path_detour_percent:.0f}% detour impact")
    if n_bottlenecks > 0:
        reasons.append(f"{n_bottlenecks} critical bottlenecks blocked")
    scores["traffic_reason"] = "; ".join(reasons) if reasons else "No current traffic disruption."

    # Emergency access risk
    center_node = ox.nearest_nodes(graph, TAMBARAM_CENTER[1], TAMBARAM_CENTER[0])
    H = graph.copy()
    for (u, v) in blocked_edges:
        if H.has_edge(u, v):
            for k in list(H[u][v].keys()):
                H.remove_edge(u, v, k)
        if H.has_edge(v, u):
            for k in list(H[v][u].keys()):
                H.remove_edge(v, u, k)
    emergency_nodes = []
    if not pois_gdf.empty:
        for _, row in pois_gdf.iterrows():
            geom = row.geometry
            if geom is None:
                continue
            if geom.geom_type == "Point":
                lat, lon = geom.y, geom.x
            else:
                cent = geom.centroid
                lat, lon = cent.y, cent.x
            for col in ("amenity", "building"):
                if col in row.index and row[col] is not None:
                    val = str(row[col]).lower()
                    if "hospital" in val or "clinic" in val or "police" in val or "fire" in val:
                        try:
                            n = ox.nearest_nodes(graph, lon, lat)
                            emergency_nodes.append((n, val))
                            break
                        except Exception:
                            pass
    if not emergency_nodes:
        try:
            far_node = max(graph.nodes(), key=lambda n: (graph.nodes[n]["y"] - TAMBARAM_CENTER[0])**2 + (graph.nodes[n]["x"] - TAMBARAM_CENTER[1])**2)
            dist = nx.shortest_path_length(H, center_node, far_node, weight="length")
            scores["emergency_access_risk"] = min(100, 20 + (0 if n_blocked == 0 else min(50, n_blocked * 5)))
            scores["emergency_reason"] = "No hospital/clinic POIs in data; risk from road blocks only."
        except (nx.NetworkXNoPath, KeyError):
            scores["emergency_access_risk"] = min(100, 50 + n_blocked * 3)
            scores["emergency_reason"] = "Network disconnected or no path; emergency access impaired."
    else:
        unreachable = 0
        max_dist = 0
        for (node, _) in emergency_nodes[:5]:
            try:
                length = nx.shortest_path_length(H, center_node, node, weight="length")
                max_dist = max(max_dist, length)
            except nx.NetworkXNoPath:
                unreachable += 1
        if unreachable == len(emergency_nodes):
            scores["emergency_access_risk"] = min(100, 75 + min(25, n_blocked))
            scores["emergency_reason"] = "Emergency POIs unreachable from ward center with current blocks."
        elif unreachable > 0:
            scores["emergency_access_risk"] = min(100, 45 + unreachable * 15 + min(20, n_blocked * 2))
            scores["emergency_reason"] = f"{unreachable} emergency POI(s) unreachable; blocks reduce access."
        else:
            scores["emergency_access_risk"] = min(100, int(15 + max_dist / 100 + n_blocked * 2))
            scores["emergency_reason"] = "Emergency POIs reachable; risk from extra distance and blocks."

    return scores

def analyze_simulation_state(graph, blocked_edges, critical_edges, drainage_gdf, synthetic_drainage_gdf, 
                             start_node, end_node, original_path, original_len, current_path, current_len):
    """Analyze current simulation state to gather data for policy suggestions"""
    analysis = {
        "blocked_roads_count": len(blocked_edges),
        "critical_roads_count": len(critical_edges),
        "has_path": current_path is not None,
        "path_detour_percent": 0,
        "drainage_coverage": "unknown",
        "hotspot_areas": [],
        "bottleneck_roads": [],
        "streets_without_drainage": [],
    }
    
    if original_path and current_path and original_len > 0:
        analysis["path_detour_percent"] = ((current_len - original_len) / original_len) * 100
    
    total_drainage = len(drainage_gdf) if not drainage_gdf.empty else 0
    synthetic_drainage = len(synthetic_drainage_gdf) if not synthetic_drainage_gdf.empty else 0
    if total_drainage > 0:
        analysis["drainage_coverage"] = "good"
    elif synthetic_drainage > 0:
        analysis["drainage_coverage"] = "synthetic_only"
    else:
        analysis["drainage_coverage"] = "poor"
    
    if blocked_edges:
        node_blocked_count = {}
        for (u, v) in blocked_edges:
            node_blocked_count[u] = node_blocked_count.get(u, 0) + 1
            node_blocked_count[v] = node_blocked_count.get(v, 0) + 1
        
        hotspots = sorted(node_blocked_count.items(), key=lambda x: -x[1])[:5]
        for node_id, count in hotspots:
            if count >= 2:
                lat, lon = graph.nodes[node_id]['y'], graph.nodes[node_id]['x']
                street_names = get_node_street_names(graph, node_id)
                intersection_label = get_intersection_label(graph, node_id)
                analysis["hotspot_areas"].append({
                    "lat": lat,
                    "lon": lon,
                    "blocked_edges": count,
                    "street_names": street_names,
                    "intersection_label": intersection_label,
                })
    
    blocked_set = set((min(u, v), max(u, v)) for (u, v) in blocked_edges)
    for edge in critical_edges[:10]:
        u, v = edge[0], edge[1]
        key = (min(u, v), max(u, v))
        if key in blocked_set:
            try:
                mid_lat, mid_lon = get_edge_midpoint(graph, u, v)
                edge_name = get_edge_name(graph, u, v, edge[2] if len(edge) > 2 else 0)
                intersection_label = get_intersection_label(graph, u) or get_intersection_label(graph, v)
                analysis["bottleneck_roads"].append({
                    "lat": mid_lat,
                    "lon": mid_lon,
                    "u": u,
                    "v": v,
                    "street_name": edge_name,
                    "intersection_label": intersection_label,
                })
            except (KeyError, IndexError):
                continue
    
    if analysis["drainage_coverage"] in ("poor", "synthetic_only"):
        analysis["streets_without_drainage"] = get_minor_roads_without_drainage(graph)
    
    return analysis

def generate_policy_suggestions_fallback(analysis):
    """Generate rule-based policy suggestions using OSM street/intersection names"""
    suggestions = []

    for b in analysis.get("bottleneck_roads", [])[:2]:
        label = b.get("intersection_label") or b.get("street_name")
        if label:
            suggestions.append(
                f"Build a bridge or flyover at {label} — critical bottleneck; a new structure would restore connectivity and reduce detours."
            )
        else:
            suggestions.append(
                "Build a bridge or flyover at the identified critical bottleneck — would restore connectivity and reduce detours."
            )

    for h in analysis.get("hotspot_areas", [])[:2]:
        label = h.get("intersection_label") or (", ".join(h.get("street_names", [])[:2]) if h.get("street_names") else None)
        if label:
            suggestions.append(
                f"Improve capacity at {label} (e.g. widening, signals, or grade separation) — multiple blocked connections; high impact if upgraded."
            )

    streets_no_drainage = analysis.get("streets_without_drainage", [])
    if streets_no_drainage and analysis["drainage_coverage"] in ("poor", "synthetic_only"):
        names = [r["name"] for r in streets_no_drainage[:3]]
        street_list = ", ".join(names) if len(names) <= 2 else (names[0] + ", " + names[1] + f" and {len(streets_no_drainage)-2} other streets")
        suggestions.append(
            f"Build new or formal drainage on streets where it is missing, e.g. {street_list} — reduces flood risk and road closures during rain."
        )
    elif analysis["drainage_coverage"] in ("poor", "synthetic_only"):
        suggestions.append(
            "Build or extend drainage along minor and residential roads — current coverage is limited; reduces flood risk and closures during rain."
        )

    if analysis["path_detour_percent"] > 10 and len(suggestions) < 4:
        suggestions.append(
            f"Widen or add alternate roads in high-detour areas — current detour impact is {analysis['path_detour_percent']:.1f}%; improves redundancy."
        )

    if not suggestions:
        suggestions.append(
            "Run more scenarios (block roads, set start/end) to identify specific intersections and streets; then regenerate for location-specific suggestions."
        )

    out = suggestions[:5]
    random.shuffle(out)
    return out

def generate_policy_suggestions(analysis, graph, blocked_edges, critical_edges, drainage_gdf):
    """Use Gemini API to generate infrastructure policy suggestions. Falls back to rule-based on errors."""
    api_key = get_gemini_api_key()
    if not api_key:
        return (True, generate_policy_suggestions_fallback(analysis), True)

    context = f"""You are an urban planning AI assistant for Tambaram Ward, Chennai. Use the EXACT street and intersection names below in your suggestions.

Current Simulation State:
- Blocked Roads: {analysis['blocked_roads_count']}
- Path Detour Impact: {analysis['path_detour_percent']:.1f}% increase
- Drainage Coverage: {analysis['drainage_coverage']}
"""
    
    if analysis.get("hotspot_areas"):
        context += "\nHotspot intersections (use these exact names in suggestions):\n"
        for i, h in enumerate(analysis["hotspot_areas"][:5], 1):
            label = h.get("intersection_label") or ", ".join(h.get("street_names", [])[:3]) or f"({h['lat']:.4f}, {h['lon']:.4f})"
            context += f"{i}. {label} — {h['blocked_edges']} blocked connections\n"
    
    if analysis.get("bottleneck_roads"):
        context += "\nBottleneck roads / intersections (critical and blocked — suggest bridge/flyover here):\n"
        for i, b in enumerate(analysis["bottleneck_roads"][:5], 1):
            label = b.get("intersection_label") or b.get("street_name") or f"({b['lat']:.4f}, {b['lon']:.4f})"
            context += f"{i}. {label}\n"
    
    if analysis.get("streets_without_drainage"):
        context += "\nStreets where drainage is missing or informal (suggest new drainage on these):\n"
        for i, r in enumerate(analysis["streets_without_drainage"][:8], 1):
            context += f"{i}. {r['name']} ({r['highway_type']})\n"
    
    prompt = context + """
Generate a FRESH set of 3–5 specific, actionable infrastructure policy suggestions for THIS request. Vary the order and phrasing so the response is not identical to a previous run.
Use the EXACT street and intersection names given above (e.g. "Valachery Mudhumalai Salai", "Kamarajar St", "X / Y four-way intersection").
Focus on:
1. Bridges/flyovers at the named bottleneck intersections
2. New or formal drainage on the named streets where drainage is missing
3. Road widening or alternate routes at the named hotspot intersections
4. Emergency access at critical named locations

Each suggestion must name the specific street or intersection (e.g. "Build a bridge at Valachery Mudhumalai Salai / Kamarajar St four-way intersection" or "Build new drainage on [street name]").
Return ONLY a JSON array of strings, no markdown:
["suggestion 1", "suggestion 2", ...]
"""
    
    try:
        from google import genai
        from google.genai import types

        api_key = api_key.strip()
        client = genai.Client(api_key=api_key)
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            max_output_tokens=500,
            temperature=0.85,
        )

        resp = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=config,
        )
        text = (resp.text or "").strip()
        if not text:
            return (True, generate_policy_suggestions_fallback(analysis), True)
        
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        
        suggestions = json.loads(text)
        if isinstance(suggestions, list) and all(isinstance(s, str) for s in suggestions):
            return (True, suggestions, False)
        else:
            return (True, generate_policy_suggestions_fallback(analysis), True)

    except (json.JSONDecodeError, ImportError, Exception):
        return (True, generate_policy_suggestions_fallback(analysis), True)

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

class BlockedEdgesMidpointsRequest(BaseModel):
    edges: List[Tuple[int, int]]

class RiskScoresRequest(BaseModel):
    blocked_edges: List[Tuple[int, int]] = []
    path_detour_percent: float = 0.0

class PolicySuggestionsRequest(BaseModel):
    blocked_edges: List[Tuple[int, int]] = []
    start_node: Optional[int] = None
    end_node: Optional[int] = None
    original_path: Optional[List[int]] = None
    original_length: float = 0.0
    current_path: Optional[List[int]] = None
    current_length: float = 0.0

# API Routes
@app.get("/")
def root():
    return {"status": "CivicSense API running", "version": "2.0.0"}

@app.get("/roads_geojson")
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
                "name": get_edge_name(G, u, v, k),
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
                "properties": {"u": u, "v": v, "critical": True, "name": get_edge_name(G, u, v, k)}
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
    """Get blocked edges for a scenario with enhanced summary"""
    if req.use_llm:
        success, intent = parse_scenario_with_llm(req.text)
    else:
        success, intent = parse_scenario_with_keywords(req.text)
    
    if not success:
        raise HTTPException(status_code=400, detail=intent)
    
    G = load_graph()
    location_pois = load_location_pois()
    blocked = scenario_intent_to_blocked_edges(G, intent, location_pois)
    blocked_names = get_blocked_road_names(G, blocked)
    location_name = resolve_location_name(intent.get("location_type", "ward_center"), location_pois)
    event = intent.get("event", "road_closure")
    
    return {
        "blocked_edges": blocked,
        "intent": intent,
        "count": len(blocked),
        "blocked_road_names": blocked_names,
        "location_name": location_name,
        "event": event,
    }

@app.post("/api/path/calculate")
def calculate_path(req: PathRequest):
    """Calculate shortest path with blocked edges"""
    G = load_graph()
    path, length = solve_path(G, req.start_node, req.end_node, req.blocked_edges)
    
    if path is None:
        return {"success": False, "error": "No path found"}
    
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

@app.post("/api/blocked-edges/midpoints")
def get_blocked_edges_midpoints(req: BlockedEdgesMidpointsRequest):
    """Get midpoints for blocked edges"""
    G = load_graph()
    midpoints = []
    for u, v in req.edges:
        try:
            lat, lon = get_edge_midpoint(G, u, v)
            midpoints.append({"u": u, "v": v, "lat": lat, "lon": lon})
        except Exception:
            continue
    return {"midpoints": midpoints}

@app.post("/api/risk-scores")
def compute_risk_scores_endpoint(req: RiskScoresRequest):
    """Compute risk scores for current simulation state"""
    G = load_graph()
    critical_edges = load_critical_edges()
    drainage_gdf = load_drainage()
    synthetic_drainage_gdf = generate_synthetic_drainage()
    pois_gdf = load_pois()
    
    scores = compute_risk_scores(
        G, req.blocked_edges, critical_edges,
        drainage_gdf, synthetic_drainage_gdf, pois_gdf,
        path_detour_percent=req.path_detour_percent
    )
    return scores

@app.post("/api/policy-suggestions")
def get_policy_suggestions(req: PolicySuggestionsRequest):
    """Generate policy suggestions based on simulation analysis"""
    G = load_graph()
    critical_edges = load_critical_edges()
    drainage_gdf = load_drainage()
    synthetic_drainage_gdf = generate_synthetic_drainage()
    
    analysis = analyze_simulation_state(
        G, req.blocked_edges, critical_edges,
        drainage_gdf, synthetic_drainage_gdf,
        req.start_node, req.end_node,
        req.original_path, req.original_length,
        req.current_path, req.current_length
    )
    
    success, suggestions, used_fallback = generate_policy_suggestions(
        analysis, G, req.blocked_edges, critical_edges, drainage_gdf
    )
    
    return {
        "success": success,
        "suggestions": suggestions if success else [],
        "used_fallback": used_fallback,
        "analysis": analysis,
    }

@app.post("/simulate_edge")
@app.post("/api/simulate/edge")
def simulate_edge(req: EdgeRequest):
    """Simulate blocking a single edge"""
    G = load_graph()
    if not G.has_edge(req.u, req.v):
        raise HTTPException(status_code=404, detail="Edge not found")

    nodes = list(G.nodes())
    if len(nodes) < 2:
        return {"result": "N/A", "risk": "LOW"}
    source, target = nodes[0], nodes[-1]
    base_length = nx.shortest_path_length(G, source, target, weight="traffic_weight")
    H = G.copy()
    if H.has_edge(req.u, req.v):
        for k in list(H[req.u][req.v].keys()):
            H.remove_edge(req.u, req.v, k)
    if H.has_edge(req.v, req.u):
        for k in list(H[req.v][req.u].keys()):
            H.remove_edge(req.v, req.u, k)
    try:
        new_len = nx.shortest_path_length(H, source, target, weight="traffic_weight")
    except nx.NetworkXNoPath:
        return {"result": "Destination unreachable", "risk": "HIGH"}
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
        "risk": risk,
    }
