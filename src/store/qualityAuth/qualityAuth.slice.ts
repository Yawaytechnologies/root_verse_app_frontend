// src/store/qualityAuth/qualityAuth.slice.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../auth/store";

export const TOKEN_KEY = "auth_token";
export const BASE_URL = "https://rootverse-backend-5qoo.onrender.com";

export type Inspector = {
  id?: number;
  checker_code: string;
  checker_name: string;

  checker_email?: string;
  checker_phone?: string;

  state_id?: number;
  district_id?: number;

  state_name?: string;
  district_name?: string;

  is_active?: boolean;
  rootverse_type?: "QUALITY_CHECKER";
};

type State = {
  inspector: Inspector | null;
  loading: boolean;
  error: string | null;
};

const initialState: State = {
  inspector: null,
  loading: false,
  error: null,
};

function cleanStr(v: any): string | undefined {
  const t = String(v ?? "").trim();
  return t ? t : undefined;
}
function cleanNum(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function pickList(raw: any): any[] {
  const d = raw?.data ?? raw;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.rows)) return d.rows;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.rows)) return raw.rows;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
}
function pickNameFromItem(it: any): string | undefined {
  return (
    cleanStr(it?.name) ||
    cleanStr(it?.state_name) ||
    cleanStr(it?.district_name) ||
    cleanStr(it?.title) ||
    cleanStr(it?.label)
  );
}

async function apiGet(token: string, path: string) {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const raw = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(raw?.message || raw?.error || `HTTP_${res.status}`);
  return raw;
}

async function fetchStateDistrictNames(
  token: string,
  state_id?: number,
  district_id?: number,
) {
  const out: { state_name?: string; district_name?: string } = {};

  // ---- STATES ----
  if (state_id && !out.state_name) {
    // try list endpoint
    try {
      const raw = await apiGet(token, "/api/states");
      const list = pickList(raw);
      const found = list.find((x) => cleanNum(x?.id) === state_id);
      const nm = pickNameFromItem(found);
      if (nm) out.state_name = nm;
    } catch {}

    // try single endpoint
    if (!out.state_name) {
      try {
        const raw = await apiGet(token, `/api/states/${state_id}`);
        const d = raw?.data ?? raw;
        const nm = pickNameFromItem(d);
        if (nm) out.state_name = nm;
      } catch {}
    }
  }

  // ---- DISTRICTS ----
  if (district_id && !out.district_name) {
    // try list endpoint with state filter
    if (state_id) {
      try {
        const raw = await apiGet(token, `/api/districts?state_id=${state_id}`);
        const list = pickList(raw);
        const found = list.find((x) => cleanNum(x?.id) === district_id);
        const nm = pickNameFromItem(found);
        if (nm) out.district_name = nm;
      } catch {}
    }

    // try list endpoint without state filter
    if (!out.district_name) {
      try {
        const raw = await apiGet(token, "/api/districts");
        const list = pickList(raw);
        const found = list.find((x) => cleanNum(x?.id) === district_id);
        const nm = pickNameFromItem(found);
        if (nm) out.district_name = nm;
      } catch {}
    }

    // try single endpoint
    if (!out.district_name) {
      try {
        const raw = await apiGet(token, `/api/districts/${district_id}`);
        const d = raw?.data ?? raw;
        const nm = pickNameFromItem(d);
        if (nm) out.district_name = nm;
      } catch {}
    }
  }

  return out;
}

async function fetchQcByCode(token: string, checkerCode: string): Promise<Partial<Inspector> | null> {
  try {
    const raw = await apiGet(token, `/api/quality-checker/${encodeURIComponent(checkerCode)}`);
    const d = raw?.data ?? raw;

    const stateId = cleanNum(d?.state_id) ?? cleanNum(d?.state?.id);
    const distId = cleanNum(d?.district_id) ?? cleanNum(d?.district?.id);

    return {
      id: cleanNum(d?.id),
      checker_code: cleanStr(d?.checker_code) ?? checkerCode,
      checker_name: cleanStr(d?.checker_name) ?? cleanStr(d?.name),

      checker_email: cleanStr(d?.checker_email) ?? cleanStr(d?.email),
      checker_phone: cleanStr(d?.checker_phone) ?? cleanStr(d?.phone),

      state_id: stateId,
      district_id: distId,

      state_name: cleanStr(d?.state_name) ?? cleanStr(d?.state?.name),
      district_name: cleanStr(d?.district_name) ?? cleanStr(d?.district?.name),

      is_active: d?.is_active,
      rootverse_type: "QUALITY_CHECKER",
    };
  } catch {
    return null;
  }
}

