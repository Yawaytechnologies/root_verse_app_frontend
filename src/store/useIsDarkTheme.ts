import { useColorScheme } from "react-native";
import { useAppSelector } from "./hooks";

export function useIsDarkTheme() {
  const system = useColorScheme();
  const mode = useAppSelector((s) => s.theme.mode); // LIGHT | DARK | SYSTEM
  return mode === "SYSTEM" ? system === "dark" : mode === "DARK";
}
