export type ThemeMode = "light" | "dark";

export const TOKENS = {
  light: {
    colors: {
      bg: "#F5F7FB",
      card: "#FFFFFF",
      text: "#0F172A",
      muted: "#64748B",
      border: "#E2E8F0",

      primary: "#2563EB",
      primary2: "#1D4ED8",

      tabBg: "#FFFFFF",
      tabBorder: "#E2E8F0",
      tabActive: "#2563EB",
      tabInactive: "#64748B",

      danger: "#E11D48",
    },
    radius: {
      card: 24,
      pill: 999,
    },
  },

  dark: {
    colors: {
      bg: "#050B16",
      card: "#0B1220",
      text: "#E5E7EB",
      muted: "#94A3B8",
      border: "rgba(148,163,184,0.18)",

      primary: "#60A5FA",
      primary2: "#2563EB",

      tabBg: "#0B1220",
      tabBorder: "rgba(148,163,184,0.18)",
      tabActive: "#60A5FA",
      tabInactive: "#94A3B8",

      danger: "#FB7185",
    },
    radius: {
      card: 24,
      pill: 999,
    },
  },
} as const;
