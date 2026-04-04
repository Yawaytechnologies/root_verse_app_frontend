import { http } from "../../services/http";

export type TransportCrate = {
  id: string;
  collectionCentre?: string;
  destination?: string;
  scheduledTime?: string;
  assignedVehicleNo?: string;
  qualityGrade?: string;
  fishTags?: string[];
  notes?: string;
  status?: string;
  [key: string]: any;
};

export type TransportDashboardResponse = {
  success?: boolean;
  message?: string;
  data?: {
    currentTransport?: {
      id?: string;
      name?: string;
      vehicleNo?: string;
      route?: string;
      [key: string]: any;
    };
    stats?: {
      totalMyCrates?: number;
      assigned?: number;
      inTransit?: number;
      [key: string]: any;
    };
    assignedCrates?: TransportCrate[];
    inTransitCrates?: TransportCrate[];
    selectedDate?: string;
    [key: string]: any;
  };
  [key: string]: any;
};

export type AssignedCratesResponse = {
  success?: boolean;
  message?: string;
  data?:
    | TransportCrate[]
    | { assignedCrates?: TransportCrate[]; [key: string]: any };
  [key: string]: any;
};

export type ScanPickupPayload = {
  crate_id?: string;
  crateId?: string;
  qr_code?: string;
  qrValue?: string;
  [key: string]: any;
};

export type ScanPickupResponse = {
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
  [key: string]: any;
};

const unwrap = <T = any>(res: any): T => res?.data ?? res;

function normalizePhone(value: any) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .trim();
}

function normalizeTransportOperator(input: any): TransportOperator {
  const raw = input ?? {};

  return {
    ...raw,
    user_id: String(raw?.user_id ?? raw?.userId ?? ""),
    full_name: String(raw?.full_name ?? raw?.fullName ?? ""),
    email: String(raw?.email ?? ""),
    mobile: String(raw?.mobile ?? raw?.phone ?? raw?.phone_no ?? ""),
    role: String(raw?.role ?? "TRANSPORT_OPERATOR"),
    is_active: Boolean(raw?.is_active ?? raw?.isActive ?? false),
    created_at: String(raw?.created_at ?? raw?.createdAt ?? ""),
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
    return unwrap<TransportDashboardResponse>(res);
  },

  async getAssignedCrates(params?: { date?: string }) {
    const url = new URL("/api/transport/assigned-crates", "http://localhost");
    if (params?.date) {
      url.searchParams.append("date", params.date);
    }
    const res = await http.getJson(url.pathname + url.search);
    return unwrap<AssignedCratesResponse>(res);
  },

  async scanPickup(payload: ScanPickupPayload) {
    const body = {
      crate_id:
        payload?.crate_id ??
        payload?.crateId ??
        payload?.qr_code ??
        payload?.qrValue ??
        "",
      ...payload,
    };

    const res = await http.postJson("/api/transport/crates/scan-pickup", body);
    return unwrap<ScanPickupResponse>(res);
  },

  async getTransportOperators(
    page = 1,
    pageSize = 20,
  ): Promise<TransportOperator[]> {
    const res = await http.getJson(
      `/api/admin/users?role=TRANSPORT_OPERATOR&page=${page}&page_size=${pageSize}`,
    );

    return normalizeTransportOperatorList(res);
  },

  async getLoggedInTransportOperator(
    mobile: string,
    page = 1,
    pageSize = 20,
  ): Promise<TransportOperator | null> {
    const cleanMobile = normalizePhone(mobile);
    if (!cleanMobile) return null;

    let currentPage = page;

    while (currentPage < page + 50) {
      const operators = await this.getTransportOperators(currentPage, pageSize);

      const found =
        operators.find((item) => normalizePhone(item.mobile) === cleanMobile) ||
        operators.find((item) =>
          normalizePhone(item.mobile).endsWith(cleanMobile),
        ) ||
        null;

      if (found) return found;
      if (operators.length < pageSize) break;

      currentPage += 1;
    }

    return null;
  },
};

export default transportService;
