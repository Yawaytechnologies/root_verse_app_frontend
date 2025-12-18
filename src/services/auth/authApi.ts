import type { AppModule } from "../../features/auth/authSlice";

export type LoginPayload = {
  userId: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  userId: string;
  module: AppModule;
};

// Simple rule-based module decision (edit anytime)
function decideModuleFromId(userId: string): AppModule {
  const id = userId.trim().toUpperCase();

  if (id.startsWith("MC") || id.includes("MARI")) return "MARICULTURE";
  if (id.startsWith("AQ") || id.includes("AQUA")) return "AQUACULTURE";
  return "WILDCAPTURE";
}

export async function loginApi(payload: LoginPayload): Promise<LoginResponse> {
  // simulate a real network call
  await new Promise((r) => setTimeout(r, 450));

  if (!payload.userId?.trim() || !payload.password?.trim()) {
    throw new Error("User ID and password are required");
  }

  // you can add more checks if you want (like wrong password demo)
  return {
    token: `mock_${Date.now()}`,
    userId: payload.userId.trim(),
    module: decideModuleFromId(payload.userId),
  };
}
