// src/utils/qcFillQueue.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "qc_fill_queue_v1";

export type QcFillQueuedItem = {
  id: string;
  qrCode: string;
  payload: any;
  createdAt: number;

  synced: boolean;
  syncedAt?: number;

  // ✅ added (for tabs / details)
  division?: string;
  updatedAt?: number;

  // ✅ added (for pending error)
  lastError?: string;
  lastErrorAt?: number;
};

function norm(code: string) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
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
 * Create or update local pending draft (Pending tab)
 * - Used when server FAIL or when editing a pending item.
 */
export async function upsertQcFillDraft(qrCode: string, payload: any) {
  const code = norm(qrCode);
  const q = await getQcFillQueue();
  const now = Date.now();

  const idx = q.findIndex((x) => norm(x.qrCode) === code && !x.synced);

  if (idx >= 0) {
    const updated: QcFillQueuedItem = {
      ...q[idx],
      payload: { ...(q[idx].payload || {}), ...(payload || {}) },
      division: q[idx].division || extractDivision(payload),
      updatedAt: now,
      // when user edits, clear error optionally (keep if you want; now cleared)
      lastError: payload?._local?.last_error ?? q[idx].lastError ?? undefined,
      lastErrorAt: payload?._local?.last_error_at ?? q[idx].lastErrorAt ?? undefined,
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
    lastError: payload?._local?.last_error,
    lastErrorAt: payload?._local?.last_error_at,
  };

  await setQueue([item, ...q]);
  return item;
}

/**
 * ✅ Create or update local CHECKED record (Checked tab)
 * - Used when server SUCCESS and you want to show it in Checked tab.
 * - Server-first flow: if no local record exists, this WILL create one.
 */
export async function upsertQcFillChecked(qrCode: string, payload: any) {
  const code = norm(qrCode);
  const q = await getQcFillQueue();
  const now = Date.now();

  // update existing synced record (do not touch pending record)
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
 * - If a pending record exists → convert it to synced (move to Checked)
 * - If nothing exists (server-first success) → create synced record
 */
export async function markQcFillSynced(qrCode: string, patchPayload?: any) {
  const code = norm(qrCode);
  const q = await getQcFillQueue();
  const now = Date.now();

  // prefer pending record to convert
  let idx = q.findIndex((x) => norm(x.qrCode) === code && !x.synced);

  // else update any record (synced or not)
  if (idx < 0) idx = q.findIndex((x) => norm(x.qrCode) === code);

  // if nothing exists -> create checked
  if (idx < 0) {
    return upsertQcFillChecked(code, patchPayload || {});
  }

  const updated: QcFillQueuedItem = {
    ...q[idx],
    synced: true,
    syncedAt: now,
    updatedAt: now,
    division: q[idx].division || extractDivision(patchPayload) || extractDivision(q[idx].payload),
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
 * ✅ Mark/Store failure for pending record (Pending tab)
 * - If pending exists -> update error
 * - If none exists (server-first fail) -> create pending
 */
export async function markQcFillFailed(qrCode: string, error: string, patchPayload?: any) {
  const code = norm(qrCode);
  const q = await getQcFillQueue();
  const now = Date.now();

  const idx = q.findIndex((x) => norm(x.qrCode) === code && !x.synced);

  if (idx < 0) {
    // create pending draft
    return upsertQcFillDraft(code, {
      ...(patchPayload || {}),
      _local: {
        ...(patchPayload?._local || {}),
        last_error: String(error || "Failed"),
        last_error_at: now,
      },
    });
  }

  const updated: QcFillQueuedItem = {
    ...q[idx],
    payload: { ...(q[idx].payload || {}), ...(patchPayload || {}) },
    division: q[idx].division || extractDivision(patchPayload),
    updatedAt: now,
    synced: false,
    lastError: String(error || "Failed"),
    lastErrorAt: now,
  };

  const next = [...q];
  next[idx] = updated;
  await setQueue(next);
  return updated;
}

/**
 * ✅ DELETE ONE LOCAL RECORD (used for wrong pending)
 */
export async function removeQcFillById(id: string) {
  const q = await getQcFillQueue();
  const next = q.filter((x) => x.id !== id);
  await setQueue(next);
  return next;
}

/**
 * ✅ List helpers for Tabs
 */
export async function getQcFillAll(division?: string) {
  const q = await getQcFillQueue();
  if (!division) return q;
  const d = String(division).toUpperCase();
  return q.filter((x) => String(x.division || extractDivision(x.payload) || "").toUpperCase() === d);
}

export async function getQcFillPending(division?: string) {
  const all = await getQcFillAll(division);
  return all.filter((x) => !x.synced);
}

export async function getQcFillChecked(division?: string) {
  const all = await getQcFillAll(division);
  return all.filter((x) => x.synced);
}
