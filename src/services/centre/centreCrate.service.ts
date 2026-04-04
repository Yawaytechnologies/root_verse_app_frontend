import { http } from "../http";

export type CrateStage = "assigned" | "received" | "pending";

export type ApiCrate = {
  id?: number | string;
  crateId?: number | string;
  crate_id?: number | string;

  code?: string;
  crateCode?: string;
  crate_code?: string;

  qrValue?: string;
  qr_value?: string;
  qrCode?: string;
  qr_code?: string;

  districtCode?: string;
  district_code?: string;
  districtId?: number | string;
  district_id?: number | string;

  type?: string;
  status?: string;
  crate_status?: string;
  dispatch_status?: string;
  grade?: string;

  weight?: number | string;
  total_weight?: number | string;

  custody?: string | null;
  custody_status?: string | null;

  fishType?: string | null;
  fish_type?: string | null;
  source?: string | null;
  source_name?: string | null;
  origin?: string | null;

  centreId?: number | string | null;
  centre_id?: number | string | null;
  received_centre_id?: number | string | null;

  operatorId?: number | string | null;
  operator_id?: number | string | null;

  assignedTransportOperatorId?: number | string | null;
  assigned_transport_operator_id?: number | string | null;
  transport_operator_id?: number | string | null;

  transportId?: number | string | null;
  transport_id?: number | string | null;

  destinationId?: number | string | null;
  destination_id?: number | string | null;
  destinationName?: string | null;
  destination_name?: string | null;

  assignedTo?: string | null;
  assigned_to?: string | null;

  assignedToLabel?: string | null;
  assigned_to_label?: string | null;

  packer_id?: number | string | null;
  production_category?: string | null;
  current_custodian_role?: string | null;
  current_custodian_id?: number | string | null;

  driverName?: string | null;
  driver_name?: string | null;
  vehicleNo?: string | null;
  vehicle_no?: string | null;
  notes?: string | null;
  remark?: string | null;
  remarks?: string | null;

  temperature?: number | string | null;
  temperature_c?: number | string | null;
  temperature_value?: number | string | null;
  latestTemperature?: number | string | null;

  temperature_logs?: any[];
  temperatureLogs?: any[];

  loggedAt?: string;
  logged_at?: string;
  receivedAt?: string;
  received_at?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  assignedAt?: string;
  assigned_at?: string;
  dispatchScheduledAt?: string;
  dispatch_scheduled_at?: string;
  scheduled_time_utc?: string;

  dispatch?: any;
  assignment?: any;
  assign_dispatch?: any;
  dispatch_info?: any;

  stage?: CrateStage;
  isReceived?: boolean;
  isAssigned?: boolean;
  hasTemperature?: boolean;

  [key: string]: any;
};

export type CentreDashboardRes = {
  [key: string]: any;
};

export type ReceiveCratePayload = {
  qrValue: string;
};

export type AssignDispatchPayload = {
  crateId: number | string;
  destinationName: string;
  transportOperatorId: string;
  transportId?: string;
  scheduledTimeUtc: string;
  assignedToLabel?: string;
  assignedTo?: string;
  driverName?: string;
  vehicleNo?: string;
  operatorId?: string;
  notes?: string;
};

export type TempLogPayload = {
  crateId: number | string;
  tempC: number;
};

export type CollectionCentreOperator = {
  user_id: string;
  full_name: string;
  email: string;
  mobile: string;
  role: "COLLECTION_CENTRE_OPERATOR" | string;
  is_active: boolean;
  created_at: string;
  [key: string]: any;
};

function unwrap<T = any>(res: any): T {
  return res?.data?.data ?? res?.data ?? res;
}

function hasValue(value: any) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function firstObject(...values: any[]) {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }
  return {};
}

function mergeSources(raw: any) {
  const root = raw?.data ?? raw ?? {};

  const crateLike = firstObject(
    root?.qr,
    root?.crate,
    root?.data?.qr,
    root?.data?.crate,
    root?.crate_details,
    root?.crateDetails
  );

  const dispatchLike = firstObject(
    root?.dispatch,
    root?.assignment,
    root?.assign_dispatch,
    root?.dispatch_info,
    root?.dispatchDetails,
    root?.dispatch_details,
    root?.data?.dispatch,
    root?.data?.assignment,
    root?.data?.assign_dispatch,
    root?.data?.dispatch_info
  );

  return {
    ...(root || {}),
    ...(crateLike || {}),
    ...(dispatchLike || {}),
    dispatch: dispatchLike || root?.dispatch || null,
    assignment: dispatchLike || root?.assignment || null,
    assign_dispatch: dispatchLike || root?.assign_dispatch || null,
    dispatch_info: dispatchLike || root?.dispatch_info || null,
  };
}

