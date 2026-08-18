import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../config/env";

const TOKEN_KEY = "auth_token";

// ============================================================
// TYPES
// ============================================================

export type AquaLoggedTransportOperator = {
  id?: number | string;

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

  trader_id?: number | string;
  traderId?: number | string;

  is_active?: boolean;

  role?: string;

  [key: string]: any;
};

export type AquaOperatorLookupResult = {
  ok: boolean;
  message: string;

  data:
    | AquaLoggedTransportOperator
    | null;

  traderId?: string;

  raw?: any;

  status?: number;
};

// ============================================================
// HELPERS
// ============================================================

function text(value: any) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
}

function firstText(
  ...values: any[]
) {
  for (const value of values) {
    const result =
      text(value);

    if (result) {
      return result;
    }
  }

  return "";
}

function normalizeText(
  value: any
) {
  return text(value)
    .toLowerCase()
    .replace(/\s+/g, "");
}

function sameText(
  first: any,
  second: any
) {
  const a =
    normalizeText(first);

  const b =
    normalizeText(second);

  return Boolean(
    a &&
      b &&
      a === b
  );
}

// ============================================================
// API URL
// ============================================================

function apiUrl(
  path: string
) {
  const base =
    String(
      API_BASE || ""
    ).replace(/\/+$/, "");

  const cleanPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  if (
    base.endsWith("/api") &&
    cleanPath.startsWith(
      "/api/"
    )
  ) {
    return `${base}${cleanPath.replace(
      /^\/api/,
      ""
    )}`;
  }

  return `${base}${cleanPath}`;
}

// ============================================================
// GET TOKEN
// ============================================================

async function getToken() {
  return (
    (await AsyncStorage.getItem(
      TOKEN_KEY
    )) ||
    (await AsyncStorage.getItem(
      "token"
    )) ||
    ""
  );
}

// ============================================================
// HEADERS
// ============================================================

