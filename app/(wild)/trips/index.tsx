// app/(wild)/trips/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  Pressable,
  Text,
  TextInput,
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { tripApi, Trip } from "../../../src/services/wild/tripApi";

type TripStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ONGOING"
  | "COMPLETED"
  | "UNKNOWN";

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-2xl border border-[#ead7c8] bg-white ${className}`}>
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
      : "bg-[#eef2f6] text-[#4b5563] border-[#e5e7eb]";

  return (
    <View className={`rounded-full border px-3 py-1 ${tone}`}>
      <Text className="text-xs font-semibold">{status}</Text>
    </View>
  );
}

/** map backend Trip -> UI shape used by this screen (same rendering as before) */
function mapTripToUi(t: Trip) {
  const status = (t.approval_status || "UNKNOWN").toUpperCase() as TripStatus;

  return {
    tripId: t.trip_id,
    tripName: t.trip_id, // you don't have tripName in API, so show trip_id
    method: t.fishing_method || "-",
    landingCenter: t.near_station || "-",
    locationCode: t.near_station || "-", // API doesn't have locationCode; reuse near_station
    plannedTripDateTime: t.planned_at ? new Date(t.planned_at).toLocaleString() : "-",
    status,
  };
}

export default function MyTrips() {
  const [q, setQ] = useState("");

  // API state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);

  // ✅ If you have auth token in your app, plug it here (redux/securestore).
  // Keeping undefined so it still works for public endpoints.
  const token: string | undefined = undefined;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await tripApi.fetchTrips(token);

        if (!mounted) return;
        setTrips(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load trips");
        setTrips([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const uiTrips = useMemo(() => trips.map(mapTripToUi), [trips]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return uiTrips;

    return uiTrips.filter((t) => {
      return (
        t.tripId.toLowerCase().includes(term) ||
        t.method.toLowerCase().includes(term) ||
        t.landingCenter.toLowerCase().includes(term) ||
        t.status.toLowerCase().includes(term)
      );
    });
  }, [q, uiTrips]);

  return (
    <View className="flex-1 bg-[#fbf6f1]">
      <ScrollView contentContainerClassName="p-4 pb-10">
        <View className="mb-3">
          <Text className="text-lg font-bold text-[#2b2b2b]">My Trips</Text>

          {loading ? (
            <View className="mt-2 flex-row items-center gap-2">
              <ActivityIndicator />
              <Text className="text-xs text-[#7a6f66]">Loading trips...</Text>
            </View>
          ) : error ? (
            <Text className="mt-2 text-xs text-[#9b1c1c]">{error}</Text>
          ) : null}
        </View>

        <Card className="px-4 py-3">
          <Text className="text-xs text-[#7a6f66]">Search</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Trip ID / Landing centre / Method / Status..."
            className="mt-1 text-base text-[#2b2b2b]"
          />
        </Card>

        <Pressable
          onPress={() => router.push("/(wild)/trips/create" as const)}
          className="mt-4 rounded-2xl bg-[#a06b2a] px-4 py-4 active:opacity-90"
        >
          <Text className="text-center text-white font-semibold">New Trip</Text>
        </Pressable>

        <View className="mt-4">
          <Card className="py-2">
            {loading ? (
              <View className="px-4 py-10 items-center">
                <Text className="text-sm text-[#6b625a]">Fetching trips...</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View className="px-4 py-10 items-center">
                <Text className="text-sm text-[#6b625a]">No trips found.</Text>
                <Text className="mt-1 text-xs text-[#9a8f86]">
                  Tap &quot;New Trip&quot; to start one!
                </Text>
              </View>
            ) : (
              filtered.map((t, idx) => (
                <View
                  key={t.tripId}
                  className={`${idx !== 0 ? "border-t border-[#f0e3d8]" : ""}`}
                >
                  <Pressable
                    onPress={() =>
                      router.push(
                        `/(wild)/trips/${encodeURIComponent(t.tripId)}` as const
                      )
                    }
                    className="px-4 py-4 active:opacity-80"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View className="h-10 w-10 rounded-xl bg-[#f4e7dc] items-center justify-center">
                          <Text className="text-base">⛵</Text>
                        </View>

                        <View>
                          <Text className="text-sm font-bold text-[#2b2b2b]">
                            {t.tripName}
                          </Text>
                          <Text className="mt-0.5 text-xs text-[#6b625a]">
                            {t.method} · {t.locationCode}
                          </Text>
                        </View>
                      </View>

                      <StatusChip status={t.status} />
                    </View>

                    <Text className="mt-2 text-xs text-[#7a6f66]">
                      Landing: {t.landingCenter} · Planned: {t.plannedTripDateTime}
                    </Text>

                    {/* ✅ Show Catch Log option only when APPROVED */}
                    {t.status === "APPROVED" ? (
                      <Pressable
                        onPress={() =>
                          router.push(
                            `/(wild)/catch-logs/create?tripId=${encodeURIComponent(
                              t.tripId
                            )}` as const
                          )
                        }
                        className="mt-3 self-start rounded-xl bg-[#136f2d] px-4 py-2 active:opacity-90"
                      >
                        <Text className="text-xs font-semibold text-white">
                          Catch Log
                        </Text>
                      </Pressable>
                    ) : null}
                  </Pressable>
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
