import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  inTransitService,
  InTransitCrate,
} from "../transport/inTransitService";

type InTransitState = {
  items: InTransitCrate[];
  loading: boolean;
  error: string | null;
};

const initialState: InTransitState = {
  items: [],
  loading: false,
  error: null,
};

const getErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.detail ||
  err?.response?.data?.message ||
  (typeof err?.response?.data === "string" ? err.response.data : "") ||
  err?.message ||
  fallback;

export const fetchInTransitCrates = createAsyncThunk<
  InTransitCrate[],
  void,
  { rejectValue: string }
>("transport/fetchInTransitCrates", async (_, { rejectWithValue }) => {
  try {
    return await inTransitService.getInTransit();
  } catch (err: any) {
    return rejectWithValue(
      getErrorMessage(err, "Failed to fetch in-transit crates")
    );
  }
});

const inTransitSlice = createSlice({
  name: "inTransit",
  initialState,
  reducers: {
    clearInTransit(state) {
      state.items = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInTransitCrates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInTransitCrates.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
        state.error = null;
      })
      .addCase(fetchInTransitCrates.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Failed to fetch in-transit crates";
      });
  },
});

export const { clearInTransit } = inTransitSlice.actions;

export default inTransitSlice.reducer;

// selectors
export const selectInTransitItems = (state: any) => state.inTransit.items;
export const selectInTransitLoading = (state: any) => state.inTransit.loading;
export const selectInTransitError = (state: any) => state.inTransit.error;