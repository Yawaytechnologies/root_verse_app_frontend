import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../config/env";

const TOKEN_KEY = "auth_token";

const QRS_BY_CODE_PATH = "/api/aquaculture/qrs/code";
const CULTURE_CYCLES_BY_USER_PATH = "/api/aquaculture/culture-cycles/user";
const HARVEST_PATH = "/api/aquaculture/harvest";

export type ApiResult<T = any> = {
  ok: boolean;
  message: string;
  data?: T;
  status?: number;
};

export type QrRecord = {
  id?: number | string;
  qrs_code?: string;
  qrsCode?: string;
  qr_code?: string;
  qrCode?: string;
  code?: string;
  type?: string;
  farm_id?: number | string;
  farmId?: number | string;
  pond_id?: number | string;
  pondId?: number | string;
  is_active?: boolean;
  isActive?: boolean;
  [key: string]: any;
};

export type CultureCycle = {
  id?: number | string;

  culture_id?: number | string;
  cultureId?: number | string;
  culture_cycle_id?: number | string;
  cultureCycleId?: number | string;

  qr_code_id?: number | string;
  qrCodeId?: number | string;
  qrcode_id?: number | string;
  qrcodeId?: number | string;
  qrs_id?: number | string;
  qrsId?: number | string;

  farm_id?: number | string;
  farmId?: number | string;
  pond_id?: number | string;
  pondId?: number | string;

  DOC?: number | string;
  doc?: number | string;
  days_of_culture?: number | string;
  daysOfCulture?: number | string;
  culture_doc?: number | string;
  cultureDoc?: number | string;

  stocking_date?: string;
  stockingDate?: string;
  stocked_date?: string;
  stockedDate?: string;
  start_date?: string;
  startDate?: string;

  species?: string;
  species_name?: string;
  speciesName?: string;
  fish_name?: string;
  fishName?: string;
  fish_type?: string;
  fishType?: string;

  status?: string;
  cycle_status?: string;
  culture_status?: string;
  verification_status?: string;

  is_active?: boolean;
  isActive?: boolean;

  [key: string]: any;
};

export type HarvestPayload = {
  user_id?: number | string;
  culture_id: number;
  qr_code_id: number;
  DOC: number;
  preferred_harvest_time: string;
  expected_size: string;
  expected_biomass: number;
  harvest_method: "Partial" | "Full";
  species: string;
  harvest_reason: string;
  stocking_date: string;
};

export type HarvestRequest = {
  id: number | string;
  user_id?: number | string;
  culture_id?: number | string;
  culture_cycle_id?: number | string;
  qr_code_id?: number | string;
  qr_code?: string;
  culture_code?: string;
  culture_verification_status?: string;
  farmer_id?: number | string;
  farmer_name?: string;
  farm_id?: number | string;
  farm_name?: string;
  pond_id?: number | string;
  pond_name?: string;
  pond_code?: string;
  DOC?: number | string;
  preferred_harvest_time?: string;
  expected_size?: string;
  expected_biomass?: number | string;
  harvest_method?: string;
  species?: string;
  harvest_reason?: string;
  stocking_date?: string;
  booking_status?: string;
  status?: string;
  trader_id?: number | string;
  trader_code?: string;
  trader_name?: string;
  trader_mobile?: string;
  rejection_reason?: string;
  [key: string]: any;
};

export type TraderConfirmPayload = {
  action: "ACCEPT" | "REJECT";
  rejection_reason?: string;
};

function apiUrl(path: string) {
  const base = String(API_BASE || "").replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (base.endsWith("/api") && cleanPath.startsWith("/api/")) {
    return `${base}${cleanPath.replace(/^\/api/, "")}`;
  }

  return `${base}${cleanPath}`;
}

