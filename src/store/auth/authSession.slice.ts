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

type AuthSessionState = {
  token: string | null;
  expiresAt: number | null;
  hydrated: boolean;
};

const initialState: AuthSessionState = {
  token: null,
  expiresAt: null,
  hydrated: false,
};

export const restoreSession = createAsyncThunk("authSession/restore", async () => {
  const s = await loadSession();
  if (!s) return null;

  if (Date.now() >= s.expiresAt) {
    await clearSession();
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY).catch(() => { });
    return null;
  }

  // keep AsyncStorage in sync (some parts still read auth_token)
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

    // ✅ sync legacy token storage
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token).catch(() => { });

    return session;
  }
);

export const logoutSession = createAsyncThunk("authSession/logout", async () => {
  await clearSession();

  // ✅ wipe persistent keys that cause role leak / wrong routing
  await AsyncStorage.multiRemove([
    AUTH_TOKEN_KEY,
    "owner_code",
    "owner_id",
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
    });

    b.addCase(restoreSession.rejected, (state) => {
      state.hydrated = true;
      state.token = null;
      state.expiresAt = null;
    });

    b.addCase(persistSession.fulfilled, (state, action) => {
      state.token = action.payload.token;
      state.expiresAt = action.payload.expiresAt;
    });

    b.addCase(logoutSession.fulfilled, (state) => {
      // keep hydrated true so layout doesn't freeze
      state.token = null;
      state.expiresAt = null;
      state.hydrated = true;
    });
  },
});

export const { setToken } = slice.actions;
export default slice.reducer;

export const selectAuthSession = (s: any) =>
  s.authSession as AuthSessionState;
