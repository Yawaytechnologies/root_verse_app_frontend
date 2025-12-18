import React from "react";
import { Stack } from "expo-router";
import "./global.css";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { TraceProvider } from "../src/data/wild/trace.store";
import { LanguageProvider } from "../src/data/wild/lang.store";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <LanguageProvider>
          <TraceProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </TraceProvider>
        </LanguageProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
