import AsyncStorage from "@react-native-async-storage/async-storage";

export type CatchLogPayload = {
  linkedCrateId: string;
  tripId: string;
  fishId: number;
  rvVesselId: number;
  ownerId: number;
  catchDate: string; // yyyy-mm-dd
  catchTime: string; // hh:mm:ss
  images: string[]; // local URIs
};

type QueueItem = {
  id: string; // local id
  type: "CATCH_LOG";
  payload: CatchLogPayload;
  createdAt: number;
  tries: number;
  lastError?: string;
};

const KEY = "OFFLINE_QUEUE_V1";

const uid = () =>
  `${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random()
    .toString(16)
    .slice(2)}`;

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
}

export async function getQueueCount() {
  const q = await readQueue();
  return q.length;
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
