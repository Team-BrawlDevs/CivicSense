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
  blocked_road_names?: string[];
  location_name?: string;
  event?: string;
  /** Resolved [lat, lon] for the scenario area (e.g. Chitlapakkam, Selaiyur, Tambaram West) for map centering */
  scenario_center?: [number, number];
}

export interface RiskScores {
  flood_risk: number;
  traffic_risk: number;
  emergency_access_risk: number;
  flood_reason: string;
  traffic_reason: string;
  emergency_reason: string;
}

export interface PolicySuggestionsResult {
  success: boolean;
  suggestions: string[];
  used_fallback: boolean;
  analysis: {
    blocked_roads_count: number;
    path_detour_percent: number;
    drainage_coverage: string;
    hotspot_areas: Array<{
      lat: number;
      lon: number;
      blocked_edges: number;
      street_names: string[];
      intersection_label?: string;
    }>;
    bottleneck_roads: Array<{
      lat: number;
      lon: number;
      u: number;
      v: number;
      street_name?: string;
      intersection_label?: string;
    }>;
    streets_without_drainage: Array<{
      name: string;
      highway_type: string;
    }>;
  };
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
 * Fetch roads as GeoJSON (supports /api/roads/geojson and legacy /roads_geojson)
 */
export async function fetchRoadsGeoJSON(): Promise<GeoJSONCollection> {
  for (const path of [`${API_BASE_URL}/api/roads/geojson`, `${API_BASE_URL}/roads_geojson`]) {
    try {
      const response = await fetch(path);
      if (response.ok) return response.json();
    } catch {
      continue;
    }
  }
  throw new Error('Failed to fetch roads');
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
 * Simulate blocking an edge (supports /api/simulate/edge and legacy /simulate_edge)
 */
export async function simulateEdge(u: number, v: number): Promise<any> {
  for (const path of [`${API_BASE_URL}/api/simulate/edge`, `${API_BASE_URL}/simulate_edge`]) {
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ u, v }),
      });
      if (response.ok) return response.json();
    } catch {
      continue;
    }
  }
  throw new Error('Failed to simulate edge');
}

/**
 * Compute risk scores for current simulation state
 */
export async function computeRiskScores(
  blockedEdges: [number, number][] = [],
  pathDetourPercent: number = 0
): Promise<RiskScores> {
  const response = await fetch(`${API_BASE_URL}/api/risk-scores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      blocked_edges: blockedEdges,
      path_detour_percent: pathDetourPercent,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to compute risk scores: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate policy suggestions based on simulation analysis.
 * areaName: optional focus area (e.g. Chitlapakkam, Selaiyur, Tambaram West) for area-specific suggestions.
 */
export async function getPolicySuggestions(
  blockedEdges: [number, number][] = [],
  areaName?: string | null
): Promise<PolicySuggestionsResult> {
  const response = await fetch(`${API_BASE_URL}/api/policy-suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      blocked_edges: blockedEdges,
      start_node: null,
      end_node: null,
      original_path: null,
      original_length: 0,
      current_path: null,
      current_length: 0,
      area_name: areaName ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get policy suggestions: ${response.statusText}`);
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
