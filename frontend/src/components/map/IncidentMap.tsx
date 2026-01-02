import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { LatLngExpression } from 'leaflet';
import FullscreenMap from './FullscreenMap';

const IncidentIcon = (selected: boolean) => L.divIcon({
  className: 'incident-icon',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:${selected ? 36 : 28}px;height:${selected ? 36 : 28}px;border-radius:9999px;background:${selected ? '#ef4444' : '#dc2626'};color:white;font-weight:bold;box-shadow:0 6px 18px rgba(0,0,0,.2)">⚠️</div>`,
  iconSize: [selected ? 36 : 28, selected ? 36 : 28]
});

const UserIcon = L.divIcon({
  className: 'user-icon',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:9999px;background:#2563eb;color:white;box-shadow:0 4px 12px rgba(0,0,0,.2)">•</div>`,
  iconSize: [24, 24]
});

const DistanceIcon = (label: string) => L.divIcon({
  className: 'distance-icon',
  html: `<div style="transform: translateY(-24px); background: rgba(17,24,39,0.9); color: white; padding: 2px 6px; border-radius: 6px; font-size: 12px; box-shadow: 0 6px 18px rgba(0,0,0,.25); white-space: nowrap;">${label}</div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});

export type Incident = {
  _id: string;
  category: string;
  description?: string;
  coordinates: { lat: number; lng: number };
  imageBase64: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  rewarded?: boolean;
};

interface Props {
  userLocation: { lat: number; lng: number } | null;
  incidents: Incident[];
  onSelect?: (incident: Incident | null) => void;
}

function AdaptiveZoom() {
  const map = useMap();
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const container = map.getContainer();

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const now = performance.now();
      const last = lastTimeRef.current;
      lastTimeRef.current = now;

      const deltaTime = last ? now - last : 100;
      const direction = e.deltaY > 0 ? -1 : 1;

      let zoomFactor = 0.05;
      if (deltaTime < 40) zoomFactor = 0.5;
      else if (deltaTime < 80) zoomFactor = 0.25;
      else if (deltaTime < 150) zoomFactor = 0.125;

      map.setZoom(map.getZoom() + direction * zoomFactor, { animate: false });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [map]);

  return null;
}

function FitToContent({ userLocation, incidents }: { userLocation: { lat: number; lng: number } | null; incidents: Incident[] }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (fittedRef.current) return;

    const points: LatLngExpression[] = [];
    if (userLocation) points.push([userLocation.lat, userLocation.lng]);
    incidents.forEach(i => points.push([i.coordinates.lat, i.coordinates.lng]));
    if (points.length === 0) return;

    const bounds = L.latLngBounds(points as [number, number][]);
    map.fitBounds(bounds.pad(0.2), { maxZoom: 19, animate: false });
    fittedRef.current = true;
  }, [map, userLocation, incidents]);

  return null;
}

export default function IncidentMap({ userLocation, incidents, onSelect }: Props) {
  const [selected, setSelected] = useState<Incident | null>(null);
  const [route, setRoute] = useState<LatLngExpression[] | null>(null);
  const [routeMeta, setRouteMeta] = useState<{ distanceM: number; durationS: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371e3;
    const toRad = (x: number) => x * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    return R * c; // meters
  }

  useEffect(() => {
    const fetchRoute = async () => {
      if (!userLocation || !selected) { setRoute(null); setRouteMeta(null); return; }
      const start = `${userLocation.lng},${userLocation.lat}`;
      const end = `${selected.coordinates.lng},${selected.coordinates.lat}`;
      const url = `https://router.project-osrm.org/route/v1/foot/${start};${end}?overview=full&geometries=geojson`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        const coords = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
        if (coords && coords.length) {
          const latlngs: LatLngExpression[] = coords.map(([lng, lat]) => [lat, lng]);
          setRoute(latlngs);
          const distanceM = Number(data?.routes?.[0]?.distance || 0);
          const durationS = Number(data?.routes?.[0]?.duration || 0);
          setRouteMeta({ distanceM, durationS });
        } else {
          setRoute(null);
          setRouteMeta(null);
        }
      } catch {
        setRoute(null);
        setRouteMeta(null);
      }
    };
    fetchRoute();
  }, [userLocation, selected]);

  useEffect(() => { onSelect?.(selected); }, [selected, onSelect]);

  const center = useMemo<LatLngExpression>(() => {
    if (userLocation) return [userLocation.lat, userLocation.lng];
    if (incidents[0]) return [incidents[0].coordinates.lat, incidents[0].coordinates.lng];
    return [20.5937, 78.9629];
  }, [userLocation, incidents]);

  return (
    <FullscreenMap isFullscreen={isFullscreen} onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}>
      <MapContainer
        center={center}
        zoom={19}
        maxZoom={22}
        minZoom={1}
        zoomSnap={0.1}
        zoomDelta={0.1}
        wheelPxPerZoomLevel={40}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
        {...({ center } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={22}
          maxNativeZoom={19}
          {...({ attribution: '&copy; OpenStreetMap contributors' } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
        />

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={UserIcon as any} // eslint-disable-line @typescript-eslint/no-explicit-any
            {...({ icon: UserIcon } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
          >
            <Popup>You're here</Popup>
          </Marker>
        )}

        {incidents.map((i) => {
          const distanceLabel = userLocation
            ? `${(haversine(userLocation, i.coordinates) / 1000).toFixed(2)} km`
            : '';
          const googleUrl = userLocation
            ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${i.coordinates.lat},${i.coordinates.lng}&travelmode=walking`
            : `https://www.google.com/maps/search/?api=1&query=${i.coordinates.lat},${i.coordinates.lng}`;
          const appleUrl = userLocation
            ? `https://maps.apple.com/?saddr=${userLocation.lat},${userLocation.lng}&daddr=${i.coordinates.lat},${i.coordinates.lng}&dirflg=w`
            : `https://maps.apple.com/?daddr=${i.coordinates.lat},${i.coordinates.lng}`;

          return (
            <>
              <Marker
                key={i._id}
                position={[i.coordinates.lat, i.coordinates.lng]}
                icon={IncidentIcon(selected?._id === i._id) as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                {...({ icon: IncidentIcon(selected?._id === i._id) } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
                eventHandlers={{ click: () => setSelected(i) }}
              >
                <Popup>
                  <div style={{ minWidth: 240 }}>
                    <strong style={{ textTransform: 'capitalize' }}>{i.category.replace(/_/g, ' ')}</strong>
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Urgency: {i.urgency}</div>
                    {routeMeta && selected?._id === i._id && (
                      <div style={{ fontSize: 12, marginBottom: 8 }}>
                        Route: {(routeMeta.distanceM / 1000).toFixed(2)} km • {Math.round(routeMeta.durationS / 60)} min
                      </div>
                    )}
                    <div style={{ marginBottom: 8 }}>
                      <img src={i.imageBase64} alt="incident" style={{ maxWidth: '100%', borderRadius: 6 }} />
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>{i.description || 'No description'}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {userLocation && (
                        <button
                          onClick={() => setSelected(i)}
                          style={{ padding: '6px 10px', background: '#2563eb', color: 'white', borderRadius: 6 }}
                        >
                          Show Route
                        </button>
                      )}
                      <a href={googleUrl} target="_blank" rel="noreferrer" style={{ padding: '6px 10px', background: '#1a73e8', color: 'white', borderRadius: 6 }}>
                        Google Maps
                      </a>
                      <a href={appleUrl} target="_blank" rel="noreferrer" style={{ padding: '6px 10px', background: '#0ea5e9', color: 'white', borderRadius: 6 }}>
                        Apple Maps
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
              {userLocation && (
                <Marker
                  key={`${i._id}-distance`}
                  position={[i.coordinates.lat, i.coordinates.lng]}
                  icon={DistanceIcon(distanceLabel) as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                  {...({ icon: DistanceIcon(distanceLabel) } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
                  interactive={false}
                />
              )}
            </>
          );
        })}

        {route && (
          <>
            <Polyline positions={route} pathOptions={{ color: '#ef4444', weight: 5, opacity: 0.85 }} />
            {userLocation && <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={6} pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 1 }} {...({ radius: 6 } as any)} />} {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
            {selected && <CircleMarker center={[selected.coordinates.lat, selected.coordinates.lng]} radius={6} pathOptions={{ color: '#7f1d1d', fillColor: '#dc2626', fillOpacity: 1 }} {...({ radius: 6 } as any)} />} {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
          </>
        )}

        <FitToContent userLocation={userLocation} incidents={incidents} />
        <AdaptiveZoom />
      </MapContainer>
    </FullscreenMap>
  );
}
