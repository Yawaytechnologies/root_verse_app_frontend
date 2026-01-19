// src/store/theme.slice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "LIGHT" | "DARK" | "SYSTEM";

type ThemeState = {
  mode: ThemeMode;
};

const initialState: ThemeState = {
  mode: "LIGHT", // ✅ default
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
    },
    toggleTheme(state) {
      // ✅ Toggle between DARK <-> LIGHT (keep SYSTEM if you want separately)
      state.mode = state.mode === "DARK" ? "LIGHT" : "DARK";
    },
  },
});

export const { setThemeMode, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
