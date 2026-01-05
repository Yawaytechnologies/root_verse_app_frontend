import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";

export default function ScanQR() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission, requestPermission]);

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);

    const data = result.data?.trim?.() || "";

    // ✅ Example navigation — change this to your route
    // If QR contains crateId:
    // router.push(`/(wild)/trace/${data}` as const);

    // For now just go back:
    router.back();
  };

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-[#fbf6f1]">
        <Text>Loading camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-[#fbf6f1] px-5">
        <Text className="text-base font-semibold text-[#2b2b2b] text-center">
          Camera permission is required to scan QR.
        </Text>
        <Pressable
          onPress={requestPermission}
          className="mt-4 rounded-2xl bg-[#a06b2a] px-5 py-3"
        >
          <Text className="text-white font-semibold">Allow Camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{
          // You can restrict formats if you want
          // barcodeTypes: ["qr"]
        }}
        onBarcodeScanned={onBarcodeScanned}
      />

      {/* Overlay */}
      <View className="absolute inset-0 items-center justify-center">
        <View className="h-56 w-56 rounded-3xl border-2 border-white/80" />
        <Text className="mt-4 text-white/90 font-semibold">Align QR inside the box</Text>

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
