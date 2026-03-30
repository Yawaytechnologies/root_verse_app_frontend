import React, { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../src/components/centre/Screen";
import { useTransport } from "../../src/context/transport/TransportContext";

export default function TempLogScreen() {
  const { crateId } = useLocalSearchParams<{ crateId?: string }>();
  const { getCrateById, logTemperature } = useTransport();

  const crate = useMemo(() => {
    return crateId ? getCrateById(crateId) : undefined;
  }, [crateId, getCrateById]);

  const [value, setValue] = useState("");

  const handleSave = () => {
    if (!crateId) {
      Alert.alert("Error", "Crate ID is missing.");
      return;
    }

    if (!value.trim()) {
      Alert.alert("Validation", "Temperature value is required.");
      return;
    }

    const result = logTemperature(crateId, value);

    if (!result.ok) {
      Alert.alert("Failed", result.message);
      return;
    }

    Alert.alert("Success", result.message, [
      {
        text: "Go Back",
        onPress: () => router.push("/(transport)/in-transit"),
      },
    ]);
  };

  return (
    <Screen>
      <View className="flex-1 bg-[#031225] px-5 pt-5">
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-[24px] font-extrabold text-white">
            Transit Temperature
          </Text>

          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back-circle-outline" size={30} color="#fff" />
          </Pressable>
        </View>

        <View className="rounded-[24px] border border-slate-800 bg-[#0b172b] p-4">
          <Text className="text-[18px] font-extrabold text-white">
            {crate?.id || "Unknown Crate"}
          </Text>

          <Text className="mt-2 text-[13px] text-slate-400">
            {crate
              ? `${crate.collectionCentre} → ${crate.destination}`
              : "Crate details unavailable"}
          </Text>

          <Text className="mt-6 mb-2 text-[13px] font-semibold text-slate-300">
            Temperature Value
          </Text>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Ex: 4°C"
            placeholderTextColor="#64748b"
            className="rounded-[18px] border border-slate-700 bg-[#102544] px-4 py-4 text-white"
          />

          <Text className="mt-4 text-[13px] text-slate-400">
            This will be stored with UTC timestamp and transport operator ID.
          </Text>

          <Pressable
            onPress={handleSave}
            className="mt-5 items-center rounded-[22px] bg-[#18488d] py-4"
          >
            <Text className="text-[16px] font-extrabold text-white">
              Save Temperature Log
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}