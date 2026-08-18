// src/services/transport/aquaTransportLoading.service.ts

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../config/env";

const TOKEN_KEY = "auth_token";

const AQUA_TRANSPORT_LOADING_PATH =
  "/api/aquaculture/transport-loading";

const AQUA_LOADING_HISTORY_KEY =
  "aqua_transport_loading_history";

// ============================================================
// TYPES
// ============================================================

export type AquaTransportScanPayload = {
  crate_qr: string;
  vehicle_number: string;
  gps_latitude: number;
  gps_longitude: number;
  remarks?: string;
};

export type AquaTransportOperator = {
  id?: number;
  operator_rv_id?: string;
  full_name?: string;
  transport_id?: string;

  vehicle_number?: string;
  vehicle_no?: string;
  vehicleNo?: string;
};

export type AquaTrader = {
  trader_code?: string;
  trader_name?: string;
  mobile?: string;
};

export type AquaLoadedCrate = {
  crate_packing_id?: number;
  crate_code?: string;

  species?: string;
  grade?: string;

  weight_kg?: number;

  packing_status?: string;

  loaded?: boolean;
  loaded_at?: string;

  vehicle_number?: string;

  transport_operator_rv_id?: string;
  transport_operator_name?: string;

  chain_of_custody_status?: string;
};

export type AquaLoadingProgress = {
  harvest_id?: number;
  trader_id?: number;

  vehicle_number?: string;

  transport_operator?: AquaTransportOperator;

  total_packed_crates?: number;
  loaded_crates?: number;
  remaining_crates?: number;
  loading_progress?: number;

  dispatch_status?: string;

  crates?: AquaLoadedCrate[];
};

export type AquaTransportScanData = {
  id?: number;

  crate_code?: string;
  harvest_id?: number;
  trader_id?: number;

  trader?: AquaTrader;

  transport_operator?: AquaTransportOperator;

  vehicle_number?: string;

  species?: string;
  grade?: string;
  weight_kg?: number;

  chain_of_custody_status?: string;

  loaded_at?: string;

  progress?: AquaLoadingProgress;
};

export type AquaApiResult<T = any> = {
  ok: boolean;
  message: string;
  data?: T;
  status?: number;
};

// ============================================================
// LOCAL HISTORY TYPE
// ============================================================

export type AquaLoadingHistoryItem = {
  id: string;

  crate_code: string;

  harvest_id?: number;
  trader_id?: number;

  trader_name?: string;
  trader_code?: string;

  operator_name?: string;
  operator_rv_id?: string;

  vehicle_number?: string;

  species?: string;
  grade?: string;
  weight_kg?: number;

  chain_of_custody_status?: string;

  loaded_at: string;

  date_key: string;
};

// ============================================================
// HELPERS
// ============================================================

function apiUrl(path: string) {
  const base = String(API_BASE || "").replace(/\/+$/, "");

  const cleanPath = path.startsWith("/")
    ? path
    : `/${path}`;

  if (
    base.endsWith("/api") &&
    cleanPath.startsWith("/api/")
  ) {
    return `${base}${cleanPath.replace(/^\/api/, "")}`;
  }

  return `${base}${cleanPath}`;
}

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

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function unwrapData<T = any>(response: any): T {
  if (response?.data !== undefined) {
    return response.data;
  }

  if (response?.result !== undefined) {
    return response.result;
  }

  if (response?.item !== undefined) {
    return response.item;
  }

  return response;
}

function getMessage(
  data: any,
  fallback: string,
  status?: number
) {
  if (
    typeof data?.message === "string" &&
    data.message.trim()
  ) {
    return data.message;
  }

  if (
    typeof data?.error === "string" &&
    data.error.trim()
  ) {
    return data.error;
  }

  if (
    typeof data?.detail === "string" &&
    data.detail.trim()
  ) {
    return data.detail;
  }

  if (Array.isArray(data?.message)) {
    return data.message.join(" | ");
  }

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((item: any) => {
        if (typeof item === "string") {
          return item;
        }

        if (item?.msg) {
          return item.msg;
        }

        return JSON.stringify(item);
      })
      .join(" | ");
  }

  return status
    ? `HTTP ${status}: ${fallback}`
    : fallback;
}

