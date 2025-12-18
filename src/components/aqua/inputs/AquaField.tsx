import React from "react";
import { Text, TextInput, View } from "react-native";

export default function AquaField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  right,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <View>
      <Text className="mb-1 text-xs font-semibold text-slate-600 dark:text-white/70">
        {label}
      </Text>

      <View className="flex-row items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220] px-4 py-3">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          multiline={multiline}
          className={`flex-1 text-[14px] text-slate-900 dark:text-white ${
            multiline ? "min-h-[90px]" : ""
          }`}
        />
        {right}
      </View>
    </View>
  );
}
