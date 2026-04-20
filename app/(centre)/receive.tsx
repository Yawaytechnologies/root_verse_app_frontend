import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import Screen from "../../src/components/centre/Screen";
import PrimaryButton from "../../src/components/centre/PrimaryButton";
import QRScannerModal from "../../src/components/centre/QRScannerModal";

import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import {
  centreReceiveThunk,
  clearScannedCrate,
  fetchCentreCratesThunk,
  fetchCentreDashboardThunk,
  getCrateByQrThunk,
  selectCentreCrateError,
  selectCentreCrateStatus,
  selectCentreLastCrate,
  selectScannedCrate,
} from "../../src/services/centre/centreCrate.slice";
import { deriveCrateStage } from "../../src/services/centre/centreCrate.service";

export default function CentreReceive() {
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ code?: string }>();

  const status = useAppSelector(selectCentreCrateStatus);
  const error = useAppSelector(selectCentreCrateError);
  const lastCrate = useAppSelector(selectCentreLastCrate);
  const scannedCrate = useAppSelector(selectScannedCrate);

  const [scanOpen, setScanOpen] = useState(false);
  const [scannedQr, setScannedQr] = useState(String(params?.code || ""));

  const loading = useMemo(() => status === "loading", [status]);
  const crateStage = useMemo(
    () => deriveCrateStage(scannedCrate),
    [scannedCrate]
  );

  const statusText = useMemo(() => {
    if (status === "loading") {
      return scannedCrate ? "Receiving crate..." : "Fetching crate details...";
    }
    if (crateStage === "assigned") return "This crate is already assigned";
    if (crateStage === "received") return "This crate is already received";
    if (scannedCrate) return "This crate is ready to receive";
    return "Ready to scan";
  }, [status, scannedCrate, crateStage]);

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
      const cleanQr = qrValue?.trim();

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

        const stage = deriveCrateStage(crate);

        if (stage === "assigned") {
          Alert.alert(
            "Already Assigned",
            [
              `Crate: ${crate.crateCode || crate.code || crate.id || cleanQr}`,
              `Status: ${crate.status || "-"}`,
              `Custody: ${crate.custody || crate.custody_status || "-"}`,
            ].join("\n")
          );
        } else if (stage === "received") {
          Alert.alert(
            "Already Received",
            [
              `Crate: ${crate.crateCode || crate.code || crate.id || cleanQr}`,
              `Status: ${crate.status || "-"}`,
              `Custody: ${crate.custody || crate.custody_status || "-"}`,
            ].join("\n")
          );
        }
      } catch (e: any) {
        Alert.alert(
          "Fetch Failed",
          e?.message || "Unable to fetch crate details"
        );
      }
    },
    [dispatch]
  );

  const handleReceive = useCallback(async () => {
    if (!scannedQr) {
      Alert.alert("Missing QR", "Please scan crate QR first.");
      return;
    }

    if (crateStage === "received") {
      Alert.alert("Already Received", "This crate is already received.");
      return;
    }

    if (crateStage === "assigned") {
      Alert.alert("Already Assigned", "This crate is already assigned.");
      return;
    }

    try {
      const crate = await dispatch(
        centreReceiveThunk({
          qrValue: scannedQr,
        })
      ).unwrap();

      await Promise.all([
        dispatch(fetchCentreCratesThunk()),
        dispatch(fetchCentreDashboardThunk()),
      ]);

      Alert.alert(
        "Crate Received",
        [
          `Crate Code: ${crate.crateCode || crate.code || crate.id || "-"}`,
          `Status: ${crate.status || "-"}`,
          `Grade: ${crate.grade || "-"}`,
          `Weight: ${crate.weight || crate.total_weight || "-"}`,
          `Custody Status: ${crate.custody || crate.custody_status || "-"}`,
          `Received Centre ID: ${
            crate.centreId || crate.received_centre_id || "-"
          }`,
        ].join("\n"),
        [
          { text: "Stay Here" },
          {
            text: "Log Temperature",
            onPress: () =>
              router.push({
                pathname: "/(centre)/temp-log",
                params: {
                  code: String(crate.crateCode || crate.code || scannedQr),
                },
              }),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert("Receive Failed", e?.message || "Receive failed");
    }
  }, [dispatch, scannedQr, crateStage]);

  const handleRescan = useCallback(() => {
    if (loading) return;
    setScannedQr("");
    dispatch(clearScannedCrate());
    setScanOpen(true);
  }, [dispatch, loading]);

  const handleClearPreview = useCallback(() => {
    if (loading) return;
    setScannedQr("");
    dispatch(clearScannedCrate());
  }, [dispatch, loading]);

  const receiveDisabled =
    loading || crateStage === "received" || crateStage === "assigned";

  return (
    <Screen>
      <ScrollView
        className="flex-1 bg-[#eef4ff] px-4 py-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="mb-4 rounded-[30px] border border-[#d4e2ff] bg-white p-4 shadow-sm">
          <View className="flex-row items-center">
            <View className="mr-3 h-14 w-14 items-center justify-center rounded-[20px] bg-[#dbeafe]">
              <MaterialCommunityIcons
                name="warehouse"
                size={28}
                color="#2563eb"
              />
            </View>

            <View className="flex-1">
              <Text className="text-[20px] font-extrabold text-slate-900">
                Collection Centre
              </Text>
              <Text className="mt-1 text-[14px] leading-5 text-slate-600">
                Scan crate QR, verify live status, then receive only if it is not
                already processed.
              </Text>
            </View>
          </View>
        </View>

        <Card title="Receive Context">
          <DetailRow label="Scanned QR / Code" value={scannedQr || "-"} />
        </Card>

        <Card title="Current Status">
          <View className="flex-row items-center">
            {loading ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Ionicons
                name={
                  crateStage === "assigned"
                    ? "car-outline"
                    : crateStage === "received"
                    ? "checkmark-circle-outline"
                    : scannedCrate
                    ? "cube-outline"
                    : "scan-outline"
                }
                size={22}
                color={
                  crateStage === "assigned"
                    ? "#2563eb"
                    : crateStage === "received"
                    ? "#16a34a"
                    : "#2563eb"
                }
              />
            )}

            <Text className="ml-2 text-[15px] font-bold text-slate-800">
              {statusText}
            </Text>
          </View>
        </Card>

        {!!error && (
          <View className="mb-4 rounded-[26px] border border-red-200 bg-red-50 p-4">
            <Text className="text-sm font-semibold text-red-700">Error</Text>
            <Text className="mt-1 text-sm text-red-600">{error}</Text>
          </View>
        )}

        {!!scannedCrate && (
          <View className="mb-4 rounded-[30px] border border-[#bfd7ff] bg-[#f7fbff] p-4">
            <Text className="text-xs font-bold uppercase tracking-wide text-[#2457d6]">
              Scanned Crate Details
            </Text>

            <View className="mt-4 gap-3">
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
                label="Grade"
                value={String(scannedCrate.grade || "-")}
              />
              <DetailRow
                label="Weight"
                value={String(
                  scannedCrate.total_weight || scannedCrate.weight || "-"
                )}
              />
              <DetailRow
                label="Received Centre ID"
                value={String(
                  scannedCrate.centreId ||
                    scannedCrate.received_centre_id ||
                    "-"
                )}
              />
              <DetailRow
                label="Assigned To"
                value={String(
                  scannedCrate.destinationName ||
                    scannedCrate.destination_name ||
                    scannedCrate.assignedToLabel ||
                    scannedCrate.assigned_to_label ||
                    "-"
                )}
              />
              <DetailRow
                label="Latest Temperature"
                value={
                  scannedCrate.latestTemperature !== null &&
                  scannedCrate.latestTemperature !== undefined &&
                  String(scannedCrate.latestTemperature) !== ""
                    ? `${scannedCrate.latestTemperature} °C`
                    : "-"
                }
              />
              <DetailRow
                label="Created At"
                value={String(scannedCrate.createdAt || scannedCrate.created_at || "-")}
              />
            </View>

            <View className="mt-5 gap-3">
              <PrimaryButton
                title={
                  crateStage === "assigned"
                    ? "Already Assigned"
                    : crateStage === "received"
                    ? "Already Received"
                    : loading
                    ? "Receiving..."
                    : "Verify & Receive"
                }
                onPress={handleReceive}
                loading={loading}
                disabled={receiveDisabled}
              />

              <View className="flex-row gap-3">
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
                    onPress={handleClearPreview}
                    disabled={loading}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {!!lastCrate && (
          <View className="mb-4 rounded-[30px] border border-emerald-200 bg-emerald-50 p-4">
            <Text className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Last Received Crate
            </Text>

            <View className="mt-3 gap-3">
              <DetailRow
                label="Crate Code"
                value={String(
                  lastCrate.crateCode ||
                    lastCrate.code ||
                    lastCrate.crateId ||
                    lastCrate.id ||
                    "-"
                )}
              />
              <DetailRow label="Status" value={String(lastCrate.status || "-")} />
              <DetailRow
                label="Custody"
                value={String(
                  lastCrate.custody || lastCrate.custody_status || "-"
                )}
              />
            </View>
          </View>
        )}

        {!scannedCrate && (
          <PrimaryButton
            title={loading ? "Loading..." : "Open Scanner"}
            onPress={openScanner}
            loading={loading}
          />
        )}
      </ScrollView>

      <QRScannerModal
        open={scanOpen}
        onClose={closeScanner}
        onScanned={onScanned}
        title="Scan Crate to Verify"
      />
    </Screen>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 rounded-[30px] border border-[#dbe4f0] bg-white p-4">
      <Text className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </Text>
      <View className="mt-4">{children}</View>
    </View>
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
    <View className="flex-row items-start justify-between">
      <Text className="w-[42%] text-[14px] text-slate-600">{label}</Text>
      <Text className="ml-3 flex-1 text-right text-[15px] font-bold text-slate-900">
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
      className={`flex-row items-center justify-center rounded-[22px] px-4 py-4 ${
        disabled ? "bg-slate-300" : "bg-slate-200"
      }`}
    >
      <Ionicons name={icon} size={18} color="#0f172a" />
      <Text className="ml-2 text-[16px] font-bold text-slate-900">{title}</Text>
    </Pressable>
  );
}