function pickLatestTemperature(raw: any): number | string | null {
  const direct =
    raw?.temperature_value ??
    raw?.temperature ??
    raw?.temperature_c ??
    raw?.latestTemperature ??
    null;

  if (direct !== null && direct !== undefined && String(direct) !== "") {
    return direct;
  }

  const logs = raw?.temperature_logs ?? raw?.temperatureLogs;
  if (!Array.isArray(logs) || logs.length === 0) return null;

  const last = logs[logs.length - 1];
  return (
    last?.temperature_value ??
    last?.temperature ??
    last?.temperature_c ??
    last?.value ??
    null
  );
}

export function deriveCrateStage(crate: any): CrateStage {
  if (!crate) return "pending";

  const status = String(
    crate?.status || crate?.crate_status || crate?.dispatch_status || ""
  ).toUpperCase();

  const custody = String(
    crate?.custody ||
      crate?.custody_status ||
      crate?.current_custodian_role ||
      ""
  ).toUpperCase();

  const hasDispatch =
    custody.includes("SCHEDULED_FOR_DISPATCH") ||
    custody.includes("DISPATCH") ||
    status.includes("ASSIGN") ||
    status.includes("DISPATCH") ||
    status.includes("SCHEDULED") ||
    hasValue(crate?.destination_name) ||
    hasValue(crate?.destinationName) ||
    hasValue(crate?.assigned_to) ||
    hasValue(crate?.assignedTo) ||
    hasValue(crate?.assigned_to_label) ||
    hasValue(crate?.assignedToLabel) ||
    hasValue(crate?.transport_operator_id) ||
    hasValue(crate?.assigned_transport_operator_id) ||
    hasValue(crate?.assignedTransportOperatorId) ||
    hasValue(crate?.transport_id) ||
    hasValue(crate?.transportId) ||
    hasValue(crate?.driver_name) ||
    hasValue(crate?.driverName) ||
    hasValue(crate?.vehicle_no) ||
    hasValue(crate?.vehicleNo) ||
    hasValue(crate?.scheduled_time_utc) ||
    hasValue(crate?.dispatchScheduledAt) ||
    hasValue(crate?.dispatch_scheduled_at);

  if (hasDispatch) return "assigned";

  const hasReceive =
    custody.includes("RECEIVED_AT_COLLECTION_CENTRE") ||
    custody.includes("COLLECTION_CENTRE") ||
    custody.includes("CENTRE") ||
    status.includes("RECEIVED") ||
    status.includes("COLLECTION") ||
    status.includes("RECEIVE") ||
    hasValue(crate?.received_centre_id) ||
    hasValue(crate?.centreId) ||
    hasValue(crate?.centre_id) ||
    hasValue(crate?.receivedAt) ||
    hasValue(crate?.received_at);

  if (hasReceive) return "received";

  return "pending";
}

