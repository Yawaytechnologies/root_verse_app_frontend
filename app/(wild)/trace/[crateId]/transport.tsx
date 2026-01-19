import React, { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useTrace } from "../../../../src/data/wild/trace.store";

export default function TransportForm() {
  const { crateId } = useLocalSearchParams<{ crateId: string }>();
  const trace = useTrace();

  const [vehicleNo, setVehicleNo] = useState("");
  const [fromLoc, setFromLoc] = useState("");
  const [toLoc, setToLoc] = useState("");
  const [dispatchAt, setDispatchAt] = useState("");
  const [arrivalAt, setArrivalAt] = useState("");
  const [receiver, setReceiver] = useState("");

  const save = () => {
    if (!vehicleNo.trim()) return Alert.alert("Missing", "Vehicle No required");

    trace.addEvent({
      crateId: String(crateId),
      stage: "TRANSPORT",
      data: { vehicleNo, fromLoc, toLoc, dispatchAt, arrivalAt, receiver },
      createdBy: "Owner",
    });

    Alert.alert("Saved", `Transport linked to sticker ${String(crateId)}`);
    router.replace(`/(wild)/trace/${String(crateId)}` as const);
  };

  return (
    <View className="flex-1 bg-slate-50 p-4">
      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-lg font-bold text-slate-900">Transport Details</Text>
        <Text className="mt-1 text-sm text-slate-600">Sticker: {String(crateId)}</Text>
      </View>

      <View className="mt-4 gap-3">
        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Vehicle No</Text>
          <TextInput value={vehicleNo} onChangeText={setVehicleNo} placeholder="TN-xx-xxxx" className="mt-1 text-base text-slate-900" />
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">From</Text>
          <TextInput value={fromLoc} onChangeText={setFromLoc} placeholder="Landing point" className="mt-1 text-base text-slate-900" />
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">To</Text>
          <TextInput value={toLoc} onChangeText={setToLoc} placeholder="Processing / Market" className="mt-1 text-base text-slate-900" />
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Dispatch Time</Text>
          <TextInput value={dispatchAt} onChangeText={setDispatchAt} placeholder="YYYY-MM-DD HH:mm" className="mt-1 text-base text-slate-900" />
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Arrival Time</Text>
          <TextInput value={arrivalAt} onChangeText={setArrivalAt} placeholder="YYYY-MM-DD HH:mm" className="mt-1 text-base text-slate-900" />
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Receiver</Text>
          <TextInput value={receiver} onChangeText={setReceiver} placeholder="Receiver name / org" className="mt-1 text-base text-slate-900" />
        </View>

        <Pressable onPress={save} className="rounded-2xl bg-slate-900 p-4 active:opacity-90">
          <Text className="text-center text-white font-semibold">Save Transport</Text>
        </Pressable>
      </View>
    </View>
  );
}
