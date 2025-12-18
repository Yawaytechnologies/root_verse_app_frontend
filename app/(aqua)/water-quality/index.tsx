import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

type WQLog = {
  id: string;
  pond: string;
  time: string;
  ph: number;
  doMgL: number;
  tempC: number;
  salinityPpt: number;
  ammoniaMgL: number;
  status: "OK" | "WARNING" | "CRITICAL";
  note?: string;
};

export default function WaterQualityIndex() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");

  const logs: WQLog[] = [
    {
      id: "WQ-001",
      pond: "P-01",
      time: "Today 06:30",
      ph: 7.6,
      doMgL: 5.2,
      tempC: 28.4,
      salinityPpt: 18,
      ammoniaMgL: 0.12,
      status: "OK",
      note: "Normal morning reading",
    },
    {
      id: "WQ-002",
      pond: "P-03",
      time: "Today 17:10",
      ph: 8.4,
      doMgL: 3.6,
      tempC: 31.1,
      salinityPpt: 20,
      ammoniaMgL: 0.35,
      status: "WARNING",
      note: "Low DO; aeration started",
    },
    {
      id: "WQ-003",
      pond: "P-02",
      time: "Yesterday 06:20",
      ph: 6.9,
      doMgL: 2.8,
      tempC: 27.5,
      salinityPpt: 16,
      ammoniaMgL: 0.62,
      status: "CRITICAL",
      note: "Ammonia high; water exchange planned",
    },
  ];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return logs;
    return logs.filter(
      (l) =>
        l.id.toLowerCase().includes(s) ||
        l.pond.toLowerCase().includes(s) ||
        l.time.toLowerCase().includes(s) ||
        (l.note || "").toLowerCase().includes(s)
    );
  }, [q]);

  const pill = (st: WQLog["status"]) => {
    if (st === "OK") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
    if (st === "WARNING") return "bg-amber-500/15 text-amber-300 border-amber-500/20";
    return "bg-rose-500/15 text-rose-300 border-rose-500/20";
  };

  return (
    <View className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xl font-extrabold text-slate-900 dark:text-white">
              {t("waterQuality.title", "Water Quality")}
            </Text>
            <Text className="mt-1 text-sm text-slate-600 dark:text-white/70">
              {t("waterQuality.subtitle", "Track pH, DO, temperature, salinity and ammonia per pond.")}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/(aqua)/water-quality/add")}
            className="rounded-2xl border border-sky-500/25 bg-sky-500/15 px-4 py-3"
          >
            <Text className="font-semibold text-sky-300">
              {t("common.add", "+ Add")}
            </Text>
          </Pressable>
        </View>

        {/* Search */}
        <View className="mt-4 flex-row items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-3">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("waterQuality.searchPlaceholder", "Search (WQ-001, pond, note...)")}
            placeholderTextColor="#94A3B8"
            className="flex-1 text-[14px] text-slate-900 dark:text-white"
          />
        </View>

        {/* List */}
        <View className="mt-4 gap-3">
          {filtered.map((l) => (
            <View
              key={l.id}
              className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-4"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 rounded-2xl items-center justify-center bg-slate-100 dark:bg-white/10">
                    <Ionicons name="water-outline" size={20} color="#60A5FA" />
                  </View>

                  <View>
                    <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">
                      {l.pond} • {l.id}
                    </Text>

                    <View className="mt-1 flex-row items-center">
                      <Ionicons name="time-outline" size={14} color="#60A5FA" />
                      <Text className="ml-1 text-[12px] text-slate-600 dark:text-white/70">
                        {l.time}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className={`rounded-full border px-2.5 py-1 ${pill(l.status)}`}>
                  <Text className="text-[11px] font-bold">{l.status}</Text>
                </View>
              </View>

              {/* Metrics */}
              <View className="mt-3 flex-row flex-wrap gap-2">
                <Chip label={`pH ${l.ph.toFixed(1)}`} />
                <Chip label={`DO ${l.doMgL.toFixed(1)} mg/L`} />
                <Chip label={`${l.tempC.toFixed(1)}°C`} />
                <Chip label={`${l.salinityPpt} ppt`} />
                <Chip label={`NH₃ ${l.ammoniaMgL.toFixed(2)} mg/L`} />
              </View>

              {l.note ? (
                <Text className="mt-3 text-[12px] text-slate-600 dark:text-white/70">
                  {l.note}
                </Text>
              ) : null}
            </View>
          ))}

          {filtered.length === 0 && (
            <View className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] p-5">
              <Text className="text-slate-900 dark:text-white font-semibold">
                {t("waterQuality.emptyTitle", "No logs found")}
              </Text>
              <Text className="mt-1 text-sm text-slate-600 dark:text-white/70">
                {t("waterQuality.emptySub", "Try a different search keyword.")}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Add button */}
      <Pressable
        onPress={() => router.push("/(aqua)/water-quality/add")}
        className="absolute right-5 bottom-6 h-14 w-14 rounded-2xl items-center justify-center border border-sky-500/25 bg-sky-500/20"
        style={{ elevation: 8 }}
      >
        <Ionicons name="add" size={26} color="#60A5FA" />
      </Pressable>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1">
      <Text className="text-[11px] font-semibold text-slate-700 dark:text-white/80">{label}</Text>
    </View>
  );
}
