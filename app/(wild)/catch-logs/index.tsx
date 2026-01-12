import React, { useRef, useState } from "react";
import { Alert, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";

import { useAppDispatch, useAppSelector } from "../../../src/store/hooks";
import { checkQrStatus, resetCatchFlow } from "../../../src/services/wild/catchLog.slice";

function extractCrateId(raw: string) {
  const s = String(raw || "").trim();
  const m = s.match(/qrs\/([A-Za-z0-9-_.]+)/i) || s.match(/trace\/([A-Za-z0-9-_.]+)/i);
  return m?.[1] || s;
}

export default function CatchLogsIndex() {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((s: any) => !!s.catchLog?.loading);
  const error = useAppSelector((s: any) => s.catchLog?.error as string | null);

  const didScanRef = useRef(false);
  const [manualId, setManualId] = useState("RV-CRATE-000632");

  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState(true);

  const goByCrateId = async (raw: string) => {
    const crateId = extractCrateId(raw);
    if (!crateId) return Alert.alert("Invalid", "Crate ID not found");

    try {
      dispatch(resetCatchFlow());

      const statusRes = await dispatch(checkQrStatus(crateId)).unwrap();

      if (statusRes.status === "NEW") {
        router.replace({ pathname: "/catch-logs/create", params: { crateId: statusRes.crateId } });
        return;
      }

      router.replace({ pathname: "/catch-logs/details", params: { crateId: statusRes.crateId } });
    } catch (e: any) {
      Alert.alert("Error", String(e?.message || e));
      didScanRef.current = false;
      setScanMode(true);
    }
  };

  const ensurePermission = async () => {
    if (permission?.granted) return true;
    const res = await requestPermission();
    return !!res?.granted;
  };

  if (Platform.OS === "web") {
    return (
      <View className="flex-1 bg-[#fbf6f1] p-4">
        <View className="rounded-2xl border border-[#ead7c8] bg-white p-4">
          <Text className="text-lg font-bold text-[#2b2b2b]">Catch Logs (Web)</Text>
          <Text className="mt-1 text-xs text-[#7a6f66]">Enter crate ID manually.</Text>

          <View className="mt-3 rounded-xl border border-[#ead7c8] bg-[#fbf6f1] px-3 py-2">
            <Text className="text-[11px] text-[#7a6f66]">Crate ID</Text>
            <TextInput value={manualId} onChangeText={setManualId} className="mt-1 text-base text-[#2b2b2b]" />
          </View>

          <Pressable
            onPress={() => goByCrateId(manualId)}
            disabled={loading}
            className="mt-3 rounded-2xl px-4 py-3 active:opacity-90"
            style={{ backgroundColor: "#a06b2a", opacity: loading ? 0.7 : 1 }}
          >
            <Text className="text-center text-white font-extrabold">{loading ? "Checking..." : "Continue"}</Text>
          </Pressable>

          {!!error ? <Text className="mt-2 text-xs font-semibold text-rose-700">{error}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {scanMode ? (
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={async (r) => {
            if (didScanRef.current) return;
            didScanRef.current = true;
            setScanMode(false);
            await goByCrateId(r.data);
          }}
        />
      ) : null}

      <View className="absolute inset-0 items-center justify-center pointer-events-none">
        <View className="h-56 w-56 rounded-3xl border-2 border-white/80" />
        <Text className="mt-4 text-white/80 text-xs">Align QR inside the box</Text>
      </View>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-black/60">
        {!!error ? (
          <View className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
            <Text className="text-xs font-semibold text-rose-800">{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={async () => {
            const ok = await ensurePermission();
            if (!ok) return Alert.alert("Camera", "Enable camera permission.");
            didScanRef.current = false;
            setScanMode(true);
          }}
          disabled={loading}
          className="rounded-2xl px-4 py-4 active:opacity-80"
          style={{ backgroundColor: "#a06b2a", opacity: loading ? 0.7 : 1 }}
        >
          <Text className="text-center text-white font-extrabold">{loading ? "Checking..." : "Scan Again"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
