import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View } from "react-native";
import Animated, {
  FadeInUp,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { GlassCard } from "./MCShell";

const AnimatedPressable = Animated.createAnimatedComponent(View);

export default function MCUnitsList({
  units,
}: {
  units: Array<{
    unitId: string;
    unitType: string;
    species: string;
    location: string;
    status: "Active" | "Maintenance" | "Inactive";
  }>;
}) {
  return (
    <GlassCard radius={24} pad={18}>
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text
            className="text-white text-[17px]"
            style={{ fontWeight: "900", letterSpacing: 0.2 }}
          >
            Cultivation Units
          </Text>
          <Text
            className="text-slate-300 text-[12px] mt-1"
            style={{ lineHeight: 16 }}
          >
            Live view of all active, maintenance and inactive units
          </Text>
        </View>

        {/* Count chip – same style as QuickActions "See all" */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: "rgba(15,23,42,0.85)",
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.7)",
          }}
        >
          <Ionicons name="grid-outline" size={16} color="#e5e7eb" />
          <Text
            className="text-[12px] ml-2"
            style={{ color: "#f9fafb", fontWeight: "800", letterSpacing: 0.3 }}
          >
            {units.length} units
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View className="mt-4 h-[1px] bg-white/10" />

      {/* List */}
      <View className="mt-4">
        {units.map((u, index) => (
          <UnitRow key={u.unitId} unit={u} index={index} />
        ))}
      </View>

      {/* Soft bottom fade */}
      <View className="mt-4">
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.25)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ height: 12, borderRadius: 12 }}
        />
      </View>
    </GlassCard>
  );
}

function UnitRow({
  unit,
  index,
}: {
  unit: {
    unitId: string;
    unitType: string;
    species: string;
    location: string;
    status: "Active" | "Maintenance" | "Inactive";
  };
  index: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
  };

  return (
    <AnimatedPressable
      entering={FadeInUp.delay(index * 60).springify().damping(18)}
      exiting={FadeOutDown.springify().damping(18)}
      style={[
        {
          borderRadius: 18,
          marginBottom: 10,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)", // ✅ QuickActions border
        },
        animatedStyle,
      ]}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
    >
      {/* ✅ QuickActions-style subtle gradient background */}
      <LinearGradient
        colors={[
          "rgba(255,255,255,0.06)",
          "rgba(255,255,255,0.03)",
          "rgba(0,0,0,0.15)",
        ]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ paddingHorizontal: 14, paddingVertical: 14 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {/* ✅ Icon badge same as QuickActions */}
            <View
              style={{
                height: 46,
                width: 46,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(125,211,252,0.12)",
                borderWidth: 1,
                borderColor: "rgba(125,211,252,0.22)",
              }}
            >
              <Ionicons name="cube-outline" size={20} color="#7dd3fc" />
            </View>

            <View className="flex-1" style={{ marginLeft: 12 }}>
              <Text
                className="text-white text-[14px]"
                style={{ fontWeight: "900", letterSpacing: 0.15 }}
                numberOfLines={1}
              >
                {unit.unitId}
              </Text>
              <Text
                className="text-slate-300 text-[12px] mt-1"
                style={{ lineHeight: 16 }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {unit.location}
              </Text>

              {/* Info row */}
              <View className="mt-3 flex-row gap-3">
                <Info label="Unit Type" value={unit.unitType} />
                <Info label="Species" value={unit.species} />
              </View>
            </View>
          </View>

          <View className="flex-row items-center">
            <StatusPill status={unit.status} />

            {/* ✅ Chevron pill same as QuickActions */}
            <View
              style={{
                height: 30,
                width: 30,
                borderRadius: 999,
                marginLeft: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.06)",
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
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        className="text-[10px]"
        style={{ color: "rgba(148,163,184,0.9)", letterSpacing: 0.4 }}
      >
        {label}
      </Text>
      <Text
        className="text-[12px] mt-1"
        style={{ color: "#f9fafb", fontWeight: "700" }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
  );
}

function StatusPill({
  status,
}: {
  status: "Active" | "Maintenance" | "Inactive";
}) {
  // Keeping your same status mapping (already matches the vibe)
  const map = {
    Active: {
      bg: "rgba(34,197,94,0.18)",
      bd: "rgba(22,163,74,0.9)",
      tx: "#bbf7d0",
      icon: "checkmark-circle-outline",
    },
    Maintenance: {
      bg: "rgba(56,189,248,0.20)",
      bd: "rgba(56,189,248,0.85)",
      tx: "#e0f2fe",
      icon: "time-outline",
    },
    Inactive: {
      bg: "rgba(255,255,255,0.06)", // slightly more aligned with QuickActions
      bd: "rgba(255,255,255,0.12)",
      tx: "rgba(226,232,240,0.85)",
      icon: "pause-circle-outline",
    },
  }[status];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: map.bg,
        borderWidth: 1,
        borderColor: map.bd,
      }}
    >
      <Ionicons name={map.icon as any} size={14} color={map.tx} />
      <Text className="text-[11px] ml-1" style={{ color: map.tx, fontWeight: "800" }}>
        {status}
      </Text>
    </View>
  );
}
