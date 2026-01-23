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

// Optional helper: tries to resolve IDs -> names if backend supports it.
// If these endpoints don't exist, it silently continues.
async function tryResolveName(
  token: string,
  url: string,
): Promise<string | undefined> {
  try {
    const r = await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const raw = await r.json().catch(() => ({}));
    if (!r.ok) return undefined;
    const data = raw?.data ?? raw;
    return data?.name ?? data?.state_name ?? data?.district_name ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * ✅ Fetch LOGGED-IN QC (token-based)
 * GET /api/me
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

    if (me?.rootverse_type !== "QUALITY_CHECKER") {
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

    // ✅ If backend returns only ids, try to resolve names (safe optional)
    if (!inspector.state_name && inspector.state_id) {
      inspector.state_name = await tryResolveName(
        token,
        `${BASE_URL}/api/states/${inspector.state_id}`, // <-- change if your endpoint differs
      );
    }
    if (!inspector.district_name && inspector.district_id) {
      inspector.district_name = await tryResolveName(
        token,
        `${BASE_URL}/api/districts/${inspector.district_id}`, // <-- change if your endpoint differs
      );
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
