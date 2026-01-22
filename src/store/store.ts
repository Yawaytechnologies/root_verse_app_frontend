import { configureStore } from "@reduxjs/toolkit";
import qualityAuthReducer from "./qualityAuth/qualityAuth.slice"; // ✅ ADD
import locationReducer from "./auth/location.slice";
import registrationReducer from "./auth/registration.slice";
import authReducer from "../features/auth/authSlice";
import filledQrReducer from "../services/wild/filledQr.slice";
import tripsReducer from "../features/trip/tripSlice";
import catchLogReducer from "../services/wild/catchLog.slice";
import qrDetailsReducer from "./quality/qrDetails.slice";
import qcFillReducer from "./quality/qcFill.slice";

import themeReducer from "./theme.slice"; // ✅ ADD

export const store = configureStore({
  reducer: {
    auth: authReducer,
    trips: tripsReducer,
    catchLog: catchLogReducer,
    filledQr: filledQrReducer,
    registration: registrationReducer,
    location: locationReducer,
    theme: themeReducer, // ✅ ADD
    qualityAuth: qualityAuthReducer,
    qrDetails: qrDetailsReducer,
    qcFill: qcFillReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: false,
    }),
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
