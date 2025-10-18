import { useState } from 'react';
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
  Eye
} from 'lucide-react';

const Dustbins = () => {
  const navigate = useNavigate();
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const { toast } = useToast();

  const [newDustbin, setNewDustbin] = useState({
    location: '',
    sector: '',
    type: '',
    capacity: '',
    notes: ''
  });

  const dustbins = [
    {
      id: 'DB001',
      location: 'Main Market Entry',
      sector: 'Sector 12',
      type: 'Mixed Waste',
      capacity: '500L',
      status: 'active',
      lastEmptied: '2024-01-06',
      coordinates: { lat: 12.9716, lng: 77.5946 },
      installDate: '2023-12-01',
      utilization: 78
    },
    {
      id: 'DB002',
      location: 'Community Center',
      sector: 'Sector 15',
      type: 'Recyclables',
      capacity: '300L',
      status: 'maintenance',
      lastEmptied: '2024-01-05',
      coordinates: { lat: 12.9720, lng: 77.5950 },
      installDate: '2023-11-15',
      utilization: 65
    },
    {
      id: 'DB003',
      location: 'School Campus',
      sector: 'Sector 8',
      type: 'Organic Waste',
      capacity: '400L',
      status: 'active',
      lastEmptied: '2024-01-06',
      coordinates: { lat: 12.9714, lng: 77.5942 },
      installDate: '2023-12-10',
      utilization: 92
    },
    {
      id: 'DB004',
      location: 'Bus Stand',
      sector: 'Sector 18',
      type: 'Mixed Waste',
      capacity: '600L',
      status: 'full',
      lastEmptied: '2024-01-04',
      coordinates: { lat: 12.9718, lng: 77.5948 },
      installDate: '2023-10-20',
      utilization: 98
    },
    {
      id: 'DB005',
      location: 'Park Entrance',
      sector: 'Sector 22',
      type: 'Recyclables',
      capacity: '350L',
      status: 'active',
      lastEmptied: '2024-01-06',
      coordinates: { lat: 12.9712, lng: 77.5944 },
      installDate: '2023-11-30',
      utilization: 45
    },
  ];

  const filteredDustbins = dustbins.filter(dustbin => {
    const matchesSearch = dustbin.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dustbin.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dustbin.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || dustbin.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-eco-success';
      case 'maintenance':
        return 'text-eco-warning';
      case 'full':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-eco-success/10 text-eco-success">Active</Badge>;
      case 'maintenance':
        return <Badge variant="secondary" className="bg-eco-warning/10 text-eco-warning">Maintenance</Badge>;
      case 'full':
        return <Badge variant="destructive">Full</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-destructive';
    if (utilization >= 70) return 'text-eco-warning';
    return 'text-eco-success';
  };

  const getCurrentLocation = () => {
    // Simulate GPS capture
    toast({
      title: "Location Captured",
      description: "GPS coordinates have been captured successfully.",
    });
  };

  const handleAddDustbin = () => {
    if (!newDustbin.location || !newDustbin.sector || !newDustbin.type) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Dustbin Added",
      description: "New dustbin location has been registered successfully!",
    });
    
    setNewDustbin({
      location: '',
      sector: '',
      type: '',
      capacity: '',
      notes: ''
    });
    setShowAddForm(false);
  };

  const handleStatusUpdate = (dustbinId: string, newStatus: string) => {
    toast({
      title: "Status Updated",
      description: `Dustbin ${dustbinId} status changed to ${newStatus}.`,
    });
  };

  const handleViewLocation = (dustbin: any) => {
    setSelectedLocation(dustbin);
    toast({
      title: "Location Viewed",
      description: `Viewing location for ${dustbin.location}`,
    });
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
                <h1 className="text-2xl font-bold mb-2">Dustbin Management</h1>
                <p className="text-white/90">Monitor and manage dustbin locations across all sectors</p>
              </div>
              <Button 
                onClick={() => navigate('/add-dustbin')}
                variant="eco"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Dustbin
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-forest-primary/10 rounded-full">
                    <Trash2 className="h-6 w-6 text-eco-forest-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Dustbins</p>
                    <p className="text-2xl font-bold">{dustbins.length}</p>
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
                    <p className="text-sm text-muted-foreground">Need Attention</p>
                    <p className="text-2xl font-bold text-eco-warning">
                      {dustbins.filter(d => d.status === 'maintenance' || d.status === 'full').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-ocean/10 rounded-full">
                    <MapPin className="h-6 w-6 text-eco-ocean" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Utilization</p>
                    <p className="text-2xl font-bold text-eco-ocean">
                      {Math.round(dustbins.reduce((acc, d) => acc + d.utilization, 0) / dustbins.length)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by location, sector, or ID..."
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
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Add New Dustbin Form */}
          {showAddForm && (
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
                      <Label htmlFor="location">Location Name *</Label>
                      <Input
                        id="location"
                        placeholder="e.g., Main Market Entry"
                        value={newDustbin.location}
                        onChange={(e) => setNewDustbin({...newDustbin, location: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="sector">Sector *</Label>
                      <Select value={newDustbin.sector} onValueChange={(value) => setNewDustbin({...newDustbin, sector: value})}>
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
                      <Select value={newDustbin.type} onValueChange={(value) => setNewDustbin({...newDustbin, type: value})}>
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
                      <Label htmlFor="capacity">Capacity</Label>
                      <Select value={newDustbin.capacity} onValueChange={(value) => setNewDustbin({...newDustbin, capacity: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select capacity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="200L">200L (Small)</SelectItem>
                          <SelectItem value="350L">350L (Medium)</SelectItem>
                          <SelectItem value="500L">500L (Large)</SelectItem>
                          <SelectItem value="750L">750L (Extra Large)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any additional information about this location..."
                        value={newDustbin.notes}
                        onChange={(e) => setNewDustbin({...newDustbin, notes: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <Button 
                      onClick={getCurrentLocation}
                      variant="outline" 
                      className="w-full"
                    >
                      <NavigationIcon className="mr-2 h-4 w-4" />
                      Capture GPS Location
                    </Button>
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

          {/* Dustbins List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-eco-forest-primary" />
                Registered Dustbins ({filteredDustbins.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredDustbins.map((dustbin) => (
                  <div key={dustbin.id} className="p-6 bg-muted/50 rounded-lg space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-lg">{dustbin.location}</h3>
                          {getStatusBadge(dustbin.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{dustbin.sector}</span>
                          </div>
                          <span>•</span>
                          <span>{dustbin.type}</span>
                          <span>•</span>
                          <span>{dustbin.capacity}</span>
                          <span>•</span>
                          <span>ID: {dustbin.id}</span>
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
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Utilization</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                dustbin.utilization >= 90 ? 'bg-destructive' :
                                dustbin.utilization >= 70 ? 'bg-eco-warning' : 'bg-eco-success'
                              }`}
                              style={{ width: `${dustbin.utilization}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${getUtilizationColor(dustbin.utilization)}`}>
                            {dustbin.utilization}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Last Emptied</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(dustbin.lastEmptied).toLocaleDateString()}</span>
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
                      <Button 
                        onClick={() => handleStatusUpdate(dustbin.id, 'maintenance')}
                        variant="outline" 
                        size="sm"
                        disabled={dustbin.status === 'maintenance'}
                      >
                        Mark for Maintenance
                      </Button>
                      <Button 
                        onClick={() => handleStatusUpdate(dustbin.id, 'active')}
                        variant="outline" 
                        size="sm"
                        disabled={dustbin.status === 'active'}
                      >
                        Mark as Active
                      </Button>
                      <Button 
                        onClick={() => handleStatusUpdate(dustbin.id, 'full')}
                        variant="outline" 
                        size="sm"
                        disabled={dustbin.status === 'full'}
                      >
                        Mark as Full
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dustbins;