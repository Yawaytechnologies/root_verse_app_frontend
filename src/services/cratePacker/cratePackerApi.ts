// src/services/cratePacker/cratePackerApi.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { DivisionKey, PackedCrateItem } from "../../utils/cratePackerStorage";
import { getPackedList, setPackedList } from "../../utils/cratePackerStorage";

const USE_MOCKS = String(process.env.EXPO_PUBLIC_USE_MOCKS ?? "false") === "true";

const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://rootverse-backend-5qoo.onrender.com/"
).replace(/\/$/, "");

const TOKEN_KEY = "auth_token";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normCode(raw: string) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

async function readToken(): Promise<string | null> {
  try {
    const t = (await AsyncStorage.getItem(TOKEN_KEY)) || "";
    const tt = t.trim();
    return tt ? tt : null;
  } catch {
    return null;
  }
}

async function putJson(path: string, body: any, ms = 20000) {
  const token = await readToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

type ApiPackParams = {
  userId: string;
  packerName: string;
  division: DivisionKey;

  code: string;
  notes?: string;

  crateId?: number | string;       // MUST be DB id like 63
  grade?: string;                  // A/B/C/D
  weight?: number | string;        // total weight
  packerDbId?: number | string;    // MUST be numeric me.id
  payload?: any;                   // MUST include items[].qr_id
};

export async function apiListPacked(params: { userId: string; division: DivisionKey }) {
  if (USE_MOCKS) await sleep(250);
  return await getPackedList(params.userId, params.division);
}

/**
 * ✅ ONE submit => TWO backend actions
 * 1) PUT /api/crate/:id         { grade, total_weight, packer_id, status }
 * 2) PUT /api/qrs/update/:qrId  { crate_id }
 */
export async function apiPackCrate(params: ApiPackParams): Promise<{
  ok: boolean;
  mode: "LOCAL_ONLY" | "SERVER_OK" | "SERVER_FAILED";
  error?: string;
  server?: any;
}> {
  if (USE_MOCKS) await sleep(250);

  const code = normCode(params.code);
  if (!code) return { ok: false, mode: "LOCAL_ONLY", error: "Crate code missing" };

  const list = await getPackedList(params.userId, params.division);

  // prevent duplicates (local)
  const exists = list.some((x) => normCode(x.code) === code);
  if (exists) return { ok: false, mode: "LOCAL_ONLY", error: "Already packed (local)" };

  // local record first
  const item: PackedCrateItem = {
    id: uid(),
    code,
    division: String(params.division).toLowerCase() as any,
    packed_at: new Date().toISOString(),
    packer_id: params.userId, // local partition id
    packer_name: params.packerName,
    status: "PENDING",
    notes: params.notes,
    payload: params.payload,
  };

  await setPackedList(params.userId, params.division, [item, ...list]);

  if (USE_MOCKS) return { ok: true, mode: "LOCAL_ONLY" };

  // ---- validate required fields ----
  const crateIdNum = Number(params.crateId);
  if (!Number.isFinite(crateIdNum) || crateIdNum <= 0) {
    return {
      ok: true,
      mode: "SERVER_FAILED",
      error: `Invalid crateId (${String(params.crateId)}). Saved locally as PENDING.`,
    };
  }

  const pid = Number(params.packerDbId);
  if (!Number.isFinite(pid) || pid <= 0) {
    return {
      ok: true,
      mode: "SERVER_FAILED",
      error: `Invalid packerDbId (${String(params.packerDbId)}). Saved locally as PENDING.`,
    };
  }

  const grade = String(params.grade ?? "").trim().toUpperCase();
  if (!grade) {
    return { ok: true, mode: "SERVER_FAILED", error: "Missing grade. Saved locally as PENDING." };
  }

  const totalWeight =
    params.weight !== undefined && params.weight !== null
      ? Number(params.weight)
      : Number(params.payload?.total_weight_kg ?? params.payload?.totalWeightKg ?? NaN);

  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return {
      ok: true,
      mode: "SERVER_FAILED",
      error: `Invalid total weight (${String(params.weight)}). Saved locally as PENDING.`,
    };
  }

  // ---- collect fish qr ids ----
  const items: any[] = Array.isArray(params.payload?.items) ? params.payload.items : [];
  const fishQrIds: number[] = items
    .map((it) => Number(it?.qr_id ?? it?.qrId ?? it?.id ?? NaN))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!fishQrIds.length) {
    return {
      ok: true,
      mode: "SERVER_FAILED",
      error: "No fish qr_id found to link. Saved locally as PENDING.",
    };
  }

  try {
    // ✅ 1) Update crate row
    const crateBody = {
      grade,
      total_weight: Number(totalWeight.toFixed(2)),
      packer_id: pid,
      status: "CLOSED",
    };

    const crateResp = await putJson(`/api/crate/${crateIdNum}`, crateBody, 20000);

    // ✅ 2) Link fishes to crate
    const failed: number[] = [];
    for (const qrId of fishQrIds) {
      try {
        await putJson(`/api/qrs/update/${qrId}`, { crate_id: crateIdNum }, 20000);
      } catch {
        failed.push(qrId);
      }
    }

    // update local status
    const finalStatus = failed.length === 0 ? "SYNCED" : "FAILED";

    const updated: PackedCrateItem[] = [
      {
        ...item,
        status: finalStatus as any,
        payload: {
          ...(params.payload || {}),
          _server: {
            crate: crateResp,
            fish_link_failed: failed,
            fish_link_total: fishQrIds.length,
          },
        },
      },
      ...list,
    ];

    await setPackedList(params.userId, params.division, updated);

    if (failed.length) {
      return {
        ok: true,
        mode: "SERVER_FAILED",
        error: `Crate updated, but ${failed.length}/${fishQrIds.length} fish link failed.`,
        server: { crate: crateResp, failedFish: failed },
      };
    }

    return { ok: true, mode: "SERVER_OK", server: { crate: crateResp } };
  } catch (e: any) {
    return {
      ok: true,
      mode: "SERVER_FAILED",
      error: String(e?.message || "Server submit failed. Saved locally as PENDING."),
    };
  }
}