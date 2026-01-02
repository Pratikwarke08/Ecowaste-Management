import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import IncidentMap, { Incident } from '@/components/map/IncidentMap';
import { apiFetch } from '@/lib/api';
import { getReliableLocation } from '@/lib/location';
import { useToast } from '@/hooks/use-toast';

export default function IncidentsReview() {
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historySelected, setHistorySelected] = useState<Incident | null>(null);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [analyzingIncidentId, setAnalyzingIncidentId] = useState<string | null>(null);
  const [historyEstimate, setHistoryEstimate] = useState<{ estimatedCost: number; currency: string; note?: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    getReliableLocation()
      .then((coords) => setUserLocation(coords))
      .catch(() => setUserLocation(null));
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (urgencyFilter !== 'all') params.set('urgency', urgencyFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      const res = await apiFetch(`/incidents?${params.toString()}`);
      const json = await res.json();
      setIncidents(json);
      // Always move selection to first active incident after reload
      const nextActive = (json || []).find((i: Incident) => ['reported', 'acknowledged', 'in_progress'].includes(i.status));
      setSelected(nextActive || null);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, urgencyFilter, categoryFilter]);

  const updateStatus = async (incId: string, status: string) => {
    try {
      await apiFetch(`/incidents/${incId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadIncidents();
      toast({ title: 'Updated', description: `Status set to ${status}` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Update failed', description: 'Could not update status', variant: 'destructive' });
    }
  };

  const awardPoints = async (incId: string, points: number, note: string) => {
    try {
      await apiFetch(`/incidents/${incId}/reward`, { method: 'POST', body: JSON.stringify({ points, note }) });
      toast({ title: 'Points awarded', description: `${points} points credited` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Award failed', description: 'Could not award points', variant: 'destructive' });
    }
  };

  const openHistoryDetails = (incident: Incident) => {
    setHistorySelected(incident);
    setHistoryEstimate(null);
  };

  const analyzePothole = async (incident: Incident) => {
    if (incident.category !== 'pothole') {
      toast({ title: 'Not a pothole', description: 'Repair estimate is only available for pothole incidents.', variant: 'destructive' });
      return;
    }
    try {
      setAnalyzingIncidentId(incident._id);
      const res = await apiFetch(`/incidents/${incident._id}/estimate-repair`, { method: 'POST' });
      const json = await res.json();
      toast({ title: 'Estimated repair cost', description: `Approx ${json.estimatedCost} ${json.currency}` });
      if (historySelected && historySelected._id === incident._id) {
        setHistoryEstimate({ estimatedCost: json.estimatedCost, currency: json.currency, note: json.note });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Analysis failed', description: 'Could not estimate repair cost', variant: 'destructive' });
    } finally {
      setAnalyzingIncidentId(null);
    }
  };

  const items = useMemo(() => incidents, [incidents]);
  // Active: only brand new incidents that have not been reviewed yet
  const activeIncidents = useMemo(
    () => items.filter(i => i.status === 'reported'),
    [items]
  );
  // History: everything that has been reviewed by an employee (i.e. left the initial 'reported' state),
  // including acknowledged / in_progress / resolved / dismissed. This way employee can still
  // see and update incidents they have already touched, while closed ones just show final status.
  const historyIncidents = useMemo(
    () => items.filter(i => i.status !== 'reported'),
    [items]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="employee" />
      <main className="lg:ml-64 p-6">
        <div className="space-y-6">
          <div className="bg-gradient-ocean rounded-lg p-6 text-white animate-fade-in">
            <h1 className="text-2xl font-bold mb-2">Incident Review</h1>
            <p className="text-white/90">Monitor and act on reported incidents with real-time map and details.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="h-[520px]">
              <CardHeader>
                <CardTitle>Incidents Map</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[440px]">
                {historySelected ? (
                  // When viewing history details modal, keep this area empty to avoid overlapping maps visually
                  <div className="w-full h-full" />
                ) : loading ? (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Loading map…</div>
                ) : activeIncidents.length === 0 ? (
                  <div className="w-full h-full" />
                ) : (
                  <IncidentMap userLocation={userLocation} incidents={activeIncidents} onSelect={setSelected} />
                )}
              </CardContent>
            </Card>

            {/* Active incidents list */}
            <Card>
              <CardHeader>
                <CardTitle>Active Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="reported">Reported</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Urgency" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Urgency</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[240px]"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="pothole">Potholes</SelectItem>
                      <SelectItem value="accident">Accidents</SelectItem>
                      <SelectItem value="unethical_activity">Unethical</SelectItem>
                      <SelectItem value="dead_animal">Dead animal</SelectItem>
                      <SelectItem value="suspicious_activity">Suspicious</SelectItem>
                      <SelectItem value="beggar">Beggars</SelectItem>
                      <SelectItem value="tree_break">Tree breaks</SelectItem>
                      <SelectItem value="electricity_pole_issue">Electricity poles</SelectItem>
                      <SelectItem value="unauthorized_logging">Unauthorised loggings</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                  {activeIncidents.map((i) => (
                    <div key={i._id} className="border rounded-lg p-3 flex gap-3">
                      <img src={i.imageBase64} alt={i.category} className="w-28 h-20 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium capitalize">{i.category.replace(/_/g,' ')}</div>
                          <Badge className="capitalize">{i.urgency}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{i.description || 'No description'}</div>
                        <div className="text-xs text-muted-foreground mt-1">{i.coordinates.lat.toFixed(5)}, {i.coordinates.lng.toFixed(5)}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Button size="sm" variant="outline" onClick={() => setSelected(i)}>Focus on Map</Button>
                          <Button size="sm" onClick={() => updateStatus(i._id, 'acknowledged')}>Acknowledge</Button>
                          <Button size="sm" variant="secondary" onClick={() => updateStatus(i._id, 'in_progress')}>In Progress</Button>
                          <Button size="sm" variant="eco" onClick={() => updateStatus(i._id, 'resolved')}>Resolve</Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(i._id, 'dismissed')}>Dismiss</Button>
                          {i.category === 'pothole' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => analyzePothole(i)}
                              disabled={analyzingIncidentId === i._id}
                            >
                              {analyzingIncidentId === i._id ? 'Analyzing…' : 'Analyze Pothole with AI'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History below the map on the same page */}
          <div className="grid grid-cols-1 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>History</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                ) : historyIncidents.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No reviewed incidents yet.</div>
                ) : (
                  <div className="space-y-3">
                    {historyIncidents.map((i) => (
                      <div key={i._id} className="border rounded-lg p-3 flex gap-3">
                        <img src={i.imageBase64} alt={i.category} className="w-28 h-20 object-cover rounded" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="font-medium capitalize">{i.category.replace(/_/g,' ')}</div>
                            {i.status === 'resolved' && !i.rewarded ? (
                              <Badge variant="secondary" className="normal-case">Resolved but waiting for points to be rewarded</Badge>
                            ) : (
                              <Badge variant="secondary" className="capitalize">{i.status.replace(/_/g,' ')}</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{i.description || 'No description'}</div>
                          <div className="text-xs text-muted-foreground mt-1">Updated {new Date((i as Incident & { updatedAt?: string }).updatedAt || Date.now()).toLocaleString()}</div>
                          <div className="mt-2 flex flex-wrap gap-2 items-center">
                            <Button size="sm" variant="outline" onClick={() => openHistoryDetails(i)}>View Details</Button>
                            {/* Allow further status changes for non-final incidents */}
                            {!(i.status === 'resolved' && i.rewarded) && i.status !== 'dismissed' && (
                              <>
                                <Button size="sm" onClick={() => updateStatus(i._id, 'acknowledged')}>Acknowledge</Button>
                                <Button size="sm" variant="secondary" onClick={() => updateStatus(i._id, 'in_progress')}>In Progress</Button>
                                <Button size="sm" variant="eco" onClick={() => updateStatus(i._id, 'resolved')}>Resolve</Button>
                                <Button size="sm" variant="destructive" onClick={() => updateStatus(i._id, 'dismissed')}>Dismiss</Button>
                              </>
                            )}
                            {/* When resolved but not rewarded, allow awarding points from history */}
                            {i.status === 'resolved' && !i.rewarded && (
                              <>
                                <Input type="number" min={1} placeholder="Points" className="w-24 h-8 text-sm" id={`points-h-${i._id}`} />
                                <Input type="text" placeholder="Note to collector" className="flex-1 h-8 text-sm min-w-[160px]" id={`note-h-${i._id}`} />
                                <Button size="sm" onClick={() => {
                                  const ptsEl = document.getElementById(`points-h-${i._id}`) as HTMLInputElement | null;
                                  const noteEl = document.getElementById(`note-h-${i._id}`) as HTMLInputElement | null;
                                  const pts = Number(ptsEl?.value || 0);
                                  const note = noteEl?.value || '';
                                  if (!pts || pts <= 0) {
                                    toast({ title: 'Enter points', description: 'Provide a positive number', variant: 'destructive' });
                                    return;
                                  }
                                  awardPoints(i._id, pts, note);
                                  loadIncidents();
                                }}>Award Points</Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* History Details Modal */}
          {historySelected && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setHistorySelected(null)}>
              <div className="bg-background rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold capitalize">{historySelected.category.replace(/_/g,' ')}</h2>
                      <p className="text-sm text-muted-foreground">{new Date((historySelected as Incident & { updatedAt?: string }).updatedAt || Date.now()).toLocaleString()}</p>
                    </div>
                    {historySelected.status === 'resolved' && !historySelected.rewarded ? (
                      <Badge variant="secondary" className="normal-case">Resolved but waiting for points to be rewarded</Badge>
                    ) : (
                      <Badge variant="secondary" className="capitalize">{historySelected.status.replace(/_/g,' ')}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-2">Details</h3>
                      <p className="text-sm text-muted-foreground mb-1">Urgency: <span className="capitalize">{historySelected.urgency}</span></p>
                      <p className="text-sm text-muted-foreground mb-1">Description: {historySelected.description || 'No description'}</p>
                      <p className="text-sm text-muted-foreground">Coordinates: {historySelected.coordinates.lat.toFixed(6)}, {historySelected.coordinates.lng.toFixed(6)}</p>
                      <img src={historySelected.imageBase64} alt="incident" className="mt-4 rounded-lg w-full object-cover" style={{ maxHeight: '240px' }} />
                      {historySelected.category === 'pothole' && (
                        <div className="mt-4 space-y-2">
                          <Button
                            size="sm"
                            variant="eco"
                            onClick={() => analyzePothole(historySelected)}
                            disabled={analyzingIncidentId === historySelected._id}
                          >
                            {analyzingIncidentId === historySelected._id ? 'Analyzing…' : 'Analyze Pothole with AI'}
                          </Button>
                          {historyEstimate && (
                            <p className="text-sm text-muted-foreground">
                              Estimated repair cost: ~{historyEstimate.estimatedCost} {historyEstimate.currency}
                              {historyEstimate.note ? ` • ${historyEstimate.note}` : ''}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Location</h3>
                      <div className="h-64 rounded-lg overflow-hidden border">
                        <IncidentMap userLocation={null} incidents={[historySelected]} onSelect={() => {}} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button variant="outline" onClick={() => setHistorySelected(null)}>Close</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
