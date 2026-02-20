import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ENV } from "../../config/env";

import type { AppDispatch, RootState } from "./store";

export type RootverseType =
  | "WILD_CAPTURE"
  | "AQUACULTURE"
  | "MARICULTURE"
  | "QUALITY_CHECKER"
  | string;

export type MeResponse = {
  id: number;
  username: string | null;
  phone_no: string;
  rootverse_type: RootverseType;
  status?: string;
  verification_status?: string;
  address?: string | null;
  [key: string]: any;
};

type State = {
  loading: boolean;
  error: string | null; // keep string (minimal changes)
  me: MeResponse | null;
};

const initialState: State = {
  loading: false,
  error: null,
  me: null,
};

// ✅ ONE token key across app
export const TOKEN_KEY = "auth_token";

// ✅ cache key for offline reopen
const ME_CACHE_KEY = "me_cache_v1";

async function readTokenFromStorage() {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// ✅ restore cached me (USED by _layout.tsx when offline)
export const restoreMeFromCache = createAsyncThunk<MeResponse | null>(
  "me/restoreFromCache",
  async () => {
    try {
      const raw = await AsyncStorage.getItem(ME_CACHE_KEY);
      return raw ? (JSON.parse(raw) as MeResponse) : null;
    } catch {
      return null;
    }
  }
);

/**
 * ✅ fetchMe:
 * Prefer token from authSession.token
 * Fallback to login.token
 * Fallback to AsyncStorage auth_token
 *
 * ✅ returns:
 * - "NO_TOKEN"
 * - "UNAUTHORIZED" (401 only)
 * - "NETWORK_ERROR" (offline / no response)
 * - "ME_FETCH_FAILED"
 * - "ME_NOT_JSON"
 */
export const fetchMe = createAsyncThunk<
  MeResponse,
  void,
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>("me/fetch", async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();

    const tokenFromAuthSession = state.authSession?.token ?? null;
    const tokenFromLogin = (state as any).login?.token ?? null;
    const tokenFromStorage = await readTokenFromStorage();

    const token = tokenFromAuthSession || tokenFromLogin || tokenFromStorage;

    if (!token) return rejectWithValue("NO_TOKEN");

    const res = await fetch(`${ENV.API_BASE}/api/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const text = await res.text();
    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return rejectWithValue("ME_NOT_JSON");
    }

    // ✅ handle auth failure properly
    if (!res.ok) {
      if (res.status === 401) return rejectWithValue("UNAUTHORIZED");
      return rejectWithValue(data?.error || data?.message || "ME_FETCH_FAILED");
    }

    const mePayload = (data?.data ?? data) as any;

    // ✅ cache me for offline reopen
    try {
      await AsyncStorage.setItem(ME_CACHE_KEY, JSON.stringify(mePayload));
    } catch { }

    // Persist owner_code / owner_id for parts of app that read AsyncStorage directly
    try {
      const ownerCode = String(
        mePayload?.owner_code ??
        mePayload?.ownerCode ??
        mePayload?.owner_code_text ??
        ""
      ).trim();
      if (ownerCode) await AsyncStorage.setItem("owner_code", ownerCode);

      const ownerIdCandidate =
        mePayload?.owner_id ??
        mePayload?.ownerId ??
        mePayload?.ownerDbId ??
        null;
      if (ownerIdCandidate && String(ownerIdCandidate).trim()) {
        await AsyncStorage.setItem("owner_id", String(ownerIdCandidate));
      }
    } catch { }

    console.log("[ME] rootverse_type:", mePayload?.rootverse_type);
    console.log("[ME] status:", mePayload?.status || mePayload?.verification_status);

    return mePayload as MeResponse;
  } catch (e: any) {
    // ✅ offline / DNS / timeout => treat as network (do NOT force login)
    return rejectWithValue("NETWORK_ERROR");
  }
});

const meSlice = createSlice({
  name: "me",
  initialState,
  reducers: {
    clearMe(state) {
      state.me = null;
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (b) => {
    b.addCase(restoreMeFromCache.fulfilled, (s, a) => {
      // ✅ if cache exists, use it
      if (a.payload) s.me = a.payload;
    });

    b.addCase(fetchMe.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchMe.fulfilled, (s, a) => {
      s.loading = false;
      s.me = a.payload;
      s.error = null;
    });
    b.addCase(fetchMe.rejected, (s, a) => {
      s.loading = false;
      // ✅ IMPORTANT: don't nuke me on NETWORK_ERROR if you already have cached me loaded
      // if app restarted and me=null, restoreMeFromCache will fill it.
      s.error = (a.payload as string) || "ME_FETCH_FAILED";

      if (s.error === "UNAUTHORIZED" || s.error === "NO_TOKEN") {
        s.me = null;
      }
    });
  },
});

export const { clearMe } = meSlice.actions;
export default meSlice.reducer;