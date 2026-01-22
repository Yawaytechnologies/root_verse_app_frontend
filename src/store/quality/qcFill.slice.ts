import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import { httpPutForm, appendImageToForm } from "../../services/http";
import type { QcFillPayload } from "../../services/qualityChecker/qc.types";

type State = {
  loading: boolean;
  error: string | null;
  success: boolean;
};

const initialState: State = { loading: false, error: null, success: false };

export const submitQcFill = createAsyncThunk<
  { success: boolean; message?: string },
  { qrCode: string; payload: QcFillPayload },
  { rejectValue: string }
>("quality/submitQcFill", async ({ qrCode, payload }, { rejectWithValue }) => {
  try {
    const form = new FormData();

    // primitives
    form.append("checker_code", payload.checker_code);
    form.append("quality_checker_id", String(payload.quality_checker_id));

    form.append("qc_status", payload.qc_status);
    form.append("qc_result", payload.qc_result);
    form.append("quality_grade", payload.quality_grade);

    form.append("qc_score", String(payload.qc_score));
    form.append("temperature_c", String(payload.temperature_c));
    form.append("sample_count", String(payload.sample_count));

    form.append("odor_score", String(payload.odor_score));
    form.append("gill_score", String(payload.gill_score));
    form.append("eye_score", String(payload.eye_score));
    form.append("firmness_score", String(payload.firmness_score));

    form.append("ice_present", String(payload.ice_present));
    form.append("packaging_intact", String(payload.packaging_intact));
    form.append("foreign_matter_found", String(payload.foreign_matter_found));
    form.append("is_mixed_species", String(payload.is_mixed_species));
    form.append("is_contaminated", String(payload.is_contaminated));
    form.append("is_damaged", String(payload.is_damaged));

    // ✅ optional fields (USE qr_reject_reason)
    if (payload.qr_reject_reason) form.append("qr_reject_reason", payload.qr_reject_reason);
    if (payload.qc_remarks) form.append("qc_remarks", payload.qc_remarks);

    // ✅ images: payload has uri strings only
    if (payload.crate_images?.length) {
      for (let i = 0; i < payload.crate_images.length; i++) {
        const uri = payload.crate_images[i];
        await appendImageToForm(form, "crate_images", uri, `crate_${qrCode}_${i + 1}.jpg`);
      }
    }

    // ✅ your endpoint
    return await httpPutForm<{ success: boolean; message?: string }>(
      `/api/qrs/${encodeURIComponent(qrCode)}/fill`,
      form
    );
  } catch (e: any) {
    return rejectWithValue(e?.message || "QC submit failed");
  }
});

const slice = createSlice({
  name: "qcFill",
  initialState,
  reducers: {
    resetQcFill(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(submitQcFill.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(submitQcFill.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(submitQcFill.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "QC submit failed";
        state.success = false;
      });
  },
});

export const { resetQcFill } = slice.actions;
export default slice.reducer;

export const selectQcFillLoading = (s: RootState) => s.qcFill.loading;
export const selectQcFillError = (s: RootState) => s.qcFill.error;
export const selectQcFillSuccess = (s: RootState) => s.qcFill.success;
