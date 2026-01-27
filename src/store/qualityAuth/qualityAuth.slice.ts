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

async function fetchQcByCode(
  token: string,
  checkerCode: string,
): Promise<Partial<Inspector> | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/quality-checker/${encodeURIComponent(checkerCode)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const raw = await res.json().catch(() => ({}));
    if (!res.ok) return null;

    const d = raw?.data ?? raw;

    return {
      id: d?.id,
      checker_code: d?.checker_code ?? checkerCode,
      checker_name: d?.checker_name,
      checker_email: d?.checker_email,
      checker_phone: d?.checker_phone,
      state_id: d?.state_id,
      state_name: d?.state_name,
      district_id: d?.district_id,
      district_name: d?.district_name,
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
 * Fallback -> GET /api/quality-checker/:checker_code to get state/district names.
 */
export const fetchQcMe = createAsyncThunk<
  Inspector,
  void,
  { rejectValue: string }
>("qualityAuth/fetchQcMe", async (_, { rejectWithValue }) => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return rejectWithValue("NO_AUTH_TOKEN");

    const res = await fetch(`${BASE_URL}/api/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      return rejectWithValue(raw?.message || raw?.error || `ME_${res.status}`);
    }

    const me = raw?.data ?? raw?.user ?? raw;

    if (String(me?.rootverse_type || "").toUpperCase() !== "QUALITY_CHECKER") {
      return rejectWithValue("NOT_QC_USER");
    }

    const inspector: Inspector = {
      id: me?.id ?? me?.quality_checker_id ?? me?.qc_id,

      checker_code: me?.checker_code ?? me?.checkerCode,
      checker_name: me?.checker_name ?? me?.name ?? me?.checkerName,

      checker_email: me?.checker_email ?? me?.email,
      checker_phone: me?.checker_phone ?? me?.phone_no ?? me?.phone,

      state_id: me?.state_id,
      district_id: me?.district_id,

      state_name: me?.state_name,
      district_name: me?.district_name,

      is_active: me?.is_active,
      rootverse_type: "QUALITY_CHECKER",
    };

    if (!inspector.checker_code) return rejectWithValue("ME_NO_CHECKER_CODE");
    if (!inspector.checker_name) return rejectWithValue("ME_NO_CHECKER_NAME");

    const needsMore =
      !inspector.state_name ||
      !inspector.district_name ||
      !inspector.state_id ||
      !inspector.district_id;

    if (needsMore) {
      const full = await fetchQcByCode(token, inspector.checker_code);
      if (full) {
        return { ...inspector, ...full, rootverse_type: "QUALITY_CHECKER" };
      }
    }

    return inspector;
  } catch (e: any) {
    return rejectWithValue(e?.message || "ME_FETCH_FAILED");
  }
});

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
