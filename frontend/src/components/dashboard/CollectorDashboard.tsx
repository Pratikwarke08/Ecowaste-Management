import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Award, 
  MapPin, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Users,
  Leaf
} from 'lucide-react';

const CollectorDashboard = () => {
  const stats = {
    totalPoints: 2850,
    pendingVerification: 3,
    wasteCollected: 127.5,
    rank: 12,
    monthlyGoal: 150,
  };

  const navigate = useNavigate(); 

  const recentActivity = [
    { id: 1, type: 'Plastic Collection', location: 'MG Road', points: 45, status: 'approved', time: '2 hours ago' },
    { id: 2, type: 'Paper Waste', location: 'Park Street', points: 30, status: 'pending', time: '5 hours ago' },
    { id: 3, type: 'Metal Cans', location: 'City Center', points: 25, status: 'approved', time: '1 day ago' },
  ];

  const achievements = [
    { title: 'Eco Warrior', description: 'Collected 100kg+ waste', icon: Leaf, earned: true },
    { title: 'Community Hero', description: 'Top 10 this month', icon: Users, earned: true },
    { title: 'Consistency King', description: '30 days streak', icon: TrendingUp, earned: false },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-eco rounded-lg p-6 text-white animate-fade-in">
        <h1 className="text-2xl font-bold mb-2">Welcome back, Pratik warke!</h1>
        <p className="text-white/90">Ready to make a positive impact today?</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-scale-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold text-eco-forest-primary">{stats.totalPoints}</p>
              </div>
              <Award className="h-8 w-8 text-eco-forest-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Waste Collected</p>
                <p className="text-2xl font-bold text-eco-ocean">{stats.wasteCollected}kg</p>
              </div>
              <TrendingUp className="h-8 w-8 text-eco-ocean" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-eco-warning">{stats.pendingVerification}</p>
              </div>
              <Clock className="h-8 w-8 text-eco-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rank</p>
                <p className="text-2xl font-bold text-eco-earth">#{stats.rank}</p>
              </div>
              <Users className="h-8 w-8 text-eco-earth" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Start your waste collection journey</CardDescription>
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
              View My Rewards
            </Button>
          </CardContent>
        </Card>

        {/* Monthly Progress */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle>Monthly Progress</CardTitle>
            <CardDescription>You're doing great! Keep it up!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Waste Collected</span>
                <span>{stats.wasteCollected}kg / {stats.monthlyGoal}kg</span>
              </div>
              <Progress 
                value={(stats.wasteCollected / stats.monthlyGoal) * 100} 
                className="h-2"
              />
              <p className="text-sm text-muted-foreground">
                {Math.round(((stats.wasteCollected / stats.monthlyGoal) * 100))}% of monthly goal completed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest waste collection reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {activity.status === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-eco-success" />
                    ) : (
                      <Clock className="h-5 w-5 text-eco-warning" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{activity.type}</p>
                      <p className="text-xs text-muted-foreground">{activity.location} • {activity.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={activity.status === 'approved' ? 'default' : 'secondary'}>
                      +{activity.points} pts
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
            <CardDescription>Your eco-warrior badges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {achievements.map((achievement, index) => {
                const Icon = achievement.icon;
                return (
                  <div 
                    key={index} 
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      achievement.earned 
                        ? 'bg-eco-forest-primary/5 border-eco-forest-primary/20' 
                        : 'opacity-50'
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${achievement.earned ? 'text-eco-forest-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium text-sm">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    </div>
                    {achievement.earned && (
                      <CheckCircle className="h-4 w-4 text-eco-success ml-auto" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CollectorDashboard;