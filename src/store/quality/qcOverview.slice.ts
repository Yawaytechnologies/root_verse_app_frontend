// src/store/quality/qcOverview.slice.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../auth/store";

const TOKEN_KEY = "auth_token";
const BASE_URL = "https://rootverse-backend.onrender.com";

// ✅ Scan & View endpoint
// GET /api/filled/:code
const FILLED_OVERVIEW_ENDPOINT = (code: string) =>
  `/api/filled/${encodeURIComponent(code)}`;

export type FilledOverview = {
  code: string;

  // status
  status?: string; // FILLED / NEW etc

  // catch log
  trip_id?: string | number;
  owner_id?: string | number;
  rv_vessel_id?: string | number;

  vessel_name?: string;
  fish_name?: string;
  weight?: number | string;
  date?: string;
  time?: string;

  latitude?: number;
  longitude?: number;

  catch_images?: string[]; // urls (if backend returns)
  image_url?: string; // single url fallback

  // qc inspector
  quality_checker_id?: number;
  checker_code?: string;
  checker_name?: string;

  // qc fields
  qc_status?: string;
  qc_result?: string;
  quality_grade?: string;
  qr_reject_reason?: string;

  qc_score?: number;
  temperature_c?: number;
  sample_count?: number;

  odor_score?: number;
  gill_score?: number;
  eye_score?: number;
  firmness_score?: number;

  ice_present?: boolean;
  packaging_intact?: boolean;
  foreign_matter_found?: boolean;
  is_mixed_species?: boolean;
  is_contaminated?: boolean;
  is_damaged?: boolean;

  qc_remarks?: string;

  qc_images?: string[]; // urls (if backend returns)

  updated_at?: string;
  created_at?: string;
};

type State = {
  loading: boolean;
  error: string | null;
  data: FilledOverview | null;
};

const initialState: State = {
  loading: false,
  error: null,
  data: null,
};

function num(v: any): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function bool(v: any): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return undefined;
}

function arr(v: any): string[] | undefined {
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  return undefined;
}

/**
 * Robust normalizer because backend response shape may vary.
 * We try many common nests:
 *  - raw.data
 *  - raw.data.qr / raw.data.catchLog / raw.data.qc
 *  - raw.qr / raw.catchLog / raw.qc
 *  - or flat object
 */
