import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("gpsapp.db");

export function initDb() {
 
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,              -- ISO string
      updatedAt TEXT NOT NULL,              -- ISO string

      profile TEXT NOT NULL,                -- walking/driving/cycling

      waypointsJson TEXT NOT NULL,          -- JSON.stringify(waypoints)
      routeGeoJson TEXT NOT NULL,           -- JSON.stringify(routeFeature)

      distanceMeters INTEGER,
      durationSeconds INTEGER,

      -- for future Firebase sync
      ownerUid TEXT,
      dirty INTEGER NOT NULL DEFAULT 1,     -- 1 = needs sync
      lastSyncedAt TEXT,                   -- ISO
      deletedAt TEXT                       -- soft delete (optional)
    );

    CREATE INDEX IF NOT EXISTS idx_routes_createdAt ON routes(createdAt);
    CREATE INDEX IF NOT EXISTS idx_routes_ownerUid ON routes(ownerUid);
    CREATE INDEX IF NOT EXISTS idx_routes_dirty ON routes(dirty);
  `);
}
