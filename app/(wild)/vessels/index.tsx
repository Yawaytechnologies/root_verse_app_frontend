import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { vesselsDummy } from "../../../src/data/wild/vessels.dummy";

function VesselCard({
  vesselId,
  vesselName,
  registrationNo,
  homePortName,
  vesselTypeName,
  status,
  onPress,
}: {
  vesselId: string;
  vesselName: string;
  registrationNo: string;
  homePortName: string;
  vesselTypeName: string;
  status: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-slate-200 bg-white p-4 active:opacity-80"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-slate-900">
            {vesselName}
          </Text>
          <Text className="mt-1 text-sm text-slate-600">
            {vesselId} · Reg: {registrationNo}
          </Text>
          <Text className="mt-1 text-sm text-slate-600">
            {vesselTypeName} · Home Port: {homePortName}
          </Text>
        </View>

        <View
          className={
            "px-2 py-1 rounded-full border " +
            (status === "Active"
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50")
          }
        >
          <Text
            className={
              "text-xs font-semibold " +
              (status === "Active" ? "text-emerald-700" : "text-amber-700")
            }
          >
            {status}
          </Text>
        </View>
      </View>

      <Text className="mt-3 text-xs text-slate-500">
        Tap to view vessel + owner details
      </Text>
    </Pressable>
  );
}

export default function VesselsIndex() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return vesselsDummy;
    return vesselsDummy.filter((v) => {
      return (
        v.vesselId.toLowerCase().includes(s) ||
        v.vesselName.toLowerCase().includes(s) ||
        v.registrationNo.toLowerCase().includes(s) ||
        v.homePortName.toLowerCase().includes(s)
      );
    });
  }, [q]);

  return (
    <View className="flex-1 bg-slate-50">
      <View className="p-4">
        <View className="rounded-2xl border border-slate-200 bg-white p-4">
          <Text className="text-lg font-bold text-slate-900">Vessels</Text>
          <Text className="mt-1 text-sm text-slate-600">
            User view only. Admin registers vessels. You can only search and view.
          </Text>

          <View className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search by Vessel ID / Name / Reg No / Port"
              className="text-base text-slate-900"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 20 }}>
        <View className="gap-3">
          {filtered.map((v) => (
            <VesselCard
              key={v.vesselId}
              vesselId={v.vesselId}
              vesselName={v.vesselName}
              registrationNo={v.registrationNo}
              homePortName={v.homePortName}
              vesselTypeName={v.vesselTypeName}
              status={v.status}
              onPress={() => router.push(`/(wild)/vessels/${v.vesselId}`)}
            />
          ))}

          {filtered.length === 0 ? (
            <View className="rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="text-slate-700">No vessels found.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
