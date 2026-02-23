import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  fetchCountriesApi, // ✅ NEW
  fetchDistrictsByStateApi,
  fetchLocationsByDistrictApi,
  fetchStatesApi,
  fetchStatesByCountryApi, // ✅ NEW
  type CountryItem, // ✅ NEW
  type DistrictItem,
  type LocationItem,
  type StateItem,
} from "../../services/auth/location.api";

type LocationState = {
  // ✅ NEW: countries
  countries: CountryItem[];
  countriesLoading: boolean;
  countriesError: string | null;

  // states (UI reads from this)
  states: StateItem[];
  statesLoading: boolean;
  statesError: string | null;

  // optional cache per country (useful)
  statesByCountryId: Record<number, StateItem[]>;
  statesLoadingByCountryId: Record<number, boolean>;
  statesErrorByCountryId: Record<number, string | null>;

  districtsByStateId: Record<number, DistrictItem[]>;
  districtsLoadingByStateId: Record<number, boolean>;
  districtsErrorByStateId: Record<number, string | null>;

  locationsByDistrictId: Record<number, LocationItem[]>;
  locationsLoadingByDistrictId: Record<number, boolean>;
  locationsErrorByDistrictId: Record<number, string | null>;
};

const initialState: LocationState = {
  // ✅ NEW
  countries: [],
  countriesLoading: false,
  countriesError: null,

  states: [],
  statesLoading: false,
  statesError: null,

  // ✅ NEW
  statesByCountryId: {},
  statesLoadingByCountryId: {},
  statesErrorByCountryId: {},

  districtsByStateId: {},
  districtsLoadingByStateId: {},
  districtsErrorByStateId: {},

  locationsByDistrictId: {},
  locationsLoadingByDistrictId: {},
  locationsErrorByDistrictId: {},
};

// ✅ NEW: Countries
export const fetchCountries = createAsyncThunk<
  CountryItem[],
  void,
  { rejectValue: string }
>("location/fetchCountries", async (_, thunkAPI) => {
  try {
    return await fetchCountriesApi();
  } catch (e: any) {
    return thunkAPI.rejectWithValue(e?.message ?? "Failed to load countries");
  }
});

// ✅ Keep existing (old usage)
export const fetchStates = createAsyncThunk<
  StateItem[],
  void,
  { rejectValue: string }
>("location/fetchStates", async (_, thunkAPI) => {
  try {
    return await fetchStatesApi();
  } catch (e: any) {
    return thunkAPI.rejectWithValue(e?.message ?? "Failed to load states");
  }
});

// ✅ NEW: States by Country
export const fetchStatesByCountry = createAsyncThunk<
  { countryId: number; states: StateItem[] },
  { countryId: number },
  { rejectValue: string }
>("location/fetchStatesByCountry", async ({ countryId }, thunkAPI) => {
  try {
    const states = await fetchStatesByCountryApi(countryId);
    return { countryId, states };
  } catch (e: any) {
    return thunkAPI.rejectWithValue(e?.message ?? "Failed to load states");
  }
});

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
      state.countriesError = null; // ✅ NEW
      state.statesError = null;

      state.statesErrorByCountryId = {}; // ✅ NEW

      state.districtsErrorByStateId = {};
      state.locationsErrorByDistrictId = {};
    },
  },
  extraReducers: (builder) => {
    // ✅ Countries
    builder
      .addCase(fetchCountries.pending, (state) => {
        state.countriesLoading = true;
        state.countriesError = null;
      })
      .addCase(fetchCountries.fulfilled, (state, action) => {
        state.countriesLoading = false;
        state.countries = action.payload;
      })
      .addCase(fetchCountries.rejected, (state, action) => {
        state.countriesLoading = false;
        state.countriesError =
          (action.payload as string) ||
          action.error.message ||
          "Failed to load countries";
      });

    // ✅ States (old all-states)
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
          (action.payload as string) ||
          action.error.message ||
          "Failed to load states";
      });

    // ✅ States by Country (new)
    builder
      .addCase(fetchStatesByCountry.pending, (state, action) => {
        const cid = action.meta.arg.countryId;
        state.statesLoading = true; // UI uses this
        state.statesError = null;

        state.statesLoadingByCountryId[cid] = true;
        state.statesErrorByCountryId[cid] = null;
      })
      .addCase(fetchStatesByCountry.fulfilled, (state, action) => {
        const { countryId, states: st } = action.payload;

        state.statesLoading = false;
        state.states = st; // ✅ IMPORTANT: UI reads from "states"

        state.statesLoadingByCountryId[countryId] = false;
        state.statesByCountryId[countryId] = st;
      })
      .addCase(fetchStatesByCountry.rejected, (state, action) => {
        const cid = action.meta.arg.countryId;

        state.statesLoading = false;
        const msg =
          (action.payload as string) ||
          action.error.message ||
          "Failed to load states";
        state.statesError = msg;

        state.statesLoadingByCountryId[cid] = false;
        state.statesErrorByCountryId[cid] = msg;
      });

    // ✅ Districts
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
          (action.payload as string) ||
          action.error.message ||
          "Failed to load districts";
      });

    // ✅ Locations
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
          (action.payload as string) ||
          action.error.message ||
          "Failed to load locations";
      });
  },
});

export const { clearLocationErrors } = locationSlice.actions;
export default locationSlice.reducer;