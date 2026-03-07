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

SplashScreen.preventAutoHideAsync().catch(() => {});

const PREVIEW_CRATE_PACKER =
  String(process.env.EXPO_PUBLIC_PREVIEW_CRATE_PACKER || "").toLowerCase() ===
  "true";

const LAST_ROUTE_KEY = "nav_last_route_v1";

function RootLayoutInner() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const { token, hydrated } = useAppSelector(selectAuthSession);
  const meState = useAppSelector((s: any) => s.me);

  const networkOnline = useAppSelector((s: any) => s.network?.online);

  const restoredRouteRef = useRef(false);

  useEffect(() => {
    initI18n().catch((e) => console.warn("i18n init failed:", e));
  }, []);

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  useEffect(() => {
    let mounted = true;

    const apply = (state: any) => {
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

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    if (!pathname) return;
    if (inAuthGroup) return;
    AsyncStorage.setItem(LAST_ROUTE_KEY, pathname).catch(() => {});
  }, [pathname, segments]);

  useEffect(() => {
    if (!hydrated || !token) return;

    if (networkOnline === false) {
      dispatch(restoreMeFromCache());
      return;
    }

    (dispatch(fetchMe()) as any)
      .unwrap()
      .catch((e: any) => {
        if (e === "NETWORK_ERROR") {
          dispatch(restoreMeFromCache());
        }
      });
  }, [hydrated, token, networkOnline, dispatch]);

  useEffect(() => {
    if (!hydrated) return;

    SplashScreen.hideAsync().catch(() => {});
    const rootSeg = segments?.[0];
    const inAuthGroup = rootSeg === "(auth)";

    if (!token && PREVIEW_CRATE_PACKER && rootSeg === "crate_packer") {
      return;
    }

    if (!token) {
      if (!inAuthGroup) router.replace("/(auth)/login");
      return;
    }

    const err = (meState?.error as string | null) ?? null;

    if (err === "UNAUTHORIZED" || err === "NO_TOKEN") {
      router.replace("/(auth)/login");
      return;
    }

    if (!meState.me) {
      if (networkOnline === false || err === "NETWORK_ERROR") {
        if (inAuthGroup && !restoredRouteRef.current) {
          restoredRouteRef.current = true;
          AsyncStorage.getItem(LAST_ROUTE_KEY)
            .then((last) => {
              if (last) router.replace(last as any);
              else router.replace("/(wild)/dashboard");
            })
            .catch(() => router.replace("/(wild)/dashboard"));
        }
        return;
      }

      if (meState.loading) return;
      return;
    }

    const me = meState.me;
    const status = String(
      me.status || me.verification_status || "",
    ).toUpperCase();
    const rtype = String(me.rootverse_type || "").toUpperCase();

    if (status === "PENDING" || status === "PENDING_APPROVAL") {
      if (segments?.[1] !== "pending") router.replace("/(auth)/pending");
      return;
    }
    if (status === "REJECTED") {
      if (segments?.[1] !== "rejected") router.replace("/(auth)/rejected");
      return;
    }

    let homePath: string | null = null;
    let allowedRoot: string | null = null;

    if (rtype === "QUALITY_CHECKER") {
      homePath = "/quality";
      allowedRoot = "quality";
    } else if (rtype.includes("WILD")) {
      homePath = "/(wild)/dashboard";
      allowedRoot = "(wild)";
    } else if (rtype.includes("AQUA")) {
      homePath = "/(aqua)/tabs/dashboard";
      allowedRoot = "(aqua)";
    } else if (rtype.includes("MARI")) {
      homePath = "/mariculture";
      allowedRoot = "mariculture";
    } else if (rtype.includes("CRATE")) {
      homePath = "/crate_packer";
      allowedRoot = "crate_packer";
    }

    if (!homePath || !allowedRoot) {
      return;
    }

    if (inAuthGroup) {
      router.replace(homePath as any);
      return;
    }

    if (rootSeg && rootSeg !== allowedRoot) {
      router.replace(homePath as any);
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