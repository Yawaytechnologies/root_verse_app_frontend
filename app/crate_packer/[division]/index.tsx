// app/crate_packer/[division]/index.tsx
import React, { useEffect, useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { useAppDispatch, useAppSelector } from "../../../src/store/hooks";
import { selectAuthSession } from "../../../src/store/auth/authSession.slice";
import { fetchMe } from "../../../src/store/auth/me.slice";
import { logout as logoutThunk } from "../../../src/store/auth/login.slice";

import CratePackerDashboard from "../../../src/components/crate_packer/CratePackerDashboard";

const BG = "black";
const BORDER = "rgba(255,255,255,0.12)";

export default function CratePackerDivisionScreen() {
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams();

  const { token, hydrated } = useAppSelector(selectAuthSession);
  const meState = useAppSelector((s: any) => s.me);

  const division = String(params.division || "").toLowerCase();

  const divisionOk = useMemo(() => {
    return division === "wild" || division === "aqua" || division === "mariculture";
  }, [division]);

  const rtype = useMemo(() => {
    return String(meState?.me?.rootverse_type || "").toUpperCase();
  }, [meState?.me?.rootverse_type]);

  const isCratePacker = useMemo(() => rtype.includes("CRATE"), [rtype]);

  useEffect(() => {
    if (!hydrated) return;

    // invalid division -> back to choose division
    if (token && division && !divisionOk) {
      router.replace("/crate_packer");
      return;
    }

    // no token -> login
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }
  }, [hydrated, token, division, divisionOk]);

  const onRetry = async () => {
    await dispatch(fetchMe()).unwrap().catch(() => {});
  };

  const onLogout = async () => {
    await dispatch(logoutThunk()).unwrap().catch(() => {});
    router.replace("/(auth)/login");
  };

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 10, fontWeight: "800" }}>
          Starting...
        </Text>
      </View>
    );
  }

  // token missing -> redirect happens in effect
  if (!token) return null;

  // division missing -> go back
  if (!division) {
    router.replace("/crate_packer");
    return null;
  }

  // wait profile
  if (meState?.loading || !meState?.me) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 10, fontWeight: "800" }}>
          Loading profile...
        </Text>
      </View>
    );
  }

  // profile error
  if (meState?.error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: BG,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 18,
        }}
      >
        <Text style={{ color: "rgba(255,255,255,0.95)", fontWeight: "900", fontSize: 16, textAlign: "center" }}>
          {String(meState.error)}
        </Text>

        <View style={{ flexDirection: "row", marginTop: 14 }}>
          <Pressable
            onPress={onRetry}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 18,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: BORDER,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>Retry</Text>
          </Pressable>

          <View style={{ width: 10 }} />

          <Pressable
            onPress={onLogout}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 18,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
              backgroundColor: "rgba(255,255,255,0.10)",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>Logout</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // not allowed -> kick
  if (!isCratePacker) {
    router.replace("/(auth)/login");
    return null;
  }

  // ✅ Use redux me. No AsyncStorage, no manual /api/me calls.
  return <CratePackerDashboard meOverride={meState.me} />;
}