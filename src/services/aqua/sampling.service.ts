import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE } from "../../config/env";

const TOKEN_KEY = "auth_token";

export type SamplingCalculationInput = {
  sample_count: number;
  sample_weight: number;
  total_pl_stocked?: number;
  total_pl_stock?: number;
};

export type SamplingCalculationResult = {
  abw: number;
  size_count_per_kg: number;
  expected_biomass: number;
};

export type SamplingPayload = {
  user_id?: string | number;
  farmer_id?: string | number;

  farm_id: string | number;
  pond_id: string | number;
  culture_cycle_id: string | number;

  qr_code_id?: string | number;
  qrcode_id?: string | number;
  qr_code?: string;
  pond_qr?: string;

  pond_verification_status?: string;
  verification_status?: string;
  pond_status?: string;

  sampling_date: string;
  samplingDate?: string;

  doc?: number;
  DOC?: number;
  DoC?: number;

  sample_count: number;
  sampleCount?: number;

  sample_weight: number;
  sample_weight_g?: number;
  sampleWeight?: number;

  abw: number;
  ABW?: number;

  size_count_per_kg: number;
  size?: number;
  size_count?: number;

  total_pl_stock?: number;
  total_pl_stocked?: number;
  totalPlStocked?: number;

  expected_biomass: number;
  expected_biomass_kg?: number;
  expectedBiomass?: number;

  [key: string]: any;
};

export type SamplingRecord = SamplingPayload & {
  id?: string | number;
  sampling_id?: string | number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

function apiUrl(path: string) {
  const base = String(API_BASE || "").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

async function authHeaders() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse(response: Response) {
  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.detail || "Sampling API failed");
  }

  return data;
}

export function extractSamplingArray<T = SamplingRecord>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.sampling)) return data.sampling;
  if (Array.isArray(data?.sampling_logs)) return data.sampling_logs;
  if (Array.isArray(data?.samplingLogs)) return data.samplingLogs;
  if (Array.isArray(data?.sampling_records)) return data.sampling_records;
  if (Array.isArray(data?.samplingRecords)) return data.samplingRecords;
  return [];
}

export function round2(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function calculateSamplingValues(
  input: SamplingCalculationInput,
): SamplingCalculationResult {
  const sampleCount = Number(input.sample_count || 0);
  const sampleWeight = Number(input.sample_weight || 0);
  const totalPlStocked = Number(
    input.total_pl_stocked || input.total_pl_stock || 0,
  );

  const abw = sampleCount > 0 ? sampleWeight / sampleCount : 0;
  const sizeCountPerKg = abw > 0 ? 1000 / abw : 0;
  const expectedBiomass =
    totalPlStocked > 0 && abw > 0 ? (totalPlStocked * abw) / 1000 : 0;

  return {
    abw: round2(abw),
    size_count_per_kg: Math.round(sizeCountPerKg),
    expected_biomass: round2(expectedBiomass),
  };
}

export async function getSamplingRecords() {
  const response = await fetch(apiUrl("/api/aquaculture/sampling"), {
    method: "GET",
    headers: await authHeaders(),
  });

  return parseResponse(response);
}

export async function getSamplingRecordById(id: string | number) {
  const response = await fetch(apiUrl(`/api/aquaculture/sampling/${id}`), {
    method: "GET",
    headers: await authHeaders(),
  });

  return parseResponse(response);
}

export async function getSamplingRecordsByCultureCycle(
  cultureCycleId: string | number,
) {
  const response = await fetch(
    apiUrl(`/api/aquaculture/sampling/culture-cycle/${cultureCycleId}`),
    {
      method: "GET",
      headers: await authHeaders(),
    },
  );

  return parseResponse(response);
}

export async function getSamplingRecordsByFarm(farmId: string | number) {
  const response = await fetch(
    apiUrl(`/api/aquaculture/sampling/farm/${farmId}`),
    {
      method: "GET",
      headers: await authHeaders(),
    },
  );

  return parseResponse(response);
}

export async function getSamplingRecordsByPond(pondId: string | number) {
  const response = await fetch(
    apiUrl(`/api/aquaculture/sampling/pond/${pondId}`),
    {
      method: "GET",
      headers: await authHeaders(),
    },
  );

  return parseResponse(response);
}

export async function getSamplingRecordsByQrCode(qrCodeId: string | number) {
  const response = await fetch(
    apiUrl(`/api/aquaculture/sampling/qrcode/${qrCodeId}`),
    {
      method: "GET",
      headers: await authHeaders(),
    },
  );

  return parseResponse(response);
}

export async function createSamplingRecord(payload: SamplingPayload) {
  const response = await fetch(apiUrl("/api/aquaculture/sampling"), {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function updateSamplingRecord(
  id: string | number,
  payload: Partial<SamplingPayload>,
) {
  const response = await fetch(apiUrl(`/api/aquaculture/sampling/${id}`), {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function deleteSamplingRecord(id: string | number) {
  const response = await fetch(apiUrl(`/api/aquaculture/sampling/${id}`), {
    method: "DELETE",
    headers: await authHeaders(),
  });

  return parseResponse(response);
}