import { Fragment, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { LatLngExpression } from 'leaflet';
import FullscreenMap from './FullscreenMap';

// Use DivIcon to avoid bundling marker images
const DustbinIcon = (status: Dustbin['status'] | undefined, selected: boolean, urgent?: boolean) => {
  let baseColor = '#16a34a'; // active
  if (status === 'maintenance') baseColor = '#f59e0b';
  if (status === 'full') baseColor = '#dc2626';
  if (status === 'inactive') baseColor = '#6b7280';
  if (urgent) baseColor = '#b91c1c';

  const size = selected ? 36 : 28;
  return L.divIcon({
    className: 'dustbin-icon',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:8px;background:${baseColor};color:white;font-weight:bold;box-shadow:0 6px 18px rgba(0,0,0,.2)">🗑️</div>`,
    iconSize: [size, size]
  });
};

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

export type Dustbin = {
  _id: string;
  name: string;
  type?: string;
  sector?: string;
  coordinates: { lat: number; lng: number };
  status?: 'active' | 'inactive' | 'maintenance' | 'full';
  urgent?: boolean;
  fillLevel?: number;
  photoBase64?: string;
  initialPhotoBase64?: string;
};

interface Props {
  userLocation: { lat: number; lng: number } | null;
  dustbins: Dustbin[];
  onSelect?: (bin: Dustbin | null) => void;
}

function FitToContent({ userLocation, dustbins }: { userLocation: { lat: number; lng: number } | null; dustbins: Dustbin[] }) {
  const map = useMap();
  useEffect(() => {
    const points: LatLngExpression[] = [];
    if (userLocation) points.push([userLocation.lat, userLocation.lng]);
    dustbins.forEach(b => points.push([b.coordinates.lat, b.coordinates.lng]));
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points as [number, number][]);
    map.fitBounds(bounds.pad(0.2));
  }, [map, userLocation, dustbins]);
  return null;
}

export default function DustbinMap({ userLocation, dustbins, onSelect }: Props) {
  const [selected, setSelected] = useState<Dustbin | null>(null);
  const [route, setRoute] = useState<LatLngExpression[] | null>(null);
  const [routeMeta, setRouteMeta] = useState<{ distanceM: number; durationS: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  function haversine(a: {lat:number;lng:number}, b: {lat:number;lng:number}) {
    const R = 6371e3;
    const toRad = (x: number) => x * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const s = Math.sin(dLat/2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    return R * c; // meters
  }

  // Fetch walking route via OSRM when a dustbin is selected
  useEffect(() => {
    const fetchRoute = async () => {
      if (!userLocation || !selected) { setRoute(null); return; }
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
    if (dustbins[0]) return [dustbins[0].coordinates.lat, dustbins[0].coordinates.lng];
    return [20.5937, 78.9629]; // India centroid as fallback
  }, [userLocation, dustbins]);

  // To avoid multiple markers sitting exactly on top of each other when
  // different dustbins share the same coordinates, apply a small visual
  // offset per dustbin in each coordinate group. This does not change
  // their actual stored coordinates or routing calculations.
  const coordUsage = useMemo(() => {
    const counts = new Map<string, number>();
    dustbins.forEach(bin => {
      const key = `${bin.coordinates.lat.toFixed(5)},${bin.coordinates.lng.toFixed(5)}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [dustbins]);

  const coordIndex = new Map<string, number>();

  return (
    <FullscreenMap isFullscreen={isFullscreen} onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}>
      <MapContainer center={center} zoom={14} style={{ width: '100%', height: '100%' }} scrollWheelZoom={true} {...({ center } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          {...({ attribution: '&copy; OpenStreetMap contributors' } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
        />

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={UserIcon as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          {...({ icon: UserIcon } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
          >
            <Popup>You're here</Popup>
          </Marker>
        )}

        {dustbins.map((bin) => {
          const baseLat = bin.coordinates.lat;
          const baseLng = bin.coordinates.lng;
          const key = `${baseLat.toFixed(5)},${baseLng.toFixed(5)}`;
          const groupCount = coordUsage.get(key) || 1;
          const usedSoFar = coordIndex.get(key) || 0;
          coordIndex.set(key, usedSoFar + 1);

          let markerLat = baseLat;
          let markerLng = baseLng;

          if (groupCount > 1) {
            // Spread markers around the true coordinate in a small circle
            const radius = 0.00018; // ~20m visual radius
            const angle = (2 * Math.PI * usedSoFar) / groupCount;
            markerLat = baseLat + radius * Math.cos(angle);
            markerLng = baseLng + radius * Math.sin(angle);
          }

          const distanceLabel = userLocation 
            ? `${(haversine(userLocation, bin.coordinates)/1000).toFixed(2)} km`
            : '';
          const googleUrl = userLocation 
            ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${bin.coordinates.lat},${bin.coordinates.lng}&travelmode=walking`
            : `https://www.google.com/maps/search/?api=1&query=${bin.coordinates.lat},${bin.coordinates.lng}`;
          const appleUrl = userLocation
            ? `https://maps.apple.com/?saddr=${userLocation.lat},${userLocation.lng}&daddr=${bin.coordinates.lat},${bin.coordinates.lng}&dirflg=w`
            : `https://maps.apple.com/?daddr=${bin.coordinates.lat},${bin.coordinates.lng}`;

          return (
            <Fragment key={bin._id}>
              <Marker 
                position={[markerLat, markerLng]}
                icon={DustbinIcon(bin.status, selected?._id === bin._id, bin.urgent) as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                {...({ icon: DustbinIcon(bin.status, selected?._id === bin._id, bin.urgent) } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
                eventHandlers={{ click: () => setSelected(bin) }}
              >
                <Popup>
                  <div style={{ minWidth: 220 }}>
                    <strong>{bin.name}</strong>
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Type: {bin.type || 'mixed'}</div>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      Status: <span style={{ fontWeight: 600 }}>
                        {bin.urgent ? 'Urgent' : (bin.status ? bin.status.charAt(0).toUpperCase() + bin.status.slice(1) : 'Unknown')}
                      </span>
                    </div>
                    {routeMeta && selected?._id === bin._id && (
                      <div style={{ fontSize: 12, marginBottom: 8 }}>
                        Route: {(routeMeta.distanceM/1000).toFixed(2)} km • {Math.round(routeMeta.durationS/60)} min
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {userLocation && (
                        <button
                          onClick={() => setSelected(bin)}
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
                  position={[markerLat, markerLng]} 
                  icon={DistanceIcon(distanceLabel) as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                  {...({ icon: DistanceIcon(distanceLabel) } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
                  interactive={false} 
                />
              )}
            </Fragment>
          );
        })}

        {route && (
          <>
            <Polyline positions={route} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.8 }} />
            {userLocation && <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={6} pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 1 }} {...({ radius: 6 } as any)} />} {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
            {selected && <CircleMarker center={[selected.coordinates.lat, selected.coordinates.lng]} radius={6} pathOptions={{ color: '#92400e', fillColor: '#f59e0b', fillOpacity: 1 }} {...({ radius: 6 } as any)} />} {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
          </>
        )}

        <FitToContent userLocation={userLocation} dustbins={dustbins} />
      </MapContainer>
    </FullscreenMap>
  );
}
