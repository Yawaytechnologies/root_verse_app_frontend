import React from "react";
import { View, ViewProps } from "react-native";
import { useThemeMode } from "../theme/useThemeMode";

type Props = ViewProps;

export default function Card({ style, ...props }: Props) {
  const { theme } = useThemeMode();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: theme.radius.card,
          padding: 16,
        },
        style,
      ]}
    />
  );
}
