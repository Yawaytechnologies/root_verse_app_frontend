import React, { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, TextInput, View, ScrollView } from "react-native";

type TripStatus = "ACTIVE" | "PLANNED" | "COMPLETED";

type Trip = {
  tripId: string;
  method: string;
  departurePort: string;
  targetSpecies: string;
  startDate: string; // YYYY-MM-DD
  expectedReturnDate: string; // YYYY-MM-DD
  crewMembers: number;
  totalExpenses: number;
  status: TripStatus;
};

const DUMMY_TRIPS: Trip[] = [
  {
    tripId: "T250057",
    method: "Longline",
    departurePort: "Chennai",
    targetSpecies: "Yellowfin Tuna",
    startDate: "2025-12-14",
    expectedReturnDate: "2025-12-20",
    crewMembers: 6,
    totalExpenses: 16000,
    status: "ACTIVE",
  },
  {
    tripId: "T250043",
    method: "Gillnet",
    departurePort: "Nagapattinam",
    targetSpecies: "Seer Fish",
    startDate: "2025-12-06",
    expectedReturnDate: "2025-12-08",
    crewMembers: 5,
    totalExpenses: 12500,
    status: "COMPLETED",
  },
  {
    tripId: "T250061",
    method: "Hook & Line",
    departurePort: "Thoothukudi",
    targetSpecies: "Red Snapper",
    startDate: "2025-12-22",
    expectedReturnDate: "2025-12-24",
    crewMembers: 4,
    totalExpenses: 9800,
    status: "PLANNED",
  },
];

const moneyINR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</View>;
}

function Chip({ label, tone }: { label: string; tone: "slate" | "green" | "blue" }) {
  const m = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-sky-100 text-sky-700",
  };
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${m[tone]}`}>
      <Text className="text-xs font-semibold">{label}</Text>
    </View>
  );
}

const statusTone = (s: TripStatus) => {
  if (s === "ACTIVE") return "green";
  if (s === "PLANNED") return "blue";
  return "slate";
};

export default function TripsIndex() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | TripStatus>("ALL");
  const [port, setPort] = useState<"ALL" | string>("ALL");

  const ports = useMemo(() => {
    const set = new Set(DUMMY_TRIPS.map((t) => t.departurePort));
    return ["ALL", ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return DUMMY_TRIPS.filter((t) => {
      const matchQ =
        !term ||
        t.tripId.toLowerCase().includes(term) ||
        t.method.toLowerCase().includes(term) ||
        t.departurePort.toLowerCase().includes(term) ||
        t.targetSpecies.toLowerCase().includes(term);

      const matchStatus = status === "ALL" ? true : t.status === status;
      const matchPort = port === "ALL" ? true : t.departurePort === port;

      return matchQ && matchStatus && matchPort;
    });
  }, [q, status, port]);

  const cycleStatus = () => {
    setStatus((prev) => {
      if (prev === "ALL") return "ACTIVE";
      if (prev === "ACTIVE") return "PLANNED";
      if (prev === "PLANNED") return "COMPLETED";
      return "ALL";
    });
  };

  const cyclePort = () => {
    setPort((prev) => {
      const idx = ports.indexOf(prev);
      return ports[(idx + 1) % ports.length] as any;
    });
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="p-4 pb-10">
        <Card className="p-4">
          <Text className="text-lg font-bold text-slate-900">Trips</Text>
          <Text className="mt-1 text-sm text-slate-600">
            View all trips, filter by status/port, and create a new trip.
          </Text>
        </Card>

        <Pressable
          onPress={() => router.push("/(wild)/trips/create" as const)}
          className="mt-4 rounded-2xl bg-slate-900 p-4 active:opacity-90"
        >
          <Text className="text-center text-white font-semibold">Create Trip</Text>
        </Pressable>

        {/* Search */}
        <View className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Search</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Trip ID / Port / Species / Method..."
            className="mt-1 text-base text-slate-900"
          />
        </View>

        {/* Filters */}
        <View className="mt-3 flex-row gap-3">
          <Pressable
            onPress={cycleStatus}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 active:opacity-80"
          >
            <Text className="text-xs text-slate-500">Status</Text>
            <Text className="mt-1 text-base font-semibold text-slate-900">{status}</Text>
            <Text className="mt-1 text-[11px] text-slate-400">Tap to change</Text>
          </Pressable>

          <Pressable
            onPress={cyclePort}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 active:opacity-80"
          >
            <Text className="text-xs text-slate-500">Port</Text>
            <Text className="mt-1 text-base font-semibold text-slate-900">{port}</Text>
            <Text className="mt-1 text-[11px] text-slate-400">Tap to change</Text>
          </Pressable>
        </View>

        {/* List */}
        <View className="mt-4">
          <Text className="mb-2 text-base font-bold text-slate-900">
            Trip List ({filtered.length})
          </Text>

          <Card className="py-2">
            {filtered.length === 0 ? (
              <View className="px-4 py-6">
                <Text className="text-sm text-slate-600">No trips match your filter.</Text>
              </View>
            ) : (
              filtered.map((t, idx) => (
                <View key={t.tripId} className={`${idx !== 0 ? "border-t border-slate-100" : ""}`}>
                  <Pressable
                    onPress={() => router.push(`/(wild)/trips/${t.tripId}`)} // later: /trips/[tripId]
                    className="px-3 py-3 active:opacity-80"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-bold text-slate-900">{t.tripId}</Text>
                      <Chip label={t.status} tone={statusTone(t.status) as any} />
                    </View>

                    <Text className="mt-1 text-xs text-slate-600">
                      {t.departurePort} · {t.method} · {t.targetSpecies}
                    </Text>

                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="text-xs text-slate-500">
                        {t.startDate} → {t.expectedReturnDate} · Crew: {t.crewMembers}
                      </Text>
                      <Text className="text-xs font-semibold text-slate-900">
                        {moneyINR(t.totalExpenses)}
                      </Text>
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
