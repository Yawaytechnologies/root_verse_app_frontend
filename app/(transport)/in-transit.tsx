import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";

import Screen from "../../src/components/centre/Screen";
import {
  fetchInTransitCrates,
  selectInTransitError,
  selectInTransitItems,
  selectInTransitLoading,
} from "../../src/services/transport/inTransitSlice";
import {
  fetchLoggedInTransportOperatorThunk,
  fetchTransportDashboard,
  selectCurrentTransport,
  selectCurrentTransportOperator,
  selectTransportSelectedDate,
} from "../../src/services/transport/transportSlice";

import type { InTransitCrate } from "../../src/services/transport/inTransitService";

function parseDateKey(dateKey?: string) {
  if (!dateKey) return new Date();
  const [y, m, d] = String(dateKey).split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function formatDisplayDate(dateKey?: string) {
  if (!dateKey) return "-";
  const d = parseDateKey(dateKey);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatUtcToLocal(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(value?: string) {
  if (!value) return "-";
  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

function firstText(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function firstArray(...values: any[]) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function getCrateMatchId(crate: any) {
  return String(crate?.crateId || crate?.id || "");
}

function normalizeTemperatureLogs(input: any) {
  const logs = firstArray(
    input,
    input?.temperatureLogs,
    input?.temperature_logs,
    input?.temperature_log,
    input?.temp_logs,
    input?.logs,
    input?.raw?.temperatureLogs,
    input?.raw?.temperature_logs,
    input?.raw?.temperature_log,
    input?.raw?.temp_logs,
    input?.raw?.logs,
    input?.raw?.data?.temperatureLogs,
    input?.raw?.data?.temperature_logs,
    input?.raw?.data?.temperature_log,
    input?.raw?.data?.temp_logs,
    input?.raw?.data?.logs,
    input?.data?.temperatureLogs,
    input?.data?.temperature_logs,
    input?.data?.temperature_log,
    input?.data?.temp_logs,
    input?.data?.logs
  );

  if (!Array.isArray(logs)) return [];

  return logs.map((log: any, index: number) => ({
    id: String(
      log?.id ??
        `${firstText(
          log?.recordedAtUtc,
          log?.recorded_at_utc,
          log?.logged_at,
          log?.created_at,
          log?.timestamp,
          index
        )}-${index}`
    ),
    value: firstText(
      log?.value,
      log?.temperature_value,
      log?.temperature,
      log?.temp
    ),
    recordedAtUtc: firstText(
      log?.recordedAtUtc,
      log?.recorded_at_utc,
      log?.logged_at,
      log?.created_at,
      log?.timestamp
    ),
    operatorId: firstText(
      log?.operatorId,
      log?.operator_id,
      log?.transport_operator_id,
      log?.logged_by,
      log?.user_id
    ),
  }));
}

export default function InTransitScreen() {
  const dispatch = useDispatch<any>();

  const inTransitCrates = useSelector(selectInTransitItems);
  const loading = useSelector(selectInTransitLoading);
  const error = useSelector(selectInTransitError);
  const selectedDate = useSelector(selectTransportSelectedDate);

  const currentTransport = useSelector(selectCurrentTransport);
  const currentTransportOperator = useSelector(selectCurrentTransportOperator);

  const [selectedCrateId, setSelectedCrateId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(
      fetchInTransitCrates(selectedDate ? { date: selectedDate } : undefined)
    );
    dispatch(
      fetchTransportDashboard(selectedDate ? { date: selectedDate } : undefined)
    );
    dispatch(fetchLoggedInTransportOperatorThunk());
  }, [dispatch, selectedDate]);

  const selectedCrate = useMemo(() => {
    if (!selectedCrateId) return null;

    return (
      inTransitCrates.find(
        (item: any) => getCrateMatchId(item) === String(selectedCrateId)
      ) || null
    );
  }, [selectedCrateId, inTransitCrates]);

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
            <ErrorState
              text={error}
              onRetry={() => {
                dispatch(
                  fetchInTransitCrates(
                    selectedDate ? { date: selectedDate } : undefined
                  )
                );
                dispatch(
                  fetchTransportDashboard(
                    selectedDate ? { date: selectedDate } : undefined
                  )
                );
                dispatch(fetchLoggedInTransportOperatorThunk());
              }}
            />
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
                {inTransitCrates.map((item) => {
                  const crateKey = item.crateId || item.id;
                  const crateLabel =
                    (item as any).crateQr ||
                    item.code ||
                    item.crateId ||
                    item.id;

                  const itemLogs = normalizeTemperatureLogs(item);

                  return (
                    <Pressable
                      key={String(crateKey)}
                      onPress={() => setSelectedCrateId(String(crateKey))}
                      className="rounded-[22px] border border-slate-800 bg-[#0b172b] px-4 py-4"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-3">
                          <Text className="text-[16px] font-extrabold text-white">
                            {crateLabel}
                          </Text>

                          <Text className="mt-1 text-[13px] text-slate-400">
                            {item.collectionCentre || "-"} →{" "}
                            {item.destination || "-"}
                          </Text>

                          <Text className="mt-1 text-[12px] text-slate-500">
                            Picked:{" "}
                            {formatUtcToLocal(
                              (item as any).pickedUpAtUtc ||
                                (item as any).pickupUtc ||
                                (item as any).picked_up_at_utc
                            )}
                          </Text>

                          <Text className="mt-1 text-[12px] text-slate-500">
                            Temperature Logs: {itemLogs.length}
                          </Text>
                        </View>

                        <View className="rounded-full bg-[#2d8cff] px-4 py-2">
                          <Text className="text-[12px] font-extrabold text-white">
                            View
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        <DetailModal
          crate={selectedCrate}
          currentTransport={currentTransport}
          currentTransportOperator={currentTransportOperator}
          onClose={() => setSelectedCrateId(null)}
        />
      </View>
    </Screen>
  );
}

function DetailModal({
  crate,
  currentTransport,
  currentTransportOperator,
  onClose,
}: {
  crate: InTransitCrate | null;
  currentTransport: any;
  currentTransportOperator: any;
  onClose: () => void;
}) {
  if (!crate) return null;

  const crateNavId = crate.crateId || crate.id;

  const crateLabel = firstText(
    (crate as any)?.crateQr,
    (crate as any)?.code,
    (crate as any)?.crateId,
    (crate as any)?.id
  );

  const status = firstText((crate as any)?.status);

  const collectionCentre = firstText(
    (crate as any)?.collectionCentre,
    (crate as any)?.collectionCentreName,
    (crate as any)?.collection_centre_name,
    (crate as any)?.source_name,
    currentTransportOperator?.collectionCentreName,
    currentTransportOperator?.collection_centre_name,
    currentTransport?.collectionCentreName,
    currentTransport?.collection_centre_name,
    currentTransport?.source_name
  );

  const collectionCentreId = firstText(
    (crate as any)?.collectionCentreId,
    (crate as any)?.collection_centre_id,
    currentTransportOperator?.collectionCentreId,
    currentTransportOperator?.collection_centre_id,
    currentTransport?.collectionCentreId,
    currentTransport?.collection_centre_id
  );

  const destination = firstText(
    (crate as any)?.destination,
    (crate as any)?.destination_name,
    (crate as any)?.destinationCentreName
  );

  const pickupUtc = firstText(
    (crate as any)?.pickedUpAtUtc,
    (crate as any)?.pickupUtc,
    (crate as any)?.picked_up_at_utc,
    (crate as any)?.pickup_utc,
    (crate as any)?.updated_at,
    (crate as any)?.created_at
  );

  const pickupGps = firstText(
    (crate as any)?.gpsPickup,
    (crate as any)?.gps_pickup,
    (crate as any)?.pickup_gps,
    (crate as any)?.gps
  );

  const vehicleNo = firstText(
    (crate as any)?.vehicleNo,
    (crate as any)?.vehicle_no,
    (crate as any)?.assignedVehicleNo,
    (crate as any)?.assigned_vehicle_no,
    currentTransport?.vehicleNo,
    currentTransport?.vehicle_no,
    currentTransportOperator?.vehicleNo,
    currentTransportOperator?.vehicle_no
  );

  const driverName = firstText(
    (crate as any)?.driverName,
    (crate as any)?.driver_name,
    currentTransportOperator?.driverName,
    currentTransportOperator?.driver_name,
    currentTransportOperator?.full_name,
    currentTransport?.driverName,
    currentTransport?.driver_name,
    currentTransport?.full_name,
    currentTransport?.name
  );

  const transportId = firstText(
    (crate as any)?.transportId,
    (crate as any)?.transport_id,
    currentTransportOperator?.transportId,
    currentTransportOperator?.transport_id,
    currentTransportOperator?.user_id,
    currentTransport?.transportId,
    currentTransport?.transport_id,
    currentTransport?.id
  );

  const transportOperatorId = firstText(
    (crate as any)?.transportOperatorId,
    (crate as any)?.transport_operator_id,
    (crate as any)?.operator_id,
    currentTransportOperator?.user_id,
    currentTransport?.transportOperatorId,
    currentTransport?.transport_operator_id,
    currentTransport?.operator_id
  );

  const notes = firstText(
    (crate as any)?.notes,
    (crate as any)?.remark,
    (crate as any)?.description
  );

  const temperatureLogs = normalizeTemperatureLogs(crate);

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
              <DetailRow label="Crate ID" value={crateLabel || "-"} />
              <DetailRow
                label="Status"
                value={status ? formatStatus(status) : "-"}
              />
              <DetailRow
                label="Collection Centre"
                value={collectionCentre || "-"}
              />
              <DetailRow
                label="Collection Centre ID"
                value={collectionCentreId || "-"}
              />
              <DetailRow label="Destination" value={destination || "-"} />
              <DetailRow label="Pickup UTC" value={pickupUtc || "-"} />
              <DetailRow label="Pickup GPS" value={pickupGps || "-"} />
              <DetailRow label="Vehicle" value={vehicleNo || "-"} />
              <DetailRow label="Driver" value={driverName || "-"} />
              <DetailRow label="Transport ID" value={transportId || "-"} />
              <DetailRow
                label="Transport Operator ID"
                value={transportOperatorId || "-"}
              />
              <DetailRow label="Notes" value={notes || "-"} />

              <View className="mt-2 rounded-[18px] bg-[#102544] px-4 py-3">
                <Text className="text-[13px] font-semibold text-slate-300">
                  Temperature Logs
                </Text>

                {temperatureLogs.length === 0 ? (
                  <Text className="mt-2 text-[13px] text-slate-400">
                    No temperature logs yet.
                  </Text>
                ) : (
                  <View className="mt-3 gap-2">
                    {temperatureLogs.map((log) => (
                      <View
                        key={`${crate.id}-${log.id}`}
                        className="rounded-2xl bg-[#0b172b] px-3 py-3"
                      >
                        <Text className="text-[14px] font-bold text-white">
                          {log.value || "-"}
                        </Text>

                        <Text className="mt-1 text-[12px] text-slate-400">
                          {formatUtcToLocal(log.recordedAtUtc)}
                        </Text>

                        <Text className="mt-1 text-[12px] text-slate-500">
                          Operator: {log.operatorId || "-"}
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
                    params: { crateId: String(crateNavId) },
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