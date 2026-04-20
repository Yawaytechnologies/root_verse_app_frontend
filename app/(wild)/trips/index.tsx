// app/(wild)/trips/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { useAppSelector } from "../../../src/store/hooks";
import { tripApi, Trip } from "../../../src/services/wild/tripApi";

type TripStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ONGOING"
  | "COMPLETED"
  | "UNKNOWN";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
const FILTERS: StatusFilter[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED"];

const API_BASE = "https://rootverse-backend-5qoo.onrender.com";

/** ---------------- OFFLINE CACHE ---------------- */
type TripsCache = {
  ownerCode: string;
  savedAt: number;
  trips: Trip[];
};

const TRIPS_CACHE_PREFIX = "OFFLINE_TRIPS_CACHE_V1:";
const cacheKey = (ownerCode: string) => `${TRIPS_CACHE_PREFIX}${String(ownerCode).trim()}`;

async function saveTripsCache(ownerCode: string, trips: Trip[]) {
  const key = cacheKey(ownerCode);
  const payload: TripsCache = {
    ownerCode: String(ownerCode).trim(),
    savedAt: Date.now(),
    trips: Array.isArray(trips) ? trips : [],
  };
  await AsyncStorage.setItem(key, JSON.stringify(payload));
}

async function readTripsCache(ownerCode: string): Promise<TripsCache | null> {
  try {
    const key = cacheKey(ownerCode);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.trips)) return null;
    return parsed as TripsCache;
  } catch {
    return null;
  }
}

/** ---------------- COMPLETE QUEUE (offline-safe) ---------------- */
type CompleteQueueItem = {
  id: string; // trip row id
  tripId?: string; // trip_id
  at: number;
};

const COMPLETE_QUEUE_PREFIX = "TRIP_COMPLETE_QUEUE_V1:";
const completeQueueKey = (ownerCode: string) =>
  `${COMPLETE_QUEUE_PREFIX}${String(ownerCode).trim()}`;

async function readCompleteQueue(ownerCode: string): Promise<CompleteQueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(completeQueueKey(ownerCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCompleteQueue(ownerCode: string, items: CompleteQueueItem[]) {
  await AsyncStorage.setItem(completeQueueKey(ownerCode), JSON.stringify(items ?? []));
}

async function enqueueComplete(ownerCode: string, item: CompleteQueueItem) {
  const q = await readCompleteQueue(ownerCode);
  if (q.some((x) => String(x.id) === String(item.id))) return;
  q.unshift(item);
  await writeCompleteQueue(ownerCode, q);
}

/** ---------------- UI Helpers ---------------- */
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`rounded-2xl border border-[#ead7c8] bg-white ${className}`}
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}

