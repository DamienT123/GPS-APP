import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";

export function StartupLoader({
  visible,
  durationMs = 10_000,
  title = "Route App (dev)",
  version = "V0.0.1",
}: {
  visible: boolean;
  durationMs?: number;
  title?: string;
  version?: string;
}) {
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    fill.setValue(0);
    Animated.timing(fill, {
      toValue: 1,
      duration: durationMs,
      useNativeDriver: false,
    }).start();
  }, [visible, durationMs, fill]);

  if (!visible) return null;

  const fillHeight = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 72],
  });

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.center}>
        <View style={styles.iconBox}>
          <IconSymbol name="globe.europe.africa.fill" size={72} color="rgba(0,0,0,0.35)" />
          <Animated.View style={[styles.fillMask, { height: fillHeight }]}>
            <View style={styles.whiteIconWrap}>
              <IconSymbol name="globe.europe.africa.fill" size={72} color="white" />
            </View>
          </Animated.View>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.version}>{version}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0B0B0D",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999999,
    elevation: 999999,
  },
  center: {
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  fillMask: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 10,
    overflow: "hidden",
  },
  whiteIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
  },
  title: {
    color: "white",
    fontWeight: "900",
    fontSize: 18,
    marginTop: 6,
  },
  version: {
    color: "rgba(255,255,255,0.70)",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
