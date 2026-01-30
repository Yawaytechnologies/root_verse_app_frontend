// app/_layout.tsx
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "./global.css";

/** ✅ Redux */
import { Provider } from "react-redux";
import { store } from "../src/store/auth/store";

/** ✅ Toast */
import Toast from "react-native-toast-message";

/** ✅ Providers */
import { LanguageProvider } from "../src/data/wild/lang.store";
import { TraceProvider } from "../src/data/wild/trace.store";

/** ✅ i18n */
import { initI18n } from "../src/components/aqua/i18n/i18n";

export default function RootLayout() {
  useEffect(() => {
    initI18n().catch((e) => console.warn("i18n init failed:", e));
  }, []);

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "black" }}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <LanguageProvider>
              <TraceProvider>
                <View style={{ flex: 1, backgroundColor: "black" }}>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: "black" }, // ✅ kills white flash
                      animation: "fade", // optional, smoother
                    }}
                  />
                </View>

                <Toast topOffset={Platform.OS === "web" ? 20 : 60} />
              </TraceProvider>
            </LanguageProvider>
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}
