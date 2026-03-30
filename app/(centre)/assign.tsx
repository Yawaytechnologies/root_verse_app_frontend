import React, { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";

import Screen from "../../src/components/centre/Screen";
import PrimaryButton from "../../src/components/centre/PrimaryButton";
import Input from "../../src/components/centre/Input";
import QRScannerModal from "../../src/components/centre/QRScannerModal";

import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import {
  centreScheduleThunk,
  selectCentreCrateStatus,
  selectCentreCrateError,
  selectCentreLastCrate,
} from "../../src/services/centre/centreCrate.slice";

export default function CentreAssign() {
  const dispatch = useAppDispatch();

  const status = useAppSelector(selectCentreCrateStatus);
  const error = useAppSelector(selectCentreCrateError);
  const lastCrate = useAppSelector(selectCentreLastCrate);

  const [scanOpen, setScanOpen] = useState(false);

  // TEMP: later from /api/me
  const centreId = 101;

  const [destinationId, setDestinationId] = useState("501");
  const [transportOperatorId, setTransportOperatorId] = useState("9001");
  const [scheduledAtUtc, setScheduledAtUtc] = useState(new Date().toISOString());

  const loading = useMemo(() => status === "loading", [status]);

  const isValid = useMemo(() => {
    const d = Number(destinationId);
    const t = Number(transportOperatorId);
    return Number.isFinite(d) && d > 0 && Number.isFinite(t) && t > 0 && !!scheduledAtUtc;
  }, [destinationId, transportOperatorId, scheduledAtUtc]);

  const onScanned = async (qrValue: string) => {
    setScanOpen(false);
    if (!isValid) {
      Alert.alert("Invalid", "Fill destination/transport/schedule");
      return;
    }

    try {
      const crate = await dispatch(
        centreScheduleThunk({
          qrValue,
          centreId,
          destinationId: Number(destinationId),
          transportOperatorId: Number(transportOperatorId),
          scheduledAtUtc,
        }),
      ).unwrap();

      Alert.alert(
        "Scheduled",
        `Crate: ${crate.crateCode || crate.id}\nStatus: ${crate.status}\nAssigned Transport: ${crate.assignedTransportOperatorId ?? "-"}`,
      );
    } catch (e: any) {
      Alert.alert("Failed", e?.message || "Schedule failed");
    }
  };

  return (
    <Screen>
      <View className="flex-1 p-4 gap-4">
        <Text className="text-slate-700">
          Scan each crate → assign destination + transport + UTC time → Status: SCHEDULED_FOR_DISPATCH.
        </Text>

        {!!error && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-3">
            <Text className="text-red-700">{error}</Text>
          </View>
        )}

        <View className="bg-slate-50 border border-slate-200 rounded-3xl p-4 gap-4">
          <Input
            label="Destination ID"
            value={destinationId}
            onChangeText={setDestinationId}
            keyboardType="numeric"
          />
          <Input
            label="Transport Operator ID"
            value={transportOperatorId}
            onChangeText={setTransportOperatorId}
            keyboardType="numeric"
          />
          <Input
            label="ScheduledAt (UTC ISO)"
            value={scheduledAtUtc}
            onChangeText={setScheduledAtUtc}
            placeholder="2026-03-06T10:30:00.000Z"
          />

          <PrimaryButton
            title="Scan Crate & Schedule"
            onPress={() => setScanOpen(true)}
            disabled={!isValid}
            loading={loading}
          />
        </View>

        {!!lastCrate && (
          <View className="bg-white border border-slate-200 rounded-3xl p-4">
            <Text className="font-semibold text-slate-900">
              Last Crate: {lastCrate.crateCode || lastCrate.id}
            </Text>
            <Text className="text-slate-600">Status: {lastCrate.status}</Text>
            <Text className="text-slate-600">
              Assigned Transport: {lastCrate.assignedTransportOperatorId ?? "-"}
            </Text>
          </View>
        )}

        <QRScannerModal
          open={scanOpen}
          onClose={() => setScanOpen(false)}
          onScanned={onScanned}
          title="Scan to Schedule Dispatch"
        />
      </View>
    </Screen>
  );
}