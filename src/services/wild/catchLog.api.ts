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

  fishId: number;          // REQUIRED
  rvVesselId: string;      // REQUIRED (CODE)
  ownerId: number;         // REQUIRED ONLINE (use 0 for offline)

  weightKg?: number;       // OPTIONAL (default 0)
  catchDate: string;       // YYYY-MM-DD
  catchTime: string;       // HH:mm or HH:mm:ss

  images: string[];

  latitude?: number;
  longitude?: number;
};

export async function apiCheckQrStatus(crateId: string): Promise<QrStatusResponse> {
  const data = await httpJson<any>(`/api/qrs/${encodeURIComponent(crateId)}`, {
    method: "GET",
  });

  return {
    crateId: data?.crateId || crateId,
    status: data?.status || "NEW",
  };
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
  const t = payload.catchTime?.length === 5 ? `${payload.catchTime}:00` : payload.catchTime;
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
  return httpPutForm<any>(`/api/qrs/${encodeURIComponent(code)}`, form);
}
