import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

export default function FeedLogList() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const isDark = useColorScheme() === "dark";
  const bg = isDark ? "#050B16" : "#F5F7FB";

  const logs = [
    { id: "FL-001", pond: "P-03", qty: "12", feed: "CP 35% pellet", time: "Today 09:12" },
    { id: "FL-002", pond: "P-01", qty: "10", feed: "Floating pellet", time: "Today 16:10" },
  ];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return logs;
    return logs.filter(
      (l) =>
        l.id.toLowerCase().includes(s) ||
        l.pond.toLowerCase().includes(s) ||
        l.feed.toLowerCase().includes(s) ||
        l.time.toLowerCase().includes(s)
    );
  }, [q]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-center justify-between">
        <View className="pr-3 flex-1">
          <Text className="text-xl font-bold text-slate-900 dark:text-white">{t("feedLog.title")}</Text>
          <Text className="mt-1 text-sm text-slate-600 dark:text-white/70">{t("feedLog.subtitle")}</Text>
        </View>

        <Pressable
          onPress={() => router.push("/(aqua)/feed-log/add")}
          className="rounded-2xl border border-sky-500/25 bg-sky-500/15 px-4 py-3"
        >
          <Text className="font-semibold text-sky-300">{t("common.add")}</Text>
        </Pressable>
      </View>

      <View className="mt-4 flex-row items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-3">
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("feedLog.searchPlaceholder")}
          placeholderTextColor="#94A3B8"
          className="flex-1 text-[14px] text-slate-900 dark:text-white"
        />
      </View>

      <View className="mt-4 gap-3">
        {filtered.map((l) => (
          <View
            key={l.id}
            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-3"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1 pr-2">
                <View className="h-10 w-10 rounded-2xl items-center justify-center bg-slate-100 dark:bg-white/10">
                  <Ionicons name="cube-outline" size={20} color="#60A5FA" />
                </View>

                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-white" numberOfLines={1}>
                    Pond {l.pond} • {l.qty} kg
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-slate-600 dark:text-white/70" numberOfLines={1}>
                    {l.feed} • {l.id}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1">
                <Ionicons name="time-outline" size={14} color="#60A5FA" />
                <Text className="ml-1 text-[12px] text-slate-600 dark:text-white/70">{l.time}</Text>
              </View>
            </View>
          </View>
        ))}

        {filtered.length === 0 && (
          <View className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] p-5">
            <Text className="text-slate-900 dark:text-white font-semibold">{t("feedLog.emptyTitle")}</Text>
            <Text className="mt-1 text-sm text-slate-600 dark:text-white/70">{t("feedLog.emptySub")}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
