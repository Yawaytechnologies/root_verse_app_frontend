import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useIsDarkTheme } from "../../../store/useIsDarkTheme";

type TabKey = "dashboard" | "units" | "scan" | "profile";

const TABS: Array<{
  k: TabKey;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}> = [
  { k: "dashboard", icon: "grid-outline", label: "Dashboard" },
  { k: "units", icon: "layers-outline", label: "Units" },
  { k: "scan", icon: "scan-outline", label: "Scan" },
  { k: "profile", icon: "person-outline", label: "Profile" },
];

export default function MCBottomBar({
  active = "dashboard",
  onTab,
}: {
  active?: TabKey;
  onTab?: (key: TabKey) => void;
}) {
  const isDark = useIsDarkTheme();
  const [rowW, setRowW] = useState(0);

  const activeIndex = Math.max(0, TABS.findIndex((t) => t.k === active));

  const pill = useMemo(() => {
    if (!rowW) return { left: 0, width: 0 };
    const w = rowW / TABS.length;
    return { left: w * activeIndex, width: w };
  }, [rowW, activeIndex]);

  // ✅ Theme tokens
  const scrimColors = isDark
    ? ["rgba(0,0,0,0.00)", "rgba(3,6,12,0.55)", "rgba(3,6,12,0.92)"]
    : ["rgba(255,255,255,0.00)", "rgba(241,245,249,0.65)", "rgba(241,245,249,0.95)"];

  const barGrad = isDark
    ? ["#0B1220", "#070B14", "#05070E"]
    : ["#FFFFFF", "#F6F8FC", "#EEF2F7"];

  const border = isDark ? "rgba(255,255,255,0.10)" : "rgba(2,6,23,0.10)";
  const divider = isDark ? "rgba(255,255,255,0.10)" : "rgba(2,6,23,0.08)";

  const inactiveIcon = isDark ? "rgba(226,232,240,0.70)" : "rgba(15,23,42,0.55)";
  const inactiveText = isDark ? "rgba(226,232,240,0.62)" : "rgba(15,23,42,0.55)";

  const activeIcon = "#0ea5e9"; // sky-500
  const activeText = "rgba(14,165,233,0.98)";

  return (
    <View
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: Platform.OS === "ios" ? 18 : 14,
      }}
    >
      {/* ✅ Background scrim */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: -16,
          right: -16,
          bottom: -28,
          height: 140,
        }}
      >
        <LinearGradient
          colors={scrimColors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ flex: 1 }}
        />
      </View>

      {/* Shadow */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          borderRadius: 34,
          ...(Platform.OS === "android"
            ? { elevation: 18 }
            : {
                shadowColor: "#000",
                shadowOpacity: isDark ? 0.45 : 0.18,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 12 },
              }),
        }}
      />

      <View style={{ borderRadius: 34, overflow: "hidden" }}>
        <LinearGradient
          colors={barGrad}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{ borderRadius: 34 }}
        >
          <View
            style={{
              borderRadius: 34,
              borderWidth: 1,
              borderColor: border,
              overflow: "hidden",
            }}
          >
            <View style={{ height: 1, backgroundColor: divider }} />

            {/* Items */}
            <View
              className="relative flex-row px-3 py-3"
              onLayout={(e) => setRowW(e.nativeEvent.layout.width)}
            >
              {/* Active pill */}
              {rowW > 0 && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: 8,
                    bottom: 8,
                    left: pill.left,
                    width: pill.width,
                    paddingHorizontal: 6,
                  }}
                >
                  <LinearGradient
                    colors={
                      isDark
                        ? ["rgba(125,211,252,0.20)", "rgba(56,189,248,0.10)", "rgba(0,0,0,0)"]
                        : ["rgba(14,165,233,0.14)", "rgba(14,165,233,0.08)", "rgba(255,255,255,0)"]
                    }
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={{
                      flex: 1,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(125,211,252,0.18)" : "rgba(14,165,233,0.18)",
                    }}
                  />
                </View>
              )}

              {TABS.map((t) => {
                const isActive = t.k === active;

                return (
                  <Pressable
                    key={t.k}
                    onPress={() => onTab?.(t.k)}
                    className="flex-1 items-center justify-center"
                    style={({ pressed }) => [
                      {
                        opacity: pressed ? 0.82 : 1,
                        transform: [
                          { translateY: pressed ? 1 : 0 },
                          { scale: pressed ? 0.99 : 1 },
                        ],
                      },
                    ]}
                  >
                    <View
                      style={{
                        height: 36,
                        width: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isActive
                          ? isDark
                            ? "rgba(125,211,252,0.14)"
                            : "rgba(14,165,233,0.10)"
                          : isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(2,6,23,0.04)",
                        borderWidth: 1,
                        borderColor: isActive
                          ? isDark
                            ? "rgba(125,211,252,0.22)"
                            : "rgba(14,165,233,0.20)"
                          : border,
                      }}
                    >
                      <Ionicons
                        name={t.icon}
                        size={20}
                        color={isActive ? activeIcon : inactiveIcon}
                      />
                    </View>

                    <Text
                      className="mt-2 text-[12px]"
                      style={{
                        color: isActive ? activeText : inactiveText,
                        fontWeight: isActive ? "800" : "700",
                        letterSpacing: 0.25,
                      }}
                      numberOfLines={1}
                    >
                      {t.label}
                    </Text>

                    <View
                      style={{
                        marginTop: 4,
                        height: 5,
                        width: 5,
                        borderRadius: 99,
                        backgroundColor: isActive
                          ? isDark
                            ? "rgba(125,211,252,0.95)"
                            : "rgba(14,165,233,0.95)"
                          : "transparent",
                      }}
                    />
                  </Pressable>
                );
              })}
            </View>

            <LinearGradient
              colors={
                isDark
                  ? ["rgba(255,255,255,0.00)", "rgba(0,0,0,0.35)"]
                  : ["rgba(2,6,23,0.00)", "rgba(2,6,23,0.06)"]
              }
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ height: 10 }}
            />
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}
