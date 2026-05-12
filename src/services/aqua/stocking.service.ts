import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../config/env";

const TOKEN_KEY = "auth_token";

// Swagger API path
const STOCKING_BASE_PATH = "/api/aquaculture/pond-stocking";

export type ApiResult<T = any> = {
  ok: boolean;
  message: string;
  data?: T;
  status?: number;
};

export type SpeciesRecord = {
  id: number | string;
  name?: string;
  species_name?: string;
  code?: string;
  species_code?: string;
  [key: string]: any;
};

export type StockingPayload = {
  farmer_id: number;
  farm_id: number;
  pond_id: number;
  culture_cycle_id: number;
  qr_code_id?: number | null;
  species_id?: number | null;
  species?: string;
  hatchery: string;
  hatchery_batch_number: string;
  pl_age_at_dispatch: number | null;
  nursery_days: number | null;
  stocking_date: string;
  pl_age_at_stocking: number | null;
  total_pl_stocked: number;
  gps_latitude?: string;
  gps_longitude?: string;
  qr_value?: string;
};

export type StockingRecord = StockingPayload & {
  id: number | string;
  stocking_id?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

function baseUrl() {
  return String(API_BASE || "").replace(/\/$/, "");
}

function apiUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl()}${cleanPath}`;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function unwrapData<T = any>(data: any): T {
  if (data?.data !== undefined) return data.data;
  if (data?.result !== undefined) return data.result;
  if (data?.item !== undefined) return data.item;
  if (data?.stocking !== undefined) return data.stocking;
  if (data?.species !== undefined) return data.species;
  return data;
}

function extractArray<T = any>(data: any): T[] {
  const unwrapped = unwrapData<any>(data);

  if (Array.isArray(unwrapped)) return unwrapped;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.species)) return data.species;
  if (Array.isArray(data?.stocking)) return data.stocking;

  return [];
}

function extractMessage(data: any, fallback: string): string {
  if (!data) return fallback;

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (typeof data.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  if (typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item: any) => {
        if (item?.msg) {
          const loc = Array.isArray(item.loc) ? item.loc.join(".") : "";
          return loc ? `${loc}: ${item.msg}` : item.msg;
        }

        return JSON.stringify(item);
      })
      .join(" | ");
  }

  return fallback;
}

async function requestJson<T = any>({
  path,
  method,
  body,
  fallbackError,
}: {
  path: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: Record<string, any>;
  fallbackError: string;
}): Promise<ApiResult<T>> {
  try {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(apiUrl(path), {
      method,
      headers: {
        ...authHeaders,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const data = await parseJson(response);

    if (!response.ok) {
      return {
        ok: false,
        message: extractMessage(data, fallbackError),
        data,
        status: response.status,
      };
    }

    return {
      ok: true,
      message: extractMessage(data, "Request successful"),
      data: unwrapData<T>(data),
      status: response.status,
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message || fallbackError,
    };
  }
}

export async function fetchSpeciesRegistry(): Promise<ApiResult<SpeciesRecord[]>> {
  const first = await requestJson<any>({
    path: "/api/fish-types",
    method: "GET",
    fallbackError: "Failed to fetch species",
  });

  if (first.ok) {
    return {
      ...first,
      data: extractArray<SpeciesRecord>(first.data),
    };
  }

  const second = await requestJson<any>({
    path: "/api/species",
    method: "GET",
    fallbackError: "Failed to fetch species",
  });

  if (second.ok) {
    return {
      ...second,
      data: extractArray<SpeciesRecord>(second.data),
    };
  }

  const third = await requestJson<any>({
    path: "/api/aquaculture/species",
    method: "GET",
    fallbackError: "Failed to fetch species",
  });

  return {
    ...third,
    data: extractArray<SpeciesRecord>(third.data),
  };
}

export async function submitStockingDetails(
  payload: StockingPayload,
): Promise<ApiResult<StockingRecord>> {
  return requestJson<StockingRecord>({
    path: STOCKING_BASE_PATH,
    method: "POST",
    body: payload,
    fallbackError: "Stocking submission failed",
  });
}

export async function fetchStockingRecords(): Promise<ApiResult<StockingRecord[]>> {
  const result = await requestJson<any>({
    path: STOCKING_BASE_PATH,
    method: "GET",
    fallbackError: "Failed to fetch stocking records",
  });

  return {
    ...result,
    data: extractArray<StockingRecord>(result.data),
  };
}

export async function fetchStockingByCultureCycleId(
  culturecycleId: number | string,
): Promise<ApiResult<StockingRecord[]>> {
  const result = await requestJson<any>({
    path: `${STOCKING_BASE_PATH}/culturecycle/${culturecycleId}`,
    method: "GET",
    fallbackError: "Failed to fetch stocking by culture cycle",
  });

  return {
    ...result,
    data: extractArray<StockingRecord>(result.data),
  };
}

export async function fetchStockingByQrCodeId(
  qrCodeId: number | string,
): Promise<ApiResult<StockingRecord[]>> {
  const result = await requestJson<any>({
    path: `${STOCKING_BASE_PATH}/qrcode/${qrCodeId}`,
    method: "GET",
    fallbackError: "Failed to fetch stocking by QR code",
  });

  return {
    ...result,
    data: extractArray<StockingRecord>(result.data),
  };
}

export async function fetchStockingById(
  id: number | string,
): Promise<ApiResult<StockingRecord>> {
  return requestJson<StockingRecord>({
    path: `${STOCKING_BASE_PATH}/${id}`,
    method: "GET",
    fallbackError: "Failed to fetch stocking",
  });
}
