// src/features/trip/tripSlice.ts

import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../store/store";
import { tripApi, Trip, TripCreatePayload } from "../../services/wild/tripApi";

type TripsState = {
  items: Trip[];
  loading: boolean;
  creating: boolean;
  error: string | null;
};

const initialState: TripsState = {
  items: [],
  loading: false,
  creating: false,
  error: null,
};

export const fetchTrips = createAsyncThunk<Trip[], void, { state: RootState }>(
  "trips/fetchTrips",
  async (_, thunkApi) => {
    try {
      const token = (thunkApi.getState() as any)?.auth?.token;
      return await tripApi.fetchTrips(token);
    } catch (e: any) {
      return thunkApi.rejectWithValue(e?.message || "Failed to fetch trips") as any;
    }
  }
);

export const createTrip = createAsyncThunk<Trip, TripCreatePayload, { state: RootState }>(
  "trips/createTrip",
  async (payload, thunkApi) => {
    try {
      const token = (thunkApi.getState() as any)?.auth?.token;
      return await tripApi.createTrip(payload, token);
    } catch (e: any) {
      return thunkApi.rejectWithValue(e?.message || "Failed to create trip") as any;
    }
  }
);

const tripsSlice = createSlice({
  name: "trips",
  initialState,
  reducers: {
    clearTripsError(state) {
      state.error = null;
    },
    addTripLocal(state, action: PayloadAction<Trip>) {
      state.items.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrips.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrips.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTrips.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch trips";
      })

      .addCase(createTrip.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createTrip.fulfilled, (state, action) => {
        state.creating = false;
        state.items.unshift(action.payload);
      })
      .addCase(createTrip.rejected, (state, action: any) => {
        state.creating = false;
        state.error = action.payload || "Failed to create trip";
      });
  },
});

export const { clearTripsError, addTripLocal } = tripsSlice.actions;

export const selectTrips = (s: RootState) => s.trips.items;
export const selectTripsLoading = (s: RootState) => s.trips.loading;
export const selectTripsCreating = (s: RootState) => s.trips.creating;
export const selectTripsError = (s: RootState) => s.trips.error;

export default tripsSlice.reducer;
