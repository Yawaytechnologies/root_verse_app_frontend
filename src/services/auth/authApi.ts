import type { AppModule } from "../../features/auth/authSlice";

export type LoginPayload = { userId: string; password: string };
export type LoginResponse = { token: string; userId: string; module: AppModule };

function decideModuleFromId(userId: string): AppModule | null {
  const id = String(userId || "").trim().toUpperCase();

  // ✅ Match your app naming
  if (id.startsWith("MC")) return "MARICULTURE";
  if (id.startsWith("AQ")) return "AQUACULTURE";
  if (id.startsWith("WC") || id.startsWith("WL") || id.startsWith("WILD"))
    return "WILD_CAPTURE";

  return null;
}

export async function loginApi(payload: LoginPayload): Promise<LoginResponse> {
  // demo delay
  await new Promise((r) => setTimeout(r, 300));

  const userId = String(payload.userId || "").trim();
  const password = String(payload.password || "").trim();

  if (!userId || !password) throw new Error("Enter ID and password");

  const module = decideModuleFromId(userId);
  if (!module) throw new Error("Invalid ID. Use AQ..., WC..., or MC... (demo)");

  // Optional demo password enforcement:
  // if (password !== "1234") throw new Error("Wrong password (demo: use 1234)");

  return {
    token: `demo_${Date.now()}`,
    userId,
    module,
  };
}

