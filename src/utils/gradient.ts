// src/utils/gradient.ts
import type { ColorValue } from "react-native";

/**
 * expo-linear-gradient colors prop requires a tuple:
 * [ColorValue, ColorValue, ...ColorValue[]]
 * This helper forces that typing.
 */
export const g = (
  ...colors: [ColorValue, ColorValue, ...ColorValue[]]
): readonly [ColorValue, ColorValue, ...ColorValue[]] => colors;
