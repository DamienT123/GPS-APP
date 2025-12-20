import React from "react";
import { ShapeSource, LineLayer } from "@maplibre/maplibre-react-native";
import type { RouteFeature } from "../../types/mapTypes";

export function RouteLayer({ feature }: { feature: RouteFeature }) {
  return (
    <ShapeSource id="route" shape={feature as any}>
      <LineLayer
        id="routeLine"
        style={{
          lineWidth: 5,
          lineJoin: "round",
          lineCap: "round",
          lineColor: "#007AFF",
        }}
      />
    </ShapeSource>
  );
}
