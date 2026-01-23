// src/store/qualityChecker/qualityChecker.slice.ts
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../auth/store";

/* ---------------- TYPES ---------------- */
export type Division = "WILD" | "AQUA" | "MARICULTURE";

export type PendingInspection = {
  id: string; // crate/tag id / qr id
  title: string; // e.g. "Crate QC"
  farmer: string; // or landing center / unit name
  quantity: string; // e.g. "120 Kg"
  tag?: string; // optional display tag
  createdAt?: string; // ISO date
};

export type CompletedInspection = {
  id: string;
  statusBadge: "Approved" | "Rejected";
  inspectedDate: string; // display date
  tag?: string;
  title: string;
  farmer: string;
  quantity: string;

  waterTemp?: string;
  phLevel?: string;
  grade?: string;
  qualityGrade: string; // A/B/C etc
};

type Dashboard = {
  totalInspections: number;
  pendingCount: number;
  completedCount: number;
};

type State = {
  division: Division;

  // dashboard summary
  dashboard: Dashboard;

  // lists
  pending: PendingInspection[];
  completed: CompletedInspection[];

  loading: boolean;
  error: string | null;
};

/* ---------------- DEMO DATA (safe fallback) ---------------- */
function demoPending(division: Division): PendingInspection[] {
  const prefix = division === "WILD" ? "WC" : division === "AQUA" ? "AQ" : "MC";
  return [
    {
      id: `${prefix}-PEND-0001`,
      title: "QC Inspection",
      farmer: division === "WILD" ? "Landing Center" : "Farm Unit",
      quantity: "120 Kg",
      tag: "NEW",
      createdAt: new Date().toISOString(),
    },
    {
      id: `${prefix}-PEND-0002`,
      title: "QC Inspection",
      farmer: division === "WILD" ? "Landing Center" : "Farm Unit",
      quantity: "80 Kg",
      tag: "NEW",
      createdAt: new Date().toISOString(),
    },
  ];
}

function demoCompleted(division: Division): CompletedInspection[] {
  const prefix = division === "WILD" ? "WC" : division === "AQUA" ? "AQ" : "MC";
  return [
    {
      id: `${prefix}-DONE-0001`,
      statusBadge: "Approved",
      inspectedDate: new Date().toISOString().slice(0, 10),
      tag: "OK",
      title: "QC Inspection",
      farmer: division === "WILD" ? "Landing Center" : "Farm Unit",
      quantity: "95 Kg",
      waterTemp: division === "WILD" ? undefined : "26°C",
      phLevel: division === "WILD" ? undefined : "7.5",
      grade: "Grade 1",
      qualityGrade: "A",
    },
    {
      id: `${prefix}-DONE-0002`,
      statusBadge: "Rejected",
      inspectedDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      tag: "ISSUE",
      title: "QC Inspection",
      farmer: division === "WILD" ? "Landing Center" : "Farm Unit",
      quantity: "60 Kg",
      waterTemp: division === "WILD" ? undefined : "28°C",
      phLevel: division === "WILD" ? undefined : "6.8",
      grade: "Grade 2",
      qualityGrade: "C",
    },
  ];
}

