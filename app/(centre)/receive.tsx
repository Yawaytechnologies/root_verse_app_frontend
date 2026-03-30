import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../src/components/centre/Screen";
import PrimaryButton from "../../src/components/centre/PrimaryButton";
import QRScannerModal from "../../src/components/centre/QRScannerModal";

import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import {
  centreReceiveThunk,
  clearScannedCrate,
  getCrateByQrThunk,
  selectCentreCrateError,
  selectCentreCrateStatus,
  selectCentreLastCrate,
  selectScannedCrate,
} from "../../src/services/centre/centreCrate.slice";

export default function CentreReceive() {
  const dispatch = useAppDispatch();

  const status = useAppSelector(selectCentreCrateStatus);
  const error = useAppSelector(selectCentreCrateError);
  const lastCrate = useAppSelector(selectCentreLastCrate);
  const scannedCrate = useAppSelector(selectScannedCrate);

  const [scanOpen, setScanOpen] = useState(false);
  const [scannedQr, setScannedQr] = useState("");

  // TEMP VALUES
  // later replace from login/profile/api/me
  const centreId = 101;
  const operatorId = 5001;

  const loading = useMemo(() => status === "loading", [status]);

  const statusText = useMemo(() => {
    if (status === "loading") {
      return scannedCrate ? "Receiving crate..." : "Fetching crate details...";
    }
    if (status === "succeeded") return "Crate received successfully";
    if (status === "failed") return "Operation failed";
    if (scannedCrate) return "Verify scanned crate and receive";
    return "Ready to scan";
  }, [status, scannedCrate]);

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
        await dispatch(getCrateByQrThunk({ qrValue: cleanQr })).unwrap();
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

    if (!scannedCrate) {
      Alert.alert("No Crate", "No scanned crate available to receive.");
      return;
    }

    try {
      const crate = await dispatch(
        centreReceiveThunk({
          qrValue: scannedQr,
          centreId,
          operatorId,
        })
      ).unwrap();

      Alert.alert(
        "Crate Received",
        [
          `Crate Code: ${crate.crateCode || crate.id || "-"}`,
          `Status: ${crate.status || "-"}`,
          `Custody: ${crate.custody || "-"}`,
          `Centre ID: ${crate.centreId ?? centreId}`,
          `Operator ID: ${crate.operatorId ?? operatorId}`,
        ].join("\n")
      );

      setScannedQr("");
    } catch (e: any) {
      Alert.alert("Receive Failed", e?.message || "Receive failed");
    }
  }, [dispatch, scannedQr, scannedCrate, centreId, operatorId]);

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

  return (
    <Screen>
      <View className="flex-1 bg-white p-4">
        {/* Header */}
        <View className="rounded-3xl border border-slate-200 bg-slate-50 p-4 mb-4">
          <View className="flex-row items-center">
            <View className="h-12 w-12 rounded-2xl bg-blue-100 items-center justify-center mr-3">
              <Ionicons name="business-outline" size={24} color="#2563eb" />
            </View>

            <View className="flex-1">
              <Text className="text-slate-900 text-xl font-bold">
                Collection Centre
              </Text>
              <Text className="text-slate-600 text-sm mt-1">
                Scan crate QR, verify crate details, then receive it at centre.
              </Text>
            </View>
          </View>
        </View>

        {/* Context */}
        <View className="rounded-3xl border border-slate-200 bg-white p-4 mb-4">
          <Text className="text-xs uppercase tracking-wide text-slate-500 font-medium">
            Receive Context
          </Text>

          <View className="mt-3 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-slate-600 text-sm">Centre ID</Text>
              <Text className="text-slate-900 text-sm font-semibold">
                {centreId}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-slate-600 text-sm">Operator ID</Text>
              <Text className="text-slate-900 text-sm font-semibold">
                {operatorId}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-slate-600 text-sm">Scanned QR</Text>
              <Text className="text-slate-900 text-sm font-semibold">
                {scannedQr || "-"}
              </Text>
            </View>
          </View>
        </View>

        {/* Status */}
        <View className="rounded-3xl border border-slate-200 bg-white p-4 mb-4">
          <Text className="text-xs uppercase tracking-wide text-slate-500 font-medium">
            Current Status
          </Text>

          <View className="mt-3 flex-row items-center">
            {loading ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Ionicons
                name={
                  status === "failed"
                    ? "alert-circle-outline"
                    : status === "succeeded"
                    ? "checkmark-circle-outline"
                    : scannedCrate
                    ? "cube-outline"
                    : "scan-outline"
                }
                size={20}
                color={
                  status === "failed"
                    ? "#dc2626"
                    : status === "succeeded"
                    ? "#16a34a"
                    : "#2563eb"
                }
              />
            )}

            <Text className="ml-2 text-slate-800 font-medium text-sm">
              {statusText}
            </Text>
          </View>
        </View>

        {/* Error */}
        {!!error && (
          <View className="rounded-3xl border border-red-200 bg-red-50 p-4 mb-4">
            <View className="flex-row items-start">
              <Ionicons
                name="warning-outline"
                size={20}
                color="#dc2626"
                style={{ marginTop: 2 }}
              />
              <View className="ml-2 flex-1">
                <Text className="text-red-700 font-semibold text-sm">
                  Error
                </Text>
                <Text className="text-red-600 text-sm mt-1">{error}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Scanned crate preview */}
        {!!scannedCrate && (
          <View className="rounded-3xl border border-blue-200 bg-blue-50 p-4 mb-4">
            <Text className="text-xs uppercase tracking-wide text-blue-700 font-medium">
              Scanned Crate Details
            </Text>

            <View className="mt-3 gap-2">
              <DetailRow
                label="Crate Code"
                value={String(scannedCrate.crateCode || scannedCrate.id || "-")}
              />

              <DetailRow
                label="Status"
                value={String(scannedCrate.status || "-")}
              />

              <DetailRow
                label="Custody"
                value={String(scannedCrate.custody || "-")}
              />

              <DetailRow
                label="Centre ID"
                value={String((scannedCrate as any).centreId ?? "-")}
              />

              <DetailRow
                label="Operator ID"
                value={String((scannedCrate as any).operatorId ?? "-")}
              />

              <DetailRow
                label="Fish Type"
                value={String((scannedCrate as any).fishType ?? "-")}
              />

              <DetailRow
                label="Weight"
                value={String((scannedCrate as any).weight ?? "-")}
              />

              <DetailRow
                label="Source"
                value={String((scannedCrate as any).source ?? "-")}
              />
            </View>

            <View className="mt-4 gap-3">
              <PrimaryButton
                title={loading ? "Receiving..." : "Verify & Receive"}
                onPress={handleReceive}
                loading={loading}
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

        {/* Last received crate */}
        {!!lastCrate && (
          <View className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 mb-4">
            <Text className="text-xs uppercase tracking-wide text-emerald-700 font-medium">
              Last Received Crate
            </Text>

            <View className="mt-3 gap-2">
              <DetailRow
                label="Crate Code"
                value={String(lastCrate.crateCode || lastCrate.id || "-")}
              />

              <DetailRow
                label="Status"
                value={String(lastCrate.status || "-")}
              />

              <DetailRow
                label="Custody"
                value={String(lastCrate.custody || "-")}
              />

              <DetailRow
                label="Centre ID"
                value={String((lastCrate as any).centreId ?? "-")}
              />

              <DetailRow
                label="Operator ID"
                value={String((lastCrate as any).operatorId ?? "-")}
              />
            </View>
          </View>
        )}

        {/* Open scanner only when no preview exists */}
        {!scannedCrate && (
          <View className="mt-auto">
            <PrimaryButton
              title={loading ? "Loading..." : "Open Scanner"}
              onPress={openScanner}
              loading={loading}
            />
          </View>
        )}

        <QRScannerModal
          open={scanOpen}
          onClose={closeScanner}
          onScanned={onScanned}
          title="Scan Crate to Verify"
        />
      </View>
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
      <Text className="text-slate-600 text-sm">{label}</Text>
      <Text className="text-slate-900 text-sm font-semibold flex-1 text-right ml-3">
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
      className={`rounded-2xl py-3 px-4 flex-row items-center justify-center ${
        disabled ? "bg-slate-300" : "bg-slate-200"
      }`}
    >
      <Ionicons name={icon} size={18} color="#0f172a" />
      <Text className="text-slate-900 font-semibold ml-2">{title}</Text>
    </Pressable>
  );
}