import { useEffect, useState } from "react";
import * as Location from "expo-location";
import type { LonLat } from "../types/mapTypes";



type UseLiveLocationResult = {
  pos: LonLat | null;
  error: string | null;
  hasPermission: boolean;
};


export function useLiveLocation(): UseLiveLocationResult {

  const [pos, setPos] = useState<LonLat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);


  useEffect(() => {
    
    let sub: Location.LocationSubscription | null = null;
    let mounted = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;

        if (status !== "granted") {
          setHasPermission(false);
          setError("Location permission not granted.");
          return;
        }

        setHasPermission(true);

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!mounted) return;

        requestAnimationFrame(() => {
        setPos({ lon: current.coords.longitude, lat: current.coords.latitude });
        });

        sub = await Location.watchPositionAsync(

          { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
          (loc) => {
            if (!mounted) return;
            requestAnimationFrame(() => {
            setPos({ lon: loc.coords.longitude, lat: loc.coords.latitude });
            });
          }
        );
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Location error");
      }
    })();

    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);

  return { pos, error, hasPermission };
}
