// src/utils/offlineQueue.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * OFFLINE QUEUE:
 * - stores items to be sent later
 * LOCAL INDEX (by crateId):
 * - stores last saved payload per crateId so Details screen can show offline
 */

export type CatchLogPayload = {
  linkedCrateId: string;

  tripId: string;

  // offline can be invalid or unknown if no cached fish list (optional)
  fishId: number | null;
  fishName?: string; // store name so you can map to real id later

  rvVesselId: number;

  // IMPORTANT: offline allowed => null
  // If your backend expects owner_id string (OWN-0001), keep it string
  ownerId: string | null;

  catchDate: string; // yyyy-mm-dd
  catchTime: string; // hh:mm:ss
  images: string[]; // local URIs

  latitude?: number;
  longitude?: number;
};

type QueueItem = {
  id: string; // local id
  type: "CATCH_LOG";
  payload: CatchLogPayload;
  createdAt: number;
  tries: number;
  lastError?: string;
};

type LocalIndexItem = {
  payload: CatchLogPayload;
  savedAt: number;
  status: "QUEUED" | "SYNCED";
};

type LocalIndex = Record<string, LocalIndexItem>;

const KEY = "OFFLINE_QUEUE_V1";
const INDEX_KEY = "OFFLINE_CATCHLOG_INDEX_V1";

const uid = () =>
  `${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random()
    .toString(16)
    .slice(2)}`;

/* ---------------- QUEUE READ/WRITE ---------------- */
async function readQueue(): Promise<QueueItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(q: QueueItem[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(q));
}

/* ---------------- INDEX READ/WRITE ---------------- */
async function readIndex(): Promise<LocalIndex> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeIndex(index: LocalIndex) {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export async function upsertLocalCatchLog(payload: CatchLogPayload, status: "QUEUED" | "SYNCED") {
  const crateId = String(payload?.linkedCrateId || "").trim();
  if (!crateId) return;

  const index = await readIndex();
  index[crateId] = {
    payload,
    savedAt: Date.now(),
    status,
  };
  await writeIndex(index);
}

export async function markLocalCatchLogSynced(crateId: string) {
  const id = String(crateId || "").trim();
  if (!id) return;

  const index = await readIndex();
  if (!index[id]) return;

  index[id] = {
    ...index[id],
    status: "SYNCED",
    savedAt: Date.now(),
  };
  await writeIndex(index);
}

/**
 * THIS is what your Details screen needs.
 * It returns local saved payload even when offline.
 */
export async function getLocalCatchLogByCrateId(crateId: string): Promise<LocalIndexItem | null> {
  const id = String(crateId || "").trim();
  if (!id) return null;

  const index = await readIndex();
  if (index[id]) return index[id];

  // fallback: scan queue if index missing (older builds)
  const q = await readQueue();
  const found = q.find((x) => x.type === "CATCH_LOG" && x.payload?.linkedCrateId === id);
  if (found?.payload) {
    const item: LocalIndexItem = { payload: found.payload, savedAt: found.createdAt, status: "QUEUED" };
    // write it for next time
    const idx = await readIndex();
    idx[id] = item;
    await writeIndex(idx);
    return item;
  }

  return null;
}

export async function getQueueCount() {
  const q = await readQueue();
  return q.length;
}

export async function enqueueCatchLog(payload: CatchLogPayload) {
  const q = await readQueue();
  q.push({
    id: uid(),
    type: "CATCH_LOG",
    payload,
    createdAt: Date.now(),
    tries: 0,
  });
  await writeQueue(q);

  // ✅ store per crateId for Details screen
  await upsertLocalCatchLog(payload, "QUEUED");
}

/**
 * Tries to push queued items using provided sender.
 * Removes success, keeps failures.
 */
export async function flushQueue(sendCatchLog: (p: CatchLogPayload) => Promise<any>) {
  const q = await readQueue();
  if (!q.length) return { sent: 0, remaining: 0 };

  const keep: QueueItem[] = [];
  let sent = 0;

  for (const item of q) {
    if (item.type !== "CATCH_LOG") {
      keep.push(item);
      continue;
    }

    try {
      await sendCatchLog(item.payload);
      sent += 1;

      // ✅ mark local record as synced after success
      await markLocalCatchLogSynced(item.payload.linkedCrateId);
    } catch (e: any) {
      keep.push({
        ...item,
        tries: (item.tries ?? 0) + 1,
        lastError: String(e?.message || e),
      });
    }
  }

  await writeQueue(keep);
  return { sent, remaining: keep.length };
}

export async function clearQueue() {
  await AsyncStorage.removeItem(KEY);
}

export async function clearLocalIndex() {
  await AsyncStorage.removeItem(INDEX_KEY);
}
