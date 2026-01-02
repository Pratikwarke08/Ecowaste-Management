import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Navigation from '@/components/layout/Navigation';
import {
  Camera,
  MapPin,
  CheckCircle,
  Clock,
  Leaf,
  Users,
  X,
  Award,
  ChevronRight
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

// --- Types ---
export type TowerScale = 'home' | 'balcony' | 'front_yard' | 'community_corner' | 'school';

export interface TowerPlan {
  id: string;
  ownerId: string;
  location: { lat: number; lng: number; address?: string };
  scale: TowerScale;
  config: { pothos: number; bamboo: number; vetiverMeters: number };
  status: 'planned' | 'planted' | 'maintaining';
  plantedAt?: string;
}

const INITIAL_LOCAL_PLAN: Omit<TowerPlan, 'id' | 'ownerId'> = {
  location: { lat: 0, lng: 0, address: '' },
  scale: 'home',
  config: { pothos: 3, bamboo: 0, vetiverMeters: 1 },
  status: 'planned'
};

const SmogTowerWizard: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<TowerPlan[]>([]);
  const [activePlan, setActivePlan] = useState<TowerPlan | null>(null);
  const [localPlan, setLocalPlan] = useState<typeof INITIAL_LOCAL_PLAN>(INITIAL_LOCAL_PLAN);
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load plans on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch('/smog-towers');
        // assume apiFetch returns a Response-like object
        const json = await res.json();
        if (!mounted) return;
        // validate shape loosely and coerce to TowerPlan[] if possible
        if (Array.isArray(json)) {
          // Basic runtime check: ensure each item has id
          const coerced: TowerPlan[] = json.map((item: any) => ({
            id: String(item.id || item._id || `plan_${Date.now()}`),
            ownerId: String(item.ownerId || item.owner || 'unknown'),
            location: {
              lat: Number(item.location?.lat ?? 0),
              lng: Number(item.location?.lng ?? 0),
              address: item.location?.address ?? item.address ?? ''
            },
            scale: (item.scale as TowerScale) || 'home',
            config: {
              pothos: Number(item.config?.pothos ?? 0),
              bamboo: Number(item.config?.bamboo ?? 0),
              vetiverMeters: Number(item.config?.vetiverMeters ?? 0)
            },
            status: (item.status === 'planted' || item.status === 'maintaining') ? item.status : 'planned',
            plantedAt: item.plantedAt ? String(item.plantedAt) : undefined
          }));
          setPlans(coerced);
          if (coerced.length > 0) setActivePlan(coerced[0]);
        } else {
          setPlans([]);
        }
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError('Could not load smog tower plans');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const summary = useMemo(() => ({
    totalPlanned: plans.length,
    plantedCount: plans.filter(p => p.status === 'planted').length,
    maintainingCount: plans.filter(p => p.status === 'maintaining').length
  }), [plans]);

  // Save plan (creates a new TowerPlan locally and tries to persist)
  const savePlan = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const newPlan: TowerPlan = {
        id: `plan_${Date.now()}`,
        ownerId: 'me',
        location: {
          lat: Number(localPlan.location.lat ?? 0),
          lng: Number(localPlan.location.lng ?? 0),
          address: localPlan.location.address ?? ''
        },
        scale: localPlan.scale,
        config: {
          pothos: Number(localPlan.config.pothos ?? 0),
          bamboo: Number(localPlan.config.bamboo ?? 0),
          vetiverMeters: Number(localPlan.config.vetiverMeters ?? 0)
        },
        status: 'planned'
      };

      // optimistic update
      setPlans((prev: TowerPlan[]) => [newPlan, ...prev]);
      setActivePlan(newPlan);

      // persist to API (fire-and-forget but await to surface errors)
      try {
        const res = await apiFetch('/smog-towers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPlan)
        });
        // optional: update id from server response
        if (res && typeof res.json === 'function') {
          const saved = await res.json();
          if (saved && (saved.id || saved._id)) {
            const serverId = String(saved.id ?? saved._id);
            setPlans((prev: TowerPlan[]) => prev.map(p => p.id === newPlan.id ? { ...p, id: serverId } : p));
            setActivePlan(prev => prev && prev.id === newPlan.id ? { ...prev, id: serverId } : prev);
          }
        }
      } catch (persistErr) {
        console.warn('Failed to persist new plan', persistErr);
      }

      setStep(4);
    } catch (err) {
      console.error(err);
      setError('Failed to create plan');
    } finally {
      setIsLoading(false);
    }
  };

  // Deploy a plan (mark as planted)
  const deployNow = async (plan: TowerPlan): Promise<void> => {
    if (!plan) return;

    // build updated object explicitly typed as TowerPlan
    const updated: TowerPlan = {
      ...plan,
      status: 'planted',
      plantedAt: new Date().toISOString()
    };

    // update state safely with explicit types
    setPlans((prev: TowerPlan[]) => prev.map((p: TowerPlan) => (p.id === plan.id ? updated : p)));
    setActivePlan(updated);

    // attempt to persist
    try {
      await apiFetch(`/smog-towers/${encodeURIComponent(plan.id)}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantedAt: updated.plantedAt })
      });
    } catch (err) {
      console.warn('deploy persist failed', err);
    }
  };

  // Basic handlers for UI actions
  const handleScaleSelect = (scale: TowerScale) => setLocalPlan(prev => ({ ...prev, scale }));
  const handleSizePreset = (pothosCount: number) => setLocalPlan(prev => ({ ...prev, config: { ...prev.config, pothos: pothosCount } }));

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const userName = user?.name || user?.email || 'Collector';

  // determine role for navigation (fallback to collector)
  const role: 'collector' | 'employee' = (user?.role === 'employee') ? 'employee' : 'collector';

  return (
    <div className="min-h-screen flex">
      <Navigation userRole={role} />
      <main className="flex-1 ml-64 p-6">
        <div className="space-y-6">
          <div className="bg-gradient-eco rounded-lg p-6 text-white animate-fade-in">
            <h1 className="text-2xl font-bold mb-2">Natural Smog Tower — Deploy & Maintain</h1>
            <p className="text-white/90">Guide your community from cuttings to a working green smog tower.</p>
          </div>

          {error && (
            <Card className="border-destructive">
              <CardContent className="p-4 flex items-center gap-3 text-destructive">
                <X className="h-5 w-5" />
                <span>{error}</span>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Planned Towers</p>
                    <p className="text-2xl font-bold text-eco-forest-primary">{isLoading ? '—' : String(summary.totalPlanned)}</p>
                  </div>
                  <MapPin className="h-8 w-8 text-eco-forest-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Planted</p>
                    <p className="text-2xl font-bold text-eco-success">{isLoading ? '—' : String(summary.plantedCount)}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-eco-success" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Maintaining</p>
                    <p className="text-2xl font-bold text-eco-warning">{isLoading ? '—' : String(summary.maintainingCount)}</p>
                  </div>
                  <Leaf className="h-8 w-8 text-eco-warning" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Community Actions</p>
                    <p className="text-2xl font-bold text-eco-forest-primary">{plans.length ? String(plans.length * 2) : '—'}</p>
                  </div>
                  <Users className="h-8 w-8 text-eco-forest-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Smog Tower Wizard</CardTitle>
                <CardDescription>Step-by-step planting → deployment → maintenance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm">Step {step} of 4</div>

                  {step === 1 && (
                    <div className="space-y-3">
                      <label className="text-xs font-medium">Select scale</label>
                      <div className="flex gap-2">
                        <Button variant={localPlan.scale === 'home' ? 'eco' : 'ghost'} onClick={() => handleScaleSelect('home')}>Home Balcony</Button>
                        <Button variant={localPlan.scale === 'front_yard' ? 'eco' : 'ghost'} onClick={() => handleScaleSelect('front_yard')}>Front Yard</Button>
                        <Button variant={localPlan.scale === 'community_corner' ? 'eco' : 'ghost'} onClick={() => handleScaleSelect('community_corner')}>Community</Button>
                      </div>

                      <label className="text-xs font-medium">Available space (preset)</label>
                      <div className="flex gap-2">
                        <Button onClick={() => handleSizePreset(3)}>Small</Button>
                        <Button onClick={() => handleSizePreset(6)}>Medium</Button>
                        <Button onClick={() => handleSizePreset(12)}>Large</Button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-3">
                      <label className="text-xs font-medium">Recommended configuration</label>
                      <div className="text-sm space-y-2">
                        <div>• Pothos: {localPlan.config.pothos} cuttings</div>
                        <div>• Bamboo slips: {localPlan.config.bamboo || 0}</div>
                        <div>• Vetiver strip (m): {localPlan.config.vetiverMeters}</div>
                        <div className="text-xs text-muted-foreground">Materials: pots, twine, soil mix, compost, recycled bottles (optional)</div>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-3">
                      <label className="text-xs font-medium">Planting guide (quick)</label>
                      <ol className="text-sm list-decimal list-inside space-y-1">
                        <li>Root pothos cuttings in water for 7–14 days.</li>
                        <li>Fill pot with soil+compost+cocopeat, plant roots, keep semi-shade.</li>
                        <li>Arrange vertical stack, place bamboo hedge along road, plant vetiver dense strip.</li>
                        <li>Water regularly and prune monthly.</li>
                      </ol>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-3">
                      <label className="text-xs font-medium">Deploy</label>
                      <div className="text-sm">When you're ready, save your plan and request volunteer help if needed.</div>
                      <div className="flex gap-2 pt-3">
                        <Button variant="eco" onClick={savePlan} className="flex-1">Save Plan</Button>
                        <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">Start Over</Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <Button variant="ghost" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>Back</Button>
                    <Button onClick={() => setStep(s => Math.min(4, s + 1))}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Plans</CardTitle>
                <CardDescription>Recent smog tower plans & status</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading plans...</p>
                ) : plans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No plans yet. Create one with the wizard.</p>
                ) : (
                  <div className="space-y-3">
                    {plans.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{p.scale.replace('_',' ')}</p>
                          <p className="text-xs text-muted-foreground">{p.config.pothos} pothos • {p.config.bamboo} bamboo • {p.config.vetiverMeters}m vetiver</p>
                          <p className="text-xs text-muted-foreground">{p.location.address || `${p.location.lat.toFixed(3)}, ${p.location.lng.toFixed(3)}`}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="capitalize">{p.status}</Badge>
                          {p.status === 'planned' && <Button size="sm" onClick={() => deployNow(p)}>Deploy</Button>}
                          <Button size="sm" variant="ghost" onClick={() => { setActivePlan(p); navigate(`/smog-towers/${encodeURIComponent(p.id)}`); }}>Manage</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monitoring & Tips</CardTitle>
                <CardDescription>Keep your tower healthy — quick checks & sensor options</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span>Watering (pothos)</span><span>Weekly</span></div>
                  <div className="flex justify-between"><span>Pruning</span><span>Monthly</span></div>
                  <div className="flex justify-between"><span>Compost top-up</span><span>Quarterly</span></div>
                  <div className="pt-2">
                    <Button variant="ocean" className="w-full" onClick={() => navigate('/sensors')}>Connect Low-cost Sensor</Button>
                  </div>
                  <div className="pt-2 text-xs text-muted-foreground">Tip: let the vertical wall face the road; bamboo hedges are best on the roadside to trap dust.</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Community Tasks</CardTitle>
                <CardDescription>Volunteer jobs & planting drives</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">Plant 20 pothos cuttings</p>
                      <p className="text-xs text-muted-foreground">Location: Block A • Volunteers: 3/10</p>
                    </div>
                    <Button size="sm" onClick={() => navigate('/volunteer')}>Join</Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">Donate pots & compost</p>
                      <p className="text-xs text-muted-foreground">Drive this weekend</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => navigate('/donate')}>Donate</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Impact Snapshot</CardTitle>
                <CardDescription>Estimated local air benefits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span>Estimated dust reduction</span><span>Moderate</span></div>
                  <div className="flex justify-between"><span>Area covered</span><span>~10 m² per tower</span></div>
                  <div className="flex justify-between"><span>Recommended plants</span><span>Pothos, Bamboo, Vetiver</span></div>
                  <Progress value={40} className="h-2" />
                  <div className="pt-2">
                    <Button variant="eco" className="w-full" onClick={() => navigate('/share')}>Share Plan</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SmogTowerWizard;
