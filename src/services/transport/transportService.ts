import { http } from "../../services/http";

export type TransportCrate = {
  id: string;
  crateId?: string;
  crateQr?: string;
  code?: string;

  collectionCentre?: string;
  collectionCentreId?: string;

  destination?: string;
  destinationId?: string;

  scheduledTime?: string;
  pickupUtc?: string;
  gpsPickup?: string;

  assignedVehicleNo?: string;
  assignedToLabel?: string;
  transportOperatorId?: string;
  transportId?: string;
  driverName?: string;
  vehicleNo?: string;

  qualityGrade?: string;
  fishTags?: string[];
  notes?: string;
  status?: string;

  temperatureLogs?: any[];
  raw?: any;
  [key: string]: any;
};

export type TransportDashboardResponse = {
  success?: boolean;
  message?: string;
  data?: any;
  stats?: any;
  currentTransport?: any;
  assignedCrates?: any[];
  inTransitCrates?: any[];
  selectedDate?: string;
  [key: string]: any;
};

export type AssignedCratesResponse = {
  success?: boolean;
  message?: string;
  data?: any[] | { assignedCrates?: any[]; crates?: any[]; items?: any[] };
  [key: string]: any;
};

export type ScanPickupPayload = {
  crate_qr?: string;
  crateQr?: string;
  qr_code?: string;
  qrValue?: string;
  code?: string;
  crate_id?: string;
  crateId?: string;
  [key: string]: any;
};

export type ScanPickupResponse = {
  success?: boolean;
  message?: string;
  data?: any;
  [key: string]: any;
};

export type TemperaturePayload = {
  value?: string;
  temperature_value?: string;
};

export type TemperatureResponse = {
  success?: boolean;
  message?: string;
  data?: any;
  [key: string]: any;
};

export type TransportOperator = {
  user_id: string;
  full_name: string;
  email: string;
  mobile: string;
  role: "TRANSPORT_OPERATOR" | string;
  is_active: boolean;
  created_at: string;
  vehicle_no?: string;
  vehicleNo?: string;
  transport_id?: string;
  transportId?: string;
  route_name?: string;
  routeName?: string;
  driver_name?: string;
  driverName?: string;
  operator_name?: string;
  collection_centre_name?: string;
  collectionCentreName?: string;
  collection_centre_id?: string;
  collectionCentreId?: string;
  [key: string]: any;
};

const unwrap = <T = any>(res: any): T => res?.data ?? res;

function normalizePhone(value: any) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .trim();
}

function last10Digits(value: any) {
  const clean = normalizePhone(value);
  return clean.length > 10 ? clean.slice(-10) : clean;
}

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

function firstObject(...values: any[]) {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  }
  return {};
}

function normalizeTransportCrate(input: any): TransportCrate {
  const raw = input ?? {};

  const id = firstString(raw?.id, raw?.crate_id, raw?.crateId);
  const crateQr = firstString(
    raw?.crate_qr,
    raw?.crateQr,
    raw?.qr_code,
    raw?.qrValue,
    raw?.code
  );

  const collectionCentre = firstString(
    raw?.collectionCentre,
    raw?.collection_centre,
    raw?.collection_center,
    raw?.collectionCentreName,
    raw?.collection_centre_name,
    raw?.source_name,
    raw?.source_label,
    raw?.received_centre_name,
    raw?.origin_name,
    raw?.centre_name,
    raw?.center_name
  );

  const collectionCentreId = firstString(
    raw?.collectionCentreId,
    raw?.collection_centre_id,
    raw?.collection_center_id,
    raw?.received_centre_id,
    raw?.centre_id,
    raw?.center_id,
    raw?.source_id,
    raw?.origin_id
  );

  const destination = firstString(
    raw?.destination,
    raw?.destination_name,
    raw?.destination_label,
    raw?.to_name,
    raw?.destinationCentreName,
    raw?.destination_centre_name
  );

  const destinationId = firstString(
    raw?.destinationId,
    raw?.destination_id,
    raw?.destination_centre_id,
    raw?.to_id
  );

  const scheduledTime = firstString(
    raw?.scheduledTime,
    raw?.scheduled_time_utc,
    raw?.scheduled_time,
    raw?.pickup_time_utc,
    raw?.assigned_at,
    raw?.created_at
  );

  const pickupUtc = firstString(
    raw?.pickupUtc,
    raw?.pickedUpAtUtc,
    raw?.picked_up_at_utc,
    raw?.picked_up_at,
    raw?.pickup_utc,
    raw?.updated_at,
    raw?.created_at
  );

  const gpsPickup = firstString(
    raw?.gpsPickup,
    raw?.gps_pickup,
    raw?.pickup_gps,
    raw?.gps
  );

  const assignedVehicleNo = firstString(
    raw?.assignedVehicleNo,
    raw?.assigned_vehicle_no,
    raw?.vehicleNo,
    raw?.vehicle_no
  );

  const driverName = firstString(
    raw?.driverName,
    raw?.driver_name,
    raw?.driver,
    raw?.operator_name,
    raw?.full_name,
    raw?.name
  );

  const vehicleNo = firstString(
    raw?.vehicleNo,
    raw?.vehicle_no,
    raw?.assignedVehicleNo,
    raw?.assigned_vehicle_no
  );

  const transportOperatorId = firstString(
    raw?.transportOperatorId,
    raw?.transport_operator_id,
    raw?.operator_id,
    raw?.user_id
  );

  const transportId = firstString(
    raw?.transportId,
    raw?.transport_id
  );

  const assignedToLabel = firstString(
    raw?.assignedToLabel,
    raw?.assigned_to_label
  );

  const qualityGrade = firstString(
    raw?.qualityGrade,
    raw?.quality_grade,
    raw?.grade
  );

  const fishTags = firstArray(raw?.fishTags, raw?.fish_tags, raw?.tags).map(
    (item: any) => String(item)
  );

  const temperatureLogs = firstArray(
    raw?.temperatureLogs,
    raw?.temperature_logs
  );

  const notes = firstString(raw?.notes);
  const status = firstString(raw?.status);

  return {
    id: id || crateQr,
    crateId: id,
    crateQr,
    code: crateQr,
    collectionCentre,
    collectionCentreId,
    destination,
    destinationId,
    scheduledTime,
    pickupUtc,
    gpsPickup,
    assignedVehicleNo,
    assignedToLabel,
    transportOperatorId,
    transportId,
    driverName,
    vehicleNo,
    qualityGrade,
    fishTags,
    notes,
    status,
    temperatureLogs,
    raw,
  };
}

