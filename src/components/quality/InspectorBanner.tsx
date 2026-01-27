// src/components/quality/InspectorBanner.tsx
import React from "react";
import { View, Text } from "react-native";
import type { Inspector } from "../../store/qualityAuth/qualityAuth.slice";

type Props = {
  inspector: Inspector | null;
  divisionLabel?: string;
};

export default function InspectorBanner({ inspector, divisionLabel }: Props) {
  if (!inspector) return null;

  const name = inspector.checker_name || "Inspector";
  const code = inspector.checker_code || "";
  const phone = inspector.checker_phone || "";
  const email = inspector.checker_email || "";

  const stateText =
    inspector.state_name || (inspector.state_id ? String(inspector.state_id) : "");
  const districtText =
    inspector.district_name ||
    (inspector.district_id ? String(inspector.district_id) : "");

  return (
    <View className="mb-3 rounded-2xl border border-[#ead7c8] bg-white px-4 py-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-[16px] font-semibold text-[#1f2937]">
          {name}
        </Text>

        {divisionLabel ? (
          <View className="rounded-full border border-[#ead7c8] bg-[#fff7ed] px-3 py-1">
            <Text className="text-[12px] font-semibold text-[#9a3412]">
              {divisionLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-2">
        {!!code && (
          <Text className="text-[13px] text-[#6b7280]">
            Code: <Text className="font-semibold text-[#374151]">{code}</Text>
          </Text>
        )}

        {!!phone && (
          <Text className="mt-1 text-[13px] text-[#6b7280]">
            Phone: <Text className="font-semibold text-[#374151]">{phone}</Text>
          </Text>
        )}

        {!!email && (
          <Text className="mt-1 text-[13px] text-[#6b7280]">
            Email: <Text className="font-semibold text-[#374151]">{email}</Text>
          </Text>
        )}

        {!!stateText && (
          <Text className="mt-1 text-[13px] text-[#6b7280]">
            State: <Text className="font-semibold text-[#374151]">{stateText}</Text>
          </Text>
        )}

        {!!districtText && (
          <Text className="mt-1 text-[13px] text-[#6b7280]">
            District:{" "}
            <Text className="font-semibold text-[#374151]">{districtText}</Text>
          </Text>
        )}
      </View>
    </View>
  );
}
