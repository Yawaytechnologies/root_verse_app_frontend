import React from "react";
import { View, Pressable, Text } from "react-native";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

function NavItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: any;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center justify-center py-2 active:opacity-80`}
    >
      <Ionicons name={icon} size={22} color={active ? "#2563EB" : "#64748B"} />
      <Text className={`mt-1 text-[11px] font-semibold ${active ? "text-blue-600" : "text-slate-500"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function WildBottomNav() {
  const pathname = usePathname();

  // match your actual routes
  const is = (p: string) => pathname?.includes(p);

  return (
    <View className="border-t border-slate-200 bg-white px-2 pb-2 pt-2">
      <View className="flex-row">
        <NavItem
          label="Home"
          icon={is("/(wild)/dashboard") ? "grid" : "grid-outline"}
          active={is("/(wild)/dashboard")}
          onPress={() => router.push("/(wild)/dashboard")}
        />
        <NavItem
          label="Trips"
          icon={is("/(wild)/trips") ? "boat" : "boat-outline"}
          active={is("/(wild)/trips")}
          onPress={() => router.push("/(wild)/trips")}
        />
        <NavItem
          label="Catch"
          icon={is("/(wild)/catch-logs") ? "fish" : "fish-outline"}
          active={is("/(wild)/catch-logs")}
          onPress={() => router.push("/(wild)/catch-logs")}
        />
        <NavItem
          label="Vessels"
          icon={is("/(wild)/vessels") ? "albums" : "albums-outline"}
          active={is("/(wild)/vessels")}
          onPress={() => router.push("/(wild)/vessels")}
        />
        <NavItem
          label="Owner"
          icon={is("/(wild)/owner") ? "person" : "person-outline"}
          active={is("/(wild)/owner")}
          onPress={() => router.push("/(wild)/owner")}
        />
      </View>
    </View>
  );
}
