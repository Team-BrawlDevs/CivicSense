import streamlit as st
import osmnx as ox
import networkx as nx
import folium
from streamlit_folium import st_folium
from shapely.geometry import LineString, Point
import geopandas as gpd
import pandas as pd
import json
import math
import os

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------
st.set_page_config(layout="wide", page_title="Digital Ward: Traffic Sim")

# Tambaram ward: center (lat, lon) and radius in metres
TAMBARAM_CENTER = (12.9229, 80.1275)
TAMBARAM_RADIUS_M = 2000
TOP_CRITICAL_ROADS = 10  # Policy suggestion: number of "critical" links to show


def get_gemini_api_key():
    """Get Gemini API key from env (GEMINI_API_KEY or GOOGLE_API_KEY) or from apikey.txt in project root."""
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key and key.strip():
        return key.strip()
    try:
        root = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(root, "apikey.txt")
        if os.path.isfile(path):
            with open(path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        return line.strip()  # Ensure no trailing whitespace
    except Exception:
        pass
    return None

# --------------------------------------------------
# 1. LOAD MAP DATA (Cached) — Roads, POIs, Critical Links
# --------------------------------------------------
@st.cache_resource
def load_graph():
    G = ox.graph_from_point(TAMBARAM_CENTER, dist=TAMBARAM_RADIUS_M, network_type="drive")
    for u, v, k, data in G.edges(keys=True, data=True):
        data["traffic_weight"] = data["length"]
    return G


@st.cache_resource
def load_pois():
    """Load public services (schools, hospitals, etc.) from OpenStreetMap."""
    tags = {
        "amenity": ["school", "hospital", "university", "college", "clinic", "police", "fire_station", "pharmacy"],
        "building": ["school", "hospital", "university", "college"],
    }
    try:
        gdf = ox.features_from_point(TAMBARAM_CENTER, tags=tags, dist=TAMBARAM_RADIUS_M)
        return gdf
    except Exception:
        return gpd.GeoDataFrame()


@st.cache_resource
def load_critical_edges():
    """Policy suggestion: edges with highest betweenness (most critical for traffic flow)."""
    G = load_graph()
    try:
        betweenness = nx.edge_betweenness_centrality(G, weight="traffic_weight")
        sorted_edges = sorted(betweenness.items(), key=lambda x: -x[1])
        top = [edge for (edge, _) in sorted_edges[:TOP_CRITICAL_ROADS]]
        return top  # list of (u, v, k) for MultiGraph
    except Exception:
        return []


@st.cache_resource
def load_location_pois():
    """Load POIs used for text-to-simulation location resolution (market, etc.)."""
    tags = {
        "amenity": ["market", "marketplace", "hospital", "clinic", "school", "university", "college", "police", "fire_station"],
        "building": ["school", "hospital", "university", "college", "retail", "commercial"],
    }
    try:
        gdf = ox.features_from_point(TAMBARAM_CENTER, tags=tags, dist=TAMBARAM_RADIUS_M)
        return gdf
    except Exception:
        return gpd.GeoDataFrame()


@st.cache_resource
def load_drainage():
    """Load drainage and waterway features from OpenStreetMap (drains, ditches, streams, canals)."""
    tags = {
        "waterway": True,  # Get all waterways
        "man_made": ["drainage", "pipeline", "sewer"],
    }
    try:
        gdf = ox.features_from_point(TAMBARAM_CENTER, tags=tags, dist=TAMBARAM_RADIUS_M)
        # Filter to only drainage-related features
        if not gdf.empty:
            # Keep rows that have waterway tags or are drainage-related
            mask = gdf.get("waterway", pd.Series([False] * len(gdf))).notna()
            mask |= gdf.get("man_made", pd.Series([False] * len(gdf))).isin(["drainage", "pipeline", "sewer"])
            gdf = gdf[mask]
        return gdf
    except Exception:
        return gpd.GeoDataFrame()


@st.cache_resource
def generate_synthetic_drainage():
    """
    Generate synthetic drainage layer based on road network patterns.
    Drainage often follows roads, especially minor roads and residential streets.
    """
    G = load_graph()
    drainage_features = []
    
    # Get minor roads (residential, service, etc.) which typically have drainage alongside
    for u, v, k, data in G.edges(keys=True, data=True):
        highway = data.get("highway")
        if highway:
            highway_type = highway[0] if isinstance(highway, list) else highway
            # Focus on minor roads where drainage is most common
            if highway_type in ["residential", "service", "unclassified", "living_street", "tertiary"]:
                if data.get("geometry") is not None:
                    geom = data["geometry"]
                    # Create a parallel line offset slightly (simulating drainage alongside road)
                    # For simplicity, we'll use the road geometry itself but style it differently
                    drainage_features.append({
                        "geometry": geom,
                        "type": "synthetic_drain",
                        "highway_type": highway_type,
                    })
    
    if drainage_features:
        gdf = gpd.GeoDataFrame(drainage_features, crs="EPSG:4326")
        return gdf
    return gpd.GeoDataFrame()


def haversine_m(lat1, lon1, lat2, lon2):
    """Approximate distance in metres between two (lat, lon) points."""
    R = 6371000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_edges_in_radius(graph, center_lat, center_lon, radius_m, max_edges=80):
    """Return list of (u, v) for edges whose midpoint is within radius_m of (center_lat, center_lon). Capped at max_edges, closest first."""
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
    """Return OSM highway tag for edge (u, v), first key. Normalized to string."""
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
    """Return list of unique street names for all edges incident to this node (for intersection labels)."""
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
    """Return list of {name, highway_type} for minor roads (same set as synthetic drainage) — streets where formal drainage is often missing."""
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
    return roads[:15]  # Cap for readability


def get_blocked_road_names(graph, blocked_edges):
    """Return list of unique OSM street names for blocked edges (for scenario summary)."""
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
    """Resolve location_type to an OSM place name (e.g. 'Tambaram Market') for scenario summary."""
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


# OSM highway classification for text-to-simulation
MINOR_HIGHWAY_TYPES = {"residential", "service", "unclassified", "living_street", "tertiary", "secondary", "secondary_link", "tertiary_link"}
PRIMARY_HIGHWAY_TYPES = {"motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link"}


def filter_edges_by_road_type(graph, edge_tuples, road_filter):
    """Filter edge_tuples to those matching road_filter: 'minor' | 'non_primary' | 'all'."""
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
    """Resolve location_type to (lat, lon). Falls back to TAMBARAM_CENTER if not found."""
    if location_type == "ward_center":
        return TAMBARAM_CENTER
    if location_pois_gdf.empty:
        return TAMBARAM_CENTER
    # Map location_type to OSM tags / building types
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
    """
    Simple keyword-based parser (no API needed) for common scenarios.
    Returns (success: bool, result_or_error: dict|str).
    """
    text = user_text.lower().strip()
    if not text:
        return (False, "Empty input")
    
    # Extract location type
    location_type = "ward_center"  # default
    if any(word in text for word in ["market", "shopping", "commercial"]):
        location_type = "market"
    elif any(word in text for word in ["hospital", "clinic", "medical"]):
        location_type = "hospital"
    elif any(word in text for word in ["school", "university", "college", "education"]):
        location_type = "school"
    elif any(word in text for word in ["ward", "center", "centre", "area"]):
        location_type = "ward_center"
    
    # Extract radius
    radius_m = 400  # default for "near"
    if any(word in text for word in ["near", "close", "around", "surrounding"]):
        radius_m = 400
    elif any(word in text for word in ["whole", "entire", "all", "full", "complete"]):
        radius_m = 1500
    elif any(word in text for word in ["within", "inside"]):
        radius_m = 600
    
    # Extract road filter
    road_filter = "minor"  # default
    if any(word in text for word in ["all", "every", "entire", "complete"]):
        road_filter = "all"
    elif any(word in text for word in ["non-primary", "non primary", "secondary", "tertiary"]):
        road_filter = "non_primary"
    elif any(word in text for word in ["minor", "small", "residential", "local", "side"]):
        road_filter = "minor"
    
    # Extract event type (optional)
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
    """
    Use Gemini to parse natural language into structured intent.
    Returns (success: bool, result_or_error: dict|str).
    If success=True, result_or_error is the intent dict.
    If success=False, result_or_error is an error message string.
    """
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
        
        # Strip optional markdown code block
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


def compute_risk_scores(graph, blocked_edges, critical_edges, drainage_gdf, synthetic_drainage_gdf,
                       pois_gdf, path_detour_percent=0):
    """
    Compute flood, traffic, and emergency access risk scores (0–100, higher = worse).
    Returns dict with flood_risk, traffic_risk, emergency_access_risk and optional brief reasons.
    """
    scores = {"flood_risk": 0, "traffic_risk": 0, "emergency_access_risk": 0,
              "flood_reason": "", "traffic_reason": "", "emergency_reason": ""}

    # ---- Flood risk: drainage coverage + extent of roads without formal drainage ----
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

    # ---- Traffic risk: blocked roads, detour impact, critical bottlenecks ----
    n_blocked = len(blocked_edges)
    blocked_set = set((min(u, v), max(u, v)) for (u, v) in blocked_edges)
    n_bottlenecks = sum(1 for e in critical_edges[:15]
                        if (min(e[0], e[1]), max(e[0], e[1])) in blocked_set)
    # Base from blocked count (cap contribution)
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

    # ---- Emergency access risk: reachability of hospitals from ward center with blocked edges ----
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
        # No POIs: use distance from center as proxy (longer = higher risk if many blocks)
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
            # All reachable; risk from distance and blocked count
            scores["emergency_access_risk"] = min(100, int(15 + max_dist / 100 + n_blocked * 2))
            scores["emergency_reason"] = "Emergency POIs reachable; risk from extra distance and blocks."

    return scores


def scenario_intent_to_blocked_edges(graph, intent, location_pois_gdf):
    """Convert LLM intent dict to list of (u, v) blocked edges."""
    if not intent:
        return []
    lat, lon = resolve_location_center(intent.get("location_type", "ward_center"), location_pois_gdf)
    radius_m = intent.get("radius_m", 400)
    road_filter = intent.get("road_filter", "minor")
    edges_in_radius = get_edges_in_radius(graph, lat, lon, radius_m)
    blocked = filter_edges_by_road_type(graph, edges_in_radius, road_filter)
    # Deduplicate (u,v) and (v,u) by normalizing to (min,u,v) then take (u,v) - we store (u,v) and remove both directions in solve_path
    seen = set()
    unique = []
    for (u, v) in blocked:
        key = (min(u, v), max(u, v))
        if key not in seen:
            seen.add(key)
            unique.append((u, v))
    return unique


def analyze_simulation_state(graph, blocked_edges, critical_edges, drainage_gdf, synthetic_drainage_gdf, 
                             start_node, end_node, original_path, original_len, current_path, current_len):
    """
    Analyze current simulation state to gather data for policy suggestions.
    Returns a dictionary with analysis metrics.
    """
    analysis = {
        "blocked_roads_count": len(blocked_edges),
        "critical_roads_count": len(critical_edges),
        "has_path": current_path is not None,
        "path_detour_percent": 0,
        "drainage_coverage": "unknown",
        "hotspot_areas": [],
        "bottleneck_roads": [],
    }
    
    # Calculate detour percentage
    if original_path and current_path and original_len > 0:
        analysis["path_detour_percent"] = ((current_len - original_len) / original_len) * 100
    
    # Analyze drainage coverage
    total_drainage = len(drainage_gdf) if not drainage_gdf.empty else 0
    synthetic_drainage = len(synthetic_drainage_gdf) if not synthetic_drainage_gdf.empty else 0
    if total_drainage > 0:
        analysis["drainage_coverage"] = "good"
    elif synthetic_drainage > 0:
        analysis["drainage_coverage"] = "synthetic_only"
    else:
        analysis["drainage_coverage"] = "poor"
    
    # Identify hotspot areas (areas with many blocked roads) + OSM street names for intersection
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
    
    # Identify bottleneck roads (critical roads that are blocked) + OSM names
    blocked_set = set((min(u, v), max(u, v)) for (u, v) in blocked_edges)
    for edge in critical_edges[:10]:
        u, v = edge[0], edge[1]
        key = (min(u, v), max(u, v))
        if key in blocked_set:
            try:
                mid_lat, mid_lon = get_edge_midpoint(u, v)
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
    
    # Streets where formal drainage is missing (minor roads; suggest new drainage)
    if analysis["drainage_coverage"] in ("poor", "synthetic_only"):
        analysis["streets_without_drainage"] = get_minor_roads_without_drainage(graph)
    else:
        analysis["streets_without_drainage"] = []
    
    return analysis


def generate_policy_suggestions_fallback(analysis):
    """
    Generate rule-based, location-specific policy suggestions using OSM street/intersection names.
    Returns a list of suggestion strings.
    """
    suggestions = []

    # Bottlenecks: use exact intersection/street names
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

    # Hotspots: use exact intersection names
    for h in analysis.get("hotspot_areas", [])[:2]:
        label = h.get("intersection_label") or (", ".join(h.get("street_names", [])[:2]) if h.get("street_names") else None)
        if label:
            suggestions.append(
                f"Improve capacity at {label} (e.g. widening, signals, or grade separation) — multiple blocked connections; high impact if upgraded."
            )

    # Drainage: use exact street names where drainage is missing
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

    # Detour impact with generic wording if no specific location yet
    if analysis["path_detour_percent"] > 10 and len(suggestions) < 4:
        suggestions.append(
            f"Widen or add alternate roads in high-detour areas — current detour impact is {analysis['path_detour_percent']:.1f}%; improves redundancy."
        )

    # Default
    if not suggestions:
        suggestions.append(
            "Run more scenarios (block roads, set start/end) to identify specific intersections and streets; then regenerate for location-specific suggestions."
        )

    return suggestions[:5]


def generate_policy_suggestions(analysis, graph, blocked_edges, critical_edges, drainage_gdf):
    """
    Use Gemini API to generate infrastructure policy suggestions. On quota/API errors, falls back to rule-based suggestions.
    Returns (success: bool, suggestions: list[str] | error_message: str, used_fallback: bool).
    """
    api_key = get_gemini_api_key()
    if not api_key:
        # No API key: return rule-based suggestions so feature still works
        return (True, generate_policy_suggestions_fallback(analysis), True)

    # Build context with specific OSM names (streets, intersections) for location-specific suggestions
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
Generate 3–5 specific, actionable infrastructure policy suggestions. Use the EXACT street and intersection names given above (e.g. "Valachery Mudhumalai Salai", "Kamarajar St", "X / Y four-way intersection").
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
            temperature=0.7,
        )

        resp = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=config,
        )
        text = (resp.text or "").strip()
        if not text:
            return (False, "Empty response from API")
        
        # Strip optional markdown code block
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        
        suggestions = json.loads(text)
        if isinstance(suggestions, list) and all(isinstance(s, str) for s in suggestions):
            return (True, suggestions, False)
        else:
            # Invalid format: use fallback
            return (True, generate_policy_suggestions_fallback(analysis), True)

    except json.JSONDecodeError:
        # API returned non-JSON: use fallback
        return (True, generate_policy_suggestions_fallback(analysis), True)
    except ImportError:
        # No package: use fallback so feature still works
        return (True, generate_policy_suggestions_fallback(analysis), True)
    except Exception as e:
        error_msg = str(e)
        # On quota (429) or other API errors: use rule-based fallback so user still gets suggestions
        if "429" in error_msg or "quota" in error_msg.lower() or "RESOURCE_EXHAUSTED" in error_msg:
            return (True, generate_policy_suggestions_fallback(analysis), True)
        # Other errors: still try fallback
        return (True, generate_policy_suggestions_fallback(analysis), True)


