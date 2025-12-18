import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, Text, View } from "react-native";
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
  return (
    <GlassCard radius={24} pad={18}>
      {/* Header */}
      <View className="flex-row items-end justify-between">
        <View className="flex-1 pr-3">
          <Text
            className="text-white text-[17px]"
            style={{ fontWeight: "900", letterSpacing: 0.2 }}
          >
            Quick Actions
          </Text>
          <Text
            className="text-slate-300 text-[12px] mt-1"
            style={{ lineHeight: 16 }}
          >
            Operational shortcuts for field teams
          </Text>
        </View>

        {/* Clean “See all” pill */}
        <Pressable onPress={() => {}}>
          <View
            style={{
              height: 32,
              minWidth: 72,
              paddingHorizontal: 12,
              borderRadius: 999,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(15,23,42,0.85)",
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.7)",
            }}
          >
            <Text
              style={{
                color: "#f9fafb",
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
      <View className="mt-4 h-[1px] bg-white/10" />

      {/* Actions */}
      <View className="mt-4">
        {ACTIONS.map((a) => (
          <Pressable
            key={a.title}
            onPress={() => {}}
            className="rounded-2xl overflow-hidden active:opacity-90"
            style={{
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              marginBottom: 10, // small gap between the 3 cards
            }}
          >
            {/* Subtle row gradient background */}
            <LinearGradient
              colors={[
                "rgba(255,255,255,0.06)",
                "rgba(255,255,255,0.03)",
                "rgba(0,0,0,0.15)",
              ]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={{ paddingHorizontal: 14, paddingVertical: 14 }}
            >
              <View className="flex-row items-center">
                {/* Premium icon badge */}
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
                <View className="flex-1" style={{ marginLeft: 12 }}>
                  <Text
                    className="text-white text-[14px]"
                    style={{ fontWeight: "900", letterSpacing: 0.15 }}
                    numberOfLines={1}
                  >
                    {a.title}
                  </Text>
                  <Text
                    className="text-slate-300 text-[12px] mt-1"
                    style={{ lineHeight: 16 }}
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
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                  }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="rgba(226,232,240,0.75)"
                  />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </View>

      {/* Soft bottom fade to add depth */}
      <View className="mt-4">
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.25)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ height: 12, borderRadius: 12 }}
        />
      </View>
    </GlassCard>
  );
}
