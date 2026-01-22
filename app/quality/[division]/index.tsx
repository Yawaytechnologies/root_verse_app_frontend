import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Alert, View, Text } from "react-native";

import QualityInspectorDashboard from "../../../src/components/quality/QualityInspectorDashboard";
import {
  QUALITY_DUMMY,
  type Division,
  type InspectorInfo, // ✅ this is the type dashboard expects
} from "../../../src/data/quality/quality.dummy";

import { useAppSelector } from "../../../src/store/hooks";
import { selectInspector } from "../../../src/store/qualityAuth/qualityAuth.slice";

export default function QualityByDivisionScreen() {
  const params = useLocalSearchParams<{ division?: string }>();
  const qc = useAppSelector(selectInspector); // QualityInspector | null

  const division = useMemo<Division>(() => {
    const raw = params.division;
    const d = (typeof raw === "string" ? raw : "aqua").toLowerCase();

    if (d === "aqua") return "AQUA";
    if (d === "wild") return "WILD";
    if (d === "mariculture" || d === "mari") return "MARICULTURE";
    return "AQUA";
  }, [params.division]);

  const data = QUALITY_DUMMY[division];

  // ✅ Convert QC (redux) -> InspectorInfo (dashboard type)
  const inspectorForUi: InspectorInfo = useMemo(() => {
    if (!qc) return data.inspector;

    const divisionLabel =
      division === "WILD"
        ? "Wild Capture"
        : division === "AQUA"
        ? "Aquaculture"
        : "Mariculture";

    return {
      id: qc.checker_code, // QC-000003
      name: qc.checker_name, // Jana
      zone: `${qc.district_name}, ${qc.state_name}`, // Nagapatinam, TamilNadu
      divisionLabel,
    };
  }, [qc, data.inspector, division]);

  // ✅ optional safety (won't really hit because dummy exists)
  if (!inspectorForUi) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f7f5f2] p-4">
        <Text className="text-base font-extrabold text-[#0B1220]">
          Inspector not available
        </Text>
        <Text className="mt-2 text-center text-xs text-gray-600">
          Set inspector in redux (temporary set in app/quality/_layout.tsx) or
          complete login.
        </Text>
      </View>
    );
  }

  return (
    <QualityInspectorDashboard
      division={division}
      inspector={inspectorForUi} // ✅ now matches InspectorInfo type
      totalInspections={data.completed.length}
      completed={data.completed}
      onViewInspection={(id) => Alert.alert("View Inspection", id)}
    />
  );
}
