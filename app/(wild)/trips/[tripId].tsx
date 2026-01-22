// app/(wild)/trips/[tripId].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { tripApi, Trip } from "../../../src/services/wild/tripApi";

type TripStatus = "PENDING" | "APPROVED" | "REJECTED" | "ONGOING" | "COMPLETED" | "UNKNOWN";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-[#ead7c8] bg-white ${className}`}>{children}</View>;
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

function fmtDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function toStatus(s?: string | null): TripStatus {
  const v = (s || "UNKNOWN").toUpperCase();
  if (v === "PENDING" || v === "APPROVED" || v === "REJECTED" || v === "ONGOING" || v === "COMPLETED") return v;
  return "UNKNOWN";
}

export default function TripOverview() {
  const params = useLocalSearchParams<{ tripId?: string }>();
  const tripIdParam = decodeURIComponent(String(params.tripId || ""));

  // ✅ If you have token later, plug it here (redux/securestore)
  const token: string | undefined = undefined;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [numericId, setNumericId] = useState<number | null>(null);

  const timerRef = useRef<any>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = !!opts?.silent;

      try {
        if (!silent) {
          setLoading(true);
          setError(null);
        } else {
          setRefreshing(true);
        }

        // Case A: route param is already numeric id (if you ever change navigation later)
        const maybeNum = Number(tripIdParam);
        if (Number.isFinite(maybeNum) && maybeNum > 0) {
          const detail = await tripApi.getTripById(maybeNum, token);
          setTrip(detail);
          setNumericId(detail?.id ?? maybeNum);
          setError(null);
          return;
        }

        // Case B (your current flow): route param is trip_id string
        const list = await tripApi.fetchTrips(token);
        const found = (Array.isArray(list) ? list : []).find((t) => String(t.trip_id) === String(tripIdParam));

        if (!found) {
          setTrip(null);
          setNumericId(null);
          setError(`Trip not found for trip_id: ${tripIdParam}`);
          return;
        }

        setNumericId(found.id);

        // Pull “full detail” from numeric id endpoint
        const detail = await tripApi.getTripById(found.id, token);
        setTrip(detail);
        setError(null);
      } catch (e: any) {
        setTrip(null);
        setError(e?.message || "Failed to load trip details");
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [tripIdParam, token]
  );

  // initial load
  useEffect(() => {
    load();
  }, [load]);

  // ✅ Auto refresh every 8 seconds to reflect admin approval change
  useEffect(() => {
    // clear any previous timer
    if (timerRef.current) clearInterval(timerRef.current);

    // start only when we have some identifier
    if (!tripIdParam) return;

    timerRef.current = setInterval(() => {
      // silent refresh (no full-screen loader)
      load({ silent: true });
    }, 8000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [tripIdParam, load]);

  const ui = useMemo(() => {
    if (!trip) return null;

    return {
      id: trip.id,
      trip_id: trip.trip_id,
      status: toStatus(trip.approval_status),
      method: trip.fishing_method || "-",
      landingCenter: trip.near_station || "-",
      planned_at: fmtDateTime(trip.planned_at),
      arrival_at: fmtDateTime(trip.arrival_at),
      diesel: trip.diesel ?? "-",
      ice: trip.ice ?? "-",
      qr_count: trip.qr_count ?? 0,
      total: trip.total ?? "-",
      created_at: fmtDateTime(trip.created_at),
      updated_at: fmtDateTime(trip.updated_at),
    };
  }, [trip]);

  return (
    <View className="flex-1 bg-[#fbf6f1]">
      <ScrollView contentContainerClassName="p-4 pb-10">
        <View className="mb-3 flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="px-3 py-2 rounded-xl bg-white border border-[#ead7c8]">
            <Text className="text-sm font-semibold text-[#2b2b2b]">Back</Text>
          </Pressable>

          {ui?.status ? <StatusChip status={ui.status} /> : null}
        </View>

        <View className="mb-3">
          <Text className="text-lg font-bold text-[#2b2b2b]">Trip Overview</Text>
          <Text className="mt-1 text-xs text-[#7a6f66]">
            Trip ID: <Text className="font-semibold">{tripIdParam}</Text>
            {numericId ? (
              <Text className="text-[#9a8f86]"> · Internal ID: {numericId}</Text>
            ) : null}
          </Text>

          {loading ? (
            <View className="mt-2 flex-row items-center gap-2">
              <ActivityIndicator />
              <Text className="text-xs text-[#7a6f66]">Loading trip...</Text>
            </View>
          ) : error ? (
            <Text className="mt-2 text-xs text-[#9b1c1c]">{error}</Text>
          ) : refreshing ? (
            <Text className="mt-2 text-xs text-[#7a6f66]">Refreshing status…</Text>
          ) : null}
        </View>

        {!loading && ui ? (
          <View className="gap-4">
            <Card className="px-4 py-4">
              <Text className="text-sm font-bold text-[#2b2b2b]">Basic</Text>

              <View className="mt-3 gap-2">
                <Row label="Trip ID" value={ui.trip_id} />
                <Row label="Method" value={ui.method} />
                <Row label="Landing Center" value={ui.landingCenter} />
                <Row label="Planned" value={ui.planned_at} />
                <Row label="Arrival" value={ui.arrival_at} />
                <Row label="Status" value={ui.status} />
              </View>
            </Card>

            <Card className="px-4 py-4">
              <Text className="text-sm font-bold text-[#2b2b2b]">Supplies & QR</Text>

              <View className="mt-3 gap-2">
                <Row label="Diesel" value={String(ui.diesel)} />
                <Row label="Ice" value={String(ui.ice)} />
                <Row label="QR Count" value={String(ui.qr_count)} />
                <Row label="Total" value={String(ui.total)} />
              </View>
            </Card>

            <Card className="px-4 py-4">
              <Text className="text-sm font-bold text-[#2b2b2b]">Audit</Text>

              <View className="mt-3 gap-2">
                <Row label="Created At" value={ui.created_at} />
                <Row label="Updated At" value={ui.updated_at} />
              </View>
            </Card>

            <Pressable
              onPress={() => load()}
              className="rounded-2xl bg-[#a06b2a] px-4 py-4 active:opacity-90"
            >
              <Text className="text-center text-white font-semibold">Refresh Now</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="text-xs text-[#7a6f66]">{label}</Text>
      <Text className="text-xs font-semibold text-[#2b2b2b] text-right flex-1">{value || "-"}</Text>
    </View>
  );
}
