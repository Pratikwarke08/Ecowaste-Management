import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/layout/Navigation';
import UnifiedMap from '@/components/map/UnifiedMap';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dustbin } from '@/components/map/DustbinMap';
import { Incident } from '@/components/map/IncidentMap';
import { getReliableLocation } from '@/lib/location';

export default function MapPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dustbins, setDustbins] = useState<Dustbin[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [deploymentMode, setDeploymentMode] = useState(false);
  const [userRole, setUserRole] = useState<'collector' | 'employee' | null>(null);
  const [mapFilter, setMapFilter] = useState<'all' | 'dustbins' | 'incidents'>('all');

  const [selectedDustbin, setSelectedDustbin] = useState<Dustbin | null>(null);
  const [currentDustbinImage, setCurrentDustbinImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    // Get user role from local storage or context
    const storedRole = localStorage.getItem('userType') as 'collector' | 'employee' | null;

    // Redirect collectors to dashboard
    if (storedRole === 'collector') {
      navigate('/dashboard');
      return;
    }

    setUserRole(storedRole);

    const loadData = async () => {
      try {
        setLoading(true);
        const [binsRes, incidentsRes] = await Promise.all([
          apiFetch('/dustbins'),
          apiFetch('/incidents')
        ]);

        if (binsRes.ok) {
          const bins = await binsRes.json();
          setDustbins(Array.isArray(bins) ? bins : []);
        }

        if (incidentsRes.ok) {
          const incs = await incidentsRes.json();
          setIncidents(Array.isArray(incs) ? incs : []);
        }

        // Get user location
        try {
          const loc = await getReliableLocation();
          setUserLocation(loc);
        } catch (e) {
          console.warn("Could not get user location", e);
        }

      } catch (err) {
        console.error("Failed to load map data", err);
        toast({
          title: "Error",
          description: "Failed to load map data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const handleMapClick = (lat: number, lng: number) => {
    if (deploymentMode) {
      // Navigate to Add Dustbin page with coordinates
      navigate(`/add-dustbin?lat=${lat}&lng=${lng}`);
    }
  };

  const handleDustbinSelect = async (bin: Dustbin | null) => {
    if (!bin || deploymentMode) return;

    setSelectedDustbin(bin);
    setCurrentDustbinImage(null);

    try {
      setImageLoading(true);

      const res = await apiFetch(
        `/reports/latest-disposal-image?dustbinId=${bin._id}`
      );

      if (res.ok) {
        const data = await res.json();
        if (data?.disposalImageBase64) {
          setCurrentDustbinImage(data.disposalImageBase64);
          return;
        }
      }

      // Fallback to initial deployment image
      setCurrentDustbinImage((bin as any)?.photoBase64 || null);

    } catch (e) {
      console.error("Failed to load dustbin image", e);
      setCurrentDustbinImage((bin as any)?.photoBase64 || null);
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 lg:pl-64">
      <Navigation userRole={userRole || 'collector'} />

      <div className="h-[calc(100vh-80px)] lg:h-screen w-full relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <UnifiedMap
            userLocation={userLocation}
            dustbins={mapFilter === 'incidents' ? [] : dustbins}
            incidents={mapFilter === 'dustbins' ? [] : incidents}
            onMapClick={handleMapClick}
            onDustbinSelect={handleDustbinSelect}
            deploymentMode={deploymentMode}
            userRole={userRole}
          />
        )}

        {/* Filter Controls */}
        <div className="absolute top-4 right-4 z-[1000] w-40">
          <Select value={mapFilter} onValueChange={(v: any) => setMapFilter(v)}>
            <SelectTrigger className="w-full bg-background/95 backdrop-blur shadow-md">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter Map" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Show All</SelectItem>
              <SelectItem value="dustbins">Dustbins Only</SelectItem>
              <SelectItem value="incidents">Incidents Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Floating Action Button for Deployment Mode */}
        <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-4">
          <Button
            size="lg"
            variant={deploymentMode ? "destructive" : "default"}
            className={`rounded-full shadow-lg h-14 w-14 p-0 ${deploymentMode ? 'animate-pulse' : ''}`}
            onClick={() => setDeploymentMode(!deploymentMode)}
          >
            <Plus className={`h-6 w-6 transition-transform ${deploymentMode ? 'rotate-45' : ''}`} />
          </Button>
          {deploymentMode && (
            <div className="absolute right-16 bottom-2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {deploymentMode ? "Cancel Placement" : "Add Dustbin"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
