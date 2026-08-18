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
  activatePondQrById,
  createCultureCycle,
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

function PondWatermark({
  userId,
  farmName,
  pondName,
  gpsLat,
  gpsLng,
  gpsAccuracy,
  capturedAt,
  qrValue,
}: {
  userId: string;
  farmName: string;
  pondName: string;
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
        Pond: {pondName || "-"}
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

const todayDate = () => new Date().toISOString().split("T")[0];

const futureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

export default function CapturePondImageScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const qrValue =
    getParamValue(params.qrValue) ||
    getParamValue(params.scannedValue) ||
    getParamValue(params.code);

  const pondDbId =
    getParamValue(params.pondDbId) || getParamValue(params.pondId);

  const farmDbId =
    getParamValue(params.farmDbId) || getParamValue(params.farmId);

  const userId = getParamValue(params.userId);
  const farmName = getParamValue(params.farmName, "Farm");
  const pondName = getParamValue(params.pondName, "Pond");
  const nextTo = getParamValue(params.nextTo);

  const initialCultureCycleId = getParamValue(params.cultureCycleId);

  const startDateParam =
    getParamValue(params.start_date) ||
    getParamValue(params.startDate) ||
    todayDate();

  const endDateParam =
    getParamValue(params.end_date) ||
    getParamValue(params.endDate) ||
    futureDate(120);

  const stockingDate =
    getParamValue(params.stocking_date) || getParamValue(params.stockingDate);

  const cameraRef = useRef<CameraView | null>(null);
  const watermarkRef = useRef<View | null>(null);

  const [permission, requestPermission] = useCameraPermissions();

  const [cultureCycleId, setCultureCycleId] = useState(initialCultureCycleId);

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
        // GPS failure should not block QR activation.
      }
    };

    loadLocation();

    return () => {
      mounted = false;
    };
  }, []);

  // IMPORTANT: this screen must never be usable before a Pond QR is scanned.
  // If it is opened directly from Dashboard (or by a stale route) without
  // qrValue/scannedValue/code, immediately send the user to the scanner.
  useEffect(() => {
    if (qrValue || !pondDbId) return;

    const timer = setTimeout(() => {
      router.replace({
        pathname: "/(aqua)/tabs/qr-scanner",
        params: {
          purpose: "POND_ACTIVATION",
          returnTo: "/(aqua)/registration/capture-pond-image",
          pondDbId,
          pondId: pondDbId,
          pondName,
          farmDbId,
          farmId: farmDbId,
          farmName,
          userId,
          cultureCycleId: cultureCycleId || initialCultureCycleId,
          start_date: startDateParam,
          startDate: startDateParam,
          end_date: endDateParam,
          endDate: endDateParam,
          ...(stockingDate
            ? { stocking_date: stockingDate, stockingDate }
            : {}),
        },
      } as any);
    }, 100);

    return () => clearTimeout(timer);
  }, [
    qrValue,
    pondDbId,
    pondName,
    farmDbId,
    farmName,
    userId,
    cultureCycleId,
    initialCultureCycleId,
    startDateParam,
    endDateParam,
    stockingDate,
  ]);

  // Scanning only loads the QR value. The farmer must explicitly press
  // "Activate Pond QR" before the activation API is called.
  useEffect(() => {
    if (!qrValue || !pondDbId || activationDone) return;

    setActivationMessage(
      "Pond QR scanned. Tap Activate Pond QR to confirm activation.",
    );
  }, [qrValue, pondDbId, activationDone]);

  const goAfterCapture = (finalCultureCycleId?: string) => {
    const cycleId = finalCultureCycleId || cultureCycleId || "";

    if (nextTo) {
      router.replace({
        pathname: nextTo as any,
        params: {
          code: qrValue,
          qrValue,
          scannedValue: qrValue,
          pondDbId,
          pondName,
          farmDbId,
          cultureCycleId: cycleId,
          userId,
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
          pondDbId,
          pondName,
          farmDbId,
          cultureCycleId: cycleId,
          userId,
        },
      });
      return;
    }

    router.replace("/(aqua)/tabs/dashboard");
  };

  const createCultureCycleIfNeeded = async (): Promise<string | null> => {
    if (cultureCycleId) return cultureCycleId;

    if (!userId || !farmDbId || !pondDbId) {
      setActivationMessage(
        "Pond QR activated, but culture cycle was not created because user/farm/pond ID is missing.",
      );
      return null;
    }

    setActivationMessage("Creating culture cycle...");

    const payload: Record<string, any> = {
      user_id: Number(userId),
      farm_id: Number(farmDbId),
      pond_id: Number(pondDbId),

      start_date: startDateParam,
      end_date: endDateParam,

      verification_status: "PENDING",
      status: "PENDING",
    };

    if (stockingDate) {
      payload.stocking_date = stockingDate;
    }

    const cycleResponse = await createCultureCycle(payload);

    if (cycleResponse.ok && cycleResponse.data?.id) {
      const newCultureCycleId = String(cycleResponse.data.id);
      setCultureCycleId(newCultureCycleId);
      setActivationMessage("Culture cycle created successfully.");
      return newCultureCycleId;
    }

    Alert.alert(
      "Culture Cycle Warning",
      cycleResponse.message ||
        "Pond QR activated, but culture cycle was not created.",
    );

    setActivationMessage(
      cycleResponse.message ||
        "Pond QR activated, but culture cycle was not created.",
    );

    return null;
  };

  const activateQr = async () => {
    if (!qrValue) {
      Alert.alert("QR Missing", "Pond QR value is missing.");
      return;
    }

    if (!pondDbId) {
      Alert.alert(
        "Pond Missing",
        "Pond database ID is missing. Scan Pond QR from a selected pond record.",
      );
      setActivationMessage("Pond DB ID missing.");
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

      if (qrType && qrType !== "POND") {
        Alert.alert("Wrong QR", `This is ${qrType} QR. Please scan Pond QR.`);
        setActivationMessage(`Wrong QR type: ${qrType}`);
        return;
      }

      if (isQrActivated(qrData)) {
        const linkedPondId = String(
          qrData?.pond_id ??
            qrData?.pondId ??
            qrData?.pond?.id ??
            qrData?.linked_pond_id ??
            "",
        ).trim();

        const selectedPondId = String(pondDbId).trim();

        // An already activated QR can only be accepted when the backend says
        // it belongs to the exact pond selected from Dashboard.
        if (!linkedPondId || linkedPondId !== selectedPondId) {
          Alert.alert(
            "QR Already Activated",
            linkedPondId
              ? "This Pond QR is already linked to another pond. Scan the QR assigned to the selected pond."
              : "This Pond QR is already activated and cannot be linked again.",
          );
          setActivationMessage("This QR cannot be used for the selected pond.");
          return;
        }

        const cycleId = await createCultureCycleIfNeeded();

        setActivationDone(true);
        setActivationMessage(
          cycleId
            ? "This Pond QR is already activated for the selected pond. Culture cycle ready."
            : "This Pond QR is already activated for the selected pond.",
        );
        return;
      }

      setActivationMessage("Activating Pond QR...");

      const activateResponse = await activatePondQrById(pondDbId, qrData.id);

      if (!activateResponse.ok) {
        Alert.alert(
          "Activation Failed",
          activateResponse.message || "Pond QR activation failed.",
        );
        setActivationMessage(
          activateResponse.message || "Pond QR activation failed.",
        );
        return;
      }

      const cycleId = await createCultureCycleIfNeeded();

      setActivationDone(true);
      setActivationMessage(
        cycleId
          ? "Pond QR activated successfully. Culture cycle ready."
          : "Pond QR activated successfully.",
      );
    } catch (error: any) {
      Alert.alert(
        "Activation Failed",
        error?.message || "Pond QR activation failed.",
      );
      setActivationMessage(error?.message || "Pond QR activation failed.");
    } finally {
      setActivating(false);
    }
  };

  const takePicture = async () => {
    if (!activationDone) {
      Alert.alert(
        "QR Not Activated",
        "Activate Pond QR first, then capture pond image.",
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
        Alert.alert("Capture Failed", "Could not capture pond image.");
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
    Alert.alert("Image Required", "Please capture pond image first.");
    return;
  }

  if (!cultureCycleId) {
    Alert.alert(
      "Culture Cycle Required",
      "Create culture cycle manually before uploading pond image.",
      [
        {
          text: "Create Culture Cycle",
          onPress: () => {
            router.replace({
              pathname: "/(aqua)/culture-cycle/add",
              params: {
                pondDbId,
                pondId: pondDbId,
                pondName,
                farmDbId,
                farmId: farmDbId,
                userId,
              },
            });
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
    );

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

    const uploadResponse = await uploadAquacultureImage(
      cultureCycleId,
      {
        uri: String(watermarkedUri),
        name: `pond-${Date.now()}.jpg`,
        type: "image/jpeg",
      },
      {
        image_type: "POND",
        qr_value: qrValue,
        pond_id: pondDbId,
        pond_name: pondName,
        farm_id: farmDbId,
        gps_latitude: gpsLat,
        gps_longitude: gpsLng,
        timestamp_utc: captureTime || new Date().toISOString(),
      },
    );

    if (!uploadResponse.ok) {
      Alert.alert(
        "Upload Failed",
        uploadResponse.message || "Pond image upload failed.",
      );
      return;
    }

    Alert.alert("Success", "Pond image saved successfully.", [
      {
        text: "OK",
        onPress: () => goAfterCapture(cultureCycleId),
      },
    ]);
  } catch (error: any) {
    Alert.alert("Save Failed", error?.message || "Image save failed.");
  } finally {
    setSaving(false);
  }
};

  // Do not show the activation form before a QR has actually been scanned.
  // While the redirect effect above sends the user to the scanner, keep this
  // screen in a simple loading state so "QR Value: Missing" is never shown.
  if (!qrValue) {
    return (
      <View
        className="flex-1 items-center justify-center bg-black px-6"
        style={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text className="mt-5 text-center text-lg font-bold text-white">
          Opening Pond QR Scanner...
        </Text>
        <Text className="mt-2 text-center text-sm leading-6 text-white/60">
          Scan the Pond QR first. Activation will be available only after a valid QR is scanned.
        </Text>
      </View>
    );
  }

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
          Camera access is required to capture real-time pond image.
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
            Capture Pond Image
          </Text>

          <Text className="mt-0.5 text-xs text-white/60" numberOfLines={1}>
            Pond QR: {qrValue || "-"}
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
                Activate Pond QR
              </Text>

              <Text className="mt-2 text-center text-sm leading-6 text-white/70">
                Pond QR must be activated before capturing pond image.
              </Text>

              <View className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 p-4">
                <Text className="text-xs text-white/70">Pond DB ID</Text>
                <Text className="mt-1 text-base font-bold text-white">
                  {pondDbId || "Missing"}
                </Text>

                <Text className="mt-3 text-xs text-white/70">Farm DB ID</Text>
                <Text className="mt-1 text-base font-bold text-white">
                  {farmDbId || "Missing"}
                </Text>

                <Text className="mt-3 text-xs text-white/70">User ID</Text>
                <Text className="mt-1 text-base font-bold text-white">
                  {userId || "Missing"}
                </Text>

                <Text className="mt-3 text-xs text-white/70">QR Value</Text>
                <Text className="mt-1 text-base font-bold text-white">
                  {qrValue || "Missing"}
                </Text>

                <Text className="mt-3 text-xs text-white/70">
                  Culture Cycle
                </Text>
                <Text className="mt-1 text-sm font-bold text-white">
                  {cultureCycleId || "Will create after activation"}
                </Text>

                <Text className="mt-3 text-xs text-white/70">Cycle Dates</Text>
                <Text className="mt-1 text-sm font-bold text-white">
                  {startDateParam} to {endDateParam}
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
                disabled={activating || !qrValue || !pondDbId}
                className={`mt-5 w-full rounded-2xl px-4 py-4 ${
                  activating || !qrValue || !pondDbId
                    ? "bg-slate-500"
                    : "bg-white"
                }`}
              >
                <Text className="text-center font-bold text-slate-900">
                  {activating ? "Activating..." : "Activate Pond QR"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <Text className="text-sm font-bold text-emerald-300">
                Pond QR Activated
              </Text>

              <Text className="mt-1 text-xs leading-5 text-white/70">
                Now capture the real-time pond image.
              </Text>

              {cultureCycleId ? (
                <Text className="mt-2 text-xs font-semibold text-emerald-300">
                  Culture Cycle ID: {cultureCycleId}
                </Text>
              ) : null}
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

                    <PondWatermark
                      userId={userId}
                      farmName={farmName}
                      pondName={pondName}
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
                {capturing ? "Capturing..." : "Capture Pond Image"}
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

              <PondWatermark
                userId={userId}
                farmName={farmName}
                pondName={pondName}
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