import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import transportService, {
  ScanPickupPayload,
  TransportCrate,
  TransportOperator,
} from "./transportService";

type DashboardData = {
  currentTransport: any;
  stats: {
    totalMyCrates: number;
    assigned: number;
    inTransit: number;
  };
  assignedCrates: TransportCrate[];
  inTransitCrates: TransportCrate[];
  selectedDate: string;
  raw?: any;
};

type TransportState = {
  selectedDate: string;
  currentTransport: any | null;
  currentTransportOperator: TransportOperator | null;
  stats: {
    totalMyCrates: number;
    assigned: number;
    inTransit: number;
  };
  assignedCrates: TransportCrate[];
  inTransitCrates: TransportCrate[];
  dashboardLoading: boolean;
  dashboardError: string | null;
  assignedLoading: boolean;
  assignedError: string | null;
  scanPickupLoading: boolean;
  scanPickupError: string | null;
  lastScanMessage: string | null;
  operatorLoading: boolean;
  operatorError: string | null;
};

const PHONE_KEY = "auth_phone_no";

const initialState: TransportState = {
  selectedDate: "",
  currentTransport: null,
  currentTransportOperator: null,
  stats: {
    totalMyCrates: 0,
    assigned: 0,
    inTransit: 0,
  },
  assignedCrates: [],
  inTransitCrates: [],
  dashboardLoading: false,
  dashboardError: null,
  assignedLoading: false,
  assignedError: null,
  scanPickupLoading: false,
  scanPickupError: null,
  lastScanMessage: null,
  operatorLoading: false,
  operatorError: null,
};

const getErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.detail ||
  err?.response?.data?.error ||
  err?.response?.data?.message ||
  (typeof err?.response?.data === "string" ? err.response.data : "") ||
  err?.message ||
  fallback;

function firstText(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

export const fetchTransportDashboard = createAsyncThunk<
  DashboardData,
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
  TransportCrate[],
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
  { message: string; data?: any },
  ScanPickupPayload,
  { state: any; rejectValue: string }
>(
  "transport/scanPickupCrate",
  async (payload, { getState, dispatch, rejectWithValue }) => {
    try {
      const response = await transportService.scanPickup(payload);

      const selectedDate = getState()?.transport?.selectedDate;

      await dispatch(
        fetchTransportDashboard(selectedDate ? { date: selectedDate } : undefined)
      );
      await dispatch(
        fetchAssignedCrates(selectedDate ? { date: selectedDate } : undefined)
      );

      return {
        message:
          response?.message ||
          response?.data?.message ||
          "Crate moved to in transit successfully",
        data: response?.data,
      };
    } catch (err: any) {
      return rejectWithValue(
        getErrorMessage(err, "Failed to scan and pickup crate")
      );
    }
  }
);

export const fetchLoggedInTransportOperatorThunk = createAsyncThunk<
  TransportOperator | null,
  void,
  { state: any; rejectValue: string }
>(
  "transport/fetchLoggedInTransportOperator",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();

      const meState = state?.me?.me || {};
      const meRoot = state?.me || {};
      const authSession = state?.authSession || {};
      const authUser = state?.auth?.user || {};
      const loginState = state?.login || {};

      const phoneFromState = firstText(
        meState?.mobile,
        meState?.phone_no,
        meState?.phone,
        meState?.phoneNo,

        meRoot?.mobile,
        meRoot?.phone_no,
        meRoot?.phone,
        meRoot?.phoneNo,

        authUser?.mobile,
        authUser?.phone_no,
        authUser?.phone,
        authUser?.phoneNo,

        authSession?.mobile,
        authSession?.phone_no,
        authSession?.phone,
        authSession?.phoneNo,

        loginState?.mobile,
        loginState?.phone_no,
        loginState?.phone,
        loginState?.phoneNo
      );

      const phoneFromStorage = firstText(await AsyncStorage.getItem(PHONE_KEY));
      const mobile = phoneFromState || phoneFromStorage;

      if (!mobile) return null;

      return await transportService.getLoggedInTransportOperator(mobile);
    } catch (err: any) {
      return rejectWithValue(
        getErrorMessage(err, "Failed to fetch logged in transport operator")
      );
    }
  }
);

const transportSlice = createSlice({
  name: "transport",
  initialState,
  reducers: {
    setSelectedTransportDate(state, action: PayloadAction<string>) {
      state.selectedDate = action.payload;
    },
    clearLastScanResult(state) {
      state.lastScanMessage = null;
      state.scanPickupError = null;
      state.scanPickupLoading = false;
    },
    clearTransportState(state) {
      Object.assign(state, initialState);
    },
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
        state.currentTransport = action.payload.currentTransport || null;
        state.stats = action.payload.stats || initialState.stats;
        state.assignedCrates = action.payload.assignedCrates || [];
        state.inTransitCrates = action.payload.inTransitCrates || [];

        if (action.payload.selectedDate) {
          state.selectedDate = action.payload.selectedDate;
        }
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
        state.assignedCrates = action.payload || [];
      })
      .addCase(fetchAssignedCrates.rejected, (state, action) => {
        state.assignedLoading = false;
        state.assignedError =
          action.payload || "Failed to fetch assigned crates";
      })

      .addCase(scanPickupCrate.pending, (state) => {
        state.scanPickupLoading = true;
        state.scanPickupError = null;
        state.lastScanMessage = null;
      })
      .addCase(scanPickupCrate.fulfilled, (state, action) => {
        state.scanPickupLoading = false;
        state.scanPickupError = null;
        state.lastScanMessage = action.payload.message;
      })
      .addCase(scanPickupCrate.rejected, (state, action) => {
        state.scanPickupLoading = false;
        state.scanPickupError =
          action.payload || "Failed to scan and pickup crate";
      })

      .addCase(fetchLoggedInTransportOperatorThunk.pending, (state) => {
        state.operatorLoading = true;
        state.operatorError = null;
      })
      .addCase(
        fetchLoggedInTransportOperatorThunk.fulfilled,
        (state, action) => {
          state.operatorLoading = false;
          state.operatorError = null;
          state.currentTransportOperator = action.payload;
        }
      )
      .addCase(
        fetchLoggedInTransportOperatorThunk.rejected,
        (state, action) => {
          state.operatorLoading = false;
          state.operatorError =
            action.payload || "Failed to fetch logged-in operator";
        }
      );
  },
});

export const {
  setSelectedTransportDate,
  clearLastScanResult,
  clearTransportState,
} = transportSlice.actions;

export default transportSlice.reducer;

export const selectTransportSelectedDate = (state: any) =>
  state.transport.selectedDate;

export const selectCurrentTransport = (state: any) =>
  state.transport.currentTransport;

export const selectCurrentTransportOperator = (state: any) =>
  state.transport.currentTransportOperator;

export const selectTransportStats = (state: any) => state.transport.stats;

export const selectAssignedCrates = (state: any) =>
  state.transport.assignedCrates || [];

export const selectInTransitCrates = (state: any) =>
  state.transport.inTransitCrates || [];

export const selectTransportDashboardLoading = (state: any) =>
  state.transport.dashboardLoading;

export const selectTransportDashboardError = (state: any) =>
  state.transport.dashboardError;

export const selectAssignedLoading = (state: any) =>
  state.transport.assignedLoading;

export const selectAssignedError = (state: any) =>
  state.transport.assignedError;

export const selectScanPickupLoading = (state: any) =>
  state.transport.scanPickupLoading;

export const selectScanPickupError = (state: any) =>
  state.transport.scanPickupError;

export const selectLastScanMessage = (state: any) =>
  state.transport.lastScanMessage;