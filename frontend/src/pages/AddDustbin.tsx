import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Camera, MapPin, Upload } from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import { NavLink } from "react-router-dom";

const AddDustbin = () => {
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Get location
  const getLocation = () => {
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => {
        setLocation({ lat: 0, lng: 0 });
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
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

  // Capture photo and location
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 320, 240);
        const imageData = canvasRef.current.toDataURL("image/png");
        setShowCamera(false);
        // Stop camera stream
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) stream.getTracks().forEach(track => track.stop());
        // Get location at the moment of photo capture
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setImage(imageData);
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setLocationLoading(false);
          },
          () => {
            setImage(imageData);
            setLocation({ lat: 0, lng: 0 });
            setLocationLoading(false);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
      }
    }
  };

  const handleSubmit = () => {
    // Submit image and location to backend here
    alert(`Dustbin added!\nLat: ${location?.lat}\nLng: ${location?.lng}`);
    setImage(null);
    setLocation(null);
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
                      <Button
                        onClick={startCamera}
                        variant="outline"
                        className="flex flex-col items-center justify-center w-full h-full bg-transparent border-0 shadow-none"
                      >
                        <Camera className="h-10 w-10 mb-2 text-eco-forest-primary" />
                        <span className="font-medium text-eco-forest-primary">Capture Dustbin Photo</span>
                        <span className="text-xs text-muted-foreground">Tap to open camera</span>
                      </Button>
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
                          Take Photo & Get Location
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
                    </p>
                  </div>
                </div>
              </div>
              {/* Submit Button */}
              {image && (
                <Button
                  onClick={handleSubmit}
                  variant="success"
                  className="w-full mt-6"
                  disabled={locationLoading || !location}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Dustbin
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