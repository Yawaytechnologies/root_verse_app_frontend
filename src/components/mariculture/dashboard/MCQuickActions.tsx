import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useIsDarkTheme } from "../../../store/useIsDarkTheme";
import { GlassCard } from "./MCShell";

const ACTIONS = [
  {
    icon: "analytics-outline",
    title: "Log Growth Monitoring",
    subtitle: "Water, growth, maintenance",
  },
  {
    icon: "documents-outline",
    title: "Create Marine Harvest",
    subtitle: "Batch ID + harvest details",
  },
  {
    icon: "qr-code-outline",
    title: "Assign Crates",
    subtitle: "Scan QR → map to batch",
  },
];

export default function MCQuickActions() {
  const isDark = useIsDarkTheme();

  // ✅ theme tokens (only a few — keeps it simple)
  const title = isDark ? "#ffffff" : "#0B1220";
const muted = isDark ? "rgba(226,232,240,0.72)" : "rgba(15,23,42,0.72)";

  const border = isDark ? "rgba(255,255,255,0.10)" : "rgba(2,6,23,0.10)";

  const pillBg = isDark ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.92)";
  const pillBorder = isDark ? "rgba(148,163,184,0.7)" : "rgba(2,6,23,0.12)";
  const pillText = isDark ? "#f9fafb" : "#0f172a";

  const rowGrad = isDark
    ? ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.03)", "rgba(0,0,0,0.15)"]
    : ["rgba(2,6,23,0.02)", "rgba(2,6,23,0.01)", "rgba(2,6,23,0.04)"];

  const chevronBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(2,6,23,0.04)";
  const chevronBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(2,6,23,0.10)";
  const chevronColor = isDark ? "rgba(226,232,240,0.75)" : "rgba(15,23,42,0.55)";

  const divider = isDark ? "rgba(255,255,255,0.10)" : "rgba(2,6,23,0.08)";

  const bottomFade = isDark
    ? ["rgba(0,0,0,0)", "rgba(0,0,0,0.25)"]
    : ["rgba(255,255,255,0)", "rgba(2,6,23,0.06)"];

  return (
    <GlassCard radius={24} pad={18}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: title, fontSize: 17, fontWeight: "900", letterSpacing: 0.2 }}>
            Quick Actions
          </Text>
          <Text style={{ color: muted, fontSize: 12, marginTop: 4, lineHeight: 16 }}>
            Operational shortcuts for field teams
          </Text>
        </View>

        {/* See all pill */}
        <Pressable onPress={() => {}} style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1 })}>
          <View
            style={{
              height: 32,
              minWidth: 72,
              paddingHorizontal: 12,
              borderRadius: 999,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pillBg,
              borderWidth: 1,
              borderColor: pillBorder,
            }}
          >
            <Text
              style={{
                color: pillText,
                fontSize: 12,
                fontWeight: "800",
                letterSpacing: 0.4,
              }}
              numberOfLines={1}
            >
              See all
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Divider */}
      <View style={{ marginTop: 16, height: 1, backgroundColor: divider }} />

      {/* Actions */}
      <View style={{ marginTop: 16 }}>
        {ACTIONS.map((a) => (
          <Pressable
            key={a.title}
            onPress={() => {}}
            style={({ pressed }) => ({
              borderRadius: 16,
              overflow: "hidden",
              opacity: pressed ? 0.9 : 1,
              borderWidth: 1,
              borderColor: border,
              marginBottom: 10,
            })}
          >
            <LinearGradient
              colors={rowGrad}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={{ paddingHorizontal: 14, paddingVertical: 14 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {/* Icon badge (kept same, looks good in both) */}
                <View
                  style={{
                    height: 46,
                    width: 46,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(125,211,252,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(125,211,252,0.22)",
                  }}
                >
                  <Ionicons name={a.icon as any} size={20} color="#7dd3fc" />
                </View>

                {/* Text block */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={{
                      color: title,
                      fontSize: 14,
                      fontWeight: "900",
                      letterSpacing: 0.15,
                    }}
                    numberOfLines={1}
                  >
                    {a.title}
                  </Text>
                  <Text
                    style={{
                      color: muted,
                      fontSize: 12,
                      marginTop: 4,
                      lineHeight: 16,
                    }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {a.subtitle}
                  </Text>
                </View>

                {/* Chevron pill */}
                <View
                  style={{
                    height: 30,
                    width: 30,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: chevronBg,
                    borderWidth: 1,
                    borderColor: chevronBorder,
                  }}
                >
                  <Ionicons name="chevron-forward" size={16} color={chevronColor} />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </View>

      {/* Bottom fade */}
      <View style={{ marginTop: 16 }}>
        <LinearGradient
          colors={bottomFade}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ height: 12, borderRadius: 12 }}
        />
      </View>
    </GlassCard>
  );
}
