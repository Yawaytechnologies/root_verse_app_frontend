import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../auth/store";

// ✅ demo code used in layout
const DEMO_QC_CODE = "QC-000003";

export type Inspector = {
  checker_code: string;
  checker_name: string;
  checker_email: string;
  checker_phone: string;
  state_id: number;
  district_id: number;
  is_active: boolean;
  rootverse_type: "QUALITY_CHECKER";
};

type State = {
  checkerCode: string | null;
  inspector: Inspector | null;
  loading: boolean;
  error: string | null;
};

const initialState: State = {
  checkerCode: null,
  inspector: null,
  loading: false,
  error: null,
};

export const fetchInspectorByCode = createAsyncThunk<Inspector, string, { rejectValue: string }>(
  "qualityAuth/fetchInspectorByCode",
  async (checkerCode, { rejectWithValue }) => {
    try {
      const code = String(checkerCode || "").trim();

 

      // later: call backend endpoint here
      return rejectWithValue("QC_ENDPOINT_NOT_READY");
    } catch (e: any) {
      return rejectWithValue(e?.message || "QC_FETCH_FAILED");
    }
  }
);

const slice = createSlice({
  name: "qualityAuth",
  initialState,
  reducers: {
    setCheckerCode(state, action: PayloadAction<string>) {
      state.checkerCode = action.payload;
    },
    clearInspector(state) {
      state.inspector = null;
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchInspectorByCode.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchInspectorByCode.fulfilled, (s, a) => {
      s.loading = false;
      s.inspector = a.payload;
    });
    b.addCase(fetchInspectorByCode.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || "QC_FETCH_FAILED";
    });
  },
});

export const { setCheckerCode, clearInspector } = slice.actions;

export const selectCheckerCode = (s: RootState) => (s as any).qualityAuth?.checkerCode ?? null;
export const selectInspector = (s: RootState) => (s as any).qualityAuth?.inspector ?? null;

export default slice.reducer;