/**
 * ✅ Fetch LOGGED-IN QC (token-based)
 * GET /api/me
 * Fallback -> GET /api/quality-checker/:checker_code
 * Extra Fallback -> fetch state/district names using ids (frontend-only join)
 */
export const fetchQcMe = createAsyncThunk<Inspector, void, { rejectValue: string }>(
  "qualityAuth/fetchQcMe",
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) return rejectWithValue("NO_AUTH_TOKEN");

      const raw = await apiGet(token, "/api/me");
      const me = raw?.data ?? raw?.user ?? raw;

      if (String(me?.rootverse_type || "").toUpperCase() !== "QUALITY_CHECKER") {
        return rejectWithValue("NOT_QC_USER");
      }

      const stateId = cleanNum(me?.state_id) ?? cleanNum(me?.state?.id);
      const distId = cleanNum(me?.district_id) ?? cleanNum(me?.district?.id);

      let inspector: Inspector = {
        id: cleanNum(me?.id ?? me?.quality_checker_id ?? me?.qc_id),

        checker_code: cleanStr(me?.checker_code ?? me?.checkerCode) || "",
        checker_name: cleanStr(me?.checker_name ?? me?.name ?? me?.checkerName) || "",

        checker_email: cleanStr(me?.checker_email ?? me?.email),
        checker_phone: cleanStr(me?.checker_phone ?? me?.phone_no ?? me?.phone),

        state_id: stateId,
        district_id: distId,

        state_name: cleanStr(me?.state_name) ?? cleanStr(me?.state?.name),
        district_name: cleanStr(me?.district_name) ?? cleanStr(me?.district?.name),

        is_active: me?.is_active,
        rootverse_type: "QUALITY_CHECKER",
      };

      if (!inspector.checker_code) return rejectWithValue("ME_NO_CHECKER_CODE");
      if (!inspector.checker_name) return rejectWithValue("ME_NO_CHECKER_NAME");

      // 1) fallback by code (sometimes returns richer data)
      const needsMore =
        !cleanStr(inspector.state_name) ||
        !cleanStr(inspector.district_name) ||
        !inspector.state_id ||
        !inspector.district_id;

      if (needsMore) {
        const full = await fetchQcByCode(token, inspector.checker_code);
        if (full) inspector = { ...inspector, ...full, rootverse_type: "QUALITY_CHECKER" };
      }

      // 2) frontend-only join using master endpoints
      const stillMissingNames =
        (!cleanStr(inspector.state_name) && !!inspector.state_id) ||
        (!cleanStr(inspector.district_name) && !!inspector.district_id);

      if (stillMissingNames) {
        const names = await fetchStateDistrictNames(token, inspector.state_id, inspector.district_id);
        inspector = { ...inspector, ...names };
      }

      return inspector;
    } catch (e: any) {
      return rejectWithValue(e?.message || "ME_FETCH_FAILED");
    }
  }
);

const slice = createSlice({
  name: "qualityAuth",
  initialState,
  reducers: {
    clearQc(state) {
      state.inspector = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchQcMe.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchQcMe.fulfilled, (s, a) => {
      s.loading = false;
      s.inspector = a.payload;
    });
    b.addCase(fetchQcMe.rejected, (s, a) => {
      s.loading = false;
      s.inspector = null;
      s.error = (a.payload as string) || "ME_FETCH_FAILED";
    });
  },
});

export const { clearQc } = slice.actions;

export const selectInspector = (s: RootState) => s.qualityAuth.inspector;
export const selectInspectorLoading = (s: RootState) => s.qualityAuth.loading;
export const selectInspectorError = (s: RootState) => s.qualityAuth.error;

export default slice.reducer;
