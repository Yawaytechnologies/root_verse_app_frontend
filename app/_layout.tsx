import { Slot } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initI18n } from "../src/components/aqua/i18n/i18n";
import "./global.css";

export default function RootLayout() {
  const scheme = useColorScheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setReady(true));
  }, []);

  if (!ready) return null;

  const isDark = scheme === "dark";
  const bg = isDark ? "#050B16" : "#F5F7FB";

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bg }}>
      {/* Keep `dark` class for nativewind dark: utilities */}
      <View
        style={{ flex: 1, backgroundColor: bg }}
        className={isDark ? "flex-1 dark" : "flex-1"}
      >
        <Slot />
      </View>
    </GestureHandlerRootView>
  );
}
