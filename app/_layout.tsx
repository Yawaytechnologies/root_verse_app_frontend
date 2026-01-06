
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";

import "react-native-reanimated";

import React, { useEffect, useState } from "react";
import { View, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";


import "./global.css";

import { initI18n } from "../src/components/aqua/i18n/i18n";
import { LanguageProvider } from "../src/data/wild/lang.store";
import { TraceProvider } from "../src/data/wild/trace.store";

/** ✅ Redux */
import { Provider } from "react-redux";
import { store } from "../src/store/auth/store";

/** ✅ Toast */
import Toast from "react-native-toast-message";
>>>>>>> 7c3e43d21667e292253b62691e64f01ab9db60e1

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

  const isDark = scheme === "dark";
>>>>>>> 7c3e43d21667e292253b62691e64f01ab9db60e1
  const bg = isDark ? "#050B16" : "#F5F7FB";

  if (!ready) return null;

  return (
  <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: bg }}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <LanguageProvider>
              <TraceProvider>
                <View
                  style={{ flex: 1, backgroundColor: bg }}
                  className={isDark ? "flex-1 dark" : "flex-1"}
                >
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: bg },
                      animation: "fade",
                    }}
                  />
                  <Toast />
                </View>
              </TraceProvider>
            </LanguageProvider>
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <InnerLayout />
    </Provider>
  );
}