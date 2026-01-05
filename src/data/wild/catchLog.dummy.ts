// src/data/wild/catchlog.dummy.ts
// Single-file dummy CatchLog dataset + in-memory helpers (API fallback)

export type CatchLogItem = {
  id: string;                 // internal unique id
  catchId: string;            // C25xxxxx
  tripId: string;
  species: string;
  weightKg: number;
  catchDate: string;          // YYYY-MM-DD
  catchTime: string;          // HH:MM
  notes?: string;
  latitude?: string;
  longitude?: string;
  images?: string[];
  linkedCrateId?: string | null; // scanned QR = crateId
  createdAt: string;          // ISO timestamp
};

export type CatchLogCreatePayload = Omit<CatchLogItem, "id" | "createdAt">;

/** Seed dummy data */
export const CATCHLOG_DUMMY_SEED: CatchLogItem[] = [
  {
    id: "1",
    catchId: "C2501234",
    tripId: "T250057",
    species: "Yellowfin Tuna",
    weightKg: 120,
    catchDate: "2025-12-28",
    catchTime: "06:15",
    notes: "Net haul near coast",
    latitude: "10.7654",
    longitude: "79.8432",
    images: [],
    linkedCrateId: "RV-CRATE-000123",
    createdAt: "2025-12-28T06:20:00.000Z",
  },
  {
    id: "2",
    catchId: "C2505678",
    tripId: "T250043",
    species: "Red Snapper",
    weightKg: 42.5,
    catchDate: "2025-12-27",
    catchTime: "04:50",
    notes: "Good quality",
    latitude: "13.0827",
    longitude: "80.2707",
    images: [],
    linkedCrateId: null,
    createdAt: "2025-12-27T05:00:00.000Z",
  },
  {
    id: "3",
    catchId: "C2507777",
    tripId: "T250021",
    species: "Squid",
    weightKg: 18,
    catchDate: "2025-12-26",
    catchTime: "21:10",
    notes: "Night catch",
    latitude: "8.7642",
    longitude: "78.1348",
    images: [],
    linkedCrateId: "RV-CRATE-000222",
    createdAt: "2025-12-26T21:15:00.000Z",
  },
];

/** In-memory "DB" (resets on app reload) */
let _db: CatchLogItem[] = [...CATCHLOG_DUMMY_SEED];

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/** Reset dummy DB back to seed */
export function resetCatchLogDummyDb() {
  _db = [...CATCHLOG_DUMMY_SEED];
}

/** List all catch logs (latest first) */
export function listCatchLogs(): CatchLogItem[] {
  return [..._db].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Filter by crateId (QR) */
export function listCatchLogsByCrate(crateId: string): CatchLogItem[] {
  const id = String(crateId || "").trim();
  if (!id) return [];
  return listCatchLogs().filter((x) => x.linkedCrateId === id);
}

/** Filter by tripId */
export function listCatchLogsByTrip(tripId: string): CatchLogItem[] {
  const id = String(tripId || "").trim();
  if (!id) return [];
  return listCatchLogs().filter((x) => x.tripId === id);
}

/** Get one catch log by catchId */
export function getCatchLogByCatchId(catchId: string): CatchLogItem | null {
  const id = String(catchId || "").trim();
  if (!id) return null;
  return _db.find((x) => x.catchId === id) ?? null;
}

/** Create a new catch log (adds to top) */
export function createCatchLog(payload: CatchLogCreatePayload): CatchLogItem {
  const item: CatchLogItem = {
    id: uid(),
    createdAt: new Date().toISOString(),
    ...payload,
  };
  _db.unshift(item);
  return item;
}

/** Replace all data (handy for syncing from API into dummy store) */
export function setCatchLogs(items: CatchLogItem[]) {
  _db = Array.isArray(items) ? [...items] : [];
}

/** Read raw DB (debug) */
export function _debugGetDb(): CatchLogItem[] {
  return _db;
}