async function authHeaders() {
  const token =
    await getToken();

  return {
    Accept:
      "application/json",

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
// JWT DECODE
// NO EXTERNAL LIBRARY REQUIRED
// ============================================================

function decodeBase64Url(
  value: string
) {
  try {
    let base64 =
      value
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    while (
      base64.length % 4
    ) {
      base64 += "=";
    }

    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    let output = "";

    let index = 0;

    while (
      index < base64.length
    ) {
      const encoded1 =
        chars.indexOf(
          base64.charAt(
            index++
          )
        );

      const encoded2 =
        chars.indexOf(
          base64.charAt(
            index++
          )
        );

      const encoded3 =
        chars.indexOf(
          base64.charAt(
            index++
          )
        );

      const encoded4 =
        chars.indexOf(
          base64.charAt(
            index++
          )
        );

      const chr1 =
        (encoded1 << 2) |
        (encoded2 >> 4);

      const chr2 =
        ((encoded2 & 15) <<
          4) |
        (encoded3 >> 2);

      const chr3 =
        ((encoded3 & 3) <<
          6) |
        encoded4;

      output +=
        String.fromCharCode(
          chr1
        );

      if (
        encoded3 !== 64
      ) {
        output +=
          String.fromCharCode(
            chr2
          );
      }

      if (
        encoded4 !== 64
      ) {
        output +=
          String.fromCharCode(
            chr3
          );
      }
    }

    return decodeURIComponent(
      output
        .split("")
        .map(
          (char) =>
            "%" +
            (
              "00" +
              char
                .charCodeAt(0)
                .toString(16)
            ).slice(-2)
        )
        .join("")
    );
  } catch {
    return "";
  }
}

function decodeJwtPayload(
  token: string
) {
  try {
    if (!token) {
      return null;
    }

    const parts =
      token.split(".");

    if (
      parts.length < 2
    ) {
      return null;
    }

    const json =
      decodeBase64Url(
        parts[1]
      );

    if (!json) {
      return null;
    }

    return JSON.parse(
      json
    );
  } catch (error) {
    console.log(
      "JWT DECODE ERROR:",
      error
    );

    return null;
  }
}

// ============================================================
// FIND TRADER ID
// ============================================================

async function resolveTraderId(
  loginOperator: any
) {
  // ----------------------------------------------------------
  // 1. CHECK LOGIN RESPONSE
  // ----------------------------------------------------------

  const fromLogin =
    firstText(
      loginOperator
        ?.trader_id,

      loginOperator
        ?.traderId,

      loginOperator
        ?.trader?.id,

      loginOperator
        ?.data?.trader_id,

      loginOperator
        ?.data?.traderId,

      loginOperator
        ?.data?.trader?.id
    );

  if (fromLogin) {
    console.log(
      "AQUA TRADER ID FROM LOGIN:",
      fromLogin
    );

    return fromLogin;
  }

  // ----------------------------------------------------------
  // 2. CHECK JWT
  // ----------------------------------------------------------

  const token =
    await getToken();

  const payload =
    decodeJwtPayload(
      token
    );

  console.log(
    "AQUA TOKEN PAYLOAD:",
    JSON.stringify(
      payload,
      null,
      2
    )
  );

  const fromToken =
    firstText(
      payload?.trader_id,

      payload?.traderId,

      payload?.trader?.id,

      payload?.user
        ?.trader_id,

      payload?.user
        ?.traderId,

      payload?.profile
        ?.trader_id,

      payload?.profile
        ?.traderId
    );

  if (fromToken) {
    console.log(
      "AQUA TRADER ID FROM TOKEN:",
      fromToken
    );

    return fromToken;
  }

  return "";
}

// ============================================================
// NORMALIZE TRANSPORT OPERATOR
// ============================================================

export function normalizeAquaOperator(
  raw: any,
  loginOperator?: any,
  fallbackTraderId?: any
): AquaLoggedTransportOperator {
  const operatorRvId =
    firstText(
      raw?.operator_rv_id,

      raw?.operatorRvId,

      raw?.user_id,

      loginOperator
        ?.operator_rv_id,

      loginOperator
        ?.user_id
    );

  return {
    id:
      raw?.id ??
      loginOperator?.id,

    operator_rv_id:
      operatorRvId,

    user_id:
      operatorRvId,

    full_name:
      firstText(
        raw?.full_name,

        raw?.name,

        raw?.driver_name,

        loginOperator
          ?.full_name,

        loginOperator
          ?.name,

        loginOperator
          ?.driver_name
      ),

    email:
      firstText(
        raw?.email,

        loginOperator
          ?.email
      ),

    mobile:
      firstText(
        raw?.mobile,

        raw?.phone,

        loginOperator
          ?.mobile,

        loginOperator
          ?.phone
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
      firstText(
        raw?.vehicle_no,

        raw?.vehicleNo,

        raw?.vehicle_number,

        loginOperator
          ?.vehicle_no,

        loginOperator
          ?.vehicleNo,

        loginOperator
          ?.vehicle_number
      ),

    vehicle_number:
      firstText(
        raw?.vehicle_number,

        raw?.vehicle_no,

        raw?.vehicleNo,

        loginOperator
          ?.vehicle_number,

        loginOperator
          ?.vehicle_no
      ),

    vehicleNo:
      firstText(
        raw?.vehicleNo,

        raw?.vehicle_no,

        raw?.vehicle_number,

        loginOperator
          ?.vehicleNo,

        loginOperator
          ?.vehicle_no
      ),

    vehicle_type:
      firstText(
        raw?.vehicle_type,

        raw?.vehicleType,

        loginOperator
          ?.vehicle_type
      ),

    vehicleType:
      firstText(
        raw?.vehicleType,

        raw?.vehicle_type,

        loginOperator
          ?.vehicleType
      ),

    route_name:
      firstText(
        raw?.route_name,

        raw?.routeName,

        raw?.route,

        loginOperator
          ?.route_name
      ),

    routeName:
      firstText(
        raw?.routeName,

        raw?.route_name,

        raw?.route,

        loginOperator
          ?.routeName
      ),

    trader_id:
      raw?.trader_id ??
      raw?.traderId ??
      raw?.trader?.id ??
      loginOperator
        ?.trader_id ??
      loginOperator
        ?.traderId ??
      fallbackTraderId,

    traderId:
      raw?.traderId ??
      raw?.trader_id ??
      raw?.trader?.id ??
      loginOperator
        ?.traderId ??
      loginOperator
        ?.trader_id ??
      fallbackTraderId,

    is_active:
      raw?.is_active ??
      loginOperator
        ?.is_active,

    role:
      firstText(
        raw?.role,

        loginOperator
          ?.role,

        "TRANSPORT_OPERATOR"
      ),
  };
}

// ============================================================
// EXTRACT TRADER DATA
// ============================================================

function unwrapTrader(
  response: any
) {
  return (
    response?.data?.data ??
    response?.data ??
    response?.result ??
    response
  );
}

// ============================================================
// EXTRACT TRANSPORT OPERATORS
// ============================================================

function getTransportOperators(
  trader: any
): any[] {
  const possibleLists = [
    trader
      ?.transport_operators,

    trader
      ?.transportOperators,

    trader
      ?.data
      ?.transport_operators,

    trader
      ?.data
      ?.transportOperators,
  ];

  for (
    const list
    of possibleLists
  ) {
    if (
      Array.isArray(
        list
      )
    ) {
      return list;
    }
  }

  return [];
}

// ============================================================
// FIND LOGGED OPERATOR
// ============================================================

function findOperator(
  operators: any[],
  loginOperator: any
) {
  const loginId =
    firstText(
      loginOperator
        ?.operator_rv_id,

      loginOperator
        ?.user_id,

      loginOperator
        ?.operatorRvId
    );

  const loginMobile =
    firstText(
      loginOperator
        ?.mobile,

      loginOperator
        ?.phone
    );

  const loginEmail =
    firstText(
      loginOperator
        ?.email
    );

  console.log(
    "AQUA MATCH LOGIN ID:",
    loginId
  );

  // ----------------------------------------------------------
  // 1. MATCH ID
  // ----------------------------------------------------------

  if (loginId) {
    const matchedById =
      operators.find(
        (item) =>
          sameText(
            firstText(
              item
                ?.operator_rv_id,

              item
                ?.operatorRvId,

              item
                ?.user_id
            ),

            loginId
          )
      );

    if (matchedById) {
      console.log(
        "AQUA OPERATOR MATCHED BY ID"
      );

      return matchedById;
    }
  }

  // ----------------------------------------------------------
  // 2. MATCH MOBILE
  // ----------------------------------------------------------

  if (loginMobile) {
    const matchedByMobile =
      operators.find(
        (item) =>
          sameText(
            firstText(
              item
                ?.mobile,

              item?.phone
            ),

            loginMobile
          )
      );

    if (
      matchedByMobile
    ) {
      console.log(
        "AQUA OPERATOR MATCHED BY MOBILE"
      );

      return matchedByMobile;
    }
  }

  // ----------------------------------------------------------
  // 3. MATCH EMAIL
  // ----------------------------------------------------------

  if (loginEmail) {
    const matchedByEmail =
      operators.find(
        (item) =>
          sameText(
            item?.email,
            loginEmail
          )
      );

    if (
      matchedByEmail
    ) {
      console.log(
        "AQUA OPERATOR MATCHED BY EMAIL"
      );

      return matchedByEmail;
    }
  }

  return null;
}

// ============================================================
// MAIN FUNCTION
//
// GET /api/traders/{traderId}
// ============================================================

export async function getFullAquaLoggedOperator(
  loginOperator: any
): Promise<AquaOperatorLookupResult> {
  try {
    // --------------------------------------------------------
    // FIND TRADER ID
    // --------------------------------------------------------

    const traderId =
      await resolveTraderId(
        loginOperator
      );

    console.log(
      "AQUA FINAL TRADER ID:",
      traderId
    );

    if (!traderId) {
      return {
        ok: false,

        message:
          "Trader ID was not found in login response or token.",

        data:
          normalizeAquaOperator(
            loginOperator,
            loginOperator
          ),
      };
    }

    // --------------------------------------------------------
    // CALL TRADER DETAIL
    // --------------------------------------------------------

    const path =
      `/api/traders/${encodeURIComponent(
        traderId
      )}`;

    const url =
      apiUrl(path);

    console.log(
      "============================================"
    );

    console.log(
      "AQUA TRADER DETAIL URL:",
      url
    );

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers:
            await authHeaders(),
        }
      );

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
          responseData
            ?.message ||
          responseData
            ?.error ||
          `Unable to get trader detail. HTTP ${response.status}`,

        data:
          normalizeAquaOperator(
            loginOperator,
            loginOperator,
            traderId
          ),

        traderId,

        raw:
          responseData,

        status:
          response.status,
      };
    }

    // --------------------------------------------------------
    // TRADER
    // --------------------------------------------------------

    const trader =
      unwrapTrader(
        responseData
      );

    console.log(
      "AQUA TRADER:",
      JSON.stringify(
        trader,
        null,
        2
      )
    );

    // --------------------------------------------------------
    // TRANSPORT OPERATORS
    // --------------------------------------------------------

    const operators =
      getTransportOperators(
        trader
      );

    console.log(
      "AQUA TRADER TRANSPORT OPERATORS:",
      JSON.stringify(
        operators,
        null,
        2
      )
    );

    if (
      operators.length ===
      0
    ) {
      return {
        ok: false,

        message:
          "No transport operators found in trader detail.",

        data:
          normalizeAquaOperator(
            loginOperator,
            loginOperator,
            traderId
          ),

        traderId,

        raw:
          responseData,

        status:
          response.status,
      };
    }

    // --------------------------------------------------------
    // MATCH CURRENT OPERATOR
    // --------------------------------------------------------

    const matchedOperator =
      findOperator(
        operators,
        loginOperator
      );

    if (
      !matchedOperator
    ) {
      return {
        ok: false,

        message:
          `Logged-in Transport Operator ${
            firstText(
              loginOperator
                ?.user_id,

              loginOperator
                ?.operator_rv_id
            ) || ""
          } was not found under Trader ${traderId}.`,

        data:
          normalizeAquaOperator(
            loginOperator,
            loginOperator,
            traderId
          ),

        traderId,

        raw:
          responseData,

        status:
          response.status,
      };
    }

    // --------------------------------------------------------
    // FINAL OPERATOR
    // --------------------------------------------------------

    const finalOperator =
      normalizeAquaOperator(
        matchedOperator,
        loginOperator,
        traderId
      );

    console.log(
      "AQUA MATCHED TRANSPORT OPERATOR:",
      JSON.stringify(
        matchedOperator,
        null,
        2
      )
    );

    console.log(
      "AQUA FINAL TRANSPORT OPERATOR:",
      JSON.stringify(
        finalOperator,
        null,
        2
      )
    );

    console.log(
      "============================================"
    );

    return {
      ok: true,

      message:
        "Transport Operator details loaded successfully.",

      data:
        finalOperator,

      traderId,

      raw:
        matchedOperator,

      status:
        response.status,
    };
  } catch (
    error: any
  ) {
    console.log(
      "AQUA TRADER DETAIL ERROR:",
      error
    );

    return {
      ok: false,

      message:
        error?.message ||
        "Unable to get Transport Operator details.",

      data:
        normalizeAquaOperator(
          loginOperator,
          loginOperator
        ),
    };
  }
}