function StatusChip({ status }: { status: TripStatus }) {
  const tone =
    status === "APPROVED" || status === "ONGOING"
      ? "bg-[#e8f7ea] text-[#136f2d] border-[#bfe9c7]"
      : status === "PENDING"
      ? "bg-[#fff1d6] text-[#9a5b00] border-[#ffd89a]"
      : status === "REJECTED"
      ? "bg-[#ffe1e1] text-[#9b1c1c] border-[#ffc2c2]"
      : status === "COMPLETED"
      ? "bg-[#eef2ff] text-[#3730a3] border-[#c7d2fe]"
      : "bg-[#eef2f6] text-[#4b5563] border-[#e5e7eb]";

  return (
    <View className={`shrink-0 rounded-full border px-3 py-1 ${tone}`}>
      <Text className="text-xs font-extrabold">{status}</Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: StatusFilter;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mr-2 rounded-full border px-4 py-2 active:opacity-80"
      style={{
        borderColor: active ? "#a06b2a" : "#ead7c8",
        backgroundColor: active ? "#fff1d6" : "#ffffff",
      }}
    >
      <Text
        className="font-extrabold"
        style={{ color: active ? "#7a4a12" : "#2b2b2b", fontSize: 13 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Row({ label, value }: { label: string; value?: any }) {
  const v = normalizeText(value) || "-";
  return (
    <View className="py-2">
      <Text className="text-[12px] font-bold text-[#7a6f66]">{label}</Text>
      <Text className="mt-1 text-[15px] font-extrabold text-[#2b2b2b]">{v}</Text>
    </View>
  );
}

/** ---------------- Robust value normalizers ---------------- */
function normalizeText(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if (!s) return "";
  const low = s.toLowerCase();
  if (low === "null" || low === "undefined" || low === "nan") return "";
  return s;
}

function normalizeIsoish(s: string): string {
  // handles "2026-02-11 12:13:00+00" -> "2026-02-11T12:13:00+00:00"
  let x = String(s || "").trim();
  if (!x) return x;

  // replace first space date-time separator
  if (/^\d{4}-\d{2}-\d{2}\s+\d/.test(x)) x = x.replace(" ", "T");

  // timezone "+00" or "-05" -> "+00:00" / "-05:00"
  if (/[+-]\d{2}$/.test(x)) x = x + ":00";

  return x;
}

function parseDateMs(v: any): number {
  const s = normalizeText(v);
  if (!s) return NaN;
  const iso = normalizeIsoish(s);
  const d = new Date(iso);
  const ms = d.getTime();
  return Number.isNaN(ms) ? NaN : ms;
}

function fmtDateTime(value?: any) {
  const s = normalizeText(value);
  if (!s) return "-";
  const d = new Date(normalizeIsoish(s));
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

function pickObjLabel(v: any): string {
  if (typeof v === "string" || typeof v === "number") return normalizeText(v) || "-";
  if (v && typeof v === "object") {
    return (
      normalizeText(v.name) ||
      normalizeText(v.location_name) ||
      normalizeText(v.station_name) ||
      normalizeText(v.code) ||
      "-"
    );
  }
  return "-";
}

function pickMethodLabel(tt: any): string {
  return (
    normalizeText(tt?.method_name) ||
    normalizeText(tt?.methodName) ||
    normalizeText(tt?.fishing_method) ||
    normalizeText(tt?.method) ||
    "Trawling"
  );
}

function pickLandingLabel(tt: any): string {
  // ✅ IMPORTANT: use location_name first (your details API returns this)
  return (
    normalizeText(tt?.location_name) ||
    normalizeText(tt?.locationName) ||
    normalizeText(tt?.landing_center) ||
    normalizeText(tt?.landingCenter) ||
    normalizeText(tt?.near_station) ||
    normalizeText(tt?.nearStation) ||
    normalizeText(tt?.location?.name) ||
    "-"
  );
}

function pickVesselId(tt: any): string {
  const v =
    tt?.vessel_id ??
    tt?.vesselId ??
    tt?.vessel ??
    tt?.vessel?.id ??
    tt?.vessel?.vessel_id ??
    tt?.vessel?.vesselId;

  const s = normalizeText(v);
  return s || "-";
}

function pickVesselNameFromTrip(tt: any): string {
  return (
    normalizeText(tt?.vessel_name) ||
    normalizeText(tt?.vesselName) ||
    normalizeText(tt?.vessel?.name) ||
    normalizeText(tt?.vessel?.vessel_name) ||
    normalizeText(tt?.vessel?.registered_name) ||
    ""
  );
}

/** ---------------- Vessel cache (name by id) ---------------- */
function extractVesselsArray(parsed: any): any[] {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.vessels)) return parsed.vessels;
  if (Array.isArray(parsed?.data)) return parsed.data;
  if (Array.isArray(parsed?.items)) return parsed.items;
  return [];
}

function vesselNameFromObj(v: any): string {
  return (
    normalizeText(v?.name) ||
    normalizeText(v?.vessel_name) ||
    normalizeText(v?.registered_name) ||
    ""
  );
}

function vesselIdFromObj(v: any): string {
  return normalizeText(v?.id ?? v?.vessel_id ?? v?.vesselId ?? v?.vesselID) || "";
}

/** ✅ NEW: RV Vessel Id / Code from vessel object */
function vesselRvIdFromObj(v: any): string {
  return (
    normalizeText(
      v?.rv_vessel_id ??
        v?.rvVesselId ??
        v?.rvVesselID ??
        v?.rv_vessel_code ??
        v?.rvVesselCode ??
        v?.rv_id ??
        v?.rvId
    ) || ""
  );
}

async function readVesselNameMap(ownerCode: string): Promise<Record<string, string>> {
  const oc = String(ownerCode).trim();
  if (!oc) return {};

  // try common cache keys used in your project
  const keys = [
    `rv_vessels_cache_owner_${oc}`,
    `rv_vessels_cache_owner_${oc.toLowerCase()}`,
    `RV_VESSELS_CACHE_OWNER_${oc}`,
    `OFFLINE_VESSELS_CACHE_V1:${oc}`,
    `OFFLINE_VESSELS_CACHE_V1:${oc.toLowerCase()}`,
    `rv_vessels_cache_v1`,
    `RV_VESSELS_CACHE_V1`,
  ];

  for (const key of keys) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const arr = extractVesselsArray(parsed);
      if (!arr.length) continue;

      const map: Record<string, string> = {};
      for (const v of arr) {
        const id = vesselIdFromObj(v);
        const name = vesselNameFromObj(v);
        if (id && name) map[id] = name;
      }
      if (Object.keys(map).length) return map;
    } catch {
      // ignore and try next key
    }
  }

  return {};
}

/** ✅ NEW: Vessel RV map (numeric vessel id -> RV vessel id/code) */
async function readVesselRvIdMap(ownerCode: string): Promise<Record<string, string>> {
  const oc = String(ownerCode).trim();
  if (!oc) return {};

  const keys = [
    `rv_vessels_cache_owner_${oc}`,
    `rv_vessels_cache_owner_${oc.toLowerCase()}`,
    `RV_VESSELS_CACHE_OWNER_${oc}`,
    `OFFLINE_VESSELS_CACHE_V1:${oc}`,
    `OFFLINE_VESSELS_CACHE_V1:${oc.toLowerCase()}`,
    `rv_vessels_cache_v1`,
    `RV_VESSELS_CACHE_V1`,
  ];

  for (const key of keys) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const arr = extractVesselsArray(parsed);
      if (!arr.length) continue;

      const map: Record<string, string> = {};
      for (const v of arr) {
        const id = vesselIdFromObj(v);
        const rv = vesselRvIdFromObj(v);
        if (id && rv) map[id] = rv;
      }

      if (Object.keys(map).length) return map;
    } catch {
      // try next key
    }
  }

  return {};
}

/** ---------------- Status logic ---------------- */
function normalizeTripStatus(raw: any): TripStatus {
  const v =
    raw && typeof raw === "object"
      ? raw.status ?? raw.value ?? raw.name ?? raw.state ?? raw.approval_status
      : raw;

  const s = normalizeText(v).toLowerCase();

  if (!s) return "PENDING";

  if (["requested", "request", "submitted", "created", "new"].includes(s)) return "PENDING";
  if (s === "pending") return "PENDING";
  if (s === "approved") return "APPROVED";
  if (s === "rejected") return "REJECTED";
  if (s === "ongoing" || s === "inprogress" || s === "in_progress") return "ONGOING";
  if (s === "completed" || s === "complete" || s === "done") return "COMPLETED";

  const up = s.toUpperCase().trim();
  if (
    up === "PENDING" ||
    up === "APPROVED" ||
    up === "REJECTED" ||
    up === "ONGOING" ||
    up === "COMPLETED"
  ) {
    return up as TripStatus;
  }

  return "PENDING";
}

