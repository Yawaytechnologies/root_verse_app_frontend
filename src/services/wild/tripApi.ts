// src/services/wild/tripApi.ts

export type Trip = {
  id: number;
  trip_id: string;
  fishing_method: string;
  near_station: string;
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
};

export type TripCreatePayload = {
  fishing_method: string;
  near_station: string;
  planned_at: string;
  arrival_at: string | null;

  diesel: number;
  ice: number;
  total: number;

  qr_count: number;

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

function normalizeBaseUrl(raw?: string) {
  if (!raw) throw new Error("Missing EXPO_PUBLIC_API_BASE_URL in .env");

  let u = raw.replace(/\/+$/, ""); // remove trailing slashes

  // If user mistakenly sets BASE_URL = ".../api" or ".../api/"
  // normalize back to domain root because our paths include "/api/..."
  u = u.replace(/\/api$/i, "");

  return u;
}

function baseUrl() {
  return normalizeBaseUrl(BASE_URL);
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

function qs(params: Record<string, any>) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

function extractHtmlPre(text: string) {
  const m = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, "").trim();
}

function stripHtml(text: string) {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${baseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;

  console.log("[tripApi] Request:", init.method || "GET", url);

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
    // non-json (html/text)
  }

  if (!res.ok) {
    const fromJson = json?.message || json?.error;
    if (fromJson) throw new Error(fromJson);

    const pre = text ? extractHtmlPre(text) : null;
    if (pre) throw new Error(pre);

    if (text && text.trim().startsWith("<")) throw new Error(stripHtml(text));

    throw new Error(text?.trim() ? text.trim() : `Request failed (${res.status})`);
  }

  return unwrapOrThrow<T>(json);
}

export const tripApi = {
  // ✅ CREATE
  createTrip: (payload: TripCreatePayload, token?: string) =>
    request<Trip>("/api/trip", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),

  // ✅ LIST ALL (not owner filtered)
  fetchTrips: (token?: string) =>
    request<Trip[]>("/api/trip", {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),

  // ✅ LIST BY OWNER (THIS is what you need)
  // FULL URL => BASE + /api/trip/owner/:owner_code
  fetchTripsByOwnerCode: (owner_code: string, token?: string, approval_status?: string | "ALL") =>
    request<Trip[]>(
      `/api/trip/owner/${encodeURIComponent(owner_code)}${qs({
        approval_status: approval_status && approval_status !== "ALL" ? approval_status : undefined,
      })}`,
      {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    ),

  // ✅ GET ONE by numeric id
  getTripById: (id: number | string, token?: string) =>
    request<Trip>(`/api/trip/${encodeURIComponent(String(id))}`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
};
