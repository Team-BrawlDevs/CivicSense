/**
 * RoadMapView - Exact replica of frontend/index.html map behavior
 * - Roads: blue, weight 8
 * - Hover: orange
 * - Click: red, block road, call simulate API
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJSONCollection } from '../services/api';
import { simulateEdge } from '../services/api';

interface RoadMapViewProps {
  roadsGeoJSON?: GeoJSONCollection | null;
  onSimulationResult?: (result: unknown) => void;
}

export function RoadMapView({ roadsGeoJSON, onSimulationResult }: RoadMapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const roadsLayerRef = useRef<L.GeoJSON | null>(null);
  const blockedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [12.9229, 80.1275],
      zoom: 14,
      minZoom: 14,
      maxZoom: 19,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      roadsLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !roadsGeoJSON) return;

    if (roadsLayerRef.current) {
      mapRef.current.removeLayer(roadsLayerRef.current);
    }
    blockedKeysRef.current.clear();

    const roadsLayer = L.geoJSON(roadsGeoJSON as any, {
      style: {
        color: '#0066ff',
        weight: 8,
        opacity: 1,
      },
      interactive: true,
      onEachFeature: (feature: any, layer: L.Layer) => {
        const pathLayer = layer as L.Path;
        const props = feature.properties as { u?: number; v?: number } | undefined;
        const key = props ? `${props.u}-${props.v}` : '';

        pathLayer.on('mouseover', () => {
          if (!blockedKeysRef.current.has(key)) {
            pathLayer.setStyle({ color: 'orange' });
          }
          const el = (pathLayer as any)._path;
          if (el) el.style.cursor = 'pointer';
        });

        pathLayer.on('mouseout', () => {
          if (!blockedKeysRef.current.has(key)) {
            pathLayer.setStyle({ color: '#0066ff' });
          }
        });

        pathLayer.on('click', () => {
          if (!props?.u || props?.v === undefined) return;

          blockedKeysRef.current.add(key);
          pathLayer.setStyle({ color: 'red', weight: 8 });

          simulateEdge(props.u, props.v)
            .then((data) => onSimulationResult?.(data))
            .catch((err) => onSimulationResult?.({ error: String(err) }));
        });
      },
    });

    roadsLayer.addTo(mapRef.current);
    roadsLayerRef.current = roadsLayer;
  }, [roadsGeoJSON, onSimulationResult]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[650px]" />;
}