function isTripCompleted(t: any): boolean {
  if (t?.completed === true || t?.is_completed === true) return true;
  if (
    normalizeText(t?.completed_at) ||
    normalizeText(t?.completedAt) ||
    normalizeText(t?.completed_on)
  )
    return true;

  const raw =
    t?.trip_status ??
    t?.tripStatus ??
    t?.completion_status ??
    t?.completionStatus ??
    t?.status ??
    t?.state ??
    t?.approval_status ??
    t?.approvalStatus;

  const s = normalizeText(raw).toLowerCase();
  return s === "completed" || s === "complete" || s === "done";
}

function tripSortMs(tt: any): number {
  const p =
    parseDateMs(tt?.planned_at ?? tt?.plannedAt ?? tt?.planned_on) ||
    parseDateMs(tt?.created_at ?? tt?.createdAt) ||
    0;

  return Number.isFinite(p) ? p : 0;
}

function mapTripToUi(t: Trip, vesselNameMap: Record<string, string>) {
  const tt: any = t as any;

  const statusRaw =
    tt?.approval_status ??
    tt?.approvalStatus ??
    tt?.admin_status ??
    tt?.trip_status ??
    tt?.tripStatus ??
    tt?.status ??
    tt?.state;

  const completed = isTripCompleted(tt);
  const status: TripStatus = completed ? "COMPLETED" : normalizeTripStatus(statusRaw);

  const landing = pickLandingLabel(tt);
  const vesselId = pickVesselId(tt);

  const tripIdStr =
    normalizeText(tt?.trip_id) ||
    normalizeText(tt?.tripId) ||
    normalizeText(tt?.trip_code) ||
    normalizeText(tt?.code) ||
    "";

  // ✅ Planned: prefer planned_at, else fallback to created_at
  const planned = fmtDateTime(
    tt?.planned_at ?? tt?.plannedAt ?? tt?.planned_on ?? tt?.created_at ?? tt?.createdAt
  );

  // ✅ Vessel label: show name + id
  const vesselName =
    pickVesselNameFromTrip(tt) ||
    (vesselId !== "-" ? normalizeText(vesselNameMap[vesselId]) : "");
  const vesselLabel =
    vesselName && vesselId !== "-"
      ? `${vesselName} (${vesselId})`
      : vesselName
      ? vesselName
      : vesselId;

  return {
    id: tt?.id,
    tripId: tripIdStr,
    tripName: tripIdStr || "-",
    method: pickMethodLabel(tt),
    landingCenter: landing,
    locationCode: landing,
    plannedTripDateTime: planned,
    status,
    vesselId,
    vesselLabel,
  };
}

/** ---------------- COMPLETE PUT API ---------------- */
async function safeJson(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text || null;
  }
}

async function completeTripPut(tripIdRow: any, token?: string) {
  const url = `${API_BASE}/api/trip/${encodeURIComponent(String(tripIdRow))}/complete`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await safeJson(res);

  if (!res.ok) {
    const msg =
      (json && typeof json === "object" && (json as any)?.message) ||
      (json && typeof json === "object" && (json as any)?.error) ||
      (typeof json === "string" ? json : "") ||
      `Complete failed (${res.status})`;
    throw new Error(msg);
  }

  const data = (json && typeof json === "object" && ((json as any).data ?? json)) ?? json;
  return data;
}

