// app/quality/index.tsx
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
 
import InspectorBanner from "../../src/components/quality/InspectorBanner";
import { useAppSelector } from "../../src/store/hooks";
import { selectInspector } from "../../src/store/qualityAuth/qualityAuth.slice";
 
type HubCardProps = {
  title: string;
  subtitle: string;
  to: "/quality/wild" | "/quality/aqua" | "/quality/mariculture";
};
 
function HubCard({ title, subtitle, to }: HubCardProps) {
  return (
<Pressable onPress={() => router.push(to)} className="active:opacity-90">
<BlurView intensity={18} tint="light" className="overflow-hidden rounded-3xl">
<LinearGradient
          colors={["rgba(255,255,255,0.75)", "rgba(255,255,255,0.30)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-3xl border border-white/40 px-5 py-6"
>
<Text className="text-xl font-extrabold text-[#0B1220]">{title}</Text>
<Text className="mt-1 text-sm text-[#334155]">{subtitle}</Text>
 
          <View className="mt-4 self-start rounded-full bg-[#0B1220] px-4 py-2">
<Text className="text-white font-semibold">Open</Text>
</View>
</LinearGradient>
</BlurView>
</Pressable>
  );
}
 
export default function QualityHomeScreen() {
  const inspector = useAppSelector(selectInspector);
 
  return (
<View className="flex-1 bg-[#0B1220]">
      {/* Background */}
<LinearGradient
        colors={["#0B1220", "#0F1A2E", "#0B1220"]}
        className="absolute inset-0"
      />
 
      <View className="flex-1 px-5">
        {/* Top banner (kept as you already have) */}
<View className="mt-4">
<InspectorBanner inspector={inspector} divisionLabel="Quality" />
</View>
 
        {/* Centered hub */}
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
            />
<HubCard
              title="Aquaculture"
              subtitle="Farm lots • Quality scoring • Reports"
              to="/quality/aqua"
            />
<HubCard
              title="Mariculture"
              subtitle="Cages/units • QC checks • Trace updates"
              to="/quality/mariculture"
            />
</View>
</View>
 
        {/* Bottom spacing */}
<View className="h-6" />
</View>
</View>
  );
}