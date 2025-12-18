import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

export default function Dashboard() {
  const { t } = useTranslation();

  const Card = ({
    title,
    value,
    sub,
    icon,
  }: {
    title: string;
    value: string;
    sub: string;
    icon: keyof typeof Ionicons.glyphMap;
  }) => (
    <View className="flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-3">
      <View className="flex-row items-start justify-between">
        <Text className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-white/60">
          {title}
        </Text>

        {/* Fixed slot so increasing icon bubble doesn't increase card height */}
        <View className="h-8 w-8 items-center justify-center">
          <View className="h-10 w-10 rounded-2xl items-center justify-center bg-slate-100 dark:bg-white/10 -mt-1">
            <Ionicons name={icon} size={22} color="#60A5FA" />
          </View>
        </View>
      </View>

      <Text className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
        {value}
      </Text>
      <Text className="mt-0.5 text-xs text-slate-600 dark:text-white/70">
        {sub}
      </Text>
    </View>
  );

  const Action = ({
    title,
    sub,
    icon,
    onPress,
    variant = "dark",
  }: {
    title: string;
    sub: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    variant?: "dark" | "light";
  }) => {
    const isDark = variant === "dark";
    return (
      <Pressable
        onPress={onPress}
        className={`rounded-2xl border p-4 ${
          isDark
            ? "bg-slate-900 dark:bg-[#0B1220] border-slate-900 dark:border-white/10"
            : "bg-white dark:bg-[#0B1220] border-slate-200 dark:border-white/10"
        }`}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text
              className={`font-semibold ${
                isDark ? "text-white" : "text-slate-900 dark:text-white"
              }`}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              className={`text-xs mt-1 ${
                isDark
                  ? "text-white/80 dark:text-white/70"
                  : "text-slate-600 dark:text-white/70"
              }`}
              numberOfLines={2}
            >
              {sub}
            </Text>
          </View>

          <View
            className={`h-10 w-10 rounded-2xl items-center justify-center ${
              isDark ? "bg-white/10" : "bg-slate-100 dark:bg-white/10"
            }`}
          >
            <Ionicons
              name={icon}
              size={20}
              color={isDark ? "#60A5FA" : "#2563EB"}
            />
          </View>
        </View>
      </Pressable>
    );
  };

  // ✅ Fix center gap: time block is auto-width + bigger time + icon in a pill
  const ActivityRow = ({
    time,
    title,
    desc,
    iconLeft,
    timeIcon,
  }: {
    time: string;
    title: string;
    desc: string;
    iconLeft: keyof typeof Ionicons.glyphMap;
    timeIcon: keyof typeof Ionicons.glyphMap;
  }) => (
    <View className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-2.5">
      <View className="flex-row items-center justify-between">
        {/* Left: icon + title */}
        <View className="flex-row items-center gap-3 flex-1 pr-2">
          <View className="h-9 w-9 rounded-xl items-center justify-center bg-slate-100 dark:bg-white/10">
            <Ionicons name={iconLeft} size={19} color="#60A5FA" />
          </View>

          <Text
            className="font-semibold text-slate-900 dark:text-white flex-1"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Right: time pill (auto width) */}
        <View className="flex-row items-center rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1">
          <Ionicons name={timeIcon} size={16} color="#60A5FA" />
          <Text
            className="ml-1 text-[12px] text-slate-600 dark:text-white/70"
            numberOfLines={1}
          >
            {time}
          </Text>
        </View>
      </View>

      <Text
        className="mt-1 text-[13px] leading-5 text-slate-600 dark:text-white/70"
        numberOfLines={2}
      >
        {desc}
      </Text>
    </View>
  );

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]"
      contentContainerStyle={{ padding: 16, paddingBottom: 24, flexGrow: 1 }}
    >
      {/* Header card */}
      <View className="rounded-2xl bg-slate-900 dark:bg-[#0B1220] border border-slate-900 dark:border-white/10 p-5">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 rounded-2xl items-center justify-center bg-white/10">
            <Ionicons name="leaf-outline" size={20} color="#60A5FA" />
          </View>

          <View className="flex-1">
            <Text className="text-white text-[11px] uppercase tracking-wide opacity-80">
              {t("dashboard.module")}
            </Text>
            <Text className="mt-1 text-white text-lg font-bold">
              {t("dashboard.headline")}
            </Text>
            <Text className="mt-1 text-white/80 text-sm">
              {t("dashboard.subHeadline")}
            </Text>
          </View>
        </View>
      </View>

      {/* KPI cards */}
      <View className="mt-4 flex-row gap-3">
        <Card
          title={t("dashboard.kpi.totalPonds")}
          value="6"
          sub={t("dashboard.kpi.totalPondsSub")}
          icon="fish-outline"
        />
        <Card
          title={t("dashboard.kpi.feedToday")}
          value="3"
          sub={t("dashboard.kpi.feedTodaySub")}
          icon="cube-outline"
        />
      </View>

      <View className="mt-3 flex-row gap-3">
        <Card
          title={t("dashboard.kpi.waterChecks")}
          value="4"
          sub={t("dashboard.kpi.waterChecksSub")}
          icon="water-outline"
        />
        <Card
          title={t("dashboard.kpi.health")}
          value="1"
          sub={t("dashboard.kpi.healthSub")}
          icon="medkit-outline"
        />
      </View>

      {/* Quick Actions */}
      <Text className="mt-6 text-base font-semibold text-slate-900 dark:text-white">
        {t("dashboard.quickActions")}
      </Text>

      <View className="mt-3 gap-3">
        <Action
          title={t("dashboard.actions.scanQr")}
          sub={t("dashboard.actions.scanQrSub")}
          icon="scan-outline"
          variant="dark"
          onPress={() => router.push("/(aqua)/qr-scanner")}
        />

        {/* Keep/remove this depending on whether you still use traceability */}
        <Action
          title={t("dashboard.actions.demoTrace")}
          sub={t("dashboard.actions.demoTraceSub")}
          icon="git-network-outline"
          variant="light"
          onPress={() =>
            router.push({
              pathname: "/(aqua)/traceability/[code]",
              params: { code: "RV-CRATE-00001" },
            })
          }
        />
      </View>

      {/* Recent Activity */}
      <Text className="mt-6 text-base font-semibold text-slate-900 dark:text-white">
        {t("dashboard.recentActivity")}
      </Text>

      <View className="mt-3 gap-3">
        <ActivityRow
          time={t("dashboard.activity.today0912")}
          title={t("dashboard.activity.feedLog")}
          desc={t("dashboard.activity.feedLogDesc")}
          iconLeft="cube-outline"
          timeIcon="cube-outline"
        />
        <ActivityRow
          time={t("dashboard.activity.today1140")}
          title={t("dashboard.activity.waterCheck")}
          desc={t("dashboard.activity.waterCheckDesc")}
          iconLeft="water-outline"
          timeIcon="water-outline"
        />
        <ActivityRow
          time={t("dashboard.activity.yesterday")}
          title={t("dashboard.activity.healthLog")}
          desc={t("dashboard.activity.healthLogDesc")}
          iconLeft="medkit-outline"
          timeIcon="pulse-outline"
        />
      </View>
    </ScrollView>
  );
}