function dateKeyFromUtc(value?: string) {
  const date = value
    ? new Date(value)
    : new Date();

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ============================================================
// HTTP REQUEST
// ============================================================

async function requestJson<T>({
  path,
  method,
  body,
  fallbackError,
}: {
  path: string;
  method: "GET" | "POST";
  body?: any;
  fallbackError: string;
}): Promise<AquaApiResult<T>> {
  try {
    const url = apiUrl(path);

    console.log(
      "AQUA TRANSPORT URL:",
      url
    );

    console.log(
      "AQUA TRANSPORT METHOD:",
      method
    );

    if (body) {
      console.log(
        "AQUA TRANSPORT BODY:",
        JSON.stringify(
          body,
          null,
          2
        )
      );
    }

    const response = await fetch(
      url,
      {
        method,

        headers:
          await authHeaders(),

        ...(body !== undefined
          ? {
              body:
                JSON.stringify(
                  body
                ),
            }
          : {}),
      }
    );

    const responseData =
      await safeJson(response);

    console.log(
      "AQUA TRANSPORT STATUS:",
      response.status
    );

    console.log(
      "AQUA TRANSPORT RESPONSE:",
      JSON.stringify(
        responseData,
        null,
        2
      )
    );

    if (
      !response.ok ||
      responseData?.success ===
        false ||
      responseData?.ok === false
    ) {
      return {
        ok: false,

        message:
          getMessage(
            responseData,
            fallbackError,
            response.status
          ),

        data: responseData,

        status:
          response.status,
      };
    }

    return {
      ok: true,

      message:
        getMessage(
          responseData,
          "Request successful",
          response.status
        ),

      data:
        unwrapData<T>(
          responseData
        ),

      status:
        response.status,
    };
  } catch (error: any) {
    console.log(
      "AQUA TRANSPORT ERROR:",
      error
    );

    return {
      ok: false,

      message:
        error?.message ||
        fallbackError,
    };
  }
}

// ============================================================
// POST SCAN
// ============================================================

export async function scanAquaTransportCrate(
  payload: AquaTransportScanPayload
): Promise<
  AquaApiResult<AquaTransportScanData>
> {
  const crateQr = String(
    payload?.crate_qr || ""
  ).trim();

  const vehicleNumber = String(
    payload?.vehicle_number || ""
  )
    .trim()
    .toUpperCase();

  if (!crateQr) {
    return {
      ok: false,
      message:
        "Crate QR is required.",
    };
  }

  if (!vehicleNumber) {
    return {
      ok: false,
      message:
        "Vehicle number is required.",
    };
  }

  if (
    !Number.isFinite(
      payload?.gps_latitude
    ) ||
    !Number.isFinite(
      payload?.gps_longitude
    )
  ) {
    return {
      ok: false,

      message:
        "Valid GPS coordinates are required.",
    };
  }

  const response =
    await requestJson<AquaTransportScanData>(
      {
        path:
          `${AQUA_TRANSPORT_LOADING_PATH}/scan`,

        method: "POST",

        body: {
          crate_qr:
            crateQr,

          vehicle_number:
            vehicleNumber,

          gps_latitude:
            payload.gps_latitude,

          gps_longitude:
            payload.gps_longitude,

          remarks:
            String(
              payload?.remarks ||
                ""
            ).trim(),
        },

        fallbackError:
          "Unable to load crate.",
      }
    );

  // Save successful loading locally
  if (
    response.ok &&
    response.data
  ) {
    await saveAquaLoadingHistory(
      response.data
    );
  }

  return response;
}

// ============================================================
// GET HARVEST PROGRESS
// ============================================================

export async function getAquaHarvestLoadingProgress(
  harvestId: number | string
): Promise<
  AquaApiResult<AquaLoadingProgress>
> {
  const id = String(
    harvestId ?? ""
  ).trim();

  if (!id) {
    return {
      ok: false,

      message:
        "Harvest ID is required.",
    };
  }

  return requestJson<AquaLoadingProgress>(
    {
      path:
        `${AQUA_TRANSPORT_LOADING_PATH}/harvest/${encodeURIComponent(
          id
        )}/progress`,

      method: "GET",

      fallbackError:
        "Unable to fetch transport loading progress.",
    }
  );
}

// ============================================================
// LOCAL LOADING HISTORY
// ============================================================

export async function saveAquaLoadingHistory(
  data: AquaTransportScanData
) {
  try {
    const existing =
      await getAllAquaLoadingHistory();

    const loadedAt =
      data.loaded_at ||
      new Date().toISOString();

    const item:
      AquaLoadingHistoryItem = {
      id:
        String(
          data.id ||
            data.crate_code ||
            Date.now()
        ) +
        "-" +
        String(loadedAt),

      crate_code:
        String(
          data.crate_code ||
            ""
        ),

      harvest_id:
        data.harvest_id,

      trader_id:
        data.trader_id,

      trader_name:
        data.trader
          ?.trader_name,

      trader_code:
        data.trader
          ?.trader_code,

      operator_name:
        data.transport_operator
          ?.full_name,

      operator_rv_id:
        data.transport_operator
          ?.operator_rv_id,

      vehicle_number:
        data.vehicle_number,

      species:
        data.species,

      grade:
        data.grade,

      weight_kg:
        data.weight_kg,

      chain_of_custody_status:
        data.chain_of_custody_status,

      loaded_at:
        loadedAt,

      date_key:
        dateKeyFromUtc(
          loadedAt
        ),
    };

    // Avoid duplicate crate record
    const filtered =
      existing.filter(
        (existingItem) =>
          !(
            existingItem.crate_code ===
              item.crate_code &&
            existingItem.loaded_at ===
              item.loaded_at
          )
      );

    const nextHistory = [
      item,
      ...filtered,
    ];

    await AsyncStorage.setItem(
      AQUA_LOADING_HISTORY_KEY,

      JSON.stringify(
        nextHistory
      )
    );
  } catch (error) {
    console.log(
      "SAVE AQUA HISTORY ERROR:",
      error
    );
  }
}

export async function getAllAquaLoadingHistory(): Promise<
  AquaLoadingHistoryItem[]
> {
  try {
    const raw =
      await AsyncStorage.getItem(
        AQUA_LOADING_HISTORY_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.log(
      "GET AQUA HISTORY ERROR:",
      error
    );

    return [];
  }
}

export async function getAquaLoadingHistoryByDate(
  dateKey: string
): Promise<
  AquaLoadingHistoryItem[]
> {
  const all =
    await getAllAquaLoadingHistory();

  return all
    .filter(
      (item) =>
        item.date_key ===
        dateKey
    )
    .sort((a, b) => {
      return (
        new Date(
          b.loaded_at
        ).getTime() -
        new Date(
          a.loaded_at
        ).getTime()
      );
    });
}