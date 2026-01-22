import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

import { useAppSelector } from "../../src/store/hooks";
import { selectInspector } from "../../src/store/qualityAuth/qualityAuth.slice";
import InspectorBanner from "../../src/components/quality/InspectorBanner";

const Card = ({ title, onPress }: { title: string; onPress: () => void }) => {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-[#ead7c8] bg-white p-5 active:opacity-80"
    >
      <Text className="text-base font-extrabold text-[#0B1220]">{title}</Text>
      <Text className="mt-1 text-xs text-gray-600">Open {title} dashboard</Text>
    </Pressable>
  );
};

export default function QualityHomeScreen() {
  const inspector = useAppSelector(selectInspector);

  return (
    <View className="flex-1 bg-[#f7f5f2] p-4">
      <InspectorBanner inspector={inspector} divisionLabel="Quality" />

      <Text className="mt-5 mb-3 text-sm font-extrabold text-[#0B1220]">
        Choose Division
      </Text>

      <View className="gap-3">
        <Card title="Wild" onPress={() => router.push("/quality/wild")} />
        <Card title="Aquaculture" onPress={() => router.push("/quality/aqua")} />
        <Card title="Mariculture" onPress={() => router.push("/quality/mariculture")} />
      </View>
    </View>
  );
}
