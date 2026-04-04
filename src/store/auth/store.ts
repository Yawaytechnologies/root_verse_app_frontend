// src/store/auth/store.ts
import { combineReducers, configureStore } from "@reduxjs/toolkit";

// ---- features ----
import authReducer from "../../features/auth/authSlice";
import tripsReducer from "../../features/trip/tripSlice";

// ---- services (wild) ----
import catchLogReducer from "../../services/wild/catchLog.slice";
import filledQrReducer from "../../services/wild/filledQr.slice";

// ---- auth slices ----
import qualityAuthReducer from "../qualityAuth/qualityAuth.slice";
import locationReducer from "./location.slice";
import loginReducer from "./login.slice";
import meReducer from "./me.slice";
import registrationReducer from "./registration.slice";

// ✅ auth session (persisted token)
import authSessionReducer from "./authSession.slice";

// ✅ network state
import networkReducer from "./network.slice";

// ---- quality ----
import qcFillReducer from "../quality/qcFill.slice";
import qcOverviewReducer from "../quality/qcOverview.slice";
import qrDetailsReducer from "../quality/qrDetails.slice";
import qualityCheckerReducer from "../qualityChecker/qualityChecker.slice";
import vesselsReducer from "../../services/wild/vessels/vessel.slice";

// ---- ui ----
import themeReducer from "../theme.slice";
import centreCrateReducer from "../../services/centre/centreCrate.slice";
import inTransitReducer from "../../services/transport/inTransitSlice";
import transportReducer from "../../services/transport/transportSlice";


const appReducer = combineReducers({
  // features
  auth: authReducer,
  trips: tripsReducer,

  // services
  catchLog: catchLogReducer,
  filledQr: filledQrReducer,

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
    vessels: vesselsReducer,
    centreCrate: centreCrateReducer,
    inTransit: inTransitReducer,
    transport: transportReducer,
    
});

const rootReducer = (state: any, action: any) => {
  if (action.type === "authSession/logout/fulfilled") {
    // wipe whole redux tree to avoid role leak / blink
    state = {
      // keep app-level things if you want
      network: state?.network,
      theme: state?.theme,

      // keep authSession hydrated true so layout doesn't freeze
      authSession: { token: null, expiresAt: null, hydrated: true },
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
