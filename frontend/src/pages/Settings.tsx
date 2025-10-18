import { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings as SettingsIcon, 
  User,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  Save,
  Smartphone,
  Mail,
  MapPin,
  Globe,
  Eye
} from 'lucide-react';

const Settings = () => {
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    aadhaar: '****-****-9171',
    address: '',
    bio: ''
  });

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Load saved profile & photo on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('profile');
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    } else {
      // default values if no saved profile
      setProfile({
        name: userType === 'collector' ? 'Pratik Warke' : 'Kalpesh Warke',
        email: userType === 'collector' ? 'kalpeshwarke05@gmail.com' : 'kalpesh.warke@gov.in',
        phone: '+91 9834171226',
        aadhaar: '****-****-9171',
        address: 'Sudhakar Nagar, Jalgaon, Maharashtra, India',
        bio: userType === 'collector'
          ? 'Passionate about environmental conservation'
          : 'Dedicated government employee managing waste collection'
      });
    }

    const savedPhoto = localStorage.getItem('profilePhoto');
    if (savedPhoto) setProfilePhoto(savedPhoto);
  }, [userType]);

  const handleSaveProfile = () => {
    localStorage.setItem('profile', JSON.stringify(profile));
    if (profilePhoto) {
      localStorage.setItem('profilePhoto', profilePhoto);
    }
    toast({
      title: "Profile Updated",
      description: "Your profile information has been saved successfully.",
    });
  };

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsAlerts: false,
    weeklyReports: true,
    achievementAlerts: true,
    maintenanceUpdates: true
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    locationSharing: true,
    activityTracking: true,
    dataAnalytics: true
  });

  const [preferences, setPreferences] = useState({
    language: 'english',
    theme: 'system',
    currency: 'inr',
    timezone: 'asia/kolkata'
  });

  const handleSaveNotifications = () => {
    toast({
      title: "Notification Settings Updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const handleSavePrivacy = () => {
    toast({
      title: "Privacy Settings Updated",
      description: "Your privacy preferences have been saved.",
    });
  };

  const handleSavePreferences = () => {
    toast({
      title: "Preferences Updated",
      description: "Your app preferences have been saved.",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('userType');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    window.location.href = '/';
  };

  const handleExportData = () => {
    toast({
      title: "Data Export Initiated",
      description: "Your data export will be ready in a few minutes. We'll send you an email when it's ready.",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account Deletion Request",
      description: "Your account deletion request has been submitted. This action cannot be undone.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userType} />
      <main className="lg:ml-64 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-gradient-eco rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Settings</h1>
            <p className="text-white/90">Manage your profile, notifications, and app preferences</p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-eco-forest-primary" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and profile settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex flex-col items-start gap-2">
                    <img
                      src={profilePhoto || "/default-avatar.png"}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-2 border-eco-forest-primary"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      id="profile-photo-input"
                      style={{ display: "none" }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = ev => {
                            const result = ev.target?.result as string;
                            setProfilePhoto(result);
                            localStorage.setItem('profilePhoto', result); // Save immediately
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("profile-photo-input")?.click()}
                    >
                      Change Photo
                    </Button>
                  </div>

                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => setProfile({...profile, name: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({...profile, email: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={profile.phone}
                        onChange={(e) => setProfile({...profile, phone: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="aadhaar">Aadhaar Number</Label>
                      <Input
                        id="aadhaar"
                        value={profile.aadhaar}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={profile.address}
                        onChange={(e) => setProfile({...profile, address: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profile.bio}
                        onChange={(e) => setProfile({...profile, bio: e.target.value})}
                        placeholder="Tell us about yourself..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button onClick={handleSaveProfile} variant="eco">
                    <Save className="mr-2 h-4 w-4" />
                    Save Profile
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-eco-forest-primary" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose how and when you want to receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive updates via email
                        </p>
                      </div>
                      <Switch
                        checked={notifications.emailNotifications}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, emailNotifications: checked})
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          Push Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications on your device
                        </p>
                      </div>
                      <Switch
                        checked={notifications.pushNotifications}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, pushNotifications: checked})
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>SMS Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive important alerts via SMS
                        </p>
                      </div>
                      <Switch
                        checked={notifications.smsAlerts}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, smsAlerts: checked})
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Weekly Reports</Label>
                        <p className="text-sm text-muted-foreground">
                          Get weekly summary of your activities
                        </p>
                      </div>
                      <Switch
                        checked={notifications.weeklyReports}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, weeklyReports: checked})
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Achievement Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Be notified when you unlock achievements
                        </p>
                      </div>
                      <Switch
                        checked={notifications.achievementAlerts}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, achievementAlerts: checked})
                        }
                      />
                    </div>

                    {userType === 'employee' && (
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Maintenance Updates</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified about dustbin maintenance needs
                          </p>
                        </div>
                        <Switch
                          checked={notifications.maintenanceUpdates}
                          onCheckedChange={(checked) => 
                            setNotifications({...notifications, maintenanceUpdates: checked})
                          }
                        />
                      </div>
                    )}
                  </div>

                  <Button onClick={handleSaveNotifications} variant="eco">
                    <Save className="mr-2 h-4 w-4" />
                    Save Notifications
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-eco-forest-primary" />
                    Privacy & Security
                  </CardTitle>
                  <CardDescription>
                    Control your privacy settings and data sharing preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Profile Visibility</Label>
                      <Select 
                        value={privacy.profileVisibility} 
                        onValueChange={(value) => setPrivacy({...privacy, profileVisibility: value})}
                      >
                        <SelectTrigger>
                          <Eye className="mr-2 h-4 w-4" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="community">Community Only</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        Choose who can see your profile information
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Location Sharing
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Allow the app to access your location for waste collection
                        </p>
                      </div>
                      <Switch
                        checked={privacy.locationSharing}
                        onCheckedChange={(checked) => 
                          setPrivacy({...privacy, locationSharing: checked})
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Activity Tracking</Label>
                        <p className="text-sm text-muted-foreground">
                          Track your waste collection activities for rewards
                        </p>
                      </div>
                      <Switch
                        checked={privacy.activityTracking}
                        onCheckedChange={(checked) => 
                          setPrivacy({...privacy, activityTracking: checked})
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Data Analytics</Label>
                        <p className="text-sm text-muted-foreground">
                          Help improve the app by sharing anonymous usage data
                        </p>
                      </div>
                      <Switch
                        checked={privacy.dataAnalytics}
                        onCheckedChange={(checked) => 
                          setPrivacy({...privacy, dataAnalytics: checked})
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-medium">Data Management</h3>
                    <div className="flex gap-2">
                      <Button onClick={handleExportData} variant="outline">
                        Export My Data
                      </Button>
                      <Button onClick={handleDeleteAccount} variant="destructive">
                        Delete Account
                      </Button>
                    </div>
                  </div>

                  <Button onClick={handleSavePrivacy} variant="eco">
                    <Save className="mr-2 h-4 w-4" />
                    Save Privacy Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5 text-eco-forest-primary" />
                    App Preferences
                  </CardTitle>
                  <CardDescription>
                    Customize your app experience and regional settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select 
                        value={preferences.language} 
                        onValueChange={(value) => setPreferences({...preferences, language: value})}
                      >
                        <SelectTrigger>
                          <Globe className="mr-2 h-4 w-4" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="hindi">हिन्दी (Hindi)</SelectItem>
                          <SelectItem value="punjabi">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                          <SelectItem value="gujarati">ગુજરાતી (Gujarati)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <Select 
                        value={preferences.theme} 
                        onValueChange={(value) => setPreferences({...preferences, theme: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select 
                        value={preferences.currency} 
                        onValueChange={(value) => setPreferences({...preferences, currency: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inr">₹ Indian Rupee (INR)</SelectItem>
                          <SelectItem value="usd">$ US Dollar (USD)</SelectItem>
                          <SelectItem value="eur">€ Euro (EUR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select 
                        value={preferences.timezone} 
                        onValueChange={(value) => setPreferences({...preferences, timezone: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asia/kolkata">Asia/Kolkata (IST)</SelectItem>
                          <SelectItem value="asia/dubai">Asia/Dubai (GST)</SelectItem>
                          <SelectItem value="utc">UTC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button onClick={handleSavePreferences} variant="eco">
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Support Tab */}
            <TabsContent value="support" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-eco-forest-primary" />
                    Help & Support
                  </CardTitle>
                  <CardDescription>
                    Get help and manage your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" className="h-16 flex-col">
                      <HelpCircle className="h-5 w-5 mb-1" />
                      <span>FAQ & Help Center</span>
                    </Button>
                    
                    <Button variant="outline" className="h-16 flex-col">
                      <Mail className="h-5 w-5 mb-1" />
                      <span>Contact Support</span>
                    </Button>
                    
                    <Button variant="outline" className="h-16 flex-col">
                      <Globe className="h-5 w-5 mb-1" />
                      <span>Community Guidelines</span>
                    </Button>
                    
                    <Button variant="outline" className="h-16 flex-col">
                      <Shield className="h-5 w-5 mb-1" />
                      <span>Privacy Policy</span>
                    </Button>
                  </div>

                  <div className="pt-6 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Account Actions</h3>
                        <p className="text-sm text-muted-foreground">
                          Manage your account and session
                        </p>
                      </div>
                      <Button onClick={handleLogout} variant="destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </div>
                  </div>

                  <div className="text-center text-sm text-muted-foreground">
                    <p>EcoWaste Smart Management System v1.0.0</p>
                    <p>© 2024 Government of India. All rights reserved.</p>
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

export default Settings;