import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AquaRegistrationPayload } from "../../types/aqua";
import { API_BASE } from "../../config/env";

const TOKEN_KEY = "auth_token";

export type SubmitRegistrationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "active";

export type SubmitRegistrationResponse<T = any> = {
  ok: boolean;
  status: SubmitRegistrationStatus;
  message: string;
  data?: T;
  httpStatus?: number;
};

export type FarmRegistrationJson = {
  user_id: number;
  farm_prefix: string;
  farm_name: string;
  address: string;
  farm_gate_latitude: number;
  farm_gate_longitude: number;
  water_source: string;
  farm_area_acres: number;
};

export type PondRegistrationJson = {
  farm_id: number;
  pond_name: string;
  pond_type: string;
  water_spread_area_acres: number;
  volume?: number | null;
  pond_status?: string;
  verification_status?: string;
  pond_gps: string;
};

export type FarmRecord = {
  id: number;
  farm_id?: string;
  farm_code?: string;
  farm_qr_id?: string;
  farm_name: string;
  name: string;
  address?: string;
  farm_gate_latitude?: string | number;
  farm_gate_longitude?: string | number;
  water_source?: string;
  farm_area_acres?: string | number;
  user_id?: number;
  owner_id?: number;
  status?: string;
  verification_status?: string;
  created_at?: string;
  updated_at?: string;
};

export type PondRecord = {
  id: number;
  farm_id: number;
  pond_id?: string;
  pond_code?: string;
  pond_qr_id?: string;
  pond_name: string;
  name: string;
  pond_type?: string;
  water_spread_area_acres?: string | number;
  area?: string | number;
  volume?: string | number | null;
  pond_gps?: string;
  pond_status?: string;
  status?: string;
  verification_status?: string;
  user_id?: number;
  farm_qr_id?: string;
  farm_name?: string;
  created_at?: string;
  updated_at?: string;
};

export type AquacultureQrRecord = {
  id: number;
  code?: string;
  qr_code?: string;
  qr_value?: string;
  type?: string;
  qr_type?: "FARM" | "POND" | string;
  status?: string;
  is_active?: boolean;
  is_activated?: boolean;
  farm_id?: number;
  pond_id?: number;
  created_at?: string;
  updated_at?: string;
};

export type CultureCycleRecord = {
  id: number;
  user_id: number;
  farm_id: number;
  pond_id: number;
  species_id?: number;
  verification_status?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

export type UploadImageInput = {
  uri: string;
  name?: string;
  type?: string;
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

    if (!token) return {};

    return {
      Authorization: `Bearer ${token}`,
    };
  } catch {
    return {};
  }
}

async function parseApiResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractMessage(data: any, fallback: string): string {
  if (!data) return fallback;

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (typeof data.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  if (Array.isArray(data.detail) && data.detail.length > 0) {
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

  if (typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }

  return fallback;
}

function unwrapData<T = any>(data: any): T {
  if (data?.data !== undefined) return data.data;
  if (data?.result !== undefined) return data.result;
  if (data?.qr !== undefined) return data.qr;
  if (data?.farm !== undefined) return data.farm;
  if (data?.pond !== undefined) return data.pond;
  return data;
}

function toNumber(value: any, fallback = 0): number {
  const num = Number(value);

  if (!Number.isFinite(num)) return fallback;

  return num;
}

function toNullableNumber(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;

  const num = Number(value);

  if (!Number.isFinite(num)) return null;

  return num;
}

function pickFirstDefined(...values: any[]) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "",
  );
}

function removeEmptyKeys<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined) return;
    if (typeof value === "number" && Number.isNaN(value)) return;

    cleaned[key] = value;
  });

  return cleaned as T;
}

function isFormDataPayload(input: any): input is FormData {
  return (
    input &&
    typeof input === "object" &&
    (input instanceof FormData || Array.isArray(input?._parts))
  );
}

