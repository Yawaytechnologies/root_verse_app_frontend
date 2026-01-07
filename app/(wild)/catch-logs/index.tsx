import React, { useRef, useState } from "react";
import { Alert, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Camera only on native
import { CameraView, useCameraPermissions } from "expo-camera";

import { useAppDispatch, useAppSelector } from "../../../src/store/hooks";
import {
  checkQrStatus,
  fetchCatchLogByCrate,
  resetCatchFlow,
} from "../../../src/services/wild/catchLog.slice";

const UI = { accent: "#a06b2a" };

function extractCrateId(raw: string) {
  const s = String(raw || "").trim();
  const match = s.match(/trace\/([A-Za-z0-9-_.]+)/);
  return match?.[1] || s;
}

export default function CatchLogsIndex() {
  const dispatch = useAppDispatch();

  // ✅ SAFE selector (won't crash even if reducer missing)
  const catchState = useAppSelector((s: any) => s.catchLog);
  const loading = !!catchState?.loading;
  const error = catchState?.error as string | null;
  const usedDummy = !!catchState?.usedDummy;

  const didScanRef = useRef(false);

  // Web manual input
  const [manualId, setManualId] = useState("RV-CRATE-000123");

  // Native camera permission
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState(true);

  const goByCrateId = async (crateIdRaw: string) => {
    const crateId = extractCrateId(crateIdRaw);
    if (!crateId) return Alert.alert("Invalid", "Crate ID not found");

    try {
      dispatch(resetCatchFlow());

      const statusRes = await dispatch(checkQrStatus(crateId)).unwrap();

      if (statusRes.status === "NEW") {
        router.replace({
          pathname: "/catch-logs/create",
          params: { crateId: statusRes.crateId },
        });
        return;
      }

      await dispatch(fetchCatchLogByCrate(statusRes.crateId)).unwrap();

      router.replace({
        pathname: "/catch-logs/details",
        params: { crateId: statusRes.crateId },
      });
    } catch (e: any) {
      Alert.alert("Error", String(e?.message || e));
      didScanRef.current = false;
    }
  };

  const ensurePermission = async () => {
    if (permission?.granted) return true;
    const res = await requestPermission();
    return !!res?.granted;
  };

  const scanAgain = () => {
    didScanRef.current = false;
    setScanMode(true);
  };

  // ✅ WEB UI (no camera)
  if (Platform.OS === "web") {
    return (
      <View className="flex-1 bg-[#fbf6f1] p-4">
        <View className="rounded-2xl border border-[#ead7c8] bg-white p-4">
          <Text className="text-lg font-bold text-[#2b2b2b]">Catch Log (Web)</Text>
          <Text className="mt-1 text-xs text-[#7a6f66]">
            Camera scanner is disabled on web. Use manual crate ID.
          </Text>

          <View className="mt-3 rounded-xl border border-[#ead7c8] bg-[#fbf6f1] px-3 py-2">
            <Text className="text-[11px] text-[#7a6f66]">Crate ID</Text>
            <TextInput
              value={manualId}
              onChangeText={setManualId}
              className="mt-1 text-base text-[#2b2b2b]"
              placeholder="RV-CRATE-000123"
            />
          </View>

          <Pressable
            onPress={() => goByCrateId(manualId)}
            disabled={loading}
            className="mt-3 rounded-2xl px-4 py-3 active:opacity-90"
            style={{ backgroundColor: UI.accent, opacity: loading ? 0.7 : 1 }}
          >
            <Text className="text-center text-white font-extrabold">
              {loading ? "Checking..." : "Continue"}
            </Text>
          </Pressable>

          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons name="wifi-outline" size={14} color="#111827" />
              <Text className="text-xs font-semibold text-[#111827]">
                {usedDummy ? "Offline (Dummy)" : "Online"}
              </Text>
            </View>
          </View>

          {!!error ? (
            <Text className="mt-3 text-xs font-semibold text-rose-700">{error}</Text>
          ) : null}

          <View className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <Text className="text-xs text-amber-800">
              Dummy test IDs: NEW → RV-CRATE-000123, FILLED → RV-CRATE-000999
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ✅ NATIVE UI (camera)
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
            scanAgain();
          }}
          disabled={loading}
          className="rounded-2xl px-4 py-4 active:opacity-80"
          style={{ backgroundColor: UI.accent, opacity: loading ? 0.7 : 1 }}
        >
          <Text className="text-center text-white font-extrabold">
            {loading ? "Checking..." : "Scan Again"}
          </Text>
        </Pressable>

        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-white/80 text-xs">
            {usedDummy ? "Offline (Dummy)" : "Online"}
          </Text>
          <Pressable
            onPress={() => goByCrateId("RV-CRATE-000999")}
            className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 active:opacity-80"
          >
            <Text className="text-white text-xs font-semibold">Dev: FILLED</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