function normalizeCrate(input: any): ApiCrate {
  const raw = mergeSources(input);
  const latestTemperature = pickLatestTemperature(raw);

  const normalized: ApiCrate = {
    ...raw,

    id: raw?.id ?? raw?.crateId ?? raw?.crate_id,
    crateId: raw?.crateId ?? raw?.crate_id ?? raw?.id,

    code: raw?.code ?? raw?.crateCode ?? raw?.crate_code,
    crateCode: raw?.crateCode ?? raw?.crate_code ?? raw?.code,
    crate_code: raw?.crate_code ?? raw?.crateCode ?? raw?.code,

    qrValue:
      raw?.qrValue ??
      raw?.qr_value ??
      raw?.qrCode ??
      raw?.qr_code ??
      raw?.code,
    qr_value: raw?.qr_value ?? raw?.qrValue ?? raw?.code,

    districtCode: raw?.districtCode ?? raw?.district_code,
    district_code: raw?.district_code ?? raw?.districtCode,

    districtId: raw?.districtId ?? raw?.district_id,
    district_id: raw?.district_id ?? raw?.districtId,

    weight: raw?.weight ?? raw?.total_weight,
    total_weight: raw?.total_weight ?? raw?.weight,

    custody: raw?.custody ?? raw?.custody_status ?? raw?.current_custodian_role,
    custody_status:
      raw?.custody_status ?? raw?.custody ?? raw?.current_custodian_role,

    centreId: raw?.centreId ?? raw?.centre_id ?? raw?.received_centre_id,
    centre_id: raw?.centre_id ?? raw?.centreId ?? raw?.received_centre_id,
    received_centre_id:
      raw?.received_centre_id ?? raw?.centreId ?? raw?.centre_id,

    operatorId: raw?.operatorId ?? raw?.operator_id,
    operator_id: raw?.operator_id ?? raw?.operatorId,

    assignedTransportOperatorId:
      raw?.assignedTransportOperatorId ??
      raw?.assigned_transport_operator_id ??
      raw?.transport_operator_id,
    assigned_transport_operator_id:
      raw?.assigned_transport_operator_id ??
      raw?.assignedTransportOperatorId ??
      raw?.transport_operator_id,
    transport_operator_id:
      raw?.transport_operator_id ??
      raw?.assigned_transport_operator_id ??
      raw?.assignedTransportOperatorId,

    transportId: raw?.transportId ?? raw?.transport_id,
    transport_id: raw?.transport_id ?? raw?.transportId,

    destinationId: raw?.destinationId ?? raw?.destination_id,
    destination_id: raw?.destination_id ?? raw?.destinationId,
    destinationName: raw?.destinationName ?? raw?.destination_name,
    destination_name: raw?.destination_name ?? raw?.destinationName,

    assignedTo: raw?.assignedTo ?? raw?.assigned_to,
    assigned_to: raw?.assigned_to ?? raw?.assignedTo,

    assignedToLabel: raw?.assignedToLabel ?? raw?.assigned_to_label,
    assigned_to_label: raw?.assigned_to_label ?? raw?.assignedToLabel,

    fishType: raw?.fishType ?? raw?.fish_type,
    fish_type: raw?.fish_type ?? raw?.fishType,

    driverName: raw?.driverName ?? raw?.driver_name,
    driver_name: raw?.driver_name ?? raw?.driverName,

    vehicleNo: raw?.vehicleNo ?? raw?.vehicle_no,
    vehicle_no: raw?.vehicle_no ?? raw?.vehicleNo,

    notes: raw?.notes ?? raw?.remark ?? raw?.remarks,
    remark: raw?.remark ?? raw?.notes,
    remarks: raw?.remarks ?? raw?.notes,

    temperature:
      raw?.temperature ?? raw?.temperature_c ?? raw?.temperature_value,
    temperature_c: raw?.temperature_c ?? raw?.temperature,
    temperature_value: raw?.temperature_value ?? raw?.temperature,
    latestTemperature,

    temperature_logs: Array.isArray(raw?.temperature_logs)
      ? raw.temperature_logs
      : [],
    temperatureLogs: Array.isArray(raw?.temperatureLogs)
      ? raw.temperatureLogs
      : [],

    loggedAt: raw?.loggedAt ?? raw?.logged_at,
    logged_at: raw?.logged_at ?? raw?.loggedAt,

    receivedAt: raw?.receivedAt ?? raw?.received_at,
    received_at: raw?.received_at ?? raw?.receivedAt,

    createdAt: raw?.createdAt ?? raw?.created_at,
    created_at: raw?.created_at ?? raw?.createdAt,

    updatedAt: raw?.updatedAt ?? raw?.updated_at,
    updated_at: raw?.updated_at ?? raw?.updatedAt,

    assignedAt:
      raw?.assignedAt ??
      raw?.assigned_at ??
      raw?.scheduled_time_utc ??
      raw?.dispatchScheduledAt ??
      raw?.dispatch_scheduled_at,
    assigned_at:
      raw?.assigned_at ??
      raw?.assignedAt ??
      raw?.scheduled_time_utc ??
      raw?.dispatch_scheduled_at ??
      raw?.dispatchScheduledAt,

    dispatchScheduledAt:
      raw?.dispatchScheduledAt ??
      raw?.dispatch_scheduled_at ??
      raw?.scheduled_time_utc,
    dispatch_scheduled_at:
      raw?.dispatch_scheduled_at ??
      raw?.dispatchScheduledAt ??
      raw?.scheduled_time_utc,

    scheduled_time_utc:
      raw?.scheduled_time_utc ??
      raw?.dispatchScheduledAt ??
      raw?.dispatch_scheduled_at,
  };

  const stage = deriveCrateStage(normalized);

  if (stage === "assigned") {
    normalized.status =
      normalized.status && String(normalized.status).trim() !== ""
        ? normalized.status
        : "ASSIGNED";

    normalized.custody =
      normalized.custody && String(normalized.custody).trim() !== ""
        ? normalized.custody
        : "SCHEDULED_FOR_DISPATCH";

    normalized.custody_status =
      normalized.custody_status && String(normalized.custody_status).trim() !== ""
        ? normalized.custody_status
        : "SCHEDULED_FOR_DISPATCH";
  }

  normalized.stage = stage;
  normalized.isReceived = stage === "received";
  normalized.isAssigned = stage === "assigned";
  normalized.hasTemperature =
    latestTemperature !== null &&
    latestTemperature !== undefined &&
    String(latestTemperature) !== "";

  return normalized;
}

