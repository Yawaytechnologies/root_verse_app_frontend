// src/store/quality/qrDetails.slice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { httpJson } from "../../services/http";
import type { RootState } from "../auth/store";

export type CatchLogDetails = {
  code: string;
  type: string;

  /**
   * Normalized status so UI can rely on it:
   * - "FILLED" means already submitted/final
   * - "NEW" means not submitted yet
   * - fallback to other values if backend sends something unexpected
   */
  status: string;

  vessel_name?: string | null;
  fish_name?: string | null;
  weight?: string | null;
  date?: string | null;
  time?: string | null;
  image_url?: string | null;

  rv_vessel_id?: number | null;
  fish_id?: number | null;

  // AQUA quality inspection prefill / traceability fields
  harvest_id?: string | number | null;
  farmer_id?: string | number | null;
  user_id?: string | number | null;
  trader_id?: string | number | null;
  farm_id?: string | number | null;
  pond_id?: string | number | null;
  culture_id?: string | number | null;

  farmer_name?: string | null;
  farm_name?: string | null;
  pond_name?: string | null;
  species?: string | null;

  sample_count?: string | number | null;
  sample_weight?: string | number | null;
  abw_g?: string | number | null;
  size_count_kg?: string | number | null;

  inspection_latitude?: number | null;
  inspection_longitude?: number | null;

  raw?: any;
};

type ApiAnyResponse = {
  success?: boolean;
  qr?: any;
  data?: any;
  result?: any;
};

type State = {
  data: CatchLogDetails | null;
  loading: boolean;
  error: string | null;
};

const initialState: State = {
  data: null,
  loading: false,
  error: null,
};

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function normalizeQr(raw: string) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeStatus(q: any): string {
  const rawStatus = upper(q?.status);

  // Direct known statuses from API
  if (rawStatus === "NEW") return "NEW";
  if (rawStatus === "FILLED") return "FILLED";

  // Often backends use qc_status/qc_result instead of status
  const qcStatus = upper(q?.qc_status ?? q?.qcStatus);
  const qcResult = upper(q?.qc_result ?? q?.qcResult);

  // If QC fields exist, it's already processed/submitted.
  // Treat as FILLED so UI blocks submission consistently.
  if (qcStatus || qcResult) return "FILLED";

  // Some APIs return these final states in status
  const FINAL = new Set([
    "CHECKED",
    "APPROVED",
    "SUBMITTED",
    "COMPLETED",
    "DONE",
    "REJECTED",
  ]);
  if (FINAL.has(rawStatus)) return "FILLED";

  return rawStatus || "UNKNOWN";
}

function mapToCatchLog(q: any): CatchLogDetails {
  return {
    code: normalizeQr(String(q?.code ?? "")),
    type: String(q?.type ?? ""),
    status: normalizeStatus(q),

    vessel_name: q?.vessel_name ?? q?.vessel?.vessel_name ?? null,
    fish_name: q?.fish_name ?? q?.fish?.fish_name ?? null,
    weight: q?.weight ?? null,
    date: q?.date ?? null,
    time: q?.time ?? null,
    image_url: q?.image_url ?? null,

    rv_vessel_id: q?.rv_vessel_id ?? null,
    fish_id: q?.fish_id ?? null,
  };
}

type FetchArg =
  | string
  | {
      qrCode: string;
      mode?: "AUTO" | "FILLED_ONLY";
      division?: "WILD" | "AQUA" | "MARICULTURE" | string;
    };

function numOrNull(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function firstValue(...values: any[]) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    return value;
  }
  return null;
}


function unwrapHarvestDetail(raw: any): any {
  const root = raw?.data ?? raw?.result ?? raw ?? {};

  if (root?.harvest && typeof root.harvest === "object") return root.harvest;
  if (root?.record && typeof root.record === "object") return root.record;
  if (root?.item && typeof root.item === "object") return root.item;

  return root && typeof root === "object" && !Array.isArray(root) ? root : {};
}