with st.spinner("Loading Digital Ward Map (Tambaram)..."):
    G = load_graph()
    pois_gdf = load_pois()
    critical_edges = load_critical_edges()
    location_pois_gdf = load_location_pois()
    drainage_gdf = load_drainage()
    synthetic_drainage_gdf = generate_synthetic_drainage()

# --------------------------------------------------
# 2. SESSION STATE MANAGEMENT
# --------------------------------------------------
if "start_node" not in st.session_state:
    st.session_state["start_node"] = None
if "end_node" not in st.session_state:
    st.session_state["end_node"] = None
if "blocked_edges" not in st.session_state:
    st.session_state["blocked_edges"] = [] 

# To visualize the "snap" offset
if "click_history" not in st.session_state:
    # Stores tuples of (clicked_lat, clicked_lon, type)
    st.session_state["click_history"] = []

# Metrics & Map State
if "original_path" not in st.session_state:
    st.session_state["original_path"] = None
if "original_len" not in st.session_state:
    st.session_state["original_len"] = 0
if "map_center" not in st.session_state:
    st.session_state["map_center"] = list(TAMBARAM_CENTER)
if "map_zoom" not in st.session_state:
    st.session_state["map_zoom"] = 15
if "last_clicked_coords" not in st.session_state:
    st.session_state["last_clicked_coords"] = None
