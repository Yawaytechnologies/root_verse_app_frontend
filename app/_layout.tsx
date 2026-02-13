import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "./global.css";

import { Provider } from "react-redux";
import { store } from "../src/store/auth/store";
import { useAppDispatch, useAppSelector } from "../src/store/hooks";

import { restoreSession, selectAuthSession } from "../src/store/auth/authSession.slice";
import { fetchMe } from "../src/store/auth/me.slice";

import NetInfo from "@react-native-community/netinfo";
import { setNetworkOnline } from "../src/store/auth/network.slice";

import Toast from "react-native-toast-message";

import { LanguageProvider } from "../src/data/wild/lang.store";
import { TraceProvider } from "../src/data/wild/trace.store";

import { initI18n } from "../src/components/aqua/i18n/i18n";

SplashScreen.preventAutoHideAsync().catch(() => { });

function RootLayoutInner() {
  const router = useRouter();
  const segments = useSegments();
  const dispatch = useAppDispatch();

  const { token, hydrated } = useAppSelector(selectAuthSession);
  const meState = useAppSelector((s: any) => s.me);

  // i18n
  useEffect(() => {
    initI18n().catch((e) => console.warn("i18n init failed:", e));
  }, []);

  // restore session
  useEffect(() => {
    console.log("[Layout] restoreSession()");
    dispatch(restoreSession());
  }, [dispatch]);

  // fetch me after token exists
  useEffect(() => {
    if (hydrated && token) {
      console.log("[Layout] token found -> fetchMe()");
      dispatch(fetchMe());
    }
  }, [hydrated, token, dispatch]);

  // network monitor
  useEffect(() => {
    let mounted = true;

    NetInfo.fetch().then((state) => {
      if (!mounted) return;
      const online = !!state.isConnected && (state.isInternetReachable ?? true);
      dispatch(setNetworkOnline(online));
    });

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

  // routing guard (single source of truth)
  useEffect(() => {
    if (!hydrated) {
      console.log("[Layout] not hydrated -> wait");
      return;
    }

    SplashScreen.hideAsync().catch(() => { });
    const inAuthGroup = segments[0] === "(auth)";

    // no token -> login
    if (!token) {
      if (!inAuthGroup) {
        console.log("[Layout] no token -> /(auth)/login");
        router.replace("/(auth)/login");
      }
      return;
    }

    // token -> must wait for me
    if (meState.loading || !meState.me) {
      console.log("[Layout] token present but me loading -> wait");
      return;
    }

    if (meState.error) {
      console.log("[Layout] me error -> back to login:", meState.error);
      router.replace("/(auth)/login");
      return;
    }

    const me = meState.me;
    const status = String(me.status || me.verification_status || "").toUpperCase();
    const rtype = String(me.rootverse_type || "").toUpperCase();

    console.log(`[Layout] route decision -> status=${status} type=${rtype}`);

    // pending / rejected stays in auth
    if (status === "PENDING" || status === "PENDING_APPROVAL") {
      if (segments[1] !== "pending") router.replace("/(auth)/pending");
      return;
    }
    if (status === "REJECTED") {
      if (segments[1] !== "rejected") router.replace("/(auth)/rejected");
      return;
    }

    // approved -> leave auth only
    if (inAuthGroup) {
      if (rtype === "QUALITY_CHECKER") return router.replace("/quality");
      if (rtype.includes("WILD")) return router.replace("/(wild)/dashboard");
      if (rtype.includes("AQUA")) return router.replace("/(aqua)/tabs/dashboard");
      if (rtype.includes("MARI")) return router.replace("/mariculture");

      console.log("[Layout] unknown role -> STOP (no default)");
      return;
    }
  }, [hydrated, token, segments, meState.loading, meState.me, meState.error, router]);

  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: "black" }} />;
  }

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
