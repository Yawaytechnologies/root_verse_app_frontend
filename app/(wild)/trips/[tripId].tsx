// app/(wild)/trips/[tripId].tsx
import React, { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { approveTrip, getTripById } from "../../../src/data/wild/trips.dummy";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-[#ead7c8] bg-white ${className}`}>{children}</View>;
}

export default function TripDetails() {
  const params = useLocalSearchParams<{ tripId: string }>();
  const tripId = decodeURIComponent(String(params.tripId || ""));

  // ✅ refresh by toggling local state (dummy store is in-memory)
  const [tick, setTick] = useState(0);

  const trip = useMemo(() => getTripById(tripId), [tripId, tick]);

  if (!trip) {
    return (
      <View className="flex-1 bg-[#fbf6f1] items-center justify-center px-6">
        <Text className="text-base font-bold text-[#2b2b2b]">Trip not found</Text>
      </View>
    );
  }

  const isApproved = trip.status === "APPROVED" || trip.status === "ONGOING";

  return (
    <View className="flex-1 bg-[#fbf6f1]">
      <ScrollView contentContainerClassName="p-4 pb-10">
        <Text className="text-lg font-bold text-[#2b2b2b]">Trip Details</Text>

        <Card className="mt-3 p-4">
          <Text className="text-sm font-bold text-[#2b2b2b]">{trip.tripName}</Text>
          <Text className="mt-1 text-xs text-[#6b625a]">Status: {trip.status}</Text>

          <View className="mt-3">
            <Text className="text-xs text-[#7a6f66]">Fishing Method</Text>
            <Text className="text-sm text-[#2b2b2b]">{trip.method}</Text>
          </View>

          <View className="mt-3">
            <Text className="text-xs text-[#7a6f66]">Landing Center</Text>
            <Text className="text-sm text-[#2b2b2b]">{trip.landingCenter}</Text>
          </View>

          <View className="mt-3">
            <Text className="text-xs text-[#7a6f66]">Planned Date & Time</Text>
            <Text className="text-sm text-[#2b2b2b]">{trip.plannedTripDateTime}</Text>
          </View>

          <View className="mt-3">
            <Text className="text-xs text-[#7a6f66]">Crew Count</Text>
            <Text className="text-sm text-[#2b2b2b]">{trip.crewCount}</Text>
          </View>
        </Card>

        {/* ✅ Only show catch log button if approved */}
        {isApproved ? (
          <Pressable
            onPress={() =>
              router.push(`/(wild)/catch-logs/create?tripId=${encodeURIComponent(trip.tripId)}` as const)
            }
            className="mt-4 rounded-2xl bg-[#a06b2a] px-4 py-4 active:opacity-90"
          >
            <Text className="text-center text-white font-semibold">Add Catch Log</Text>
          </Pressable>
        ) : (
          <Card className="mt-4 p-4">
            <Text className="text-sm font-semibold text-[#2b2b2b]">Waiting for admin approval</Text>
            <Text className="mt-1 text-xs text-[#6b625a]">
              Catch log can be added only after approval.
            </Text>
          </Card>
        )}

        {/* 🔥 Dummy admin approve button for testing UI (remove later) */}
        {!isApproved ? (
          <Pressable
            onPress={() => {
              approveTrip(trip.tripId);
              setTick((x) => x + 1);
            }}
            className="mt-3 rounded-2xl border border-[#a06b2a] bg-[#fff3e7] px-4 py-4 active:opacity-80"
          >
            <Text className="text-center font-semibold text-[#7a4a12]">Simulate Admin Approve</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-2xl border border-[#ead7c8] bg-white px-4 py-4 active:opacity-80"
        >
          <Text className="text-center text-[#2b2b2b] font-semibold">Back</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
