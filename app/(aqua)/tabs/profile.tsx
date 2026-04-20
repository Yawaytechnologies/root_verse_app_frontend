import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

import { setAppLanguage } from "../../../src/components/aqua/i18n/i18n";
import type { RootState } from "../../../src/store/auth/store";
import { clearMe } from "../../../src/store/auth/me.slice";
import { toggleTheme } from "../../../src/store/theme.slice";

export default function Profile() {
  const dispatch = useDispatch();
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === "DARK";
  const { t, i18n } = useTranslation();
  const me = useSelector((state: RootState) => state.me.me);

  const [langOpen, setLangOpen] = useState(false);
  const [pendingLang, setPendingLang] = useState<"en" | "ta">(
    i18n.language === "ta" ? "ta" : "en"
  );

  const initials = useMemo(() => {
    if (!me?.username) return "U";
    return me.username.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  }, [me?.username]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["auth_token", "owner_id", "owner_code", "me_cache_v1"]);
      dispatch(clearMe());
      router.replace("/(auth)/login");
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const C = isDark ? {
    bg:         "#050B16",
    card:       "#0B1220",
    cardBorder: "rgba(255,255,255,0.08)",
    text:       "#FFFFFF",
    subText:    "rgba(255,255,255,0.52)",
    iconBg:     "rgba(255,255,255,0.08)",
    iconColor:  "rgba(255,255,255,0.85)",
    divider:    "rgba(255,255,255,0.07)",
    chevron:    "rgba(255,255,255,0.3)",
    avatarBg:   "rgba(255,255,255,0.1)",
    sectionLbl: "rgba(255,255,255,0.4)",
    ownerBg:    "rgba(255,255,255,0.05)",
    toggleOn:   "#2563EB",
    toggleOff:  "rgba(255,255,255,0.15)",
    logoutBg:   "rgba(244,63,94,0.12)",
    logoutIcon: "#FB7185",
    logoutText: "#FB7185",
  } : {
    bg:         "#E8EEF6",
    card:       "#EEF3FF",
    cardBorder: "#C0CEEA",
    text:       "#0F172A",
    subText:    "#5A6E8F",
    iconBg:     "#D2E3F8",
    iconColor:  "#0F172A",
    divider:    "#D5E0F0",
    chevron:    "#94A3B8",
    avatarBg:   "#1E293B",
    sectionLbl: "#94A3B8",
    ownerBg:    "#E0EAF8",
    toggleOn:   "#1D4ED8",
    toggleOff:  "#C8D8EE",
    logoutBg:   "#FDE8EC",
    logoutIcon: "#E11D48",
    logoutText: "#E11D48",
  };

  const Divider = () => (
    <View style={{ height: 1, backgroundColor: C.divider, marginHorizontal: 16 }} />
  );

  const Row = ({
    icon, title, subtitle, danger, onPress, rightText, rightNode,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string; subtitle?: string; danger?: boolean;
    onPress?: () => void; rightText?: string; rightNode?: React.ReactNode;
  }) => (
    <Pressable onPress={onPress} style={{
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    }}>
      <View style={{
        height: 40, width: 40, borderRadius: 13,
        alignItems: "center", justifyContent: "center",
        backgroundColor: danger ? C.logoutBg : C.iconBg,
      }}>
        <Ionicons name={icon} size={20} color={danger ? C.logoutIcon : C.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: danger ? C.logoutText : C.text }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, color: C.subText, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      {rightNode ?? null}
      {rightText ? (
        <Text style={{ fontSize: 12, color: C.subText, marginRight: 4 }}>{rightText}</Text>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={C.chevron} />
    </Pressable>
  );

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View style={{
          borderRadius: 22, backgroundColor: C.card,
          borderWidth: 1, borderColor: C.cardBorder, padding: 16,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{
              height: 54, width: 54, borderRadius: 17,
              backgroundColor: C.avatarBg,
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 19 }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: C.text }}>
                {me?.username || "User"}
              </Text>
              <Text style={{ fontSize: 12, color: C.subText, marginTop: 2 }}>
                {me?.rootverse_type || "-"} · RootVerse
              </Text>
              {me?.phone_no ? (
                <Text style={{ fontSize: 12, color: C.subText, marginTop: 2 }}>{me.phone_no}</Text>
              ) : null}
            </View>
          </View>

          {/* Owner ID */}
          <View style={{
            marginTop: 14, borderRadius: 12,
            backgroundColor: C.ownerBg, borderWidth: 1, borderColor: C.cardBorder,
            paddingHorizontal: 14, paddingVertical: 10,
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          }}>
            <Text style={{ fontSize: 11, color: C.subText, textTransform: "uppercase", letterSpacing: 0.6 }}>
              Owner ID
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>
              {me?.owner_id || "—"}
            </Text>
          </View>
        </View>

        {/* App section */}
        <View style={{
          marginTop: 16, borderRadius: 20, backgroundColor: C.card,
          borderWidth: 1, borderColor: C.cardBorder, overflow: "hidden",
        }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: C.sectionLbl, textTransform: "uppercase", letterSpacing: 0.8 }}>
              {t("profile.app")}
            </Text>
          </View>

          <Row
            icon="language-outline"
            title={t("profile.language")}
            subtitle={i18n.language === "ta" ? "தமிழ்" : "English"}
            onPress={() => setLangOpen(true)}
          />
          <Divider />
          <Row
            icon={isDark ? "moon-outline" : "sunny-outline"}
            title="Theme"
            subtitle={isDark ? "Dark mode" : "Light mode"}
            onPress={() => dispatch(toggleTheme())}
            rightNode={
              <View style={{
                width: 44, height: 26, borderRadius: 13,
                backgroundColor: isDark ? C.toggleOn : C.toggleOff,
                justifyContent: "center", paddingHorizontal: 3,
                alignItems: isDark ? "flex-end" : "flex-start",
                marginRight: 4,
              }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" }} />
              </View>
            }
          />
        </View>

        {/* Logout */}
        <View style={{
          marginTop: 16, borderRadius: 20, backgroundColor: C.card,
          borderWidth: 1, borderColor: C.cardBorder, overflow: "hidden",
        }}>
          <Row
            icon="log-out-outline"
            title={t("profile.logout")}
            subtitle={t("profile.logoutSub")}
            danger
            onPress={handleLogout}
          />
        </View>

        <Text style={{ textAlign: "center", fontSize: 11, color: C.sectionLbl, marginTop: 24 }}>
          RootVerse · Aquaculture v1.0
        </Text>
      </ScrollView>

      {/* Language Modal */}
      <Modal transparent visible={langOpen} animationType="fade">
        <Pressable
          onPress={() => setLangOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
        >
          <Pressable style={{
            backgroundColor: C.card, borderTopLeftRadius: 24,
            borderTopRightRadius: 24, padding: 20,
          }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 16 }}>
              {t("profile.language")}
            </Text>
            <View style={{ gap: 10 }}>
              {[{ code: "en", label: "English" }, { code: "ta", label: "தமிழ்" }].map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => setPendingLang(lang.code as "en" | "ta")}
                  style={{
                    padding: 14, borderRadius: 14, borderWidth: 1.5,
                    borderColor: pendingLang === lang.code ? "#1D4ED8" : C.cardBorder,
                    backgroundColor: pendingLang === lang.code
                      ? isDark ? "rgba(29,78,216,0.15)" : "#DCEEFF"
                      : "transparent",
                    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: C.text }}>{lang.label}</Text>
                  {pendingLang === lang.code
                    ? <Ionicons name="checkmark-circle" size={20} color="#1D4ED8" />
                    : null}
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={async () => {
                await setAppLanguage(pendingLang);
                setLangOpen(false);
              }}
              style={{
                marginTop: 16, backgroundColor: "#0F172A",
                paddingVertical: 14, borderRadius: 14, alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>Apply</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
