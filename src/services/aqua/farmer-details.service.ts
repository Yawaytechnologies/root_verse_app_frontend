import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../config/env";

export type RootverseUserDetails = {
  id?: number;
  username?: string;
  phone_no?: string;
  owner_id?: string;
  rootverse_type?: string;
  verification_status?: string;
  owner_register_progress?: string;
  address?: string;
  state_name?: string;
  district_name?: string;
  location_name?: string;
  profile_picture_url?: string;
  profile_picture_key?: string;
  [key: string]: any;
};

export type FarmerDetails = {
  id?: number;
  user_id?: number;
  Father_name?: string;
  DOB?: string;
  email?: string;
  farmer_liscence?: string;
  farming_experience?: string;
  created_at?: string;
  updated_at?: string;
  rootverse_user?: RootverseUserDetails;
  [key: string]: any;
};

export type FarmerProfilePayload = {
  Father_name?: string;
  DOB?: string;
  email?: string;
  farmer_liscence?: string;
  farming_experience?: string;
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

async function parseResponse(response: Response) {
  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || data?.success === false) {
    const message =
      data?.message ||
      data?.error ||
      data?.detail ||
      `Request failed with status ${response.status}`;

    const error: any = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function unwrapFarmerDetails(data: any): FarmerDetails {
  return data?.data || data;
}

function cleanPayload(payload: FarmerProfilePayload) {
  const cleaned: FarmerProfilePayload = {};

  if (payload.Father_name !== undefined) {
    cleaned.Father_name = String(payload.Father_name || "").trim();
  }

  if (payload.DOB !== undefined) {
    cleaned.DOB = String(payload.DOB || "").trim();
  }

  if (payload.email !== undefined) {
    cleaned.email = String(payload.email || "").trim();
  }

  if (payload.farmer_liscence !== undefined) {
    cleaned.farmer_liscence = String(payload.farmer_liscence || "").trim();
  }

  if (payload.farming_experience !== undefined) {
    cleaned.farming_experience = String(
      payload.farming_experience || ""
    ).trim();
  }

  return cleaned;
}

function isNotFoundError(error: any) {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.status === 404 ||
    message.includes("not found") ||
    message.includes("farmer details not found") ||
    message.includes("user_id")
  );
}

export async function getFarmerDetailsByUserId(
  userId: string | number
): Promise<FarmerDetails> {
  const response = await fetch(
    buildApiUrl(`/api/aquaculture/farmer-details/user/${userId}`),
    {
      method: "GET",
      headers: await getAuthHeaders(),
    }
  );

  const data = await parseResponse(response);
  return unwrapFarmerDetails(data);
}

export async function getAllFarmerDetails(): Promise<FarmerDetails[]> {
  const response = await fetch(buildApiUrl("/api/aquaculture/farmer-details"), {
    method: "GET",
    headers: await getAuthHeaders(),
  });

  const data = await parseResponse(response);

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;

  return [];
}

export async function getFarmerDetailsById(
  id: string | number
): Promise<FarmerDetails> {
  const response = await fetch(
    buildApiUrl(`/api/aquaculture/farmer-details/${id}`),
    {
      method: "GET",
      headers: await getAuthHeaders(),
    }
  );

  const data = await parseResponse(response);
  return unwrapFarmerDetails(data);
}

export async function createFarmerDetails(
  userId: string | number,
  payload: FarmerProfilePayload
): Promise<FarmerDetails> {
  const bodyPayload = {
    user_id: Number(userId),
    ...cleanPayload(payload),
  };

  const response = await fetch(buildApiUrl("/api/aquaculture/farmer-details"), {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(bodyPayload),
  });

  const data = await parseResponse(response);
  return unwrapFarmerDetails(data);
}

export async function updateFarmerDetailsByUserId(
  userId: string | number,
  payload: FarmerProfilePayload
): Promise<FarmerDetails> {
  const response = await fetch(
    buildApiUrl(`/api/aquaculture/farmer-details/user/${userId}`),
    {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify(cleanPayload(payload)),
    }
  );

  const data = await parseResponse(response);
  return unwrapFarmerDetails(data);
}

export async function deleteFarmerDetailsByUserId(
  userId: string | number
): Promise<any> {
  const response = await fetch(
    buildApiUrl(`/api/aquaculture/farmer-details/user/${userId}`),
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    }
  );

  return parseResponse(response);
}

export async function deleteFarmerDetailsById(
  id: string | number
): Promise<any> {
  const response = await fetch(
    buildApiUrl(`/api/aquaculture/farmer-details/${id}`),
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    }
  );

  return parseResponse(response);
}

/**
 * Main function for Edit Profile screen.
 * If farmer_details exists -> PUT update.
 * If farmer_details missing -> POST create.
 */
export async function saveFarmerDetailsByUserId(
  userId: string | number,
  payload: FarmerProfilePayload
): Promise<FarmerDetails> {
  try {
    return await updateFarmerDetailsByUserId(userId, payload);
  } catch (error: any) {
    if (isNotFoundError(error)) {
      return await createFarmerDetails(userId, payload);
    }

    throw error;
  }
}