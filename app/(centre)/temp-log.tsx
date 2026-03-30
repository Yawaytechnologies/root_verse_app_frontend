import React, { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";

import Screen from "../../src/components/centre/Screen";
import PrimaryButton from "../../src/components/centre/PrimaryButton";
import Input from "../../src/components/centre/Input";
import QRScannerModal from "../../src/components/centre/QRScannerModal";

import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import {
  centreTempLogThunk,
  selectCentreCrateStatus,
  selectCentreCrateError,
  selectCentreLastTempLoggedAt,
} from "../../src/services/centre/centreCrate.slice";

export default function CentreTempLog() {
  const dispatch = useAppDispatch();

  const status = useAppSelector(selectCentreCrateStatus);
  const error = useAppSelector(selectCentreCrateError);
  const lastLoggedAt = useAppSelector(selectCentreLastTempLoggedAt);

  const [scanOpen, setScanOpen] = useState(false);

  // TEMP: later from /api/me
  const centreId = 101;

  const [tempC, setTempC] = useState("4");

  const loading = useMemo(() => status === "loading", [status]);

  const isValid = useMemo(() => Number.isFinite(Number(tempC)), [tempC]);

  const onScanned = async (qrValue: string) => {
    setScanOpen(false);

    if (!isValid) {
      Alert.alert("Invalid", "Temperature invalid");
      return;
    }

    try {
      await dispatch(
        centreTempLogThunk({
          qrValue,
          centreId,
          tempC: Number(tempC),
        }),
      ).unwrap();

      Alert.alert("Logged", `Centre temp ${tempC}°C saved`);
    } catch (e: any) {
      Alert.alert("Failed", e?.message || "Temp log failed");
    }
  };

  return (
    <Screen>
      <View className="flex-1 p-4 gap-4">
        <Text className="text-slate-700">
          Temp log while crate is under centre custody.
        </Text>

        {!!error && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-3">
            <Text className="text-red-700">{error}</Text>
          </View>
        )}

        <View className="bg-slate-50 border border-slate-200 rounded-3xl p-4 gap-4">
          <Input
            label="Temperature (°C)"
            value={tempC}
            onChangeText={setTempC}
            keyboardType="numeric"
          />

          <PrimaryButton
            title="Scan Crate & Log Temp"
            onPress={() => setScanOpen(true)}
            disabled={!isValid}
            loading={loading}
          />
        </View>

        {!!lastLoggedAt && (
          <View className="bg-white border border-slate-200 rounded-3xl p-4">
            <Text className="text-slate-700">
              Last temp logged at: {lastLoggedAt}
            </Text>
          </View>
        )}

        <QRScannerModal
          open={scanOpen}
          onClose={() => setScanOpen(false)}
          onScanned={onScanned}
          title="Scan to Log Centre Temp"
        />
      </View>
    </Screen>
  );
}