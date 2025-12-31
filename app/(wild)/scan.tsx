import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function ScanQR() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission]);

  const goToTrace = (raw: string) => {
    let crateId = (raw ?? "").trim();

    // If QR contains URL like .../trace/RV-CRATE-000123
    const match = crateId.match(/trace\/([A-Za-z0-9-_.]+)/);
    if (match?.[1]) crateId = match[1];

    if (!crateId) return;

    router.replace(`/(wild)/trace/${crateId}` as const);
  };

  if (!permission) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-4">
        <Text className="text-slate-700">Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-4">
        <Text className="text-slate-900 font-bold">Camera permission denied</Text>
        <Text className="mt-2 text-slate-600 text-center">
          Enable camera permission to scan QR stickers.
        </Text>

        <Pressable
          onPress={requestPermission}
          className="mt-4 rounded-2xl bg-black px-5 py-3"
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} className="mt-3">
          <Text className="text-sky-600 font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={
          scanned
            ? undefined
            : (result) => {
                // result.data is the QR text
                setScanned(true);
                goToTrace(result.data);
              }
        }
      />

      {/* Overlay */}
      <View className="absolute inset-0 items-center justify-center">
        <View className="h-64 w-64 rounded-2xl border-2 border-white/80" />
        <Text className="mt-6 text-white font-semibold">Align QR inside the box</Text>
        <Text className="mt-1 text-white/70 text-xs">Sticker should contain crateId</Text>
      </View>

      {/* Bottom controls */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-black/50">
        <Pressable
          onPress={() => router.back()}
          className="rounded-2xl bg-white/10 p-4 active:opacity-80"
        >
          <Text className="text-center text-white font-semibold">Cancel</Text>
        </Pressable>

        {scanned && (
          <Pressable
            onPress={() => setScanned(false)}
            className="mt-3 rounded-2xl bg-white/10 p-4 active:opacity-80"
          >
            <Text className="text-center text-white font-semibold">Scan Again</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
