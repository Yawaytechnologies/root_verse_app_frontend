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

  // These are internal params only. Do not show backend DB id to farmer.
  const farmName = getParamValue(params.farmName, "Registered Farm");
  const pondCount = getParamValue(params.pondCount, "");

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
          Farm & Pond Registration Submitted
        </Text>

        <Text className="mt-2 text-center text-sm leading-6 text-slate-600 dark:text-white/70">
          {submission.message?.trim()
            ? submission.message
            : "Farm and pond details have been submitted successfully and are waiting for RootVerse field verification."}
        </Text>

        <View className="mt-4 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
          <Text className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Status: Pending Field Verification
          </Text>
        </View>

        <View className="mt-5 w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <Text className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Submitted Registration
          </Text>

          <Text className="mt-2 text-sm leading-6 text-emerald-700 dark:text-emerald-200/80">
            Farm Name: {farmName}{"\n"}
            Registered Ponds: {pondCount || "-"}{"\n"}
            Official Farm ID: Not activated yet{"\n"}
            Official Pond ID: Not activated yet
          </Text>
        </View>

        <View className="mt-4 w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <Text className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Important Rule
          </Text>

          <Text className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-200/80">
            • No official Farm ID is generated now{"\n"}
            • No official Pond ID is generated now{"\n"}
            • Pre-printed Farm QR becomes the Farm ID after activation{"\n"}
            • Pre-printed Pond QR becomes the Pond ID after activation
          </Text>
        </View>

        <View className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
          <Text className="text-sm font-semibold text-slate-900 dark:text-white">
            Next Workflow
          </Text>

          <Text className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/70">
            • RootVerse officer verifies farmer, farm gate and pond locations{"\n"}
            • Officer issues one Farm Gate QR and one QR per pond{"\n"}
            • Farmer places QR physically at farm gate and near ponds{"\n"}
            • Farmer scans QR to activate official Farm ID and Pond ID{"\n"}
            • Image capture and logs unlock only after QR activation
          </Text>
        </View>

        <Pressable
          onPress={handleGoDashboard}
          className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-4 dark:bg-white"
        >
          <Text className="text-center font-semibold text-white dark:text-slate-900">
            Back to Dashboard
          </Text>
        </Pressable>
      </View>
    </View>
  );
}