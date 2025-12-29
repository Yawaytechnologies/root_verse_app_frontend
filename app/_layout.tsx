import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import "./global.css";

import { initI18n } from "../src/components/aqua/i18n/i18n";
import { LanguageProvider } from "../src/data/wild/lang.store";
import { TraceProvider } from "../src/data/wild/trace.store";

import { Provider } from "react-redux";
import { store } from "../src/store/store";

// ✅ NEW
import { useAppSelector } from "../src/store/hooks";

function InnerLayout() {
  const systemScheme = useColorScheme();
  const [ready, setReady] = useState(false);

  // ✅ read theme from redux
  const mode = useAppSelector((s) => s.theme.mode);

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

  const isDark =
    mode === "SYSTEM" ? systemScheme === "dark" : mode === "DARK";

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

export default function RootLayout() {
  return (
    <Provider store={store}>
      <InnerLayout />
    </Provider>
  );
}
