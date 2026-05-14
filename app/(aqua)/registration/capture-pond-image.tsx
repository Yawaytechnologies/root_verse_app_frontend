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
        // GPS failure should not block QR activation.
      }
    };

    loadLocation();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!qrValue || !pondDbId) return;
    if (activationDone || activating) return;

    activateQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrValue, pondDbId]);

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
        const cycleId = await createCultureCycleIfNeeded();

        setActivationDone(true);
        setActivationMessage(
          cycleId
            ? "Pond QR already activated. Culture cycle ready."
            : "Pond QR already activated.",
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
        timestamp_utc: new Date().toISOString(),
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
                  <Image
                    source={{ uri: photoUri }}
                    className="h-[430px] w-full"
                    resizeMode="cover"
                  />

                  <View className="absolute bottom-0 left-0 right-0 bg-black/65 p-3">
                    <Text className="text-xs font-semibold text-white">
                      Pond: {pondName}
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
                {capturing ? "Capturing..." : "Capture Pond Image"}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}
