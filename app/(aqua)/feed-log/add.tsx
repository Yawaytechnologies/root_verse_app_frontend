import React, { useMemo, useState } from "react";
import { View, Pressable, Text, Alert, TextInput } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AquaFormScreen from "../../../src/components/aqua/layout/AquaFormScreen";
import AquaField from "../../../src/components/aqua/inputs/AquaField";

export default function AddFeedLog() {
  const { t } = useTranslation();

  const ponds = useMemo(
    () => [
      { id: "RV-POND-01", label: "Pond A" },
      { id: "RV-POND-02", label: "Pond B" },
      { id: "RV-POND-03", label: "Pond C" },
    ],
    []
  );

  const feedTypes = useMemo(
    () => ["CP 35% pellet", "Floating pellet", "Sinking pellet", "Starter feed"],
    []
  );

  const [date, setDate] = useState("12/17/2025");
  const [time, setTime] = useState("12:24 PM");
  const [pondId, setPondId] = useState(ponds[0].id);
  const [feedType, setFeedType] = useState(feedTypes[0]);
  const [qty, setQty] = useState<number>(12);
  const [notes, setNotes] = useState("");

  const pondLabel = useMemo(() => {
    const p = ponds.find((x) => x.id === pondId);
    return p ? `${p.id} • ${p.label}` : pondId;
  }, [pondId, ponds]);

  const clamp = (n: number) => Math.max(0, Math.min(9999, n));

  const onChangeQtyText = (v: string) => {
    const cleaned = v.replace(/[^0-9.]/g, "");
    if (cleaned.trim() === "") return setQty(0);
    const num = Number(cleaned);
    if (!Number.isFinite(num)) return;
    setQty(clamp(num));
  };

  const save = () => {
    if (!date.trim()) return Alert.alert("Missing", t("feedLog.add.date"));
    if (!time.trim()) return Alert.alert("Missing", t("feedLog.add.feedingTime"));
    if (!pondId) return Alert.alert("Missing", t("feedLog.add.selectPond"));
    if (!feedType.trim()) return Alert.alert("Missing", t("feedLog.add.feedType"));
    if (!qty || qty <= 0) return Alert.alert("Missing", t("feedLog.add.quantityKg"));

    console.log({ date, time, pondId, pondLabel, feedType, qty, notes });
    router.back();
  };

  return (
    <AquaFormScreen title={t("feedLog.add.title")} subtitle={t("feedLog.add.subtitle")}>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <AquaField label={t("feedLog.add.date")} value={date} onChangeText={setDate} placeholder={t("feedLog.add.placeholderDate")} />
        </View>
        <View className="flex-1">
          <AquaField label={t("feedLog.add.feedingTime")} value={time} onChangeText={setTime} placeholder={t("feedLog.add.placeholderTime")} />
        </View>
      </View>

      {/* Pond chips */}
      <Text className="mt-2 mb-2 text-[12px] font-semibold text-slate-600 dark:text-white/70">
        {t("feedLog.add.selectPond")}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {ponds.map((p) => {
          const active = p.id === pondId;
          return (
            <Pressable
              key={p.id}
              onPress={() => setPondId(p.id)}
              className={`rounded-full border px-3 py-2 ${
                active ? "border-sky-500/25 bg-sky-500/15" : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220]"
              }`}
            >
              <Text className={`text-[12px] font-semibold ${active ? "text-sky-300" : "text-slate-800 dark:text-white"}`}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-3">
        <Text className="text-[12px] font-semibold text-slate-600 dark:text-white/70">{t("common.selected")}</Text>
        <Text className="mt-0.5 text-[14px] font-semibold text-slate-900 dark:text-white">{pondLabel}</Text>
      </View>

      {/* Feed type chips */}
      <Text className="mt-4 mb-2 text-[12px] font-semibold text-slate-600 dark:text-white/70">
        {t("feedLog.add.feedType")}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {feedTypes.map((ft) => {
          const active = ft === feedType;
          return (
            <Pressable
              key={ft}
              onPress={() => setFeedType(ft)}
              className={`rounded-full border px-3 py-2 ${
                active ? "border-sky-500/25 bg-sky-500/15" : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220]"
              }`}
            >
              <Text className={`text-[12px] font-semibold ${active ? "text-sky-300" : "text-slate-800 dark:text-white"}`}>
                {ft}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Quantity stepper */}
      <Text className="mt-4 mb-2 text-[12px] font-semibold text-slate-600 dark:text-white/70">
        {t("feedLog.add.quantityKg")}
      </Text>

      <View className="flex-row items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-3 py-2">
        <Pressable
          onPress={() => setQty((v) => clamp(Number((v - 0.5).toFixed(1))))}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10"
        >
          <Ionicons name="remove" size={18} color="#94A3B8" />
        </Pressable>

        <View className="flex-1 px-2">
          <Text className="text-[12px] font-semibold text-slate-600 dark:text-white/70">kg</Text>
          <TextInput
            value={String(qty)}
            onChangeText={onChangeQtyText}
            keyboardType="decimal-pad"
            placeholder={t("feedLog.add.placeholderQty")}
            placeholderTextColor="#94A3B8"
            className="text-[16px] font-bold text-slate-900 dark:text-white"
          />
        </View>

        <Pressable
          onPress={() => setQty((v) => clamp(Number((v + 0.5).toFixed(1))))}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10"
        >
          <Ionicons name="add" size={18} color="#94A3B8" />
        </Pressable>
      </View>

      <AquaField label={t("feedLog.add.notes")} value={notes} onChangeText={setNotes} placeholder={t("feedLog.add.placeholderNotes")} multiline />

      <View className="flex-row gap-3 pt-1">
        <Pressable
          onPress={() => router.back()}
          className="flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-4"
        >
          <Text className="text-center font-semibold text-slate-800 dark:text-white">{t("common.cancel")}</Text>
        </Pressable>

        <Pressable onPress={save} className="flex-1 rounded-2xl border border-sky-500/25 bg-sky-500/15 px-4 py-4">
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons name="checkmark" size={16} color="#60A5FA" />
            <Text className="text-center font-semibold text-sky-300">{t("feedLog.add.saveBtn")}</Text>
          </View>
        </Pressable>
      </View>
    </AquaFormScreen>
  );
}
