import { useEffect, useRef, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { getReliableLocation } from '@/lib/location';

type CollectorIncident = {
  _id: string;
  category: string;
  description?: string;
  status: string;
  urgency: string;
  coordinates: { lat: number; lng: number };
  imageBase64: string;
  updatedAt: string;
  assignedTo?: { _id?: string; name?: string; email?: string } | string | null;
  timeline?: {
    assignedAt?: string;
    startedAt?: string;
    completedAt?: string;
    resolutionMinutes?: number;
  };
  employeeLiveLocation?: {
    coordinates: { lat: number; lng: number };
    updatedAt: string;
  } | null;
};

const categories = [
  { value: 'pothole', label: 'Capture potholes' },
  { value: 'accident', label: 'Capture car, bike, truck accident' },
  { value: 'unethical_activity', label: 'Capture unethical activities by locals' },
  { value: 'dead_animal', label: 'Capture dead animal' },
  { value: 'suspicious_activity', label: 'Capture suspiciousness' },
  { value: 'beggar', label: 'Capture beggars' },
  { value: 'tree_break', label: 'Capture tree breaks' },
  { value: 'electricity_pole_issue', label: 'Capture electricity poles issues' },
  { value: 'unauthorized_logging', label: 'Capture unauthorised loggings' },
  { value: 'other', label: 'Other' },
];

const urgencies = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function CaptureIncident() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [image, setImage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [category, setCategory] = useState('pothole');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [description, setDescription] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [incidents, setIncidents] = useState<CollectorIncident[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const haversineMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371e3;
    const toRad = (x: number) => x * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes || minutes < 1) return 'N/A';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const isWithinWorkHours = (date: Date) => {
    const hour = date.getHours();
    return hour >= 9 && hour < 17;
  };
  const isWorkTimeNow = () => isWithinWorkHours(new Date());

  const calculateWorkMinutesBetween = (start: Date, end: Date) => {
    if (end <= start) return 0;
    let totalMs = 0;
    let cursor = new Date(start);

    while (cursor < end) {
      const dayStart = new Date(cursor);
      dayStart.setHours(9, 0, 0, 0);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(17, 0, 0, 0);

      const rangeStart = new Date(Math.max(cursor.getTime(), dayStart.getTime()));
      const rangeEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));

      if (rangeEnd > rangeStart) {
        totalMs += rangeEnd.getTime() - rangeStart.getTime();
      }

      const nextDay = new Date(cursor);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      cursor = nextDay;
    }

    return Math.max(0, Math.round(totalMs / 60000));
  };

  const getWorkMinutesPassed = (incident: CollectorIncident) => {
    const start = incident.timeline?.startedAt || incident.timeline?.assignedAt;
    if (!start) return 0;
    const startDate = new Date(start);
    const endDate = incident.timeline?.completedAt ? new Date(incident.timeline.completedAt) : new Date();
    return calculateWorkMinutesBetween(startDate, endDate);
  };

  const isEmployeeOnline = (incident: CollectorIncident) => {
    if (!incident.employeeLiveLocation?.updatedAt) return false;
    const updatedAt = new Date(incident.employeeLiveLocation.updatedAt).getTime();
    const isFresh = Date.now() - updatedAt <= 2 * 60 * 1000;
    return isFresh && isWithinWorkHours(new Date());
  };

  const getAssignedEmployeeName = (incident: CollectorIncident) => {
    if (!incident.assignedTo) return 'Not assigned';
    if (typeof incident.assignedTo === 'string') return 'Assigned';
    return incident.assignedTo.name || incident.assignedTo.email || 'Assigned';
  };

  const loadIncidents = async () => {
    try {
      setLoadingList(true);
      const res = await apiFetch('/incidents');
      const data = await res.json();
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      // silent fail; page can still submit
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      toast({ title: 'Camera error', description: String(err), variant: 'destructive' });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const getLocation = async () => {
    setLocationLoading(true);
    try {
      const coords = await getReliableLocation();
      setLocation(coords);
    } catch (err) {
      toast({
        title: "Location Error",
        description: (err as Error)?.message || "Could not get your location.",
        variant: "destructive",
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const applyManualCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({ title: 'Invalid coordinates', description: 'Latitude -90..90, Longitude -180..180', variant: 'destructive' });
      return;
    }
    setLocation({ lat, lng });
    toast({ title: 'Coordinates Set', description: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setImage(dataUrl);
    stopCamera();
    if (!manualMode) getLocation();
  };

  const onUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      if (!manualMode) getLocation();
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!image || !location) {
      toast({ title: 'Missing info', description: 'Image and location required', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      const res = await apiFetch('/incidents', {
        method: 'POST',
        body: JSON.stringify({
          category,
          description,
          coordinates: location,
          imageBase64: image,
          urgency,
        })
      });
      const created: CollectorIncident = await res.json();
      const assigneeName =
        created?.assignedTo && typeof created.assignedTo === 'object'
          ? (created.assignedTo.name || created.assignedTo.email || 'an employee')
          : null;
      toast({
        title: 'Incident reported',
        description: assigneeName
          ? `Connected instantly to ${assigneeName}.`
          : 'Reported successfully. Waiting for employee assignment.',
      });
      setImage(null);
      setDescription('');
      setManualLat('');
      setManualLng('');
      setLocation(null);
      setManualMode(false);
      loadIncidents();
    } catch (err: unknown) {
      toast({ title: 'Failed to submit', description: (err as Error)?.message || 'Server error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="collector" />
      <main className="lg:ml-64 p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="bg-gradient-eco rounded-lg p-6 text-white shadow">
            <h1 className="text-2xl font-bold mb-2">Capture Incident</h1>
            <p className="text-white/90">Report incidents with a single photo, description, and location.</p>
          </div>

          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Incident Details</CardTitle>
              <CardDescription>Choose category and urgency, add description and photo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select id="category" className="w-full h-10 border rounded-md px-3 bg-background" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {categories.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="urgency">Urgency</Label>
                  <select id="urgency" className="w-full h-10 border rounded-md px-3 bg-background" value={urgency} onChange={(e) => setUrgency(e.target.value as 'low' | 'medium' | 'high' | 'critical')}>
                    {urgencies.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the incident..." />
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full h-38 flex items-center justify-center border-2 border-dashed border-eco-forest-primary/40 rounded-lg bg-muted/40 mb-4 relative">
                    {!showCamera && !image && (
                      <div className="flex flex-col md:flex-row gap-3 w-full h-full items-center justify-center">
                        <Button onClick={startCamera} variant="outline" className="flex flex-col items-center justify-center h-full bg-transparent border-0 shadow-none">
                          <Camera className="h-10 w-10 mb-2 text-eco-forest-primary" />
                          <span className="font-medium text-eco-forest-primary">Capture Photo</span>
                          <span className="text-xs text-muted-foreground">Use device camera{!manualMode && ' and GPS'}</span>
                        </Button>
                        <div className="text-muted-foreground">or</div>
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center h-full bg-transparent border-0 shadow-none">
                          <Upload className="h-10 w-10 mb-2 text-eco-forest-primary" />
                          <span className="font-medium text-eco-forest-primary">Upload Photo</span>
                          <span className="text-xs text-muted-foreground">Choose from files</span>
                        </Button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onUploadChange} />
                      </div>
                    )}

                    {showCamera && (
                      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />

                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        <div className="absolute bottom-10 flex gap-4">
                          <Button onClick={capturePhoto} variant="eco" className="px-6 py-3 text-lg">
                            <Camera className="mr-2 h-5 w-5" />
                            Capture
                          </Button>

                          <Button
                            onClick={stopCamera}
                            variant="ghost"
                            className="px-6 py-3 text-lg border text-white"
                          >
                            Cancel
                          </Button>
                        </div></div>
                    )}

                    {image && !showCamera && (
                      <img
                        src={image}
                        alt="Incident"
                        onClick={() => setPreviewOpen(true)}
                        className="absolute inset-0 w-full h-full object-cover rounded-lg cursor-pointer"
                        style={{ zIndex: 1 }}
                      />
                    )}
                  </div>

                  <div className="w-full mt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>Lat: {location?.lat?.toFixed(6) ?? '---'} | Lng: {location?.lng?.toFixed(6) ?? '---'}</span>
                    </div>
                    {locationLoading && <div className="text-xs text-eco-forest-primary mt-2">Getting current location...</div>}

                    <div className="mt-3">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setManualMode(!manualMode)} className="text-xs text-eco-forest-primary hover:bg-eco-forest-primary/10">
                        {manualMode ? 'Use GPS' : 'Enter coordinates manually'}
                      </Button>
                      {manualMode && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="manualLat" className="text-xs">Latitude:</Label>
                            <Input id="manualLat" type="number" step="any" placeholder="e.g. 19.0760" value={manualLat} onChange={(e) => setManualLat(e.target.value)} className="h-7 text-xs" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor="manualLng" className="text-xs">Longitude:</Label>
                            <Input id="manualLng" type="number" step="any" placeholder="e.g. 72.8777" value={manualLng} onChange={(e) => setManualLng(e.target.value)} className="h-7 text-xs" />
                          </div>
                          <Button type="button" size="sm" onClick={applyManualCoordinates} className="text-xs" disabled={!manualLat || !manualLng}>Apply Coordinates</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {image && (
                <Button onClick={handleSubmit} variant="eco" className="w-full mt-6" disabled={locationLoading || !location || submitting}>
                  <Upload className="mr-2 h-4 w-4" />
                  {submitting ? 'Submitting...' : 'Submit Incident'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Your Incident History</CardTitle>
                <CardDescription>Recently reported incidents and their current status</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadIncidents}>Refresh</Button>
            </CardHeader>
            <CardContent>
              {loadingList ? (
                <div className="text-sm text-muted-foreground">Loading incidents…</div>
              ) : incidents.length === 0 ? (
                <div className="text-sm text-muted-foreground">No incidents reported yet. Submit your first incident above.</div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-auto pr-1">
                  {incidents.map((inc) => (
                    <div key={inc._id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <img src={inc.imageBase64} alt={inc.category} className="w-20 h-16 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm capitalize truncate">{inc.category.replace(/_/g, ' ')}</div>
                          <Badge className="capitalize whitespace-nowrap">{inc.status.replace(/_/g, ' ')}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{inc.description || 'No description'}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(inc.updatedAt).toLocaleString()} • {inc.coordinates.lat.toFixed(4)}, {inc.coordinates.lng.toFixed(4)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Assigned employee: <span className="font-medium">{getAssignedEmployeeName(inc)}</span>
                        </div>
                        {!isWorkTimeNow() && inc.assignedTo && (
                          <div className="mt-2 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 text-xs text-amber-900">
                            Worker work time is 9:00 AM to 5:00 PM. The employee will join you at 9:00 AM.
                          </div>
                        )}
                        {isWorkTimeNow() && inc.employeeLiveLocation?.coordinates && (
                          (
                            <div className="text-xs text-muted-foreground mt-1">
                              Employee live location: {inc.employeeLiveLocation.coordinates.lat.toFixed(5)}, {inc.employeeLiveLocation.coordinates.lng.toFixed(5)}
                              {' '}• Distance to incident: {(haversineMeters(inc.employeeLiveLocation.coordinates, inc.coordinates) / 1000).toFixed(2)} km
                              {' '}• Updated: {new Date(inc.employeeLiveLocation.updatedAt).toLocaleTimeString()}
                              {' '}• Status: <span className={isEmployeeOnline(inc) ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                                {isEmployeeOnline(inc) ? 'Online (On shift)' : 'Offline / Off shift'}
                              </span>
                              {' '}• <a
                                href={`https://www.google.com/maps/dir/?api=1&origin=${inc.employeeLiveLocation.coordinates.lat},${inc.employeeLiveLocation.coordinates.lng}&destination=${inc.coordinates.lat},${inc.coordinates.lng}&travelmode=driving`}
                                target="_blank"
                                rel="noreferrer"
                                className="underline text-eco-forest-primary"
                              >
                                Navigate employee → incident
                              </a>
                            </div>
                          )
                        )}
                        {inc.status === 'resolved' || inc.status === 'dismissed' ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            Completed at: {inc.timeline?.completedAt ? new Date(inc.timeline.completedAt).toLocaleString() : 'N/A'}
                            {' '}• Work-time used (9AM-5PM): {formatDuration(getWorkMinutesPassed(inc))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground mt-1">
                            Current state: {inc.status.replace(/_/g, ' ')} (incomplete)
                            {' '}• Work-time passed (9AM-5PM): {formatDuration(getWorkMinutesPassed(inc))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Fullscreen preview modal */}
        {previewOpen && image && (
          <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            <img
              src={image}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />

            <Button
              onClick={() => setPreviewOpen(false)}
              className="absolute top-6 right-6"
              variant="ghost"
            >
              Close
            </Button>
          </div>
        )}
      </main>
    </div>

  );
}