function enrichAquaScanWithHarvest(
  scan: CatchLogDetails,
  harvestRaw: any
): CatchLogDetails {
  const h = unwrapHarvestDetail(harvestRaw);

  const farmer =
    h?.farmer ??
    h?.user ??
    h?.owner ??
    h?.farmer_details ??
    h?.farmerDetails ??
    {};

  const farm = h?.farm ?? h?.farm_details ?? h?.farmDetails ?? {};
  const pond = h?.pond ?? h?.pond_details ?? h?.pondDetails ?? {};

  const speciesName = firstValue(
    scan?.species,
    scan?.fish_name,
    typeof h?.species === "string" ? h.species : undefined,
    h?.species_name,
    h?.speciesName,
    h?.shrimp_species,
    h?.shrimp_species_name,
    h?.fish_name,
    h?.species?.name,
    h?.species?.species_name,
    h?.species?.common_name
  );

  const farmerId = firstValue(
    scan?.farmer_id,
    scan?.user_id,
    h?.user_id,
    h?.userId,
    h?.farmer_id,
    h?.farmerId,
    h?.owner_id,
    h?.ownerId,
    farmer?.id,
    farmer?.user_id,
    farmer?.farmer_id,
    farmer?.owner_id
  );

  const traderId = firstValue(
    scan?.trader_id,
    h?.trader_id,
    h?.traderId,
    h?.assigned_trader_id,
    h?.assignedTraderId,
    h?.booked_trader_id,
    h?.bookedTraderId,
    h?.trader?.id,
    h?.trader?.trader_id
  );

  return {
    ...scan,

    // Harvest.user_id is the farmer/rootverse user identifier in the
    // documented Harvest contract. Use it as Farmer ID when the scan
    // prefill itself does not expose farmer_id.
    farmer_id: farmerId,
    user_id: firstValue(scan?.user_id, h?.user_id, h?.userId, farmerId),
    trader_id: traderId,

    farm_id: firstValue(
      scan?.farm_id,
      h?.farm_id,
      h?.farmId,
      farm?.id,
      farm?.farm_id
    ),

    pond_id: firstValue(
      scan?.pond_id,
      h?.pond_id,
      h?.pondId,
      pond?.id,
      pond?.pond_id
    ),

    culture_id: firstValue(
      scan?.culture_id,
      h?.culture_id,
      h?.cultureId,
      h?.culture_cycle_id,
      h?.cultureCycleId
    ),

    farmer_name:
      scan?.farmer_name ??
      h?.farmer_name ??
      h?.farmerName ??
      farmer?.farmer_name ??
      farmer?.full_name ??
      farmer?.name ??
      null,

    farm_name:
      scan?.farm_name ??
      h?.farm_name ??
      h?.farmName ??
      farm?.farm_name ??
      farm?.name ??
      null,

    pond_name:
      scan?.pond_name ??
      h?.pond_name ??
      h?.pondName ??
      pond?.pond_name ??
      pond?.name ??
      null,

    fish_name: speciesName ?? null,
    species: speciesName ?? null,

    raw: {
      ...(scan?.raw && typeof scan.raw === "object" ? scan.raw : {}),
      _harvest_detail: harvestRaw,
    },
  };
}

