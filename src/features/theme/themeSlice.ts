import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "LIGHT" | "DARK" | "SYSTEM";

type ThemeState = {
  mode: ThemeMode; // SYSTEM = follow device
};

const initialState: ThemeState = {
  mode: "SYSTEM",
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
    },
    toggleTheme(state) {
      // toggle between LIGHT and DARK (ignore SYSTEM for toggle)
      state.mode = state.mode === "DARK" ? "LIGHT" : "DARK";
    },
  },
});

export const { setThemeMode, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
