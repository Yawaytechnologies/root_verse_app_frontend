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

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.detail ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

function unwrapFarmerDetails(data: any): FarmerDetails {
  if (data?.data) return data.data;
  return data;
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

export async function updateFarmerDetailsByUserId(
  userId: string | number,
  payload: FarmerProfilePayload
): Promise<FarmerDetails> {
  const response = await fetch(
    buildApiUrl(`/api/aquaculture/farmer-details/user/${userId}`),
    {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  const data = await parseResponse(response);
  return unwrapFarmerDetails(data);
}