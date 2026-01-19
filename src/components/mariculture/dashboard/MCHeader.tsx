import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { toggleTheme } from "../../../features/theme/themeSlice";
import { useAppDispatch } from "../../../store/hooks";
import { useIsDarkTheme } from "../../../store/useIsDarkTheme";

export default function MCHeader({
  title,
  subtitle,
  rightHint = "Registry + Ops",
}: {
  title: string;
  subtitle: string;
  rightHint?: string;
}) {
  const dispatch = useAppDispatch();
  const isDark = useIsDarkTheme();

  // ✅ High-contrast tokens (professional light mode)
  const titleColor = isDark ? "#6ee7b7" : "#065f46";
  const mainText = isDark ? "#ffffff" : "#0B1220";
  const subText = isDark ? "rgba(226,232,240,0.76)" : "rgba(15,23,42,0.74)";

  // ✅ Mobile needs stronger contrast than web
  const btnBg = isDark
    ? Platform.OS === "web"
      ? "rgba(255,255,255,0.05)"
      : "rgba(15,23,42,0.72)" // stronger on mobile dark
    : Platform.OS === "web"
      ? "rgba(2,6,23,0.04)"
      : "rgba(255,255,255,0.92)"; // stronger on mobile light

  const btnBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(2,6,23,0.12)";
  const iconColor = isDark ? "#e2e8f0" : "rgba(15,23,42,0.82)";

  // ✅ Solid icons look better on mobile (outline looks too thin)
  const toggleIconName =
    Platform.OS === "web"
      ? (isDark ? "sunny-outline" : "moon-outline")
      : (isDark ? "sunny" : "moon");

  const toggleIconSize = Platform.OS === "web" ? 18 : 20;

  const shadowStyle =
    Platform.OS === "android"
      ? { elevation: 6 }
      : {
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.22 : 0.10,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
        };

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          style={{
            height: 44,
            width: 44,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: btnBg,
            borderWidth: 1,
            borderColor: btnBorder,
            ...shadowStyle,
          }}
        >
          <Ionicons name="chevron-back" size={18} color={iconColor} />
        </Pressable>

        {/* Title + subtitle */}
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ color: titleColor, fontSize: 28, fontWeight: "900" }}>
            {title}
          </Text>

          <Text
            style={{
              color: mainText,
              fontSize: 16,
              marginTop: 4,
              fontWeight: "900",
            }}
          >
            {subtitle}
          </Text>

          <Text
            style={{
              color: subText,
              fontSize: 12,
              marginTop: 8,
              fontWeight: isDark ? "700" : "800",
              letterSpacing: 0.2,
            }}
          >
            {rightHint}
          </Text>
        </View>

        {/* Theme toggle */}
        <Pressable
          onPress={() => dispatch(toggleTheme())}
          style={{
            height: 44,
            width: 44,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: btnBg,
            borderWidth: 1,
            borderColor: btnBorder,
            ...shadowStyle,
          }}
          accessibilityLabel="Toggle theme"
        >
          <Ionicons
            name={toggleIconName as any}
            size={toggleIconSize}
            color={isDark ? "#fde68a" : "rgba(15,23,42,0.82)"}
          />
        </Pressable>
      </View>
    </View>
  );
}