if "show_pois" not in st.session_state:
    st.session_state["show_pois"] = True
if "show_critical_roads" not in st.session_state:
    st.session_state["show_critical_roads"] = True
if "show_drainage" not in st.session_state:
    st.session_state["show_drainage"] = True
if "scenario_message" not in st.session_state:
    st.session_state["scenario_message"] = None  # (kind, text) for success/error after text-to-sim
if "scenario_blocked_road_names" not in st.session_state:
    st.session_state["scenario_blocked_road_names"] = []  # OSM names of blocked roads for display
if "scenario_location_name" not in st.session_state:
    st.session_state["scenario_location_name"] = ""  # Resolved OSM location name
if "scenario_event" not in st.session_state:
    st.session_state["scenario_event"] = ""  # e.g. flash_flood, road_closure
if "policy_suggestions" not in st.session_state:
    st.session_state["policy_suggestions"] = None  # List of policy suggestions
if "policy_analysis" not in st.session_state:
    st.session_state["policy_analysis"] = None  # Analysis data
if "policy_suggestions_used_fallback" not in st.session_state:
    st.session_state["policy_suggestions_used_fallback"] = False  # True when API unavailable, rule-based used

# --------------------------------------------------
# 3. HELPER FUNCTIONS
# --------------------------------------------------
def get_node_coords(node_id):
    return (G.nodes[node_id]['y'], G.nodes[node_id]['x'])

