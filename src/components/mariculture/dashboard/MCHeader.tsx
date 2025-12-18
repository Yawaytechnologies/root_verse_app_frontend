import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

export default function MCHeader({
  title,
  subtitle,
  rightHint = "Registry + Ops",
}: {
  title: string;
  subtitle: string;
  rightHint?: string;
}) {
  return (
    <View className="px-5 pt-10 pb-3">
      <View className="flex-row items-start">
        {/* Back */}

        {/* Title + subtitle */}
        <View className="flex-1 ml-3" style={{ minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 32,          // ✅ bigger (try 34 if you want)
              fontWeight: "900",
              letterSpacing: 0.4,
              color: "#34D399",
              textShadowColor: "rgba(0,0,0,0.35)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 10,
            }}
          >
            {title}
          </Text>


          <Text
            numberOfLines={2}
            className="text-slate-300 text-[12px] mt-1"
            style={{
              lineHeight: 16,
              opacity: 0.95,
            }}
          >
            {subtitle}
          </Text>
        </View>

        {/* Right badge (never overflow) */}
        <View style={{ maxWidth: 170, marginLeft: 10, alignSelf: "center" }}>
          <View
            className="flex-row items-center px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-300/20"
            style={{
              transform: [{ translateY: 6 }], // ✅ moves it a little below to match title line
            }}
          >
            <Ionicons name="leaf-outline" size={16} color="#6EE7B7" />
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="ml-2 text-[11px]"
              style={{ fontWeight: "800", color: "#A7F3D0" }}
            >
              {rightHint}
            </Text>
          </View>
        </View>

      </View>
    </View>
  );
}
