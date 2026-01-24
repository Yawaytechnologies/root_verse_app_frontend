import { httpJson, httpPutForm, appendImageToForm } from "../http";

export type QrStatusResponse = {
  crateId: string;
  status: "NEW" | "FILLED";
};

/**
 * IMPORTANT:
 * payload.ownerId must be the NUMERIC owner DB id (example: 14)
 * NOT the string code "OWN-0001"
 *
 * Offline rule:
 * - if ownerId not available, set ownerId = 0
 * - this API will NOT send owner_id when ownerId <= 0
 * - your sync/flush should patch ownerId before calling apiSubmitCatchLog
 */
export type CatchLogPayload = {
  linkedCrateId: string;

  tripId: string;

  fishId: number;       // REQUIRED
  rvVesselId: number;   // REQUIRED
  ownerId: number;      // REQUIRED ONLINE (use 0 for offline)

  weightKg: number;
  catchDate: string; // YYYY-MM-DD
  catchTime: string; // HH:mm or HH:mm:ss

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
  const form = new FormData();

  // ✅ REQUIRED FIELDS (send both snake + camel to be safe)
  form.append("rv_vessel_id", String(payload.rvVesselId));
  form.append("rvVesselId", String(payload.rvVesselId));

  // ✅ OWNER (THIS WAS YOUR ISSUE: IT WAS COMMENTED)
  // send only when valid (>0). Offline: keep 0, it won't be sent.
  if (payload.ownerId && Number(payload.ownerId) > 0) {
    form.append("owner_id", String(payload.ownerId));
    form.append("ownerId", String(payload.ownerId));
  }

  // ✅ FISH ID (send both keys to be safe)
  form.append("fish_id", String(payload.fishId));
  form.append("fishId", String(payload.fishId));

  // ✅ Other fields (send both where useful)
  form.append("trip_id", String(payload.tripId));
  form.append("tripId", String(payload.tripId));

  form.append("weight", String(payload.weightKg));
  form.append("weightKg", String(payload.weightKg));

  form.append("date", payload.catchDate);
  form.append("catch_date", payload.catchDate);

  // ✅ Location
  if (payload.latitude != null) form.append("latitude", String(payload.latitude));
  if (payload.longitude != null) form.append("longitude", String(payload.longitude));

  // ✅ always send HH:MM:SS (and duplicate safe key)
  const t = payload.catchTime?.length === 5 ? `${payload.catchTime}:00` : payload.catchTime;
  form.append("time", t);
  form.append("catch_time", t);

  // ✅ images
  for (let i = 0; i < (payload.images?.length || 0); i++) {
    await appendImageToForm(form, "images", payload.images[i], `catch_${code}_${i + 1}.jpg`);
  }

  // PUT /api/qrs/:crateId
  return httpPutForm<any>(`/api/qrs/${encodeURIComponent(code)}`, form);
}
