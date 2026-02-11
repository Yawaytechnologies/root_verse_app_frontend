// src/services/wild/catchLog.api.ts
import { httpJson, httpPutForm, appendImageToForm } from "../http";

export type QrStatusResponse = {
  crateId: string;
  status: "NEW" | "FILLED";
};

/**
 * IMPORTANT:
 * ownerId must be NUMERIC owner DB id (example: 14)
 * Offline: ownerId can be 0 (we won't send owner_id)
 *
 * IMPORTANT CHANGE:
 * rvVesselId is a STRING vessel CODE (ex: "RV-VES-TN-000039")
 * because your backend + Postman expects the CODE in rv_vessel_id.
 */
export type CatchLogPayload = {
  linkedCrateId: string;

  tripId: string;

  fishId: number; // REQUIRED
  rvVesselId: string; // REQUIRED (CODE)
  ownerId: number; // REQUIRED ONLINE (use 0 for offline)

  weightKg?: number; // OPTIONAL (default 0)
  catchDate: string; // YYYY-MM-DD
  catchTime: string; // HH:mm or HH:mm:ss

  images: string[];

  latitude?: number;
  longitude?: number;
};

/* ===================== DUMMY (ONLY) ===================== */
// ✅ Turn ON for UI testing when backend is not ready
const USE_DUMMY_CATCHLOG = true;

// Dummy QR status map (optional)
const DUMMY_QR_STATUS: Record<string, "NEW" | "FILLED"> = {
  "CRATE-DUMMY-0001": "NEW",
  "CRATE-DUMMY-0002": "FILLED",
};

// ✅ Catchlog list type for Trip View
export type CatchLog = {
  id: number | string;
  trip_id?: string;
  qr_code?: string;
  fish_code?: string;
  fish_id?: number;
  weight?: number | string;
  weightKg?: number | string;
  date?: string;
  time?: string;
  created_at?: string;
  [k: string]: any;
};

// Dummy catchlogs per trip
const DUMMY_CATCHLOGS_BY_TRIP: Record<string, CatchLog[]> = {
  "TRIP-DUMMY-0002": [
    {
      id: 7001,
      trip_id: "TRIP-DUMMY-0002",
      qr_code: "QR-DUMMY-0001",
      fish_code: "SARDINE",
      fish_id: 1,
      weight: "12.50",
      date: "2026-01-20",
      time: "10:15:00",
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: 7002,
      trip_id: "TRIP-DUMMY-0002",
      qr_code: "QR-DUMMY-0002",
      fish_code: "MACKEREL",
      fish_id: 2,
      weight: "8.20",
      date: "2026-01-20",
      time: "12:05:00",
      created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
  ],
  "TRIP-DUMMY-0004": [
    {
      id: 7010,
      trip_id: "TRIP-DUMMY-0004",
      qr_code: "QR-DUMMY-0010",
      fish_code: "TUNA",
      fish_id: 3,
      weight: "22.00",
      date: "2026-01-10",
      time: "08:40:00",
      created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
  ],
};

function makeGenericDummyCatchLogs(tripId: string): CatchLog[] {
  const now = Date.now();
  return [
    {
      id: 7991,
      trip_id: tripId,
      qr_code: "QR-SAMPLE-1001",
      fish_code: "ANCHOVY",
      fish_id: 10,
      weight: "7.80",
      date: new Date(now - 86400000).toISOString().slice(0, 10),
      time: "09:10:00",
      created_at: new Date(now - 3 * 3600000).toISOString(),
    },
    {
      id: 7992,
      trip_id: tripId,
      qr_code: "QR-SAMPLE-1002",
      fish_code: "TUNA",
      fish_id: 11,
      weight: "15.00",
      date: new Date(now - 86400000).toISOString().slice(0, 10),
      time: "11:35:00",
      created_at: new Date(now - 6 * 3600000).toISOString(),
    },
  ];
}
/* ======================================================== */

export async function apiCheckQrStatus(crateId: string): Promise<QrStatusResponse> {
  try {
    const data = await httpJson<any>(
      `https://rootverse-backend-5qoo.onrender.com/api/qrs/${encodeURIComponent(crateId)}`,
      { method: "GET" }
    );

    return {
      crateId: data?.crateId || crateId,
      status: data?.status || "NEW",
    };
  } catch (e) {
    // ✅ Dummy fallback only (no other changes)
    if (USE_DUMMY_CATCHLOG) {
      return {
        crateId,
        status: DUMMY_QR_STATUS[crateId] || "NEW",
      };
    }
    throw e;
  }
}

// ✅ NEW: Get all catchlogs for a particular trip (for Trip View screen)
export async function apiFetchCatchLogsByTrip(tripId: string): Promise<CatchLog[]> {
  try {
    // ✅ API (change ONLY this path if your backend route differs)
    const data = await httpJson<any>(
      `/api/trips/${encodeURIComponent(tripId)}/catchlogs`,
      { method: "GET" }
    );

    // supports: array OR {data:[]} OR {data:{catchlogs:[]}}
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.catchlogs)) return data.data.catchlogs;

    return [];
  } catch (e) {
    // ✅ Dummy fallback only
    if (USE_DUMMY_CATCHLOG) {
      return DUMMY_CATCHLOGS_BY_TRIP[tripId] || makeGenericDummyCatchLogs(tripId);
    }
    throw e;
  }
}

