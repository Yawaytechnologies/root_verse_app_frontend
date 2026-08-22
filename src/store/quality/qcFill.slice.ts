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

const QC_FILL_ENDPOINT = (code: string) =>
  `/api/qrs/${encodeURIComponent(code)}/fill`;

const AQUA_QUALITY_INSPECTION_ENDPOINT = `/api/aquaculture/quality-inspection`;

function normalizeQr(raw: string) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
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
  return { uri, name: `qc_${Date.now()}_${idx}.${ext}`, type } as any;
}

function appendScalar(form: FormData, key: string, value: any) {
  if (value === undefined || value === null || value === "") return;
  if (Array.isArray(value)) return;
  if (typeof value === "object") return;

  if (typeof value === "boolean") form.append(key, value ? "true" : "false");
  else form.append(key, String(value));
}

function firstValue(...vals: any[]) {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    const t = String(v).trim();
    if (t !== "") return v;
  }
  return undefined;
}

function toRequiredNumber(value: any, errorName: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(errorName);
  }
  return n;
}

function toOptionalNumber(value: any) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function getImages(payload: any): string[] {
  const imgs =
    payload?.shrimp_images ??
    payload?.crate_images ??
    payload?.inspection_images ??
    payload?.pond_images ??
    payload?.pond_condition_images ??
    payload?.images ??
    [];

  return Array.isArray(imgs) ? imgs.filter(Boolean).map(String) : [];
}

function pickUpdatedQr(raw: any): QcFillQr | undefined {
  return (
    raw?.qr ||
    raw?.updatedQr ||
    raw?.data?.qr ||
    raw?.data?.updatedQr ||
    raw?.data ||
    raw?.inspection ||
    raw?.quality_inspection ||
    raw?.result?.qr ||
    raw?.result?.updatedQr ||
    undefined
  );
}

async function readJsonResponse(res: Response) {
  const text = await res.text();
  let raw: any = {};
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    raw = { message: text };
  }
  return raw;
}

export const submitQcFill = createAsyncThunk<
  QcFillResult,
  SubmitArgs,
  { state: RootState; rejectValue: string }
