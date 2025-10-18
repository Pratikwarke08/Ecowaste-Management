import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navigation from '@/components/layout/Navigation';
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

// Multiple dustbin locations for the map
const DUSTBINS = [
  { id: 1, lat: 12.9721, lng: 77.5950, name: 'Main Street Bin', type: 'Mixed' },
  { id: 2, lat: 12.9716, lng: 77.5946, name: 'Park Bin', type: 'Organic' },
  { id: 3, lat: 12.9726, lng: 77.5955, name: 'Market Bin', type: 'Plastic' },
  { id: 4, lat: 12.9711, lng: 77.5941, name: 'School Bin', type: 'Paper' },
];

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
  const [selectedDustbin, setSelectedDustbin] = useState<typeof DUSTBINS[0] | null>(null);
  const [isTracking, setIsTracking] = useState(false);
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
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking]);

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
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
        context.drawImage(videoRef.current, 0, 0, 640, 480);
        const imageData = canvasRef.current.toDataURL('image/png');
        
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setShowCamera(null);

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              };
              if (type === 'pickup') {
                setPickupImage(imageData);
                setPickupLocation(coords);
                setStep('disposal');
              } else {
                setDisposalImage(imageData);
                setDisposalLocation(coords);
                setStep('verify');
              }
            },
            () => {
              const coords = { lat: 12.9716, lng: 77.5946 };
              if (type === 'pickup') {
                setPickupImage(imageData);
                setPickupLocation(coords);
                setStep('disposal');
              } else {
                setDisposalImage(imageData);
                setDisposalLocation(coords);
                setStep('verify');
              }
            },
            { enableHighAccuracy: true, maximumAge: 0 }
          );
        }
      }
    }
  };

  const getCurrentLocation = (type: 'pickup' | 'disposal') => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          if (type === 'pickup') setPickupLocation(coords);
          else setDisposalLocation(coords);
          setUserLocation(coords);
        },
        () => {
          const coords = { lat: 12.9716, lng: 77.5946 };
          if (type === 'pickup') setPickupLocation(coords);
          else setDisposalLocation(coords);
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    }
  };

  const submitReport = () => {
    alert('🎉 Waste collection report submitted successfully! You earned 42 points!');
    setStep('pickup');
    setPickupImage(null);
    setPickupLocation(null);
    setDisposalImage(null);
    setDisposalLocation(null);
  };

  const findNearestDustbin = (location: { lat: number; lng: number }) => {
    let nearest = DUSTBINS[0];
    let minDist = getDistanceFromLatLonInMeters(location.lat, location.lng, nearest.lat, nearest.lng);
    
    DUSTBINS.forEach(bin => {
      const dist = getDistanceFromLatLonInMeters(location.lat, location.lng, bin.lat, bin.lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = bin;
      }
    });
    return { bin: nearest, distance: minDist };
  };

  let nearestDustbin = null;
  if (disposalLocation) {
    nearestDustbin = findNearestDustbin(disposalLocation);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header with Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-green-600 to-blue-600 p-2 rounded-lg">
                <Navigation userRole={userType} />
                <Recycle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EcoCollect</h1>
                <p className="text-sm text-gray-500">Smart Waste Management</p>
              </div>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Progress Steps */}
          <Card className="bg-white shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-3 transition-all ${step === 'pickup' ? 'scale-110' : ''}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    step === 'pickup' ? 'border-green-600 bg-green-50 shadow-lg' : 
                    pickupImage ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'
                  }`}>
                    {pickupImage ? <CheckCircle className="h-6 w-6" /> : <Trash2 className="h-6 w-6" />}
                  </div>
                  <div>
                    <span className="font-semibold block">Pickup</span>
                    <span className="text-xs text-gray-500">Capture waste</span>
                  </div>
                </div>
                
                <div className={`h-1 flex-1 mx-6 rounded-full transition-all ${pickupImage ? 'bg-green-600' : 'bg-gray-200'}`} />
                
                <div className={`flex items-center gap-3 transition-all ${step === 'disposal' ? 'scale-110' : ''}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    step === 'disposal' ? 'border-blue-600 bg-blue-50 shadow-lg' : 
                    step === 'verify' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                  }`}>
                    {disposalImage ? <CheckCircle className="h-6 w-6" /> : <Recycle className="h-6 w-6" />}
                  </div>
                  <div>
                    <span className="font-semibold block">Disposal</span>
                    <span className="text-xs text-gray-500">At dustbin</span>
                  </div>
                </div>
                
                <div className={`h-1 flex-1 mx-6 rounded-full transition-all ${disposalImage ? 'bg-blue-600' : 'bg-gray-200'}`} />
                
                <div className={`flex items-center gap-3 transition-all ${step === 'verify' ? 'scale-110' : ''}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    step === 'verify' ? 'border-purple-600 bg-purple-50 shadow-lg' : 'border-gray-300'
                  }`}>
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="font-semibold block">Verify</span>
                    <span className="text-xs text-gray-500">Submit report</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pickup Step */}
          {step === 'pickup' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
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
                          className="w-full h-64 bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-xl"
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
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      Location Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Latitude:</span>
                        <span className="font-mono">{pickupLocation?.lat.toFixed(6) ?? 'Not captured'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Longitude:</span>
                        <span className="font-mono">{pickupLocation?.lng.toFixed(6) ?? 'Not captured'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Alert className="bg-green-50 border-green-200">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
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
                  <Card className="shadow-lg">
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

                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      Location Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {nearestDustbin && (
                      <div className={`p-4 rounded-lg ${nearestDustbin.distance < 50 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{nearestDustbin.bin.name}</span>
                          <Badge variant={nearestDustbin.distance < 50 ? 'default' : 'secondary'}>
                            {nearestDustbin.distance.toFixed(0)}m away
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Type: {nearestDustbin.bin.type}</p>
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
              <Card className="lg:col-span-2 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <CheckCircle className="h-6 w-6" />
                    Review & Submitp
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
                        <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
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
                        <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                          <p>Lat: {disposalLocation?.lat?.toFixed(6)}</p>
                          <p>Lng: {disposalLocation?.lng?.toFixed(6)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-sm">🤖 AI Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Waste Type:</span>
                      <Badge className="bg-purple-600">Mixed Plastic</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Weight:</span>
                      <Badge variant="secondary">8.5 kg</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Quality:</span>
                      <Badge className="bg-green-600">Excellent ✓</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">Points:</span>
                      <Badge className="bg-yellow-500 text-lg">+42 pts 🏆</Badge>
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
        </div>
      </main>

      {/* Interactive Map Modal */}
      {showMap && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-6xl h-[80vh] flex flex-col">
            <CardHeader className="flex-row items-center justify-between border-b">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapIcon className="h-5 w-5 text-blue-600" />
                  Live Dustbin Map
                </CardTitle>
                <CardDescription>Real-time locations of waste collection points</CardDescription>
              </div>
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
            </CardHeader>
            <CardContent className="flex-1 p-0 relative overflow-hidden">
              {/* Simple Map Visualization */}
              <div className="w-full h-full bg-gradient-to-br from-green-100 via-blue-100 to-cyan-100 relative">
                {/* Map Grid */}
                <div className="absolute inset-0" style={{
                  backgroundImage: 'linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.05) 1px, transparent 1px)',
                  backgroundSize: '50px 50px'
                }} />
                
                {/* Legend */}
                <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 space-y-2">
                  <h3 className="font-semibold text-sm mb-2">Map Legend</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse" />
                    <span>Your Location</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 bg-green-600 rounded" />
                    <span>Dustbins</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 bg-yellow-500 rounded" />
                    <span>Selected</span>
                  </div>
                </div>

                {/* Stats Panel */}
                <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10 space-y-2 min-w-48">
                  <h3 className="font-semibold text-sm mb-2">Statistics</h3>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Total Bins:</span>
                      <span className="font-bold">{DUSTBINS.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active:</span>
                      <span className="font-bold text-green-600">{DUSTBINS.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tracking:</span>
                      <span className={`font-bold ${isTracking ? 'text-blue-600' : 'text-gray-400'}`}>
                        {isTracking ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Map Content */}
                <div className="absolute inset-0 flex items-center justify-center p-20">
                  <div className="relative w-full h-full">
                    {/* Dustbin Markers */}
                    {DUSTBINS.map((bin, idx) => {
                      const isSelected = selectedDustbin?.id === bin.id;
                      const xPos = 15 + (idx % 2) * 35 + (idx * 10);
                      const yPos = 20 + Math.floor(idx / 2) * 40;
                      
                      return (
                        <div
                          key={bin.id}
                          className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-125 ${
                            isSelected ? 'z-20 scale-125' : 'z-10'
                          }`}
                          style={{ left: `${xPos}%`, top: `${yPos}%` }}
                          onClick={() => setSelectedDustbin(isSelected ? null : bin)}
                        >
                          {/* Marker */}
                          <div className={`relative ${isSelected ? 'animate-bounce' : ''}`}>
                            <div className={`w-12 h-12 rounded-lg shadow-xl flex items-center justify-center ${
                              isSelected ? 'bg-yellow-500' : 'bg-green-600'
                            } text-white font-bold`}>
                              <Trash2 className="h-6 w-6" />
                            </div>
                            
                            {/* Pulse Effect */}
                            <div className={`absolute inset-0 rounded-lg ${
                              isSelected ? 'bg-yellow-500' : 'bg-green-600'
                            } animate-ping opacity-20`} />
                          </div>
                          
                          {/* Info Card */}
                          {isSelected && (
                            <div className="absolute top-14 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-2xl p-4 w-64 animate-fade-in">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-bold text-sm">{bin.name}</h4>
                                  <p className="text-xs text-gray-500">ID: {bin.id}</p>
                                </div>
                                <Badge className="bg-green-600">{bin.type}</Badge>
                              </div>
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Latitude:</span>
                                  <span className="font-mono">{bin.lat.toFixed(4)}°</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Longitude:</span>
                                  <span className="font-mono">{bin.lng.toFixed(4)}°</span>
                                </div>
                                {userLocation && (
                                  <div className="flex justify-between pt-2 border-t">
                                    <span className="text-gray-600">Distance:</span>
                                    <span className="font-bold text-blue-600">
                                      {getDistanceFromLatLonInMeters(
                                        userLocation.lat,
                                        userLocation.lng,
                                        bin.lat,
                                        bin.lng
                                      ).toFixed(0)}m
                                    </span>
                                  </div>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                                onClick={() => {
                                  alert(`Navigating to ${bin.name}...`);
                                }}
                              >
                                <NavIcon className="mr-2 h-3 w-3" />
                                Navigate Here
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* User Location Marker */}
                    {userLocation && (
                      <div
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30"
                        style={{ left: '50%', top: '50%' }}
                      >
                        <div className="relative">
                          {/* Outer pulse ring */}
                          <div className="absolute inset-0 w-16 h-16 bg-blue-400 rounded-full animate-ping opacity-30" />
                          
                          {/* Middle ring */}
                          <div className="absolute inset-2 w-12 h-12 bg-blue-500 rounded-full animate-pulse opacity-50" />
                          
                          {/* Core marker */}
                          <div className="relative w-16 h-16 bg-blue-600 rounded-full shadow-2xl flex items-center justify-center border-4 border-white">
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                          </div>
                        </div>
                        
                        {/* User label */}
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-lg">
                          You Are Here
                        </div>
                      </div>
                    )}

                    {/* Connection Lines (if disposal location is set) */}
                    {disposalLocation && nearestDustbin && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                        <line
                          x1="50%"
                          y1="50%"
                          x2={`${15 + (DUSTBINS.findIndex(b => b.id === nearestDustbin.bin.id) % 2) * 35 + (DUSTBINS.findIndex(b => b.id === nearestDustbin.bin.id) * 10)}%`}
                          y2={`${20 + Math.floor(DUSTBINS.findIndex(b => b.id === nearestDustbin.bin.id) / 2) * 40}%`}
                          stroke={nearestDustbin.distance < 50 ? "#22c55e" : "#eab308"}
                          strokeWidth="3"
                          strokeDasharray="10,5"
                          className="animate-pulse"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Bottom Control Panel */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 z-10 flex gap-4">
                  <Button
                    variant={isTracking ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setIsTracking(!isTracking);
                      if (!isTracking) {
                        getCurrentLocation(step === 'pickup' ? 'pickup' : 'disposal');
                      }
                    }}
                    className={isTracking ? "bg-blue-600" : ""}
                  >
                    <NavIcon className={`mr-2 h-4 w-4 ${isTracking ? 'animate-spin' : ''}`} />
                    {isTracking ? 'Tracking...' : 'Start Tracking'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDustbin(null);
                      setUserLocation(null);
                    }}
                  >
                    Reset View
                  </Button>

                  <Badge variant="secondary" className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                    Live Map
                  </Badge>
                </div>
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