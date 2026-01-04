import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  searchNearbyOSM,
  type ExploreCategory,
  type ExplorePlace,
} from "../../services/overpassService";
import type { LonLat } from "../../types/mapTypes";
import { IconSymbol } from "../ui/icon-symbol";

type Props = {
  pos: LonLat | null;

  center: LonLat | null;
  centerLabel: string;
  onChangeCenter: (c: LonLat | null, label: string) => void;

  onResults: (places: ExplorePlace[]) => void;

  pinMode: boolean;
  onPinModeChange: React.Dispatch<React.SetStateAction<boolean>>;
};

type NominatimResult = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};

const CATS: { key: ExploreCategory; label: string }[] = [
  { key: "sights", label: "Sights" },
  { key: "restaurants", label: "Restaurants" },
  { key: "cafes", label: "Cafés" },
  { key: "hotels", label: "Hotels" },
  { key: "nature", label: "Nature" },
];

const DEFAULT_SELECTED: ExploreCategory[] = ["sights", "restaurants", "cafes"];
const DEFAULT_RADIUS_KM = "2";

export function ExploreDropdown({
  pos,
  center,
  centerLabel,
  onChangeCenter,
  onResults,
  pinMode,
  onPinModeChange,

}: Props) {
  const SAFE_TOP_OFFSET =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 24 : 72;

  const [open, setOpen] = useState(false);

  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [selected, setSelected] = useState<ExploreCategory[]>(DEFAULT_SELECTED);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startQuery, setStartQuery] = useState("");
  const [startBusy, setStartBusy] = useState(false);
  const [startResults, setStartResults] = useState<NominatimResult[]>([]);

  const radiusMeters = useMemo(() => {
    const km = Number(radiusKm);
    if (!Number.isFinite(km) || km <= 0) return 1000;
    return Math.min(Math.max(km * 1000, 100), 20000);
  }, [radiusKm]);

  const openSheet = () => {
    setOpen(true);
    setError(null);
    if (!center && pos) onChangeCenter(pos, "Current location");
  };

  const closeSheet = () => {
    setOpen(false);
    setBusy(false);
    setError(null);
    setStartQuery("");
    setStartResults([]);
    setStartBusy(false);
  };

  const toggleCat = (c: ExploreCategory) => {
    setSelected((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const useCurrent = () => {
    if (!pos) return;
    onChangeCenter(pos, "Current location");
    setStartResults([]);
    setStartQuery("");
    setError(null);
  };

  const pickStartResult = (r: NominatimResult) => {
    const lat = Number(r.lat);
    const lon = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    onChangeCenter({ lat, lon }, r.display_name);
    setStartResults([]);
    setStartQuery("");
    setError(null);
  };

  const clearAll = () => {
    setError(null);
    setBusy(false);
    setStartQuery("");
    setStartResults([]);
    setStartBusy(false);

    onResults([]); 
    onChangeCenter(pos ?? null, pos ? "Current location" : ""); 

    setRadiusKm(DEFAULT_RADIUS_KM);
    setSelected(DEFAULT_SELECTED);
  };

  useEffect(() => {
    if (!open) return;

    const q = startQuery.trim();
    if (q.length < 3) {
      setStartResults([]);
      setStartBusy(false);
      return;
    }

    setStartBusy(true);

    const t = setTimeout(async () => {
      try {
        const url =
          `https://nominatim.openstreetmap.org/search?` +
          `format=json&addressdetails=0&limit=6&accept-language=en&q=` +
          encodeURIComponent(q);

        const res = await fetch(url, {
          headers: { "User-Agent": "gps-app-student-project" },
        });

        if (!res.ok) throw new Error(`Search failed (${res.status})`);

        const data = (await res.json()) as NominatimResult[];
        setStartResults(data ?? []);
      } catch {
        setStartResults([]);
      } finally {
        setStartBusy(false);
      }
    }, 450);

    return () => clearTimeout(t);
  }, [startQuery, open]);

  const runSearch = async () => {
    if (!center) {
      setError("Choose a start location first.");
      return;
    }
    if (!selected.length) {
      setError("Pick at least 1 category.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const data = await searchNearbyOSM({
        center: { lat: center.lat, lon: center.lon },
        radiusMeters,
        categories: selected,
        limit: 400,
        withDistance: true,
      });
      onResults(data);
    } catch (e: any) {
      onResults([]);
      setError(e?.message ?? "Explore failed");
    } finally {
      setBusy(false);
    }
  };

  return (
   <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
    {!open && (
      <Pressable
        style={[styles.fab, { top: SAFE_TOP_OFFSET + 80, left: 12 }]}
        onPress={openSheet}
        hitSlop={12}
      >
        <IconSymbol
          name="location.magnifyingglass"
          size={20}
          color="white"
        />
      </Pressable>
    )}
 
      {open && (
        <View style={[styles.sheet, { top: SAFE_TOP_OFFSET }]} pointerEvents="auto">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Explore</Text>
            <Pressable onPress={closeSheet} hitSlop={10}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          {/* Start Card */}
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>Start</Text>
              <Text numberOfLines={1} style={styles.cardValue}>
                {center
                    ? `${centerLabel || "Pinned location"} (${center.lat.toFixed(5)}, ${center.lon.toFixed(5)})`
                    : "Not set"}
                </Text>

            </View>

            <TextInput
              value={startQuery}
              onChangeText={setStartQuery}
              placeholder="Search start location…"
              autoCorrect={false}
              autoCapitalize="none"
              style={styles.input}
            />

            <View style={styles.startActions}>
              <Pressable
                style={[styles.smallBtn, !pos && styles.btnDisabled]}
                onPress={useCurrent}
                disabled={!pos}
              >
                <Text style={styles.smallBtnText}>Me</Text>
              </Pressable>

              <Pressable
                style={[
                    styles.smallBtn,
                    pinMode && styles.smallBtnPinActive,
                    busy && styles.btnDisabled,
                ]}
                onPress={() => {
                    if (busy) return;
                    onPinModeChange(!pinMode);
                }}
                disabled={busy}
                >
                <Text
                    style={[
                    styles.smallBtnText,
                    pinMode && styles.smallBtnPinActiveText,
                    ]}
                >
                    {pinMode ? "Pin: tap map" : "Pin"}
                </Text>
                </Pressable>

              <Text style={styles.miniStatus}>{startBusy ? "…" : ""}</Text>
            </View>

            {startResults.length > 0 && (
              <View style={styles.resultsBox}>
                {startResults.map((r) => (
                  <Pressable
                    key={r.place_id}
                    onPress={() => pickStartResult(r)}
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

          {/* Radius */}
          <View style={styles.row}>
            <Text style={styles.label}>Radius (km)</Text>
            <TextInput
              value={radiusKm}
              onChangeText={setRadiusKm}
              keyboardType="numeric"
              style={styles.radiusInput}
              placeholder="2"
            />
          </View>

          {/* Categories */}
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.chipsRow}>
            {CATS.map((c) => {
              const on = selected.includes(c.key);
              return (
                <Pressable
                  key={c.key}
                  onPress={() => toggleCat(c.key)}
                  style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
                >
                  <Text style={[styles.chipText, on ? styles.chipTextOn : styles.chipTextOff]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          {/* Bottom actions */}
          <View style={styles.bottomBar}>
            <Pressable
              style={[styles.bottomBtn, styles.bottomBtnLight]}
              onPress={clearAll}
              disabled={busy}
            >
              <Text style={[styles.bottomBtnText, styles.bottomBtnTextDark]}>Clear</Text>
            </Pressable>

            <Pressable
              style={[styles.bottomBtn, styles.bottomBtnDark, (busy || !center) && styles.btnDisabled]}
              onPress={runSearch}
              disabled={busy || !center}
            >
              <Text style={[styles.bottomBtnText, styles.bottomBtnTextLight]}>
                {busy ? "Searching…" : "Search"}
              </Text>
            </Pressable>
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

  startActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  smallBtn: {
    backgroundColor: "black",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  smallBtnText: { color: "white", fontWeight: "900" },
  miniStatus: { marginLeft: "auto", width: 18, textAlign: "center", opacity: 0.7 },

  resultsBox: {
    marginTop: 10,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  smallBtnOn: {
  backgroundColor: "#111827",
},
smallBtnPinActive: { backgroundColor: "#DC2626" },
smallBtnPinActiveText: { color: "white" },


  resultItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.10)",
  },
  resultText: { fontSize: 13 },

  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  label: { width: 86, opacity: 0.8, fontWeight: "800" },
  radiusInput: {
    width: 80,
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.12)",
  },
 
  sectionTitle: { marginTop: 6, marginBottom: 8, fontWeight: "900", opacity: 0.8 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 },
  chipOn: { backgroundColor: "black" },
  chipOff: { backgroundColor: "white", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(0,0,0,0.12)" },
  chipText: { fontWeight: "900" },
  chipTextOn: { color: "white" },
  chipTextOff: { color: "black" },

  error: { color: "crimson", fontWeight: "800", marginBottom: 10 },

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
