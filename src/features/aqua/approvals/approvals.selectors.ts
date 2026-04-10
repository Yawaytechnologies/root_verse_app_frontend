import type { RootState } from "../../../store/auth/store";

export const selectAquaApprovalsLoading = (state: RootState) =>
  state.aquaApprovals.loading;

export const selectAquaApprovalsError = (state: RootState) =>
  state.aquaApprovals.error;

export const selectPendingFarms = (state: RootState) =>
  state.aquaApprovals.farms.filter(
    (f) => String(f.status).toLowerCase() === "pending",
  );

export const selectApprovedFarms = (state: RootState) =>
  state.aquaApprovals.farms.filter(
    (f) => String(f.status).toLowerCase() === "approved",
  );

export const selectPendingPonds = (state: RootState) =>
  state.aquaApprovals.ponds.filter(
    (p) => String(p.status).toLowerCase() === "pending",
  );

export const selectApprovedPonds = (state: RootState) =>
  state.aquaApprovals.ponds.filter(
    (p) => String(p.status).toLowerCase() === "approved",
  );

export const selectAllFarms = (state: RootState) =>
  state.aquaApprovals.farms;
