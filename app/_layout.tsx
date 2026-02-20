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

import { restoreSession, selectAuthSession } from "../src/store/auth/authSession.slice";
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

  // 👇 IMPORTANT: use your real slice path
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

  // network monitor
  useEffect(() => {
    let mounted = true;

    const apply = (state: any) => {
      const online = !!state.isConnected && (state.isInternetReachable ?? true);
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

  // ✅ Save last route (only when NOT in auth)
  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    if (!pathname) return;
    if (inAuthGroup) return;
    AsyncStorage.setItem(LAST_ROUTE_KEY, pathname).catch(() => { });
  }, [pathname, segments]);

  // ✅ load ME smartly:
  // - online: fetch from API
  // - offline: restore from cache
  useEffect(() => {
    if (!hydrated || !token) return;

    if (networkOnline === false) {
      dispatch(restoreMeFromCache());
      return;
    }

    dispatch(fetchMe());
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

    // ✅ token exists:
    // If we are offline, NEVER force login due to fetchMe failing.
    // Only force login when server says 401 (UNAUTHORIZED).
    const errType = meState?.error?.type;

    if (errType === "UNAUTHORIZED") {
      router.replace("/(auth)/login");
      return;
    }

    // ✅ If no me yet, but offline (or server error), allow app to continue
    // and try restoring last route once.
    if (!meState.me) {
      if (networkOnline === false || errType === "NETWORK" || errType === "SERVER") {
        if (inAuthGroup && !restoredRouteRef.current) {
          restoredRouteRef.current = true;
          AsyncStorage.getItem(LAST_ROUTE_KEY)
            .then((last) => {
              if (last) router.replace(last as any);
              else router.replace("/(wild)/dashboard"); // fallback
            })
            .catch(() => router.replace("/(wild)/dashboard"));
        }
        return;
      }

      // online + still loading -> wait
      if (meState.loading) return;
      return;
    }

    // if you reached here: token + me exists => your existing status routing logic
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
  }, [hydrated, token, segments, meState.loading, meState.me, meState.error, networkOnline, router]);

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