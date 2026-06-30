// app/crate_packer/[division]/index.tsx
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import CratePackerDashboard from "../../../src/components/crate_packer/CratePackerDashboard";
import AquaCratePackerDashboard from "../../../src/components/crate_packer/aqua/AquaCratePackerDashboard";

import { useAppDispatch, useAppSelector } from "../../../src/store/hooks";
import { selectAuthSession } from "../../../src/store/auth/authSession.slice";
import { fetchMe } from "../../../src/store/auth/me.slice";

type DivisionKey = "wild" | "aqua" | "mariculture";

function parseDivision(v: any): DivisionKey | null {
  const raw = Array.isArray(v) ? v[0] : v;
  const s = String(raw || "").trim().toLowerCase();

  if (s === "wild" || s === "aqua" || s === "mariculture") {
    return s as DivisionKey;
  }

  return null;
}

function cleanText(v: any) {
  const s = String(v ?? "").trim();

  if (!s || s.toLowerCase() === "undefined" || s.toLowerCase() === "null") {
    return "";
  }

  return s;
}

function pickFirst(...vals: any[]) {
  return vals.find(
    (v) => v !== undefined && v !== null && String(v).trim() !== ""
  );
}

export default function CratePackerDivisionScreen() {
  const params = useLocalSearchParams();
  const division = parseDivision(params.division);

  const dispatch = useAppDispatch();

  const { token, hydrated } = useAppSelector(selectAuthSession);
  const meState = useAppSelector((s: any) => s.me);
  const me = meState?.me;

  const roleText = useMemo(() => {
    return cleanText(
      pickFirst(
        me?.rootverse_type,
        me?.role,
        me?.user_type,
        me?.type,
        me?.designation
      )
    ).toUpperCase();
  }, [
    me?.rootverse_type,
    me?.role,
    me?.user_type,
    me?.type,
    me?.designation,
  ]);

  const isCratePacker = roleText.includes("CRATE");

  useEffect(() => {
    if (!hydrated) return;

    if (!token) {
      router.replace("/(auth)/login");
      return;
    }

    if (!division) {
      router.replace("/crate_packer");
      return;
    }

    if (meState?.me) return;
    if (meState?.loading) return;

    dispatch(fetchMe()).unwrap().catch(() => {});
  }, [dispatch, hydrated, token, division, meState?.me, meState?.loading]);

  if (!division) {
    return (
      <View className="flex-1 items-center justify-center bg-[#030712] px-6">
        <ActivityIndicator />
        <Text className="mt-3 font-extrabold text-white/70">
          Opening divisions...
        </Text>
      </View>
    );
  }

  if (!hydrated || meState?.loading || (token && !me)) {
    return (
      <View className="flex-1 items-center justify-center bg-[#030712] px-6">
        <ActivityIndicator />
        <Text className="mt-3 font-extrabold text-white/70">
          Loading crate packer...
        </Text>
      </View>
    );
  }

  if (!token) {
    return (
      <View className="flex-1 items-center justify-center bg-[#030712] px-6">
        <Text className="font-extrabold text-white">Login required</Text>
      </View>
    );
  }

  if (!isCratePacker) {
    return (
      <View className="flex-1 items-center justify-center bg-[#030712] px-6">
        <Text className="text-center font-extrabold text-white">
          Your account is not mapped as Crate Packer
        </Text>
      </View>
    );
  }

  if (division === "aqua") {
    return <AquaCratePackerDashboard meOverride={me} />;
  }

  return <CratePackerDashboard meOverride={me} />;
}