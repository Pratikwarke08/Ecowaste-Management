import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shield, Users, Recycle, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoginFormProps {
  onLogin: (userType: 'collector' | 'employee', userData: { name?: string; email: string }) => void;
}

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [userType, setUserType] = useState<'collector' | 'employee'>('collector');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!validatePassword(password)) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      onLogin(userType, { email });
      toast({
        title: "Login Successful",
        description: `Welcome back to EcoWaste Management System!`,
      });
    }, 1500);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!validatePassword(password)) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Account Created Successfully",
        description: "Welcome to EcoWaste Management System!",
      });
      setTimeout(() => {
        onLogin(userType, { name, email });
      }, 500);
    }, 1500);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setShowPassword(false);
  };

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    resetForm();
  };

  const handleSubmit = mode === 'signin' ? handleSignIn : handleSignUp;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 shadow-lg">
              <Recycle className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">EcoWaste</h1>
          <p className="text-white/90 text-lg">Smart Waste Management System</p>
        </div>

        <Card className="shadow-2xl backdrop-blur-sm bg-white/95 border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center gap-2 justify-center text-2xl">
              <Shield className="h-6 w-6 text-emerald-600" />
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-base">
              {mode === 'signin' 
                ? 'Welcome back! Sign in to continue'
                : 'Join us in making waste management smarter'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">Account Type:</Label>
                <RadioGroup
                  value={userType}
                  onValueChange={(value: 'collector' | 'employee') => setUserType(value)}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className="relative">
                    <RadioGroupItem value="collector" id="collector" className="peer sr-only" />
                    <Label 
                      htmlFor="collector" 
                      className="flex items-center justify-center gap-2 cursor-pointer rounded-lg border-2 border-gray-200 bg-white p-3 hover:bg-emerald-50 peer-data-[state=checked]:border-emerald-600 peer-data-[state=checked]:bg-emerald-50 transition-all"
                    >
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">Collector</span>
                    </Label>
                  </div>
                  <div className="relative">
                    <RadioGroupItem value="employee" id="employee" className="peer sr-only" />
                    <Label 
                      htmlFor="employee" 
                      className="flex items-center justify-center gap-2 cursor-pointer rounded-lg border-2 border-gray-200 bg-white p-3 hover:bg-emerald-50 peer-data-[state=checked]:border-emerald-600 peer-data-[state=checked]:bg-emerald-50 transition-all"
                    >
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">Employee</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 h-11"
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === 'signin' ? "Enter your password" : "Create a password (min 6 characters)"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {mode === 'signin' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    onClick={() => {
                      toast({
                        title: "Password Reset",
                        description: "Password reset link would be sent to your email",
                      });
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <Button 
                onClick={handleSubmit}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {mode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                  </span>
                ) : (
                  mode === 'signin' ? 'Sign In' : 'Create Account'
                )}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-medium transition-all"
              onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? 'Create New Account' : 'Sign In Instead'}
            </Button>

            <div className="bg-emerald-50 rounded-lg p-3 space-y-1 border border-emerald-100">
              <p className="text-xs text-emerald-800 text-center font-medium flex items-center justify-center gap-1">
                <Shield className="h-3 w-3" />
                Your data is secure and encrypted
              </p>
              <p className="text-xs text-emerald-700 text-center">
                We protect your privacy and never share your information
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-white/80 text-sm">
          <p>Powered by sustainable technology</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;