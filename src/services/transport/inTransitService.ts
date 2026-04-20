import { http } from "../../services/http";

export type TemperatureLog = {
  value: string;
  recordedAtUtc: string;
  operatorId: string;
};

export type InTransitCrate = {
  id: string;
  crateId?: string;
  crateQr?: string;
  code?: string;

  collectionCentre: string;
  collectionCentreId?: string;

  destination: string;
  destinationId?: string;

  pickedUpAtUtc: string;
  gpsPickup?: string;

  assignedVehicleNo?: string;
  vehicleNo?: string;
  driverName?: string;
  transportId?: string;
  transportOperatorId?: string;

  notes?: string;
  status: string;
  temperatureLogs?: TemperatureLog[];
  raw?: any;
};

type InTransitApiResponse =
  | InTransitCrate[]
  | {
      data?: any[];
      items?: any[];
      results?: any[];
      crates?: any[];
      inTransitCrates?: any[];
      message?: string;
      [key: string]: any;
    };

type LogTemperatureResponse = {
  success: boolean;
  message?: string;
  log: TemperatureLog;
  crate?: InTransitCrate;
  raw?: any;
};

function firstString(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
}

function firstArray(...values: any[]) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeTemperatureLog(input: any): TemperatureLog {
  const raw = input ?? {};

  return {
    value: firstString(
      raw?.value,
      raw?.temperature,
      raw?.temperature_value,
      raw?.temp_value
    ),
    recordedAtUtc: firstString(
      raw?.recordedAtUtc,
      raw?.recorded_at_utc,
      raw?.created_at,
      raw?.timestamp,
      raw?.logged_at
    ),
    operatorId: firstString(
      raw?.operatorId,
      raw?.operator_id,
      raw?.transport_operator_id,
      raw?.logged_by,
      raw?.user_id
    ),
  };
}

function normalizeInTransitCrate(input: any): InTransitCrate {
  const raw = input ?? {};

  const rawLogs = firstArray(
    raw?.temperatureLogs,
    raw?.temperature_logs,
    raw?.temperature_log,
    raw?.temp_logs,
    raw?.logs,
    raw?.data?.temperatureLogs,
    raw?.data?.temperature_logs
  );

  return {
    id: firstString(raw?.id, raw?.crate_id, raw?.crateId, raw?.code),
    crateId: firstString(raw?.crate_id, raw?.crateId, raw?.id),
    crateQr: firstString(
      raw?.crate_qr,
      raw?.crateQr,
      raw?.qr_code,
      raw?.qrValue,
      raw?.code
    ),
    code: firstString(
      raw?.code,
      raw?.crate_qr,
      raw?.crateQr,
      raw?.qr_code,
      raw?.qrValue
    ),
    collectionCentre: firstString(
      raw?.collectionCentre,
      raw?.collection_centre,
      raw?.collection_center,
      raw?.source_name,
      raw?.origin_name,
      raw?.received_centre_name,
      raw?.collection_centre_name
    ),
    collectionCentreId: firstString(
      raw?.collectionCentreId,
      raw?.collection_centre_id,
      raw?.collection_center_id,
      raw?.received_centre_id,
      raw?.source_id,
      raw?.origin_id
    ),
    destination: firstString(
      raw?.destination,
      raw?.destination_name,
      raw?.destination_label,
      raw?.to_name
    ),
    destinationId: firstString(
      raw?.destinationId,
      raw?.destination_id,
      raw?.destination_centre_id,
      raw?.to_id
    ),
    pickedUpAtUtc: firstString(
      raw?.pickedUpAtUtc,
      raw?.picked_up_at_utc,
      raw?.picked_up_at,
      raw?.pickup_utc,
      raw?.updated_at,
      raw?.created_at
    ),
    gpsPickup: firstString(
      raw?.gpsPickup,
      raw?.gps_pickup,
      raw?.pickup_gps,
      raw?.gps
    ),
    assignedVehicleNo: firstString(
      raw?.assignedVehicleNo,
      raw?.assigned_vehicle_no,
      raw?.vehicleNo,
      raw?.vehicle_no
    ),
    vehicleNo: firstString(
      raw?.vehicleNo,
      raw?.vehicle_no,
      raw?.assignedVehicleNo,
      raw?.assigned_vehicle_no
    ),
    driverName: firstString(raw?.driverName, raw?.driver_name),
    transportId: firstString(raw?.transportId, raw?.transport_id),
    transportOperatorId: firstString(
      raw?.transportOperatorId,
      raw?.transport_operator_id,
      raw?.operator_id
    ),
    notes: firstString(raw?.notes),
    status: firstString(raw?.status),
    temperatureLogs: rawLogs.map(normalizeTemperatureLog),
    raw,
  };
}

function normalizeInTransitResponse(
  res: InTransitApiResponse
): InTransitCrate[] {
  if (Array.isArray(res)) return res.map(normalizeInTransitCrate);

  const list =
    res?.data ??
    res?.items ??
    res?.results ??
    res?.crates ??
    res?.inTransitCrates ??
    [];

  if (!Array.isArray(list)) return [];

  return list.map(normalizeInTransitCrate);
}

export const inTransitService = {
  async getInTransit(params?: { date?: string }): Promise<InTransitCrate[]> {
    const url = new URL("/api/transport/in-transit", "http://localhost");

    if (params?.date) {
      url.searchParams.append("date", params.date);
    }

    const response = await http.getJson<InTransitApiResponse>(
      url.pathname + url.search
    );

    return normalizeInTransitResponse(response);
  },

  async getCrateById(crateId: string): Promise<InTransitCrate> {
    const response = await http.getJson<any>(
      `/api/transport/crates/${encodeURIComponent(crateId)}`
    );

    const crate = response?.crate ?? response?.data ?? response;

    return normalizeInTransitCrate(crate);
  },

  async logTemperature(
    crateId: string,
    value: string
  ): Promise<LogTemperatureResponse> {
    const response = await http.postJson<any>(
      `/api/transport/crates/${encodeURIComponent(crateId)}/temperature`,
      {
        temperature_value: value,
      }
    );

    const rawLog =
      response?.temperatureLog ??
      response?.temperature_log ??
      response?.log ??
      response?.entry ??
      response?.data ??
      response;

    const rawCrate =
      response?.crate ??
      response?.updatedCrate ??
      response?.updated_crate ??
      response?.item;

    return {
      success: true,
      message: firstString(response?.message),
      log: normalizeTemperatureLog({
        ...rawLog,
        value: firstString(
          rawLog?.value,
          rawLog?.temperature,
          rawLog?.temperature_value,
          value
        ),
      }),
      crate: rawCrate ? normalizeInTransitCrate(rawCrate) : undefined,
      raw: response,
    };
  },
};

export default inTransitService;