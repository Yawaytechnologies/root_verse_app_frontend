// src/services/vessels/vesselApi.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type FuelType = "Diesel" | "Petrol" | "Electric" | "Other";

export type Vessel = {
  id: number;
  rv_vessel_id: string;
  govt_registration_number: string | null;
  local_identifier: string | null;
  vessel_name: string;
  home_port: string | null;
  vessel_type: string | null;
  created_at: string;
  updated_at: string;
  owner_id: number;
  fishing_license_no: string | null;
  crew_capacity_max: number | null;
  storage_capacity_kg: number | null;
  engine_power_hp: number | null;
  fuel_type: FuelType | string | null;
  approval_status: "PENDING" | "APPROVED" | "REJECTED" | string;
};

export type VesselCreatePayload = {
  govt_registration_number: string;
  local_identifier: string;
  vessel_name: string;
  home_port: string;
  vessel_type: string;

  fishing_license_no?: string | null;
  crew_capacity_max?: number | null;
  storage_capacity_kg?: number | null;
  engine_power_hp?: number | null;
  fuel_type?: FuelType | null;
};

type ListResponse = { success: boolean; data: Vessel[] };
type OneResponse = { success: boolean; data: Vessel };

export type ApiError = Error & { status?: number; bodyText?: string };

const TOKEN_KEYS = ["auth_token", "access_token", "token"] as const;

const API_BASE = "https://rootverse-backend-5qoo.onrender.com";

// ✅ GET + POST are the SAME endpoint
export const VESSELS_ENDPOINT = `${API_BASE}/api/vessels`;

async function readTokenFromStorage(): Promise<string | null> {
  for (const k of TOKEN_KEYS) {
    const v = await AsyncStorage.getItem(k);
    const token = (v || "").trim();
    if (token) return token;
  }
  return null;
}

async function apiFetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const token = await readTokenFromStorage();

  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const err: ApiError = new Error(
      `HTTP ${res.status} ${res.statusText}${bodyText ? ` - ${bodyText}` : ""}`,
    );
    err.status = res.status;
    err.bodyText = bodyText;
    throw err;
  }

  return (await res.json().catch(() => ({}))) as T;
}

export const vesselApi = {
  async list(): Promise<Vessel[]> {
    const json = await apiFetchJson<ListResponse>(VESSELS_ENDPOINT, {
      method: "GET",
    });
    return Array.isArray(json?.data) ? json.data : [];
  },

  async create(payload: VesselCreatePayload): Promise<Vessel> {
    const json = await apiFetchJson<OneResponse>(VESSELS_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return json.data as Vessel;
  },
};
