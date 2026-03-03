import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/layout/Navigation';
import UnifiedMap from '@/components/map/UnifiedMap';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Filter, LocateFixed } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dustbin } from '@/components/map/DustbinMap';
import { Incident } from '@/components/map/IncidentMap';

// ─── High-precision location (Google Maps style) ──────────────────────────────
// 1. Fire a fast low-accuracy fix immediately so the map can centre.
// 2. Then get a high-accuracy fix and update.
function getHighPrecisionLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    let settled = false;

    // Stage 1 – quick fix (low accuracy, < 1 s usually)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!settled) {
          settled = true;
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      },
      () => { /* ignore, wait for stage 2 */ },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 30000 }
    );

    // Stage 2 – precise fix (GPS, ~5–15 s on mobile)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Always update with the better fix
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        settled = true;
      },
      (err) => {
        if (!settled) reject(err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export default function MapPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [dustbins, setDustbins] = useState<Dustbin[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [deploymentMode, setDeploymentMode] = useState(false);
  const [userRole, setUserRole] = useState<'collector' | 'employee' | null>(null);
  const [mapFilter, setMapFilter] = useState<'all' | 'dustbins' | 'incidents'>('all');

  // Trigger re-locate from button
  const [locateTrigger, setLocateTrigger] = useState(0);

  useEffect(() => {
    const storedRole = localStorage.getItem('userType') as 'collector' | 'employee' | null;
    setUserRole(storedRole);

    const loadData = async () => {
      try {
        setLoading(true);

        // Fetch map data + location in parallel
        const [binsRes, incsRes] = await Promise.all([
          apiFetch('/dustbins'),
          apiFetch('/incidents'),
        ]);

        if (binsRes.ok) {
          const data = await binsRes.json();
          setDustbins(Array.isArray(data) ? data : []);
        }
        if (incsRes.ok) {
          const data = await incsRes.json();
          setIncidents(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load map data', err);
        toast({ title: 'Error', description: 'Failed to load map data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
    locateUser(); // kick off location on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-locate when triggered by button
  useEffect(() => {
    if (locateTrigger === 0) return;
    locateUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locateTrigger]);

  const locateUser = async () => {
    setLocating(true);
    try {
      const loc = await getHighPrecisionLocation();
      setUserLocation(loc);
    } catch (e) {
      toast({ title: 'Location unavailable', description: 'Please enable location permissions.', variant: 'destructive' });
    } finally {
      setLocating(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (deploymentMode) navigate(`/add-dustbin?lat=${lat}&lng=${lng}`);
  };

  const filteredDustbins = mapFilter === 'incidents' ? [] : dustbins;
  const filteredIncidents = mapFilter === 'dustbins' ? [] : incidents;

  return (
    // Outer wrapper — fills viewport minus nav, no overflow
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
      className="bg-background lg:pl-64"
    >
      <Navigation userRole={userRole || 'collector'} />

      {/* Map area — fills remaining height exactly */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <UnifiedMap
            userLocation={userLocation}
            dustbins={filteredDustbins}
            incidents={filteredIncidents}
            onMapClick={handleMapClick}
            deploymentMode={deploymentMode}
            userRole={userRole}
          />
        )}

        {/* ── Filter ── */}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, width: 160 }}>
          <Select value={mapFilter} onValueChange={(v: any) => setMapFilter(v)}>
            <SelectTrigger className="w-full bg-white/95 backdrop-blur shadow-md border-0 rounded-xl">
              <Filter className="w-4 h-4 mr-2 text-gray-600" />
              <SelectValue placeholder="Filter Map" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Show All</SelectItem>
              <SelectItem value="dustbins">Dustbins Only</SelectItem>
              <SelectItem value="incidents">Incidents Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Locate me button (Google Maps style) ── */}
        <button
          onClick={() => setLocateTrigger(t => t + 1)}
          disabled={locating}
          style={{
            position: 'absolute', bottom: 88, right: 16, zIndex: 1000,
            width: 44, height: 44, borderRadius: '50%',
            background: '#fff', border: 'none', cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0,0,0,.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'box-shadow .2s',
          }}
          title="Locate me"
        >
          {locating
            ? <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            : <LocateFixed className="h-5 w-5 text-blue-600" />
          }
        </button>

        {/* ── Deployment FAB ── */}
        <div style={{ position: 'absolute', bottom: 24, right: 16, zIndex: 1000 }}>
          <Button
            size="lg"
            variant={deploymentMode ? 'destructive' : 'default'}
            className={`rounded-full shadow-lg h-14 w-14 p-0 ${deploymentMode ? 'animate-pulse' : ''}`}
            onClick={() => setDeploymentMode(m => !m)}
            title={deploymentMode ? 'Cancel placement' : 'Add dustbin'}
          >
            <Plus className={`h-6 w-6 transition-transform duration-200 ${deploymentMode ? 'rotate-45' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}