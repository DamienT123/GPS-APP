import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="mapTab"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="mapTab"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="map.fill" size={size ?? 28} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="routesTab"
        options={{
          title: "Routes",
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="route.fill" size={size ?? 28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
