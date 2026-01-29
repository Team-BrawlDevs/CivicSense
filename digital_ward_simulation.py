import osmnx as ox
import networkx as nx
import matplotlib.pyplot as plt
import random

# --------------------------------------------------
# STEP 1: DEFINE LOCATION (Point + Radius)
# --------------------------------------------------
# Center coordinates for Tambaram (near Railway Station)
location_point = (12.9229, 80.1275)

print("Downloading road network (2km radius around Tambaram)...")

# FIX: Use graph_from_point to limit the size to 2000 meters (2km)
G = ox.graph_from_point(location_point, dist=2000, network_type="drive")

# Project to meters
G = ox.projection.project_graph(G)

# Keep largest connected component (prevents errors)
largest_cc = max(nx.strongly_connected_components(G), key=len)
G = G.subgraph(largest_cc).copy()

print("Road network loaded.")
print(f"Total Nodes: {len(G.nodes)}")
print(f"Total Edges: {len(G.edges)}")

# --------------------------------------------------
# STEP 2: ASSIGN TRAFFIC WEIGHTS
# --------------------------------------------------
for u, v, k, data in G.edges(keys=True, data=True):
    data["traffic_weight"] = data["length"]

# --------------------------------------------------
# STEP 3: PICK POINTS & CALCULATE PATH 1
# --------------------------------------------------
nodes = list(G.nodes)
source = random.choice(nodes)
target = random.choice(nodes)

# Ensure source and target are far enough apart (at least 500m) to make it interesting
while source == target or nx.shortest_path_length(G, source, target, weight="length") < 500:
    source = random.choice(nodes)
    target = random.choice(nodes)

try:
    path_before = nx.shortest_path(G, source, target, weight="traffic_weight")
    len_before = nx.shortest_path_length(G, source, target, weight="traffic_weight")
    print(f"\nPath found! Length: {len_before:.2f} meters")
except nx.NetworkXNoPath:
    print("No path found.")
    exit()

# --------------------------------------------------
# STEP 4: SIMULATE POLICY (ROAD CLOSURE)
# --------------------------------------------------
# We will close a road in the middle of the path to force a real detour
# (Closing the start/end node is trivial, closing the middle is harder)
mid_index = len(path_before) // 2
u_closed = path_before[mid_index]
v_closed = path_before[mid_index + 1]

G_closed = G.copy()

# Remove the edge
keys = list(G_closed[u_closed][v_closed].keys())
G_closed.remove_edge(u_closed, v_closed, keys[0])

print(f"!!! ROAD CLOSED: Edge ({u_closed}, {v_closed}) removed !!!")

# --------------------------------------------------
# STEP 5: CALCULATE PATH 2 (AFTER CLOSURE)
# --------------------------------------------------
try:
    path_after = nx.shortest_path(G_closed, source, target, weight="traffic_weight")
    len_after = nx.shortest_path_length(G_closed, source, target, weight="traffic_weight")
except nx.NetworkXNoPath:
    print("Result: The destination is now UNREACHABLE due to the closure.")
    exit()

# --------------------------------------------------
# STEP 6: IMPACT ANALYSIS
# --------------------------------------------------
increase_pct = ((len_after - len_before) / len_before) * 100

print("\n--- POLICY IMPACT RESULT ---")
print(f"Original Distance : {len_before:.2f} m")
print(f"New Distance      : {len_after:.2f} m")
print(f"Detour Penalty    : +{increase_pct:.2f}%")

# --------------------------------------------------
# STEP 7: VISUALIZATION
# --------------------------------------------------
print("\nRendering Comparison Map...")

# FIX: The correct function name is 'plot_graph_routes' inside the 'plot' module
fig, ax = ox.plot.plot_graph_routes(
    G, 
    routes=[path_before, path_after], 
    route_colors=["blue", "red"],
    route_linewidths=4,
    node_size=0,
    show=False,
    close=False
)

ax.set_title(f"Tambaram Traffic Simulation\nDetour: +{increase_pct:.1f}%", color="white")
plt.show()