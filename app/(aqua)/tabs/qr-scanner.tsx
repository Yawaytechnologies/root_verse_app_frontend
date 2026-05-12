import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { API_BASE } from "../../../src/config/env";

const TOKEN_KEY = "auth_token";

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value)
    ? String(value[0] ?? fallback)
    : String(value ?? fallback);

function apiUrl(path: string) {
  const base = String(API_BASE || "").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

async function getJson(path: string) {
  const token = await AsyncStorage.getItem(TOKEN_KEY);

  const response = await fetch(apiUrl(path), {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.detail || "Request failed");
  }

  return data;
}

async function fetchQrByCode(code: string) {
  const encoded = encodeURIComponent(code);

  const paths = [
    `/api/aquaculture/qrs/code/${encoded}`,
    `/api/aquaculture/qrs/${encoded}`,
    `/api/qrs/code/${encoded}`,
  ];

  let lastError: any = null;

  for (const path of paths) {
    try {
      const data = await getJson(path);

      if (data?.data !== undefined) return data.data;
      if (data?.qr !== undefined) return data.qr;
      if (data?.result !== undefined) return data.result;

      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("QR not found");
}

function extractArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.ponds)) return data.ponds;
  if (Array.isArray(data?.farms)) return data.farms;
  if (Array.isArray(data?.culture_cycles)) return data.culture_cycles;
  if (Array.isArray(data?.cultureCycles)) return data.cultureCycles;
  return [];
}

function pickName(...values: any[]) {
  const found = values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "",
  );

  return found ? String(found) : "";
}

function pickId(...values: any[]) {
  const found = values.find((value) => {
    if (value === undefined || value === null) return false;

    const text = String(value).trim();

    return (
      text !== "" &&
      text !== "0" &&
      text !== "undefined" &&
      text !== "null"
    );
  });

  return found ? String(found) : "";
}

function sameId(a: any, b: any) {
  if (a === undefined || a === null || b === undefined || b === null) {
    return false;
  }

  return String(a) === String(b);
}

function isQrActivated(qr: any) {
  const status = String(qr?.status || qr?.activation_status || "")
    .trim()
    .toUpperCase();

  return (
    qr?.is_active === true ||
    qr?.is_activated === true ||
    qr?.qr_activated === true ||
    status === "ACTIVE" ||
    status === "ACTIVATED" ||
    status === "LINKED"
  );
}

function isPondActivated(pond: any) {
  const status = String(
    pickName(
      pond?.qr_status,
      pond?.pond_qr_status,
      pond?.activation_status,
      pond?.pond_status,
      pond?.status,
      pond?.verification_status,
    ),
  )
    .trim()
    .toUpperCase();

  return (
    status === "ACTIVE" ||
    status === "ACTIVATED" ||
    status === "VERIFIED" ||
    pond?.is_active === true ||
    pond?.is_activated === true ||
    pond?.qr_activated === true ||
    pond?.pond_qr_activated === true ||
    !!pickName(
      pond?.pond_qr_id,
      pond?.pond_qr_code,
      pond?.qr_code,
      pond?.qr_value,
    )
  );
}

