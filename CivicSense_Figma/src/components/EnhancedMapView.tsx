/**
 * EnhancedMapView - Combines all Streamlit features:
 * - Click roads to block them (index.html style)
 * - Click map to set start/end points for route simulation
 * - Show paths, markers, blocked edges
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
  startNode?: number | null;
  endNode?: number | null;
  startCoords?: [number, number] | null;
  endCoords?: [number, number] | null;
  originalPathCoords?: [number, number][];
  newPathCoords?: [number, number][];
  showPOIs?: boolean;
  showCriticalRoads?: boolean;
  showDrainage?: boolean;
  onRoadClick?: (u: number, v: number) => void;
  onMapClick?: (lat: number, lon: number) => void;
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
  startNode,
  endNode,
  startCoords,
  endCoords,
  originalPathCoords,
  newPathCoords,
  showPOIs = true,
  showCriticalRoads = true,
  showDrainage = true,
  onRoadClick,
  onMapClick,
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
    startMarker?: L.Marker;
    endMarker?: L.Marker;
    originalPath?: L.Polyline;
    newPath?: L.Polyline;
  }>({});
  const blockedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      minZoom: 14,
      maxZoom: 19,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

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
          color: isBlocked ? 'red' : '#0066ff',
          weight: isBlocked ? 8 : 8,
          opacity: 1,
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
            pathLayer.setStyle({ color: 'orange' });
            const el = (pathLayer as any)._path;
            if (el) el.style.cursor = 'pointer';
          });

          pathLayer.on('mouseout', () => {
            pathLayer.setStyle({ color: '#0066ff' });
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

  // Add start marker
  useEffect(() => {
    if (!mapRef.current) return;

    if (layersRef.current.startMarker) {
      mapRef.current.removeLayer(layersRef.current.startMarker);
    }

    if (startCoords) {
      const marker = L.marker([startCoords[0], startCoords[1]], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="background-color: green; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).bindTooltip('Start', { permanent: false });
      marker.addTo(mapRef.current);
      layersRef.current.startMarker = marker;
    }
  }, [startCoords]);

  // Add end marker
  useEffect(() => {
    if (!mapRef.current) return;

    if (layersRef.current.endMarker) {
      mapRef.current.removeLayer(layersRef.current.endMarker);
    }

    if (endCoords) {
      const marker = L.marker([endCoords[0], endCoords[1]], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="background-color: red; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).bindTooltip('End', { permanent: false });
      marker.addTo(mapRef.current);
      layersRef.current.endMarker = marker;
    }
  }, [endCoords]);

  // Add original path (blue)
  useEffect(() => {
    if (!mapRef.current) return;

    if (layersRef.current.originalPath) {
      mapRef.current.removeLayer(layersRef.current.originalPath);
    }

    if (originalPathCoords && originalPathCoords.length > 0) {
      const path = L.polyline(originalPathCoords as [number, number][], {
        color: 'blue',
        weight: 5,
        opacity: 0.4,
      }).bindTooltip('Original Path', { permanent: false });
      path.addTo(mapRef.current);
      layersRef.current.originalPath = path;
    }
  }, [originalPathCoords]);

  // Add new path (red, dashed)
  useEffect(() => {
    if (!mapRef.current) return;

    if (layersRef.current.newPath) {
      mapRef.current.removeLayer(layersRef.current.newPath);
    }

    if (newPathCoords && newPathCoords.length > 0) {
      const path = L.polyline(newPathCoords as [number, number][], {
        color: 'red',
        weight: 4,
        opacity: 0.8,
        dashArray: '10',
      }).bindTooltip('Detour', { permanent: false });
      path.addTo(mapRef.current);
      layersRef.current.newPath = path;
    }
  }, [newPathCoords]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[600px]" />;
}
