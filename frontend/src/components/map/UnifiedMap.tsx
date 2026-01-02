import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { LatLngExpression } from 'leaflet';
import { Dustbin } from './DustbinMap';
import { Incident } from './IncidentMap';
import FullscreenMap from './FullscreenMap';

// Icons
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

const IncidentIcon = (selected: boolean, urgency?: string) => {
  const isCritical = urgency === 'critical' || urgency === 'high';
  return L.divIcon({
    className: 'incident-icon',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${selected ? 36 : 28}px;height:${selected ? 36 : 28}px;border-radius:9999px;background:${isCritical ? '#ef4444' : '#f59e0b'};color:white;font-weight:bold;box-shadow:0 6px 18px rgba(0,0,0,.2)">⚠️</div>`,
    iconSize: [selected ? 36 : 28, selected ? 36 : 28]
  });
};

const UserIcon = L.divIcon({
  className: 'user-icon',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:9999px;background:#2563eb;color:white;box-shadow:0 4px 12px rgba(0,0,0,.2)">•</div>`,
  iconSize: [24, 24]
});

interface Props {
  userLocation: { lat: number; lng: number } | null;
  dustbins: Dustbin[];
  incidents: Incident[];
  onDustbinSelect?: (bin: Dustbin | null) => void;
  onIncidentSelect?: (incident: Incident | null) => void;
  onMapClick?: (lat: number, lng: number) => void;
  deploymentMode?: boolean;
  userRole?: 'collector' | 'employee' | null;
}

function MapEvents({ onMapClick, deploymentMode }: { onMapClick?: (lat: number, lng: number) => void, deploymentMode?: boolean }) {
  useMapEvents({
    click(e) {
      if (deploymentMode && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function FitToContent({ userLocation, dustbins, incidents }: { userLocation: { lat: number; lng: number } | null; dustbins: Dustbin[]; incidents: Incident[] }) {
  const map = useMap();
  useEffect(() => {
    const points: LatLngExpression[] = [];
    if (userLocation) points.push([userLocation.lat, userLocation.lng]);
    dustbins.forEach(b => points.push([b.coordinates.lat, b.coordinates.lng]));
    incidents.forEach(i => points.push([i.coordinates.lat, i.coordinates.lng]));
    
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points as [number, number][]);
    map.fitBounds(bounds.pad(0.2));
  }, [map, userLocation, dustbins, incidents]);
  return null;
}

export default function UnifiedMap({ 
  userLocation, 
  dustbins, 
  incidents, 
  onDustbinSelect, 
  onIncidentSelect,
  onMapClick,
  deploymentMode,
  userRole
}: Props) {
  const [selectedDustbin, setSelectedDustbin] = useState<Dustbin | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <FullscreenMap isFullscreen={isFullscreen} onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}>
      <div className={`relative w-full h-full rounded-lg overflow-hidden border shadow-sm ${deploymentMode ? 'cursor-crosshair' : ''}`}>
        <MapContainer
          center={userLocation ? [userLocation.lat, userLocation.lng] : [20.5937, 78.9629]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          {...({ center: userLocation ? [userLocation.lat, userLocation.lng] : [20.5937, 78.9629] } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            {...({ attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
          />

          <FitToContent userLocation={userLocation} dustbins={dustbins} incidents={incidents} />
          <MapEvents onMapClick={onMapClick} deploymentMode={deploymentMode} />

          {userLocation && (
            <Marker 
              position={[userLocation.lat, userLocation.lng]} 
              icon={UserIcon as any} // eslint-disable-line @typescript-eslint/no-explicit-any
              {...({ icon: UserIcon } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
            >
              <Popup>You are here</Popup>
            </Marker>
          )}

          {dustbins.map(bin => (
            <Marker
              key={bin._id}
              position={[bin.coordinates.lat, bin.coordinates.lng]}
              {...({ icon: DustbinIcon(bin.status, selectedDustbin?._id === bin._id, bin.urgent) } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
              eventHandlers={{
                click: () => {
                  setSelectedDustbin(bin);
                  setSelectedIncident(null);
                  onDustbinSelect?.(bin);
                  onIncidentSelect?.(null);
                }
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  {/* Dustbin Image Logic */}
                  {userRole === 'collector' && bin.initialPhotoBase64 && (
                    <div className="mb-2">
                      <img 
                        src={`data:image/png;base64,${bin.initialPhotoBase64}`} 
                        alt="Initial State" 
                        className="w-full h-32 object-cover rounded-md border"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Initial Setup Image</p>
                    </div>
                  )}
                  {userRole === 'employee' && bin.photoBase64 && (
                    <div className="mb-2">
                      <img 
                        src={`data:image/png;base64,${bin.photoBase64}`} 
                        alt="Current State" 
                        className="w-full h-32 object-cover rounded-md border"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Latest Status Image</p>
                    </div>
                  )}

                  <h3 className="font-bold text-lg">{bin.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{bin.sector || 'Unknown Sector'}</p>
                  <div className="flex gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                      bin.status === 'active' ? 'bg-green-100 text-green-800' :
                      bin.status === 'full' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {bin.status}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {bin.type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Fill Level: {bin.fillLevel || 0}%
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                      <div 
                        className={`h-full ${bin.fillLevel && bin.fillLevel > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${bin.fillLevel || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {incidents.map(incident => (
            <Marker
              key={incident._id}
              position={[incident.coordinates.lat, incident.coordinates.lng]}
              {...({ icon: IncidentIcon(selectedIncident?._id === incident._id, incident.urgency) } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
              eventHandlers={{
                click: () => {
                  setSelectedIncident(incident);
                  setSelectedDustbin(null);
                  onIncidentSelect?.(incident);
                  onDustbinSelect?.(null);
                }
              }}
            >
               <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-lg capitalize">{incident.category}</h3>
                  <p className="text-sm text-gray-600 mb-2">{incident.description || 'No description'}</p>
                  <div className="flex gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                      incident.urgency === 'critical' ? 'bg-red-100 text-red-800' :
                      incident.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {incident.urgency} Priority
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {deploymentMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg pointer-events-none">
            Click on map to place dustbin
          </div>
        )}
      </div>
    </FullscreenMap>
  );
}
