import React, { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Waypoint } from "../../types/mapTypes";
import { MapOverlay } from "./MapOverlay";

type TopWaypointsDropdownProps = {
  waypoints: Waypoint[];
  busy: boolean;

  onAddWaypoint: (data: { lon: number; lat: number; region?: string; country?: string }) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;

  onReset: () => void;
  onSaveRoute: () => void;
  canSaveRoute: boolean;
};

type NominatimResult = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    country?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
  };
};

export function TopWaypointsDropdown({
  waypoints,
  busy,
  onMoveUp,
  onMoveDown,
  onRemove,
  onAddWaypoint,
  onReset,
  onSaveRoute,
  canSaveRoute,
}: TopWaypointsDropdownProps) {
  const SAFE_TOP_OFFSET =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 24 : 72;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [results, setResults] = useState<NominatimResult[]>([]);

  const openSheet = () => setOpen(true);
  const closeSheet = () => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSearchBusy(false);
  };

  const getCityFromAddress = (a?: NominatimResult["address"]) => {
    if (!a) return undefined;
    return a.city || a.town || a.village || a.municipality || a.county || a.state;
  };

  const pickResult = (r: NominatimResult) => {
    const lat = Number(r.lat);
    const lon = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const city = getCityFromAddress(r.address);
    const country = r.address?.country;

    onAddWaypoint({ lon, lat, region: city, country });

    setResults([]);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;

    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearchBusy(false);
      return;
    }

    setSearchBusy(true);

    const t = setTimeout(async () => {
      try {
        const url =
          `https://nominatim.openstreetmap.org/search?` +
          `format=json&addressdetails=1&limit=6&accept-language=en&q=` +
          encodeURIComponent(q);

        const res = await fetch(url, {
          headers: { "User-Agent": "gps-app-student-project" },
        });

        if (!res.ok) throw new Error(`Search failed (${res.status})`);

        const data = (await res.json()) as NominatimResult[];
        setResults(data ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearchBusy(false);
      }
    }, 450);

    return () => clearTimeout(t);
  }, [query, open]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {!open && (
        <Pressable
          style={[styles.topIconBtn, { top: SAFE_TOP_OFFSET, left: 12 }]}
          onPress={openSheet}
          hitSlop={12}
        >
          <Text style={styles.iconText}>🌍</Text>
        </Pressable>
      )}

      {open && (
        <View style={[styles.topPanel, { top: SAFE_TOP_OFFSET }]} pointerEvents="auto">
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search location…"
              autoCorrect={false}
              autoCapitalize="none"
              style={styles.searchInput}
            />
            <Text style={styles.searchStatus}>{searchBusy ? "…" : ""}</Text>
          </View>

          {results.length > 0 && (
            <View style={styles.resultsBox}>
              {results.map((r) => (
                <Pressable key={r.place_id} onPress={() => pickResult(r)} style={styles.resultItem}>
                  <Text numberOfLines={2} style={styles.resultText}>
                    {r.display_name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <FlatList
            data={waypoints}
            keyExtractor={(w) => w.id}
            ListEmptyComponent={<Text style={styles.empty}>No waypoints yet.</Text>}
            renderItem={({ item, index }) => (
              <View style={styles.wpRow}>
                <Text style={styles.wpText}>
                  {index + 1}.{" "}
                  {item.country
                    ? item.region
                      ? `${item.region}, ${item.country}`
                      : item.country
                    : `${item.lat.toFixed(5)}, ${item.lon.toFixed(5)}`}
                </Text>

                <View style={styles.wpActions}>
                  <Pressable
                    onPress={() => onMoveUp(index)}
                    disabled={busy || index === 0}
                    style={[styles.wpBtn, (busy || index === 0) && styles.wpBtnDisabled]}
                  >
                    <Text style={styles.wpBtnText}>↑</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => onMoveDown(index)}
                    disabled={busy || index === waypoints.length - 1}
                    style={[
                      styles.wpBtn,
                      (busy || index === waypoints.length - 1) && styles.wpBtnDisabled,
                    ]}
                  >
                    <Text style={styles.wpBtnText}>↓</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => onRemove(index)}
                    disabled={busy}
                    style={[styles.wpBtn, busy && styles.wpBtnDisabled]}
                  >
                    <Text style={styles.wpBtnText}>✕</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />

          <View style={styles.topActionsRow}>
            <Pressable
              onPress={onSaveRoute}
              disabled={!canSaveRoute || busy}
              style={[styles.actionBtn, (!canSaveRoute || busy) && styles.actionBtnDisabled]}
            >
              <Text style={styles.actionBtnText}>Save</Text>
            </Pressable>

            <Pressable
              onPress={onReset}
              disabled={busy}
              style={[styles.actionBtn, busy && styles.actionBtnDisabled]}
            >
              <Text style={styles.actionBtnText}>Reset</Text>
            </Pressable>
          </View>

          <View style={styles.closeArea}>
            <Pressable style={styles.closeBtn} onPress={closeSheet} hitSlop={12}>
              <Text style={styles.iconText}>🌍</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

type BottomRouteDropdownProps = {
  message: string;
  zoomLevel: number;
  followMe: boolean;
  busy: boolean;
  canCenterOnMe: boolean;

  onZoomOut: () => void;
  onZoomIn: () => void;
  onCenterOnMe: () => void;
};

export function BottomRouteDropdown(props: BottomRouteDropdownProps) {
  const SAFE_BOTTOM_OFFSET = 12;
  const [open, setOpen] = useState(false);

  const openSheet = () => setOpen(true);
  const closeSheet = () => setOpen(false);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {!open && (
        <Pressable
          style={[styles.bottomIconBtn, { bottom: SAFE_BOTTOM_OFFSET }]}
          onPress={openSheet}
          hitSlop={12}
        >
          <Text style={styles.iconText}>⚙️</Text>
        </Pressable>
      )}

      {open && (
        <View style={[styles.bottomPanel, { bottom: SAFE_BOTTOM_OFFSET }]} pointerEvents="auto">
          <MapOverlay
            message={props.message}
            zoomLevel={props.zoomLevel}
            followMe={props.followMe}
            busy={props.busy}
            canCenterOnMe={props.canCenterOnMe}
            onZoomOut={props.onZoomOut}
            onZoomIn={props.onZoomIn}
            onCenterOnMe={props.onCenterOnMe}
          />

          <View style={styles.closeArea}>
            <Pressable style={styles.closeBtn} onPress={closeSheet} hitSlop={12}>
              <Text style={styles.iconText}>⚙️</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topIconBtn: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },

  bottomIconBtn: {
    position: "absolute",
    alignSelf: "center",
    width: 52,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },

  iconText: {
    color: "white",
    fontSize: 20,
    fontWeight: "900",
  },

  topPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "rgba(200,200,200,0.95)",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 9999,
    elevation: 9999,
  },

  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "rgba(200,200,200,0.95)",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 9999,
    elevation: 9999,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  searchInput: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  searchStatus: {
    width: 18,
    textAlign: "center",
    opacity: 0.8,
  },

  resultsBox: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
  },

  resultItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.15)",
  },

  resultText: {
    fontSize: 13,
  },

  empty: {
    paddingVertical: 8,
    opacity: 0.7,
  },

  wpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  wpText: {
    flex: 1,
    marginRight: 8,
  },

  wpActions: {
    flexDirection: "row",
    gap: 6,
  },

  wpBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "black",
  },

  wpBtnDisabled: {
    opacity: 0.35,
  },

  wpBtnText: {
    color: "white",
    fontWeight: "700",
  },

  topActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },

  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
  },

  actionBtnDisabled: {
    opacity: 0.35,
  },

  actionBtnText: {
    color: "white",
    fontWeight: "800",
  },

  closeArea: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 6,
  },

  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
});