async function authHeaders() {
  const token =
    (await AsyncStorage.getItem(TOKEN_KEY)) ||
    (await AsyncStorage.getItem("token")) ||
    "";

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
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

function unwrapData<T = any>(data: any): T {
  if (data?.data !== undefined) return data.data;
  if (data?.result !== undefined) return data.result;
  if (data?.item !== undefined) return data.item;
  if (data?.record !== undefined) return data.record;
  if (data?.request !== undefined) return data.request;
  if (data?.harvest !== undefined) return data.harvest;

  return data;
}

function extractArray<T = any>(data: any): T[] {
  const unwrapped = unwrapData<any>(data);

  if (Array.isArray(unwrapped)) return unwrapped;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.culture_cycles)) return data.culture_cycles;
  if (Array.isArray(data?.cultureCycles)) return data.cultureCycles;
  if (Array.isArray(data?.harvest_requests)) return data.harvest_requests;
  if (Array.isArray(data?.harvestRequests)) return data.harvestRequests;

  return [];
}

function extractMessage(data: any, fallback: string, status?: number) {
  if (!data) return status ? `HTTP ${status}: ${fallback}` : fallback;

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }

  if (typeof data.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  if (Array.isArray(data.message)) return data.message.join(" | ");
  if (Array.isArray(data.error)) return data.error.join(" | ");

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item: any) => {
        if (typeof item === "string") return item;

        if (item?.msg) {
          const loc = Array.isArray(item.loc) ? item.loc.join(".") : "";
          return loc ? `${loc}: ${item.msg}` : item.msg;
        }

        return JSON.stringify(item);
      })
      .join(" | ");
  }

  return status ? `HTTP ${status}: ${fallback}` : fallback;
}

function cleanText(value: any) {
  return String(value ?? "").trim();
}

function toNumber(value: any, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isValidUserId(value: any) {
  const text = cleanText(value);

  if (!text || text === "0" || text === "undefined" || text === "null") {
    return false;
  }

  const number = Number(text);
  return Number.isFinite(number) && number > 0;
}

function normalizeHarvestMethod(value: any): "Partial" | "Full" {
  const method = cleanText(value).toUpperCase();

  if (method === "PARTIAL") return "Partial";
  if (method === "FULL") return "Full";

  return method === "PART" ? "Partial" : "Full";
}

function normalizeIsoDateTime(value: string) {
  const raw = cleanText(value);

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date.toISOString();
  }

  const date = new Date(raw);

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString();
  }

  return raw;
}

function pickUserIdFromObject(value: any) {
  const candidates = [
    value?.user_id,
    value?.userId,

    value?.data?.user_id,
    value?.data?.userId,

    value?.rootverse_user?.id,
    value?.data?.rootverse_user?.id,

    value?.user?.user_id,
    value?.user?.userId,
    value?.user?.id,

    value?.data?.user?.user_id,
    value?.data?.user?.userId,
    value?.data?.user?.id,

    value?.profile?.user_id,
    value?.profile?.userId,
    value?.profile?.id,

    value?.id,
    value?.data?.id,
  ];

  return candidates.find(isValidUserId) || "";
}

async function getStoredLoginUserId() {
  const directKeys = [
    "user_id",
    "userId",
    "login_user_id",
    "auth_user_id",
    "rootverse_user_id",
  ];

  for (const key of directKeys) {
    const value = await AsyncStorage.getItem(key);
    if (isValidUserId(value)) return String(value);
  }

  const jsonKeys = [
    "auth_user",
    "user",
    "login_user",
    "loginUser",
    "current_user",
    "me",
    "profile",
    "farmer_details",
  ];

  for (const key of jsonKeys) {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const found = pickUserIdFromObject(parsed);

      if (isValidUserId(found)) return String(found);
    } catch {
      // ignore invalid JSON
    }
  }

  return "";
}

function cleanHarvestPayload(
  payload: HarvestPayload,
  loginUserId?: string | number,
): HarvestPayload {
  return {
    user_id: Number(loginUserId || payload.user_id),
    culture_id: toNumber(payload.culture_id),
    qr_code_id: toNumber(payload.qr_code_id),
    DOC: toNumber(payload.DOC),
    preferred_harvest_time: normalizeIsoDateTime(payload.preferred_harvest_time),
    expected_size: cleanText(payload.expected_size),
    expected_biomass: toNumber(payload.expected_biomass),
    harvest_method: normalizeHarvestMethod(payload.harvest_method),
    species: cleanText(payload.species),
    harvest_reason: cleanText(payload.harvest_reason),
    stocking_date: cleanText(payload.stocking_date),
  };
}

