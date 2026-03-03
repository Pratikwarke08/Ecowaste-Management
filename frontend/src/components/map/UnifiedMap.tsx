import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup,
  useMap, useMapEvents, Polyline, CircleMarker
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { LatLngExpression } from 'leaflet';
import { Dustbin } from './DustbinMap';
import { Incident } from './IncidentMap';
import FullscreenMap from './FullscreenMap';
import { Loader2, Navigation, X } from 'lucide-react';

// ─── Icons ────────────────────────────────────────────────────────────────────

const makeDustbinIcon = (
  status: Dustbin['status'] | undefined,
  selected: boolean,
  urgent?: boolean
) => {
  let bg = '#16a34a';
  if (status === 'maintenance') bg = '#f59e0b';
  if (status === 'full') bg = '#dc2626';
  if (status === 'inactive') bg = '#6b7280';
  if (urgent) bg = '#b91c1c';
  const size = selected ? 40 : 30;
  const ring = selected ? `box-shadow:0 0 0 3px white,0 0 0 5px ${bg};` : '';
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:10px;background:${bg};color:white;font-size:${selected ? 20 : 16}px;${ring}transition:all .2s">🗑️</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const makeIncidentIcon = (selected: boolean, urgency?: string) => {
  const critical = urgency === 'critical' || urgency === 'high';
  const bg = critical ? '#ef4444' : '#f59e0b';
  const size = selected ? 40 : 30;
  const ring = selected ? `box-shadow:0 0 0 3px white,0 0 0 5px ${bg};` : '';
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:white;font-size:${selected ? 20 : 16}px;${ring}transition:all .2s">⚠️</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const makeUserIcon = () =>
  L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:22px;height:22px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:#4285f4;border:2.5px solid white;box-shadow:0 2px 8px rgba(66,133,244,.5);z-index:2;"></div>
        <div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(66,133,244,.18);animation:gm-pulse 2s ease-out infinite;z-index:1;"></div>
      </div>
      <style>
        @keyframes gm-pulse {
          0%   { transform:scale(0.5); opacity:1; }
          100% { transform:scale(2);   opacity:0; }
        }
      </style>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinA =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sinA), Math.sqrt(1 - sinA));
}

function formatDist(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
}

function formatTime(s: number): string {
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

async function fetchOSRMRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<{ path: LatLngExpression[]; distanceM: number; durationS: number } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
    if (!coords?.length) return null;
    return {
      path: coords.map(([lng, lat]) => [lat, lng] as LatLngExpression),
      distanceM: Number(data.routes[0].distance),
      durationS: Number(data.routes[0].duration),
    };
  } catch {
    return null;
  }
}

// ─── Inner map components ─────────────────────────────────────────────────────

function LocateOnLoad({ userLocation }: { userLocation: { lat: number; lng: number } | null }) {
  const map = useMap();
  const doneRef = useRef(false);
  useEffect(() => {
    if (!userLocation || doneRef.current) return;
    doneRef.current = true;
    map.flyTo([userLocation.lat, userLocation.lng], 17, { animate: true, duration: 1.5 });
  }, [userLocation, map]);
  return null;
}

function LocateMe({ trigger }: { trigger: number }) {
  const map = useMap();
  const prevTrigger = useRef(0);

  useEffect(() => {
    if (trigger === 0 || trigger === prevTrigger.current) return;
    prevTrigger.current = trigger;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 17, { animate: true, duration: 1.5 });
      },
      undefined,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [trigger, map]);

  return null;
}

