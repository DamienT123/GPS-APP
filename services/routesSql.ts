import { db } from "./db";
import type { Waypoint, RouteFeature } from "../types/mapTypes";

export type RouteProfile = "walking" | "driving" | "cycling";

export type SavedRoute = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  profile: RouteProfile;

  waypoints: Waypoint[];
  routeFeature: RouteFeature;

  distanceMeters?: number;
  durationSeconds?: number;

  ownerUid?: string | null;
  dirty: boolean;
  lastSyncedAt?: string | null;
  deletedAt?: string | null;
};

function rowToRoute(row: any): SavedRoute {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    profile: row.profile,

    waypoints: JSON.parse(row.waypointsJson),
    routeFeature: JSON.parse(row.routeGeoJson),

    distanceMeters: row.distanceMeters ?? undefined,
    durationSeconds: row.durationSeconds ?? undefined,

    ownerUid: row.ownerUid ?? null,
    dirty: row.dirty === 1,
    lastSyncedAt: row.lastSyncedAt ?? null,
    deletedAt: row.deletedAt ?? null,
  };
}

export function createRoute(input: {
  name: string;
  profile: RouteProfile;
  waypoints: Waypoint[];
  routeFeature: RouteFeature;
  distanceMeters?: number;
  durationSeconds?: number;
  ownerUid?: string | null;
}): SavedRoute {
  const now = new Date().toISOString();
  return {
    id: `route_${Date.now()}`,
    name: input.name,
    createdAt: now,
    updatedAt: now,
    profile: input.profile,
    waypoints: input.waypoints,
    routeFeature: input.routeFeature,
    distanceMeters: input.distanceMeters,
    durationSeconds: input.durationSeconds,
    ownerUid: input.ownerUid ?? null,
    dirty: true,
    lastSyncedAt: null,
    deletedAt: null,
  };
}

export function saveRoute(route: SavedRoute) {
  db.runSync(
    `INSERT OR REPLACE INTO routes
     (id, name, createdAt, updatedAt, profile, waypointsJson, routeGeoJson, distanceMeters, durationSeconds, ownerUid, dirty, lastSyncedAt, deletedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      route.id,
      route.name,
      route.createdAt,
      route.updatedAt,
      route.profile,
      JSON.stringify(route.waypoints),
      JSON.stringify(route.routeFeature),
      route.distanceMeters ?? null,
      route.durationSeconds ?? null,
      route.ownerUid ?? null,
      route.dirty ? 1 : 0,
      route.lastSyncedAt ?? null,
      route.deletedAt ?? null,
    ]
  );
}

export function listRoutes(opts?: { includeDeleted?: boolean; ownerUid?: string | null }) {
  const includeDeleted = opts?.includeDeleted ?? false;
  const ownerUid = opts?.ownerUid ?? null;

  const where: string[] = [];
  const args: any[] = [];

  if (!includeDeleted) {
    where.push("deletedAt IS NULL");
  }
  if (ownerUid !== null) {
    where.push("ownerUid = ?");
    args.push(ownerUid);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = db.getAllSync(
    `SELECT * FROM routes ${whereSql} ORDER BY datetime(createdAt) DESC`,
    args
  );

  return rows.map(rowToRoute);
}

export function getRoute(id: string): SavedRoute | null {
  const row = db.getFirstSync(`SELECT * FROM routes WHERE id = ?`, [id]);
  return row ? rowToRoute(row) : null;
}

export function renameRoute(id: string, name: string) {
  const now = new Date().toISOString();
  db.runSync(
    `UPDATE routes SET name = ?, updatedAt = ?, dirty = 1 WHERE id = ?`,
    [name, now, id]
  );
}

export function softDeleteRoute(id: string) {
  const now = new Date().toISOString();
  db.runSync(
    `UPDATE routes SET deletedAt = ?, updatedAt = ?, dirty = 1 WHERE id = ?`,
    [now, now, id]
  );
}

export function hardDeleteRoute(id: string) {
  db.runSync(`DELETE FROM routes WHERE id = ?`, [id]);
}

export function markSynced(id: string) {
  const now = new Date().toISOString();
  db.runSync(
    `UPDATE routes SET dirty = 0, lastSyncedAt = ? WHERE id = ?`,
    [now, id]
  );
}

export function listDirtyRoutes(ownerUid?: string | null) {
  const args: any[] = [];
  let whereSql = "WHERE dirty = 1";

  if (ownerUid) {
    whereSql += " AND ownerUid = ?";
    args.push(ownerUid);
  }

  const rows = db.getAllSync(`SELECT * FROM routes ${whereSql}`, args);
  return rows.map(rowToRoute);
}
