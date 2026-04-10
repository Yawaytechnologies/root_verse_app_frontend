import { Stack } from "expo-router";

export default function AquaRegistrationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="farm-details" />
      <Stack.Screen name="pond-details" />
      <Stack.Screen name="review-submit" />
      <Stack.Screen name="success" />
      <Stack.Screen name="capture-farm-gate" />
      <Stack.Screen name="capture-pond-image" />
    </Stack>
  );
}