// src/services/cratePacker/aquaCratePackingApi.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://rootverse-backend-5qoo.onrender.com"
).replace(/\/$/, "");

const TOKEN_KEY = "auth_token";

export type AquaCrateInput = {
  crate_qr: string;
  weight: number;
  grade?: string;
};

export type AquaPackedCrate = {
  id?: number;
  crate_qr_id?: number;
  crate_qr: string;
  pond_qr_code?: string;
  harvest_id?: number;
  quality_inspection_id?: number;
  species?: string;
  size_count_kg?: number;
  weight_kg?: number;
  grade?: string;
  crate_packer_id?: number;
  trader_id?: number;
  gps_latitude?: number;
  gps_longitude?: number;
  packing_status?: string;
  packed_at?: string;
  raw?: any;
};

export type AquaQualityInspection = {
  id?: number;
  quality_inspection_id?: number;
  pond_qr_scan?: string;
  harvest_id?: number;
  quality_checker_id?: number;
  checker_code?: string;
  sample_count?: number;
  sample_weight?: number;
  abw_g?: number;
  size_count_kg?: number;
  expected_biomass?: number;
  grade?: string;
  disease_observation?: boolean;
  disease_notes?: string;
  inspection_latitude?: number;
  inspection_longitude?: number;
  inspected_at?: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
  raw?: any;
};

export type AquaCratePackingScanData = {
  pond_id?: number;
  pond_code?: string;
  pond_name?: string;
  pond_qr: string;

  harvest_id: number;
  quality_inspection_id?: number;

  farm_id?: number;
  farm_code?: string;
  farm_name?: string;
  farmer_name?: string;

  culture_id?: number;
  culture_code?: string;

  species?: string;
  size_count_kg?: number;
  expected_size_count_kg?: number;
  expected_biomass?: number;
  grade?: string;

  trader_id?: number;
  trader_code?: string;
  trader_name?: string;
  trader_mobile?: string;

  crate_packer_id?: number;
  crate_packer_code?: string;
  crate_packer_name?: string;

  crate_count?: number;
  total_weight?: number;
  crates: AquaPackedCrate[];

  raw?: any;
};

function normCode(raw: any) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

function cleanText(v: any) {
  const s = String(v ?? "").trim();

  if (!s || s.toLowerCase() === "undefined" || s.toLowerCase() === "null") {
    return "";
  }

  return s;
}

function toNumber(v: any): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;

  if (typeof v === "number") {
    return Number.isFinite(v) ? v : undefined;
  }

  const s = String(v).replace(/,/g, "").trim();
  const direct = Number(s);

  if (Number.isFinite(direct)) return direct;

  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return undefined;

  const parsed = Number(m[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBool(v: any): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;

  const s = String(v).trim().toLowerCase();

  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;

  return undefined;
}

function cleanObject<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};

  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    out[k] = v;
  });

  return out as T;
}

async function readToken(): Promise<string | null> {
  const token = (
    (await AsyncStorage.getItem(TOKEN_KEY).catch(() => "")) || ""
  ).trim();

  return token || null;
}

async function requestJson<T>(
  path: string,
  options?: {
    method?: "GET" | "POST";
    body?: any;
    timeoutMs?: number;
  }
): Promise<T> {
  const token = await readToken();

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), options?.timeoutMs ?? 20000);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: options?.method || "GET",
      headers: {
        Accept: "application/json",
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: ctrl.signal,
    });

    const text = await res.text();
    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg =
        data?.message || data?.error || data?.details || `HTTP ${res.status}`;

      throw new Error(Array.isArray(msg) ? msg.join(", ") : String(msg));
    }

    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

function extractArray(raw: any): any[] {
  const root = raw?.data ?? raw;

  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.rows)) return root.rows;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.rows)) return raw.rows;

  return [];
}

