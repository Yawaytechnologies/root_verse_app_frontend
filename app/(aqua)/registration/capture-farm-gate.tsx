import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, Pressable, ScrollView, Alert, Image } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { CameraView, useCameraPermissions } from "expo-camera";

const localNow = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${year}-${month}-${day} ${pad(hours)}:${minutes} ${ampm}`;
};

function WatermarkOverlay({
  farmerCode,
  farmName,
  lat,
  lng,
  captureTime,
}: {
  farmerCode: string;
  farmName: string;
  lat: string;
  lng: string;
  captureTime: string;
}) {
  return (
    <View
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "rgba(0,0,0,0.72)",
        borderRadius: 8,
        padding: 8,
      }}
    >
      <Text
        style={{
          color: "#93C5FD",
          fontSize: 8,
          fontWeight: "700",
          lineHeight: 13,
          marginBottom: 3,
          letterSpacing: 0.4,
        }}
      >
        ⬡ Powered by Rootverse
      </Text>
      <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "700", lineHeight: 14 }}>
        Farmer: {farmerCode}
      </Text>
      <Text style={{ color: "#FFFFFF", fontSize: 9, lineHeight: 14 }}>
        Farm: {farmName}
      </Text>
      <Text style={{ color: "#CBD5E1", fontSize: 9, lineHeight: 14 }}>
        Lat: {lat}
      </Text>
      <Text style={{ color: "#CBD5E1", fontSize: 9, lineHeight: 14 }}>
        Lng: {lng}
      </Text>
      <Text style={{ color: "#CBD5E1", fontSize: 9, lineHeight: 14 }}>
        Time: {captureTime}
      </Text>
    </View>
  );
}

export default function CaptureFarmGateScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const cameraRef = useRef<CameraView | null>(null);

  const me = useSelector((state: any) => state.me?.me);
  const farm = useSelector((state: any) => state.aquaRegistration?.farm);
  const farmerCode = me?.owner_id ?? "FARMER";
  const farmName = farm?.farmName?.trim() || "Farm";
  const lat = farm?.latitude || farm?.gpsLat || "";
  const lng = farm?.longitude || farm?.gpsLng || "";
  const coordStr = lat && lng
    ? `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`
    : "N/A";

  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [captureTime, setCaptureTime] = useState("");

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
      setCaptureTime(localNow());
    } catch (error) {
      console.error("Farm image capture failed:", error);
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

    router.replace({
      pathname: "/(aqua)/registration/farm-details",
      params: {
        farmImageCaptured: "true",
        farmImageUri: photoUri,
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
                {t("registration.captureFarmGateTitle")}
              </Text>

              <View className="h-11 w-11" />
            </View>

            <Text className="mt-3 text-center text-sm text-white/70">
              {cameraReady
                ? t("registration.cameraReadyCapture")
                : t("registration.cameraLoading")}
            </Text>
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
                  {t("registration.farmGateImage")}
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

          <View style={{ position: "relative" }} className="mt-5">
            <Image
              source={{ uri: photoUri }}
              className="h-[420px] w-full rounded-2xl"
              resizeMode="cover"
            />
            <WatermarkOverlay
              farmerCode={farmerCode}
              farmName={farmName}
              lat={lat ? parseFloat(lat).toFixed(5) : "N/A"}
              lng={lng ? parseFloat(lng).toFixed(5) : "N/A"}
              captureTime={captureTime}
            />
          </View>

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