/**
 * MapView Component - Leaflet map integration for CivicSense
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJSONCollection } from '../services/api';

// Fix for default marker icons in Leaflet with Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  roadsGeoJSON?: GeoJSONCollection;
  poisGeoJSON?: GeoJSONCollection;
  criticalRoadsGeoJSON?: GeoJSONCollection;
  drainageGeoJSON?: GeoJSONCollection;
  blockedEdges?: [number, number][];
  pathCoords?: [number, number][];
  onMapClick?: (lat: number, lon: number) => void;
  center?: [number, number];
  zoom?: number;
}

export function MapView({
  roadsGeoJSON,
  poisGeoJSON,
  criticalRoadsGeoJSON,
  drainageGeoJSON,
  blockedEdges = [],
  pathCoords,
  onMapClick,
  center = [12.9229, 80.1275],
  zoom = 15,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<{
    roads?: L.GeoJSON;
    pois?: L.GeoJSON;
    critical?: L.GeoJSON;
    drainage?: L.GeoJSON;
    blocked?: L.LayerGroup;
    path?: L.Polyline;
  }>({});

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      minZoom: 14,
      maxZoom: 18,
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    // Handle map clicks
    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map center/zoom
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Add roads layer
  useEffect(() => {
    if (!mapRef.current || !roadsGeoJSON) return;

    // Remove existing roads layer
    if (layersRef.current.roads) {
      mapRef.current.removeLayer(layersRef.current.roads);
    }

    const roadsLayer = L.geoJSON(roadsGeoJSON as any, {
      style: {
        color: '#0066ff',
        weight: 3,
        opacity: 0.8,
      },
      interactive: true,
    });

    roadsLayer.addTo(mapRef.current);
    layersRef.current.roads = roadsLayer;
  }, [roadsGeoJSON]);

  // Add POIs layer
  useEffect(() => {
    if (!mapRef.current || !poisGeoJSON) return;

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
  }, [poisGeoJSON]);

  // Add critical roads layer
  useEffect(() => {
    if (!mapRef.current || !criticalRoadsGeoJSON) return;

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
  }, [criticalRoadsGeoJSON]);

  // Add drainage layer
  useEffect(() => {
    if (!mapRef.current || !drainageGeoJSON) return;

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
  }, [drainageGeoJSON]);

  // Add blocked edges markers
  useEffect(() => {
    if (!mapRef.current) return;

    if (layersRef.current.blocked) {
      mapRef.current.removeLayer(layersRef.current.blocked);
    }

    const blockedGroup = L.layerGroup();
    
    // Note: We need edge coordinates from the backend to show blocked edges
    // For now, this is a placeholder
    blockedEdges.forEach(([u, v]) => {
      // In a real implementation, you'd fetch edge coordinates
      // and add markers at edge midpoints
    });

    blockedGroup.addTo(mapRef.current);
    layersRef.current.blocked = blockedGroup;
  }, [blockedEdges]);

  // Add path polyline
  useEffect(() => {
    if (!mapRef.current) return;

    if (layersRef.current.path) {
      mapRef.current.removeLayer(layersRef.current.path);
    }

    if (pathCoords && pathCoords.length > 0) {
      const pathPolyline = L.polyline(pathCoords as [number, number][], {
        color: 'red',
        weight: 4,
        opacity: 0.8,
        dashArray: '10',
      });

      pathPolyline.addTo(mapRef.current);
      layersRef.current.path = pathPolyline;
    }
  }, [pathCoords]);

  return <div ref={mapContainerRef} className="w-full h-full" />;
}
