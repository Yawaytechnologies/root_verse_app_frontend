import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, ScrollView, Pressable, Image, Modal, Alert } from "react-native";
import { router } from "expo-router";
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
import { mapFarmStateToFormData } from "../../../src/features/aqua/registration/registration.mapper";
import { submitFarmRegistration } from "../../../src/services/aqua/registration.service";

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

function WatermarkOverlay({
  farmerCode,
  farmName,
  lat,
  lng,
  captureTime,
}: {
  farmerCode: string;
  farmName: string;
  lat: string;
  lng: string;
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
        Farm: {farmName}
      </Text>
      <Text style={{ color: "#CBD5E1", fontSize: 9, lineHeight: 14 }}>
        Lat: {lat}
      </Text>
      <Text style={{ color: "#CBD5E1", fontSize: 9, lineHeight: 14 }}>
        Lng: {lng}
      </Text>
      <Text style={{ color: "#CBD5E1", fontSize: 9, lineHeight: 14 }}>
        Time: {captureTime}
      </Text>
    </View>
  );
}

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

export default function FarmReviewSubmitScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  const registration = useSelector(selectAquaRegistration);
  const { farmer, farm, submission } = registration;

  const me = useSelector((state: any) => state.me?.me);
  const ownerId = String(me?.owner_id ?? farm.ownerId ?? "-");

  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleSubmit = async () => {
    if (!me?.owner_id) {
      Alert.alert("Error", "User not logged in. Please login again.");
      return;
    }

    try {
      setSubmitting(true);
      dispatch(submitRegistrationStart());

      const formData = mapFarmStateToFormData(registration, ownerId);
      const response = await submitFarmRegistration(formData);

      if (!response.ok) {
        const errMsg = response.message || "Farm registration submission failed";
        dispatch(submitRegistrationFailure(errMsg));
        Alert.alert("Submission Failed", errMsg);
        return;
      }

      dispatch(submitRegistrationSuccess(response.message));
      router.replace("/(aqua)/registration/farm-pending");
    } catch (error: any) {
      const errMsg = error?.message || "Farm registration submission failed";
      dispatch(submitRegistrationFailure(errMsg));
      Alert.alert("Submission Failed", errMsg);
    } finally {
      setSubmitting(false);
    }
  };

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
                {t("registration.farmRegistrationHeader")}
              </Text>
              <Text className="mt-1 text-lg font-bold text-white">
                {t("registration.review")}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Farmer Details ── */}
        <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
          <Text className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
            {t("registration.farmerDetails")}
          </Text>
          <View className="rounded-2xl border border-slate-100 bg-slate-50 px-3 dark:border-white/5 dark:bg-white/5">
            <InfoRow label={t("registration.farmerName")} value={farmer.farmerName} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.mobileNumber")} value={farmer.mobileNumber} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.email")} value={farmer.email ?? ""} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.aadhaarNumber")} value={farmer.aadhaarNumber ?? ""} />
          </View>
        </View>

        {/* ── Farm Details ── */}
        <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
          <Text className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
            {t("registration.farmDetailsLabel")}
          </Text>
          <View className="rounded-2xl border border-slate-100 bg-slate-50 px-3 dark:border-white/5 dark:bg-white/5">
            <InfoRow label="Owner ID" value={ownerId} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.farmName")} value={farm.farmName} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.farmAddress")} value={farm.farmAddress} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.country")} value={farm.countryName} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.state")} value={farm.stateName} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.district")} value={farm.district} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.location")} value={farm.locationName} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.waterSource")} value={farm.waterSource} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.pondCount")} value={farm.pondCount} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.farmArea")} value={farm.farmArea} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.latitude")} value={farm.latitude} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.longitude")} value={farm.longitude} />
          </View>

          {/* ── Farm Image ── */}
          <View className="mt-4">
            <Text className="mb-2 text-sm font-medium text-slate-900 dark:text-white">
              {t("registration.farmGateImage")}
            </Text>

            {farm.farmImageCaptured && farm.farmImageUri ? (
              <Pressable onPress={() => setPreviewOpen(true)}>
                <View style={{ position: "relative" }}>
                  <Image
                    source={{ uri: farm.farmImageUri }}
                    style={{ width: "100%", height: 192, borderRadius: 16 }}
                    resizeMode="cover"
                  />
                  <WatermarkOverlay
                    farmerCode={ownerId}
                    farmName={farm.farmName?.trim() || "Farm"}
                    lat={farm.latitude ? parseFloat(farm.latitude).toFixed(5) : "N/A"}
                    lng={farm.longitude ? parseFloat(farm.longitude).toFixed(5) : "N/A"}
                    captureTime={localNow()}
                  />
                </View>
                <Text className="mt-2 text-center text-xs font-medium text-slate-500 dark:text-white/50">
                  {t("registration.tapToPreview")}
                </Text>
              </Pressable>
            ) : (
              <View className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <Text className="text-sm text-slate-500 dark:text-white/50">
                  {t("registration.farmGateImage")} —
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Submission message ── */}
        {submission.message ? (
          <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
            <Text className="text-sm text-slate-700 dark:text-white/80">
              {submission.message}
            </Text>
          </View>
        ) : null}

        {/* ── Action Buttons ── */}
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
                {submitting ? t("registration.submitting") : t("registration.submitFarm")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ── Full-screen Image Preview Modal ── */}
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
              {t("registration.farmGateImage")}
            </Text>
            <Pressable
              onPress={() => setPreviewOpen(false)}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center px-4 pb-6">
            {farm.farmImageUri ? (
              <View style={{ position: "relative", width: "100%", height: "100%" }}>
                <Image
                  source={{ uri: farm.farmImageUri }}
                  style={{ width: "100%", height: "100%", borderRadius: 16 }}
                  resizeMode="contain"
                />
                <WatermarkOverlay
                  farmerCode={ownerId}
                  farmName={farm.farmName?.trim() || "Farm"}
                  lat={farm.latitude ? parseFloat(farm.latitude).toFixed(5) : "N/A"}
                  lng={farm.longitude ? parseFloat(farm.longitude).toFixed(5) : "N/A"}
                  captureTime={localNow()}
                />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}
