import React from "react";
import { View, Text } from "react-native";
import WildBottomNav from "../../../src/components/WildBottomNav";

export default function OwnerPage() {
  return (
    <View className="flex-1 bg-slate-50">
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-lg font-bold text-slate-900">Owner Details</Text>
        <Text className="mt-2 text-sm text-slate-600">Show full owner info here.</Text>
      </View>
      <WildBottomNav />
    </View>
  );
}
