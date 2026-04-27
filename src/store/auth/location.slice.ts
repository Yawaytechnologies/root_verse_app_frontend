// src/store/auth/location.slice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ENV } from "../../config/env";

export type CountryItem = { id: number; name: string };
export type StateItem = { id: number; name: string };
export type DistrictItem = { id: number; name: string };
export type LocationItem = { id: number; name: string };

type LocationState = {
  countries: CountryItem[];
  countriesLoading: boolean;
  countriesError: string | null;

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
  countries: [],
  countriesLoading: false,
  countriesError: null,

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

function pickArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result)) return raw.result;
  if (Array.isArray(raw?.rows)) return raw.rows;
  if (Array.isArray(raw?.countries)) return raw.countries;
  if (Array.isArray(raw?.states)) return raw.states;
  if (Array.isArray(raw?.districts)) return raw.districts;
  if (Array.isArray(raw?.locations)) return raw.locations;
  if (Array.isArray(raw?.data?.countries)) return raw.data.countries;
  if (Array.isArray(raw?.data?.states)) return raw.data.states;
  if (Array.isArray(raw?.data?.districts)) return raw.data.districts;
  if (Array.isArray(raw?.data?.locations)) return raw.data.locations;
  if (Array.isArray(raw?.data?.data)) return raw.data.data;
  return [];
}

function mapCountry(c: any): CountryItem {
  return {
    id: Number(c.id ?? c.country_id ?? c.countryId),
    name: String(c.name ?? c.country_name ?? c.countryName ?? c.country ?? ""),
  };
}

function mapState(s: any): StateItem {
  return {
    id: Number(s.id ?? s.state_id ?? s.stateId),
    name: String(s.name ?? s.state_name ?? s.stateName ?? s.state ?? ""),
  };
}

function mapDistrict(d: any): DistrictItem {
  return {
    id: Number(d.id ?? d.district_id ?? d.districtId),
    name: String(
      d.name ?? d.district_name ?? d.districtName ?? d.district ?? "",
    ),
  };
}

function mapLocation(l: any): LocationItem {
  return {
    id: Number(l.id ?? l.location_id ?? l.locationId),
    name: String(
      l.name ?? l.location_name ?? l.locationName ?? l.location ?? "",
    ),
  };
}

export const fetchCountries = createAsyncThunk<
  CountryItem[],
  void,
  { rejectValue: string }
>("location/fetchCountries", async (_, { rejectWithValue }) => {
  try {
    const res = await fetch(`${ENV.API_BASE}/api/country`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const raw = await res.json();
    const list = pickArray(raw);
    const countries = list
      .map(mapCountry)
      .filter((x) => Number.isFinite(x.id) && x.id > 0 && !!x.name);
    return countries;
  } catch (e: any) {
    return rejectWithValue(e?.message || "Failed to fetch countries");
  }
});

export const fetchStatesByCountry = createAsyncThunk<
  { countryId: number; states: StateItem[] },
  { countryId: number },
  { rejectValue: string }
>(
  "location/fetchStatesByCountry",
  async ({ countryId }, { rejectWithValue }) => {
    try {
      const res = await fetch(
        `${ENV.API_BASE}/api/states/country/${countryId}`,
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const raw = await res.json();
      const list = pickArray(raw);
      const states = list
        .map(mapState)
        .filter((x) => Number.isFinite(x.id) && x.id > 0 && !!x.name);
      return { countryId, states };
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to fetch states");
    }
  },
);

export const fetchDistrictsByState = createAsyncThunk<
  { stateId: number; districts: DistrictItem[] },
  { stateId: number },
  { rejectValue: string }
>(
  "location/fetchDistrictsByState",
  async ({ stateId }, { rejectWithValue }) => {
    try {
      const paths = [
        `${ENV.API_BASE}/api/states/${stateId}/districts`,
        `${ENV.API_BASE}/api/states/${stateId}/district`,
      ];
      let lastErr: any = null;
      for (const url of paths) {
        try {
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const raw = await res.json();
          const list = pickArray(raw);
          const districts = list
            .map(mapDistrict)
            .filter((x) => Number.isFinite(x.id) && x.id > 0 && !!x.name);
          return { stateId, districts };
        } catch (e: any) {
          lastErr = e;
        }
      }
      throw lastErr;
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to fetch districts");
    }
  },
);

export const fetchLocationsByDistrict = createAsyncThunk<
  { districtId: number; locations: LocationItem[] },
  { districtId: number },
  { rejectValue: string }
>(
  "location/fetchLocationsByDistrict",
  async ({ districtId }, { rejectWithValue }) => {
    try {
      const res = await fetch(
        `${ENV.API_BASE}/api/locations/district/${districtId}`,
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const raw = await res.json();
      const list = pickArray(raw);
      const locations = list
        .map(mapLocation)
        .filter((x) => Number.isFinite(x.id) && x.id > 0 && !!x.name);
      return { districtId, locations };
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to fetch locations");
    }
  },
);

const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    clearLocationErrors(state) {
      state.countriesError = null;
      state.statesError = null;
      Object.keys(state.districtsErrorByStateId).forEach((key) => {
        state.districtsErrorByStateId[Number(key)] = null;
      });
      Object.keys(state.locationsErrorByDistrictId).forEach((key) => {
        state.locationsErrorByDistrictId[Number(key)] = null;
      });
    },
  },
  extraReducers: (builder) => {
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
        state.countriesError = action.payload || "Failed to fetch countries";
      })
      .addCase(fetchStatesByCountry.pending, (state) => {
        state.statesLoading = true;
        state.statesError = null;
      })
      .addCase(fetchStatesByCountry.fulfilled, (state, action) => {
        state.statesLoading = false;
        state.states = action.payload.states;
      })
      .addCase(fetchStatesByCountry.rejected, (state, action) => {
        state.statesLoading = false;
        state.statesError = action.payload || "Failed to fetch states";
      })
      .addCase(fetchDistrictsByState.pending, (state, action) => {
        const stateId = action.meta.arg.stateId;
        state.districtsLoadingByStateId[stateId] = true;
        state.districtsErrorByStateId[stateId] = null;
      })
      .addCase(fetchDistrictsByState.fulfilled, (state, action) => {
        const { stateId, districts } = action.payload;
        state.districtsLoadingByStateId[stateId] = false;
        state.districtsByStateId[stateId] = districts;
      })
      .addCase(fetchDistrictsByState.rejected, (state, action) => {
        const stateId = action.meta.arg.stateId;
        state.districtsLoadingByStateId[stateId] = false;
        state.districtsErrorByStateId[stateId] =
          action.payload || "Failed to fetch districts";
      })
      .addCase(fetchLocationsByDistrict.pending, (state, action) => {
        const districtId = action.meta.arg.districtId;
        state.locationsLoadingByDistrictId[districtId] = true;
        state.locationsErrorByDistrictId[districtId] = null;
      })
      .addCase(fetchLocationsByDistrict.fulfilled, (state, action) => {
        const { districtId, locations } = action.payload;
        state.locationsLoadingByDistrictId[districtId] = false;
        state.locationsByDistrictId[districtId] = locations;
      })
      .addCase(fetchLocationsByDistrict.rejected, (state, action) => {
        const districtId = action.meta.arg.districtId;
        state.locationsLoadingByDistrictId[districtId] = false;
        state.locationsErrorByDistrictId[districtId] =
          action.payload || "Failed to fetch locations";
      });
  },
});

export const { clearLocationErrors } = locationSlice.actions;
export default locationSlice.reducer;
