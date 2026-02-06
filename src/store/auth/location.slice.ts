import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  fetchDistrictsByStateApi,
  fetchLocationsByDistrictApi,
  fetchStatesApi,
  type DistrictItem,
  type LocationItem,
  type StateItem,
} from "../../services/auth/location.api";

type LocationState = {
  states: StateItem[];
  statesLoading: boolean;
  statesError: string | null;

  districtsByStateId: Record<number, DistrictItem[]>;
  districtsLoadingByStateId: Record<number, boolean>;
  districtsErrorByStateId: Record<number, string | null>;

  locationsByDistrictId: Record<number, LocationItem[]>;
  locationsLoadingByDistrictId: Record<number, boolean>;
  locationsErrorByDistrictId: Record<number, string | null>;
};

const initialState: LocationState = {
  states: [],
  statesLoading: false,
  statesError: null,

  districtsByStateId: {},
  districtsLoadingByStateId: {},
  districtsErrorByStateId: {},

  locationsByDistrictId: {},
  locationsLoadingByDistrictId: {},
  locationsErrorByDistrictId: {},
};

export const fetchStates = createAsyncThunk<StateItem[], void, { rejectValue: string }>(
  "location/fetchStates",
  async (_, thunkAPI) => {
    try {
      return await fetchStatesApi();
    } catch (e: any) {
      return thunkAPI.rejectWithValue(e?.message ?? "Failed to load states");
    }
  }
);

export const fetchDistrictsByState = createAsyncThunk<
  { stateId: number; districts: DistrictItem[] },
  { stateId: number },
  { rejectValue: string }
>("location/fetchDistrictsByState", async ({ stateId }, thunkAPI) => {
  try {
    const districts = await fetchDistrictsByStateApi(stateId);
    return { stateId, districts };
  } catch (e: any) {
    return thunkAPI.rejectWithValue(e?.message ?? "Failed to load districts");
  }
});

export const fetchLocationsByDistrict = createAsyncThunk<
  { districtId: number; locations: LocationItem[] },
  { districtId: number },
  { rejectValue: string }
>("location/fetchLocationsByDistrict", async ({ districtId }, thunkAPI) => {
  try {
    const locations = await fetchLocationsByDistrictApi(districtId);
    return { districtId, locations };
  } catch (e: any) {
    return thunkAPI.rejectWithValue(e?.message ?? "Failed to load locations");
  }
});

const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    clearLocationErrors(state) {
      state.statesError = null;
      state.districtsErrorByStateId = {};
      state.locationsErrorByDistrictId = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStates.pending, (state) => {
        state.statesLoading = true;
        state.statesError = null;
      })
      .addCase(fetchStates.fulfilled, (state, action) => {
        state.statesLoading = false;
        state.states = action.payload;
      })
      .addCase(fetchStates.rejected, (state, action) => {
        state.statesLoading = false;
        state.statesError =
          (action.payload as string) || action.error.message || "Failed to load states";
      });

    builder
      .addCase(fetchDistrictsByState.pending, (state, action) => {
        const sid = action.meta.arg.stateId;
        state.districtsLoadingByStateId[sid] = true;
        state.districtsErrorByStateId[sid] = null;
      })
      .addCase(fetchDistrictsByState.fulfilled, (state, action) => {
        const { stateId, districts } = action.payload;
        state.districtsLoadingByStateId[stateId] = false;
        state.districtsByStateId[stateId] = districts;
      })
      .addCase(fetchDistrictsByState.rejected, (state, action) => {
        const sid = action.meta.arg.stateId;
        state.districtsLoadingByStateId[sid] = false;
        state.districtsErrorByStateId[sid] =
          (action.payload as string) || action.error.message || "Failed to load districts";
      });

    builder
      .addCase(fetchLocationsByDistrict.pending, (state, action) => {
        const did = action.meta.arg.districtId;
        state.locationsLoadingByDistrictId[did] = true;
        state.locationsErrorByDistrictId[did] = null;
      })
      .addCase(fetchLocationsByDistrict.fulfilled, (state, action) => {
        const { districtId, locations } = action.payload;
        state.locationsLoadingByDistrictId[districtId] = false;
        state.locationsByDistrictId[districtId] = locations;
      })
      .addCase(fetchLocationsByDistrict.rejected, (state, action) => {
        const did = action.meta.arg.districtId;
        state.locationsLoadingByDistrictId[did] = false;
        state.locationsErrorByDistrictId[did] =
          (action.payload as string) || action.error.message || "Failed to load locations";
      });
  },
});

export const { clearLocationErrors } = locationSlice.actions;
export default locationSlice.reducer;
