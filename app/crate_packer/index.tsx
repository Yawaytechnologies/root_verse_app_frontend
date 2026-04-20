// app/crate_packer/index.tsx
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import { selectAuthSession } from "../../src/store/auth/authSession.slice";
import { fetchMe } from "../../src/store/auth/me.slice";

type HubCardProps = {
  title: string;
  subtitle: string;
  to:
    | "/crate_packer/wild"
    | "/crate_packer/aqua"
    | "/crate_packer/mariculture"
    | "/crate_packer/[division]";
  params?: { division: "wild" | "aqua" | "mariculture" };
  enabled?: boolean;
};

function HubCard({ title, subtitle, to, params, enabled = true }: HubCardProps) {
  const onPress = () => {
    if (!enabled) {
      // same vibe as QC: no toast, no banner
      // send to login
      router.replace("/(auth)/login");
      return;
    }

    if (params) {
      router.push({ pathname: to, params } as any);
      return;
    }

    router.push(to as any);
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={false} // keep pressable, we redirect to login when disabled
      className={`active:opacity-90 ${!enabled ? "opacity-60" : ""}`}
    >
      <BlurView intensity={18} tint="light" className="overflow-hidden rounded-3xl">
        <LinearGradient
          colors={["rgba(255,255,255,0.75)", "rgba(255,255,255,0.30)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-3xl border border-white/40 px-5 py-6"
        >
          <Text className="text-xl font-extrabold text-[#0B1220]">{title}</Text>
          <Text className="mt-1 text-sm text-[#334155]">{subtitle}</Text>

          <View
            className={`mt-4 self-start rounded-full px-4 py-2 ${
              enabled ? "bg-[#0B1220]" : "bg-[#0B1220]/70"
            }`}
          >
            <Text className="text-white font-semibold">
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

  // allow enter only if token + me loaded + role includes CRATE
  const rtype = useMemo(() => {
    return String(meState?.me?.rootverse_type || "").toUpperCase();
  }, [meState?.me?.rootverse_type]);

  const isCratePacker = useMemo(() => rtype.includes("CRATE"), [rtype]);

  const canEnter = !!token && !!meState?.me && isCratePacker;

  // keep me fresh once after login
  React.useEffect(() => {
    if (!hydrated) return;
    if (!token) return;
    if (meState?.me) return;
    if (meState?.loading) return;

    dispatch(fetchMe()).unwrap().catch(() => {});
  }, [hydrated, token]); // intentionally not including meState to avoid loops

  return (
    <View className="flex-1 bg-[#0B1220]">
      <LinearGradient
        colors={["#0B1220", "#0F1A2E", "#0B1220"]}
        className="absolute inset-0"
      />

      <View className="flex-1 px-5">
        <View className="flex-1 justify-center">
          <Text className="text-2xl font-extrabold text-white">Choose Division</Text>
          <Text className="mt-2 text-base text-white/70">
            Crate Packer can enter any division from here
          </Text>

          <View className="mt-8 gap-4">
            <HubCard
              title="Wild Capture"
              subtitle="Crate pack • Scan • Packed list"
              to="/crate_packer/[division]"
              params={{ division: "wild" }}
              enabled={canEnter}
            />

            <HubCard
              title="Aquaculture"
              subtitle="Crate pack • Scan • Packed list"
              to="/crate_packer/[division]"
              params={{ division: "aqua" }}
              enabled={canEnter}
            />

            <HubCard
              title="Mariculture"
              subtitle="Crate pack • Scan • Packed list"
              to="/crate_packer/[division]"
              params={{ division: "mariculture" }}
              enabled={canEnter}
            />
          </View>

          {/* Optional small hint like QC (no banner) */}
          {!hydrated ? (
            <Text className="mt-6 text-white/60 text-sm">Starting...</Text>
          ) : !token ? (
            <Text className="mt-6 text-white/60 text-sm">Login required</Text>
          ) : meState?.loading ? (
            <Text className="mt-6 text-white/60 text-sm">Loading profile...</Text>
          ) : token && !isCratePacker ? (
            <Text className="mt-6 text-white/60 text-sm">
              Your account is not mapped as Crate Packer
            </Text>
          ) : null}
        </View>

        <View className="h-6" />
      </View>
    </View>
  );
}