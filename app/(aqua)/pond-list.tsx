import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

type Pond = {
  id: string;
  name: string;
  area?: string;
  status: "Active" | "Maintenance" | "Inactive";
};

export default function PondList() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");

  const ponds: Pond[] = [
    { id: "P-01", name: "Pond P-01", area: "0.8 acre", status: "Active" },
    { id: "P-02", name: "Pond P-02", area: "1.2 acre", status: "Maintenance" },
    { id: "P-03", name: "Pond P-03", area: "0.6 acre", status: "Active" },
  ];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ponds;
    return ponds.filter((p) => p.id.toLowerCase().includes(s) || p.name.toLowerCase().includes(s));
  }, [q]);

  const badge = (st: Pond["status"]) => {
    if (st === "Active") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
    if (st === "Maintenance") return "bg-amber-500/15 text-amber-300 border-amber-500/20";
    return "bg-slate-500/15 text-slate-300 border-slate-500/20";
  };

  const statusLabel = (st: Pond["status"]) => {
    if (st === "Active") return t("ponds.status.active");
    if (st === "Maintenance") return t("ponds.status.maintenance");
    return t("ponds.status.inactive");
  };

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]"
      contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-xl font-bold text-slate-900 dark:text-white">{t("ponds.title")}</Text>
      <Text className="mt-1 text-sm text-slate-600 dark:text-white/70">{t("ponds.subtitle")}</Text>

      {/* Search */}
      <View className="mt-4 flex-row items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-3">
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("ponds.searchPlaceholder")}
          placeholderTextColor="#94A3B8"
          className="flex-1 text-[14px] text-slate-900 dark:text-white"
        />
      </View>

      {/* List */}
      <View className="mt-4 gap-3">
        {filtered.map((p) => (
          <Pressable
            key={p.id}
            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 rounded-2xl items-center justify-center bg-slate-100 dark:bg-white/10">
                  <Ionicons name="fish-outline" size={20} color="#60A5FA" />
                </View>

                <View>
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{p.name}</Text>
                  <Text className="mt-0.5 text-[12px] text-slate-600 dark:text-white/70">
                    {p.id}
                    {p.area ? ` • ${p.area}` : ""}
                  </Text>
                </View>
              </View>

              <View className={`rounded-full border px-2.5 py-1 ${badge(p.status)}`}>
                <Text className="text-[11px] font-semibold">{statusLabel(p.status)}</Text>
              </View>
            </View>
          </Pressable>
        ))}

        {filtered.length === 0 && (
          <View className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] p-5">
            <Text className="text-slate-900 dark:text-white font-semibold">{t("ponds.emptyTitle")}</Text>
            <Text className="mt-1 text-sm text-slate-600 dark:text-white/70">{t("ponds.emptySub")}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
