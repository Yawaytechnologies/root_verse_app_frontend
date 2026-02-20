// src/services/wild/tripApi.ts

export type Trip = {
  id: number;
  trip_id: string;

  // backend may return code/name, keep string
  fishing_method?: string;

  // ✅ id-based
  fishing_method_id?: number | null;

  // ✅ fish species id (based on your backend insert)
  fish_species?: number | null;

  near_station: string | number | null;
  location_id?: number | null;
  vessel_id?: number | null;

  planned_at: string;
  arrival_at: string | null;

  diesel: string;
  ice: string;
  qr_count: number;
  total: string;

  created_at: string;
  updated_at: string;
  approval_status: string;

  count?: number;
  owner_code?: string;

  // joins (if backend returns)
  location_name?: string;
  method_name?: string;
  fish_name?: string;
  image_url?: string;
  fish_type_url?: string;
};

export type TripCreatePayload = {
  // ✅ IMPORTANT: do NOT send fishing_method string to backend
  fishing_method_id: number;

  // based on your backend insert
  fish_species: number;

  near_station: string;
  location_id: number;
  vessel_id: number;

  planned_at: string;
  arrival_at: string | null;

  diesel: number;
  ice: number;
  total: number;

  qr_count: number;
  owner_code: string;
  count: number;

  approval_status?: string;

  state_id?: number;
  district_id?: number;
};

type ApiWrapped<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

const BASE_URL = "https://rootverse-backend-5qoo.onrender.com";

function baseUrl() {
  return BASE_URL.replace(/\/+$/, "");
}
function apiUrl(path: string) {
  return `${baseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
}

function isWrapped<T>(x: any): x is ApiWrapped<T> {
  return x && typeof x === "object" && ("success" in x || "data" in x || "message" in x);
}

function unwrapOrThrow<T>(payload: any): T {
  if (payload == null) return payload as T;
  if (!isWrapped<T>(payload)) return payload as T;

  if (payload.success === false) {
    throw new Error(payload.message || payload.error || "Request failed");
  }

  if (payload.data != null) return payload.data as T;
  return payload as T;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = apiUrl(path);

  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await res.text().catch(() => "");
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const msg =
      json?.message ||
      json?.error ||
      (text?.trim() ? text : `Request failed (${res.status})`);
    throw new Error(msg);
  }

  return unwrapOrThrow<T>(json);
}

function toStatusPath(status?: string | "ALL") {
  const s = String(status || "").trim();
  if (!s || s.toUpperCase() === "ALL") return null;
  return s.toLowerCase();
}

export const tripApi = {
  createTrip: (payload: TripCreatePayload, token?: string) =>
    request<Trip>("/api/trip", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),

  fetchTrips: (token?: string) =>
    request<Trip[]>("/api/trip", {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),

  fetchTripsByOwnerCode: async (
    owner_code: string,
    token?: string,
    approval_status?: string | "ALL",
  ) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const oc = encodeURIComponent(owner_code);

    const st = toStatusPath(approval_status);
    if (st) {
      return request<Trip[]>(
        `/api/trip/owner/${oc}/status/${encodeURIComponent(st)}`,
        { method: "GET", headers },
      );
    }

    try {
      return await request<Trip[]>(`/api/trip/owner/${oc}`, { method: "GET", headers });
    } catch {
      const statuses = ["pending", "approved", "rejected"];
      const all: Trip[] = [];

      for (const s of statuses) {
        try {
          const part = await request<Trip[]>(
            `/api/trip/owner/${oc}/status/${encodeURIComponent(s)}`,
            { method: "GET", headers },
          );
          all.push(...(part || []));
        } catch {}
      }

      const map = new Map<string, Trip>();
      for (const tr of all) {
        const k = String(tr?.trip_id || tr?.id || "");
        if (k && !map.has(k)) map.set(k, tr);
      }
      return Array.from(map.values());
    }
  },

  getTripById: (id: number | string, token?: string) =>
    request<Trip>(`/api/trip/${encodeURIComponent(String(id))}`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
};