function normalizeAquaScan(raw: any, code: string): CatchLogDetails {
  const rootCandidate = raw?.data ?? raw?.result ?? raw ?? {};
  const root =
    rootCandidate?.prefill ??
    rootCandidate?.quality_inspection_prefill ??
    rootCandidate?.qualityInspectionPrefill ??
    rootCandidate;

  const harvest =
    root?.harvest ??
    root?.harvest_record ??
    root?.harvestRecord ??
    root?.harvest_data ??
    {};

  const farm = root?.farm ?? root?.farm_data ?? harvest?.farm ?? {};
  const pond = root?.pond ?? root?.pond_data ?? harvest?.pond ?? {};
  const culture =
    root?.culture ??
    root?.culture_cycle ??
    root?.cultureCycle ??
    harvest?.culture_cycle ??
    {};
  const sampling =
    root?.latest_sampling ??
    root?.sampling ??
    root?.sampling_record ??
    root?.samplingRecord ??
    harvest?.latest_sampling ??
    {};
  const farmer =
    root?.farmer ??
    root?.user ??
    root?.owner ??
    harvest?.farmer ??
    harvest?.user ??
    harvest?.owner ??
    farm?.farmer ??
    farm?.user ??
    farm?.owner ??
    {};

  const trader =
    root?.trader ??
    root?.assigned_trader ??
    root?.booked_trader ??
    harvest?.trader ??
    harvest?.assigned_trader ??
    harvest?.booked_trader ??
    {};

  const speciesObj =
    root?.species_data ??
    root?.species_detail ??
    root?.speciesDetail ??
    harvest?.species_data ??
    harvest?.species_detail ??
    culture?.species_data ??
    culture?.species_detail ??
    {};

  const status = normalizeStatus(root);
  const finalStatus = status === "UNKNOWN" ? "NEW" : status;

  const sampleCount = firstValue(
    root?.sample_count,
    sampling?.sample_count,
    sampling?.sampleCount
  );

  const sampleWeight = firstValue(
    root?.sample_weight,
    root?.sample_weight_g,
    sampling?.sample_weight,
    sampling?.sample_weight_g,
    sampling?.sampleWeight
  );

  const sampleCountNumber = numOrNull(sampleCount);
  const sampleWeightNumber = numOrNull(sampleWeight);

  const calculatedAbw =
    sampleCountNumber !== null &&
    sampleCountNumber > 0 &&
    sampleWeightNumber !== null
      ? sampleWeightNumber / sampleCountNumber
      : null;

  const abwG = firstValue(
    root?.abw_g,
    root?.abw,
    root?.average_body_weight,
    sampling?.abw_g,
    sampling?.abw,
    sampling?.ABW,
    calculatedAbw
  );

  const abwNumber = numOrNull(abwG);

  const calculatedSize =
    abwNumber !== null && abwNumber > 0 ? 1000 / abwNumber : null;

  const sizeCountKg = firstValue(
    root?.size_count_kg,
    root?.size_count_per_kg,
    root?.size_count,
    root?.size,
    sampling?.size_count_kg,
    sampling?.size_count_per_kg,
    sampling?.size_count,
    sampling?.size,
    calculatedSize
  );

  const farmerId = firstValue(
    root?.farmer_id,
    root?.farmerId,
    root?.user_id,
    root?.userId,
    root?.owner_id,
    root?.ownerId,
    harvest?.farmer_id,
    harvest?.farmerId,
    harvest?.user_id,
    harvest?.userId,
    harvest?.owner_id,
    harvest?.ownerId,
    farm?.farmer_id,
    farm?.farmerId,
    farm?.user_id,
    farm?.userId,
    farm?.owner_id,
    farm?.ownerId,
    farmer?.id,
    farmer?.farmer_id,
    farmer?.farmerId,
    farmer?.user_id,
    farmer?.userId,
    farmer?.owner_id,
    farmer?.ownerId
  );

  const traderId = firstValue(
    root?.trader_id,
    root?.traderId,
    root?.assigned_trader_id,
    root?.assignedTraderId,
    root?.booked_trader_id,
    root?.bookedTraderId,
    harvest?.trader_id,
    harvest?.traderId,
    harvest?.assigned_trader_id,
    harvest?.assignedTraderId,
    harvest?.booked_trader_id,
    harvest?.bookedTraderId,
    trader?.id,
    trader?.trader_id,
    trader?.traderId
  );

  const speciesName = firstValue(
    root?.species_name,
    root?.speciesName,
    root?.shrimp_species_name,
    root?.shrimpSpeciesName,
    typeof root?.species === "string" ? root.species : undefined,
    typeof root?.shrimp_species === "string" ? root.shrimp_species : undefined,
    harvest?.species_name,
    harvest?.speciesName,
    harvest?.shrimp_species_name,
    harvest?.shrimpSpeciesName,
    harvest?.fish_name,
    typeof harvest?.species === "string" ? harvest.species : undefined,
    culture?.species_name,
    culture?.speciesName,
    culture?.shrimp_species_name,
    culture?.shrimpSpeciesName,
    typeof culture?.species === "string" ? culture.species : undefined,
    sampling?.species_name,
    sampling?.speciesName,
    sampling?.shrimp_species_name,
    sampling?.shrimpSpeciesName,
    typeof sampling?.species === "string" ? sampling.species : undefined,
    root?.species?.name,
    root?.species?.species_name,
    harvest?.species?.name,
    harvest?.species?.species_name,
    culture?.species?.name,
    culture?.species?.species_name,
    speciesObj?.name,
    speciesObj?.species_name,
    speciesObj?.common_name
  );

  return {
    code: normalizeQr(
      String(
        root?.pond_qr_scan ??
          root?.pond_qr ??
          root?.qr_code ??
          root?.qrs_code ??
          root?.code ??
          code
      )
    ),
    type: "pond",
    status: finalStatus,

    harvest_id: firstValue(
      root?.harvest_id,
      root?.harvestId,
      harvest?.id,
      harvest?.harvest_id
    ),

    farmer_id: farmerId,
    user_id: firstValue(
      root?.user_id,
      root?.userId,
      root?.owner_id,
      root?.ownerId,
      harvest?.user_id,
      harvest?.userId,
      harvest?.owner_id,
      harvest?.ownerId,
      farm?.user_id,
      farm?.owner_id,
      farmer?.id,
      farmerId
    ),

    trader_id: traderId,

    farm_id: firstValue(
      root?.farm_id,
      root?.farmId,
      harvest?.farm_id,
      harvest?.farmId,
      farm?.id,
      farm?.farm_id
    ),

    pond_id: firstValue(
      root?.pond_id,
      root?.pondId,
      harvest?.pond_id,
      harvest?.pondId,
      pond?.id,
      pond?.pond_id
    ),

    culture_id: firstValue(
      root?.culture_id,
      root?.culture_cycle_id,
      root?.cultureCycleId,
      harvest?.culture_id,
      harvest?.culture_cycle_id,
      culture?.id,
      culture?.culture_id
    ),

    farmer_name:
      root?.farmer_name ??
      farmer?.farmer_name ??
      farmer?.full_name ??
      farmer?.name ??
      null,

    farm_name:
      root?.farm_name ??
      harvest?.farm_name ??
      farm?.farm_name ??
      farm?.name ??
      null,

    pond_name:
      root?.pond_name ??
      harvest?.pond_name ??
      pond?.pond_name ??
      pond?.name ??
      null,

    fish_name: speciesName ?? null,

    species: speciesName ?? null,

    sample_count: sampleCount,
    sample_weight: sampleWeight,
    abw_g: abwG,
    size_count_kg: sizeCountKg,

    inspection_latitude: numOrNull(
      firstValue(
        root?.inspection_latitude,
        root?.latitude,
        pond?.latitude,
        farm?.latitude
      )
    ),

    inspection_longitude: numOrNull(
      firstValue(
        root?.inspection_longitude,
        root?.longitude,
        pond?.longitude,
        farm?.longitude
      )
    ),

    raw,
  };
}

