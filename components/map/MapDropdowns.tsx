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
import { IconSymbol } from "../ui/icon-symbol";

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
        style={[styles.fab, { top: SAFE_TOP_OFFSET +8, left: 12 }]}
        onPress={openSheet}
        hitSlop={12}
      >
        <IconSymbol
          name="globe.europe.africa.fill"
          size={20}
          color="white"
        />
      </Pressable>
    )}


      {open && (
        <View style={[styles.sheet, { top: SAFE_TOP_OFFSET }]} pointerEvents="auto">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Waypoints</Text>
            <Pressable onPress={closeSheet} hitSlop={10}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          {/* Search Card */}
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>Add</Text>
              <Text numberOfLines={1} style={styles.cardValue}>
                Search a location
              </Text>
            </View>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search location…"
              autoCorrect={false}
              autoCapitalize="none"
              style={styles.input}
            />

            <View style={styles.inlineStatusRow}>
              <Text style={styles.miniStatus}>{searchBusy ? "…" : ""}</Text>
            </View>

            {results.length > 0 && (
              <View style={styles.resultsBox}>
                {results.map((r) => (
                  <Pressable
                    key={r.place_id}
                    onPress={() => pickResult(r)}
                    style={styles.resultItem}
                  >
                    <Text numberOfLines={2} style={styles.resultText}>
                      {r.display_name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Waypoints list (Card) */}
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>List</Text>
              <Text numberOfLines={1} style={styles.cardValue}>
                {waypoints.length ? `${waypoints.length} waypoint(s)` : "No waypoints yet"}
              </Text>
            </View>

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
                      style={[styles.iconBtn, (busy || index === 0) && styles.btnDisabled]}
                      hitSlop={8}
                    >
                      <Text style={styles.iconBtnText}>↑</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => onMoveDown(index)}
                      disabled={busy || index === waypoints.length - 1}
                      style={[
                        styles.iconBtn,
                        (busy || index === waypoints.length - 1) && styles.btnDisabled,
                      ]}
                      hitSlop={8}
                    >
                      <Text style={styles.iconBtnText}>↓</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => onRemove(index)}
                      disabled={busy}
                      style={[styles.iconBtn, busy && styles.btnDisabled]}
                      hitSlop={8}
                    >
                      <Text style={styles.iconBtnText}>✕</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            />
          </View>

          {/* Bottom actions */}
          <View style={styles.bottomBar}>
            <Pressable
              onPress={onReset}
              disabled={busy}
              style={[styles.bottomBtn, styles.bottomBtnLight, busy && styles.btnDisabled]}
            >
              <Text style={[styles.bottomBtnText, styles.bottomBtnTextDark]}>Reset</Text>
            </Pressable>

            <Pressable
              onPress={onSaveRoute}
              disabled={!canSaveRoute || busy}
              style={[
                styles.bottomBtn,
                styles.bottomBtnDark,
                (!canSaveRoute || busy) && styles.btnDisabled,
              ]}
            >
              <Text style={[styles.bottomBtnText, styles.bottomBtnTextLight]}>Save</Text>
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
          style={[styles.fabWide, { bottom: SAFE_BOTTOM_OFFSET }]}
          onPress={openSheet}
          hitSlop={12}
        >
          <IconSymbol
            name="gearshape.fill"
            size={20}
            color="white"
          />
        </Pressable>
      )}


      {open && (
        <View style={[styles.sheet, { bottom: SAFE_BOTTOM_OFFSET }]} pointerEvents="auto">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Map</Text>
            <Pressable onPress={closeSheet} hitSlop={10}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          {/* Overlay content (Card) */}
          <View style={styles.card}>
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
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.80)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  fabWide: {
    position: "absolute",
    alignSelf: "center",
    width: 52,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.80)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  fabText: { color: "white", fontSize: 20, fontWeight: "900" },

  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    backgroundColor: "rgba(245,245,245,0.98)",
    borderRadius: 16,
    padding: 12,
    zIndex: 9999,
    elevation: 9999,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: "900" },
  close: { fontWeight: "900", opacity: 0.7 },

  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.10)",
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  cardLabel: { width: 44, opacity: 0.8, fontWeight: "800" },
  cardValue: { flex: 1, fontWeight: "900" },

  input: {
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.10)",
  },

  inlineStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  miniStatus: { marginLeft: "auto", width: 18, textAlign: "center", opacity: 0.7 },

  // Results (Explore-like)
  resultsBox: {
    marginTop: 10,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  resultItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.10)",
  },
  resultText: { fontSize: 13 },

  // Waypoints list rows
  empty: { paddingVertical: 8, opacity: 0.7 },

  wpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  wpText: { flex: 1, marginRight: 10 },

  wpActions: { flexDirection: "row", gap: 8 },

  iconBtn: {
    backgroundColor: "black",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { color: "white", fontWeight: "900" },

  // Bottom bar buttons (Explore-like)
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  bottomBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBtnDark: { backgroundColor: "black" },
  bottomBtnLight: {
    backgroundColor: "white",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.15)",
  },
  bottomBtnText: { fontWeight: "900" },
  bottomBtnTextLight: { color: "white" },
  bottomBtnTextDark: { color: "black" },

  btnDisabled: { opacity: 0.5 },
});
