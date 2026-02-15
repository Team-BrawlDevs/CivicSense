/**
 * EnhancedMapView - Map with road blocking and layers:
 * - Click roads to block them
 * - Show blocked edges, POIs, critical roads, drainage
 * - Toggle layers
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJSONCollection } from '../services/api';
import { simulateEdge } from '../services/api';

interface EnhancedMapViewProps {
  roadsGeoJSON?: GeoJSONCollection | null;
  poisGeoJSON?: GeoJSONCollection | null;
  criticalRoadsGeoJSON?: GeoJSONCollection | null;
  drainageGeoJSON?: GeoJSONCollection | null;
  blockedEdges?: [number, number][];
  showPOIs?: boolean;
  showCriticalRoads?: boolean;
  showDrainage?: boolean;
  onRoadClick?: (u: number, v: number) => void;
  onSimulationResult?: (result: unknown) => void;
  center?: [number, number];
  zoom?: number;
}

export function EnhancedMapView({
  roadsGeoJSON,
  poisGeoJSON,
  criticalRoadsGeoJSON,
  drainageGeoJSON,
  blockedEdges = [],
  showPOIs = true,
  showCriticalRoads = true,
  showDrainage = true,
  onRoadClick,
  onSimulationResult,
  center = [12.9229, 80.1275],
  zoom = 15,
}: EnhancedMapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<{
    roads?: L.GeoJSON;
    pois?: L.GeoJSON;
    critical?: L.GeoJSON;
    drainage?: L.GeoJSON;
    blocked?: L.LayerGroup;
  }>({});
  const blockedKeysRef = useRef<Set<string>>(new Set());

  // Fixed Tambaram ward center for green boundary (does not follow scenario pan)
  const WARD_BOUNDARY_CENTER: [number, number] = [12.9229, 80.1275];

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      minZoom: 14,
      maxZoom: 18, // match Streamlit map zoom range
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Draw ward boundary rectangle (approx 2 km around Tambaram) in green — always fixed
    const lat = WARD_BOUNDARY_CENTER[0];
    const lon = WARD_BOUNDARY_CENTER[1];
    const latDelta = 0.018;  // ~2 km in latitude
    const lonDelta = 0.0185; // ~2 km in longitude near Tambaram
    const south = lat - latDelta;
    const north = lat + latDelta;
    const west = lon - lonDelta;
    const east = lon + lonDelta;

    L.rectangle(
      [
        [south, west],
        [north, east],
      ],
      {
        color: 'green',
        weight: 3,
        fill: false,
      }
    )
      .bindTooltip('Ward boundary (~2 km)', { permanent: false })
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = {};
      blockedKeysRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Sync blocked keys with blockedEdges prop
  useEffect(() => {
    blockedKeysRef.current.clear();
    blockedEdges.forEach(([u, v]) => {
      blockedKeysRef.current.add(`${u}-${v}`);
    });
  }, [blockedEdges]);

  // Add roads layer with click-to-block
  useEffect(() => {
    if (!mapRef.current || !roadsGeoJSON) return;

    if (layersRef.current.roads) {
      mapRef.current.removeLayer(layersRef.current.roads);
    }

    const roadsLayer = L.geoJSON(roadsGeoJSON as any, {
      style: (feature: any) => {
        const props = feature?.properties;
        const key = props ? `${props.u}-${props.v}` : '';
        const isBlocked = blockedKeysRef.current.has(key) || 
          blockedEdges.some(([u, v]) => u === props?.u && v === props?.v);
        
        return {
          // Show blocked roads strongly, but make base network very subtle
          color: isBlocked ? 'red' : '#d0d7ff',
          weight: isBlocked ? 6 : 2,
          opacity: isBlocked ? 1 : 0.25,
        };
      },
      interactive: true,
      onEachFeature: (feature: any, layer: L.Layer) => {
        const pathLayer = layer as L.Path;
        const props = feature.properties as { u?: number; v?: number } | undefined;
        const key = props ? `${props.u}-${props.v}` : '';
        const isBlocked = blockedKeysRef.current.has(key) || 
          blockedEdges.some(([u, v]) => u === props?.u && v === props?.v);

        if (!isBlocked) {
          pathLayer.on('mouseover', () => {
            pathLayer.setStyle({ color: 'orange', weight: 3, opacity: 0.9 });
            const el = (pathLayer as any)._path;
            if (el) el.style.cursor = 'pointer';
          });

          pathLayer.on('mouseout', () => {
            pathLayer.setStyle({ color: '#d0d7ff', weight: 2, opacity: 0.25 });
          });
        }

        pathLayer.on('click', () => {
          if (!props?.u || props?.v === undefined) return;

          if (!isBlocked) {
            blockedKeysRef.current.add(key);
            pathLayer.setStyle({ color: 'red', weight: 8 });
            onRoadClick?.(props.u, props.v);

            // Also call simulateEdge for single-road simulation result
            simulateEdge(props.u, props.v)
              .then((data) => onSimulationResult?.(data))
              .catch((err) => onSimulationResult?.({ error: String(err) }));
          } else {
            // Road already blocked - still show simulation result
            simulateEdge(props.u, props.v)
              .then((data) => onSimulationResult?.(data))
              .catch((err) => onSimulationResult?.({ error: String(err) }));
          }
        });
      },
    });

    roadsLayer.addTo(mapRef.current);
    layersRef.current.roads = roadsLayer;
  }, [roadsGeoJSON, blockedEdges, onRoadClick, onSimulationResult]);

  // Add POIs layer
  useEffect(() => {
    if (!mapRef.current || !poisGeoJSON || !showPOIs) {
      if (layersRef.current.pois) {
        mapRef.current?.removeLayer(layersRef.current.pois);
        layersRef.current.pois = undefined;
      }
      return;
    }

    if (layersRef.current.pois) {
      mapRef.current.removeLayer(layersRef.current.pois);
    }

    const poisLayer = L.geoJSON(poisGeoJSON as any, {
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 6,
          color: 'purple',
          fillColor: 'purple',
          fillOpacity: 0.7,
        });
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties?.name) {
          layer.bindPopup(feature.properties.name);
        }
      },
    });

    poisLayer.addTo(mapRef.current);
    layersRef.current.pois = poisLayer;
  }, [poisGeoJSON, showPOIs]);

  // Add critical roads layer
  useEffect(() => {
    if (!mapRef.current || !criticalRoadsGeoJSON || !showCriticalRoads) {
      if (layersRef.current.critical) {
        mapRef.current?.removeLayer(layersRef.current.critical);
        layersRef.current.critical = undefined;
      }
      return;
    }

    if (layersRef.current.critical) {
      mapRef.current.removeLayer(layersRef.current.critical);
    }

    const criticalLayer = L.geoJSON(criticalRoadsGeoJSON as any, {
      style: {
        color: 'darkorange',
        weight: 4,
        opacity: 0.8,
      },
    });

    criticalLayer.addTo(mapRef.current);
    layersRef.current.critical = criticalLayer;
  }, [criticalRoadsGeoJSON, showCriticalRoads]);

  // Add drainage layer
  useEffect(() => {
    if (!mapRef.current || !drainageGeoJSON || !showDrainage) {
      if (layersRef.current.drainage) {
        mapRef.current?.removeLayer(layersRef.current.drainage);
        layersRef.current.drainage = undefined;
      }
      return;
    }

    if (layersRef.current.drainage) {
      mapRef.current.removeLayer(layersRef.current.drainage);
    }

    const drainageLayer = L.geoJSON(drainageGeoJSON as any, {
      style: (feature) => {
        const type = feature?.properties?.type;
        if (type === 'synthetic_drainage') {
          return {
            color: 'teal',
            weight: 2,
            opacity: 0.5,
            dashArray: '5, 5',
          };
        }
        return {
          color: 'teal',
          weight: 3,
          opacity: 0.7,
        };
      },
    });

    drainageLayer.addTo(mapRef.current);
    layersRef.current.drainage = drainageLayer;
  }, [drainageGeoJSON, showDrainage]);

  // Contain map stacking so it never paints above app nav (z-[1000])
  return (
    <div className="relative z-0 isolate w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
