import React from "react";
import { View, Text } from "react-native";

function Pill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 18,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
      }}
    >
      <Text style={{ color: "rgba(226,232,240,0.62)", fontSize: 11, fontWeight: "800" }}>
        {label}
      </Text>
      <Text style={{ marginTop: 4, color, fontSize: 18, fontWeight: "900" }}>
        {value}
      </Text>
    </View>
  );
}

export default function MCUnitsKpiStrip({
  active,
  maintenance,
  inactive,
}: {
  active: number;
  maintenance: number;
  inactive: number;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
      <Pill label="Active" value={active} color="rgba(134,239,172,0.95)" />
      <Pill label="Maintenance" value={maintenance} color="rgba(125,211,252,0.95)" />
      <Pill label="Inactive" value={inactive} color="rgba(226,232,240,0.85)" />
    </View>
  );
}
