import { useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, MapPin, Upload, PartyPopper } from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getReliableLocation } from "@/lib/location";

const FestivalsCollectorPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [festivalType, setFestivalType] = useState<'ganesh' | 'durga' | 'other'>('ganesh');
  const [siteType, setSiteType] = useState<'lake' | 'river' | 'beach' | 'pond' | 'spot' | 'other'>('lake');
  const [siteName, setSiteName] = useState("");
  const [landmark, setLandmark] = useState("");
  const [description, setDescription] = useState("");

  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [showCamera, setShowCamera] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [manualMode, setManualMode] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    if (!latParam || !lngParam) return;

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setLocation({ lat, lng });
    setManualLat(String(lat));
    setManualLng(String(lng));
    setManualMode(true);
    toast({
      title: 'Location selected from map',
      description: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    });
  }, [searchParams, toast]);

  const getLocation = async () => {
    setLocationLoading(true);
    try {
      const coords = await getReliableLocation();
      setLocation(coords);
      setManualLat(String(coords.lat));
      setManualLng(String(coords.lng));
    } catch (err) {
      toast({
        title: "Location Error",
        description: (err as Error)?.message || "Could not get your location.",
        variant: "destructive",
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const applyManualCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast({ title: "Invalid Coordinates", description: "Please enter valid latitude and longitude.", variant: "destructive" });
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({ title: "Coordinates Out of Range", description: "Latitude must be -90 to 90, Longitude -180 to 180.", variant: "destructive" });
      return;
    }
    setLocation({ lat, lng });
    toast({ title: "Coordinates Set", description: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvasRef.current.toDataURL("image/jpeg");
    setImage(dataUrl);
    stopCamera();

    if (!manualMode) {
      await getLocation();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!location || !image || !name.trim() || !siteName.trim()) {
      toast({ title: "Missing Information", description: "Please provide title, site name, photo, and location.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/festivals', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          festivalType,
          siteType,
          siteName,
          landmark,
          coordinates: location,
          imageBase64: image,
        })
      });

      toast({ title: "Success", description: "Festival idol site report submitted." });
      navigate('/dashboard');
    } catch (error: unknown) {
      toast({ title: "Error", description: (error as Error)?.message || "Failed to submit report.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="collector" />
      <main className="lg:ml-64 p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="bg-gradient-eco rounded-lg p-6 text-white shadow">
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2"><PartyPopper /> Report Festival Idol Spots</h1>
            <p className="text-white/90">Upload photos and real-time location of lakes/spots where Ganesh or Durga idols remain after festival completion.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Festival Spot Details</CardTitle>
              <CardDescription>This goes to employee management for live action and cleanup process.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Report Title</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Ganesh idol remains near Powai Lake" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Festival Type</Label>
                  <Select value={festivalType} onValueChange={(v: 'ganesh' | 'durga' | 'other') => setFestivalType(v)}>
                    <SelectTrigger><SelectValue placeholder="Festival type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ganesh">Ganesh</SelectItem>
                      <SelectItem value="durga">Durga</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Site Type</Label>
                  <Select value={siteType} onValueChange={(v: 'lake' | 'river' | 'beach' | 'pond' | 'spot' | 'other') => setSiteType(v)}>
                    <SelectTrigger><SelectValue placeholder="Site type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lake">Lake</SelectItem>
                      <SelectItem value="river">River</SelectItem>
                      <SelectItem value="beach">Beach</SelectItem>
                      <SelectItem value="pond">Pond</SelectItem>
                      <SelectItem value="spot">Spot</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input id="siteName" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="e.g., Powai Lake East Gate" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landmark">Landmark</Label>
                  <Input id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="e.g., Near temple steps" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe idol condition, crowd level, and waste around spot." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-eco-forest-primary" /> Evidence Photo + Real-time Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-56 flex items-center justify-center border-2 border-dashed border-eco-forest-primary/40 rounded-lg bg-muted/40 mb-4 relative overflow-hidden">
                {!showCamera && !image && (
                  <div className="flex flex-col gap-3 w-full h-full items-center justify-center px-4">
                    <Button onClick={startCamera} variant="outline" className="flex flex-col items-center justify-center h-24 bg-transparent border-0 shadow-none">
                      <Camera className="h-10 w-10 mb-2 text-eco-forest-primary" />
                      <span className="font-medium text-eco-forest-primary">Capture Photo</span>
                      <span className="text-xs text-muted-foreground">Use camera and location</span>
                    </Button>
                    <div className="text-muted-foreground text-xs">or</div>
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full">
                      <Upload className="mr-2 h-4 w-4" /> Upload from Device
                    </Button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </div>
                )}

                {showCamera && (
                  <div className="flex flex-col items-center w-full">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-56 object-cover bg-black" />
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                    <Button onClick={capturePhoto} variant="eco" className="w-full mt-2">Take Photo</Button>
                  </div>
                )}

                {image && !showCamera && <img src={image} alt="Festival site" className="absolute inset-0 w-full h-full object-cover rounded-lg" />}
              </div>

              <div className="w-full mt-2 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Lat: {location?.lat?.toFixed(6) ?? "---"} | Lng: {location?.lng?.toFixed(6) ?? "---"}</span>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={getLocation} disabled={locationLoading}>
                    {locationLoading ? 'Getting GPS...' : 'Use Current GPS'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setManualMode(!manualMode)}>
                    {manualMode ? 'Use Auto GPS' : 'Use Manual Coordinates'}
                  </Button>
                </div>

                {manualMode && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input type="number" step="any" placeholder="Latitude" value={manualLat} onChange={(e) => setManualLat(e.target.value)} />
                    <Input type="number" step="any" placeholder="Longitude" value={manualLng} onChange={(e) => setManualLng(e.target.value)} />
                    <Button type="button" onClick={applyManualCoordinates}>Apply Coordinates</Button>
                  </div>
                )}
              </div>

              <Button onClick={handleSubmit} variant="eco" className="w-full mt-6" disabled={locationLoading || !location || submitting || !name.trim() || !siteName.trim() || !image}>
                <Upload className="mr-2 h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit Festival Spot Report'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default FestivalsCollectorPage;
