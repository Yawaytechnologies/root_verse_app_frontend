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

      // ✅ Correct normalization:
      // - near_station MUST be string (name)
      // - location_id MUST be number (id)
      // - vessel_id SHOULD be number (id) if provided
      const vesselRaw = (payload as any).vessel_id;
      const vesselParsed =
        vesselRaw == null || vesselRaw === "" ? null : Number(vesselRaw);

      const normalized: TripCreatePayload = {
        ...payload,

        near_station: String((payload as any).near_station ?? "").trim(), // ✅ NAME
        location_id: Number((payload as any).location_id), // ✅ ID

        ...(vesselParsed != null ? { vessel_id: vesselParsed } : {}),

        diesel: Number((payload as any).diesel),
        ice: Number((payload as any).ice),
        total: Number((payload as any).total),

        qr_count: Number((payload as any).qr_count),
        count: Number((payload as any).count),

        ...(payload.state_id != null ? { state_id: Number((payload as any).state_id) } : {}),
        ...(payload.district_id != null ? { district_id: Number((payload as any).district_id) } : {}),
      };

      // 🔥 Safety checks (fail fast instead of silently saving wrong)
      if (!normalized.near_station) throw new Error("near_station (name) missing");
      if (!Number.isFinite(normalized.location_id) || normalized.location_id <= 0) {
        throw new Error("location_id missing/invalid");
      }

      // ✅ vessel_id check only when present in payload
      if (vesselRaw != null) {
        if (!Number.isFinite(vesselParsed as number) || (vesselParsed as number) <= 0) {
          throw new Error("vessel_id missing/invalid");
        }
      }

      // Optional debug:
      // console.log("CREATE TRIP PAYLOAD =>", JSON.stringify(normalized, null, 2));

      return await tripApi.createTrip(normalized, token);
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

export const selectTrips = (s: RootState) => (s as any).trips.items;
export const selectTripsLoading = (s: RootState) => (s as any).trips.loading;
export const selectTripsCreating = (s: RootState) => (s as any).trips.creating;
export const selectTripsError = (s: RootState) => (s as any).trips.error;

export default tripsSlice.reducer;
