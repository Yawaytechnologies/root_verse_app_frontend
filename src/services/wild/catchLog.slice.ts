import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  dummyGetQrStatus,
  dummyGetDetails,
  dummySaveCatchLog,
  DummyDetails,
} from "../../data/wild/catchlog.dummyDB";

const rawBase =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "https://rootverse-backend.onrender.com";

const API_BASE = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

const ENDPOINTS = {
  qrStatus: (crateId: string) => `${API_BASE}/api/wild/qr/${crateId}/status`,
  byCrate: (crateId: string) =>
    `${API_BASE}/api/wild/catch-logs/by-crate/${crateId}`,
  postCatch: `${API_BASE}/api/wild/catch-logs`,
};

type QrStatus = "NEW" | "FILLED";

export type CatchLogPayload = {
  catchId: string;
  tripId: string;
  species: string;
  weightKg: number;
  catchDate: string;
  catchTime?: string;
  notes?: string;
  latitude?: string;
  longitude?: string;
  images?: string[];
  linkedCrateId: string;
};

async function safeFetchJson<T>(
  url: string,
  opts?: RequestInit,
  timeoutMs = 8000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...(opts || {}), signal: controller.signal });
    const text = await res.text();

    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg =
        (data && (data.message || data.error)) ||
        `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

// ✅ 1) QR status: API-first, dummy fallback
export const checkQrStatus = createAsyncThunk(
  "catchLog/checkQrStatus",
  async (crateId: string) => {
    try {
      const res = await safeFetchJson<{
        crateId: string;
        status: QrStatus;
        catchId?: string;
      }>(ENDPOINTS.qrStatus(crateId), { method: "GET" });

      return { ...res, usedDummy: false };
    } catch {
      const d = dummyGetQrStatus(crateId);
      return { ...d, usedDummy: true };
    }
  }
);

// ✅ 2) Details: API-first, dummy fallback
export const fetchCatchLogByCrate = createAsyncThunk(
  "catchLog/fetchCatchLogByCrate",
  async (crateId: string) => {
    try {
      const res = await safeFetchJson<any>(ENDPOINTS.byCrate(crateId), {
        method: "GET",
      });

      // You can normalize here if backend shape differs
      return { details: res as any, usedDummy: false };
    } catch {
      const d = dummyGetDetails(crateId);
      return { details: d as DummyDetails, usedDummy: true };
    }
  }
);

// ✅ 3) Submit: API-first, dummy fallback (and update dummy DB)
export const submitCatchLog = createAsyncThunk(
  "catchLog/submitCatchLog",
  async (payload: CatchLogPayload) => {
    try {
      const res = await safeFetchJson<any>(ENDPOINTS.postCatch, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return { response: res, usedDummy: false };
    } catch {
      // save locally as dummy “server”
      const d = dummySaveCatchLog({
        linkedCrateId: payload.linkedCrateId,
        catchId: payload.catchId,
        tripId: payload.tripId,
        species: payload.species,
        weightKg: payload.weightKg,
        catchDate: payload.catchDate,
        catchTime: payload.catchTime,
        notes: payload.notes,
      });

      return { response: d, usedDummy: true };
    }
  }
);

type CatchLogState = {
  scannedCrateId: string | null;
  qrStatus: QrStatus | null;

  loading: boolean;
  error: string | null;

  usedDummy: boolean; // ✅ show badge “Offline / Dummy”
  details: any | null;

  submitOk: boolean;
};

const initialState: CatchLogState = {
  scannedCrateId: null,
  qrStatus: null,
  loading: false,
  error: null,
  usedDummy: false,
  details: null,
  submitOk: false,
};

const catchLogSlice = createSlice({
  name: "catchLog",
  initialState,
  reducers: {
    resetCatchFlow(state) {
      state.scannedCrateId = null;
      state.qrStatus = null;
      state.details = null;
      state.error = null;
      state.loading = false;
      state.usedDummy = false;
      state.submitOk = false;
    },
    setScannedCrateId(state, action: PayloadAction<string>) {
      state.scannedCrateId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkQrStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.usedDummy = false;
      })
      .addCase(checkQrStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.scannedCrateId = action.payload.crateId;
        state.qrStatus = action.payload.status;
        state.usedDummy = action.payload.usedDummy;
      })
      .addCase(checkQrStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "QR check failed";
      })

      .addCase(fetchCatchLogByCrate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCatchLogByCrate.fulfilled, (state, action) => {
        state.loading = false;
        state.details = action.payload.details;
        state.usedDummy = action.payload.usedDummy;
      })
      .addCase(fetchCatchLogByCrate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Fetch details failed";
      })

      .addCase(submitCatchLog.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.submitOk = false;
      })
      .addCase(submitCatchLog.fulfilled, (state, action) => {
        state.loading = false;
        state.submitOk = true;
        state.usedDummy = action.payload.usedDummy;
      })
      .addCase(submitCatchLog.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Submit failed";
      });
  },
});

export const { resetCatchFlow, setScannedCrateId } = catchLogSlice.actions;
export default catchLogSlice.reducer;
