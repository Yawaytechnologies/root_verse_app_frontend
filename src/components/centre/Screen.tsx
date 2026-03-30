import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Screen({ children }: { children: React.ReactNode }) {
  return <SafeAreaView className="flex-1 bg-white">{children}</SafeAreaView>;
}