import React, { useMemo } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import type { RootState } from "../../../src/store/auth/store";

export default function AquaTabsLayout() {
  const insets = useSafeAreaInsets();
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === "DARK";

  const colors = useMemo(() => ({
    screenBg: isDark ? "#050B16" : "#EEF2F7",
    headerText: isDark ? "#E5E7EB" : "#0F172A",
    active: isDark ? "#60A5FA" : "#1D4ED8",
    inactive: isDark ? "#94A3B8" : "#64748B",
  }), [isDark]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.screenBg }}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.screenBg },
          headerTitleStyle: { color: colors.headerText },
          headerShadowVisible: false,
          headerTitleAlign: "left",
          headerStatusBarHeight: insets.top,
          tabBarActiveTintColor: colors.active,
          tabBarInactiveTintColor: colors.inactive,
          // Tab bar completely hidden — navigation handled inside dashboard
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Ionicons name="grid-outline" size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="qr-scanner"
          options={{
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Ionicons name="scan-outline" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Ionicons name="person-outline" size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="more" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
