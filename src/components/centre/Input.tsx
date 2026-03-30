import React from "react";
import { TextInput, View, Text } from "react-native";

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View className="gap-2">
      <Text className="text-slate-700 font-medium">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType || "default"}
        className="border border-slate-200 rounded-2xl px-4 py-3"
      />
    </View>
  );
}