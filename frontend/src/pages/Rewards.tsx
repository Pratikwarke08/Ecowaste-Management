import { useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Award, 
  TrendingUp, 
  IndianRupee, 
  Calendar,
  CheckCircle,
  Clock,
  X,
  Gift,
  Download,
  History
} from 'lucide-react';

const Rewards = () => {
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const { toast } = useToast();

  const stats = {
    totalPoints: 2450,
    availablePoints: 1850,
    pendingPoints: 600,
    totalEarnings: 4200,
    thisMonth: 1250
  };

  const recentTransactions = [
    { id: 1, type: 'earned', amount: 125, date: '2024-01-06', status: 'completed', description: 'Mixed waste collection - Sector 12' },
    { id: 2, type: 'withdrawn', amount: 500, date: '2024-01-05', status: 'completed', description: 'Bank transfer to account ****1234' },
    { id: 3, type: 'earned', amount: 75, date: '2024-01-04', status: 'pending', description: 'Plastic bottles - Market area' },
    { id: 4, type: 'earned', amount: 200, date: '2024-01-03', status: 'completed', description: 'Community cleanup drive' },
  ];

  const achievements = [
    { title: 'Eco Warrior', description: 'Collected 100kg+ waste', completed: true, points: 500 },
    { title: 'Consistency Champion', description: '30 days continuous activity', completed: true, points: 300 },
    { title: 'Community Hero', description: 'Helped 50+ cleanup reports', completed: false, points: 250, progress: 32 },
    { title: 'Green Guardian', description: 'Prevented 500kg waste overflow', completed: false, points: 750, progress: 68 },
  ];

  const handleWithdraw = () => {
    if (!withdrawAmount || parseInt(withdrawAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount.",
        variant: "destructive",
      });
      return;
    }

    if (parseInt(withdrawAmount) > stats.availablePoints) {
      toast({
        title: "Insufficient Points",
        description: "You don't have enough available points for this withdrawal.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Withdrawal Requested",
      description: `₹${withdrawAmount} withdrawal request submitted successfully!`,
    });
    
    setWithdrawAmount('');
    setShowWithdrawForm(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-eco-success" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-eco-warning" />;
      default:
        return <X className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userType} />
      <main className="lg:ml-64 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-gradient-eco rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">My Rewards</h1>
            <p className="text-white/90">Track your earnings and withdraw your rewards</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-forest-primary/10 rounded-full">
                    <Award className="h-6 w-6 text-eco-forest-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Points</p>
                    <p className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-success/10 rounded-full">
                    <CheckCircle className="h-6 w-6 text-eco-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Available Points</p>
                    <p className="text-2xl font-bold text-eco-success">{stats.availablePoints.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-warning/10 rounded-full">
                    <Clock className="h-6 w-6 text-eco-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Points</p>
                    <p className="text-2xl font-bold text-eco-warning">{stats.pendingPoints.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-ocean/10 rounded-full">
                    <IndianRupee className="h-6 w-6 text-eco-ocean" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                    <p className="text-2xl font-bold text-eco-ocean">₹{stats.totalEarnings.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Withdrawal Section */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-eco-forest-primary" />
                    Withdraw Rewards
                  </CardTitle>
                  <CardDescription>
                    Convert your available points to cash (1 point = ₹1)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-eco-success/5 border border-eco-success/20 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Available for withdrawal</span>
                      <span className="text-xl font-bold text-eco-success">₹{stats.availablePoints}</span>
                    </div>
                    <Progress value={(stats.availablePoints / stats.totalPoints) * 100} className="h-2" />
                  </div>

                  {!showWithdrawForm ? (
                    <Button 
                      onClick={() => setShowWithdrawForm(true)}
                      variant="eco" 
                      className="w-full"
                    >
                      <IndianRupee className="mr-2 h-4 w-4" />
                      Request Withdrawal
                    </Button>
                  ) : (
                    <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Withdrawal Amount (₹)</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="Enter amount"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          max={stats.availablePoints}
                        />
                        <p className="text-sm text-muted-foreground">
                          Maximum: ₹{stats.availablePoints}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleWithdraw} variant="eco" className="flex-1">
                          Confirm Withdrawal
                        </Button>
                        <Button 
                          onClick={() => {
                            setShowWithdrawForm(false);
                            setWithdrawAmount('');
                          }}
                          variant="outline" 
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-eco-forest-primary" />
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(transaction.status)}
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            transaction.type === 'earned' ? 'text-eco-success' : 'text-eco-ocean'
                          }`}>
                            {transaction.type === 'earned' ? '+' : '-'}₹{transaction.amount}
                          </p>
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Achievements Section */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-eco-forest-primary" />
                    Achievements
                  </CardTitle>
                  <CardDescription>
                    Unlock badges and earn bonus points
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {achievements.map((achievement, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      achievement.completed 
                        ? 'bg-eco-success/5 border-eco-success/20' 
                        : 'bg-muted/50 border-muted'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{achievement.title}</h4>
                        {achievement.completed && (
                          <CheckCircle className="h-4 w-4 text-eco-success" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {achievement.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant={achievement.completed ? 'default' : 'secondary'}>
                          {achievement.points} pts
                        </Badge>
                        {!achievement.completed && achievement.progress && (
                          <span className="text-xs text-muted-foreground">
                            {achievement.progress}% complete
                          </span>
                        )}
                      </div>
                      {!achievement.completed && achievement.progress && (
                        <Progress value={achievement.progress} className="h-2 mt-2" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-eco-forest-primary" />
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-eco-forest-primary">₹{stats.thisMonth}</p>
                    <p className="text-sm text-muted-foreground">Total earned</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Rewards;