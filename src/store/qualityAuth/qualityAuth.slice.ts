import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import { httpJson } from "../../services/http";

export type QualityInspector = {
  id: number;
  checker_name: string;
  checker_email: string;
  checker_phone: string;
  state_id: number;
  state_name: string;
  district_id: number;
  district_name: string;
  checker_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type QualityAuthState = {
  checkerCode: string | null;
  inspector: QualityInspector | null;
  loading: boolean;
  error: string | null;
};

const initialState: QualityAuthState = {
  checkerCode: null,
  inspector: null,
  loading: false,
  error: null,
};

// ✅ fetch inspector by QC code (admin-updated data)
export const fetchInspectorByCode = createAsyncThunk<
  QualityInspector,
  string,
  { rejectValue: string }
>("qualityAuth/fetchInspectorByCode", async (checkerCode, { rejectWithValue }) => {
  try {
    // backend endpoint example: GET /api/quality-checker/QC-000003
    return await httpJson<QualityInspector>(
      `/api/quality-checker/${encodeURIComponent(checkerCode)}`
    );
  } catch (e: any) {
    return rejectWithValue(e?.message || "Failed to fetch inspector");
  }
});

const qualityAuthSlice = createSlice({
  name: "qualityAuth",
  initialState,
  reducers: {
    setCheckerCode(state, action: PayloadAction<string>) {
      state.checkerCode = action.payload;
    },
    clearCheckerCode(state) {
      state.checkerCode = null;
    },

    setInspector(state, action: PayloadAction<QualityInspector>) {
      state.inspector = action.payload;
    },
    clearInspector(state) {
      state.inspector = null;
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

      // ✅ keep store checkerCode in sync with server response
      s.checkerCode = a.payload.checker_code;
    });
    b.addCase(fetchInspectorByCode.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || "Failed";
    });
  },
});

export const {
  setCheckerCode,
  clearCheckerCode,
  setInspector,
  clearInspector,
} = qualityAuthSlice.actions;

export default qualityAuthSlice.reducer;

// ✅ selectors
export const selectCheckerCode = (state: RootState) => state.qualityAuth.checkerCode;
export const selectInspector = (state: RootState) => state.qualityAuth.inspector;
export const selectInspectorLoading = (state: RootState) => state.qualityAuth.loading;
export const selectInspectorError = (state: RootState) => state.qualityAuth.error;
