import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AppDispatch, RootState } from "../../../src/store/auth/store";
import { fetchAquaApprovals } from "../../../src/features/aqua/approvals/approvals.slice";
import {
  selectApprovedFarms,
  selectPendingFarms,
  selectApprovedPonds,
  selectPendingPonds,
  selectAllFarms,
} from "../../../src/features/aqua/approvals/approvals.selectors";
import { clearMe } from "../../../src/store/auth/me.slice";
import { toggleTheme } from "../../../src/store/theme.slice";
import { setAppLanguage } from "../../../src/components/aqua/i18n/i18n";

const SCREEN_W = Dimensions.get("window").width;
const PANEL_W = SCREEN_W * 0.62;

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { t, i18n } = useTranslation();

  const me = useSelector((state: RootState) => state.me?.me);
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const dark = themeMode === "DARK";

  const numericOwnerId = me?.owner_id
    ? String(me.owner_id).replace(/\D/g, "").replace(/^0+/, "")
    : "";

  const allFarms    = useSelector(selectAllFarms);
  const approvedFarms = useSelector(selectApprovedFarms);
  const pendingFarms  = useSelector(selectPendingFarms);
  const approvedPonds = useSelector(selectApprovedPonds);
  const pendingPonds  = useSelector(selectPendingPonds);

  useEffect(() => {
    if (numericOwnerId) dispatch(fetchAquaApprovals(numericOwnerId));
  }, [dispatch, numericOwnerId]);

  const totalFarms        = allFarms.length;
  const totalPonds        = approvedPonds.length + pendingPonds.length;
  const firstApprovedFarm = approvedFarms[0] ?? null;
  const canCreatePond     = approvedFarms.length > 0 && !!firstApprovedFarm;

  const initials = useMemo(() => {
    if (!me?.username) return "U";
    return me.username.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  }, [me?.username]);

  /* ─── Profile panel ─────────────────────────────────── */
  const [profileVisible, setProfileVisible] = useState(false);
  const panelAnim      = useRef(new Animated.Value(PANEL_W)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const openPanel = () => {
    // Always reset before animating to avoid double-appear glitch
    panelAnim.setValue(PANEL_W);
    overlayOpacity.setValue(0);
    setProfileVisible(true);
    Animated.parallel([
      Animated.timing(panelAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closePanel = () => {
    Animated.parallel([
      Animated.timing(panelAnim, {
        toValue: PANEL_W,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setProfileVisible(false);
      panelAnim.setValue(PANEL_W);
      overlayOpacity.setValue(0);
    });
  };

  const handleLogout = async () => {
    closePanel();
    setTimeout(async () => {
      await AsyncStorage.multiRemove(["auth_token", "owner_id", "owner_code", "me_cache_v1"]);
      dispatch(clearMe());
      router.replace("/(auth)/login");
    }, 280);
  };

  /* ─── Colours ────────────────────────────────────────── */
  const C = dark ? {
    screenBg:         "#050B16",
    cardBg:           "#0B1220",
    cardBorder:       "rgba(255,255,255,0.08)",
    heroBg:           "#0B1220",
    heroBorder:       "rgba(255,255,255,0.08)",
    text:             "#FFFFFF",
    subText:          "rgba(255,255,255,0.52)",
    iconBg:           "rgba(255,255,255,0.08)",
    iconColor:        "#60A5FA",
    tapHint:          "#60A5FA",
    panelBg:          "#0D1424",
    panelBorder:      "rgba(255,255,255,0.08)",
    divider:          "rgba(255,255,255,0.07)",
    avatarBg:         "rgba(255,255,255,0.1)",
    actionDarkBg:     "#0B1220",
    actionDarkBorder: "rgba(255,255,255,0.08)",
    actionLightBg:    "#111827",
    actionLightBorder:"rgba(255,255,255,0.08)",
    badgeBg:          "rgba(217,119,6,0.18)",
    badgeText:        "#FCD34D",
    toggleOn:         "#2563EB",
    toggleOff:        "rgba(255,255,255,0.15)",
    logoutBg:         "rgba(244,63,94,0.12)",
    logoutText:       "#FB7185",
    ownerBg:          "rgba(255,255,255,0.05)",
  } : {
    screenBg:         "#E8EEF6",
    cardBg:           "#EEF3FF",
    cardBorder:       "#C0CEEA",
    heroBg:           "#1E293B",
    heroBorder:       "#1E293B",
    text:             "#0F172A",
    subText:          "#5A6E8F",
    iconBg:           "#D2E3F8",
    iconColor:        "#1D4ED8",
    tapHint:          "#1D4ED8",
    panelBg:          "#EEF3FF",
    panelBorder:      "#C0CEEA",
    divider:          "#D5E0F0",
    avatarBg:         "#1E293B",
    actionDarkBg:     "#1E293B",
    actionDarkBorder: "#1E293B",
    actionLightBg:    "#E4ECFF",
    actionLightBorder:"#BCCEF0",
    badgeBg:          "rgba(217,119,6,0.12)",
    badgeText:        "#92400E",
    toggleOn:         "#1D4ED8",
    toggleOff:        "#C8D8EE",
    logoutBg:         "#FDE8EC",
    logoutText:       "#E11D48",
    ownerBg:          "#E0EAF8",
  };

  /* ─── Components ─────────────────────────────────────── */
  const StatCard = ({
    title, value, sub, icon, onPress,
  }: {
    title: string; value: string; sub: string;
    icon: keyof typeof Ionicons.glyphMap; onPress?: () => void;
  }) => {
    const Wrap = onPress ? Pressable : View;
    return (
      <Wrap onPress={onPress} style={{
        flex: 1, borderRadius: 16, borderWidth: 1,
        borderColor: C.cardBorder, backgroundColor: C.cardBg,
        paddingHorizontal: 13, paddingVertical: 12,
      }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: C.subText, flex: 1, marginRight: 4 }}>
            {title}
          </Text>
          <View style={{ height: 32, width: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: C.iconBg }}>
            <Ionicons name={icon} size={17} color={C.iconColor} />
          </View>
        </View>
        <Text style={{ marginTop: 6, fontSize: 22, fontWeight: "700", color: C.text }}>{value}</Text>
        <Text style={{ marginTop: 2, fontSize: 10, color: C.subText, lineHeight: 14 }}>{sub}</Text>
        {onPress ? (
          <Text style={{ marginTop: 5, fontSize: 10, fontWeight: "600", color: C.tapHint }}>
            Tap to view →
          </Text>
        ) : null}
      </Wrap>
    );
  };

  const ActionCard = ({
    title, sub, icon, onPress, variant = "dark", disabled = false, badge,
  }: {
    title: string; sub: string; icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void; variant?: "dark" | "light"; disabled?: boolean; badge?: string;
  }) => {
    const dk       = variant === "dark";
    const bg       = dk ? C.actionDarkBg  : C.actionLightBg;
    const border   = dk ? C.actionDarkBorder : C.actionLightBorder;
    const titleCol = dk ? "#FFFFFF" : C.text;
    const subCol   = dk ? "rgba(255,255,255,0.68)" : C.subText;
    const iconBgC  = dk ? "rgba(255,255,255,0.1)" : C.iconBg;
    const iconC    = dk ? "#60A5FA" : C.iconColor;

    return (
      <Pressable disabled={disabled} onPress={onPress} style={{
        borderRadius: 16, borderWidth: 1, borderColor: border,
        backgroundColor: bg, padding: 15, opacity: disabled ? 0.55 : 1,
      }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Text style={{ fontWeight: "600", color: titleCol, fontSize: 14 }} numberOfLines={1}>{title}</Text>
              {badge ? (
                <View style={{ borderRadius: 99, backgroundColor: C.badgeBg, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: C.badgeText }}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontSize: 12, marginTop: 4, lineHeight: 18, color: subCol }}>{sub}</Text>
          </View>
          <View style={{ height: 38, width: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: iconBgC }}>
            <Ionicons name={icon} size={19} color={iconC} />
          </View>
        </View>
      </Pressable>
    );
  };

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <View style={{ flex: 1, backgroundColor: C.screenBg }}>

      {/* ── FIXED HEADER ── */}
      <View style={{
        paddingTop: insets.top + 10,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: C.screenBg,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 11, color: C.subText, textTransform: "uppercase", letterSpacing: 0.9 }}>
              {t("dashboard.traceabilityLabel")}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: "700", color: C.text, marginTop: 2 }}>
              {me?.username || "Welcome"}
            </Text>
          </View>

          <Pressable onPress={openPanel} style={{
            height: 44, width: 44, borderRadius: 14,
            backgroundColor: C.avatarBg,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>{initials}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── SCROLLABLE BODY ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      >
        {/* Hero */}
        <View style={{
          borderRadius: 18, backgroundColor: C.heroBg,
          borderWidth: 1, borderColor: C.heroBorder, padding: 18,
        }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ height: 38, width: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" }}>
              <Ionicons name="leaf-outline" size={19} color="#60A5FA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 }}>
                {t("dashboard.heroTitle")}
              </Text>
              <Text style={{ marginTop: 4, color: "rgba(255,255,255,0.82)", fontSize: 12, lineHeight: 19 }}>
                {t("dashboard.heroDesc")}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <Text style={{ marginTop: 20, fontSize: 14, fontWeight: "700", color: C.text }}>
          {t("dashboard.overview")}
        </Text>

        <View style={{ marginTop: 10, flexDirection: "row", gap: 10 }}>
          <StatCard title={t("dashboard.totalFarms")}   value={String(totalFarms)}           sub={t("dashboard.totalFarmsSub")}   icon="business-outline" />
          <StatCard title={t("dashboard.approvedFarms")} value={String(approvedFarms.length)} sub={t("dashboard.approvedFarmsSub")} icon="checkmark-circle-outline" />
        </View>
        <View style={{ marginTop: 10, flexDirection: "row", gap: 10 }}>
          <StatCard title={t("dashboard.farmPending")} value={String(pendingFarms.length)} sub={t("dashboard.farmPendingSub")} icon="time-outline"      onPress={() => router.push("/(aqua)/approvals/pending")} />
          <StatCard title={t("dashboard.totalPonds")}  value={String(totalPonds)}           sub={t("dashboard.totalPondsSub")}  icon="fish-outline"      onPress={() => router.push("/(aqua)/pond-list")} />
        </View>
        <View style={{ marginTop: 10, flexDirection: "row", gap: 10 }}>
          <StatCard title={t("dashboard.pondPending")}   value={String(pendingPonds.length)}  sub={t("dashboard.pondPendingSub")}   icon="hourglass-outline"       onPress={() => router.push("/(aqua)/approvals/pending")} />
          <StatCard title={t("dashboard.approvedPonds")} value={String(approvedPonds.length)} sub={t("dashboard.approvedPondsSub")} icon="checkmark-done-outline"  onPress={() => router.push("/(aqua)/approvals/approved")} />
        </View>

        {/* Quick Actions */}
        <Text style={{ marginTop: 20, fontSize: 14, fontWeight: "700", color: C.text }}>
          {t("dashboard.quickActions")}
        </Text>

        <View style={{ marginTop: 10, gap: 10 }}>
          <ActionCard
            title={t("dashboard.registerFarm")}
            sub={t("dashboard.registerFarmSub")}
            icon="add-circle-outline"
            variant="dark"
            onPress={() => router.push("/(aqua)/registration/farm-details")}
          />
          <ActionCard
            title={t("dashboard.createPond")}
            sub={canCreatePond
              ? t("dashboard.createPondSub", { farmName: firstApprovedFarm!.name })
              : t("dashboard.createPondLocked")}
            icon="water-outline"
            variant="light"
            disabled={!canCreatePond}
            badge={!canCreatePond ? "LOCKED" : undefined}
            onPress={() => router.push(`/(aqua)/registration/pond-details?farmId=${firstApprovedFarm?.id}`)}
          />
          <ActionCard
            title={t("dashboard.qrScanner")}
            sub={t("dashboard.qrScannerSub")}
            icon="scan-outline"
            variant="light"
            onPress={() => router.push("/(aqua)/tabs/qr-scanner")}
          />
        </View>
      </ScrollView>

      {/* ── PROFILE SLIDE PANEL ── absolute overlay, no Modal flicker */}
      {profileVisible && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row" }}>

          {/* Left overlay — tap to close */}
          <Animated.View style={{ flex: 1, opacity: overlayOpacity }}>
            <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.48)" }} onPress={closePanel} />
          </Animated.View>

          {/* Right panel */}
          <Animated.View style={{
            width: PANEL_W,
            backgroundColor: C.panelBg,
            transform: [{ translateX: panelAnim }],
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 16,
            borderLeftWidth: 1,
            borderLeftColor: C.panelBorder,
          }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>

              {/* Close button */}
              <Pressable onPress={closePanel} style={{ alignSelf: "flex-end", marginRight: 16, marginBottom: 4 }}>
                <Ionicons name="close" size={22} color={C.subText} />
              </Pressable>

              {/* Avatar + name */}
              <View style={{ alignItems: "center", paddingHorizontal: 16, paddingBottom: 16 }}>
                <View style={{
                  height: 60, width: 60, borderRadius: 20,
                  backgroundColor: C.avatarBg,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 22 }}>{initials}</Text>
                </View>
                <Text style={{ marginTop: 10, fontSize: 16, fontWeight: "700", color: C.text, textAlign: "center" }}>
                  {me?.username || "User"}
                </Text>
                <Text style={{ marginTop: 3, fontSize: 12, color: C.subText, textAlign: "center" }}>
                  {me?.rootverse_type || "-"} · RootVerse
                </Text>
                {me?.phone_no ? (
                  <Text style={{ marginTop: 2, fontSize: 12, color: C.subText }}>{me.phone_no}</Text>
                ) : null}

                {/* Owner ID */}
                <View style={{
                  marginTop: 12, width: "100%", borderRadius: 12,
                  backgroundColor: C.ownerBg,
                  borderWidth: 1, borderColor: C.panelBorder,
                  paddingHorizontal: 12, paddingVertical: 8,
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                }}>
                  <Text style={{ fontSize: 10, color: C.subText, textTransform: "uppercase", letterSpacing: 0.6 }}>Owner ID</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{me?.owner_id || "—"}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: C.divider, marginHorizontal: 16 }} />

              {/* Theme toggle */}
              <Pressable onPress={() => dispatch(toggleTheme())} style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                paddingHorizontal: 16, paddingVertical: 14,
              }}>
                <View style={{ height: 36, width: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: C.iconBg }}>
                  <Ionicons name={dark ? "moon-outline" : "sunny-outline"} size={18} color={C.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: C.text }}>Theme</Text>
                  <Text style={{ fontSize: 11, color: C.subText, marginTop: 1 }}>{dark ? "Dark mode" : "Light mode"}</Text>
                </View>
                <View style={{
                  width: 42, height: 24, borderRadius: 12,
                  backgroundColor: dark ? C.toggleOn : C.toggleOff,
                  justifyContent: "center",
                  paddingHorizontal: 3,
                  alignItems: dark ? "flex-end" : "flex-start",
                }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF" }} />
                </View>
              </Pressable>

              <View style={{ height: 1, backgroundColor: C.divider, marginHorizontal: 16 }} />

              {/* Language */}
              <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <View style={{ height: 36, width: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: C.iconBg }}>
                    <Ionicons name="language-outline" size={18} color={C.iconColor} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: C.text }}>Language</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[{ code: "en", label: "English" }, { code: "ta", label: "தமிழ்" }].map((lang) => {
                    const active = i18n.language === lang.code;
                    return (
                      <Pressable
                        key={lang.code}
                        onPress={() => setAppLanguage(lang.code as "en" | "ta")}
                        style={{
                          flex: 1, paddingVertical: 9, borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor: active ? C.tapHint : C.panelBorder,
                          backgroundColor: active
                            ? dark ? "rgba(37,99,235,0.18)" : "#DCEEFF"
                            : "transparent",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "700", color: active ? C.tapHint : C.subText }}>
                          {lang.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: C.divider, marginHorizontal: 16 }} />

              {/* Logout */}
              <Pressable onPress={handleLogout} style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                paddingHorizontal: 16, paddingVertical: 14,
              }}>
                <View style={{ height: 36, width: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: C.logoutBg }}>
                  <Ionicons name="log-out-outline" size={18} color={C.logoutText} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: C.logoutText }}>Logout</Text>
              </Pressable>

            </ScrollView>
          </Animated.View>
        </View>
      )}
    </View>
  );
}
