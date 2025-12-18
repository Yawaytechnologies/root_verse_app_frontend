import React, { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

type CatchStatus = "DRAFT" | "LOGGED" | "VERIFIED";

type CatchLog = {
  catchId: string;
  tripId: string;
  species: string;
  method: string;
  weightKg: number;
  faoZone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: CatchStatus;
};

const DUMMY_CATCH: CatchLog[] = [
  {
    catchId: "C250091",
    tripId: "T250057",
    species: "Yellowfin Tuna",
    method: "Longline",
    weightKg: 82.5,
    faoZone: "51",
    date: "2025-12-14",
    time: "09:30",
    status: "LOGGED",
  },
  {
    catchId: "C250092",
    tripId: "T250057",
    species: "Seer Fish",
    method: "Gillnet",
    weightKg: 44.0,
    faoZone: "51",
    date: "2025-12-14",
    time: "11:05",
    status: "VERIFIED",
  },
  {
    catchId: "C250088",
    tripId: "T250043",
    species: "Squid",
    method: "Trawling",
    weightKg: 25.2,
    faoZone: "51",
    date: "2025-12-07",
    time: "05:40",
    status: "DRAFT",
  },
];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</View>;
}

function Chip({ label, tone }: { label: string; tone: "slate" | "amber" | "green" }) {
  const m = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-emerald-100 text-emerald-700",
  };
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${m[tone]}`}>
      <Text className="text-xs font-semibold">{label}</Text>
    </View>
  );
}

const statusTone = (s: CatchStatus) => {
  if (s === "VERIFIED") return "green";
  if (s === "LOGGED") return "amber";
  return "slate";
};

export default function CatchLogsIndex() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | CatchStatus>("ALL");
  const [trip, setTrip] = useState<"ALL" | string>("ALL");

  const trips = useMemo(() => {
    const set = new Set(DUMMY_CATCH.map((c) => c.tripId));
    return ["ALL", ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return DUMMY_CATCH.filter((c) => {
      const matchQ =
        !term ||
        c.catchId.toLowerCase().includes(term) ||
        c.tripId.toLowerCase().includes(term) ||
        c.species.toLowerCase().includes(term) ||
        c.method.toLowerCase().includes(term) ||
        c.faoZone.toLowerCase().includes(term);

      const matchStatus = status === "ALL" ? true : c.status === status;
      const matchTrip = trip === "ALL" ? true : c.tripId === trip;

      return matchQ && matchStatus && matchTrip;
    });
  }, [q, status, trip]);

  const cycleStatus = () => {
    setStatus((prev) => {
      if (prev === "ALL") return "DRAFT";
      if (prev === "DRAFT") return "LOGGED";
      if (prev === "LOGGED") return "VERIFIED";
      return "ALL";
    });
  };

  const cycleTrip = () => {
    setTrip((prev) => {
      const idx = trips.indexOf(prev);
      return trips[(idx + 1) % trips.length] as any;
    });
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="p-4 pb-10">
        <Card className="p-4">
          <Text className="text-lg font-bold text-slate-900">Catch Logs</Text>
          <Text className="mt-1 text-sm text-slate-600">
            Log species, weight, FAO zone, date/time and more.
          </Text>
        </Card>

        <Pressable
          onPress={() => router.push("/(wild)/catch-logs/create" as const)}
          className="mt-4 rounded-2xl bg-slate-900 p-4 active:opacity-90"
        >
          <Text className="text-center text-white font-semibold">Create Catch Log</Text>
        </Pressable>

        {/* Search */}
        <View className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Search</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Catch ID / Trip / Species / Method / FAO..."
            className="mt-1 text-base text-slate-900"
          />
        </View>

        {/* Filters */}
        <View className="mt-3 flex-row gap-3">
          <Pressable onPress={cycleStatus} className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 active:opacity-80">
            <Text className="text-xs text-slate-500">Status</Text>
            <Text className="mt-1 text-base font-semibold text-slate-900">{status}</Text>
            <Text className="mt-1 text-[11px] text-slate-400">Tap to change</Text>
          </Pressable>

          <Pressable onPress={cycleTrip} className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 active:opacity-80">
            <Text className="text-xs text-slate-500">Trip</Text>
            <Text className="mt-1 text-base font-semibold text-slate-900">{trip}</Text>
            <Text className="mt-1 text-[11px] text-slate-400">Tap to change</Text>
          </Pressable>
        </View>

        {/* List */}
        <View className="mt-4">
          <Text className="mb-2 text-base font-bold text-slate-900">
            Catch Log List ({filtered.length})
          </Text>

          <Card className="py-2">
            {filtered.length === 0 ? (
              <View className="px-4 py-6">
                <Text className="text-sm text-slate-600">No catch logs match your filter.</Text>
              </View>
            ) : (
              filtered.map((c, idx) => (
                <View key={c.catchId} className={`${idx !== 0 ? "border-t border-slate-100" : ""}`}>
                  <Pressable
                    onPress={() => router.push(`/(wild)/catch-logs/${c.catchId}`)}
                    className="px-3 py-3 active:opacity-80"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-bold text-slate-900">{c.catchId}</Text>
                        <Text className="mt-1 text-xs text-slate-600">
                          {c.tripId} · {c.species} · {c.weightKg.toFixed(1)} kg
                        </Text>
                        <Text className="mt-1 text-[11px] text-slate-500">
                          {c.method} · FAO {c.faoZone} · {c.date} {c.time}
                        </Text>
                      </View>
                      <Chip label={c.status} tone={statusTone(c.status) as any} />
                    </View>
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
