import React, { useEffect, useState } from "react";
import { View, useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import "./global.css";

import { initI18n } from "../src/components/aqua/i18n/i18n";
import { TraceProvider } from "../src/data/wild/trace.store";
import { LanguageProvider } from "../src/data/wild/lang.store";

export default function RootLayout() {
  const scheme = useColorScheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    initI18n()
      .catch((e) => console.warn("i18n init failed:", e))
      .finally(() => {
        if (alive) setReady(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  if (!ready) return null;

  const isDark = scheme === "dark";
  const bg = isDark ? "#050B16" : "#F5F7FB";

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bg }}>
      <BottomSheetModalProvider>
        <LanguageProvider>
          <TraceProvider>
            <View
              style={{ flex: 1, backgroundColor: bg }}
              className={isDark ? "flex-1 dark" : "flex-1"}
            >
              <Stack screenOptions={{ headerShown: false }} />
            </View>
          </TraceProvider>
        </LanguageProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
