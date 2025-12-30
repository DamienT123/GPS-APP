import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";

import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, ME_ZOOM } from "../../config/mapConfig";
import { useLiveLocation } from "../../hooks/useLiveLocation";
import { buildRoute, snapToRoad } from "../../services/osrmService";
import type { Waypoint, RouteFeature } from "../../types/mapTypes";

import { MapCanvas } from "../../components/map/MapCanvas";
import { TopWaypointsDropdown, BottomRouteDropdown } from "../../components/map/MapDropdowns";

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

  const stopFollowing = () => setFollowMe(false);

  const recalcRouteFor = async (pts: Waypoint[]) => {
    if (pts.length < 2) {
      setRouteFeature(null);
      setMessage(
        pts.length === 1
          ? "Add one more waypoint to create a route."
          : "Tap on the map to add walking waypoints."
      );
      return;
    }

    setBusy(true);
    setMessage("Recalculating route…");
    try {
      const route = await buildRoute(pts);
      setRouteFeature(route);
      setMessage(`Waypoints: ${pts.length} • Route ready`);
    } catch (err: any) {
      setRouteFeature(null);
      setMessage(err?.message ?? "OSRM error");
    } finally {
      setBusy(false);
    }
  };

  const addWaypointFromTap = async (lon: number, lat: number) => {
    if (busy) return;

    stopFollowing();
    setBusy(true);
    setMessage("Snapping waypoint to road…");

    try {
      const snapped = await snapToRoad(lon, lat);
      const next: Waypoint[] = [...waypoints, { id: Date.now().toString(), ...snapped }];
      setWaypoints(next);

      cameraRef.current?.setCamera({
        centerCoordinate: [snapped.lon, snapped.lat],
        animationDuration: 500,
      });

      await recalcRouteFor(next);
    } catch (err: any) {
      setRouteFeature(null);
      setMessage(err?.message ?? "OSRM error");
    } finally {
      setBusy(false);
    }
  };

  const moveWaypoint = async (from: number, to: number) => {
    if (busy) return;
    if (to < 0 || to >= waypoints.length) return;

    const next = [...waypoints];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);

    setWaypoints(next);
    await recalcRouteFor(next);
  };


  const addWaypointFromSearch = async (data: { lon: number; lat: number; region?: string; country?: string }) => {
  if (busy) return;

  stopFollowing();
  setBusy(true);
  setMessage("Adding searched location…");

  try {
    const snapped = await snapToRoad(data.lon, data.lat);

    const next: Waypoint[] = [
      ...waypoints,
      {
        id: Date.now().toString(),
        ...snapped,
        region: data.region,
        country: data.country,
      },
    ];

    setWaypoints(next);

    cameraRef.current?.setCamera({
      centerCoordinate: [snapped.lon, snapped.lat],
      animationDuration: 500,
    });

    await recalcRouteFor(next);
  } catch (err: any) {
    setRouteFeature(null);
    setMessage(err?.message ?? "Search add failed");
  } finally {
    setBusy(false);
  }
};



  const removeWaypoint = async (index: number) => {
    if (busy) return;

    const next = waypoints.filter((_, i) => i !== index);
    setWaypoints(next);
    await recalcRouteFor(next);
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
      zoomLevel: ME_ZOOM,
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
      ownerUid: null,
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

    <TopWaypointsDropdown
      waypoints={waypoints}
      busy={busy}
      onMoveUp={(i) => moveWaypoint(i, i - 1)}
      onMoveDown={(i) => moveWaypoint(i, i + 1)}
      onRemove={removeWaypoint}
      onAddWaypoint={addWaypointFromSearch}
      onReset={reset}
      onSaveRoute={saveCurrentRoute}
      canSaveRoute={!!routeFeature && waypoints.length >= 2}
    />




      <BottomRouteDropdown
        message={message}
        zoomLevel={zoomLevel}
        followMe={followMe}
        busy={busy}
        canCenterOnMe={!!pos}
        onZoomOut={zoomOut}
        onZoomIn={zoomIn}
        onCenterOnMe={centerOnMe}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
