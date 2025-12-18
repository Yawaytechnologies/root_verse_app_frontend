import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

export default function CreateVessel() {
  const [vesselName, setVesselName] = useState("");
  const [homePort, setHomePort] = useState("");
  const [govRegNo, setGovRegNo] = useState("");

  const save = () => {
    if (!vesselName.trim()) return Alert.alert("Missing", "Vessel name is required");
    // later: call API → create vessel → return saved ID
    Alert.alert("Saved (demo)", `Vessel: ${vesselName}`);
    router.back();
  };

  return (
    <View className="flex-1 bg-slate-50 p-4">
      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-lg font-bold text-slate-900">Create Vessel</Text>
        <Text className="mt-1 text-sm text-slate-600">
          Fields like Govt Reg No, local ID, name, home port, methods, owner details.
        </Text>
      </View>

      <View className="mt-4 gap-3">
        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Vessel Name</Text>
          <TextInput
            value={vesselName}
            onChangeText={setVesselName}
            placeholder="e.g., Tuna Runner"
            className="mt-1 text-base text-slate-900"
          />
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Home Port</Text>
          <TextInput
            value={homePort}
            onChangeText={setHomePort}
            placeholder="e.g., Chennai"
            className="mt-1 text-base text-slate-900"
          />
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Govt Registration No</Text>
          <TextInput
            value={govRegNo}
            onChangeText={setGovRegNo}
            placeholder="e.g., IND-TN-XXXX"
            className="mt-1 text-base text-slate-900"
          />
        </View>

        <Pressable onPress={save} className="rounded-2xl bg-slate-900 p-4 active:opacity-90">
          <Text className="text-center text-white font-semibold">Save Vessel</Text>
        </Pressable>
      </View>
    </View>
  );
}
