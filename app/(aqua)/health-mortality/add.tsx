import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

type EntryType = "HEALTH" | "MORTALITY";

export default function AddHealthMortality() {
  const { t } = useTranslation();

  const [type, setType] = useState<EntryType>("HEALTH");
  const [pond, setPond] = useState("P-01");
  const [dateTime, setDateTime] = useState("Today 09:30");
  const [species, setSpecies] = useState("Shrimp");
  const [affectedCount, setAffectedCount] = useState("0");
  const [deadCount, setDeadCount] = useState("0");
  const [symptoms, setSymptoms] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [notes, setNotes] = useState("");

  const isMortality = type === "MORTALITY";
  const ponds = useMemo(() => ["P-01", "P-02", "P-03", "P-04"], []);

  const CTRL =
    "rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-3 text-slate-900 dark:text-white";
  const LABEL = "text-[12px] font-semibold text-slate-600 dark:text-white/70 mb-1";
  const CARD = "rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] p-4";

  const onSave = () => {
    const a = Number(affectedCount || 0);
    const d = Number(deadCount || 0);

    if (!pond) return Alert.alert(t("common.missing", "Missing"), t("healthMortality.add.missingPond", "Please select a pond."));
    if (!dateTime.trim()) return Alert.alert(t("common.missing", "Missing"), t("healthMortality.add.missingDateTime", "Please enter date & time."));
    if (!species.trim()) return Alert.alert(t("common.missing", "Missing"), t("healthMortality.add.missingSpecies", "Please enter species."));
    if (Number.isNaN(a) || a < 0) return Alert.alert(t("common.invalid", "Invalid"), t("healthMortality.add.invalidAffected", "Affected count must be 0 or more."));
    if (Number.isNaN(d) || d < 0) return Alert.alert(t("common.invalid", "Invalid"), t("healthMortality.add.invalidDead", "Dead count must be 0 or more."));
    if (isMortality && d === 0) return Alert.alert(t("common.missing", "Missing"), t("healthMortality.add.deadRequired", "Mortality entry must have dead count > 0."));

    Alert.alert(t("common.saved", "Saved ✅"), t("healthMortality.add.savedMsg", `Log saved for ${pond}.`), [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]"
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-extrabold text-slate-900 dark:text-white">
            {t("healthMortality.add.title", "Add Health / Mortality Log")}
          </Text>
          <Text className="mt-1 text-sm text-slate-600 dark:text-white/70">
            {t("healthMortality.add.subtitle", "Record issues and actions taken per pond.")}
          </Text>
        </View>

        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220]"
        >
          <Ionicons name="close" size={18} color="#94A3B8" />
        </Pressable>
      </View>

      {/* Type switch */}
      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={() => setType("HEALTH")}
          className={`flex-1 rounded-2xl border px-4 py-3 ${
            type === "HEALTH" ? "border-sky-500/30 bg-sky-500/15" : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220]"
          }`}
        >
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons name="medkit-outline" size={18} color={type === "HEALTH" ? "#60A5FA" : "#94A3B8"} />
            <Text className={`font-bold ${type === "HEALTH" ? "text-sky-300" : "text-slate-700 dark:text-white/80"}`}>
              {t("healthMortality.type.health", "Health")}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setType("MORTALITY")}
          className={`flex-1 rounded-2xl border px-4 py-3 ${
            type === "MORTALITY" ? "border-rose-500/30 bg-rose-500/15" : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220]"
          }`}
        >
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons name="pulse-outline" size={18} color={type === "MORTALITY" ? "#FB7185" : "#94A3B8"} />
            <Text className={`font-bold ${type === "MORTALITY" ? "text-rose-300" : "text-slate-700 dark:text-white/80"}`}>
              {t("healthMortality.type.mortality", "Mortality")}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Form card */}
      <View className={`mt-4 ${CARD}`}>
        <Text className={LABEL}>{t("healthMortality.add.pond", "Pond")}</Text>
        <View className="flex-row flex-wrap gap-2">
          {ponds.map((p) => (
            <Pressable
              key={p}
              onPress={() => setPond(p)}
              className={`rounded-full border px-3 py-2 ${
                pond === p ? "border-sky-500/30 bg-sky-500/15" : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220]"
              }`}
            >
              <Text className={`${pond === p ? "text-sky-300" : "text-slate-700 dark:text-white/80"} font-semibold`}>
                {p}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-4">
          <Text className={LABEL}>{t("healthMortality.add.dateTime", "Date & Time")}</Text>
          <TextInput
            value={dateTime}
            onChangeText={setDateTime}
            placeholder={t("healthMortality.add.placeholderDateTime", "e.g., 2025-12-18 09:30")}
            placeholderTextColor="#94A3B8"
            className={CTRL}
          />
        </View>

        <View className="mt-4">
          <Text className={LABEL}>{t("healthMortality.add.species", "Species")}</Text>
          <TextInput
            value={species}
            onChangeText={setSpecies}
            placeholder={t("healthMortality.add.placeholderSpecies", "e.g., Shrimp / Tilapia")}
            placeholderTextColor="#94A3B8"
            className={CTRL}
          />
        </View>

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1">
            <Text className={LABEL}>{t("healthMortality.add.affected", "Affected Count")}</Text>
            <TextInput
              value={affectedCount}
              onChangeText={setAffectedCount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94A3B8"
              className={CTRL}
            />
          </View>

          <View className="flex-1">
            <Text className={LABEL}>
              {isMortality ? t("healthMortality.add.deadRequiredLabel", "Dead Count (Required)") : t("healthMortality.add.dead", "Dead Count")}
            </Text>
            <TextInput
              value={deadCount}
              onChangeText={setDeadCount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94A3B8"
              className={CTRL}
            />
          </View>
        </View>

        <View className="mt-4">
          <Text className={LABEL}>{t("healthMortality.add.symptoms", "Symptoms / Observations")}</Text>
          <TextInput
            value={symptoms}
            onChangeText={setSymptoms}
            placeholder={t("healthMortality.add.placeholderSymptoms", "e.g., lethargy, discoloration, floating...")}
            placeholderTextColor="#94A3B8"
            className={CTRL}
            multiline
            style={{ minHeight: 92, textAlignVertical: "top" }}
          />
        </View>

        <View className="mt-4">
          <Text className={LABEL}>{t("healthMortality.add.actionTaken", "Action Taken")}</Text>
          <TextInput
            value={actionTaken}
            onChangeText={setActionTaken}
            placeholder={t("healthMortality.add.placeholderAction", "e.g., water exchange, probiotics, doctor visit...")}
            placeholderTextColor="#94A3B8"
            className={CTRL}
            multiline
            style={{ minHeight: 84, textAlignVertical: "top" }}
          />
        </View>

        <View className="mt-4">
          <Text className={LABEL}>{t("healthMortality.add.notes", "Notes (Optional)")}</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t("healthMortality.add.placeholderNotes", "Any additional details...")}
            placeholderTextColor="#94A3B8"
            className={CTRL}
            multiline
            style={{ minHeight: 84, textAlignVertical: "top" }}
          />
        </View>

        <Pressable
          onPress={() => Alert.alert(t("common.soon", "Coming soon"), t("healthMortality.add.attachmentSoon", "Attachment upload can be added here."))}
          className="mt-4 flex-row items-center justify-between rounded-2xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/5 px-4 py-4"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 rounded-2xl items-center justify-center bg-white dark:bg-white/10">
              <Ionicons name="cloud-upload-outline" size={20} color="#60A5FA" />
            </View>
            <View>
              <Text className="font-semibold text-slate-900 dark:text-white">{t("healthMortality.add.attachmentTitle", "Add photos / docs")}</Text>
              <Text className="text-xs text-slate-600 dark:text-white/70">{t("healthMortality.add.attachmentSub", "Optional evidence for audit")}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </Pressable>
      </View>

      <View className="mt-4 flex-row gap-3">
        <Pressable
          onPress={() => router.back()}
          className="flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] py-3 items-center"
        >
          <Text className="font-semibold text-slate-700 dark:text-white/80">{t("common.cancel", "Cancel")}</Text>
        </Pressable>

        <Pressable
          onPress={onSave}
          className={`flex-1 rounded-2xl py-3 items-center ${
            isMortality ? "bg-rose-500/20 border border-rose-500/25" : "bg-sky-500/20 border border-sky-500/25"
          }`}
        >
          <Text className={`font-extrabold ${isMortality ? "text-rose-200" : "text-sky-200"}`}>
            {t("common.save", "Save Log")}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
