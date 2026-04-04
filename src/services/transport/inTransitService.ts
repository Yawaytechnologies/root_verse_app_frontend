import { http } from "../../services/http";

export type TemperatureLog = {
  value: string;
  recordedAtUtc: string;
  operatorId: string;
};

export type InTransitCrate = {
  id: string;
  collectionCentre: string;
  destination: string;
  pickedUpAtUtc: string;
  gpsPickup?: string;
  assignedVehicleNo?: string;
  notes?: string;
  status: string;
  temperatureLogs?: TemperatureLog[];
};

type InTransitApiResponse =
  | InTransitCrate[]
  | {
      data?: InTransitCrate[];
      items?: InTransitCrate[];
      results?: InTransitCrate[];
      crates?: InTransitCrate[];
      message?: string;
      [key: string]: any;
    };

function normalizeInTransitResponse(res: InTransitApiResponse): InTransitCrate[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.crates)) return res.crates;
  return [];
}

export const inTransitService = {
  async getInTransit(): Promise<InTransitCrate[]> {
    const response = await http.getJson<InTransitApiResponse>("/api/transport/in-transit");
    return normalizeInTransitResponse(response);
  },
};