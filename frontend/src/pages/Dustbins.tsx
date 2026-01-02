import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Navigation as NavigationIcon,
  Calendar,
  Edit,
  MoreHorizontal,
  Eye,
  Activity,
  Camera,
  Upload
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';

interface Dustbin {
  _id: string;
  name: string;
  description?: string;
  sector?: string;
  type: string;
  capacityLiters?: number;
  status: 'active' | 'inactive' | 'maintenance' | 'full';
  fillLevel: number;
  coordinates: { lat: number; lng: number };
  lastEmptiedAt?: string;
  urgent: boolean;
  updatedAt?: string;
}

const Dustbins = () => {
  const navigate = useNavigate();
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const isEmployee = userType === 'employee';
  const { toast } = useToast();

  const [dustbins, setDustbins] = useState<Dustbin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingDustbin, setEditingDustbin] = useState<Dustbin | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [latestDisposal, setLatestDisposal] = useState<Record<string, {
    loading: boolean;
    image: string | null;
    error: string | null;
    submittedAt?: string;
  }>>({});

  const [newDustbin, setNewDustbin] = useState({
    name: '',
    sector: '',
    type: '',
    capacity: '',
    notes: '',
    coordinates: { lat: '' as string | number, lng: '' as string | number }
  });
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [newDustbinPhoto, setNewDustbinPhoto] = useState<string | null>(null);
  const [showAddCamera, setShowAddCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startAddCamera = async () => {
    setShowAddCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      if (videoRef.current) {
        (videoRef.current as HTMLVideoElement).srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          (videoRef.current as HTMLVideoElement).srcObject = stream;
          videoRef.current.play();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const captureAddPhoto = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const img = c.toDataURL('image/png');
    setNewDustbinPhoto(img);
    // stop tracks
    const stream = v.srcObject as MediaStream | null;
    if (stream) stream.getTracks().forEach(t => t.stop());
    setShowAddCamera(false);
  };

  const refreshDustbins = useCallback(async () => {
    try {
      const res = await apiFetch('/dustbins');
      const data = await res.json();
      setDustbins(data);
    } catch (err) {
      const error = err as Error & { status?: number; message?: string };
      console.error(error);
      setError(error.message || 'Failed to load dustbins');
      if (error.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userType');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    refreshDustbins();
  }, [refreshDustbins]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Unavailable",
        description: "Geolocation is not supported on this device.",
        variant: "destructive"
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewDustbin(prev => ({
          ...prev,
          coordinates: {
            lat: pos.coords.latitude.toString(),
            lng: pos.coords.longitude.toString()
          }
        }));
        setManualLat(pos.coords.latitude.toString());
        setManualLng(pos.coords.longitude.toString());
        toast({
          title: "Location Captured",
          description: "GPS coordinates have been captured successfully.",
        });
      },
      () => {
        toast({
          title: "Location Failed",
          description: "Unable to capture your location.",
          variant: "destructive"
        });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  const applyManualCoordinates = () => {
    if (!manualLat || !manualLng) {
      toast({
        title: "Coordinates Required",
        description: "Please enter both latitude and longitude.",
        variant: "destructive",
      });
      return;
    }

    const latNum = Number(manualLat);
    const lngNum = Number(manualLng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      toast({
        title: "Invalid Coordinates",
        description: "Latitude and longitude must be valid numbers.",
        variant: "destructive",
      });
      return;
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      toast({
        title: "Out of Range",
        description: "Latitude must be between -90 and 90, longitude between -180 and 180.",
        variant: "destructive",
      });
      return;
    }

    setNewDustbin(prev => ({
      ...prev,
      coordinates: {
        lat: latNum.toString(),
        lng: lngNum.toString(),
      },
    }));

    toast({
      title: "Coordinates Set",
      description: `Using manual coordinates ${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`,
    });
  };

  const handleAddDustbin = async () => {
    if (!newDustbin.name || !newDustbin.sector || !newDustbin.type || !newDustbin.coordinates.lat || !newDustbin.coordinates.lng || !newDustbinPhoto) {
      toast({
        title: "Missing Information",
        description: "Please fill in required fields, capture location, and upload a photo of the dustbin.",
        variant: "destructive",
      });
      return;
    }

    try {
      const capacityValue = newDustbin.capacity ? Number(newDustbin.capacity) : undefined;
      await apiFetch('/dustbins', {
        method: 'POST',
        body: JSON.stringify({
          name: newDustbin.name,
          description: newDustbin.notes,
          sector: newDustbin.sector,
          type: newDustbin.type,
          capacityLiters: capacityValue,
          status: 'active',
          fillLevel: 0,
          coordinates: {
            lat: Number(newDustbin.coordinates.lat),
            lng: Number(newDustbin.coordinates.lng)
          },
          photoBase64: newDustbinPhoto
        })
      });
      toast({
        title: "Dustbin Added",
        description: "New dustbin location has been registered successfully!",
      });
      setShowAddForm(false);
      setNewDustbin({
        name: '',
        sector: '',
        type: '',
        capacity: '',
        notes: '',
        coordinates: { lat: '', lng: '' }
      });
      setNewDustbinPhoto(null);
      refreshDustbins();
    } catch (err) {
      const error = err as Error & { message?: string };
      console.error(error);
      toast({
        title: "Add Failed",
        description: error.message || 'Unable to add dustbin',
        variant: "destructive"
      });
    }
  };

  const handleStatusUpdate = async (dustbinId: string, updates: Partial<Pick<Dustbin, 'status' | 'fillLevel' | 'urgent' | 'lastEmptiedAt'>>) => {
    try {
      await apiFetch(`/dustbins/${dustbinId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      refreshDustbins();
      toast({
        title: "Dustbin Updated",
        description: "Dustbin information has been updated successfully.",
      });
    } catch (err) {
      const error = err as Error & { message?: string };
      console.error(error);
      toast({
        title: "Update Failed",
        description: error.message || 'Unable to update dustbin',
        variant: "destructive"
      });
    }
  };

  const handleMarkUrgent = async (dustbinId: string) => {
    await handleStatusUpdate(dustbinId, { urgent: true });
    toast({
      title: "Marked Urgent",
      description: "This dustbin has been flagged for immediate attention.",
    });
  };

  const handleViewLocation = async (dustbin: Dustbin) => {
    setLatestDisposal(prev => ({
      ...prev,
      [dustbin._id]: {
        loading: true,
        image: prev[dustbin._id]?.image || null,
        error: null,
        submittedAt: prev[dustbin._id]?.submittedAt,
      },
    }));

    try {
      const res = await apiFetch(`/reports/latest-disposal-image?dustbinId=${dustbin._id}`);
      const data = await res.json();

      setLatestDisposal(prev => ({
        ...prev,
        [dustbin._id]: {
          loading: false,
          image: data?.disposalImageBase64 || null,
          error: null,
          submittedAt: data?.submittedAt,
        },
      }));
    } catch (err) {
      const apiError = err as ApiError;
      const isApiError = apiError instanceof ApiError;
      const isNotFound = isApiError && apiError.status === 404;
      const message = isNotFound
        ? 'No disposal image has been submitted yet for this dustbin.'
        : (apiError?.message || 'Unable to load latest disposal image');

      console.error(apiError);
      setLatestDisposal(prev => ({
        ...prev,
        [dustbin._id]: {
          loading: false,
          image: prev[dustbin._id]?.image || null,
          error: message,
          submittedAt: prev[dustbin._id]?.submittedAt,
        },
      }));

      toast({
        title: dustbin.name,
        description: message,
        variant: isNotFound ? 'default' : 'destructive',
      });
    }
  };

  const filteredDustbins = useMemo(() => {
    return dustbins.filter(dustbin => {
      const matchesSearch = [dustbin.name, dustbin.sector, dustbin._id]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = filterStatus === 'all' || dustbin.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [dustbins, searchTerm, filterStatus]);

  const getStatusBadge = (dustbin: Dustbin) => {
    if (dustbin.urgent) {
      return <Badge variant="destructive">Urgent</Badge>;
    }
    switch (dustbin.status) {
      case 'active':
        return <Badge variant="default" className="bg-eco-success/10 text-eco-success">Active</Badge>;
      case 'maintenance':
        return <Badge variant="secondary" className="bg-eco-warning/10 text-eco-warning">Maintenance</Badge>;
      case 'full':
        return <Badge variant="destructive">Full</Badge>;
      default:
        return <Badge variant="secondary">Inactive</Badge>;
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-destructive';
    if (utilization >= 70) return 'text-eco-warning';
    return 'text-eco-success';
  };

  const avgFill = dustbins.length
    ? Math.round(dustbins.reduce((acc, dustbin) => acc + (dustbin.fillLevel || 0), 0) / dustbins.length)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userType} />
      <main className="lg:ml-64 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-gradient-eco rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">Dustbin Management</h1>
                <p className="text-white/90">Monitor and manage dustbin locations across all sectors</p>
              </div>
              {isEmployee && (
                <Button
                  onClick={() => setShowAddForm(true)}
                  variant="eco"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Dustbin
                </Button>
              )}
            </div>
          </div>

          {error && (
            <Card className="border-destructive">
              <CardContent className="p-4 text-destructive flex items-center gap-3">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-forest-primary/10 rounded-full">
                    <Trash2 className="h-6 w-6 text-eco-forest-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Dustbins</p>
                    <p className="text-2xl font-bold">{loading ? '—' : dustbins.length}</p>
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
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-eco-success">
                      {dustbins.filter(d => d.status === 'active').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-warning/10 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-eco-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Needs Attention</p>
                    <p className="text-2xl font-bold text-eco-warning">
                      {dustbins.filter(d => d.status === 'maintenance' || d.status === 'full' || d.urgent).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-ocean/10 rounded-full">
                    <Activity className="h-6 w-6 text-eco-ocean" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Fill Level</p>
                    <p className="text-2xl font-bold text-eco-ocean">{avgFill}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, sector, or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isEmployee && showEditForm && editingDustbin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-eco-forest-primary" />
                  Edit Dustbin: {editingDustbin.name}
                </CardTitle>
                <CardDescription>
                  Update dustbin information and status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Location Name</Label>
                      <Input
                        id="edit-name"
                        value={editingDustbin.name}
                        onChange={(e) => setEditingDustbin({ ...editingDustbin, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-sector">Sector</Label>
                      <Select 
                        value={editingDustbin.sector || ''} 
                        onValueChange={(value) => setEditingDustbin({ ...editingDustbin, sector: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select sector" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sector-8">Sector 8</SelectItem>
                          <SelectItem value="sector-12">Sector 12</SelectItem>
                          <SelectItem value="sector-15">Sector 15</SelectItem>
                          <SelectItem value="sector-18">Sector 18</SelectItem>
                          <SelectItem value="sector-22">Sector 22</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-type">Waste Type</Label>
                      <Select 
                        value={editingDustbin.type} 
                        onValueChange={(value) => setEditingDustbin({ ...editingDustbin, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select waste type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mixed">Mixed Waste</SelectItem>
                          <SelectItem value="recyclables">Recyclables</SelectItem>
                          <SelectItem value="organic">Organic Waste</SelectItem>
                          <SelectItem value="hazardous">Hazardous Waste</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-status">Status</Label>
                      <Select 
                        value={editingDustbin.status} 
                        onValueChange={(value: 'active' | 'inactive' | 'maintenance') => setEditingDustbin({ ...editingDustbin, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-fillLevel">Fill Level (%)</Label>
                      <Input
                        id="edit-fillLevel"
                        type="number"
                        min={0}
                        max={100}
                        value={editingDustbin.fillLevel}
                        onChange={(e) => setEditingDustbin({ ...editingDustbin, fillLevel: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-capacity">Capacity (L)</Label>
                      <Input
                        id="edit-capacity"
                        type="number"
                        value={editingDustbin.capacityLiters || ''}
                        onChange={(e) => setEditingDustbin({ ...editingDustbin, capacityLiters: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={async () => {
                      try {
                        await apiFetch(`/dustbins/${editingDustbin._id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({
                            name: editingDustbin.name,
                            sector: editingDustbin.sector,
                            type: editingDustbin.type,
                            status: editingDustbin.status,
                            fillLevel: editingDustbin.fillLevel,
                            capacityLiters: editingDustbin.capacityLiters
                          })
                        });
                        toast({
                          title: "Dustbin Updated",
                          description: "Dustbin information has been updated successfully.",
                        });
                        setShowEditForm(false);
                        setEditingDustbin(null);
                        refreshDustbins();
                      } catch (err) {
                        const error = err as Error & { message?: string };
                        toast({
                          title: "Update Failed",
                          description: error.message || 'Unable to update dustbin',
                          variant: "destructive"
                        });
                      }
                    }}
                    variant="eco" 
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingDustbin(null);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isEmployee && showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-eco-forest-primary" />
                  Add New Dustbin Location
                </CardTitle>
                <CardDescription>
                  Register a new dustbin by visiting the location and confirming GPS coordinates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Location Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Main Market Entry"
                        value={newDustbin.name}
                        onChange={(e) => setNewDustbin({ ...newDustbin, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sector">Sector *</Label>
                      <Select value={newDustbin.sector} onValueChange={(value) => setNewDustbin({ ...newDustbin, sector: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sector" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sector-8">Sector 8</SelectItem>
                          <SelectItem value="sector-12">Sector 12</SelectItem>
                          <SelectItem value="sector-15">Sector 15</SelectItem>
                          <SelectItem value="sector-18">Sector 18</SelectItem>
                          <SelectItem value="sector-22">Sector 22</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Waste Type *</Label>
                      <Select value={newDustbin.type} onValueChange={(value) => setNewDustbin({ ...newDustbin, type: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select waste type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mixed">Mixed Waste</SelectItem>
                          <SelectItem value="recyclables">Recyclables</SelectItem>
                          <SelectItem value="organic">Organic Waste</SelectItem>
                          <SelectItem value="hazardous">Hazardous Waste</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Photo *</Label>
                      {!showAddCamera && !newDustbinPhoto && (
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={startAddCamera} className="flex-1">
                            <Camera className="h-4 w-4 mr-2" /> Use Camera
                          </Button>
                          <div className="flex-1">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) { setNewDustbinPhoto(null); return; }
                                const reader = new FileReader();
                                reader.onloadend = () => setNewDustbinPhoto(reader.result as string);
                                reader.readAsDataURL(file);
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="h-4 w-4 mr-2" /> Upload Photo
                            </Button>
                          </div>
                        </div>
                      )}
                      {showAddCamera && (
                        <div className="space-y-2">
                          <video ref={videoRef} width={320} height={192} autoPlay playsInline className="w-full h-40 object-cover rounded bg-black" />
                          <canvas ref={canvasRef} width={320} height={192} className="hidden" />
                          <Button onClick={captureAddPhoto} variant="eco" className="w-full">
                            <Camera className="h-4 w-4 mr-2" /> Capture Photo
                          </Button>
                        </div>
                      )}
                      {newDustbinPhoto && !showAddCamera && (
                        <img src={newDustbinPhoto} alt="Preview" className="mt-2 w-full h-40 object-cover rounded" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity (L)</Label>
                      <Select value={newDustbin.capacity} onValueChange={(value) => setNewDustbin({ ...newDustbin, capacity: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select capacity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="200">200L (Small)</SelectItem>
                          <SelectItem value="350">350L (Medium)</SelectItem>
                          <SelectItem value="500">500L (Large)</SelectItem>
                          <SelectItem value="750">750L (Extra Large)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any additional information about this location..."
                        value={newDustbin.notes}
                        onChange={(e) => setNewDustbin({ ...newDustbin, notes: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Coordinates *</Label>
                      <div className="text-sm text-muted-foreground">
                        {newDustbin.coordinates.lat && newDustbin.coordinates.lng
                          ? `${newDustbin.coordinates.lat}, ${newDustbin.coordinates.lng}`
                          : 'Capture GPS coordinates below'}
                      </div>
                      <Button
                        onClick={getCurrentLocation}
                        variant="outline"
                        className="w-full"
                      >
                        <NavigationIcon className="mr-2 h-4 w-4" />
                        Capture GPS Location
                      </Button>
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground">Or enter coordinates manually:</p>
                        <div className="flex gap-2">
                          <div className="flex-1 space-y-1">
                            <Label htmlFor="manual-lat" className="text-xs">Latitude</Label>
                            <Input
                              id="manual-lat"
                              type="number"
                              step="any"
                              placeholder="e.g. 19.0760"
                              value={manualLat}
                              onChange={(e) => setManualLat(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label htmlFor="manual-lng" className="text-xs">Longitude</Label>
                            <Input
                              id="manual-lng"
                              type="number"
                              step="any"
                              placeholder="e.g. 72.8777"
                              value={manualLng}
                              onChange={(e) => setManualLng(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs self-start"
                          onClick={applyManualCoordinates}
                          disabled={!manualLat || !manualLng}
                        >
                          Use Manual Coordinates
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddDustbin} variant="eco" className="flex-1">
                    Add Dustbin
                  </Button>
                  <Button
                    onClick={() => setShowAddForm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-eco-forest-primary" />
                Registered Dustbins ({filteredDustbins.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading dustbins...</p>
              ) : filteredDustbins.length === 0 ? (
                <p className="text-sm text-muted-foreground">No dustbins match your filters.</p>
              ) : (
                <div className="space-y-4">
                  {filteredDustbins.map((dustbin) => (
                    <div key={dustbin._id} className="p-6 bg-muted/50 rounded-lg space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-lg">{dustbin.name}</h3>
                            {getStatusBadge(dustbin)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{dustbin.sector || 'Not set'}</span>
                            </div>
                            <span>•</span>
                            <span className="capitalize">{dustbin.type}</span>
                            {dustbin.capacityLiters ? (
                              <>
                                <span>•</span>
                                <span>{dustbin.capacityLiters} L</span>
                              </>
                            ) : null}
                            <span>•</span>
                            <span>ID: {dustbin._id.slice(-6)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleViewLocation(dustbin)}
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {isEmployee && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingDustbin(dustbin);
                                setShowEditForm(true);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>

                      {latestDisposal[dustbin._id]?.loading && (
                        <p className="text-xs text-muted-foreground mt-2">Loading latest disposal image...</p>
                      )}
                      {latestDisposal[dustbin._id]?.error && !latestDisposal[dustbin._id]?.loading && (
                        <p className="text-xs text-destructive mt-2">{latestDisposal[dustbin._id]?.error}</p>
                      )}
                      {latestDisposal[dustbin._id]?.image && !latestDisposal[dustbin._id]?.loading && (
                        <div className="mt-4 space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Most recent disposal image
                            {latestDisposal[dustbin._id]?.submittedAt && (
                              <>
                                {' '}
                                • {new Date(latestDisposal[dustbin._id]!.submittedAt as string).toLocaleString()}
                              </>
                            )}
                          </p>
                          <img
                            src={(() => {
                              const img = latestDisposal[dustbin._id]!.image as string;
                              return img.startsWith('data:image') ? img : `data:image/png;base64,${img}`;
                            })()}
                            alt="Latest disposal"
                            className="w-full max-h-64 object-cover rounded border"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Utilization</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  dustbin.fillLevel >= 90 ? 'bg-destructive' :
                                  dustbin.fillLevel >= 70 ? 'bg-eco-warning' : 'bg-eco-success'
                                }`}
                                style={{ width: `${Math.min(dustbin.fillLevel, 100)}%` }}
                              />
                            </div>
                            <span className={`text-sm font-medium ${getUtilizationColor(dustbin.fillLevel)}`}>
                              {dustbin.fillLevel}%
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Last Emptied</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{dustbin.lastEmptiedAt ? new Date(dustbin.lastEmptiedAt).toLocaleDateString() : 'Not recorded'}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Coordinates</p>
                          <div className="text-sm text-muted-foreground">
                            {dustbin.coordinates.lat.toFixed(6)}, {dustbin.coordinates.lng.toFixed(6)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {isEmployee && (
                          <>
                            <Button
                              onClick={() => handleStatusUpdate(dustbin._id, { status: 'maintenance' })}
                              variant="outline"
                              size="sm"
                              disabled={dustbin.status === 'maintenance'}
                            >
                              Mark for Maintenance
                            </Button>
                            <Button
                              onClick={() => handleStatusUpdate(dustbin._id, { status: 'active', urgent: false })}
                              variant="outline"
                              size="sm"
                              disabled={dustbin.status === 'active' && !dustbin.urgent}
                            >
                              Mark as Active
                            </Button>
                            <Button
                              onClick={() => handleStatusUpdate(dustbin._id, { status: 'full' })}
                              variant="outline"
                              size="sm"
                              disabled={dustbin.status === 'full'}
                            >
                              Mark as Full
                            </Button>
                          </>
                        )}

                        {userType === 'collector' && (
                          <Button
                            onClick={() => handleMarkUrgent(dustbin._id)}
                            variant="destructive"
                            size="sm"
                            disabled={dustbin.urgent || dustbin.fillLevel < 100}
                          >
                            Flag as Urgent Emptying
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dustbins;