import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, Pressable, ScrollView, Alert, Image } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";

type PondItem = {
  id: string;
  pondName: string;
  pondArea: string;
  cultureType: string;
  speciesId: string;
  speciesName: string;
  speciesCode: string;
  speciesImageUrl: string;
  gpsLat?: string;
  gpsLng?: string;
  pondImageCaptured: boolean;
  pondImageUri: string;
};

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? String(value[0] ?? fallback) : String(value ?? fallback);

export default function CapturePondImageScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const cameraRef = useRef<CameraView | null>(null);
  const { t } = useTranslation();

  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // new pond-flow params only
  const farmId = getParamValue(params.farmId, "");
  const farmName = getParamValue(params.farmName, "");
  const farmCode = getParamValue(params.farmCode, "");
  const pondsJson = getParamValue(params.pondsJson, "[]");
  const pondIndex = Number(getParamValue(params.pondIndex, "0"));

  let ponds: PondItem[] = [];
  try {
    const parsed = JSON.parse(pondsJson);
    ponds = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse pondsJson:", error);
    ponds = [];
  }

  const activePond = ponds[pondIndex] ?? null;

  const handleTakePicture = async () => {
    try {
      if (!cameraReady) {
        Alert.alert("Camera", "Camera is still loading. Please wait a second.");
        return;
      }

      if (!cameraRef.current) {
        Alert.alert("Camera", "Camera is not ready");
        return;
      }

      setCapturing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });

      if (!photo?.uri) {
        Alert.alert("Camera", "Failed to capture image");
        return;
      }

      setPhotoUri(photo.uri);
    } catch (error) {
      console.error("Pond image capture failed:", error);
      Alert.alert("Camera", "Unable to capture image");
    } finally {
      setCapturing(false);
    }
  };

  const handleUseImage = () => {
    if (!photoUri) {
      Alert.alert("Camera", "Please capture an image first");
      return;
    }

    if (!farmId) {
      Alert.alert(
        "Approved Farm Required",
        "Pond registration must be linked to an approved farm ID.",
      );
      return;
    }

    if (!Array.isArray(ponds) || !ponds[pondIndex]) {
      Alert.alert("Error", "Unable to find selected pond");
      return;
    }

    const updatedPonds = ponds.map((pond, index) =>
      index === pondIndex
        ? {
            ...pond,
            pondImageCaptured: true,
            pondImageUri: photoUri,
          }
        : pond,
    );

    router.replace({
      pathname: "/(aqua)/registration/pond-details",
      params: {
        farmId,
        farmName,
        farmCode,
        pondsJson: JSON.stringify(updatedPonds),
      },
    });
  };

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-[#050B16] px-6">
        <Text className="text-white">{t("registration.cameraLoading")}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <ScrollView
        className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]"
        contentContainerStyle={{
          padding: 16,
          paddingTop: insets.top + 8,
          paddingBottom: 32,
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        <View className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0B1220]">
          <View className="items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
              <Ionicons name="camera-outline" size={30} color="#60A5FA" />
            </View>

            <Text className="mt-4 text-center text-xl font-bold text-slate-900 dark:text-white">
              {t("registration.cameraPermissionTitle")}
            </Text>

            <Text className="mt-2 text-center text-sm leading-6 text-slate-600 dark:text-white/70">
              {t("registration.cameraPermissionDesc")}
            </Text>
          </View>

          <Pressable
            onPress={requestPermission}
            className="mt-6 rounded-2xl bg-slate-900 px-4 py-4 dark:bg-white"
          >
            <Text className="text-center font-semibold text-white dark:text-slate-900">
              {t("registration.allowCamera")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#0B1220]"
          >
            <Text className="text-center font-semibold text-slate-900 dark:text-white">
              {t("registration.back")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 bg-[#050B16]">
      {!photoUri ? (
        <>
          <View
            style={{ paddingTop: insets.top + 8 }}
            className="bg-[#050B16] px-4 pb-4"
          >
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => router.back()}
                className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </Pressable>

              <Text className="text-base font-semibold text-white">
                {t("registration.captureImage")}
              </Text>

              <View className="h-11 w-11" />
            </View>

            <Text className="mt-3 text-center text-sm text-white/70">
              {cameraReady
                ? `${t("registration.captureImage")} — ${activePond?.pondName || `${t("registration.pondDetails")} ${pondIndex + 1}`}`
                : t("registration.cameraLoading")}
            </Text>

            {!!farmName && (
              <Text className="mt-1 text-center text-xs text-white/50">
                {t("registration.farmLabel")}: {farmName}
              </Text>
            )}
          </View>

          <View className="flex-1 overflow-hidden rounded-t-3xl">
            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing="back"
              onCameraReady={() => setCameraReady(true)}
            />
          </View>

          <View className="bg-[#050B16] px-6 pb-8 pt-5">
            <Pressable
              onPress={handleTakePicture}
              disabled={capturing || !cameraReady}
              className="self-center h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/10"
            >
              <View className="h-14 w-14 rounded-full bg-white" />
            </Pressable>

            <Text className="mt-4 text-center text-sm text-white/70">
              {capturing
                ? t("registration.capturing")
                : cameraReady
                  ? t("registration.tapToCapture")
                  : t("registration.preparingCamera")}
            </Text>
          </View>
        </>
      ) : (
        <ScrollView
          className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]"
          contentContainerStyle={{
            padding: 16,
            paddingTop: insets.top + 8,
            paddingBottom: 32,
          }}
        >
          <View className="rounded-2xl border border-slate-900 bg-slate-900 p-5 dark:border-white/10 dark:bg-[#0B1220]">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                <Ionicons name="image-outline" size={20} color="#60A5FA" />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] uppercase tracking-wide text-white opacity-80">
                  {t("registration.pondImagePreview")}
                </Text>
                <Text className="mt-1 text-lg font-bold text-white">
                  {t("registration.reviewImage")}
                </Text>
                <Text className="mt-1 text-sm text-white/80">
                  {t("registration.retakeOrUse")}
                </Text>
              </View>
            </View>
          </View>

          {!!farmName && (
            <View className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <Text className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                {t("registration.selectFarm")}
              </Text>
              <Text className="mt-2 text-sm text-emerald-700 dark:text-emerald-200/90">
                {t("registration.farmName")}: {farmName}
              </Text>
              <Text className="mt-1 text-sm text-emerald-700 dark:text-emerald-200/90">
                Farm ID: {farmId || "-"}
              </Text>
              {farmCode ? (
                <Text className="mt-1 text-sm text-emerald-700 dark:text-emerald-200/90">
                  Farm Code: {farmCode}
                </Text>
              ) : null}
            </View>
          )}

          <Image
            source={{ uri: photoUri }}
            className="mt-5 h-[420px] w-full rounded-2xl"
            resizeMode="cover"
          />

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1">
              <Pressable
                onPress={() => {
                  setPhotoUri(null);
                  setCameraReady(false);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#0B1220]"
              >
                <Text className="text-center font-semibold text-slate-900 dark:text-white">
                  {t("registration.retake")}
                </Text>
              </Pressable>
            </View>

            <View className="flex-1">
              <Pressable
                onPress={handleUseImage}
                className="rounded-2xl bg-slate-900 px-4 py-4 dark:bg-white"
              >
                <Text className="text-center font-semibold text-white dark:text-slate-900">
                  {t("registration.useThisImage")}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}