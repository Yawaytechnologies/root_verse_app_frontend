import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../config/env";

export type HarvestMethod = "PARTIAL" | "FULL";

export type HarvestStatus =
  | "PENDING_TRADER_CONFIRMATION"
  | "ACCEPTED"
  | "REJECTED";

export type CreateHarvestRequestPayload = {
  qr_code: string;
  preferred_harvest_time: string;
  expected_size: number;
  expected_biomass: number;
  harvest_method: HarvestMethod;
  harvest_reason?: string;
};

export type TraderConfirmPayload = {
  action: "ACCEPT" | "REJECT";
  rejection_reason?: string;
  linked_procurement_workflow_id?: number;
};

export type HarvestRequest = {
  id: number;
  farmer_id: number;
  farm_id: number;
  pond_id: number;
  culture_cycle_id: number;

  preferred_harvest_time: string;
  expected_size: string | number;
  expected_biomass: string | number;
  harvest_method: HarvestMethod;
  harvest_reason?: string | null;

  status: HarvestStatus;
  harvest_id?: string | null;

  trader_id?: number | null;
  confirmation_timestamp_utc?: string | null;
  rejection_reason?: string | null;

  harvest_activation_timestamp?: string | null;
  linked_procurement_workflow_id?: number | null;

  pond_name?: string;
  farm_name?: string;
  culture_cycle_status?: string;

  created_at?: string;
  updated_at?: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

function buildApiUrl(path: string) {
  const base = String(API_BASE || "").replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (base.endsWith("/api") && cleanPath.startsWith("/api/")) {
    return `${base}${cleanPath.replace(/^\/api/, "")}`;
  }

  return `${base}${cleanPath}`;
}

async function getAuthHeaders() {
  const token =
    (await AsyncStorage.getItem("auth_token")) ||
    (await AsyncStorage.getItem("token")) ||
    "";

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.detail ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as ApiResponse<T>;
}

export async function createHarvestRequestFromPondQr(
  payload: CreateHarvestRequestPayload
) {
  const response = await fetch(
    buildApiUrl("/api/aqua/harvest-requests/from-pond-qr"),
    {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  return parseResponse<HarvestRequest>(response);
}

export async function getMyHarvestRequests() {
  const response = await fetch(
    buildApiUrl("/api/aqua/harvest-requests/my-requests"),
    {
      method: "GET",
      headers: await getAuthHeaders(),
    }
  );

  return parseResponse<HarvestRequest[]>(response);
}

export async function getPendingTraderHarvestRequests() {
  const response = await fetch(
    buildApiUrl("/api/aqua/harvest-requests/trader/pending"),
    {
      method: "GET",
      headers: await getAuthHeaders(),
    }
  );

  return parseResponse<HarvestRequest[]>(response);
}

export async function getHarvestRequestById(id: number | string) {
  const response = await fetch(
    buildApiUrl(`/api/aqua/harvest-requests/${id}`),
    {
      method: "GET",
      headers: await getAuthHeaders(),
    }
  );

  return parseResponse<HarvestRequest>(response);
}

export async function traderConfirmHarvestRequest(
  requestId: number | string,
  payload: TraderConfirmPayload
) {
  const response = await fetch(
    buildApiUrl(
      `/api/aqua/harvest-requests/${requestId}/trader-confirmation`
    ),
    {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  return parseResponse<HarvestRequest>(response);
}