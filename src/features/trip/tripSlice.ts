// src/features/trip/tripSlice.ts

import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../store/auth/store";
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

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : NaN;
}

export const fetchTrips = createAsyncThunk<Trip[], void, { state: RootState }>(
  "trips/fetchTrips",
  async (_, thunkApi) => {
    try {
      const token = (thunkApi.getState() as any)?.auth?.token;
      return await tripApi.fetchTrips(token);
    } catch (e: any) {
      return thunkApi.rejectWithValue(e?.message || "Failed to fetch trips") as any;
    }
  },
);

export const createTrip = createAsyncThunk<Trip, TripCreatePayload, { state: RootState }>(
  "trips/createTrip",
  async (payload, thunkApi) => {
    try {
      const token = (thunkApi.getState() as any)?.auth?.token;

      const normalized: TripCreatePayload = {
        fishing_method_id: Number(n((payload as any).fishing_method_id)),
        fish_species: Number(n((payload as any).fish_species)),

        near_station: String((payload as any).near_station ?? "").trim(),
        location_id: Number(n((payload as any).location_id)),
        vessel_id: Number(n((payload as any).vessel_id)),

        planned_at: String((payload as any).planned_at ?? "").trim(),
        arrival_at: (payload as any).arrival_at ?? null,

        diesel: Number(n((payload as any).diesel)),
        ice: Number(n((payload as any).ice)),
        total: Number(n((payload as any).total)),

        qr_count: Number(n((payload as any).qr_count)),
        owner_code: String((payload as any).owner_code ?? "").trim(),
        count: Number(n((payload as any).count)),

        approval_status: String((payload as any).approval_status ?? "pending").trim(),

        ...(payload.state_id != null ? { state_id: Number(n((payload as any).state_id)) } : {}),
        ...(payload.district_id != null
          ? { district_id: Number(n((payload as any).district_id)) }
          : {}),
      };

      // ✅ fail fast (so you see real missing reason)
      if (!Number.isFinite(normalized.fishing_method_id) || normalized.fishing_method_id <= 0) {
        throw new Error("fishing_method_id missing/invalid");
      }
      if (!Number.isFinite(normalized.fish_species) || normalized.fish_species <= 0) {
        throw new Error("fish_species missing/invalid");
      }
      if (!normalized.near_station) throw new Error("near_station missing");
      if (!Number.isFinite(normalized.location_id) || normalized.location_id <= 0) {
        throw new Error("location_id missing/invalid");
      }
      if (!Number.isFinite(normalized.vessel_id) || normalized.vessel_id <= 0) {
        throw new Error("vessel_id missing/invalid");
      }
      if (!normalized.owner_code) throw new Error("owner_code missing");

      return await tripApi.createTrip(normalized, token);
    } catch (e: any) {
      return thunkApi.rejectWithValue(e?.message || "Failed to create trip") as any;
    }
  },
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
        state.error = null;
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
        state.error = null;
      })
      .addCase(createTrip.rejected, (state, action: any) => {
        state.creating = false;
        state.error = action.payload || "Failed to create trip";
      });
  },
});

export const { clearTripsError, addTripLocal } = tripsSlice.actions;

export const selectTrips = (s: RootState) => (s as any).trips.items;
export const selectTripsLoading = (s: RootState) => (s as any).trips.loading;
export const selectTripsCreating = (s: RootState) => (s as any).trips.creating;
export const selectTripsError = (s: RootState) => (s as any).trips.error;

export default tripsSlice.reducer;
