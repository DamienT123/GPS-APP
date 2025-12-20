export type LonLat = { lon: number; lat: number };

export type Waypoint = LonLat & { id: string };

export type RouteFeature = {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: number[][];
  };
  properties: Record<string, unknown>;
};
