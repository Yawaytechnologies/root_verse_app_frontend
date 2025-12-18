import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function AssignCrate() {
  const [permission, requestPermission] = useCameraPermissions();

  const [crateId, setCrateId] = useState("");
  const [tripId, setTripId] = useState("");
  const [catchLogId, setCatchLogId] = useState("");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [locked, setLocked] = useState(false);

  const crateTrim = useMemo(() => crateId.trim(), [crateId]);

  const openScanner = useCallback(async () => {
    const granted = permission?.granted ?? (await requestPermission()).granted;
    if (!granted) {
      Alert.alert(
        "Camera permission needed",
        "Allow camera access to scan crate QR codes."
      );
      return;
    }
    setLocked(false);
    setScannerOpen(true);
  }, [permission, requestPermission]);

  const closeScanner = () => {
    setScannerOpen(false);
    setLocked(false);
  };

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (locked) return;
    setLocked(true);

    const scanned = String(data || "").trim();
    if (!scanned) {
      setLocked(false);
      return;
    }

    // Fill + go to trace screen
    setCrateId(scanned);
    setScannerOpen(false);

    // navigate after close
    setTimeout(() => {
      router.push(`/(wild)/trace/${encodeURIComponent(scanned)}`);
      setLocked(false);
    }, 250);
  };

  const assign = () => {
    if (!crateTrim) return Alert.alert("Missing", "Crate ID is required");

    // Later: API call
    Alert.alert(
      "Assigned (demo)",
      `Crate ${crateTrim}\nTrip: ${tripId || "—"}\nCatchLog: ${catchLogId || "—"}`
    );
  };

  const viewTrace = () => {
    if (!crateTrim) return Alert.alert("Missing", "Enter/scan Crate ID first");
    router.push(`/(wild)/trace/${encodeURIComponent(crateTrim)}`);
  };

  return (
    <View className="flex-1 bg-slate-50 p-4">
      {/* Header */}
      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-lg font-bold text-slate-900">Assign Crate</Text>
        <Text className="mt-1 text-sm text-slate-600">
          Scan the QR crate tag → view traceability instantly.
        </Text>
      </View>

      {/* Form */}
      <View className="mt-4 gap-3">
        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Crate ID (QR)</Text>
          <TextInput
            value={crateId}
            onChangeText={setCrateId}
            placeholder="Scan or type e.g., CR-WC-000123"
            autoCapitalize="characters"
            className="mt-1 text-base text-slate-900"
          />
        </View>

        <View className="flex-row gap-3">
          <Pressable
            onPress={openScanner}
            className="flex-1 rounded-2xl bg-slate-900 p-4 active:opacity-90"
          >
            <Text className="text-center text-white font-semibold">
              Scan QR
            </Text>
          </Pressable>

          <Pressable
            onPress={viewTrace}
            className="flex-1 rounded-2xl border border-slate-300 bg-white p-4 active:opacity-80"
          >
            <Text className="text-center text-slate-900 font-semibold">
              View Trace
            </Text>
          </Pressable>
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Trip ID</Text>
          <TextInput
            value={tripId}
            onChangeText={setTripId}
            placeholder="e.g., TR-2025-12-001"
            autoCapitalize="characters"
            className="mt-1 text-base text-slate-900"
          />
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs text-slate-500">Catch Log ID</Text>
          <TextInput
            value={catchLogId}
            onChangeText={setCatchLogId}
            placeholder="e.g., CL-2025-12-045"
            autoCapitalize="characters"
            className="mt-1 text-base text-slate-900"
          />
        </View>

        <Pressable
          onPress={assign}
          className="rounded-2xl bg-slate-900 p-4 active:opacity-90"
        >
          <Text className="text-center text-white font-semibold">Assign</Text>
        </Pressable>
      </View>

      {/* Scanner Modal */}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={closeScanner}>
        <View className="flex-1 bg-black">
          <View className="pt-12 px-4 pb-3 flex-row items-center justify-between">
            <Text className="text-white font-semibold text-base">
              Scan Crate QR
            </Text>
            <Pressable onPress={closeScanner} className="px-3 py-2 rounded-xl bg-white/10">
              <Text className="text-white">Close</Text>
            </Pressable>
          </View>

          <View className="flex-1">
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              onBarcodeScanned={onBarcodeScanned}
              barcodeScannerSettings={{
                // QR is enough for crate tags
                barcodeTypes: ["qr"],
              }}
            />

            {/* Simple overlay hint */}
            <View className="absolute inset-x-0 bottom-8 items-center">
              <View className="rounded-2xl bg-black/60 px-4 py-3">
                <Text className="text-white text-sm">
                  Point the camera at the crate QR
                </Text>
                <Text className="text-white/70 text-xs mt-1">
                  It will auto-open Traceability
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
