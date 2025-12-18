import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

function SectionTitle({ label }: { label: string }) {
  return (
    <Text
      style={{
        marginTop: 16,
        marginBottom: 10,
        color: "rgba(226,232,240,0.62)",
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
        backgroundColor: "rgba(15,23,42,0.70)",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.35)",
      }}
    >
      <Ionicons name="leaf-outline" size={16} color={MINT} />
      <Text
        style={{
          marginLeft: 8,
          color: "rgba(209,250,229,0.92)",
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
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(255,255,255,0.03)",
      }}
    >
      <View style={{ padding: 14 }}>{children}</View>
    </View>
  );
}

function ProfileRow({ item }: { item: RowItem }) {
  const iconBg = item.danger
    ? "rgba(239,68,68,0.10)"
    : "rgba(125,211,252,0.10)";
  const iconBd = item.danger
    ? "rgba(239,68,68,0.18)"
    : "rgba(125,211,252,0.20)";
  const iconColor = item.danger ? "rgba(252,165,165,0.95)" : SKY;

  const titleColor = item.danger
    ? "rgba(252,165,165,0.95)"
    : "rgba(255,255,255,0.95)";
  const subColor = item.danger
    ? "rgba(252,165,165,0.68)"
    : "rgba(226,232,240,0.62)";
  const chevronColor = item.danger
    ? "rgba(252,165,165,0.70)"
    : "rgba(226,232,240,0.70)";

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
      {/* ✅ NO Animated entering + NO per-row LinearGradient (fast) */}
      <View
        style={{
          borderRadius: 18,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          backgroundColor: "rgba(255,255,255,0.035)", // glass
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
                  color: "rgba(226,232,240,0.64)",
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
                backgroundColor: "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
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

export default function ProfileScreen() {
  const [lang, setLang] = useState<"English" | "தமிழ்">("English");

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

  return (
    <View style={{ flex: 1 }}>
      {/* Background like Dashboard */}
      <LinearGradient
        colors={["#071425", "#06101E", "#04060D"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* vignette */}
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 130 }}
        >
          {/* moved down for premium spacing */}
          <View style={{ paddingHorizontal: 18, paddingTop: 34 }}>
            {/* Header */}
            <Animated.View entering={headerEnter}>
              <Text
                style={{
                  color: MINT,
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
                  color: "rgba(226,232,240,0.72)",
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
                      backgroundColor: "rgba(125,211,252,0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(125,211,252,0.22)",
                    }}
                  >
                    <Ionicons name="person-outline" size={24} color={SKY} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.96)",
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
                        color: "rgba(226,232,240,0.62)",
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
                      backgroundColor: "rgba(15,23,42,0.72)",
                      borderWidth: 1,
                      borderColor: "rgba(148,163,184,0.35)",
                    }}
                  >
                    <Text
                      style={{
                        color: "rgba(226,232,240,0.78)",
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
