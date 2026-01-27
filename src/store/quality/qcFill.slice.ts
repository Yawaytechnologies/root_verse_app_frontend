// src/store/quality/qcFill.slice.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../auth/store";

type SubmitArgs = {
  qrCode: string;
  payload: any;
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

const TOKEN_KEY = "auth_token";
const BASE_URL = "https://rootverse-backend-5qoo.onrender.com";

// ✅ PUT /api/qrs/:code/fill
const QC_FILL_ENDPOINT = (code: string) =>
  `/api/qrs/${encodeURIComponent(code)}/fill`;

// ✅ must match: upload.array("images", 3)
const IMAGE_FIELD = "images";

function normalizeQr(raw: string) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function guessMime(uri: string) {
  const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function toFile(uri: string, idx: number) {
  const type = guessMime(uri);
  const ext =
    type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  return {
    uri,
    name: `qc_${Date.now()}_${idx}.${ext}`,
    type,
  } as any;
}

function appendScalar(form: FormData, key: string, value: any) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    // ⚠️ NEVER send arrays for scalar db columns
    form.append(key, String(value[0] ?? ""));
    return;
  }
  if (typeof value === "boolean") form.append(key, value ? "true" : "false");
  else form.append(key, String(value));
}

export const submitQcFill = createAsyncThunk<
  QcFillResult,
  SubmitArgs,
  { state: RootState; rejectValue: string }
>(
  "qcFill/submit",
  async ({ qrCode, payload }, { rejectWithValue, getState }) => {
    try {
      const code = normalizeQr(qrCode);
      if (!code) return rejectWithValue("QR_CODE_REQUIRED");

      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) return rejectWithValue("NO_AUTH_TOKEN");

      // ✅ logged-in QC from redux
      const inspector = getState().qualityAuth?.inspector;

      // ✅ decide qc identity ONCE
      const checkerCode =
        inspector?.checker_code ||
        payload?.checker_code ||
        payload?.checkerCode ||
        null;

      const qcIdRaw =
        payload?.quality_checker_id ||
        payload?.qualityCheckerId ||
        inspector?.id ||
        null;

      const qcId =
        qcIdRaw !== null && qcIdRaw !== undefined ? Number(qcIdRaw) : null;

      if (!checkerCode) return rejectWithValue("QC_CHECKER_CODE_MISSING");
      if (!qcId || Number.isNaN(qcId)) return rejectWithValue("QC_ID_MISSING");

      const url = `${BASE_URL}${QC_FILL_ENDPOINT(code)}`;

      const form = new FormData();

      // ✅ attach identity ONCE
      appendScalar(form, "checker_code", checkerCode);
      appendScalar(form, "quality_checker_id", qcId);

      // ✅ payload fields (skip identity keys to avoid duplicates)
      const images: string[] = Array.isArray(payload?.crate_images)
        ? payload.crate_images
        : [];

      const SKIP_KEYS = new Set([
        "crate_images",
        "checker_code",
        "checkerCode",
        "quality_checker_id",
        "qualityCheckerId",
      ]);

      Object.entries(payload || {}).forEach(([k, v]) => {
        if (SKIP_KEYS.has(k)) return;
        appendScalar(form, k, v);
      });

      // ✅ images max 3
      images
        .filter(Boolean)
        .slice(0, 3)
        .forEach((uri, idx) => {
          form.append(IMAGE_FIELD, toFile(uri, idx));
        });

      const res = await fetch(url, {
        method: "PUT", // ✅ your backend expects PUT
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: form,
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
          raw?.message || raw?.error || `QC_FILL_FAILED_${res.status}`;
        return rejectWithValue(msg);
      }

      return {
        success: true,
        message: raw?.message || "QC filled",
        data: raw?.data ?? raw,
      };
    } catch (e: any) {
      return rejectWithValue(e?.message || "QC_FILL_FAILED");
    }
  },
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

// selectors
export const selectQcFillLoading = (state: RootState) =>
  state.qcFill?.loading ?? false;
export const selectQcFillError = (state: RootState) =>
  state.qcFill?.error ?? null;
export const selectQcFillSuccess = (state: RootState) =>
  state.qcFill?.success ?? false;
export const selectQcFillLastResult = (state: RootState) =>
  state.qcFill?.lastResult ?? null;
