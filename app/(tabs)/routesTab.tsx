import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert } from "react-native";
import Svg, { Path } from "react-native-svg";

import { listRoutes, softDeleteRoute, renameRoute } from "../../services/routesSql";
import type { SavedRoute } from "../../services/routesSql";

type LonLat = [number, number];

function extractLineCoords(routeFeature: any): LonLat[] {

  const g = routeFeature?.geometry;
  if (!g) return [];

  if (g.type === "LineString") return (g.coordinates ?? []) as LonLat[];

  if (g.type === "MultiLineString") {

    const parts = (g.coordinates ?? []) as LonLat[][];
    return parts.flat();
  }

  if (g.type === "GeometryCollection") {

    const out: LonLat[] = [];
    for (const gg of g.geometries ?? []) {
      if (gg?.type === "LineString") out.push(...((gg.coordinates ?? []) as LonLat[]));
      if (gg?.type === "MultiLineString") {
        const parts = (gg.coordinates ?? []) as LonLat[][];
        out.push(...parts.flat());

      }
    }

    return out;
  }

  return [];
}

function buildPath(coords: LonLat[], size: number, pad = 3) {

  if (coords.length < 2) return "";

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;


  for (const [lon, lat] of coords) {
    if (lon < minX) minX = lon;
    if (lat < minY) minY = lat;
    if (lon > maxX) maxX = lon;
    if (lat > maxY) maxY = lat;
  }

  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = (size - pad * 2) / Math.max(w, h);

  const toXY = ([lon, lat]: LonLat) => ({
    x: pad + (lon - minX) * scale,
    y: pad + (maxY - lat) * scale,
  });

  const first = toXY(coords[0]);
  let d = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;

  for (let i = 1; i < coords.length; i++) {
    const p = toXY(coords[i]);
    d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }

  return d;
  
}

function RouteMiniIcon({ routeFeature }: { routeFeature: any }) {
  const size = 40;
  const coords = extractLineCoords(routeFeature);
  const d = buildPath(coords, size);

  return (
    <View style={styles.iconBox}>
      <Svg width={size} height={size}>
        {d ? (
          <Path
            d={d}
            fill="none"
            stroke="black"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
    </View>
  );
}

export default function RoutesTab() {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const refresh = () => setRoutes(listRoutes());

  useEffect(() => {
    refresh();
  }, []);

  const startRename = (r: SavedRoute) => {
    setRenamingId(r.id);
    setDraftName(r.name ?? "");
  };

  const cancelRename = () => {
    setRenamingId(null);
    setDraftName("");
  };

  const commitRename = (id: string) => {
    const name = draftName.trim();
    if (!name) {
      Alert.alert("Name required", "Please enter a route name.");
      return;
    }
    renameRoute(id, name);
    cancelRename();
    refresh();
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Delete route?", "This will remove it from your list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          softDeleteRoute(id);
          refresh();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved routes</Text>

      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        onRefresh={refresh}
        refreshing={false}
        renderItem={({ item }) => {
          const isRenaming = renamingId === item.id;

          return (
            <View style={styles.card}>
              <RouteMiniIcon routeFeature={item.routeFeature} />

              <View style={{ flex: 1 }}>
                {!isRenaming ? (
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                ) : (
                  <TextInput
                    value={draftName}
                    onChangeText={setDraftName}
                    autoFocus
                    style={styles.nameInput}
                    placeholder="Route name"
                    returnKeyType="done"
                    onSubmitEditing={() => commitRename(item.id)}
                  />
                )}

                <Text style={styles.sub}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>

              <View style={styles.actionsCol}>
                {!isRenaming ? (
                  <>
                    <Pressable style={[styles.btn, styles.btnLight]} onPress={() => startRename(item)}>
                      <Text style={styles.btnTextDark}>Rename</Text>
                    </Pressable>

                    <Pressable style={[styles.btn, styles.btnDanger]} onPress={() => confirmDelete(item.id)}>
                      <Text style={styles.btnTextLight}>Delete</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => commitRename(item.id)}>
                      <Text style={styles.btnTextLight}>Save</Text>
                    </Pressable>

                    <Pressable style={[styles.btn, styles.btnLight]} onPress={cancelRename}>
                      <Text style={styles.btnTextDark}>Cancel</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ opacity: 0.7 }}>No saved routes yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "800" },

  card: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "white",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.10)",
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.10)",
    overflow: "hidden",
  },

  name: { fontSize: 16, fontWeight: "800" },
  nameInput: {
    fontSize: 16,
    fontWeight: "800",
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.12)",
  },

  sub: { fontSize: 12, opacity: 0.7, marginTop: 4 },

  actionsCol: { gap: 8 },

  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 92,
  },
  btnPrimary: { backgroundColor: "black" },
  btnLight: {
    backgroundColor: "white",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.15)",
  },
  btnDanger: { backgroundColor: "#DC2626" },

  btnTextLight: { color: "white", fontWeight: "800" },
  btnTextDark: { color: "black", fontWeight: "800" },
});
