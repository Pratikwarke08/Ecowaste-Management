import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Festival } from '@/lib/types';
import UnifiedMap from '@/components/map/UnifiedMap';
import { MapPin, Navigation as NavigationIcon } from 'lucide-react';

const ammoniumBicarbonateInstructions = [
  {
    title: 'Container 1 – Ammonia Production',
    materials: ['Cow dung', 'Leftover rice', 'Dal waste', 'Water'],
    description: 'These wastes decompose and release NH₃ gas.',
  },
  {
    title: 'Container 2 – CO₂ Production',
    materials: ['Banana peels', 'Rotten fruits (banana, mango, papaya)', 'Bread waste', 'Sugar or jaggery waste'],
    description: 'This mixture ferments and produces CO₂ gas.',
  },
  {
    title: 'Gas Mixing',
    materials: ['Pipe or tube', 'Third container with cold water'],
    description: 'Connect both containers to a third cold-water container: NH₃ + CO₂ + H₂O → NH₄HCO₃.',
  },
  {
    title: 'Crystal Formation',
    materials: ['Ice or cold water bowl'],
    description: 'Keep solution at 0–10°C for some hours to form white ammonium bicarbonate crystals.',
  },
];

const stageOptions = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'prep', label: 'Preparation' },
  { value: 'gas_mixing', label: 'Gas Mixing' },
  { value: 'crystal_formation', label: 'Crystal Formation' },
  { value: 'completed', label: 'Completed' }
] as const;