export async function apiSubmitCatchLog(payload: CatchLogPayload) {
  const code = String(payload.linkedCrateId || "").trim();
  if (!code) throw new Error("linkedCrateId missing");

  const form = new FormData();

  // ✅ Vessel CODE (send both keys)
  const vesselCode = String(payload.rvVesselId || "").trim();
  if (!vesselCode) throw new Error("rvVesselId (vessel CODE) missing");

  form.append("rv_vessel_id", vesselCode);
  form.append("rvVesselId", vesselCode);

  // ✅ Owner (send only if >0)
  if (payload.ownerId && Number(payload.ownerId) > 0) {
    form.append("owner_id", String(payload.ownerId));
    form.append("ownerId", String(payload.ownerId));
  }

  // ✅ Fish
  form.append("fish_id", String(payload.fishId));
  form.append("fishId", String(payload.fishId));

  // ✅ Trip
  form.append("trip_id", String(payload.tripId));
  form.append("tripId", String(payload.tripId));

  // ✅ Weight (default 0)
  const w = Number(payload.weightKg ?? 0);
  form.append("weight", String(w));
  form.append("weightKg", String(w));

  // ✅ Date
  form.append("date", payload.catchDate);
  form.append("catch_date", payload.catchDate);

  // ✅ Time (force HH:mm:ss)
  const t =
    payload.catchTime?.length === 5 ? `${payload.catchTime}:00` : payload.catchTime;
  form.append("time", t);
  form.append("catch_time", t);

  // ✅ Location
  if (payload.latitude != null) form.append("latitude", String(payload.latitude));
  if (payload.longitude != null) form.append("longitude", String(payload.longitude));

  // ✅ Images
  for (let i = 0; i < (payload.images?.length || 0); i++) {
    await appendImageToForm(form, "images", payload.images[i], `catch_${code}_${i + 1}.jpg`);
  }

  // ✅ PUT /api/qrs/:crateId
  try {
    return await httpPutForm<any>(`/api/qrs/${encodeURIComponent(code)}`, form);
  } catch (e) {
    // ✅ Dummy fallback only (so UI can proceed)
    if (USE_DUMMY_CATCHLOG) {
      return {
        success: true,
        dummy: true,
        message: "Dummy catchlog submitted (API failed)",
        data: {
          crateId: code,
          tripId: payload.tripId,
          rvVesselId: payload.rvVesselId,
          ownerId: payload.ownerId,
          fishId: payload.fishId,
          weightKg: w,
          catchDate: payload.catchDate,
          catchTime: t,
        },
      };
    }
    throw e;
  }
}