function normalizeCrateList(input: any): ApiCrate[] {
  const raw = unwrap<any>(input);

  const list =
    raw?.items ??
    raw?.rows ??
    raw?.results ??
    raw?.data ??
    (Array.isArray(raw) ? raw : []);

  if (!Array.isArray(list)) return [];
  return list.map(normalizeCrate);
}

function normalizePhone(value: any) {
  return String(value ?? "").replace(/\D/g, "").trim();
}

function normalizeCollectionOperator(input: any): CollectionCentreOperator {
  const raw = input ?? {};

  return {
    ...raw,
    user_id: String(raw?.user_id ?? raw?.userId ?? ""),
    full_name: String(raw?.full_name ?? raw?.fullName ?? ""),
    email: String(raw?.email ?? ""),
    mobile: String(raw?.mobile ?? raw?.phone ?? raw?.phone_no ?? ""),
    role: String(raw?.role ?? "COLLECTION_CENTRE_OPERATOR"),
    is_active: Boolean(raw?.is_active ?? raw?.isActive ?? false),
    created_at: String(raw?.created_at ?? raw?.createdAt ?? ""),
  };
}

function normalizeCollectionOperatorList(
  input: any
): CollectionCentreOperator[] {
  const raw = unwrap<any>(input);
  const list = raw?.data ?? raw?.items ?? raw?.rows ?? raw?.results ?? raw;

  if (!Array.isArray(list)) return [];
  return list.map(normalizeCollectionOperator);
}