function normalizeCrate(raw: any): AquaPackedCrate {
  return {
    id: toNumber(raw?.id),
    crate_qr_id: toNumber(raw?.crate_qr_id ?? raw?.crateQrId),
    crate_qr: normCode(
      raw?.crate_qr ?? raw?.crateQr ?? raw?.crate_code ?? raw?.code
    ),
    pond_qr_code: normCode(
      raw?.pond_qr_code ?? raw?.pondQrCode ?? raw?.pond_qr_scan
    ),
    harvest_id: toNumber(raw?.harvest_id ?? raw?.harvestId),
    quality_inspection_id: toNumber(
      raw?.quality_inspection_id ?? raw?.qualityInspectionId
    ),
    species: raw?.species ? String(raw.species) : undefined,
    size_count_kg: toNumber(raw?.size_count_kg ?? raw?.sizeCountKg),
    weight_kg: toNumber(raw?.weight_kg ?? raw?.weightKg ?? raw?.weight),
    grade: raw?.grade ? String(raw.grade).toUpperCase() : undefined,
    crate_packer_id: toNumber(raw?.crate_packer_id ?? raw?.cratePackerId),
    trader_id: toNumber(raw?.trader_id ?? raw?.traderId),
    gps_latitude: toNumber(raw?.gps_latitude ?? raw?.gpsLatitude),
    gps_longitude: toNumber(raw?.gps_longitude ?? raw?.gpsLongitude),
    packing_status: raw?.packing_status ?? raw?.packingStatus,
    packed_at: raw?.packed_at ?? raw?.packedAt,
    raw,
  };
}

function normalizeInspection(raw: any): AquaQualityInspection {
  const root = raw?.data ?? raw?.inspection ?? raw?.quality_inspection ?? raw;
  const q = root?.quality_inspection ?? root?.inspection ?? root;

  return {
    id: toNumber(q?.id ?? q?.quality_inspection_id ?? q?.qualityInspectionId),
    quality_inspection_id: toNumber(
      q?.quality_inspection_id ?? q?.qualityInspectionId ?? q?.id
    ),
    pond_qr_scan: normCode(
      q?.pond_qr_scan ??
        q?.pond_qr ??
        q?.pond_qr_code ??
        q?.pondQr ??
        q?.qr_code ??
        q?.code
    ),
    harvest_id: toNumber(q?.harvest_id ?? q?.harvestId ?? q?.harvest?.id),
    quality_checker_id: toNumber(
      q?.quality_checker_id ?? q?.qualityCheckerId
    ),
    checker_code: q?.checker_code ?? q?.checkerCode,
    sample_count: toNumber(q?.sample_count ?? q?.sampleCount),
    sample_weight: toNumber(q?.sample_weight ?? q?.sampleWeight),
    abw_g: toNumber(q?.abw_g ?? q?.abwG),
    size_count_kg: toNumber(q?.size_count_kg ?? q?.sizeCountKg),
    expected_biomass: toNumber(q?.expected_biomass ?? q?.expectedBiomass),
    grade: q?.grade ? String(q.grade).toUpperCase() : undefined,
    disease_observation: toBool(
      q?.disease_observation ?? q?.diseaseObservation
    ),
    disease_notes: q?.disease_notes ?? q?.diseaseNotes,
    inspection_latitude: toNumber(
      q?.inspection_latitude ?? q?.inspectionLatitude
    ),
    inspection_longitude: toNumber(
      q?.inspection_longitude ?? q?.inspectionLongitude
    ),
    inspected_at: q?.inspected_at ?? q?.inspectedAt,
    remarks: q?.remarks,
    created_at: q?.created_at ?? q?.createdAt,
    updated_at: q?.updated_at ?? q?.updatedAt,
    raw,
  };
}

