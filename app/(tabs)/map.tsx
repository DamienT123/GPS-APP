import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Text, Pressable, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import {
  MapView,
  Camera,
  PointAnnotation,
  ShapeSource,
  LineLayer,
} from "@maplibre/maplibre-react-native";

type Waypoint = { id: string; lon: number; lat: number };

const OSRM_BASE = "https://router.project-osrm.org";
const PROFILE = "walking";

// Start on world view (no Brussels flash)
const WORLD_CENTER: [number, number] = [0, 0];
const WORLD_ZOOM = 1.6;

async function snapToRoad(lon: number, lat: number) {
  const url = `${OSRM_BASE}/nearest/v1/${PROFILE}/${lon},${lat}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM nearest failed (${res.status})`);

  const data = await res.json();
  const loc = data?.waypoints?.[0]?.location;
  if (!loc || loc.length !== 2) throw new Error("OSRM nearest: no waypoint found");

  const [sLon, sLat] = loc;
  return { lon: sLon, lat: sLat };
}

async function buildRoute(points: { lon: number; lat: number }[]) {
  if (points.length < 2) return null;

  const coords = points.map((p) => `${p.lon},${p.lat}`).join(";");
  const url = `${OSRM_BASE}/route/v1/${PROFILE}/${coords}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM route failed (${res.status})`);

  const data = await res.json();
  const geom = data?.routes?.[0]?.geometry;
  if (!geom?.coordinates?.length) throw new Error("OSRM route: no geometry returned");

  return { type: "Feature", geometry: geom, properties: {} };
}

export default function MapScreen() {
  const cameraRef = useRef<any>(null);

  const [pos, setPos] = useState<{ lon: number; lat: number } | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeFeature, setRouteFeature] = useState<any>(null);

  const [zoomLevel, setZoomLevel] = useState(12);
  const [followMe, setFollowMe] = useState(false);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Tap on the map to add walking waypoints.");

  const routePoints = useMemo(
    () => waypoints.map((w) => ({ lon: w.lon, lat: w.lat })),
    [waypoints]
  );

  // GPS permission + tracking (NO camera move on startup)
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setMessage("Location permission not granted.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setPos({ lon: current.coords.longitude, lat: current.coords.latitude });

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
        (loc) => {
          setPos({ lon: loc.coords.longitude, lat: loc.coords.latitude });
        }
      );
    })();

    return () => sub?.remove();
  }, []);

  const addWaypointFromTap = async (lon: number, lat: number) => {
    if (busy) return;

    setFollowMe(false);
    cameraRef.current?.setCamera({ followUserLocation: false, animationDuration: 0 });

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
    setFollowMe(false);
    setWaypoints([]);
    setRouteFeature(null);
    setMessage("Reset. Tap again to add waypoints.");
  };

  const zoomIn = () => {
    setFollowMe(false);
    setZoomLevel((z) => {
      const next = Math.min(z + 1, 20);
      cameraRef.current?.setCamera({ zoomLevel: next, animationDuration: 200 });
      return next;
    });
  };

  const zoomOut = () => {
    setFollowMe(false);
    setZoomLevel((z) => {
      const next = Math.max(z - 1, 3);
      cameraRef.current?.setCamera({ zoomLevel: next, animationDuration: 200 });
      return next;
    });
  };

  const centerOnMe = () => {
    if (!pos) return;

    setFollowMe(true);

    cameraRef.current?.setCamera({
      zoomLevel,
      animationDuration: 200,
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        onPress={(e: any) => {
          const coords = e?.geometry?.coordinates;
          if (!coords) return;
          const [lon, lat] = coords as [number, number];
          addWaypointFromTap(lon, lat);
        }}
      >
        <Camera
          ref={cameraRef}
          followUserLocation={followMe}
          defaultSettings={{
            centerCoordinate: WORLD_CENTER,
            zoomLevel: WORLD_ZOOM,
          }}
        />

        {pos && (
          <PointAnnotation id="me" coordinate={[pos.lon, pos.lat]}>
            <View style={styles.meDot} />
          </PointAnnotation>
        )}

        {routeFeature && (
          <ShapeSource id="route" shape={routeFeature}>
            <LineLayer
              id="routeLine"
              style={{
                lineWidth: 5,
                lineJoin: "round",
                lineCap: "round",
                lineColor: "#007AFF",
              }}
            />
          </ShapeSource>
        )}

        {waypoints.map((wp, index) => (
          <PointAnnotation key={wp.id} id={wp.id} coordinate={[wp.lon, wp.lat]}>
            <View style={styles.wpMarker}>
              <Text style={styles.wpText}>{index + 1}</Text>
            </View>
          </PointAnnotation>
        ))}
      </MapView>

      <View style={styles.overlay}>
        <View style={{ flex: 1 }}>
          <Text style={styles.text}>{message}</Text>
          <Text style={styles.subText}>
            Zoom: {zoomLevel.toFixed(1)} • Follow: {followMe ? "ON" : "OFF"}
          </Text>
        </View>

        {busy ? (
          <ActivityIndicator />
        ) : (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable style={styles.btn} onPress={zoomOut}>
              <Text style={styles.btnText}>-</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={zoomIn}>
              <Text style={styles.btnText}>+</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={centerOnMe} disabled={!pos}>
              <Text style={styles.btnText}>Me</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={reset}>
              <Text style={styles.btnText}>Reset</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  overlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  text: { fontSize: 14, fontWeight: "600" },
  subText: { fontSize: 12, opacity: 0.7, marginTop: 2 },

  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "black",
  },
  btnText: { color: "white", fontWeight: "700" },

  meDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "dodgerblue",
    borderColor: "white",
    borderWidth: 2,
  },

  wpMarker: {
    width: 24,
    height: 24,
    borderRadius: 10,
    backgroundColor: "#D0021B",
    borderColor: "white",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },

  wpText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },
});
