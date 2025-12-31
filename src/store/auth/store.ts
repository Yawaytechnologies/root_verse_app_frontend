import { configureStore } from "@reduxjs/toolkit";
import registrationReducer from "./registration.slice";
import locationReducer from "./location.slice";

export const store = configureStore({
  reducer: {
    registration: registrationReducer,
    location: locationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
