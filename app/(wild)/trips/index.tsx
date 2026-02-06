// app/(wild)/trips/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
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

// ✅ ONLY REQUIRED FILTERS (+ REJECTED)
type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

const FILTERS: StatusFilter[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED"];

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

/** ---------------- Data Normalizers (IMPORTANT FIX) ---------------- */
function normalizeTripStatus(raw: any): TripStatus {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "UNKNOWN";

  if (s === "pending") return "PENDING";
  if (s === "approved") return "APPROVED";
  if (s === "rejected") return "REJECTED";
  if (s === "ongoing" || s === "inprogress" || s === "in_progress") return "ONGOING";
  if (s === "completed" || s === "complete") return "COMPLETED";

  // fallback: uppercase, but still trimmed
  const up = s.toUpperCase().trim();
  if (up === "PENDING" || up === "APPROVED" || up === "REJECTED" || up === "ONGOING" || up === "COMPLETED") {
    return up as TripStatus;
  }
  return "UNKNOWN";
}

function pickNearStationLabel(v: any): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (v && typeof v === "object") {
    return String(v.name ?? v.location_name ?? v.station_name ?? v.code ?? "-");
  }
  return "-";
}

function mapTripToUi(t: Trip) {
  // backend sometimes returns "approval_status" lowercase; normalize
  const rawStatus =
    (t as any)?.approval_status ??
    (t as any)?.status ??
    (t as any)?.approvalStatus ??
    "UNKNOWN";

  const status = normalizeTripStatus(rawStatus);

  const near = pickNearStationLabel((t as any)?.near_station);

  return {
    id: (t as any)?.id,
    tripId: String((t as any)?.trip_id ?? (t as any)?.tripId ?? (t as any)?.trip_code ?? (t as any)?.code ?? ""),
    tripName: String((t as any)?.trip_id ?? (t as any)?.tripId ?? (t as any)?.trip_code ?? (t as any)?.code ?? ""),
    method: String((t as any)?.fishing_method ?? (t as any)?.method ?? "-"),
    landingCenter: near,
    locationCode: near,
    plannedTripDateTime: (t as any)?.planned_at ? new Date((t as any).planned_at).toLocaleString() : "-",
    status,
  };
}

