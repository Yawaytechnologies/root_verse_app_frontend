import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-semibold">Home Screen ✅</Text>

      <Pressable
        onPress={() => router.replace("/(auth)/login")}
        className="mt-4 px-4 py-3 rounded-xl bg-slate-900"
      >
        <Text className="text-white">Logout</Text>
      </Pressable>
    </View>
  );
}
