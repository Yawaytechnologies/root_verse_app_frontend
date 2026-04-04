import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ENV } from "../../config/env";

export const TOKEN_KEY = "auth_token"; // ✅ MUST match me.slice.ts

type ApprovalStatus = "APPROVED" | "PENDING_APPROVAL" | "REJECTED";

export type RootverseType =
  | "WILD_CAPTURE"
  | "AQUACULTURE"
  | "MARICULTURE"
  | "QUALITY_CHECKER"
  | "COLLECTION_CENTRE_OPERATOR"
  | "TRANSPORT_OPERATOR";

type LoginRes = {
  token?: string;
  access_token?: string;
  message?: string;
  status?: ApprovalStatus;
  rootverse_type?: RootverseType;
  user?: {
    status?: ApprovalStatus;
    rootverse_type?: RootverseType;
    [key: string]: any;
  };
  data?: any; // some backends wrap here
  [key: string]: any;
};

type LoginState = {
  loading: boolean;
  error: string | null;
  token: string | null;
  status: ApprovalStatus | null;
  rootverse_type: RootverseType | null;
};

const initialState: LoginState = {
  loading: false,
  error: null,
  token: null,
  status: null,
  rootverse_type: null,
};

/* ------------------------------------------- */

function pickToken(payload: any): string | null {
  const token =
    payload?.token ||
    payload?.access_token ||
    payload?.data?.token ||
    payload?.data?.access_token ||
    payload?.data?.jwt ||
    payload?.jwt ||
    payload?.data?.data?.token ||
    payload?.data?.data?.access_token;

  return typeof token === "string" && token.length > 0 ? token : null;
}

export const loginWithPhone = createAsyncThunk<
  {
    token: string;
    status: ApprovalStatus | null;
    rootverse_type: RootverseType | null;
    user?: any;
  },
  string,
  { rejectValue: string }
>("login/withPhone", async (phone_no, { rejectWithValue }) => {
  try {
    const cleanPhone = String(phone_no || "").trim();

    const res = await fetch(`${ENV.API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ phone_no: cleanPhone }),
    });

    const text = await res.text();
    let data: any = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return rejectWithValue("LOGIN_NOT_JSON");
    }

    if (!res.ok) {
      return rejectWithValue(data?.error || data?.message || "Login failed");
    }

    const token = pickToken(data);
    if (!token) {
      console.log("LOGIN_RESPONSE_NO_TOKEN =>", data);
      return rejectWithValue("NO_TOKEN");
    }

    // ✅ save token for fetchMe()
    await AsyncStorage.setItem(TOKEN_KEY, token);

    const status: ApprovalStatus | null =
      data?.status ?? data?.user?.status ?? null;

    const rootverse_type: RootverseType | null =
      data?.rootverse_type ?? data?.user?.rootverse_type ?? null;

    return {
      token,
      status,
      rootverse_type,
      user: data?.user ?? data?.data?.user ?? null,
    };
  } catch (e: any) {
    return rejectWithValue(e?.message || "Network error");
  }
});

const loginSlice = createSlice({
  name: "login",
  initialState,
  reducers: {
    clearLoginError(state) {
      state.error = null;
    },
    logout(state) {
      state.token = null;
      state.status = null;
      state.rootverse_type = null;
      state.error = null;
      state.loading = false;
      AsyncStorage.removeItem(TOKEN_KEY);
    },
  },
  extraReducers: (b) => {
    b.addCase(loginWithPhone.pending, (s) => {
      s.loading = true;
      s.error = null;
      s.status = null;
      s.rootverse_type = null;
    });

    b.addCase(loginWithPhone.fulfilled, (s, a) => {
      s.loading = false;
      s.token = a.payload.token;
      s.status = a.payload.status;
      s.rootverse_type = a.payload.rootverse_type;
    });

    b.addCase(loginWithPhone.rejected, (s, a) => {
      s.loading = false;
      s.error = a.payload || "Login failed";
    });
  },
});

export const { clearLoginError, logout } = loginSlice.actions;
export default loginSlice.reducer;