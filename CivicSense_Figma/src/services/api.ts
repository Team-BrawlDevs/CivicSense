/**
 * API Service for CivicSense Backend
 * Handles all communication with the FastAPI backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[][];
  };
  properties: Record<string, any>;
}

export interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface ScenarioIntent {
  location_type: string;
  radius_m: number;
  road_filter: 'minor' | 'non_primary' | 'all';
  event?: string;
}

export interface PathResult {
  success: boolean;
  path?: number[];
  path_coords?: [number, number][];
  length?: number;
  error?: string;
}

export interface BlockedEdgesResult {
  blocked_edges: [number, number][];
  intent: ScenarioIntent;
  count: number;
}

export interface NodeResult {
  node_id: number;
  coords: [number, number];
}

export interface EdgeResult {
  u: number;
  v: number;
  key: number;
  coords: [number, number][];
}

/**
 * Fetch roads as GeoJSON
 */
export async function fetchRoadsGeoJSON(): Promise<GeoJSONCollection> {
  const response = await fetch(`${API_BASE_URL}/api/roads/geojson`);
  if (!response.ok) {
    throw new Error(`Failed to fetch roads: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch POIs as GeoJSON
 */
export async function fetchPOIsGeoJSON(): Promise<GeoJSONCollection> {
  const response = await fetch(`${API_BASE_URL}/api/pois/geojson`);
  if (!response.ok) {
    throw new Error(`Failed to fetch POIs: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch critical roads as GeoJSON
 */
export async function fetchCriticalRoadsGeoJSON(): Promise<GeoJSONCollection> {
  const response = await fetch(`${API_BASE_URL}/api/critical-roads/geojson`);
  if (!response.ok) {
    throw new Error(`Failed to fetch critical roads: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch drainage features as GeoJSON
 */
export async function fetchDrainageGeoJSON(): Promise<GeoJSONCollection> {
  const response = await fetch(`${API_BASE_URL}/api/drainage/geojson`);
  if (!response.ok) {
    throw new Error(`Failed to fetch drainage: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Parse scenario text into structured intent
 */
export async function parseScenario(
  text: string,
  useLLM: boolean = false
): Promise<{ success: boolean; intent: ScenarioIntent }> {
  const response = await fetch(`${API_BASE_URL}/api/scenario/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, use_llm: useLLM }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to parse scenario: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get blocked edges for a scenario
 */
export async function getBlockedEdges(
  text: string,
  useLLM: boolean = false
): Promise<BlockedEdgesResult> {
  const response = await fetch(`${API_BASE_URL}/api/scenario/blocked-edges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, use_llm: useLLM }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to get blocked edges: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Calculate shortest path with blocked edges
 */
export async function calculatePath(
  startNode: number,
  endNode: number,
  blockedEdges: [number, number][] = []
): Promise<PathResult> {
  const response = await fetch(`${API_BASE_URL}/api/path/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      start_node: startNode,
      end_node: endNode,
      blocked_edges: blockedEdges,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to calculate path: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Find nearest node to coordinates
 */
export async function findNearestNode(
  lat: number,
  lon: number
): Promise<NodeResult> {
  const response = await fetch(`${API_BASE_URL}/api/map/nearest-node`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lat, lon }),
  });

  if (!response.ok) {
    throw new Error(`Failed to find nearest node: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Find nearest edge to coordinates
 */
export async function findNearestEdge(
  lat: number,
  lon: number
): Promise<EdgeResult> {
  const response = await fetch(`${API_BASE_URL}/api/map/nearest-edge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lat, lon }),
  });

  if (!response.ok) {
    throw new Error(`Failed to find nearest edge: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Simulate blocking an edge
 */
export async function simulateEdge(u: number, v: number): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/simulate/edge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ u, v }),
  });

  if (!response.ok) {
    throw new Error(`Failed to simulate edge: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check API health
 */
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.ok;
  } catch {
    return false;
  }
}
