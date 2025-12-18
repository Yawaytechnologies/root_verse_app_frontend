import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";

export default function ScanQR() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const goToTrace = (raw: string) => {
    // QR can be just crateId or full URL containing crateId
    let crateId = raw.trim();

    // If QR contains URL like .../trace/RV-CRATE-000123
    const match = crateId.match(/trace\/([A-Za-z0-9-_.]+)/);
    if (match?.[1]) crateId = match[1];

    if (!crateId) return;

    router.replace(`/(wild)/trace/${crateId}` as const);
  };

  if (hasPermission === null) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-4">
        <Text className="text-slate-700">Requesting camera permission…</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-4">
        <Text className="text-slate-900 font-bold">Camera permission denied</Text>
        <Text className="mt-2 text-slate-600 text-center">
          Enable camera permission to scan QR stickers.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <BarCodeScanner
        onBarCodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                goToTrace(data);
              }
        }
        style={{ flex: 1 }}
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
