import React from "react";
import { View, Text } from "react-native";
import type { QualityInspector } from "@/src/store/qualityAuth/qualityAuth.slice";

type Props = {
  inspector: QualityInspector | null;
  divisionLabel?: string;
};

export default function InspectorBanner({ inspector, divisionLabel }: Props) {
  if (!inspector) {
    return (
      <View className="rounded-2xl border border-[#ead7c8] bg-white p-4">
        <Text className="text-sm font-bold text-black">Inspector</Text>
        <Text className="mt-1 text-xs text-gray-600">
          Not loaded yet (login will set this)
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl border border-[#ead7c8] bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-extrabold text-black">
          {inspector.checker_name}
        </Text>

        {divisionLabel ? (
          <View className="rounded-full bg-[#0B1220] px-3 py-1">
            <Text className="text-[11px] font-bold text-white">
              {divisionLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <Text className="mt-1 text-[12px] text-gray-700">
        ID: <Text className="font-bold">{inspector.checker_code}</Text>
      </Text>

      <Text className="mt-1 text-[12px] text-gray-700">
        {inspector.district_name}, {inspector.state_name}
      </Text>

      <Text className="mt-1 text-[11px] text-gray-500">
        {inspector.checker_phone}
      </Text>
    </View>
  );
}
