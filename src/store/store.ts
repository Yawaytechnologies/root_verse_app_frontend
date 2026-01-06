import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import themeReducer from "../features/theme/themeSlice"; // ✅ add
import tripsReducer from "../features/trip/tripSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer, // ✅ add

    trips: tripsReducer, },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
