import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * NOTE:
 * - Your Dashboard uses division as "wild" | "aqua" | "mariculture"
 * - Some older code might use "WILD" | "AQUA" | "MARI"
 * So we accept both and normalize to lowercase for keys + stored records.
 */

export type DivisionKey =
  | "wild"
  | "aqua"
  | "mariculture"
  | "WILD"
  | "AQUA"
  | "MARI";

export type DivisionKeyNorm = "wild" | "aqua" | "mariculture";

export type PackedStatus = "LOCAL" | "PENDING" | "SYNCED" | "FAILED";

export type PackedCrateItem = {
  id: string;

  code: string; // crate QR/code
  division: DivisionKeyNorm;

  packed_at: string; // ISO

  packer_id: string;
  packer_name: string;

  status: PackedStatus;

  // ✅ NEW: store full snapshot payload (modal payload)
  payload?: any;

  // ✅ NEW: convenience list for quick search/filter
  fish_qrs?: string[];

  notes?: string;
};

export type FishIndexItem = {
  fish_qr: string; // normalized fish qr
  crate_code: string; // normalized crate code
  packed_id: string; // PackedCrateItem.id
  packed_at: string;
  division: DivisionKeyNorm;
  status: PackedStatus;
};

export type FishToCrateIndex = Record<string, FishIndexItem>;

const PREFIX = "CRATE_PACK";

const normCode = (v: any) =>
  String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");

function normDivision(d: DivisionKey): DivisionKeyNorm {
  const v = String(d || "").trim().toLowerCase();
  if (v === "wild" || v === "aqua") return v as DivisionKeyNorm;
  if (v === "mariculture" || v === "mari") return "mariculture";
  // fallback
  return "wild";
}

const k = {
  lastDivision: (userId: string) => `${PREFIX}_LAST_DIVISION_V1::${userId}`,

  // ✅ V2 packed list (now stores payload + fish_qrs)
  packedV2: (userId: string, division: DivisionKey) =>
    `${PREFIX}_PACKED_V2::${userId}::${normDivision(division)}`,

  // ✅ fish -> crate mapping
  fishIndexV1: (userId: string, division: DivisionKey) =>
    `${PREFIX}_FISH_INDEX_V1::${userId}::${normDivision(division)}`,
};

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

/** ---------------- Last division ---------------- */
export async function getLastDivision(userId: string): Promise<DivisionKeyNorm | null> {
  const v = await AsyncStorage.getItem(k.lastDivision(userId));
  if (!v) return null;
  const dv = normDivision(v as any);
  return dv || null;
}

export async function setLastDivision(userId: string, division: DivisionKey) {
  await AsyncStorage.setItem(k.lastDivision(userId), normDivision(division));
}

/** ---------------- Packed list ---------------- */
export async function getPackedList(userId: string, division: DivisionKey) {
  const list = await readJson<PackedCrateItem[]>(k.packedV2(userId, division), []);
  // normalize stored division just in case
  return (Array.isArray(list) ? list : []).map((x) => ({
    ...x,
    code: normCode(x.code),
    division: normDivision(x.division as any),
    packer_id: String(x.packer_id || ""),
    packer_name: String(x.packer_name || ""),
    status: (x.status || "LOCAL") as PackedStatus,
  }));
}

export async function setPackedList(
  userId: string,
  division: DivisionKey,
  items: PackedCrateItem[]
) {
  await writeJson(k.packedV2(userId, division), items);
}

/** Convenience: prepend one record */
export async function prependPackedRecord(
  userId: string,
  division: DivisionKey,
  record: PackedCrateItem
) {
  const cur = await getPackedList(userId, division);
  const next = [record, ...cur];
  await setPackedList(userId, division, next);
  return next;
}

/** ---------------- Fish -> Crate index ---------------- */
export async function getFishIndex(userId: string, division: DivisionKey) {
  return await readJson<FishToCrateIndex>(k.fishIndexV1(userId, division), {});
}

export async function setFishIndex(
  userId: string,
  division: DivisionKey,
  index: FishToCrateIndex
) {
  await writeJson(k.fishIndexV1(userId, division), index);
}

/** Update fish index using a packed record + its payload.items */
export async function upsertFishIndexFromPackedRecord(
  userId: string,
  division: DivisionKey,
  record: PackedCrateItem
) {
  const idx = await getFishIndex(userId, division);
  const crateCode = normCode(record.code);
  const packedAt = record.packed_at;
  const div = normDivision(record.division);

  const items = record?.payload?.items;
  const arr: any[] = Array.isArray(items) ? items : [];

  for (const it of arr) {
    const fishRaw =
      it?.fish_qr ?? it?.fishQr ?? it?.fish_code ?? it?.fishCode ?? "";
    const fishQr = normCode(fishRaw);
    if (!fishQr) continue;

    idx[fishQr] = {
      fish_qr: fishQr,
      crate_code: crateCode,
      packed_id: record.id,
      packed_at: packedAt,
      division: div,
      status: record.status,
    };
  }

  await setFishIndex(userId, division, idx);
  return idx;
}