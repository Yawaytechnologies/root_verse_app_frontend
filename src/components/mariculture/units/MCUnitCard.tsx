import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import MCStatusPill, { UnitStatus } from "./MCStatusPill";

export type UnitItem = {
  unitId: string;
  unitType: string;
  species: string;
  location: string;
  status: UnitStatus;
  lastLog?: string;
  alertsCount?: number;
  maintenanceReason?: string;
};

export default function MCUnitCard({
  unit,
  onPress,
}: {
  unit: UnitItem;
  onPress?: (u: UnitItem) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress?.(unit)}
      style={({ pressed }) => [
        {
          marginBottom: 10,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.992 : 1 }],
        },
      ]}
    >
      <Animated.View
        entering={FadeInUp.duration(Platform.OS === "android" ? 200 : 260)}
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          backgroundColor: "rgba(255,255,255,0.035)",
          padding: 14,
        }}
      >
        {/* Top row */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "rgba(255,255,255,0.95)",
                fontWeight: "900",
                fontSize: 14,
              }}
              numberOfLines={1}
            >
              {unit.unitId}
            </Text>
            <Text
              style={{
                marginTop: 4,
                color: "rgba(226,232,240,0.62)",
                fontWeight: "700",
                fontSize: 12,
              }}
              numberOfLines={1}
            >
              {unit.location}
            </Text>
          </View>

          <MCStatusPill status={unit.status} />

          <View
            style={{
              height: 30,
              width: 30,
              borderRadius: 999,
              marginLeft: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.05)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
            }}
          >
            <Ionicons
              name="chevron-forward"
              size={16}
              color="rgba(226,232,240,0.75)"
            />
          </View>
        </View>

        {/* Meta row */}
        <View style={{ flexDirection: "row", gap: 14, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "rgba(148,163,184,0.78)",
                fontSize: 10,
                fontWeight: "900",
                letterSpacing: 0.6,
              }}
            >
              UNIT TYPE
            </Text>
            <Text
              style={{
                marginTop: 4,
                color: "rgba(255,255,255,0.90)",
                fontSize: 12,
                fontWeight: "800",
              }}
              numberOfLines={1}
            >
              {unit.unitType}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "rgba(148,163,184,0.78)",
                fontSize: 10,
                fontWeight: "900",
                letterSpacing: 0.6,
              }}
            >
              SPECIES
            </Text>
            <Text
              style={{
                marginTop: 4,
                color: "rgba(255,255,255,0.90)",
                fontSize: 12,
                fontWeight: "800",
              }}
              numberOfLines={1}
            >
              {unit.species}
            </Text>
          </View>
        </View>

        {/* Optional signals */}
        {(unit.lastLog ||
          (unit.alertsCount ?? 0) > 0 ||
          unit.maintenanceReason) && (
          <View style={{ marginTop: 10 }}>
            {!!unit.lastLog && (
              <Text
                style={{
                  color: "rgba(226,232,240,0.68)",
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                Last log: {unit.lastLog}
              </Text>
            )}

            {(unit.alertsCount ?? 0) > 0 && (
              <Text
                style={{
                  marginTop: 4,
                  color: "rgba(251,191,36,0.92)",
                  fontSize: 12,
                  fontWeight: "900",
                }}
              >
                Alerts: {unit.alertsCount}
              </Text>
            )}

            {!!unit.maintenanceReason && (
              <Text
                style={{
                  marginTop: 4,
                  color: "rgba(125,211,252,0.85)",
                  fontSize: 12,
                  fontWeight: "900",
                }}
              >
                Maintenance: {unit.maintenanceReason}
              </Text>
            )}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}