export const centreCrateService = {
  async getDashboard(): Promise<CentreDashboardRes> {
    const res = await http.getJson("/api/collection-centre/dashboard");
    return unwrap<CentreDashboardRes>(res);
  },

  async getCrates(): Promise<ApiCrate[]> {
    const res = await http.getJson("/api/collection-centre/crates");
    return normalizeCrateList(res);
  },

  async getCrateById(crateId: number | string): Promise<ApiCrate> {
    const res = await http.getJson(`/api/collection-centre/crates/${crateId}`);
    return normalizeCrate(unwrap(res));
  },

  async getCrateByCode(code: string): Promise<ApiCrate> {
    const cleanCode = encodeURIComponent(String(code ?? "").trim());
    const res = await http.getJson(`/api/crate/${cleanCode}`);
    return normalizeCrate(unwrap(res));
  },

  async receiveCrate(payload: ReceiveCratePayload): Promise<ApiCrate> {
    const body = {
      crate_qr: payload.qrValue,
    };

    const res = await http.postJson(
      "/api/collection-centre/crates/receive",
      body
    );

    return normalizeCrate(unwrap(res));
  },

  async logTemperature(payload: TempLogPayload): Promise<ApiCrate> {
    const body = {
      temperature_value: payload.tempC,
    };

    const res = await http.postJson(
      `/api/collection-centre/crates/${payload.crateId}/temperature`,
      body
    );

    return normalizeCrate(unwrap(res));
  },

  async assignDispatch(payload: AssignDispatchPayload): Promise<ApiCrate> {
    const requestBody = {
      destination_name: payload.destinationName,
      transport_operator_id: payload.transportOperatorId,
      transport_id: payload.transportId || payload.transportOperatorId,
      scheduled_time_utc: payload.scheduledTimeUtc,
      assigned_to_label: payload.assignedToLabel || payload.destinationName,
      driver_name: payload.driverName || "",
      vehicle_no: payload.vehicleNo || "",
      operator_id: payload.operatorId || "",
      notes: payload.notes || "",
    };

    const res = await http.postJson(
      `/api/collection-centre/crates/${payload.crateId}/assign-dispatch`,
      requestBody
    );

    const assigned = normalizeCrate(unwrap(res));

    return normalizeCrate({
      ...assigned,
      id: assigned.id ?? payload.crateId,
      crateId: assigned.crateId ?? assigned.id ?? payload.crateId,
      destination_name: assigned.destination_name || payload.destinationName,
      destinationName: assigned.destinationName || payload.destinationName,
      assigned_to: assigned.assigned_to || payload.operatorId || "",
      assignedTo: assigned.assignedTo || payload.operatorId || "",
      assigned_to_label:
        assigned.assigned_to_label ||
        payload.assignedToLabel ||
        payload.destinationName,
      assignedToLabel:
        assigned.assignedToLabel ||
        payload.assignedToLabel ||
        payload.destinationName,
      transport_operator_id:
        assigned.transport_operator_id || payload.transportOperatorId,
      assigned_transport_operator_id:
        assigned.assigned_transport_operator_id || payload.transportOperatorId,
      assignedTransportOperatorId:
        assigned.assignedTransportOperatorId || payload.transportOperatorId,
      transport_id:
        assigned.transport_id ||
        payload.transportId ||
        payload.transportOperatorId,
      transportId:
        assigned.transportId ||
        payload.transportId ||
        payload.transportOperatorId,
      scheduled_time_utc:
        assigned.scheduled_time_utc || payload.scheduledTimeUtc,
      dispatch_scheduled_at:
        assigned.dispatch_scheduled_at || payload.scheduledTimeUtc,
      dispatchScheduledAt:
        assigned.dispatchScheduledAt || payload.scheduledTimeUtc,
      assigned_at:
        assigned.assigned_at ||
        assigned.scheduled_time_utc ||
        payload.scheduledTimeUtc,
      assignedAt:
        assigned.assignedAt ||
        assigned.scheduled_time_utc ||
        payload.scheduledTimeUtc,
      driver_name: assigned.driver_name || payload.driverName || "",
      driverName: assigned.driverName || payload.driverName || "",
      vehicle_no: assigned.vehicle_no || payload.vehicleNo || "",
      vehicleNo: assigned.vehicleNo || payload.vehicleNo || "",
      notes: assigned.notes || payload.notes || "",
      operator_id: assigned.operator_id || payload.operatorId || "",
      operatorId: assigned.operatorId || payload.operatorId || "",
      custody_status:
        assigned.custody_status || "SCHEDULED_FOR_DISPATCH",
      custody:
        assigned.custody || "SCHEDULED_FOR_DISPATCH",
      status:
        assigned.status || "ASSIGNED",
      stage: "assigned",
      isAssigned: true,
      isReceived: false,
    });
  },

  async getCollectionCentreOperators(
    page = 1,
    pageSize = 20
  ): Promise<CollectionCentreOperator[]> {
    const res = await http.getJson(
      `/api/admin/users?role=COLLECTION_CENTRE_OPERATOR&page=${page}&page_size=${pageSize}`
    );

    return normalizeCollectionOperatorList(res);
  },

  async getLoggedInCollectionCentreOperator(
    mobile: string,
    page = 1,
    pageSize = 20
  ): Promise<CollectionCentreOperator | null> {
    const cleanMobile = normalizePhone(mobile);
    if (!cleanMobile) return null;

    let currentPage = page;

    while (currentPage < page + 50) {
      const operators = await this.getCollectionCentreOperators(
        currentPage,
        pageSize
      );

      const found =
        operators.find((item) => normalizePhone(item.mobile) === cleanMobile) ||
        operators.find((item) =>
          normalizePhone(item.mobile).endsWith(cleanMobile)
        ) ||
        null;

      if (found) return found;
      if (operators.length < pageSize) break;

      currentPage += 1;
    }

    return null;
  },
};

export default centreCrateService;