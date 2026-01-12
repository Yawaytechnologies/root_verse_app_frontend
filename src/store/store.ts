import { configureStore } from "@reduxjs/toolkit";

import locationReducer from "./auth/location.slice";
import registrationReducer from "./auth/registration.slice";
import authReducer from "../features/auth/authSlice";
import tripsReducer from "../features/trip/tripSlice";
import catchLogReducer from "../services/wild/catchLog.slice";

import themeReducer from "./theme.slice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    trips: tripsReducer,
    catchLog: catchLogReducer,
    registration: registrationReducer,
    location: locationReducer,
    theme: themeReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: false,
    }),
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;