// ✅ PRE-SUBMIT DETAILS FLOW:
// 1) /api/filled/:code  (works after QC submit)
// 2) /api/qrs/status/NEW/code/:code (works before submit)
export const fetchCatchLogByQr = createAsyncThunk<
  CatchLogDetails,
  FetchArg,
  { rejectValue: string }
>("qrDetails/fetchCatchLogByQr", async (arg, { rejectWithValue }) => {
  try {
    const qrCode = typeof arg === "string" ? arg : arg?.qrCode;
    const mode = typeof arg === "string" ? "AUTO" : arg?.mode ?? "AUTO";
    const division = typeof arg === "string" ? "" : upper(arg?.division);

    const code = normalizeQr(qrCode || "");
    if (!code) return rejectWithValue("QR_CODE_REQUIRED");

    if (division === "AQUA") {
      const res = await httpJson<ApiAnyResponse>(
        `/api/aquaculture/quality-inspection/scan/${encodeURIComponent(code)}`,
        { method: "GET" }
      );

      const data = res?.data ?? res?.qr ?? res;
      if (!data) return rejectWithValue("AQUA_QR_NOT_FOUND");

      // First normalize the dedicated Quality Inspection scan response.
      const scan = normalizeAquaScan(res, code);

      // IMPORTANT:
      // The scan prefill may contain Farm/Pond/Harvest IDs but omit Farmer ID,
      // Species or Trader ID. The Harvest contract contains canonical user_id,
      // species and trader_id, so enrich only missing traceability values from
      // the already-linked Harvest ID. This does not change the existing scan
      // or submit flow.
      const harvestId = scan?.harvest_id;

      if (harvestId !== undefined && harvestId !== null && String(harvestId).trim()) {
        try {
          const harvestRes = await httpJson<any>(
            `/api/aquaculture/harvest/${encodeURIComponent(String(harvestId))}`,
            { method: "GET" }
          );

          return enrichAquaScanWithHarvest(scan, harvestRes);
        } catch {
          // Do not break Quality Inspection if the enrichment request fails.
          // Existing scan data remains usable.
          return scan;
        }
      }

      return scan;
    }

    const tryFetch = async (path: string) => {
      const res = await httpJson<ApiAnyResponse>(path, { method: "GET" });
      return res?.qr ?? res?.data ?? null;
    };

    let q = await tryFetch(`/api/filled/${encodeURIComponent(code)}`).catch(
      () => null
    );

    if (mode === "FILLED_ONLY") {
      if (!q) return rejectWithValue("ONLY_SUBMITTED_ALLOWED");
      return mapToCatchLog(q);
    }

    if (!q) {
      q = await tryFetch(
        `/api/qrs/status/NEW/code/${encodeURIComponent(code)}`
      ).catch(() => null);
    }

    if (!q) return rejectWithValue("QR not found");

    return mapToCatchLog(q);
  } catch (e: any) {
    return rejectWithValue(e?.message || "Failed to fetch QR details");
  }
});

const slice = createSlice({
  name: "qrDetails",
  initialState,
  reducers: {
    clearCatchLog(state) {
      state.data = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchCatchLogByQr.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchCatchLogByQr.fulfilled, (s, a) => {
      s.loading = false;
      s.data = a.payload;
    });
    b.addCase(fetchCatchLogByQr.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || "Failed";
    });
  },
});

export const { clearCatchLog } = slice.actions;
export default slice.reducer;

export const selectQrDetailsState = (state: RootState): State =>
  ((state as any).qrDetails as State) ?? initialState;

export const selectCatchLog = (state: RootState) =>
  selectQrDetailsState(state).data;

export const selectCatchLogLoading = (state: RootState) =>
  selectQrDetailsState(state).loading;

export const selectCatchLogError = (state: RootState) =>
  selectQrDetailsState(state).error;