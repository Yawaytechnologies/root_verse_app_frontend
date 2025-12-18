import React, { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import MCBackground from "../../src/components/mariculture/common/MCBackground";
import MCSectionTitle from "../../src/components/mariculture/common/MCSectionTitle";
import MCNeedsAttention from "../../units/MCNeedsAttention";
import MCUnitCard, { UnitItem } from "../../units/MCUnitCard";
import MCUnitsHeader from "../../units/MCUnitsHeader";
import MCUnitsKpiStrip from "../../units/MCUnitsKpiStrip";
import MCUnitsSearchFilters, {
    UnitFilter,
} from "../../units/MCUnitsSearchFilters";

const UNITS: UnitItem[] = [
  {
    unitId: "MC-UNIT-001",
    unitType: "Raft",
    species: "Kappaphycus",
    location: "Nagapattinam • Zone 1",
    status: "Active",
    lastLog: "2h ago",
  },
  {
    unitId: "MC-UNIT-004",
    unitType: "Longline",
    species: "Gracilaria",
    location: "Ramanathapuram • Zone 2",
    status: "Maintenance",
    maintenanceReason: "Biofouling cleanup",
  },
  {
    unitId: "MC-UNIT-008",
    unitType: "Raft",
    species: "Kappaphycus",
    location: "Thoothukudi • Zone 3",
    status: "Active",
    alertsCount: 2,
  },
  {
    unitId: "MC-UNIT-011",
    unitType: "Cage",
    species: "Seaweed Mix",
    location: "Nagapattinam • Zone 2",
    status: "Inactive",
  },
];

export default function UnitsScreen() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UnitFilter>("all");

  const stats = useMemo(() => {
    const active = UNITS.filter((u) => u.status === "Active").length;
    const maintenance = UNITS.filter((u) => u.status === "Maintenance").length;
    const inactive = UNITS.filter((u) => u.status === "Inactive").length;
    return { active, maintenance, inactive };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return UNITS.filter((u) => {
      const matchesQuery =
        !q ||
        u.unitId.toLowerCase().includes(q) ||
        u.location.toLowerCase().includes(q) ||
        u.species.toLowerCase().includes(q) ||
        u.unitType.toLowerCase().includes(q);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && u.status === "Active") ||
        (filter === "maintenance" && u.status === "Maintenance") ||
        (filter === "inactive" && u.status === "Inactive");

      return matchesQuery && matchesFilter;
    });
  }, [query, filter]);

  const needsAttention = useMemo(() => {
    return UNITS.filter(
      (u) => u.status === "Maintenance" || (u.alertsCount ?? 0) > 0
    );
  }, []);

  return (
    <MCBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <View style={{ paddingHorizontal: 18 }}>
          <MCUnitsHeader />

          {/* light entrance like Scan page */}
          <Animated.View entering={FadeInUp.duration(260)}>
            <MCUnitsKpiStrip
              active={stats.active}
              maintenance={stats.maintenance}
              inactive={stats.inactive}
            />
            <MCUnitsSearchFilters
              query={query}
              onQuery={setQuery}
              filter={filter}
              onFilter={setFilter}
            />
          </Animated.View>

          <MCNeedsAttention items={needsAttention} />

          <MCSectionTitle label="All units" />
          {filtered.map((u) => (
            <MCUnitCard
              key={u.unitId}
              unit={u}
              onPress={() => {
                // later: navigate to unit details
              }}
            />
          ))}
        </View>
      </ScrollView>
    </MCBackground>
  );
}
