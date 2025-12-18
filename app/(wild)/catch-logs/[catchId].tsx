import React, { useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

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
  gearType?: string;
  haulSetNo?: string;
  latitude?: string;
  longitude?: string;
  notes?: string;
  images?: string[];
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
    gearType: "Longline",
    haulSetNo: "1",
    latitude: "10.7654",
    longitude: "79.8432",
    notes: "Good catch, clean handling.",
    images: ["demo://image1", "demo://image2"],
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
    gearType: "Gillnet",
    haulSetNo: "2",
    latitude: "10.7810",
    longitude: "79.8600",
    notes: "Net set near coast.",
    images: ["demo://image3"],
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
    gearType: "Trawl Net",
    haulSetNo: "3",
    latitude: "10.6200",
    longitude: "79.7000",
    notes: "Night haul.",
    images: [],
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

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <Text className="text-[11px] text-slate-500">{k}</Text>
      <Text className="mt-0.5 text-sm font-semibold text-slate-900">{v}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text className="mb-2 text-base font-bold text-slate-900">{children}</Text>;
}

export default function CatchLogDetails() {
  const { catchId } = useLocalSearchParams<{ catchId: string }>();

  const log = useMemo(() => DUMMY_CATCH.find((c) => c.catchId === catchId), [catchId]);

  if (!log) {
    return (
      <View className="flex-1 bg-slate-50 p-4">
        <Card className="p-4">
          <Text className="text-lg font-bold text-slate-900">Catch log not found</Text>
          <Text className="mt-1 text-sm text-slate-600">No data for Catch ID: {String(catchId)}</Text>
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

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-4 pb-10">
      {/* Header */}
      <Card className="p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-lg font-bold text-slate-900">{log.catchId}</Text>
            <Text className="mt-1 text-sm text-slate-600">
              {log.tripId} · {log.species} · {log.weightKg.toFixed(1)} kg
            </Text>
            <Text className="mt-1 text-xs text-slate-500">
              {log.method} · FAO {log.faoZone} · {log.date} {log.time}
            </Text>
          </View>
          <Chip label={log.status} tone={statusTone(log.status) as any} />
        </View>

        <View className="mt-4 flex-row gap-3">
          <KV k="Trip ID" v={log.tripId} />
          <KV k="FAO Zone" v={log.faoZone} />
        </View>

        <View className="mt-3 flex-row gap-3">
          <KV k="Date" v={log.date} />
          <KV k="Time" v={log.time} />
        </View>
      </Card>

      {/* Capture details */}
      <View className="mt-5">
        <SectionTitle>Capture Details</SectionTitle>
        <Card className="p-4">
          <View className="flex-row gap-3">
            <KV k="Species" v={log.species} />
            <KV k="Weight (kg)" v={log.weightKg.toFixed(1)} />
          </View>

          <View className="mt-3 flex-row gap-3">
            <KV k="Method" v={log.method} />
            <KV k="Gear Type" v={log.gearType || "—"} />
          </View>

          <View className="mt-3 flex-row gap-3">
            <KV k="Haul/Set No" v={log.haulSetNo || "—"} />
            <KV k="Status" v={log.status} />
          </View>
        </Card>
      </View>

      {/* Location */}
      <View className="mt-5">
        <SectionTitle>Location</SectionTitle>
        <Card className="p-4">
          <View className="flex-row gap-3">
            <KV k="Latitude" v={log.latitude || "—"} />
            <KV k="Longitude" v={log.longitude || "—"} />
          </View>

          <Text className="mt-3 text-xs text-slate-500">
            Later we can add “Open in Maps” once GPS capture is integrated.
          </Text>
        </Card>
      </View>

      {/* Notes */}
      <View className="mt-5">
        <SectionTitle>Notes</SectionTitle>
        <Card className="p-4">
          <Text className="text-sm text-slate-700">{log.notes?.trim() ? log.notes : "—"}</Text>
        </Card>
      </View>

      {/* Photos */}
      <View className="mt-5">
        <SectionTitle>Photos</SectionTitle>
        <Card className="p-4">
          {log.images && log.images.length > 0 ? (
            <View className="gap-2">
              {log.images.map((u, idx) => (
                <View
                  key={u}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <Text className="text-xs text-slate-700" numberOfLines={1}>
                    Photo {idx + 1}: {u}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-sm text-slate-600">No photos attached.</Text>
          )}
        </Card>
      </View>

      {/* Next actions */}
      <View className="mt-6">
        <SectionTitle>Next Actions</SectionTitle>
        <View className="gap-3">
          <Pressable
            onPress={() => router.push("/(wild)/crates/assign" as const)}
            className="rounded-2xl bg-slate-900 p-4 active:opacity-90"
          >
            <Text className="text-center text-white font-semibold">Assign Crates</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(wild)/catch-logs/create" as const)}
            className="rounded-2xl border border-slate-200 bg-white p-4 active:opacity-80"
          >
            <Text className="text-center font-semibold text-slate-900">Add Another Catch Log</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
