const rawBase =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://rootverse-backend.onrender.com";

const API_BASE = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

export type Trip = {
  id: number;
  trip_id: string;
  fishing_method: string;
  near_station: string;
  planned_at: string;
  arrival_at: string;
  diesel: string;
  ice: string;
  qr_count: number;
  total: string;
  approval_status: string;
  created_at: string;
  updated_at: string;
};

export type TripCreatePayload = {
  fishing_method: string; // "longline"
  near_station: string;   // "Chennai Fishing Harbor"
  planned_at: string;     // ISO
  arrival_at: string | null; // ISO or null
  diesel: string;         // "1200.50"
  ice: string;            // "300.00"
  qr_count: number;
  total: string;          // "1500.50"
};

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export async function createTripApi(payload: TripCreatePayload): Promise<Trip> {
  const res = await fetch(`${API_BASE}/api/trip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseJson(res);

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as Trip;
}

export async function fetchTripsApi(): Promise<Trip[]> {
  const res = await fetch(`${API_BASE}/api/trip`, { method: "GET" });
  const data = await parseJson(res);

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return Array.isArray(data) ? (data as Trip[]) : [];
}