def get_edge_coords(u, v, key=0):
    """Return list of [lat, lon] for drawing an edge (geometry or straight line)."""
    data = G.get_edge_data(u, v).get(key)
    if not data:
        data = G.get_edge_data(u, v).get(list(G[u][v].keys())[0])
    if data and "geometry" in data:
        geom = data["geometry"]
        if hasattr(geom, "xy"):
            return [[y, x] for x, y in zip(geom.xy[0], geom.xy[1])]
        return [[geom.centroid.y, geom.centroid.x]]
    return [list(get_node_coords(u)), list(get_node_coords(v))]


def get_edge_midpoint(u, v):
    """
    Finds the visual center of an edge. 
    If the edge is curved (has geometry), picks the middle point on the curve.
    Otherwise, picks the straight-line average.
    """
    data = G.get_edge_data(u, v)[0]  # Get first key
    if "geometry" in data:
        # If road has detailed shape, use it
        geom = data["geometry"]
        mid_point = geom.interpolate(0.5, normalized=True)
        return (mid_point.y, mid_point.x)
    else:
        # Fallback for straight roads
        p1 = get_node_coords(u)
        p2 = get_node_coords(v)
        return ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)

def solve_path(graph, start, end, blocked_list):
    H = graph.copy()
    for (u, v) in blocked_list:
        if H.has_edge(u, v):
            keys = list(H[u][v].keys())
            for k in keys: H.remove_edge(u, v, k)
        if H.has_edge(v, u):
            keys = list(H[v][u].keys())
            for k in keys: H.remove_edge(v, u, k)
            
    try:
        path = nx.shortest_path(H, start, end, weight="traffic_weight")
        length = nx.shortest_path_length(H, start, end, weight="traffic_weight")
        return path, length
    except nx.NetworkXNoPath:
        return None, None

