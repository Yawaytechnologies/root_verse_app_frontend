import { useIsDarkTheme } from "@/src/store/useIsDarkTheme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
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
  const isDark = useIsDarkTheme();

  // ✅ Contrast tokens (same palette, stronger visibility)
  const T = useMemo(() => {
    const title = isDark ? "rgba(255,255,255,0.98)" : "#0f172a";
    const sub = isDark ? "rgba(226,232,240,0.82)" : "rgba(15,23,42,0.65)";
    const faint = isDark ? "rgba(226,232,240,0.72)" : "rgba(15,23,42,0.55)";

    const chipBg = isDark ? "rgba(15,23,42,0.88)" : "rgba(15,23,42,0.10)";
    const chipBd = isDark ? "rgba(148,163,184,0.55)" : "rgba(15,23,42,0.14)";
    const chipTx = isDark ? "rgba(255,255,255,0.96)" : "#0f172a";
    const chipIcon = isDark ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.70)";

    const divider = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)";

    return { title, sub, faint, chipBg, chipBd, chipTx, chipIcon, divider };
  }, [isDark]);

  return (
    <GlassCard radius={24} pad={18}>
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text
            className="text-[17px]"
            style={{ color: T.title, fontWeight: "900", letterSpacing: 0.2 }}
          >
            Cultivation Units
          </Text>
          <Text
            className="text-[12px] mt-1"
            style={{ color: T.sub, lineHeight: 16, fontWeight: "700" }}
          >
            Live view of all active, maintenance and inactive units
          </Text>
        </View>

        {/* Count chip */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: T.chipBg,
            borderWidth: 1,
            borderColor: T.chipBd,
          }}
        >
          <Ionicons name="grid-outline" size={16} color={T.chipIcon} />
          <Text
            className="text-[12px] ml-2"
            style={{ color: T.chipTx, fontWeight: "900", letterSpacing: 0.3 }}
          >
            {units.length} units
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View className="mt-4 h-[1px]" style={{ backgroundColor: T.divider }} />

      {/* List */}
      <View className="mt-4">
        {units.map((u, index) => (
          <UnitRow key={u.unitId} unit={u} index={index} />
        ))}
      </View>

      {/* Soft bottom fade */}
      <View className="mt-4">
        <LinearGradient
          colors={
            // Light mode fade should be lighter, dark mode fade is darker
            isDark
              ? ["rgba(0,0,0,0)", "rgba(0,0,0,0.28)"]
              : ["rgba(0,0,0,0)", "rgba(15,23,42,0.08)"]
          }
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
  const isDark = useIsDarkTheme();

  const T = useMemo(() => {
    const title = isDark ? "rgba(255,255,255,0.98)" : "#0f172a";
    const sub = isDark ? "rgba(226,232,240,0.86)" : "rgba(15,23,42,0.62)";
    const label = isDark ? "rgba(148,163,184,0.95)" : "rgba(15,23,42,0.50)";
    const value = isDark ? "rgba(255,255,255,0.95)" : "#0f172a";

    const rowBorder = isDark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.12)";
    const chevron = isDark ? "rgba(255,255,255,0.82)" : "rgba(15,23,42,0.55)";
    const chevronBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)";
    const chevronBd = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)";

    return { title, sub, label, value, rowBorder, chevron, chevronBg, chevronBd };
  }, [isDark]);

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
          borderColor: T.rowBorder, // ✅ stronger border
        },
        animatedStyle,
      ]}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
    >
      {/* ✅ Slightly stronger gradient so text reads better */}
      <LinearGradient
        colors={
          isDark
            ? [
                "rgba(255,255,255,0.08)",
                "rgba(255,255,255,0.04)",
                "rgba(0,0,0,0.18)",
              ]
            : ["rgba(255,255,255,0.92)", "rgba(255,255,255,0.78)", "rgba(15,23,42,0.03)"]
        }
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ paddingHorizontal: 14, paddingVertical: 14 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {/* Icon badge */}
            <View
              style={{
                height: 46,
                width: 46,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark ? "rgba(125,211,252,0.16)" : "rgba(125,211,252,0.22)",
                borderWidth: 1,
                borderColor: isDark ? "rgba(125,211,252,0.30)" : "rgba(125,211,252,0.38)",
              }}
            >
              <Ionicons name="cube-outline" size={20} color={isDark ? "rgba(125,211,252,1)" : "rgba(2,132,199,0.95)"} />
            </View>

            <View className="flex-1" style={{ marginLeft: 12 }}>
              <Text
                className="text-[14px]"
                style={{ color: T.title, fontWeight: "900", letterSpacing: 0.15 }}
                numberOfLines={1}
              >
                {unit.unitId}
              </Text>

              <Text
                className="text-[12px] mt-1"
                style={{ color: T.sub, lineHeight: 16, fontWeight: "700" }}
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

            {/* Chevron pill */}
            <View
              style={{
                height: 30,
                width: 30,
                borderRadius: 999,
                marginLeft: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: T.chevronBg,
                borderWidth: 1,
                borderColor: T.chevronBd,
              }}
            >
              <Ionicons name="chevron-forward" size={16} color={T.chevron} />
            </View>
          </View>
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const isDark = useIsDarkTheme();

  const T = useMemo(() => {
    const labelColor = isDark ? "rgba(148,163,184,0.95)" : "rgba(15,23,42,0.52)";
    const valueColor = isDark ? "rgba(255,255,255,0.96)" : "#0f172a";
    return { labelColor, valueColor };
  }, [isDark]);

  return (
    <View style={{ flex: 1 }}>
      <Text className="text-[10px]" style={{ color: T.labelColor, letterSpacing: 0.4, fontWeight: "900" }}>
        {label}
      </Text>
      <Text
        className="text-[12px] mt-1"
        style={{ color: T.valueColor, fontWeight: "800" }}
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
  const isDark = useIsDarkTheme();

  // ✅ higher-contrast text + borders (same mapping)
  const map = {
    Active: {
      bg: "rgba(34,197,94,0.18)",
      bd: isDark ? "rgba(22,163,74,0.92)" : "rgba(22,163,74,0.70)",
      tx: isDark ? "#bbf7d0" : "#065f46",
      icon: "checkmark-circle-outline",
    },
    Maintenance: {
      bg: "rgba(56,189,248,0.20)",
      bd: isDark ? "rgba(56,189,248,0.92)" : "rgba(2,132,199,0.60)",
      tx: isDark ? "#e0f2fe" : "#075985",
      icon: "time-outline",
    },
    Inactive: {
      bg: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
      bd: isDark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.12)",
      tx: isDark ? "rgba(226,232,240,0.92)" : "rgba(15,23,42,0.70)",
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
      <Text className="text-[11px] ml-1" style={{ color: map.tx, fontWeight: "900" }}>
        {status}
      </Text>
    </View>
  );
}
