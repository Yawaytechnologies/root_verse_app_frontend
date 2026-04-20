import React from "react";
import { Stack } from "expo-router";
import { TransportProvider } from "../../src/context/transport/TransportContext";

export default function TransportLayout() {
  return (
    <TransportProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </TransportProvider>
  );
}