function formDataToObject(formData: FormData): Record<string, any> {
  const obj: Record<string, any> = {};
  const parts = (formData as any)?._parts;

  if (!Array.isArray(parts)) return obj;

  parts.forEach((part: any) => {
    const key = part?.[0];
    const value = part?.[1];

    if (!key) return;

    // Skip image/file object from registration payload.
    // Images must be uploaded separately after QR activation.
    if (value && typeof value === "object" && value.uri) return;

    if (obj[key] !== undefined) {
      obj[key] = Array.isArray(obj[key])
        ? [...obj[key], value]
        : [obj[key], value];
      return;
    }

    obj[key] = value;
  });

  return obj;
}

function payloadToObject(input: FormData | Record<string, any>): Record<string, any> {
  if (isFormDataPayload(input)) {
    return formDataToObject(input);
  }

  return input || {};
}

function normalizeFarmPayload(
  input: FormData | Partial<FarmRegistrationJson> | Record<string, any>,
): FarmRegistrationJson {
  const raw = payloadToObject(input as any);

  return removeEmptyKeys({
    user_id: toNumber(
      pickFirstDefined(raw.user_id, raw.userId, raw.owner_id, raw.ownerId),
    ),
    farm_prefix: String(
      pickFirstDefined(raw.farm_prefix, raw.farmPrefix, "IN-TN-KA"),
    ),
    farm_name: String(pickFirstDefined(raw.farm_name, raw.farmName, "")),
    address: String(
      pickFirstDefined(raw.address, raw.farm_address, raw.farmAddress, ""),
    ),
    farm_gate_latitude: toNumber(
      pickFirstDefined(
        raw.farm_gate_latitude,
        raw.farmGateLatitude,
        raw.latitude,
        raw.gate_latitude,
      ),
    ),
    farm_gate_longitude: toNumber(
      pickFirstDefined(
        raw.farm_gate_longitude,
        raw.farmGateLongitude,
        raw.longitude,
        raw.gate_longitude,
      ),
    ),
    water_source: String(
      pickFirstDefined(raw.water_source, raw.waterSource, ""),
    ),
    farm_area_acres: toNumber(
      pickFirstDefined(raw.farm_area_acres, raw.farmArea, raw.farm_area),
    ),
  });
}

function buildPondGps(raw: Record<string, any>) {
  const existingGps = pickFirstDefined(raw.pond_gps, raw.pondGps);

  if (existingGps) return String(existingGps);

  const lat = pickFirstDefined(raw.gpsLat, raw.latitude, raw.pond_latitude);
  const lng = pickFirstDefined(raw.gpsLng, raw.longitude, raw.pond_longitude);

  if (lat && lng) {
    return `https://maps.google.com/?q=${lat},${lng}`;
  }

  return "";
}

function normalizePondPayload(
  input: FormData | Partial<PondRegistrationJson> | Record<string, any>,
): PondRegistrationJson {
  const raw = payloadToObject(input as any);

  return removeEmptyKeys({
    farm_id: toNumber(pickFirstDefined(raw.farm_id, raw.farmId)),
    pond_name: String(pickFirstDefined(raw.pond_name, raw.pondName, "")),
    pond_type: String(
      pickFirstDefined(raw.pond_type, raw.pondType, raw.type, "Earthen"),
    ),
    water_spread_area_acres: toNumber(
      pickFirstDefined(
        raw.water_spread_area_acres,
        raw.waterSpreadAreaAcres,
        raw.pondArea,
        raw.area,
      ),
    ),
    volume: toNullableNumber(raw.volume),
    pond_status: String(
      pickFirstDefined(raw.pond_status, raw.pondStatus, "Inactive"),
    ),
    verification_status: String(
      pickFirstDefined(
        raw.verification_status,
        raw.verificationStatus,
        "Unverified",
      ),
    ),
    pond_gps: buildPondGps(raw),
  });
}

