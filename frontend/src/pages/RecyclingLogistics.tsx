import { useEffect, useState } from "react";
import Navigation from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Job = {
  _id: string;
  title: string;
  materialType: string;
  quantityKg: number;
  status: "pending" | "assigned" | "in_transit" | "delivered";
  pickupLocation: { lat: number; lng: number };
  dropLocation: { lat: number; lng: number };
  assignedTo?: { name?: string; email?: string };
};

type DashboardData = {
  summary: {
    totalJobs: number;
    pending: number;
    assigned: number;
    inTransit: number;
    delivered: number;
    fullOrUrgentDustbins: number;
    unresolvedComplaints: number;
  };
  jobs: Job[];
  demandSignals: {
    fullDustbins: Array<{ _id: string; name: string; status: string; fillLevel: number; urgent: boolean }>;
    unresolvedComplaints: Array<{ _id: string; title: string; priority: string; status: string }>;
  };
  materialSupply: Array<{ materialType: string; totalWeightKg: number }>;
};

export default function RecyclingLogistics() {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    materialType: "",
    quantityKg: "",
    pickupLat: "",
    pickupLng: "",
    dropLat: "",
    dropLng: "",
  });

  const loadDashboard = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await apiFetch("/dashboard/recycling-logistics");
      const json = await res.json();
      setData(json);
    } catch (err) {
      if (!silent) toast({ title: "Load failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const id = window.setInterval(() => loadDashboard(true), 15000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createJob = async () => {
    try {
      setCreating(true);
      await apiFetch("/recycling-logistics", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          materialType: form.materialType,
          quantityKg: Number(form.quantityKg),
          pickupLocation: { lat: Number(form.pickupLat), lng: Number(form.pickupLng) },
          dropLocation: { lat: Number(form.dropLat), lng: Number(form.dropLng) },
        }),
      });
      setForm({ title: "", materialType: "", quantityKg: "", pickupLat: "", pickupLng: "", dropLat: "", dropLng: "" });
      toast({ title: "Job created", description: "Recycling logistics job created successfully." });
      await loadDashboard();
    } catch (err) {
      toast({ title: "Create failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const setStatus = async (id: string, status: Job["status"]) => {
    try {
      await apiFetch(`/recycling-logistics/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadDashboard(true);
    } catch (err) {
      toast({ title: "Update failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="recycling_logistics" />
      <main className="lg:ml-64 p-4 sm:p-6 space-y-6">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-lg p-5 text-white">
          <h1 className="text-2xl font-bold">Recycling Logistics Dashboard</h1>
          <p className="text-sm text-white/90 mt-1">Live connected view from dustbins, complaints, reports, and logistics operations.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Jobs</p><p className="text-xl font-semibold">{data?.summary.totalJobs ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Transit</p><p className="text-xl font-semibold">{data?.summary.inTransit ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Urgent Dustbins</p><p className="text-xl font-semibold">{data?.summary.fullOrUrgentDustbins ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open Complaints</p><p className="text-xl font-semibold">{data?.summary.unresolvedComplaints ?? 0}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Create Logistics Job</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Material Type</Label><Input value={form.materialType} onChange={(e) => setForm({ ...form, materialType: e.target.value })} /></div>
            <div><Label>Quantity (kg)</Label><Input type="number" value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} /></div>
            <div><Label>Pickup Lat</Label><Input type="number" value={form.pickupLat} onChange={(e) => setForm({ ...form, pickupLat: e.target.value })} /></div>
            <div><Label>Pickup Lng</Label><Input type="number" value={form.pickupLng} onChange={(e) => setForm({ ...form, pickupLng: e.target.value })} /></div>
            <div><Label>Drop Lat</Label><Input type="number" value={form.dropLat} onChange={(e) => setForm({ ...form, dropLat: e.target.value })} /></div>
            <div><Label>Drop Lng</Label><Input type="number" value={form.dropLng} onChange={(e) => setForm({ ...form, dropLng: e.target.value })} /></div>
            <div className="sm:col-span-2"><Button onClick={createJob} disabled={creating}>{creating ? "Creating..." : "Create Logistics Job"}</Button></div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Live Material Supply</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.materialSupply || []).map((m) => (
                <div key={m.materialType} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <span className="text-sm">{m.materialType}</span>
                  <span className="text-sm font-medium">{m.totalWeightKg} kg</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Demand Signals</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Full / Urgent Dustbins</p>
                <div className="space-y-2">
                  {(data?.demandSignals.fullDustbins || []).slice(0, 6).map((d) => (
                    <div key={d._id} className="text-xs border rounded-md p-2">{d.name} • fill {d.fillLevel}% • {d.urgent ? "urgent" : d.status}</div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Unresolved Complaints</p>
                <div className="space-y-2">
                  {(data?.demandSignals.unresolvedComplaints || []).slice(0, 6).map((c) => (
                    <div key={c._id} className="text-xs border rounded-md p-2">{c.title} • {c.priority} • {c.status}</div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Jobs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (data?.jobs || []).map((j) => (
              <div key={j._id} className="border rounded-lg p-3">
                <p className="font-medium">{j.title}</p>
                <p className="text-xs text-muted-foreground">{j.materialType} • {j.quantityKg} kg • {j.status.replace("_", " ")}</p>
                <p className="text-xs text-muted-foreground">Assigned: {j.assignedTo?.name || j.assignedTo?.email || "Unassigned"}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => setStatus(j._id, "assigned")}>Assigned</Button>
                  <Button size="sm" variant="secondary" onClick={() => setStatus(j._id, "in_transit")}>In Transit</Button>
                  <Button size="sm" onClick={() => setStatus(j._id, "delivered")}>Delivered</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
