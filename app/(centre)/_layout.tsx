import React from "react";
import { Stack } from "expo-router";

export default function CentreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" options={{ title: "Centre" }} />
      <Stack.Screen name="receive" options={{ title: "Receive Crate" }} />
      <Stack.Screen name="assign" options={{ title: "Schedule Dispatch" }} />
      <Stack.Screen name="temp-log" options={{ title: "Centre Temp Log" }} />
    </Stack>
  );
}