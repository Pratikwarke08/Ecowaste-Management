import { useEffect, useState } from "react";
import Navigation from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type GovCase = {
  _id: string;
  title: string;
  caseType: "incident_review" | "compliance" | "escalation" | "audit";
  referenceId?: string;
  description?: string;
  status: "submitted" | "under_review" | "approved" | "rejected";
};

type GovernmentDashboard = {
  summary: {
    totalCases: number;
    submittedCases: number;
    underReviewCases: number;
    approvedCases: number;
    unresolvedIncidents: number;
    unresolvedComplaints: number;
    pendingVerifications: number;
    delayedJobs: number;
  };
  cases: GovCase[];
  operationalView: {
    incidents: Array<{ _id: string; category: string; status: string; urgency: string }>;
    complaints: Array<{ _id: string; title: string; status: string; priority: string }>;
  };
};

export default function GovernmentIntegration() {
  const { toast } = useToast();
  const [data, setData] = useState<GovernmentDashboard | null>(null);
  const [form, setForm] = useState({ title: "", caseType: "incident_review", referenceId: "", description: "" });
  const [creating, setCreating] = useState(false);

  const loadDashboard = async (silent = false) => {
    try {
      const res = await apiFetch("/dashboard/government-integration");
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

  const submitCase = async () => {
    try {
      setCreating(true);
      await apiFetch("/government-integration", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ title: "", caseType: "incident_review", referenceId: "", description: "" });
      toast({ title: "Case submitted", description: "Government workflow case submitted." });
      await loadDashboard(true);
    } catch (err) {
      toast({ title: "Submit failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const reviewCase = async (id: string, status: GovCase["status"]) => {
    try {
      await apiFetch(`/government-integration/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadDashboard(true);
    } catch (err) {
      toast({ title: "Review failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="government_officer" />
      <main className="lg:ml-64 p-4 sm:p-6 space-y-6">
        <div className="bg-gradient-to-r from-violet-700 to-indigo-700 rounded-lg p-5 text-white">
          <h1 className="text-2xl font-bold">Government Integration Dashboard</h1>
          <p className="text-sm text-white/90 mt-1">Live governance control room connected to incidents, complaints, verification, and logistics.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Under Review</p><p className="text-xl font-semibold">{data?.summary.underReviewCases ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unresolved Incidents</p><p className="text-xl font-semibold">{data?.summary.unresolvedIncidents ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unresolved Complaints</p><p className="text-xl font-semibold">{data?.summary.unresolvedComplaints ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending Verifications</p><p className="text-xl font-semibold">{data?.summary.pendingVerifications ?? 0}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Submit Case</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div>
                <Label>Case Type</Label>
                <select className="w-full h-10 border rounded-md px-3 bg-background" value={form.caseType} onChange={(e) => setForm({ ...form, caseType: e.target.value as GovCase["caseType"] })}>
                  <option value="incident_review">Incident Review</option>
                  <option value="compliance">Compliance</option>
                  <option value="escalation">Escalation</option>
                  <option value="audit">Audit</option>
                </select>
              </div>
              <div><Label>Reference ID</Label><Input value={form.referenceId} onChange={(e) => setForm({ ...form, referenceId: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button onClick={submitCase} disabled={creating}>{creating ? "Submitting..." : "Submit Case"}</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Operational Feed</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Incidents</p>
                <div className="space-y-2">
                  {(data?.operationalView.incidents || []).slice(0, 6).map((i) => (
                    <div key={i._id} className="text-xs border rounded-md p-2">{i.category.replace(/_/g, " ")} • {i.urgency} • {i.status}</div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Complaints</p>
                <div className="space-y-2">
                  {(data?.operationalView.complaints || []).slice(0, 6).map((c) => (
                    <div key={c._id} className="text-xs border rounded-md p-2">{c.title} • {c.priority} • {c.status}</div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Cases</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data?.cases || []).map((c) => (
              <div key={c._id} className="border rounded-lg p-3">
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.caseType.replace("_", " ")} • {c.status}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => reviewCase(c._id, "under_review")}>Under Review</Button>
                  <Button size="sm" variant="secondary" onClick={() => reviewCase(c._id, "approved")}>Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => reviewCase(c._id, "rejected")}>Reject</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
