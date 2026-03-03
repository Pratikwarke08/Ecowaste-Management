export type Coordinates = { lat: number; lng: number; accuracy?: number };

const FALLBACK_COORDS: Coordinates = { lat: 20.5937, lng: 78.9629, accuracy: 0 };

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true, // Crucial: Instructs device to use GPS hardware
  timeout: 20000,           // Increased: GPS cold-starts can take 10-15s
  maximumAge: 0,            // Force fresh data, no cached locations
};

export function getReliableLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      reject(new Error('HTTPS required for high-accuracy location.'));
      return;
    }

    let bestPosition: GeolocationPosition | null = null;
    let watchId: number;

    // Increased wait time to 10s: GPS hardware often takes ~7s to refine from 100m to <10m
    const maxWaitTime = 10000;
    const targetAccuracy = 3; // 3 meters is the realistic "gold standard" for smartphones

    const stopWatching = () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };

    const timeoutId = setTimeout(() => {
      if (bestPosition) {
        finish();
      } else {
        stopWatching();
        reject(new Error('Location request timed out without a fix.'));
      }
    }, maxWaitTime);

    const finish = () => {
      stopWatching();
      clearTimeout(timeoutId);
      if (bestPosition) {
        resolve({
          lat: bestPosition.coords.latitude,
          lng: bestPosition.coords.longitude,
          accuracy: bestPosition.coords.accuracy
        });
      }
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // Keep the reading if it's the most accurate one seen so far
        if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = pos;
        }

        // If we hit our high-precision target, resolve immediately
        if (pos.coords.accuracy <= targetAccuracy) {
          finish();
        }
      },
      (error) => {
        // If we haven't found any position and the error is terminal
        if (!bestPosition) {
          stopWatching();
          clearTimeout(timeoutId);
          reject(error);
        }
      },
      GEO_OPTIONS
    );
  });
}

export function getFallbackLocation(): Coordinates {
  return FALLBACK_COORDS;
}
