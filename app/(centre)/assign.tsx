import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import Screen from "../../src/components/centre/Screen";
import PrimaryButton from "../../src/components/centre/PrimaryButton";
import Input from "../../src/components/centre/Input";
import QRScannerModal from "../../src/components/centre/QRScannerModal";

import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import {
  centreScheduleThunk,
  clearScannedCrate,
  fetchCentreCratesThunk,
  fetchCentreDashboardThunk,
  getCrateByQrThunk,
  selectCentreCrateError,
  selectCentreCrateStatus,
  selectScannedCrate,
} from "../../src/services/centre/centreCrate.slice";

function hasValue(value: any) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function getCrateStage(crate: any): "assigned" | "received" | "pending" {
  if (!crate) return "pending";

  const status = String(
    crate?.status || crate?.crate_status || crate?.dispatch_status || ""
  ).toUpperCase();

  const custody = String(
    crate?.custody || crate?.custody_status || ""
  ).toUpperCase();

  const assigned =
    custody.includes("SCHEDULED_FOR_DISPATCH") ||
    status.includes("ASSIGN") ||
    status.includes("DISPATCH") ||
    status.includes("SCHEDULED") ||
    hasValue(crate?.destination_name) ||
    hasValue(crate?.destinationName) ||
    hasValue(crate?.assigned_to) ||
    hasValue(crate?.assignedTo) ||
    hasValue(crate?.assigned_to_label) ||
    hasValue(crate?.assignedToLabel) ||
    hasValue(crate?.transport_operator_id) ||
    hasValue(crate?.assigned_transport_operator_id) ||
    hasValue(crate?.transportId) ||
    hasValue(crate?.transport_id) ||
    hasValue(crate?.driver_name) ||
    hasValue(crate?.driverName) ||
    hasValue(crate?.vehicle_no) ||
    hasValue(crate?.vehicleNo) ||
    hasValue(crate?.scheduled_time_utc);

  if (assigned) return "assigned";

  const received =
    custody.includes("RECEIVED_AT_COLLECTION_CENTRE") ||
    custody.includes("COLLECTION_CENTRE") ||
    status.includes("RECEIVE") ||
    status.includes("COLLECTION") ||
    status === "CLOSED";

  if (received) return "received";

  return "pending";
}

