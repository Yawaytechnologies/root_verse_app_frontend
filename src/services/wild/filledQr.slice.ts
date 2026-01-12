import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const BASE_URL = "https://rootverse-backend.onrender.com";

// ✅ safe JSON / text handler (prevents Unexpected token '<')
async function safeRead(res: Response) {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (ct.includes("application/json")) {
    try {
      return { as: "json" as const, data: JSON.parse(text) };
    } catch {
      return { as: "text" as const, data: text };
    }
  }
  return { as: "text" as const, data: text };
}

export const fetchFilledByCode = createAsyncThunk(
  "filledQr/fetchFilledByCode",
  async (code: string, { rejectWithValue }) => {
    const clean = String(code || "").trim();
    if (!clean) return rejectWithValue("QR ID is required");

    const url = `${BASE_URL}/api/filled/${encodeURIComponent(clean)}`;

    try {
      const res = await fetch(url, { method: "GET" });
      const body = await safeRead(res);

      if (!res.ok) {
        // show readable error instead of JSON parse crash
        const msg =
          body.as === "json"
            ? (body.data?.message || body.data?.error || JSON.stringify(body.data))
            : String(body.data || `Request failed (${res.status})`);

        return rejectWithValue(`API ${res.status}: ${msg}`);
      }

      // expected: { success: true, qr: {...} }
      if (body.as !== "json") {
        return rejectWithValue("API did not return JSON");
      }

      return body.data;
    } catch (e: any) {
      return rejectWithValue(String(e?.message || e));
    }
  }
);

type State = {
  loading: boolean;
  data: any | null;
  error: string | null;
};

const initialState: State = {
  loading: false,
  data: null,
  error: null,
};

const filledQrSlice = createSlice({
  name: "filledQr",
  initialState,
  reducers: {
    clearFilledState: (s) => {
      s.loading = false;
      s.data = null;
      s.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchFilledByCode.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchFilledByCode.fulfilled, (s, a) => {
      s.loading = false;
      s.data = a.payload;
      s.error = null;
    });
    b.addCase(fetchFilledByCode.rejected, (s, a: any) => {
      s.loading = false;
      s.data = null;
      s.error = a.payload || "Failed";
    });
  },
});

export const { clearFilledState } = filledQrSlice.actions;
export default filledQrSlice.reducer;
