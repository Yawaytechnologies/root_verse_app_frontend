import React from "react";
import { View, ViewProps } from "react-native";
import { useThemeMode } from "../theme/useThemeMode";

type Props = ViewProps & { padded?: boolean };

export default function Screen({ padded = true, style, ...props }: Props) {
  const { theme } = useThemeMode();
  return (
    <View
      {...props}
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.bg,
          padding: padded ? 16 : 0,
        },
        style,
      ]}
    />
  );
}
