import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useDispatch, useSelector } from "react-redux";

import Screen from "../../src/components/centre/Screen";
import {
  clearLastScanResult,
  fetchAssignedCrates,
  scanPickupCrate,
  selectAssignedCrates,
  selectLastScanMessage,
  selectScanPickupError,
  selectScanPickupLoading,
  selectTransportSelectedDate,
} from "../../src/services/transport/transportSlice";

type BannerType = "success" | "error" | "info";

function firstText(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function statusStyle(status?: string) {
  const value = String(status || "").toUpperCase();

  if (value.includes("TRANSIT")) {
    return {
      bg: "bg-[#3a2b0a]",
      text: "text-[#fcd34d]",
      label: status || "IN TRANSIT",
    };
  }

  if (value.includes("ASSIGN") || value.includes("SCHEDULED")) {
    return {
      bg: "bg-[#0f2d22]",
      text: "text-[#6ee7b7]",
      label: status || "ASSIGNED",
    };
  }

  if (value.includes("RECEIVED")) {
    return {
      bg: "bg-[#102b45]",
      text: "text-[#93c5fd]",
      label: status || "RECEIVED",
    };
  }

  return {
    bg: "bg-[#1e293b]",
    text: "text-slate-200",
    label: status || "UNKNOWN",
  };
}

export default function TransportScanScreen() {
  const dispatch = useDispatch<any>();

  const assignedCrates = useSelector(selectAssignedCrates);
  const selectedDate = useSelector(selectTransportSelectedDate);
  const scanError = useSelector(selectScanPickupError);
  const scanLoading = useSelector(selectScanPickupLoading);
  const lastScanMessage = useSelector(selectLastScanMessage);

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [bannerType, setBannerType] = useState<BannerType>("info");
  const [bannerText, setBannerText] = useState(
    "Scan the assigned crate QR or enter the code manually to move it into transit."
  );

  const scanLockRef = useRef(false);

  useEffect(() => {
    dispatch(
      fetchAssignedCrates(selectedDate ? { date: selectedDate } : undefined)
    );
  }, [dispatch, selectedDate]);

  useEffect(() => {
    if (scanError) {
      setBannerType("error");
      setBannerText(scanError);
      setCameraPaused(false);
      scanLockRef.current = false;
      Alert.alert("Scan Failed", scanError);
      return;
    }

    if (lastScanMessage) {
      setBannerType("success");
      setBannerText(lastScanMessage);
      setCameraPaused(false);
      scanLockRef.current = false;

      Alert.alert("Success", lastScanMessage, [
        {
          text: "Go to In Transit",
          onPress: () => {
            dispatch(clearLastScanResult());
            router.push("/(transport)/in-transit");
          },
        },
        {
          text: "OK",
          onPress: () => dispatch(clearLastScanResult()),
        },
      ]);
    }
  }, [scanError, lastScanMessage, dispatch]);

  const normalizedAssigned = useMemo(() => {
    return (assignedCrates || []).map((item: any, index: number) => {
      const scanValue = firstText(
        item?.crateQr,
        item?.code,
        item?.raw?.crate_qr,
        item?.raw?.qr_code,
        item?.raw?.code,
        item?.crateId,
        item?.id
      );

      return {
        key: `${scanValue || "crate"}-${index}`,
        scanValue,
        destination: firstText(item?.destination, item?.raw?.destination_name),
        driverName: firstText(item?.driverName, item?.raw?.driver_name),
        vehicleNo: firstText(item?.vehicleNo, item?.raw?.vehicle_no),
        operatorId: firstText(
          item?.transportOperatorId,
          item?.raw?.transport_operator_id,
          item?.raw?.operator_id
        ),
        status: firstText(item?.status, item?.raw?.status),
      };
    });
  }, [assignedCrates]);

  const handleScan = async (value: string) => {
    const finalQr = String(value ?? "").trim();

    if (!finalQr) {
      setBannerType("error");
      setBannerText("crate_qr is required");
      Alert.alert("Scan Failed", "Please enter crate QR value");
      return;
    }

    setBannerType("info");
    setBannerText(`Verifying ${finalQr} ...`);

    await dispatch(scanPickupCrate({ crate_qr: finalQr }));
    setQrValue("");
  };

  const handleCameraScan = async ({ data }: { data: string }) => {
    if (!data || scanLoading || cameraPaused || scanLockRef.current) return;

    scanLockRef.current = true;
    setCameraPaused(true);
    setQrValue(data);

    try {
      await handleScan(data);
    } finally {
      setTimeout(() => {
        scanLockRef.current = false;
      }, 1200);
    }
  };

  const renderCameraBody = () => {
    if (!permission) {
      return (
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color="#2b83ff" />
          <Text className="mt-4 text-center text-[14px] font-semibold text-slate-300">
            Loading camera permission...
          </Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-[#14325a]">
            <Ionicons name="camera-outline" size={38} color="#60a5fa" />
          </View>

          <Text className="mt-5 text-center text-[22px] font-extrabold text-white">
            Camera permission needed
          </Text>

          <Text className="mt-2 text-center text-[14px] leading-6 text-slate-400">
            Allow camera access to scan the crate QR directly.
          </Text>

          <Pressable
            onPress={requestPermission}
            className="mt-5 rounded-[18px] bg-[#204a8f] px-6 py-3"
          >
            <Text className="text-[15px] font-extrabold text-white">
              Allow Camera
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <>
        <CameraView
          style={{ flex: 1, borderRadius: 28 }}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "code128", "code39", "ean13", "ean8"],
          }}
          onBarcodeScanned={cameraPaused || scanLoading ? undefined : handleCameraScan}
          onCameraReady={() => setCameraReady(true)}
        />

        <View className="absolute inset-0 rounded-[28px]">
          <View className="absolute left-5 top-5 h-12 w-12 rounded-tl-[8px] border-l-[6px] border-t-[6px] border-[#2b83ff]" />
          <View className="absolute right-5 top-5 h-12 w-12 rounded-tr-[8px] border-r-[6px] border-t-[6px] border-[#2b83ff]" />
          <View className="absolute bottom-16 left-5 h-12 w-12 rounded-bl-[8px] border-b-[6px] border-l-[6px] border-[#2b83ff]" />
          <View className="absolute bottom-16 right-5 h-12 w-12 rounded-br-[8px] border-b-[6px] border-r-[6px] border-[#2b83ff]" />

          <View className="absolute left-10 right-10 top-1/2 h-[3px] rounded-full bg-[#2b83ff]" />

          <View className="absolute inset-x-0 bottom-5 items-center px-6">
            <Text className="text-center text-[16px] font-bold text-white">
              {scanLoading
                ? "Verifying scanned crate..."
                : cameraPaused
                ? "Scanner paused. Waiting for result..."
                : "Align QR inside the box"}
            </Text>

            <Text className="mt-1 text-center text-[13px] text-slate-200">
              {cameraReady
                ? "Keep the full QR clearly visible inside the frame"
                : "Opening camera..."}
            </Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <Screen>
      <View className="flex-1 bg-[#031225] px-5 pt-5">
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[28px] font-extrabold text-white">
              Transport Scanner
            </Text>
            <Text className="mt-1 text-[14px] text-slate-400">
              Scan assigned crate and move it to transit
            </Text>
          </View>

          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back-circle-outline" size={34} color="#fff" />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View
            className={`mb-5 rounded-[18px] border px-4 py-3 ${
              bannerType === "success"
                ? "border-[#14532d] bg-[#0f2f21]"
                : bannerType === "error"
                ? "border-[#7f1d1d] bg-[#3a1f24]"
                : "border-[#1e3a5f] bg-[#102544]"
            }`}
          >
            <Text
              className={`text-[14px] font-bold ${
                bannerType === "success"
                  ? "text-[#86efac]"
                  : bannerType === "error"
                  ? "text-[#fda4af]"
                  : "text-slate-200"
              }`}
            >
              {bannerText}
            </Text>
          </View>

          <View className="rounded-[28px] border border-slate-800 bg-[#0b172b] p-5">
            <Text className="text-[17px] font-extrabold text-white">
              Enter QR Code manually
            </Text>

            <TextInput
              value={qrValue}
              onChangeText={setQrValue}
              placeholder="e.g. KK-W-26000097"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              editable={!scanLoading}
              className="mt-4 rounded-[18px] border border-slate-700 bg-[#07101f] px-4 py-4 text-[16px] font-semibold text-white"
            />

            <Pressable
              onPress={() => handleScan(qrValue)}
              disabled={scanLoading}
              className={`mt-4 items-center rounded-[20px] py-4 ${
                scanLoading ? "bg-[#335b92]" : "bg-[#204a8f]"
              }`}
            >
              <Text className="text-[17px] font-extrabold text-white">
                {scanLoading ? "Processing..." : "Use Code"}
              </Text>
            </Pressable>
          </View>

          <View className="my-6 flex-row items-center">
            <View className="h-[1px] flex-1 bg-slate-700" />
            <Text className="mx-4 text-[18px] font-extrabold text-slate-300">
              OR
            </Text>
            <View className="h-[1px] flex-1 bg-slate-700" />
          </View>

          <View className="rounded-[30px] border border-slate-800 bg-[#0b172b] p-5">
            <View className="relative h-[420px] overflow-hidden rounded-[28px] border border-[#1c355a] bg-[#020916]">
              {renderCameraBody()}
            </View>

            {permission?.granted ? (
              <View className="mt-4 flex-row gap-3">
                <Pressable
                  onPress={() => {
                    setCameraPaused(false);
                    setBannerType("info");
                    setBannerText(
                      "Scanner resumed. Align the crate QR inside the frame."
                    );
                  }}
                  className="flex-1 items-center rounded-[18px] bg-[#14325a] py-3"
                >
                  <Text className="text-[14px] font-extrabold text-white">
                    Resume Scan
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setCameraPaused(true);
                    setBannerType("info");
                    setBannerText("Scanner paused. You can use manual entry.");
                  }}
                  className="flex-1 items-center rounded-[18px] bg-[#1e293b] py-3"
                >
                  <Text className="text-[14px] font-extrabold text-white">
                    Pause Scan
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <View className="mt-6">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[20px] font-extrabold text-white">
                Assigned Crates
              </Text>

              <View className="rounded-full bg-[#102544] px-3 py-1.5">
                <Text className="text-[12px] font-bold text-slate-200">
                  {normalizedAssigned.length} items
                </Text>
              </View>
            </View>

            {normalizedAssigned.length === 0 ? (
              <View className="rounded-[24px] border border-slate-800 bg-[#0b172b] p-5">
                <Text className="text-[16px] font-bold text-white">
                  No assigned crates available
                </Text>
                <Text className="mt-2 text-[13px] leading-5 text-slate-400">
                  No valid assigned crates found for the selected date.
                </Text>
              </View>
            ) : (
              <View className="gap-4">
                {normalizedAssigned.map((item) => {
                  const chip = statusStyle(item.status);

                  return (
                    <View
                      key={item.key}
                      className="rounded-[22px] border border-slate-800 bg-[#0b172b] p-4"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-3">
                          <Text className="text-[18px] font-extrabold text-white">
                            {item.scanValue || "-"}
                          </Text>
                          <Text className="mt-1 text-[13px] text-slate-400">
                            Ready to verify and move to transit
                          </Text>
                        </View>

                        <View className={`rounded-full px-3 py-1.5 ${chip.bg}`}>
                          <Text className={`text-[11px] font-extrabold ${chip.text}`}>
                            {chip.label}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-4 gap-3">
                        <InfoRow
                          icon="location-outline"
                          label="Destination"
                          value={item.destination || "-"}
                        />
                        <InfoRow
                          icon="person-outline"
                          label="Driver"
                          value={item.driverName || "-"}
                        />
                        <InfoRow
                          icon="car-outline"
                          label="Vehicle"
                          value={item.vehicleNo || "-"}
                        />
                        <InfoRow
                          icon="id-card-outline"
                          label="Operator ID"
                          value={item.operatorId || "-"}
                        />
                      </View>

                      <Pressable
                        onPress={() => handleScan(item.scanValue)}
                        disabled={scanLoading || !item.scanValue}
                        className={`mt-5 items-center rounded-[18px] py-3 ${
                          scanLoading || !item.scanValue
                            ? "bg-[#334155]"
                            : "bg-[#204a8f]"
                        }`}
                      >
                        <Text className="text-[15px] font-extrabold text-white">
                          {scanLoading ? "Processing..." : "Scan This Crate"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start rounded-[16px] bg-[#102544] px-3 py-3">
      <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-[#14325a]">
        <Ionicons name={icon} size={16} color="#60a5fa" />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </Text>
        <Text className="mt-1 text-[14px] font-semibold text-white">
          {value}
        </Text>
      </View>
    </View>
  );
}