import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? String(value[0] ?? fallback) : String(value ?? fallback);

export default function AquaRegistrationSuccessScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const farmName = getParamValue(params.farmName, "Registered Farm");
  const pondCount = getParamValue(params.pondCount, "");

  const handleGoDashboard = () => {
    router.replace("/(aqua)/tabs/dashboard");
  };

  return (
    <View className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 28,
          flexGrow: 1,
        }}
      >
        <View className="flex-1">
          {/* Top icon */}
          <View className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
              <Ionicons name="time-outline" size={30} color="#D97706" />
            </View>

            <Text className="mt-4 text-center text-2xl font-bold text-slate-900 dark:text-white">
              Registration Submitted
            </Text>

            <Text className="mt-3 px-2 text-center text-sm leading-6 text-slate-600 dark:text-white/70">
              Farm and pond details have been submitted successfully and are
              waiting for RootVerse field verification.
            </Text>

            <View className="mt-4 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
              <Text className="text-center text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Pending Field Verification
              </Text>
            </View>
          </View>

          {/* Submitted Details */}
          <View className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <View className="mb-3 flex-row items-center gap-2">
              <Ionicons name="checkmark-circle-outline" size={20} color="#059669" />

              <Text className="text-base font-bold text-emerald-800 dark:text-emerald-300">
                Submitted Details
              </Text>
            </View>

            <InfoRow label="Farm Name" value={farmName} />
            <Divider tone="emerald" />

            <InfoRow label="Registered Ponds" value={pondCount || "-"} />
            <Divider tone="emerald" />

            <InfoRow label="Official Farm ID" value="Not activated yet" />
            <Divider tone="emerald" />

            <InfoRow label="Official Pond ID" value="Not activated yet" />
          </View>

          {/* Important Rule */}
          <View className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <View className="mb-3 flex-row items-center gap-2">
              <Ionicons name="alert-circle-outline" size={20} color="#D97706" />

              <Text className="text-base font-bold text-amber-800 dark:text-amber-300">
                Important Rule
              </Text>
            </View>

            <Bullet text="No official Farm ID is generated now" tone="amber" />
            <Bullet text="No official Pond ID is generated now" tone="amber" />
            <Bullet
              text="Farm QR becomes Farm ID only after QR activation"
              tone="amber"
            />
            <Bullet
              text="Pond QR becomes Pond ID only after QR activation"
              tone="amber"
            />
          </View>

          {/* Next Workflow */}
          <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
            <View className="mb-3 flex-row items-center gap-2">
              <Ionicons name="git-branch-outline" size={20} color="#64748B" />

              <Text className="text-base font-bold text-slate-900 dark:text-white">
                Next Workflow
              </Text>
            </View>

            <Bullet
              text="RootVerse officer verifies farmer, farm gate and ponds"
              tone="slate"
            />
            <Bullet
              text="Officer issues one Farm Gate QR and one QR per pond"
              tone="slate"
            />
            <Bullet
              text="Farmer places QR physically at farm gate and near ponds"
              tone="slate"
            />
            <Bullet
              text="Farmer scans QR to activate official Farm ID and Pond ID"
              tone="slate"
            />
            <Bullet
              text="Image capture and logs unlock only after QR activation"
              tone="slate"
            />
          </View>

          <Pressable
            onPress={handleGoDashboard}
            className="mt-6 rounded-2xl bg-slate-900 px-4 py-4 dark:bg-white"
          >
            <Text className="text-center text-base font-semibold text-white dark:text-slate-900">
              Back to Dashboard
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 py-1.5">
      <Text className="flex-1 text-sm text-emerald-700 dark:text-emerald-200/80">
        {label}
      </Text>

      <Text
        className="flex-1 text-right text-sm font-bold text-emerald-900 dark:text-emerald-100"
        numberOfLines={2}
      >
        {value || "-"}
      </Text>
    </View>
  );
}

function Divider({ tone }: { tone: "emerald" | "slate" }) {
  return (
    <View
      className={`my-1 h-px ${
        tone === "emerald"
          ? "bg-emerald-200 dark:bg-emerald-500/20"
          : "bg-slate-200 dark:bg-white/10"
      }`}
    />
  );
}

function Bullet({
  text,
  tone,
}: {
  text: string;
  tone: "amber" | "slate";
}) {
  const dotColor = tone === "amber" ? "#D97706" : "#64748B";

  return (
    <View className="mb-2 flex-row items-start gap-2">
      <Text
        className={`mt-0.5 text-base ${
          tone === "amber"
            ? "text-amber-700 dark:text-amber-300"
            : "text-slate-500 dark:text-white/60"
        }`}
      >
        •
      </Text>

      <Text
        className={`flex-1 text-sm leading-6 ${
          tone === "amber"
            ? "text-amber-700 dark:text-amber-200/80"
            : "text-slate-600 dark:text-white/70"
        }`}
      >
        {text}
      </Text>
    </View>
  );
}