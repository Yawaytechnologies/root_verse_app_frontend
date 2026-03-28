import type { AquaRegistrationPayload } from "../../types/aqua";
import { API_BASE } from "../../config/env";

export type SubmitRegistrationResponse = {
  ok: boolean;
  status: "pending" | "approved" | "rejected";
  message: string;
  data?: any;
};

async function parseApiResponse(response: Response) {
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return data;
}

function extractMessage(data: any, fallback: string): string {
  if (!data) return fallback;
  if (typeof data.message === "string" && data.message) return data.message;
  if (typeof data.detail === "string" && data.detail) return data.detail;
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    return data.detail
      .map((e: any) => (e.msg ? `${e.loc?.join(".")}: ${e.msg}` : JSON.stringify(e)))
      .join(" | ");
  }
  return fallback;
}

export async function submitFarmRegistration(
  formData: FormData,
): Promise<SubmitRegistrationResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/farms/register`, {
      method: "POST",
      body: formData,
    });

    const data = await parseApiResponse(response);

    if (!response.ok) {
      return {
        ok: false,
        status: "rejected",
        message: extractMessage(data, "Farm registration submission failed"),
        data,
      };
    }

    return {
      ok: true,
      status: "pending",
      message: extractMessage(data, "Farm registration submitted successfully"),
      data,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: "rejected",
      message:
        error?.message || "Network error while submitting farm registration",
    };
  }
}

export async function submitPondRegistration(
  formData: FormData,
): Promise<SubmitRegistrationResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/ponds/register`, {
      method: "POST",
      body: formData,
    });

    const data = await parseApiResponse(response);

    if (!response.ok) {
      return {
        ok: false,
        status: "rejected",
        message: extractMessage(data, "Pond registration submission failed"),
        data,
      };
    }

    return {
      ok: true,
      status: "pending",
      message: extractMessage(data, "Pond registration submitted successfully"),
      data,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: "rejected",
      message:
        error?.message || "Network error while submitting pond registration",
    };
  }
}

export type FarmRecord = {
  id: number;
  name: string;
  farm_code: string;
  status: string;
  owner_id: number;
};

export type PondRecord = {
  id: number;
  farm_id: number;
  name: string;
  area: number;
  pond_code: string;
  status: string;
  created_at: string;
};

export async function fetchOwnerFarms(numericOwnerId: string): Promise<FarmRecord[]> {
  const url = numericOwnerId
    ? `${API_BASE}/api/farms?owner_id=${numericOwnerId}`
    : `${API_BASE}/api/farms`;
  const res = await fetch(url);
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.farms ?? data?.data ?? []);
}

export async function fetchAllPonds(): Promise<PondRecord[]> {
  const res = await fetch(`${API_BASE}/api/ponds`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.ponds ?? data?.data ?? []);
}

/**
 * Keep old mock temporarily so older imports do not break.
 */
export async function submitAquaRegistration(
  payload: AquaRegistrationPayload,
): Promise<SubmitRegistrationResponse> {
  console.log("submitAquaRegistration payload:", payload);

  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    ok: true,
    status: "pending",
    message: "Registration submitted successfully and waiting for approval",
  };
}