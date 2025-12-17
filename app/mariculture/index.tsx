import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StatusBar,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MCBottomBar from "@/src/mariculture/components/dashboard/MCBottomBar";
import MCHeader from "@/src/mariculture/components/dashboard/MCHeader";
import MCKpiGrid from "@/src/mariculture/components/dashboard/MCKpiGrid";
import MCQuickActions from "@/src/mariculture/components/dashboard/MCQuickActions";
import MCUnitsList from "@/src/mariculture/components/dashboard/MCUitsList";

const { width: SCREEN_W } = Dimensions.get("window");

// A simple “content frame” so nothing ever clips horizontally.
// On phones: full width. On larger screens: capped width + centered.
const CONTENT_MAX_W = 520;
const H_PADDING = 18;

type TabKey = "dashboard" | "units" | "scan" | "profile";

export default function MaricultureIndex() {
  const [refreshing, setRefreshing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabKey>("dashboard");
  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  const farm = {
    marineFarmId: "RV-MF-RA-000312",
    farmCode: "MF-RA-0312",
    groupName: "Coastal Seaweed SHG",
    leaderName: "Ravi Kumar",
    mobile: "+91 98765 43210",
    villageOrLanding: "Rameswaram Landing Centre",
    gpsPolygons: "Polygon saved",
    species: "Kappaphycus alvarezii",
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

  // keep things inside safe bounds always
  const frameW = Math.min(SCREEN_W - H_PADDING * 2, CONTENT_MAX_W);

  return (
    <View style={{ flex: 1, backgroundColor: "#000", overflow: "hidden" }}>
      <StatusBar barStyle="light-content" />

      {/* Background */}
      <LinearGradient
        colors={[
          "rgba(14,165,233,0.26)",
          "rgba(0,0,0,0.92)",
          "rgba(0,0,0,0.98)",
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical
          contentContainerStyle={{
            alignItems: "center", // ✅ centers the frame
            paddingTop: 28, // ✅ pushes content a bit down (premium breathing space)
            paddingBottom: 140, // ✅ space for bottom bar
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* CONTENT FRAME: prevents right-side clipping */}
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

            {/* Farm card */}
            {/* <View style={{ marginTop: 18 }}>
              <MCFarmCard farm={farm} />
            </View> */}

            {/* Units list */}
            <View style={{ marginTop: 18 }}>
              <MCUnitsList units={units} />
            </View>

            {/* extra breathing room */}
            <View style={{ height: 16 }} />
          </View>
        </ScrollView>

        <MCBottomBar
          active={activeTab}
          onTab={(k) => {
            setActiveTab(k);
            // later: router.push("/mariculture/units") etc.
          }}
        />
      </SafeAreaView>
    </View>
  );
}
