import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { View } from "react-native";
import { useIsDarkTheme } from "../../../store/useIsDarkTheme";

export function MCShell({ children }: { children: React.ReactNode }) {
  const isDark = useIsDarkTheme();

  const bg = isDark ? "#050B16" : "#F6F8FC";

  // ✅ module background gradient
  const grad = isDark
  ? ["rgba(16,185,129,0.22)", "rgba(0,0,0,0.86)", "rgba(0,0,0,0.96)"]
  : ["rgba(14,165,233,0.10)", "rgba(243,246,251,0.92)", "rgba(243,246,251,1)"];

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <LinearGradient
        colors={grad}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

/* ✅ Your GlassCard stays in same file (keep it here if you already use it) */
export function GlassCard({
  children,
  radius = 22,
  pad = 16,
}: {
  children: React.ReactNode;
  radius?: number;
  pad?: number;
}) {
  const isDark = useIsDarkTheme();

  return (
    <View
      style={{
        borderRadius: radius,
        padding: pad,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(2,6,23,0.10)",
        backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.90)",
      }}
    >
      {children}
    </View>
  );
}
