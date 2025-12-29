import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function ScanQR() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    // auto ask permission on open (nice for demo)
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const goToTrace = useCallback((raw: string) => {
    let crateId = raw.trim();

    // If QR contains URL like .../trace/RV-CRATE-000123
    const match = crateId.match(/trace\/([A-Za-z0-9-_.]+)/);
    if (match?.[1]) crateId = match[1];

    if (!crateId) return;

    // ✅ IMPORTANT: do NOT include (wild) in the path
    // Your file should be: app/(wild)/trace/[crateId].tsx
    // The URL path is: /trace/<crateId>
    router.replace(`/trace/${crateId}` as const);
  }, []);

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanned) return;
      setScanned(true);
      goToTrace(data);
    },
    [scanned, goToTrace]
  );

  if (!permission) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-4">
        <Text className="text-slate-700">Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-4">
        <Text className="text-slate-900 font-bold">Camera permission needed</Text>
        <Text className="mt-2 text-slate-600 text-center">
          Enable camera permission to scan QR stickers.
        </Text>

        <Pressable
          onPress={requestPermission}
          className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 active:opacity-80"
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          className="mt-3 rounded-2xl bg-slate-200 px-5 py-3 active:opacity-80"
        >
          <Text className="text-slate-900 font-semibold">Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
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
