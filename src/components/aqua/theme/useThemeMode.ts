import { useColorScheme } from "react-native";
import { TOKENS, ThemeMode } from "./tokens";

export function useThemeMode(forcedMode?: ThemeMode) {
  const scheme = useColorScheme();
  const mode: ThemeMode = forcedMode ?? (scheme === "dark" ? "dark" : "light");
  return { mode, theme: TOKENS[mode] };
}
