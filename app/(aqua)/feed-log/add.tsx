import React, { useMemo, useState } from "react";
import { View, Pressable, Text, Alert, TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AquaFormScreen from "../../../src/components/aqua/layout/AquaFormScreen";
import AquaField from "../../../src/components/aqua/inputs/AquaField";

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? String(value[0] ?? fallback) : String(value ?? fallback);

const getTodayDate = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const getCurrentTime = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  return `${pad(hours)}:${minutes} ${ampm}`;
};

export default function AddFeedLog() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();

  /**
   * This screen must be opened only after Pond QR scan.
   *
   * QR scanner should pass these params:
   * - qrValue / pondQrId / pondId
   * - pondName
   * - farmQrId / farmId
   * - cultureCycleId
   * - species
   * - activationStatus = ACTIVE
   */

  const pondQrId =
    getParamValue(params.pondQrId) ||
    getParamValue(params.pondId) ||
    getParamValue(params.qrValue);

  const pondName = getParamValue(params.pondName, "Scanned Pond");

  const farmQrId =
    getParamValue(params.farmQrId) ||
    getParamValue(params.farmId);

  const cultureCycleId = getParamValue(params.cultureCycleId, "ACTIVE-CYCLE");
  const species = getParamValue(params.species, "-");

  /**
   * For now, if QR exists but scanner has not sent status,
   * we allow it as ACTIVE to avoid blocking current UI testing.
   *
   * Later, QR scanner should verify backend and send actual activationStatus.
   */
  const activationStatus = getParamValue(
    params.activationStatus,
    pondQrId ? "ACTIVE" : "NOT_SCANNED",
  ).toUpperCase();

  const blockedStatuses = [
    "PENDING",
    "UNVERIFIED",
    "INACTIVE",
    "NOT_ACTIVATED",
    "NOT_SCANNED",
    "REJECTED",
  ];

  const isPondQrScanned = Boolean(pondQrId);
  const isPondActivated =
    isPondQrScanned && !blockedStatuses.includes(activationStatus);

  const feedTypes = useMemo(
    () => ["CP 35% pellet", "Floating pellet", "Sinking pellet", "Starter feed"],
    [],
  );

  const [date, setDate] = useState(getTodayDate());
  const [time, setTime] = useState(getCurrentTime());
  const [feedType, setFeedType] = useState(feedTypes[0]);
  const [qty, setQty] = useState<number>(12);
  const [notes, setNotes] = useState("");

  const clamp = (n: number) => Math.max(0, Math.min(9999, n));

  const onChangeQtyText = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");

    if (cleaned.trim() === "") {
      setQty(0);
      return;
    }

    const num = Number(cleaned);

    if (!Number.isFinite(num)) return;

    setQty(clamp(num));
  };

  const openQrScanner = () => {
    router.replace({
      pathname: "/(aqua)/tabs/qr-scanner",
      params: {
        purpose: "FEED_LOG",
        returnTo: "/(aqua)/feed-log/add",
      },
    });
  };

  const save = () => {
    if (!isPondQrScanned) {
      Alert.alert(
        "Pond QR Required",
        "Please scan the activated Pond QR before adding feed log.",
      );
      return;
    }

    if (!isPondActivated) {
      Alert.alert(
        "Pond Not Activated",
        "Feed log is allowed only after Pond QR activation.",
      );
      return;
    }

    if (!date.trim()) {
      Alert.alert("Missing", t("feedLog.add.date", "Date"));
      return;
    }

    if (!time.trim()) {
      Alert.alert("Missing", t("feedLog.add.feedingTime", "Feeding Time"));
      return;
    }

    if (!feedType.trim()) {
      Alert.alert("Missing", t("feedLog.add.feedType", "Feed Type"));
      return;
    }

    if (!qty || qty <= 0) {
      Alert.alert("Missing", t("feedLog.add.quantityKg", "Quantity Kg"));
      return;
    }

    const payload = {
      farm_qr_id: farmQrId,
      pond_qr_id: pondQrId,
      pond_name: pondName,
      culture_cycle_id: cultureCycleId,
      species,
      feed_date: date,
      feed_time: time,
      feed_type: feedType,
      quantity_kg: qty,
      notes,
      entry_timestamp_utc: new Date().toISOString(),
      source: "POND_QR_SCAN",
    };

    console.log("FEED_LOG_PAYLOAD:", payload);

    Alert.alert("Saved", "Feed log saved successfully.", [
      {
        text: "OK",
        onPress: () => router.replace("/(aqua)/feed-log"),
      },
    ]);
  };

  if (!isPondQrScanned || !isPondActivated) {
    return (
      <AquaFormScreen
        title="Scan Pond QR"
        subtitle="Feed log can be created only after scanning an activated Pond QR."
      >
        <View className="rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
          <View className="items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
              <Ionicons name="qr-code-outline" size={34} color="#D97706" />
            </View>

            <Text className="mt-4 text-center text-lg font-bold text-slate-900 dark:text-white">
              Pond QR verification required
            </Text>

            <Text className="mt-2 text-center text-sm leading-6 text-slate-600 dark:text-white/70">
              Manual pond selection is blocked. Scan the physically placed Pond QR.
              Only activated Pond QR can open feed logging.
            </Text>
          </View>

          {pondQrId ? (
            <View className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
              <Text className="text-sm font-bold text-rose-700 dark:text-rose-300">
                Scanned QR is not active
              </Text>

              <Text className="mt-1 text-xs leading-5 text-rose-600 dark:text-rose-200/80">
                Pond QR: {pondQrId}
                {"\n"}
                Status: {activationStatus}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={openQrScanner}
            className="mt-5 rounded-2xl bg-slate-900 px-4 py-4 dark:bg-white"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Ionicons
                name="qr-code-outline"
                size={18}
                color="#FFFFFF"
              />

              <Text className="text-center font-semibold text-white dark:text-slate-900">
                Scan Pond QR
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#0B1220]"
          >
            <Text className="text-center font-semibold text-slate-900 dark:text-white">
              Cancel
            </Text>
          </Pressable>
        </View>
      </AquaFormScreen>
    );
  }

  return (
    <AquaFormScreen
      title={t("feedLog.add.title", "Add Feed Log")}
      subtitle={t(
        "feedLog.add.subtitle",
        "Feed entry linked to scanned Pond QR and active culture cycle.",
      )}
    >
      <View className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
        <View className="flex-row items-start gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/20">
            <Ionicons name="checkmark-circle-outline" size={22} color="#059669" />
          </View>

          <View className="flex-1">
            <Text className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              Pond QR Verified
            </Text>

            <Text className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-200/80">
              Pond QR: {pondQrId}
              {"\n"}
              Farm QR: {farmQrId || "-"}
              {"\n"}
              Culture Cycle: {cultureCycleId}
            </Text>
          </View>
        </View>
      </View>

      <View className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
        <Text className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
          Selected Pond
        </Text>

        <Text className="mt-1 text-base font-bold text-slate-900 dark:text-white">
          {pondName}
        </Text>

        <View className="mt-3 gap-2">
          <InfoRow label="Pond QR ID" value={pondQrId} />
          <InfoRow label="Farm QR ID" value={farmQrId || "-"} />
          <InfoRow label="Species" value={species} />
          <InfoRow label="Status" value={activationStatus} />
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <AquaField
            label={t("feedLog.add.date", "Date")}
            value={date}
            onChangeText={setDate}
            placeholder={t("feedLog.add.placeholderDate", "DD/MM/YYYY")}
          />
        </View>

        <View className="flex-1">
          <AquaField
            label={t("feedLog.add.feedingTime", "Feeding Time")}
            value={time}
            onChangeText={setTime}
            placeholder={t("feedLog.add.placeholderTime", "HH:MM AM")}
          />
        </View>
      </View>

      <Text className="mt-2 mb-2 text-[12px] font-semibold text-slate-600 dark:text-white/70">
        {t("feedLog.add.feedType", "Feed Type")}
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {feedTypes.map((item) => {
          const active = item === feedType;

          return (
            <Pressable
              key={item}
              onPress={() => setFeedType(item)}
              className={`rounded-full border px-3 py-2 ${
                active
                  ? "border-sky-500/25 bg-sky-500/15"
                  : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B1220]"
              }`}
            >
              <Text
                className={`text-[12px] font-semibold ${
                  active ? "text-sky-300" : "text-slate-800 dark:text-white"
                }`}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mt-4 mb-2 text-[12px] font-semibold text-slate-600 dark:text-white/70">
        {t("feedLog.add.quantityKg", "Quantity Kg")}
      </Text>

      <View className="flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#0B1220]">
        <Pressable
          onPress={() => setQty((value) => clamp(Number((value - 0.5).toFixed(1))))}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10"
        >
          <Ionicons name="remove" size={18} color="#94A3B8" />
        </Pressable>

        <View className="flex-1 px-2">
          <Text className="text-[12px] font-semibold text-slate-600 dark:text-white/70">
            kg
          </Text>

          <TextInput
            value={String(qty)}
            onChangeText={onChangeQtyText}
            keyboardType="decimal-pad"
            placeholder={t("feedLog.add.placeholderQty", "0")}
            placeholderTextColor="#94A3B8"
            className="text-[16px] font-bold text-slate-900 dark:text-white"
          />
        </View>

        <Pressable
          onPress={() => setQty((value) => clamp(Number((value + 0.5).toFixed(1))))}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10"
        >
          <Ionicons name="add" size={18} color="#94A3B8" />
        </Pressable>
      </View>

      <AquaField
        label={t("feedLog.add.notes", "Notes")}
        value={notes}
        onChangeText={setNotes}
        placeholder={t("feedLog.add.placeholderNotes", "Optional notes")}
        multiline
      />

      <View className="flex-row gap-3 pt-1">
        <Pressable
          onPress={() => router.back()}
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#0B1220]"
        >
          <Text className="text-center font-semibold text-slate-800 dark:text-white">
            {t("common.cancel", "Cancel")}
          </Text>
        </Pressable>

        <Pressable
          onPress={save}
          className="flex-1 rounded-2xl border border-sky-500/25 bg-sky-500/15 px-4 py-4"
        >
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons name="checkmark" size={16} color="#60A5FA" />
            <Text className="text-center font-semibold text-sky-300">
              {t("feedLog.add.saveBtn", "Save Log")}
            </Text>
          </View>
        </Pressable>
      </View>
    </AquaFormScreen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-white/40">
        {label}
      </Text>

      <Text
        className="flex-1 text-right text-[12px] font-semibold text-slate-700 dark:text-white/80"
        numberOfLines={1}
      >
        {value || "-"}
      </Text>
    </View>
  );
}