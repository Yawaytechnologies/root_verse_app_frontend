// src/store/store.ts

import { configureStore } from "@reduxjs/toolkit";

/** ✅ These paths must match your folders */
import registrationReducer from "./auth/registration.slice";
import locationReducer from "./auth/location.slice";

/** ✅ Auth slice used by login.tsx */
import authReducer from "../features/auth/authSlice";

import tripsReducer from "../features/trip/tripSlice";
import catchLogReducer from "../services/wild/catchLog.slice"; 

import themeReducer from "./theme.slice"; // ✅ ADD



export const store = configureStore({
  reducer: {
    auth: authReducer,

    trips: tripsReducer,
    catchLog: catchLogReducer,

    registration: registrationReducer,
    location: locationReducer,
    theme: themeReducer, // ✅ ADD


  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
