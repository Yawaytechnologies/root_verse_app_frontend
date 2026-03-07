import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http } from "../../services/http";
import { persistSession, logoutSession } from "./authSession.slice";
import { fetchMe, clearMe } from "./me.slice";

type ApprovalStatus = "APPROVED" | "PENDING_APPROVAL" | "REJECTED" | string;
export type RootverseType =
  | "WILD_CAPTURE"
  | "AQUACULTURE"
  | "MARICULTURE"
  | "QUALITY_CHECKER"
  | "CRATE_PACKER"
  | string;

type LoginRes = {
  token?: string;
  access_token?: string;
  jwt?: string;

  message?: string;
  status?: ApprovalStatus;
  rootverse_type?: RootverseType;

  user?: {
    status?: ApprovalStatus;
    rootverse_type?: RootverseType;
    [key: string]: any;
  };

  data?: any; // backend may wrap here
  [key: string]: any;
};

type LoginState = {
  loading: boolean;
  error: string | null;

  // optional (authSession is source of truth)
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
    payload?.jwt ||
    payload?.data?.token ||
    payload?.data?.access_token ||
    payload?.data?.jwt ||
    payload?.data?.data?.token ||
    payload?.data?.data?.access_token;

  return typeof token === "string" && token.length > 0 ? token : null;
}

function pickStatus(payload: any): ApprovalStatus | null {
  return (
    payload?.status ??
    payload?.user?.status ??
    payload?.data?.status ??
    payload?.data?.user?.status ??
    null
  );
}

function pickRootverseType(payload: any): RootverseType | null {
  return (
    payload?.rootverse_type ??
    payload?.user?.rootverse_type ??
    payload?.data?.rootverse_type ??
    payload?.data?.user?.rootverse_type ??
    null
  );
}

/**
 * ✅ Login flow (single source of truth):
 * 1) POST /api/auth/login { phone_no }
 * 2) persistSession(token)  -> saves + sets http Bearer token
 * 3) fetchMe()              -> GET /api/me using http layer
 */
export const loginWithPhone = createAsyncThunk<
  { token: string; status: ApprovalStatus | null; rootverse_type: RootverseType | null; user?: any },
  string,
  { rejectValue: string }
>("login/withPhone", async (phone_no, { dispatch, rejectWithValue }) => {
  try {
    const cleanPhone = String(phone_no || "").trim();
    if (!cleanPhone) return rejectWithValue("ENTER_PHONE_NUMBER");

    const data = await http.postJson<LoginRes>(
      "/api/auth/login",
      { phone_no: cleanPhone },
      15000
    );

    const token = pickToken(data);
    if (!token) {
      console.log("LOGIN_RESPONSE_NO_TOKEN =>", data);
      return rejectWithValue("NO_TOKEN");
    }

    // ✅ store token + set http token
    await dispatch(persistSession(token)).unwrap();

    // ✅ load profile (fire and forget)
    // dispatch(fetchMe());

    const status = pickStatus(data);
    const rootverse_type = pickRootverseType(data);
    const user = (data as any)?.user ?? (data as any)?.data?.user ?? null;

    return { token, status, rootverse_type, user };
  } catch (e: any) {
    return rejectWithValue(String(e?.message || "LOGIN_FAILED"));
  }
});

/**
 * ✅ Proper logout:
 * - clears authSession (storage + http token)
 * - clears me
 * - clears login slice state
 */
export const logout = createAsyncThunk("login/logout", async (_, { dispatch }) => {
  dispatch(clearMe());
  await dispatch(logoutSession()).unwrap();
  return true;
});

const loginSlice = createSlice({
  name: "login",
  initialState,
  reducers: {
    clearLoginError(state) {
      state.error = null;
    },
    resetLoginState(state) {
      state.loading = false;
      state.error = null;
      state.token = null;
      state.status = null;
      state.rootverse_type = null;
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
      s.error = a.payload || "LOGIN_FAILED";
    });

    b.addCase(logout.fulfilled, (s) => {
      s.loading = false;
      s.error = null;
      s.token = null;
      s.status = null;
      s.rootverse_type = null;
    });
  },
});

export const { clearLoginError, resetLoginState } = loginSlice.actions;
export default loginSlice.reducer;