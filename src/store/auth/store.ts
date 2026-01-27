// src/store/auth/store.ts
import { configureStore } from "@reduxjs/toolkit";

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

// ---- quality ----
import qcFillReducer from "../quality/qcFill.slice"; // ✅ ADD
import qrDetailsReducer from "../quality/qrDetails.slice";
import qualityCheckerReducer from "../qualityChecker/qualityChecker.slice";
import qcOverviewReducer from "../quality/qcOverview.slice";

// ---- ui ----
import themeReducer from "../theme.slice";

export const store = configureStore({
  reducer: {
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

    // ✅ QC auth
    qualityAuth: qualityAuthReducer,
    qualityChecker: qualityCheckerReducer,

    // ✅ quality
    qrDetails: qrDetailsReducer,
    qcFill: qcFillReducer, // ✅ ADD
    qcOverview: qcOverviewReducer, // ✅ ADD

    // ui
    theme: themeReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
