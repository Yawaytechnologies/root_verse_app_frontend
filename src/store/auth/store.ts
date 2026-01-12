import { configureStore } from "@reduxjs/toolkit";
import locationReducer from "./location.slice";
import loginReducer from "./login.slice";
import registrationReducer from "./registration.slice";


export const store = configureStore({
  reducer: {
    registration: registrationReducer,
    location: locationReducer,
    login: loginReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
