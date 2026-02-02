import streamlit as st
import osmnx as ox
import networkx as nx
import folium
from streamlit_folium import st_folium
from shapely.geometry import LineString, Point
import geopandas as gpd

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------
st.set_page_config(layout="wide", page_title="Digital Ward: Traffic Sim")

# Tambaram ward: center (lat, lon) and radius in metres
TAMBARAM_CENTER = (12.9229, 80.1275)
TAMBARAM_RADIUS_M = 2000
TOP_CRITICAL_ROADS = 10  # Policy suggestion: number of "critical" links to show

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


with st.spinner("Loading Digital Ward Map (Tambaram)..."):
    G = load_graph()
    pois_gdf = load_pois()
    critical_edges = load_critical_edges()

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
    st.rerun()

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
