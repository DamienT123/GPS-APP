import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";

import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, ME_ZOOM } from "../../config/mapConfig";
import { useLiveLocation } from "../../hooks/useLiveLocation";
import { buildRoute, snapToRoad } from "../../services/osrmService";
import type { Waypoint, RouteFeature } from "../../types/mapTypes";

import { MapCanvas } from "../../components/map/MapCanvas";
import { MapOverlay } from "../../components/map/MapOverlay";

import { createRoute, saveRoute } from "../../services/routesSql";

export default function MapScreen() {
  const cameraRef = useRef<any>(null);

  const { pos, error } = useLiveLocation();

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeFeature, setRouteFeature] = useState<RouteFeature | null>(null);

  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [followMe, setFollowMe] = useState(false);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Tap on the map to add walking waypoints.");

  useEffect(() => {
    if (error) setMessage(error);
  }, [error]);

  useEffect(() => {
    if (!followMe || !pos) return;

    cameraRef.current?.setCamera({
      centerCoordinate: [pos.lon, pos.lat],
      animationDuration: 0,
    });
  }, [followMe, pos]);


  const stopFollowing = () => {
    setFollowMe(false);
  };

  const addWaypointFromTap = async (lon: number, lat: number) => {
    if (busy) return;

    stopFollowing();
    setBusy(true);
    setMessage("Snapping waypoint to road…");

    try {
      const snapped = await snapToRoad(lon, lat);

      const nextWaypoints: Waypoint[] = [
        ...waypoints,
        { id: Date.now().toString(), ...snapped },
      ];
      setWaypoints(nextWaypoints);

      cameraRef.current?.setCamera({
        centerCoordinate: [snapped.lon, snapped.lat],
        animationDuration: 500,
      });

      if (nextWaypoints.length >= 2) {
        setMessage("Calculating walking route…");
        const route = await buildRoute(nextWaypoints);
        setRouteFeature(route);
        setMessage(`Waypoints: ${nextWaypoints.length} • Route ready`);
      } else {
        setRouteFeature(null);
        setMessage("Add one more waypoint to create a route.");
      }
    } catch (err: any) {
      setMessage(err?.message ?? "OSRM error");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    stopFollowing();
    setWaypoints([]);
    setRouteFeature(null);
    setMessage("Reset. Tap again to add waypoints.");
  };

  const zoomIn = () => {
    stopFollowing();
    setZoomLevel((z) => {
      const next = Math.min(z + 1, MAX_ZOOM);
      cameraRef.current?.setCamera({ zoomLevel: next, animationDuration: 200 });
      return next;
    });
  };

  const zoomOut = () => {
    stopFollowing();
    setZoomLevel((z) => {
      const next = Math.max(z - 1, MIN_ZOOM);
      cameraRef.current?.setCamera({ zoomLevel: next, animationDuration: 200 });
      return next;
    });
  };

  const centerOnMe = () => {
    if (!pos) return;

    setFollowMe(true);

    cameraRef.current?.setCamera({
      centerCoordinate: [pos.lon, pos.lat],
      zoomLevel: ME_ZOOM,      // tijdelijk
      animationDuration: 200,
    });
  };


  const saveCurrentRoute = () => {
    if (!routeFeature || waypoints.length < 2) {
      setMessage("Add at least 2 waypoints before saving.");
      return;
    }

    const r = createRoute({
      name: `Route ${new Date().toLocaleString()}`,
      profile: "walking",
      waypoints,
      routeFeature,
      ownerUid: null, // later Firebase uid
    });

    saveRoute(r);
    setMessage("✅ Route saved locally (SQLite)");
  };

  return (
    <View style={styles.container}>
      <MapCanvas
        cameraRef={cameraRef}
        pos={pos}
        waypoints={waypoints}
        routeFeature={routeFeature}
        onMapPress={addWaypointFromTap}
      />

      <MapOverlay
        message={message}
        zoomLevel={zoomLevel}
        followMe={followMe}
        busy={busy}
        canCenterOnMe={!!pos}
        onZoomOut={zoomOut}
        onZoomIn={zoomIn}
        onCenterOnMe={centerOnMe}
        onReset={reset}
        onSaveRoute={saveCurrentRoute}         
        canSaveRoute={!!routeFeature && waypoints.length >= 2} // ✅ ook toevoegen
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
