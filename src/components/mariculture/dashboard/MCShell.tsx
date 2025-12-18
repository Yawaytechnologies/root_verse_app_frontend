import { BlurView } from "expo-blur";
import React from "react";
import { View } from "react-native";

export function GlassCard({
  children,
  radius = 26,
  pad = 18,
}: {
  children: React.ReactNode;
  radius?: number;
  pad?: number;
}) {
  return (
    <BlurView intensity={28} tint="dark" style={{ borderRadius: radius, overflow: "hidden" }}>
      <View style={{ borderRadius: radius, padding: pad }} className="bg-white/6 border border-white/12">
        {children}
      </View>
    </BlurView>
  );
}
