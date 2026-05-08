import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../config/env";

const TOKEN_KEY = "auth_token";

export type ApiResult<T = any> = {
  ok: boolean;
  message: string;
  data?: T;
  status?: number;
};

export type QrType = "FARM" | "POND";

export type AquacultureQrRecord = {
  id: number;
  code?: string;
  qr_code?: string;
  qr_value?: string;
  qr_type?: QrType | string;
  type?: QrType | string;
  status?: string;
  is_active?: boolean;
  is_activated?: boolean;
  farm_id?: number | string | null;
  pond_id?: number | string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

export type CultureCycleRecord = {
  id: number;
  user_id?: number | string;
  farm_id?: number | string;
  pond_id?: number | string;
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

async function parseJson(response: Response) {
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

function unwrapData<T = any>(data: any): T {
  if (data?.data !== undefined) return data.data;
  if (data?.result !== undefined) return data.result;
  if (data?.qr !== undefined) return data.qr;
  if (data?.farm !== undefined) return data.farm;
  if (data?.pond !== undefined) return data.pond;
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
  if (Array.isArray(data?.images)) return data.images;

  return [];
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

/**
 * QR LIST
 * GET /api/aquaculture/qrs
 */
export async function fetchAquacultureQrs(): Promise<
  ApiResult<AquacultureQrRecord[]>
> {
  const result = await requestJson<any>({
    path: "/api/aquaculture/qrs",
    method: "GET",
    fallbackError: "Failed to fetch aquaculture QR codes",
  });

  return {
    ...result,
    data: extractArray<AquacultureQrRecord>(result.data),
  };
}

/**
 * QR BY CODE
 * GET /api/aquaculture/qrs/code/{code}
 */
export async function getAquacultureQrByCode(
  code: string,
): Promise<ApiResult<AquacultureQrRecord>> {
  const cleanCode = String(code || "").trim();

  if (!cleanCode) {
    return {
      ok: false,
      message: "QR code is required",
    };
  }

  return requestJson<AquacultureQrRecord>({
    path: `/api/aquaculture/qrs/code/${encodeURIComponent(cleanCode)}`,
    method: "GET",
    fallbackError: "QR not found",
  });
}

/**
 * QR BY ID
 * GET /api/aquaculture/qrs/{id}
 */
export async function getAquacultureQrById(
  qrId: number | string,
): Promise<ApiResult<AquacultureQrRecord>> {
  if (!qrId) {
    return {
      ok: false,
      message: "QR ID is required",
    };
  }

  return requestJson<AquacultureQrRecord>({
    path: `/api/aquaculture/qrs/${qrId}`,
    method: "GET",
    fallbackError: "QR not found",
  });
}

/**
 * GENERATE QR
 * POST /api/aquaculture/qrs/generate
 */
export async function generateAquacultureQrs(payload: {
  qr_type?: QrType | string;
  type?: QrType | string;
  quantity?: number;
  count?: number;
  prefix?: string;
}): Promise<ApiResult<any>> {
  return requestJson<any>({
    path: "/api/aquaculture/qrs/generate",
    method: "POST",
    body: payload,
    fallbackError: "Failed to generate aquaculture QR codes",
  });
}

/**
 * FARM QR ACTIVATION
 * PATCH /api/aquaculture/qrs/farm/{farm_id}/activate/{qr_id}
 */
export async function activateFarmQrById(
  farmId: number | string,
  qrId: number | string,
): Promise<ApiResult<any>> {
  if (!farmId) {
    return {
      ok: false,
      message: "Farm database ID is required",
    };
  }

  if (!qrId) {
    return {
      ok: false,
      message: "QR ID is required",
    };
  }

  return requestJson<any>({
    path: `/api/aquaculture/qrs/farm/${farmId}/activate/${qrId}`,
    method: "PATCH",
    fallbackError: "Farm QR activation failed",
  });
}

/**
 * POND QR ACTIVATION
 * PATCH /api/aquaculture/qrs/pond/{pond_id}/activate/{qr_id}
 */
export async function activatePondQrById(
  pondId: number | string,
  qrId: number | string,
): Promise<ApiResult<any>> {
  if (!pondId) {
    return {
      ok: false,
      message: "Pond database ID is required",
    };
  }

  if (!qrId) {
    return {
      ok: false,
      message: "QR ID is required",
    };
  }

  return requestJson<any>({
    path: `/api/aquaculture/qrs/pond/${pondId}/activate/${qrId}`,
    method: "PATCH",
    fallbackError: "Pond QR activation failed",
  });
}

/**
 * FARM QR ACTIVATION BY QR CODE
 * First fetch QR by code, then activate with QR ID.
 */
export async function activateFarmQrByCode({
  farmId,
  qrCode,
}: {
  farmId: number | string;
  qrCode: string;
}): Promise<ApiResult<any>> {
  if (!farmId) {
    return {
      ok: false,
      message: "Farm database ID is required",
    };
  }

  if (!qrCode) {
    return {
      ok: false,
      message: "Farm QR code is required",
    };
  }

  const qrResponse = await getAquacultureQrByCode(qrCode);

  if (!qrResponse.ok || !qrResponse.data?.id) {
    return {
      ok: false,
      message: qrResponse.message || "Invalid Farm QR",
      data: qrResponse.data,
      status: qrResponse.status,
    };
  }

  const qrType = String(
    qrResponse.data.qr_type || qrResponse.data.type || "",
  ).toUpperCase();

  if (qrType && qrType !== "FARM") {
    return {
      ok: false,
      message: `Wrong QR type. Expected FARM QR but got ${qrType}`,
      data: qrResponse.data,
    };
  }

  return activateFarmQrById(farmId, qrResponse.data.id);
}

/**
 * POND QR ACTIVATION BY QR CODE
 * First fetch QR by code, then activate with QR ID.
 */
export async function activatePondQrByCode({
  pondId,
  qrCode,
}: {
  pondId: number | string;
  qrCode: string;
}): Promise<ApiResult<any>> {
  if (!pondId) {
    return {
      ok: false,
      message: "Pond database ID is required",
    };
  }

  if (!qrCode) {
    return {
      ok: false,
      message: "Pond QR code is required",
    };
  }

  const qrResponse = await getAquacultureQrByCode(qrCode);

  if (!qrResponse.ok || !qrResponse.data?.id) {
    return {
      ok: false,
      message: qrResponse.message || "Invalid Pond QR",
      data: qrResponse.data,
      status: qrResponse.status,
    };
  }

  const qrType = String(
    qrResponse.data.qr_type || qrResponse.data.type || "",
  ).toUpperCase();

  if (qrType && qrType !== "POND") {
    return {
      ok: false,
      message: `Wrong QR type. Expected POND QR but got ${qrType}`,
      data: qrResponse.data,
    };
  }

  return activatePondQrById(pondId, qrResponse.data.id);
}

/**
 * CULTURE CYCLE CREATE
 * POST /api/aquaculture/culture-cycles
 */
export async function createCultureCycle(
  payload: Record<string, any>,
): Promise<ApiResult<CultureCycleRecord>> {
  const today = new Date().toISOString().split("T")[0];

  const end = new Date();
  end.setDate(end.getDate() + 120);
  const defaultEndDate = end.toISOString().split("T")[0];

  return requestJson<CultureCycleRecord>({
    path: "/api/aquaculture/culture-cycles",
    method: "POST",
    body: {
      ...payload,

      start_date: payload.start_date || today,
      end_date: payload.end_date || defaultEndDate,

      verification_status: payload.verification_status || "PENDING",
      status: payload.status || "PENDING",
    },
    fallbackError: "Culture cycle creation failed",
  });
}

/**
 * CULTURE CYCLE BY USER
 * GET /api/aquaculture/culture-cycles/user/{user_id}
 */
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

/**
 * CULTURE CYCLE BY ID
 * GET /api/aquaculture/culture-cycles/{id}
 */
export async function fetchCultureCycleById(
  cultureCycleId: number | string,
): Promise<ApiResult<CultureCycleRecord>> {
  if (!cultureCycleId) {
    return {
      ok: false,
      message: "Culture cycle ID is required",
    };
  }

  return requestJson<CultureCycleRecord>({
    path: `/api/aquaculture/culture-cycles/${cultureCycleId}`,
    method: "GET",
    fallbackError: "Failed to fetch culture cycle",
  });
}

/**
 * CULTURE CYCLE STATUS UPDATE
 * PUT /api/aquaculture/culture-cycles/{id}/verification-status
 */
export async function updateCultureCycleVerificationStatus({
  cultureCycleId,
  verificationStatus,
}: {
  cultureCycleId: number | string;
  verificationStatus: string;
}): Promise<ApiResult<CultureCycleRecord>> {
  if (!cultureCycleId) {
    return {
      ok: false,
      message: "Culture cycle ID is required",
    };
  }

  if (!verificationStatus) {
    return {
      ok: false,
      message: "Verification status is required",
    };
  }

  return requestJson<CultureCycleRecord>({
    path: `/api/aquaculture/culture-cycles/${cultureCycleId}/verification-status`,
    method: "PUT",
    body: {
      verification_status: verificationStatus,
    },
    fallbackError: "Failed to update culture cycle status",
  });
}

/**
 * IMAGE UPLOAD
 * POST /api/aquaculture/imageUpload/{cultureCycleId}/images
 */
export async function uploadAquacultureImage(
  cultureCycleId: number | string,
  image: UploadImageInput,
  extraFields: Record<string, any> = {},
): Promise<ApiResult<any>> {
  if (!cultureCycleId) {
    return {
      ok: false,
      message: "Culture cycle ID is required for image upload",
    };
  }

  if (!image?.uri) {
    return {
      ok: false,
      message: "Image URI is required",
    };
  }

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
          Accept: "application/json",
        },
        body: formData,
      },
    );

    const data = await parseJson(response);

    if (!response.ok) {
      return {
        ok: false,
        message: extractMessage(data, "Image upload failed"),
        data,
        status: response.status,
      };
    }

    return {
      ok: true,
      message: extractMessage(data, "Image uploaded successfully"),
      data: unwrapData(data),
      status: response.status,
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message || "Network error while uploading image",
    };
  }
}

/**
 * IMAGE LIST
 * GET /api/aquaculture/imageUpload/{cultureCycleId}/images
 */
export async function fetchAquacultureImages(
  cultureCycleId: number | string,
): Promise<ApiResult<any[]>> {
  if (!cultureCycleId) {
    return {
      ok: false,
      message: "Culture cycle ID is required",
      data: [],
    };
  }

  const result = await requestJson<any>({
    path: `/api/aquaculture/imageUpload/${cultureCycleId}/images`,
    method: "GET",
    fallbackError: "Failed to fetch aquaculture images",
  });

  return {
    ...result,
    data: extractArray<any>(result.data),
  };
}