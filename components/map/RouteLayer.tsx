import React from "react";
import MapLibreGL from "@maplibre/maplibre-react-native";
import type { RouteFeature } from "../../types/mapTypes";

type Props = {
  feature: RouteFeature;
  idPrefix?: string;
  variant?: "current" | "saved";
};

export function RouteLayer({ feature, idPrefix = "route", variant = "current" }: Props) {
  const sourceId = `${idPrefix}-route-source`;
  const layerId = `${idPrefix}-route-line`;
  const isSaved = variant === "saved";

  return (
    <MapLibreGL.ShapeSource id={sourceId} shape={feature as any}>
      <MapLibreGL.LineLayer
        id={layerId}
        style={{
          lineWidth: isSaved ? 5 : 6,
          lineJoin: "round",
          lineCap: "round",
          lineOpacity: isSaved ? 0.9 : 0.95,
          lineColor: isSaved ? "#6B7280" : "#2563EB",
        }}
      />
    </MapLibreGL.ShapeSource>
  );
}


  