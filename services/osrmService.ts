import { OSRM_BASE, OSRM_PROFILE } from "../config/mapConfig";
import type { LonLat, RouteFeature } from "../types/mapTypes";

type OsrmNearestResponse = {
  waypoints?: Array<{ location?: [number, number] }>;
};

type OsrmRouteResponse = {
  routes?: Array<{
    geometry?: {
      type: "LineString";
      coordinates: number[][];
    };
  }>;
};

export async function snapToRoad(lon: number, lat: number): Promise<LonLat> {
  const url = `${OSRM_BASE}/nearest/v1/${OSRM_PROFILE}/${lon},${lat}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM nearest failed (${res.status})`);

  const data = (await res.json()) as OsrmNearestResponse;
  const loc = data?.waypoints?.[0]?.location;

  if (!loc || loc.length !== 2) {
    throw new Error("OSRM nearest: no waypoint found");
  }

  const [sLon, sLat] = loc;
  return { lon: sLon, lat: sLat };
}

export async function buildRoute(points: LonLat[]): Promise<RouteFeature | null> {
  if (points.length < 2) return null;

  const coords = points.map((p) => `${p.lon},${p.lat}`).join(";");
  const url = `${OSRM_BASE}/route/v1/${OSRM_PROFILE}/${coords}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM route failed (${res.status})`);

  const data = (await res.json()) as OsrmRouteResponse;
  const geom = data?.routes?.[0]?.geometry;

  if (!geom?.coordinates?.length) {
    throw new Error("OSRM route: no geometry returned");
  }

  const feature: RouteFeature = {
    type: "Feature",
    geometry: geom,
    properties: {},
  };

  return feature;
}
