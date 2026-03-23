import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  fetchOwnerFarms,
  fetchAllPonds,
  type FarmRecord,
  type PondRecord,
} from "../../../services/aqua/registration.service";

type ApprovalsState = {
  farms: FarmRecord[];
  ponds: PondRecord[];
  loading: boolean;
  error: string | null;
};

const initialState: ApprovalsState = {
  farms: [],
  ponds: [],
  loading: false,
  error: null,
};

export const fetchAquaApprovals = createAsyncThunk<
  { farms: FarmRecord[]; ponds: PondRecord[] },
  string,
  { rejectValue: string }
>("aquaApprovals/fetch", async (numericOwnerId, { rejectWithValue }) => {
  try {
    const farms = await fetchOwnerFarms(numericOwnerId);
    const allPonds = await fetchAllPonds();
    const ownerFarmIds = new Set(farms.map((f) => f.id));
    const ponds = allPonds.filter((p) => ownerFarmIds.has(p.farm_id));
    return { farms, ponds };
  } catch (error: any) {
    return rejectWithValue(error?.message || "Failed to load approvals");
  }
});

const approvalsSlice = createSlice({
  name: "aquaApprovals",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAquaApprovals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAquaApprovals.fulfilled, (state, action) => {
        state.loading = false;
        state.farms = action.payload.farms;
        state.ponds = action.payload.ponds;
      })
      .addCase(fetchAquaApprovals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to load approvals";
      });
  },
});

export default approvalsSlice.reducer;
