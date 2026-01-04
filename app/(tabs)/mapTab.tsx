import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  View,
  StyleSheet,
  Modal,
  Pressable,
  Text,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";

import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, ME_ZOOM } from "../../config/mapConfig";
import { useLiveLocation } from "../../hooks/useLiveLocation";
import { buildRoute, snapToRoad } from "../../services/osrmService";
import type { Waypoint, RouteFeature, LonLat } from "../../types/mapTypes";

import { MapCanvas } from "../../components/map/MapCanvas";
import { TopWaypointsDropdown, BottomRouteDropdown } from "../../components/map/MapDropdowns";
import { ExploreDropdown } from "../../components/map/ExploreDropdown";

import { createRoute, saveRoute, listRoutes } from "../../services/routesSql";
import type { SavedRoute } from "../../services/routesSql";

import {
  formatAddress,
  pickUsefulInfo,
  type ExplorePlace,
  describePlaceType,
  reverseGeocodeOSM,
  bestCityFromContext,
} from "../../services/overpassService";

export default function MapScreen() {
  const cameraRef = useRef<any>(null);

  const { pos, error } = useLiveLocation();

  const [placeCtx, setPlaceCtx] = useState<Record<string, any>>({});

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeFeature, setRouteFeature] = useState<RouteFeature | null>(null);

  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [followMe, setFollowMe] = useState(false);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Hold on the map to add waypoints.");

  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);
  const [savedRouteOverlay, setSavedRouteOverlay] = useState<SavedRoute | null>(null);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [routeNameDraft, setRouteNameDraft] = useState("");

  const [exploreCenter, setExploreCenter] = useState<LonLat | null>(null);
  const [exploreCenterLabel, setExploreCenterLabel] = useState<string>("");

  const [explorePlaces, setExplorePlaces] = useState<ExplorePlace[]>([]);
  const [selectedExplore, setSelectedExplore] = useState<ExplorePlace | null>(null);

  const [explorePinMode, setExplorePinMode] = useState(false);

  const refreshSavedRoutes = () => {
    try {
      const data = listRoutes();
      setSavedRoutes(data);
    } catch (e) {
      console.log("listRoutes failed:", e);
    }
  };

  const openUrl = async (url: string) => {
    try {
      const safeUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
      const ok = await Linking.canOpenURL(safeUrl);
      if (ok) await Linking.openURL(safeUrl);
    } catch (e) {
      console.log("openUrl failed:", e);
    }
  };

  const ensurePlaceCtx = async (p: ExplorePlace) => {
    let already: boolean | undefined = undefined;

    setPlaceCtx((prev) => {
      already = prev[p.id] !== undefined;
      if (already) return prev;
      return { ...prev, [p.id]: "__loading__" };
    });

    if (already) return;

    try {
      const ctx = await reverseGeocodeOSM(p.lat, p.lon);
      setPlaceCtx((prev) => ({ ...prev, [p.id]: ctx }));
    } catch {
      setPlaceCtx((prev) => ({ ...prev, [p.id]: null }));
    }
  };

  const googleSearchUrl = (p: ExplorePlace) => {
    const parts: string[] = [];

    if (p.name) parts.push(p.name);

    const address = formatAddress(p.tags);
    if (address) parts.push(address);

    const ctx = placeCtx[p.id];
    const usableCtx = ctx && ctx !== "__loading__" ? ctx : null;

    const cityFromCtx = bestCityFromContext(usableCtx);
    const countryFromCtx = (usableCtx?.country ?? "").trim();

    if (!address) {
      const tagCity =
        p.tags["addr:city"] ||
        p.tags["is_in:city"] ||
        p.tags["addr:municipality"] ||
        p.tags["addr:county"] ||
        p.tags["addr:state"];

      const tagCountry = p.tags["addr:country"] || p.tags["is_in:country"];

      const finalCity = (tagCity || cityFromCtx || "").trim();
      const finalCountry = (tagCountry || countryFromCtx || "").trim();

      if (finalCity) parts.push(finalCity);
      if (finalCountry) parts.push(finalCountry);
    }

    return `https://www.google.com/search?q=${encodeURIComponent(parts.join(" "))}`;
  };

  useEffect(() => {
    refreshSavedRoutes();
  }, []);

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
      setMessage(pts.length === 1 ? "Add one more waypoint to create a route." : "Hold on the map to add waypoints.");
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
        animationDuration: 350,
      });

      await recalcRouteFor(next);
    } catch (err: any) {
      setRouteFeature(null);
      setMessage(err?.message ?? "OSRM error");
    } finally {
      setBusy(false);
    }
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
        animationDuration: 350,
      });

      await recalcRouteFor(next);
    } catch (err: any) {
      setRouteFeature(null);
      setMessage(err?.message ?? "Search add failed");
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
    setMessage("Reset. Hold on the map to add waypoints.");
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

  const openSaveModal = () => {
    if (!routeFeature || waypoints.length < 2) {
      setMessage("Add at least 2 waypoints before saving.");
      return;
    }
    setRouteNameDraft(`Route ${new Date().toLocaleString()}`);
    setShowSaveModal(true);
  };

  const buildUniqueName = (draft: string) => {
    const base = draft.trim() || "Route";
    const existing = new Set(savedRoutes.map((r) => (r.name || "").trim().toLowerCase()));
    if (!existing.has(base.toLowerCase())) return base;

    let n = 2;
    while (existing.has(`${base} (${n})`.toLowerCase())) n += 1;
    return `${base} (${n})`;
  };

  const confirmSave = () => {
    try {
      if (!routeFeature || waypoints.length < 2) {
        setMessage("Add at least 2 waypoints before saving.");
        setShowSaveModal(false);
        return;
      }

      const uniqueName = buildUniqueName(routeNameDraft);
      const r = createRoute({
        name: uniqueName,
        profile: "walking",
        waypoints,
        routeFeature,
        ownerUid: null,
      });

      saveRoute(r);
      refreshSavedRoutes();
      setShowSaveModal(false);
      setMessage(`Saved as: ${uniqueName}`);

      Alert.alert("Route saved", `Saved as "${uniqueName}"`, [{ text: "OK" }]);
    } catch (e: any) {
      console.log("confirmSave failed:", e);
      setMessage(e?.message ?? "Save failed");
      Alert.alert("Save failed", e?.message ?? "Save failed", [{ text: "OK" }]);
    }
  };

  const overlayActive = !!savedRouteOverlay;

  const openSavedRoutes = () => {
    refreshSavedRoutes();
    setShowSavedRoutes(true);
  };

  const chooseSavedRoute = (r: SavedRoute) => {
    setSavedRouteOverlay(r);
    setShowSavedRoutes(false);

    const coords = r.routeFeature?.geometry?.coordinates ?? [];
    if (coords.length >= 2) {
      const lons = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      cameraRef.current?.fitBounds([minLon, minLat], [maxLon, maxLat], 60, 600);
    }
  };

  const clearOverlay = () => setSavedRouteOverlay(null);

  return (
    <View style={styles.container}>
      <MapCanvas
        cameraRef={cameraRef}
        pos={pos}
        waypoints={waypoints}
        routeFeature={routeFeature}
        savedRouteFeature={savedRouteOverlay?.routeFeature ?? null}
        savedRouteWaypoints={savedRouteOverlay?.waypoints ?? []}
        exploreCenter={exploreCenter}
        explorePlaces={explorePlaces.map((p) => ({
          id: p.id,
          name: p.name,
          lon: p.lon,
          lat: p.lat,
          category: p.category,
        }))}
        onExplorePlacePress={(p) => {
          stopFollowing();

          cameraRef.current?.setCamera({
            centerCoordinate: [p.lon, p.lat],
            animationDuration: 350,
          });

          const full = explorePlaces.find((x) => x.id === p.id);
          if (full) {
            setSelectedExplore(full);
            ensurePlaceCtx(full);
          }
        }}
        onMapPress={(lon, lat) => {
          if (overlayActive) return;

          if (explorePinMode) {
            setExploreCenter({ lon, lat });
            setExploreCenterLabel(`Pinned location (${lat.toFixed(5)}, ${lon.toFixed(5)})`);
            setExplorePinMode(false);

            cameraRef.current?.setCamera({
              centerCoordinate: [lon, lat],
              animationDuration: 250,
            });
          }
        }}
        onMapLongPress={(lon, lat) => {
          if (overlayActive) return;

          if (explorePinMode) {
            setExploreCenter({ lon, lat });
            setExploreCenterLabel(`Pinned location (${lat.toFixed(5)}, ${lon.toFixed(5)})`);
            setExplorePinMode(false);

            cameraRef.current?.setCamera({
              centerCoordinate: [lon, lat],
              animationDuration: 250,
            });
            return;
          }

          addWaypointFromTap(lon, lat);
        }}
        onZoomChanged={(z) => {
          setZoomLevel(Math.round(z));
          if (followMe) setFollowMe(false);
        }}
      />

      <TopWaypointsDropdown
        waypoints={waypoints}
        busy={busy}
        onMoveUp={(i) => moveWaypoint(i, i - 1)}
        onMoveDown={(i) => moveWaypoint(i, i + 1)}
        onRemove={removeWaypoint}
        onAddWaypoint={addWaypointFromSearch}
        onReset={reset}
        onSaveRoute={openSaveModal}
        canSaveRoute={!!routeFeature && waypoints.length >= 2}
      />

      <ExploreDropdown
        pos={pos}
        center={exploreCenter}
        centerLabel={exploreCenterLabel}
        onChangeCenter={(c, label) => {
          setExploreCenter(c);
          setExploreCenterLabel(label);
          setExplorePinMode(false);
        }}
        onResults={(places) => {
          setExplorePlaces(places);
          if (exploreCenter) {
            cameraRef.current?.setCamera({
              centerCoordinate: [exploreCenter.lon, exploreCenter.lat],
              animationDuration: 200,
            });
          }
        }}
        pinMode={explorePinMode}
        onPinModeChange={setExplorePinMode}
      />

      <BottomRouteDropdown
        message={overlayActive ? `Viewing saved route: ${savedRouteOverlay?.name ?? ""}` : message}
        zoomLevel={zoomLevel}
        followMe={followMe}
        busy={busy}
        canCenterOnMe={!!pos}
        onZoomOut={zoomOut}
        onZoomIn={zoomIn}
        onCenterOnMe={centerOnMe}
      />

      <View style={styles.savedBar}>
        <Pressable style={styles.savedBtn} onPress={openSavedRoutes}>
          <Text style={styles.savedBtnText}>Saved routes</Text>
        </Pressable>
        <Pressable style={[styles.savedBtn, !overlayActive && { opacity: 0.4 }]} onPress={clearOverlay} disabled={!overlayActive}>
          <Text style={styles.savedBtnText}>Clear</Text>
        </Pressable>
      </View>

      <Modal visible={!!selectedExplore} transparent animationType="fade" onRequestClose={() => setSelectedExplore(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedExplore?.name ?? ""}</Text>

            {selectedExplore && (
              <>
                <Text style={{ marginTop: 6, opacity: 0.75 }}>
                  {formatAddress(selectedExplore.tags) || `${selectedExplore.lat.toFixed(5)}, ${selectedExplore.lon.toFixed(5)}`}
                </Text>

                {(() => {
                  const t = describePlaceType(selectedExplore.tags);
                  return (
                    <Text style={{ marginTop: 6, opacity: 0.9, fontWeight: "900" }}>
                      Type: {t.label}
                      {t.sourceKey ? ` (${t.sourceKey})` : ""}
                    </Text>
                  );
                })()}

                <View style={styles.linkRow}>
                  <Pressable style={[styles.linkBtn, styles.linkBtnDark]} onPress={() => openUrl(googleSearchUrl(selectedExplore))}>
                    <Text style={styles.linkBtnTextDark}>Google</Text>
                  </Pressable>
                </View>
              </>
            )}

            <View style={styles.saveActions}>
              <Pressable style={[styles.actionBtn, styles.actionSecondary]} onPress={() => setSelectedExplore(null)}>
                <Text style={[styles.actionText, styles.actionSecondaryText]}>Close</Text>
              </Pressable>

              <Pressable
                style={[styles.actionBtn, styles.actionPrimary]}
                onPress={() => {
                  if (!selectedExplore) return;

                  addWaypointFromSearch({
                    lon: selectedExplore.lon,
                    lat: selectedExplore.lat,
                    region: selectedExplore.name,
                    country: selectedExplore.tags["addr:country"] || selectedExplore.tags["is_in:country"],
                  });

                  const info = pickUsefulInfo(selectedExplore.tags);

                  setSelectedExplore(null);

                  if (info.website) {
                    Alert.alert("Added", "Added to route. Open website?", [
                      { text: "No" },
                      { text: "Open", onPress: () => openUrl(info.website!) },
                    ]);
                  } else {
                    Alert.alert("Added", "Added to route.", [{ text: "OK" }]);
                  }
                }}
              >
                <Text style={[styles.actionText, styles.actionPrimaryText]}>Add to route</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSavedRoutes} transparent animationType="fade" onRequestClose={() => setShowSavedRoutes(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved routes</Text>
              <Pressable onPress={() => setShowSavedRoutes(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </Pressable>
            </View>

            <FlatList
              data={savedRoutes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable style={styles.routeRow} onPress={() => chooseSavedRoute(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeName}>{item.name}</Text>
                    <Text style={styles.routeSub}>
                      {new Date(item.createdAt).toLocaleString()} • {item.profile}
                    </Text>
                    {typeof item.distanceMeters === "number" && (
                      <Text style={styles.routeSub}>{(item.distanceMeters / 1000).toFixed(2)} km</Text>
                    )}
                  </View>
                  <Text style={styles.routePick}>Show</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={{ opacity: 0.7 }}>No saved routes yet.</Text>}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showSaveModal} transparent animationType="fade" onRequestClose={() => setShowSaveModal(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.saveCard}>
            <Text style={styles.modalTitle}>Save route</Text>

            <TextInput
              value={routeNameDraft}
              onChangeText={setRouteNameDraft}
              placeholder="Route name"
              style={styles.input}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={confirmSave}
            />

            <View style={styles.saveActions}>
              <Pressable style={[styles.actionBtn, styles.actionSecondary]} onPress={() => setShowSaveModal(false)}>
                <Text style={[styles.actionText, styles.actionSecondaryText]}>Cancel</Text>
              </Pressable>

              <Pressable style={[styles.actionBtn, styles.actionPrimary]} onPress={confirmSave}>
                <Text style={[styles.actionText, styles.actionPrimaryText]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  savedBar: {
    position: "absolute",
    top: 56,
    right: 12,
    flexDirection: "row",
    gap: 10,
  },
  savedBtn: {
    backgroundColor: "black",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  savedBtnText: { color: "white", fontWeight: "700" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    maxHeight: "70%",
  },
  saveCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: "800" },
  modalClose: { fontWeight: "800", opacity: 0.8 },

  routeRow: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  routeName: { fontSize: 14, fontWeight: "800" },
  routeSub: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  routePick: { fontWeight: "900" },

  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  saveActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionText: { fontWeight: "800" },
  actionPrimary: { backgroundColor: "black" },
  actionPrimaryText: { color: "white" },
  actionSecondary: { backgroundColor: "#f2f2f2" },
  actionSecondaryText: { color: "black" },

  linkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  linkBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linkBtnDark: { backgroundColor: "black" },
  linkBtnTextDark: { color: "white", fontWeight: "900" },
});