function FlyToTarget({ target }: { target: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap();
  const prevKey = useRef<string | null>(null);
  useEffect(() => {
    if (!target) return;
    const key = `${target.lat},${target.lng}`;
    if (key === prevKey.current) return;
    prevKey.current = key;
    map.flyTo([target.lat, target.lng], target.zoom ?? 18, { animate: true, duration: 1.2 });
  }, [target, map]);
  return null;
}

function AdaptiveZoom() {
  const map = useMap();
  const lastRef = useRef<number | null>(null);
  useEffect(() => {
    const el = map.getContainer();
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      const dt = lastRef.current ? now - lastRef.current : 100;
      lastRef.current = now;
      const dir = e.deltaY > 0 ? -1 : 1;
      let factor = 0.06;
      if (dt < 40) factor = 0.55;
      else if (dt < 80) factor = 0.28;
      else if (dt < 150) factor = 0.14;
      map.setZoom(map.getZoom() + dir * factor, { animate: false });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [map]);
  return null;
}

function MapClickHandler({
  onMapClick,
  deploymentMode,
}: {
  onMapClick?: (lat: number, lng: number) => void;
  deploymentMode?: boolean;
}) {
  useMapEvents({
    click(e) {
      if (deploymentMode && onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userLocation: { lat: number; lng: number } | null;
  dustbins: Dustbin[];
  incidents: Incident[];
  onDustbinSelect?: (bin: Dustbin | null) => void;
  onIncidentSelect?: (incident: Incident | null) => void;
  onMapClick?: (lat: number, lng: number) => void;
  deploymentMode?: boolean;
  userRole?: 'collector' | 'employee' | null;
  locateTrigger?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UnifiedMap({
  userLocation,
  dustbins,
  incidents,
  onDustbinSelect,
  onIncidentSelect,
  onMapClick,
  deploymentMode,
  userRole,
  locateTrigger,
}: Props) {
  const [selectedDustbin, setSelectedDustbin] = useState<Dustbin | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [route, setRoute] = useState<LatLngExpression[] | null>(null);
  const [routeMeta, setRouteMeta] = useState<{ distanceM: number; durationS: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  const [dustbinImage, setDustbinImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const [panelOpen, setPanelOpen] = useState(false);

  const autoNavigatedRef = useRef(false);

  // Employee: auto-navigate to nearest item once location arrives
  useEffect(() => {
    if (autoNavigatedRef.current) return;
    if (!userLocation) return;
    if (userRole !== 'employee') return;
    if (dustbins.length === 0 && incidents.length === 0) return;

    autoNavigatedRef.current = true;

    type NearestEntry =
      | { item: Dustbin; dist: number; type: 'dustbin' }
      | { item: Incident; dist: number; type: 'incident' };

    let nearest: NearestEntry | null = null;

    dustbins.forEach((bin) => {
      const d = haversine(userLocation, bin.coordinates);
      if (!nearest || d < nearest.dist) nearest = { item: bin, dist: d, type: 'dustbin' };
    });

    incidents.forEach((inc) => {
      const d = haversine(userLocation, inc.coordinates);
      if (!nearest || d < nearest.dist) nearest = { item: inc, dist: d, type: 'incident' };
    });

    if (!nearest) return;

    if (nearest.type === 'dustbin') {
      handleSelectDustbin(nearest.item as Dustbin);
    } else {
      handleSelectIncident(nearest.item as Incident);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, dustbins, incidents, userRole]);

  // ── Select dustbin ──────────────────────────────────────────────────────────
  const handleSelectDustbin = useCallback(
    async (bin: Dustbin) => {
      setSelectedDustbin(bin);
      setSelectedIncident(null);
      setPanelOpen(true);
      onDustbinSelect?.(bin);
      onIncidentSelect?.(null);
      setFlyTarget({ lat: bin.coordinates.lat, lng: bin.coordinates.lng, zoom: 18 });

      // Fetch latest image
      setImageLoading(true);
      setDustbinImage(null);
      let imageSet = false;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/reports/latest-disposal-image?dustbinId=${bin._id}`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.disposalImageBase64) {
            const img: string = data.disposalImageBase64;
            setDustbinImage(img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`);
            imageSet = true;
          }
        }
      } catch {
        // fall through
      }
      if (!imageSet) {
        const fallback: string | undefined =
          (bin as any).photoBase64 || (bin as any).initialPhotoBase64;
        if (fallback) {
          setDustbinImage(fallback.startsWith('data:') ? fallback : `data:image/jpeg;base64,${fallback}`);
        }
      }
      setImageLoading(false);

      // Fetch walking route
      if (userLocation) {
        setRouteLoading(true);
        setRoute(null);
        setRouteMeta(null);
        const r = await fetchOSRMRoute(userLocation, bin.coordinates);
        if (r) {
          setRoute(r.path);
          setRouteMeta({ distanceM: r.distanceM, durationS: r.durationS });
        }
        setRouteLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userLocation, onDustbinSelect, onIncidentSelect]
  );

  // ── Select incident ─────────────────────────────────────────────────────────
  const handleSelectIncident = useCallback(
    async (inc: Incident) => {
      setSelectedIncident(inc);
      setSelectedDustbin(null);
      setPanelOpen(true);
      onIncidentSelect?.(inc);
      onDustbinSelect?.(null);
      setFlyTarget({ lat: inc.coordinates.lat, lng: inc.coordinates.lng, zoom: 18 });

      if (userLocation) {
        setRouteLoading(true);
        setRoute(null);
        setRouteMeta(null);
        const r = await fetchOSRMRoute(userLocation, inc.coordinates);
        if (r) {
          setRoute(r.path);
          setRouteMeta({ distanceM: r.distanceM, durationS: r.durationS });
        }
        setRouteLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userLocation, onIncidentSelect, onDustbinSelect]
  );

  const clearSelection = () => {
    setSelectedDustbin(null);
    setSelectedIncident(null);
    setRoute(null);
    setRouteMeta(null);
    setPanelOpen(false);
    onDustbinSelect?.(null);
    onIncidentSelect?.(null);
  };

  const googleNavUrl = (coords: { lat: number; lng: number }) =>
    userLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${coords.lat},${coords.lng}&travelmode=walking`
      : `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;

  const defaultCenter: LatLngExpression = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [20.5937, 78.9629];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <FullscreenMap isFullscreen={isFullscreen} onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: '0.5rem',
          isolation: 'isolate',
        }}
        className={deploymentMode ? 'cursor-crosshair' : ''}
      >
        {/* Leaflet CSS overrides */}
        <style>{`
          .leaflet-container { font-family: inherit; }
          .leaflet-control-zoom {
            border: none !important;
            box-shadow: 0 2px 10px rgba(0,0,0,.2) !important;
            margin-bottom: 8px !important;
          }
          .leaflet-control-zoom a {
            color: #333 !important;
            width: 32px !important;
            height: 32px !important;
            line-height: 32px !important;
            font-size: 18px !important;
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px !important;
            box-shadow: 0 8px 32px rgba(0,0,0,.18) !important;
            padding: 0 !important;
          }
          .leaflet-popup-content { margin: 0 !important; }
          .leaflet-popup-tip-container { display: none; }
        `}</style>

        <MapContainer
          {...({
            center: defaultCenter,
            zoom: 13,
            maxZoom: 22,
            minZoom: 3,
            zoomSnap: 0.1,
            zoomDelta: 0.5,
            style: { height: '100%', width: '100%' },
            scrollWheelZoom: false,
            zoomControl: true,
          } as any)}
        >
          <TileLayer
            {...({
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
              maxZoom: 22,
              maxNativeZoom: 19,
            } as any)}
          />

          <AdaptiveZoom />
          <LocateOnLoad userLocation={userLocation} />

          <FlyToTarget target={flyTarget} />
          <MapClickHandler onMapClick={onMapClick} deploymentMode={deploymentMode} />
          <LocateMe trigger={locateTrigger ?? 0} />

          {/* User dot */}
          {userLocation && (
            <Marker
              {...({
                position: [userLocation.lat, userLocation.lng] as [number, number],
                icon: makeUserIcon(),
                zIndexOffset: 1000,
              } as any)}
            >
              <Popup>
                <div style={{ padding: '10px 14px', fontWeight: 600, color: '#2563eb' }}>
                  📍 You are here
                </div>
              </Popup>
            </Marker>
          )}

          {/* Dustbin markers */}
          {dustbins.map((bin) => (
            <Marker
              key={bin._id}
              {...({
                position: [bin.coordinates.lat, bin.coordinates.lng] as [number, number],
                icon: makeDustbinIcon(bin.status, selectedDustbin?._id === bin._id, bin.urgent),
                eventHandlers: { click: () => handleSelectDustbin(bin) },
                zIndexOffset: selectedDustbin?._id === bin._id ? 500 : 0,
              } as any)}
            />
          ))}

          {/* Incident markers */}
          {incidents.map((inc) => (
            <Marker
              key={inc._id}
              {...({
                position: [inc.coordinates.lat, inc.coordinates.lng] as [number, number],
                icon: makeIncidentIcon(selectedIncident?._id === inc._id, inc.urgency),
                eventHandlers: { click: () => handleSelectIncident(inc) },
                zIndexOffset: selectedIncident?._id === inc._id ? 500 : 0,
              } as any)}
            />
          ))}

          {/* Route lines */}
          {route && (
            <>
              <Polyline
                {...({ positions: route, pathOptions: { color: '#1a56db', weight: 8, opacity: 0.18 } } as any)}
              />
              <Polyline
                {...({ positions: route, pathOptions: { color: '#4285f4', weight: 5, opacity: 0.95 } } as any)}
              />
              {userLocation && (
                <CircleMarker
                  {...({
                    center: [userLocation.lat, userLocation.lng] as [number, number],
                    radius: 7,
                    pathOptions: { color: '#fff', fillColor: '#4285f4', fillOpacity: 1, weight: 2 },
                  } as any)}
                />
              )}
              {selectedDustbin && (
                <CircleMarker
                  {...({
                    center: [selectedDustbin.coordinates.lat, selectedDustbin.coordinates.lng] as [number, number],
                    radius: 7,
                    pathOptions: { color: '#fff', fillColor: '#16a34a', fillOpacity: 1, weight: 2 },
                  } as any)}
                />
              )}
              {selectedIncident && (
                <CircleMarker
                  {...({
                    center: [selectedIncident.coordinates.lat, selectedIncident.coordinates.lng] as [number, number],
                    radius: 7,
                    pathOptions: { color: '#fff', fillColor: '#ef4444', fillOpacity: 1, weight: 2 },
                  } as any)}
                />
              )}
            </>
          )}
        </MapContainer>

        {/* Deployment hint */}
        {deploymentMode && (
          <div
            style={{
              position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, pointerEvents: 'none',
              background: 'rgba(0,0,0,.82)', color: '#fff',
              padding: '8px 20px', borderRadius: 24, fontSize: 13, fontWeight: 500,
              boxShadow: '0 4px 16px rgba(0,0,0,.3)', whiteSpace: 'nowrap',
            }}
          >
            📍 Tap on map to place dustbin
          </div>
        )}

        {/* Route calculating spinner */}
        {routeLoading && (
          <div
            style={{
              position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, background: 'rgba(255,255,255,.95)',
              padding: '8px 16px', borderRadius: 20, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 2px 12px rgba(0,0,0,.15)', whiteSpace: 'nowrap',
            }}
          >
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Calculating route…
          </div>
        )}

        {/* Bottom info panel */}
        {panelOpen && (selectedDustbin || selectedIncident) && (
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1001,
              background: '#fff', borderRadius: '16px 16px 0 0',
              boxShadow: '0 -4px 32px rgba(0,0,0,.18)', maxHeight: '60%', overflowY: 'auto',
            }}
          >
            {/* Handle bar */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb' }} />
            </div>

            {/* Close */}
            <button
              onClick={clearSelection}
              style={{
                position: 'absolute', top: 12, right: 14, zIndex: 2,
                background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4,
              }}
            >
              <X className="h-5 w-5" />
            </button>

            <div style={{ padding: '0 16px 20px' }}>

              {/* Dustbin panel */}
              {selectedDustbin && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 24 }}>🗑️</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedDustbin.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        {selectedDustbin.sector || 'Unknown sector'}
                      </div>
                    </div>
                    <span
                      style={{
                        marginLeft: 'auto', padding: '4px 10px', borderRadius: 20,
                        fontSize: 11, fontWeight: 600,
                        background:
                          selectedDustbin.status === 'full' ? '#fee2e2'
                            : selectedDustbin.status === 'maintenance' ? '#fef3c7'
                              : '#dcfce7',
                        color:
                          selectedDustbin.status === 'full' ? '#dc2626'
                            : selectedDustbin.status === 'maintenance' ? '#d97706'
                              : '#16a34a',
                      }}
                    >
                      {selectedDustbin.urgent ? '🚨 Urgent' : selectedDustbin.status || 'active'}
                    </span>
                  </div>

                  {/* Image */}
                  <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', background: '#f3f4f6', height: 140 }}>
                    {imageLoading ? (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af', fontSize: 13 }}>
                        <Loader2 className="h-5 w-5 animate-spin" /> Loading image…
                      </div>
                    ) : dustbinImage ? (
                      <img src={dustbinImage} alt="Dustbin state" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
                        No image available
                      </div>
                    )}
                  </div>

                  {/* Fill level */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#6b7280' }}>Fill Level</span>
                      <span style={{ fontWeight: 600, color: (selectedDustbin.fillLevel || 0) > 80 ? '#dc2626' : '#16a34a' }}>
                        {selectedDustbin.fillLevel || 0}%
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4,
                        width: `${selectedDustbin.fillLevel || 0}%`,
                        background:
                          (selectedDustbin.fillLevel || 0) > 80 ? '#ef4444'
                            : (selectedDustbin.fillLevel || 0) > 50 ? '#f59e0b'
                              : '#22c55e',
                        transition: 'width .4s',
                      }} />
                    </div>
                  </div>

                  {/* Route stats */}
                  {routeMeta && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12, background: '#eff6ff', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#2563eb' }}>{formatDist(routeMeta.distanceM)}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Distance</div>
                      </div>
                      <div style={{ width: 1, background: '#bfdbfe' }} />
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#2563eb' }}>{formatTime(routeMeta.durationS)}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Walking time</div>
                      </div>
                    </div>
                  )}

                  <a
                    href={googleNavUrl(selectedDustbin.coordinates)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      width: '100%', padding: '12px', borderRadius: 10,
                      background: '#4285f4', color: '#fff', fontWeight: 600, fontSize: 14,
                      textDecoration: 'none',
                    }}
                  >
                    <Navigation className="h-4 w-4" /> Navigate with Google Maps
                  </a>
                </>
              )}

              {/* Incident panel */}
              {selectedIncident && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 24 }}>⚠️</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, textTransform: 'capitalize' }}>
                        {selectedIncident.category.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>
                        {selectedIncident.status}
                      </div>
                    </div>
                    <span
                      style={{
                        marginLeft: 'auto', padding: '4px 10px', borderRadius: 20,
                        fontSize: 11, fontWeight: 600,
                        background:
                          selectedIncident.urgency === 'critical' ? '#fee2e2'
                            : selectedIncident.urgency === 'high' ? '#fff7ed'
                              : '#fefce8',
                        color:
                          selectedIncident.urgency === 'critical' ? '#dc2626'
                            : selectedIncident.urgency === 'high' ? '#ea580c'
                              : '#ca8a04',
                      }}
                    >
                      {selectedIncident.urgency}
                    </span>
                  </div>

                  {userRole === 'employee' ? (
                    <>
                      {selectedIncident.imageBase64 && (
                        <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', height: 140 }}>
                          <img
                            src={
                              selectedIncident.imageBase64.startsWith('data:')
                                ? selectedIncident.imageBase64
                                : `data:image/jpeg;base64,${selectedIncident.imageBase64}`
                            }
                            alt="Incident"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                      {selectedIncident.description && (
                        <div style={{ fontSize: 13, color: '#374151', marginBottom: 12, padding: '10px 12px', background: '#f9fafb', borderRadius: 8 }}>
                          {selectedIncident.description}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, padding: '10px 12px', background: '#f9fafb', borderRadius: 8 }}>
                      Incident reported nearby. Details are visible to field employees only.
                    </div>
                  )}

                  {routeMeta && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12, background: '#fff7ed', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#ea580c' }}>{formatDist(routeMeta.distanceM)}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Distance</div>
                      </div>
                      <div style={{ width: 1, background: '#fed7aa' }} />
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#ea580c' }}>{formatTime(routeMeta.durationS)}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Walking time</div>
                      </div>
                    </div>
                  )}

                  <a
                    href={googleNavUrl(selectedIncident.coordinates)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      width: '100%', padding: '12px', borderRadius: 10,
                      background: '#ef4444', color: '#fff', fontWeight: 600, fontSize: 14,
                      textDecoration: 'none',
                    }}
                  >
                    <Navigation className="h-4 w-4" /> Navigate to Incident
                  </a>
                </>
              )}

            </div>
          </div>
        )}
      </div>
    </FullscreenMap>
  );
}
