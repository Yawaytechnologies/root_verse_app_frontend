// src/store/auth/store.ts
import { configureStore } from "@reduxjs/toolkit";

// ---- features ----
import authReducer from "../../features/auth/authSlice";
import tripsReducer from "../../features/trip/tripSlice";

// ---- services (wild) ----
import catchLogReducer from "../../services/wild/catchLog.slice";
import filledQrReducer from "../../services/wild/filledQr.slice";

// ---- auth slices (inside this folder) ----
import locationReducer from "./location.slice";
import loginReducer from "./login.slice";
import meReducer from "./me.slice";
import registrationReducer from "./registration.slice";

// ---- ui slice (one level up: src/store/theme.slice.ts) ----
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
