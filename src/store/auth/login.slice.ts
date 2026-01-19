import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ENV } from "../../config/env";


type ApprovalStatus = "APPROVED" | "PENDING_APPROVAL" | "REJECTED";
type RootverseType = "WILD_CAPTURE" | "AQUACULTURE" | "MARICULTURE";

type LoginRes = {
  token?: string;
  message?: string;
  status?: ApprovalStatus;
  rootverse_type?: RootverseType;
  user?: {
    status?: ApprovalStatus;
    rootverse_type?: RootverseType;
  };
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

export const loginWithPhone = createAsyncThunk<
  LoginRes,
  string,
  { rejectValue: string }
>("login/withPhone", async (phone_no, { rejectWithValue }) => {
  try {
    const res = await fetch(`${ENV.API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_no }),
    });

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      return rejectWithValue(data?.error || data?.message || "Login failed");
    }

    return data as LoginRes;
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
  },
  extraReducers: (b) => {
    b.addCase(loginWithPhone.pending, (s) => {
      s.loading = true;
      s.error = null;
      // keep token if you want, or clear if you want "fresh login"
      // s.token = null;
      s.status = null;
      s.rootverse_type = null;
    });

    b.addCase(loginWithPhone.fulfilled, (s, a) => {
      s.loading = false;

      s.token = a.payload.token ?? null;

      s.status = a.payload.status ?? a.payload.user?.status ?? null;
      s.rootverse_type = a.payload.rootverse_type ?? a.payload.user?.rootverse_type ?? null;
    });

    b.addCase(loginWithPhone.rejected, (s, a) => {
      s.loading = false;
      s.error = a.payload || "Login failed";
    });
  },
});

export const { clearLoginError } = loginSlice.actions;
export default loginSlice.reducer;
