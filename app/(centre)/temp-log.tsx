import React, { useEffect, useMemo, useState } from "react";
import { Alert, Text, View, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../src/components/centre/Screen";
import PrimaryButton from "../../src/components/centre/PrimaryButton";
import Input from "../../src/components/centre/Input";
import QRScannerModal from "../../src/components/centre/QRScannerModal";

import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import {
  centreTempLogThunk,
  clearScannedCrate,
  fetchCentreCratesThunk,
  fetchCentreDashboardThunk,
  getCrateByQrThunk,
  selectCentreCrateStatus,
  selectCentreCrateError,
  selectCentreLastTempLoggedAt,
  selectScannedCrate,
} from "../../src/services/centre/centreCrate.slice";
import { deriveCrateStage } from "../../src/services/centre/centreCrate.service";

export default function CentreTempLog() {
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ code?: string }>();

  const status = useAppSelector(selectCentreCrateStatus);
  const error = useAppSelector(selectCentreCrateError);
  const lastLoggedAt = useAppSelector(selectCentreLastTempLoggedAt);
  const scannedCrate = useAppSelector(selectScannedCrate);

  const [scanOpen, setScanOpen] = useState(false);
  const [tempC, setTempC] = useState("0.6");

  const loading = useMemo(() => status === "loading", [status]);
  const isValid = useMemo(() => {
    const value = Number(tempC);
    return Number.isFinite(value);
  }, [tempC]);
  const crateStage = useMemo(
    () => deriveCrateStage(scannedCrate),
    [scannedCrate]
  );

  useEffect(() => {
    const code = String(params?.code || "").trim();
    if (!code) return;
    dispatch(getCrateByQrThunk({ qrValue: code }));
  }, [dispatch, params?.code]);

  const onScanned = async (qrValue: string) => {
    const cleanQr = String(qrValue || "").trim();
    setScanOpen(false);

    if (!cleanQr) {
      Alert.alert("Invalid QR", "Scanned QR value is empty");
      return;
    }

    try {
      await dispatch(
        getCrateByQrThunk({ qrValue: cleanQr })
      ).unwrap();
    } catch (e: any) {
      Alert.alert("Fetch Failed", e?.message || "Unable to fetch crate");
    }
  };

  const handleLogTemp = async () => {
    if (!scannedCrate) {
      Alert.alert("Missing Crate", "Scan crate QR first.");
      return;
    }

    const crateId = scannedCrate?.crateId ?? scannedCrate?.id;
    if (!crateId) {
      Alert.alert("Failed", "Crate ID not found for this QR");
      return;
    }

    if (!isValid) {
      Alert.alert("Invalid", "Temperature is invalid");
      return;
    }

    if (crateStage === "pending") {
      Alert.alert(
        "Receive Required",
        "Receive the crate first, then log temperature."
      );
      return;
    }

    try {
      const res = await dispatch(
        centreTempLogThunk({
          crateId,
          tempC: Number(tempC),
        })
      ).unwrap();

      await Promise.all([
        dispatch(fetchCentreCratesThunk()),
        dispatch(fetchCentreDashboardThunk()),
      ]);

      Alert.alert(
        "Temperature Logged",
        [
          `Crate: ${res?.crateCode || res?.code || res?.id || "-"}`,
          `Temperature: ${tempC}°C`,
          `Status: ${res?.status || "-"}`,
        ].join("\n"),
        [
          { text: "Stay Here" },
          {
            text: "Assign Transport",
            onPress: () =>
              router.push({
                pathname: "/(centre)/assign",
                params: {
                  code: String(
                    res?.crateCode || res?.code || scannedCrate?.crateCode || scannedCrate?.code || ""
                  ),
                },
              }),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert(
        "Temperature Log Failed",
        e?.message || e?.response?.data?.message || "Unexpected error"
      );
    }
  };

  const handleClear = () => {
    if (loading) return;
    dispatch(clearScannedCrate());
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1 bg-[#eef4ff] p-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="mb-4 rounded-[30px] border border-[#d4e2ff] bg-white p-4">
          <View className="flex-row items-center">
            <View className="mr-3 h-14 w-14 items-center justify-center rounded-[20px] bg-[#dbeafe]">
              <Ionicons name="thermometer-outline" size={28} color="#2563eb" />
            </View>

            <View className="flex-1">
              <Text className="text-[20px] font-extrabold text-slate-900">
                Log Crate Temperature
              </Text>
              <Text className="mt-1 text-[14px] leading-5 text-slate-600">
                Scan the received crate, confirm details, then log cold storage
                temperature.
              </Text>
            </View>
          </View>
        </View>

        {!!error && (
          <View className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3">
            <Text className="text-red-700">{error}</Text>
          </View>
        )}

        <View className="gap-4 rounded-[30px] border border-slate-200 bg-white p-4">
          <Input
            label="Temperature (°C)"
            value={tempC}
            onChangeText={setTempC}
            keyboardType="numeric"
          />

          {!!scannedCrate && (
            <View className="rounded-[24px] border border-[#bfd7ff] bg-[#f7fbff] p-4">
              <Text className="mb-3 text-xs font-bold uppercase tracking-wide text-[#2457d6]">
                Current Scanned Crate
              </Text>

              <DetailRow
                label="Crate Code"
                value={String(
                  scannedCrate.crateCode || scannedCrate.code || scannedCrate.id || "-"
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
                label="Last Temperature"
                value={
                  scannedCrate.latestTemperature !== null &&
                  scannedCrate.latestTemperature !== undefined &&
                  String(scannedCrate.latestTemperature) !== ""
                    ? `${scannedCrate.latestTemperature} °C`
                    : "-"
                }
              />
            </View>
          )}

          {!scannedCrate ? (
            <PrimaryButton
              title="Scan Crate"
              onPress={() => setScanOpen(true)}
              disabled={!isValid}
              loading={loading}
            />
          ) : (
            <View className="gap-3">
              <PrimaryButton
                title={loading ? "Logging..." : "Log Temperature"}
                onPress={handleLogTemp}
                disabled={!isValid}
                loading={loading}
              />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <PressButton
                    title="Rescan"
                    icon="refresh-outline"
                    onPress={() => setScanOpen(true)}
                  />
                </View>
                <View className="flex-1">
                  <PressButton
                    title="Clear"
                    icon="close-outline"
                    onPress={handleClear}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {!!lastLoggedAt && (
          <View className="mt-4 rounded-[28px] border border-slate-200 bg-white p-4">
            <Text className="text-slate-700">
              Last temp logged at: {lastLoggedAt}
            </Text>
          </View>
        )}

        <QRScannerModal
          open={scanOpen}
          onClose={() => setScanOpen(false)}
          onScanned={onScanned}
          title="Scan to Log Crate Temperature"
        />
      </ScrollView>
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
    <View className="mb-3 flex-row justify-between">
      <Text className="text-[14px] text-slate-600">{label}</Text>
      <Text className="ml-3 flex-1 text-right text-[15px] font-bold text-slate-900">
        {value}
      </Text>
    </View>
  );
}

function PressButton({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <View className="rounded-[22px] bg-slate-200">
      <IonPress title={title} icon={icon} onPress={onPress} />
    </View>
  );
}

function IonPress({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <View>
      <Text
        onPress={onPress}
        className="px-4 py-4 text-center text-[16px] font-bold text-slate-900"
      >
        {title}
      </Text>
      <View className="absolute inset-0 flex-row items-center justify-center">
        <Ionicons name={icon} size={18} color="#0f172a" />
        <Text onPress={onPress} className="ml-7 text-transparent">
          .
        </Text>
      </View>
    </View>
  );
}