>("qcFill/submit", async ({ qrCode, payload }, { rejectWithValue, getState }) => {
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
      inspector?.checker_code ||
      inspector?.checkerCode ||
      payload?.checker_code ||
      payload?.quality_checker_code ||
      null;

    const checkerName =
      inspector?.checker_name ||
      inspector?.checkerName ||
      inspector?.name ||
      payload?.checker_name ||
      payload?.quality_checker_name ||
      null;

    const qcIdRaw =
      inspector?.id ??
      payload?.quality_checker_id ??
      payload?.qualityCheckerId ??
      null;

    const qcId =
      qcIdRaw !== null && qcIdRaw !== undefined ? Number(qcIdRaw) : null;

    if (!checkerCode) return rejectWithValue("QC_CHECKER_CODE_MISSING");
    if (!qcId || Number.isNaN(qcId)) return rejectWithValue("QC_ID_MISSING");

    const division = upper(payload?.division);

    /**
     * AQUA ONLY:
     * Use new backend API:
     * POST /api/aquaculture/quality-inspection
     */
    if (division === "AQUA") {
      const form = new FormData();

      const harvestIdRaw = firstValue(
        payload?.harvest_id,
        payload?.harvestId,
        payload?.harvest?.id
      );

      const harvestId = toRequiredNumber(harvestIdRaw, "HARVEST_ID_REQUIRED");

      const grade = String(payload?.grade ?? "").trim();
      if (!grade) return rejectWithValue("GRADE_REQUIRED");

      appendScalar(form, "pond_qr_scan", payload?.pond_qr_scan || code);
      appendScalar(form, "harvest_id", harvestId);

      appendScalar(form, "quality_checker_id", qcId);
      appendScalar(form, "checker_code", checkerCode);

      const sampleCount = toOptionalNumber(payload?.sample_count);
      const sampleWeight = toOptionalNumber(payload?.sample_weight);
      const abwG = toOptionalNumber(
        payload?.abw_g ?? payload?.abw ?? payload?.average_body_weight
      );
      const sizeCountKg = toOptionalNumber(
        payload?.size_count_kg ??
          payload?.size_count_per_kg ??
          payload?.size_count ??
          payload?.size
      );

      appendScalar(form, "sample_count", sampleCount);
      appendScalar(form, "sample_weight", sampleWeight);

      // AQUA calculated/overridden values.
      // Backend QualityInspection model exposes these canonical fields.
      appendScalar(form, "abw_g", abwG);
      appendScalar(form, "size_count_kg", sizeCountKg);

      appendScalar(form, "grade", grade);

      appendScalar(
        form,
        "disease_observation",
        payload?.disease_observation ?? false
      );

      appendScalar(form, "disease_notes", payload?.disease_notes);

      const lat = firstValue(payload?.inspection_latitude, payload?.latitude);
      const lng = firstValue(payload?.inspection_longitude, payload?.longitude);

      appendScalar(form, "inspection_latitude", toOptionalNumber(lat));
      appendScalar(form, "inspection_longitude", toOptionalNumber(lng));

      appendScalar(form, "inspected_at", payload?.inspected_at);
      appendScalar(form, "remarks", payload?.remarks);

      getImages(payload)
        .slice(0, 5)
        .forEach((uri, idx) => {
          form.append("shrimp_images", toFile(uri, idx));
        });

      const res = await fetch(`${API_BASE}${AQUA_QUALITY_INSPECTION_ENDPOINT}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: form,
        signal: controller.signal,
      });

      const raw = await readJsonResponse(res);

      if (!res.ok) {
        const msg =
          raw?.message ||
          raw?.error ||
          raw?.msg ||
          `AQUA_QUALITY_INSPECTION_FAILED_${res.status}`;
        return rejectWithValue(msg);
      }

      return {
        success: true,
        message: raw?.message || "Aquaculture quality inspection created",
        qr: pickUpdatedQr(raw),
        raw,
      };
    }

    /**
     * WILD / MARICULTURE:
     * Old flow untouched.
     */
    if (!checkerName) return rejectWithValue("QC_CHECKER_NAME_MISSING");

    const url = `${API_BASE}${QC_FILL_ENDPOINT(code)}`;
    const form = new FormData();

    appendScalar(form, "quality_checker_id", String(Number(qcId)));

    appendScalar(form, "quality_checker_code", checkerCode);
    appendScalar(form, "quality_checker_name", checkerName);

    appendScalar(form, "checker_code", checkerCode);
    appendScalar(form, "checker_name", checkerName);

    const images = getImages(payload);

    const SKIP_KEYS = new Set([
      "shrimp_images",
      "crate_images",
      "inspection_images",
      "pond_images",
      "pond_condition_images",
      "images",

      "checker_code",
      "checker_name",
      "quality_checker_id",
      "quality_checker_code",
      "quality_checker_name",

      "quality_checker_manager",
      "qualityCheckerManager",

      "_local",
      "server_qr",
      "serverQr",
      "raw",
      "data",
      "qr",
      "updatedQr",
    ]);

    Object.entries(payload || {}).forEach(([k, v]) => {
      if (SKIP_KEYS.has(k)) return;
      appendScalar(form, k, v);
    });

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

    const raw = await readJsonResponse(res);

    if (!res.ok) {
      const msg =
        raw?.message || raw?.error || raw?.msg || `QC_FILL_FAILED_${res.status}`;
      return rejectWithValue(msg);
    }

    return {
      success: true,
      message: raw?.message || "QC filled",
      qr: pickUpdatedQr(raw),
      raw,
    };
  } catch (e: any) {
    if (e?.name === "AbortError") return rejectWithValue("NETWORK_TIMEOUT");
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

export const selectQcFillLoading = (state: RootState) =>
  (state as any)?.qcFill?.loading ?? false;

export const selectQcFillError = (state: RootState) =>
  (state as any)?.qcFill?.error ?? null;

export const selectQcFillSuccess = (state: RootState) =>
  (state as any)?.qcFill?.success ?? false;

export const selectQcFillLastResult = (state: RootState) =>
  (state as any)?.qcFill?.lastResult ?? null;