# --------------------------------------------------
# 4. SIDEBAR
# --------------------------------------------------
st.sidebar.title("🚧 Traffic Control")
st.sidebar.markdown("---")

if st.sidebar.button("Reset Simulation", type="primary"):
    st.session_state["start_node"] = None
    st.session_state["end_node"] = None
    st.session_state["blocked_edges"] = []
    st.session_state["click_history"] = []
    st.session_state["original_path"] = None
    st.session_state["original_len"] = 0
    st.session_state["last_clicked_coords"] = None
    st.session_state["scenario_message"] = None
    st.session_state["scenario_blocked_road_names"] = []
    st.session_state["scenario_location_name"] = ""
    st.session_state["scenario_event"] = ""
    st.rerun()

st.sidebar.markdown("### 🤖 Text-to-Simulation")
st.sidebar.caption("Works with keywords (no API needed) or AI (if quota available)")
scenario_text = st.sidebar.text_area(
    "Describe a scenario in plain language",
    placeholder='e.g. "Simulate a flash flood near the market area that blocks all minor roads."',
    height=80,
    key="scenario_input",
    help="Examples: 'block minor roads near market', 'close all roads in ward center', 'flash flood around hospital'",
)
if st.sidebar.button("Run scenario", key="run_scenario"):
    st.session_state["scenario_message"] = None
    if not scenario_text or not scenario_text.strip():
        st.session_state["scenario_message"] = ("error", "Please enter a scenario description.")
    else:
        with st.sidebar.spinner("Interpreting scenario..."):
            # Use keyword parser (always works, no API needed)
            # Optionally enhance with LLM if available and quota allows
            success, result = parse_scenario_with_keywords(scenario_text)
            
            if success:
                intent = result
                # Try to enhance with LLM if API key available (optional, may fail due to quota)
                api_key = get_gemini_api_key()
                if api_key:
                    llm_success, llm_result = parse_scenario_with_llm(scenario_text)
                    if llm_success:
                        # Use LLM result if available (more accurate)
                        intent = llm_result
                        ai_note = "✨ AI"
                    else:
                        # LLM failed (quota?), use keyword parser result
                        ai_note = "✓"
                else:
                    ai_note = "✓"
                
                blocked = scenario_intent_to_blocked_edges(G, intent, location_pois_gdf)
                st.session_state["blocked_edges"] = blocked
                # Map to OSM names for specific scenario summary
                blocked_names = get_blocked_road_names(G, blocked)
                location_name = resolve_location_name(intent.get("location_type", "ward_center"), location_pois_gdf)
                event = intent.get("event", "road_closure")
                st.session_state["scenario_blocked_road_names"] = blocked_names
                st.session_state["scenario_location_name"] = location_name
                st.session_state["scenario_event"] = event
                # Build message with specific streets and location
                n = len(blocked)
                if blocked_names:
                    name_list = ", ".join(blocked_names[:5])
                    if len(blocked_names) > 5:
                        name_list += f" and {len(blocked_names) - 5} more"
                    msg = f"{ai_note} Blocked {n} roads near {location_name} ({event.replace('_', ' ')}): {name_list}."
                else:
                    msg = f"{ai_note} Blocked {n} roads near {location_name} ({event.replace('_', ' ')})."
                st.session_state["scenario_message"] = ("success", msg)
            else:
                st.session_state["scenario_message"] = ("error", f"{result} (Tip: Try phrases like 'block minor roads near market' or 'close all roads in ward center')")
        st.rerun()

if st.session_state.get("scenario_message"):
    kind, msg = st.session_state["scenario_message"]
    if kind == "success":
        st.sidebar.success(msg)
        # Show full list of blocked streets (OSM names) in expander
        names = st.session_state.get("scenario_blocked_road_names", [])
        if names:
            with st.sidebar.expander("📋 Blocked streets (OSM)"):
                for name in names:
                    st.caption(f"• {name}")
    else:
        st.sidebar.error(msg)

st.sidebar.markdown("### 📊 Policy Impact Result")

path_detour_pct = 0.0
if st.session_state["end_node"]:
    current_path, current_len = solve_path(
        G, st.session_state["start_node"], st.session_state["end_node"], st.session_state["blocked_edges"]
    )
    
    if st.session_state["original_path"] is None and current_path is not None:
        st.session_state["original_path"] = current_path
        st.session_state["original_len"] = current_len

    orig_dist = st.session_state["original_len"]
    
    if current_path:
        pct = ((current_len - orig_dist) / orig_dist) * 100 if orig_dist > 0 else 0
        path_detour_pct = pct
        st.sidebar.metric("Original Distance (Blue)", f"{orig_dist:.0f} m")
        st.sidebar.metric("New Distance (Red)", f"{current_len:.0f} m", delta=f"{pct:.2f}% Penalty", delta_color="inverse")
    else:
        st.sidebar.error("🚨 DESTINATION UNREACHABLE")

