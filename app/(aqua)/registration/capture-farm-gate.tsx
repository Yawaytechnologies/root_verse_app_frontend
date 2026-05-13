import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import {
  activateFarmQrById,
  getAquacultureQrByCode,
  uploadAquacultureImage,
} from "../../../src/services/aqua/qrActivation.service";

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? String(value[0] ?? fallback) : String(value ?? fallback);

const isQrActivated = (qr: any) => {
  const status = String(qr?.status || "").toUpperCase();

  return (
    qr?.is_active === true ||
    qr?.is_activated === true ||
    status === "ACTIVE" ||
    status === "ACTIVATED"
  );
};

export default function CaptureFarmGateScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const qrValue =
    getParamValue(params.qrValue) ||
    getParamValue(params.scannedValue) ||
    getParamValue(params.code);

  const farmDbId =
    getParamValue(params.farmDbId) ||
    getParamValue(params.farmId);

  const farmName = getParamValue(params.farmName, "Farm Gate");
  const cultureCycleId = getParamValue(params.cultureCycleId);
  const nextTo = getParamValue(params.nextTo);

  const cameraRef = useRef<CameraView | null>(null);
  const watermarkRef = useRef<View | null>(null);

  const [permission, requestPermission] = useCameraPermissions();

  const [activationDone, setActivationDone] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activationMessage, setActivationMessage] = useState("");

  const [photoUri, setPhotoUri] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (!mounted) return;

        setGpsLat(String(pos.coords.latitude));
        setGpsLng(String(pos.coords.longitude));
      } catch {
        // GPS failure must not redirect user.
      }
    };

    loadLocation();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!qrValue || !farmDbId) return;
    if (activationDone || activating) return;

    activateQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrValue, farmDbId]);

  const goAfterCapture = () => {
    if (nextTo) {
      router.replace({
        pathname: nextTo as any,
        params: {
          code: qrValue,
          qrValue,
          scannedValue: qrValue,
          farmDbId,
          farmName,
          cultureCycleId,
        },
      });
      return;
    }

    if (qrValue) {
      router.replace({
        pathname: "/(aqua)/traceability/[code]",
        params: {
          code: qrValue,
          qrValue,
          scannedValue: qrValue,
          farmDbId,
          farmName,
          cultureCycleId,
        },
      });
      return;
    }

    router.replace("/(aqua)/tabs/dashboard");
  };

  const activateQr = async () => {
    if (!qrValue) {
      Alert.alert("QR Missing", "Farm QR value is missing.");
      return;
    }

    if (!farmDbId) {
      Alert.alert(
        "Farm Missing",
        "Farm database ID is missing. Scan Farm QR from a selected farm record.",
      );
      setActivationMessage("Farm DB ID missing.");
      return;
    }

    try {
      setActivating(true);
      setActivationMessage("Fetching QR details...");

      const qrResponse = await getAquacultureQrByCode(qrValue);

      if (!qrResponse.ok || !qrResponse.data?.id) {
        Alert.alert("Invalid QR", qrResponse.message || "QR not found.");
        setActivationMessage(qrResponse.message || "QR not found.");
        return;
      }

      const qrData = qrResponse.data;

      const qrType = String(qrData.qr_type || qrData.type || "").toUpperCase();

      if (qrType && qrType !== "FARM") {
        Alert.alert(
          "Wrong QR",
          `This is ${qrType} QR. Please scan Farm Gate QR.`,
        );
        setActivationMessage(`Wrong QR type: ${qrType}`);
        return;
      }

      if (isQrActivated(qrData)) {
        setActivationDone(true);
        setActivationMessage("Farm QR already activated.");
        return;
      }

      setActivationMessage("Activating Farm QR...");

      const activateResponse = await activateFarmQrById(farmDbId, qrData.id);

      if (!activateResponse.ok) {
        Alert.alert(
          "Activation Failed",
          activateResponse.message || "Farm QR activation failed.",
        );
        setActivationMessage(
          activateResponse.message || "Farm QR activation failed.",
        );
        return;
      }

      setActivationDone(true);
      setActivationMessage("Farm QR activated successfully.");
    } catch (error: any) {
      Alert.alert(
        "Activation Failed",
        error?.message || "Farm QR activation failed.",
      );
      setActivationMessage(error?.message || "Farm QR activation failed.");
    } finally {
      setActivating(false);
    }
  };

  const takePicture = async () => {
    if (!activationDone) {
      Alert.alert(
        "QR Not Activated",
        "Activate Farm QR first, then capture farm gate image.",
      );
      return;
    }

    try {
      setCapturing(true);

      const photo = await (cameraRef.current as any)?.takePictureAsync({
        quality: 0.75,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        Alert.alert("Capture Failed", "Could not capture farm gate image.");
        return;
      }

      setPhotoUri(photo.uri);
    } catch (error: any) {
      Alert.alert("Capture Failed", error?.message || "Camera capture failed.");
    } finally {
      setCapturing(false);
    }
  };

  const saveImage = async () => {
    if (!photoUri) {
      Alert.alert("Image Required", "Please capture farm gate image first.");
      return;
    }

    try {
      setSaving(true);

      if (!watermarkRef.current) {
        Alert.alert("Watermark Failed", "Watermarked image preview is not ready.");
        return;
      }

      const watermarkedUri = await captureRef(watermarkRef, {
        format: "jpg",
        quality: 0.9,
        result: "tmpfile",
      });

      if (cultureCycleId) {
        const uploadResponse = await uploadAquacultureImage(
          cultureCycleId,
          {
            uri: String(watermarkedUri),
            name: `farm-gate-${Date.now()}.jpg`,
            type: "image/jpeg",
          },
          {
            image_type: "FARM_GATE",
            qr_value: qrValue,
            farm_id: farmDbId,
            farm_name: farmName,
            gps_latitude: gpsLat,
            gps_longitude: gpsLng,
            timestamp_utc: new Date().toISOString(),
          },
        );

        if (!uploadResponse.ok) {
          Alert.alert(
            "Upload Failed",
            uploadResponse.message || "Farm image upload failed.",
          );
          return;
        }
      }

      Alert.alert("Success", "Farm gate image saved successfully.", [
        {
          text: "OK",
          onPress: goAfterCapture,
        },
      ]);
    } catch (error: any) {
      Alert.alert("Save Failed", error?.message || "Image save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#60A5FA" />
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
        <Ionicons name="camera-outline" size={42} color="#60A5FA" />

        <Text className="mt-5 text-center text-xl font-bold text-white">
          Camera Permission Required
        </Text>

        <Text className="mt-2 text-center text-sm leading-6 text-white/70">
          Camera access is required to capture real-time farm gate image.
        </Text>

        <Pressable
          onPress={requestPermission}
          className="mt-6 w-full rounded-2xl bg-white px-4 py-4"
        >
          <Text className="text-center font-bold text-slate-900">
            Allow Camera
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace("/(aqua)/tabs/dashboard")}
          className="mt-3 w-full rounded-2xl border border-white/20 px-4 py-4"
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
        paddingBottom: insets.bottom + 16,
      }}
    >
      <View className="flex-row items-center px-4">
        <Pressable
          onPress={() => router.replace("/(aqua)/tabs/dashboard")}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>

        <View className="ml-3 flex-1">
          <Text className="text-lg font-bold text-white">
            Capture Farm Gate
          </Text>

          <Text className="mt-0.5 text-xs text-white/60" numberOfLines={1}>
            Farm QR: {qrValue || "-"}
          </Text>
        </View>
      </View>

      <View className="flex-1 justify-center px-4">
        {!activationDone ? (
          <View className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
            <View className="items-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
                {activating ? (
                  <ActivityIndicator size="large" color="#F59E0B" />
                ) : (
                  <Ionicons name="qr-code-outline" size={34} color="#F59E0B" />
                )}
              </View>

              <Text className="mt-4 text-center text-xl font-bold text-white">
                Activate Farm QR
              </Text>

              <Text className="mt-2 text-center text-sm leading-6 text-white/70">
                Farm QR must be activated before capturing farm gate image.
              </Text>

              <View className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 p-4">
                <Text className="text-xs text-white/70">Farm DB ID</Text>
                <Text className="mt-1 text-base font-bold text-white">
                  {farmDbId || "Missing"}
                </Text>

                <Text className="mt-3 text-xs text-white/70">QR Value</Text>
                <Text className="mt-1 text-base font-bold text-white">
                  {qrValue || "Missing"}
                </Text>

                {activationMessage ? (
                  <>
                    <Text className="mt-3 text-xs text-white/70">Status</Text>
                    <Text className="mt-1 text-sm font-semibold text-amber-300">
                      {activationMessage}
                    </Text>
                  </>
                ) : null}
              </View>

              <Pressable
                onPress={activateQr}
                disabled={activating || !qrValue || !farmDbId}
                className={`mt-5 w-full rounded-2xl px-4 py-4 ${
                  activating || !qrValue || !farmDbId
                    ? "bg-slate-500"
                    : "bg-white"
                }`}
              >
                <Text className="text-center font-bold text-slate-900">
                  {activating ? "Activating..." : "Activate Farm QR"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <Text className="text-sm font-bold text-emerald-300">
                Farm QR Activated
              </Text>
              <Text className="mt-1 text-xs leading-5 text-white/70">
                Now capture the real-time farm gate image.
              </Text>
            </View>

            <View className="overflow-hidden rounded-3xl border border-white/10 bg-[#0B1220]">
              {photoUri ? (
                <View
                  collapsable={false}
                  ref={(ref) => {
                    watermarkRef.current = ref;
                  }}
                >
                  <Image
                    source={{ uri: photoUri }}
                    className="h-[430px] w-full"
                    resizeMode="cover"
                  />

                  <View className="absolute bottom-0 left-0 right-0 bg-black/65 p-3">
                    <Text className="text-xs font-semibold text-white">
                      Farm: {farmName}
                    </Text>
                    <Text className="mt-1 text-xs text-white/80">
                      QR: {qrValue || "-"}
                    </Text>
                    <Text className="mt-1 text-xs text-white/80">
                      GPS: {gpsLat || "-"}, {gpsLng || "-"}
                    </Text>
                    <Text className="mt-1 text-xs text-white/80">
                      Time: {new Date().toISOString()}
                    </Text>
                  </View>
                </View>
              ) : (
                <CameraView
                  ref={cameraRef}
                  style={{ height: 430, width: "100%" }}
                />
              )}
            </View>
          </>
        )}
      </View>

      {activationDone ? (
        <View className="px-4">
          {photoUri ? (
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setPhotoUri("")}
                disabled={saving}
                className="flex-1 rounded-2xl border border-white/20 px-4 py-4"
              >
                <Text className="text-center font-semibold text-white">
                  Retake
                </Text>
              </Pressable>

              <Pressable
                onPress={saveImage}
                disabled={saving}
                className="flex-1 rounded-2xl bg-white px-4 py-4"
              >
                <Text className="text-center font-bold text-slate-900">
                  {saving ? "Saving..." : "Save Image"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={takePicture}
              disabled={capturing}
              className="rounded-2xl bg-white px-4 py-4"
            >
              <Text className="text-center font-bold text-slate-900">
                {capturing ? "Capturing..." : "Capture Farm Gate Image"}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}
