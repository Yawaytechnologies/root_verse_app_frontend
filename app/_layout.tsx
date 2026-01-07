// app/_layout.tsx
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "./global.css";

/** ✅ Redux Provider */
import { Provider } from "react-redux";
import { store } from "../src/store/store";

/** ✅ Toast */
import Toast from "react-native-toast-message";

/** ✅ Providers you already use */
import { LanguageProvider } from "../src/data/wild/lang.store";
import { TraceProvider } from "../src/data/wild/trace.store";

/** ✅ Theme helper */
import { useIsDarkTheme } from "../src/store/useIsDarkTheme";

/** ✅ IMPORTANT: i18n init (Aqua) */
import { initI18n } from "../src/components/aqua/i18n/i18n";

function InnerLayout() {
  const isDark = useIsDarkTheme();
  const bg = isDark ? "#050B16" : "#F5F7FB";

  // ✅ Gate app rendering until i18n is ready
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await initI18n(); // ✅ load translations + saved language
      } catch (e) {
        console.warn("i18n init failed:", e);
      } finally {
        if (alive) setReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ Prevent showing translation keys before init
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bg }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <LanguageProvider>
            <TraceProvider>
              {/* ✅ NativeWind dark mode support */}
              <View
                style={{ flex: 1, backgroundColor: bg }}
                className={isDark ? "flex-1 dark" : "flex-1"}
              >
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: bg },
                  }}
                />
                <Toast />
              </View>
            </TraceProvider>
          </LanguageProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
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
