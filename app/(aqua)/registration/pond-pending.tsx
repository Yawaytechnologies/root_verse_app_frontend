import React from "react";
import { View, Text, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { selectAquaSubmission } from "../../../src/features/aqua/registration/registration.selectors";

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? String(value[0] ?? fallback) : String(value ?? fallback);

export default function PondPendingScreen() {
  const insets = useSafeAreaInsets();
  const submission = useSelector(selectAquaSubmission);
  const params = useLocalSearchParams();

  const farmId = getParamValue(params.farmId, "");
  const farmName = getParamValue(params.farmName, "Approved Farm");
  const farmCode = getParamValue(params.farmCode, "");

  const handleViewPending = () => {
    router.replace("/(aqua)/approvals/pending");
  };

  const handleGoDashboard = () => {
    router.replace("/(aqua)/tabs/dashboard");
  };

  return (
    <View
      className="flex-1 justify-center bg-[#F5F7FB] px-4 dark:bg-[#050B16]"
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 16,
      }}
    >
      <View className="items-center rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0B1220]">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
          <Ionicons name="time-outline" size={34} color="#D97706" />
        </View>

        <Text className="mt-4 text-center text-xl font-bold text-slate-900 dark:text-white">
          Pond Registration Submitted
        </Text>

        <Text className="mt-2 text-center text-sm leading-6 text-slate-600 dark:text-white/70">
          {submission.message?.trim()
            ? submission.message
            : "Your pond registration has been submitted successfully and is now waiting for admin approval."}
        </Text>

        <View className="mt-4 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
          <Text className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Status: Pending Approval
          </Text>
        </View>

        <View className="mt-5 w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <Text className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Linked Farm
          </Text>

          <Text className="mt-2 text-sm leading-6 text-emerald-700 dark:text-emerald-200/80">
            Farm Name: {farmName}{"\n"}
            Farm ID: {farmId || "-"}{"\n"}
            Farm Code: {farmCode || "-"}
          </Text>
        </View>

        <View className="mt-4 w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <Text className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            What happens next?
          </Text>

          <Text className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-200/80">
            • Pond details are under review{"\n"}
            • Pond ID will be created after approval{"\n"}
            • Pond QR will be available after approval{"\n"}
            • This pond remains linked to the approved farm
          </Text>
        </View>

        <Pressable
          onPress={handleViewPending}
          className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-4 dark:bg-white"
        >
          <Text className="text-center font-semibold text-white dark:text-slate-900">
            View Pending Approval
          </Text>
        </Pressable>

        <Pressable
          onPress={handleGoDashboard}
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#111827]"
        >
          <Text className="text-center font-semibold text-slate-900 dark:text-white">
            Back to Dashboard
          </Text>
        </Pressable>
      </View>
    </View>
  );
}