function normalizeScanData(
  raw: any,
  inspection?: AquaQualityInspection
): AquaCratePackingScanData {
  const data = raw?.data ?? raw?.result ?? raw;

  const trader = data?.trader || {};
  const packer = data?.crate_packer || data?.cratePacker || {};

  const cratesRaw = Array.isArray(data?.crates) ? data.crates : [];

  const harvestId =
    toNumber(data?.harvest_id ?? data?.harvestId) ||
    inspection?.harvest_id ||
    0;

  return {
    pond_id: toNumber(data?.pond_id ?? data?.pondId),
    pond_code: data?.pond_code ?? data?.pondCode,
    pond_name: data?.pond_name ?? data?.pondName,
    pond_qr: normCode(
      data?.pond_qr_scan ??
        data?.pond_qr_code ??
        data?.pondQr ??
        data?.pond_qr ??
        inspection?.pond_qr_scan
    ),

    harvest_id: harvestId,

    quality_inspection_id:
      toNumber(data?.quality_inspection_id ?? data?.qualityInspectionId) ||
      inspection?.quality_inspection_id ||
      inspection?.id,

    farm_id: toNumber(data?.farm_id ?? data?.farmId),
    farm_code: data?.farm_code ?? data?.farmCode,
    farm_name: data?.farm_name ?? data?.farmName,
    farmer_name: data?.farmer_name ?? data?.farmerName,

    culture_id: toNumber(data?.culture_id ?? data?.cultureId),
    culture_code: data?.culture_code ?? data?.cultureCode,

    species: data?.species,
    size_count_kg:
      toNumber(data?.size_count_kg ?? data?.sizeCountKg) ||
      inspection?.size_count_kg,

    expected_size_count_kg: toNumber(
      data?.expected_size_count_kg ??
        data?.expected_size_count ??
        data?.expectedSizeCountKg ??
        data?.expected_size ??
        data?.expectedSize
    ),

    expected_biomass:
      toNumber(data?.expected_biomass ?? data?.expectedBiomass) ||
      inspection?.expected_biomass,

    grade: data?.grade
      ? String(data.grade).toUpperCase()
      : inspection?.grade
      ? inspection.grade
      : undefined,

    trader_id: toNumber(trader?.trader_id ?? trader?.id ?? data?.trader_id),
    trader_code: trader?.trader_code ?? trader?.code,
    trader_name: trader?.trader_name ?? trader?.name,
    trader_mobile: trader?.mobile ?? trader?.phone,

    crate_packer_id: toNumber(packer?.id ?? data?.crate_packer_id),
    crate_packer_code: packer?.code ?? data?.crate_packer_code,
    crate_packer_name: packer?.name ?? data?.crate_packer_name,

    crate_count:
      toNumber(data?.crate_count ?? data?.crateCount) ?? cratesRaw.length,
    total_weight: toNumber(data?.total_weight ?? data?.totalWeight),

    crates: cratesRaw.map(normalizeCrate),
    raw,
  };
}

/**
 * Important fix:
 * The mobile screen may still hold an old harvest ID like 31.
 * Backend quality-inspection record may be for harvest_id 1.
 *
 * So for crate packing we first find the completed quality inspection
 * by pond_qr_scan and then use that inspection's harvest_id.
 */
async function findCompletedInspectionForPond(
  pondQr: string,
  preferredHarvestId?: number | string | null
): Promise<AquaQualityInspection> {
  const code = normCode(pondQr);
  const wantedHarvestId = toNumber(preferredHarvestId);

  if (!code) {
    throw new Error("Pond QR is required");
  }

  const listRes = await requestJson<any>("/api/aquaculture/quality-inspection");
  const list = extractArray(listRes);

  const inspections = list
    .map(normalizeInspection)
    .filter((i) => normCode(i.pond_qr_scan) === code)
    .filter((i) => !!i.id || !!i.quality_inspection_id)
    .filter((i) => !!i.harvest_id);

  if (!inspections.length) {
    throw new Error(
      `Quality Inspection must be completed for pond ${code} before crate packing`
    );
  }

  const exactHarvest = wantedHarvestId
    ? inspections.find((i) => Number(i.harvest_id) === Number(wantedHarvestId))
    : null;

  if (exactHarvest) {
    return exactHarvest;
  }

  const latest = inspections
    .slice()
    .sort((a, b) => {
      const bid = Number(b.id || b.quality_inspection_id || 0);
      const aid = Number(a.id || a.quality_inspection_id || 0);
      return bid - aid;
    })[0];

  return latest;
}

