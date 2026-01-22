import { router, Slot, usePathname } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";

import MCBottomBar from "../../src/components/mariculture/dashboard/MCBottomBar";

// ✅ redux
import { fetchMe } from "../../src/store/auth/me.slice";
import { useAppDispatch } from "../../src/store/hooks";

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

  const dispatch = useAppDispatch();

  // ✅ fetch profile once when this sector loads
  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  return (
    <View style={{ flex: 1 }}>
      {/* shows current page (index/units/scan/profile) */}
      <Slot />

      {/* bottom bar stays always */}
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
