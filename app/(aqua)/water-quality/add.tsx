import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

export default function AddWaterQuality() {
  const { t } = useTranslation();
  const ponds = useMemo(() => ["P-01", "P-02", "P-03", "P-04"], []);

  const [pond, setPond] = useState("P-01");
  const [dateTime, setDateTime] = useState("Today 06:30");

  const [ph, setPh] = useState("7.5");
  const [doMgL, setDoMgL] = useState("5.0");
  const [tempC, setTempC] = useState("28.0");
  const [salinityPpt, setSalinityPpt] = useState("18");
  const [ammoniaMgL, setAmmoniaMgL] = useState("0.10");

  const [note, setNote] = useState("");
  const [actionsTaken, setActionsTaken] = useState("");

  const CTRL =
    "rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-3 text-slate-900 dark:text-white";
  const LABEL = "text-[12px] font-semibold text-slate-600 dark:text-white/70 mb-1";
  const CARD = "rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] p-4";

  const toNum = (v: string) => Number(String(v || "").trim());

  const onSave = () => {
    const pH = toNum(ph);
    const DO = toNum(doMgL);
    const T = toNum(tempC);
    const SAL = toNum(salinityPpt);
    const NH3 = toNum(ammoniaMgL);

    if (!pond) return Alert.alert(t("common.missing", "Missing"), t("waterQuality.add.missingPond", "Please select a pond."));
    if (!dateTime.trim()) return Alert.alert(t("common.missing", "Missing"), t("waterQuality.add.missingDateTime", "Please enter date & time."));

    if (Number.isNaN(pH) || pH < 0 || pH > 14) return Alert.alert(t("common.invalid", "Invalid"), t("waterQuality.add.invalidPh", "pH must be between 0 and 14."));
    if (Number.isNaN(DO) || DO < 0) return Alert.alert(t("common.invalid", "Invalid"), t("waterQuality.add.invalidDo", "DO must be 0 or more."));
    if (Number.isNaN(T)) return Alert.alert(t("common.invalid", "Invalid"), t("waterQuality.add.invalidTemp", "Temperature must be a number."));
    if (Number.isNaN(SAL) || SAL < 0) return Alert.alert(t("common.invalid", "Invalid"), t("waterQuality.add.invalidSalinity", "Salinity must be 0 or more."));
    if (Number.isNaN(NH3) || NH3 < 0) return Alert.alert(t("common.invalid", "Invalid"), t("waterQuality.add.invalidAmmonia", "Ammonia must be 0 or more."));

    Alert.alert(t("common.saved", "Saved ✅"), t("waterQuality.add.savedMsg", `Water quality log saved for ${pond}.`), [
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
            {t("waterQuality.add.title", "Add Water Quality")}
          </Text>
          <Text className="mt-1 text-sm text-slate-600 dark:text-white/70">
            {t("waterQuality.add.subtitle", "Record water parameters for audit and farm performance.")}
          </Text>
        </View>

        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220]"
        >
          <Ionicons name="close" size={18} color="#94A3B8" />
        </Pressable>
      </View>

      <View className={`mt-4 ${CARD}`}>
        <Text className={LABEL}>{t("waterQuality.add.pond", "Pond")}</Text>
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
          <Text className={LABEL}>{t("waterQuality.add.dateTime", "Date & Time")}</Text>
          <TextInput
            value={dateTime}
            onChangeText={setDateTime}
            placeholder={t("waterQuality.add.placeholderDateTime", "e.g., 2025-12-18 06:30")}
            placeholderTextColor="#94A3B8"
            className={CTRL}
          />
        </View>

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1">
            <Text className={LABEL}>pH</Text>
            <TextInput value={ph} onChangeText={setPh} keyboardType="decimal-pad" placeholder="7.5" placeholderTextColor="#94A3B8" className={CTRL} />
          </View>
          <View className="flex-1">
            <Text className={LABEL}>DO (mg/L)</Text>
            <TextInput value={doMgL} onChangeText={setDoMgL} keyboardType="decimal-pad" placeholder="5.0" placeholderTextColor="#94A3B8" className={CTRL} />
          </View>
        </View>

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1">
            <Text className={LABEL}>{t("waterQuality.add.tempC", "Temp (°C)")}</Text>
            <TextInput value={tempC} onChangeText={setTempC} keyboardType="decimal-pad" placeholder="28.0" placeholderTextColor="#94A3B8" className={CTRL} />
          </View>
          <View className="flex-1">
            <Text className={LABEL}>{t("waterQuality.add.salinity", "Salinity (ppt)")}</Text>
            <TextInput value={salinityPpt} onChangeText={setSalinityPpt} keyboardType="numeric" placeholder="18" placeholderTextColor="#94A3B8" className={CTRL} />
          </View>
        </View>

        <View className="mt-4">
          <Text className={LABEL}>{t("waterQuality.add.ammonia", "Ammonia NH₃ (mg/L)")}</Text>
          <TextInput value={ammoniaMgL} onChangeText={setAmmoniaMgL} keyboardType="decimal-pad" placeholder="0.10" placeholderTextColor="#94A3B8" className={CTRL} />
        </View>

        <View className="mt-4">
          <Text className={LABEL}>{t("waterQuality.add.notes", "Notes (Optional)")}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t("waterQuality.add.placeholderNotes", "Any observations...")}
            placeholderTextColor="#94A3B8"
            className={CTRL}
            multiline
            style={{ minHeight: 84, textAlignVertical: "top" }}
          />
        </View>

        <View className="mt-4">
          <Text className={LABEL}>{t("waterQuality.add.actionsTaken", "Actions Taken (Optional)")}</Text>
          <TextInput
            value={actionsTaken}
            onChangeText={setActionsTaken}
            placeholder={t("waterQuality.add.placeholderActions", "e.g., started aerator, water exchange...")}
            placeholderTextColor="#94A3B8"
            className={CTRL}
            multiline
            style={{ minHeight: 84, textAlignVertical: "top" }}
          />
        </View>

        <Pressable
          onPress={() => Alert.alert(t("common.soon", "Coming soon"), t("waterQuality.add.attachmentSoon", "Attachment upload can be added here."))}
          className="mt-4 flex-row items-center justify-between rounded-2xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/5 px-4 py-4"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 rounded-2xl items-center justify-center bg-white dark:bg-white/10">
              <Ionicons name="cloud-upload-outline" size={20} color="#60A5FA" />
            </View>
            <View>
              <Text className="font-semibold text-slate-900 dark:text-white">{t("waterQuality.add.attachmentTitle", "Add photo / report")}</Text>
              <Text className="text-xs text-slate-600 dark:text-white/70">{t("waterQuality.add.attachmentSub", "Optional evidence")}</Text>
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
          className="flex-1 rounded-2xl py-3 items-center bg-sky-500/20 border border-sky-500/25"
        >
          <Text className="font-extrabold text-sky-200">{t("common.save", "Save Log")}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