export default function MyTrips() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const ownerCodeFromStore: string | null =
    useAppSelector((s: any) => s.me?.me?.owner_code) ||
    useAppSelector((s: any) => s.me?.me?.owner_id) ||
    useAppSelector((s: any) => s.auth?.me?.owner_code) ||
    useAppSelector((s: any) => s.auth?.me?.owner_id) ||
    useAppSelector((s: any) => s.login?.user?.owner_code) ||
    useAppSelector((s: any) => s.login?.user?.owner_id) ||
    null;

  const token: string | undefined =
    useAppSelector((s: any) => s.login?.token) ||
    useAppSelector((s: any) => s.auth?.token) ||
    undefined;

  const [ownerCode, setOwnerCode] = useState<string | null>(ownerCodeFromStore);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);

  // ✅ offline/cache note
  const [offlineNote, setOfflineNote] = useState<string | null>(null);

  // keep owner code synced
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (ownerCodeFromStore) {
          if (mounted) setOwnerCode(String(ownerCodeFromStore));
          return;
        }

        const stored =
          (await AsyncStorage.getItem("owner_code")) ||
          (await AsyncStorage.getItem("owner_id"));

        if (mounted) setOwnerCode(stored ? String(stored) : null);
      } catch {
        if (mounted) setOwnerCode(ownerCodeFromStore ? String(ownerCodeFromStore) : null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ownerCodeFromStore]);

  /**
   * ✅ MAIN FIX:
   * - DO NOT send "PENDING"/"APPROVED" to backend as filter (backend expects lowercase, enum mismatch).
   * - Always fetch ALL trips once, cache ALL.
   * - Filter locally for chips. This makes Pending/Approved show correctly + works offline.
   */
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

        const net = await NetInfo.fetch();
        const isOnline = !!net.isConnected && (net.isInternetReachable ?? true);

        if (!isOnline) {
          const cached = await readTripsCache(oc);
          if (cached?.trips?.length) {
            setTrips(cached.trips);
            setOfflineNote(`Offline: showing saved trips (${new Date(cached.savedAt).toLocaleString()})`);
            return;
          }
          setTrips([]);
          setError("Offline and no saved trips found yet. Connect once to cache trips.");
          return;
        }

        // ✅ ONLINE: always fetch ALL (no status param)
        const data = await tripApi.fetchTripsByOwnerCode(oc, token, undefined as any);
        const list = Array.isArray(data) ? data : [];
        setTrips(list);

        // ✅ cache ALL only
        await saveTripsCache(oc, list);
      } catch (e: any) {
        // fallback to cache
        const oc2 = String(ownerCode ?? "").trim();
        if (oc2) {
          const cached = await readTripsCache(oc2);
          if (cached?.trips?.length) {
            setTrips(cached.trips);
            setOfflineNote(`Using saved trips (API failed) · ${new Date(cached.savedAt).toLocaleString()}`);
            return;
          }
        }
        setTrips([]);
        setError(e?.message || "Failed to load trips");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [ownerCode, token]
  );

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const uiTrips = useMemo(() => trips.map(mapTripToUi), [trips]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = uiTrips;

    // ✅ chip filter is client-side now (works online/offline)
    if (statusFilter !== "ALL") list = list.filter((t) => t.status === statusFilter);

    if (!term) return list;

    return list.filter((t) => {
      return (
        t.tripId.toLowerCase().includes(term) ||
        t.method.toLowerCase().includes(term) ||
        t.landingCenter.toLowerCase().includes(term) ||
        t.status.toLowerCase().includes(term)
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

  return (
    <View className="flex-1 bg-[#fbf6f1]">
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
              <Text className="text-2xl font-extrabold text-[#2b2b2b]">My Trips</Text>
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

        {/* Error box */}
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
              placeholder="Trip ID / Landing centre / Method / Status"
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
            filtered.map((t) => (
              <Card key={String(t.id ?? t.tripId)} className="mb-3 overflow-hidden">
                <Pressable
                  onPress={() =>
                    router.push(`/(wild)/trips/${encodeURIComponent(String(t.id))}` as const)
                  }
                  className="px-4 py-4 active:opacity-80"
                >
                  {/* Top row */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1 pr-2">
                      <View className="h-11 w-11 rounded-xl bg-[#f4e7dc] items-center justify-center">
                        <Text className="text-lg">⛵</Text>
                      </View>

                      <View className="flex-1">
                        <Text className="text-base font-extrabold text-[#2b2b2b]" numberOfLines={1}>
                          {t.tripName}
                        </Text>
                        <Text className="mt-0.5 text-sm text-[#6b625a]" numberOfLines={1}>
                          {t.method} · {t.locationCode}
                        </Text>
                      </View>
                    </View>

                    <StatusChip status={t.status} />
                  </View>

                  {/* Meta */}
                  <Text className="mt-3 text-sm text-[#7a6f66]">Landing: {t.landingCenter}</Text>
                  <Text className="mt-1 text-sm text-[#7a6f66]">Planned: {t.plannedTripDateTime}</Text>

                  {/* Actions */}
                  <View className="mt-4 flex-row items-center gap-2">
                    <Pressable
                      onPress={(e: any) => {
                        e?.stopPropagation?.();
                        router.push(`/(wild)/trips/${encodeURIComponent(String(t.id))}` as const);
                      }}
                      className="rounded-xl border border-[#ead7c8] bg-white px-4 py-2 active:opacity-90"
                    >
                      <Text className="text-sm font-extrabold text-[#2b2b2b]">View</Text>
                    </Pressable>

                    {t.status === "APPROVED" ? (
                      <Pressable
                        onPress={(e: any) => {
                          e?.stopPropagation?.();
                          router.push(
                            `/(wild)/catch-logs/create?tripId=${encodeURIComponent(t.tripId)}` as const
                          );
                        }}
                        className="rounded-xl bg-[#136f2d] px-5 py-2 active:opacity-90"
                      >
                        <Text className="text-sm font-extrabold text-white">Catch Log</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Pressable>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