export default function FestivalsEmployeeManagementPage() {
  const { toast } = useToast();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Festival | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [processNotes, setProcessNotes] = useState('');
  const [processStage, setProcessStage] = useState<'not_started' | 'prep' | 'gas_mixing' | 'crystal_formation' | 'completed'>('not_started');
  const [checklist, setChecklist] = useState({
    ammoniaContainerReady: false,
    co2ContainerReady: false,
    gasesConnected: false,
    solutionCooled: false,
    crystalsObserved: false
  });

  const loadFestivals = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await apiFetch(`/festivals?${params.toString()}`);
      const json = await res.json();
      setFestivals(Array.isArray(json) ? json : []);

      if (Array.isArray(json) && json.length > 0) {
        const current = selected ? json.find((f: Festival) => f._id === selected._id) : json[0];
        setSelected(current || json[0]);
      } else {
        setSelected(null);
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to load festival reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFestivals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (!selected) return;
    setProcessNotes(selected.process?.notes || '');
    setProcessStage((selected.process?.stage as any) || 'not_started');
    setChecklist({
      ammoniaContainerReady: Boolean(selected.process?.checklist?.ammoniaContainerReady),
      co2ContainerReady: Boolean(selected.process?.checklist?.co2ContainerReady),
      gasesConnected: Boolean(selected.process?.checklist?.gasesConnected),
      solutionCooled: Boolean(selected.process?.checklist?.solutionCooled),
      crystalsObserved: Boolean(selected.process?.checklist?.crystalsObserved)
    });
  }, [selected]);

  const updateStatus = async (id: string, status: 'pending' | 'in_progress' | 'completed' | 'dismissed') => {
    try {
      await apiFetch(`/festivals/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadFestivals();
      toast({ title: 'Updated', description: `Status changed to ${status}` });
    } catch {
      toast({ title: 'Update failed', description: 'Could not update status', variant: 'destructive' });
    }
  };

  const saveProcess = async () => {
    if (!selected) return;
    try {
      await apiFetch(`/festivals/${selected._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          process: {
            stage: processStage,
            notes: processNotes,
            checklist
          }
        })
      });
      await loadFestivals();
      toast({ title: 'Saved', description: 'Ammonium bicarbonate process progress saved.' });
    } catch {
      toast({ title: 'Save failed', description: 'Could not save process progress', variant: 'destructive' });
    }
  };

  const openGoogleMapsRoute = (festival: Festival) => {
    const { lat, lng } = festival.coordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const activeFestivals = useMemo(() => festivals.filter(f => f.status !== 'completed' && f.status !== 'dismissed'), [festivals]);
  const historyFestivals = useMemo(() => festivals.filter(f => f.status === 'completed' || f.status === 'dismissed'), [festivals]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="employee" />
      <main className="lg:ml-64 p-6">
        <div className="space-y-6">
          <div className="bg-gradient-eco rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Festival Idol Spot Management</h1>
            <p className="text-white/90">Review collector requests, navigate in real-time, and process the ammonium bicarbonate method.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Live Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full mb-4"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="space-y-3 max-h-[620px] overflow-auto pr-1">
                    {loading && <p className="text-sm">Loading...</p>}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {activeFestivals.map((f) => (
                      <div key={f._id} className={`border rounded-lg p-3 cursor-pointer ${selected?._id === f._id ? 'border-primary' : ''}`} onClick={() => setSelected(f)}>
                        <div className="font-medium">{f.name}</div>
                        <div className="text-xs text-muted-foreground">{f.siteType || 'spot'} • {f.siteName || 'Unknown site'}</div>
                        <div className="flex gap-2 mt-2">
                          <Badge className="capitalize">{f.status}</Badge>
                          <Badge variant="outline" className="capitalize">{f.festivalType || 'other'}</Badge>
                        </div>
                      </div>
                    ))}
                    {!loading && activeFestivals.length === 0 && <p className="text-sm text-muted-foreground">No active festival requests.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {selected && (
                <Card>
                  <CardHeader>
                    <CardTitle>{selected.name}</CardTitle>
                    <CardDescription>Reported on {new Date(selected.createdAt).toLocaleString()}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <img src={selected.imageBase64} alt={selected.name} className="w-full h-64 object-cover rounded" />
                      <div className="h-64 rounded-lg overflow-hidden border">
                        <UnifiedMap items={[{ ...selected, type: 'festival' }]} center={selected.coordinates} zoom={15} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="p-3 rounded border bg-muted/20">
                        <p className="text-muted-foreground">Festival Type</p>
                        <p className="font-medium capitalize">{selected.festivalType || 'other'}</p>
                      </div>
                      <div className="p-3 rounded border bg-muted/20">
                        <p className="text-muted-foreground">Site</p>
                        <p className="font-medium capitalize">{selected.siteType || 'spot'} • {selected.siteName || 'N/A'}</p>
                      </div>
                      <div className="p-3 rounded border bg-muted/20 sm:col-span-2">
                        <p className="text-muted-foreground">Landmark / Description</p>
                        <p className="font-medium">{selected.landmark || selected.description || 'No extra details provided'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" onClick={() => updateStatus(selected._id, 'in_progress')}>Start Processing</Button>
                      <Button size="sm" variant="eco" onClick={() => updateStatus(selected._id, 'completed')}>Mark as Completed</Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(selected._id, 'dismissed')}>Dismiss</Button>
                      <Button size="sm" variant="outline" onClick={() => openGoogleMapsRoute(selected)}>
                        <NavigationIcon className="h-4 w-4 mr-1" /> Navigate Real-time
                      </Button>
                    </div>

                    <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                      <h3 className="font-semibold">Ammonium Bicarbonate Processing Tracker</h3>
                      <Select value={processStage} onValueChange={(v: any) => setProcessStage(v)}>
                        <SelectTrigger><SelectValue placeholder="Process stage" /></SelectTrigger>
                        <SelectContent>
                          {stageOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={checklist.ammoniaContainerReady} onChange={(e) => setChecklist(prev => ({ ...prev, ammoniaContainerReady: e.target.checked }))} /> Ammonia container prepared</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={checklist.co2ContainerReady} onChange={(e) => setChecklist(prev => ({ ...prev, co2ContainerReady: e.target.checked }))} /> CO₂ container prepared</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={checklist.gasesConnected} onChange={(e) => setChecklist(prev => ({ ...prev, gasesConnected: e.target.checked }))} /> Gas mixing tubes connected</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={checklist.solutionCooled} onChange={(e) => setChecklist(prev => ({ ...prev, solutionCooled: e.target.checked }))} /> Solution cooled (0–10°C)</label>
                        <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={checklist.crystalsObserved} onChange={(e) => setChecklist(prev => ({ ...prev, crystalsObserved: e.target.checked }))} /> White NH₄HCO₃ crystals observed</label>
                      </div>

                      <Textarea value={processNotes} onChange={(e) => setProcessNotes(e.target.value)} placeholder="Add process notes, safety notes, yield details, etc." />
                      <Button onClick={saveProcess}>Save Process Progress</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Method to Create Ammonium Bicarbonate from Garbage Materials</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ammoniumBicarbonateInstructions.map((step, index) => (
                      <div key={index}>
                        <h4 className="font-semibold">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        <ul className="list-disc list-inside text-sm">
                          {step.materials.map((material, i) => <li key={i}>{material}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Processed History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                {historyFestivals.map((f) => (
                  <div key={f._id} className="border rounded-lg p-3">
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2"><MapPin className="h-3 w-3" /> {f.coordinates.lat.toFixed(5)}, {f.coordinates.lng.toFixed(5)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(f.updatedAt).toLocaleString()}</div>
                    <Badge className="mt-2 capitalize">{f.status}</Badge>
                  </div>
                ))}
                {historyFestivals.length === 0 && <p className="text-sm text-muted-foreground">No completed/dismissed records yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
