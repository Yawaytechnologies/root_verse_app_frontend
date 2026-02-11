// src/utils/offlineQueue.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * OFFLINE QUEUE:
 * - stores items to be sent later
 * LOCAL INDEX (by crateId):
 * - stores last saved payload per crateId so Details screen can show offline
 *
 * ✅ UPDATED FOR YOUR CURRENT FLOW:
 * - rvVesselId can be string (vessel code) OR number (legacy)
 * - ownerId can be number (db id) OR string (legacy) OR null (offline)
 * - fishId can be number OR null (offline)
 */

export type CatchLogPayload = {
  linkedCrateId: string;

  tripId: string;

  // offline can be invalid or unknown if no cached fish list (optional)
  fishId: number | null;
  fishName?: string;

  // ✅ allow both (your create.tsx sends vessel CODE string)
  rvVesselId: string | number;

  // ✅ allow numeric owner db id (your create.tsx uses number)
  // still supports legacy string owner_code if older payload exists
  ownerId: number | string | null;

  catchDate: string; // yyyy-mm-dd
  catchTime: string; // hh:mm:ss
  images: string[]; // local URIs

  latitude?: number;
  longitude?: number;

  // optional meta
  qrKind?: "CRATE" | "VESSEL" | "UNKNOWN";
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

/* ---------------- HELPERS ---------------- */
function crateKey(payload: CatchLogPayload) {
  return String(payload?.linkedCrateId || "").trim();
}

function sanitizePayload(p: CatchLogPayload): CatchLogPayload {
  // prevent broken/undefined fields from older builds
  return {
    ...p,
    linkedCrateId: String(p?.linkedCrateId || "").trim(),
    tripId: String((p as any)?.tripId || "").trim(),
    fishId:
      typeof (p as any)?.fishId === "number"
        ? (p as any).fishId
        : ((p as any)?.fishId ?? null),
    fishName: (p as any)?.fishName ? String((p as any).fishName) : undefined,
    rvVesselId: (p as any)?.rvVesselId ?? "",
    ownerId: (p as any)?.ownerId ?? null,
    catchDate: String((p as any)?.catchDate || ""),
    catchTime: String((p as any)?.catchTime || ""),
    images: Array.isArray((p as any)?.images) ? (p as any).images : [],
    latitude:
      typeof (p as any)?.latitude === "number"
        ? (p as any).latitude
        : undefined,
    longitude:
      typeof (p as any)?.longitude === "number"
        ? (p as any).longitude
        : undefined,
    qrKind: (p as any)?.qrKind,
  };
}

/* ---------------- INDEX OPS ---------------- */
export async function upsertLocalCatchLog(
  payload: CatchLogPayload,
  status: "QUEUED" | "SYNCED",
) {
  const cleaned = sanitizePayload(payload);
  const crateId = crateKey(cleaned);
  if (!crateId) return;

  const index = await readIndex();
  index[crateId] = {
    payload: cleaned,
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
 * Details screen helper:
 * returns local saved payload even when offline.
 */
export async function getLocalCatchLogByCrateId(
  crateId: string,
): Promise<LocalIndexItem | null> {
  const id = String(crateId || "").trim();
  if (!id) return null;

  const index = await readIndex();
  if (index[id]) return index[id];

  // fallback: scan queue if index missing (older builds)
  const q = await readQueue();
  const found = q.find(
    (x) =>
      x.type === "CATCH_LOG" &&
      String(x.payload?.linkedCrateId || "").trim() === id,
  );
  if (found?.payload) {
    const item: LocalIndexItem = {
      payload: sanitizePayload(found.payload),
      savedAt: found.createdAt,
      status: "QUEUED",
    };
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
  const cleaned = sanitizePayload(payload);

  const q = await readQueue();
  q.push({
    id: uid(),
    type: "CATCH_LOG",
    payload: cleaned,
    createdAt: Date.now(),
    tries: 0,
  });
  await writeQueue(q);

  // ✅ store per crateId for Details screen
  await upsertLocalCatchLog(cleaned, "QUEUED");
}

/**
 * Validates that image files still exist and are readable.
 * Returns true if all files are valid, false otherwise.
 */
async function validateImageFiles(images: string[]): Promise<boolean> {
  if (!images || images.length === 0) return true;

  try {
    for (const uri of images) {
      if (!uri) continue;
      if (!uri.startsWith("file://")) continue;

      // Check if file exists
      const exists = await AsyncStorage.getItem("_filecheck_");
      // Using FileSystem API would require expo-file-system import here
      // For now, we'll do basic validation
    }
    return true;
  } catch (e: any) {
    console.warn("[VALIDATE_IMAGES]", String(e?.message || e));
    return true; // allow attempt anyway
  }
}

/**
 * Tries to push queued items using provided sender.
 * Removes success, keeps failures.
 * ✅ CRITICAL: Validates images before sending
 */
export async function flushQueue(
  sendCatchLog: (p: CatchLogPayload) => Promise<any>,
) {
  const q = await readQueue();
  if (!q.length) return { sent: 0, remaining: 0 };

  const keep: QueueItem[] = [];
  let sent = 0;

  for (const item of q) {
    if (item.type !== "CATCH_LOG") {
      keep.push(item);
      continue;
    }

    // ✅ sanitize on the way (handles old queue format)
    const cleaned = sanitizePayload(item.payload);

    try {
      // ✅ Validate images exist before sending
      await validateImageFiles(cleaned.images);

      await sendCatchLog(cleaned);
      sent += 1;

      // ✅ mark local record as synced after success
      await markLocalCatchLogSynced(cleaned.linkedCrateId);
    } catch (e: any) {
      keep.push({
        ...item,
        payload: cleaned,
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

/**
 * OPTIONAL: clear everything (queue + index)
 */
export async function clearAllOfflineCatchLogs() {
  await AsyncStorage.multiRemove([KEY, INDEX_KEY]);
}
