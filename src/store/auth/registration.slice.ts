import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { postFormData } from "../../services/auth/api";

export type RootverseType = "WILD_CAPTURE" | "AQUACULTURE" | "MARICULTURE";

export type RegistrationResponse = {
  id: number;
  username: string;
  phone_no: string;
  address: string;

  // ✅ backend enum
  rootverse_type: RootverseType;

  verification_status: "PENDING" | "VERIFIED" | string;

  profile_picture_url: string;
  profile_picture_key: string;

  created_at: string;
  updated_at: string;

  // optional if backend returns them
  state_id?: number;
  district_id?: number;
};

type RegistrationState = {
  loading: boolean;
  error: string | null;
  lastCreated: RegistrationResponse | null;
};

const initialState: RegistrationState = {
  loading: false,
  error: null,
  lastCreated: null,
};

export const registerUser = createAsyncThunk<
  RegistrationResponse,
  {
    username: string;
    phone_no: string;
    address: string;
    rootverse_type: RootverseType;
    profile_image_uri: string;

    // ✅ new fields
    state_id: number;
    district_id: number;
  },
  { rejectValue: string }
>("registration/registerUser", async (payload, thunkAPI) => {
  try {
    const form = new FormData();

    form.append("username", payload.username.trim());
    form.append("phone_no", payload.phone_no);
    form.append("address", payload.address.trim());
    form.append("rootverse_type", payload.rootverse_type);

    // ✅ IMPORTANT: send state & district
    form.append("state_id", String(payload.state_id));
    form.append("district_id", String(payload.district_id));

    // ✅ image
    const uri = payload.profile_image_uri;
    const filename = uri.split("/").pop() || `profile_${Date.now()}.jpg`;
    const ext = (filename.split(".").pop() || "jpg").toLowerCase();

    const mime =
      ext === "png"
        ? "image/png"
        : ext === "heic"
        ? "image/heic"
        : ext === "jpeg"
        ? "image/jpeg"
        : "image/jpeg";

    form.append("profile_image", { uri, name: filename, type: mime } as any);

    // ✅ real endpoint
    const data = await postFormData<RegistrationResponse>("/api/owner", form);

    return data;
  } catch (e: any) {
    return thunkAPI.rejectWithValue(e?.message ?? "Registration failed");
  }
});

const registrationSlice = createSlice({
  name: "registration",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    clearLastCreated(state) {
      state.lastCreated = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        registerUser.fulfilled,
        (state, action: PayloadAction<RegistrationResponse>) => {
          state.loading = false;
          state.lastCreated = action.payload;
        }
      )
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ||
          action.error.message ||
          "Registration failed";
      });
  },
});

export const { clearError, clearLastCreated } = registrationSlice.actions;
export default registrationSlice.reducer;
