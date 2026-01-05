import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { db } from "../../services/db";

type TableRow = Record<string, any>;

function toPreview(value: any, maxLen = 120) {
  let s: string;

  if (value === null) s = "null";
  else if (value === undefined) s = "undefined";
  else if (typeof value === "string") s = value;
  else if (typeof value === "number" || typeof value === "boolean") s = String(value);
  else s = Object.prototype.toString.call(value);

  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

function safeColumns(rows: TableRow[]) {
  const first = rows[0];
  return first ? Object.keys(first) : [];
}

export default function DebugTab() {
  const [tables, setTables] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo(() => safeColumns(rows), [rows]);
  const previewColumns = useMemo(() => columns.slice(0, 3), [columns]);

  const refreshTablesAndCounts = useCallback(() => {
    try {
      setError(null);

      const t = db.getAllSync(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;`
      ) as Array<{ name: string }>;

      const names = (t ?? []).map((x) => x.name);
      setTables(names);

      const nextCounts: Record<string, number> = {};
      for (const name of names) {
        try {
          const r = db.getFirstSync(`SELECT COUNT(*) as c FROM "${name}"`) as any;
          const n = typeof r?.c === "number" ? r.c : Number(r?.c ?? 0);
          nextCounts[name] = Number.isFinite(n) ? n : 0;
        } catch {
          nextCounts[name] = 0;
        }
      }
      setCounts(nextCounts);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }, []);

  const loadTableRows = useCallback((tableName: string) => {
    try {
      setError(null);
      setSelectedTable(tableName);

      const data = db.getAllSync(`SELECT * FROM "${tableName}" LIMIT 20;`) as TableRow[];
      setRows(data ?? []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setRows([]);
    }
  }, []);

  const goBack = () => {
    setSelectedTable(null);
    setRows([]);
    setError(null);
  };

  const deleteAllData = () => {
    Alert.alert(
      "Delete all data?",
      "This will permanently delete all rows from all app tables.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete all",
          style: "destructive",
          onPress: () => {
            try {
              setError(null);              
              db.execSync(`
                DELETE FROM routes;
                VACUUM;
              `);

              goBack();
              refreshTablesAndCounts();
            } catch (e: any) {
              const msg = e?.message ?? String(e);
              setError(msg);
              Alert.alert("Failed", msg);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    refreshTablesAndCounts();
  }, [refreshTablesAndCounts]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Debug</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Database</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <Pressable style={[styles.btn, styles.btnLight]} onPress={refreshTablesAndCounts}>
            <Text style={styles.btnTextDark}>Refresh</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, styles.btnLight, !selectedTable ? styles.btnDisabled : null]}
            disabled={!selectedTable}
            onPress={goBack}
          >
            <Text style={styles.btnTextDark}>Back</Text>
          </Pressable>

          <Pressable style={[styles.btn, styles.btnDanger]} onPress={deleteAllData}>
            <Text style={styles.btnTextLight}>Delete all</Text>
          </Pressable>
        </View>

        {!selectedTable ? (
          <View style={styles.list}>
            {tables.length === 0 ? (
              <Text style={styles.muted}>No tables found.</Text>
            ) : (
              tables.map((t) => (
                <Pressable key={t} style={styles.item} onPress={() => loadTableRows(t)}>
                  <Text style={styles.itemText}>{t}</Text>
                  <Text style={styles.itemSub}>{(counts[t] ?? 0).toString()} rows</Text>
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <View style={styles.list}>
            <Text style={styles.subTitle}>Table: {selectedTable}</Text>
            <Text style={styles.muted}>Showing up to 20 rows (preview columns only).</Text>

            {rows.length === 0 ? (
              <Text style={styles.muted}>No rows.</Text>
            ) : (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderText}>
                    {previewColumns.length ? previewColumns.join(" | ") : "(no columns)"}
                  </Text>
                </View>

                {rows.map((r, idx) => (
                  <Pressable
                    key={idx}
                    style={styles.tableRow}
                    onPress={() => {
                      const lines = Object.keys(r)
                        .slice(0, 12)
                        .map((k) => `${k}: ${toPreview(r[k], 200)}`)
                        .join("\n");
                      Alert.alert(`Row ${idx + 1}`, lines || "(empty row)");
                    }}
                  >
                    <Text style={styles.tableRowText}>
                      {previewColumns.map((c) => toPreview(r[c], 80)).join(" | ")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "800" },

  card: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "white",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.10)",
  },

  sectionTitle: { fontSize: 16, fontWeight: "800" },
  subTitle: { fontSize: 14, fontWeight: "800", marginTop: 6 },

  actionsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnLight: {
    backgroundColor: "white",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.15)",
  },
  btnDanger: { backgroundColor: "#DC2626" },
  btnDisabled: { opacity: 0.5 },

  btnTextDark: { color: "black", fontWeight: "800" },
  btnTextLight: { color: "white", fontWeight: "800" },

  list: { gap: 8, marginTop: 6 },

  item: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    gap: 2,
  },
  itemText: { fontWeight: "800" },
  itemSub: { fontSize: 12, opacity: 0.7 },

  muted: { opacity: 0.7 },

  table: { marginTop: 10, gap: 8 },
  tableHeader: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  tableHeaderText: { fontWeight: "800", fontSize: 12 },

  tableRow: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  tableRowText: { fontSize: 12 },

  errorBox: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(220,38,38,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(220,38,38,0.30)",
  },
  errorTitle: { fontWeight: "800", marginBottom: 4 },
  errorText: { fontSize: 12, opacity: 0.9 },
});
