import { useEffect, useState } from "react";
import Navigation from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Listing = {
  _id: string;
  title: string;
  materialType: string;
  quantityKg: number;
  pricePerKg: number;
  status: "open" | "reserved" | "sold" | "cancelled";
  seller?: { name?: string; email?: string };
  buyer?: { name?: string; email?: string };
};

type MarketplaceDashboard = {
  summary: {
    openListings: number;
    reservedListings: number;
    soldListings: number;
    totalListings: number;
  };
  listings: Listing[];
  liveInventory: Array<{ materialType: string; quantityKg: number }>;
};

export default function WasteMarketplace() {
  const { toast } = useToast();
  const [data, setData] = useState<MarketplaceDashboard | null>(null);
  const [form, setForm] = useState({ title: "", materialType: "", quantityKg: "", pricePerKg: "" });
  const [creating, setCreating] = useState(false);

  const loadDashboard = async (silent = false) => {
    try {
      const res = await apiFetch("/dashboard/waste-marketplace");
      const json = await res.json();
      setData(json);
    } catch (err) {
      if (!silent) toast({ title: "Load failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  useEffect(() => {
    loadDashboard();
    const id = window.setInterval(() => loadDashboard(true), 15000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createListing = async () => {
    try {
      setCreating(true);
      await apiFetch("/waste-marketplace", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          materialType: form.materialType,
          quantityKg: Number(form.quantityKg),
          pricePerKg: Number(form.pricePerKg),
        }),
      });
      setForm({ title: "", materialType: "", quantityKg: "", pricePerKg: "" });
      toast({ title: "Listing created", description: "Marketplace listing published." });
      await loadDashboard(true);
    } catch (err) {
      toast({ title: "Create failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const reserveListing = async (id: string) => {
    try {
      await apiFetch(`/waste-marketplace/${id}/buy`, { method: "POST" });
      toast({ title: "Reserved", description: "Listing reserved successfully." });
      await loadDashboard(true);
    } catch (err) {
      toast({ title: "Reserve failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="waste_buyer" />
      <main className="lg:ml-64 p-4 sm:p-6 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-700 rounded-lg p-5 text-white">
          <h1 className="text-2xl font-bold">Waste Buyer Marketplace Dashboard</h1>
          <p className="text-sm text-white/90 mt-1">Live marketplace + real inventory feed from verified operations.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open</p><p className="text-xl font-semibold">{data?.summary.openListings ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Reserved</p><p className="text-xl font-semibold">{data?.summary.reservedListings ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Sold</p><p className="text-xl font-semibold">{data?.summary.soldListings ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Listings</p><p className="text-xl font-semibold">{data?.summary.totalListings ?? 0}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Create Listing</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Material Type</Label><Input value={form.materialType} onChange={(e) => setForm({ ...form, materialType: e.target.value })} /></div>
              <div><Label>Quantity (kg)</Label><Input type="number" value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} /></div>
              <div><Label>Price / kg</Label><Input type="number" value={form.pricePerKg} onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })} /></div>
              <div className="sm:col-span-2"><Button onClick={createListing} disabled={creating}>{creating ? "Publishing..." : "Publish Listing"}</Button></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Live Inventory Feed</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.liveInventory || []).map((inv) => (
                <div key={inv.materialType} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <span className="text-sm">{inv.materialType}</span>
                  <span className="text-sm font-medium">{inv.quantityKg} kg</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Listings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data?.listings || []).map((l) => (
              <div key={l._id} className="border rounded-lg p-3">
                <p className="font-medium">{l.title}</p>
                <p className="text-xs text-muted-foreground">{l.materialType} • {l.quantityKg} kg • ₹{l.pricePerKg}/kg</p>
                <p className="text-xs text-muted-foreground">Seller: {l.seller?.name || l.seller?.email || "Unknown"} • Status: {l.status}</p>
                {l.status === "open" && <Button size="sm" className="mt-2" onClick={() => reserveListing(l._id)}>Reserve</Button>}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
