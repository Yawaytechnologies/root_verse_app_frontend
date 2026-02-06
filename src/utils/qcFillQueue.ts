// src/utils/qcFillQueue.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "qc_fill_queue_v1";

export type TabStatus = "pending" | "checked" | "rejected";

export type QcFillQueuedItem = {
  id: string;
  qrCode: string;
  payload: any;

  createdAt: number; // first time created
  updatedAt?: number; // last local edit time

  synced: boolean; // true only when server submit succeeded
  syncedAt?: number;

  lastError?: string;
};

function norm(code: string) {
  return String(code || "").trim().toUpperCase().replace(/\s+/g, "");
}

function safeArray(x: any): any[] {
  return Array.isArray(x) ? x : [];
}

async function readAll(): Promise<QcFillQueuedItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  const arr = raw ? JSON.parse(raw) : [];
  return safeArray(arr) as QcFillQueuedItem[];
}

async function writeAll(items: QcFillQueuedItem[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
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

  // fallback: if qc_status says HOLD/REJECTED/CHECKED
  const st = String(payload?.qc_status ?? payload?.qcStatus ?? "").trim().toUpperCase();
  if (st === "HOLD") return "pending";
  if (st === "REJECTED") return "rejected";
  if (st === "CHECKED") return "checked";

  return "pending";
}

export async function getQcFillQueue(): Promise<QcFillQueuedItem[]> {
  return await readAll();
}

export async function removeQcFillById(id: string) {
  const q = await readAll();
  await writeAll(q.filter((x) => x.id !== id));
}

/**
 * ✅ Upsert LOCAL draft
 * - Always sets synced=false (HOLD rule)
 */
export async function upsertQcFillDraft(qrCode: string, payload: any) {
  const code = norm(qrCode);
  const q = await readAll();

  const now = Date.now();
  const idx = q.findIndex((x) => norm(x.qrCode) === code);

  if (idx >= 0) {
    const prev = q[idx];
    q[idx] = {
      ...prev,
      qrCode: prev.qrCode || code,
      payload,
      updatedAt: now,

      // ✅ draft = local only
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

  await writeAll(q);
}

/**
 * ✅ Mark as synced (server submit success)
 */
export async function markQcFillSynced(qrCode: string, payload: any) {
  const code = norm(qrCode);
  const q = await readAll();

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

  await writeAll(q);
}

/**
 * ✅ Mark submit failed but keep locally
 */
export async function markQcFillFailed(qrCode: string, err: string, payload: any) {
  const code = norm(qrCode);
  const q = await readAll();

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

  await writeAll(q);
}
