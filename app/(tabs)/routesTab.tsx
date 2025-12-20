import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";

import { listRoutes, softDeleteRoute } from "../../services/routesSql";
import type { SavedRoute } from "../../services/routesSql";

export default function RoutesTab() {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);

  const refresh = () => {
    const data = listRoutes();
    setRoutes(data);
  };

  useEffect(() => {
    const routes = listRoutes();
    console.log("ROUTES IN DB:", routes);
    refresh();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved routes</Text>

      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        onRefresh={refresh}
        refreshing={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>
                {new Date(item.createdAt).toLocaleString()} • {item.profile}
              </Text>
              {typeof item.distanceMeters === "number" && (
                <Text style={styles.sub}>
                  {(item.distanceMeters / 1000).toFixed(2)} km
                </Text>
              )}
            </View>

            <Pressable
              style={styles.btn}
              onPress={() => {
                softDeleteRoute(item.id);
                refresh();
              }}
            >
              <Text style={styles.btnText}>Delete</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ opacity: 0.7 }}>No saved routes yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "800" },
  card: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "white",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  name: { fontSize: 16, fontWeight: "700" },
  sub: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "black",
  },
  btnText: { color: "white", fontWeight: "700" },
});