function normalize(raw: any, code: string): FilledOverview {
  const root = raw?.data ?? raw ?? {};
  const qr = root?.qr ?? root?.qrs ?? root?.qr_data ?? root ?? {};
  const catchLog =
    root?.catchLog ??
    root?.catch_log ??
    root?.catch ??
    qr?.catchLog ??
    qr?.catch_log ??
    qr ??
    {};
  const qc =
    root?.qc ??
    root?.inspection ??
    root?.qc_fill ??
    root?.qcData ??
    qr?.qc ??
    qr?.inspection ??
    qr ??
    {};

  const status =
    qr?.status ??
    root?.status ??
    qc?.status ??
    catchLog?.status ??
    qr?.qr_status;

  return {
    code,
    status,

    trip_id: catchLog?.trip_id ?? qr?.trip_id ?? qc?.trip_id,
    owner_id: catchLog?.owner_id ?? qr?.owner_id ?? qc?.owner_id,
    rv_vessel_id: catchLog?.rv_vessel_id ?? qr?.rv_vessel_id ?? qc?.rv_vessel_id,

    vessel_name: catchLog?.vessel_name ?? qr?.vessel_name ?? catchLog?.rv_vessel_name,
    fish_name: catchLog?.fish_name ?? qr?.fish_name,
    weight: catchLog?.weight ?? catchLog?.weight_kg ?? qr?.weight ?? qr?.weight_kg,
    date: catchLog?.date ?? catchLog?.catch_date ?? qr?.date ?? qr?.catch_date,
    time: catchLog?.time ?? catchLog?.catch_time ?? qr?.time ?? qr?.catch_time,

    latitude: num(catchLog?.latitude ?? qr?.latitude),
    longitude: num(catchLog?.longitude ?? qr?.longitude),

    catch_images: arr(catchLog?.images ?? catchLog?.image_urls ?? qr?.images ?? qr?.image_urls),
    image_url: catchLog?.image_url ?? qr?.image_url ?? catchLog?.imageUrl ?? qr?.imageUrl,

    quality_checker_id: num(qc?.quality_checker_id ?? qr?.quality_checker_id ?? qc?.qc_id),
    checker_code: qc?.checker_code ?? qc?.quality_checker_code ?? qr?.checker_code ?? qr?.quality_checker_code,
    checker_name: qc?.checker_name ?? qc?.quality_checker_name ?? qr?.checker_name ?? qr?.quality_checker_name,

    qc_status: qc?.qc_status ?? qr?.qc_status,
    qc_result: qc?.qc_result ?? qr?.qc_result,
    quality_grade: qc?.quality_grade ?? qr?.quality_grade,
    qr_reject_reason: qc?.qr_reject_reason ?? qr?.qr_reject_reason,

    qc_score: num(qc?.qc_score ?? qr?.qc_score),
    temperature_c: num(qc?.temperature_c ?? qr?.temperature_c),
    sample_count: num(qc?.sample_count ?? qr?.sample_count),

    odor_score: num(qc?.odor_score ?? qr?.odor_score),
    gill_score: num(qc?.gill_score ?? qr?.gill_score),
    eye_score: num(qc?.eye_score ?? qr?.eye_score),
    firmness_score: num(qc?.firmness_score ?? qr?.firmness_score),

    ice_present: bool(qc?.ice_present ?? qr?.ice_present),
    packaging_intact: bool(qc?.packaging_intact ?? qr?.packaging_intact),
    foreign_matter_found: bool(qc?.foreign_matter_found ?? qr?.foreign_matter_found),
    is_mixed_species: bool(qc?.is_mixed_species ?? qr?.is_mixed_species),
    is_contaminated: bool(qc?.is_contaminated ?? qr?.is_contaminated),
    is_damaged: bool(qc?.is_damaged ?? qr?.is_damaged),

    qc_remarks: qc?.qc_remarks ?? qr?.qc_remarks ?? qc?.remarks ?? qr?.remarks,

    qc_images: arr(qc?.images ?? qc?.image_urls ?? qr?.qc_images),

    updated_at: qc?.updated_at ?? qr?.updated_at ?? root?.updated_at,
    created_at: qc?.created_at ?? qr?.created_at ?? root?.created_at,
  };
}

export const fetchQrOverviewByCode = createAsyncThunk<
  FilledOverview,
  string,
  { rejectValue: string }
>("qcOverview/fetchQrOverviewByCode", async (qrCode, { rejectWithValue }) => {
  try {
    const code = String(qrCode || "").trim();
    if (!code) return rejectWithValue("QR_CODE_REQUIRED");

    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return rejectWithValue("NO_AUTH_TOKEN");

    const url = `${BASE_URL}${FILLED_OVERVIEW_ENDPOINT(code)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await res.text();
    let raw: any = {};
    try {
      raw = text ? JSON.parse(text) : {};
    } catch {
      raw = { message: text };
    }

    if (!res.ok) {
      return rejectWithValue(
        raw?.message || raw?.error || `FILLED_FETCH_FAILED_${res.status}`
      );
    }

    return normalize(raw, code);
  } catch (e: any) {
    return rejectWithValue(e?.message || "FILLED_FETCH_FAILED");
  }
});

const slice = createSlice({
  name: "qcOverview",
  initialState,
  reducers: {
    clearQrOverview(state) {
      state.loading = false;
      state.error = null;
      state.data = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchQrOverviewByCode.pending, (s) => {
      s.loading = true;
      s.error = null;
      s.data = null;
    });
    b.addCase(fetchQrOverviewByCode.fulfilled, (s, a) => {
      s.loading = false;
      s.data = a.payload;
    });
    b.addCase(fetchQrOverviewByCode.rejected, (s, a) => {
      s.loading = false;
      s.data = null;
      s.error = (a.payload as string) || "FILLED_FETCH_FAILED";
    });
  },
});

export const { clearQrOverview } = slice.actions;
export default slice.reducer;

// selectors
export const selectQrOverview = (s: RootState) => (s as any).qcOverview?.data ?? null;
export const selectQrOverviewLoading = (s: RootState) => (s as any).qcOverview?.loading ?? false;
export const selectQrOverviewError = (s: RootState) => (s as any).qcOverview?.error ?? null;
