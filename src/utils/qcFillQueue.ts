// src/utils/qcFillQueue.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "qc_fill_queue_v1";

export type TabStatus = "pending" | "checked" | "rejected";

export type QcFillQueuedItem = {
  id: string;
  qrCode: string;
  payload: any;
  createdAt: number;

  synced: boolean;
  syncedAt?: number;

  division?: string;
  updatedAt?: number;

  lastError?: string;
  lastErrorAt?: number;
};

function norm(code: string) {
  return String(code || "").trim().toUpperCase().replace(/\s+/g, "");
}

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function extractDivision(payload: any): string | undefined {
  return (
    payload?.division ||
    payload?._local?.division ||
    payload?.payload?.division ||
    undefined
  );
}

/** payload can be wrapped in different ways */
function unwrapPayload(payload: any) {
  if (!payload) return payload;
  if (payload?.payload && typeof payload.payload === "object") return payload.payload;
  return payload;
}

function extractQcResult(payload: any) {
  const p = unwrapPayload(payload);
  return upper(p?.qc_result ?? p?.qcResult ?? p?.result);
}

function extractQcStatus(payload: any) {
  const p = unwrapPayload(payload);
  return upper(p?.qc_status ?? p?.qcStatus ?? p?.status);
}

/**
 * ✅ SINGLE SOURCE OF TRUTH FOR TAB
 * PASS  -> checked
 * HOLD  -> pending
 * REJECT-> rejected
 *
 * fallback:
 * qc_status CHECKED -> checked
 * qc_status HOLD    -> pending
 * qc_status REJECTED-> rejected
 *
 * otherwise pending
 */
export function deriveTabFromPayload(payload: any): TabStatus {
  const r = extractQcResult(payload);
  if (r === "PASS") return "checked";
  if (r === "HOLD") return "pending";
  if (r === "REJECT") return "rejected";

  const s = extractQcStatus(payload);
  if (s === "CHECKED") return "checked";
  if (s === "HOLD") return "pending";
  if (s === "REJECTED") return "rejected";

  return "pending";
}

export async function getQcFillQueue(): Promise<QcFillQueuedItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  try {
    const arr = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(arr) ? (arr as QcFillQueuedItem[]) : [];
    // newest first (prefer updatedAt, fallback createdAt)
    return list.sort(
      (a, b) =>
        (b?.updatedAt || b?.createdAt || 0) - (a?.updatedAt || a?.createdAt || 0)
    );
  } catch {
    return [];
  }
}

