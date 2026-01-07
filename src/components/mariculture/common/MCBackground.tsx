import { useIsDarkTheme } from "@/src/store/useIsDarkTheme";
import React from "react";
import { StyleSheet, View } from "react-native";
import { MCShell } from "../dashboard/MCShell";

export default function MCBackground({ children }: { children: React.ReactNode }) {
  const isDark = useIsDarkTheme();

  return (
    <MCShell>
      <View style={{ flex: 1 }}>
        {/* ✅ Contrast boost (no color change, only opacity tuning) */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              // dark mode: tiny white lift
              // light mode: tiny black lift
              backgroundColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.05)",
            },
          ]}
        />

        {children}
      </View>
    </MCShell>
  );
}
