import AsyncStorage from "@react-native-async-storage/async-storage";

export type QcResult = "PASS" | "HOLD" | "REJECT";
export type QcGrade = "A" | "B" | "C" | "REJECTED";

export type QcDraft = {
  id: string;
  crateQr: string;
  inspectorCode: string;

  qcResult: QcResult;
  qcGrade: QcGrade | null;
  qcScore: number | null;

  qcReason: string | null;
  remarks: string | null;

  inspectedAt: string;
  synced: boolean;
  createdAt: number;
};

const QUEUE_KEY_BASE = "QC_QUEUE";
const LAST_KEY_BASE = "QC_LAST";

const safeJsonParse = <T>(s: string | null, fallback: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
};

const norm = (v: any) =>
  String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");

const uid = () =>
  `qc_${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random()
    .toString(16)
    .slice(2)}`;

// ✅ per-user keys
const queueKey = (inspectorCode: string) => `${QUEUE_KEY_BASE}:${norm(inspectorCode || "ANON")}`;
const lastKey = (inspectorCode: string, crateQr: string) =>
  `${LAST_KEY_BASE}:${norm(inspectorCode || "ANON")}:${norm(crateQr)}`;

// ✅ NEW: clear all "last" keys for a user (use on logout/account switch)
export async function clearQcDraftStorage(inspectorCode: string) {
  const qKey = queueKey(inspectorCode);

  const keys = await AsyncStorage.getAllKeys();
  const prefix = `${LAST_KEY_BASE}:${norm(inspectorCode || "ANON")}:`;
  const lastKeys = keys.filter((k) => k.startsWith(prefix));

  await AsyncStorage.multiRemove([qKey, ...lastKeys]);
}

export async function enqueueQcDraft(
  input: Omit<QcDraft, "id" | "synced" | "createdAt">
) {
  const item: QcDraft = {
    id: uid(),
    synced: false,
    createdAt: Date.now(),
    ...input,
  };

  // ✅ queue per inspector
  const qKey = queueKey(item.inspectorCode);
  const raw = await AsyncStorage.getItem(qKey);
  const queue = safeJsonParse<QcDraft[]>(raw, []);
  queue.unshift(item);
  await AsyncStorage.setItem(qKey, JSON.stringify(queue));

  // ✅ last per inspector + per crate
  await AsyncStorage.setItem(lastKey(item.inspectorCode, item.crateQr), JSON.stringify(item));

  return item;
}

export async function getQcQueueCount(inspectorCode: string) {
  const raw = await AsyncStorage.getItem(queueKey(inspectorCode));
  const queue = safeJsonParse<QcDraft[]>(raw, []);
  return queue.filter((q) => !q.synced).length;
}

export async function getLastQcForCrate(inspectorCode: string, crateQr: string) {
  const raw = await AsyncStorage.getItem(lastKey(inspectorCode, crateQr));
  return safeJsonParse<QcDraft | null>(raw, null);
}
