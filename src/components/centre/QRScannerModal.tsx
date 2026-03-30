import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  open: boolean;
  onClose: () => void;
  onScanned: (qrValue: string) => void;
  title?: string;
};

const BOX_SIZE = 270;

export default function QRScannerModal({
  open,
  onClose,
  onScanned,
  title = "Scan Crate QR",
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setLocked(false);
      setCameraReady(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open]);

  const handleRequestPermission = async () => {
    try {
      await requestPermission();
    } catch {
      Alert.alert("Permission error", "Unable to request camera permission.");
    }
  };

  const handleScan = (data: string) => {
    if (!data?.trim()) return;
    if (locked) return;
    if (!cameraReady) return;

    setLocked(true);
    onScanned(data.trim());

    timerRef.current = setTimeout(() => {
      setLocked(false);
    }, 1200);
  };

  const handleMountError = () => {
    Alert.alert(
      "Camera error",
      "Camera preview could not start. Close and reopen the scanner."
    );
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black">
        {/* Top bar */}
        <View className="px-4 pt-14 pb-4 flex-row items-center justify-between bg-black">
          <Text className="text-white font-semibold text-base">{title}</Text>

          <Pressable
            onPress={onClose}
            className="h-10 px-4 rounded-2xl items-center justify-center bg-white/10 border border-white/15"
          >
            <Text className="text-white font-medium">Close</Text>
          </Pressable>
        </View>

        {/* Camera area */}
        <View className="flex-1 relative">
          {!permission ? (
            <View className="flex-1 items-center justify-center px-6">
              <ActivityIndicator size="large" color="#ffffff" />
              <Text className="text-white/80 text-center mt-4">
                Checking camera permission...
              </Text>
            </View>
          ) : !permission.granted ? (
            <View className="flex-1 items-center justify-center px-6">
              <View className="w-16 h-16 rounded-full bg-white/10 items-center justify-center mb-4">
                <Ionicons name="camera-outline" size={28} color="#fff" />
              </View>

              <Text className="text-white text-center text-base font-semibold">
                Camera permission required
              </Text>
              <Text className="text-white/70 text-center mt-2">
                Allow camera access to scan crate QR codes.
              </Text>

              <Pressable
                onPress={handleRequestPermission}
                className="mt-6 px-5 py-3 bg-white rounded-2xl"
              >
                <Text className="text-black font-semibold">Allow Camera</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <CameraView
                key={open ? "scanner-open" : "scanner-closed"}
                className="flex-1"
                active={open}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={locked ? undefined : (e) => handleScan(e.data)}
                onCameraReady={() => setCameraReady(true)}
                onMountError={handleMountError}
              />

              {/* Proper cutout overlay */}
              <View className="absolute inset-0 pointer-events-none">
                {/* Top shade */}
                <View className="flex-1 bg-black/55" />

                {/* Middle row */}
                <View className="flex-row items-center">
                  <View className="flex-1 bg-black/55 h-[270px]" />

                  {/* Transparent scan box */}
                  <View
                    style={{ width: BOX_SIZE, height: BOX_SIZE }}
                    className="relative"
                  >
                    {/* White border */}
                    <View className="absolute inset-0 border-2 border-white rounded-[28px]" />

                    {/* Corner markers */}
                    <View className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-cyan-400 rounded-tl-2xl" />
                    <View className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-cyan-400 rounded-tr-2xl" />
                    <View className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-cyan-400 rounded-bl-2xl" />
                    <View className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-cyan-400 rounded-br-2xl" />
                  </View>

                  <View className="flex-1 bg-black/55 h-[270px]" />
                </View>

                {/* Bottom shade */}
                <View className="flex-1 bg-black/55" />
              </View>

              {!cameraReady && (
                <View className="absolute inset-0 items-center justify-center bg-black">
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text className="text-white/80 mt-4">Starting camera...</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Bottom help */}
        <View className="absolute left-0 right-0 bottom-0 p-4">
          <View className="bg-black/55 border border-white/10 rounded-2xl p-4">
            <Text className="text-white text-center font-medium">
              Align the crate QR inside the frame
            </Text>
            <Text className="text-white/70 text-center text-xs mt-1">
              Scan will trigger automatically once detected
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}