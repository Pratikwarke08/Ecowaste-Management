import { useEffect, useState } from "react";
import Navigation from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/lib/roles";

type Listing = {
  _id: string;
  material_type: string;
  weight: number;
  price_per_kg: number;
  status: "available" | "sold";
  seller_user_id?: { name?: string; email?: string };
  waste_upload_id?: { pickupLocation?: { lat: number; lng: number }; disposalLocation?: { lat: number; lng: number } };
};

export default function MarketplaceHtml() {
  const { toast } = useToast();
  const role = (localStorage.getItem("userType") as UserRole) || "collector";
  const [listings, setListings] = useState<Listing[]>([]);
  const [myUploads, setMyUploads] = useState<Array<{ _id: string; materialType?: string; wasteWeightKg?: number; status: string }>>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [recyclerForm, setRecyclerForm] = useState({ name: "", company: "", contact: "", lat: "", lng: "" });
  const [listingForm, setListingForm] = useState({ waste_upload_id: "", material_type: "", weight: "", price_per_kg: "" });
  const [orderQty, setOrderQty] = useState<Record<string, string>>({});

  const loadAll = async () => {
    try {
      const [listingRes, reportsRes, orderRes] = await Promise.all([
        apiFetch("/waste/listings"),
        apiFetch("/reports?scope=collector&page=1&limit=50"),
        apiFetch("/orders/recycler"),
      ]);
      const [listingData, reportsData, orderData] = await Promise.all([listingRes.json(), reportsRes.json(), orderRes.json()]);
      setListings(Array.isArray(listingData) ? listingData : []);
      const uploads = Array.isArray(reportsData?.reports) ? reportsData.reports : [];
      setMyUploads(uploads.filter((r: any) => r.status === "approved"));
      setOrders(Array.isArray(orderData) ? orderData : []);
    } catch (err) {
      toast({ title: "Load failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registerRecycler = async () => {
    try {
      await apiFetch("/recycler/register", {
        method: "POST",
        body: JSON.stringify({
          name: recyclerForm.name,
          company: recyclerForm.company,
          contact: recyclerForm.contact,
          location: { lat: Number(recyclerForm.lat), lng: Number(recyclerForm.lng) },
        }),
      });
      toast({ title: "Recycler profile updated" });
    } catch (err) {
      toast({ title: "Register failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const createListing = async () => {
    try {
      await apiFetch("/waste/create-listing", {
        method: "POST",
        body: JSON.stringify({
          waste_upload_id: listingForm.waste_upload_id,
          material_type: listingForm.material_type || undefined,
          weight: listingForm.weight ? Number(listingForm.weight) : undefined,
          price_per_kg: listingForm.price_per_kg ? Number(listingForm.price_per_kg) : undefined,
        }),
      });
      toast({ title: "Listing created from waste upload" });
      await loadAll();
    } catch (err) {
      toast({ title: "Create listing failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const buyListing = async (listingId: string) => {
    try {
      const qty = Number(orderQty[listingId] || 0);
      await apiFetch("/orders/create", {
        method: "POST",
        body: JSON.stringify({ listing_id: listingId, quantity: qty }),
      });
      toast({ title: "Order created" });
      await loadAll();
    } catch (err) {
      toast({ title: "Buy failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={role} />
      <main className="lg:ml-64 p-4 sm:p-6 space-y-6">
        <Card>
          <CardHeader><CardTitle>Marketplace</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Convert verified waste uploads to listings and buy recyclable waste.
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Recycler Profile</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={recyclerForm.name} onChange={(e) => setRecyclerForm({ ...recyclerForm, name: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={recyclerForm.company} onChange={(e) => setRecyclerForm({ ...recyclerForm, company: e.target.value })} /></div>
              <div><Label>Contact</Label><Input value={recyclerForm.contact} onChange={(e) => setRecyclerForm({ ...recyclerForm, contact: e.target.value })} /></div>
              <div><Label>Lat</Label><Input type="number" value={recyclerForm.lat} onChange={(e) => setRecyclerForm({ ...recyclerForm, lat: e.target.value })} /></div>
              <div><Label>Lng</Label><Input type="number" value={recyclerForm.lng} onChange={(e) => setRecyclerForm({ ...recyclerForm, lng: e.target.value })} /></div>
              <div className="sm:col-span-2"><Button onClick={registerRecycler}>Save Recycler Profile</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Create Listing from Waste Upload</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              <div>
                <Label>Verified Waste Upload</Label>
                <select className="w-full h-10 border rounded-md px-3 bg-background" value={listingForm.waste_upload_id} onChange={(e) => setListingForm({ ...listingForm, waste_upload_id: e.target.value })}>
                  <option value="">Select waste upload</option>
                  {myUploads.map((u) => (
                    <option key={u._id} value={u._id}>{u._id.slice(-8)} • {u.materialType || "unknown"} • {(u.wasteWeightKg || 0).toFixed(2)}kg</option>
                  ))}
                </select>
              </div>
              <div><Label>Material Type (optional)</Label><Input value={listingForm.material_type} onChange={(e) => setListingForm({ ...listingForm, material_type: e.target.value })} /></div>
              <div><Label>Weight kg (optional)</Label><Input type="number" value={listingForm.weight} onChange={(e) => setListingForm({ ...listingForm, weight: e.target.value })} /></div>
              <div><Label>Price/kg (optional)</Label><Input type="number" value={listingForm.price_per_kg} onChange={(e) => setListingForm({ ...listingForm, price_per_kg: e.target.value })} /></div>
              <Button onClick={createListing}>Create Listing</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Available Listings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {listings.filter((l) => l.status === "available").map((l) => (
              <div key={l._id} className="border rounded-lg p-3">
                <p className="font-medium capitalize">{l.material_type}</p>
                <p className="text-xs text-muted-foreground">
                  Weight: {l.weight}kg • Price: ₹{l.price_per_kg}/kg • Seller: {l.seller_user_id?.name || l.seller_user_id?.email || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Location: {(l.waste_upload_id?.disposalLocation?.lat ?? l.waste_upload_id?.pickupLocation?.lat ?? 0).toFixed(4)},
                  {(l.waste_upload_id?.disposalLocation?.lng ?? l.waste_upload_id?.pickupLocation?.lng ?? 0).toFixed(4)}
                </p>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="number"
                    placeholder="Qty kg"
                    value={orderQty[l._id] || ""}
                    onChange={(e) => setOrderQty({ ...orderQty, [l._id]: e.target.value })}
                    className="max-w-[120px]"
                  />
                  <Button size="sm" onClick={() => buyListing(l._id)}>Buy</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>My Recycler Orders</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {orders.map((o) => (
              <div key={o._id} className="border rounded-md p-2 text-xs">
                Order #{o._id.slice(-8)} • Qty: {o.quantity}kg • Total: ₹{o.total_price} • {o.status}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