st.sidebar.write("---")
st.sidebar.write(f"**Blocked Roads:** {len(st.session_state['blocked_edges'])}")

# Risk scores (flood, traffic, emergency access)
risk_scores = compute_risk_scores(
    G, st.session_state["blocked_edges"], critical_edges,
    drainage_gdf, synthetic_drainage_gdf, pois_gdf, path_detour_percent=path_detour_pct,
)
st.sidebar.markdown("---")
st.sidebar.markdown("### ⚠️ Risk Scores")
st.sidebar.caption("0 = low risk, 100 = high risk (based on current scenario)")
st.sidebar.metric("🌊 Flood", f"{risk_scores['flood_risk']}")
st.sidebar.metric("🚗 Traffic", f"{risk_scores['traffic_risk']}")
st.sidebar.metric("🚑 Emergency access", f"{risk_scores['emergency_access_risk']}")
with st.sidebar.expander("Why these scores?"):
    st.caption("**Flood:** " + risk_scores["flood_reason"])
    st.caption("**Traffic:** " + risk_scores["traffic_reason"])
    st.caption("**Emergency:** " + risk_scores["emergency_reason"])

st.sidebar.markdown("---")
st.sidebar.markdown("### 🗺️ Data layers (OSM)")
st.session_state["show_pois"] = st.sidebar.checkbox(
    "Public services (schools, hospitals, etc.)",
    value=st.session_state["show_pois"],
    help="From OpenStreetMap",
)
st.session_state["show_critical_roads"] = st.sidebar.checkbox(
    "Suggested critical roads (policy)",
    value=st.session_state["show_critical_roads"],
    help="High betweenness – blocking these has high impact",
)
st.session_state["show_drainage"] = st.sidebar.checkbox(
    "Drainage & waterways",
    value=st.session_state["show_drainage"],
    help="Drains, ditches, streams, and canals from OpenStreetMap",
)
# Show drainage count
drainage_count = len(drainage_gdf) if not drainage_gdf.empty else 0
synthetic_count = len(synthetic_drainage_gdf) if not synthetic_drainage_gdf.empty else 0
if st.session_state["show_drainage"]:
    if drainage_count > 0:
        st.sidebar.caption(f"📊 Found {drainage_count} OSM drainage features")
    if synthetic_count > 0:
        st.sidebar.caption(f"🔧 Showing {synthetic_count} synthetic drainage lines (based on road patterns)")

st.sidebar.markdown("---")
st.sidebar.markdown("### 💡 Infrastructure Policy Suggestions")

# Analyze current state for policy suggestions
current_path = None
current_len = None
if st.session_state["end_node"]:
    current_path, current_len = solve_path(
        G, st.session_state["start_node"], st.session_state["end_node"], st.session_state["blocked_edges"]
    )

# Generate analysis
analysis = analyze_simulation_state(
    G,
    st.session_state["blocked_edges"],
    critical_edges,
    drainage_gdf,
    synthetic_drainage_gdf,
    st.session_state.get("start_node"),
    st.session_state.get("end_node"),
    st.session_state.get("original_path"),
    st.session_state.get("original_len", 0),
    current_path,
    current_len if current_len else 0,
)

# Button to generate/refresh policy suggestions
if st.sidebar.button("🤖 Generate Policy Suggestions", type="secondary"):
    with st.sidebar.spinner("Analyzing infrastructure needs..."):
        success, result, used_fallback = generate_policy_suggestions(
            analysis, G, st.session_state["blocked_edges"], critical_edges, drainage_gdf
        )
        if success:
            st.session_state["policy_suggestions"] = result
            st.session_state["policy_analysis"] = analysis
            st.session_state["policy_suggestions_used_fallback"] = used_fallback
            if used_fallback:
                st.sidebar.success(f"Generated {len(result)} rule-based suggestions (API quota exceeded or unavailable).")
            else:
                st.sidebar.success(f"Generated {len(result)} AI suggestions!")
        else:
            st.sidebar.error(result)
            st.session_state["policy_suggestions"] = None
            st.session_state["policy_suggestions_used_fallback"] = False

# Display policy suggestions
if st.session_state.get("policy_suggestions"):
    if st.session_state.get("policy_suggestions_used_fallback"):
        st.sidebar.caption("📌 Rule-based suggestions (API quota exceeded or unavailable)")
    st.sidebar.markdown("#### 📋 Recommended Infrastructure Projects:")
    suggestions = st.session_state["policy_suggestions"]
    for i, suggestion in enumerate(suggestions[:5], 1):  # Show top 5
        st.sidebar.markdown(f"**{i}.** {suggestion}")
    
    # Show analysis summary
    if st.session_state.get("policy_analysis"):
        analysis = st.session_state["policy_analysis"]
        st.sidebar.markdown("---")
        st.sidebar.markdown("#### 📊 Analysis Summary:")
        st.sidebar.caption(f"• {analysis['blocked_roads_count']} blocked roads")
        st.sidebar.caption(f"• {analysis['path_detour_percent']:.1f}% detour impact")
        st.sidebar.caption(f"• {len(analysis['hotspot_areas'])} hotspot areas")
        st.sidebar.caption(f"• {len(analysis['bottleneck_roads'])} critical bottlenecks")
