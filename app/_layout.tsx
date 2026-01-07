import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { View, useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import "./global.css";

import { initI18n } from "../src/components/aqua/i18n/i18n";
import { LanguageProvider } from "../src/data/wild/lang.store";
import { TraceProvider } from "../src/data/wild/trace.store";

/** ✅ Redux */
import { Provider } from "react-redux";
import { store } from "../src/store/store";


/** ✅ Toast */
import Toast from "react-native-toast-message";

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

  const isDark = scheme === "dark";
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
