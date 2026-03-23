import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  AquaFarmerData,
  AquaFarmData,
  AquaPondData,
  AquaRegistrationState,
} from "../../../types/aqua";
import { initialAquaRegistrationState } from "./registration.types";

type FarmerFieldPayload = {
  key: keyof AquaFarmerData;
  value: string;
};

type FarmFieldPayload = {
  key: keyof AquaFarmData;
  value: string | boolean;
};

type PondFieldPayload = {
  index: number;
  key: keyof AquaPondData;
  value: string | boolean;
};

type PondImagePayload = {
  index: number;
  uri: string;
  captured?: boolean;
};

type PondGpsPayload = {
  index: number;
  gpsLat: string;
  gpsLng: string;
};

const createEmptyPond = (): AquaPondData => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  pondName: "",
  pondArea: "",
  cultureType: "",
  speciesId: "",
  speciesName: "",
  speciesCode: "",
  speciesImageUrl: "",
  gpsLat: "",
  gpsLng: "",
  pondImageCaptured: false,
  pondImageUri: "",
});

const registrationSlice = createSlice({
  name: "aquaRegistration",
  initialState: initialAquaRegistrationState,
  reducers: {
    setFarmerField: (state, action: PayloadAction<FarmerFieldPayload>) => {
      const { key, value } = action.payload;
      state.farmer[key] = value;
      state.submission.status = "draft";
    },

    setFarmField: (state, action: PayloadAction<FarmFieldPayload>) => {
      const { key, value } = action.payload;
      (state.farm[key] as string | boolean) = value;
      state.submission.status = "draft";
    },

    setPondField: (state, action: PayloadAction<PondFieldPayload>) => {
      const { index, key, value } = action.payload;
      if (!state.ponds[index]) return;

      (state.ponds[index][key] as string | boolean) = value;
      state.submission.status = "draft";
    },

    addPond: (state) => {
      state.ponds.push(createEmptyPond());
      state.submission.status = "draft";
    },

    removePond: (state, action: PayloadAction<number>) => {
      if (state.ponds.length <= 1) return;

      state.ponds = state.ponds.filter((_, index) => index !== action.payload);
      state.submission.status = "draft";
    },

    setFarmImage: (
      state,
      action: PayloadAction<{ uri: string; captured?: boolean }>,
    ) => {
      state.farm.farmImageUri = action.payload.uri;
      state.farm.farmImageCaptured = action.payload.captured ?? true;
      state.submission.status = "draft";
    },

    setPondImage: (state, action: PayloadAction<PondImagePayload>) => {
      const { index, uri, captured } = action.payload;
      if (!state.ponds[index]) return;

      state.ponds[index].pondImageUri = uri;
      state.ponds[index].pondImageCaptured = captured ?? true;
      state.submission.status = "draft";
    },

    setFarmGps: (
      state,
      action: PayloadAction<{ gpsLat: string; gpsLng: string }>,
    ) => {
      state.farm.gpsLat = action.payload.gpsLat;
      state.farm.gpsLng = action.payload.gpsLng;
      state.farm.latitude = action.payload.gpsLat;
      state.farm.longitude = action.payload.gpsLng;
      state.submission.status = "draft";
    },

    setPondGps: (state, action: PayloadAction<PondGpsPayload>) => {
      const { index, gpsLat, gpsLng } = action.payload;
      if (!state.ponds[index]) return;

      state.ponds[index].gpsLat = gpsLat;
      state.ponds[index].gpsLng = gpsLng;
      state.submission.status = "draft";
    },

    hydrateRegistration: (
      _state,
      action: PayloadAction<AquaRegistrationState>,
    ) => {
      return action.payload;
    },

    submitRegistrationStart: (state) => {
      state.submission.status = "submitting";
      state.submission.message = "";
    },

    submitRegistrationSuccess: (
      state,
      action: PayloadAction<string | undefined>,
    ) => {
      state.submission.status = "pending";
      state.submission.message =
        action.payload ?? "Registration submitted successfully";
    },

    submitRegistrationFailure: (
      state,
      action: PayloadAction<string | undefined>,
    ) => {
      state.submission.status = "rejected";
      state.submission.message =
        action.payload ?? "Registration submission failed";
    },

    resetRegistration: () => initialAquaRegistrationState,
  },
});

export const {
  setFarmerField,
  setFarmField,
  setPondField,
  addPond,
  removePond,
  setFarmImage,
  setPondImage,
  setFarmGps,
  setPondGps,
  hydrateRegistration,
  submitRegistrationStart,
  submitRegistrationSuccess,
  submitRegistrationFailure,
  resetRegistration,
} = registrationSlice.actions;

export default registrationSlice.reducer;