import React, { useEffect, useState } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { initDb } from "../services/db";
import { StartupLoader } from "@/components/StartupLoader";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    initDb();
    const t = setTimeout(() => setShowSplash(false), 10_000);
    return () => clearTimeout(t);
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>

        <StartupLoader
          visible={showSplash}
          durationMs={10_000}
          title="Route App (dev)"
          version="V0.0.1"
        />

        <StatusBar style="auto" />
      </>
    </ThemeProvider>
  );
}
