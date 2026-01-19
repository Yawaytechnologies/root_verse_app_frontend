import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { CatchLogPayload, QrStatusResponse } from "./catchLog.api";
import { apiCheckQrStatus, apiSubmitCatchLog } from "./catchLog.api";

type CatchState = {
  loading: boolean;
  error: string | null;
  usedDummy: boolean;
  qrStatus: QrStatusResponse | null;
  lastSubmit: any | null;
};

const initialState: CatchState = {
  loading: false,
  error: null,
  usedDummy: false,
  qrStatus: null,
  lastSubmit: null,
};

function dummyQrStatus(crateId: string): QrStatusResponse {
  if (crateId === "RV-CRATE-000999") return { crateId, status: "FILLED" };
  return { crateId, status: "NEW" };
}

export const checkQrStatus = createAsyncThunk<QrStatusResponse, string>(
  "catchLog/checkQrStatus",
  async (crateId) => {
    try {
      return await apiCheckQrStatus(crateId);
    } catch {
      return dummyQrStatus(crateId);
    }
  }
);

export const submitCatchLog = createAsyncThunk<any, CatchLogPayload>(
  "catchLog/submitCatchLog",
  async (payload, { rejectWithValue }) => {
    try {
      // hard proof
      console.log("THUNK payload fishId:", payload.fishId);
      return await apiSubmitCatchLog(payload);
    } catch (e: any) {
      return rejectWithValue(e?.message || "Submit failed");
    }
  }
);

const catchLogSlice = createSlice({
  name: "catchLog",
  initialState,
  reducers: {
    resetCatchFlow: () => initialState,
    clearCatchError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkQrStatus.pending, (s) => {
        s.loading = true;
        s.error = null;
        s.usedDummy = false;
      })
      .addCase(checkQrStatus.fulfilled, (s, a) => {
        s.loading = false;
        s.qrStatus = a.payload;
        if (a.payload.crateId === "RV-CRATE-000123" || a.payload.crateId === "RV-CRATE-000999") {
          s.usedDummy = true;
        }
      })
      .addCase(checkQrStatus.rejected, (s, a) => {
        s.loading = false;
        s.error = a.error?.message || "QR check failed";
      })
      .addCase(submitCatchLog.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(submitCatchLog.fulfilled, (s, a) => {
        s.loading = false;
        s.lastSubmit = a.payload;
      })
      .addCase(submitCatchLog.rejected, (s, a: any) => {
        s.loading = false;
        s.error = a.payload || a.error?.message || "Submit failed";
      });
  },
});

export const { resetCatchFlow, clearCatchError } = catchLogSlice.actions;
export default catchLogSlice.reducer;
