import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type NetworkState = {
  isOnline: boolean;
  lastStatusChange: number | null;
};

const initialState: NetworkState = {
  isOnline: true,
  lastStatusChange: null,
};

const networkSlice = createSlice({
  name: "network",
  initialState,
  reducers: {
    setNetworkOnline(state, action: PayloadAction<boolean>) {
      state.isOnline = action.payload;
      state.lastStatusChange = Date.now();
    },
  },
});

export const { setNetworkOnline } = networkSlice.actions;
export default networkSlice.reducer;
