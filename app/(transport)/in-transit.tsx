import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";

import Screen from "../../src/components/centre/Screen";
import {
  formatDisplayDate,
  formatStatus,
  formatUtcToLocal,
} from "../../src/data/transport/dummyTransportData";

import {
  fetchInTransitCrates,
  selectInTransitError,
  selectInTransitItems,
  selectInTransitLoading,
} from "../../src/services/transport/inTransitSlice";

import type { InTransitCrate } from "../../src/services/transport/inTransitService";

export default function InTransitScreen() {
  const dispatch = useDispatch<any>();

  const inTransitCrates = useSelector(selectInTransitItems);
  const loading = useSelector(selectInTransitLoading);
  const error = useSelector(selectInTransitError);

  const [selectedCrate, setSelectedCrate] = useState<InTransitCrate | null>(null);

  useEffect(() => {
    dispatch(fetchInTransitCrates());
  }, [dispatch]);

  const selectedDate = new Date().toISOString();

  return (
    <Screen>
      <View className="flex-1 bg-[#031225] px-5 pt-5">
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-[24px] font-extrabold text-white">
            In Transit
          </Text>

          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back-circle-outline" size={30} color="#fff" />
          </Pressable>
        </View>

        <Text className="mb-5 text-[14px] font-semibold text-slate-400">
          {formatDisplayDate(selectedDate)}
        </Text>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2d8cff" />
            <Text className="mt-3 text-[14px] font-semibold text-slate-400">
              Loading in-transit crates...
            </Text>
          </View>
        ) : error ? (
          <View className="flex-1">
            <ErrorState text={error} onRetry={() => dispatch(fetchInTransitCrates())} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {inTransitCrates.length === 0 ? (
              <EmptyState text="No crates are currently in transit." />
            ) : (
              <View className="gap-3">
                {inTransitCrates.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedCrate(item)}
                    className="rounded-[22px] border border-slate-800 bg-[#0b172b] px-4 py-4"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 pr-3">
                        <Text className="text-[16px] font-extrabold text-white">
                          {item.id}
                        </Text>

                        <Text className="mt-1 text-[13px] text-slate-400">
                          {item.collectionCentre} → {item.destination}
                        </Text>

                        <Text className="mt-1 text-[12px] text-slate-500">
                          Picked: {formatUtcToLocal(item.pickedUpAtUtc)}
                        </Text>
                      </View>

                      <View className="rounded-full bg-[#2d8cff] px-4 py-2">
                        <Text className="text-[12px] font-extrabold text-white">
                          View
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        <DetailModal
          crate={selectedCrate}
          onClose={() => setSelectedCrate(null)}
        />
      </View>
    </Screen>
  );
}

function DetailModal({
  crate,
  onClose,
}: {
  crate: InTransitCrate | null;
  onClose: () => void;
}) {
  if (!crate) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="rounded-t-[30px] bg-[#071a35] px-5 pt-5 pb-8">
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="text-[20px] font-extrabold text-white">
              Transit Details
            </Text>

            <Pressable onPress={onClose}>
              <Ionicons name="close-circle-outline" size={30} color="#fff" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="rounded-[24px] border border-slate-700 bg-[#0b172b] p-4">
              <DetailRow label="Crate ID" value={crate.id || "-"} />
              <DetailRow label="Status" value={crate.status ? formatStatus(crate.status) : "-"} />
              <DetailRow label="Collection Centre" value={crate.collectionCentre || "-"} />
              <DetailRow label="Destination" value={crate.destination || "-"} />
              <DetailRow label="Pickup UTC" value={crate.pickedUpAtUtc || "-"} />
              <DetailRow label="Pickup GPS" value={crate.gpsPickup || "-"} />
              <DetailRow label="Vehicle" value={crate.assignedVehicleNo || "-"} />
              <DetailRow label="Notes" value={crate.notes || "-"} />

              <View className="mt-2 rounded-[18px] bg-[#102544] px-4 py-3">
                <Text className="text-[13px] font-semibold text-slate-300">
                  Temperature Logs
                </Text>

                {!crate.temperatureLogs || crate.temperatureLogs.length === 0 ? (
                  <Text className="mt-2 text-[13px] text-slate-400">
                    No temperature logs yet.
                  </Text>
                ) : (
                  <View className="mt-3 gap-2">
                    {crate.temperatureLogs.map((log, index) => (
                      <View
                        key={`${crate.id}-${index}`}
                        className="rounded-2xl bg-[#0b172b] px-3 py-3"
                      >
                        <Text className="text-[14px] font-bold text-white">
                          {log.value}
                        </Text>

                        <Text className="mt-1 text-[12px] text-slate-400">
                          {log.recordedAtUtc}
                        </Text>

                        <Text className="mt-1 text-[12px] text-slate-500">
                          Operator: {log.operatorId}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <Pressable
                onPress={() => {
                  onClose();
                  router.push({
                    pathname: "/(transport)/temp-log",
                    params: { crateId: crate.id },
                  });
                }}
                className="mt-5 items-center rounded-[22px] bg-[#18488d] py-4"
              >
                <Text className="text-[16px] font-extrabold text-white">
                  Log Temperature
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 rounded-2xl bg-[#102544] px-4 py-3">
      <Text className="text-[12px] font-semibold text-slate-400">{label}</Text>
      <Text className="mt-1 text-[15px] font-bold text-white">{value}</Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View className="items-center rounded-[22px] border border-slate-800 bg-[#0b172b] px-4 py-8">
      <Ionicons name="document-text-outline" size={34} color="#64748b" />
      <Text className="mt-3 text-center text-[14px] font-semibold text-slate-400">
        {text}
      </Text>
    </View>
  );
}

function ErrorState({
  text,
  onRetry,
}: {
  text: string;
  onRetry: () => void;
}) {
  return (
    <View className="items-center rounded-[22px] border border-red-900 bg-[#0b172b] px-4 py-8">
      <Ionicons name="alert-circle-outline" size={34} color="#ef4444" />
      <Text className="mt-3 text-center text-[14px] font-semibold text-red-400">
        {text}
      </Text>

      <Pressable
        onPress={onRetry}
        className="mt-4 rounded-full bg-[#2d8cff] px-5 py-3"
      >
        <Text className="text-[13px] font-extrabold text-white">Retry</Text>
      </Pressable>
    </View>
  );
}