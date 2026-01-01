import React from "react";
import { StyleSheet, View } from "react-native";
import { MapView, Camera, PointAnnotation } from "@maplibre/maplibre-react-native";

import { MAP_STYLE_URL, WORLD_CENTER, WORLD_ZOOM } from "../../config/mapConfig";
import type { LonLat, RouteFeature, Waypoint } from "../../types/mapTypes";
import { UserMarker } from "./UserMarker";
import { WaypointMarker } from "./WaypointMarker";
import { RouteLayer } from "./RouteLayer";

type Props = {
  cameraRef: React.RefObject<any>;
  pos: LonLat | null;

  waypoints: Waypoint[];
  routeFeature: RouteFeature | null;

  savedRouteFeature?: RouteFeature | null;
  savedRouteWaypoints?: Waypoint[];

  onMapPress: (lon: number, lat: number) => void;
  onMapReady?: () => void;
  onZoomChanged?: (zoom: number) => void;
};


export function MapCanvas({
  cameraRef,
  pos,
  waypoints,
  routeFeature,
  savedRouteFeature = null,
  savedRouteWaypoints = [],
  onMapPress,
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
        onMapPress(lon, lat);
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

      {savedRouteFeature && (
        <RouteLayer feature={savedRouteFeature} idPrefix="saved" variant="saved" />
      )}

      {savedRouteWaypoints.map((wp, index) => (
        <PointAnnotation
          key={`saved-wp-${wp.id}-${index}`}
          id={`saved-wp-${wp.id}-${index}`}
          coordinate={[wp.lon, wp.lat]}
        >
          <View style={styles.savedDot} />
        </PointAnnotation>
      ))}

      {routeFeature && (
        <RouteLayer feature={routeFeature} idPrefix="current" variant="current" />
      )}

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

});
