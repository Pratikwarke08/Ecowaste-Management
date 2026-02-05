import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MapPin,
  Shield,
  Users,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Activity,
  Clock
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface DashboardReportItem {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  collectorEmail?: string;
  points: number;
  submittedAt: string;
  verificationComment?: string;
  nearestDustbinName?: string | null;
  disposalDistance?: number | null;
}

interface CollectorStat {
  _id: string;
  totalReports: number;
  totalPoints: number;
  totalWeight: number;
  lastActive: string;
  avgLat?: number;
  avgLng?: number;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

interface EmployeeDashboardResponse {
  reports: {
    pendingCount: number;
    approvedToday: number;
    totalReports: number;
    recentReports: DashboardReportItem[];
  };
  collectors: {
    activeCollectors: number;
    stats: CollectorStat[];
  };
  dustbins: {
    total: number;
    active: number;
    full: number;
    maintenance: number;
    urgent: number;
    averageFill: number;
  };
  complaints?: {
    pending: number;
    urgent: number;
  };
}

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<EmployeeDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadDashboard = async () => {
      try {
        const res = await apiFetch('/dashboard/employee');
        const json = await res.json();
        if (!isMounted) return;
        setData(json);
      } catch (err) {
        if (!isMounted) return;
        const error = err as Error & { status?: number; message?: string };
        console.error(error);
        setError(error.message || 'Failed to load dashboard');
        if (error.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userType');
          navigate('/');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const pendingReports = useMemo(
    () => (data?.reports.recentReports || []).filter(r => r.status === 'pending'),
    [data]
  );

  const approvedReports = useMemo(
    () => (data?.reports.recentReports || []).filter(r => r.status === 'approved'),
    [data]
  );

  const recentActivity = useMemo(
    () => data?.reports.recentReports || [],
    [data]
  );

  const downloadReport = (stat: CollectorStat) => {
    const reportData = [
      ['Collector Performance Report', ''],
      ['Collector ID', stat._id],
      ['Date Generated', new Date().toLocaleString()],
      ['', ''],
      ['Performance Metrics', ''],
      ['Total Reports', stat.totalReports],
      ['Total Points', stat.totalPoints],
      ['Total Waste Collected (kg)', stat.totalWeight.toFixed(2)],
      ['Last Active', new Date(stat.lastActive).toLocaleString()],
      ['', ''],
      ['Geographic Coverage', ''],
      ['Average Location (Lat, Lng)', `${stat.avgLat?.toFixed(6) || 'N/A'}, ${stat.avgLng?.toFixed(6) || 'N/A'}`],
      ['Latitude Range', `${stat.minLat?.toFixed(6) || 'N/A'} to ${stat.maxLat?.toFixed(6) || 'N/A'}`],
      ['Longitude Range', `${stat.minLng?.toFixed(6) || 'N/A'} to ${stat.maxLng?.toFixed(6) || 'N/A'}`],
    ];

    const csvContent = "data:text/csv;charset=utf-8,"
      + reportData.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `collector_report_${stat._id}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-gradient-ocean rounded-lg p-4 sm:p-6 text-white animate-fade-in">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">
          Government Dashboard
        </h1>
        <p className="text-white/90 text-sm sm:text-base">
          Monitor and manage waste collection activities
        </p>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-scale-in">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Dustbins
                </p>
                <p className="text-2xl font-bold text-eco-forest-primary">
                  {isLoading ? '—' : data?.dustbins.total ?? 0}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-eco-forest-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Reviews
                </p>
                <p className="text-2xl font-bold text-eco-warning">
                  {isLoading ? '—' : data?.reports.pendingCount ?? 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-eco-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Approved Today
                </p>
                <p className="text-2xl font-bold text-eco-success">
                  {isLoading ? '—' : data?.reports.approvedToday ?? 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-eco-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Collectors
                </p>
                <p className="text-2xl font-bold text-eco-ocean">
                  {isLoading ? '—' : data?.collectors.activeCollectors ?? 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-eco-ocean" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Actions + Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Quick Actions */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage system operations</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button
              className="w-full justify-start h-12"
              variant="ocean"
              onClick={() => navigate('/verify')}
            >
              <Shield className="mr-3 h-5 w-5" />
              Review Pending Verifications
              {data?.reports.pendingCount ? (
                <Badge variant="destructive" className="ml-auto">
                  {data.reports.pendingCount}
                </Badge>
              ) : null}
            </Button>

            <Button
              className="w-full justify-start h-12"
              variant="destructive"
              onClick={() => navigate('/complaints')}
            >
              <AlertCircle className="mr-3 h-5 w-5" />
              Review Complaints
              {((data?.complaints?.pending || 0) +
                (data?.complaints?.urgent || 0)) > 0 ? (
                <Badge variant="destructive" className="ml-auto">
                  {(data?.complaints?.pending || 0)}
                  {(data?.complaints?.urgent || 0)
                    ? ` • ${data?.complaints?.urgent} urgent`
                    : ''}
                </Badge>
              ) : null}
            </Button>

            <Button
              className="w-full justify-start h-12"
              variant="eco"
              onClick={() => navigate('/dustbins')}
            >
              <MapPin className="mr-3 h-5 w-5" />
              Manage Dustbin Locations
              {data?.dustbins.urgent ? (
                <Badge variant="destructive" className="ml-auto">
                  {data.dustbins.urgent} urgent
                </Badge>
              ) : null}
            </Button>

            <Button
              className="w-full justify-start h-12"
              variant="earth"
              onClick={() => navigate('/progress')}
            >
              <TrendingUp className="mr-3 h-5 w-5" />
              View Progress Analytics
            </Button>
          </CardContent>
        </Card>

        {/* Verification Performance */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle>Verification Performance</CardTitle>
            <CardDescription>Track your verification progress</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Verifications Completed Today</span>
                <span>{data?.reports.approvedToday ?? 0}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Total Reports</span>
                <span>{data?.reports.totalReports ?? 0}</span>
              </div>

              <Progress
                value={
                  data && data.reports.totalReports
                    ? Math.min(
                      (data.reports.approvedToday /
                        Math.max(data.reports.totalReports, 1)) *
                      100,
                      100
                    )
                    : 0
                }
                className="h-2"
              />

              <p className="text-sm text-muted-foreground">
                Aim to clear pending reports to keep the queue healthy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Pending + Approved */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pending Verifications */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-eco-warning" />
              Pending Verifications
            </CardTitle>
            <CardDescription>
              Reports awaiting your review
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {pendingReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending reports right now.
                </p>
              ) : (
                pendingReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        Report #{report.id.toString().slice(-6)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {report.collectorEmail || 'Collector'} •{' '}
                        {new Date(report.submittedAt).toLocaleString()}
                      </p>

                      {(report.nearestDustbinName ||
                        report.disposalDistance !== null) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {report.nearestDustbinName
                              ? `Nearest bin: ${report.nearestDustbinName}`
                              : 'Nearest bin: —'}
                            {typeof report.disposalDistance === 'number'
                              ? ` • Distance: ${report.disposalDistance} m`
                              : ''}
                          </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Awaiting review</Badge>
                      <Badge variant="default">
                        +{report.points || 0} pts
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Approved Reports */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-eco-success" />
              Approved Waste Collection Reports
            </CardTitle>
            <CardDescription>
              Latest approved reports with awarded points
            </CardDescription>
          </CardHeader>

          <CardContent>
            {approvedReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No approved reports yet.
              </p>
            ) : (
              <div className="space-y-4">
                {approvedReports.map(report => (
                  <div
                    key={report.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border"
                  >
                    <CheckCircle className="h-5 w-5 text-eco-success" />

                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        Report #{report.id.toString().slice(-6)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {report.collectorEmail || 'Collector'} •{' '}
                        {new Date(report.submittedAt).toLocaleString()}
                      </p>

                      {report.verificationComment && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {report.verificationComment}
                        </p>
                      )}

                      {(report.nearestDustbinName ||
                        report.disposalDistance !== null) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {report.nearestDustbinName
                              ? `Nearest bin: ${report.nearestDustbinName}`
                              : 'Nearest bin: —'}
                            {typeof report.disposalDistance === 'number'
                              ? ` • Distance: ${report.disposalDistance} m`
                              : ''}
                          </p>
                        )}
                    </div>

                    <Badge variant="default">
                      +{report.points || 0} pts
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-eco-forest-primary" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Your recent actions and system updates
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activity recorded yet.
              </p>
            ) : (
              <ul className="divide-y max-h-72 overflow-y-auto pr-1 scroll-smooth">
                {recentActivity.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-center gap-3 py-3"
                  >
                    {/* Icon */}
                    <CheckCircle className="h-4 w-4 text-eco-success shrink-0" />

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize truncate">
                        {activity.status}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.collectorEmail || 'Collector'} •{' '}
                        {new Date(activity.submittedAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Badge */}
                    {activity.status === 'approved' ? (
                      <Badge className="text-xs shrink-0">
                        +{activity.points}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        —
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Collector Performance Stats */}
      <Card className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-eco-ocean" />
            Collector Performance
          </CardTitle>
          <CardDescription>
            Overview of waste collection by active collectors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Collector</th>
                  <th className="p-3 font-medium">Reports</th>
                  <th className="p-3 font-medium">Points</th>
                  <th className="p-3 font-medium">Est. Weight</th>
                  <th className="p-3 font-medium">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.collectors.stats && data.collectors.stats.length > 0 ? (
                  data.collectors.stats.map((stat) => (
                    <tr key={stat._id} className="hover:bg-muted/50">
                      <td className="p-3 font-medium">{stat._id}</td>
                      <td className="p-3">{stat.totalReports}</td>
                      <td className="p-3">{stat.totalPoints}</td>
                      <td className="p-3">{(stat.totalWeight || 0).toFixed(1)} kg</td>
                      <td className="p-3">{new Date(stat.lastActive).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDashboard;