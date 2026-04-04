import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import transportService, {
  AssignedCratesResponse,
  ScanPickupPayload,
  ScanPickupResponse,
  TransportCrate,
  TransportDashboardResponse,
  TransportOperator,
} from "./transportService";

const getErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.detail ||
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  (typeof err?.response?.data === "string" ? err.response.data : "") ||
  err?.message ||
  fallback;

function pickMeTransportOperator(state: any): TransportOperator | null {
  const me = state?.me?.me;
  const role = String(
    me?.role ??
      me?.rootverse_type ??
      me?.user?.role ??
      me?.user?.rootverse_type ??
      ""
  ).toUpperCase();

  if (role !== "TRANSPORT_OPERATOR") return null;

  return {
    ...me,
    user_id: String(
      me?.operator_rv_id ?? me?.user_id ?? me?.userId ?? me?.id ?? ""
    ),
    full_name: String(me?.full_name ?? me?.fullName ?? me?.name ?? ""),
    email: String(me?.email ?? ""),
    mobile: String(me?.mobile ?? me?.phone ?? me?.phone_no ?? ""),
    role: "TRANSPORT_OPERATOR",
    is_active: Boolean(me?.is_active ?? me?.isActive ?? true),
    created_at: String(me?.created_at ?? me?.createdAt ?? ""),
  };
}

type TransportState = {
  dashboardLoading: boolean;
  assignedLoading: boolean;
  scanLoading: boolean;

  dashboardError: string | null;
  assignedError: string | null;
  scanError: string | null;

  currentTransport: Record<string, any> | null;
  currentTransportOperator: TransportOperator | null;

  stats: {
    totalMyCrates: number;
    assigned: number;
    inTransit: number;
  };

  assignedCrates: TransportCrate[];
  inTransitCrates: TransportCrate[];
  selectedDate: string | null;

  lastScanResult: any | null;
  lastScanMessage: string | null;
};

const initialState: TransportState = {
  dashboardLoading: false,
  assignedLoading: false,
  scanLoading: false,

  dashboardError: null,
  assignedError: null,
  scanError: null,

  currentTransport: null,
  currentTransportOperator: null,

  stats: {
    totalMyCrates: 0,
    assigned: 0,
    inTransit: 0,
  },

  assignedCrates: [],
  inTransitCrates: [],
  selectedDate: null,

  lastScanResult: null,
  lastScanMessage: null,
};

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

export const fetchTransportDashboard = createAsyncThunk<
  TransportDashboardResponse,
  { date?: string } | undefined,
  { rejectValue: string }
>("transport/fetchTransportDashboard", async (params, { rejectWithValue }) => {
  try {
    return await transportService.getDashboard(params);
  } catch (err: any) {
    return rejectWithValue(
      getErrorMessage(err, "Failed to fetch transport dashboard")
    );
  }
});

export const fetchAssignedCrates = createAsyncThunk<
  AssignedCratesResponse,
  { date?: string } | undefined,
  { rejectValue: string }
>("transport/fetchAssignedCrates", async (params, { rejectWithValue }) => {
  try {
    return await transportService.getAssignedCrates(params);
  } catch (err: any) {
    return rejectWithValue(
      getErrorMessage(err, "Failed to fetch assigned crates")
    );
  }
});

export const scanPickupCrate = createAsyncThunk<
  ScanPickupResponse,
  ScanPickupPayload,
  { rejectValue: string }
>("transport/scanPickupCrate", async (payload, { rejectWithValue }) => {
  try {
    return await transportService.scanPickup(payload);
  } catch (err: any) {
    return rejectWithValue(
      getErrorMessage(err, "Failed to scan pickup crate")
    );
  }
});

export const fetchLoggedInTransportOperatorThunk = createAsyncThunk<
  TransportOperator,
  void,
  { rejectValue: string }
>("transport/fetchLoggedInTransportOperator", async (_, { getState, rejectWithValue }) => {
  try {
    const state: any = getState();
    const meOperator = pickMeTransportOperator(state);

    if (meOperator) {
      return meOperator;
    }

    const mobile =
      pickMobileFromState(state) ||
      String((await AsyncStorage.getItem("auth_phone_no")) ?? "").trim();

    if (!mobile) {
      return rejectWithValue("Logged-in mobile number not found");
    }

    const operator = await transportService.getLoggedInTransportOperator(mobile);

    if (!operator) {
      return rejectWithValue("Transport operator not found");
    }

    return operator;
  } catch (err: any) {
    return rejectWithValue(
      getErrorMessage(err, "Failed to fetch transport operator")
    );
  }
});

const normalizeAssignedCrates = (
  payload: AssignedCratesResponse
): TransportCrate[] => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.assignedCrates)) return payload.data.assignedCrates;
  return [];
};

const transportSlice = createSlice({
  name: "transport",
  initialState,
  reducers: {
    setSelectedTransportDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload;
    },

    clearTransportErrors: (state) => {
      state.dashboardError = null;
      state.assignedError = null;
      state.scanError = null;
    },

    clearLastScanResult: (state) => {
      state.lastScanResult = null;
      state.lastScanMessage = null;
      state.scanError = null;
    },

    clearCurrentTransportOperator: (state) => {
      state.currentTransportOperator = null;
    },

    resetTransportState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransportDashboard.pending, (state) => {
        state.dashboardLoading = true;
        state.dashboardError = null;
      })
      .addCase(fetchTransportDashboard.fulfilled, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardError = null;

        const data = action.payload?.data ?? {};

        state.currentTransport = data?.currentTransport ?? null;
        state.stats = {
          totalMyCrates: Number(data?.stats?.totalMyCrates ?? 0),
          assigned: Number(data?.stats?.assigned ?? 0),
          inTransit: Number(data?.stats?.inTransit ?? 0),
        };

        state.assignedCrates = Array.isArray(data?.assignedCrates)
          ? data.assignedCrates
          : [];

        state.inTransitCrates = Array.isArray(data?.inTransitCrates)
          ? data.inTransitCrates
          : [];

        state.selectedDate = data?.selectedDate ?? state.selectedDate;
      })
      .addCase(fetchTransportDashboard.rejected, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardError =
          action.payload || "Failed to fetch transport dashboard";
      })

      .addCase(fetchAssignedCrates.pending, (state) => {
        state.assignedLoading = true;
        state.assignedError = null;
      })
      .addCase(fetchAssignedCrates.fulfilled, (state, action) => {
        state.assignedLoading = false;
        state.assignedError = null;
        state.assignedCrates = normalizeAssignedCrates(action.payload);
      })
      .addCase(fetchAssignedCrates.rejected, (state, action) => {
        state.assignedLoading = false;
        state.assignedError =
          action.payload || "Failed to fetch assigned crates";
      })

      .addCase(scanPickupCrate.pending, (state) => {
        state.scanLoading = true;
        state.scanError = null;
        state.lastScanMessage = null;
      })
      .addCase(scanPickupCrate.fulfilled, (state, action) => {
        state.scanLoading = false;
        state.scanError = null;

        state.lastScanResult = action.payload?.data ?? action.payload ?? null;
        state.lastScanMessage =
          action.payload?.message || "Crate scanned successfully";

        const data = action.payload?.data;

        if (Array.isArray(data?.assignedCrates)) {
          state.assignedCrates = data.assignedCrates;
        }

        if (Array.isArray(data?.inTransitCrates)) {
          state.inTransitCrates = data.inTransitCrates;
        }

        if (data?.stats) {
          state.stats = {
            totalMyCrates: Number(
              data?.stats?.totalMyCrates ?? state.stats.totalMyCrates
            ),
            assigned: Number(data?.stats?.assigned ?? state.stats.assigned),
            inTransit: Number(data?.stats?.inTransit ?? state.stats.inTransit),
          };
        }
      })
      .addCase(scanPickupCrate.rejected, (state, action) => {
        state.scanLoading = false;
        state.scanError = action.payload || "Failed to scan pickup crate";
        state.lastScanMessage = action.payload || "Failed to scan pickup crate";
      })

      .addCase(fetchLoggedInTransportOperatorThunk.pending, (state) => {
        state.dashboardError = null;
      })
      .addCase(fetchLoggedInTransportOperatorThunk.fulfilled, (state, action) => {
        state.currentTransportOperator = action.payload;
      })
      .addCase(fetchLoggedInTransportOperatorThunk.rejected, (state, action) => {
        state.dashboardError =
          action.payload || "Failed to fetch transport operator";
      });
  },
});

export const {
  setSelectedTransportDate,
  clearTransportErrors,
  clearLastScanResult,
  clearCurrentTransportOperator,
  resetTransportState,
} = transportSlice.actions;

export default transportSlice.reducer;

export const selectTransportState = (state: any) => state.transport;

export const selectTransportDashboardLoading = (state: any) =>
  state.transport.dashboardLoading;

export const selectAssignedCratesLoading = (state: any) =>
  state.transport.assignedLoading;

export const selectScanPickupLoading = (state: any) =>
  state.transport.scanLoading;

export const selectTransportDashboardError = (state: any) =>
  state.transport.dashboardError;

export const selectAssignedCratesError = (state: any) =>
  state.transport.assignedError;

export const selectScanPickupError = (state: any) =>
  state.transport.scanError;

export const selectCurrentTransport = (state: any) =>
  state.transport.currentTransport;

export const selectCurrentTransportOperator = (state: any) =>
  state.transport.currentTransportOperator;

export const selectTransportStats = (state: any) =>
  state.transport.stats;

export const selectAssignedCrates = (state: any) =>
  state.transport.assignedCrates;

export const selectInTransitCrates = (state: any) =>
  state.transport.inTransitCrates;

export const selectTransportSelectedDate = (state: any) =>
  state.transport.selectedDate;

export const selectLastScanResult = (state: any) =>
  state.transport.lastScanResult;

export const selectLastScanMessage = (state: any) =>
  state.transport.lastScanMessage;
