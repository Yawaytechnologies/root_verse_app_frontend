import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useIsDarkTheme } from "../../../store/useIsDarkTheme";
import { g } from "../../../utils/gradient";

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

  // Must match paddingHorizontal below
  const ROW_PADDING_H = 12;

  const pill = useMemo(() => {
    if (!rowW) return { left: 0, width: 0 };
    const usable = Math.max(0, rowW - ROW_PADDING_H * 2);
    const itemW = usable / TABS.length;
    return { left: ROW_PADDING_H + itemW * activeIndex, width: itemW };
  }, [rowW, activeIndex]);

  // ✅ Theme tokens (same colors)
  const scrimColors = isDark
    ? g("rgba(0,0,0,0.00)", "rgba(3,6,12,0.55)", "rgba(3,6,12,0.92)")
    : g("rgba(255,255,255,0.00)", "rgba(241,245,249,0.65)", "rgba(241,245,249,0.95)");

  const barGrad = isDark
    ? g("#0B1220", "#070B14", "#05070E")
    : g("#FFFFFF", "#F6F8FC", "#EEF2F7");

  const border = isDark ? "rgba(255,255,255,0.10)" : "rgba(2,6,23,0.10)";
  const divider = isDark ? "rgba(255,255,255,0.10)" : "rgba(2,6,23,0.08)";

  const inactiveIcon = isDark ? "rgba(226,232,240,0.70)" : "rgba(15,23,42,0.55)";
  const inactiveText = isDark ? "rgba(226,232,240,0.62)" : "rgba(15,23,42,0.55)";

  const activeIcon = "#0ea5e9";
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
      {/* Background scrim */}
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

            {/* Row */}
            <View
              onLayout={(e) => setRowW(e.nativeEvent.layout.width)}
              style={{
                position: "relative",
                flexDirection: "row",
                paddingHorizontal: ROW_PADDING_H,
                paddingVertical: 12,
              }}
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
                        ? g("rgba(125,211,252,0.20)", "rgba(56,189,248,0.10)", "rgba(0,0,0,0)")
                        : g("rgba(14,165,233,0.14)", "rgba(14,165,233,0.08)", "rgba(255,255,255,0)")
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
                    hitSlop={10}
                    android_ripple={
                      Platform.OS === "android"
                        ? { color: "rgba(0,0,0,0.06)", borderless: true }
                        : undefined
                    }
                    style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                  >
                    {({ pressed }) => (
                      <>
                        {/* Press overlay (no layout shift) */}
                        <View
                          pointerEvents="none"
                          style={{
                            position: "absolute",
                            top: 6,
                            bottom: 6,
                            left: 6,
                            right: 6,
                            borderRadius: 18,
                            opacity: pressed ? 1 : 0,
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(2,6,23,0.03)",
                          }}
                        />

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
                            transform: [{ scale: pressed ? 0.96 : 1 }],
                          }}
                        >
                          <Ionicons
                            name={t.icon}
                            size={20}
                            color={isActive ? activeIcon : inactiveIcon}
                          />
                        </View>

                        <Text
                          numberOfLines={1}
                          style={{
                            marginTop: 8,
                            fontSize: 12,
                            color: isActive ? activeText : inactiveText,
                            fontWeight: isActive ? "800" : "700",
                            letterSpacing: 0.25,
                            opacity: pressed ? 0.9 : 1,
                          }}
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
                            transform: [{ scale: pressed ? 0.95 : 1 }],
                          }}
                        />
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <LinearGradient
              colors={
                isDark
                  ? g("rgba(255,255,255,0.00)", "rgba(0,0,0,0.35)")
                  : g("rgba(2,6,23,0.00)", "rgba(2,6,23,0.06)")
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
