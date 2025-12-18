import React, { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useTrace } from "../../../../src/data/wild/trace.store";

export default function LandingForm() {
  const { crateId } = useLocalSearchParams<{ crateId: string }>();
  const trace = useTrace();

  const [landingPort, setLandingPort] = useState("");
  const [landedAt, setLandedAt] = useState("");
  const [landedWeight, setLandedWeight] = useState("");
  const [buyer, setBuyer] = useState("");

  const save = () => {
    if (!landingPort.trim()) return Alert.alert("Missing", "Landing port required");

    trace.addEvent({
      crateId: String(crateId),
      stage: "LANDING",
      data: { landingPort, landedAt, landedWeight, buyer },
      createdBy: "Owner",
    });

    Alert.alert("Saved", `Landing linked to sticker ${String(crateId)}`);
    router.replace(`/(wild)/trace/${String(crateId)}` as const);
  };

  return (
    <View className="flex-1 bg-slate-50 p-4">
      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-lg font-bold text-slate-900">Landing Details</Text>
        <Text className="mt-1 text-sm text-slate-600">Sticker: {String(crateId)}</Text>
      </View>

      <View className="mt-4 gap-3">
        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Landing Port</Text>
          <TextInput value={landingPort} onChangeText={setLandingPort} placeholder="e.g., Chennai" className="mt-1 text-base text-slate-900" />
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Landed At</Text>
          <TextInput value={landedAt} onChangeText={setLandedAt} placeholder="YYYY-MM-DD HH:mm" className="mt-1 text-base text-slate-900" />
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Total Landed Weight (kg)</Text>
          <TextInput value={landedWeight} onChangeText={setLandedWeight} keyboardType="numeric" placeholder="e.g., 260" className="mt-1 text-base text-slate-900" />
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Buyer / Auction</Text>
          <TextInput value={buyer} onChangeText={setBuyer} placeholder="Optional" className="mt-1 text-base text-slate-900" />
        </View>

        <Pressable onPress={save} className="rounded-2xl bg-slate-900 p-4 active:opacity-90">
          <Text className="text-center text-white font-semibold">Save Landing</Text>
        </Pressable>
      </View>
    </View>
  );
}