function normalizeCrateList(input: any): TransportCrate[] {
  if (Array.isArray(input)) {
    return input.map(normalizeTransportCrate);
  }

  const raw = unwrap<any>(input);

  const list =
    raw?.assignedCrates ??
    raw?.inTransitCrates ??
    raw?.crates ??
    raw?.items ??
    raw?.results ??
    raw?.rows ??
    raw?.data ??
    raw;

  if (!Array.isArray(list)) return [];

  return list.map(normalizeTransportCrate);
}

function normalizeTransportOperator(input: any): TransportOperator {
  const raw = input ?? {};

  return {
    ...raw,
    user_id: String(
      raw?.user_id ?? raw?.userId ?? raw?.transport_operator_id ?? raw?.id ?? ""
    ),
    full_name: String(
      raw?.full_name ?? raw?.fullName ?? raw?.name ?? raw?.operator_name ?? ""
    ),
    email: String(raw?.email ?? ""),
    mobile: String(raw?.mobile ?? raw?.phone ?? raw?.phone_no ?? ""),
    role: String(raw?.role ?? "TRANSPORT_OPERATOR"),
    is_active: Boolean(raw?.is_active ?? raw?.isActive ?? false),
    created_at: String(raw?.created_at ?? raw?.createdAt ?? ""),
    vehicle_no: String(raw?.vehicle_no ?? raw?.vehicleNo ?? ""),
    vehicleNo: String(raw?.vehicleNo ?? raw?.vehicle_no ?? ""),
    transport_id: String(raw?.transport_id ?? raw?.transportId ?? ""),
    transportId: String(raw?.transportId ?? raw?.transport_id ?? ""),
    route_name: String(raw?.route_name ?? raw?.routeName ?? raw?.route ?? ""),
    routeName: String(raw?.routeName ?? raw?.route_name ?? raw?.route ?? ""),
    driver_name: String(
      raw?.driver_name ??
        raw?.driverName ??
        raw?.full_name ??
        raw?.fullName ??
        raw?.name ??
        raw?.operator_name ??
        ""
    ),
    driverName: String(
      raw?.driverName ??
        raw?.driver_name ??
        raw?.full_name ??
        raw?.fullName ??
        raw?.name ??
        raw?.operator_name ??
        ""
    ),
    collection_centre_name: String(
      raw?.collection_centre_name ??
        raw?.collectionCentreName ??
        raw?.centre_name ??
        raw?.center_name ??
        ""
    ),
    collectionCentreName: String(
      raw?.collectionCentreName ??
        raw?.collection_centre_name ??
        raw?.centre_name ??
        raw?.center_name ??
        ""
    ),
    collection_centre_id: String(
      raw?.collection_centre_id ??
        raw?.collectionCentreId ??
        raw?.centre_id ??
        raw?.center_id ??
        ""
    ),
    collectionCentreId: String(
      raw?.collectionCentreId ??
        raw?.collection_centre_id ??
        raw?.centre_id ??
        raw?.center_id ??
        ""
    ),
  };
}

function normalizeTransportOperatorList(input: any): TransportOperator[] {
  const raw = unwrap<any>(input);
  const list = raw?.data ?? raw?.items ?? raw?.rows ?? raw?.results ?? raw;

  if (!Array.isArray(list)) return [];
  return list.map(normalizeTransportOperator);
}

