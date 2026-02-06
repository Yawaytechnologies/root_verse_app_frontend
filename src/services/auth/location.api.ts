// src/services/auth/location.api.ts
import { getJson } from "./api";

export type StateItem = { id: number; name: string };
export type DistrictItem = { id: number; name: string };
export type LocationItem = { id: number; name: string };

function pickArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;

  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result)) return raw.result;
  if (Array.isArray(raw?.rows)) return raw.rows;

  if (Array.isArray(raw?.states)) return raw.states;
  if (Array.isArray(raw?.districts)) return raw.districts;

  if (Array.isArray(raw?.data?.states)) return raw.data.states;
  if (Array.isArray(raw?.data?.districts)) return raw.data.districts;
  if (Array.isArray(raw?.data?.data)) return raw.data.data;

  return [];
}

function mapState(s: any): StateItem {
  return {
    id: Number(s.id ?? s.state_id ?? s.stateId),
    name: String(s.name ?? s.state_name ?? s.stateName ?? s.state ?? ""),
  };
}

function mapDistrict(d: any): DistrictItem {
  return {
    id: Number(d.id ?? d.district_id ?? d.districtId),
    name: String(d.name ?? d.district_name ?? d.districtName ?? d.district ?? ""),
  };
}

export async function fetchStatesApi(): Promise<StateItem[]> {
  const raw = await getJson<any>("/api/states");
  const list = pickArray(raw);

  return list
    .map(mapState)
    .filter((x) => Number.isFinite(x.id) && x.id > 0 && !!x.name);
}

export async function fetchDistrictsByStateApi(stateId: number): Promise<DistrictItem[]> {
  const paths = [`/api/states/${stateId}/districts`, `/api/states/${stateId}/district`];

  let lastErr: any = null;

  for (const p of paths) {
    try {
      const raw = await getJson<any>(p);
      const list = pickArray(raw);

      return list
        .map(mapDistrict)
        .filter((x) => Number.isFinite(x.id) && x.id > 0 && !!x.name);
    } catch (e: any) {
      lastErr = e;
    }
  }

  throw new Error(lastErr?.message ?? "Failed to load districts");
}
export async function fetchLocationsByDistrictApi(districtId: number): Promise<LocationItem[]> {
  const res: any = await getJson<any>(`/api/locations/district/${districtId}`);

  // backend: { success, message, data: [...] }
  const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  return arr.map((x: any) => ({
    id: Number(x.id),
    name: String(x.name ?? ""),
  }));
}