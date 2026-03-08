import { useEffect, useMemo, useState } from "react";
import Navigation from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/lib/roles";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function ImpactHtml() {
  const { toast } = useToast();
  const role = (localStorage.getItem("userType") as UserRole) || "collector";
  const [userData, setUserData] = useState<any>(null);
  const [totalData, setTotalData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [uRes, tRes] = await Promise.all([apiFetch("/carbon/user"), apiFetch("/carbon/total")]);
        const [uJson, tJson] = await Promise.all([uRes.json(), tRes.json()]);
        setUserData(uJson);
        setTotalData(tJson);
      } catch (err) {
        toast({ title: "Load failed", description: (err as Error).message, variant: "destructive" });
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData = useMemo(
    () => [
      { name: "Waste (kg)", value: Number(userData?.summary?.total_waste_recycled || 0) },
      { name: "CO2 Saved", value: Number(userData?.summary?.total_co2_saved || 0) },
      { name: "Credits", value: Number(userData?.summary?.total_credits_earned || 0) },
    ],
    [userData]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={role} />
      <main className="lg:ml-64 p-4 sm:p-6 space-y-6">
        <Card>
          <CardHeader><CardTitle>Impact</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Track waste recycled, CO2 saved, and carbon credits earned.</CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Your Waste Recycled</p><p className="text-xl font-semibold">{userData?.summary?.total_waste_recycled ?? 0} kg</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Your CO2 Saved</p><p className="text-xl font-semibold">{userData?.summary?.total_co2_saved ?? 0} kg</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Your Credits</p><p className="text-xl font-semibold">{userData?.summary?.total_credits_earned ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Global Credits</p><p className="text-xl font-semibold">{totalData?.total_credits_earned ?? 0}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Impact Graph</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
