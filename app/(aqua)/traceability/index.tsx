import React from "react";
import { View, Text, Pressable } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? String(value[0] ?? fallback) : String(value ?? fallback);

function paramsToObject(params: Record<string, string | string[] | undefined>) {
  const output: Record<string, string> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    const cleanValue = Array.isArray(value)
      ? String(value[0] ?? "")
      : String(value);

    if (cleanValue.trim()) {
      output[key] = cleanValue;
    }
  });

  return output;
}

export default function TraceabilityIndexScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const code =
    getParamValue(params.code) ||
    getParamValue(params.qrValue) ||
    getParamValue(params.scannedValue) ||
    getParamValue(params.qrCode) ||
    getParamValue(params.value);

  const safeBack = () => {
    const canGoBack =
      typeof (router as any).canGoBack === "function" &&
      (router as any).canGoBack();

    if (canGoBack) {
      router.back();
      return;
    }

    router.replace("/(aqua)/tabs/dashboard");
  };

  if (code) {
    return (
      <Redirect
        href={{
          pathname: "/(aqua)/traceability/[code]",
          params: {
            ...paramsToObject(params as any),
            code,
            qrValue: code,
            scannedValue: code,
          },
        }}
      />
    );
  }

  return (
    <View
      className="flex-1 bg-[#F5F7FB] px-4 dark:bg-[#050B16]"
      style={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={safeBack}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-white dark:bg-[#0B1220]"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>

        <Text className="text-2xl font-bold text-slate-900 dark:text-white">
          Traceability
        </Text>
      </View>

      <View className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/20 dark:bg-amber-500/10">
        <View className="items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
            <Ionicons name="qr-code-outline" size={36} color="#D97706" />
          </View>

          <Text className="mt-4 text-center text-xl font-bold text-amber-800 dark:text-amber-300">
            QR Scan Required
          </Text>

          <Text className="mt-2 text-center text-sm leading-6 text-amber-700 dark:text-amber-200/80">
            Scan a Farm QR or Pond QR to view traceability details.
          </Text>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(aqua)/tabs/qr-scanner",
                params: {
                  purpose: "TRACEABILITY",
                },
              })
            }
            className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-4 dark:bg-white"
          >
            <Text className="text-center font-semibold text-white dark:text-slate-900">
              Scan QR
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/(aqua)/tabs/dashboard")}
            className="mt-3 w-full rounded-2xl border border-amber-200 px-4 py-4 dark:border-amber-500/20"
          >
            <Text className="text-center font-semibold text-amber-800 dark:text-amber-300">
              Back to Dashboard
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}