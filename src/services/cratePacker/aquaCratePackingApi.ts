// src/services/cratePacker/aquaCratePackingApi.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../config/env";

const TOKEN_KEY = "auth_token";
const AQUA_CRATE_PACKING_PATH = "/api/aquaculture/crate-packing";
const AQUA_HARVEST_PATH = "/api/aquaculture/harvest";
const AQUA_QUALITY_PATH = "/api/aquaculture/quality-inspection";

export type AquaCrateInput = {
  crate_qr: string;
  weight: number;
  grade?: string;
  size_count_kg?: number;
};

export type AquaPackedCrate = {
  id?: number;
  crate_qr_id?: number;
  crate_qr?: string;
  crate_code?: string;
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

export type AquaCratePackingScanData = {
  harvest_id: number;
  pond_qr: string;

  farmer_name?: string;
  farm_name?: string;
  farm_code?: string;
  pond_name?: string;
  pond_id?: number | string;
  pond_code?: string;
  species?: string;

  // Quality Inspection values used by Aqua crate packing.
  abw_g?: number | null;
  size_count_kg?: number | null;
  grade?: string;
  quality_inspection_id?: number | null;
  quality_inspected_at?: string | null;

  expected_biomass?: number | null;
  trader_name?: string;
  trader_code?: string;

  crates: AquaPackedCrate[];
  raw?: any;
};

export type AquaSubmitResult = {
  ok: boolean;
  message: string;
  data?: any;
  raw?: any;
};

function apiUrl(path: string) {
  const base = String(API_BASE || "").replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // Prevent /api/api/... when API_BASE already ends with /api.
  if (base.endsWith("/api") && cleanPath.startsWith("/api/")) {
    return `${base}${cleanPath.replace(/^\/api/, "")}`;
  }

  return `${base}${cleanPath}`;
}

async function authHeaders() {
  const token =
    (await AsyncStorage.getItem(TOKEN_KEY)) ||
    (await AsyncStorage.getItem("token")) ||
    "";

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(data: any, fallback: string, status?: number) {
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }
  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error;
  }
  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
  }
  if (Array.isArray(data?.message)) return data.message.join(" | ");
  if (Array.isArray(data?.error)) return data.error.join(" | ");

  return status ? `HTTP ${status}: ${fallback}` : fallback;
}

async function requestJson<T = any>(
  path: string,
  options?: { method?: "GET" | "POST"; body?: any }
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: options?.method || "GET",
    headers: await authHeaders(),
    ...(options?.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });

  const data = await safeJson(response);

  if (
    !response.ok ||
    data?.success === false ||
    data?.ok === false
  ) {
    throw new Error(
      getErrorMessage(data, "Aqua crate packing request failed", response.status)
    );
  }

  return data as T;
}

function unwrapObject(data: any): any {
  if (!data) return {};

  const one =
    data?.data ??
    data?.result ??
    data?.item ??
    data?.record ??
    data?.harvest ??
    data;

  // Some APIs use { data: { data: {...} } }.
  if (one && !Array.isArray(one) && one?.data && !Array.isArray(one.data)) {
    return one.data;
  }

  return one || {};
}

function extractArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;

  const candidates = [
    data?.data,
    data?.result,
    data?.items,
    data?.records,
    data?.rows,
    data?.crates,
    data?.inspections,
    data?.quality_inspections,
    data?.qualityInspections,
    data?.data?.data,
    data?.data?.items,
    data?.data?.records,
    data?.data?.rows,
    data?.data?.crates,
    data?.data?.inspections,
    data?.data?.quality_inspections,
    data?.data?.qualityInspections,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) return value as T[];
  }

  return [];
}

function firstValue(...values: any[]) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );
}

function textOrEmpty(...values: any[]) {
  const value = firstValue(...values);
  return value === undefined || value === null ? "" : String(value).trim();
}

