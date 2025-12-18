
import { router, Slot, usePathname } from "expo-router";
import React from "react";
import { View } from "react-native";
import MCBottomBar from "../../src/components/mariculture/dashboard/MCBottomBar";

type TabKey = "dashboard" | "units" | "scan" | "profile";

function getActiveTab(pathname: string): TabKey {
  if (pathname.includes("/mariculture/units")) return "units";
  if (pathname.includes("/mariculture/scan")) return "scan";
  if (pathname.includes("/mariculture/profile")) return "profile";
  return "dashboard";
}

export default function MaricultureLayout() {
  const pathname = usePathname();
  const active = getActiveTab(pathname);

  return (
    <View style={{ flex: 1 }}>
      {/* shows current page (index/units/scan/profile) */}
      <Slot />

      {/* bottom header stays always */}
      <MCBottomBar
        active={active}
        onTab={(key) => {
          if (key === "dashboard") router.replace("/mariculture");
          if (key === "units") router.replace("/mariculture/units");
          if (key === "scan") router.replace("/mariculture/scan");
          if (key === "profile") router.replace("/mariculture/profile");
        }}
      />
    </View>
  );
}
