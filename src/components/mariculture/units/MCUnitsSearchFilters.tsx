import React from "react";
import { View, Text, TextInput, Pressable } from "react-native";

export type UnitFilter = "all" | "active" | "maintenance" | "inactive";

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.86 : 1 }]}>
      <View
        style={{
          height: 34,
          paddingHorizontal: 12,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? "rgba(125,211,252,0.14)" : "rgba(255,255,255,0.05)",
          borderWidth: 1,
          borderColor: active ? "rgba(125,211,252,0.22)" : "rgba(255,255,255,0.10)",
        }}
      >
        <Text style={{ color: active ? "rgba(125,211,252,0.98)" : "rgba(226,232,240,0.70)", fontWeight: "900" }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export default function MCUnitsSearchFilters({
  query,
  onQuery,
  filter,
  onFilter,
}: {
  query: string;
  onQuery: (v: string) => void;
  filter: UnitFilter;
  onFilter: (v: UnitFilter) => void;
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <View
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          backgroundColor: "rgba(255,255,255,0.03)",
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <TextInput
          value={query}
          onChangeText={onQuery}
          placeholder="Search Unit ID / Location / Species / Batch"
          placeholderTextColor="rgba(226,232,240,0.45)"
          style={{
            color: "rgba(255,255,255,0.92)",
            fontWeight: "800",
            fontSize: 13,
          }}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <FilterChip label="All" active={filter === "all"} onPress={() => onFilter("all")} />
        <FilterChip label="Active" active={filter === "active"} onPress={() => onFilter("active")} />
        <FilterChip label="Maintenance" active={filter === "maintenance"} onPress={() => onFilter("maintenance")} />
        <FilterChip label="Inactive" active={filter === "inactive"} onPress={() => onFilter("inactive")} />
      </View>
    </View>
  );
}
