import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { MarkerView } from "@maplibre/maplibre-react-native";
import type { Waypoint } from "../../types/mapTypes";

export function WaypointMarker({ wp, index }: { wp: Waypoint; index: number }) {
  return (
    <MarkerView
      coordinate={[wp.lon, wp.lat]}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.wpMarker}>
        <Text style={styles.wpText}>{index + 1}</Text>
      </View>
    </MarkerView>
  );
}

const styles = StyleSheet.create({
  wpMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#D0021B",
    borderColor: "white",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",

    // elevation = Android
    elevation: 4,

    // shadow = iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  wpText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },
});
