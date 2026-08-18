// src/store/auth/store.ts

import { combineReducers, configureStore } from "@reduxjs/toolkit";

// ============================================================
// FEATURES
// ============================================================

import authReducer from "../../features/auth/authSlice";
import tripsReducer from "../../features/trip/tripSlice";

import aquaRegistrationReducer from "../../features/aqua/registration/registration.slice";
import aquaApprovalsReducer from "../../features/aqua/approvals/approvals.slice";
import aquaCultureCyclesReducer from "../../features/aqua/cultureCycles/cultureCycles.slice";

// ============================================================
// SERVICES - WILD
// ============================================================

import catchLogReducer from "../../services/wild/catchLog.slice";
import filledQrReducer from "../../services/wild/filledQr.slice";
import vesselsReducer from "../../services/wild/vessels/vessel.slice";

// ============================================================
// SERVICES - CENTRE / TRANSPORT
// ============================================================

import centreCrateReducer from "../../services/centre/centreCrate.slice";

import inTransitReducer from "../../services/transport/inTransitSlice";
import transportReducer from "../../services/transport/transportSlice";

// IMPORTANT:
// aquaTransportLoading.service.ts is only an API service.
// It does NOT contain a Redux reducer.
// Therefore, do NOT import it into combineReducers.

// ============================================================
// AUTH SLICES
// ============================================================

import qualityAuthReducer from "../qualityAuth/qualityAuth.slice";

import locationReducer from "./location.slice";
import loginReducer from "./login.slice";
import meReducer from "./me.slice";
import registrationReducer from "./registration.slice";
import authSessionReducer from "./authSession.slice";
import networkReducer from "./network.slice";

// ============================================================
// QUALITY
// ============================================================

import qcFillReducer from "../quality/qcFill.slice";
import qcOverviewReducer from "../quality/qcOverview.slice";
import qrDetailsReducer from "../quality/qrDetails.slice";
import qualityCheckerReducer from "../qualityChecker/qualityChecker.slice";

// ============================================================
// UI
// ============================================================

import themeReducer from "../theme.slice";

// ============================================================
// APP REDUCER
// ============================================================

const appReducer = combineReducers({
  // ----------------------------------------------------------
  // FEATURES
  // ----------------------------------------------------------

  auth: authReducer,

  trips: tripsReducer,

  aquaRegistration: aquaRegistrationReducer,

  aquaApprovals: aquaApprovalsReducer,

  aquaCultureCycles: aquaCultureCyclesReducer,

  // ----------------------------------------------------------
  // WILD SERVICES
  // ----------------------------------------------------------

  catchLog: catchLogReducer,

  filledQr: filledQrReducer,

  vessels: vesselsReducer,

  // ----------------------------------------------------------
  // CENTRE
  // ----------------------------------------------------------

  centreCrate: centreCrateReducer,

  // ----------------------------------------------------------
  // EXISTING TRANSPORT / WILD TRANSPORT
  // ----------------------------------------------------------

  inTransit: inTransitReducer,

  transport: transportReducer,

  // ----------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------

  registration: registrationReducer,

  location: locationReducer,

  login: loginReducer,

  me: meReducer,

  // ----------------------------------------------------------
  // PERSISTED SESSION
  // ----------------------------------------------------------

  authSession: authSessionReducer,

  // ----------------------------------------------------------
  // NETWORK
  // ----------------------------------------------------------

  network: networkReducer,

  // ----------------------------------------------------------
  // QUALITY
  // ----------------------------------------------------------

  qualityAuth: qualityAuthReducer,

  qualityChecker: qualityCheckerReducer,

  qrDetails: qrDetailsReducer,

  qcFill: qcFillReducer,

  qcOverview: qcOverviewReducer,

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------

  theme: themeReducer,
});

// ============================================================
// LOGOUT HARD RESET
// ============================================================

const shouldHardReset = (actionType: string) => {
  return (
    actionType === "login/logout/fulfilled" ||
    actionType === "authSession/logout/fulfilled"
  );
};

// ============================================================
// ROOT REDUCER
// ============================================================

const rootReducer = (state: any, action: any) => {
  if (shouldHardReset(action.type)) {
    state = {
      // --------------------------------------------------------
      // KEEP GLOBAL SETTINGS
      // --------------------------------------------------------

      network: state?.network,

      theme: state?.theme,

      // --------------------------------------------------------
      // RESET SESSION
      // --------------------------------------------------------

      authSession: {
        token: null,
        expiresAt: null,
        hydrated: true,
      },

      // --------------------------------------------------------
      // RESET ME
      // --------------------------------------------------------

      me: {
        loading: false,
        error: null,
        me: null,
      },

      // --------------------------------------------------------
      // RESET LOGIN
      // --------------------------------------------------------

      login: {
        loading: false,
        error: null,
        token: null,
        status: null,
        rootverse_type: null,
      },

      // --------------------------------------------------------
      // RESET AUTH / REGISTRATION
      // --------------------------------------------------------

      registration: undefined,

      location: undefined,

      auth: undefined,

      // --------------------------------------------------------
      // RESET AQUACULTURE FEATURES
      // --------------------------------------------------------

      aquaRegistration: undefined,

      aquaApprovals: undefined,

      aquaCultureCycles: undefined,

      // --------------------------------------------------------
      // RESET TRIPS
      // --------------------------------------------------------

      trips: undefined,

      // --------------------------------------------------------
      // RESET WILD
      // --------------------------------------------------------

      catchLog: undefined,

      filledQr: undefined,

      vessels: undefined,

      // --------------------------------------------------------
      // RESET CENTRE
      // --------------------------------------------------------

      centreCrate: undefined,

      // --------------------------------------------------------
      // RESET TRANSPORT
      // --------------------------------------------------------

      inTransit: undefined,

      transport: undefined,

      // --------------------------------------------------------
      // RESET QUALITY
      // --------------------------------------------------------

      qualityAuth: undefined,

      qualityChecker: undefined,

      qrDetails: undefined,

      qcFill: undefined,

      qcOverview: undefined,
    };
  }

  return appReducer(state, action);
};

// ============================================================
// STORE
// ============================================================

export const store = configureStore({
  reducer: rootReducer,

  middleware: (getDefault) =>
    getDefault({
      serializableCheck: false,
    }),
});

// ============================================================
// TYPES
// ============================================================

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;