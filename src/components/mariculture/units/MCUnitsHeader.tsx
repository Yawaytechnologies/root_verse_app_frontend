import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

const MINT = "#34d399";

export default function MCUnitsHeader() {
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={{ paddingTop: 34 }}>
      <Text
        style={{
          color: MINT,
          fontSize: 36,
          fontWeight: "900",
          letterSpacing: 0.2,
        }}
      >
        Mariculture
      </Text>

      <Text
        style={{
          marginTop: 6,
          color: "rgba(255,255,255,0.96)",
          fontSize: 18,
          fontWeight: "900",
          letterSpacing: 0.2,
        }}
      >
        Units
      </Text>

      <Text
        style={{
          marginTop: 8,
          color: "rgba(226,232,240,0.72)",
          fontSize: 13,
          fontWeight: "700",
          lineHeight: 18,
        }}
      >
        Cultivation units • live operational view
      </Text>

      {/* Chip */}
      <View style={{ marginTop: 12, alignSelf: "flex-start" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: 38,
            paddingHorizontal: 14,
            borderRadius: 999,
            backgroundColor: "rgba(15,23,42,0.70)",
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.35)",
          }}
        >
          <Ionicons name="leaf-outline" size={16} color={MINT} />
          <Text
            style={{
              marginLeft: 8,
              color: "rgba(209,250,229,0.92)",
              fontSize: 13,
              fontWeight: "900",
              letterSpacing: 0.2,
            }}
          >
            Registry + Ops
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
