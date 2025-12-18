import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type UnitStatus = "Active" | "Maintenance" | "Inactive";

export default function MCStatusPill({ status }: { status: UnitStatus }) {
  const map = {
    Active: {
      bg: "rgba(34,197,94,0.16)",
      bd: "rgba(22,163,74,0.70)",
      tx: "#bbf7d0",
      icon: "checkmark-circle-outline",
    },
    Maintenance: {
      bg: "rgba(56,189,248,0.18)",
      bd: "rgba(56,189,248,0.65)",
      tx: "#e0f2fe",
      icon: "time-outline",
    },
    Inactive: {
      bg: "rgba(15,23,42,0.70)",
      bd: "rgba(148,163,184,0.65)",
      tx: "#e5e7eb",
      icon: "pause-circle-outline",
    },
  }[status];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: map.bg,
        borderWidth: 1,
        borderColor: map.bd,
      }}
    >
      <Ionicons name={map.icon as any} size={14} color={map.tx} />
      <Text style={{ marginLeft: 5, color: map.tx, fontWeight: "900", fontSize: 11 }}>
        {status}
      </Text>
    </View>
  );
}
