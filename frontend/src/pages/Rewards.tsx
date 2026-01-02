import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  History,
  Lock,
  Shield,
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface RewardsTransaction {
  id: string;
  type: 'earned' | 'withdrawn';
  amountPoints: number;
  amountRupees: number;
  status: string;
  description?: string;
  createdAt: string;
}

interface RewardsSummary {
  lifetimePoints: number;
  availablePoints: number;
  withdrawnPoints: number;
  availableRupees: number;
  withdrawnRupees: number;
  pendingReports: number;
  conversion: {
    pointsPerRupee: number;
    rupeesPerPoint: number;
  };
  transactions: RewardsTransaction[];
}

interface CollectorDashboardData {
  monthlyProgress: {
    reportsThisMonth: number;
    pointsThisMonth: number;
    monthlyGoalReports: number;
    monthlyGoalPoints: number;
    progressPercent: number;
  };
}

const Rewards = () => {
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const [summary, setSummary] = useState<RewardsSummary | null>(null);
  const [dashboardData, setDashboardData] = useState<CollectorDashboardData | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [paymentStep, setPaymentStep] = useState<'input' | 'verify' | 'processing' | 'success'>('input');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { toast } = useToast();

  const initiateWithdrawal = () => {
    if (!summary) return;
    const amountNumber = Number(withdrawAmount);
    if (!amountNumber || amountNumber <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid withdrawal amount.',
        variant: 'destructive'
      });
      return;
    }
    if (amountNumber > summary.availableRupees) {
      toast({
        title: 'Insufficient Balance',
        description: 'You do not have enough available rewards to withdraw this amount.',
        variant: 'destructive'
      });
      return;
    }

    if (paymentMethod === 'upi' && !upiId.includes('@')) {
      toast({
        title: 'Invalid UPI ID',
        description: 'Please enter a valid UPI ID (e.g., name@bank).',
        variant: 'destructive'
      });
      return;
    }

    if (paymentMethod === 'bank' && (!accountNumber || ifsc.length < 4)) {
      toast({
        title: 'Invalid Bank Details',
        description: 'Please enter valid Account Number and IFSC Code.',
        variant: 'destructive'
      });
      return;
    }

    setPaymentStep('verify');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, dashboardRes] = await Promise.all([
          apiFetch('/rewards/summary'),
          apiFetch('/dashboard/collector')
        ]);
        const summaryJson = await summaryRes.json();
        const dashboardJson = await dashboardRes.json();
        setSummary(summaryJson);
        setDashboardData(dashboardJson);
      } catch (err) {
        const error = err as Error & { status?: number; message?: string };
        console.error(error);
        toast({
          title: 'Failed to load rewards',
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
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleWithdraw = async () => {
    if (otp !== '1234') {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the correct OTP (Use 1234 for demo).',
        variant: 'destructive'
      });
      return;
    }

    try {
      setPaymentStep('processing');
      // Simulate Payment Gateway Delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const amountNumber = Number(withdrawAmount);
      const amountPoints = Math.round(amountNumber * (summary?.conversion.pointsPerRupee || 100));
      
      const res = await apiFetch('/rewards/withdraw', {
        method: 'POST',
        body: JSON.stringify({ 
          amountRupees: amountNumber, 
          amountPoints,
          paymentMethod,
          paymentDetails: paymentMethod === 'upi' ? { upiId } : { accountNumber, ifsc }
        })
      });
      const newSummary = await res.json();
      setSummary(newSummary);
      
      setPaymentStep('success');
      toast({
        title: 'Withdrawal Successful',
        description: `₹${amountNumber} has been transferred to your account.`
      });
      
      // Reset after delay
      setTimeout(() => {
        setWithdrawAmount('');
        setShowWithdrawForm(false);
        setPaymentStep('input');
        setOtp('');
      }, 3000);
      
    } catch (err) {
      const error = err as Error & { message?: string };
      console.error(error);
      toast({
        title: 'Withdrawal Failed',
        description: error.message || 'Unable to process withdrawal',
        variant: 'destructive'
      });
      setPaymentStep('input');
    }
  };

  const achievements = useMemo(() => {
    if (!summary) return [];
    const lifetimePoints = summary.lifetimePoints;
    const approvedReports = dashboardData?.monthlyProgress.reportsThisMonth ?? 0;

    return [
      {
        title: 'Eco Warrior',
        description: 'Earn 1,000 lifetime points',
        target: 1000,
        progress: Math.min(Math.max((lifetimePoints / 1000) * 100, 0), 100),
        completed: lifetimePoints >= 1000,
        points: 500
      },
      {
        title: 'Consistency Champion',
        description: 'Submit 15 approved reports this month',
        target: 15,
        progress: Math.min(Math.max((approvedReports / 15) * 100, 0), 100),
        completed: approvedReports >= 15,
        points: 300
      },
      {
        title: 'Quick Responder',
        description: 'Keep pending reports below 3',
        target: 3,
        progress: Math.min(Math.max(((3 - summary.pendingReports) / 3) * 100, 0), 100),
        completed: summary.pendingReports <= 3,
        points: 250
      }
    ];
  }, [summary, dashboardData]);

  const transactions = useMemo(() => summary?.transactions ?? [], [summary]);

  if (isLoading || !summary) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation userRole={userType} />
        <main className="lg:ml-64 p-6">
          <div className="max-w-6xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse text-muted-foreground">Loading rewards...</div>
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
            <h1 className="text-2xl font-bold mb-2">My Rewards</h1>
            <p className="text-white/90">Track your earnings and withdraw your rewards in real-time</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-forest-primary/10 rounded-full">
                    <Award className="h-6 w-6 text-eco-forest-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Points</p>
                    <p className="text-2xl font-bold">{summary.lifetimePoints.toLocaleString()}</p>
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
                    <p className="text-2xl font-bold text-eco-success">{summary.availablePoints.toLocaleString()}</p>
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
                    <p className="text-sm text-muted-foreground">Pending Reports</p>
                    <p className="text-2xl font-bold text-eco-warning">{summary.pendingReports}</p>
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
                    <p className="text-2xl font-bold text-eco-ocean">₹{(summary.lifetimePoints / summary.conversion.pointsPerRupee).toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-eco-forest-primary" />
                    Withdraw Rewards
                  </CardTitle>
                  <CardDescription>
                    Convert your available points to cash !
                    The minimum withdrawal is 10rs ({summary.conversion.pointsPerRupee} points = ₹1)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-eco-success/5 border border-eco-success/20 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Available for withdrawal</span>
                      <span className="text-xl font-bold text-eco-success">₹{summary.availableRupees.toFixed(2)}</span>
                    </div>
                    <Progress value={summary.lifetimePoints ? (summary.availablePoints / summary.lifetimePoints) * 100 : 0} className="h-2" />
                  </div>

                  {!showWithdrawForm ? (
                    <Button
                      onClick={() => {
                        setShowWithdrawForm(true);
                        setPaymentStep('input');
                      }}
                      variant="eco"
                      className="w-full"
                    >
                      <IndianRupee className="mr-2 h-4 w-4" />
                      Request Withdrawal
                    </Button>
                  ) : (
                    <div className="space-y-4 bg-muted/30 p-4 rounded-lg border border-muted relative overflow-hidden">
                      {/* Secure Badge Background */}
                      <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                        <ShieldCheck className="h-32 w-32" />
                      </div>

                      <div className="flex items-center gap-2 mb-4 border-b pb-2">
                        <Lock className="h-4 w-4 text-eco-forest-primary" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Secure Payment Gateway</span>
                      </div>

                      {paymentStep === 'input' && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="space-y-2">
                            <Label>Withdrawal Method</Label>
                            <RadioGroup defaultValue="upi" value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'upi' | 'bank')} className="flex gap-4">
                              <div className="flex items-center space-x-2 border p-2 rounded-md hover:bg-muted cursor-pointer transition-colors w-full">
                                <RadioGroupItem value="upi" id="upi" />
                                <Label htmlFor="upi" className="cursor-pointer flex-1">UPI</Label>
                                <Smartphone className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex items-center space-x-2 border p-2 rounded-md hover:bg-muted cursor-pointer transition-colors w-full">
                                <RadioGroupItem value="bank" id="bank" />
                                <Label htmlFor="bank" className="cursor-pointer flex-1">Bank Transfer</Label>
                                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </RadioGroup>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="amount">Withdrawal Amount (₹)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                              <Input
                                id="amount"
                                type="number"
                                className="pl-8 font-mono text-lg"
                                placeholder="0.00"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                max={summary.availableRupees}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground text-right">Max: ₹{summary.availableRupees.toFixed(2)}</p>
                          </div>

                          {paymentMethod === 'upi' ? (
                            <div className="space-y-2">
                              <Label htmlFor="upiId">UPI ID</Label>
                              <Input
                                id="upiId"
                                placeholder="e.g. user@okhdfcbank"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <Label htmlFor="accountNumber">Account Number</Label>
                                <Input
                                  id="accountNumber"
                                  placeholder="Enter account number"
                                  value={accountNumber}
                                  onChange={(e) => setAccountNumber(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="ifsc">IFSC Code</Label>
                                <Input
                                  id="ifsc"
                                  placeholder="e.g. HDFC0001234"
                                  value={ifsc}
                                  onChange={(e) => setIfsc(e.target.value)}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button onClick={initiateWithdrawal} variant="eco" className="flex-1">
                              Proceed to Pay
                            </Button>
                            <Button
                              onClick={() => {
                                setShowWithdrawForm(false);
                                setWithdrawAmount('');
                                setUpiId('');
                                setAccountNumber('');
                                setIfsc('');
                              }}
                              variant="ghost"
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {paymentStep === 'verify' && (
                        <div className="space-y-4 animate-fade-in text-center py-4">
                          <div className="mx-auto bg-muted rounded-full p-4 w-16 h-16 flex items-center justify-center mb-4">
                            <ShieldCheck className="h-8 w-8 text-eco-forest-primary" />
                          </div>
                          <h3 className="font-semibold text-lg">Verify Transaction</h3>
                          <p className="text-sm text-muted-foreground">
                            Sending <span className="font-bold text-foreground">₹{withdrawAmount}</span> to<br/>
                            <span className="font-mono">{paymentMethod === 'upi' ? upiId : accountNumber}</span>
                          </p>
                          
                          <div className="space-y-2 text-left max-w-xs mx-auto mt-4">
                            <Label htmlFor="otp">Enter OTP (Simulated: 1234)</Label>
                            <Input
                              id="otp"
                              type="text"
                              className="text-center letter-spacing-2 font-mono text-lg"
                              placeholder="• • • •"
                              maxLength={4}
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                            />
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button onClick={handleWithdraw} variant="eco" className="w-full">
                              Confirm & Withdraw
                            </Button>
                            <Button onClick={() => setPaymentStep('input')} variant="outline" className="w-full">
                              Back
                            </Button>
                          </div>
                        </div>
                      )}

                      {paymentStep === 'processing' && (
                        <div className="py-12 text-center animate-fade-in">
                          <div className="relative mx-auto w-16 h-16 mb-4">
                            <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-eco-forest-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                          </div>
                          <h3 className="font-semibold text-lg mb-2">Processing Payment...</h3>
                          <p className="text-sm text-muted-foreground">Securely transferring funds.</p>
                          <p className="text-xs text-muted-foreground mt-4">Do not close this window.</p>
                        </div>
                      )}

                      {paymentStep === 'success' && (
                        <div className="py-8 text-center animate-scale-in">
                          <div className="mx-auto bg-eco-success/10 rounded-full p-4 w-20 h-20 flex items-center justify-center mb-4 text-eco-success">
                            <CheckCircle className="h-10 w-10" />
                          </div>
                          <h3 className="font-bold text-xl mb-2 text-eco-success">Withdrawal Successful!</h3>
                          <p className="text-sm text-muted-foreground mb-6">
                            ₹{withdrawAmount} has been credited to your account.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-eco-forest-primary" />
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No transactions recorded yet.</p>
                    ) : (
                      transactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {transaction.type === 'earned' ? (
                              <CheckCircle className="h-4 w-4 text-eco-success" />
                            ) : transaction.status === 'pending' ? (
                              <Clock className="h-4 w-4 text-eco-warning" />
                            ) : (
                              <IndianRupee className="h-4 w-4 text-eco-ocean" />
                            )}
                            <div>
                              <p className="font-medium">{transaction.description || (transaction.type === 'earned' ? 'Approved collection' : 'Withdrawal')}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(transaction.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${transaction.type === 'earned' ? 'text-eco-success' : 'text-eco-ocean'}`}>
                              {transaction.type === 'earned' ? '+' : '-'}₹{transaction.amountRupees.toFixed(2)}
                            </p>
                            <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                              {transaction.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-eco-forest-primary" />
                    Achievements
                  </CardTitle>
                  <CardDescription>Unlock badges and earn bonus points</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {achievements.map((achievement, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${achievement.completed ? 'bg-eco-success/5 border-eco-success/20' : 'bg-muted/50 border-muted'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{achievement.title}</h4>
                        {achievement.completed && <CheckCircle className="h-4 w-4 text-eco-success" />}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant={achievement.completed ? 'default' : 'secondary'}>
                          {achievement.points} pts
                        </Badge>
                        <span className="text-xs text-muted-foreground">{Math.round(achievement.progress)}% complete</span>
                      </div>
                      <Progress value={achievement.progress} className="h-2 mt-2" />
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
                  <div className="text-center space-y-2">
                    <p className="text-3xl font-bold text-eco-forest-primary">₹{((dashboardData?.monthlyProgress.pointsThisMonth ?? 0) / summary.conversion.pointsPerRupee).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Total earned</p>
                    <p className="text-xs text-muted-foreground">
                      {dashboardData?.monthlyProgress.reportsThisMonth ?? 0} reports approved this month
                    </p>
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