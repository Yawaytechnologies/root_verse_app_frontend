// src/store/quality/qcFill.slice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { httpJson } from "../../services/http";
import type { RootState } from "../auth/store";

type SubmitArgs = {
  qrCode: string;
  payload: any; // your big QC payload from screen
};

export type QcFillResult = {
  success: boolean;
  message: string;
  data?: any;
};

type State = {
  loading: boolean;
  error: string | null;
  success: boolean;
  lastResult: QcFillResult | null;
};

const initialState: State = {
  loading: false,
  error: null,
  success: false,
  lastResult: null,
};

// ✅ DEMO: set TRUE until backend endpoint ready
const DEMO_MODE = true;

// ✅ when backend is ready, change this to the real endpoint
const QC_SUBMIT_ENDPOINT = (code: string) => `/api/qc-fill/${encodeURIComponent(code)}`;

export const submitQcFill = createAsyncThunk<QcFillResult, SubmitArgs, { rejectValue: string }>(
  "qcFill/submit",
  async ({ qrCode, payload }, { rejectWithValue }) => {
    try {
      const code = String(qrCode || "").trim();
      if (!code) return rejectWithValue("QR code is required");

      // ✅ DEMO MODE: no backend, always success
      if (DEMO_MODE) {
        return {
          success: true,
          message: "DEMO: QC submitted (no backend)",
          data: {
            qrCode: code,
            ...payload,
            submitted_at: new Date().toISOString(),
          },
        };
      }

      // ✅ REAL MODE (backend ready)
      // Important: body must be string/FormData => JSON.stringify
      const res = await httpJson<any>(QC_SUBMIT_ENDPOINT(code), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ qrCode: code, ...payload }),
      } as any);

      if (!res) return rejectWithValue("No response from server");
      if (res?.success === false) return rejectWithValue(res?.message || "QC submit failed");

      return {
        success: true,
        message: res?.message || "QC submitted",
        data: res?.data ?? res,
      };
    } catch (e: any) {
      return rejectWithValue(e?.message || "QC submit failed");
    }
  }
);

const slice = createSlice({
  name: "qcFill",
  initialState,
  reducers: {
    resetQcFill(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.lastResult = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(submitQcFill.pending, (state) => {
      state.loading = true;
      state.error = null;
      state.success = false;
    });
    b.addCase(submitQcFill.fulfilled, (state, action) => {
      state.loading = false;
      state.success = true;
      state.lastResult = action.payload;
    });
    b.addCase(submitQcFill.rejected, (state, action) => {
      state.loading = false;
      state.success = false;
      state.error = (action.payload as string) || "QC submit failed";
    });
  },
});

export const { resetQcFill } = slice.actions;
export default slice.reducer;

// ✅ SAFE selectors (won't crash even if reducer key missing accidentally)
export const selectQcFillState = (state: RootState): State =>
  ((state as any).qcFill as State) ?? initialState;

export const selectQcFillLoading = (state: RootState) => selectQcFillState(state).loading;
export const selectQcFillError = (state: RootState) => selectQcFillState(state).error;
export const selectQcFillSuccess = (state: RootState) => selectQcFillState(state).success;
export const selectQcFillLastResult = (state: RootState) => selectQcFillState(state).lastResult;
