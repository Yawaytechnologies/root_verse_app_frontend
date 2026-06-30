// app/crate_packer/index.tsx
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import { selectAuthSession } from "../../src/store/auth/authSession.slice";
import { fetchMe } from "../../src/store/auth/me.slice";

type DivisionKey = "wild" | "aqua" | "mariculture";

type HubCardProps = {
  title: string;
  subtitle: string;
  division: DivisionKey;
  enabled?: boolean;
};

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

function HubCard({
  title,
  subtitle,
  division,
  enabled = true,
}: HubCardProps) {
  const onPress = useCallback(() => {
    if (!enabled) {
      router.replace("/(auth)/login");
      return;
    }

    router.push(`/crate_packer/${division}` as any);
  }, [division, enabled]);

  return (
    <Pressable
      onPress={onPress}
      className={`active:opacity-90 ${!enabled ? "opacity-60" : ""}`}
    >
      <BlurView
        intensity={18}
        tint="light"
        className="overflow-hidden rounded-3xl"
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.75)", "rgba(255,255,255,0.30)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-3xl border border-white/40 px-5 py-6"
        >
          <Text className="text-xl font-extrabold text-[#0B1220]">
            {title}
          </Text>

          <Text className="mt-1 text-sm text-[#334155]">{subtitle}</Text>

          <View
            className={`mt-4 self-start rounded-full px-4 py-2 ${
              enabled ? "bg-[#0B1220]" : "bg-[#0B1220]/70"
            }`}
          >
            <Text className="font-semibold text-white">
              {enabled ? "Open" : "Login"}
            </Text>
          </View>
        </LinearGradient>
      </BlurView>
    </Pressable>
  );
}

export default function CratePackerHomeScreen() {
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

  const isCratePacker = useMemo(() => {
    return roleText.includes("CRATE");
  }, [roleText]);

  const canEnter = !!token && !!me && isCratePacker;

  useEffect(() => {
    if (!hydrated) return;
    if (!token) return;
    if (meState?.me) return;
    if (meState?.loading) return;

    dispatch(fetchMe()).unwrap().catch(() => {});
  }, [dispatch, hydrated, token, meState?.me, meState?.loading]);

  return (
    <View className="flex-1 bg-[#0B1220]">
      <LinearGradient
        colors={["#0B1220", "#0F1A2E", "#0B1220"]}
        className="absolute inset-0"
      />

      <View className="flex-1 px-5">
        <View className="flex-1 justify-center">
          <Text className="text-2xl font-extrabold text-white">
            Choose Division
          </Text>

          <Text className="mt-2 text-base text-white/70">
            Crate Packer can enter any division from here
          </Text>

          <View className="mt-8 gap-4">
            <HubCard
              title="Wild Capture"
              subtitle="Crate pack • Scan • Packed list"
              division="wild"
              enabled={canEnter}
            />

            <HubCard
              title="Aquaculture"
              subtitle="Crate pack • Scan • Packed list"
              division="aqua"
              enabled={canEnter}
            />

            <HubCard
              title="Mariculture"
              subtitle="Crate pack • Scan • Packed list"
              division="mariculture"
              enabled={canEnter}
            />
          </View>

          {!hydrated ? (
            <Text className="mt-6 text-sm text-white/60">Starting...</Text>
          ) : !token ? (
            <Text className="mt-6 text-sm text-white/60">Login required</Text>
          ) : meState?.loading ? (
            <Text className="mt-6 text-sm text-white/60">
              Loading profile...
            </Text>
          ) : token && !isCratePacker ? (
            <Text className="mt-6 text-sm text-white/60">
              Your account is not mapped as Crate Packer
            </Text>
          ) : null}
        </View>

        <View className="h-6" />
      </View>
    </View>
  );
}