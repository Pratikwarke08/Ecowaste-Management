import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Camera,
  Award,
  MapPin,
  Clock,
  CheckCircle,
  Users,
  Leaf,
  X,
  IndianRupee
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface RecentActivityItem {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  points: number;
  submittedAt: string;
  verificationComment?: string;
}

interface CollectorDashboardSummary {
  lifetimePoints: number;
  availablePoints: number;
  availableRupees: number;
  withdrawnPoints: number;
  withdrawnRupees: number;
  pendingReports: number;
  approvedReports: number;
  rejectedReports: number;
}

interface MonthlyProgress {
  reportsThisMonth: number;
  pointsThisMonth: number;
  monthlyGoalReports: number;
  monthlyGoalPoints: number;
  progressPercent: number;
}

interface CollectorDashboardResponse {
  summary: CollectorDashboardSummary;
  monthlyProgress: MonthlyProgress;
  recentActivity: RecentActivityItem[];
  series: { month: string; points: number; reports: number }[];
  wasteCollectedKg: number;
  earnings: {
    availableRupees: number;
    withdrawnRupees: number;
    lifetimePoints: number;
  };
  incidents?: {
    recent: Array<{
      _id: string;
      category: string;
      description?: string;
      status: string;
      urgency: string;
      coordinates: { lat: number; lng: number };
      updatedAt: string;
    }>;
    recentRewards: Array<{
      _id: string;
      points: number;
      note?: string;
      createdAt: string;
    }>;
  };
}

const POINTS_PER_RUPEE = 100;

const CollectorDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<CollectorDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadDashboard = async () => {
      try {
        const res = await apiFetch('/dashboard/collector');
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
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const summary = data?.summary;
  const monthly = data?.monthlyProgress;

  const stats = useMemo(() => ({
    lifetimePoints: summary?.lifetimePoints ?? 0,
    availablePoints: summary?.availablePoints ?? 0,
    pendingCount: summary?.pendingReports ?? 0,
    approvedCount: summary?.approvedReports ?? 0,
    rejectedCount: summary?.rejectedReports ?? 0,
    approvedThisMonth: monthly?.reportsThisMonth ?? 0,
    monthGoal: monthly?.monthlyGoalReports ?? 0,
    progressPercent: monthly?.progressPercent ?? 0
  }), [summary, monthly]);

  const recentActivity = useMemo(() => {
    return (data?.recentActivity || []).slice(0, 5).map((activity) => ({
      ...activity,
      submittedAtFormatted: new Date(activity.submittedAt).toLocaleString()
    }));
  }, [data]);

  const recentIncidents = data?.incidents?.recent || [];
  const recentIncidentRewards = data?.incidents?.recentRewards || [];

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const userName = user?.name || user?.email || 'Collector';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-eco rounded-lg p-6 text-white animate-fade-in">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {userName}!</h1>
        <p className="text-white/90">Track your submissions and approval status in real-time.</p>
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
        <Card className="animate-scale-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold text-eco-forest-primary">
                  {isLoading ? '—' : stats.lifetimePoints}
                </p>
              </div>
              <Award className="h-8 w-8 text-eco-forest-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Points</p>
                <p className="text-2xl font-bold text-eco-success">
                  {isLoading ? '—' : stats.availablePoints}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-eco-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Reports</p>
                <p className="text-2xl font-bold text-eco-warning">
                  {isLoading ? '—' : stats.pendingCount}
                </p>
              </div>
              <Clock className="h-8 w-8 text-eco-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved Reports</p>
                <p className="text-2xl font-bold text-eco-success">
                  {isLoading ? '—' : stats.approvedCount}
                </p>
              </div>
              <Users className="h-8 w-8 text-eco-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
            <CardDescription>Your reported incidents and their statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {recentIncidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No incidents reported yet.</p>
            ) : (
              <div className="space-y-3">
                {recentIncidents.map((inc) => (
                  <div key={inc._id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="min-w-0">
                      <p className="font-medium text-sm capitalize truncate">{inc.category.replace(/_/g,' ')}</p>
                      <p className="text-xs text-muted-foreground truncate">{inc.description || 'No description'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(inc.updatedAt).toLocaleString()} • {inc.coordinates.lat.toFixed(4)}, {inc.coordinates.lng.toFixed(4)}</p>
                    </div>
                    <Badge className="capitalize ml-3">{inc.status.replace(/_/g,' ')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle>Incident Rewards</CardTitle>
            <CardDescription>Credits awarded for incident reports</CardDescription>
          </CardHeader>
          <CardContent>
            {recentIncidentRewards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No incident rewards yet.</p>
            ) : (
              <div className="space-y-3">
                {recentIncidentRewards.map((r) => (
                  <div key={r._id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">+{r.points} pts</p>
                      <p className="text-xs text-muted-foreground truncate">{r.note || 'Incident reward'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                    <Badge>Credited</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Submit new collections or check dustbins</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full justify-start h-12"
              variant="eco"
              onClick={() => navigate('/capture')}
            >
              <Camera className="mr-3 h-5 w-5" />
              Capture Waste Collection
            </Button>
            <Button
              className="w-full justify-start h-12"
              variant="ocean"
              onClick={() => navigate('/dustbins')}
            >
              <MapPin className="mr-3 h-5 w-5" />
              Find Nearby Dustbins
            </Button>
            <Button
              className="w-full justify-start h-12"
              variant="earth"
              onClick={() => navigate('/rewards')}
            >
              <Award className="mr-3 h-5 w-5" />
              View Rewards & Leaderboard
            </Button>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle>Earnings Snapshot</CardTitle>
            <CardDescription>{POINTS_PER_RUPEE} pts = ₹1</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Available (₹)</span>
                <span className="text-lg font-semibold text-eco-success">
                  {isLoading ? '—' : `₹${(summary?.availableRupees ?? 0).toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Withdrawn (₹)</span>
                <span className="text-lg font-semibold text-eco-ocean">
                  {isLoading ? '—' : `₹${(summary?.withdrawnRupees ?? 0).toFixed(2)}`}
                </span>
              </div>
              <Progress
                value={summary && summary.lifetimePoints > 0
                  ? ((summary.lifetimePoints - summary.withdrawnPoints) / summary.lifetimePoints) * 100
                  : 0}
                className="h-2"
              />
              <Button
                variant="eco"
                className="w-full"
                onClick={() => navigate('/rewards')}
              >
                <IndianRupee className="mr-2 h-4 w-4" />
                Manage Rewards
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle>Monthly Progress</CardTitle>
            <CardDescription>
              {stats.monthGoal === 0
                ? 'No monthly goal set yet.'
                : stats.approvedThisMonth >= stats.monthGoal
                  ? 'Monthly goal achieved! 🎉'
                  : `Complete ${Math.max(stats.monthGoal - stats.approvedThisMonth, 0)} more approvals to hit your goal.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Approved this month</span>
                <span>
                  {stats.approvedThisMonth}
                  {stats.monthGoal ? ` / ${stats.monthGoal}` : ''}
                </span>
              </div>
              <Progress
                value={stats.monthGoal ? Math.min(stats.progressPercent, 100) : 0}
                className="h-2"
              />
              <p className="text-sm text-muted-foreground">
                Keep collecting responsibly to earn more rewards.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle>Total Impact</CardTitle>
            <CardDescription>Your approved collections converted to real-world impact</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Waste collected</span>
                <span className="font-semibold text-eco-forest-primary">
                  {isLoading ? '—' : `${(data?.wasteCollectedKg ?? 0).toFixed(1)} kg`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Points earned this month</span>
                <span className="font-semibold text-eco-forest-primary">
                  {monthly ? monthly.pointsThisMonth : '—'} pts
                </span>
              </div>
              <div className="flex justify-between">
                <span>Earnings this month</span>
                <span className="font-semibold text-eco-success">
                  {monthly ? `₹${(monthly.pointsThisMonth / POINTS_PER_RUPEE).toFixed(2)}` : '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest waste collection reports</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading reports...</p>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports submitted yet. Capture your first collection!</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {activity.status === 'approved' ? (
                        <CheckCircle className="h-5 w-5 text-eco-success" />
                      ) : activity.status === 'rejected' ? (
                        <X className="h-5 w-5 text-destructive" />
                      ) : (
                        <Clock className="h-5 w-5 text-eco-warning" />
                      )}
                      <div>
                        <p className="font-medium text-sm capitalize">{activity.status}</p>
                        <p className="text-xs text-muted-foreground">{activity.submittedAtFormatted}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={activity.status === 'approved' ? 'default' : 'secondary'}>
                        {activity.status === 'approved' ? `+${activity.points} pts` : '—'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <CardTitle>Status Overview</CardTitle>
            <CardDescription>Track approvals, rejections, and pending submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Leaf className="h-5 w-5 text-eco-success" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Approved collections</p>
                  <p className="text-xs text-muted-foreground">
                    Earned {stats.lifetimePoints} points across {stats.approvedCount} reports
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Clock className="h-5 w-5 text-eco-warning" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Awaiting approval</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.pendingCount} report{stats.pendingCount === 1 ? '' : 's'} pending review
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <X className="h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Rejected reports</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.rejectedCount} report{stats.rejectedCount === 1 ? '' : 's'} need attention
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CollectorDashboard;
