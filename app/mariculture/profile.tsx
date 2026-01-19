import { useIsDarkTheme } from "@/src/store/useIsDarkTheme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const SKY = "#7dd3fc";
const MINT = "#34d399";

type RowItem = {
  key: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  rightText?: string;
  danger?: boolean;
  onPress?: () => void;
};

export default function ProfileScreen() {
  const isDark = useIsDarkTheme();
  const [lang, setLang] = useState<"English" | "தமிழ்">("English");

  const T = useMemo(() => {
    // Background: dark stays same, light becomes soft light gradient
    const bg = isDark
      ? ["#071425", "#06101E", "#04060D"]
      : ["#f5f7fb", "#eef2f7", "#e9eff6"];

    // Vignette: reduce heavy dark overlay in light mode
    const vignette = isDark
      ? ["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]
      : ["rgba(0,0,0,0)", "rgba(0,0,0,0.10)"];

    // Text colors
    const titleGreen = isDark ? MINT : "#10b981";
    const title = isDark ? "rgba(255,255,255,0.96)" : "#0f172a";
    const sub = isDark ? "rgba(226,232,240,0.72)" : "rgba(15,23,42,0.60)";
    const faint = isDark ? "rgba(226,232,240,0.62)" : "rgba(15,23,42,0.52)";

    // Surfaces
    const cardBg = isDark ? "rgba(255,255,255,0.03)" : "#ffffff";
    const cardBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";

    // Chip / status pill
    const chipBg = isDark ? "rgba(15,23,42,0.70)" : "rgba(15,23,42,0.10)";
    const chipBorder = isDark ? "rgba(148,163,184,0.35)" : "rgba(15,23,42,0.12)";
    const chipText = isDark ? "rgba(209,250,229,0.92)" : "#0f172a";

    // Row chevron bubble
    const bubbleBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.06)";
    const bubbleBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";
    const chevron = isDark ? "rgba(226,232,240,0.70)" : "rgba(15,23,42,0.55)";

    return {
      bg,
      vignette,
      titleGreen,
      title,
      sub,
      faint,
      cardBg,
      cardBorder,
      chipBg,
      chipBorder,
      chipText,
      bubbleBg,
      bubbleBorder,
      chevron,
    };
  }, [isDark]);

  const prefRows: RowItem[] = useMemo(
    () => [
      {
        key: "notifications",
        title: "Notifications",
        subtitle: "Alerts & reminders",
        icon: "notifications-outline",
        onPress: () =>
          Alert.alert("Notifications", "Hook to notification settings screen."),
      },
      {
        key: "privacy",
        title: "Privacy",
        subtitle: "Permissions, data usage",
        icon: "shield-checkmark-outline",
        onPress: () => Alert.alert("Privacy", "Hook to privacy screen."),
      },
    ],
    []
  );

  const appRows: RowItem[] = useMemo(
    () => [
      {
        key: "lang",
        title: "Language",
        subtitle: "Choose app language",
        icon: "language-outline",
        rightText: lang,
        onPress: () => setLang((p) => (p === "English" ? "தமிழ்" : "English")),
      },
      {
        key: "help",
        title: "Help & support",
        subtitle: "FAQs, contact",
        icon: "help-circle-outline",
        onPress: () => Alert.alert("Help & support", "Hook to support screen."),
      },
      {
        key: "about",
        title: "About",
        subtitle: "Version, terms",
        icon: "information-circle-outline",
        onPress: () => Alert.alert("About", "RootVerse • Mariculture module"),
      },
    ],
    [lang]
  );

  const logoutRow: RowItem = useMemo(
    () => ({
      key: "logout",
      title: "Logout",
      subtitle: "Sign out of this device",
      icon: "log-out-outline",
      danger: true,
      onPress: () =>
        Alert.alert("Logout", "Are you sure you want to logout?", [
          { text: "Cancel", style: "cancel" },
          { text: "Logout", style: "destructive", onPress: () => {} },
        ]),
    }),
    []
  );

  const headerEnter = FadeInDown.duration(Platform.OS === "android" ? 180 : 240);
  const cardEnter = FadeInUp.duration(Platform.OS === "android" ? 180 : 240);

  function SectionTitle({ label }: { label: string }) {
    return (
      <Text
        style={{
          marginTop: 16,
          marginBottom: 10,
          color: T.faint,
          fontSize: 11,
          fontWeight: "900",
          letterSpacing: 1.6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    );
  }

  function HeaderChip({ label }: { label: string }) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 38,
          paddingHorizontal: 14,
          borderRadius: 999,
          backgroundColor: T.chipBg,
          borderWidth: 1,
          borderColor: T.chipBorder,
        }}
      >
        <Ionicons name="leaf-outline" size={16} color={T.titleGreen} />
        <Text
          style={{
            marginLeft: 8,
            color: T.chipText,
            fontSize: 13,
            fontWeight: "900",
            letterSpacing: 0.2,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    );
  }

  function GlassCard({ children }: { children: React.ReactNode }) {
    return (
      <View
        style={{
          borderRadius: 22,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: T.cardBorder,
          backgroundColor: T.cardBg,
        }}
      >
        <View style={{ padding: 14 }}>{children}</View>
      </View>
    );
  }

  function ProfileRow({ item }: { item: RowItem }) {
    const iconBg = item.danger
      ? "rgba(239,68,68,0.10)"
      : isDark
      ? "rgba(125,211,252,0.10)"
      : "rgba(125,211,252,0.16)";

    const iconBd = item.danger
      ? "rgba(239,68,68,0.18)"
      : isDark
      ? "rgba(125,211,252,0.20)"
      : "rgba(125,211,252,0.28)";

    const iconColor = item.danger ? "rgba(252,165,165,0.95)" : SKY;

    const titleColor = item.danger ? "rgba(239,68,68,0.92)" : T.title;
    const subColor = item.danger ? "rgba(239,68,68,0.62)" : T.faint;
    const chevronColor = item.danger ? "rgba(239,68,68,0.70)" : T.chevron;

    return (
      <Pressable
        onPress={item.onPress}
        style={({ pressed }) => [
          {
            marginBottom: 10,
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.992 : 1 }],
          },
        ]}
      >
        <View
          style={{
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: T.cardBorder,
            backgroundColor: isDark ? "rgba(255,255,255,0.035)" : "#ffffff",
          }}
        >
          <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  height: 44,
                  width: 44,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: iconBg,
                  borderWidth: 1,
                  borderColor: iconBd,
                }}
              >
                <Ionicons name={item.icon} size={20} color={iconColor} />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{
                    color: titleColor,
                    fontSize: 14,
                    fontWeight: "900",
                    letterSpacing: 0.15,
                  }}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>

                {!!item.subtitle && (
                  <Text
                    style={{
                      marginTop: 3,
                      color: subColor,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                    numberOfLines={1}
                  >
                    {item.subtitle}
                  </Text>
                )}
              </View>

              {item.rightText ? (
                <Text
                  style={{
                    marginRight: 8,
                    color: T.faint,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                  numberOfLines={1}
                >
                  {item.rightText}
                </Text>
              ) : null}

              <View
                style={{
                  height: 30,
                  width: 30,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: T.bubbleBg,
                  borderWidth: 1,
                  borderColor: T.bubbleBorder,
                }}
              >
                <Ionicons name="chevron-forward" size={16} color={chevronColor} />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <LinearGradient
        colors={T.bg}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={T.vignette}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 130 }}
        >
          <View style={{ paddingHorizontal: 18, paddingTop: 34 }}>
            {/* Header */}
            <Animated.View entering={headerEnter}>
              <Text
                style={{
                  color: T.titleGreen,
                  fontSize: 36,
                  fontWeight: "900",
                  letterSpacing: 0.2,
                }}
                numberOfLines={1}
              >
                Mariculture
              </Text>

              <Text
                style={{
                  marginTop: 6,
                  color: T.sub,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 18,
                }}
              >
                Seaweed traceability • Marine Farm → Cultivation Unit
              </Text>

              <View style={{ marginTop: 12, alignSelf: "flex-start" }}>
                <HeaderChip label="Registry + Ops" />
              </View>
            </Animated.View>

            {/* User card */}
            <Animated.View entering={cardEnter} style={{ marginTop: 16 }}>
              <GlassCard>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      height: 54,
                      width: 54,
                      borderRadius: 20,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isDark
                        ? "rgba(125,211,252,0.12)"
                        : "rgba(125,211,252,0.18)",
                      borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(125,211,252,0.22)"
                        : "rgba(125,211,252,0.30)",
                    }}
                  >
                    <Ionicons name="person-outline" size={24} color={SKY} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={{
                        color: T.title,
                        fontSize: 15,
                        fontWeight: "900",
                        letterSpacing: 0.15,
                      }}
                      numberOfLines={1}
                    >
                      Field Operator
                    </Text>
                    <Text
                      style={{
                        marginTop: 4,
                        color: T.faint,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                      numberOfLines={1}
                    >
                      Mariculture • Registry + Ops
                    </Text>
                  </View>

                  <View
                    style={{
                      height: 32,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: T.chipBg,
                      borderWidth: 1,
                      borderColor: T.chipBorder,
                    }}
                  >
                    <Text
                      style={{
                        color: isDark ? "rgba(226,232,240,0.78)" : "rgba(15,23,42,0.70)",
                        fontSize: 12,
                        fontWeight: "900",
                        letterSpacing: 0.2,
                      }}
                    >
                      Online
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>

            {/* Preferences */}
            <SectionTitle label="Preferences" />
            {prefRows.map((item) => (
              <ProfileRow key={item.key} item={item} />
            ))}

            {/* App */}
            <SectionTitle label="App" />
            {appRows.map((item) => (
              <ProfileRow key={item.key} item={item} />
            ))}

            {/* Logout */}
            <SectionTitle label="Account" />
            <ProfileRow item={logoutRow} />
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
