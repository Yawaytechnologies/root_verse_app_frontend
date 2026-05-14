import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../config/env";

const TOKEN_KEY = "auth_token";

export type ApiResult<T = any> = {
  ok: boolean;
  message: string;
  data?: T;
  status?: number;
};

export type CultureCycleRecord = {
  id: number;
  user_id: number | string;
  farm_id: number | string;
  pond_id: number | string;
  start_date?: string;
  end_date?: string;
  verification_status?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

export type FarmRecord = {
  id: number;
  farm_id?: string;
  farm_name?: string;
  name?: string;
  user_id?: number | string;
  owner_id?: number | string;
  [key: string]: any;
};

export type PondRecord = {
  id: number;
  farm_id: number | string;
  pond_id?: string;
  pond_name?: string;
  name?: string;
  user_id?: number | string;
  [key: string]: any;
};

function apiUrl(path: string) {
  const base = String(API_BASE || "").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractMessage(data: any, fallback: string) {
  if (!data) return fallback;
  if (typeof data.message === "string") return data.message;
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.error === "string") return data.error;

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

function unwrapData<T = any>(data: any): T {
  if (data?.data !== undefined) return data.data;
  if (data?.result !== undefined) return data.result;
  if (data?.culture_cycle !== undefined) return data.culture_cycle;
  if (data?.cultureCycle !== undefined) return data.cultureCycle;
  return data;
}

function extractArray<T = any>(data: any): T[] {
  const unwrapped = unwrapData<any>(data);

  if (Array.isArray(unwrapped)) return unwrapped;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.farms)) return data.farms;
  if (Array.isArray(data?.ponds)) return data.ponds;

  return [];
}

async function requestJson<T = any>({
  path,
  method,
  body,
  fallbackError,
}: {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, any>;
  fallbackError: string;
}): Promise<ApiResult<T>> {
  try {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(apiUrl(path), {
      method,
      headers: {
        ...authHeaders,
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

export async function fetchFarms(): Promise<ApiResult<FarmRecord[]>> {
  const result = await requestJson<any>({
    path: "/api/farms",
    method: "GET",
    fallbackError: "Failed to fetch farms",
  });

  return {
    ...result,
    data: extractArray<FarmRecord>(result.data),
  };
}

export async function fetchPonds(): Promise<ApiResult<PondRecord[]>> {
  const result = await requestJson<any>({
    path: "/api/ponds",
    method: "GET",
    fallbackError: "Failed to fetch ponds",
  });

  return {
    ...result,
    data: extractArray<PondRecord>(result.data),
  };
}

export async function createCultureCycle(payload: {
  user_id: number;
  farm_id: number;
  pond_id: number;
  start_date: string;
  end_date: string;
  verification_status?: string;
  status?: string;
}): Promise<ApiResult<CultureCycleRecord>> {
  return requestJson<CultureCycleRecord>({
    path: "/api/aquaculture/culture-cycles",
    method: "POST",
    body: {
      user_id: payload.user_id,
      farm_id: payload.farm_id,
      pond_id: payload.pond_id,
      start_date: payload.start_date,
      end_date: payload.end_date,
      verification_status: payload.verification_status || "PENDING",
      status: payload.status || "PENDING",
    },
    fallbackError: "Culture cycle creation failed",
  });
}

export async function fetchCultureCyclesByUserId(
  userId: number | string,
): Promise<ApiResult<CultureCycleRecord[]>> {
  if (!userId) {
    return {
      ok: false,
      message: "User ID is required",
      data: [],
    };
  }

  const result = await requestJson<any>({
    path: `/api/aquaculture/culture-cycles/user/${userId}`,
    method: "GET",
    fallbackError: "Failed to fetch culture cycles",
  });

  return {
    ...result,
    data: extractArray<CultureCycleRecord>(result.data),
  };
}

export async function fetchCultureCycleById(
  cultureCycleId: number | string,
): Promise<ApiResult<CultureCycleRecord>> {
  return requestJson<CultureCycleRecord>({
    path: `/api/aquaculture/culture-cycles/${cultureCycleId}`,
    method: "GET",
    fallbackError: "Failed to fetch culture cycle",
  });
}
