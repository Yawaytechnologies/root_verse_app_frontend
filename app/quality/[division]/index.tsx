import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { View, Text } from "react-native";

import QualityInspectorDashboard, {
  type Division,
  type InspectorInfo,
} from "../../../src/components/quality/QualityInspectorDashboard";

import { useAppSelector } from "../../../src/store/hooks";
import { selectInspector } from "../../../src/store/qualityAuth/qualityAuth.slice";

export default function QualityByDivisionScreen() {
  const params = useLocalSearchParams<{ division?: string }>();
  const qc = useAppSelector(selectInspector);

  const division = useMemo<Division>(() => {
    const raw = params.division;
    const d = (typeof raw === "string" ? raw : "aqua").toLowerCase();

    if (d === "aqua") return "AQUA";
    if (d === "wild") return "WILD";
    if (d === "mariculture" || d === "mari") return "MARICULTURE";
    return "AQUA";
  }, [params.division]);

  const inspectorForUi: InspectorInfo | null = useMemo(() => {
    if (!qc) return null;

    const divisionLabel =
      division === "WILD"
        ? "Wild Capture"
        : division === "AQUA"
        ? "Aquaculture"
        : "Mariculture";

    return {
      id: qc.checker_code,
      name: qc.checker_name,
      state_id: qc.state_id,
      district_id: qc.district_id,
      location_id: qc.location_id,
      state_name: qc.state_name,
      district_name: qc.district_name,
      location_name: qc.location_name,
      divisionLabel,
    };
  }, [qc, division]);

  if (!inspectorForUi) {
    return (
      <View className="flex-1 items-center justify-center bg-[#030712] p-4">
        <Text className="text-base font-extrabold text-white">
          Not logged in
        </Text>
        <Text className="mt-2 text-center text-xs text-gray-400">
          Please log in as a Quality Checker to continue.
        </Text>
      </View>
    );
  }

  return (
    <QualityInspectorDashboard
      division={division}
      inspector={inspectorForUi}
    />
  );
}
