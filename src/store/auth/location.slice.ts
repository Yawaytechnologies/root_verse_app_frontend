import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  fetchDistrictsByStateApi,
  fetchStatesApi,
  type DistrictItem,
  type StateItem,
} from "../../services/auth/location.api";

type LocationState = {
  states: StateItem[];
  statesLoading: boolean;
  statesError: string | null;

  districtsByStateId: Record<number, DistrictItem[]>;
  districtsLoadingByStateId: Record<number, boolean>;
  districtsErrorByStateId: Record<number, string | null>;
};

const initialState: LocationState = {
  states: [],
  statesLoading: false,
  statesError: null,

  districtsByStateId: {},
  districtsLoadingByStateId: {},
  districtsErrorByStateId: {},
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

const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    clearLocationErrors(state) {
      state.statesError = null;
      state.districtsErrorByStateId = {};
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
  },
});

export const { clearLocationErrors } = locationSlice.actions;
export default locationSlice.reducer;
