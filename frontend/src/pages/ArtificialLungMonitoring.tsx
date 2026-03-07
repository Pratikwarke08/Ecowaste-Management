import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { getReliableLocation } from '@/lib/location';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type TowerType = 'smog_tower' | 'artificial_lung';
type TowerStatus = 'working' | 'maintenance_needed' | 'offline';

type AirTower = {
  _id: string;
  towerType: TowerType;
  towerName: string;
  location: { lat: number; lng: number; address?: string };
  installationDate: string;
  towerHeight: number;
  capacity: number;
  status: TowerStatus;
  assignedWorkers?: string[];
  totalAirProcessedToday?: number;
  pm25Reduction?: number;
  co2Reduction?: number;
  latestMetrics?: {
    pm25?: number;
    pm10?: number;
    co2?: number;
    temperature?: number;
    humidity?: number;
    recordedAt?: string;
  };
  metricsHistory?: Array<{
    pm25?: number;
    pm10?: number;
    co2?: number;
    temperature?: number;
    humidity?: number;
    recordedAt?: string;
  }>;
  verifications?: Array<{
    _id?: string;
    workerEmail?: string;
    location: { lat: number; lng: number };
    photoBase64: string;
    verifiedAt: string;
    aiDetectedTower: boolean;
    verificationStatus: 'verified' | 'flagged';
  }>;
  maintenanceLogs?: Array<{
    _id?: string;
    note: string;
    status: TowerStatus;
    loggedBy: string;
    loggedAt: string;
  }>;
};

const statusColor: Record<TowerStatus, string> = {
  working: '#16a34a',
  maintenance_needed: '#eab308',
  offline: '#dc2626'
};

function makeTowerIcon(status: TowerStatus) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:${statusColor[status]};color:white;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.25)">T</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
}

