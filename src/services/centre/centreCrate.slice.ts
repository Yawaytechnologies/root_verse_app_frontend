import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  ApiCrate,
  centreCrateService,
  CentreDashboardRes,
  CollectionCentreOperator,
} from "./centreCrate.service";

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

type CentreCrateState = {
  status: AsyncStatus;
  error: string | null;

  dashboard: CentreDashboardRes | null;
  crates: ApiCrate[];

  scannedCrate: ApiCrate | null;
  lastCrate: ApiCrate | null;
  lastTempLoggedAt: string | null;

  currentCollectionOperator: CollectionCentreOperator | null;
};

const initialState: CentreCrateState = {
  status: "idle",
  error: null,

  dashboard: null,
  crates: [],

  scannedCrate: null,
  lastCrate: null,
  lastTempLoggedAt: null,

  currentCollectionOperator: null,
};

const getErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message ||
  err?.response?.data?.detail ||
  (typeof err?.response?.data === "string" ? err.response.data : "") ||
  err?.message ||
  fallback;

function pickMeCollectionOperator(state: any): CollectionCentreOperator | null {
  const me = state?.me?.me;
  const role = String(
    me?.role ??
      me?.rootverse_type ??
      me?.user?.role ??
      me?.user?.rootverse_type ??
      ""
  ).toUpperCase();

  if (role !== "COLLECTION_CENTRE_OPERATOR") return null;

  return {
    ...me,
    user_id: String(
      me?.operator_rv_id ?? me?.user_id ?? me?.userId ?? me?.id ?? ""
    ),
    full_name: String(me?.full_name ?? me?.fullName ?? ""),
    email: String(me?.email ?? ""),
    mobile: String(me?.mobile ?? me?.phone ?? me?.phone_no ?? ""),
    role: "COLLECTION_CENTRE_OPERATOR",
    is_active: Boolean(me?.is_active ?? me?.isActive ?? true),
    created_at: String(me?.created_at ?? me?.createdAt ?? ""),
  };
}

function pickMobileFromState(state: any) {
  return String(
    state?.me?.me?.mobile ??
      state?.me?.me?.phone ??
      state?.me?.me?.phone_no ??
      state?.me?.profile?.mobile ??
      state?.login?.user?.mobile ??
      state?.login?.user?.phone ??
      state?.login?.user?.phone_no ??
      state?.auth?.user?.mobile ??
      ""
  ).trim();
}

function upsertCrate(list: ApiCrate[], crate: ApiCrate): ApiCrate[] {
  const crateKey = String(crate?.crateId ?? crate?.id ?? crate?.code ?? "");

  if (!crateKey) {
    return [crate, ...list];
  }

  const next = [...list];
  const index = next.findIndex((item) => {
    const itemKey = String(item?.crateId ?? item?.id ?? item?.code ?? "");
    return itemKey === crateKey;
  });

  if (index >= 0) {
    next[index] = {
      ...next[index],
      ...crate,
    };
    return next;
  }

  return [crate, ...next];
}

export const fetchCentreDashboardThunk = createAsyncThunk(
  "centreCrate/fetchDashboard",
  async (_, { rejectWithValue }) => {
    try {
      return await centreCrateService.getDashboard();
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, "Failed to fetch dashboard"));
    }
  }
);

export const fetchCentreCratesThunk = createAsyncThunk(
  "centreCrate/fetchCrates",
  async (_, { rejectWithValue }) => {
    try {
      return await centreCrateService.getCrates();
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, "Failed to fetch crates"));
    }
  }
);

export const getCrateByIdThunk = createAsyncThunk(
  "centreCrate/getCrateById",
  async (crateId: number | string, { rejectWithValue }) => {
    try {
      return await centreCrateService.getCrateById(crateId);
    } catch (err: any) {
      return rejectWithValue(
        getErrorMessage(err, "Failed to fetch crate details")
      );
    }
  }
);

export const getCrateByQrThunk = createAsyncThunk(
  "centreCrate/getCrateByQr",
  async ({ qrValue }: { qrValue: string }, { rejectWithValue }) => {
    try {
      const cleanQr = String(qrValue ?? "").trim();

      if (!cleanQr) {
        throw new Error("Scanned QR value is empty");
      }

      return await centreCrateService.getCrateByCode(cleanQr);
    } catch (err: any) {
      return rejectWithValue(
        getErrorMessage(err, "Unable to find crate for this QR")
      );
    }
  }
);

export const centreReceiveThunk = createAsyncThunk(
  "centreCrate/receive",
  async ({ qrValue }: { qrValue: string }, { rejectWithValue }) => {
    try {
      return await centreCrateService.receiveCrate({ qrValue });
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, "Failed to receive crate"));
    }
  }
);

export const centreTempLogThunk = createAsyncThunk(
  "centreCrate/tempLog",
  async (
    { crateId, tempC }: { crateId: number | string; tempC: number },
    { rejectWithValue }
  ) => {
    try {
      return await centreCrateService.logTemperature({ crateId, tempC });
    } catch (err: any) {
      return rejectWithValue(
        getErrorMessage(err, "Failed to log crate temperature")
      );
    }
  }
);

export const centreScheduleThunk = createAsyncThunk(
  "centreCrate/assignDispatch",
  async (
    {
      crateId,
      destinationName,
      transportOperatorId,
      transportId,
      scheduledTimeUtc,
      assignedToLabel,
      driverName,
      vehicleNo,
      operatorId,
      notes,
    }: {
      crateId: number | string;
      destinationName: string;
      transportOperatorId: string;
      transportId?: string;
      scheduledTimeUtc: string;
      assignedToLabel?: string;
      driverName?: string;
      vehicleNo?: string;
      operatorId?: string;
      notes?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      return await centreCrateService.assignDispatch({
        crateId,
        destinationName,
        transportOperatorId,
        transportId,
        scheduledTimeUtc,
        assignedToLabel,
        driverName,
        vehicleNo,
        operatorId,
        notes,
      });
    } catch (err: any) {
      return rejectWithValue(
        getErrorMessage(err, "Failed to assign dispatch")
      );
    }
  }
);

export const fetchLoggedInCollectionOperatorThunk = createAsyncThunk(
  "centreCrate/fetchLoggedInCollectionOperator",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state: any = getState();
      const meOperator = pickMeCollectionOperator(state);

      if (meOperator) {
        return meOperator;
      }

      const mobile =
        pickMobileFromState(state) ||
        String((await AsyncStorage.getItem("auth_phone_no")) ?? "").trim();

      if (!mobile) {
        return rejectWithValue("Logged-in mobile number not found");
      }

      const operator =
        await centreCrateService.getLoggedInCollectionCentreOperator(mobile);

      if (!operator) {
        return rejectWithValue("Collection centre operator not found");
      }

      return operator;
    } catch (err: any) {
      return rejectWithValue(
        getErrorMessage(err, "Failed to fetch collection centre operator")
      );
    }
  }
);

const centreCrateSlice = createSlice({
  name: "centreCrate",
  initialState,
  reducers: {
    clearCentreCrateError(state) {
      state.error = null;
    },
    clearScannedCrate(state) {
      state.scannedCrate = null;
    },
    clearLastCrate(state) {
      state.lastCrate = null;
    },
    clearCurrentCollectionOperator(state) {
      state.currentCollectionOperator = null;
    },
    setScannedCrate(state, action) {
      state.scannedCrate = action.payload || null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCentreDashboardThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCentreDashboardThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.dashboard = action.payload;
      })
      .addCase(fetchCentreDashboardThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = String(action.payload || "Failed to fetch dashboard");
      })

      .addCase(fetchCentreCratesThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCentreCratesThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.crates = action.payload || [];
      })
      .addCase(fetchCentreCratesThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = String(action.payload || "Failed to fetch crates");
      })

      .addCase(getCrateByIdThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(getCrateByIdThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.scannedCrate = action.payload;
        state.crates = upsertCrate(state.crates, action.payload);
      })
      .addCase(getCrateByIdThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = String(action.payload || "Failed to fetch crate");
      })

      .addCase(getCrateByQrThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(getCrateByQrThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.scannedCrate = action.payload;
        state.crates = upsertCrate(state.crates, action.payload);
      })
      .addCase(getCrateByQrThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = String(action.payload || "Failed to find crate");
      })

      .addCase(centreReceiveThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(centreReceiveThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.lastCrate = action.payload;
        state.scannedCrate = action.payload;
        state.crates = upsertCrate(state.crates, action.payload);
      })
      .addCase(centreReceiveThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = String(action.payload || "Failed to receive crate");
      })

      .addCase(centreTempLogThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(centreTempLogThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.lastCrate = action.payload;
        state.scannedCrate = action.payload;
        state.crates = upsertCrate(state.crates, action.payload);
        state.lastTempLoggedAt =
          action.payload?.loggedAt ||
          action.payload?.updatedAt ||
          action.payload?.createdAt ||
          new Date().toISOString();
      })
      .addCase(centreTempLogThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = String(action.payload || "Failed to log temperature");
      })

      .addCase(centreScheduleThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(centreScheduleThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.lastCrate = action.payload;
        state.scannedCrate = action.payload;
        state.crates = upsertCrate(state.crates, action.payload);
      })
      .addCase(centreScheduleThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = String(action.payload || "Failed to assign dispatch");
      })

      .addCase(fetchLoggedInCollectionOperatorThunk.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchLoggedInCollectionOperatorThunk.fulfilled, (state, action) => {
        state.currentCollectionOperator = action.payload;
      })
      .addCase(fetchLoggedInCollectionOperatorThunk.rejected, (state, action) => {
        state.error = String(
          action.payload || "Failed to fetch collection operator"
        );
      });
  },
});

export const {
  clearCentreCrateError,
  clearScannedCrate,
  clearLastCrate,
  clearCurrentCollectionOperator,
  setScannedCrate,
} = centreCrateSlice.actions;

export default centreCrateSlice.reducer;

export const selectCentreCrateState = (state: any) => state.centreCrate;
export const selectCentreCrateStatus = (state: any) =>
  state?.centreCrate?.status || "idle";
export const selectCentreCrateError = (state: any) =>
  state?.centreCrate?.error || null;
export const selectCentreDashboard = (state: any) =>
  state?.centreCrate?.dashboard || null;
export const selectCentreCrates = (state: any) =>
  state?.centreCrate?.crates || [];
export const selectScannedCrate = (state: any) =>
  state?.centreCrate?.scannedCrate || null;
export const selectCentreLastCrate = (state: any) =>
  state?.centreCrate?.lastCrate || null;
export const selectCentreLastTempLoggedAt = (state: any) =>
  state?.centreCrate?.lastTempLoggedAt || null;
export const selectCurrentCollectionOperator = (state: any) =>
  state?.centreCrate?.currentCollectionOperator || null;