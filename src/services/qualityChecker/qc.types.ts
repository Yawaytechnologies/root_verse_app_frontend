export const QC_STATUS = ["PENDING", "CHECKED"] as const;
export type QcStatus = (typeof QC_STATUS)[number];

export const QC_RESULT = ["PASS", "HOLD", "REJECT"] as const;
export type QcResult = (typeof QC_RESULT)[number];

export const QC_GRADE = ["A", "B", "C", "REJECTED"] as const;
export type QualityGrade = (typeof QC_GRADE)[number];

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

export type QcFillPayload = {
  checker_code: string;
  quality_checker_id: number;

  qc_status: QcStatus;
  qc_result: QcResult;
  quality_grade: QualityGrade;

  qc_score: number;
  temperature_c: number;
  sample_count: number;

  odor_score: number;
  gill_score: number;
  eye_score: number;
  firmness_score: number;

  ice_present: boolean;
  packaging_intact: boolean;
  foreign_matter_found: boolean;
  is_mixed_species: boolean;
  is_contaminated: boolean;
  is_damaged: boolean;

  // ✅ use this name (NOT reject_reason)
  qr_reject_reason?: QrRejectReason;

  qc_remarks?: string;

  // ✅ IMPORTANT: only URIs here
  crate_images?: string[];
};

// You said: when scan QR it should show catch log details.
// Put whatever your backend returns.
export type QrDetails = {
  qr_code: string;
  qr_type?: string;
  status?: string;

  // example fields (adjust to your API)
  fish_name?: string;
  vessel_name?: string;
  trip_id?: string;

  catch_log?: any; // replace later with real type
};
