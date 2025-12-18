import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

type EntryType = "HEALTH" | "MORTALITY";

type HMLog = {
  id: string;
  type: EntryType;
  pond: string;
  species: string;
  affected: number;
  dead: number;
  time: string;
  status: "OPEN" | "RESOLVED";
  notes?: string;
};

export default function HealthMortalityIndex() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<EntryType | "ALL">("ALL");

  const logs: HMLog[] = [
    {
      id: "HM-001",
      type: "HEALTH",
      pond: "P-03",
      species: "Shrimp",
      affected: 25,
      dead: 0,
      time: "Today 08:40",
      status: "OPEN",
      notes: "Lethargy observed near inlet",
    },
    {
      id: "HM-002",
      type: "MORTALITY",
      pond: "P-01",
      species: "Tilapia",
      affected: 0,
      dead: 12,
      time: "Yesterday 17:20",
      status: "OPEN",
      notes: "Sudden deaths after rain",
    },
    {
      id: "HM-003",
      type: "HEALTH",
      pond: "P-02",
      species: "Shrimp",
      affected: 10,
      dead: 0,
      time: "Dec 16 10:05",
      status: "RESOLVED",
      notes: "Improved after water exchange",
    },
  ];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return logs.filter((l) => {
      if (filter !== "ALL" && l.type !== filter) return false;
      if (!s) return true;
      return (
        l.id.toLowerCase().includes(s) ||
        l.pond.toLowerCase().includes(s) ||
        l.species.toLowerCase().includes(s) ||
        l.time.toLowerCase().includes(s) ||
        (l.notes || "").toLowerCase().includes(s)
      );
    });
  }, [q, filter]);

  const pill = (tpe: EntryType) => {
    if (tpe === "MORTALITY") return "bg-rose-500/15 text-rose-300 border-rose-500/20";
    return "bg-sky-500/15 text-sky-300 border-sky-500/20";
  };

  const statusPill = (st: HMLog["status"]) => {
    if (st === "RESOLVED") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
    return "bg-amber-500/15 text-amber-300 border-amber-500/20";
  };

  const filterLabel = (v: "ALL" | EntryType) => {
    if (v === "ALL") return t("common.all", "All");
    if (v === "HEALTH") return t("healthMortality.type.health", "Health");
    return t("healthMortality.type.mortality", "Mortality");
  };

  return (
    <View className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xl font-extrabold text-slate-900 dark:text-white">
              {t("healthMortality.title", "Health / Mortality")}
            </Text>
            <Text className="mt-1 text-sm text-slate-600 dark:text-white/70">
              {t("healthMortality.subtitle", "Track health issues and mortality events per pond.")}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/(aqua)/health-mortality/add")}
            className="rounded-2xl border border-sky-500/25 bg-sky-500/15 px-4 py-3"
          >
            <Text className="font-semibold text-sky-300">{t("common.add", "+ Add")}</Text>
          </Pressable>
        </View>

        <View className="mt-4 flex-row items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-3">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("healthMortality.searchPlaceholder", "Search (HM-001, pond, species...)")}
            placeholderTextColor="#94A3B8"
            className="flex-1 text-[14px] text-slate-900 dark:text-white"
          />
        </View>

        <View className="mt-3 flex-row gap-2">
          {(["ALL", "HEALTH", "MORTALITY"] as const).map((v) => {
            const active =
              filter === v
                ? "border-slate-900/10 dark:border-white/10 bg-slate-900/5 dark:bg-white/5"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220]";
            return (
              <Pressable key={v} onPress={() => setFilter(v)} className={`rounded-full border px-3 py-2 ${active}`}>
                <Text className="text-[12px] font-semibold text-slate-700 dark:text-white/80">{filterLabel(v)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-4 gap-3">
          {filtered.map((l) => (
            <Pressable
              key={l.id}
              className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-4"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3 flex-1 pr-2">
                  <View className="h-11 w-11 rounded-2xl items-center justify-center bg-slate-100 dark:bg-white/10">
                    <Ionicons
                      name={l.type === "MORTALITY" ? "pulse-outline" : "medkit-outline"}
                      size={20}
                      color={l.type === "MORTALITY" ? "#FB7185" : "#60A5FA"}
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-slate-900 dark:text-white" numberOfLines={1}>
                      {l.pond} • {l.species}
                    </Text>

                    <Text className="mt-0.5 text-[12px] text-slate-600 dark:text-white/70" numberOfLines={1}>
                      {l.type === "MORTALITY" ? `Dead: ${l.dead}` : `Affected: ${l.affected}`}
                      {l.notes ? ` • ${l.notes}` : ""}
                    </Text>
                  </View>
                </View>

                <View className="items-end gap-2">
                  <View className={`rounded-full border px-2.5 py-1 ${pill(l.type)}`}>
                    <Text className="text-[11px] font-bold">
                      {l.type === "MORTALITY" ? t("healthMortality.type.mortality", "MORTALITY") : t("healthMortality.type.health", "HEALTH")}
                    </Text>
                  </View>

                  <View className={`rounded-full border px-2.5 py-1 ${statusPill(l.status)}`}>
                    <Text className="text-[11px] font-bold">{l.status}</Text>
                  </View>
                </View>
              </View>

              <View className="mt-3 flex-row items-center justify-between">
                <View className="flex-row items-center rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1">
                  <Ionicons name="time-outline" size={14} color="#60A5FA" />
                  <Text className="ml-1 text-[12px] text-slate-600 dark:text-white/70">{l.time}</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </Pressable>
          ))}

          {filtered.length === 0 && (
            <View className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] p-5">
              <Text className="text-slate-900 dark:text-white font-semibold">{t("healthMortality.emptyTitle", "No logs found")}</Text>
              <Text className="mt-1 text-sm text-slate-600 dark:text-white/70">
                {t("healthMortality.emptySub", "Try changing filter or search keyword.")}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable
        onPress={() => router.push("/(aqua)/health-mortality/add")}
        className="absolute right-5 bottom-6 h-14 w-14 rounded-2xl items-center justify-center border border-sky-500/25 bg-sky-500/20"
        style={{ elevation: 8 }}
      >
        <Ionicons name="add" size={26} color="#60A5FA" />
      </Pressable>
    </View>
  );
}
