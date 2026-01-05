import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import tripsReducer from "../features/trip/tripSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    trips: tripsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