function toNumberOrNull(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toPositiveNumberOrNull(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normCode(value: any) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function dateMs(value: any): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Pick the newest usable Quality Inspection.
 * Prefer CHECKED. If the backend does not persist/return CHECKED status,
 * fall back to the newest non-REJECTED inspection for the same harvest.
 */
function pickLatestQualityInspection(rows: any[]): any | null {
  if (!Array.isArray(rows) || !rows.length) return null;

  const sortLatest = (list: any[]) =>
    [...list].sort((a, b) => {
      const aMs = Math.max(
        dateMs(a?.inspected_at ?? a?.inspectedAt),
        dateMs(a?.updated_at ?? a?.updatedAt),
        dateMs(a?.created_at ?? a?.createdAt)
      );
      const bMs = Math.max(
        dateMs(b?.inspected_at ?? b?.inspectedAt),
        dateMs(b?.updated_at ?? b?.updatedAt),
        dateMs(b?.created_at ?? b?.createdAt)
      );

      if (aMs !== bMs) return bMs - aMs;
      return Number(b?.id || 0) - Number(a?.id || 0);
    });

  const checked = rows.filter((row) => {
    const status = String(
      row?.inspection_status ?? row?.inspectionStatus ?? row?.status ?? ""
    )
      .trim()
      .toUpperCase();
    return status === "CHECKED";
  });

  if (checked.length) return sortLatest(checked)[0];

  const nonRejected = rows.filter((row) => {
    const status = String(
      row?.inspection_status ?? row?.inspectionStatus ?? row?.status ?? ""
    )
      .trim()
      .toUpperCase();
    return status !== "REJECTED";
  });

  return sortLatest(nonRejected.length ? nonRejected : rows)[0] || null;
}

function inspectionFromScan(scanRaw: any): any | null {
  const scan = unwrapObject(scanRaw || {});

  const candidates = [
    scan?.quality_inspection,
    scan?.latest_quality_inspection,
    scan?.latest_checked_quality_inspection,
    scan?.inspection,
    scan?.qualityInspection,
    scan?.quality,
    scan?.prefill?.quality_inspection,
    scan?.prefill?.inspection,
    scan?.data?.quality_inspection,
    scan?.data?.inspection,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate;
    }
  }

  // Some crate-packing scan responses flatten quality fields at the top level.
  const hasQualityFields =
    firstValue(
      scan?.abw_g,
      scan?.abw,
      scan?.average_body_weight,
      scan?.sample_count,
      scan?.sample_weight,
      scan?.size_count_kg,
      scan?.quality_inspection_id
    ) !== undefined;

  return hasQualityFields ? scan : null;
}

function normalizePackedCrate(row: any, harvestId: number): AquaPackedCrate {
  const crateCode = normCode(
    firstValue(row?.crate_qr, row?.crateQr, row?.crate_code, row?.crateCode)
  );

  return {
    id: toPositiveNumberOrNull(row?.id) ?? undefined,
    crate_qr_id: toPositiveNumberOrNull(row?.crate_qr_id ?? row?.crateQrId) ?? undefined,
    crate_qr: crateCode,
    crate_code: crateCode,
    pond_qr_code: textOrEmpty(row?.pond_qr_code, row?.pondQrCode),
    harvest_id:
      toPositiveNumberOrNull(row?.harvest_id ?? row?.harvestId) ?? harvestId,
    quality_inspection_id:
      toPositiveNumberOrNull(
        row?.quality_inspection_id ?? row?.qualityInspectionId
      ) ?? undefined,
    species: textOrEmpty(row?.species),
    size_count_kg:
      toNumberOrNull(row?.size_count_kg ?? row?.sizeCountKg) ?? undefined,
    weight_kg:
      toNumberOrNull(row?.weight_kg ?? row?.weightKg ?? row?.weight) ?? undefined,
    grade: textOrEmpty(row?.grade).toUpperCase(),
    crate_packer_id:
      toPositiveNumberOrNull(row?.crate_packer_id ?? row?.cratePackerId) ?? undefined,
    trader_id:
      toPositiveNumberOrNull(row?.trader_id ?? row?.traderId) ?? undefined,
    gps_latitude:
      toNumberOrNull(row?.gps_latitude ?? row?.gpsLatitude) ?? undefined,
    gps_longitude:
      toNumberOrNull(row?.gps_longitude ?? row?.gpsLongitude) ?? undefined,
    packing_status: textOrEmpty(row?.packing_status, row?.packingStatus, row?.status),
    packed_at: textOrEmpty(row?.packed_at, row?.packedAt, row?.created_at),
    raw: row,
  };
}

export async function listAquaHarvestPackedCrates(
  harvestIdValue: number | string
): Promise<AquaPackedCrate[]> {
  const harvestId = toPositiveNumberOrNull(harvestIdValue);
  if (!harvestId) throw new Error("Valid Harvest ID is required.");

  const response = await requestJson<any>(
    `${AQUA_CRATE_PACKING_PATH}/harvest/${harvestId}/crates`
  );

  return extractArray<any>(response).map((row) =>
    normalizePackedCrate(row, harvestId)
  );
}

async function getHarvestById(harvestId: number) {
  const response = await requestJson<any>(`${AQUA_HARVEST_PATH}/${harvestId}`);
  return unwrapObject(response);
}

async function getLatestQualityInspection(
  harvestId: number,
  scanRaw?: any
) {
  const scanInspection = inspectionFromScan(scanRaw);
  let latest: any | null = null;

  // 1) Prefer the documented CHECKED filter.
  try {
    const checkedResponse = await requestJson<any>(
      `${AQUA_QUALITY_PATH}?harvest_id=${encodeURIComponent(
        String(harvestId)
      )}&inspection_status=CHECKED`
    );

    latest = pickLatestQualityInspection(extractArray<any>(checkedResponse));
  } catch {
    // Continue with the harvest-wide fallback below.
  }

  // 2) Some backend builds do not return/persist CHECKED in the list response.
  //    In that case, get the latest non-REJECTED inspection for this harvest.
  if (!latest) {
    try {
      const allResponse = await requestJson<any>(
        `${AQUA_QUALITY_PATH}?harvest_id=${encodeURIComponent(String(harvestId))}`
      );

      latest = pickLatestQualityInspection(extractArray<any>(allResponse));
    } catch {
      // Continue with the crate-packing scan payload.
    }
  }

  // 3) The crate-packing scan endpoint already validates that quality inspection
  //    is completed. Reuse its quality data when the list endpoint has no row.
  latest = latest || scanInspection;

  if (!latest) return null;

  const inspectionId = toPositiveNumberOrNull(
    firstValue(
      latest?.id,
      latest?.quality_inspection_id,
      scanInspection?.id,
      scanInspection?.quality_inspection_id
    )
  );

  // 4) Load the full inspection when possible because list/scan responses may be summaries.
  if (inspectionId) {
    try {
      const detailResponse = await requestJson<any>(
        `${AQUA_QUALITY_PATH}/${inspectionId}`
      );
      const detail = unwrapObject(detailResponse);

      if (detail && typeof detail === "object") {
        return {
          ...(scanInspection || {}),
          ...(latest || {}),
          ...detail,
        };
      }
    } catch {
      // Keep the data already resolved from list/scan.
    }
  }

  return {
    ...(scanInspection || {}),
    ...(latest || {}),
  };
}

function normalizePrefill(args: {
  scan?: any;
  harvest: any;
  inspection: any;
  crates: AquaPackedCrate[];
  forcedPondQr?: string;
}): AquaCratePackingScanData {
  const scan = unwrapObject(args.scan || {});
  const harvest = unwrapObject(args.harvest || {});
  const inspection = args.inspection || {};

  const harvestId = toPositiveNumberOrNull(
    firstValue(
      scan?.harvest_id,
      scan?.harvestId,
      harvest?.id,
      harvest?.harvest_id,
      harvest?.harvestId,
      inspection?.harvest_id
    )
  );

  if (!harvestId) {
    throw new Error("Harvest ID is missing from Aqua prefill response.");
  }

  const pondQr = normCode(
    firstValue(
      args.forcedPondQr,
      scan?.pond_qr,
      scan?.pond_qr_scan,
      scan?.pondQr,
      harvest?.qr_code,
      harvest?.pond_qr,
      harvest?.pondQr,
      inspection?.pond_qr_scan,
      inspection?.pond_qr,
      harvest?.pond_code
    )
  );

  // Quality values: prefer the resolved QualityInspection record, then the
  // successful crate-packing scan payload (which may flatten the same values).
  const inspectionSampleCount = toPositiveNumberOrNull(
    firstValue(
      inspection?.sample_count,
      inspection?.sampleCount,
      scan?.sample_count,
      scan?.sampleCount
    )
  );

  const inspectionSampleWeight = toPositiveNumberOrNull(
    firstValue(
      inspection?.sample_weight,
      inspection?.sampleWeight,
      inspection?.sample_weight_g,
      scan?.sample_weight,
      scan?.sampleWeight,
      scan?.sample_weight_g
    )
  );

  const storedInspectionAbw = toPositiveNumberOrNull(
    firstValue(
      inspection?.abw_g,
      inspection?.abw,
      inspection?.average_body_weight,
      inspection?.average_body_weight_g,
      scan?.abw_g,
      scan?.abw,
      scan?.average_body_weight,
      scan?.average_body_weight_g
    )
  );

  const storedInspectionSize = toPositiveNumberOrNull(
    firstValue(
      inspection?.size_count_kg,
      inspection?.sizeCountKg,
      inspection?.size_count_per_kg,
      inspection?.size_count,
      inspection?.size,
      scan?.size_count_kg,
      scan?.sizeCountKg,
      scan?.size_count_per_kg,
      scan?.size_count,
      scan?.size
    )
  );

  // Canonical ABW first. If an older inspection did not persist abw_g, use the
  // same inspection's sample measurements. As a final compatibility fallback,
  // invert the quality Size Count/kg value returned by the scan/list endpoint.
  const qualityAbwG =
    storedInspectionAbw ??
    (inspectionSampleCount && inspectionSampleWeight
      ? Number((inspectionSampleWeight / inspectionSampleCount).toFixed(4))
      : storedInspectionSize
        ? Number((1000 / storedInspectionSize).toFixed(4))
        : null);

  const qualitySizeCountKg =
    storedInspectionSize ??
    (qualityAbwG
      ? Number((1000 / qualityAbwG).toFixed(4))
      : null);

  return {
    harvest_id: harvestId,
    pond_qr: pondQr,

    farmer_name: textOrEmpty(
      scan?.farmer_name,
      scan?.farmerName,
      harvest?.farmer_name,
      harvest?.farmerName,
      harvest?.farmer?.name,
      harvest?.farmer?.full_name,
      harvest?.user?.name,
      harvest?.user?.full_name
    ),
    farm_name: textOrEmpty(
      scan?.farm_name,
      scan?.farmName,
      harvest?.farm_name,
      harvest?.farmName,
      harvest?.farm?.name,
      harvest?.farm?.farm_name
    ),
    farm_code: textOrEmpty(scan?.farm_code, harvest?.farm_code, harvest?.farm?.farm_code),
    pond_name: textOrEmpty(
      scan?.pond_name,
      scan?.pondName,
      harvest?.pond_name,
      harvest?.pondName,
      harvest?.pond?.name,
      harvest?.pond?.pond_name
    ),
    pond_id:
      firstValue(
        scan?.pond_id,
        scan?.pondId,
        harvest?.pond_id,
        harvest?.pondId,
        harvest?.pond?.id,
        inspection?.pond_id
      ) ?? "",
    pond_code: textOrEmpty(
      scan?.pond_code,
      harvest?.pond_code,
      harvest?.pond?.pond_code,
      pondQr
    ),
    species: textOrEmpty(
      scan?.species,
      harvest?.species,
      harvest?.species_name,
      harvest?.speciesName,
      inspection?.species
    ),

    abw_g: qualityAbwG,
    size_count_kg: qualitySizeCountKg,
    grade: textOrEmpty(inspection?.grade, scan?.grade).toUpperCase(),
    quality_inspection_id: toPositiveNumberOrNull(
      firstValue(
        inspection?.id,
        inspection?.quality_inspection_id,
        scan?.quality_inspection_id,
        scan?.qualityInspectionId
      )
    ),
    quality_inspected_at:
      textOrEmpty(
        inspection?.inspected_at,
        inspection?.inspectedAt,
        inspection?.updated_at,
        inspection?.created_at,
        scan?.inspected_at,
        scan?.quality_inspected_at
      ) || null,

    expected_biomass: toNumberOrNull(
      firstValue(scan?.expected_biomass, harvest?.expected_biomass, inspection?.expected_biomass)
    ),
    trader_name: textOrEmpty(scan?.trader_name, harvest?.trader_name, harvest?.trader?.name),
    trader_code: textOrEmpty(scan?.trader_code, harvest?.trader_code, harvest?.trader?.code),

    crates: args.crates,
    raw: {
      scan,
      harvest,
      latest_quality_inspection: inspection,
      latest_checked_quality_inspection: inspection,
    },
  };
}

/**
 * Main prefill function.
 * - With Pond QR: calls Aqua crate-packing scan endpoint first to resolve Harvest ID.
 * - With Harvest ID: loads the Harvest directly.
 * - In both cases: resolves the latest usable quality inspection and packed crates.
 */
export async function fetchAquaHarvestPrefill(params: {
  pondQr?: string;
  harvestId?: number | string;
  cratePackerId?: number | null;
  cratePackerCode?: string;
}): Promise<AquaCratePackingScanData> {
  const pondQr = normCode(params.pondQr);
  let harvestId = toPositiveNumberOrNull(params.harvestId);
  let scanRaw: any = {};

  if (!pondQr && !harvestId) {
    throw new Error("Scan Pond QR or enter Harvest ID.");
  }

  if (pondQr) {
    const query = new URLSearchParams();
    if (harvestId) query.set("harvest_id", String(harvestId));
    if (params.cratePackerId) query.set("crate_packer_id", String(params.cratePackerId));
    if (params.cratePackerCode?.trim()) {
      query.set("crate_packer_code", params.cratePackerCode.trim());
    }

    const suffix = query.toString() ? `?${query.toString()}` : "";
    const scanResponse = await requestJson<any>(
      `${AQUA_CRATE_PACKING_PATH}/scan/${encodeURIComponent(pondQr)}${suffix}`
    );

    scanRaw = unwrapObject(scanResponse);
    harvestId =
      toPositiveNumberOrNull(
        firstValue(
          scanRaw?.harvest_id,
          scanRaw?.harvestId,
          scanRaw?.harvest?.id,
          scanRaw?.data?.harvest_id
        )
      ) ?? harvestId;
  }

  if (!harvestId) {
    throw new Error("No booked Harvest ID was resolved for this Pond QR.");
  }

  const [harvest, inspection, crates] = await Promise.all([
    getHarvestById(harvestId),
    getLatestQualityInspection(harvestId, scanRaw),
    listAquaHarvestPackedCrates(harvestId),
  ]);

  // Do not block a successful crate-packing Pond QR scan only because the
  // quality-inspection list endpoint did not return a CHECKED row. The scan
  // endpoint itself validates that quality inspection is completed, and its
  // payload is also used as the quality-data fallback above.

  return normalizePrefill({
    scan: scanRaw,
    harvest,
    inspection,
    crates,
    forcedPondQr: pondQr,
  });
}

// Backward-compatible function used by the existing Aqua dashboard.
export async function scanAquaPondForCratePacking(params: {
  pondQr: string;
  harvestId?: number | string;
  cratePackerId?: number | null;
  cratePackerCode?: string;
}): Promise<AquaCratePackingScanData> {
  return fetchAquaHarvestPrefill({
    pondQr: params.pondQr,
    harvestId: params.harvestId,
    cratePackerId: params.cratePackerId,
    cratePackerCode: params.cratePackerCode,
  });
}

export async function submitAquaCratePacking(params: {
  pondQr: string;
  harvestId: number | string;
  cratePackerId?: number | null;
  cratePackerCode?: string;
  crates: AquaCrateInput[];
  gpsLatitude?: number;
  gpsLongitude?: number;
  remarks?: string;
}): Promise<AquaSubmitResult> {
  const pondQr = normCode(params.pondQr);
  const harvestId = toPositiveNumberOrNull(params.harvestId);

  if (!pondQr) throw new Error("Pond QR is required.");
  if (!harvestId) throw new Error("Valid Harvest ID is required.");
  if (!Array.isArray(params.crates) || !params.crates.length) {
    throw new Error("Add at least one crate.");
  }

  const crates = params.crates.map((crate) => {
    const crateQr = normCode(crate?.crate_qr);
    const weight = Number(crate?.weight);
    const grade = String(crate?.grade || "").trim().toUpperCase();

    if (!crateQr) throw new Error("Crate QR is required.");
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error(`Valid weight is required for crate ${crateQr}.`);
    }
    if (!grade || !["A", "B", "C", "D"].includes(grade)) {
      throw new Error(`Valid grade A/B/C/D is required for crate ${crateQr}.`);
    }

    return {
      crate_qr: crateQr,
      weight: Number(weight.toFixed(2)),
      grade,
      ...(Number.isFinite(Number(crate?.size_count_kg))
        ? { size_count_kg: Number(crate.size_count_kg) }
        : {}),
    };
  });

  const body = {
    pond_qr: pondQr,
    harvest_id: harvestId,
    ...(params.cratePackerId
      ? { crate_packer_id: Number(params.cratePackerId) }
      : {}),
    ...(params.cratePackerCode?.trim()
      ? { crate_packer_code: params.cratePackerCode.trim() }
      : {}),
    ...(Number.isFinite(params.gpsLatitude as number)
      ? { gps_latitude: params.gpsLatitude }
      : {}),
    ...(Number.isFinite(params.gpsLongitude as number)
      ? { gps_longitude: params.gpsLongitude }
      : {}),
    packed_at: new Date().toISOString(),
    ...(params.remarks?.trim() ? { remarks: params.remarks.trim() } : {}),
    crates,
  };

  const response = await requestJson<any>(AQUA_CRATE_PACKING_PATH, {
    method: "POST",
    body,
  });

  return {
    ok: true,
    message:
      textOrEmpty(response?.message, response?.data?.message) ||
      "Crates packed successfully.",
    data: unwrapObject(response),
    raw: response,
  };
}