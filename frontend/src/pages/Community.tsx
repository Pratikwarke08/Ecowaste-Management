import { useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

const Community = () => {
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const communityStats = {
    totalMembers: 1247,
    activeToday: 89,
    wasteCollected: 15420,
    co2Saved: 3850
  };

  const leaderboard = [
    { rank: 1, name: 'Pratik Warke', points: 2850, avatar: '👩', location: 'Sector 15', streak: 45 },
    { rank: 2, name: 'Tejas Suryawanshi', points: 2650, avatar: '👨', location: 'Sector 12', streak: 38 },
    { rank: 3, name: 'Devanshu yeole', points: 2400, avatar: '👩', location: 'Sector 8', streak: 42 },
    { rank: 4, name: 'Sampada Surwade', points: 2200, avatar: '👨', location: 'Sector 18', streak: 29 },
    { rank: 5, name: 'Hinal tekwade', points: 2100, avatar: '👩', location: 'Sector 22', streak: 35 },
    { rank: 6, name: 'You', points: 1850, avatar: '👤', location: 'Sector 10', streak: 28 },
  ];

  const achievements = [
    { 
      title: 'Community Clean-up Drive 2024', 
      description: '500+ participants collected 2.5 tons of waste',
      date: '2024-01-15',
      impact: '2500 kg waste collected',
      participants: 547,
      badge: '🏆'
    },
    { 
      title: 'Plastic-Free Week Challenge', 
      description: 'Reduced plastic waste by 80% across all sectors',
      date: '2024-01-08',
      impact: '80% plastic reduction',
      participants: 320,
      badge: '🌱'
    },
    { 
      title: 'Zero Waste Milestone', 
      description: 'Achieved 95% waste diversion from landfills',
      date: '2024-01-01',
      impact: '95% waste diverted',
      participants: 1200,
      badge: '♻️'
    },
  ];

  const impactMetrics = [
    { label: 'Trees Saved', value: '2,450', icon: '🌳', color: 'text-eco-forest-primary' },
    { label: 'Water Conserved', value: '15,000L', icon: '💧', color: 'text-eco-ocean' },
    { label: 'Energy Saved', value: '8,500 kWh', icon: '⚡', color: 'text-eco-warning' },
    { label: 'CO₂ Reduced', value: '3.8 tons', icon: '🌍', color: 'text-eco-success' },
  ];

  const challenges = [
    {
      title: 'February Cleanup Challenge',
      description: 'Collect 100kg waste this month',
      progress: 65,
      reward: 500,
      deadline: '2024-02-28',
      participants: 156
    },
    {
      title: 'Plastic Bottle Drive',
      description: 'Collect 200 plastic bottles',
      progress: 78,
      reward: 300,
      deadline: '2024-02-15',
      participants: 89
    },
    {
      title: 'Community Hero',
      description: 'Help verify 50 waste reports',
      progress: 32,
      reward: 250,
      deadline: '2024-02-20',
      participants: 45
    },
  ];

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Award className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-lg font-bold">#{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userType} />
      <main className="lg:ml-64 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-gradient-eco rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Community Impact</h1>
            <p className="text-white/90">Join our eco-warriors in creating a cleaner, greener tomorrow</p>
          </div>

          {/* Community Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-forest-primary/10 rounded-full">
                    <Users className="h-6 w-6 text-eco-forest-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Members</p>
                    <p className="text-2xl font-bold">{communityStats.totalMembers.toLocaleString()}</p>
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
                    <p className="text-2xl font-bold text-eco-success">{communityStats.activeToday}</p>
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
                    <p className="text-2xl font-bold text-eco-ocean">{communityStats.wasteCollected.toLocaleString()}kg</p>
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
                    <p className="text-2xl font-bold text-eco-warning">{communityStats.co2Saved}kg</p>
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
                      {leaderboard.map((member, index) => (
                        <div key={index} className={`flex items-center justify-between p-4 rounded-lg ${
                          member.name === 'You' ? 'bg-eco-forest-primary/5 border border-eco-forest-primary/20' : 'bg-muted/50'
                        }`}>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10">
                              {getRankBadge(member.rank)}
                            </div>
                            <Avatar>
                              <AvatarFallback>{member.avatar}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{member.location}</span>
                                <span>•</span>
                                <span>{member.streak} day streak</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-eco-forest-primary">{member.points.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">points</p>
                          </div>
                        </div>
                      ))}
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
                      <div className="text-4xl font-bold text-eco-forest-primary mb-2">#6</div>
                      <p className="text-sm text-muted-foreground mb-4">out of {communityStats.totalMembers} members</p>
                      <Progress value={75} className="mb-2" />
                      <p className="text-xs text-muted-foreground">250 points to reach rank #5</p>
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
                          <span className="text-sm">Helping Others</span>
                          <Badge variant="default">85%</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Consistency</span>
                          <Badge variant="default">92%</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Team Participation</span>
                          <Badge variant="default">78%</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

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
                  {challenges.map((challenge, index) => (
                    <div key={index} className="p-6 bg-muted/50 rounded-lg space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-lg">{challenge.title}</h3>
                          <p className="text-muted-foreground">{challenge.description}</p>
                        </div>
                        <Badge variant="default">{challenge.reward} pts</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{challenge.progress}%</span>
                        </div>
                        <Progress value={challenge.progress} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Ends {new Date(challenge.deadline).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{challenge.participants} participants</span>
                          </div>
                        </div>
                        <Button variant="eco" size="sm">
                          Join Challenge
                        </Button>
                      </div>
                    </div>
                  ))}
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
                  {achievements.map((achievement, index) => (
                    <div key={index} className="p-6 bg-eco-success/5 border border-eco-success/20 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{achievement.badge}</div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{achievement.title}</h3>
                          <p className="text-muted-foreground mb-3">{achievement.description}</p>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(achievement.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{achievement.participants} participants</span>
                            </div>
                            <Badge variant="default">{achievement.impact}</Badge>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Share2 className="h-3 w-3 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="impact" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {impactMetrics.map((metric, index) => (
                  <Card key={index}>
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl mb-2">{metric.icon}</div>
                      <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                      <p className="text-sm text-muted-foreground">{metric.label}</p>
                    </CardContent>
                  </Card>
                ))}
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
                          <span className="font-bold">95%</span>
                        </div>
                        <Progress value={95} />
                        
                        <div className="flex justify-between">
                          <span>Recycling Rate</span>
                          <span className="font-bold">87%</span>
                        </div>
                        <Progress value={87} />
                        
                        <div className="flex justify-between">
                          <span>Community Participation</span>
                          <span className="font-bold">78%</span>
                        </div>
                        <Progress value={78} />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-semibold">Milestones Achieved</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-eco-success rounded-full"></div>
                          <span className="text-sm">1000+ tons of waste collected</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-eco-success rounded-full"></div>
                          <span className="text-sm">500+ active community members</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-eco-success rounded-full"></div>
                          <span className="text-sm">50+ verified cleanup locations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-eco-warning rounded-full"></div>
                          <span className="text-sm">Zero waste events organized</span>
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