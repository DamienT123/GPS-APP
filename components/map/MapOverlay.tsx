
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

  onReset?: () => void;

  onSaveRoute?: () => void;
  canSaveRoute?: boolean;
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
  onSaveRoute,
  canSaveRoute = false,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.text}>{message}</Text>
        <Text style={styles.subText}>
          Zoom: {zoomLevel.toFixed(1)} • Follow: {followMe ? "ON" : "OFF"}
        </Text>
      </View>

      {busy ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={onZoomOut}>
            <Text style={styles.btnText}>-</Text>
          </Pressable>

          <Pressable style={styles.btn} onPress={onZoomIn}>
            <Text style={styles.btnText}>+</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, !canCenterOnMe && styles.btnDisabled]}
            onPress={onCenterOnMe}
            disabled={!canCenterOnMe}
          >
            <Text style={styles.btnText}>Me</Text>
          </Pressable>

          {onSaveRoute && (
              <Pressable
                style={[styles.btn, !canSaveRoute && styles.btnDisabled]}
                onPress={onSaveRoute}
                disabled={!canSaveRoute}
              >
                <Text style={styles.btnText}>Save</Text>
              </Pressable>
            )}

            {onReset && (
              <Pressable style={styles.btn} onPress={onReset}>
                <Text style={styles.btnText}>Reset</Text>
              </Pressable>
            )}


          
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  info: {
    flex: 1,
  },

  text: { fontSize: 14, fontWeight: "600" },
  subText: { fontSize: 12, opacity: 0.7, marginTop: 2 },

  row: { flexDirection: "row", gap: 8 },

  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "black",
  },
  btnDisabled: {
    opacity: 0.35,
  },

  btnText: { color: "white", fontWeight: "700" },
});
