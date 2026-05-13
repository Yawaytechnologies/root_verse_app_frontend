import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
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

export default function PondReviewSubmitScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const params = useLocalSearchParams();
  const { t } = useTranslation();

  const registration = useSelector(selectAquaRegistration);
  const { ponds } = registration;

  const farmId = getParamValue(params.farmId, ""); // backend DB id only
  const farmName = getParamValue(params.farmName, "Registered Farm");
  const farmCode = getParamValue(params.farmCode, ""); // temporary API code, not official QR Farm ID

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!farmId) {
      Alert.alert("Farm Required", "Pond registration must be linked to a registered farm record.");
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

      dispatch(submitRegistrationSuccess("Pond registration submitted successfully"));

      router.replace({
        pathname: "/(aqua)/registration/pond-pending",
        params: {
          farmId,
          farmName,
          farmCode,
          pondCount: String(ponds.length),
        },
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
                Pond Registration
              </Text>
              <Text className="mt-1 text-lg font-bold text-white">
                Registered Farm Required
              </Text>
              <Text className="mt-1 text-sm leading-5 text-white/80">
                Submit farm registration first, then add pond details using the backend farm record id.
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => router.replace("/(aqua)/tabs/dashboard")}
          className="mt-5 rounded-2xl bg-slate-900 px-4 py-3 dark:bg-white"
        >
          <Text className="text-center font-semibold text-white dark:text-slate-900">
            Dashboard
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]"
      contentContainerStyle={{
        padding: 16,
        paddingTop: insets.top + 8,
        paddingBottom: 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="rounded-2xl border border-slate-900 bg-slate-900 p-5 dark:border-white/10 dark:bg-[#0B1220]">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
            <Ionicons name="document-text-outline" size={20} color="#60A5FA" />
          </View>
          <View className="flex-1">
            <Text className="text-[11px] uppercase tracking-wide text-white opacity-80">
              Pond Registration
            </Text>
            <Text className="mt-1 text-lg font-bold text-white">Review & Submit</Text>
            <Text className="mt-1 text-sm leading-5 text-white/70">
              This creates pond registration records only. Official Pond IDs will be activated later by scanning pre-printed Pond QRs.
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
        <Text className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          Linked Farm
        </Text>
        <Text className="mt-2 text-sm leading-6 text-emerald-700 dark:text-emerald-200/80">
          Farm Name: {farmName}{"\n"}
          Backend DB ID: {farmId}{"\n"}
          Temporary API Code: {farmCode || "-"}
        </Text>
      </View>

      <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
        <Text className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Pending Field Verification Flow
        </Text>
        <Text className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-200/80">
          • No official Pond ID is generated at this stage{"\n"}
          • Pond image capture is not required before activation{"\n"}
          • Pond QR becomes the official Pond ID only after field verification and QR scan{"\n"}
          • Feed, sampling, stocking and harvest logs must stay locked until QR activation
        </Text>
      </View>

      <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
        <Text className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
          Pond Details
        </Text>

        {ponds.map((pond: any, index: number) => (
          <View
            key={pond.id || `pond-${index}`}
            className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 dark:border-white/5 dark:bg-white/5"
          >
            <Text className="pt-3 text-sm font-bold text-slate-900 dark:text-white">
              Pond {index + 1}
            </Text>
            <InfoRow label={t("registration.pondName") || "Pond Name"} value={pond.pondName} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.pondType") || "Pond Type"} value={pond.pondType || pond.cultureType || "Earthen"} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.pondArea") || "Water Spread Area"} value={pond.pondArea} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.latitude") || "Latitude"} value={pond.gpsLat || ""} />
            <View className="h-px bg-slate-100 dark:bg-white/5" />
            <InfoRow label={t("registration.longitude") || "Longitude"} value={pond.gpsLng || ""} />
          </View>
        ))}
      </View>

      <View className="mt-5 flex-row gap-3">
        <Pressable
          onPress={() => router.back()}
          disabled={submitting}
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#0B1220]"
        >
          <Text className="text-center font-semibold text-slate-900 dark:text-white">
            Back
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          className={`flex-1 rounded-2xl px-4 py-4 ${submitting ? "bg-slate-400" : "bg-slate-900 dark:bg-white"}`}
        >
          <Text className="text-center font-semibold text-white dark:text-slate-900">
            {submitting ? "Submitting..." : "Submit Ponds"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
