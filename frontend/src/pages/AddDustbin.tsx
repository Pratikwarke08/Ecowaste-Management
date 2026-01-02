import { useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, MapPin, Upload } from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getReliableLocation } from "@/lib/location";

const AddDustbin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  // Check for coordinates in URL
  useEffect(() => {
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        setLocation({ lat, lng });
        setManualLat(latParam);
        setManualLng(lngParam);
        setManualMode(true);
        toast({
          title: "Location Set from Map",
          description: `Using coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        });
      }
    }
  }, [searchParams, toast]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Get location
  const getLocation = async () => {
    setLocationLoading(true);
    try {
      const coords = await getReliableLocation();
      setLocation(coords);
    } catch (err) {
      toast({
        title: "Location Error",
        description: (err as Error)?.message || "Could not get your location. Please enable GPS or enter coordinates manually.",
        variant: "destructive",
      });
    } finally {
      setLocationLoading(false);
    }
  };

  // Apply manual coordinates
  const applyManualCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      toast({
        title: "Invalid Coordinates",
        description: "Please enter valid latitude and longitude numbers.",
        variant: "destructive",
      });
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({
        title: "Coordinates Out of Range",
        description: "Latitude must be between -90 and 90. Longitude must be between -180 and 180.",
        variant: "destructive",
      });
      return;
    }
    setLocation({ lat, lng });
    toast({
      title: "Coordinates Set",
      description: `Location set to ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    });
  };

  // Start rear camera
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      // fallback to any camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (error) {
        alert("Could not access camera: " + error);
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  // Capture photo and get location
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setImage(dataUrl);
    stopCamera();
    if (!manualMode) {
      getLocation();
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!location || !image) {
      toast({
        title: "Missing Information",
        description: "Please capture both photo and location before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await apiFetch('/dustbins', {
        method: 'POST',
        body: JSON.stringify({
          name: `Dustbin at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
          sector: 'Unknown',
          type: 'mixed',
          capacityLiters: undefined,
          coordinates: {
            lat: location.lat,
            lng: location.lng,
          },
          description: undefined,
          status: 'active',
          fillLevel: 0,
          lastEmptiedAt: null,
          photoBase64: image,
          verificationRadius: 1.0,
        })
      });
      toast({
        title: "Success",
        description: "Dustbin added successfully",
      });
      setImage(null);
      setLocation(null);
      setManualLat("");
      setManualLng("");
      setManualMode(false);
      navigate(-1);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to add dustbin. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="employee" />
      <main className="lg:ml-64 p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="bg-gradient-eco rounded-lg p-6 text-white shadow">
            <h1 className="text-2xl font-bold mb-2">Add New Dustbin</h1>
            <p className="text-white/90">Capture a photo and location for the new dustbin to help collectors verify disposal.</p>
          </div>

          {/* Camera/Card Section */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-eco-forest-primary" />
                Dustbin Photo & Location
              </CardTitle>
              <CardDescription>
                Please take a clear photo of the dustbin and capture its real-time location.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Camera/Photo Box */}
                <div className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full h-48 flex items-center justify-center border-2 border-dashed border-eco-forest-primary/40 rounded-lg bg-muted/40 mb-4 relative"
                  >
                    {!showCamera && !image && (
                      <div className="flex flex-col gap-3 w-full h-full items-center justify-center px-4">
                        <Button
                          onClick={startCamera}
                          variant="outline"
                          className="flex flex-col items-center justify-center h-24 bg-transparent border-0 shadow-none"
                        >
                          <Camera className="h-10 w-10 mb-2 text-eco-forest-primary" />
                          <span className="font-medium text-eco-forest-primary">Capture Photo</span>
                          <span className="text-xs text-muted-foreground">
                            Use device camera{!manualMode && " and GPS"}
                          </span>
                        </Button>
                        <div className="text-muted-foreground text-xs">or</div>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                          className="w-full"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload from Device
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </div>
                    )}
                    {showCamera && (
                      <div className="flex flex-col items-center w-full">
                        <video
                          ref={videoRef}
                          width={320}
                          height={192}
                          autoPlay
                          playsInline
                          style={{
                            background: "#000",
                            borderRadius: 8,
                            width: "100%",
                            height: "12rem",
                            objectFit: "cover",
                            zIndex: 2,
                          }}
                        />
                        <canvas ref={canvasRef} width={320} height={192} style={{ display: "none" }} />
                        <Button
                          onClick={capturePhoto}
                          variant="eco"
                          className="w-full mt-2"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Take Photo{!manualMode && " & Get Location"}
                        </Button>
                      </div>
                    )}
                    {image && !showCamera && (
                      <img
                        src={image}
                        alt="Dustbin"
                        className="absolute inset-0 w-full h-full object-cover rounded-lg"
                        style={{ zIndex: 1 }}
                      />
                    )}
                  </div>
                  {/* Location Info */}
                  <div className="w-full mt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        Lat: {location?.lat?.toFixed(6) ?? "---"} | Lng: {location?.lng?.toFixed(6) ?? "---"}
                      </span>
                    </div>
                    {locationLoading && (
                      <div className="text-xs text-eco-forest-primary mt-2">Getting current location...</div>
                    )}
                    {/* Manual Coordinates (always visible) and mode toggle */}
                    <div className="mt-3 space-y-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setManualMode(!manualMode)}
                        className="text-xs text-eco-forest-primary hover:bg-eco-forest-primary/10"
                      >
                        {manualMode ? "Use GPS automatically" : "Use manual coordinates (no GPS)"}
                      </Button>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="manualLat" className="text-xs">Latitude:</Label>
                          <Input
                            id="manualLat"
                            type="number"
                            step="any"
                            placeholder="e.g. 19.0760"
                            value={manualLat}
                            onChange={(e) => setManualLat(e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="manualLng" className="text-xs">Longitude:</Label>
                          <Input
                            id="manualLng"
                            type="number"
                            step="any"
                            placeholder="e.g. 72.8777"
                            value={manualLng}
                            onChange={(e) => setManualLng(e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={applyManualCoordinates}
                          className="text-xs"
                          disabled={!manualLat || !manualLng}
                        >
                          Apply Coordinates
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Instructions */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="bg-eco-forest-primary/5 border border-eco-forest-primary/20 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-eco-forest-primary mb-2">📸 Photo Tips</h4>
                    <ul className="text-sm space-y-1 text-eco-forest-primary/80">
                      <li>• Ensure the dustbin is clearly visible</li>
                      <li>• Include surroundings for context</li>
                      <li>• Good lighting for better recognition</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Why location?</h4>
                    <p className="text-xs text-muted-foreground">
                      The captured coordinates will be used to verify waste disposal by collectors.
                      {!manualMode && " Your device's GPS will be used automatically."}
                      {manualMode && " Enter coordinates manually if GPS is unavailable."}
                    </p>
                  </div>
                </div>
              </div>
              {/* Submit Button */}
              {image && (
                <Button
                  onClick={handleSubmit}
                  variant="eco"
                  className="w-full mt-6"
                  disabled={locationLoading || !location || submitting}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {submitting ? 'Submitting...' : 'Submit Dustbin'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </main>


    </div>
  );
};

export default AddDustbin;