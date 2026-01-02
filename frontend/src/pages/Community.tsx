import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy,
  TrendingUp,
  Users,
  Leaf,
  Award,
  MapPin,
  Calendar,
  Target,
  Star,
  Heart,
  Share2
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CommunityStats {
  totalMembers: number;
  activeToday: number;
  wasteCollectedKg: number;
  co2SavedKg: number;
  totalPoints: number;
}

interface CommunityMember {
  id: string;
  name: string;
  email: string;
  points: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveAt?: string;
}

interface CommunityResponse {
  stats: CommunityStats;
  leaderboard: CommunityMember[];
}

const POINTS_PER_RUPEE = 100;
const MONTHLY_WASTE_GOAL_KG = 1000;
const CHALLENGE_GOAL_KG = 50;

const Community = () => {
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const { toast } = useToast();
  const [data, setData] = useState<CommunityResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCommunity = async () => {
      try {
        const res = await apiFetch('/dashboard/community');
        const json = await res.json();
        setData(json);
      } catch (err) {
        const error = err as Error & { status?: number; message?: string };
        console.error(error);
        toast({
          title: 'Failed to load community data',
          description: error.message || 'Please try again later',
          variant: 'destructive'
        });
        if (error.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userType');
          window.location.href = '/';
        }
      } finally {
        setLoading(false);
      }
    };
    loadCommunity();
  }, [toast]);

  const leaderboard = useMemo(() => {
    if (!data) return [];
    return data.leaderboard.map((member, index) => ({
      ...member,
      rank: index + 1
    }));
  }, [data]);

  const userEmail = (() => {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      return stored.email as string | undefined;
    } catch {
      return undefined;
    }
  })();

  const yourRank = useMemo(() => {
    if (!leaderboard.length || !userEmail) return null;
    const member = leaderboard.find(entry => entry.email === userEmail);
    if (!member) return null;
    const nextRankMember = leaderboard.find(entry => entry.rank === member.rank - 1);
    const pointsToNext = nextRankMember ? Math.max(nextRankMember.points - member.points, 0) : 0;
    const progress = Math.min((member.points / (leaderboard[0]?.points || 1)) * 100, 100);
    return { ...member, pointsToNext, progress };
  }, [leaderboard, userEmail]);

  const communityStats = data?.stats;
  const wasteGoalProgress = communityStats
    ? Math.min((communityStats.wasteCollectedKg / MONTHLY_WASTE_GOAL_KG) * 100, 100)
    : 0;
  const challengeProgress = communityStats
    ? Math.min((communityStats.wasteCollectedKg / CHALLENGE_GOAL_KG) * 100, 100)
    : 0;
  const totalPoints = communityStats?.totalPoints ?? 0;
  const estimatedCommunityEarnings = totalPoints / POINTS_PER_RUPEE;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Award className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-lg font-bold">#{rank}</span>;
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation userRole={userType} />
        <main className="lg:ml-64 p-6">
          <div className="max-w-6xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse text-muted-foreground">Loading community impact...</div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userType} />
      <main className="lg:ml-64 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-gradient-eco rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Community Impact</h1>
            <p className="text-white/90">Join our eco-warriors in creating a cleaner, greener tomorrow</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-forest-primary/10 rounded-full">
                    <Users className="h-6 w-6 text-eco-forest-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Members</p>
                    <p className="text-2xl font-bold">{communityStats?.totalMembers ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-success/10 rounded-full">
                    <TrendingUp className="h-6 w-6 text-eco-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Today</p>
                    <p className="text-2xl font-bold text-eco-success">{communityStats?.activeToday ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-ocean/10 rounded-full">
                    <Leaf className="h-6 w-6 text-eco-ocean" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Waste Collected</p>
                    <p className="text-2xl font-bold text-eco-ocean">{(communityStats?.wasteCollectedKg ?? 0).toLocaleString()} kg</p>
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
                    <p className="text-sm text-muted-foreground">CO₂ Saved</p>
                    <p className="text-2xl font-bold text-eco-warning">{(communityStats?.co2SavedKg ?? 0).toLocaleString()} kg</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="leaderboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="challenges">Challenges</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="impact">Impact</TabsTrigger>
            </TabsList>

            <TabsContent value="leaderboard" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-eco-forest-primary" />
                        Top Eco Warriors
                      </CardTitle>
                      <CardDescription>
                        Community members making the biggest impact this month
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {leaderboard.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No collectors have recorded activity yet.</p>
                      ) : (
                        leaderboard.map((member) => (
                          <div key={member.id} className={`flex items-center justify-between p-4 rounded-lg ${member.email === userEmail ? 'bg-eco-forest-primary/5 border border-eco-forest-primary/20' : 'bg-muted/50'}`}>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-10 h-10">
                                {getRankBadge(member.rank)}
                              </div>
                              <Avatar>
                                <AvatarFallback>{member.name?.charAt(0) ?? '👤'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span>{member.email}</span>
                                  <span>•</span>
                                  <span>{member.currentStreak} day streak</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-eco-forest-primary">{member.points.toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">points</p>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-eco-forest-primary" />
                        Your Rank
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-4xl font-bold text-eco-forest-primary mb-2">
                        {yourRank ? `#${yourRank.rank}` : '—'}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {leaderboard.length ? `out of ${leaderboard.length} collectors` : 'Join the community to start ranking'}
                      </p>
                      <Progress value={yourRank ? yourRank.progress : 0} className="mb-2" />
                      <p className="text-xs text-muted-foreground">
                        {yourRank
                          ? yourRank.pointsToNext > 0
                            ? `${yourRank.pointsToNext} points to climb the next rank`
                            : 'You are at the top of the leaderboard!'
                          : 'Submit reports to join the leaderboard'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-red-500" />
                        Community Spirit
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Total Points Earned</span>
                          <Badge variant="default">{(communityStats?.totalPoints ?? 0).toLocaleString()} pts</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Average Streak</span>
                          <Badge variant="default">
                            {leaderboard.length ? Math.round(leaderboard.reduce((sum, m) => sum + m.currentStreak, 0) / leaderboard.length) : 0} days
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Top Streak</span>
                          <Badge variant="default">
                            {leaderboard[0]?.longestStreak ?? 0} days
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Other tabs remain inspirational/static for now */}
            <TabsContent value="challenges" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-eco-forest-primary" />
                    Active Challenges
                  </CardTitle>
                  <CardDescription>
                    Join community challenges and earn bonus rewards
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 bg-muted/50 rounded-lg space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg">Monthly Clean-Up Challenge</h3>
                        <p className="text-muted-foreground">Collect 50 kg of waste this month</p>
                      </div>
                      <Badge variant="default">500 pts</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{challengeProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={challengeProgress} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Ends {new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{communityStats?.totalMembers ?? 0} participants</span>
                        </div>
                      </div>
                      <Button variant="eco" size="sm">
                        Join Challenge
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-eco-forest-primary" />
                    Community Achievements
                  </CardTitle>
                  <CardDescription>
                    Celebrating our collective environmental impact
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 bg-eco-success/5 border border-eco-success/20 rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">🏆</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">Zero Waste Milestone</h3>
                        <p className="text-muted-foreground mb-3">Community collectively diverted {(communityStats?.wasteCollectedKg ?? 0).toLocaleString()} kg of waste from landfills.</p>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date().toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{communityStats?.totalMembers ?? 0} participants</span>
                          </div>
                          <Badge variant="default">Community Achievement</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="impact" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-2">🌳</div>
                    <p className="text-2xl font-bold text-eco-forest-primary">{Math.round((communityStats?.wasteCollectedKg ?? 0) / 25)}</p>
                    <p className="text-sm text-muted-foreground">Trees Saved*</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-2">💧</div>
                    <p className="text-2xl font-bold text-eco-ocean">{Math.round((communityStats?.wasteCollectedKg ?? 0) * 2)} L</p>
                    <p className="text-sm text-muted-foreground">Water Conserved*</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-2">⚡</div>
                    <p className="text-2xl font-bold text-eco-warning">{Math.round((communityStats?.co2SavedKg ?? 0) * 0.4)}</p>
                    <p className="text-sm text-muted-foreground">Energy Saved*</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-2">🌍</div>
                    <p className="text-2xl font-bold text-eco-success">{(communityStats?.co2SavedKg ?? 0).toLocaleString()} kg</p>
                    <p className="text-sm text-muted-foreground">CO₂ Reduced</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-eco-forest-primary" />
                    Environmental Impact Summary
                  </CardTitle>
                  <CardDescription>
                    Our collective contribution to environmental conservation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">This Month's Impact</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Waste Diverted from Landfills</span>
                          <span className="font-bold">{Math.min(((communityStats?.wasteCollectedKg ?? 0) / 1000) * 100, 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={Math.min(((communityStats?.wasteCollectedKg ?? 0) / 1000) * 100, 100)} />

                        <div className="flex justify-between">
                          <span>Recycling Rate</span>
                          <span className="font-bold">87%</span>
                        </div>
                        <Progress value={87} />

                        <div className="flex justify-between">
                          <span>Community Participation</span>
                          <span className="font-bold">
                            {Math.min(((communityStats?.activeToday ?? 0) / Math.max(communityStats?.totalMembers ?? 1, 1)) * 100, 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={Math.min(((communityStats?.activeToday ?? 0) / Math.max(communityStats?.totalMembers ?? 1, 1)) * 100, 100)} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Milestones Achieved</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-eco-success rounded-full"></div>
                          <span className="text-sm">{(communityStats?.wasteCollectedKg ?? 0).toLocaleString()} kg waste collected</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-eco-success rounded-full"></div>
                          <span className="text-sm">{communityStats?.totalMembers ?? 0} active community members</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-eco-success rounded-full"></div>
                          <span className="text-sm">Top streak: {leaderboard[0]?.longestStreak ?? 0} days</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-eco-warning rounded-full"></div>
                          <span className="text-sm">CO₂ reduced: {(communityStats?.co2SavedKg ?? 0).toLocaleString()} kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Community;