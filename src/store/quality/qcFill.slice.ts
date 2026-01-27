// src/store/quality/qcFill.slice.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../auth/store";
import { API_BASE } from "../../services/http";

type SubmitArgs = {
  qrCode: string;
  payload: any;
};

export type QcFillQr = {
  qc_result?: "PASS" | "HOLD" | "REJECT" | string;
  qc_status?: "CHECKED" | "HOLD" | "REJECTED" | string;
  status?: string;
  [key: string]: any;
};

export type QcFillResult = {
  success: boolean;
  message: string;
  qr?: QcFillQr;
  raw?: any;
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

const TOKEN_KEY = "auth_token";

const QC_FILL_ENDPOINT = (code: string) => `/api/qrs/${encodeURIComponent(code)}/fill`;

function normalizeQr(raw: string) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

function guessMime(uri: string) {
  const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function toFile(uri: string, idx: number) {
  const type = guessMime(uri);
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  return { uri, name: `qc_${Date.now()}_${idx}.${ext}`, type } as any;
}

function appendScalar(form: FormData, key: string, value: any) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) return;

  if (typeof value === "boolean") form.append(key, value ? "true" : "false");
  else form.append(key, String(value));
}

function pickUpdatedQr(raw: any): QcFillQr | undefined {
  return (
    raw?.qr ||
    raw?.updatedQr ||
    raw?.data?.qr ||
    raw?.data?.updatedQr ||
    raw?.result?.qr ||
    raw?.result?.updatedQr ||
    undefined
  );
}

export const submitQcFill = createAsyncThunk<
  QcFillResult,
  SubmitArgs,
  { state: RootState; rejectValue: string }
>("qcFill/submit", async ({ qrCode, payload }, { rejectWithValue, getState }) => {
  // ✅ timeout so submit won't hang forever
  const controller = new AbortController();
  const timeoutMs = 25000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const code = normalizeQr(qrCode);
    if (!code) return rejectWithValue("QR_CODE_REQUIRED");

    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return rejectWithValue("NO_AUTH_TOKEN");

    const inspector = (getState() as any)?.qualityAuth?.inspector;

    const checkerCode =
      inspector?.checker_code || payload?.checker_code || payload?.checkerCode || null;

    const qcIdRaw =
      payload?.quality_checker_id || payload?.qualityCheckerId || inspector?.id || null;

    const qcId = qcIdRaw !== null && qcIdRaw !== undefined ? Number(qcIdRaw) : null;

    if (!checkerCode) return rejectWithValue("QC_CHECKER_CODE_MISSING");
    if (!qcId || Number.isNaN(qcId)) return rejectWithValue("QC_ID_MISSING");

    const url = `${API_BASE}${QC_FILL_ENDPOINT(code)}`;

    const form = new FormData();

    appendScalar(form, "checker_code", checkerCode);
    appendScalar(form, "quality_checker_id", qcId);

    const images: string[] = (
      payload?.crate_images ??
      payload?.inspection_images ??
      payload?.pond_images ??
      payload?.pond_condition_images ??
      payload?.images ??
      []
    ) as string[];

    const SKIP_KEYS = new Set([
      "crate_images",
      "inspection_images",
      "pond_images",
      "pond_condition_images",
      "images",
      "checker_code",
      "checkerCode",
      "quality_checker_id",
      "qualityCheckerId",
    ]);

    Object.entries(payload || {}).forEach(([k, v]) => {
      if (SKIP_KEYS.has(k)) return;
      appendScalar(form, k, v);
    });

    const division = String(payload?.division || "").toUpperCase();

    if (division === "WILD") {
      images
        .filter(Boolean)
        .slice(0, 5)
        .forEach((uri, idx) => form.append("fish_images", toFile(uri, idx)));
    } else {
      const first = images.filter(Boolean)[0];
      if (first) form.append("pond_condition_image", toFile(first, 0));
    }

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: form,
      signal: controller.signal,
    });

    const text = await res.text();
    let raw: any = {};
    try {
      raw = text ? JSON.parse(text) : {};
    } catch {
      raw = { message: text };
    }

    if (!res.ok) {
      const msg =
        raw?.message ||
        raw?.error ||
        raw?.msg ||
        `QC_FILL_FAILED_${res.status}`;
      return rejectWithValue(msg);
    }

    const updatedQr = pickUpdatedQr(raw);

    return {
      success: true,
      message: raw?.message || "QC filled",
      qr: updatedQr, // ✅ normalized from many backend shapes
      raw,
    };
  } catch (e: any) {
    // ✅ timeout / abort handling
    if (e?.name === "AbortError") {
      return rejectWithValue("NETWORK_TIMEOUT");
    }
    return rejectWithValue(e?.message || "QC_FILL_FAILED");
  } finally {
    clearTimeout(timer);
  }
});

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
    b.addCase(submitQcFill.pending, (s) => {
      s.loading = true;
      s.error = null;
      s.success = false;
    });
    b.addCase(submitQcFill.fulfilled, (s, a) => {
      s.loading = false;
      s.success = true;
      s.lastResult = a.payload;
    });
    b.addCase(submitQcFill.rejected, (s, a) => {
      s.loading = false;
      s.success = false;
      s.error = (a.payload as string) || "QC_FILL_FAILED";
    });
  },
});

export const { resetQcFill } = slice.actions;
export default slice.reducer;

export const selectQcFillLoading = (state: RootState) => (state as any)?.qcFill?.loading ?? false;
export const selectQcFillError = (state: RootState) => (state as any)?.qcFill?.error ?? null;
export const selectQcFillSuccess = (state: RootState) => (state as any)?.qcFill?.success ?? false;
export const selectQcFillLastResult = (state: RootState) => (state as any)?.qcFill?.lastResult ?? null;