async function requestJson<T = any>({
  path,
  method,
  body,
  fallbackError,
}: {
  path: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: any;
  fallbackError: string;
}): Promise<ApiResult<T>> {
  try {
    const finalUrl = apiUrl(path);

    console.log("AQUA API URL:", finalUrl);
    console.log("AQUA API METHOD:", method);

    if (body) {
      console.log("AQUA API BODY:", JSON.stringify(body, null, 2));
    }

    const response = await fetch(finalUrl, {
      method,
      headers: await authHeaders(),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const data = await parseJson(response);

    console.log("AQUA API STATUS:", response.status);
    console.log("AQUA API RESPONSE:", JSON.stringify(data, null, 2));

    if (!response.ok || data?.success === false || data?.ok === false) {
      return {
        ok: false,
        message: extractMessage(data, fallbackError, response.status),
        data,
        status: response.status,
      };
    }

    return {
      ok: true,
      message: extractMessage(data, "Request successful", response.status),
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

export async function getQrByCode(code: string): Promise<ApiResult<QrRecord>> {
  return requestJson<QrRecord>({
    path: `${QRS_BY_CODE_PATH}/${encodeURIComponent(code)}`,
    method: "GET",
    fallbackError: "Unable to fetch QR details.",
  });
}

export async function getCultureCyclesByUser(
  userId: number | string,
): Promise<ApiResult<CultureCycle[]>> {
  if (!isValidUserId(userId)) {
    return {
      ok: false,
      message: "User ID not found. Please login again.",
      data: [],
    };
  }

  const result = await requestJson<any>({
    path: `${CULTURE_CYCLES_BY_USER_PATH}/${encodeURIComponent(String(userId))}`,
    method: "GET",
    fallbackError: "Unable to fetch culture cycles.",
  });

  return {
    ...result,
    data: extractArray<CultureCycle>(result.data),
  };
}

export async function submitHarvestRequest(
  payload: HarvestPayload,
  userId?: string | number,
): Promise<ApiResult<HarvestRequest>> {
  const storedUserId =
    userId ||
    (await AsyncStorage.getItem("user_id")) ||
    (await AsyncStorage.getItem("userId")) ||
    "";

  console.log("HARVEST STORED USER ID:", storedUserId);

  if (!isValidUserId(storedUserId)) {
    return {
      ok: false,
      message:
        "Login user ID missing. Please logout and login again. If still same issue, login API is not returning user_id.",
    };
  }

  const finalPayload = {
    ...payload,
    user_id: Number(storedUserId),
  };

  return requestJson<HarvestRequest>({
    path: HARVEST_PATH,
    method: "POST",
    body: cleanHarvestPayload(finalPayload, storedUserId),
    fallbackError: "Harvest request submission failed.",
  });
}

export async function getHarvestRequests(
  userId: string | number,
): Promise<ApiResult<HarvestRequest[]>> {
  if (!isValidUserId(userId)) {
    return {
      ok: false,
      message: "User ID not found. Please login again and open harvest requests.",
      data: [],
    };
  }

  const result = await requestJson<any>({
    path: `${HARVEST_PATH}/user/${encodeURIComponent(String(userId))}`,
    method: "GET",
    fallbackError: "Unable to fetch harvest records.",
  });

  return {
    ...result,
    data: extractArray<HarvestRequest>(result.data),
  };
}

export async function traderConfirmHarvestRequest(
  requestId: number | string,
  payload: TraderConfirmPayload,
): Promise<ApiResult<HarvestRequest>> {
  return requestJson<HarvestRequest>({
    path: `${HARVEST_PATH}/${requestId}/trader-confirmation`,
    method: "PATCH",
    body: payload,
    fallbackError: "Unable to update harvest request.",
  });
}