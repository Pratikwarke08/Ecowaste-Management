import { useEffect, useState } from "react";
import Navigation from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Entry = {
  _id: string;
  sourceType: "recycling" | "transport_optimization" | "waste_diversion" | "manual_adjustment";
  referenceId?: string;
  credits: number;
  co2eKg: number;
  note?: string;
  createdBy?: { name?: string; email?: string };
  createdAt: string;
};

type CarbonDashboard = {
  summary: {
    totalLedgerCredits: number;
    totalLedgerCo2eKg: number;
    estimatedCo2eFromOpsKg: number;
    potentialCreditsFromOps: number;
    reportWeightKg: number;
    deliveredWeightKg: number;
    resolvedIncidents: number;
  };
  ledger: Entry[];
};

export default function CarbonCreditTracking() {
  const { toast } = useToast();
  const [data, setData] = useState<CarbonDashboard | null>(null);
  const [form, setForm] = useState({ sourceType: "recycling", referenceId: "", credits: "", co2eKg: "", note: "" });

  const loadDashboard = async (silent = false) => {
    try {
      const res = await apiFetch("/dashboard/carbon-credits");
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

  const addEntry = async () => {
    try {
      await apiFetch("/carbon-credits", {
        method: "POST",
        body: JSON.stringify({
          sourceType: form.sourceType,
          referenceId: form.referenceId,
          credits: Number(form.credits),
          co2eKg: Number(form.co2eKg),
          note: form.note,
        }),
      });
      setForm({ sourceType: "recycling", referenceId: "", credits: "", co2eKg: "", note: "" });
      toast({ title: "Entry added", description: "Carbon credit entry created." });
      await loadDashboard(true);
    } catch (err) {
      toast({ title: "Add failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="carbon_auditor" />
      <main className="lg:ml-64 p-4 sm:p-6 space-y-6">
        <div className="bg-gradient-to-r from-slate-700 to-emerald-700 rounded-lg p-5 text-white">
          <h1 className="text-2xl font-bold">Carbon Credit Tracking Dashboard</h1>
          <p className="text-sm text-white/90 mt-1">Ledger and live sustainability signals from reports, incidents, and logistics.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Ledger Credits</p><p className="text-xl font-semibold">{data?.summary.totalLedgerCredits ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Ledger CO2e (kg)</p><p className="text-xl font-semibold">{data?.summary.totalLedgerCo2eKg ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Ops CO2e Estimate</p><p className="text-xl font-semibold">{data?.summary.estimatedCo2eFromOpsKg ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Potential Credits</p><p className="text-xl font-semibold">{data?.summary.potentialCreditsFromOps ?? 0}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Add Carbon Entry</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Source Type</Label>
              <select className="w-full h-10 border rounded-md px-3 bg-background" value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })}>
                <option value="recycling">Recycling</option>
                <option value="transport_optimization">Transport Optimization</option>
                <option value="waste_diversion">Waste Diversion</option>
                <option value="manual_adjustment">Manual Adjustment</option>
              </select>
            </div>
            <div><Label>Reference ID</Label><Input value={form.referenceId} onChange={(e) => setForm({ ...form, referenceId: e.target.value })} /></div>
            <div><Label>Credits</Label><Input type="number" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} /></div>
            <div><Label>CO2e (kg)</Label><Input type="number" value={form.co2eKg} onChange={(e) => setForm({ ...form, co2eKg: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Note</Label><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            <div className="sm:col-span-2"><Button onClick={addEntry}>Add Entry</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ledger</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data?.ledger || []).map((e) => (
              <div key={e._id} className="border rounded-lg p-3">
                <p className="font-medium">{e.sourceType.replace("_", " ")}</p>
                <p className="text-xs text-muted-foreground">{e.credits} credits • {e.co2eKg} kg CO2e • {new Date(e.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
