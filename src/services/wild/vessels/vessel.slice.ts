// src/services/vessels/vessel.slice.ts
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ApiError, Vessel, VesselCreatePayload } from "./vesselApi";
import { vesselApi } from "./vesselApi";

type Status = "idle" | "loading" | "succeeded" | "failed";

type VesselState = {
  items: Vessel[];
  listStatus: Status;
  createStatus: Status;
  error: string | null;
  errorStatus?: number | null;
};

const initialState: VesselState = {
  items: [],
  listStatus: "idle",
  createStatus: "idle",
  error: null,
  errorStatus: null,
};

export const fetchVessels = createAsyncThunk<
  Vessel[],
  void,
  { rejectValue: { message: string; status?: number } }
>("vessels/fetchAll", async (_, { rejectWithValue }) => {
  try {
    return await vesselApi.list();
  } catch (e: any) {
    const err = e as ApiError;
    return rejectWithValue({ message: err.message, status: err.status });
  }
});

export const createVessel = createAsyncThunk<
  Vessel,
  VesselCreatePayload,
  { rejectValue: { message: string; status?: number } }
>("vessels/create", async (payload, { rejectWithValue }) => {
  try {
    return await vesselApi.create(payload);
  } catch (e: any) {
    const err = e as ApiError;
    return rejectWithValue({ message: err.message, status: err.status });
  }
});

const vesselSlice = createSlice({
  name: "vessels",
  initialState,
  reducers: {
    clearVesselError(state) {
      state.error = null;
      state.errorStatus = null;
    },
    setVessels(state, action: PayloadAction<Vessel[]>) {
      state.items = action.payload;
    },
  },
  extraReducers: (builder) => {
    // list
    builder.addCase(fetchVessels.pending, (state) => {
      state.listStatus = "loading";
      state.error = null;
      state.errorStatus = null;
    });
    builder.addCase(fetchVessels.fulfilled, (state, action) => {
      state.listStatus = "succeeded";
      state.items = action.payload;
    });
    builder.addCase(fetchVessels.rejected, (state, action) => {
      state.listStatus = "failed";
      state.error = action.payload?.message || action.error.message || "Failed";
      state.errorStatus = action.payload?.status ?? null;
    });

    // create
    builder.addCase(createVessel.pending, (state) => {
      state.createStatus = "loading";
      state.error = null;
      state.errorStatus = null;
    });
    builder.addCase(createVessel.fulfilled, (state, action) => {
      state.createStatus = "succeeded";
      state.items = [action.payload, ...state.items];
    });
    builder.addCase(createVessel.rejected, (state, action) => {
      state.createStatus = "failed";
      state.error = action.payload?.message || action.error.message || "Failed";
      state.errorStatus = action.payload?.status ?? null;
    });
  },
});

export const { clearVesselError, setVessels } = vesselSlice.actions;
export default vesselSlice.reducer;
