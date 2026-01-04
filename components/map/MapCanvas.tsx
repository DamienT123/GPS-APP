import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { MapView, Camera, PointAnnotation } from "@maplibre/maplibre-react-native";

import { MAP_STYLE_URL, WORLD_CENTER, WORLD_ZOOM } from "../../config/mapConfig";
import type { LonLat, RouteFeature, Waypoint } from "../../types/mapTypes";
import { UserMarker } from "./UserMarker";
import { WaypointMarker } from "./WaypointMarker";
import { RouteLayer } from "./RouteLayer";

type ExploreCategory = "sights" | "hotels" | "nature" | "cafes" | "restaurants";

type ExplorePoint = {
  id: string;
  name: string;
  lon: number;
  lat: number;
  category?: ExploreCategory;
};

type Props = {
  cameraRef: React.RefObject<any>;
  pos: LonLat | null;

  

  waypoints: Waypoint[];
  routeFeature: RouteFeature | null;

  savedRouteFeature?: RouteFeature | null;
  savedRouteWaypoints?: Waypoint[];

  exploreCenter?: LonLat | null;
  explorePlaces?: ExplorePoint[];
  onExplorePlacePress?: (p: ExplorePoint) => void;

  onMapPress?: (lon: number, lat: number) => void;
  onMapLongPress?: (lon: number, lat: number) => void;
  onMapReady?: () => void;
  onZoomChanged?: (zoom: number) => void;
};

function exploreColor(cat?: ExploreCategory) {
  if (cat === "restaurants") return "#DC2626";
  if (cat === "cafes") return "#F59E0B";
  if (cat === "hotels") return "#8B5CF6";
  if (cat === "nature") return "#16A34A";
  return "#2563EB";
}

function exploreLabel(cat?: ExploreCategory) {
  if (cat === "restaurants") return "R";
  if (cat === "cafes") return "C";
  if (cat === "hotels") return "H";
  if (cat === "nature") return "N";
  return "★";
}

export function MapCanvas({
  cameraRef,
  pos,
  waypoints,
  routeFeature,
  savedRouteFeature = null,
  savedRouteWaypoints = [],
  exploreCenter = null,
  explorePlaces = [],
  onExplorePlacePress,
  onMapPress,
  onMapLongPress,
  onMapReady,
  onZoomChanged,
}: Props) {
  return (
    <MapView
      style={styles.map}
      mapStyle={MAP_STYLE_URL}
      onDidFinishLoadingMap={() => onMapReady?.()}
      onRegionDidChange={(e: any) => {
        const zoom =
          e?.properties?.zoomLevel ??
          e?.properties?.zoom ??
          e?.geometry?.zoomLevel;

        if (typeof zoom === "number") onZoomChanged?.(zoom);
      }}
      onPress={(e: any) => {
        const coords = e?.geometry?.coordinates;
        if (!coords) return;
        const [lon, lat] = coords as [number, number];
        onMapPress?.(lon, lat);
      }}
      onLongPress={(e: any) => {
        const coords = e?.geometry?.coordinates;
        if (!coords) return;
        const [lon, lat] = coords as [number, number];
        onMapLongPress?.(lon, lat);
      }}
    >
      <Camera
        ref={cameraRef}
        defaultSettings={{
          centerCoordinate: WORLD_CENTER,
          zoomLevel: WORLD_ZOOM,
        }}
      />

      {pos && <UserMarker pos={pos} />}

      {savedRouteFeature && <RouteLayer feature={savedRouteFeature} idPrefix="saved" variant="saved" />}

      {savedRouteWaypoints.map((wp, index) => (
        <PointAnnotation
          key={`saved-wp-${wp.id}-${index}`}
          id={`saved-wp-${wp.id}-${index}`}
          coordinate={[wp.lon, wp.lat]}
        >
          <View style={styles.savedDot} />
        </PointAnnotation>
      ))}

      {exploreCenter && (
        <PointAnnotation id="explore-center" coordinate={[exploreCenter.lon, exploreCenter.lat]}>
          <View style={styles.exploreCenterDot} />
        </PointAnnotation>
      )}

      {explorePlaces.map((p) => (
        <PointAnnotation
          key={p.id}
          id={`explore-${p.id}`}
          coordinate={[p.lon, p.lat]}
          onSelected={() => onExplorePlacePress?.(p)}
        >
          <View style={[styles.exploreDot, { backgroundColor: exploreColor(p.category) }]}>
            <Text style={styles.exploreDotText}>{exploreLabel(p.category)}</Text>
          </View>
        </PointAnnotation>
      ))}

      {routeFeature && <RouteLayer feature={routeFeature} idPrefix="current" variant="current" />}

      {waypoints.map((wp, index) => (
        <WaypointMarker key={wp.id} wp={wp} index={index} />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },

  savedDot: {
    width: 13,
    height: 13,
    borderRadius: 8,
    backgroundColor: "#6B7280",
    borderWidth: 2,
    borderColor: "#000000ff",
  },

  exploreCenterDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#111827",
    borderWidth: 4,
    borderColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },

  exploreDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },

  exploreDotText: {
    color: "white",
    fontWeight: "900",
    fontSize: 12,
  },
});
