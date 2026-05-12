import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  fetchCultureCyclesByUserId,
  type CultureCycleRecord,
} from "../../../services/aqua/cultureCycle.service";

type CultureCyclesState = {
  items: CultureCycleRecord[];
  loading: boolean;
  error: string | null;
  selectedId: string;
};

const initialState: CultureCyclesState = {
  items: [],
  loading: false,
  error: null,
  selectedId: "",
};

export const fetchUserCultureCycles = createAsyncThunk<
  CultureCycleRecord[],
  number | string,
  { rejectValue: string }
>("aquaCultureCycles/fetchUser", async (userId, { rejectWithValue }) => {
  const result = await fetchCultureCyclesByUserId(userId);

  if (!result.ok) {
    return rejectWithValue(result.message || "Failed to fetch culture cycles");
  }

  return result.data || [];
});

const cultureCyclesSlice = createSlice({
  name: "aquaCultureCycles",
  initialState,
  reducers: {
    setSelectedCultureCycleId: (state, action: PayloadAction<string>) => {
      state.selectedId = action.payload;
    },
    clearCultureCyclesState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserCultureCycles.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.items = [];
      })
      .addCase(fetchUserCultureCycles.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchUserCultureCycles.rejected, (state, action) => {
        state.loading = false;
        state.items = [];
        state.error = action.payload ?? "Failed to fetch culture cycles";
      });
  },
});

export const { setSelectedCultureCycleId, clearCultureCyclesState } =
  cultureCyclesSlice.actions;

export default cultureCyclesSlice.reducer;
