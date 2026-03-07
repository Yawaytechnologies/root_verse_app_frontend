import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DivisionKey, PackedCrateItem } from "./crate.types";

const USE_MOCKS =
  String(process.env.EXPO_PUBLIC_USE_MOCKS ?? "true") === "true";

const PREFIX = "CRATE_PACK";
const keyPacked = (packerId: string, division: DivisionKey) =>
  `${PREFIX}_PACKED_V1::${packerId}::${division}`;

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function listPacked(params: {
  packerId: string;
  division: DivisionKey;
}) {
  if (!USE_MOCKS) {
    // TODO: replace with real API call later
    return [] as PackedCrateItem[];
  }

  return readJson<PackedCrateItem[]>(
    keyPacked(params.packerId, params.division),
    []
  );
}

export async function packCrate(params: {
  packerId: string;
  packerName: string;
  division: DivisionKey;
  code: string;
  notes?: string;
}) {
  if (!USE_MOCKS) {
    // TODO: replace with real API call later
    return { ok: true as const };
  }

  const code = params.code.trim().toUpperCase();
  if (!code) return { ok: false as const, error: "Empty code" };

  const list = await listPacked({
    packerId: params.packerId,
    division: params.division,
  });

  const exists = list.some((x) => x.code === code);
  if (exists) return { ok: false as const, error: "Already packed (local)" };

  const item: PackedCrateItem = {
    id: uid(),
    code,
    division: params.division,
    packed_at: new Date().toISOString(),
    packer_id: params.packerId,
    packer_name: params.packerName,
    status: "LOCAL",
    notes: params.notes,
  };

  const next = [item, ...list];
  await writeJson(keyPacked(params.packerId, params.division), next);

  return { ok: true as const };
}
