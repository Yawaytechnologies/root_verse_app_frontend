// src/store/auth/authSession.slice.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  clearSession,
  deriveExpiresAt,
  loadSession,
  saveSession,
  type StoredSession,
} from "./sessionStorage";

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_PHONE_KEY = "auth_phone_no";
const ME_CACHE_KEY = "me_cache_v1"; // ✅ add this

type AuthSessionState = {
  token: string | null;
  expiresAt: number | null;
  hydrated: boolean;

  // ✅ offline-first: keep session even if token expired while offline
  // we can use this later (in _layout) to force re-login only when ONLINE
  expired: boolean;
};

const initialState: AuthSessionState = {
  token: null,
  expiresAt: null,
  hydrated: false,
  expired: false,
};

export const restoreSession = createAsyncThunk("authSession/restore", async () => {
  const s = await loadSession();
  if (!s) return null;

  // ✅ DO NOT clear session here.
  // Sea/offline use-case: app must open even if token is expired.
  // Real logout should happen only when ONLINE and server returns 401.
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, s.token).catch(() => { });
  return s;
});

export const persistSession = createAsyncThunk(
  "authSession/persist",
  async (token: string) => {
    const session: StoredSession = {
      token,
      savedAt: Date.now(),
      expiresAt: deriveExpiresAt(token),
    };

    await saveSession(session);

    // keep legacy token storage in sync
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token).catch(() => { });

    // prevent old cached ME from overriding new login role
    await AsyncStorage.removeItem(ME_CACHE_KEY).catch(() => { });

    return session;
  }
);

export const logoutSession = createAsyncThunk("authSession/logout", async () => {
  await clearSession();

  await AsyncStorage.multiRemove([
    AUTH_TOKEN_KEY,
    AUTH_PHONE_KEY,
    "owner_code",
    "owner_id",
    ME_CACHE_KEY,
  ]).catch(() => { });

  return true;
});

const slice = createSlice({
  name: "authSession",
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string | null>) {
      state.token = action.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(restoreSession.fulfilled, (state, action) => {
      state.hydrated = true;
      const s = action.payload;

      state.token = s?.token ?? null;
      state.expiresAt = s?.expiresAt ?? null;

      // ✅ mark expired, but do NOT delete session here
      state.expired = !!(s?.expiresAt && Date.now() >= s.expiresAt);
    });

    b.addCase(restoreSession.rejected, (state) => {
      state.hydrated = true;
      state.token = null;
      state.expiresAt = null;
      state.expired = false;
    });

    b.addCase(persistSession.fulfilled, (state, action) => {
      state.token = action.payload.token;
      state.expiresAt = action.payload.expiresAt;
      state.expired = false;

      if (__DEV__) {
        const minLeft = Math.round((action.payload.expiresAt - Date.now()) / 60000);
        console.log(
          "[AUTH] token saved. MIN_LEFT=",
          minLeft,
          "expiresAt=",
          new Date(action.payload.expiresAt).toISOString()
        );
      }
    });

    b.addCase(logoutSession.fulfilled, (state) => {
      state.token = null;
      state.expiresAt = null;
      state.hydrated = true;
      state.expired = false;
    });
  },
});

export const { setToken } = slice.actions;
export default slice.reducer;

export const selectAuthSession = (s: any) => s.authSession as AuthSessionState;
