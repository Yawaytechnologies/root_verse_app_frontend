import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
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


const formatCoord = (value: string) => {
  const text = String(value ?? "").trim();
  if (!text) return "N/A";

  const n = Number(text);
  return Number.isFinite(n) ? n.toFixed(5) : text;
};

const formatCaptureTime = (value: string) => {
  if (!value) return "N/A";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  const pad = (n: number) => String(n).padStart(2, "0");
  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(
    hours,
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
};

function FarmWatermark({
  userId,
  farmName,
  gpsLat,
  gpsLng,
  gpsAccuracy,
  capturedAt,
  qrValue,
}: {
  userId: string;
  farmName: string;
  gpsLat: string;
  gpsLng: string;
  gpsAccuracy: string;
  capturedAt: string;
  qrValue: string;
}) {
  const accuracyTextValue = String(gpsAccuracy ?? "").trim();
  const accuracyNumber = Number(accuracyTextValue);
  const accuracyText =
    accuracyTextValue && Number.isFinite(accuracyNumber)
      ? `${Math.round(accuracyNumber)} m`
      : "N/A";

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        maxWidth: "88%",
        borderRadius: 10,
        backgroundColor: "rgba(0,0,0,0.62)",
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 11,
          fontWeight: "900",
          lineHeight: 16,
          textAlign: "right",
        }}
      >
        Powered by Rootverse
      </Text>

      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 10,
          fontWeight: "800",
          lineHeight: 15,
          textAlign: "right",
        }}
      >
        Farmer ID: {userId || "-"}
      </Text>

      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 10,
          fontWeight: "700",
          lineHeight: 15,
          textAlign: "right",
        }}
      >
        Farm: {farmName || "-"}
      </Text>

      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 10,
          fontWeight: "700",
          lineHeight: 15,
          textAlign: "right",
        }}
      >
        Lat: {formatCoord(gpsLat)} · Lng: {formatCoord(gpsLng)}
      </Text>

      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 10,
          fontWeight: "700",
          lineHeight: 15,
          textAlign: "right",
        }}
      >
        Acc: {accuracyText} · {formatCaptureTime(capturedAt)}
      </Text>

      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 10,
          fontWeight: "800",
          lineHeight: 15,
          textAlign: "right",
        }}
      >
        QR: {qrValue || "-"}
      </Text>
    </View>
  );
}

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
  const userId = getParamValue(params.userId);
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
  const [previewVisible, setPreviewVisible] = useState(false);
  const [captureTime, setCaptureTime] = useState("");

  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [gpsAccuracy, setGpsAccuracy] = useState("");

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
        setGpsAccuracy(
          pos.coords.accuracy !== null && pos.coords.accuracy !== undefined
            ? String(pos.coords.accuracy)
            : "",
        );
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
      setCaptureTime(new Date().toISOString());
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
            timestamp_utc: captureTime || new Date().toISOString(),
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
                  <Pressable onPress={() => setPreviewVisible(true)}>
                    <Image
                      source={{ uri: photoUri }}
                      className="h-[430px] w-full"
                      resizeMode="cover"
                    />

                    <FarmWatermark
                      userId={userId}
                      farmName={farmName}
                      gpsLat={gpsLat}
                      gpsLng={gpsLng}
                      gpsAccuracy={gpsAccuracy}
                      capturedAt={captureTime}
                      qrValue={qrValue}
                    />
                  </Pressable>
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
                onPress={() => {
                  setPhotoUri("");
                  setCaptureTime("");
                  setPreviewVisible(false);
                }}
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

      <Modal
        visible={previewVisible && !!photoUri}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#08162F",
            paddingTop: insets.top + 18,
            paddingBottom: insets.bottom + 18,
          }}
        >
          <View
            style={{
              paddingHorizontal: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 24,
                fontWeight: "900",
              }}
            >
              Preview
            </Text>

            <Pressable
              onPress={() => setPreviewVisible(false)}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "#1F2E4B",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={34} color="#FFFFFF" />
            </Pressable>
          </View>

          <Pressable
            onPress={() => setPreviewVisible(false)}
            style={{
              flex: 1,
              marginHorizontal: 24,
              marginTop: 24,
              marginBottom: 18,
              borderRadius: 24,
              overflow: "hidden",
              backgroundColor: "#061126",
            }}
          >
            <View style={{ flex: 1, position: "relative" }}>
              <Image
                source={{ uri: photoUri }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                resizeMode="contain"
              />

              <FarmWatermark
                userId={userId}
                farmName={farmName}
                gpsLat={gpsLat}
                gpsLng={gpsLng}
                gpsAccuracy={gpsAccuracy}
                capturedAt={captureTime}
                qrValue={qrValue}
              />
            </View>
          </Pressable>

          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 18,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            Tap to close
          </Text>
        </View>
      </Modal>
    </View>
  );
}