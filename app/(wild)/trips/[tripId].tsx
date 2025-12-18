import React, { useMemo } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

type TripStatus = "ACTIVE" | "PLANNED" | "COMPLETED";

type Trip = {
  tripId: string;
  method: string;
  departurePort: string;
  targetSpecies: string;
  startDate: string; // YYYY-MM-DD
  expectedReturnDate: string; // YYYY-MM-DD
  crewMembers: number;
  fuelLiters: number;
  fuelPrice: number;
  iceKg: number;
  icePrice: number;
  foodExpenses: number;
  otherExpenses: number;
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
    fuelLiters: 100,
    fuelPrice: 100,
    iceKg: 1000,
    icePrice: 10,
    foodExpenses: 5000,
    otherExpenses: 1000,
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
    fuelLiters: 80,
    fuelPrice: 95,
    iceKg: 800,
    icePrice: 12,
    foodExpenses: 3000,
    otherExpenses: 900,
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
    fuelLiters: 60,
    fuelPrice: 105,
    iceKg: 600,
    icePrice: 11,
    foodExpenses: 2200,
    otherExpenses: 700,
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

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <Text className="text-[11px] text-slate-500">{k}</Text>
      <Text className="mt-0.5 text-sm font-semibold text-slate-900">{v}</Text>
    </View>
  );
}

export default function TripDetails() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const trip = useMemo(() => DUMMY_TRIPS.find((t) => t.tripId === tripId), [tripId]);

  if (!trip) {
    return (
      <View className="flex-1 bg-slate-50 p-4">
        <Card className="p-4">
          <Text className="text-lg font-bold text-slate-900">Trip not found</Text>
          <Text className="mt-1 text-sm text-slate-600">No data for Trip ID: {String(tripId)}</Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-4 rounded-2xl bg-slate-900 p-3 active:opacity-90"
          >
            <Text className="text-center font-semibold text-white">Go back</Text>
          </Pressable>
        </Card>
      </View>
    );
  }

  const fuelTotal = trip.fuelLiters * trip.fuelPrice;
  const iceTotal = trip.iceKg * trip.icePrice;
  const totalExpenses = fuelTotal + iceTotal + trip.foodExpenses + trip.otherExpenses;

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-4 pb-10">
      {/* Header */}
      <Card className="p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-lg font-bold text-slate-900">{trip.tripId}</Text>
            <Text className="mt-1 text-sm text-slate-600">
              {trip.departurePort} · {trip.method} · {trip.targetSpecies}
            </Text>
          </View>
          <Chip label={trip.status} tone={statusTone(trip.status) as any} />
        </View>

        <View className="mt-4 flex-row gap-3">
          <KV k="Start Date" v={trip.startDate} />
          <KV k="Return Date" v={trip.expectedReturnDate} />
        </View>

        <View className="mt-3 flex-row gap-3">
          <KV k="Crew" v={String(trip.crewMembers)} />
          <KV k="Total Expenses" v={moneyINR(totalExpenses)} />
        </View>
      </Card>

      {/* Expense breakdown */}
      <View className="mt-4">
        <Text className="mb-2 text-base font-bold text-slate-900">Expense Breakdown</Text>

        <Card className="p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-slate-900">Fuel</Text>
            <Text className="text-sm font-bold text-slate-900">{moneyINR(fuelTotal)}</Text>
          </View>
          <Text className="mt-1 text-xs text-slate-600">
            {trip.fuelLiters} L × {moneyINR(trip.fuelPrice)}
          </Text>

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-slate-900">Ice</Text>
            <Text className="text-sm font-bold text-slate-900">{moneyINR(iceTotal)}</Text>
          </View>
          <Text className="mt-1 text-xs text-slate-600">
            {trip.iceKg} KG × {moneyINR(trip.icePrice)}
          </Text>

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-slate-900">Food</Text>
            <Text className="text-sm font-bold text-slate-900">{moneyINR(trip.foodExpenses)}</Text>
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-slate-900">Other</Text>
            <Text className="text-sm font-bold text-slate-900">{moneyINR(trip.otherExpenses)}</Text>
          </View>

          <View className="mt-5 flex-row items-center justify-between rounded-xl bg-slate-100 px-3 py-3">
            <Text className="text-sm font-semibold text-slate-700">TOTAL</Text>
            <Text className="text-base font-bold text-slate-900">{moneyINR(totalExpenses)}</Text>
          </View>
        </Card>
      </View>

      {/* Quick actions */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-bold text-slate-900">Next Actions</Text>

        <View className="gap-3">
          <Pressable
            onPress={() => router.push("/(wild)/catch-logs/create" as const)}
            className="rounded-2xl bg-slate-900 p-4 active:opacity-90"
          >
            <Text className="text-center text-white font-semibold">Add Catch Log</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(wild)/crates/assign" as const)}
            className="rounded-2xl border border-slate-200 bg-white p-4 active:opacity-80"
          >
            <Text className="text-center font-semibold text-slate-900">Assign Crates</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
