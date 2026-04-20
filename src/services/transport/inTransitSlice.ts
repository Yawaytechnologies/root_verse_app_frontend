import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  inTransitService,
  InTransitCrate,
  TemperatureLog,
} from "../transport/inTransitService";

type InTransitState = {
  items: InTransitCrate[];
  loading: boolean;
  error: string | null;
  temperatureLogging: boolean;
  temperatureLoggingError: string | null;
};

const initialState: InTransitState = {
  items: [],
  loading: false,
  error: null,
  temperatureLogging: false,
  temperatureLoggingError: null,
};

const getErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.detail ||
  err?.response?.data?.error ||
  err?.response?.data?.message ||
  (typeof err?.response?.data === "string" ? err.response.data : "") ||
  err?.message ||
  fallback;

const getCrateId = (crate: Partial<InTransitCrate> | undefined | null) =>
  String(crate?.id ?? crate?.crateId ?? "");

const normalizeLog = (log: any): TemperatureLog => ({
  value: String(
    log?.value ?? log?.temperature ?? log?.temperature_value ?? ""
  ),
  recordedAtUtc: String(
    log?.recordedAtUtc ??
      log?.recorded_at_utc ??
      log?.created_at ??
      log?.timestamp ??
      log?.logged_at ??
      ""
  ),
  operatorId: String(
    log?.operatorId ??
      log?.operator_id ??
      log?.transport_operator_id ??
      log?.logged_by ??
      log?.user_id ??
      ""
  ),
});

const isSameLog = (a: TemperatureLog, b: TemperatureLog) =>
  String(a?.value) === String(b?.value) &&
  String(a?.recordedAtUtc) === String(b?.recordedAtUtc) &&
  String(a?.operatorId) === String(b?.operatorId);

export const fetchInTransitCrates = createAsyncThunk<
  InTransitCrate[],
  { date?: string } | undefined,
  { rejectValue: string }
>("transport/fetchInTransitCrates", async (params, { rejectWithValue }) => {
  try {
    return await inTransitService.getInTransit(params);
  } catch (err: any) {
    return rejectWithValue(
      getErrorMessage(err, "Failed to fetch in-transit crates")
    );
  }
});

export const logCrateTemperature = createAsyncThunk<
  {
    crateId: string;
    log: TemperatureLog;
    crate?: InTransitCrate;
  },
  {
    crateId: string;
    value: string;
  },
  { rejectValue: string }
>("transport/logCrateTemperature", async (payload, { rejectWithValue }) => {
  try {
    const response = await inTransitService.logTemperature(
      payload.crateId,
      payload.value
    );

    return {
      crateId: String(payload.crateId),
      log: normalizeLog(response.log),
      crate: response.crate,
    };
  } catch (err: any) {
    return rejectWithValue(getErrorMessage(err, "Failed to log temperature"));
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
      state.temperatureLogging = false;
      state.temperatureLoggingError = null;
    },

    addTemperatureLogToCrate(
      state,
      action: PayloadAction<{
        crateId: string;
        log: TemperatureLog;
      }>
    ) {
      const crateId = String(action.payload.crateId);
      const log = normalizeLog(action.payload.log);

      const item = state.items.find((crate) => getCrateId(crate) === crateId);

      if (!item) return;

      const currentLogs = Array.isArray(item.temperatureLogs)
        ? item.temperatureLogs
        : [];

      const alreadyExists = currentLogs.some((existing) =>
        isSameLog(existing, log)
      );

      if (!alreadyExists) {
        item.temperatureLogs = [log, ...currentLogs];
      }
    },

    replaceCrateInInTransit(
      state,
      action: PayloadAction<{
        crateId: string;
        crate: Partial<InTransitCrate>;
      }>
    ) {
      const crateId = String(action.payload.crateId);
      const nextCrate = action.payload.crate;

      const index = state.items.findIndex(
        (item) => getCrateId(item) === crateId
      );

      if (index === -1) return;

      state.items[index] = {
        ...state.items[index],
        ...nextCrate,
        temperatureLogs:
          nextCrate.temperatureLogs ?? state.items[index].temperatureLogs ?? [],
      };
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
        state.error = action.payload || "Failed to fetch in-transit crates";
      })

      .addCase(logCrateTemperature.pending, (state) => {
        state.temperatureLogging = true;
        state.temperatureLoggingError = null;
      })
      .addCase(logCrateTemperature.fulfilled, (state, action) => {
        state.temperatureLogging = false;
        state.temperatureLoggingError = null;

        const crateId = String(action.payload.crateId);
        const log = normalizeLog(action.payload.log);

        const index = state.items.findIndex(
          (item) => getCrateId(item) === crateId
        );

        if (index === -1) return;

        const existingItem = state.items[index];
        const currentLogs = Array.isArray(existingItem.temperatureLogs)
          ? existingItem.temperatureLogs
          : [];

        const alreadyExists = currentLogs.some((existing) =>
          isSameLog(existing, log)
        );

        state.items[index] = {
          ...existingItem,
          ...(action.payload.crate || {}),
          temperatureLogs: alreadyExists ? currentLogs : [log, ...currentLogs],
        };
      })
      .addCase(logCrateTemperature.rejected, (state, action) => {
        state.temperatureLogging = false;
        state.temperatureLoggingError =
          action.payload || "Failed to log temperature";
      });
  },
});

export const {
  clearInTransit,
  addTemperatureLogToCrate,
  replaceCrateInInTransit,
} = inTransitSlice.actions;

export default inTransitSlice.reducer;

export const selectInTransitItems = (state: any) => state.inTransit.items;
export const selectInTransitLoading = (state: any) => state.inTransit.loading;
export const selectInTransitError = (state: any) => state.inTransit.error;
export const selectTemperatureLogging = (state: any) =>
  state.inTransit.temperatureLogging;
export const selectTemperatureLoggingError = (state: any) =>
  state.inTransit.temperatureLoggingError;