async function setQueue(next: QcFillQueuedItem[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

/**
 * Create or update local draft (can be PASS/HOLD/REJECT)
 * - Used when server FAIL or when editing local item.
 *
 * IMPORTANT: This no longer means "Pending tab".
 * Tab is derived from qc_result/qc_status.
 */
export async function upsertQcFillDraft(qrCode: string, payload: any) {
  const code = norm(qrCode);
  const q = await getQcFillQueue();
  const now = Date.now();

  // update existing UNSYNCED item for same QR (latest local attempt)
  const idx = q.findIndex((x) => norm(x.qrCode) === code && !x.synced);

  const localErr =
    payload?._local?.last_error ??
    payload?._local?.lastError ??
    payload?._local?.error ??
    undefined;

  const localErrAt =
    payload?._local?.last_error_at ??
    payload?._local?.lastErrorAt ??
    payload?._local?.error_at ??
    undefined;

  if (idx >= 0) {
    const updated: QcFillQueuedItem = {
      ...q[idx],
      payload: { ...(q[idx].payload || {}), ...(payload || {}) },
      division: q[idx].division || extractDivision(payload),
      updatedAt: now,
      lastError: localErr ?? q[idx].lastError ?? undefined,
      lastErrorAt: localErrAt ?? q[idx].lastErrorAt ?? undefined,
      synced: false,
    };
    const next = [...q];
    next[idx] = updated;
    await setQueue(next);
    return updated;
  }

  const item: QcFillQueuedItem = {
    id: uid(),
    qrCode: code,
    payload,
    division: extractDivision(payload),
    createdAt: now,
    updatedAt: now,
    synced: false,
    lastError: localErr,
    lastErrorAt: localErrAt,
  };

  await setQueue([item, ...q]);
  return item;
}

/**
 * ✅ Create or update local SYNCED record (server success)
 * NOTE: "Checked" name kept for compatibility, but it stores ANY result (PASS/HOLD/REJECT) as synced.
 * Tab is derived from payload.
 */
export async function upsertQcFillChecked(qrCode: string, payload: any) {
  const code = norm(qrCode);
  const q = await getQcFillQueue();
  const now = Date.now();

  // update existing synced record for same QR
  const idx = q.findIndex((x) => norm(x.qrCode) === code && x.synced);

  if (idx >= 0) {
    const updated: QcFillQueuedItem = {
      ...q[idx],
      payload: { ...(q[idx].payload || {}), ...(payload || {}) },
      division: q[idx].division || extractDivision(payload),
      synced: true,
      syncedAt: q[idx].syncedAt || now,
      updatedAt: now,
      lastError: undefined,
      lastErrorAt: undefined,
    };
    const next = [...q];
    next[idx] = updated;
    await setQueue(next);
    return updated;
  }

  const item: QcFillQueuedItem = {
    id: uid(),
    qrCode: code,
    payload,
    division: extractDivision(payload),
    createdAt: now,
    updatedAt: now,
    synced: true,
    syncedAt: now,
  };

  await setQueue([item, ...q]);
  return item;
}

/**
 * Mark record as synced after server submit
 * - If unsynced record exists -> convert it to synced
 * - If none exists -> create synced record
 */
export async function markQcFillSynced(qrCode: string, patchPayload?: any) {
  const code = norm(qrCode);
  const q = await getQcFillQueue();
  const now = Date.now();

  // prefer unsynced record to convert
  let idx = q.findIndex((x) => norm(x.qrCode) === code && !x.synced);
  if (idx < 0) idx = q.findIndex((x) => norm(x.qrCode) === code);

  if (idx < 0) {
    return upsertQcFillChecked(code, patchPayload || {});
  }

  const updated: QcFillQueuedItem = {
    ...q[idx],
    synced: true,
    syncedAt: now,
    updatedAt: now,
    division:
      q[idx].division ||
      extractDivision(patchPayload) ||
      extractDivision(q[idx].payload),
    payload: { ...(q[idx].payload || {}), ...(patchPayload || {}) },
    lastError: undefined,
    lastErrorAt: undefined,
  };

  const next = [...q];
  next[idx] = updated;
  await setQueue(next);
  return updated;
}

/**
 * ✅ Mark/Store failure for UNSYNCED record
 * - Keeps payload (PASS/HOLD/REJECT) so item shows in correct tab even if submit failed.
 */
export async function markQcFillFailed(
  qrCode: string,
  error: string,
  patchPayload?: any
) {
  const code = norm(qrCode);
  const q = await getQcFillQueue();
  const now = Date.now();

  const idx = q.findIndex((x) => norm(x.qrCode) === code && !x.synced);

  const errText = String(error || "Failed");

  if (idx < 0) {
    // create unsynced record with error + payload
    return upsertQcFillDraft(code, {
      ...(patchPayload || {}),
      _local: {
        ...(patchPayload?._local || {}),
        last_error: errText,
        last_error_at: now,
      },
    });
  }

  const updated: QcFillQueuedItem = {
    ...q[idx],
    payload: {
      ...(q[idx].payload || {}),
      ...(patchPayload || {}),
      _local: {
        ...(q[idx].payload?._local || {}),
        ...(patchPayload?._local || {}),
        last_error: errText,
        last_error_at: now,
      },
    },
    division: q[idx].division || extractDivision(patchPayload),
    updatedAt: now,
    synced: false,
    lastError: errText,
    lastErrorAt: now,
  };

  const next = [...q];
  next[idx] = updated;
  await setQueue(next);
  return updated;
}

export async function removeQcFillById(id: string) {
  const q = await getQcFillQueue();
  const next = q.filter((x) => x.id !== id);
  await setQueue(next);
  return next;
}

/* ---------------- TAB HELPERS (FIXED) ---------------- */

export async function getQcFillAll(division?: string) {
  const q = await getQcFillQueue();
  if (!division) return q;
  const d = String(division).toUpperCase();
  return q.filter(
    (x) => String(x.division || extractDivision(x.payload) || "").toUpperCase() === d
  );
}

/** ✅ Pending tab = qc_result HOLD (or unknown) */
export async function getQcFillPending(division?: string) {
  const all = await getQcFillAll(division);
  return all.filter((x) => deriveTabFromPayload(x.payload) === "pending");
}

/** ✅ Checked tab = qc_result PASS */
export async function getQcFillChecked(division?: string) {
  const all = await getQcFillAll(division);
  return all.filter((x) => deriveTabFromPayload(x.payload) === "checked");
}

/** ✅ Rejected tab = qc_result REJECT */
export async function getQcFillRejected(division?: string) {
  const all = await getQcFillAll(division);
  return all.filter((x) => deriveTabFromPayload(x.payload) === "rejected");
}

/** Extra helpers if you want badges */
export async function getQcFillSyncedOnly(division?: string) {
  const all = await getQcFillAll(division);
  return all.filter((x) => x.synced);
}

export async function getQcFillUnsyncedOnly(division?: string) {
  const all = await getQcFillAll(division);
  return all.filter((x) => !x.synced);
}

/* ===================== DATE STATS (FIX) ===================== */

export type QcStats = {
  total: number;
  checked: number;
  pending: number;
  rejected: number;
  synced: number;
  unsynced: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYmdLocal(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * ✅ Stats filtered by Division + Selected Date (YYYY-MM-DD)
 * Use this for your top stat box so counts reset when you change date.
 */
export async function getQcStatsForDate(
  division?: string,
  ymd?: string
): Promise<QcStats> {
  const q = await getQcFillQueue();
  const divU = division ? String(division).toUpperCase() : "";
  const date = String(ymd || "").trim();

  const stats: QcStats = {
    total: 0,
    checked: 0,
    pending: 0,
    rejected: 0,
    synced: 0,
    unsynced: 0,
  };

  for (const x of q) {
    const p = unwrapPayload(x.payload);

    // division filter (robust)
    const d =
      String(x.division || "").toUpperCase() ||
      String(p?.division || "").toUpperCase() ||
      String(p?._local?.division || "").toUpperCase() ||
      String(extractDivision(x.payload) || "").toUpperCase();

    if (divU && d !== divU) continue;

    // date filter (same rule as list screen)
    const eventAt = x.synced ? x.syncedAt || x.createdAt : x.createdAt;
    if (date && toYmdLocal(eventAt) !== date) continue;

    stats.total += 1;

    if (x.synced) stats.synced += 1;
    else stats.unsynced += 1;

    const tab = deriveTabFromPayload(x.payload);
    if (tab === "checked") stats.checked += 1;
    else if (tab === "rejected") stats.rejected += 1;
    else stats.pending += 1;
  }

  return stats;
}
