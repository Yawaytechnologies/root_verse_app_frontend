import type { RootState } from "../../../store/auth/store";

export const selectAquaRegistration = (state: RootState) =>
  state.aquaRegistration;

export const selectAquaFarmer = (state: RootState) =>
  state.aquaRegistration.farmer;

export const selectAquaFarm = (state: RootState) =>
  state.aquaRegistration.farm;

export const selectAquaPonds = (state: RootState) =>
  state.aquaRegistration.ponds;

export const selectAquaSubmission = (state: RootState) =>
  state.aquaRegistration.submission;