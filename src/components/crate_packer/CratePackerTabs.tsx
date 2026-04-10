// src/components/crate_packer/CratePackerTabs.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type CrateTabKey = "SCAN" | "PACKED";

const BG = "#071228";
const BORDER_SOFT = "rgba(255,255,255,0.06)";
const INACTIVE = "rgba(255,255,255,0.55)";
const ACTIVE = "#3b82f6";

const ORDER: CrateTabKey[] = ["SCAN", "PACKED"];
const idxOf = (t: CrateTabKey) => ORDER.indexOf(t);

export default function CratePackerTabs({
  tab,
  onChange,
}: {
  tab: CrateTabKey;
  onChange: (t: CrateTabKey) => void;
}) {
  const tabAnim = useRef(new Animated.Value(idxOf(tab))).current;
  const [w, setW] = useState(0);

  useEffect(() => {
    Animated.spring(tabAnim, {
      toValue: idxOf(tab),
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  }, [tab, tabAnim]);

  const tabW = useMemo(() => {
    const width = w > 0 ? w : 360;
    return width / 2;
  }, [w]);

  const setTabSmooth = (next: CrateTabKey) => {
    if (next === tab) return;

    Animated.spring(tabAnim, {
      toValue: idxOf(next),
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();

    onChange(next);
  };

  const underlineStyle = {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    height: 3,
    width: tabW,
    borderRadius: 999,
    backgroundColor: ACTIVE,
    transform: [{ translateX: Animated.multiply(tabAnim, tabW) }],
  };

  return (
    <View
      style={{
        backgroundColor: BG,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_SOFT,
      }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      <View style={{ flexDirection: "row" }}>
        <MiniTab
          active={tab === "SCAN"}
          label="Scan"
          icon="scan-outline"
          onPress={() => setTabSmooth("SCAN")}
        />
        <MiniTab
          active={tab === "PACKED"}
          label="Packed"
          icon="cube-outline"
          onPress={() => setTabSmooth("PACKED")}
        />
      </View>

      <Animated.View style={underlineStyle} />
    </View>
  );
}

function MiniTab({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: any;
  onPress: () => void;
}) {
  const color = active ? ACTIVE : INACTIVE;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* ✅ icon + text centered as a group */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Ionicons name={icon} size={18} color={color} />
        <Text
          style={{
            color,
            fontWeight: "900",
            fontSize: 14,
            lineHeight: 16,
            ...(Platform.OS === "android"
              ? ({ includeFontPadding: false } as any)
              : null),
          }}
        >
          {label}
        </Text>
      </View>

      {/* spacer so underline sits clean */}
      <View style={{ marginTop: 10, height: 3, width: "100%" }} />
    </Pressable>
  );
}
