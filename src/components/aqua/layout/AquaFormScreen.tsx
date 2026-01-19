import React from "react";
import { ScrollView, Text, View } from "react-native";

export default function AquaFormScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]"
      contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-xl font-bold text-slate-900 dark:text-white">
        {title}
      </Text>

      {!!subtitle && (
        <Text className="mt-1 text-sm text-slate-600 dark:text-white/70">
          {subtitle}
        </Text>
      )}

      <View className="mt-4 gap-4">{children}</View>
    </ScrollView>
  );
}