/** ---------------- GET TRIP DETAILS API ---------------- */
async function fetchTripDetailsByRowId(tripRowId: any, token?: string) {
  const url = `${API_BASE}/api/trip/${encodeURIComponent(String(tripRowId))}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await safeJson(res);

  if (!res.ok) {
    const msg =
      (json && typeof json === "object" && (json as any)?.message) ||
      (json && typeof json === "object" && (json as any)?.error) ||
      (typeof json === "string" ? json : "") ||
      `Fetch failed (${res.status})`;
    throw new Error(msg);
  }

  const data = (json && typeof json === "object" && ((json as any).data ?? json)) ?? json;
  return data as any;
}

export default function MyTrips() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  /**
   * ✅ FIXED:
   * current login/auth owner is checked FIRST
   * stale me slice is checked LAST
   */
  const ownerFromStore = useAppSelector((s: any) => {
    return (
      s.login?.user?.owner_code ??
      s.login?.user?.owner_id ??
      s.auth?.me?.owner_code ??
      s.auth?.me?.owner_id ??
      s.me?.me?.owner_code ??
      s.me?.me?.owner_id ??
      null
    );
  });

  const token: string | undefined = useAppSelector((s: any) => {
    return s.login?.token ?? s.auth?.token ?? undefined;
  });

  const initialOwner =
    ownerFromStore !== null &&
    ownerFromStore !== undefined &&
    String(ownerFromStore).trim().length > 0
      ? String(ownerFromStore).trim()
      : null;

  const [ownerCode, setOwnerCode] = useState<string | null>(initialOwner);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [offlineNote, setOfflineNote] = useState<string | null>(null);

  const flushingRef = useRef(false);

  /** ✅ vessel name map (id -> name) */
  const [vesselNameMap, setVesselNameMap] = useState<Record<string, string>>({});
  /** ✅ NEW: vessel rv id map (id -> rv vessel id/code) */
  const [vesselRvIdMap, setVesselRvIdMap] = useState<Record<string, string>>({});

  /** --------- DETAILS MODAL STATE --------- */
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsOfflineNote, setDetailsOfflineNote] = useState<string | null>(null);
  const [detailsTripRowId, setDetailsTripRowId] = useState<any>(null);
  const [detailsData, setDetailsData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const hasStoreOwner =
          ownerFromStore !== null &&
          ownerFromStore !== undefined &&
          String(ownerFromStore).trim().length > 0;

        if (hasStoreOwner) {
          if (mounted) setOwnerCode(String(ownerFromStore).trim());
          return;
        }

        const stored =
          (await AsyncStorage.getItem("owner_code")) || (await AsyncStorage.getItem("owner_id"));

        if (mounted) setOwnerCode(stored ? String(stored).trim() : null);
      } catch {
        const fallback =
          ownerFromStore !== null &&
          ownerFromStore !== undefined &&
          String(ownerFromStore).trim().length > 0
            ? String(ownerFromStore).trim()
            : null;

        if (mounted) setOwnerCode(fallback);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ownerFromStore]);

  /** ✅ load vessel cache maps whenever ownerCode changes */
  useEffect(() => {
    const oc = String(ownerCode ?? "").trim();
    if (!oc) return;
    (async () => {
      const nameMap = await readVesselNameMap(oc);
      if (Object.keys(nameMap).length) setVesselNameMap(nameMap);

      const rvMap = await readVesselRvIdMap(oc);
      if (Object.keys(rvMap).length) setVesselRvIdMap(rvMap);
    })();
  }, [ownerCode]);

  const flushCompleteQueue = useCallback(
    async (oc: string) => {
      if (!oc) return;
      if (flushingRef.current) return;

      flushingRef.current = true;
      try {
        const net = await NetInfo.fetch();
        const isOnline = !!net.isConnected && (net.isInternetReachable ?? true);
        if (!isOnline) return;

        const queue = await readCompleteQueue(oc);
        if (!queue.length) return;

        const remaining: CompleteQueueItem[] = [];
        for (const item of queue) {
          try {
            await completeTripPut(item.id, token);
          } catch {
            remaining.push(item);
          }
        }

        await writeCompleteQueue(oc, remaining);

        if (queue.length !== remaining.length) setOfflineNote(null);
      } finally {
        flushingRef.current = false;
      }
    },
    [token]
  );

  const loadTrips = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = !!opts?.silent;
      const oc = String(ownerCode ?? "").trim();

      try {
        if (!silent) setLoading(true);
        setError(null);
        setOfflineNote(null);

        if (!oc) {
          setTrips([]);
          setError("Owner code missing. Save owner_code after login (ex: OWN-0001).");
          return;
        }

        // ✅ refresh vessel maps (helps offline too)
        try {
          const nameMap = await readVesselNameMap(oc);
          if (Object.keys(nameMap).length) setVesselNameMap(nameMap);

          const rvMap = await readVesselRvIdMap(oc);
          if (Object.keys(rvMap).length) setVesselRvIdMap(rvMap);
        } catch {}

        const net = await NetInfo.fetch();
        const isOnline = !!net.isConnected && (net.isInternetReachable ?? true);

        if (!isOnline) {
          const cached = await readTripsCache(oc);
          if (cached?.trips?.length) {
            setTrips(cached.trips);
            setOfflineNote(
              `Offline: showing saved trips (${new Date(cached.savedAt).toLocaleString()})`
            );
            return;
          }
          setTrips([]);
          setError("Offline and no saved trips found yet. Connect once to cache trips.");
          return;
        }

        const data = await tripApi.fetchTripsByOwnerCode(oc, token, undefined as any);
        const list = Array.isArray(data) ? data : [];
        setTrips(list);
        await saveTripsCache(oc, list);

        await flushCompleteQueue(oc);
      } catch (e: any) {
        const oc2 = String(ownerCode ?? "").trim();
        if (oc2) {
          const cached = await readTripsCache(oc2);
          if (cached?.trips?.length) {
            setTrips(cached.trips);
            setOfflineNote(
              `Using saved trips (API failed) · ${new Date(cached.savedAt).toLocaleString()}`
            );
            return;
          }
        }
        setTrips([]);
        setError(e?.message || "Failed to load trips");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [ownerCode, token, flushCompleteQueue]
  );

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  useEffect(() => {
    const oc = String(ownerCode ?? "").trim();
    if (!oc) return;

    const unsub = NetInfo.addEventListener((state) => {
      const isOnline = !!state.isConnected && (state.isInternetReachable ?? true);
      if (isOnline) flushCompleteQueue(oc);
    });

    return () => unsub();
  }, [ownerCode, flushCompleteQueue]);

  /** ✅ sort trips by planned_at/created_at (latest first) */
  const sortedTrips = useMemo(() => {
    const arr = Array.isArray(trips) ? [...trips] : [];
    arr.sort((a: any, b: any) => {
      const ta = tripSortMs(a);
      const tb = tripSortMs(b);
      return tb - ta; // latest first
    });
    return arr;
  }, [trips]);

  const uiTrips = useMemo(
    () => sortedTrips.map((t) => mapTripToUi(t, vesselNameMap)),
    [sortedTrips, vesselNameMap]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = uiTrips;

    if (statusFilter !== "ALL") list = list.filter((t) => t.status === statusFilter);

    if (!term) return list;

    return list.filter((t) => {
      return (
        t.tripId.toLowerCase().includes(term) ||
        t.method.toLowerCase().includes(term) ||
        t.landingCenter.toLowerCase().includes(term) ||
        t.status.toLowerCase().includes(term) ||
        String(t.vesselId).toLowerCase().includes(term) ||
        String(t.vesselLabel).toLowerCase().includes(term) ||
        String(t.plannedTripDateTime).toLowerCase().includes(term)
      );
    });
  }, [q, uiTrips, statusFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTrips({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadTrips]);

  const markTripCompleted = useCallback(
    async (tripRowId: any, tripId: string) => {
      const oc = String(ownerCode ?? "").trim();
      if (!oc) {
        Alert.alert("Owner missing", "Owner code missing. Login again.");
        return;
      }
      if (!tripRowId) {
        Alert.alert("Trip missing", "Trip id missing.");
        return;
      }

      let nextList: Trip[] = [];
      setTrips((prev) => {
        nextList = prev.map((t: any) => {
          const same = String(t?.id) === String(tripRowId);
          if (!same) return t;

          return {
            ...t,
            trip_status: "completed",
            status: "completed",
            completed: true,
            completed_at: new Date().toISOString(),
          };
        });
        return nextList;
      });

      try {
        await saveTripsCache(oc, nextList);
      } catch {}

      const net = await NetInfo.fetch();
      const isOnline = !!net.isConnected && (net.isInternetReachable ?? true);

      if (!isOnline) {
        await enqueueComplete(oc, { id: String(tripRowId), tripId, at: Date.now() });
        setOfflineNote("Marked as completed offline. Will sync when internet is back.");
        return;
      }

      try {
        const updated: any = await completeTripPut(tripRowId, token);

        if (updated && typeof updated === "object") {
          setTrips((prev) =>
            prev.map((x: any) =>
              String(x?.id) === String(tripRowId) ? { ...x, ...updated } : x
            )
          );

          const latest = await readTripsCache(oc);
          if (latest?.trips?.length) {
            const merged = latest.trips.map((x: any) =>
              String(x?.id) === String(tripRowId) ? { ...x, ...updated } : x
            );
            await saveTripsCache(oc, merged);
          }
        }
      } catch {
        await enqueueComplete(oc, { id: String(tripRowId), tripId, at: Date.now() });
        setOfflineNote("Marked as completed. Sync pending (API failed).");
      }
    },
    [ownerCode, token]
  );

  /** --------- OPEN DETAILS (Modal) --------- */
  const openTripDetails = useCallback(
    async (tripRowId: any) => {
      const oc = String(ownerCode ?? "").trim();
      setDetailsTripRowId(tripRowId);
      setDetailsOpen(true);
      setDetailsLoading(true);
      setDetailsError(null);
      setDetailsOfflineNote(null);
      setDetailsData(null);

      // cache first
      let cachedFound: any = null;
      if (oc) {
        const cached = await readTripsCache(oc);
        cachedFound =
          (cached?.trips ?? []).find((t: any) => String(t?.id) === String(tripRowId)) ?? null;
        if (cachedFound) setDetailsData(cachedFound);
      }

      try {
        const net = await NetInfo.fetch();
        const isOnline = !!net.isConnected && (net.isInternetReachable ?? true);

        if (!isOnline) {
          if (cachedFound) {
            setDetailsOfflineNote("Offline: showing saved trip details from cache.");
            return;
          }
          setDetailsError("Offline and this trip is not cached yet.");
          return;
        }

        const apiData = await fetchTripDetailsByRowId(tripRowId, token);

        // merge: api wins
        const merged = { ...(cachedFound ?? {}), ...(apiData ?? {}) };
        setDetailsData(merged);

        // ✅ if details include vessel name, store it (so list shows name too)
        try {
          const vid = pickVesselId(merged);
          const vname = pickVesselNameFromTrip(merged);
          if (vid !== "-" && vname) {
            setVesselNameMap((prev) =>
              prev?.[vid] === vname ? prev : { ...prev, [vid]: vname }
            );
          }
        } catch {}

        // ✅ NEW: if details include rv vessel id/code, store it (so Catch Log can use it)
        try {
          const vid = pickVesselId(merged);
          const rv =
            normalizeText(
              merged?.rv_vessel_id ??
                merged?.rvVesselId ??
                merged?.vessel?.rv_vessel_id ??
                merged?.vessel?.rvVesselId
            ) || "";

          if (vid !== "-" && rv) {
            setVesselRvIdMap((prev) => (prev?.[vid] === rv ? prev : { ...prev, [vid]: rv }));
          }
        } catch {}
      } catch (e: any) {
        if (cachedFound) {
          setDetailsOfflineNote("API failed: showing cached trip details.");
          return;
        }
        setDetailsError(e?.message || "Failed to load trip details");
      } finally {
        setDetailsLoading(false);
      }
    },
    [ownerCode, token]
  );

  const closeTripDetails = useCallback(() => {
    setDetailsOpen(false);
    setDetailsLoading(false);
    setDetailsError(null);
    setDetailsOfflineNote(null);
    setDetailsTripRowId(null);
    setDetailsData(null);
  }, []);

  const detailsView = useMemo(() => {
    const t: any = detailsData || {};
    const statusRaw =
      t?.approval_status ??
      t?.approvalStatus ??
      t?.trip_status ??
      t?.tripStatus ??
      t?.status ??
      t?.state;

    const completed = isTripCompleted(t);
    const status: TripStatus = completed ? "COMPLETED" : normalizeTripStatus(statusRaw);

    return {
      status,
      id: t?.id ?? detailsTripRowId ?? "-",
      trip_id: normalizeText(t?.trip_id ?? t?.tripId) || "-",
      owner_code: normalizeText(t?.owner_code ?? t?.ownerCode) || "-",

      vessel_id: pickVesselId(t),
      vessel_name:
        pickVesselNameFromTrip(t) ||
        (pickVesselId(t) !== "-" ? normalizeText(vesselNameMap[pickVesselId(t)]) : ""),

      diesel: normalizeText(t?.diesel) || "-",
      ice: normalizeText(t?.ice) || "-",
      qr_count: normalizeText(t?.qr_count ?? t?.qrCount) || "-",
      total: normalizeText(t?.total) || "-",

      approval_status: normalizeText(t?.approval_status ?? t?.approvalStatus ?? t?.status) || "-",

      location_name: pickLandingLabel(t),

      method_name: pickMethodLabel(t),
      method_id: normalizeText(t?.method_id ?? t?.methodId) || "-",
      method_code: normalizeText(t?.method_code ?? t?.methodCode) || "-",
      image_url: normalizeText(t?.image_url ?? t?.imageUrl) || "",

      fish_name: normalizeText(t?.fish_name ?? t?.fishName) || "-",
      fish_id: normalizeText(t?.fish_id ?? t?.fishId) || "-",
      fish_code: normalizeText(t?.fish_code ?? t?.fishCode) || "-",
      fish_type_url: normalizeText(t?.fish_type_url ?? t?.fishTypeUrl) || "",

      created_at: fmtDateTime(t?.created_at ?? t?.createdAt),
      updated_at: fmtDateTime(t?.updated_at ?? t?.updatedAt),
      planned_at: fmtDateTime(
        t?.planned_at ?? t?.plannedAt ?? t?.planned_on ?? t?.created_at ?? t?.createdAt
      ),
      completed_at: fmtDateTime(
        t?.completed_at ??
          t?.completedAt ??
          t?.comleted_at ??
          t?.comletedAt ??
          t?.completed_on ??
          t?.completedOn ??
          t?.updated_at ??
          t?.updatedAt
      ),
      arrival_at: fmtDateTime(t?.arrival_at ?? t?.arrivalAt),
    };
  }, [detailsData, detailsTripRowId, vesselNameMap]);

  return (
    <View className="flex-1 bg-[#fbf6f1]">
      {/* DETAILS MODAL */}
      <Modal
        visible={detailsOpen}
        transparent
        animationType="slide"
        onRequestClose={closeTripDetails}
      >
        <View className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.35)" }}>
          <View className="flex-1 justify-end">
            <View
              className="rounded-t-3xl border border-[#ead7c8] bg-[#fbf6f1]"
              style={{ maxHeight: "88%" }}
            >
              <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xl font-extrabold text-[#2b2b2b]">Trip Details</Text>
                  <Text className="mt-1 text-xs text-[#7a6f66]">
                    Row ID: {String(detailsView.id)}
                    {detailsView.trip_id && detailsView.trip_id !== "-"
                      ? `  ·  ${detailsView.trip_id}`
                      : ""}
                  </Text>
                  {detailsOfflineNote ? (
                    <Text className="mt-1 text-[11px] font-semibold text-[#9a5b00]">
                      {detailsOfflineNote}
                    </Text>
                  ) : null}
                </View>

                <Pressable
                  onPress={closeTripDetails}
                  className="rounded-2xl border border-[#ead7c8] bg-white px-4 py-3 active:opacity-80"
                >
                  <Text className="text-sm font-extrabold text-[#2b2b2b]">✕</Text>
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
                refreshControl={
                  <RefreshControl
                    refreshing={detailsLoading}
                    onRefresh={() =>
                      detailsTripRowId ? openTripDetails(detailsTripRowId) : undefined
                    }
                    tintColor={"#a06b2a"}
                  />
                }
              >
                {detailsLoading ? (
                  <Card className="px-4 py-8 items-center">
                    <ActivityIndicator />
                    <Text className="mt-2 text-sm text-[#7a6f66]">Loading details...</Text>
                  </Card>
                ) : detailsError ? (
                  <Card className="px-4 py-4">
                    <Text className="text-sm font-extrabold text-[#9b1c1c]">Error</Text>
                    <Text className="mt-1 text-sm text-[#7a1f1f]">{detailsError}</Text>

                    {detailsTripRowId ? (
                      <Pressable
                        onPress={() => openTripDetails(detailsTripRowId)}
                        className="mt-3 self-start rounded-xl bg-[#9b1c1c] px-4 py-2 active:opacity-90"
                      >
                        <Text className="text-sm font-extrabold text-white">Retry</Text>
                      </Pressable>
                    ) : null}
                  </Card>
                ) : (
                  <>
                    <Card className="px-4 py-4">
                      <Text className="text-base font-extrabold text-[#2b2b2b]">Summary</Text>
                      <View className="mt-2">
                        <Row label="Trip Row ID" value={detailsView.id} />
                        <Row label="Trip ID" value={detailsView.trip_id} />
                        <Row label="Owner Code" value={detailsView.owner_code} />
                        <Row
                          label="Vessel"
                          value={
                            detailsView.vessel_name && detailsView.vessel_id !== "-"
                              ? `${detailsView.vessel_name} (${detailsView.vessel_id})`
                              : detailsView.vessel_name
                              ? detailsView.vessel_name
                              : detailsView.vessel_id
                          }
                        />
                        <Row label="Status" value={detailsView.status} />
                      </View>
                    </Card>

                    <Card className="mt-3 px-4 py-4">
                      <Text className="text-base font-extrabold text-[#2b2b2b]">
                        Location & Time
                      </Text>
                      <View className="mt-2">
                        <Row label="Landing" value={detailsView.location_name} />
                        <Row label="Planned At" value={detailsView.planned_at} />
                        {detailsView.status === "COMPLETED" ? (
                          <Row
                            label="Completed At"
                            value={detailsView.completed_at || detailsView.arrival_at}
                          />
                        ) : (
                          <Row label="Arrival At" value={detailsView.arrival_at} />
                        )}
                        <Row label="Created At" value={detailsView.created_at} />
                        <Row label="Updated At" value={detailsView.updated_at} />
                      </View>
                    </Card>

                    <Card className="mt-3 px-4 py-4">
                      <Text className="text-base font-extrabold text-[#2b2b2b]">
                        Fishing Method
                      </Text>
                      <View className="mt-2">
                        <Row label="Method Name" value={detailsView.method_name} />
                        <Row label="Method Code" value={detailsView.method_code} />
                        <Row label="Method ID" value={detailsView.method_id} />
                      </View>

                      {detailsView.image_url ? (
                        <View className="mt-3 overflow-hidden rounded-2xl border border-[#ead7c8]">
                          <Image
                            source={{ uri: detailsView.image_url }}
                            style={{ width: "100%", height: 180 }}
                            resizeMode="cover"
                          />
                        </View>
                      ) : null}
                    </Card>

                    <Card className="mt-3 px-4 py-4">
                      <Text className="text-base font-extrabold text-[#2b2b2b]">
                        Fish Details
                      </Text>
                      <View className="mt-2">
                        <Row label="Fish Name" value={detailsView.fish_name} />
                        <Row label="Fish Code" value={detailsView.fish_code} />
                        <Row label="Fish ID" value={detailsView.fish_id} />
                      </View>

                      {detailsView.fish_type_url ? (
                        <View className="mt-3 overflow-hidden rounded-2xl border border-[#ead7c8]">
                          <Image
                            source={{ uri: detailsView.fish_type_url }}
                            style={{ width: "100%", height: 180 }}
                            resizeMode="cover"
                          />
                        </View>
                      ) : null}
                    </Card>

                    <Card className="mt-3 px-4 py-4">
                      <Text className="text-base font-extrabold text-[#2b2b2b]">Costs</Text>
                      <View className="mt-2">
                        <Row label="Diesel" value={detailsView.diesel} />
                        <Row label="Ice" value={detailsView.ice} />
                        <Row label="QR Count" value={detailsView.qr_count} />
                        <Row label="Total" value={detailsView.total} />
                      </View>
                    </Card>

                    <View className="mt-4 flex-row gap-2">
                      <Pressable
                        onPress={closeTripDetails}
                        className="flex-1 rounded-2xl border border-[#ead7c8] bg-white px-4 py-4 active:opacity-90"
                      >
                        <Text className="text-center text-base font-extrabold text-[#2b2b2b]">
                          Close
                        </Text>
                      </Pressable>

                      {/* ✅ if COMPLETED => no Catch Log */}
                      {/* ✅ Catch Log ONLY when APPROVED */}
                      {detailsView.status === "APPROVED" ? (
                        <Pressable
                          onPress={() => {
                            const tripIdForCatch =
                              detailsView.trip_id && detailsView.trip_id !== "-"
                                ? detailsView.trip_id
                                : "";
                            if (!tripIdForCatch) {
                              Alert.alert("Trip ID missing", "trip_id not found to open Catch Log.");
                              return;
                            }

                            const vesselIdForCatch =
                              detailsView.vessel_id && detailsView.vessel_id !== "-"
                                ? detailsView.vessel_id
                                : "";
                            const ownerForCatch =
                              detailsView.owner_code && detailsView.owner_code !== "-"
                                ? detailsView.owner_code
                                : String(ownerCode ?? "").trim();

                            const rvVesselIdForCatch =
                              normalizeText(
                                (detailsData as any)?.rv_vessel_id ??
                                  (detailsData as any)?.rvVesselId ??
                                  (detailsData as any)?.vessel?.rv_vessel_id ??
                                  (detailsData as any)?.vessel?.rvVesselId
                              ) ||
                              (vesselIdForCatch
                                ? normalizeText(vesselRvIdMap[String(vesselIdForCatch)])
                                : "");

                            const qs =
                              `tripId=${encodeURIComponent(String(tripIdForCatch))}` +
                              (vesselIdForCatch
                                ? `&vesselId=${encodeURIComponent(String(vesselIdForCatch))}`
                                : "") +
                              (rvVesselIdForCatch
                                ? `&rvVesselId=${encodeURIComponent(String(rvVesselIdForCatch))}`
                                : "") +
                              (ownerForCatch
                                ? `&ownerCode=${encodeURIComponent(String(ownerForCatch))}`
                                : "") +
                              (detailsView.id
                                ? `&tripRowId=${encodeURIComponent(String(detailsView.id))}`
                                : "");

                            closeTripDetails();
                            router.push(`/(wild)/catch-logs/create?${qs}` as const);
                          }}
                          className="flex-1 rounded-2xl bg-[#136f2d] px-4 py-4 active:opacity-90"
                        >
                          <Text className="text-center text-base font-extrabold text-white">
                            Catch Log
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* MAIN LIST */}
      <ScrollView
        contentContainerClassName="p-4 pb-12"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={"#a06b2a"} />
        }
      >
        {/* Header */}
        <View className="mb-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-extrabold text-[#2b2b2b]">Trips</Text>
              <Text className="mt-1 text-xs text-[#7a6f66]">
                {ownerCode ? `Owner: ${String(ownerCode).trim()}` : "Owner: -"}
                {filtered.length ? `  ·  ${filtered.length} trips` : ""}
              </Text>

              {offlineNote ? (
                <Text className="mt-1 text-[11px] font-semibold text-[#9a5b00]">
                  {offlineNote}
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={() => onRefresh()}
              className="rounded-2xl border border-[#ead7c8] bg-white px-4 py-3 active:opacity-80"
            >
              <Text className="text-sm font-extrabold text-[#2b2b2b]">↻</Text>
            </Pressable>
          </View>

          {loading ? (
            <View className="mt-3 flex-row items-center gap-2">
              <ActivityIndicator />
              <Text className="text-sm text-[#7a6f66]">Loading trips...</Text>
            </View>
          ) : null}
        </View>

        {/* Error */}
        {error ? (
          <Card className="mb-3 px-4 py-3">
            <Text className="text-sm font-extrabold text-[#9b1c1c]">Error</Text>
            <Text className="mt-1 text-sm text-[#7a1f1f]">{error}</Text>

            <Pressable
              onPress={() => loadTrips()}
              className="mt-3 self-start rounded-xl bg-[#9b1c1c] px-4 py-2 active:opacity-90"
            >
              <Text className="text-sm font-extrabold text-white">Retry</Text>
            </Pressable>
          </Card>
        ) : null}

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
          contentContainerStyle={{ paddingRight: 12 }}
        >
          {FILTERS.map((f) => (
            <FilterChip
              key={f}
              label={f}
              active={statusFilter === f}
              onPress={() => setStatusFilter(f)}
            />
          ))}
        </ScrollView>

        {/* Search */}
        <Card className="px-4 py-3">
          <Text className="text-sm font-semibold text-[#7a6f66]">Search</Text>
          <View className="mt-2 rounded-xl border border-[#ead7c8] bg-[#fbf6f1] px-3 py-2">
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Trip ID / Vessel ID / Landing / Method / Status"
              placeholderTextColor="#9a8f86"
              className="text-base font-semibold text-[#2b2b2b]"
            />
          </View>
        </Card>

        {/* New Trip */}
        <Pressable
          onPress={() => router.push("/(wild)/trips/create" as const)}
          className="mt-4 rounded-2xl bg-[#a06b2a] px-4 py-4 active:opacity-90"
        >
          <Text className="text-center text-white text-lg font-extrabold">New Trip</Text>
        </Pressable>

        {/* List */}
        <View className="mt-4">
          {loading ? (
            <Card className="px-4 py-10 items-center">
              <Text className="text-base font-semibold text-[#6b625a]">Fetching trips...</Text>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="px-4 py-10 items-center">
              <Text className="text-base font-semibold text-[#6b625a]">No trips found.</Text>
              <Text className="mt-1 text-sm text-[#9a8f86]">Try changing filter or search.</Text>
            </Card>
          ) : (
            filtered.map((t) => {
              const isCompleted = t.status === "COMPLETED";

              return (
                <Card key={String(t.id ?? t.tripId)} className="mb-3 overflow-hidden">
                  <Pressable
                    onPress={() => openTripDetails(t.id)}
                    className="px-4 py-4 active:opacity-80"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3 flex-1 pr-2">
                        <View className="h-11 w-11 rounded-xl bg-[#f4e7dc] items-center justify-center">
                          <Text className="text-lg">⛵</Text>
                        </View>

                        <View className="flex-1">
                          <Text
                            className="text-base font-extrabold text-[#2b2b2b]"
                            numberOfLines={1}
                          >
                            {t.tripName}
                          </Text>
                          <Text className="mt-0.5 text-sm text-[#6b625a]" numberOfLines={1}>
                            {t.method} · {t.locationCode}
                          </Text>
                        </View>
                      </View>

                      <StatusChip status={t.status} />
                    </View>

                    {/* ✅ vessel shows name + id (same UI line) */}
                    <Text className="mt-3 text-sm text-[#7a6f66]">
                      Vessel:{" "}
                      {normalizeText((t as any).vesselLabel) || normalizeText(t.vesselId) || "-"}
                    </Text>
                    <Text className="mt-1 text-sm text-[#7a6f66]">
                      Landing: {normalizeText(t.landingCenter) || "-"}
                    </Text>
                    <Text className="mt-1 text-sm text-[#7a6f66]">
                      Planned: {normalizeText(t.plannedTripDateTime) || "-"}
                    </Text>

                    <View className="mt-4 flex-row items-center gap-2">
                      <Pressable
                        onPress={(e: any) => {
                          e?.stopPropagation?.();
                          openTripDetails(t.id);
                        }}
                        className="rounded-xl border border-[#ead7c8] bg-white px-4 py-2 active:opacity-90"
                      >
                        <Text className="text-sm font-extrabold text-[#2b2b2b]">View</Text>
                      </Pressable>

                      {/* ✅ if COMPLETED => no Catch Log */}
                      {!isCompleted && t.status === "APPROVED" ? (
                        <Pressable
                          onPress={(e: any) => {
                            e?.stopPropagation?.();

                            // ✅ pass vesselId + tripRowId + ownerCode (so CatchLog Create won't ask again)
                            const oc = String(ownerCode ?? "").trim();
                            const vesselIdForCatch =
                              t.vesselId && t.vesselId !== "-" ? t.vesselId : "";

                            // ✅ NEW: rv vessel id/code (from cache map)
                            const rvVesselIdForCatch = vesselIdForCatch
                              ? normalizeText(vesselRvIdMap[String(vesselIdForCatch)])
                              : "";

                            const qs =
                              `tripId=${encodeURIComponent(String(t.tripId || ""))}` +
                              (vesselIdForCatch
                                ? `&vesselId=${encodeURIComponent(String(vesselIdForCatch))}`
                                : "") +
                              (rvVesselIdForCatch
                                ? `&rvVesselId=${encodeURIComponent(String(rvVesselIdForCatch))}`
                                : "") +
                              (oc ? `&ownerCode=${encodeURIComponent(String(oc))}` : "") +
                              (t.id ? `&tripRowId=${encodeURIComponent(String(t.id))}` : "");

                            router.push(`/(wild)/catch-logs/create?${qs}` as const);
                          }}
                          className="rounded-xl bg-[#136f2d] px-5 py-2 active:opacity-90"
                        >
                          <Text className="text-sm font-extrabold text-white">Catch Log</Text>
                        </Pressable>
                      ) : null}

                      {/* ✅ if COMPLETED => no Complete */}
                      {!isCompleted && t.status === "APPROVED" ? (
                        <Pressable
                          onPress={(e: any) => {
                            e?.stopPropagation?.();
                            Alert.alert(
                              "Mark trip as completed?",
                              "Once completed, it will show as COMPLETED.",
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Complete",
                                  style: "default",
                                  onPress: () => markTripCompleted(t.id, t.tripId),
                                },
                              ]
                            );
                          }}
                          className="rounded-xl bg-[#3730a3] px-5 py-2 active:opacity-90"
                        >
                          <Text className="text-sm font-extrabold text-white">Complete</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </Pressable>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}