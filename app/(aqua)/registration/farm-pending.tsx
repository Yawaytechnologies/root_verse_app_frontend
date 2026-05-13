import React from "react";
import { View, Text, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  selectAquaRegistration,
  selectAquaSubmission,
} from "../../../src/features/aqua/registration/registration.selectors";

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? String(value[0] ?? fallback) : String(value ?? fallback);

export default function FarmPendingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const submission = useSelector(selectAquaSubmission);
  const registration = useSelector(selectAquaRegistration);

  const farmId =
    getParamValue(params.farmId, "") || getParamValue(params.farmDbId, ""); // backend DB id only, not official QR Farm ID
  const farmName =
    getParamValue(params.farmName, "") ||
    registration.farm.farmName?.trim() ||
    "Your farm";
  const temporaryServerCode =
    getParamValue(params.farmCode, "") || getParamValue(params.tempFarmCode, "");

  const handleAddPonds = () => {
    if (!farmId) {
      router.replace("/(aqua)/tabs/dashboard");
      return;
    }

    router.replace({
      pathname: "/(aqua)/registration/pond-details",
      params: {
        farmId,
        farmName,
        farmCode: temporaryServerCode,
      },
    });
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
          <Ionicons name="shield-checkmark-outline" size={34} color="#D97706" />
        </View>

        <Text className="mt-4 text-center text-xl font-bold text-slate-900 dark:text-white">
          Farm Registration Submitted
        </Text>

        <Text className="mt-2 text-center text-sm leading-6 text-slate-600 dark:text-white/70">
          {submission.message?.trim()
            ? submission.message
            : `${farmName} has been registered and is now waiting for RootVerse field verification.`}
        </Text>

        <View className="mt-4 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
          <Text className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Status: Pending Field Verification
          </Text>
        </View>

        <View className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
          <Text className="text-sm font-semibold text-slate-900 dark:text-white">
            Important
          </Text>
          <Text className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/70">
            • No official Farm ID is active now{"\n"}
            • Backend DB ID is used only to attach ponds{"\n"}
            • RootVerse officer must verify the farm physically{"\n"}
            • Official Farm ID will be the pre-printed Farm QR after scanning{"\n"}
            • Feed, sampling and harvest logs stay locked until QR activation
          </Text>
        </View>

        {temporaryServerCode ? (
          <View className="mt-4 w-full rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
            <Text className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Temporary API Code / Not Official QR ID
            </Text>
            <Text className="mt-1 text-sm font-semibold text-blue-800 dark:text-blue-200">
              {temporaryServerCode}
            </Text>
          </View>
        ) : null}

        {farmId ? (
          <Pressable
            onPress={handleAddPonds}
            className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-4 dark:bg-white"
          >
            <Text className="text-center font-semibold text-white dark:text-slate-900">
              Continue to Pond Registration
            </Text>
          </Pressable>
        ) : null}

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
