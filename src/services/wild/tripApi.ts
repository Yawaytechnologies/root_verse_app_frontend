// src/services/wild/tripApi.ts

export type Trip = {
  id: number;
  trip_id: string;
  fishing_method: string;
  near_station: string;
  planned_at: string;
  arrival_at: string | null;

  // backend returns strings in response sometimes; keep as string here to be safe
  diesel: string;
  ice: string;
  qr_count: number;
  total: string;

  created_at: string;
  updated_at: string;
  approval_status: string;

  count?: number;
  owner_code?: string;
};

export type TripCreatePayload = {
  fishing_method: string;
  near_station: string;
  planned_at: string;
  arrival_at: string | null;

  // ✅ BACKEND EXPECTS NUMBER
  diesel: number;
  ice: number;
  total: number;

  qr_count: number;

  // ✅ REQUIRED
  owner_code: string;
  count: number;
};

type ApiWrapped<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

function baseUrl() {
  if (!BASE_URL) throw new Error("Missing EXPO_PUBLIC_API_BASE_URL in .env");
  return BASE_URL.replace(/\/+$/, "");
}

function isWrapped<T>(x: any): x is ApiWrapped<T> {
  return x && typeof x === "object" && ("success" in x || "data" in x || "message" in x);
}

function unwrapOrThrow<T>(payload: any): T {
  if (!isWrapped<T>(payload)) return payload as T;

  if (payload.success === false) {
    throw new Error(payload.message || payload.error || "Request failed");
  }

  if (payload.data != null) return payload.data as T;

  return payload as T;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${baseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;

  console.log("[tripApi] Request:", init.method || "GET", url);
  if (init.body) console.log("[tripApi] Body:", init.body);

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await res.text();

  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // non-json
  }

  if (!res.ok) {
    const msg =
      json?.message ||
      json?.error ||
      (typeof text === "string" && text.trim() ? text : `Request failed (${res.status})`);
    throw new Error(msg);
  }

  return unwrapOrThrow<T>(json);
}

export const tripApi = {
  // ✅ CREATE (singular)
  createTrip: (payload: TripCreatePayload, token?: string) =>
    request<Trip>("/api/trip", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),

  // ✅ LIST (plural) - if your backend list is also singular, change to "/api/trip"
  fetchTrips: (token?: string) =>
    request<Trip[]>("/api/trips", {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
};
