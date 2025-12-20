import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { PointAnnotation } from "@maplibre/maplibre-react-native";
import type { Waypoint } from "../../types/mapTypes";

export function WaypointMarker({ wp, index }: { wp: Waypoint; index: number }) {
  return (
    <PointAnnotation id={wp.id} coordinate={[wp.lon, wp.lat]}>
      <View style={styles.wpMarker}>
        <Text style={styles.wpText}>{index + 1}</Text>
      </View>
    </PointAnnotation>
  );
}

const styles = StyleSheet.create({
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