export const transportService = {
  async getDashboard(params?: { date?: string }) {
    const url = new URL("/api/transport/dashboard", "http://localhost");
    if (params?.date) {
      url.searchParams.append("date", params.date);
    }

    const res = await http.getJson(url.pathname + url.search);
    const payload = unwrap<TransportDashboardResponse>(res);

    const root = firstObject(payload?.data, payload);

    const currentTransport = firstObject(
      root?.currentTransport,
      root?.transport,
      root?.operator,
      root?.profile,
      root?.transport_operator
    );

    const statsRaw = firstObject(root?.stats, payload?.stats);

    let assignedCrates = normalizeCrateList(
      root?.assignedCrates ??
        root?.assigned_crates ??
        root?.assigned ??
        payload?.assignedCrates ??
        []
    );

    let inTransitCrates = normalizeCrateList(
      root?.inTransitCrates ??
        root?.in_transit_crates ??
        root?.inTransit ??
        payload?.inTransitCrates ??
        []
    );

    if (assignedCrates.length === 0) {
      try {
        assignedCrates = await this.getAssignedCrates(params);
      } catch {
        assignedCrates = [];
      }
    }

    if (inTransitCrates.length === 0) {
      try {
        inTransitCrates = await this.getInTransitCrates(params);
      } catch {
        inTransitCrates = [];
      }
    }

    return {
      currentTransport,
      stats: {
        totalMyCrates: Number(
          statsRaw?.totalMyCrates ??
            statsRaw?.total_my_crates ??
            statsRaw?.total ??
            assignedCrates.length + inTransitCrates.length
        ),
        assigned: Number(
          statsRaw?.assigned ??
            statsRaw?.assigned_count ??
            assignedCrates.length
        ),
        inTransit: Number(
          statsRaw?.inTransit ??
            statsRaw?.in_transit ??
            statsRaw?.in_transit_count ??
            inTransitCrates.length
        ),
      },
      assignedCrates,
      inTransitCrates,
      selectedDate:
        root?.selectedDate ??
        root?.selected_date ??
        payload?.selectedDate ??
        params?.date ??
        "",
      raw: payload,
    };
  },

  async getAssignedCrates(params?: { date?: string }) {
    const url = new URL("/api/transport/assigned-crates", "http://localhost");
    if (params?.date) {
      url.searchParams.append("date", params.date);
    }

    const res = await http.getJson(url.pathname + url.search);
    const payload = unwrap<AssignedCratesResponse>(res);

    return normalizeCrateList(payload);
  },

  async getInTransitCrates(params?: { date?: string }) {
    const url = new URL("/api/transport/in-transit", "http://localhost");
    if (params?.date) {
      url.searchParams.append("date", params.date);
    }

    const res = await http.getJson(url.pathname + url.search);
    const payload = unwrap<any>(res);

    return normalizeCrateList(payload);
  },

  async scanPickup(payload: ScanPickupPayload) {
    const crateQr = firstString(
      payload?.crate_qr,
      payload?.crateQr,
      payload?.qr_code,
      payload?.qrValue,
      payload?.code,
      payload?.crate_id,
      payload?.crateId
    );

    const body = {
      crate_qr: crateQr,
    };

    const res = await http.postJson("/api/transport/crates/scan-pickup", body);
    return unwrap<ScanPickupResponse>(res);
  },

  async logTemperature(crateId: string, payload: TemperaturePayload) {
    const temperatureValue = firstString(
      payload?.temperature_value,
      payload?.value
    );

    const body = {
      temperature_value: temperatureValue,
    };

    const res = await http.postJson(
      `/api/transport/crates/${crateId}/temperature`,
      body
    );
    return unwrap<TemperatureResponse>(res);
  },

  async getTransportOperators(
    page = 1,
    pageSize = 20
  ): Promise<TransportOperator[]> {
    const res = await http.getJson(
      `/api/admin/users?role=TRANSPORT_OPERATOR&page=${page}&page_size=${pageSize}`
    );

    return normalizeTransportOperatorList(res);
  },

  async getLoggedInTransportOperator(
    mobile: string,
    page = 1,
    pageSize = 20
  ): Promise<TransportOperator | null> {
    const cleanMobile = normalizePhone(mobile);
    const cleanMobileLast10 = last10Digits(mobile);

    if (!cleanMobile) return null;

    let currentPage = page;

    while (currentPage < page + 50) {
      const operators = await this.getTransportOperators(currentPage, pageSize);

      const found =
        operators.find((item) => {
          const itemPhone = normalizePhone(item.mobile);
          const itemLast10 = last10Digits(item.mobile);

          return (
            itemPhone === cleanMobile ||
            itemPhone.endsWith(cleanMobile) ||
            cleanMobile.endsWith(itemPhone) ||
            (itemLast10 && cleanMobileLast10 && itemLast10 === cleanMobileLast10)
          );
        }) || null;

      if (found) return found;
      if (operators.length < pageSize) break;

      currentPage += 1;
    }

    return null;
  },
};

export default transportService;