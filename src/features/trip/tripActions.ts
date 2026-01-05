import { createAsyncThunk } from "@reduxjs/toolkit";
import { tripApi, type TripCreatePayload } from "../../services/wild/tripApi";

export const postTrip = createAsyncThunk(
  "trip/postTrip",
  async (payload: TripCreatePayload, { rejectWithValue }) => {
    try {
      const res = await tripApi.createTrip(payload);
      return res;
    } catch (e: any) {
      return rejectWithValue(String(e?.message || e));
    }
  }
);
