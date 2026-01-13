// src/features/auth/authSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type AppModule = "MARICULTURE" | "AQUACULTURE" | "WILDCAPTURE";

type AuthState = {
  token: string | null;
  userId: string | null;
  module: AppModule | null;
  loading: boolean;
  error: string | null;
};

const initialState: AuthState = {
  token: null,
  userId: null,
  module: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(
      state,
      action: PayloadAction<{ token: string; userId: string; module: AppModule }>
    ) {
      state.loading = false;
      state.token = action.payload.token;
      state.userId = action.payload.userId;
      state.module = action.payload.module;
    },
    loginFail(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    logout(state) {
      state.token = null;
      state.userId = null;
      state.module = null;
      state.loading = false;
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
});

export const { loginStart, loginSuccess, loginFail, logout, clearAuthError } =
  authSlice.actions;

export default authSlice.reducer;
