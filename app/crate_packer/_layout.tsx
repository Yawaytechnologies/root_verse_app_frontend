import React from "react";
import { Stack } from "expo-router";

export default function CratePackerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    />
  );
}