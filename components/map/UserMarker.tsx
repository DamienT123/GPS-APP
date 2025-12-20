import React from "react";
import { View, StyleSheet } from "react-native";
import { PointAnnotation } from "@maplibre/maplibre-react-native";
import type { LonLat } from "../../types/mapTypes";

export function UserMarker({ pos }: { pos: LonLat }) {
  return (
    <PointAnnotation id="me" coordinate={[pos.lon, pos.lat]}>
      <View style={styles.meDot} />
    </PointAnnotation>
  );
}

const styles = StyleSheet.create({
  meDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "dodgerblue",
    borderColor: "white",
    borderWidth: 2,
  },
});
