// app/_layout.tsx
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "./global.css";

/** ✅ Redux */
import { Provider } from "react-redux";
import { store } from "../src/store/auth/store";
import { useAppDispatch, useAppSelector } from "../src/store/hooks";

/** ✅ Session gate */
import {
  restoreSession,
  selectAuthSession,
} from "../src/store/auth/authSession.slice";

/** ✅ Toast */
import Toast from "react-native-toast-message";

/** ✅ Providers */
import { LanguageProvider } from "../src/data/wild/lang.store";
import { TraceProvider } from "../src/data/wild/trace.store";

/** ✅ i18n */
import { initI18n } from "../src/components/aqua/i18n/i18n";

SplashScreen.preventAutoHideAsync().catch(() => {});

// ✅ set this to your real post-login dashboard route
const HOME_ROUTE = "/(wild)/dashboard"; // change if your dashboard path differs

function RootLayoutInner() {
  const router = useRouter();
  const segments = useSegments();

  const dispatch = useAppDispatch();
  const { token, hydrated } = useAppSelector(selectAuthSession);

  // init i18n (fine to do here)
  useEffect(() => {
    initI18n().catch((e) => console.warn("i18n init failed:", e));
  }, []);

  // restore token from storage on app start
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  // auth gate + redirect
  useEffect(() => {
    if (!hydrated) return;

    SplashScreen.hideAsync().catch(() => {});

    const inAuthGroup = segments[0] === "(auth)";

    // no token -> force login
    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    // token -> never show login/register/otp
    if (token && inAuthGroup) {
      router.replace(HOME_ROUTE);
      return;
    }
  }, [hydrated, token, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "black" }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <LanguageProvider>
            <TraceProvider>
              <View style={{ flex: 1, backgroundColor: "black" }}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "black" },
                    animation: "fade",
                  }}
                />
              </View>

              <Toast topOffset={Platform.OS === "web" ? 20 : 60} />
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
      <RootLayoutInner />
    </Provider>
  );
}
