import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";

function detectType(code: string) {
  const c = code.toUpperCase();
  if (c.includes("CRATE")) return "Crate";
  if (c.includes("BATCH") || c.includes("HB") || c.includes("MB")) return "Batch";
  if (c.includes("POND")) return "Pond";
  if (c.startsWith("RV-")) return "RootVerse Code";
  return "Unknown";
}

export default function TraceabilityDetails() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const decoded = useMemo(() => decodeURIComponent(String(code ?? "")), [code]);
  const type = useMemo(() => detectType(decoded), [decoded]);

  // Dummy timeline (replace later with API)
  const timeline = [
    { t: "08:45", title: "Registered", desc: "Entity created in registry" },
    { t: "10:10", title: "Operation Logged", desc: "Feed/Health/Water entry recorded" },
    { t: "13:30", title: "Verified", desc: "Supervisor verification completed" },
    { t: "17:05", title: "Synced", desc: "Data synced to backend" },
  ];

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16 }}>
      <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <Text className="text-[11px] uppercase tracking-wide text-slate-500">
          Traceability
        </Text>
        <Text className="mt-1 text-lg font-bold text-slate-900">{decoded}</Text>
        <Text className="mt-1 text-sm text-slate-600">
          Type: <Text className="font-semibold text-slate-800">{type}</Text>
        </Text>
      </View>

      <Text className="mt-5 text-base font-semibold text-slate-900">Timeline</Text>

      <View className="mt-3 gap-3">
        {timeline.map((item, idx) => (
          <View key={idx} className="rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-slate-900">{item.title}</Text>
              <Text className="text-xs text-slate-500">{item.t}</Text>
            </View>
            <Text className="mt-1 text-sm text-slate-600">{item.desc}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
