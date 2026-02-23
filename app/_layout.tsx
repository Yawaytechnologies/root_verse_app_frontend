import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "./global.css";

import { Provider } from "react-redux";
import { store } from "../src/store/auth/store";
import { useAppDispatch, useAppSelector } from "../src/store/hooks";

import {
  restoreSession,
  selectAuthSession,
} from "../src/store/auth/authSession.slice";
import { fetchMe, restoreMeFromCache } from "../src/store/auth/me.slice";

import NetInfo from "@react-native-community/netinfo";
import { setNetworkOnline } from "../src/store/auth/network.slice";

import Toast from "react-native-toast-message";

import { LanguageProvider } from "../src/data/wild/lang.store";
import { TraceProvider } from "../src/data/wild/trace.store";

import { initI18n } from "../src/components/aqua/i18n/i18n";

import AsyncStorage from "@react-native-async-storage/async-storage";

SplashScreen.preventAutoHideAsync().catch(() => { });

const LAST_ROUTE_KEY = "nav_last_route_v1";

function RootLayoutInner() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const { token, hydrated } = useAppSelector(selectAuthSession);
  const meState = useAppSelector((s: any) => s.me);

  // IMPORTANT: use your real slice path
  const networkOnline = useAppSelector((s: any) => s.network?.online);

  const restoredRouteRef = useRef(false);

  // i18n
  useEffect(() => {
    initI18n().catch((e) => console.warn("i18n init failed:", e));
  }, []);

  // restore session
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  // network monitor (keep stable; don't treat null as offline)
  useEffect(() => {
    let mounted = true;

    const apply = (state: any) => {
      // ✅ Treat "null reachability" as "unknown/ok", not offline.
      // Offline is only when connected is false OR internetReachable is explicitly false.
      const online =
        state.isConnected === true && state.isInternetReachable !== false;

      dispatch(setNetworkOnline(online));
    };

    NetInfo.fetch().then((state) => {
      if (!mounted) return;
      apply(state);
    });

    const unsub = NetInfo.addEventListener((state) => {
      if (!mounted) return;
      apply(state);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [dispatch]);

  // Save last route (only when NOT in auth)
  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    if (!pathname) return;
    if (inAuthGroup) return;
    AsyncStorage.setItem(LAST_ROUTE_KEY, pathname).catch(() => { });
  }, [pathname, segments]);

  /**
   * ✅ ME loading strategy (MINIMUM change, keeps old behavior)
   * - If OFFLINE: restore cached me only
   * - Otherwise: fetchMe as before (primary source)
   * - If fetchMe fails due to NETWORK_ERROR: fallback to cache
   *
   * This prevents old cached "WILD" me from overriding a new "QUALITY" login while online.
   */
  useEffect(() => {
    if (!hydrated || !token) return;

    // confirmed offline -> only cache
    if (networkOnline === false) {
      dispatch(restoreMeFromCache());
      return;
    }

    // online/unknown -> fetch first (old behavior)
    (dispatch(fetchMe()) as any)
      .unwrap()
      .catch((e: any) => {
        if (e === "NETWORK_ERROR") {
          dispatch(restoreMeFromCache());
        }
      });
  }, [hydrated, token, networkOnline, dispatch]);

  // routing guard
  useEffect(() => {
    if (!hydrated) return;

    SplashScreen.hideAsync().catch(() => { });
    const inAuthGroup = segments[0] === "(auth)";

    // no token -> login
    if (!token) {
      if (!inAuthGroup) router.replace("/(auth)/login");
      return;
    }

    // error is STRING in your slice
    const err = (meState?.error as string | null) ?? null;

    // ✅ Only kick to login when truly invalid session
    if (err === "UNAUTHORIZED" || err === "NO_TOKEN") {
      router.replace("/(auth)/login");
      return;
    }

    // If no me yet:
    if (!meState.me) {
      // ✅ offline fetch failure should not force login
      if (networkOnline === false || err === "NETWORK_ERROR") {
        if (inAuthGroup && !restoredRouteRef.current) {
          restoredRouteRef.current = true;
          AsyncStorage.getItem(LAST_ROUTE_KEY)
            .then((last) => {
              if (last) router.replace(last as any);
              else router.replace("/(wild)/dashboard"); // fallback (keep your existing)
            })
            .catch(() => router.replace("/(wild)/dashboard"));
        }
        return;
      }

      // online + still loading -> wait
      if (meState.loading) return;
      return;
    }

    // token + me exists -> your existing status routing logic (UNCHANGED)
    const me = meState.me;
    const status = String(me.status || me.verification_status || "").toUpperCase();
    const rtype = String(me.rootverse_type || "").toUpperCase();

    if (status === "PENDING" || status === "PENDING_APPROVAL") {
      if (segments[1] !== "pending") router.replace("/(auth)/pending");
      return;
    }
    if (status === "REJECTED") {
      if (segments[1] !== "rejected") router.replace("/(auth)/rejected");
      return;
    }

    if (inAuthGroup) {
      if (rtype === "QUALITY_CHECKER") return router.replace("/quality");
      if (rtype.includes("WILD")) return router.replace("/(wild)/dashboard");
      if (rtype.includes("AQUA")) return router.replace("/(aqua)/tabs/dashboard");
      if (rtype.includes("MARI")) return router.replace("/mariculture");
      return;
    }
  }, [
    hydrated,
    token,
    segments,
    meState.loading,
    meState.me,
    meState.error,
    networkOnline,
    router,
  ]);

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