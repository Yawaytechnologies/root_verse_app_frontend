import React from "react";
import { Stack } from "expo-router";

export default function WildLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "left",
        headerShadowVisible: false,

        // ✅ REMOVE header language toggle
        headerRight: undefined,
      }}
    >
      {/* ✅ Correct name for app/(wild)/index.tsx */}
      <Stack.Screen name="index" options={{ title: "Wild Capture" }} />

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

      {/* ✅ FIX: disable stack header ONLY for this screen so your custom header shows */}
      <Stack.Screen
        name="catch-logs/details"
        options={{
          headerShown: false, // 🔥 IMPORTANT
        }}
      />

      <Stack.Screen name="crates/assign" options={{ title: "Assign Crate" }} />
      <Stack.Screen name="trace/[crateId]" options={{ title: "Traceability" }} />
      <Stack.Screen name="trace/[crateId]/landing" options={{ title: "Landing Details" }} />
      <Stack.Screen name="trace/[crateId]/transport" options={{ title: "Transport Details" }} />

      <Stack.Screen name="owner/index" options={{ title: "Owner Details" }} />
    </Stack>
  );
}
