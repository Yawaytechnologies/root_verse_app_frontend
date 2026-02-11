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

/** ✅ Fetch user /me data */
import { fetchMe } from "../src/store/auth/me.slice";

/** ✅ Network state */
import NetInfo from "@react-native-community/netinfo";
import { setNetworkOnline } from "../src/store/auth/network.slice";

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

  // read user info to decide which home route to pick
  const meState = useAppSelector((s: any) => s.me);
  const loginState = useAppSelector((s: any) => s.login);

  // init i18n (fine to do here)
  useEffect(() => {
    initI18n().catch((e) => console.warn("i18n init failed:", e));
  }, []);

  // restore token from storage on app start
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  // ✅ fetch user data (/me) after session is restored
  useEffect(() => {
    if (hydrated && token) {
      dispatch(fetchMe());
    }
  }, [hydrated, token, dispatch]);

  // ✅ global network state listener (inform all screens of online/offline changes)
  useEffect(() => {
    let mounted = true;

    // Check initial state
    NetInfo.fetch().then((state) => {
      if (!mounted) return;
      const online = !!state.isConnected && (state.isInternetReachable ?? true);
      dispatch(setNetworkOnline(online));
    });

    // Subscribe to changes
    const unsub = NetInfo.addEventListener((state) => {
      if (!mounted) return;
      const online = !!state.isConnected && (state.isInternetReachable ?? true);
      dispatch(setNetworkOnline(online));
    });

    return () => {
      mounted = false;
      unsub();
    };
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

    // token -> decide post-login route based on user type
    if (token && inAuthGroup) {
      // if we're still loading /me, wait until it's ready
      if (meState?.loading) return;

      // ✅ Extract rootverse_type from meState.me or loginState
      // Prefer meState (from /me endpoint) if available, otherwise use loginState
      const rtype =
        meState?.me?.rootverse_type || loginState?.rootverse_type || null;

      // Don't route if we don't have the rootverse_type yet
      if (!rtype) return;

      const pickHomeRoute = (rt: string) => {
        const up = String(rt).toUpperCase();
        if (up === "QUALITY_CHECKER") return "/quality";
        if (up === "WILD_CAPTURE") return "/(wild)/dashboard";
        if (up === "AQUACULTURE") return "/(aqua)/tabs/dashboard";
        if (up === "MARICULTURE") return "/mariculture";
        return HOME_ROUTE;
      };

      const route = pickHomeRoute(rtype);
      router.replace(route);
      return;
    }
  }, [hydrated, token, segments, router, meState, loginState]);

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