export default function QrScannerScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { t } = useTranslation();

  const tr = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback });

  const purpose = getParamValue(params.purpose, "TRACEABILITY");

  const farmDbId =
    getParamValue(params.farmDbId) || getParamValue(params.farmId);
  const pondDbId =
    getParamValue(params.pondDbId) || getParamValue(params.pondId);
  const userId = getParamValue(params.userId) || getParamValue(params.farmerId);
  const cultureCycleId = getParamValue(params.cultureCycleId);

  const farmName = getParamValue(params.farmName, "Farm");
  const pondName = getParamValue(params.pondName, "Pond");

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [message, setMessage] = useState(tr("qrActivation.scanQr", "Scan QR"));
  const [processing, setProcessing] = useState(false);

  const lockRef = useRef(false);

  useEffect(() => {
    lockRef.current = false;
    setScanned(false);
  }, [purpose]);

  const goBackDashboard = () => {
    router.replace("/(aqua)/tabs/dashboard");
  };

  const openTraceability = (qrValue: string) => {
    router.push({
      pathname: "/(aqua)/traceability/[code]",
      params: {
        code: qrValue,
        qrValue,
        scannedValue: qrValue,
      },
    } as any);
  };

  const openStockingForm = async (qrValue: string, qrData: any) => {
    try {
      setProcessing(true);
      setMessage(tr("stocking.validatingPondQr", "Validating Pond QR..."));

      const qrType = String(qrData?.qr_type || qrData?.type || "").toUpperCase();

      if (qrType && qrType !== "POND") {
        Alert.alert(
          tr("qrActivation.wrongQr", "Wrong QR"),
          tr("stocking.scanPondQrOnly", "Please scan Pond QR only."),
        );
        setScanned(false);
        lockRef.current = false;
        return;
      }

      const pondsRes = await getJson("/api/ponds").catch(() => null);
      const ponds = extractArray<any>(pondsRes);

      const linkedPondId = pickId(qrData?.pond_id, pondDbId);

      const pond =
        ponds.find((p) => sameId(p.id, linkedPondId)) ||
        ponds.find((p) =>
          [
            p.pond_qr_id,
            p.pond_qr_code,
            p.qr_code,
            p.qr_value,
            p.pond_id,
            p.pond_code,
          ]
            .map((v) => String(v || "").trim())
            .includes(qrValue),
        );

      const finalPondId = pickId(pond?.id, qrData?.pond_id, pondDbId);
      const finalFarmId = pickId(pond?.farm_id, qrData?.farm_id, farmDbId);

      if (!finalPondId) {
        Alert.alert(
          tr("common.failed", "Failed"),
          tr(
            "stocking.pondNotFoundForQr",
            "Could not find pond linked to this QR.",
          ),
        );
        setScanned(false);
        lockRef.current = false;
        return;
      }

      const qrLooksActivated = isQrActivated(qrData);
      const pondLooksActivated = pond ? isPondActivated(pond) : true;

      if (!qrLooksActivated && !pondLooksActivated) {
        Alert.alert(
          tr("qrActivation.qrNotActivated", "QR Not Activated"),
          tr(
            "stocking.pondQrActivationRequired",
            "Pond QR must be activated before stocking entry.",
          ),
        );
        setScanned(false);
        lockRef.current = false;
        return;
      }

      let finalCultureCycleId = cultureCycleId;

      if (!finalCultureCycleId && userId) {
        try {
          const cyclesRes = await getJson(
            `/api/aquaculture/culture-cycles/user/${userId}`,
          );

          const cycles = extractArray<any>(cyclesRes);

          const linkedCycle =
            cycles.find((cycle) => sameId(cycle.pond_id, finalPondId)) ||
            cycles.find((cycle) => sameId(cycle.farm_id, finalFarmId));

          finalCultureCycleId = pickId(linkedCycle?.id);
        } catch {
          finalCultureCycleId = "";
        }
      }

      if (!finalCultureCycleId) {
        Alert.alert(
          tr("common.failed", "Failed"),
          tr(
            "stocking.cultureCycleRequired",
            "Culture cycle is required before stocking entry.",
          ),
        );
        setScanned(false);
        lockRef.current = false;
        return;
      }

      router.push({
        pathname: "/(aqua)/stocking/add",
        params: {
          farmerId: userId,
          userId,
          farmId: finalFarmId,
          farmDbId: finalFarmId,
          pondId: finalPondId,
          pondDbId: finalPondId,
          cultureCycleId: finalCultureCycleId,
          qrcodeId: pickId(qrData?.id, qrData?.qrcode_id, qrData?.qr_id),
          pondQr: qrValue,
          qrValue,
          code: qrValue,
          farmName,
          pondName: pickName(pond?.pond_name, pond?.name, pondName),
        },
      } as any);
    } catch (error: any) {
      Alert.alert(
        tr("common.failed", "Failed"),
        error?.message ||
          tr("stocking.qrValidationFailed", "QR validation failed"),
      );
      setScanned(false);
      lockRef.current = false;
    } finally {
      setProcessing(false);
    }
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    const qrValue = String(data || "").trim();

    if (!qrValue || lockRef.current || scanned) return;

    lockRef.current = true;
    setScanned(true);
    setProcessing(true);
    setMessage(tr("qrActivation.checkingQr", "Checking QR..."));

    try {
      if (purpose === "FARM_ACTIVATION") {
        router.push({
          pathname: "/(aqua)/registration/capture-farm-gate",
          params: {
            ...params,
            code: qrValue,
            qrValue,
            scannedValue: qrValue,
          },
        } as any);
        return;
      }

      if (purpose === "POND_ACTIVATION") {
        router.push({
          pathname: "/(aqua)/registration/capture-pond-image",
          params: {
            ...params,
            code: qrValue,
            qrValue,
            scannedValue: qrValue,
          },
        } as any);
        return;
      }

      if (purpose === "STOCKING_ENTRY") {
        let qrData: any = null;

        try {
          qrData = await fetchQrByCode(qrValue);
        } catch {
          qrData = {
            id: getParamValue(params.qrcodeId),
            type: "POND",
            status: "ACTIVATED",
            pond_id: pondDbId,
            farm_id: farmDbId,
          };
        }

        await openStockingForm(qrValue, qrData);
        return;
      }

      openTraceability(qrValue);
    } catch (error: any) {
      Alert.alert(
        tr("qrActivation.invalidQr", "Invalid QR"),
        error?.message || tr("qrActivation.qrNotFound", "QR not found."),
      );
      setScanned(false);
      lockRef.current = false;
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#60A5FA" size="large" />
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
        <Ionicons name="camera-outline" size={46} color="#60A5FA" />

        <Text className="mt-5 text-center text-xl font-bold text-white">
          {tr(
            "qrActivation.cameraPermissionRequired",
            "Camera Permission Required",
          )}
        </Text>

        <Text className="mt-2 text-center text-sm leading-6 text-white/70">
          {tr(
            "qrActivation.cameraPermissionDesc",
            "Camera access is required to scan QR.",
          )}
        </Text>

        <Pressable
          onPress={requestPermission}
          className="mt-6 w-full rounded-2xl bg-white px-4 py-4"
        >
          <Text className="text-center font-bold text-slate-900">
            {tr("qrActivation.allowCamera", "Allow Camera")}
          </Text>
        </Pressable>

        <Pressable
          onPress={goBackDashboard}
          className="mt-3 w-full rounded-2xl border border-white/20 px-4 py-4"
        >
          <Text className="text-center font-semibold text-white">
            {tr("common.cancel", "Cancel")}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View
        className="absolute left-0 right-0 top-0 px-4"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="flex-row items-center justify-between rounded-2xl bg-black/55 px-4 py-3">
          <Pressable
            onPress={goBackDashboard}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>

          <View className="flex-1 px-3">
            <Text className="text-center text-base font-bold text-white">
              {purpose === "STOCKING_ENTRY"
                ? tr("stocking.scanPondQr", "Scan Pond QR")
                : tr("qrActivation.title", "QR Scanner")}
            </Text>

            <Text className="mt-1 text-center text-xs text-white/70">
              {purpose === "STOCKING_ENTRY"
                ? tr(
                    "stocking.scanPondQrSub",
                    "Stocking opens only after Pond QR scan",
                  )
                : tr("qrActivation.scanQrSub", "Place QR inside the frame")}
            </Text>
          </View>

          <View className="h-10 w-10" />
        </View>
      </View>

      <View className="absolute inset-0 items-center justify-center">
        <View className="h-64 w-64 rounded-3xl border-4 border-white/80 bg-transparent" />
      </View>

      <View
        className="absolute bottom-0 left-0 right-0 px-5"
        style={{ paddingBottom: insets.bottom + 22 }}
      >
        <View className="rounded-3xl bg-black/70 p-4">
          <View className="flex-row items-center gap-3">
            {processing ? (
              <ActivityIndicator size="small" color="#60A5FA" />
            ) : (
              <Ionicons name="qr-code-outline" size={22} color="#60A5FA" />
            )}

            <Text className="flex-1 text-sm font-semibold text-white">
              {message}
            </Text>
          </View>

          {scanned ? (
            <Pressable
              onPress={() => {
                lockRef.current = false;
                setScanned(false);
                setMessage(tr("qrActivation.scanQr", "Scan QR"));
              }}
              className="mt-4 rounded-2xl border border-white/20 px-4 py-3"
            >
              <Text className="text-center font-bold text-white">
                {tr("qrActivation.scanAgain", "Scan Again")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}