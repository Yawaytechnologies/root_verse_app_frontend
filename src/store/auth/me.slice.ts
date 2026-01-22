import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ENV } from "../../config/env";

// ✅ IMPORTANT: import types from the REAL store file (the one that exports `store`)
import type { AppDispatch, RootState } from "./store";
// If this path is wrong in your project, change it to the correct one.
// Example alternatives:
// import type { RootState, AppDispatch } from "../../store/store";
// import type { RootState, AppDispatch } from "../store";

export type RootverseType = "WILD_CAPTURE" | "AQUACULTURE" | "MARICULTURE";

export type MeResponse = {
  id: number;
  username: string | null;
  phone_no: string;
  rootverse_type: RootverseType;
  verification_status?: string;
  address?: string | null;
  [key: string]: any;
};

type State = {
  loading: boolean;
  error: string | null;
  me: MeResponse | null;
};

const initialState: State = {
  loading: false,
  error: null,
  me: null,
};

// ✅ Use ONE token key across app (login + me + any api)
export const TOKEN_KEY = "auth_token"; // keep this SAME in login.slice.ts too

async function readTokenFromStorage() {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * ✅ fetchMe:
 * - Prefer token from redux (state.login.token)
 * - Fallback to AsyncStorage
 * - Adds strong dispatch typing to remove UnknownAction errors
 */
export const fetchMe = createAsyncThunk<
  MeResponse,
  void,
  {
    state: RootState;
    dispatch: AppDispatch;
    rejectValue: string;
  }
>("me/fetch", async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();

    const tokenFromRedux = state.login?.token ?? null;
    const tokenFromStorage = await readTokenFromStorage();
    const token = tokenFromRedux || tokenFromStorage;

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
      // backend returned non-json
      return rejectWithValue("ME_NOT_JSON");
    }

    if (!res.ok) {
      return rejectWithValue(data?.error || data?.message || "ME_FETCH_FAILED");
    }

    // some backends wrap like { success:true, data:{...} }
    return (data?.data ?? data) as MeResponse;
  } catch (e: any) {
    return rejectWithValue(e?.message || "NETWORK_ERROR");
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
    b.addCase(fetchMe.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchMe.fulfilled, (s, a) => {
      s.loading = false;
      s.me = a.payload;
    });
    b.addCase(fetchMe.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || "ME_FETCH_FAILED";
    });
  },
});

export const { clearMe } = meSlice.actions;
export default meSlice.reducer;
