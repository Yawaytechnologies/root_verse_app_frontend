// src/store/auth/store.ts
import { combineReducers, configureStore } from "@reduxjs/toolkit";

// ---- features ----
import authReducer from "../../features/auth/authSlice";
import tripsReducer from "../../features/trip/tripSlice";
import aquaRegistrationReducer from "../../features/aqua/registration/registration.slice";
import aquaApprovalsReducer from "../../features/aqua/approvals/approvals.slice";

// ---- services (wild) ----
import catchLogReducer from "../../services/wild/catchLog.slice";
import filledQrReducer from "../../services/wild/filledQr.slice";
import vesselsReducer from "../../services/wild/vessels/vessel.slice";

// ---- services (centre/transport) ----
import centreCrateReducer from "../../services/centre/centreCrate.slice";
import inTransitReducer from "../../services/transport/inTransitSlice";
import transportReducer from "../../services/transport/transportSlice";

// ---- auth slices ----
import qualityAuthReducer from "../qualityAuth/qualityAuth.slice";
import locationReducer from "./location.slice";
import loginReducer from "./login.slice";
import meReducer from "./me.slice";
import registrationReducer from "./registration.slice";
import authSessionReducer from "./authSession.slice";
import networkReducer from "./network.slice";

// ---- quality ----
import qcFillReducer from "../quality/qcFill.slice";
import qcOverviewReducer from "../quality/qcOverview.slice";
import qrDetailsReducer from "../quality/qrDetails.slice";
import qualityCheckerReducer from "../qualityChecker/qualityChecker.slice";

// ---- ui ----
import themeReducer from "../theme.slice";

const appReducer = combineReducers({
  // features
  auth: authReducer,
  trips: tripsReducer,
  aquaRegistration: aquaRegistrationReducer,
  aquaApprovals: aquaApprovalsReducer,

  // services
  catchLog: catchLogReducer,
  filledQr: filledQrReducer,
  vessels: vesselsReducer,
  centreCrate: centreCrateReducer,
  inTransit: inTransitReducer,
  transport: transportReducer,

  // auth folder slices
  registration: registrationReducer,
  location: locationReducer,
  login: loginReducer,
  me: meReducer,

  // persisted session
  authSession: authSessionReducer,

  // network
  network: networkReducer,

  // QC auth
  qualityAuth: qualityAuthReducer,
  qualityChecker: qualityCheckerReducer,

  // quality
  qrDetails: qrDetailsReducer,
  qcFill: qcFillReducer,
  qcOverview: qcOverviewReducer,

  // ui
  theme: themeReducer,
});

const shouldHardReset = (actionType: string) => {
  return (
    actionType === "login/logout/fulfilled" ||
    actionType === "authSession/logout/fulfilled"
  );
};

const rootReducer = (state: any, action: any) => {
  if (shouldHardReset(action.type)) {
    state = {
      network: state?.network,
      theme: state?.theme,

      authSession: { token: null, expiresAt: null, hydrated: true },

      me: { loading: false, error: null, me: null },
      login: {
        loading: false,
        error: null,
        token: null,
        status: null,
        rootverse_type: null,
      },

      registration: undefined,
      location: undefined,
      aquaRegistration: undefined,
      aquaApprovals: undefined,
      auth: undefined,
      trips: undefined,
      catchLog: undefined,
      filledQr: undefined,
      vessels: undefined,
      centreCrate: undefined,
      inTransit: undefined,
      transport: undefined,
      qualityAuth: undefined,
      qualityChecker: undefined,
      qrDetails: undefined,
      qcFill: undefined,
      qcOverview: undefined,
    };
  }

  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
