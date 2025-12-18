import React, { useMemo } from "react";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AquaLayout() {
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();

  const colors = useMemo(() => {
    const bg = isDark ? "#050B16" : "#F5F7FB";
    const text = isDark ? "#E5E7EB" : "#0F172A";
    return { bg, text };
  }, [isDark]);

  return (
    <Stack
      screenOptions={{
        headerStyle: ({ backgroundColor: colors.bg, paddingTop: insets.top } as any),
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        headerTitleAlign: "left",
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {/* ✅ Your folder is "tabs" not "(tabs)" */}
      <Stack.Screen name="tabs" options={{ headerShown: false }} />

      {/* ✅ Pages opened from More should have headers */}
      <Stack.Screen name="pond-list" options={{ title: "Pond List" }} />
      <Stack.Screen name="feed-log/index" options={{ title: "Feed Log" }} />
      <Stack.Screen name="feed-log/add" options={{ title: "Add Feed Log" }} />

      <Stack.Screen name="water-quality/index" options={{ title: "Water Quality" }} />
      <Stack.Screen name="water-quality/add" options={{ title: "Add Water Quality" }} />

      <Stack.Screen name="health-mortality/index" options={{ title: "Health / Mortality" }} />
      <Stack.Screen name="health-mortality/add" options={{ title: "Add Health / Mortality" }} />

      <Stack.Screen name="traceability/[code]" options={{ title: "Traceability" }} />
    </Stack>
  );
}