else:
    st.sidebar.caption("Click 'Generate Policy Suggestions' to get AI or rule-based infrastructure recommendations based on current simulation state.")

st.sidebar.markdown("---")
st.sidebar.markdown("### 🗺️ Critical Roads Info")
st.sidebar.caption(
    "Critical roads are links that carry the most shortest-path traffic. "
    "Blocking them causes the largest detours."
)
st.sidebar.write(f"**Top critical links shown:** {min(TOP_CRITICAL_ROADS, len(critical_edges))}")

# --------------------------------------------------
# 5. MAP CONSTRUCTION
# --------------------------------------------------
# Bounding box for 2 km around Tambaram (restrict map to ward only)
# OSMnx returns (left, bottom, right, top); Folium wants [[south, west], [north, east]]
_west, _south, _east, _north = ox.utils_geo.bbox_from_point(TAMBARAM_CENTER, TAMBARAM_RADIUS_M)
ward_bounds = [[_south, _west], [_north, _east]]

m = folium.Map(
    location=st.session_state["map_center"],
    zoom_start=st.session_state["map_zoom"],
    max_bounds=ward_bounds,
    min_zoom=14,
    max_zoom=18,
)

# Ward boundary: green outline around Tambaram 2 km area
folium.Rectangle(
    bounds=ward_bounds,
    color="green",
    weight=3,
    fill=False,
    tooltip="Tambaram Ward (2 km)",
).add_to(m)

# Suggested critical roads (policy layer) — from OSM road network + betweenness
if st.session_state["show_critical_roads"] and critical_edges:
    for edge in critical_edges:
        u, v, k = edge[0], edge[1], edge[2]
        coords = get_edge_coords(u, v, k)
        if len(coords) >= 2:
            folium.PolyLine(
                coords,
                color="darkorange",
                weight=4,
                opacity=0.8,
                tooltip="Critical link (high impact if blocked)",
            ).add_to(m)

# Public services layer — from OpenStreetMap (schools, hospitals, etc.)
if st.session_state["show_pois"] and not pois_gdf.empty:
    for idx, row in pois_gdf.iterrows():
        geom = row.geometry
        if geom is None:
            continue
        if geom.geom_type == "Point":
            lat, lon = geom.y, geom.x
        else:
            cent = geom.centroid
            lat, lon = cent.y, cent.x
        name = None
        for col in ("name", "amenity", "building"):
            if col in row.index and row[col] is not None and str(row[col]) != "nan":
                name = str(row[col])[:50]
                break
        tooltip = name or "Public service"
        folium.CircleMarker(
            location=[lat, lon],
            radius=6,
            color="purple",
            fill=True,
            fill_color="purple",
            fill_opacity=0.7,
            tooltip=tooltip,
        ).add_to(m)

# Drainage & waterways layer — from OpenStreetMap (drains, ditches, streams, canals)
if st.session_state["show_drainage"]:
    # First, draw OSM drainage features if available
    if not drainage_gdf.empty:
        for idx, row in drainage_gdf.iterrows():
            geom = row.geometry
            if geom is None:
                continue
            
            # Get drainage type for styling
            waterway_type = None
            for col in ("waterway", "man_made", "natural"):
                if col in row.index and row[col] is not None and str(row[col]) != "nan":
                    waterway_type = str(row[col])
                    break
            
            # Determine color and style based on type
            if waterway_type in ["drain", "ditch", "culvert"]:
                color = "teal"
                weight = 3
                opacity = 0.7
            elif waterway_type in ["stream", "river"]:
                color = "blue"
                weight = 4
                opacity = 0.8
            elif waterway_type in ["canal"]:
                color = "cyan"
                weight = 3
                opacity = 0.7
            else:
                color = "lightblue"
                weight = 2
                opacity = 0.6
            
            # Get name/tooltip
            name = None
            for col in ("name", "waterway", "man_made"):
                if col in row.index and row[col] is not None and str(row[col]) != "nan":
                    name = str(row[col])[:50]
                    break
            tooltip = name or (waterway_type or "Drainage")
            
            # Draw based on geometry type
            if geom.geom_type in ["LineString", "MultiLineString"]:
                # Draw as polyline for linear features
                if geom.geom_type == "LineString":
                    coords = [[y, x] for x, y in zip(geom.xy[0], geom.xy[1])]
                else:  # MultiLineString
                    coords = []
                    for line in geom.geoms:
                        coords.extend([[y, x] for x, y in zip(line.xy[0], line.xy[1])])
                
                if len(coords) >= 2:
                    folium.PolyLine(
                        coords,
                        color=color,
                        weight=weight,
                        opacity=opacity,
                        tooltip=tooltip,
                    ).add_to(m)
            elif geom.geom_type == "Point":
                # Draw as marker for point features
                lat, lon = geom.y, geom.x
                folium.CircleMarker(
                    location=[lat, lon],
                    radius=5,
                    color=color,
                    fill=True,
                    fill_color=color,
                    fill_opacity=0.7,
                    tooltip=tooltip,
                ).add_to(m)
            else:
                # For polygons or other geometries, use centroid
                cent = geom.centroid
                lat, lon = cent.y, cent.x
                folium.CircleMarker(
                    location=[lat, lon],
                    radius=5,
                    color=color,
                    fill=True,
                    fill_color=color,
                    fill_opacity=0.7,
                    tooltip=tooltip,
                ).add_to(m)
    
    # Then, draw synthetic drainage based on road patterns (if no OSM data or as supplement)
    if not synthetic_drainage_gdf.empty:
        for idx, row in synthetic_drainage_gdf.iterrows():
            geom = row.geometry
            if geom is None:
                continue
            
            # Draw synthetic drainage as dashed teal lines alongside minor roads
            if geom.geom_type in ["LineString", "MultiLineString"]:
                if geom.geom_type == "LineString":
                    coords = [[y, x] for x, y in zip(geom.xy[0], geom.xy[1])]
                else:  # MultiLineString
                    coords = []
                    for line in geom.geoms:
                        coords.extend([[y, x] for x, y in zip(line.xy[0], line.xy[1])])
                
                if len(coords) >= 2:
                    folium.PolyLine(
                        coords,
                        color="teal",
                        weight=2,
                        opacity=0.5,
                        dash_array="5, 5",  # Dashed line to distinguish from roads
                        tooltip=f"Synthetic drainage ({row.get('highway_type', 'road')})",
                    ).add_to(m)

