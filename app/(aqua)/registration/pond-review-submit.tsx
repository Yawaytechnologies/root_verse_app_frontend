import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Modal,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import type { AppDispatch } from "../../../src/store/auth/store";
import { selectAquaRegistration } from "../../../src/features/aqua/registration/registration.selectors";
import {
  submitRegistrationFailure,
  submitRegistrationStart,
  submitRegistrationSuccess,
} from "../../../src/features/aqua/registration/registration.slice";
import { mapPondToFormData } from "../../../src/features/aqua/registration/registration.mapper";
import { submitPondRegistration } from "../../../src/services/aqua/registration.service";

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? String(value[0] ?? fallback) : String(value ?? fallback);

const pondCode = (index: number) => `PD${String(index + 1).padStart(2, "0")}`;

const localNow = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${year}-${month}-${day} ${pad(hours)}:${minutes} ${ampm}`;
};

// ─── Watermark — same as PondDetailsScreen ────────────────────────────────────
function WatermarkOverlay({
  farmerCode,
  farmLabel,
  pondLabel,
  coordStr,
  captureTime,
}: {
  farmerCode: string;
  farmLabel: string;
  pondLabel: string;
  coordStr: string;
  captureTime: string;
}) {
  return (
    <View
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "rgba(0,0,0,0.72)",
        borderRadius: 8,
        padding: 8,
        maxWidth: 215,
      }}
    >
      <Text
        style={{
          color: "#93C5FD",
          fontSize: 8,
          fontWeight: "700",
          lineHeight: 13,
          marginBottom: 3,
          letterSpacing: 0.4,
        }}
      >
        ⬡ Powered by Rootverse
      </Text>
      <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "700", lineHeight: 14 }}>
        Farmer: {farmerCode}
      </Text>
      <Text style={{ color: "#FFFFFF", fontSize: 9, lineHeight: 14 }}>
        Farm: {farmLabel}
      </Text>
      <Text style={{ color: "#FFFFFF", fontSize: 9, lineHeight: 14 }}>
        Pond: {pondLabel}
      </Text>
      <Text style={{ color: "#CBD5E1", fontSize: 9, lineHeight: 14 }}>
        Location: {coordStr}
      </Text>
      <Text style={{ color: "#CBD5E1", fontSize: 9, lineHeight: 14 }}>
        Time: {captureTime}
      </Text>
    </View>
  );
}

// ─── InfoRow outside component ────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 py-2">
      <Text className="flex-1 text-sm text-slate-500 dark:text-white/60">
        {label}
      </Text>
      <Text
        className="flex-1 text-right text-sm font-medium text-slate-900 dark:text-white"
        numberOfLines={2}
      >
        {value || "-"}
      </Text>
    </View>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function PondReviewSubmitScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const params = useLocalSearchParams();
  const { t } = useTranslation();

  const registration = useSelector(selectAquaRegistration);
  const { ponds, submission, farm: registrationFarm } = registration;

  // Farmer code for watermark
  const me = useSelector((state: any) => state.me?.me);
  const farmer = registration.farmer;
  const farmerCode = me?.owner_id ?? farmer.farmerName ?? "FARMER";

  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUri, setPreviewUri] = useState("");
  const [previewWatermark, setPreviewWatermark] = useState<{
    farmerCode: string;
    farmLabel: string;
    pondLabel: string;
    coordStr: string;
    captureTime: string;
  } | null>(null);

  const farmId = getParamValue(params.farmId, "");
  const farmName = getParamValue(params.farmName, "Approved Farm");
  const farmCode = getParamValue(params.farmCode, "");
  const farmLabel = farmCode || farmId;

  const openPreview = (
    uri: string,
    wm: typeof previewWatermark,
  ) => {
    if (!uri) return;
    setPreviewUri(uri);
    setPreviewWatermark(wm);
    setPreviewOpen(true);
  };

  const handleSubmit = async () => {
    if (!farmId) {
      Alert.alert(
        "Approved Farm Required",
        "Pond registration must be linked to an approved farm ID.",
      );
      return;
    }

    if (!ponds.length) {
      Alert.alert("Validation", "Please add at least one pond before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      dispatch(submitRegistrationStart());

      for (const pond of ponds) {
        const formData = mapPondToFormData(pond, farmId);
        const response = await submitPondRegistration(formData);

        if (!response.ok) {
          const errMsg = response.message || "Pond registration submission failed";
          dispatch(submitRegistrationFailure(errMsg));
          Alert.alert("Submission Failed", errMsg);
          return;
        }
      }

      dispatch(
        submitRegistrationSuccess("Pond registration submitted successfully"),
      );

      router.replace({
        pathname: "/(aqua)/registration/pond-pending",
        params: { farmId, farmName, farmCode },
      });
    } catch (error: any) {
      const errMsg = error?.message || "Pond registration submission failed";
      console.error("Pond registration submit failed:", error);
      dispatch(submitRegistrationFailure(errMsg));
      Alert.alert("Submission Failed", errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── No farm ID guard ──────────────────────────────────────────────────────
  if (!farmId) {
    return (
      <ScrollView
        className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]"
        contentContainerStyle={{
          padding: 16,
          paddingTop: insets.top + 8,
          paddingBottom: 32,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-2xl border border-slate-900 bg-slate-900 p-5 dark:border-white/10 dark:bg-[#0B1220]">
          <View className="flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Ionicons name="lock-closed-outline" size={20} color="#60A5FA" />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] uppercase tracking-wide text-white opacity-80">
                {t("registration.pondReviewTitle")}
              </Text>
              <Text className="mt-1 text-lg font-bold text-white">
                {t("registration.selectFarm")}
              </Text>
              <Text className="mt-1 text-sm leading-5 text-white/80">
                {t("registration.noApprovedFarmsWarning")}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => router.replace("/(aqua)/tabs/dashboard")}
          className="mt-5 rounded-2xl bg-slate-900 px-4 py-3 dark:bg-white"
        >
          <Text className="text-center font-semibold text-white dark:text-slate-900">
            {t("tabs.dashboard")}
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]"
        contentContainerStyle={{
          padding: 16,
          paddingTop: insets.top + 8,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View className="rounded-2xl border border-slate-900 bg-slate-900 p-5 dark:border-white/10 dark:bg-[#0B1220]">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Ionicons name="document-text-outline" size={20} color="#60A5FA" />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] uppercase tracking-wide text-white opacity-80">
                {t("registration.pondDetails")}
              </Text>
              <Text className="mt-1 text-lg font-bold text-white">
                {t("registration.review")}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Linked Farm ── */}
        <View className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <View className="flex-row items-center gap-2">
            <Ionicons name="checkmark-circle-outline" size={18} color="#059669" />
            <Text className="text-base font-semibold text-emerald-800 dark:text-emerald-300">
              {t("registration.selectFarm")}
            </Text>
          </View>
          <View className="mt-3">
            <InfoRow label={t("registration.farmName")} value={farmName} />
            <InfoRow label="Farm ID" value={farmId} />
            {farmCode ? <InfoRow label="Farm Code" value={farmCode} /> : null}
          </View>
        </View>

        {/* ── Pond Summary count ── */}
        <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-slate-900 dark:text-white">
              {t("registration.pondDetails")}
            </Text>
            <View className="rounded-xl bg-slate-100 px-3 py-1 dark:bg-white/10">
              <Text className="text-sm font-semibold text-slate-700 dark:text-white">
                {ponds.length} {ponds.length === 1 ? "Pond" : "Ponds"}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Pond Cards ── */}
        <View className="mt-4 gap-4">
          {ponds.map((pond, index) => {
            const thisPondCode = pondCode(index);
            const pondLabel = `${farmLabel}-${thisPondCode}`;
            const coordStr =
              pond.gpsLat && pond.gpsLng
                ? `${parseFloat(pond.gpsLat).toFixed(5)}, ${parseFloat(pond.gpsLng).toFixed(5)}`
                : registrationFarm.latitude && registrationFarm.longitude
                ? `${parseFloat(registrationFarm.latitude).toFixed(5)}, ${parseFloat(registrationFarm.longitude).toFixed(5)}`
                : "N/A";
            const captureTime = localNow();

            const wm = {
              farmerCode,
              farmLabel,
              pondLabel,
              coordStr,
              captureTime,
            };

            return (
              <View
                key={pond.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]"
              >
                {/* Pond header */}
                <View className="mb-3 flex-row items-center justify-between">
                  <View>
                    <Text className="text-base font-semibold text-slate-900 dark:text-white">
                      {t("registration.pondDetails")} {index + 1}
                    </Text>
                    <Text className="text-xs text-slate-400 dark:text-white/40">
                      {pondLabel}
                    </Text>
                  </View>
                  {pond.pondImageCaptured && (
                    <View className="flex-row items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <Ionicons
                        name="checkmark-circle"
                        size={13}
                        color="#059669"
                      />
                      <Text className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        {t("registration.pondImageAttached")}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Info rows */}
                <View className="rounded-2xl border border-slate-100 bg-slate-50 px-3 dark:border-white/5 dark:bg-white/5">
                  <InfoRow label={t("registration.pondName")} value={pond.pondName} />
                  <View className="h-px bg-slate-100 dark:bg-white/5" />
                  <InfoRow label={t("registration.pondArea")} value={pond.pondArea} />
                  <View className="h-px bg-slate-100 dark:bg-white/5" />
                  <InfoRow label={t("registration.species")} value={pond.speciesName} />
                </View>

                {/* Species image */}
                {pond.speciesImageUrl ? (
                  <View className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                    <Image
                      source={{ uri: pond.speciesImageUrl }}
                      style={{ width: "100%", height: 120 }}
                      resizeMode="cover"
                    />
                    <View className="bg-slate-50 px-3 py-2 dark:bg-white/5">
                      <Text className="text-xs font-medium text-slate-600 dark:text-white/60">
                        {pond.speciesName}
                        {pond.speciesCode ? `  •  ${pond.speciesCode}` : ""}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Pond image with watermark */}
                <View className="mt-4">
                  <Text className="mb-2 text-sm font-medium text-slate-900 dark:text-white">
                    {t("registration.captureImage")}
                  </Text>

                  {pond.pondImageCaptured && pond.pondImageUri ? (
                    <Pressable onPress={() => openPreview(pond.pondImageUri, wm)}>
                      <View style={{ position: "relative" }}>
                        <Image
                          source={{ uri: pond.pondImageUri }}
                          style={{ width: "100%", height: 192, borderRadius: 16 }}
                          resizeMode="cover"
                        />
                        <WatermarkOverlay {...wm} />
                      </View>
                      <Text className="mt-2 text-center text-xs font-medium text-slate-500 dark:text-white/50">
                        {t("registration.tapToPreview")}
                      </Text>
                    </Pressable>
                  ) : (
                    <View className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                      <Text className="text-sm text-slate-500 dark:text-white/50">
                        {t("registration.captureImage")} —
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Submission message */}
        {submission.message ? (
          <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
            <Text className="text-sm text-slate-700 dark:text-white/80">
              {submission.message}
            </Text>
          </View>
        ) : null}

        {/* ── Action buttons ── */}
        <View className="mt-5 flex-row gap-3">
          <View className="flex-1">
            <Pressable
              onPress={() => router.back()}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0B1220]"
            >
              <Text className="text-center font-semibold text-slate-900 dark:text-white">
                {t("registration.back")}
              </Text>
            </Pressable>
          </View>

          <View className="flex-1">
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              className={`rounded-2xl px-4 py-3 dark:bg-white ${
                submitting ? "bg-slate-700" : "bg-slate-900"
              }`}
            >
              <Text className="text-center font-semibold text-white dark:text-slate-900">
                {submitting ? t("registration.submitting") : t("registration.submitPond")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ── Full-screen image preview with watermark ── */}
      <Modal
        visible={previewOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setPreviewOpen(false)}
      >
        <View className="flex-1 bg-black/95">
          <View
            className="flex-row items-center justify-between px-4"
            style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}
          >
            <Text className="text-base font-semibold text-white">
              {t("registration.pondImagePreview")}
            </Text>
            <Pressable
              onPress={() => setPreviewOpen(false)}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center px-4 pb-6">
            {previewUri ? (
              <View
                style={{ position: "relative", width: "100%", height: "100%" }}
              >
                <Image
                  source={{ uri: previewUri }}
                  style={{ width: "100%", height: "100%", borderRadius: 16 }}
                  resizeMode="contain"
                />
                {previewWatermark && (
                  <WatermarkOverlay {...previewWatermark} />
                )}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}