export type Coordinates = { lat: number; lng: number; accuracy?: number };

const FALLBACK_COORDS: Coordinates = { lat: 20.5937, lng: 78.9629, accuracy: 0 }; // Approximate India centroid

const GEO_OPTIONS: PositionOptions = {
  // Allow the browser to choose the best provider (GPS or network) to avoid frequent timeouts
  enableHighAccuracy: true,
  timeout: 15000, // Reduced timeout
  maximumAge: 0,
};

export function getReliableLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported in this environment'));
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      reject(new Error('Insecure context: location requires HTTPS or localhost.'));
      return;
    }

    // Use watchPosition to get multiple readings and pick the best one
    let bestPosition: GeolocationPosition | null = null;
    let watchId: number;
    const maxWaitTime = 5000; // Wait up to 5 seconds for better accuracy
    const targetAccuracy = 5; // Target accuracy in meters

    const stopWatching = () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };

    const finish = () => {
      stopWatching();
      if (bestPosition) {
        resolve({
          lat: bestPosition.coords.latitude,
          lng: bestPosition.coords.longitude,
          accuracy: bestPosition.coords.accuracy
        });
      } else {
        reject(new Error('Unable to retrieve location'));
      }
    };

    // Set a timeout to finish if we don't get good enough accuracy
    const timeoutId = setTimeout(finish, maxWaitTime);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // If this is the first reading or better than previous, keep it
        if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = pos;
        }

        // If accuracy is good enough, stop early
        if (pos.coords.accuracy <= targetAccuracy) {
          clearTimeout(timeoutId);
          finish();
        }
      },
      (error) => {
        console.warn('Geolocation partial error:', error);
        // If we have no position yet and it's a fatal error, reject? 
        // Or just wait for timeout?
        // Usually watchPosition calls error callback only if it fails to start or completely fails.
        // We'll let the timeout handle rejection if no position is found.
      },
      GEO_OPTIONS
    );
  });
}

export function getFallbackLocation(): Coordinates {
  return FALLBACK_COORDS;
}