# A. DRAW CLICK FEEDBACK (The small grey dots showing EXACT click)
for (clat, clon, ctype) in st.session_state["click_history"]:
    folium.CircleMarker(
        location=[clat, clon], radius=3, color="gray", fill=True, fill_opacity=0.5
    ).add_to(m)

# B. DRAW START / END
if st.session_state["start_node"]:
    start_pos = get_node_coords(st.session_state["start_node"])
    folium.Marker(start_pos, icon=folium.Icon(color="green", icon="play"), tooltip="Start").add_to(m)

if st.session_state["end_node"]:
    end_pos = get_node_coords(st.session_state["end_node"])
    folium.Marker(end_pos, icon=folium.Icon(color="red", icon="stop"), tooltip="End").add_to(m)

# C. DRAW BLOCKED ROADS (Using geometry-aware midpoint)
for (u, v) in st.session_state["blocked_edges"]:
    mid_lat, mid_lon = get_edge_midpoint(u, v)
    folium.Marker(
        [mid_lat, mid_lon], 
        icon=folium.Icon(color="black", icon="ban", prefix="fa"),
        tooltip="Blocked"
    ).add_to(m)

# D. DRAW PATHS
if st.session_state["original_path"]:
    route_coords = [get_node_coords(node) for node in st.session_state["original_path"]]
    folium.PolyLine(route_coords, color="blue", weight=5, opacity=0.4, tooltip="Original Path").add_to(m)

if st.session_state["end_node"]:
    path_now, _ = solve_path(G, st.session_state["start_node"], st.session_state["end_node"], st.session_state["blocked_edges"])
    if path_now:
        route_coords = [get_node_coords(node) for node in path_now]
        folium.PolyLine(route_coords, color="red", weight=4, opacity=0.8, dash_array='10', tooltip="Detour").add_to(m)

# --------------------------------------------------
# 6. INTERACTION LOOP
# --------------------------------------------------
st.title("Digital Ward Simulator: Tambaram")
# Only rerun on map clicks, not on zoom/pan — keeps map stable and rendering correctly
_zoom = st.session_state["map_zoom"]
if not isinstance(_zoom, int) or _zoom < 14 or _zoom > 18:
    _zoom = 15
_center = st.session_state["map_center"]
output = st_folium(
    m,
    width=1000,
    height=600,
    key="main_map",
    returned_objects=["last_clicked", "last_object_clicked"],
    center=(float(_center[0]), float(_center[1])),
    zoom=int(_zoom),
)

if output:
    # Handle Clicks (zoom/pan no longer trigger rerun, so map stays stable)
    if output["last_clicked"]:
        lat = output["last_clicked"]["lat"]
        lng = output["last_clicked"]["lng"]
        current_click = (lat, lng)
        
        if current_click != st.session_state["last_clicked_coords"]:
            st.session_state["last_clicked_coords"] = current_click
            
            # Logic
            if st.session_state["start_node"] is None:
                st.session_state["start_node"] = ox.nearest_nodes(G, lng, lat)
                st.session_state["click_history"].append((lat, lng, "start"))
                st.rerun()
            elif st.session_state["end_node"] is None:
                st.session_state["end_node"] = ox.nearest_nodes(G, lng, lat)
                st.session_state["click_history"].append((lat, lng, "end"))
                st.rerun()
            else:
                u, v, key = ox.nearest_edges(G, lng, lat)
                if (u, v) not in st.session_state["blocked_edges"]:
                    st.session_state["blocked_edges"].append((u, v))
                    st.rerun()