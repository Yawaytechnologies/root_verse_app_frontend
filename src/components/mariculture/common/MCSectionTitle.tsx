import React from "react";
import { Text } from "react-native";

export default function MCSectionTitle({ label }: { label: string }) {
  return (
    <Text
      style={{
        marginTop: 16,
        marginBottom: 10,
        color: "rgba(226,232,240,0.62)",
        fontSize: 11,
        fontWeight: "900",
        letterSpacing: 1.6,
        textTransform: "uppercase",
      }}
    >
      {label}
    </Text>
  );
}
