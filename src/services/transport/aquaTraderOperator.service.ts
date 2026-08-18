import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../config/env";

const TOKEN_KEY = "auth_token";

// ============================================================
// TYPES
// ============================================================

export type AquaTransportOperatorProfile = {
  id?: number;

  operator_rv_id?: string;
  user_id?: string;

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

  trader_id?: number;

  is_active?: boolean;
};

export type AquaTraderDetail = {
  id?: number;

  trader_code?: string;

  trader_name?: string;

  mobile?: string;

  email?: string;

  transport_operators?: AquaTransportOperatorProfile[];
};

export type AquaTraderOperatorResult = {
  ok: boolean;

  message: string;

  operator?: AquaTransportOperatorProfile | null;

  trader?: AquaTraderDetail | null;

  status?: number;
};

// ============================================================
// BASIC HELPERS
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

function normalize(value: any) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function sameValue(
  first: any,
  second: any
) {
  const a = normalize(first);
  const b = normalize(second);

  return Boolean(
    a &&
      b &&
      a === b
  );
}

// ============================================================
// API URL
// ============================================================

function apiUrl(path: string) {
  const base =
    String(API_BASE || "").replace(
      /\/+$/,
      ""
    );

  const cleanPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  if (
    base.endsWith("/api") &&
    cleanPath.startsWith("/api/")
  ) {
    return `${base}${cleanPath.replace(
      /^\/api/,
      ""
    )}`;
  }

  return `${base}${cleanPath}`;
}

// ============================================================
// AUTH HEADERS
// ============================================================

async function authHeaders() {
  const token =
    (await AsyncStorage.getItem(
      TOKEN_KEY
    )) ||
    (await AsyncStorage.getItem(
      "token"
    )) ||
    "";

  return {
    Accept: "application/json",

    "Content-Type":
      "application/json",

    ...(token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : {}),
  };
}

// ============================================================
// SAFE JSON
// ============================================================

async function safeJson(
  response: Response
) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// ============================================================
// NORMALIZE OPERATOR
// ============================================================

function normalizeOperator(
  raw: any,
  loginOperator?: any,
  traderId?: number
): AquaTransportOperatorProfile {
  const operatorId =
    firstText(
      raw?.operator_rv_id,

      raw?.user_id,

      loginOperator
        ?.operator_rv_id,

      loginOperator
        ?.user_id
    );

  const vehicle =
    firstText(
      raw?.vehicle_no,

      raw?.vehicle_number,

      raw?.vehicleNo,

      loginOperator?.vehicle_no,

      loginOperator
        ?.vehicle_number,

      loginOperator?.vehicleNo
    );

  return {
    id:
      raw?.id,

    operator_rv_id:
      operatorId,

    user_id:
      operatorId,

    full_name:
      firstText(
        raw?.full_name,

        raw?.name,

        loginOperator
          ?.full_name,

        loginOperator?.name
      ),

    email:
      firstText(
        raw?.email,

        loginOperator?.email
      ),

    mobile:
      firstText(
        raw?.mobile,

        raw?.phone,

        loginOperator?.mobile,

        loginOperator?.phone
      ),

    transport_id:
      firstText(
        raw?.transport_id,

        raw?.transportId,

        loginOperator
          ?.transport_id,

        loginOperator
          ?.transportId
      ),

    vehicle_no:
      vehicle,

    vehicle_number:
      vehicle,

    vehicleNo:
      vehicle,

    vehicle_type:
      firstText(
        raw?.vehicle_type,

        raw?.vehicleType,

        loginOperator
          ?.vehicle_type,

        loginOperator
          ?.vehicleType
      ),

    vehicleType:
      firstText(
        raw?.vehicleType,

        raw?.vehicle_type,

        loginOperator
          ?.vehicleType,

        loginOperator
          ?.vehicle_type
      ),

    route_name:
      firstText(
        raw?.route_name,

        raw?.routeName,

        loginOperator
          ?.route_name,

        loginOperator
          ?.routeName
      ),

    routeName:
      firstText(
        raw?.routeName,

        raw?.route_name,

        loginOperator
          ?.routeName,

        loginOperator
          ?.route_name
      ),

    trader_id:
      Number(
        raw?.trader_id ??
          raw?.traderId ??
          traderId ??
          loginOperator?.trader_id ??
          loginOperator?.traderId
      ) || undefined,

    is_active:
      raw?.is_active ??
      loginOperator?.is_active,
  };
}

// ============================================================
// GET TRADER DETAIL
//
// GET /api/traders/{traderId}
// ============================================================

