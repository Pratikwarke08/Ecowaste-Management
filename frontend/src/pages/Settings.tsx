import { useState, useEffect, useCallback, useRef } from 'react';
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
import { apiFetch } from '@/lib/api';
import { applyTheme } from '@/lib/theme';

type NotificationsSettings = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsAlerts: boolean;
  weeklyReports: boolean;
  achievementAlerts: boolean;
  maintenanceUpdates: boolean;
};

type PrivacySettings = {
  profileVisibility: 'public' | 'community' | 'private';
  locationSharing: boolean;
  activityTracking: boolean;
  dataAnalytics: boolean;
};

type PreferencesSettings = {
  language: string;
  theme: string;
  currency: string;
  timezone: string;
};

type UserProfilePayload = {
  name?: string;
  email?: string;
  role?: string;
  profile?: {
    phone?: string;
    address?: string;
    bio?: string;
    sector?: string;
    aadhaarLast4?: string;
    photoBase64?: string;
  };
  settings?: {
    notifications?: NotificationsSettings;
    privacy?: PrivacySettings;
    preferences?: PreferencesSettings;
  };
  lastLoginAt?: string;
  lastActiveAt?: string;
  createdAt?: string;
};

type UserResponse = {
  user: UserProfilePayload;
};

type ProfileState = {
  name: string;
  email: string;
  phone: string;
  aadhaar: string;
  address: string;
  bio: string;
  sector: string;
};

const DEFAULT_PROFILE_STATE: ProfileState = {
  name: '',
  email: '',
  phone: '',
  aadhaar: '',
  address: '',
  bio: '',
  sector: ''
};

const DEFAULT_NOTIFICATIONS_STATE: NotificationsSettings = {
  emailNotifications: true,
  pushNotifications: true,
  smsAlerts: false,
  weeklyReports: true,
  achievementAlerts: true,
  maintenanceUpdates: true
};

const DEFAULT_PRIVACY_STATE: PrivacySettings = {
  profileVisibility: 'public',
  locationSharing: true,
  activityTracking: true,
  dataAnalytics: true
};

const DEFAULT_PREFERENCES_STATE: PreferencesSettings = {
  language: 'english',
  theme: 'system',
  currency: 'inr',
  timezone: 'asia/kolkata'
};

