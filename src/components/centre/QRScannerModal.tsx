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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  open: boolean;
  onClose: () => void;
  onScanned: (qrValue: string) => void;
  title?: string;
};

const BOX_SIZE = 260;

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
    if (!data?.trim() || locked || !cameraReady) return;

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
      <View className="flex-1 bg-[#020817]">
        <View className="px-5 pb-4 pt-14">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20">
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={24}
                  color="#22d3ee"
                />
              </View>

              <View className="ml-3">
                <Text className="text-lg font-extrabold text-white">{title}</Text>
                <Text className="mt-1 text-xs text-slate-400">
                  Hold the crate QR inside the blue frame
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5"
            >
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View className="relative flex-1">
          {!permission ? (
            <View className="flex-1 items-center justify-center px-6">
              <ActivityIndicator size="large" color="#ffffff" />
              <Text className="mt-4 text-center text-white/80">
                Checking camera permission...
              </Text>
            </View>
          ) : !permission.granted ? (
            <View className="flex-1 items-center justify-center px-6">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-white/10">
                <Ionicons name="camera-outline" size={28} color="#fff" />
              </View>

              <Text className="text-center text-base font-semibold text-white">
                Camera permission required
              </Text>
              <Text className="mt-2 text-center text-white/70">
                Allow camera access to scan crate QR codes.
              </Text>

              <Pressable
                onPress={handleRequestPermission}
                className="mt-6 rounded-2xl bg-cyan-400 px-5 py-3"
              >
                <Text className="font-semibold text-slate-950">Allow Camera</Text>
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

              <View className="pointer-events-none absolute inset-0">
                <View className="flex-1 bg-black/60" />

                <View className="flex-row items-center">
                  <View className="h-[260px] flex-1 bg-black/60" />

                  <View
                    style={{ width: BOX_SIZE, height: BOX_SIZE }}
                    className="relative"
                  >
                    <View className="absolute inset-0 rounded-[30px] border border-cyan-300/40 bg-transparent" />
                    <View className="absolute inset-x-6 top-1/2 h-[2px] -translate-y-1/2 bg-cyan-400/60" />

                    <View className="absolute left-0 top-0 h-12 w-12 rounded-tl-[28px] border-l-4 border-t-4 border-cyan-400" />
                    <View className="absolute right-0 top-0 h-12 w-12 rounded-tr-[28px] border-r-4 border-t-4 border-cyan-400" />
                    <View className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-[28px] border-b-4 border-l-4 border-cyan-400" />
                    <View className="absolute bottom-0 right-0 h-12 w-12 rounded-br-[28px] border-b-4 border-r-4 border-cyan-400" />
                  </View>

                  <View className="h-[260px] flex-1 bg-black/60" />
                </View>

                <View className="flex-1 bg-black/60" />
              </View>

              {!cameraReady && (
                <View className="absolute inset-0 items-center justify-center bg-black">
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text className="mt-4 text-white/80">Starting camera...</Text>
                </View>
              )}
            </>
          )}
        </View>

        <View className="absolute bottom-0 left-0 right-0 p-5">
          <View className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
            <Text className="text-center font-bold text-white">
              Automatic scan is enabled
            </Text>
            <Text className="mt-1 text-center text-xs text-slate-400">
              Once detected, crate details will load immediately
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}