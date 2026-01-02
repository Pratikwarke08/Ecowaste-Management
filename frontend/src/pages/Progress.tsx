import { useEffect, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  BarChart3,
  Users,
  MapPin,
  Calendar,
  Filter,
  Download,
  Target,
  Recycle,
  Leaf,
  Award
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

const ProgressPage = () => {
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeDash, setEmployeeDash] = useState<null | {
    reports: {
      pendingCount: number;
      approvedToday: number;
      totalReports: number;
      approvedTotal?: number;
      rejectedTotal?: number;
      monthlySeries?: Array<{ month: string; points: number; reports: number }>;
      weeklySeries?: Array<{ week: string; points: number; reports: number }>;
      recentReports?: Array<{ id: string; status: 'pending'|'approved'|'rejected'; collectorEmail?: string; points: number; submittedAt: string; verificationComment?: string }>
    };
    collectors: { activeCollectors: number };
  }>(null);

  const [community, setCommunity] = useState<null | {
    stats: {
      totalMembers: number;
      activeToday: number;
      wasteCollectedKg: number;
      co2SavedKg: number;
      totalPoints: number;
    };
    leaderboard: Array<{ name: string; email: string; points: number }>;
  }>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [resEmp, resCom] = await Promise.all([
          apiFetch('/dashboard/employee'),
          apiFetch('/dashboard/community')
        ]);
        const json = await resEmp.json();
        const jsonCom = await resCom.json();
        if (!mounted) return;
        setEmployeeDash({
          reports: {
            pendingCount: json?.reports?.pendingCount || 0,
            approvedToday: json?.reports?.approvedToday || 0,
            totalReports: json?.reports?.totalReports || 0,
            approvedTotal: json?.reports?.approvedTotal || 0,
            rejectedTotal: json?.reports?.rejectedTotal || 0,
            monthlySeries: json?.reports?.monthlySeries || [],
            weeklySeries: json?.reports?.weeklySeries || [],
            recentReports: json?.reports?.recentReports || []
          },
          collectors: {
            activeCollectors: json?.collectors?.activeCollectors || 0,
          }
        });
        setCommunity({
          stats: {
            totalMembers: jsonCom?.stats?.totalMembers || 0,
            activeToday: jsonCom?.stats?.activeToday || 0,
            wasteCollectedKg: jsonCom?.stats?.wasteCollectedKg || 0,
            co2SavedKg: jsonCom?.stats?.co2SavedKg || 0,
            totalPoints: jsonCom?.stats?.totalPoints || 0,
          },
          leaderboard: (jsonCom?.leaderboard || []).map((l: { name: string; email: string; points: number }) => ({
            name: l.name,
            email: l.email,
            points: l.points
          }))
        });
      } catch (e: unknown) {
        if (!mounted) return;
        setError((e as Error)?.message || 'Failed to load progress data');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  const [selectedSector, setSelectedSector] = useState('all');

  const totalReports = employeeDash?.reports.totalReports ?? 0;
  const approvedToday = employeeDash?.reports.approvedToday ?? 0;
  const pendingCount = employeeDash?.reports.pendingCount ?? 0;
  const activeCollectors = employeeDash?.collectors.activeCollectors ?? 0;
  const progressPercent = totalReports ? Math.min((approvedToday / totalReports) * 100, 100) : 0;

  const recentReports = employeeDash?.reports.recentReports || [];

  const wasteTypeData: Array<{ type: string; amount: number; percentage: number; trend: string }> = [];

  const monthlyTrend = (employeeDash?.reports.monthlySeries || []).map(m => ({
    month: m.month,
    collected: m.reports,
    target: Math.max(m.reports, Math.round((totalReports || 1) / 6))
  }));

  const topPerformers = (community?.leaderboard || []).slice(0, 5).map((u, idx) => ({
    name: u.name,
    email: u.email,
    points: u.points,
    rank: idx + 1
  }));

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return 'text-eco-success';
    if (efficiency >= 85) return 'text-eco-warning';
    return 'text-destructive';
  };

  const getTrendColor = (trend: string) => {
    if (trend.startsWith('+')) return 'text-eco-success';
    if (trend.startsWith('-')) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const exportPdf = async () => {
    // Lazy-load PDF libs to avoid bundling errors
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();

    // Fetch fresh data for real-time PDF
    let liveEmp: { 
      reports: { 
        weeklySeries: { week: string; reports: number; points: number }[]; 
        monthlySeries: { month: string; reports: number; points: number }[];
        totalReports?: number;
        approvedToday?: number;
        pendingCount?: number;
      }; 
      collectors?: unknown;
    } | null = null;
    let liveCom: { 
      stats: { 
        totalMembers?: number;
        activeToday?: number;
        wasteCollectedKg?: number;
        co2SavedKg?: number;
        totalPoints?: number;
      };
      leaderboard: { name: string; email: string; points: number }[] 
    } | null = null;
    try {
      const [resEmp, resCom] = await Promise.all([
        apiFetch('/dashboard/employee'),
        apiFetch('/dashboard/community')
      ]);
      liveEmp = await resEmp.json();
      liveCom = await resCom.json();
    } catch (e) {
      // fall back to current state if live fetch fails
      liveEmp = { 
        reports: {
          weeklySeries: employeeDash?.reports?.weeklySeries || [],
          monthlySeries: employeeDash?.reports?.monthlySeries || [],
          totalReports: employeeDash?.reports?.totalReports,
          approvedToday: employeeDash?.reports?.approvedToday,
          pendingCount: employeeDash?.reports?.pendingCount
        }, 
        collectors: employeeDash?.collectors || {} 
      };
      liveCom = { 
        stats: {
          totalMembers: community?.stats?.totalMembers,
          activeToday: community?.stats?.activeToday,
          wasteCollectedKg: community?.stats?.wasteCollectedKg,
          co2SavedKg: community?.stats?.co2SavedKg,
          totalPoints: community?.stats?.totalPoints
        }, 
        leaderboard: community?.leaderboard || [] 
      };
    }

    // Colors
    const brand = { r: 16, g: 163, b: 127 }; // eco-forest primary-ish
    const light = { r: 236, g: 253, b: 245 };

    // Header banner
    doc.setFillColor(brand.r, brand.g, brand.b);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    const periodTitle = selectedPeriod === 'week' ? 'Weekly' : selectedPeriod === 'month' ? 'Monthly' : selectedPeriod === 'quarter' ? 'Quarterly' : 'Yearly';
    doc.text(`Ecowaste ${periodTitle} Report`, 14, 18);
    doc.setFontSize(11);
    doc.text(new Date().toLocaleString(), 160, 18, { align: 'right' });

    // KPI badges area background
    doc.setFillColor(light.r, light.g, light.b);
    doc.rect(10, 35, 190, 22, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    const kpis = [
      `Total Reports: ${liveEmp?.reports?.totalReports || 0}`,
      `Approved Today: ${liveEmp?.reports?.approvedToday || 0}`,
      `Pending: ${liveEmp?.reports?.pendingCount || 0}`,
      `Waste: ${(liveCom?.stats?.wasteCollectedKg || 0).toLocaleString()} kg`,
      `CO2 Saved: ${(liveCom?.stats?.co2SavedKg || 0).toLocaleString()} kg`
    ];
    let x = 16;
    kpis.forEach((k) => {
      doc.text(k, x, 48);
      x += 38;
    });

    // Build table data by period
    let head: string[] = [];
    let body: Array<(string | number)>[] = [];
    if (selectedPeriod === 'week') {
      head = ['Week', 'Approved Reports', 'Total Points'];
      body = (liveEmp?.reports?.weeklySeries || []).map((w: { week: string; reports: number; points: number }) => [w.week, w.reports, w.points]);
    } else if (selectedPeriod === 'month') {
      head = ['Month', 'Approved Reports', 'Total Points'];
      body = (liveEmp?.reports?.monthlySeries || []).map((m: { month: string; reports: number; points: number }) => [m.month, m.reports, m.points]);
    } else if (selectedPeriod === 'quarter') {
      head = ['Month', 'Approved Reports', 'Total Points'];
      const months = (liveEmp?.reports?.monthlySeries || []).slice(-3);
      body = months.map((m: { month: string; reports: number; points: number }) => [m.month, m.reports, m.points]);
    } else {
      head = ['Month', 'Approved Reports', 'Total Points'];
      const months = (liveEmp?.reports?.monthlySeries || []).slice(-6);
      body = months.map((m: { month: string; reports: number; points: number }) => [m.month, m.reports, m.points]);
    }

    // Styled table
    autoTable(doc, {
      startY: 65,
      head: [head],
      body,
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [brand.r, brand.g, brand.b], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 250, 247] },
      theme: 'grid'
    });

    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || 75; // eslint-disable-line @typescript-eslint/no-explicit-any
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Generated by Ecowaste • Data reflects approved reports in the selected period.', 14, finalY + 10);
    doc.save(`ecowaste-${periodTitle.toLowerCase()}-report.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userType} />
      <main className="lg:ml-64 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-gradient-eco rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">Progress Analytics</h1>
                <p className="text-white/90">Track waste collection performance and community impact</p>
              </div>
              <div className="flex gap-2">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-32 bg-white/20 border-white/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={exportPdf} variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Overview Stats (Real data) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-forest-primary/10 rounded-full">
                    <Recycle className="h-6 w-6 text-eco-forest-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Reports</p>
                    <p className="text-2xl font-bold">{isLoading ? '—' : totalReports}</p>
                    <p className="text-xs text-muted-foreground">all time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-success/10 rounded-full">
                    <Users className="h-6 w-6 text-eco-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Collectors</p>
                    <p className="text-2xl font-bold text-eco-success">{isLoading ? '—' : activeCollectors}</p>
                    <p className="text-xs text-muted-foreground">today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-ocean/10 rounded-full">
                    <Award className="h-6 w-6 text-eco-ocean" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approved Today</p>
                    <p className="text-2xl font-bold text-eco-ocean">{isLoading ? '—' : approvedToday}</p>
                    <p className="text-xs text-muted-foreground">today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-warning/10 rounded-full">
                    <Target className="h-6 w-6 text-eco-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Reviews</p>
                    <p className="text-2xl font-bold text-eco-warning">{isLoading ? '—' : pendingCount}</p>
                    <p className="text-xs text-muted-foreground">waiting approval</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress (Approved Today vs Total Reports) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-eco-forest-primary" />
                Today's Approvals Progress
              </CardTitle>
              <CardDescription>
                {isLoading ? '—' : `${approvedToday} approved out of ${totalReports} total reports`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={progressPercent} className="h-4" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Start: 0</span>
                  <span>Current: {approvedToday}</span>
                  <span>Total: {totalReports}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="sectors" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sectors">Sector Analysis</TabsTrigger>
              <TabsTrigger value="waste-types">Waste Types</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="performers">Top Performers</TabsTrigger>
            </TabsList>

            <TabsContent value="sectors" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-eco-forest-primary" />
                    Recent Reports
                  </CardTitle>
                  <CardDescription>
                    Latest submissions with current status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentReports.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent reports.</p>
                    ) : (
                      recentReports.map((r) => (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <p className="font-medium text-sm">Report #{r.id.toString().slice(-6)}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.collectorEmail || 'Collector'} • {new Date(r.submittedAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={r.status === 'approved' ? 'default' : r.status === 'pending' ? 'secondary' : 'destructive'}>
                              {r.status}
                            </Badge>
                            <Badge variant="outline">+{r.points || 0} pts</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="waste-types" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-eco-forest-primary" />
                    Waste Type Distribution
                  </CardTitle>
                  <CardDescription>
                    Breakdown of collected waste by type and trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {wasteTypeData.map((item, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <h3 className="font-medium">{item.type}</h3>
                            <Badge variant="outline">{item.amount}kg</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${getTrendColor(item.trend)}`}>
                              {item.trend}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Progress value={item.percentage * 5} />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{item.percentage}% of total waste</span>
                            <span>{item.amount.toLocaleString()}kg collected</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-eco-forest-primary" />
                    Collection Trends
                  </CardTitle>
                  <CardDescription>
                    Monthly waste collection trends vs targets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {monthlyTrend.map((month, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{month.month} 2024</h3>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              {month.collected.toLocaleString()}kg / {month.target.toLocaleString()}kg
                            </span>
                            <Badge variant={(month.collected / month.target) >= 0.9 ? 'default' : 'secondary'}>
                              {((month.collected / month.target) * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Progress value={(month.collected / month.target) * 100} />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Collected: {month.collected.toLocaleString()}kg</span>
                            <span>Target: {month.target.toLocaleString()}kg</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performers" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-eco-forest-primary" />
                    Top Performing Collectors
                  </CardTitle>
                  <CardDescription>
                    Ranked by total approved points
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(topPerformers || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No collectors yet.</p>
                    ) : (
                      topPerformers.map((p) => (
                        <div key={p.rank} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 bg-eco-forest-primary/10 rounded-full">
                              <span className="font-bold text-eco-forest-primary">#{p.rank}</span>
                            </div>
                            <div>
                              <h3 className="font-medium">{p.name}</h3>
                              <p className="text-xs text-muted-foreground">{p.email}</p>
                            </div>
                          </div>
                          <Badge variant="default">{p.points.toLocaleString()} pts</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Summary Cards (Real data) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-eco-forest-primary" />
                  Environmental Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Waste Collected</span>
                  <span className="font-bold text-eco-success">{isLoading ? '—' : (community?.stats.wasteCollectedKg ?? 0).toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">CO₂ Saved</span>
                  <span className="font-bold text-eco-success">{isLoading ? '—' : (community?.stats.co2SavedKg ?? 0).toLocaleString()} kg</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-eco-forest-primary" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Approved (All Time)</span>
                  <span className="font-bold">{isLoading ? '—' : (employeeDash?.reports.approvedTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Rejected (All Time)</span>
                  <span className="font-bold text-destructive">{isLoading ? '—' : (employeeDash?.reports.rejectedTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Pending Reviews</span>
                  <span className="font-bold text-eco-warning">{isLoading ? '—' : pendingCount}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-eco-forest-primary" />
                  Upcoming Targets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Active Collectors Today</span>
                  <span className="font-bold">{isLoading ? '—' : (community?.stats.activeToday ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Community Members</span>
                  <span className="font-bold">{isLoading ? '—' : (community?.stats.totalMembers ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Points Awarded</span>
                  <span className="font-bold">{isLoading ? '—' : (community?.stats.totalPoints ?? 0).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProgressPage;