import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Crate } from "../../types/models";
import {
  centreCrateService,
  type CentreGetCrateByQrParams,
  type CentreReceiveParams,
  type CentreScheduleParams,
  type CentreTempParams,
} from "./centreCrate.service";

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

type CentreCrateState = {
  status: AsyncStatus;
  error: string | null;

  scannedCrate: Crate | null; // fetched after scan, before confirm
  lastCrate: Crate | null; // last successful receive/schedule
  lastTempLoggedAt: string | null;
  lastQrValue: string | null;
};

const initialState: CentreCrateState = {
  status: "idle",
  error: null,
  scannedCrate: null,
  lastCrate: null,
  lastTempLoggedAt: null,
  lastQrValue: null,
};

/** Fetch crate detail by QR for verification */
export const getCrateByQrThunk = createAsyncThunk<
  Crate,
  CentreGetCrateByQrParams,
  { rejectValue: string }
>("centreCrate/getByQr", async (params, { rejectWithValue }) => {
  try {
    return await centreCrateService.getByQr(params);
  } catch (e: any) {
    return rejectWithValue(e?.message || "Failed to fetch crate");
  }
});

/** Receive crate after verification */
export const centreReceiveThunk = createAsyncThunk<
  Crate,
  CentreReceiveParams,
  { rejectValue: string }
>("centreCrate/receive", async (params, { rejectWithValue }) => {
  try {
    return await centreCrateService.receive(params);
  } catch (e: any) {
    return rejectWithValue(e?.message || "Receive failed");
  }
});

/** Schedule dispatch */
export const centreScheduleThunk = createAsyncThunk<
  Crate,
  CentreScheduleParams,
  { rejectValue: string }
>("centreCrate/scheduleDispatch", async (params, { rejectWithValue }) => {
  try {
    return await centreCrateService.scheduleDispatch(params);
  } catch (e: any) {
    return rejectWithValue(e?.message || "Schedule failed");
  }
});

/** Temp log */
export const centreTempLogThunk = createAsyncThunk<
  { ok: true; qrValue: string },
  CentreTempParams,
  { rejectValue: string }
>("centreCrate/logTemp", async (params, { rejectWithValue }) => {
  try {
    await centreCrateService.logTemp(params);
    return { ok: true, qrValue: params.qrValue };
  } catch (e: any) {
    return rejectWithValue(e?.message || "Temp log failed");
  }
});

const centreCrateSlice = createSlice({
  name: "centreCrate",
  initialState,
  reducers: {
    resetCentreCrate(state) {
      state.status = "idle";
      state.error = null;
      state.scannedCrate = null;
      state.lastCrate = null;
      state.lastTempLoggedAt = null;
      state.lastQrValue = null;
    },

    clearCentreError(state) {
      state.error = null;
    },

    setLastQrValue(state, action: PayloadAction<string | null>) {
      state.lastQrValue = action.payload;
    },

    clearScannedCrate(state) {
      state.scannedCrate = null;
    },
  },
  extraReducers: (builder) => {
    // get crate by qr
    builder.addCase(getCrateByQrThunk.pending, (state, action) => {
      state.status = "loading";
      state.error = null;
      state.lastQrValue = action.meta.arg.qrValue;
      state.scannedCrate = null;
    });

    builder.addCase(getCrateByQrThunk.fulfilled, (state, action) => {
      state.status = "idle";
      state.error = null;
      state.scannedCrate = action.payload;
    });

    builder.addCase(getCrateByQrThunk.rejected, (state, action) => {
      state.status = "failed";
      state.error = (action.payload as string) || "Failed to fetch crate";
      state.scannedCrate = null;
    });

    // receive
    builder.addCase(centreReceiveThunk.pending, (state, action) => {
      state.status = "loading";
      state.error = null;
      state.lastQrValue = action.meta.arg.qrValue;
    });

    builder.addCase(centreReceiveThunk.fulfilled, (state, action) => {
      state.status = "succeeded";
      state.error = null;
      state.lastCrate = action.payload;
      state.scannedCrate = null; // clear preview after successful receive
    });

    builder.addCase(centreReceiveThunk.rejected, (state, action) => {
      state.status = "failed";
      state.error = (action.payload as string) || "Receive failed";
    });

    // schedule
    builder.addCase(centreScheduleThunk.pending, (state, action) => {
      state.status = "loading";
      state.error = null;
      state.lastQrValue = action.meta.arg.qrValue;
    });

    builder.addCase(centreScheduleThunk.fulfilled, (state, action) => {
      state.status = "succeeded";
      state.error = null;
      state.lastCrate = action.payload;
    });

    builder.addCase(centreScheduleThunk.rejected, (state, action) => {
      state.status = "failed";
      state.error = (action.payload as string) || "Schedule failed";
    });

    // temp log
    builder.addCase(centreTempLogThunk.pending, (state, action) => {
      state.status = "loading";
      state.error = null;
      state.lastQrValue = action.meta.arg.qrValue;
    });

    builder.addCase(centreTempLogThunk.fulfilled, (state) => {
      state.status = "succeeded";
      state.error = null;
      state.lastTempLoggedAt = new Date().toISOString();
    });

    builder.addCase(centreTempLogThunk.rejected, (state, action) => {
      state.status = "failed";
      state.error = (action.payload as string) || "Temp log failed";
    });
  },
});

export const {
  resetCentreCrate,
  clearCentreError,
  setLastQrValue,
  clearScannedCrate,
} = centreCrateSlice.actions;

export default centreCrateSlice.reducer;

/** selectors */
export const selectCentreCrateStatus = (s: any) =>
  s.centreCrate.status as AsyncStatus;

export const selectCentreCrateError = (s: any) =>
  s.centreCrate.error as string | null;

export const selectScannedCrate = (s: any) =>
  s.centreCrate.scannedCrate as Crate | null;

export const selectCentreLastCrate = (s: any) =>
  s.centreCrate.lastCrate as Crate | null;

export const selectCentreLastQrValue = (s: any) =>
  s.centreCrate.lastQrValue as string | null;

export const selectCentreLastTempLoggedAt = (s: any) =>
  s.centreCrate.lastTempLoggedAt as string | null;