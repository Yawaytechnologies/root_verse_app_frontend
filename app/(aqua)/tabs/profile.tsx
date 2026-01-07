import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { setAppLanguage } from "../../../src/components/aqua/i18n/i18n";

export default function Profile() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  // ✅ IMPORTANT: take i18n from hook, not direct import
  const { t, i18n } = useTranslation();

  const [langOpen, setLangOpen] = useState(false);

  // ✅ pending selection (does NOT apply instantly)
  const [pendingLang, setPendingLang] = useState<"en" | "ta">(
    i18n.language === "ta" ? "ta" : "en"
  );

  // current app language label
  const currentLangLabel = useMemo(() => {
    return i18n.language === "ta" ? "தமிழ்" : "English";
  }, [i18n.language]);

  const Row = ({
    icon,
    title,
    subtitle,
    danger,
    onPress,
    rightText,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    danger?: boolean;
    onPress?: () => void;
    rightText?: string;
  }) => (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 px-4 py-3">
      <View
        className={[
          "h-10 w-10 rounded-2xl items-center justify-center",
          danger
            ? "bg-rose-50 dark:bg-rose-500/15"
            : "bg-slate-100 dark:bg-white/10",
        ].join(" ")}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            danger
              ? isDark
                ? "#FB7185"
                : "#E11D48"
              : isDark
              ? "rgba(255,255,255,0.85)"
              : "#0F172A"
          }
        />
      </View>

      <View className="flex-1">
        <Text
          className={[
            "text-[15px] font-semibold",
            danger
              ? "text-rose-600 dark:text-rose-400"
              : "text-slate-900 dark:text-white",
          ].join(" ")}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightText ? (
        <Text className="text-xs text-slate-500 dark:text-white/60 mr-1">
          {rightText}
        </Text>
      ) : null}

      <Ionicons
        name="chevron-forward"
        size={18}
        color={isDark ? "rgba(255,255,255,0.45)" : "#94A3B8"}
      />
    </Pressable>
  );

  return (
    <>
      <ScrollView
        className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]"
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
      >
        {/* Header card */}
        <View className="rounded-3xl bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-white/10 p-4">
          <View className="flex-row items-center gap-3">
            {/* Avatar */}
            <View className="h-14 w-14 rounded-2xl bg-slate-900 dark:bg-white/10 items-center justify-center">
              <Text className="text-white font-bold text-lg">JM</Text>
            </View>

            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">
                Janarthanan.M
              </Text>
              <Text className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                Aquaculture Operator • RootVerse
              </Text>
            </View>

            <Pressable className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-white/10 items-center justify-center">
              <Ionicons
                name="create-outline"
                size={18}
                color={isDark ? "#60A5FA" : "#2563EB"}
              />
            </Pressable>
          </View>

          {/* Quick stats */}
          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3">
              <Text className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-white/60">
                Farm
              </Text>
              <Text className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                RV-AQ-00012
              </Text>
            </View>

            <View className="flex-1 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3">
              <Text className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-white/60">
                Scans
              </Text>
              <Text className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                24
              </Text>
            </View>
          </View>
        </View>

        {/* Account section */}
        <View className="mt-4 rounded-3xl bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-white/10 overflow-hidden">
          <View className="px-4 pt-4 pb-2">
            <Text className="text-xs font-semibold text-slate-500 dark:text-white/60 tracking-wide uppercase">
              {t("profile.account")}
            </Text>
          </View>

          <Row
            icon="person-outline"
            title={t("profile.personal")}
            subtitle={t("profile.personalSub")}
          />
          <View className="h-px bg-slate-100 dark:bg-white/10" />
          <Row
            icon="shield-checkmark-outline"
            title={t("profile.security")}
            subtitle={t("profile.securitySub")}
          />
          <View className="h-px bg-slate-100 dark:bg-white/10" />
          <Row
            icon="notifications-outline"
            title={t("profile.notifications")}
            subtitle={t("profile.notificationsSub")}
          />
        </View>

        {/* App section */}
        <View className="mt-4 rounded-3xl bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-white/10 overflow-hidden">
          <View className="px-4 pt-4 pb-2">
            <Text className="text-xs font-semibold text-slate-500 dark:text-white/60 tracking-wide uppercase">
              {t("profile.app")}
            </Text>
          </View>

          {/* ✅ Language row */}
          <Row
            icon="language-outline"
            title={t("profile.language")}
            subtitle={t("profile.languageSub")}
            rightText={currentLangLabel}
            onPress={() => {
              setPendingLang(i18n.language === "ta" ? "ta" : "en");
              setLangOpen(true);
            }}
          />

          <View className="h-px bg-slate-100 dark:bg-white/10" />
          <Row
            icon="help-circle-outline"
            title={t("profile.help")}
            subtitle={t("profile.helpSub")}
          />
          <View className="h-px bg-slate-100 dark:bg-white/10" />
          <Row
            icon="information-circle-outline"
            title={t("profile.about")}
            subtitle={t("profile.aboutSub")}
          />
        </View>

        {/* Logout */}
        <View className="mt-4 rounded-3xl bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-white/10 overflow-hidden">
          <Row
            icon="log-out-outline"
            title={t("profile.logout")}
            subtitle={t("profile.logoutSub")}
            danger
          />
        </View>

        <Text className="mt-4 text-center text-[11px] text-slate-400 dark:text-white/40">
          RootVerse • Aquaculture Module
        </Text>
      </ScrollView>

      {/* ✅ Language Picker Modal */}
      <Modal
        transparent
        visible={langOpen}
        animationType="fade"
        onRequestClose={() => setLangOpen(false)}
      >
        <Pressable
          onPress={() => setLangOpen(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <Pressable
            onPress={() => {}}
            className="bg-white dark:bg-[#0B1220] rounded-t-3xl p-4 border border-slate-200 dark:border-white/10"
          >
            <Text className="text-base font-bold text-slate-900 dark:text-white">
              {t("profile.language")}
            </Text>
            <Text className="mt-1 text-xs text-slate-500 dark:text-white/60">
              Select a language for the app
            </Text>

            <View className="mt-4 gap-2">
              {[
                { code: "en" as const, label: "English" },
                { code: "ta" as const, label: "தமிழ்" },
              ].map((lang) => {
                const active = pendingLang === lang.code;

                return (
                  <Pressable
                    key={lang.code}
                    onPress={() => setPendingLang(lang.code)}
                    className={[
                      "rounded-2xl px-4 py-3 flex-row items-center justify-between border",
                      active
                        ? "bg-blue-50 dark:bg-blue-500/15 border-blue-300 dark:border-blue-400/30"
                        : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10",
                    ].join(" ")}
                  >
                    <Text className="text-slate-900 dark:text-white font-semibold">
                      {lang.label}
                    </Text>

                    {active ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={isDark ? "#60A5FA" : "#2563EB"}
                      />
                    ) : (
                      <Ionicons
                        name="ellipse-outline"
                        size={20}
                        color={isDark ? "rgba(255,255,255,0.35)" : "#CBD5E1"}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => setLangOpen(false)}
                className="flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 py-3 items-center"
              >
                <Text className="text-slate-900 dark:text-white font-extrabold tracking-wide text-xs">
                  CANCEL
                </Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  try {
                    await setAppLanguage(pendingLang);
                  } catch (e) {
                    console.warn("Language switch failed:", e);
                  } finally {
                    setLangOpen(false);
                  }
                }}
                className="flex-1 rounded-2xl bg-slate-900 dark:bg-white py-3 items-center"
              >
                <Text className="text-white dark:text-slate-900 font-extrabold tracking-wide text-xs">
                  OK
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
