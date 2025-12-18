import type { AppModule } from "../features/auth/authSlice";

export const ROUTE_BY_MODULE: Record<AppModule, string> = {
  MARICULTURE: "/mariculture",
  AQUACULTURE: "/aquaculture",
  WILDCAPTURE: "/wildcapture",
};
