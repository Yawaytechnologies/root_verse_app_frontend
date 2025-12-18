import React from "react";
import { Stack } from "expo-router";
import { Pressable, Text } from "react-native";
import { useLanguage } from "../../src/data/wild/lang.store";

function LangButton() {
  const { lang, toggleLang } = useLanguage();
  return (
    <Pressable onPress={toggleLang} className="mr-3 rounded-xl border border-slate-200 bg-white px-3 py-1.5 active:opacity-80">
      <Text className="text-xs font-semibold text-slate-900">{lang === "en" ? "EN" : "TA"}</Text>
    </Pressable>
  );
}

export default function WildLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "left",
        headerShadowVisible: false,
        headerRight: () => <LangButton />,
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: "Wild Capture" }} />
      <Stack.Screen name="scan" options={{ title: "Scan QR" }} />

      <Stack.Screen name="vessels/index" options={{ title: "Vessels" }} />
      <Stack.Screen name="vessels/create" options={{ title: "Create Vessel" }} />
      <Stack.Screen name="vessels/[vesselId]" options={{ title: "Vessel Details" }} />

      <Stack.Screen name="trips/index" options={{ title: "Trips" }} />
      <Stack.Screen name="trips/create" options={{ title: "Create Trip" }} />
      <Stack.Screen name="trips/[tripId]" options={{ title: "Trip Overview" }} />

      <Stack.Screen name="catch-logs/index" options={{ title: "Catch Logs" }} />
      <Stack.Screen name="catch-logs/create" options={{ title: "Create Catch Log" }} />
      <Stack.Screen name="catch-logs/[catchId]" options={{ title: "Catch Log Details" }} />

      <Stack.Screen name="crates/assign" options={{ title: "Assign Crate" }} />
      <Stack.Screen name="trace/[crateId]" options={{ title: "Traceability" }} />
      <Stack.Screen name="trace/[crateId]/landing" options={{ title: "Landing Details" }} />
      <Stack.Screen name="trace/[crateId]/transport" options={{ title: "Transport Details" }} />

      <Stack.Screen name="owner/index" options={{ title: "Owner Details" }} />
    </Stack>
  );
}
