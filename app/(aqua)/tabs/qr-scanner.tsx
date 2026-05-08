import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? String(value[0] ?? fallback) : String(value ?? fallback);

function paramsToObject(params: Record<string, string | string[] | undefined>) {
  const output: Record<string, string> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    const cleanValue = Array.isArray(value)
      ? String(value[0] ?? "")
      : String(value);

    if (cleanValue.trim()) {
      output[key] = cleanValue;
    }
  });

  return output;
}

export default function QrScanner() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const purpose = getParamValue(params.purpose, "TRACEABILITY");
  const returnTo = getParamValue(params.returnTo, "");

  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [last, setLast] = useState("");

  const scanAnim = useRef(new Animated.Value(0)).current;

  const title = useMemo(() => {
    switch (purpose) {
      case "FARM_ACTIVATION":
        return "Scan Farm Gate QR";
      case "POND_ACTIVATION":
        return "Scan Pond QR";
      case "FEED_LOG":
        return "Scan Pond QR";
      case "STOCKING":
        return "Scan Pond QR";
      case "SAMPLING_LOG":
        return "Scan Pond QR";
      case "HARVEST_LOG":
        return "Scan Pond QR";
      case "TRACEABILITY":
      default:
        return "Scan Traceability QR";
    }
  }, [purpose]);

  const subtitle = useMemo(() => {
    switch (purpose) {
      case "FARM_ACTIVATION":
        return "Scan the pre-printed Farm Gate QR to activate the official Farm ID.";
      case "POND_ACTIVATION":
        return "Scan the pre-printed Pond QR to activate the official Pond ID.";
      case "FEED_LOG":
        return "Scan activated Pond QR before adding feed log.";
      case "STOCKING":
        return "Scan activated Pond QR before stocking entry.";
      case "SAMPLING_LOG":
        return "Scan activated Pond QR before sampling log.";
      case "HARVEST_LOG":
        return "Scan activated Pond QR before harvest log.";
      case "TRACEABILITY":
      default:
        return "Scan QR to fetch backend traceability details.";
    }
  }, [purpose]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    loop.start();

    return () => loop.stop();
  }, [scanAnim]);

  const askPermission = useCallback(async () => {
    const result = await requestPermission();
    return result.granted;
  }, [requestPermission]);

  const goNext = useCallback(
    (qrValue: string) => {
      const scannedValue = String(qrValue || "").trim();

      if (!scannedValue) {
        Alert.alert("Invalid QR", "QR value is empty.");
        setLocked(false);
        return;
      }

      const existingParams = paramsToObject(params as any);

      const nextParams = {
        ...existingParams,

        // scanned QR values
        code: scannedValue,
        qrValue: scannedValue,
        scannedValue,

        // keep purpose
        purpose,

        // keep these if they came from farm/pond list
        farmDbId: existingParams.farmDbId || existingParams.farmId || "",
        farmId: existingParams.farmId || existingParams.farmDbId || "",
        farmName: existingParams.farmName || "",

        pondDbId: existingParams.pondDbId || existingParams.pondId || "",
        pondId: existingParams.pondId || existingParams.pondDbId || "",
        pondName: existingParams.pondName || "",

        userId: existingParams.userId || "",
        cultureCycleId: existingParams.cultureCycleId || "",
      };

      if (returnTo) {
        router.replace({
          pathname: returnTo as any,
          params: nextParams,
        });
        return;
      }

      router.replace({
        pathname: "/(aqua)/traceability/[code]",
        params: nextParams,
      });
    },
    [params, purpose, returnTo],
  );

  const handleQrScanned = useCallback(
    (result: { data?: string }) => {
      if (locked) return;

      const scannedValue = String(result?.data || "").trim();

      if (!scannedValue) return;

      setLocked(true);
      setLast(scannedValue);
    },
    [locked],
  );

  const handleContinue = () => {
    if (!last) {
      Alert.alert("Scan Required", "Please scan a QR code first.");
      return;
    }

    goNext(last);
  };

  const handleScanAgain = () => {
    setLast("");
    setLocked(false);
  };

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white/80">Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        className="flex-1 items-center justify-center bg-black px-6"
        style={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <View className="h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <Ionicons name="camera-outline" size={34} color="#60A5FA" />
        </View>

        <Text className="mt-5 text-center text-xl font-bold text-white">
          Camera Permission Required
        </Text>

        <Text className="mt-2 text-center text-sm leading-6 text-white/70">
          Allow camera access to scan QR codes.
        </Text>

        <Pressable onPress={askPermission} className="mt-6 w-full max-w-[320px]">
          <LinearGradient
            colors={["#3B82F6", "#1D4ED8"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 22,
              borderRadius: 18,
              alignItems: "center",
            }}
          >
            <Text className="text-sm font-bold text-white">Allow Camera</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          className="mt-3 w-full max-w-[320px] rounded-2xl border border-white/10 px-4 py-4"
        >
          <Text className="text-center font-semibold text-white">Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-black"
      style={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 18,
      }}
    >
      <View className="flex-row items-center px-5">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>

        <View className="ml-3 flex-1">
          <Text className="text-lg font-bold text-white">{title}</Text>
          <Text className="mt-0.5 text-xs text-white/60" numberOfLines={1}>
            {purpose}
          </Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-[360px] items-center">
          <Text className="mb-5 text-center text-sm leading-6 text-white/70">
            {subtitle}
          </Text>

          <View className="aspect-square w-[92%] max-w-[320px] overflow-hidden rounded-3xl bg-black">
            <CameraView
              style={{ flex: 1 }}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={locked ? undefined : handleQrScanned}
            />

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
                      outputRange: [0, 320],
                    }),
                  },
                ],
              }}
            >
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

            <View className="absolute inset-0" pointerEvents="none">
              <View className="absolute left-3 top-3 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-[#3B82F6]" />
              <View className="absolute right-3 top-3 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-[#3B82F6]" />
              <View className="absolute bottom-3 left-3 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-[#3B82F6]" />
              <View className="absolute bottom-3 right-3 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-[#3B82F6]" />
            </View>

            {last ? (
              <View className="absolute inset-x-4 bottom-4 rounded-2xl border border-emerald-400/30 bg-black/70 px-4 py-3">
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#34D399"
                  />

                  <Text className="flex-1 text-xs font-semibold text-emerald-300">
                    QR scanned successfully
                  </Text>
                </View>

                <Text
                  className="mt-1 text-[11px] text-white/70"
                  numberOfLines={1}
                >
                  {last}
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="mt-5 text-center text-sm text-white/75">
            Align QR code inside the frame
          </Text>

          <Pressable
            onPress={handleContinue}
            className="mt-5 w-[92%] max-w-[320px]"
            style={!last ? { opacity: 0.55 } : undefined}
          >
            <LinearGradient
              colors={["#3E72DA", "#1953E5", "#0334BB"]}
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
                CONTINUE
              </Text>
            </LinearGradient>
          </Pressable>

          {last ? (
            <Pressable
              onPress={handleScanAgain}
              className="mt-3 w-[92%] max-w-[320px] rounded-full border border-white/10 px-4 py-4"
            >
              <Text className="text-center text-sm font-semibold text-white">
                Scan Again
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}