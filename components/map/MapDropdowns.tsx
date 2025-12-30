import React, { useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
} from "react-native";
import type { Waypoint } from "../../types/mapTypes";
import { MapOverlay } from "./MapOverlay";

type TopWaypointsDropdownProps = {
  waypoints: Waypoint[];
  busy: boolean;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
};
export function TopWaypointsDropdown({
  waypoints,
  busy,
  onMoveUp,
  onMoveDown,
  onRemove,
}: TopWaypointsDropdownProps) {
  const SAFE_TOP_OFFSET =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 24 : 72;

  const [open, setOpen] = useState(false);

  const openSheet = () => setOpen(true);
  const closeSheet = () => setOpen(false);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {open && (
        <Pressable style={styles.backdrop} onPress={closeSheet} />
      )}

      {!open && (
        <Pressable
          style={[styles.menuBtn, { top: SAFE_TOP_OFFSET, left: 12 }]}
          onPress={openSheet}
          hitSlop={12}
        >
          <Text style={styles.menuBtnText}>🌍</Text>
        </Pressable>
      )}

      {open && (
        <View style={[styles.topBody, { top: SAFE_TOP_OFFSET }]}>
          <FlatList
            data={waypoints}
            keyExtractor={(w) => w.id}
            ListEmptyComponent={<Text style={styles.empty}>No waypoints yet.</Text>}
            renderItem={({ item, index }) => (
              <View style={styles.wpRow}>
                <Text style={styles.wpText}>
                  {index + 1}. {item.lat.toFixed(5)}, {item.lon.toFixed(5)}
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

          <View style={styles.closeArea}>
            <Pressable style={styles.closeBtn} onPress={closeSheet} hitSlop={12}>
              <Text style={styles.menuBtnText}>X</Text>
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
  canSaveRoute: boolean;

  onZoomOut: () => void;
  onZoomIn: () => void;
  onCenterOnMe: () => void;
  onReset: () => void;
  onSaveRoute: () => void;
};

export function BottomRouteDropdown(props: BottomRouteDropdownProps) {
  const SAFE_BOTTOM_OFFSET = 12; // beetje marge boven iPhone home indicator

  const [open, setOpen] = useState(false);

  const openSheet = () => setOpen(true);
  const closeSheet = () => setOpen(false);
  const toggle = () => setOpen((v) => !v);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Blokkeert kaart-touches wanneer open */}
      {open && (
        <Pressable style={styles.backdrop} onPress={closeSheet} />
      )}

      {/* Toggle knop (altijd zichtbaar) */}
      {!open && (
        <Pressable
          style={[styles.bottomToggleBtn, { bottom: SAFE_BOTTOM_OFFSET }]}
          onPress={openSheet}
          hitSlop={12}
        >
          <Text style={styles.bottomToggleText}>⚙️</Text>
        </Pressable>
      )}

      {/* Panel (instant zichtbaar) */}
      {open && (
        <View style={[styles.bottomBody, { bottom: SAFE_BOTTOM_OFFSET }]}>
          <MapOverlay {...props} />

          <View style={styles.closeArea}>
            <Pressable style={styles.closeBtn} onPress={closeSheet} hitSlop={12}>
              <Text style={styles.menuBtnText}>X</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 40,
  },

  bottomToggleBtn: {
  position: "absolute",
  alignSelf: "center",
  width: 52,
  height: 44,
  borderRadius: 12,
  backgroundColor: "rgba(0,0,0,0.75)",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 60,
},

bottomToggleText: {
  color: "white",
  fontSize: 20,
  fontWeight: "900",
},

bottomBody: {
  position: "absolute",
  left: 0,
  right: 0,
  backgroundColor: "rgba(200,200,200,0.95)",
  paddingHorizontal: 12,
  paddingTop: 12,
  paddingBottom: 8,
  zIndex: 60,
},


  menuBtn: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 60,
  },

  menuBtnText: {
    color: "white",
    fontSize: 20,
    fontWeight: "900",
  },

  topBody: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "rgba(200,200,200,0.95)",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 60,
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


 

  topWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 50,
  },
 
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(200,200,200,0.92)",
  },

  handle: {
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(200,200,200,0.92)",
  },

  handleText: {
    fontWeight: "700",
  },

 
});
