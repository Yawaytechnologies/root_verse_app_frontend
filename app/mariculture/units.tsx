import { useIsDarkTheme } from "@/src/store/useIsDarkTheme";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

type UnitStatus = "Active" | "Maintenance" | "Inactive";
type UnitType = "Raft" | "Longline" | "Cage";

type UnitItem = {
  unitId: string;
  unitType: UnitType;
  species: string;
  location: string;
  status: UnitStatus;
  lastLog?: string;
  maintenanceReason?: string;
  alertsCount?: number;
};

type UnitFilter = "all" | "active" | "maintenance" | "inactive";

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
  const isDark = useIsDarkTheme();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UnitFilter>("all");

  // Theme tokens (same design, just readable on light bg)
  const T = useMemo(() => {
    const bg = isDark ? "#07161a" : "#f5f7fb";
    const card = isDark ? "rgba(255,255,255,0.06)" : "#ffffff";
    const border = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";
    const shadow = isDark ? "rgba(0,0,0,0.35)" : "rgba(15,23,42,0.10)";

    const h1 = isDark ? "#34d399" : "#10b981"; // your green title
    const title = isDark ? "#f8fafc" : "#0f172a"; // white -> near black
    const sub = isDark ? "rgba(248,250,252,0.70)" : "rgba(15,23,42,0.60)";
    const text = isDark ? "rgba(248,250,252,0.86)" : "rgba(15,23,42,0.78)";
    const faint = isDark ? "rgba(248,250,252,0.55)" : "rgba(15,23,42,0.48)";

    const pillBg = isDark ? "rgba(15,23,42,0.55)" : "rgba(15,23,42,0.10)";
    const pillText = isDark ? "#e2e8f0" : "#0f172a";

    const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#ffffff";
    const inputBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)";
    const placeholder = isDark ? "rgba(248,250,252,0.45)" : "rgba(15,23,42,0.40)";

    return {
      bg,
      card,
      border,
      shadow,
      h1,
      title,
      sub,
      text,
      faint,
      pillBg,
      pillText,
      inputBg,
      inputBorder,
      placeholder,
    };
  }, [isDark]);

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

  const FilterChip = ({
    label,
    value,
  }: {
    label: string;
    value: UnitFilter;
  }) => {
    const active = filter === value;
    return (
      <Pressable
        onPress={() => setFilter(value)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: active ? T.pillBg : "transparent",
          borderWidth: 1,
          borderColor: active ? T.inputBorder : T.border,
        }}
      >
        <Text style={{ color: active ? T.pillText : T.faint, fontWeight: "800" }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const Kpi = ({ label, value }: { label: string; value: number }) => {
    return (
      <View
        style={[
          styles.kpiCard,
          {
            backgroundColor: T.card,
            borderColor: T.border,
            shadowColor: T.shadow,
          },
        ]}
      >
        <Text style={{ color: T.faint, fontSize: 12, fontWeight: "800" }}>
          {label}
        </Text>
        <Text style={{ color: T.title, fontSize: 26, fontWeight: "900", marginTop: 8 }}>
          {value}
        </Text>
      </View>
    );
  };

  const UnitCard = ({ u }: { u: UnitItem }) => {
    const badgeBg =
      u.status === "Active"
        ? (isDark ? "rgba(16,185,129,0.16)" : "rgba(16,185,129,0.12)")
        : u.status === "Maintenance"
        ? (isDark ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.14)")
        : (isDark ? "rgba(148,163,184,0.14)" : "rgba(148,163,184,0.16)");

    const badgeText =
      u.status === "Active"
        ? (isDark ? "#34d399" : "#059669")
        : u.status === "Maintenance"
        ? (isDark ? "#fbbf24" : "#b45309")
        : (isDark ? "#cbd5e1" : "#475569");

    return (
      <Pressable
        onPress={() => {}}
        style={[
          styles.unitCard,
          {
            backgroundColor: T.card,
            borderColor: T.border,
            shadowColor: T.shadow,
          },
        ]}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: T.title, fontSize: 14, fontWeight: "900" }}>
              {u.unitId} • {u.unitType}
            </Text>
            <Text style={{ color: T.text, marginTop: 4, fontWeight: "700" }}>
              {u.species}
            </Text>
            <Text style={{ color: T.faint, marginTop: 4 }}>
              {u.location}
            </Text>

            {u.status === "Maintenance" && u.maintenanceReason ? (
              <Text style={{ color: T.faint, marginTop: 6 }}>
                Reason: {u.maintenanceReason}
              </Text>
            ) : null}

            {u.lastLog ? (
              <Text style={{ color: T.faint, marginTop: 6 }}>
                Last log: {u.lastLog}
              </Text>
            ) : null}

            {(u.alertsCount ?? 0) > 0 ? (
              <Text style={{ color: T.faint, marginTop: 6 }}>
                Alerts: {u.alertsCount}
              </Text>
            ) : null}
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: badgeBg,
                borderWidth: 1,
                borderColor: T.border,
              }}
            >
              <Text style={{ color: badgeText, fontWeight: "900", fontSize: 12 }}>
                {u.status}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <View style={{ paddingHorizontal: 18, paddingTop: 18 }}>
          {/* Header */}
          <Text style={{ color: T.h1, fontSize: 44, fontWeight: "900" }}>
            Mariculture
          </Text>

          <Text style={{ color: T.title, fontSize: 22, fontWeight: "900", marginTop: 6 }}>
            Units
          </Text>

          <Text style={{ color: T.sub, fontSize: 13, marginTop: 6 }}>
            Cultivation units • live operational view
          </Text>

          <Pressable
            style={{
              marginTop: 14,
              alignSelf: "flex-start",
              paddingHorizontal: 18,
              paddingVertical: 12,
              borderRadius: 999,
              backgroundColor: T.pillBg,
              borderWidth: 1,
              borderColor: T.inputBorder,
            }}
          >
            <Text style={{ color: T.pillText, fontWeight: "900" }}>
              Registry + Ops
            </Text>
          </Pressable>

          {/* Light entrance strip */}
          <Animated.View entering={FadeInUp.duration(260)}>
            {/* KPI */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 18 }}>
              <Kpi label="Active" value={stats.active} />
              <Kpi label="Maintenance" value={stats.maintenance} />
              <Kpi label="Inactive" value={stats.inactive} />
            </View>

            {/* Search */}
            <View
              style={{
                marginTop: 14,
                backgroundColor: T.inputBg,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: T.inputBorder,
                paddingHorizontal: 14,
                paddingVertical: 10,
                shadowColor: T.shadow,
                shadowOpacity: isDark ? 0.25 : 0.18,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 },
                elevation: 3,
              }}
            >
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search Unit ID / Location / Species / Type"
                placeholderTextColor={T.placeholder}
                style={{
                  color: T.title,
                  fontWeight: "700",
                }}
              />
            </View>

            {/* Filters */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <FilterChip label="All" value="all" />
              <FilterChip label="Active" value="active" />
              <FilterChip label="Maintenance" value="maintenance" />
              <FilterChip label="Inactive" value="inactive" />
            </View>
          </Animated.View>

          {/* Needs attention */}
          {needsAttention.length > 0 ? (
            <View style={{ marginTop: 18 }}>
              <Text style={{ color: T.title, fontSize: 16, fontWeight: "900" }}>
                Needs attention
              </Text>
              <Text style={{ color: T.sub, marginTop: 4 }}>
                Maintenance units and units with alerts
              </Text>

              <View style={{ marginTop: 10 }}>
                {needsAttention.map((u) => (
                  <UnitCard key={`na-${u.unitId}`} u={u} />
                ))}
              </View>
            </View>
          ) : null}

          {/* All units */}
          <View style={{ marginTop: 18 }}>
            <Text style={{ color: T.title, fontSize: 16, fontWeight: "900" }}>
              All units
            </Text>
            <Text style={{ color: T.sub, marginTop: 4 }}>
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </Text>

            <View style={{ marginTop: 10 }}>
              {filtered.map((u) => (
                <UnitCard key={u.unitId} u={u} />
              ))}
            </View>
          </View>

          <View style={{ height: 20 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  unitCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
});
