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
        import google.generativeai as genai
        
        # Clean API key (remove any whitespace)
        api_key = api_key.strip()
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        # Try GenerationConfig import, fallback to dict
        try:
            from google.generativeai.types import GenerationConfig
            gen_config = GenerationConfig(
                response_mime_type="application/json",
                max_output_tokens=200,
            )
        except ImportError:
            # Fallback to dict format
            gen_config = {
                "response_mime_type": "application/json",
                "max_output_tokens": 200,
            }
        
        resp = model.generate_content(
            prompt + user_text.strip()[:500],
            generation_config=gen_config,
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
        return (False, f"Missing google-generativeai package. Run: pip install google-generativeai")
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
                st.session_state["scenario_message"] = ("success", f"{ai_note} Blocked {len(blocked)} roads ({intent.get('road_filter', '?')} near {intent.get('location_type', '?')}).")
            else:
                st.session_state["scenario_message"] = ("error", f"{result} (Tip: Try phrases like 'block minor roads near market' or 'close all roads in ward center')")
        st.rerun()

if st.session_state.get("scenario_message"):
    kind, msg = st.session_state["scenario_message"]
    if kind == "success":
        st.sidebar.success(msg)
    else:
        st.sidebar.error(msg)

st.sidebar.markdown("### 📊 Policy Impact Result")

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
        st.sidebar.metric("Original Distance (Blue)", f"{orig_dist:.0f} m")
        st.sidebar.metric("New Distance (Red)", f"{current_len:.0f} m", delta=f"{pct:.2f}% Penalty", delta_color="inverse")
    else:
        st.sidebar.error("🚨 DESTINATION UNREACHABLE")

st.sidebar.write("---")
st.sidebar.write(f"**Blocked Roads:** {len(st.session_state['blocked_edges'])}")

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
st.sidebar.markdown("### 💡 Policy suggestion")
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