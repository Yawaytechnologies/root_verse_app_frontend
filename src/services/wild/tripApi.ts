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

// ✅ HARDCODED BASE URL (no .env)
const BASE_URL = "https://rootverse-backend-5qoo.onrender.com";

function baseUrl() {
  return BASE_URL.replace(/\/+$/, "");
}

function apiUrl(path: string) {
  return `${baseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
}

function isWrapped<T>(x: any): x is ApiWrapped<T> {
  return (
    x &&
    typeof x === "object" &&
    ("success" in x || "data" in x || "message" in x)
  );
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
  const url = apiUrl(path);

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
      (typeof text === "string" && text.trim()
        ? text
        : `Request failed (${res.status})`);
    throw new Error(msg);
  }

  return unwrapOrThrow<T>(json);
}

function toStatusPath(status?: string | "ALL") {
  const s = String(status || "").trim();
  if (!s || s.toUpperCase() === "ALL") return null;
  return s.toLowerCase(); // pending/approved/rejected
}

export const tripApi = {
  // ✅ CREATE
  createTrip: (payload: TripCreatePayload, token?: string) =>
    request<Trip>("/api/trip", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),

  // ✅ LIST ALL
  fetchTrips: (token?: string) =>
    request<Trip[]>("/api/trip", {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),

  // ✅ LIST BY OWNER + OPTIONAL STATUS (your tabs: ALL/PENDING/APPROVED/REJECTED)
  // Tries:
  //   ALL -> /api/trip/owner/:owner_code
  //   STATUS -> /api/trip/owner/:owner_code/status/:status
  // If ALL endpoint is missing in backend, it falls back to merging 3 status calls.
  fetchTripsByOwnerCode: async (
    owner_code: string,
    token?: string,
    approval_status?: string | "ALL"
  ) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const oc = encodeURIComponent(owner_code);

    const st = toStatusPath(approval_status);
    if (st) {
      return request<Trip[]>(`/api/trip/owner/${oc}/status/${encodeURIComponent(st)}`, {
        method: "GET",
        headers,
      });
    }

    // ALL
    try {
      return await request<Trip[]>(`/api/trip/owner/${oc}`, {
        method: "GET",
        headers,
      });
    } catch (e) {
      // fallback: merge 3 status endpoints
      const statuses = ["pending", "approved", "rejected"];
      const all: Trip[] = [];
      for (const s of statuses) {
        try {
          const part = await request<Trip[]>(
            `/api/trip/owner/${oc}/status/${encodeURIComponent(s)}`,
            { method: "GET", headers }
          );
          all.push(...(part || []));
        } catch {}
      }

      // de-dupe by trip_id (or id)
      const map = new Map<string, Trip>();
      for (const tr of all) {
        const k = String(tr?.trip_id || tr?.id || "");
        if (!k) continue;
        if (!map.has(k)) map.set(k, tr);
      }

      return Array.from(map.values());
    }
  },

  // ✅ GET ONE by numeric id
  getTripById: (id: number | string, token?: string) =>
    request<Trip>(`/api/trip/${encodeURIComponent(String(id))}`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
};
