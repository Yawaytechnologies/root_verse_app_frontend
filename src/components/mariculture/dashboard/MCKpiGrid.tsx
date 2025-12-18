import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomInEasyUp,
} from "react-native-reanimated";

const SKY = "#7dd3fc";
const SKY_BG = "rgba(125,211,252,0.14)";
const SKY_BORDER = "rgba(125,211,252,0.26)";

function KpiTile({
  label,
  value,
  icon,
  hint,
  index,
}: {
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  hint: string;
  index: number;
}) {
  const s = useSharedValue(1);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
  }));

  const onPressIn = () => {
    s.value = withTiming(0.985, {
      duration: 120,
      easing: Easing.out(Easing.quad),
    });
  };

  const onPressOut = () => {
    s.value = withTiming(1, {
      duration: 160,
      easing: Easing.out(Easing.quad),
    });
  };

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        entering={ZoomInEasyUp.duration(480)
          .delay(80 + index * 80)
          .easing(Easing.out(Easing.cubic))}
        style={[
          {
            borderRadius: 22,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
            backgroundColor: "rgba(255,255,255,0.03)",
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          },
          aStyle,
        ]}
      >
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.07)",
            "rgba(255,255,255,0.03)",
            "rgba(0,0,0,0.25)",
          ]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ padding: 12, minHeight: 92 }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: "rgba(255,255,255,0.92)",
              fontSize: 11,
              fontWeight: "900",
              letterSpacing: 0.2,
            }}
          >
            {label}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            <View
              style={{
                height: 44,
                width: 44,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: SKY_BG,
                borderWidth: 1,
                borderColor: SKY_BORDER,
              }}
            >
              <Ionicons name={icon} size={19} color={SKY} />
            </View>

            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text
                allowFontScaling={false}
                style={{
                  color: "#FFFFFF",
                  fontSize: 26,
                  fontWeight: "900",
                  letterSpacing: 0.35,
                  textShadowColor: "rgba(0,0,0,0.35)",
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 8,
                }}
              >
                {value}
              </Text>

              <View
                style={{
                  marginTop: 5,
                  height: 1,
                  width: 46,
                  borderRadius: 99,
                  backgroundColor: "rgba(125,211,252,0.22)",
                }}
              />
            </View>
          </View>

          <Text
            numberOfLines={1}
            style={{
              marginTop: 10,
              color: "rgba(226,232,240,0.80)",
              fontSize: 10.5,
              fontWeight: "800",
              letterSpacing: 0.12,
            }}
          >
            {hint}
          </Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

export default function MCKpiGrid({
  kpis,
}: {
  kpis: {
    activeUnits: number;
    harvestsThisMonth: number;
    cratesAssignedToday: number;
    alerts: number;
  };
}) {
  const { width } = useWindowDimensions();

  const gap = 12;
  const containerPadding = 24;

  const tileW = useMemo(() => {
    const usable = width - containerPadding * 2;
    return (usable - gap) / 2;
  }, [width]);

  const sectionOpacity = useSharedValue(0);
  const sectionTranslate = useSharedValue(10); // ✅ a bit more lift-in

  useEffect(() => {
    sectionOpacity.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    sectionTranslate.value = withTiming(0, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const sectionStyle = useAnimatedStyle(() => ({
    opacity: sectionOpacity.value,
    transform: [{ translateY: sectionTranslate.value }],
  }));

  return (
    <Animated.View style={[sectionStyle, { marginTop: 20 }]}>
      {/* ✅ moved down for premium spacing */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
        <View style={{ width: tileW }}>
          <KpiTile
            index={0}
            label="Active Units"
            value={kpis.activeUnits}
            icon="grid-outline"
            hint="Operational now"
          />
        </View>

        <View style={{ width: tileW }}>
          <KpiTile
            index={1}
            label="Harvests"
            value={kpis.harvestsThisMonth}
            icon="leaf-outline"
            hint="This month"
          />
        </View>

        <View style={{ width: tileW }}>
          <KpiTile
            index={2}
            label="Crates Today"
            value={kpis.cratesAssignedToday}
            icon="qr-code-outline"
            hint="Assigned batches"
          />
        </View>

        <View style={{ width: tileW }}>
          <KpiTile
            index={3}
            label="Alerts"
            value={kpis.alerts}
            icon="alert-circle-outline"
            hint="Needs attention"
          />
        </View>
      </View>
    </Animated.View>
  );
}
