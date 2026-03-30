import React, { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../src/components/centre/Screen";
import { useTransport } from "../../src/context/transport/TransportContext";

type BannerType = "success" | "error" | "info";

export default function TransportScanScreen() {
  const { assignedCrates, allScheduledNotMine, scanCrate } = useTransport();

  const [qrValue, setQrValue] = useState("");
  const [bannerType, setBannerType] = useState<BannerType>("info");
  const [bannerText, setBannerText] = useState(
    "Scan crate QR to verify transport assignment."
  );

  const handleScan = (crateId: string) => {
    const result = scanCrate(crateId);

    setBannerType(result.ok ? "success" : "error");
    setBannerText(result.message);

    if (result.ok) {
      Alert.alert("Success", result.message, [
        {
          text: "Go to In Transit",
          onPress: () => router.push("/(transport)/in-transit"),
        },
        { text: "OK" },
      ]);
    } else {
      Alert.alert("Scan Failed", result.message);
    }
  };

  return (
    <Screen>
      <View className="flex-1 bg-[#031225] px-5 pt-5">
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-[24px] font-extrabold text-white">
            Transport Scan
          </Text>

          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back-circle-outline" size={30} color="#fff" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="rounded-[28px] border border-slate-800 bg-[#0b172b] p-4">
            <View
              className={`rounded-[18px] px-4 py-3 ${
                bannerType === "success"
                  ? "bg-[#123d31]"
                  : bannerType === "error"
                  ? "bg-[#402229]"
                  : "bg-[#102544]"
              }`}
            >
              <Text
                className={`text-[14px] font-bold ${
                  bannerType === "success"
                    ? "text-[#6ee7b7]"
                    : bannerType === "error"
                    ? "text-[#fda4af]"
                    : "text-slate-200"
                }`}
              >
                {bannerText}
              </Text>
            </View>

            <View className="mt-5 items-center justify-center rounded-[24px] border-2 border-dashed border-[#1f86ff] p-8">
              <Ionicons name="scan" size={56} color="#1f86ff" />
              <Text className="mt-4 text-[18px] font-bold text-slate-300">
                Align QR inside the scan box
              </Text>
              <Text className="mt-2 text-center text-[13px] text-slate-500">
                This screen uses dummy buttons and manual QR text for now
              </Text>
            </View>

            <Text className="mt-6 mb-2 text-[15px] font-extrabold text-white">
              Manual QR Value
            </Text>

            <TextInput
              value={qrValue}
              onChangeText={setQrValue}
              placeholder="Enter crate QR ID"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              className="rounded-[18px] border border-slate-700 bg-[#102544] px-4 py-4 text-white"
            />

            <Pressable
              onPress={() => handleScan(qrValue)}
              className="mt-4 items-center rounded-[22px] bg-[#18488d] py-4"
            >
              <Text className="text-[16px] font-extrabold text-white">
                Verify and Move to Transit
              </Text>
            </Pressable>

            <Text className="mt-6 mb-3 text-[15px] font-extrabold text-white">
              Demo Valid Assigned QR
            </Text>

            <View className="gap-3">
              {assignedCrates.length === 0 ? (
                <View className="rounded-[18px] bg-[#102544] px-4 py-3">
                  <Text className="text-[13px] text-slate-400">
                    No valid assigned crates available for scan.
                  </Text>
                </View>
              ) : (
                assignedCrates.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleScan(item.id)}
                    className="items-center rounded-[20px] bg-[#18488d] py-4"
                  >
                    <Text className="text-[15px] font-extrabold text-white">
                      Scan {item.id}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>

            <Text className="mt-6 mb-3 text-[15px] font-extrabold text-white">
              Demo Invalid / Not Assigned To Me
            </Text>

            <View className="gap-3">
              {allScheduledNotMine.slice(0, 2).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleScan(item.id)}
                  className="items-center rounded-[20px] bg-[#7f1d1d] py-4"
                >
                  <Text className="text-[15px] font-extrabold text-white">
                    Scan {item.id}
                  </Text>
                </Pressable>
              ))}

              <Pressable
                onPress={() => handleScan("RV-CRATE-UNKNOWN")}
                className="items-center rounded-[20px] bg-[#3f3f46] py-4"
              >
                <Text className="text-[15px] font-extrabold text-white">
                  Scan Unknown QR
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}