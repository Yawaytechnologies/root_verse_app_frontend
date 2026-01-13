// src/store/auth/registration.slice.ts
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { postFormData } from "../../services/auth/api";

export type RootverseType = "WILD_CAPTURE" | "AQUACULTURE" | "MARICULTURE";

export type RegistrationResponse = {
  id: number;
  username: string;
  phone_no: string;
  address: string;
  rootverse_type: RootverseType;
  verification_status: "PENDING" | "VERIFIED" | string;

  profile_picture_url: string;
  profile_picture_key: string;

  created_at: string;
  updated_at: string;

  owner_id?: string;
  state?: { id: number; name: string };
  district?: { id: number; name: string };
  state_name?: string;
  district_name?: string;
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

const REGISTER_PATH = "/api/owner";

// ✅ must match your Postman screenshot
const FILE_FIELD = "profileImage";

function getFilename(uri: string) {
  const last = uri.split("/").pop() || `profile_${Date.now()}.jpg`;
  return last.includes(".") ? last : `${last}.jpg`;
}

function getMime(filename: string) {
  const ext = (filename.split(".").pop() || "jpg").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "jpeg") return "image/jpeg";
  return "image/jpeg";
}

export const registerUser = createAsyncThunk<
  RegistrationResponse,
  {
    username: string;
    phone_no: string;
    address: string;
    rootverse_type: RootverseType;
    profile_image_uri: string;
    state_id: number;
    district_id: number;
  },
  { rejectValue: string }
>("registration/registerUser", async (payload, thunkAPI) => {
  try {
    const username = payload.username.trim();
    const phone_no = payload.phone_no.trim();
    const address = payload.address.trim();

    if (!username || username.length < 2) return thunkAPI.rejectWithValue("Username too short");
    if (!/^\d{10}$/.test(phone_no)) return thunkAPI.rejectWithValue("Phone must be 10 digits");
    if (!address) return thunkAPI.rejectWithValue("Address required");
    if (!payload.state_id) return thunkAPI.rejectWithValue("State required");
    if (!payload.district_id) return thunkAPI.rejectWithValue("District required");
    if (!payload.profile_image_uri) return thunkAPI.rejectWithValue("Profile image required");

    const form = new FormData();
    form.append("username", username);
    form.append("phone_no", phone_no);
    form.append("address", address);
    form.append("rootverse_type", payload.rootverse_type);
    form.append("state_id", String(payload.state_id));
    form.append("district_id", String(payload.district_id));

    // ✅ ImagePicker uri is fine (no base64)
    const uri = payload.profile_image_uri;
    const name = getFilename(uri);
    const type = getMime(name);

    form.append(FILE_FIELD, { uri, name, type } as any);

    const data = await postFormData<RegistrationResponse>(REGISTER_PATH, form);

    if (!data?.id) return thunkAPI.rejectWithValue("Invalid server response (missing id)");
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
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<RegistrationResponse>) => {
        state.loading = false;
        state.lastCreated = action.payload;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || action.error.message || "Registration failed";
      });
  },
});

export const { clearError, clearLastCreated } = registrationSlice.actions;
export default registrationSlice.reducer;