export async function getTraderDetailForTransport(
  traderId: number | string
): Promise<{
  ok: boolean;
  data?: AquaTraderDetail;
  message: string;
  status?: number;
}> {
  const id =
    String(
      traderId ?? ""
    ).trim();

  if (!id) {
    return {
      ok: false,
      message:
        "Trader ID is required.",
    };
  }

  try {
    const url =
      apiUrl(
        `/api/traders/${encodeURIComponent(
          id
        )}`
      );

    console.log(
      "AQUA TRADER DETAIL URL:",
      url
    );

    const response =
      await fetch(url, {
        method: "GET",

        headers:
          await authHeaders(),
      });

    const responseData =
      await safeJson(
        response
      );

    console.log(
      "AQUA TRADER DETAIL STATUS:",
      response.status
    );

    console.log(
      "AQUA TRADER DETAIL RESPONSE:",
      JSON.stringify(
        responseData,
        null,
        2
      )
    );

    if (!response.ok) {
      return {
        ok: false,

        message:
          responseData?.message ||
          responseData?.error ||
          `Unable to fetch trader detail. HTTP ${response.status}`,

        status:
          response.status,
      };
    }

    const trader =
      responseData?.data ??
      responseData?.result ??
      responseData;

    return {
      ok: true,

      message:
        "Trader detail loaded.",

      data:
        trader,

      status:
        response.status,
    };
  } catch (error: any) {
    console.log(
      "AQUA TRADER DETAIL ERROR:",
      error
    );

    return {
      ok: false,

      message:
        error?.message ||
        "Unable to fetch trader detail.",
    };
  }
}

// ============================================================
// MATCH LOGGED-IN OPERATOR
// ============================================================

function matchTransportOperator(
  trader: AquaTraderDetail,
  loginOperator: any
) {
  const operators =
    Array.isArray(
      trader?.transport_operators
    )
      ? trader.transport_operators
      : [];

  if (!operators.length) {
    return null;
  }

  // Logged-in API currently gives:
  //
  // user_id = OP-RV-001

  const loggedOperatorId =
    firstText(
      loginOperator
        ?.operator_rv_id,

      loginOperator?.user_id
    );

  const loggedMobile =
    firstText(
      loginOperator?.mobile
    );

  const loggedEmail =
    firstText(
      loginOperator?.email
    );

  // ----------------------------------------------------------
  // 1. Match OP-RV-001
  // ----------------------------------------------------------

  if (loggedOperatorId) {
    const byId =
      operators.find(
        (item) =>
          sameValue(
            item?.operator_rv_id,
            loggedOperatorId
          )
      );

    if (byId) {
      return byId;
    }
  }

  // ----------------------------------------------------------
  // 2. Mobile fallback
  // ----------------------------------------------------------

  if (loggedMobile) {
    const byMobile =
      operators.find(
        (item) =>
          sameValue(
            item?.mobile,
            loggedMobile
          )
      );

    if (byMobile) {
      return byMobile;
    }
  }

  // ----------------------------------------------------------
  // 3. Email fallback
  // ----------------------------------------------------------

  if (loggedEmail) {
    const byEmail =
      operators.find(
        (item) =>
          sameValue(
            item?.email,
            loggedEmail
          )
      );

    if (byEmail) {
      return byEmail;
    }
  }

  return null;
}

// ============================================================
// MAIN FUNCTION
// ============================================================

export async function getFullTransportOperatorFromTrader({
  traderId,
  loginOperator,
}: {
  traderId: number | string;
  loginOperator: any;
}): Promise<AquaTraderOperatorResult> {
  const id =
    String(
      traderId ?? ""
    ).trim();

  if (!id) {
    return {
      ok: false,

      message:
        "Trader ID is missing. It must come from login/session.",

      operator:
        normalizeOperator(
          loginOperator,
          loginOperator
        ),
    };
  }

  const traderResponse =
    await getTraderDetailForTransport(
      id
    );

  if (
    !traderResponse.ok ||
    !traderResponse.data
  ) {
    return {
      ok: false,

      message:
        traderResponse.message,

      operator:
        normalizeOperator(
          loginOperator,
          loginOperator,
          Number(id)
        ),

      status:
        traderResponse.status,
    };
  }

  const trader =
    traderResponse.data;

  const matched =
    matchTransportOperator(
      trader,
      loginOperator
    );

  if (!matched) {
    return {
      ok: false,

      message:
        `Logged-in Transport Operator ${
          loginOperator?.user_id ||
          loginOperator
            ?.operator_rv_id ||
          ""
        } was not found under Trader ${id}.`,

      operator:
        normalizeOperator(
          loginOperator,
          loginOperator,
          Number(id)
        ),

      trader,
    };
  }

  const operator =
    normalizeOperator(
      matched,
      loginOperator,
      Number(id)
    );

  console.log(
    "AQUA MATCHED OPERATOR:",
    JSON.stringify(
      operator,
      null,
      2
    )
  );

  return {
    ok: true,

    message:
      "Transport Operator loaded.",

    operator,

    trader,
  };
}