import AsyncStorage from "@react-native-async-storage/async-storage";

export type QcResult = "PASS" | "HOLD" | "REJECT";
export type QcGrade = "A" | "B" | "C" | "REJECTED";

export type QcDraft = {
  id: string; // local id
  crateQr: string; // scanned QR / crate id
  inspectorCode: string;

  qcResult: QcResult;
  qcGrade: QcGrade | null;
  qcScore: number | null;

  qcReason: string | null; // reject/hold reason
  remarks: string | null;

  inspectedAt: string; // ISO string
  synced: boolean; // false for now
  createdAt: number; // epoch ms
};

const QUEUE_KEY = "QC_QUEUE";
const LAST_PREFIX = "QC_LAST_";

const safeJsonParse = <T>(s: string | null, fallback: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
};

const uid = () =>
  `qc_${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random()
    .toString(16)
    .slice(2)}`;

export async function enqueueQcDraft(input: Omit<QcDraft, "id" | "synced" | "createdAt">) {
  const item: QcDraft = {
    id: uid(),
    synced: false,
    createdAt: Date.now(),
    ...input,
  };

  // 1) push into queue
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue = safeJsonParse<QcDraft[]>(raw, []);
  queue.unshift(item); // latest first
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

  // 2) save last QC per crate for UI display
  await AsyncStorage.setItem(`${LAST_PREFIX}${item.crateQr}`, JSON.stringify(item));

  return item;
}

export async function getQcQueueCount() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue = safeJsonParse<QcDraft[]>(raw, []);
  return queue.filter((q) => !q.synced).length;
}

export async function getLastQcForCrate(crateQr: string) {
  const raw = await AsyncStorage.getItem(`${LAST_PREFIX}${crateQr}`);
  return safeJsonParse<QcDraft | null>(raw, null);
}
