import { httpJson, httpPutForm, appendImageToForm } from "../http";

export type QrStatusResponse = {
  crateId: string;
  status: "NEW" | "FILLED";
};

export type CatchLogPayload = {
  linkedCrateId: string;

  tripId: string;

  fishId: number;       // REQUIRED
  rvVesselId: number;   // REQUIRED
  ownerId: number;      // REQUIRED

  weightKg: number;
  catchDate: string; // YYYY-MM-DD
  catchTime: string; // HH:mm or HH:mm:ss

  images: string[];
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
  const code = payload.linkedCrateId;
  const form = new FormData();

  // ✅ REQUIRED FIELDS
  form.append("rv_vessel_id", String(payload.rvVesselId));
  // form.append("owner_id", String(payload.ownerId));

  // ✅ FISH ID (send both keys to be safe)
  form.append("fish_id", String(payload.fishId));
  form.append("fishId", String(payload.fishId));

  // ✅ Other fields
  form.append("trip_id", String(payload.tripId));
  form.append("weight", String(payload.weightKg));
  form.append("date", payload.catchDate);

  // ✅ always send HH:MM:SS
  const t = payload.catchTime?.length === 5 ? `${payload.catchTime}:00` : payload.catchTime;
  form.append("time", t);

  // ✅ images
  for (let i = 0; i < payload.images.length; i++) {
    await appendImageToForm(form, "images", payload.images[i], `catch_${code}_${i + 1}.jpg`);
  }

  return httpPutForm<any>(`/api/qrs/${encodeURIComponent(code)}`, form);
}