async function postJson<T = any>(
  path: string,
  payload: Record<string, any>,
  fallbackError: string,
): Promise<SubmitRegistrationResponse<T>> {
  try {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(apiUrl(path), {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await parseApiResponse(response);

    if (!response.ok) {
      return {
        ok: false,
        status: "rejected",
        message: extractMessage(data, fallbackError),
        data,
        httpStatus: response.status,
      };
    }

    return {
      ok: true,
      status: "pending",
      message: extractMessage(data, "Submitted successfully"),
      data: unwrapData<T>(data),
      httpStatus: response.status,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: "rejected",
      message: error?.message || fallbackError,
    };
  }
}

async function patchJson<T = any>(
  path: string,
  payload: Record<string, any> = {},
  fallbackError: string,
): Promise<SubmitRegistrationResponse<T>> {
  try {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(apiUrl(path), {
      method: "PATCH",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await parseApiResponse(response);

    if (!response.ok) {
      return {
        ok: false,
        status: "rejected",
        message: extractMessage(data, fallbackError),
        data,
        httpStatus: response.status,
      };
    }

    return {
      ok: true,
      status: "active",
      message: extractMessage(data, "Updated successfully"),
      data: unwrapData<T>(data),
      httpStatus: response.status,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: "rejected",
      message: error?.message || fallbackError,
    };
  }
}

async function putJson<T = any>(
  path: string,
  payload: Record<string, any>,
  fallbackError: string,
): Promise<SubmitRegistrationResponse<T>> {
  try {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(apiUrl(path), {
      method: "PUT",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await parseApiResponse(response);

    if (!response.ok) {
      return {
        ok: false,
        status: "rejected",
        message: extractMessage(data, fallbackError),
        data,
        httpStatus: response.status,
      };
    }

    return {
      ok: true,
      status: "approved",
      message: extractMessage(data, "Updated successfully"),
      data: unwrapData<T>(data),
      httpStatus: response.status,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: "rejected",
      message: error?.message || fallbackError,
    };
  }
}

async function getJson<T = any>(
  path: string,
  fallbackError: string,
): Promise<SubmitRegistrationResponse<T>> {
  try {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(apiUrl(path), {
      method: "GET",
      headers: {
        ...authHeaders,
      },
    });

    const data = await parseApiResponse(response);

    if (!response.ok) {
      return {
        ok: false,
        status: "rejected",
        message: extractMessage(data, fallbackError),
        data,
        httpStatus: response.status,
      };
    }

    return {
      ok: true,
      status: "approved",
      message: extractMessage(data, "Fetched successfully"),
      data: unwrapData<T>(data),
      httpStatus: response.status,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: "rejected",
      message: error?.message || fallbackError,
    };
  }
}

async function deleteJson<T = any>(
  path: string,
  fallbackError: string,
): Promise<SubmitRegistrationResponse<T>> {
  try {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(apiUrl(path), {
      method: "DELETE",
      headers: {
        ...authHeaders,
      },
    });

    const data = await parseApiResponse(response);

    if (!response.ok) {
      return {
        ok: false,
        status: "rejected",
        message: extractMessage(data, fallbackError),
        data,
        httpStatus: response.status,
      };
    }

    return {
      ok: true,
      status: "approved",
      message: extractMessage(data, "Deleted successfully"),
      data: unwrapData<T>(data),
      httpStatus: response.status,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: "rejected",
      message: error?.message || fallbackError,
    };
  }
}

function normalizeFarmRecord(item: any): FarmRecord {
  return {
    id: Number(item.id),
    farm_id: item.farm_id,
    farm_code: item.farm_code ?? item.farm_id ?? item.farm_qr_id ?? "",
    farm_qr_id: item.farm_qr_id,
    farm_name: item.farm_name ?? item.name ?? "Unnamed Farm",
    name: item.farm_name ?? item.name ?? "Unnamed Farm",
    address: item.address,
    farm_gate_latitude: item.farm_gate_latitude,
    farm_gate_longitude: item.farm_gate_longitude,
    water_source: item.water_source,
    farm_area_acres: item.farm_area_acres,
    user_id: item.user_id,
    owner_id: item.owner_id ?? item.user_id,
    status: item.status ?? item.verification_status,
    verification_status: item.verification_status,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

function normalizePondRecord(item: any): PondRecord {
  return {
    id: Number(item.id),
    farm_id: Number(item.farm_id),
    pond_id: item.pond_id,
    pond_code: item.pond_code ?? item.pond_id ?? item.pond_qr_id ?? "",
    pond_qr_id: item.pond_qr_id,
    pond_name: item.pond_name ?? item.name ?? "Unnamed Pond",
    name: item.pond_name ?? item.name ?? "Unnamed Pond",
    pond_type: item.pond_type,
    water_spread_area_acres: item.water_spread_area_acres,
    area: item.area ?? item.water_spread_area_acres,
    volume: item.volume,
    pond_gps: item.pond_gps,
    pond_status: item.pond_status,
    status: item.status ?? item.pond_status,
    verification_status: item.verification_status,
    user_id: item.user_id,
    farm_qr_id: item.farm_qr_id,
    farm_name: item.farm_name,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

/**
 * FARM REGISTRATION
 * Backend endpoint from your Postman:
 * POST /api/farms
 */
export async function submitFarmRegistration(payload: any) {
  try {
    const response = await fetch(`${API_BASE}/api/farms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await parseApiResponse(response);

    if (!response.ok) {
      return {
        ok: false,
        status: "rejected",
        message: extractMessage(data, "Farm registration failed"),
        data,
      };
    }

    return {
      ok: true,
      status: "pending",
      message: extractMessage(data, "Farm registered successfully"),
      data: data?.data ?? data,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: "rejected",
      message: error?.message || "Network error while submitting farm registration",
    };
  }
}

/**
 * POND REGISTRATION
 * Backend endpoint from your Postman:
 * POST /api/ponds
 */
export async function submitPondRegistration(
  payload: FormData | Partial<PondRegistrationJson> | Record<string, any>,
): Promise<SubmitRegistrationResponse<PondRecord>> {
  const jsonPayload = normalizePondPayload(payload);

  const result = await postJson<any>(
    "/api/ponds",
    jsonPayload,
    "Pond registration failed",
  );

  return {
    ...result,
    status: result.ok ? "pending" : "rejected",
    message: result.ok
      ? extractMessage(result.data, result.message || "Pond registered successfully")
      : result.message,
    data: result.data ? normalizePondRecord(result.data) : result.data,
  };
}

/**
 * FARMS
 * Backend endpoint from your Postman:
 * GET /api/farms
 */
export async function fetchOwnerFarms(
  numericOwnerId = "",
): Promise<FarmRecord[]> {
  const result = await getJson<any[]>("/api/farms", "Failed to fetch farms");

  const list = Array.isArray(result.data) ? result.data : [];

  const normalized = list.map(normalizeFarmRecord);

  if (!numericOwnerId) return normalized;

  return normalized.filter((farm) => {
    return (
      String(farm.user_id ?? "") === String(numericOwnerId) ||
      String(farm.owner_id ?? "") === String(numericOwnerId)
    );
  });
}

export async function fetchAllFarms(): Promise<FarmRecord[]> {
  return fetchOwnerFarms("");
}

export async function fetchFarmById(
  farmId: number | string,
): Promise<SubmitRegistrationResponse<FarmRecord>> {
  const result = await getJson<any>(
    `/api/farms/${farmId}`,
    "Failed to fetch farm",
  );

  return {
    ...result,
    data: result.data ? normalizeFarmRecord(result.data) : result.data,
  };
}

export async function deleteFarm(
  farmId: number | string,
): Promise<SubmitRegistrationResponse> {
  return deleteJson(`/api/farms/${farmId}`, "Failed to delete farm");
}

/**
 * PONDS
 * Backend endpoint from your Postman:
 * GET /api/ponds
 */
export async function fetchAllPonds(): Promise<PondRecord[]> {
  const result = await getJson<any[]>("/api/ponds", "Failed to fetch ponds");

  const list = Array.isArray(result.data) ? result.data : [];

  return list.map(normalizePondRecord);
}

export async function fetchPondsByFarmId(
  farmId: number | string,
): Promise<PondRecord[]> {
  const ponds = await fetchAllPonds();

  return ponds.filter((pond) => String(pond.farm_id) === String(farmId));
}

export async function fetchPondById(
  pondId: number | string,
): Promise<SubmitRegistrationResponse<PondRecord>> {
  const result = await getJson<any>(
    `/api/ponds/${pondId}`,
    "Failed to fetch pond",
  );

  return {
    ...result,
    data: result.data ? normalizePondRecord(result.data) : result.data,
  };
}

export async function deletePond(
  pondId: number | string,
): Promise<SubmitRegistrationResponse> {
  return deleteJson(`/api/ponds/${pondId}`, "Failed to delete pond");
}

/**
 * AQUACULTURE QRs
 */
export async function fetchAquacultureQrs(): Promise<AquacultureQrRecord[]> {
  const result = await getJson<any[]>(
    "/api/aquaculture/qrs",
    "Failed to fetch aquaculture QRs",
  );

  return Array.isArray(result.data) ? result.data : [];
}

export async function fetchAquacultureQrByCode(
  code: string,
): Promise<SubmitRegistrationResponse<AquacultureQrRecord>> {
  return getJson<AquacultureQrRecord>(
    `/api/aquaculture/qrs/code/${encodeURIComponent(code)}`,
    "Failed to fetch QR by code",
  );
}

export async function fetchAquacultureQrById(
  qrId: number | string,
): Promise<SubmitRegistrationResponse<AquacultureQrRecord>> {
  return getJson<AquacultureQrRecord>(
    `/api/aquaculture/qrs/${qrId}`,
    "Failed to fetch QR by ID",
  );
}

export async function generateAquacultureQrs(payload: {
  qr_type?: "FARM" | "POND" | string;
  type?: "FARM" | "POND" | string;
  quantity?: number;
  count?: number;
  prefix?: string;
}): Promise<SubmitRegistrationResponse<any>> {
  return postJson(
    "/api/aquaculture/qrs/generate",
    payload,
    "Failed to generate aquaculture QRs",
  );
}

export async function activateFarmQr(
  farmId: number | string,
  qrId: number | string,
): Promise<SubmitRegistrationResponse<any>> {
  return patchJson(
    `/api/aquaculture/qrs/farm/${farmId}/activate/${qrId}`,
    {},
    "Failed to activate farm QR",
  );
}

export async function activatePondQr(
  pondId: number | string,
  qrId: number | string,
): Promise<SubmitRegistrationResponse<any>> {
  return patchJson(
    `/api/aquaculture/qrs/pond/${pondId}/activate/${qrId}`,
    {},
    "Failed to activate pond QR",
  );
}

export async function activateFarmQrByCode(
  farmId: number | string,
  qrCode: string,
): Promise<SubmitRegistrationResponse<any>> {
  const qrResult = await fetchAquacultureQrByCode(qrCode);

  if (!qrResult.ok || !qrResult.data?.id) {
    return {
      ok: false,
      status: "rejected",
      message: qrResult.message || "Invalid farm QR code",
      data: qrResult.data,
    };
  }

  return activateFarmQr(farmId, qrResult.data.id);
}

export async function activatePondQrByCode(
  pondId: number | string,
  qrCode: string,
): Promise<SubmitRegistrationResponse<any>> {
  const qrResult = await fetchAquacultureQrByCode(qrCode);

  if (!qrResult.ok || !qrResult.data?.id) {
    return {
      ok: false,
      status: "rejected",
      message: qrResult.message || "Invalid pond QR code",
      data: qrResult.data,
    };
  }

  return activatePondQr(pondId, qrResult.data.id);
}

/**
 * CULTURE CYCLES
 */
export async function createCultureCycle(
  payload: Record<string, any>,
): Promise<SubmitRegistrationResponse<CultureCycleRecord>> {
  return postJson<CultureCycleRecord>(
    "/api/aquaculture/culture-cycles",
    payload,
    "Failed to create culture cycle",
  );
}

export async function fetchCultureCyclesByUserId(
  userId: number | string,
): Promise<CultureCycleRecord[]> {
  const result = await getJson<CultureCycleRecord[]>(
    `/api/aquaculture/culture-cycles/user/${userId}`,
    "Failed to fetch culture cycles by user",
  );

  return Array.isArray(result.data) ? result.data : [];
}

export async function fetchCultureCycleById(
  cultureCycleId: number | string,
): Promise<SubmitRegistrationResponse<CultureCycleRecord>> {
  return getJson<CultureCycleRecord>(
    `/api/aquaculture/culture-cycles/${cultureCycleId}`,
    "Failed to fetch culture cycle",
  );
}

export async function fetchCultureCyclesByVerificationStatus(
  verificationStatus: string,
): Promise<CultureCycleRecord[]> {
  const result = await getJson<CultureCycleRecord[]>(
    `/api/aquaculture/culture-cycles/verification-status/${verificationStatus}`,
    "Failed to fetch culture cycles by verification status",
  );

  return Array.isArray(result.data) ? result.data : [];
}

export async function updateCultureCycleVerificationStatus(
  cultureCycleId: number | string,
  verificationStatus: string,
): Promise<SubmitRegistrationResponse<CultureCycleRecord>> {
  return putJson<CultureCycleRecord>(
    `/api/aquaculture/culture-cycles/${cultureCycleId}/verification-status`,
    {
      verification_status: verificationStatus,
    },
    "Failed to update culture cycle verification status",
  );
}

/**
 * AQUACULTURE IMAGE UPLOAD
 */
export async function uploadAquacultureImage(
  cultureCycleId: number | string,
  image: UploadImageInput,
  extraFields: Record<string, any> = {},
): Promise<SubmitRegistrationResponse<any>> {
  try {
    const authHeaders = await getAuthHeaders();

    const formData = new FormData();

    formData.append("image", {
      uri: image.uri,
      name: image.name || `aquaculture-${Date.now()}.jpg`,
      type: image.type || "image/jpeg",
    } as any);

    Object.entries(extraFields).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, String(value));
    });

    const response = await fetch(
      apiUrl(`/api/aquaculture/imageUpload/${cultureCycleId}/images`),
      {
        method: "POST",
        headers: {
          ...authHeaders,
        },
        body: formData,
      },
    );

    const data = await parseApiResponse(response);

    if (!response.ok) {
      return {
        ok: false,
        status: "rejected",
        message: extractMessage(data, "Aquaculture image upload failed"),
        data,
        httpStatus: response.status,
      };
    }

    return {
      ok: true,
      status: "approved",
      message: extractMessage(data, "Aquaculture image uploaded successfully"),
      data: unwrapData(data),
      httpStatus: response.status,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: "rejected",
      message: error?.message || "Network error while uploading image",
    };
  }
}

export async function fetchAquacultureImages(
  cultureCycleId: number | string,
): Promise<any[]> {
  const result = await getJson<any[]>(
    `/api/aquaculture/imageUpload/${cultureCycleId}/images`,
    "Failed to fetch aquaculture images",
  );

  return Array.isArray(result.data) ? result.data : [];
}

/**
 * Old function kept temporarily so older imports do not break.
 */
export async function submitAquaRegistration(
  payload: AquaRegistrationPayload,
): Promise<SubmitRegistrationResponse> {
  console.log("submitAquaRegistration payload:", payload);

  return {
    ok: true,
    status: "pending",
    message:
      "Registration submitted successfully and waiting for field verification",
  };
}