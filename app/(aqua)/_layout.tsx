import React, { useEffect, useMemo } from "react";
import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import type { RootState } from "../../src/store/auth/store";

export default function AquaLayout() {
  const insets = useSafeAreaInsets();
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === "DARK";

  // Sync Redux theme → NativeWind colorScheme so ALL dark: classes respond
  const { setColorScheme } = useColorScheme();
  useEffect(() => {
    setColorScheme(isDark ? "dark" : "light");
  }, [isDark]);

  const colors = useMemo(() => {
    const bg = isDark ? "#050B16" : "#EEF2F7";
    const text = isDark ? "#E5E7EB" : "#0F172A";
    return { bg, text };
  }, [isDark]);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.bg,
          paddingTop: insets.top,
        } as any,
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        headerTitleAlign: "left",
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="tabs" options={{ headerShown: false }} />
      <Stack.Screen name="registration" options={{ headerShown: false }} />
      <Stack.Screen name="start-registration" options={{ headerShown: false }} />
      <Stack.Screen name="approvals" options={{ headerShown: false }} />
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
