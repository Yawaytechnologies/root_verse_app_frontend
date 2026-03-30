import React from "react";
import { Pressable, Text, ActivityIndicator } from "react-native";

export default function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={[
        "rounded-2xl px-4 py-3 items-center",
        disabled || loading ? "bg-slate-300" : "bg-blue-600",
      ].join(" ")}
    >
      {loading ? <ActivityIndicator /> : <Text className="text-white font-semibold">{title}</Text>}
    </Pressable>
  );
}