/* ---------------- API HELPERS ---------------- */
async function httpGetJson(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

/**
 * Expected backend shape (recommended):
 * GET /api/quality-checker/dashboard?division=WILD
 * -> { totalInspections, pendingCount, completedCount, pending: [], completed: [] }
 *
 * If your backend differs, just map fields in the thunk.
 */
export const fetchQcDashboard = createAsyncThunk<
  {
    dashboard: Dashboard;
    pending: PendingInspection[];
    completed: CompletedInspection[];
  },
  { division: Division },
  { rejectValue: string }
>(
  "qualityChecker/fetchQcDashboard",
  async ({ division }, { rejectWithValue }) => {
    try {
      const base = "https://rootverse-backend-5qoo.onrender.com";
      if (!base) {
        // no API configured → demo fallback
        const pending = demoPending(division);
        const completed = demoCompleted(division);
        return {
          dashboard: {
            totalInspections: pending.length + completed.length,
            pendingCount: pending.length,
            completedCount: completed.length,
          },
          pending,
          completed,
        };
      }

      const url = `${base}/api/quality-checker/dashboard?division=${encodeURIComponent(
        division,
      )}`;

      const raw = await httpGetJson(url);

      // allow wrapped response: { data: {...} }
      const data = raw?.data ?? raw;

      const pending: PendingInspection[] = (data?.pending ?? []).map(
        (x: any) => ({
          id: String(x?.id ?? x?.crate_id ?? x?.qr_id ?? ""),
          title: String(x?.title ?? "QC Inspection"),
          farmer: String(x?.farmer ?? x?.unit_name ?? x?.landing_center ?? "—"),
          quantity: String(x?.quantity ?? x?.weight ?? "—"),
          tag: x?.tag ? String(x.tag) : undefined,
          createdAt: x?.created_at ? String(x.created_at) : undefined,
        }),
      );

      const completed: CompletedInspection[] = (data?.completed ?? []).map(
        (x: any) => ({
          id: String(x?.id ?? x?.crate_id ?? x?.qr_id ?? ""),
          statusBadge:
            String(x?.status ?? x?.statusBadge ?? "Approved").toLowerCase() ===
            "rejected"
              ? "Rejected"
              : "Approved",
          inspectedDate: String(x?.inspected_date ?? x?.inspectedDate ?? "—"),
          tag: x?.tag ? String(x.tag) : undefined,
          title: String(x?.title ?? "QC Inspection"),
          farmer: String(x?.farmer ?? x?.unit_name ?? x?.landing_center ?? "—"),
          quantity: String(x?.quantity ?? x?.weight ?? "—"),
          waterTemp: x?.water_temp ? String(x.water_temp) : undefined,
          phLevel: x?.ph_level ? String(x.ph_level) : undefined,
          grade: x?.grade ? String(x.grade) : undefined,
          qualityGrade: String(x?.quality_grade ?? x?.qualityGrade ?? "—"),
        }),
      );

      const dashboard: Dashboard = {
        totalInspections: Number(
          data?.totalInspections ?? pending.length + completed.length,
        ),
        pendingCount: Number(data?.pendingCount ?? pending.length),
        completedCount: Number(data?.completedCount ?? completed.length),
      };

      return { dashboard, pending, completed };
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to load QC dashboard");
    }
  },
);

/* ---------------- SLICE ---------------- */
const initialState: State = {
  division: "WILD",
  dashboard: { totalInspections: 0, pendingCount: 0, completedCount: 0 },
  pending: [],
  completed: [],
  loading: false,
  error: null,
};

const qualityCheckerSlice = createSlice({
  name: "qualityChecker",
  initialState,
  reducers: {
    setDivision(state, action: PayloadAction<Division>) {
      state.division = action.payload;
    },
    clearQualityChecker(state) {
      state.dashboard = {
        totalInspections: 0,
        pendingCount: 0,
        completedCount: 0,
      };
      state.pending = [];
      state.completed = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchQcDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQcDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload.dashboard;
        state.pending = action.payload.pending;
        state.completed = action.payload.completed;
      })
      .addCase(fetchQcDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ||
          action.error?.message ||
          "Failed to load QC dashboard";
      });
  },
});

export const { setDivision, clearQualityChecker } = qualityCheckerSlice.actions;
export default qualityCheckerSlice.reducer;

/* ---------------- SELECTORS ---------------- */
export const selectQcDivision = (s: RootState) => s.qualityChecker.division;
export const selectQcDashboard = (s: RootState) => s.qualityChecker.dashboard;
export const selectQcPending = (s: RootState) => s.qualityChecker.pending;
export const selectQcCompleted = (s: RootState) => s.qualityChecker.completed;
export const selectQcTotalInspections = (s: RootState) =>
  s.qualityChecker.dashboard.totalInspections;

export const selectQualityCheckerLoading = (s: RootState) =>
  s.qualityChecker.loading;
export const selectQualityCheckerError = (s: RootState) =>
  s.qualityChecker.error;