export default function ArtificialLungMonitoring() {
  const { toast } = useToast();
  const [towerTypeFilter, setTowerTypeFilter] = useState<'all' | TowerType>('all');
  const [towers, setTowers] = useState<AirTower[]>([]);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [verifyPhoto, setVerifyPhoto] = useState<string | null>(null);
  const [verifyLocation, setVerifyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const selectedTower = useMemo(
    () => towers.find((t) => t._id === selectedTowerId) || towers[0] || null,
    [towers, selectedTowerId]
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const typeQuery = towerTypeFilter !== 'all' ? `?type=${towerTypeFilter}` : '';
      const [towersRes, overviewRes] = await Promise.all([
        apiFetch(`/air-towers${typeQuery}`),
        apiFetch(`/air-towers/stats/overview${typeQuery}`)
      ]);

      const towersJson = await towersRes.json();
      const overviewJson = await overviewRes.json();
      setTowers(Array.isArray(towersJson) ? towersJson : []);
      setOverview(overviewJson || null);

      if (Array.isArray(towersJson) && towersJson.length > 0) {
        setSelectedTowerId((prev) => prev || towersJson[0]._id);
      } else {
        setSelectedTowerId(null);
      }
    } catch (err) {
      toast({ title: 'Load failed', description: (err as Error).message || 'Could not load tower data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [towerTypeFilter]);

  const trendData = useMemo(() => {
    const source = overview?.metricsTimeline || [];
    return source.map((m: any) => ({
      time: m.recordedAt ? new Date(m.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
      pm25: m.pm25 || 0,
      pm10: m.pm10 || 0,
      co2: m.co2 || 0
    }));
  }, [overview]);

  const selectedGenuinity = useMemo(() => {
    if (!selectedTower) return { score: 0, label: 'No verifications yet', flagged: 0, verified: 0 };
    const logs = selectedTower.verifications || [];
    const verified = logs.filter((v) => v.verificationStatus === 'verified').length;
    const flagged = logs.filter((v) => v.verificationStatus === 'flagged').length;
    const score = logs.length ? Math.round((verified / logs.length) * 100) : 0;
    const label = logs.length ? (score >= 70 ? 'Genuine' : 'Suspicious') : 'No verifications yet';
    return { score, label, flagged, verified };
  }, [selectedTower]);

  const airPurifiedEstimate = useMemo(() => {
    if (!selectedTower) return null;
    const capacityPerHour = Number(selectedTower.capacity || 0);
    const statusFactor = selectedTower.status === 'working' ? 1 : (selectedTower.status === 'maintenance_needed' ? 0.7 : 0.3);
    const genuinityFactor = selectedGenuinity.score ? selectedGenuinity.score / 100 : 0.5;
    const dailyM3 = capacityPerHour * 24 * statusFactor * genuinityFactor;
    const installedDays = Math.max(
      1,
      Math.floor((Date.now() - new Date(selectedTower.installationDate).getTime()) / (1000 * 60 * 60 * 24))
    );
    const lifetimeM3 = dailyM3 * installedDays;
    return {
      dailyM3: Number(dailyM3.toFixed(2)),
      lifetimeM3: Number(lifetimeM3.toFixed(2)),
      installedDays
    };
  }, [selectedTower, selectedGenuinity.score]);

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const useCurrentLocation = async () => {
    try {
      const loc = await getReliableLocation();
      setVerifyLocation(loc);
    } catch (err) {
      toast({ title: 'Location failed', description: (err as Error).message || 'GPS not available', variant: 'destructive' });
    }
  };

  const submitVerification = async () => {
    if (!selectedTower || !verifyPhoto || !verifyLocation) {
      toast({ title: 'Missing verification data', description: 'Select tower, capture location, and upload photo.', variant: 'destructive' });
      return;
    }

    try {
      setVerifying(true);
      await apiFetch(`/air-towers/${selectedTower._id}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          location: verifyLocation,
          photoBase64: verifyPhoto
        })
      });
      toast({ title: 'Verification submitted', description: 'Photo evidence and location recorded.' });
      setVerifyPhoto(null);
      await loadData();
    } catch (err) {
      toast({ title: 'Verification failed', description: (err as Error).message || 'Could not verify tower', variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  const updateTowerStatus = async (status: TowerStatus) => {
    if (!selectedTower) return;
    try {
      await apiFetch(`/air-towers/${selectedTower._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          maintenanceNote: `Updated via monitoring dashboard (${status})`,
          latestMetrics: selectedTower.latestMetrics || {}
        })
      });
      toast({ title: 'Status updated', description: `Tower marked as ${status.replace('_', ' ')}` });
      await loadData();
    } catch (err) {
      toast({ title: 'Update failed', description: (err as Error).message || 'Could not update status', variant: 'destructive' });
    }
  };

  const deleteSelectedTower = async () => {
    if (!selectedTower) return;
    try {
      await apiFetch(`/air-towers/${selectedTower._id}`, { method: 'DELETE' });
      toast({ title: 'Tower removed', description: 'Deployment deleted successfully.' });
      await loadData();
    } catch (err) {
      toast({ title: 'Delete failed', description: (err as Error).message || 'Could not delete tower', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="employee" />
      <main className="lg:ml-64 p-6 space-y-6">
        <div className="bg-gradient-ocean rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold">Artificial Lung Monitoring System</h1>
          <p className="text-white/90">Unified management for Artificial Lung and Smog Tower deployments.</p>
        </div>

        <div className="flex gap-3">
          <Select value={towerTypeFilter} onValueChange={(v: any) => setTowerTypeFilter(v)}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Filter tower type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Towers</SelectItem>
              <SelectItem value="artificial_lung">Artificial Lung</SelectItem>
              <SelectItem value="smog_tower">Smog Tower</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadData} disabled={loading}>Refresh</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Towers</p><p className="text-2xl font-bold">{overview?.totalTowers ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold text-green-600">{overview?.activeTowers ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Maintenance Needed</p><p className="text-2xl font-bold text-yellow-600">{overview?.maintenanceNeeded ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Air Processed Today</p><p className="text-2xl font-bold">{overview?.totalAirProcessedToday ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">PM2.5 Reduction</p><p className="text-2xl font-bold">{overview?.totalPm25Reduction ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">CO₂ Reduction</p><p className="text-2xl font-bold">{overview?.totalCo2Reduction ?? 0}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Pollution Trend</CardTitle>
              <CardDescription>PM2.5, PM10 and CO₂ timeline from tower feeds</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" hide={trendData.length > 20} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="pm25" stroke="#ef4444" dot={false} />
                  <Line type="monotone" dataKey="pm10" stroke="#eab308" dot={false} />
                  <Line type="monotone" dataKey="co2" stroke="#3b82f6" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live Tower Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[320px] overflow-auto">
              {towers.map((tower) => (
                <button key={tower._id} onClick={() => setSelectedTowerId(tower._id)} className={`w-full text-left border rounded p-2 ${selectedTower?._id === tower._id ? 'border-primary' : ''}`}>
                  <p className="font-medium">{tower.towerName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{tower.towerType.replace('_', ' ')}</p>
                  <Badge className="mt-1 capitalize" style={{ background: statusColor[tower.status], color: '#fff' }}>{tower.status.replace('_', ' ')}</Badge>
                </button>
              ))}
              {towers.length === 0 && <p className="text-sm text-muted-foreground">No towers found.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Tower Map Monitoring</CardTitle>
              <CardDescription>Green: working, Yellow: maintenance needed, Red: offline</CardDescription>
            </CardHeader>
            <CardContent className="h-[360px] p-0 overflow-hidden rounded-b-lg">
              <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ width: '100%', height: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {towers.map((tower) => (
                  <Marker
                    key={tower._id}
                    position={[tower.location.lat, tower.location.lng]}
                    icon={makeTowerIcon(tower.status)}
                    eventHandlers={{ click: () => setSelectedTowerId(tower._id) }}
                  >
                    <Popup>
                      <div className="space-y-1 text-sm">
                        <div className="font-semibold">{tower.towerName}</div>
                        <div className="capitalize">{tower.status.replace('_', ' ')}</div>
                        <div>PM2.5: {tower.latestMetrics?.pm25 ?? 0}</div>
                        <div>Installed: {new Date(tower.installationDate).toLocaleDateString()}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Field Verification System</CardTitle>
              <CardDescription>Capture GPS + live photo + timestamp + AI presence check</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">Selected Tower: <span className="font-medium">{selectedTower?.towerName || 'None'}</span></p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={useCurrentLocation}>Capture GPS</Button>
                <span className="text-xs text-muted-foreground self-center">
                  {verifyLocation ? `${verifyLocation.lat.toFixed(5)}, ${verifyLocation.lng.toFixed(5)}` : 'No location yet'}
                </span>
              </div>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const base64 = await toBase64(file);
                  setVerifyPhoto(base64);
                }}
              />
              {verifyPhoto && <img src={verifyPhoto} alt="verification" className="w-full max-h-44 object-cover rounded border" />}
              <Button onClick={submitVerification} disabled={verifying}>{verifying ? 'Submitting...' : 'Submit Verification'}</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Genuinity + Air Purified Calculator</CardTitle>
              <CardDescription>Employee-only review based on collector deployment + verification logs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedTower ? (
                <p className="text-sm text-muted-foreground">Select a tower to review genuinity and calculated purification.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="border rounded p-3">
                      <p className="text-muted-foreground">Genuinity score</p>
                      <p className={`text-2xl font-bold ${selectedGenuinity.score >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedGenuinity.score}%
                      </p>
                      <p className="text-xs">{selectedGenuinity.label} • Verified {selectedGenuinity.verified} • Flagged {selectedGenuinity.flagged}</p>
                    </div>
                    <div className="border rounded p-3">
                      <p className="text-muted-foreground">Current status</p>
                      <Badge className="mt-1 capitalize" style={{ background: statusColor[selectedTower.status], color: '#fff' }}>
                        {selectedTower.status.replace('_', ' ')}
                      </Badge>
                      <p className="text-xs mt-2">Capacity basis: {selectedTower.capacity} m³/hour</p>
                    </div>
                  </div>

                  {airPurifiedEstimate && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="border rounded p-3">
                        <p className="text-muted-foreground">Estimated air purified (daily)</p>
                        <p className="text-xl font-bold">{airPurifiedEstimate.dailyM3} m³/day</p>
                      </div>
                      <div className="border rounded p-3">
                        <p className="text-muted-foreground">Estimated air purified (lifetime)</p>
                        <p className="text-xl font-bold">{airPurifiedEstimate.lifetimeM3} m³</p>
                        <p className="text-xs">Over {airPurifiedEstimate.installedDays} days since installation</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateTowerStatus('working')}>Mark Working</Button>
                    <Button size="sm" variant="secondary" onClick={() => updateTowerStatus('maintenance_needed')}>Needs Maintenance</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateTowerStatus('offline')}>Mark Offline</Button>
                    <Button size="sm" variant="outline" onClick={deleteSelectedTower}>Remove Tower</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tower Profile</CardTitle>
              <CardDescription>Photo evidence, verification and maintenance logs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selectedTower && <p className="text-sm text-muted-foreground">Select a tower to view profile.</p>}
              {selectedTower && (
                <>
                  <p className="font-medium">{selectedTower.towerName}</p>
                  <p className="text-xs text-muted-foreground">Assigned: {(selectedTower.assignedWorkers || []).join(', ') || 'None'}</p>
                  <div>
                    <p className="text-sm font-medium mb-1">Photo Evidence Gallery</p>
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-auto">
                      {(selectedTower.verifications || []).slice().reverse().map((v) => (
                        <div key={v._id || v.verifiedAt} className="border rounded p-1">
                          <img src={v.photoBase64} className="w-full h-20 object-cover rounded" alt="verification" />
                          <p className="text-[10px] mt-1">{new Date(v.verifiedAt).toLocaleString()}</p>
                          <p className="text-[10px]">{v.verificationStatus}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Maintenance Logs</p>
                    <div className="max-h-28 overflow-auto space-y-1">
                      {(selectedTower.maintenanceLogs || []).slice().reverse().map((log) => (
                        <div key={log._id || log.loggedAt} className="text-xs border rounded p-2">
                          <p>{log.note}</p>
                          <p className="text-muted-foreground">{log.loggedBy} • {new Date(log.loggedAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
