import React from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StatusBar,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MCBottomBar from "@/src/components/mariculture/dashboard/MCBottomBar";
import MCHeader from "@/src/components/mariculture/dashboard/MCHeader";
import MCKpiGrid from "@/src/components/mariculture/dashboard/MCKpiGrid";
import MCQuickActions from "@/src/components/mariculture/dashboard/MCQuickActions";
import MCUnitsList from "@/src/components/mariculture/dashboard/MCUitsList";

// ✅ use theme-aware shell
import { MCShell } from "@/src/components/mariculture/dashboard/MCShell";
import { useIsDarkTheme } from "@/src/store/useIsDarkTheme";

const { width: SCREEN_W } = Dimensions.get("window");

// Frame
const CONTENT_MAX_W = 520;
const H_PADDING = 18;

type TabKey = "dashboard" | "units" | "scan" | "profile";

export default function MaricultureIndex() {
  const isDark = useIsDarkTheme();

  const [refreshing, setRefreshing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabKey>("dashboard");

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  const units = [
    {
      unitId: "RAFT-01",
      unitType: "Raft",
      species: "Kappaphycus alvarezii",
      location: "9.2871, 79.3123",
      status: "Active" as const,
    },
    {
      unitId: "RAFT-02",
      unitType: "Raft",
      species: "Kappaphycus alvarezii",
      location: "9.2899, 79.3052",
      status: "Maintenance" as const,
    },
  ];

  const kpis = {
    activeUnits: 2,
    harvestsThisMonth: 1,
    cratesAssignedToday: 4,
    alerts: 0,
  };

  const frameW = Math.min(SCREEN_W - H_PADDING * 2, CONTENT_MAX_W);

  return (
    <MCShell>
      {/* ✅ status bar follows theme */}
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical
          contentContainerStyle={{
            alignItems: "center",
            paddingTop: 28,
            paddingBottom: 140,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* CONTENT FRAME */}
          <View style={{ width: frameW }}>
            {/* Header */}
            <MCHeader
              title="Mariculture"
              subtitle="Seaweed traceability • Marine Farm → Cultivation Unit"
            />

            {/* KPI Grid */}
            <View style={{ marginTop: 16 }}>
              <MCKpiGrid kpis={kpis} />
            </View>

            {/* Quick Actions */}
            <View style={{ marginTop: 18 }}>
              <MCQuickActions />
            </View>

            {/* Units list */}
            <View style={{ marginTop: 18 }}>
              <MCUnitsList units={units} />
            </View>

            <View style={{ height: 16 }} />
          </View>
        </ScrollView>

        <MCBottomBar
          active={activeTab}
          onTab={(k) => {
            setActiveTab(k);
            // later: router.push(...)
          }}
        />
      </SafeAreaView>
    </MCShell>
  );
}
