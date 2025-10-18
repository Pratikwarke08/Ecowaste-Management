import { useState } from 'react';
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

const ProgressPage = () => {
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedSector, setSelectedSector] = useState('all');

  const overviewStats = {
    totalWasteCollected: 4850,
    activeCollectors: 89,
    verifiedReports: 324,
    avgResponseTime: 2.3,
    monthlyGoal: 5000,
    currentProgress: 97
  };

  const sectorData = [
    { sector: 'Sector 8', waste: 980, collectors: 18, efficiency: 92, goal: 1000 },
    { sector: 'Sector 12', waste: 1150, collectors: 22, efficiency: 88, goal: 1200 },
    { sector: 'Sector 15', waste: 856, collectors: 16, efficiency: 95, goal: 900 },
    { sector: 'Sector 18', waste: 1234, collectors: 19, efficiency: 89, goal: 1300 },
    { sector: 'Sector 22', waste: 630, collectors: 14, efficiency: 85, goal: 600 },
  ];

  const wasteTypeData = [
    { type: 'Mixed Plastic', amount: 1450, percentage: 30, trend: '+12%' },
    { type: 'Organic Waste', amount: 1260, percentage: 26, trend: '+8%' },
    { type: 'Paper & Cardboard', amount: 980, percentage: 20, trend: '+15%' },
    { type: 'Glass', amount: 730, percentage: 15, trend: '+5%' },
    { type: 'Metal', amount: 430, percentage: 9, trend: '-2%' },
  ];

  const monthlyTrend = [
    { month: 'Aug', collected: 3200, target: 4000 },
    { month: 'Sep', collected: 3800, target: 4200 },
    { month: 'Oct', collected: 4200, target: 4500 },
    { month: 'Nov', collected: 4650, target: 4800 },
    { month: 'Dec', collected: 4850, target: 5000 },
    { month: 'Jan', collected: 1200, target: 5200 },
  ];

  const topPerformers = [
    { name: 'Pratik Warke', collections: 45, weight: 342, efficiency: 98 },
    { name: 'Tejas Suryawanshi', collections: 42, weight: 318, efficiency: 95 },
    { name: 'Snehal bhole', collections: 38, weight: 295, efficiency: 94 },
    { name: 'Ansh Singh', collections: 35, weight: 278, efficiency: 92 },
    { name: 'Kartik Patil', collections: 33, weight: 256, efficiency: 91 },
  ];

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
                <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-forest-primary/10 rounded-full">
                    <Recycle className="h-6 w-6 text-eco-forest-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Collected</p>
                    <p className="text-2xl font-bold">{overviewStats.totalWasteCollected.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">kg this month</p>
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
                    <p className="text-2xl font-bold text-eco-success">{overviewStats.activeCollectors}</p>
                    <p className="text-xs text-muted-foreground">this month</p>
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
                    <p className="text-sm text-muted-foreground">Verified Reports</p>
                    <p className="text-2xl font-bold text-eco-ocean">{overviewStats.verifiedReports}</p>
                    <p className="text-xs text-muted-foreground">this month</p>
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
                    <p className="text-sm text-muted-foreground">Monthly Goal</p>
                    <p className="text-2xl font-bold text-eco-warning">{overviewStats.currentProgress}%</p>
                    <p className="text-xs text-muted-foreground">{overviewStats.monthlyGoal - overviewStats.totalWasteCollected}kg remaining</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Goal Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-eco-forest-primary" />
                Monthly Goal Progress
              </CardTitle>
              <CardDescription>
                {overviewStats.totalWasteCollected.toLocaleString()}kg of {overviewStats.monthlyGoal.toLocaleString()}kg target achieved
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={overviewStats.currentProgress} className="h-4" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Start: 0kg</span>
                  <span>Current: {overviewStats.totalWasteCollected.toLocaleString()}kg</span>
                  <span>Target: {overviewStats.monthlyGoal.toLocaleString()}kg</span>
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
              <div className="flex items-center gap-4">
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger className="w-48">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    <SelectItem value="sector-8">Sector 8</SelectItem>
                    <SelectItem value="sector-12">Sector 12</SelectItem>
                    <SelectItem value="sector-15">Sector 15</SelectItem>
                    <SelectItem value="sector-18">Sector 18</SelectItem>
                    <SelectItem value="sector-22">Sector 22</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-eco-forest-primary" />
                    Sector Performance
                  </CardTitle>
                  <CardDescription>
                    Waste collection performance across different sectors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {sectorData.map((sector, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <h3 className="font-medium">{sector.sector}</h3>
                            <Badge variant="outline">{sector.collectors} collectors</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              {sector.waste}kg / {sector.goal}kg
                            </span>
                            <Badge variant={sector.efficiency >= 90 ? 'default' : 'secondary'}>
                              {sector.efficiency}% efficiency
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Progress value={(sector.waste / sector.goal) * 100} />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Goal: {sector.goal}kg</span>
                            <span>{((sector.waste / sector.goal) * 100).toFixed(0)}% achieved</span>
                          </div>
                        </div>
                      </div>
                    ))}
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
                    Highest performing waste collectors this month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {topPerformers.map((performer, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-eco-forest-primary/10 rounded-full">
                            <span className="font-bold text-eco-forest-primary">#{index + 1}</span>
                          </div>
                          <div>
                            <h3 className="font-medium">{performer.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {performer.collections} collections • {performer.weight}kg total
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="default" className={getEfficiencyColor(performer.efficiency)}>
                            {performer.efficiency}% efficiency
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Avg: {(performer.weight / performer.collections).toFixed(1)}kg per collection
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Summary Cards */}
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
                  <span className="text-sm">CO₂ Reduced</span>
                  <span className="font-bold text-eco-success">2.4 tons</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Trees Saved</span>
                  <span className="font-bold text-eco-success">156</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Water Saved</span>
                  <span className="font-bold text-eco-success">12,400L</span>
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
                  <span className="text-sm">Avg Response Time</span>
                  <span className="font-bold">{overviewStats.avgResponseTime}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Verification Rate</span>
                  <span className="font-bold text-eco-success">94%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Collection Efficiency</span>
                  <span className="font-bold text-eco-success">91%</span>
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
                  <span className="text-sm">Next Week Goal</span>
                  <span className="font-bold">1,200kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Monthly Target</span>
                  <span className="font-bold">5,200kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Quarterly Goal</span>
                  <span className="font-bold">15,000kg</span>
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