function toUtcIso(localValue: string) {
  if (!localValue) return "";
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function getDefaultScheduleLocal() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function valueOrDash(value: any) {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text ? text : "-";
}

function formatDateTime(value: any) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export default function CentreAssign() {
  const dispatch = useAppDispatch();

  const status = useAppSelector(selectCentreCrateStatus);
  const error = useAppSelector(selectCentreCrateError);
  const scannedCrate = useAppSelector(selectScannedCrate);

  const [scanOpen, setScanOpen] = useState(false);
  const [scannedQr, setScannedQr] = useState("");

  const [destinationName, setDestinationName] = useState(
    "Main Harbour Processing Unit"
  );
  const [transportOperatorId, setTransportOperatorId] = useState("RV-TR-009");
  const [transportId, setTransportId] = useState("TR-009");
  const [scheduledLocal, setScheduledLocal] = useState(getDefaultScheduleLocal());
  const [assignedToLabel, setAssignedToLabel] = useState(
    "Main Harbour Processing Unit"
  );
  const [driverName, setDriverName] = useState("Prakash");
  const [vehicleNo, setVehicleNo] = useState("TN51AB4321");
  const [operatorId, setOperatorId] = useState("");
  const [notes, setNotes] = useState("");

  const loading = useMemo(() => status === "loading", [status]);
  const crateStage = useMemo(() => getCrateStage(scannedCrate), [scannedCrate]);

  const crateId = useMemo(
    () => scannedCrate?.crateId ?? scannedCrate?.id ?? "",
    [scannedCrate]
  );

  const canAssign = useMemo(() => {
    return (
      !!crateId &&
      crateStage === "received" &&
      !!destinationName.trim() &&
      !!transportOperatorId.trim() &&
      !!scheduledLocal.trim()
    );
  }, [crateId, crateStage, destinationName, transportOperatorId, scheduledLocal]);

  const statusText = useMemo(() => {
    if (loading) {
      return scannedCrate ? "Assigning dispatch..." : "Fetching crate details...";
    }
    if (crateStage === "assigned") return "This crate is already assigned";
    if (crateStage === "received")
      return "Crate is received. Dispatch assign is enabled";
    if (scannedCrate)
      return "Crate is not yet received. Receive first, then assign";
    return "Ready to scan";
  }, [loading, scannedCrate, crateStage]);

  const openScanner = useCallback(() => {
    if (loading) return;
    setScanOpen(true);
  }, [loading]);

  const closeScanner = useCallback(() => {
    if (loading) return;
    setScanOpen(false);
  }, [loading]);

  const onScanned = useCallback(
    async (qrValue: string) => {
      const cleanQr = String(qrValue || "").trim();

      if (!cleanQr) {
        Alert.alert("Invalid QR", "Scanned QR value is empty.");
        return;
      }

      setScanOpen(false);
      setScannedQr(cleanQr);

      try {
        const crate = await dispatch(
          getCrateByQrThunk({ qrValue: cleanQr })
        ).unwrap();

        const stage = getCrateStage(crate);

        if (stage === "assigned") {
          Alert.alert(
            "Already Assigned",
            [
              `Crate: ${crate.crateCode || crate.code || crate.id || cleanQr}`,
              `Status: ${crate.status || "-"}`,
              `Custody: ${crate.custody || crate.custody_status || "-"}`,
              `Assigned To: ${
                crate.assignedTo ||
                crate.assigned_to ||
                crate.destinationName ||
                crate.destination_name ||
                crate.assignedToLabel ||
                crate.assigned_to_label ||
                "-"
              }`,
              `Assigned Label: ${
                crate.assignedToLabel || crate.assigned_to_label || "-"
              }`,
              `Transport Operator ID: ${
                crate.transport_operator_id ||
                crate.assigned_transport_operator_id ||
                "-"
              }`,
              `Transport ID: ${crate.transportId || crate.transport_id || "-"}`,
              `Driver Name: ${crate.driverName || crate.driver_name || "-"}`,
              `Vehicle No: ${crate.vehicleNo || crate.vehicle_no || "-"}`,
            ].join("\n")
          );
          return;
        }

        if (stage !== "received") {
          Alert.alert(
            "Receive Required",
            "Crate must be in RECEIVED_AT_COLLECTION_CENTRE status before dispatch."
          );
          return;
        }

        setAssignedToLabel(
          crate?.assignedToLabel ||
            crate?.assigned_to_label ||
            destinationName ||
            "Main Harbour Processing Unit"
        );
      } catch (e: any) {
        Alert.alert(
          "Fetch Failed",
          e?.message || "Unable to fetch crate details"
        );
      }
    },
    [dispatch, destinationName]
  );

  const handleAssign = useCallback(async () => {
    if (!scannedQr) {
      Alert.alert("Missing QR", "Please scan crate QR first.");
      return;
    }

    if (!crateId) {
      Alert.alert("Missing Crate", "Crate ID not found.");
      return;
    }

    if (crateStage === "assigned") {
      Alert.alert("Already Assigned", "This crate is already assigned.");
      return;
    }

    if (crateStage !== "received") {
      Alert.alert(
        "Receive Required",
        "Crate must be in RECEIVED_AT_COLLECTION_CENTRE status before dispatch."
      );
      return;
    }

    const scheduledTimeUtc = toUtcIso(scheduledLocal);

    if (!scheduledTimeUtc) {
      Alert.alert("Invalid Schedule", "Scheduled time is invalid.");
      return;
    }

    try {
      const crate = await dispatch(
        centreScheduleThunk({
          crateId,
          destinationName: destinationName.trim(),
          transportOperatorId: transportOperatorId.trim(),
          transportId: transportId.trim() || transportOperatorId.trim(),
          scheduledTimeUtc,
          assignedToLabel: assignedToLabel.trim() || destinationName.trim(),
          driverName: driverName.trim(),
          vehicleNo: vehicleNo.trim(),
          operatorId: operatorId.trim(),
          notes: notes.trim(),
        })
      ).unwrap();

      await Promise.all([
        dispatch(fetchCentreCratesThunk()),
        dispatch(fetchCentreDashboardThunk()),
      ]);

      Alert.alert(
        "Dispatch Assigned",
        [
          `Crate: ${crate.crateCode || crate.code || crate.id || "-"}`,
          `Destination: ${
            crate.destinationName ||
            crate.destination_name ||
            destinationName ||
            "-"
          }`,
          `Assigned To: ${
            crate.assignedTo || crate.assigned_to || operatorId || "-"
          }`,
          `Assigned Label: ${
            crate.assignedToLabel ||
            crate.assigned_to_label ||
            assignedToLabel ||
            "-"
          }`,
          `Transport Operator ID: ${
            crate.transport_operator_id ||
            crate.assigned_transport_operator_id ||
            transportOperatorId
          }`,
          `Transport ID: ${
            crate.transportId || crate.transport_id || transportId || "-"
          }`,
          `Driver Name: ${crate.driverName || crate.driver_name || driverName || "-"}`,
          `Vehicle No: ${crate.vehicleNo || crate.vehicle_no || vehicleNo || "-"}`,
          `Scheduled UTC: ${
            crate.scheduled_time_utc ||
            crate.dispatchScheduledAt ||
            crate.dispatch_scheduled_at ||
            scheduledTimeUtc
          }`,
        ].join("\n"),
        [
          { text: "Stay Here" },
          {
            text: "Go Dashboard",
            onPress: () => router.replace("/(centre)/dashboard"),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert(
        "Assign Failed",
        e?.message ||
          e?.response?.data?.message ||
          "Failed to assign dispatch"
      );
    }
  }, [
    dispatch,
    scannedQr,
    crateId,
    crateStage,
    destinationName,
    transportOperatorId,
    transportId,
    scheduledLocal,
    assignedToLabel,
    driverName,
    vehicleNo,
    operatorId,
    notes,
  ]);

  const handleRescan = useCallback(() => {
    if (loading) return;
    setScannedQr("");
    dispatch(clearScannedCrate());
    setScanOpen(true);
  }, [dispatch, loading]);

  const handleClear = useCallback(() => {
    if (loading) return;
    setScannedQr("");
    dispatch(clearScannedCrate());
  }, [dispatch, loading]);

  return (
    <Screen>
      <ScrollView
        className="flex-1 bg-white p-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <View className="flex-row items-center">
            <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
              <Ionicons name="car-outline" size={24} color="#2563eb" />
            </View>

            <View className="flex-1">
              <Text className="text-xl font-bold text-slate-900">
                Assign Dispatch
              </Text>
              <Text className="mt-1 text-sm text-slate-600">
                Scan crate QR, verify received status, then assign transport.
              </Text>
            </View>
          </View>
        </View>

        <View className="mb-4 rounded-3xl border border-slate-200 bg-white p-4">
          <Text className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Assign Context
          </Text>

          <View className="mt-3 gap-2">
            <DetailRow label="Scanned QR / Code" value={scannedQr || "-"} />
            <DetailRow label="Resolved Crate ID" value={String(crateId || "-")} />
          </View>
        </View>

        <View className="mb-4 rounded-3xl border border-slate-200 bg-white p-4">
          <Text className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Current Status
          </Text>

          <View className="mt-3 flex-row items-center">
            {loading ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Ionicons
                name={
                  crateStage === "assigned"
                    ? "checkmark-done-circle-outline"
                    : crateStage === "received"
                    ? "cube-outline"
                    : "alert-circle-outline"
                }
                size={20}
                color={
                  crateStage === "assigned"
                    ? "#2563eb"
                    : crateStage === "received"
                    ? "#16a34a"
                    : "#dc2626"
                }
              />
            )}

            <Text className="ml-2 text-sm font-medium text-slate-800">
              {statusText}
            </Text>
          </View>
        </View>

        {!!error && (
          <View className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-4">
            <Text className="text-sm font-semibold text-red-700">Error</Text>
            <Text className="mt-1 text-sm text-red-600">{error}</Text>
          </View>
        )}

        {!!scannedCrate && (
          <View className="mb-4 rounded-3xl border border-blue-200 bg-blue-50 p-4">
            <Text className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Scanned Crate Details
            </Text>

            <View className="mt-3 gap-2">
              <DetailRow
                label="Crate Code"
                value={String(
                  scannedCrate.crateCode ||
                    scannedCrate.code ||
                    scannedCrate.crateId ||
                    scannedCrate.id ||
                    "-"
                )}
              />
              <DetailRow
                label="Status"
                value={String(scannedCrate.status || "-")}
              />
              <DetailRow
                label="Custody"
                value={String(
                  scannedCrate.custody || scannedCrate.custody_status || "-"
                )}
              />
              <DetailRow
                label="Assigned To"
                value={valueOrDash(
                  scannedCrate.assignedTo ||
                    scannedCrate.assigned_to ||
                    scannedCrate.destinationName ||
                    scannedCrate.destination_name
                )}
              />
              <DetailRow
                label="Assigned Label"
                value={valueOrDash(
                  scannedCrate.assignedToLabel || scannedCrate.assigned_to_label
                )}
              />
              <DetailRow
                label="Transport Operator ID"
                value={valueOrDash(
                  scannedCrate.transport_operator_id ||
                    scannedCrate.assigned_transport_operator_id
                )}
              />
              <DetailRow
                label="Transport ID"
                value={valueOrDash(
                  scannedCrate.transportId || scannedCrate.transport_id
                )}
              />
              <DetailRow
                label="Driver Name"
                value={valueOrDash(
                  scannedCrate.driverName || scannedCrate.driver_name
                )}
              />
              <DetailRow
                label="Vehicle Number"
                value={valueOrDash(
                  scannedCrate.vehicleNo || scannedCrate.vehicle_no
                )}
              />
              <DetailRow
                label="Assigned At"
                value={formatDateTime(
                  scannedCrate.assignedAt ||
                    scannedCrate.assigned_at ||
                    scannedCrate.scheduled_time_utc ||
                    scannedCrate.dispatchScheduledAt ||
                    scannedCrate.dispatch_scheduled_at
                )}
              />
              <DetailRow
                label="Temperature"
                value={valueOrDash(
                  scannedCrate.latestTemperature ||
                    scannedCrate.temperature ||
                    scannedCrate.temperature_value ||
                    scannedCrate.temperature_c
                )}
              />
            </View>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <SecondaryButton
                  title="Rescan"
                  icon="refresh-outline"
                  onPress={handleRescan}
                  disabled={loading}
                />
              </View>

              <View className="flex-1">
                <SecondaryButton
                  title="Clear"
                  icon="close-outline"
                  onPress={handleClear}
                  disabled={loading}
                />
              </View>
            </View>
          </View>
        )}

        <View className="mb-4 gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <Input
            label="Destination Name"
            value={destinationName}
            onChangeText={setDestinationName}
          />

          <Input
            label="Transport Operator ID"
            value={transportOperatorId}
            onChangeText={setTransportOperatorId}
          />

          <Input
            label="Transport ID"
            value={transportId}
            onChangeText={setTransportId}
          />

          <Input
            label="Scheduled Local Time"
            value={scheduledLocal}
            onChangeText={setScheduledLocal}
            placeholder="YYYY-MM-DDTHH:mm"
          />

          <Input
            label="Assigned To Label"
            value={assignedToLabel}
            onChangeText={setAssignedToLabel}
          />

          <Input
            label="Driver Name"
            value={driverName}
            onChangeText={setDriverName}
          />

          <Input
            label="Vehicle Number"
            value={vehicleNo}
            onChangeText={setVehicleNo}
          />

          <Input
            label="Operator ID"
            value={operatorId}
            onChangeText={setOperatorId}
          />

          <Input
            label="Notes"
            value={notes}
            onChangeText={setNotes}
          />

          {!scannedCrate ? (
            <PrimaryButton
              title={loading ? "Loading..." : "Open Scanner"}
              onPress={openScanner}
              loading={loading}
            />
          ) : (
            <PrimaryButton
              title={
                crateStage === "assigned"
                  ? "Already Assigned"
                  : crateStage !== "received"
                  ? "Receive Required Before Dispatch"
                  : loading
                  ? "Assigning..."
                  : "Assign Dispatch"
              }
              onPress={handleAssign}
              loading={loading}
              disabled={!canAssign || loading}
            />
          )}
        </View>
      </ScrollView>

      <QRScannerModal
        open={scanOpen}
        onClose={closeScanner}
        onScanned={onScanned}
        title="Scan Crate to Assign Dispatch"
      />
    </Screen>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-sm text-slate-600">{label}</Text>
      <Text className="ml-3 flex-1 text-right text-sm font-semibold text-slate-900">
        {value}
      </Text>
    </View>
  );
}

function SecondaryButton({
  title,
  icon,
  onPress,
  disabled,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-center rounded-2xl px-4 py-3 ${
        disabled ? "bg-slate-300" : "bg-slate-200"
      }`}
    >
      <Ionicons name={icon} size={18} color="#0f172a" />
      <Text className="ml-2 font-semibold text-slate-900">{title}</Text>
    </Pressable>
  );
}