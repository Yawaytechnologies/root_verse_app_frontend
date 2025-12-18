import React from "react";
import { Pressable, Text, View } from "react-native";

export default function AquaButton({
  label,
  onPress,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}) {
  const primary =
    "bg-sky-500/15 border-sky-500/25 text-sky-300";
  const secondary =
    "bg-white dark:bg-[#0B1220] border-slate-200 dark:border-white/10 text-slate-800 dark:text-white";

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl border px-4 py-4 ${
        variant === "primary" ? primary : secondary
      }`}
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold">{label}</Text>
        <Text className="text-xs opacity-70">→</Text>
      </View>
    </Pressable>
  );
}
