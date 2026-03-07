const API_BASE = "https://rootverse-backend-5qoo.onrender.com";

export type FilledFishDetails = {
  // ✅ NEW (needed for PUT /api/qrs/update/:qrId)
  qrId: number; // qr.id

  fishQrCode: string; // qr.code
  speciesName: string; // qr.fish_name
  grade: string | null; // qr.quality_grade
  weightKg: number; // qr.weight

  catchDateISO: string | null; // qr.date
  landedDateISO: string | null; // qr.trip.completed_at / qr.trip.comleted_at
  methodCode: string | null; // qr.method_code
};

export async function fetchFilledFishDetails(
  code: string
): Promise<FilledFishDetails> {
  const url = `${API_BASE}/api/qrs/status/FILLED/code/${encodeURIComponent(
    code
  )}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);

  const data = await res.json();
  if (!data?.success || !data?.qr) throw new Error("Invalid QR / not FILLED");

  const q = data.qr;

  const qrIdNum = Number(q.id);
  if (!Number.isFinite(qrIdNum) || qrIdNum <= 0) {
    throw new Error("Invalid qr.id from server");
  }

  const catchDateISO = q.date ? String(q.date) : null;

  const trip = q.trip || {};
  const landedRaw = trip.completed_at ?? trip.comleted_at ?? null;
  const landedDateISO = landedRaw ? String(landedRaw) : null;

  const methodCode = q.method_code ? String(q.method_code) : null;

  return {
    qrId: qrIdNum,

    fishQrCode: String(q.code || ""),
    speciesName: String(q.fish_name || q.fish?.fish_name || ""),
    grade: (q.quality_grade ?? null) as string | null,
    weightKg: Number(q.weight ?? 0),

    catchDateISO,
    landedDateISO,
    methodCode,
  };
}