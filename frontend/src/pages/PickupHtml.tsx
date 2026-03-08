import { useEffect, useState } from "react";
import Navigation from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/lib/roles";

export default function PickupHtml() {
  const { toast } = useToast();
  const role = (localStorage.getItem("userType") as UserRole) || "collector";
  const [myUploads, setMyUploads] = useState<Array<{ _id: string; wasteWeightKg?: number; materialType?: string; status: string }>>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [form, setForm] = useState({ waste_upload_id: "", lat: "", lng: "" });
  const [collectorForm, setCollectorForm] = useState({ name: "", vehicle_type: "", contact: "", lat: "", lng: "", radiusKm: "5" });

  const loadAll = async () => {
    try {
      const [reportsRes, mineRes, pendingRes] = await Promise.all([
        apiFetch("/reports?scope=collector&page=1&limit=50"),
        apiFetch("/pickup/my"),
        apiFetch("/pickup/pending"),
      ]);
      const [reportsJson, mineJson, pendingJson] = await Promise.all([reportsRes.json(), mineRes.json(), pendingRes.json()]);
      const uploads = Array.isArray(reportsJson?.reports) ? reportsJson.reports : [];
      setMyUploads(uploads.filter((r: any) => r.status === "approved"));
      setMyRequests(Array.isArray(mineJson) ? mineJson : []);
      setPending(Array.isArray(pendingJson) ? pendingJson : []);
    } catch (err) {
      toast({ title: "Load failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestPickup = async () => {
    try {
      await apiFetch("/pickup/request", {
        method: "POST",
        body: JSON.stringify({
          waste_upload_id: form.waste_upload_id,
          pickup_location: { lat: Number(form.lat), lng: Number(form.lng) },
        }),
      });
      toast({ title: "Pickup requested" });
      await loadAll();
    } catch (err) {
      toast({ title: "Request failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const registerCollector = async () => {
    try {
      await apiFetch("/collector/register", {
        method: "POST",
        body: JSON.stringify({
          name: collectorForm.name,
          vehicle_type: collectorForm.vehicle_type,
          contact: collectorForm.contact,
          service_area: {
            lat: Number(collectorForm.lat),
            lng: Number(collectorForm.lng),
            radiusKm: Number(collectorForm.radiusKm || 5),
          },
        }),
      });
      toast({ title: "Collector profile saved" });
      await loadAll();
    } catch (err) {
      toast({ title: "Register failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const assign = async (id: string) => {
    try {
      await apiFetch("/pickup/assign", { method: "POST", body: JSON.stringify({ pickup_request_id: id }) });
      await loadAll();
    } catch (err) {
      toast({ title: "Assign failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const complete = async (id: string) => {
    try {
      await apiFetch("/pickup/complete", { method: "POST", body: JSON.stringify({ pickup_request_id: id }) });
      await loadAll();
    } catch (err) {
      toast({ title: "Complete failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={role} />
      <main className="lg:ml-64 p-4 sm:p-6 space-y-6">
        <Card>
          <CardHeader><CardTitle>Pickup Requests</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Request pickup for verified uploads and manage collector assignments.
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>User Request Pickup</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <div>
                <Label>Verified Waste Upload</Label>
                <select className="w-full h-10 border rounded-md px-3 bg-background" value={form.waste_upload_id} onChange={(e) => setForm({ ...form, waste_upload_id: e.target.value })}>
                  <option value="">Select upload</option>
                  {myUploads.map((u) => (
                    <option key={u._id} value={u._id}>{u._id.slice(-8)} • {(u.wasteWeightKg || 0).toFixed(2)}kg • {u.materialType || "unknown"}</option>
                  ))}
                </select>
              </div>
              <div><Label>Pickup Lat</Label><Input type="number" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} /></div>
              <div><Label>Pickup Lng</Label><Input type="number" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} /></div>
              <Button onClick={requestPickup}>Request Pickup</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Collector Dashboard Setup</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={collectorForm.name} onChange={(e) => setCollectorForm({ ...collectorForm, name: e.target.value })} /></div>
              <div><Label>Vehicle Type</Label><Input value={collectorForm.vehicle_type} onChange={(e) => setCollectorForm({ ...collectorForm, vehicle_type: e.target.value })} /></div>
              <div><Label>Contact</Label><Input value={collectorForm.contact} onChange={(e) => setCollectorForm({ ...collectorForm, contact: e.target.value })} /></div>
              <div><Label>Service Lat</Label><Input type="number" value={collectorForm.lat} onChange={(e) => setCollectorForm({ ...collectorForm, lat: e.target.value })} /></div>
              <div><Label>Service Lng</Label><Input type="number" value={collectorForm.lng} onChange={(e) => setCollectorForm({ ...collectorForm, lng: e.target.value })} /></div>
              <div><Label>Radius Km</Label><Input type="number" value={collectorForm.radiusKm} onChange={(e) => setCollectorForm({ ...collectorForm, radiusKm: e.target.value })} /></div>
              <div className="sm:col-span-2"><Button onClick={registerCollector}>Save Collector Profile</Button></div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>My Pickup Requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myRequests.map((r) => (
              <div key={r._id} className="border rounded-md p-2 text-xs">
                #{r._id.slice(-8)} • {r.status} • suggested: {String(r.suggested)} • {r.pickup_location?.lat?.toFixed?.(4)}, {r.pickup_location?.lng?.toFixed?.(4)}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Collector Pending Requests (Nearby &lt; 5km)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pending.map((p) => (
              <div key={p._id} className="border rounded-md p-2 text-xs">
                #{p._id.slice(-8)} • {p.status} • {p.pickup_location?.lat?.toFixed?.(4)}, {p.pickup_location?.lng?.toFixed?.(4)}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => assign(p._id)}>Accept</Button>
                  <Button size="sm" onClick={() => complete(p._id)}>Complete</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
