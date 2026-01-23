// src/store/quality/qrDetails.slice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { httpJson } from "../../services/http";
import type { RootState } from "../auth/store";

export type CatchLogDetails = {
  code: string;
  type: string;
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

function mapToCatchLog(q: any): CatchLogDetails {
  return {
    code: String(q?.code ?? ""),
    type: String(q?.type ?? ""),
    status: String(q?.status ?? ""),

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

// ✅ IMPORTANT: Scanner must fetch details even when NOT "FILLED"
export const fetchCatchLogByQr = createAsyncThunk<CatchLogDetails, string, { rejectValue: string }>(
  "qrDetails/fetchCatchLogByQr",
  async (qrCode, { rejectWithValue }) => {
    const code = encodeURIComponent(String(qrCode || "").trim());

    const tryFetch = async (url: string) => {
      const res = await httpJson<ApiAnyResponse>(url);
      return res?.qr ?? res?.data ?? null;
    };

    try {
      // ✅ 1) NEW backend endpoint (preferred)
      let q = await tryFetch(`/api/qr-details/${code}`).catch(() => null);

      // ✅ 2) fallback: common QR endpoint
      if (!q) q = await tryFetch(`/api/qrs/${code}`).catch(() => null);

      // ✅ 3) fallback: old filled endpoint (only works after QC submit)
      if (!q) q = await tryFetch(`/api/filled/${code}`).catch(() => null);

      if (!q) return rejectWithValue("QR not found");

      return mapToCatchLog(q);
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to fetch QR details");
    }
  }
);

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

// ✅ SAFE selectors (won't crash if reducer key missing by mistake)
export const selectQrDetailsState = (state: RootState): State =>
  ((state as any).qrDetails as State) ?? initialState;

export const selectCatchLog = (state: RootState) => selectQrDetailsState(state).data;
export const selectCatchLogLoading = (state: RootState) => selectQrDetailsState(state).loading;
export const selectCatchLogError = (state: RootState) => selectQrDetailsState(state).error;
