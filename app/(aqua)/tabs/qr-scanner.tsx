import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function QrScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  // ✅ Scan line animation value
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 900, // speed (lower = faster)
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [scanAnim]);

  const askPermission = useCallback(async () => {
    const res = await requestPermission();
    return res.granted;
  }, [requestPermission]);

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white/80">Loading camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Text className="text-lg font-semibold text-white text-center">
          Camera permission required
        </Text>
        <Text className="mt-2 text-sm text-white/70 text-center">
          Allow camera access to scan QR codes
        </Text>

        <Pressable onPress={askPermission} className="mt-5">
          <LinearGradient
            colors={["#3B82F6", "#1D4ED8"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 22,
              borderRadius: 18,
            }}
          >
            <Text className="text-white font-semibold text-sm">
              Allow Camera
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  const onScan = () => {
    if (!last) return;
    router.push(`/(aqua)/traceability/${encodeURIComponent(last)}`);
  };

  return (
    <View className="flex-1 bg-black items-center justify-center px-6">
      <View className="w-full max-w-[360px] items-center">
        {/* Square scanner */}
        <View className="w-[92%] max-w-[320px] aspect-square rounded-3xl overflow-hidden bg-black">
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={(result) => {
              if (locked) return;

              const data = (result?.data ?? "").trim();
              if (!data) return;

              setLocked(true);
              setLast(data);

              // If you want auto navigate immediately:
              // router.push(`/(aqua)/traceability/${encodeURIComponent(data)}`);
            }}
          />

          {/* ✅ Scanning line (moves top -> bottom) */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 3,
              transform: [
                {
                  translateY: scanAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 320], // must match max square size
                  }),
                },
              ],
            }}
          >
            {/* Glow line */}
            <LinearGradient
              colors={[
                "rgba(59,130,246,0)",
                "rgba(59,130,246,1)",
                "rgba(59,130,246,0)",
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{
                flex: 1,
                opacity: 0.95,
              }}
            />
            {/* Extra glow (thicker blur behind) */}
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: -6,
                height: 15,
                backgroundColor: "#3B82F6",
                opacity: 0.18,
              }}
            />
          </Animated.View>

          {/* Blue corners */}
          <View className="absolute inset-0" pointerEvents="none">
            <View className="absolute left-3 top-3 h-8 w-8 border-l-4 border-t-4 border-[#3B82F6] rounded-tl-xl" />
            <View className="absolute right-3 top-3 h-8 w-8 border-r-4 border-t-4 border-[#3B82F6] rounded-tr-xl" />
            <View className="absolute left-3 bottom-3 h-8 w-8 border-l-4 border-b-4 border-[#3B82F6] rounded-bl-xl" />
            <View className="absolute right-3 bottom-3 h-8 w-8 border-r-4 border-b-4 border-[#3B82F6] rounded-br-xl" />
          </View>
        </View>

        {/* Instruction */}
        <Text className="mt-5 text-sm text-white/80 text-center">
          Align QR Code within frame to scan
        </Text>

        {/* Button */}
        <Pressable
          onPress={() => {
            if (!last) return;
            onScan();
          }}
          className="mt-5 w-[92%] max-w-[320px]"
          style={!last ? { opacity: 0.65 } : undefined}
        >
          <LinearGradient
            colors={["#3e72daff", "#1953e5ff", "#0334bbff"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{
              paddingVertical: 14,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "700",
                letterSpacing: 1.2,
                fontSize: 12,
              }}
            >
              SCAN ITEM
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
