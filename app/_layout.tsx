// app/_layout.tsx
import "react-native-reanimated";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { View, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import "./global.css";

/** ✅ Redux */
import { Provider } from "react-redux";
import { store } from "../src/store/store";

/** ✅ Toast */
import Toast from "react-native-toast-message";

/** ✅ Providers */
import { LanguageProvider } from "../src/data/wild/lang.store";
import { TraceProvider } from "../src/data/wild/trace.store";

/** ✅ i18n */
import { initI18n } from "../src/components/aqua/i18n/i18n";

export default function RootLayout() {
  // Just init i18n in background. DON'T block rendering.
  useEffect(() => {
    initI18n().catch((e) => console.warn("i18n init failed:", e));
  }, []);

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <LanguageProvider>
              <TraceProvider>
                <View style={{ flex: 1 }}>
                  <Stack screenOptions={{ headerShown: false }} />
                </View>

                {/* ✅ Toast OUTSIDE Stack so it can overlay everything */}
                <Toast topOffset={Platform.OS === "web" ? 20 : 60} />
              </TraceProvider>
            </LanguageProvider>
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}
