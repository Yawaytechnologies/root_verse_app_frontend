import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http } from "../../services/http";
import { persistSession, logoutSession } from "./authSession.slice";
import { fetchMe, clearMe } from "./me.slice";

export const PHONE_KEY = "auth_phone_no";
export const USER_ID_KEY = "user_id";

type ApprovalStatus = "APPROVED" | "PENDING_APPROVAL" | "REJECTED" | string;

export type RootverseType =
  | "OWNER"
  | "WILD_CAPTURE"
  | "AQUACULTURE"
  | "MARICULTURE"
  | "QUALITY_CHECKER"
  | "CRATE_PACKER"
  | "COLLECTION_CENTRE_OPERATOR"
  | "TRANSPORT_OPERATOR"
  | string;

type LoginRes = {
  token?: string;
  access_token?: string;
  jwt?: string;
  message?: string;
  status?: ApprovalStatus;
  rootverse_type?: RootverseType;
  role?: RootverseType | string;
  user?: {
    status?: ApprovalStatus;
    rootverse_type?: RootverseType;
    role?: RootverseType | string;
    [key: string]: any;
  };
  data?: any;
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
    payload?.role ??
    payload?.user?.rootverse_type ??
    payload?.user?.role ??
    payload?.data?.rootverse_type ??
    payload?.data?.role ??
    payload?.data?.user?.rootverse_type ??
    payload?.data?.user?.role ??
    null
  );
}

function isValidUserId(value: any) {
  const text = String(value ?? "").trim();

  if (!text || text === "0" || text === "undefined" || text === "null") {
    return false;
  }

  return Number.isFinite(Number(text)) && Number(text) > 0;
}

function pickUserId(payload: any): string | null {
  const candidates = [
    payload?.user_id,
    payload?.userId,
    payload?.id,

    payload?.sub,
    payload?.user?.sub,
    payload?.data?.sub,

    payload?.user?.user_id,
    payload?.user?.userId,
    payload?.user?.id,

    payload?.data?.user_id,
    payload?.data?.userId,
    payload?.data?.id,

    payload?.data?.user?.user_id,
    payload?.data?.user?.userId,
    payload?.data?.user?.id,

    payload?.rootverse_user?.id,
    payload?.rootverse_user?.user_id,
    payload?.data?.rootverse_user?.id,
    payload?.data?.rootverse_user?.user_id,

    payload?.farmer?.user_id,
    payload?.data?.farmer?.user_id,
    payload?.farmer_details?.user_id,
    payload?.data?.farmer_details?.user_id,
  ];

  for (const value of candidates) {
    if (isValidUserId(value)) return String(value);
  }

  return null;
}

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    while (base64.length % 4) {
      base64 += "=";
    }

    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch (error) {
    console.log("JWT_DECODE_FAILED =>", error);
    return null;
  }
}

async function saveLoginUserIdFromAllSources(data: any, token: string, meData?: any) {
  const jwtPayload = decodeJwtPayload(token);

  console.log("LOGIN RESPONSE FOR USER ID =>", JSON.stringify(data, null, 2));
  console.log("JWT PAYLOAD FOR USER ID =>", JSON.stringify(jwtPayload, null, 2));
  console.log("ME RESPONSE FOR USER ID =>", JSON.stringify(meData, null, 2));

  const userId =
    pickUserId(data) ||
    pickUserId(jwtPayload) ||
    pickUserId(meData);

  if (!userId) {
    console.log("FINAL USER ID NOT FOUND");
    return null;
  }

  await AsyncStorage.multiSet([
    [USER_ID_KEY, String(userId)],
    ["userId", String(userId)],
    ["login_user_id", String(userId)],
    ["auth_user_id", String(userId)],
    ["rootverse_user_id", String(userId)],
    ["auth_token", token],
    ["token", token],
  ]);

  console.log("LOGIN USER ID SAVED =>", userId);
  return userId;
}

function inferRoleFromAppMode(): string | null {
  const mode = String(process.env.EXPO_PUBLIC_APP_MODE || "").toLowerCase();

  if (mode === "centre" || mode === "center") return "COLLECTION_CENTRE_OPERATOR";
  if (mode === "transport") return "TRANSPORT_OPERATOR";
  if (mode === "quality") return "QUALITY_CHECKER";
  if (mode === "crate") return "CRATE_PACKER";

  return null;
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
>("login/withPhone", async (phone_no, { dispatch, rejectWithValue }) => {
  try {
    const cleanPhone = String(phone_no || "").trim();

    if (!cleanPhone) {
      return rejectWithValue("ENTER_PHONE_NUMBER");
    }

    const role = inferRoleFromAppMode();
    const body: Record<string, any> = { phone_no: cleanPhone };

    if (role) {
      body.role = role;
    }

    const data = await http.postJson<LoginRes>("/api/auth/login", body, 15000);

    const token = pickToken(data);

    if (!token) {
      console.log("LOGIN_RESPONSE_NO_TOKEN =>", data);
      return rejectWithValue("NO_TOKEN");
    }

    await dispatch(persistSession(token)).unwrap();

    await AsyncStorage.multiSet([
      [PHONE_KEY, cleanPhone],
      ["auth_token", token],
      ["token", token],
    ]).catch(() => {});

    let meData: any = null;

    try {
      meData = await dispatch(fetchMe()).unwrap();
    } catch (error) {
      console.log("FETCH_ME_AFTER_LOGIN_FAILED =>", error);
    }

    await saveLoginUserIdFromAllSources(data, token, meData);

    const status = pickStatus(data) ?? pickStatus(meData);
    const rootverse_type = pickRootverseType(data) ?? pickRootverseType(meData);

    const user =
      data?.user ??
      data?.data?.user ??
      meData?.user ??
      meData?.data?.user ??
      meData?.data ??
      meData ??
      null;

    return { token, status, rootverse_type, user };
  } catch (e: any) {
    return rejectWithValue(String(e?.message || "LOGIN_FAILED"));
  }
});

export const logout = createAsyncThunk("login/logout", async (_, { dispatch }) => {
  dispatch(clearMe());

  await AsyncStorage.multiRemove([
    USER_ID_KEY,
    "userId",
    "login_user_id",
    "auth_user_id",
    "rootverse_user_id",
    PHONE_KEY,
  ]).catch(() => {});

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