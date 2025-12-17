import React from "react";
import { View, Text } from "react-native";
import { GlassCard } from "./MCShell";

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <GlassCard radius={20} pad={14}>
      <Text className="text-slate-300 text-[11px]">{label}</Text>
      <Text className="text-white text-[20px] mt-2" style={{ fontWeight: "900" }}>
        {value}
      </Text>
      <View className="mt-3 h-[1px] bg-white/10" />
      <Text className="text-slate-400 text-[10px] mt-2">
        Updated just now
      </Text>
    </GlassCard>
  );
}

export default function MCKpiRow({
  kpis,
}: {
  kpis: { activeUnits: number; harvestsThisMonth: number; cratesAssignedToday: number };
}) {
  return (
    <View className="flex-row gap-3">
      <View className="flex-1">
        <Kpi label="Active Units" value={kpis.activeUnits} />
      </View>
      <View className="flex-1">
        <Kpi label="Harvests (Month)" value={kpis.harvestsThisMonth} />
      </View>
      <View className="flex-1">
        <Kpi label="Crates Today" value={kpis.cratesAssignedToday} />
      </View>
    </View>
  );
}
