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
import { useNavigate } from "react-router-dom";

const EmployeeDashboard = () => {
  const navigate = useNavigate();

  const stats = {
    totalDustbins: 45,
    pendingVerifications: 12,
    approvedToday: 8,
    activeCollectors: 127,
    weeklyTarget: 50,
  };

  const pendingVerifications = [
    { id: 1, collector: 'Tejas suryawanshi', location: 'amalner maharashtra', type: 'Plastic', amount: '12kg', time: '30 min ago', urgent: true },
    { id: 2, collector: 'devanshu yeole', location: 'mumbai maharashtra', type: 'Paper', amount: '8kg', time: '1 hour ago', urgent: false },
    { id: 3, collector: 'sampada surwade', location: 'jalgaon maharashta', type: 'Metal', amount: '5kg', time: '2 hours ago', urgent: false },
  ];

  const recentActivity = [
    { id: 1, action: 'Approved waste collection', collector: 'varun patil', points: 45, time: '15 min ago' },
    { id: 2, action: 'Added new dustbin', location: 'Temple Road', time: '1 hour ago' },
    { id: 3, action: 'Approved waste collection', collector: 'pranav thorat', points: 30, time: '2 hours ago' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-ocean rounded-lg p-6 text-white animate-fade-in">
        <h1 className="text-2xl font-bold mb-2">Government Dashboard</h1>
        <p className="text-white/90">Monitor and manage waste collection activities</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-scale-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Dustbins</p>
                <p className="text-2xl font-bold text-eco-forest-primary">{stats.totalDustbins}</p>
              </div>
              <MapPin className="h-8 w-8 text-eco-forest-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-bold text-eco-warning">{stats.pendingVerifications}</p>
              </div>
              <Clock className="h-8 w-8 text-eco-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved Today</p>
                <p className="text-2xl font-bold text-eco-success">{stats.approvedToday}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-eco-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Collectors</p>
                <p className="text-2xl font-bold text-eco-ocean">{stats.activeCollectors}</p>
              </div>
              <Users className="h-8 w-8 text-eco-ocean" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage system operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start h-12" variant="ocean" onClick={() => navigate('/pending-reviews')}>
              <Shield className="mr-3 h-5 w-5" />
              Review Pending Verifications
              {stats.pendingVerifications > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {stats.pendingVerifications}
                </Badge>
              )}
            </Button>
            <Button className="w-full justify-start h-12" variant="eco" onClick={() => navigate('/dustbins-list')}>
              <MapPin className="mr-3 h-5 w-5" />
              Manage Dustbin Locations
            </Button>
            <Button className="w-full justify-start h-12" variant="earth">
              <TrendingUp className="mr-3 h-5 w-5" />
              View Progress Analytics
            </Button>
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle>Weekly Verification Target</CardTitle>
            <CardDescription>Track your verification progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Verifications Completed</span>
                <span>{stats.approvedToday * 7} / {stats.weeklyTarget}</span>
              </div>
              <Progress 
                value={((stats.approvedToday * 7) / stats.weeklyTarget) * 100} 
                className="h-2"
              />
              <p className="text-sm text-muted-foreground">
                {Math.round(((stats.approvedToday * 7) / stats.weeklyTarget) * 100)}% of weekly target completed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Verifications */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-eco-warning" />
              Pending Verifications
            </CardTitle>
            <CardDescription>Reports awaiting your review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingVerifications.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {item.urgent ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Clock className="h-5 w-5 text-eco-warning" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{item.collector}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.type} waste • {item.location} • {item.time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={item.urgent ? 'destructive' : 'secondary'}>
                      {item.amount}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-eco-forest-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your recent actions and system updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <CheckCircle className="h-5 w-5 text-eco-success" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.collector && `${activity.collector} • `}
                      {activity.location && `${activity.location} • `}
                      {activity.time}
                    </p>
                  </div>
                  {activity.points && (
                    <Badge variant="default">+{activity.points} pts</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;