// app/quality/index.tsx
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { useAppSelector } from "../../src/store/hooks";
import { selectInspector } from "../../src/store/qualityAuth/qualityAuth.slice";

type HubCardProps = {
  title: string;
  subtitle: string;
  to: "/quality/wild" | "/quality/aqua" | "/quality/mariculture";
  enabled?: boolean;
};

function HubCard({ title, subtitle, to, enabled = true }: HubCardProps) {
  const onPress = () => {
    // keep this simple: if not enabled, just stop (no toast, no banner)
    if (!enabled) return;
    router.push(to);
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
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

export default function QualityHomeScreen() {
  const inspector = useAppSelector(selectInspector);
  const canEnter = !!inspector;

  return (
    <View className="flex-1 bg-[#0B1220]">
      <LinearGradient
        colors={["#0B1220", "#0F1A2E", "#0B1220"]}
        className="absolute inset-0"
      />

      <View className="flex-1 px-5">
        {/* ✅ InspectorBanner removed بالكامل */}

        <View className="flex-1 justify-center">
          <Text className="text-2xl font-extrabold text-white">Choose Division</Text>
          <Text className="mt-2 text-base text-white/70">
            Inspector can enter any module from here
          </Text>

          <View className="mt-8 gap-4">
            <HubCard
              title="Wild Capture"
              subtitle="Crate scan • Catch inspection • Approve/Reject"
              to="/quality/wild"
              enabled={canEnter}
            />
            <HubCard
              title="Aquaculture"
              subtitle="Farm lots • Quality scoring • Reports"
              to="/quality/aqua"
              enabled={canEnter}
            />
            <HubCard
              title="Mariculture"
              subtitle="Cages/units • QC checks • Trace updates"
              to="/quality/mariculture"
              enabled={canEnter}
            />
          </View>
        </View>

        <View className="h-6" />
      </View>
    </View>
  );
}
