import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { clearSession, deriveExpiresAt, loadSession, saveSession, type StoredSession } from "./sessionStorage";

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

  // expired -> wipe it
  if (Date.now() >= s.expiresAt) {
    await clearSession();
    return null;
  }

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
    return session;
  }
);

export const logoutSession = createAsyncThunk("authSession/logout", async () => {
  await clearSession();
  return true;
});

const slice = createSlice({
  name: "authSession",
  initialState,
  reducers: {
    // optional manual set if needed
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
      state.token = null;
      state.expiresAt = null;
    });
  },
});

export const { setToken } = slice.actions;
export default slice.reducer;

// selector helper (adjust RootState path if needed)
export const selectAuthSession = (s: any) => s.authSession as AuthSessionState;
