// src/utils/qcFillQueue.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_BASE = "qc_fill_queue_v1";

export type TabStatus = "pending" | "checked" | "rejected";

export type QcFillQueuedItem = {
  id: string;
  qrCode: string;
  payload: any;

  createdAt: number;
  updatedAt?: number;

  synced: boolean;
  syncedAt?: number;

  lastError?: string;
};

function norm(code: string) {
  return String(code || "").trim().toUpperCase().replace(/\s+/g, "");
}

function safeArray(x: any): any[] {
  return Array.isArray(x) ? x : [];
}

// ✅ per-user storage key
function keyForUser(qcUserKey: string) {
  const u = norm(qcUserKey || "ANON");
  return `${KEY_BASE}:${u}`;
}

async function readAll(qcUserKey: string): Promise<QcFillQueuedItem[]> {
  const raw = await AsyncStorage.getItem(keyForUser(qcUserKey));
  const arr = raw ? JSON.parse(raw) : [];
  return safeArray(arr) as QcFillQueuedItem[];
}

async function writeAll(qcUserKey: string, items: QcFillQueuedItem[]) {
  await AsyncStorage.setItem(keyForUser(qcUserKey), JSON.stringify(items));
}

function getQcResultFromPayload(payload: any): string {
  const v =
    payload?.qc_result ??
    payload?.qcResult ??
    payload?.qc_status ??
    payload?.qcStatus ??
    payload?.status ??
    "";
  const r = String(v || "").trim().toUpperCase();

  if (r === "APPROVED") return "PASS";
  if (r === "CHECKED") return "PASS";
  if (r === "REJECTED") return "REJECT";
  return r;
}

export function deriveTabFromPayload(payload: any): TabStatus {
  const r = getQcResultFromPayload(payload);

  if (r === "HOLD") return "pending";
  if (r === "REJECT") return "rejected";
  if (r === "PASS") return "checked";

  const st = String(payload?.qc_status ?? payload?.qcStatus ?? "")
    .trim()
    .toUpperCase();
  if (st === "HOLD") return "pending";
  if (st === "REJECTED") return "rejected";
  if (st === "CHECKED") return "checked";

  return "pending";
}

// ✅ NEW: optional helper for logout / account switch
export async function clearQcFillQueue(qcUserKey: string) {
  await AsyncStorage.removeItem(keyForUser(qcUserKey));
}

export async function getQcFillQueue(qcUserKey: string): Promise<QcFillQueuedItem[]> {
  return await readAll(qcUserKey);
}

export async function removeQcFillById(qcUserKey: string, id: string) {
  const q = await readAll(qcUserKey);
  await writeAll(qcUserKey, q.filter((x) => x.id !== id));
}

/**
 * ✅ Upsert LOCAL draft
 * - Always sets synced=false (HOLD rule)
 */
export async function upsertQcFillDraft(qcUserKey: string, qrCode: string, payload: any) {
  const code = norm(qrCode);
  const q = await readAll(qcUserKey);

  const now = Date.now();
  const idx = q.findIndex((x) => norm(x.qrCode) === code);

  if (idx >= 0) {
    const prev = q[idx];
    q[idx] = {
      ...prev,
      qrCode: prev.qrCode || code,
      payload,
      updatedAt: now,
      synced: false,
      syncedAt: undefined,
      lastError: (payload as any)?._local?.last_error || prev.lastError,
    };
  } else {
    q.unshift({
      id: `${now}_${Math.random().toString(16).slice(2)}`,
      qrCode: code,
      payload,
      createdAt: now,
      updatedAt: now,
      synced: false,
    });
  }

  await writeAll(qcUserKey, q);
}

/**
 * ✅ Mark as synced (server submit success)
 */
export async function markQcFillSynced(qcUserKey: string, qrCode: string, payload: any) {
  const code = norm(qrCode);
  const q = await readAll(qcUserKey);

  const now = Date.now();
  const idx = q.findIndex((x) => norm(x.qrCode) === code);

  if (idx >= 0) {
    const prev = q[idx];
    q[idx] = {
      ...prev,
      payload,
      updatedAt: now,
      synced: true,
      syncedAt: now,
      lastError: undefined,
    };
  } else {
    q.unshift({
      id: `${now}_${Math.random().toString(16).slice(2)}`,
      qrCode: code,
      payload,
      createdAt: now,
      updatedAt: now,
      synced: true,
      syncedAt: now,
    });
  }

  await writeAll(qcUserKey, q);
}

/**
 * ✅ Mark submit failed but keep locally
 */
export async function markQcFillFailed(
  qcUserKey: string,
  qrCode: string,
  err: string,
  payload: any
) {
  const code = norm(qrCode);
  const q = await readAll(qcUserKey);

  const now = Date.now();
  const idx = q.findIndex((x) => norm(x.qrCode) === code);

  if (idx >= 0) {
    const prev = q[idx];
    q[idx] = {
      ...prev,
      payload,
      updatedAt: now,
      synced: false,
      syncedAt: undefined,
      lastError: err,
    };
  } else {
    q.unshift({
      id: `${now}_${Math.random().toString(16).slice(2)}`,
      qrCode: code,
      payload,
      createdAt: now,
      updatedAt: now,
      synced: false,
      lastError: err,
    });
  }

  await writeAll(qcUserKey, q);
}
