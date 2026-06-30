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
};

type ApiAnyResponse = {
  success?: boolean;
  qr?: any;
  data?: any;
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

function normalizeAquaScan(raw: any, code: string): CatchLogDetails {
  const root = raw?.data ?? raw?.result ?? raw ?? {};

  const harvest =
    root?.harvest ??
    root?.harvest_record ??
    root?.harvestRecord ??
    root?.harvest_data ??
    {};

  const farm = root?.farm ?? root?.farm_data ?? {};
  const pond = root?.pond ?? root?.pond_data ?? {};
  const culture = root?.culture ?? root?.culture_cycle ?? root?.cultureCycle ?? {};

  const status = normalizeStatus(root);
  const finalStatus = status === "UNKNOWN" ? "NEW" : status;

  return {
    code: normalizeQr(
      String(
        root?.pond_qr_scan ??
          root?.qr_code ??
          root?.qrs_code ??
          root?.code ??
          code
      )
    ),
    type: "pond",
    status: finalStatus,

    harvest_id:
      root?.harvest_id ??
      root?.harvestId ??
      harvest?.id ??
      harvest?.harvest_id ??
      null,

    farm_id: root?.farm_id ?? farm?.id ?? null,
    pond_id: root?.pond_id ?? pond?.id ?? null,
    culture_id:
      root?.culture_id ??
      root?.culture_cycle_id ??
      culture?.id ??
      culture?.culture_id ??
      null,

    farm_name: root?.farm_name ?? farm?.farm_name ?? farm?.name ?? null,
    pond_name: root?.pond_name ?? pond?.pond_name ?? pond?.name ?? null,

    fish_name:
      root?.species ??
      root?.shrimp_species ??
      harvest?.species ??
      culture?.species ??
      null,

    species:
      root?.species ??
      root?.shrimp_species ??
      harvest?.species ??
      culture?.species ??
      null,

    sample_count:
      root?.sample_count ??
      root?.latest_sampling?.sample_count ??
      root?.sampling?.sample_count ??
      null,

    sample_weight:
      root?.sample_weight ??
      root?.latest_sampling?.sample_weight ??
      root?.sampling?.sample_weight ??
      null,

    inspection_latitude: numOrNull(
      root?.inspection_latitude ?? root?.latitude ?? pond?.latitude ?? farm?.latitude
    ),

    inspection_longitude: numOrNull(
      root?.inspection_longitude ??
        root?.longitude ??
        pond?.longitude ??
        farm?.longitude
    ),

    raw,
  } as any;
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

      return normalizeAquaScan(res, code);
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

export const selectCatchLog = (state: RootState) => selectQrDetailsState(state).data;
export const selectCatchLogLoading = (state: RootState) =>
  selectQrDetailsState(state).loading;
export const selectCatchLogError = (state: RootState) => selectQrDetailsState(state).error;
