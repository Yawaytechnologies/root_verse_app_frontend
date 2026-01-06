import { router } from "expo-router";
import { default as React, default as React, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function ScanQR() {
  const [permission, requestPermission] = useCameraPermissions();
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

  if (!permission.granted) {
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
      <CameraView
        style={{ flex: 1 }}
    />

      {/* Overlay */}
      <View className="absolute inset-0 items-center justify-center">
        <View className="h-56 w-56 rounded-3xl border-2 border-white/80" />
        <Text className="mt-4 text-white/90 font-semibold">
          Align QR inside the box
        </Text>

        {scanned && (
          <Pressable
            onPress={() => setScanned(false)}
            className="mt-4 rounded-2xl bg-white/15 px-5 py-3"
          >
            <Text className="text-white font-semibold">Scan again</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => router.back()}
        className="absolute left-4 top-12 rounded-full bg-white/15 px-4 py-2"
      >
        <Text className="text-white font-semibold">Back</Text>
      </Pressable>
    </View>
  );
}
