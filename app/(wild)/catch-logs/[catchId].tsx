import React from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useAppSelector } from "../../../src/store/hooks";

export default function CatchDetails() {
  const { crateId } = useLocalSearchParams<{ crateId: string }>();
  const lastSubmit = useAppSelector((s: any) => s.catchLog?.lastSubmit);

  return (
    <View className="flex-1 bg-[#fbf6f1] p-4">
      <View className="rounded-2xl border border-[#ead7c8] bg-white p-4">
        <Text className="text-lg font-bold text-[#2b2b2b]">Details</Text>

        <Text className="mt-2 text-xs text-[#7a6f66]">Crate ID</Text>
        <Text className="mt-1 text-base font-extrabold text-[#2b2b2b]">{crateId}</Text>

        {lastSubmit ? (
          <>
            <Text className="mt-3 text-xs text-[#7a6f66]">Last Submit</Text>
            <Text className="mt-1 text-xs text-[#2b2b2b]">
              {JSON.stringify(lastSubmit, null, 2)}
            </Text>
          </>
        ) : null}

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
