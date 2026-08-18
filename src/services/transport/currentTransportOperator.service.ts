import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../config/env";

const TOKEN_KEY = "auth_token";
const AUTH_ME_PATH = "/api/auth/me";

// ============================================================
// TYPES
// ============================================================

export type CurrentTransportOperator = {
  id?: number | string;

  user_id?: string;
  operator_rv_id?: string;

  full_name?: string;

  email?: string;
  mobile?: string;

  transport_id?: string;

  vehicle_no?: string;
  vehicle_number?: string;
  vehicleNo?: string;

  vehicle_type?: string;
  vehicleType?: string;

  route_name?: string;
  routeName?: string;

  trader_id?: number | string;
  traderId?: number | string;

  role?: string;
  rootverse_type?: string;

  is_active?: boolean;

  [key: string]: any;
};

export type CurrentTransportOperatorResult = {
  ok: boolean;
  message: string;
  data?: CurrentTransportOperator;
  raw?: any;
  status?: number;
};

// ============================================================
// HELPERS
// ============================================================

function firstText(...values: any[]) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "";
}

// ============================================================
// URL
// ============================================================

function apiUrl(path: string) {
  const base = String(API_BASE || "").replace(/\/+$/, "");

  const cleanPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  /*
   * Supports:
   *
   * API_BASE=https://domain.com
   *
   * API_BASE=https://domain.com/api
   */

  if (
    base.endsWith("/api") &&
    cleanPath.startsWith("/api/")
  ) {
    return `${base}${cleanPath.replace(/^\/api/, "")}`;
  }

  return `${base}${cleanPath}`;
}

// ============================================================
// AUTH
// ============================================================

async function authHeaders() {
  const token =
    (await AsyncStorage.getItem(TOKEN_KEY)) ||
    (await AsyncStorage.getItem("token")) ||
    "";

  return {
    Accept: "application/json",
    "Content-Type": "application/json",

    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

// ============================================================
// SAFE JSON
// ============================================================

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// ============================================================
// UNWRAP RESPONSE
// ============================================================

function unwrapProfile(response: any) {
  const data =
    response?.data?.data ??
    response?.data ??
    response?.result ??
    response?.item ??
    response ??
    {};

  /*
   * Support common backend structures
   */

  return (
    data?.transport_operator ??
    data?.transportOperator ??
    data?.profile ??
    data?.user ??
    data
  );
}

// ============================================================
// NORMALIZE OPERATOR
// ============================================================

function normalizeTransportOperator(
  response: any
): CurrentTransportOperator {
  const profile = unwrapProfile(response);

  const operatorId = firstText(
    profile?.operator_rv_id,
    profile?.operatorRvId,
    profile?.user_id,
    profile?.userId,
    profile?.code
  );

  const vehicleNumber = firstText(
    profile?.vehicle_no,
    profile?.vehicle_number,
    profile?.vehicleNo,

    profile?.vehicle?.vehicle_no,
    profile?.vehicle?.vehicle_number,
    profile?.vehicle?.vehicleNo,

    profile?.transport?.vehicle_no,
    profile?.transport?.vehicle_number,
    profile?.transport?.vehicleNo
  );

  const vehicleType = firstText(
    profile?.vehicle_type,
    profile?.vehicleType,

    profile?.vehicle?.vehicle_type,
    profile?.vehicle?.vehicleType,

    profile?.transport?.vehicle_type,
    profile?.transport?.vehicleType
  );

  const traderId =
    profile?.trader_id ??
    profile?.traderId ??
    profile?.trader?.id ??
    profile?.organization?.id ??
    profile?.transport_operator?.trader_id;

  return {
    id: profile?.id,

    // --------------------------------------------------------
    // OPERATOR ID
    // --------------------------------------------------------

    user_id: operatorId,

    operator_rv_id: operatorId,

    // --------------------------------------------------------
    // NAME
    // --------------------------------------------------------

    full_name: firstText(
      profile?.full_name,
      profile?.fullName,
      profile?.name,
      profile?.driver_name,
      profile?.driverName
    ),

    // --------------------------------------------------------
    // CONTACT
    // --------------------------------------------------------

    email: firstText(
      profile?.email
    ),

    mobile: firstText(
      profile?.mobile,
      profile?.phone,
      profile?.mobile_number
    ),

    // --------------------------------------------------------
    // TRANSPORT
    // --------------------------------------------------------

    transport_id: firstText(
      profile?.transport_id,
      profile?.transportId,
      profile?.transport?.transport_id,
      profile?.transport?.transportId,
      profile?.transport?.id
    ),

    // --------------------------------------------------------
    // VEHICLE
    // --------------------------------------------------------

    vehicle_no: vehicleNumber,

    vehicle_number: vehicleNumber,

    vehicleNo: vehicleNumber,

    vehicle_type: vehicleType,

    vehicleType: vehicleType,

    // --------------------------------------------------------
    // ROUTE
    // --------------------------------------------------------

    route_name: firstText(
      profile?.route_name,
      profile?.routeName,
      profile?.route,

      profile?.transport?.route_name,
      profile?.transport?.routeName
    ),

    routeName: firstText(
      profile?.routeName,
      profile?.route_name,
      profile?.route
    ),

    // --------------------------------------------------------
    // TRADER
    // --------------------------------------------------------

    trader_id: traderId,

    traderId: traderId,

    // --------------------------------------------------------
    // ROLE
    // --------------------------------------------------------

    role: firstText(
      profile?.role,
      profile?.rootverse_type
    ),

    rootverse_type: firstText(
      profile?.rootverse_type,
      profile?.role
    ),

    is_active: profile?.is_active,
  };
}

// ============================================================
// GET /api/auth/me
// ============================================================

export async function getCurrentTransportOperator():
Promise<CurrentTransportOperatorResult> {
  try {
    const url = apiUrl(AUTH_ME_PATH);

    console.log("AUTH ME URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: await authHeaders(),
    });

    const responseData = await safeJson(response);

    console.log(
      "AUTH ME STATUS:",
      response.status
    );

    console.log(
      "AUTH ME RAW RESPONSE:",
      JSON.stringify(responseData, null, 2)
    );

    if (!response.ok) {
      return {
        ok: false,

        message:
          responseData?.message ||
          responseData?.error ||
          `Unable to get current user. HTTP ${response.status}`,

        raw: responseData,

        status: response.status,
      };
    }

    const operator =
      normalizeTransportOperator(responseData);

    console.log(
      "AUTH ME NORMALIZED TRANSPORT OPERATOR:",
      JSON.stringify(operator, null, 2)
    );

    return {
      ok: true,

      message:
        "Transport Operator loaded successfully.",

      data: operator,

      raw: responseData,

      status: response.status,
    };
  } catch (error: any) {
    console.log(
      "AUTH ME ERROR:",
      error
    );

    return {
      ok: false,

      message:
        error?.message ||
        "Unable to get current Transport Operator.",
    };
  }
}