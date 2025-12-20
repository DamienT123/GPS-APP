import React from "react";
import { View, StyleSheet, Text, Pressable, ActivityIndicator } from "react-native";

type Props = {
  message: string;
  zoomLevel: number;
  followMe: boolean;
  busy: boolean;
  canCenterOnMe: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onCenterOnMe: () => void;
  onReset: () => void;
};

export function MapOverlay({
  message,
  zoomLevel,
  followMe,
  busy,
  canCenterOnMe,
  onZoomOut,
  onZoomIn,
  onCenterOnMe,
  onReset,
}: Props) {
  return (
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
          <Pressable style={styles.btn} onPress={onZoomOut}>
            <Text style={styles.btnText}>-</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={onZoomIn}>
            <Text style={styles.btnText}>+</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={onCenterOnMe} disabled={!canCenterOnMe}>
            <Text style={styles.btnText}>Me</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={onReset}>
            <Text style={styles.btnText}>Reset</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
