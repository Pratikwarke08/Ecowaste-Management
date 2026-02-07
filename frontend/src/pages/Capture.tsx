import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navigation from '@/components/layout/Navigation';
import { apiFetch } from '@/lib/api';
import { getReliableLocation } from '@/lib/location';
import DustbinMap, { Dustbin } from '@/components/map/DustbinMap';
import {
  Camera,
  MapPin,
  CheckCircle,
  AlertCircle,
  Upload,
  Trash2,
  Recycle,
  Navigation as NavIcon,
  X,
  Maximize2,
  ZoomIn,
  Map as MapIcon
} from 'lucide-react';

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const Capture = () => {
  const [step, setStep] = useState<'pickup' | 'disposal' | 'verify'>('pickup');
  const [pickupImage, setPickupImage] = useState<string | null>(null);
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [disposalImage, setDisposalImage] = useState<string | null>(null);
  const [disposalLocation, setDisposalLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showCamera, setShowCamera] = useState<'pickup' | 'disposal' | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDustbin, setSelectedDustbin] = useState<Dustbin | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [activeDustbins, setActiveDustbins] = useState<Dustbin[]>([]);
  const [loadingBins, setLoadingBins] = useState(false);
  const [materialType, setMaterialType] = useState('');
  const [wasteQuantityDescription, setWasteQuantityDescription] = useState('');
  const [manualPickupImage, setManualPickupImage] = useState<string | null>(null);
  const [manualDisposalImage, setManualDisposalImage] = useState<string | null>(null);
  const [manualPickupLat, setManualPickupLat] = useState('');
  const [manualPickupLng, setManualPickupLng] = useState('');
  const [manualDisposalLat, setManualDisposalLat] = useState('');
  const [manualDisposalLng, setManualDisposalLng] = useState('');
  const [manualMaterialType, setManualMaterialType] = useState('');
  const [manualWasteQuantityDescription, setManualWasteQuantityDescription] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);

  // Track user location in real-time
  useEffect(() => {
    let watchId: number;
    if (isTracking && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => { },
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking]);

  const locateUserOnMap = async () => {
    try {
      const coords = await getReliableLocation();
      setUserLocation(coords);
      setIsTracking(true);
    } catch (e) {
      const message = (e as Error)?.message || 'Unable to get your current location. Please check GPS and permissions.';
      alert(message);
    }
  };

  // Load dustbins from backend when map is opened
  useEffect(() => {
    const load = async () => {
      if (!showMap) return;
      try {
        setLoadingBins(true);
        const res = await apiFetch('/dustbins?status=all');
        const bins = await res.json();
        // Include all dustbins; backend already tags them with status.
        // Map component will render whatever is provided.
        setActiveDustbins(Array.isArray(bins) ? bins : []);
      } catch {
        setActiveDustbins([]);
      } finally {
        setLoadingBins(false);
      }
    };
    load();
  }, [showMap]);

  // ML integration removed; manual verification flow only

  const startCamera = async (type: 'pickup' | 'disposal') => {
    setShowCamera(type);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: "environment" }, width: 1280, height: 720 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }
    }
  };

  const capturePhoto = (type: 'pickup' | 'disposal') => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = 640;
    canvasRef.current.height = 480;
    context.drawImage(videoRef.current, 0, 0, 640, 480);
    const imageData = canvasRef.current.toDataURL('image/png');

    const stream = videoRef.current.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(null);

    // Only capture image here. GPS is fetched explicitly via Get GPS button
    // to enforce: photo first, then compulsory location.
    if (type === 'pickup') {
      setPickupImage(imageData);
    } else {
      setDisposalImage(imageData);
    }
  };

  const getCurrentLocation = async (type: 'pickup' | 'disposal') => {
    try {
      const coords = await getReliableLocation();

      if (type === 'pickup') {
        setPickupLocation(coords);
        setUserLocation(coords);

        if (!pickupImage) {
          alert('Please capture the pickup photo before recording GPS location.');
          return;
        }
        setStep('disposal');
      } else {
        if (!selectedDustbin) {
          alert('Please choose the dustbin where you disposed the waste before proceeding.');
          return;
        }

        const dist = getDistanceFromLatLonInMeters(
          coords.lat,
          coords.lng,
          selectedDustbin.coordinates.lat,
          selectedDustbin.coordinates.lng
        );

        setDisposalLocation(coords);
        setUserLocation(coords);

        if (!disposalImage) {
          alert('Please capture the disposal photo before recording GPS location.');
          return;
        }

        setStep('verify');
      }
    } catch (e) {
      const message = (e as Error)?.message || 'Unable to fetch GPS coordinates. Please check GPS and permissions.';
      alert(message);
    }
  };

  const submitReport = async () => {
    try {
      if (!pickupImage || !pickupLocation || !disposalImage || !disposalLocation) {
        alert('Please capture both photos and locations before submitting.');
        return;
      }
      if (!selectedDustbin) {
        alert('Please select the dustbin where you disposed the waste before submitting.');
        return;
      }
      const combinedMaterial = [materialType, wasteQuantityDescription]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' | ');
      const res = await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({
          pickupImageBase64: pickupImage.replace(/^data:image\/\w+;base64,/, ''),
          pickupLocation,
          disposalImageBase64: disposalImage.replace(/^data:image\/\w+;base64,/, ''),
          disposalLocation,
          dustbinId: selectedDustbin._id,
          materialType: combinedMaterial || undefined,
        })
      });
      const data = await res.json();
      alert(`🎉 Waste collection report submitted successfully! Awaiting manual verification.`);
      setStep('pickup');
      setPickupImage(null);
      setPickupLocation(null);
      setDisposalImage(null);
      setDisposalLocation(null);
      setSelectedDustbin(null);
      setMaterialType('');
      setWasteQuantityDescription('');
    } catch (e: unknown) {
      const errorMessage = (e as Error)?.message || 'Upload failed. Please try again.';
      alert(errorMessage);
    }
  };

  const submitManualTestReport = async () => {
    try {
      if (!manualPickupImage || !manualDisposalImage) {
        alert('Please select both pickup and disposal images for manual testing.');
        return;
      }
      if (!manualPickupLat || !manualPickupLng || !manualDisposalLat || !manualDisposalLng) {
        alert('Please enter pickup and disposal latitude/longitude values.');
        return;
      }

      const pickupLat = parseFloat(manualPickupLat);
      const pickupLng = parseFloat(manualPickupLng);
      const disposalLat = parseFloat(manualDisposalLat);
      const disposalLng = parseFloat(manualDisposalLng);

      if (Number.isNaN(pickupLat) || Number.isNaN(pickupLng) || Number.isNaN(disposalLat) || Number.isNaN(disposalLng)) {
        alert('Coordinates must be valid numbers.');
        return;
      }

      const combinedManualMaterial = [manualMaterialType, manualWasteQuantityDescription]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' | ');

      setManualSubmitting(true);
      await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({
          pickupImageBase64: manualPickupImage.replace(/^data:image\/\w+;base64,/, ''),
          pickupLocation: { lat: pickupLat, lng: pickupLng },
          disposalImageBase64: manualDisposalImage.replace(/^data:image\/\w+;base64,/, ''),
          disposalLocation: { lat: disposalLat, lng: disposalLng },
          dustbinId: selectedDustbin?._id,
          materialType: combinedManualMaterial || undefined,
        }),
      });

      alert('✅ Test report submitted successfully (manual input).');
      setManualPickupImage(null);
      setManualDisposalImage(null);
      setManualPickupLat('');
      setManualPickupLng('');
      setManualDisposalLat('');
      setManualDisposalLng('');
      setManualMaterialType('');
      setManualWasteQuantityDescription('');
    } catch (e: unknown) {
      const errorMessage = (e as Error)?.message || 'Manual upload failed. Please try again.';
      alert(errorMessage);
    } finally {
      setManualSubmitting(false);
    }
  };

  const findNearestDustbin = (location: { lat: number; lng: number }) => {
    if (!activeDustbins.length) return null;
    let nearest = activeDustbins[0];
    let minDist = getDistanceFromLatLonInMeters(location.lat, location.lng, nearest.coordinates.lat, nearest.coordinates.lng);

    activeDustbins.forEach(bin => {
      const dist = getDistanceFromLatLonInMeters(location.lat, location.lng, bin.coordinates.lat, bin.coordinates.lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = bin;
      }
    });
    return { bin: nearest, distance: minDist };
  };

  let nearestDustbin = null as null | { bin: Dustbin; distance: number };
  if (disposalLocation) {
    nearestDustbin = findNearestDustbin(disposalLocation) as { bin: Dustbin; distance: number } | null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Sidebar */}
      <Navigation userRole={userType} />

      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="">
            <div className="flex items-center gap-3">

            </div>
            <Button
              variant="outline"
              onClick={() => {
                setShowMap(true);
                setIsTracking(true);
              }}
              className="gap-2"
            >
              <MapIcon className="h-4 w-4" />
              View Map
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:ml-64">
        <div className="space-y-6">
          {/* Progress Steps */}
          <Card className="bg-card border border-border shadow-lg">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
                <div className={`flex items-center gap-3 transition-all ${step === 'pickup' ? 'md:scale-110' : ''}`}>
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all ${step === 'pickup' ? 'border-green-600 bg-green-50 shadow-lg' :
                    pickupImage ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'
                    }`}>
                    {pickupImage ? <CheckCircle className="h-6 w-6" /> : <Trash2 className="h-6 w-6" />}
                  </div>
                  <div>
                    <span className="font-semibold block">Pickup</span>
                    <span className="text-xs text-gray-500">Capture waste</span>
                  </div>
                </div>

                <div className={`hidden md:block h-1 flex-1 mx-4 rounded-full transition-all ${pickupImage ? 'bg-green-600' : 'bg-gray-200'}`} />

                <div className={`flex items-center gap-3 w-full md:w-auto transition-all ${step === 'disposal' ? 'scale-110' : ''}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${step === 'disposal' ? 'border-blue-600 bg-blue-50 shadow-lg' :
                    step === 'verify' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                    }`}>
                    {disposalImage ? <CheckCircle className="h-6 w-6" /> : <Recycle className="h-6 w-6" />}
                  </div>
                  <div>
                    <span className="font-semibold block">Disposal</span>
                    <span className="text-xs text-gray-500">At dustbin</span>
                  </div>
                </div>

                <div className={`hidden md:block h-1 flex-1 mx-4 rounded-full transition-all ${disposalImage ? 'bg-blue-600' : 'bg-gray-200'}`} />

                <div className={`flex items-center gap-3 w-full md:w-auto transition-all ${step === 'verify' ? 'scale-110' : ''}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${step === 'verify' ? 'border-purple-600 bg-purple-50 shadow-lg' : 'border-gray-300'
                    }`}>
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold block text-sm md:text-base"></span>
                    <span className="text-xs text-gray-500">Submit report</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pickup Step */}
          {step === 'pickup' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              <Card className="bg-card border border-border shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Trash2 className="h-6 w-6" />
                    Capture Waste Pickup
                  </CardTitle>
                  <CardDescription>Document the waste at its original location</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showCamera ? (
                    <div className="space-y-4">
                      {pickupImage ? (
                        <div className="relative group cursor-pointer" onClick={() => setExpandedImage(pickupImage)}>
                          <img src={pickupImage} alt="Pickup" className="w-full h-80 object-cover rounded-lg shadow-lg transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <Maximize2 className="h-12 w-12 text-white" />
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => startCamera('pickup')}
                          className="w-full h-64 bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-xl text-white"
                          size="lg"
                        >
                          <div className="text-center">
                            <Camera className="h-16 w-16 mx-auto mb-4 animate-pulse" />
                            <p className="text-xl font-bold mb-2">Take Pickup Photo</p>
                            <p className="text-sm opacity-90">Tap to activate camera</p>
                          </div>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative">
                        <video
                          ref={videoRef}
                          className="w-full h-80 object-cover rounded-lg shadow-lg"
                          autoPlay
                        />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => capturePhoto('pickup')}
                          className="flex-1 bg-green-600 hover:bg-green-700 h-14 text-lg"
                          size="lg"
                        >
                          <Camera className="mr-2 h-5 w-5" />
                          Capture Now
                        </Button>
                        <Button
                          onClick={() => {
                            const stream = videoRef.current?.srcObject as MediaStream;
                            stream?.getTracks().forEach(track => track.stop());
                            setShowCamera(null);
                          }}
                          variant="outline"
                          size="lg"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => getCurrentLocation('pickup')}
                    variant="outline"
                    className="w-full h-14 border-2 border-green-600 text-green-700 hover:bg-green-50"
                    size="lg"
                  >
                    <NavIcon className="mr-2 h-5 w-5" />
                    Get GPS Location
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="bg-card border border-border shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      Location Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground">Latitude:</span>
                        <span className="font-mono">{pickupLocation?.lat.toFixed(6) ?? 'Not captured'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground">Longitude:</span>
                        <span className="font-mono">{pickupLocation?.lng.toFixed(6) ?? 'Not captured'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Alert className="bg-muted border border-border">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-foreground">
                    <strong>Pro Tips:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>✓ Ensure good lighting for clear photos</li>
                      <li>✓ Include surrounding context in frame</li>
                      <li>✓ Make waste clearly visible</li>
                      <li>✓ Enable location services for accuracy</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Disposal Step */}
          {step === 'disposal' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <Recycle className="h-6 w-6" />
                    Capture Waste Disposal
                  </CardTitle>
                  <CardDescription>Document proper disposal at dustbin</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showCamera ? (
                    <div className="space-y-4">
                      {disposalImage ? (
                        <div className="relative group cursor-pointer" onClick={() => setExpandedImage(disposalImage)}>
                          <img src={disposalImage} alt="Disposal" className="w-full h-80 object-cover rounded-lg shadow-lg transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <Maximize2 className="h-12 w-12 text-white" />
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => startCamera('disposal')}
                          className="w-full h-64 bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-xl"
                          size="lg"
                        >
                          <div className="text-center">
                            <Camera className="h-16 w-16 mx-auto mb-4 animate-pulse" />
                            <p className="text-xl font-bold mb-2">Take Disposal Photo</p>
                            <p className="text-sm opacity-90">Include dustbin in frame</p>
                          </div>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative">
                        <video
                          ref={videoRef}
                          className="w-full h-80 object-cover rounded-lg shadow-lg"
                          autoPlay
                        />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => capturePhoto('disposal')}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 h-14 text-lg"
                          size="lg"
                        >
                          <Camera className="mr-2 h-5 w-5" />
                          Capture Now
                        </Button>
                        <Button
                          onClick={() => {
                            const stream = videoRef.current?.srcObject as MediaStream;
                            stream?.getTracks().forEach(track => track.stop());
                            setShowCamera(null);
                          }}
                          variant="outline"
                          size="lg"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => getCurrentLocation('disposal')}
                    variant="outline"
                    className="w-full h-14 border-2 border-blue-600 text-blue-700 hover:bg-blue-50"
                    size="lg"
                  >
                    <NavIcon className="mr-2 h-5 w-5" />
                    Get GPS Location
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-6">
                {pickupImage && (
                  <Card className="bg-card border border-border shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Pickup Captured
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative group cursor-pointer" onClick={() => setExpandedImage(pickupImage)}>
                        <img src={pickupImage} alt="Pickup" className="w-full h-40 object-cover rounded-lg shadow-md transition-transform group-hover:scale-105" />
                        <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
                          ✓ Verified
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-card border border-border shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      Dustbin & Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Selected dustbin</p>
                          <p className="font-semibold text-sm">
                            {selectedDustbin ? selectedDustbin.name : 'No dustbin selected'}
                          </p>
                          {selectedDustbin && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {selectedDustbin.sector || 'Sector not set'} • {selectedDustbin.type || 'Mixed'}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowMap(true);
                            setIsTracking(true);
                          }}
                        >
                          Choose Dustbin
                        </Button>
                      </div>
                    </div>

                    {nearestDustbin && (
                      <div className={`p-4 rounded-lg ${nearestDustbin.distance < 50 ? 'bg-green-50 border border-green-200' : 'bg-muted border border-border'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">Nearest bin: {nearestDustbin.bin.name}</span>
                          <Badge variant={nearestDustbin.distance < 50 ? 'default' : 'secondary'}>
                            {nearestDustbin.distance.toFixed(0)}m away
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Type: {nearestDustbin.bin.type}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Verify Step */}
          {step === 'verify' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              <Card className="lg:col-span-2 bg-card border border-border shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <CheckCircle className="h-6 w-6" />
                    Review & Submit
                  </CardTitle>
                  <CardDescription>Verify all captured information before submission</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    {pickupImage && (
                      <div>
                        <p className="font-semibold mb-2 text-green-700">📍 Pickup Location</p>
                        <div className="relative group cursor-pointer" onClick={() => setExpandedImage(pickupImage)}>
                          <img src={pickupImage} alt="Pickup" className="w-full h-64 object-cover rounded-lg shadow-lg transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <ZoomIn className="h-12 w-12 text-white" />
                          </div>
                        </div>
                        <div className="mt-2 text-xs bg-muted p-2 rounded">
                          <p>Lat: {pickupLocation?.lat?.toFixed(6)}</p>
                          <p>Lng: {pickupLocation?.lng?.toFixed(6)}</p>
                        </div>
                      </div>
                    )}
                    {disposalImage && (
                      <div>
                        <p className="font-semibold mb-2 text-blue-700">🗑️ Disposal Location</p>
                        <div className="relative group cursor-pointer" onClick={() => setExpandedImage(disposalImage)}>
                          <img src={disposalImage} alt="Disposal" className="w-full h-64 object-cover rounded-lg shadow-lg transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <ZoomIn className="h-12 w-12 text-white" />
                          </div>
                        </div>
                        <div className="mt-2 text-xs bg-muted p-2 rounded">
                          <p>Lat: {disposalLocation?.lat?.toFixed(6)}</p>
                          <p>Lng: {disposalLocation?.lng?.toFixed(6)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="bg-card border border-border shadow-md">
                  <CardHeader>
                    <CardTitle className="text-sm">Waste Details</CardTitle>
                    <CardDescription className="text-xs">
                      Optional description of each waste type and how much (e.g. counts, bags, or weight).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <p>Waste types</p>
                      <textarea
                        className="w-full border rounded px-2 py-1 text-xs min-h-[60px]"
                        placeholder="e.g. Plastic bottles, paper cups, food scraps"
                        value={materialType}
                        onChange={(e) => setMaterialType(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <p>Quantities (any format)</p>
                      <input
                        type="text"
                        className="w-full border rounded px-2 py-1 text-xs"
                        placeholder="e.g. 3 bottles, 2 bags, ~0.5 kg"
                        value={wasteQuantityDescription}
                        onChange={(e) => setWasteQuantityDescription(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={submitReport}
                  className="w-full h-16 text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-xl"
                  size="lg"
                >
                  <Upload className="mr-2 h-6 w-6" />
                  Submit Report
                </Button>
              </div>
            </div>
          )}

          {/* TESTING ONLY: Manual input section (not for production) */}
          <Card className="mt-8 border-dashed border-amber-400 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                <AlertCircle className="h-4 w-4" />
                Testing Only – Manual Input (Not for Production)
              </CardTitle>
              <CardDescription className="text-xs">
                Use this section only for local testing. It lets you upload images and type coordinates manually while keeping the main capture flow unchanged.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="font-semibold text-xs">Pickup (Manual)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) { setManualPickupImage(null); return; }
                      const reader = new FileReader();
                      reader.onloadend = () => setManualPickupImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                    className="block w-full text-xs"
                  />
                  {manualPickupImage && (
                    <img src={manualPickupImage} alt="Manual pickup" className="w-full h-24 object-cover rounded border" />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-1">Lat</p>
                      <input
                        type="number"
                        step="any"
                        value={manualPickupLat}
                        onChange={(e) => setManualPickupLat(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <p className="mb-1">Lng</p>
                      <input
                        type="number"
                        step="any"
                        value={manualPickupLng}
                        onChange={(e) => setManualPickupLng(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="font-semibold text-xs">Disposal (Manual)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) { setManualDisposalImage(null); return; }
                      const reader = new FileReader();
                      reader.onloadend = () => setManualDisposalImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                    className="block w-full text-xs"
                  />
                  {manualDisposalImage && (
                    <img src={manualDisposalImage} alt="Manual disposal" className="w-full h-24 object-cover rounded border" />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-1">Lat</p>
                      <input
                        type="number"
                        step="any"
                        value={manualDisposalLat}
                        onChange={(e) => setManualDisposalLat(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <p className="mb-1">Lng</p>
                      <input
                        type="number"
                        step="any"
                        value={manualDisposalLng}
                        onChange={(e) => setManualDisposalLng(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 mt-2">
                    <p>Waste details (type and quantity)</p>
                    <textarea
                      className="w-full border rounded px-2 py-1 text-xs min-h-[50px]"
                      placeholder="e.g. 3 plastic bottles, 1 glass jar, some paper scraps"
                      value={manualMaterialType}
                      onChange={(e) => setManualMaterialType(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-2">
                <div className="flex-1 flex flex-col md:flex-row md:items-center md:gap-2 text-[11px] text-muted-foreground">
                  <span>
                    Selected dustbin (optional link):{' '}
                    <span className="font-medium">{selectedDustbin ? selectedDustbin.name : 'None – report will not be linked to a dustbin'}</span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-1 md:mt-0 text-xs"
                    onClick={() => {
                      setShowMap(true);
                      setIsTracking(true);
                    }}
                  >
                    Choose Dustbin
                  </Button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={submitManualTestReport}
                  disabled={manualSubmitting}
                >
                  {manualSubmitting ? 'Submitting test report…' : 'Submit Test Report (Manual)'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Interactive Map Modal */}
      {showMap && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-6xl h-[80vh] flex flex-col bg-card border border-border">
            <CardHeader className="flex-row items-center justify-between border-b gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapIcon className="h-5 w-5 text-blue-600" />
                  Live Dustbin Map
                </CardTitle>
                <CardDescription>Real-time locations of waste collection points</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={locateUserOnMap}
                >
                  Locate Me
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowMap(false);
                    setIsTracking(false);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative overflow-hidden">
              <div className="w-full h-full">
                {loadingBins ? (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Loading map…</div>
                ) : activeDustbins.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">No dustbins available. Employees can add dustbins from the dashboard.</div>
                ) : (
                  <div className="w-full h-full">
                    <div className="w-full h-full min-h-[320px]">
                      <DustbinMap
                        userLocation={userLocation}
                        dustbins={activeDustbins}
                        onSelect={(bin) => setSelectedDustbin(bin)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Image Viewer Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh]">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white z-10"
              onClick={() => setExpandedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={expandedImage}
              alt="Expanded view"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-sm font-medium">
              Click outside to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Capture;