const Settings = () => {
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileState>(DEFAULT_PROFILE_STATE);

  const [loading, setLoading] = useState(true);
  const [userMeta, setUserMeta] = useState<{ role?: string; lastLoginAt?: string; lastActiveAt?: string; createdAt?: string } | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('profile');
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);

  // Smooth scroll to center active tab
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const activeButton = container.querySelector(`[data-state="active"]`) as HTMLElement;
    if (!activeButton) return;

    const scrollToCenter = () => {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      const scrollLeft = activeButton.offsetLeft - (containerRect.width / 2) + (buttonRect.width / 2);

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    };

    // Scroll immediately and after a short delay for reliability
    requestAnimationFrame(scrollToCenter);
    const timeout = setTimeout(scrollToCenter, 100);

    return () => clearTimeout(timeout);
  }, [activeTab]);

  const applyUserToState = useCallback((userData?: UserProfilePayload | null) => {
    if (!userData) return;
    const aadhaarLast4 = userData.profile?.aadhaarLast4;
    setProfile({
      name: userData.name ?? '',
      email: userData.email ?? '',
      phone: userData.profile?.phone ?? '',
      aadhaar: aadhaarLast4 ?? '',
      address: userData.profile?.address ?? '',
      bio: userData.profile?.bio ?? '',
      sector: userData.profile?.sector ?? ''
    });
    setProfilePhoto(userData.profile?.photoBase64 ?? null);
    setNotifications({
      ...DEFAULT_NOTIFICATIONS_STATE,
      ...(userData.settings?.notifications ?? {})
    });
    setPrivacy({
      ...DEFAULT_PRIVACY_STATE,
      ...(userData.settings?.privacy ?? {})
    });
    setPreferences({
      ...DEFAULT_PREFERENCES_STATE,
      ...(userData.settings?.preferences ?? {})
    });
    // Apply theme from user preferences on load
    applyTheme(userData.settings?.preferences?.theme);
    setUserMeta({
      role: userData.role,
      lastLoginAt: userData.lastLoginAt,
      lastActiveAt: userData.lastActiveAt,
      createdAt: userData.createdAt
    });
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const formatDateTime = (value?: string) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  // Load saved profile & photo on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiFetch('/users/me');
        const data = (await res.json()) as UserResponse;
        applyUserToState(data.user);
      } catch (err) {
        const error = err as Error & { status?: number; message?: string };
        console.error(error);
        if (error.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userType');
          window.location.href = '/';
        } else {
          toast({
            title: "Failed to load profile",
            description: error.message || "Please try again later",
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [toast, applyUserToState]);

  const handleSaveProfile = () => {
    const save = async () => {
      try {
        setIsProfileSaving(true);
        const sanitizedAadhaar = profile.aadhaar.replace(/\D/g, '');
        const payload = {
          name: profile.name,
          profile: {
            phone: profile.phone,
            address: profile.address,
            bio: profile.bio,
            sector: profile.sector,
            aadhaarLast4: sanitizedAadhaar ? sanitizedAadhaar.slice(-4) : undefined,
            photoBase64: profilePhoto ?? undefined
          }
        };
        const res = await apiFetch('/users/me', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        const data = (await res.json()) as UserResponse;
        applyUserToState(data.user);
        toast({
          title: "Profile Updated",
          description: "Your profile information has been saved successfully.",
        });
      } catch (err) {
        const error = err as Error & { status?: number; message?: string };
        console.error(error);
        if (error.status === 401) {
          await handleLogout();
        } else {
          toast({
            title: "Update Failed",
            description: error.message || "Unable to update profile",
            variant: "destructive",
          });
        }
      } finally {
        setIsProfileSaving(false);
      }
    };
    save();
  };

  const [notifications, setNotifications] = useState<NotificationsSettings>(DEFAULT_NOTIFICATIONS_STATE);

  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULT_PRIVACY_STATE);

  const [preferences, setPreferences] = useState<PreferencesSettings>(DEFAULT_PREFERENCES_STATE);


  const handleSaveNotifications = async () => {
    try {
      const res = await apiFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify({ settings: { notifications } })
      });
      const data = (await res.json()) as UserResponse;
      applyUserToState(data.user);
      toast({
        title: "Notification Settings Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (err) {
      const error = err as Error & { status?: number; message?: string };
      console.error(error);
      if (error.status === 401) {
        await handleLogout();
      } else {
        toast({
          title: "Update Failed",
          description: error.message || "Unable to update notifications",
          variant: "destructive",
        });
      }
    }
  };

  const handleSavePrivacy = async () => {
    try {
      const res = await apiFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify({ settings: { privacy } })
      });
      const data = (await res.json()) as UserResponse;
      applyUserToState(data.user);
      toast({
        title: "Privacy Settings Updated",
        description: "Your privacy preferences have been saved.",
      });
    } catch (err) {
      const error = err as Error & { status?: number; message?: string };
      console.error(error);
      if (error.status === 401) {
        await handleLogout();
      } else {
        toast({
          title: "Update Failed",
          description: error.message || "Unable to update privacy settings",
          variant: "destructive",
        });
      }
    }
  };

  const handleSavePreferences = async () => {
    try {
      const res = await apiFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify({ settings: { preferences } })
      });
      const data = (await res.json()) as UserResponse;
      applyUserToState(data.user);
      // Apply theme after saving preferences
      applyTheme(data.user.settings?.preferences?.theme);
      toast({
        title: "Preferences Updated",
        description: "Your app preferences have been saved.",
      });
    } catch (err) {
      const error = err as Error & { status?: number; message?: string };
      console.error(error);
      if (error.status === 401) {
        await handleLogout();
      } else {
        toast({
          title: "Update Failed",
          description: error.message || "Unable to update preferences",
          variant: "destructive",
        });
      }
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      window.location.href = '/';
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation userRole={userType} />
        <main className="lg:ml-64 p-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse text-muted-foreground">Loading settings...</div>
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
      <main className="lg:ml-64 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-gradient-eco rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Settings</h1>
            <p className="text-white/90">Manage your profile, notifications, and app preferences</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Carousel-style TabsList */}
            <div className="relative w-full overflow-hidden">
              <div
                ref={tabsContainerRef}
                className="overflow-x-auto overflow-y-hidden pb-2"
                style={{
                  scrollSnapType: 'x mandatory',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <TabsList className="inline-flex items-center gap-2 w-auto min-w-full justify-start bg-muted rounded-lg p-1">
                  <TabsTrigger
                    value="profile"
                    className="flex items-center gap-2 flex-shrink-0 snap-center whitespace-nowrap px-4 py-2"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="notifications"
                    className="flex items-center gap-2 flex-shrink-0 snap-center whitespace-nowrap px-4 py-2"
                  >
                    <Bell className="h-4 w-4" />
                    <span>Notifications</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="privacy"
                    className="flex items-center gap-2 flex-shrink-0 snap-center whitespace-nowrap px-4 py-2"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Privacy</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="preferences"
                    className="flex items-center gap-2 flex-shrink-0 snap-center whitespace-nowrap px-4 py-2"
                  >
                    <SettingsIcon className="h-4 w-4" />
                    <span>Preferences</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="support"
                    className="flex items-center gap-2 flex-shrink-0 snap-center whitespace-nowrap px-4 py-2"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>Support</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Gradient fade indicators */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
            </div>

            {/* Add CSS to hide scrollbar */}
            <style>{`
              .overflow-x-auto::-webkit-scrollbar {
                display: none;
              }
            `}</style>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-eco-forest-primary" />
                    Account Overview
                  </CardTitle>
                  <CardDescription>Your login details and account activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Account Email</Label>
                      <p className="text-sm font-medium">{profile.email || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Role</Label>
                      <p className="text-sm font-medium capitalize">{userMeta?.role ?? userType}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Last Login</Label>
                      <p className="text-sm font-medium">{formatDateTime(userMeta?.lastLoginAt)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Last Active</Label>
                      <p className="text-sm font-medium">{formatDateTime(userMeta?.lastActiveAt)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Member Since</Label>
                      <p className="text-sm font-medium">{formatDateTime(userMeta?.createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Aadhaar (Last 4)</Label>
                      <p className="text-sm font-medium">{profile.aadhaar ? `****-****-${profile.aadhaar}` : '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        readOnly
                        className="pl-10 h-11 bg-muted"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="aadhaar">Aadhaar (Last 4 digits)</Label>
                      <Input
                        id="aadhaar"
                        value={profile.aadhaar}
                        maxLength={4}
                        placeholder="1234"
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setProfile({ ...profile, aadhaar: digits });
                        }}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={profile.address}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="sector">Assigned Sector / Area</Label>
                      <Input
                        id="sector"
                        value={profile.sector}
                        onChange={(e) => setProfile({ ...profile, sector: e.target.value })}
                        placeholder="e.g., Sector 12, Ward 5"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Tell us about yourself..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button onClick={handleSaveProfile} disabled={isProfileSaving} variant="eco">
                    <Save className="mr-2 h-4 w-4" />
                    {isProfileSaving ? 'Saving...' : 'Save Profile'}
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
                          setNotifications({ ...notifications, emailNotifications: checked })
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
                          setNotifications({ ...notifications, pushNotifications: checked })
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
                          setNotifications({ ...notifications, smsAlerts: checked })
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
                          setNotifications({ ...notifications, weeklyReports: checked })
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
                          setNotifications({ ...notifications, achievementAlerts: checked })
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
                            setNotifications({ ...notifications, maintenanceUpdates: checked })
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
                        onValueChange={(value: "community" | "public" | "private") => setPrivacy({ ...privacy, profileVisibility: value })}
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
                          setPrivacy({ ...privacy, locationSharing: checked })
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
                          setPrivacy({ ...privacy, activityTracking: checked })
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
                          setPrivacy({ ...privacy, dataAnalytics: checked })
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
                        onValueChange={(value) => setPreferences({ ...preferences, language: value })}
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
                        onValueChange={(value) => {
                          setPreferences({ ...preferences, theme: value });
                          // Apply immediately when user changes theme
                          applyTheme(value);
                        }}
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
                        onValueChange={(value) => setPreferences({ ...preferences, currency: value })}
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
                        onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}
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
        {/* Global Logout Button */}
        <div className="max-w-4xl mx-auto mt-6">
          <Card>
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <h3 className="font-medium">Logout</h3>
                <p className="text-sm text-muted-foreground">
                  Sign out of your account from this device
                </p>
              </div>
              <Button onClick={handleLogout} variant="destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;