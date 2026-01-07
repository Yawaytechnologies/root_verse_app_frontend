// src/store/store.ts

import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import tripsReducer from "../features/trip/tripSlice";
import catchLogReducer from "../services/wild/catchLog.slice"; 


export const store = configureStore({
  reducer: {
    auth: authReducer,
    trips: tripsReducer,
    catchLog: catchLogReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