export async function scanAquaPondForCratePacking(params: {
  pondQr: string;
  harvestId?: number | string | null;
  cratePackerId?: number | string | null;
  cratePackerCode?: string | null;
}): Promise<AquaCratePackingScanData> {
  const pondQr = normCode(params.pondQr);

  if (!pondQr) {
    throw new Error("Pond QR is required");
  }

  const inspection = await findCompletedInspectionForPond(
    pondQr,
    params.harvestId
  );

  const finalHarvestId = inspection.harvest_id;

  if (!finalHarvestId) {
    throw new Error("Harvest ID missing from completed quality inspection");
  }

  const query = new URLSearchParams();

  query.set("harvest_id", String(finalHarvestId));

  if (inspection.quality_inspection_id || inspection.id) {
    query.set(
      "quality_inspection_id",
      String(inspection.quality_inspection_id || inspection.id)
    );
  }

  if (params.cratePackerId) {
    query.set("crate_packer_id", String(params.cratePackerId));
  }

  if (params.cratePackerCode) {
    query.set("crate_packer_code", String(params.cratePackerCode));
  }

  const qs = query.toString();

  const path = `/api/aquaculture/crate-packing/scan/${encodeURIComponent(
    pondQr
  )}${qs ? `?${qs}` : ""}`;

  const res = await requestJson<any>(path);
  const normalized = normalizeScanData(res, inspection);

  if (!normalized.harvest_id) {
    normalized.harvest_id = finalHarvestId;
  }

  if (!normalized.quality_inspection_id) {
    normalized.quality_inspection_id =
      inspection.quality_inspection_id || inspection.id;
  }

  if (!normalized.grade && inspection.grade) {
    normalized.grade = inspection.grade;
  }

  return normalized;
}

export async function submitAquaCratePacking(params: {
  pondQr: string;
  harvestId: number | string;
  cratePackerId?: number | string | null;
  gpsLatitude?: number | string | null;
  gpsLongitude?: number | string | null;
  crates: AquaCrateInput[];
}) {
  const pondQr = normCode(params.pondQr);

  if (!pondQr) {
    throw new Error("Pond QR is required");
  }

  const inspection = await findCompletedInspectionForPond(
    pondQr,
    params.harvestId
  );

  const finalHarvestId = Number(inspection.harvest_id);

  if (!Number.isFinite(finalHarvestId) || finalHarvestId <= 0) {
    throw new Error("Valid harvest ID is required from quality inspection");
  }

  const crates = params.crates.map((c) => {
    const crateQr = normCode(c.crate_qr);
    const weight = Number(c.weight);
    const grade = String(c.grade || inspection.grade || "").trim().toUpperCase();

    if (!crateQr) {
      throw new Error("Crate QR is required");
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error(`Invalid weight for crate ${crateQr}`);
    }

    return cleanObject({
      crate_qr: crateQr,
      weight: Number(weight.toFixed(2)),
      grade,
    });
  });

  if (!crates.length) {
    throw new Error("Add at least one crate");
  }

  const body = cleanObject({
    pond_qr: pondQr,
    pond_qr_scan: pondQr,
    harvest_id: finalHarvestId,
    quality_inspection_id: inspection.quality_inspection_id || inspection.id,
    crate_packer_id: params.cratePackerId
      ? Number(params.cratePackerId)
      : undefined,
    gps_latitude: params.gpsLatitude ? Number(params.gpsLatitude) : undefined,
    gps_longitude: params.gpsLongitude ? Number(params.gpsLongitude) : undefined,
    crates,
  });

  const res = await requestJson<any>("/api/aquaculture/crate-packing", {
    method: "POST",
    body,
  });

  return {
    success: !!res?.success,
    message: res?.message || "Crates packed successfully",
    data: res?.data ?? res,
    raw: res,
  };
}

export async function listAquaHarvestPackedCrates(
  harvestId: number | string
): Promise<AquaPackedCrate[]> {
  const id = Number(harvestId);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Valid harvest ID is required");
  }

  const res = await requestJson<any>(
    `/api/aquaculture/crate-packing/harvest/${id}/crates`
  );

  const list = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.crates)
    ? res.crates
    : Array.isArray(res)
    ? res
    : [];

  return list.map(normalizeCrate);
}