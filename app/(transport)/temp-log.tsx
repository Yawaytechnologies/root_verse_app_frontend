import React, { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";

import Screen from "../../src/components/centre/Screen";
import {
  selectInTransitItems,
  fetchInTransitCrates,
  logCrateTemperature,
  selectTemperatureLogging,
} from "../../src/services/transport/inTransitSlice";
import { selectTransportSelectedDate } from "../../src/services/transport/transportSlice";

export default function TempLogScreen() {
  const dispatch = useDispatch<any>();
  const { crateId } = useLocalSearchParams<{ crateId?: string }>();

  const inTransitItems = useSelector(selectInTransitItems);
  const selectedDate = useSelector(selectTransportSelectedDate);
  const temperatureLogging = useSelector(selectTemperatureLogging);

  const [value, setValue] = useState("");

  const crate = useMemo(() => {
    return inTransitItems.find(
      (item: any) =>
        String(item?.id) === String(crateId) ||
        String(item?.crateId) === String(crateId)
    );
  }, [crateId, inTransitItems]);

  const handleSave = async () => {
    const finalCrateId = String(
      crate?.crateId || crate?.id || crateId || ""
    ).trim();

    const finalTemperature = String(value || "").trim();

    if (!finalCrateId) {
      Alert.alert("Error", "Crate ID is missing.");
      return;
    }

    if (!finalTemperature) {
      Alert.alert("Validation", "Temperature value is required.");
      return;
    }

    try {
      await dispatch(
        logCrateTemperature({
          crateId: finalCrateId,
          value: finalTemperature,
        })
      ).unwrap();

      await dispatch(
        fetchInTransitCrates(selectedDate ? { date: selectedDate } : undefined)
      ).unwrap();

      Alert.alert("Success", "Temperature logged successfully.", [
        {
          text: "Go Back",
          onPress: () => router.replace("/(transport)/in-transit"),
        },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Failed",
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to log temperature"
      );
    }
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
            {crate?.crateQr ||
              crate?.code ||
              crate?.id ||
              crateId ||
              "Unknown Crate"}
          </Text>

          <Text className="mt-2 text-[13px] text-slate-400">
            {crate
              ? `${crate.collectionCentre || "-"} → ${crate.destination || "-"}`
              : "Crate details unavailable"}
          </Text>

          <Text className="mb-2 mt-6 text-[13px] font-semibold text-slate-300">
            Temperature Value
          </Text>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Ex: 0.5"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
            editable={!temperatureLogging}
            className="rounded-[18px] border border-slate-700 bg-[#102544] px-4 py-4 text-white"
          />

          <Text className="mt-4 text-[13px] text-slate-400">
            This will be stored with UTC timestamp and transport operator ID.
          </Text>

          <Pressable
            onPress={handleSave}
            disabled={temperatureLogging}
            className={`mt-5 items-center rounded-[22px] py-4 ${
              temperatureLogging ? "bg-[#335b92]" : "bg-[#18488d]"
            }`}
          >
            <Text className="text-[16px] font-extrabold text-white">
              {temperatureLogging ? "Saving..." : "Save Temperature Log"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}