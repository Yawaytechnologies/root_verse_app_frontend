import React from "react";
import { Text } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import MCSectionTitle from "../common/MCSectionTitle";
import MCUnitCard, { UnitItem } from "./MCUnitCard";

export default function MCNeedsAttention({
  items,
  onPress,
}: {
  items: UnitItem[];
  onPress?: (u: UnitItem) => void;
}) {
  if (!items.length) return null;

  return (
    <Animated.View entering={FadeInUp.duration(260)} style={{ marginTop: 10 }}>
      <MCSectionTitle label="Needs attention" />
      {items.slice(0, 3).map((u) => (
        <MCUnitCard key={u.unitId} unit={u} onPress={onPress} />
      ))}
      <Text
        style={{
          marginTop: 2,
          color: "rgba(226,232,240,0.50)",
          fontSize: 11,
          fontWeight: "700",
        }}
      >
        Showing top priority units
      </Text>
    </Animated.View>
  );
}
