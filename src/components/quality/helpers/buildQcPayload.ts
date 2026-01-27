// src/components/quality/helpers/buildQcPayload.ts

export const QR_REJECT_REASONS = [
  "TEMP_ABUSE",
  "SPOILAGE_ODOR",
  "CONTAMINATION",
  "DAMAGED_PACKAGING",
  "MIXED_SPECIES",
  "WRONG_LABEL",
  "UNDER_SIZE",
  "UNKNOWN_ORIGIN",
  "OTHER",
] as const;

export type QrRejectReason = (typeof QR_REJECT_REASONS)[number];

type InspectorLike = {
  checker_code: string;
  id: number;
};

type BaseForm = {
  qc_status: "PENDING" | "CHECKED";
  qc_result: "PASS" | "HOLD" | "REJECT";
  quality_grade: "A" | "B" | "C" | "REJECTED";
  qr_reject_reason?: string | null;
  qc_remarks?: string;

  // keep only if UI actually has these
  temperature_c?: string | number;
  qc_score?: string | number;

  images: string[]; // UI uses "images", payload uses "crate_images"
};

function toNumberOrUndef(v: any) {
  if (v === "" || v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function asRejectReasonOrUndef(v: any): QrRejectReason | undefined {
  const s = String(v || "").trim();
  return (QR_REJECT_REASONS as readonly string[]).includes(s) ? (s as QrRejectReason) : undefined;
}

export function buildQcPayload({
  form,
  inspector,
  scannedCode,
}: {
  form: BaseForm;
  inspector: InspectorLike;
  scannedCode: string;
}) {
  const qc_result = form.qc_result;

  // ✅ grade rule: only allow REJECTED grade when result is REJECT
  const quality_grade =
    qc_result === "REJECT"
      ? form.quality_grade // can be REJECTED (or whatever backend allows)
      : form.quality_grade === "REJECTED"
      ? "C" // fallback (prevents invalid state)
      : form.quality_grade;

  const payload: any = {
    checker_code: inspector.checker_code,
    quality_checker_id: inspector.id,

    qc_status: form.qc_status,
    qc_result,
    quality_grade,

    // optional numeric fields — sent only when valid number
    temperature_c: toNumberOrUndef(form.temperature_c),
    qc_score: toNumberOrUndef(form.qc_score),

    qc_remarks: form.qc_remarks?.trim() || undefined,

    // ✅ backend expects this name
    crate_images: Array.isArray(form.images) ? form.images : [],

    // optional (keep if backend uses it)
    fish_code: String(scannedCode || "").trim() || undefined,
  };

  // ✅ reject reason: only for REJECT and only if valid enum
  if (qc_result === "REJECT") {
    payload.qr_reject_reason = asRejectReasonOrUndef(form.qr_reject_reason);
  } else {
    delete payload.qr_reject_reason;
  }

  return payload;
}
