import React from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function FilledCatchLog() {
  const { crateId } = useLocalSearchParams<{ crateId: string }>();
  const finalCrateId = String(crateId || "").trim();

  return (
    <View className="flex-1 bg-[#fbf6f1] p-4">
      <View className="rounded-2xl border border-[#ead7c8] bg-white p-4">
        <Text className="text-lg font-extrabold text-[#2b2b2b]">✅ This QR is FILLED</Text>
        <Text className="mt-2 text-xs text-[#7a6f66]">Crate ID</Text>
        <Text className="mt-1 text-base font-bold text-[#2b2b2b]">{finalCrateId}</Text>

        <Pressable
          onPress={() => router.replace("/catch-logs")}
          className="mt-4 rounded-2xl px-4 py-3 active:opacity-90"
          style={{ backgroundColor: "#a06b2a" }}
        >
          <Text className="text-center text-white font-extrabold">Back</Text>
        </Pressable>
      </View>
    </View>
  );
}
