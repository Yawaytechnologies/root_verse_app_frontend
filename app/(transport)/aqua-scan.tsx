import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { router } from "expo-router";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";

import * as Location from "expo-location";

import Screen from "../../src/components/centre/Screen";

import {
  getCurrentTransportOperator,
  type CurrentTransportOperator,
} from "../../src/services/transport/currentTransportOperator.service";

import {
  scanAquaTransportCrate,
  type AquaTransportScanData,
} from "../../src/services/transport/aquaTransportLoading.service";

// ============================================================
// HELPERS
// ============================================================

function firstText(...values: any[]) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "";
}

function display(value: any) {
  return firstText(value) || "-";
}

function formatStatus(value?: string) {
  if (!value) {
    return "-";
  }

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) =>
      c.toUpperCase()
    );
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

// ============================================================
// SCREEN
// ============================================================

export default function AquaTransportScanScreen() {
  const [
    cameraPermission,
    requestCameraPermission,
  ] =
    useCameraPermissions();

  const scanLockRef =
    useRef(false);

  // ==========================================================
  // OPERATOR
  // ==========================================================

  const [
    operator,
    setOperator,
  ] =
    useState<CurrentTransportOperator | null>(
      null
    );

  const [
    operatorLoading,
    setOperatorLoading,
  ] =
    useState(true);

  const [
    operatorError,
    setOperatorError,
  ] =
    useState("");

  // ==========================================================
  // SCAN
  // ==========================================================

  const [
    remarks,
    setRemarks,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    scannerPaused,
    setScannerPaused,
  ] =
    useState(false);

  const [
    scannedQr,
    setScannedQr,
  ] =
    useState("");

  const [
    result,
    setResult,
  ] =
    useState<AquaTransportScanData | null>(
      null
    );

  const [
    error,
    setError,
  ] =
    useState("");

  // ==========================================================
  // GET AUTH ME
  // ==========================================================

  const loadOperator =
    useCallback(async () => {
      try {
        setOperatorLoading(true);

        setOperatorError("");

        const response =
          await getCurrentTransportOperator();

        console.log(
          "AQUA SCAN AUTH ME:",
          JSON.stringify(response, null, 2)
        );

        if (
          !response.ok ||
          !response.data
        ) {
          throw new Error(
            response.message
          );
        }

        setOperator(response.data);
      } catch (error: any) {
        console.log(
          "AQUA SCAN AUTH ME ERROR:",
          error
        );

        setOperatorError(
          error?.message ||
            "Unable to load Transport Operator."
        );
      } finally {
        setOperatorLoading(false);
      }
    }, []);

  useEffect(() => {
    loadOperator();
  }, [loadOperator]);

  // ==========================================================
  // VALUES
  // ==========================================================

  const vehicleNumber =
    firstText(
      operator?.vehicle_no,
      operator?.vehicle_number,
      operator?.vehicleNo
    );

  // ==========================================================
  // GPS
  // ==========================================================

  const getCurrentGps =
    async () => {
      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (
        permission.status !==
        Location.PermissionStatus.GRANTED
      ) {
        throw new Error(
          "Location permission is required."
        );
      }

      const location =
        await Location.getCurrentPositionAsync(
          {
            accuracy:
              Location.Accuracy.Balanced,
          }
        );

      return {
        latitude:
          location.coords.latitude,

        longitude:
          location.coords.longitude,
      };
    };

  // ==========================================================
  // SUBMIT QR
  // ==========================================================

  const submitQr =
    async (
      qrValue: string
    ) => {
      const crateQr =
        String(
          qrValue || ""
        ).trim();

      if (!crateQr) {
        return;
      }

      if (!vehicleNumber) {
        setScannerPaused(true);

        const message =
          "Vehicle number was not returned by /api/auth/me for this Transport Operator.";

        setError(message);

        Alert.alert(
          "Vehicle Not Available",
          message
        );

        return;
      }

      try {
        setLoading(true);

        setScannerPaused(true);

        setError("");

        setResult(null);

        setScannedQr(crateQr);

        // ----------------------------------------------------
        // GPS
        // ----------------------------------------------------

        const gps =
          await getCurrentGps();

        // ----------------------------------------------------
        // AQUA SCAN API
        // ----------------------------------------------------

        const response =
          await scanAquaTransportCrate({
            crate_qr:
              crateQr,

            // AUTOMATIC
            vehicle_number:
              vehicleNumber,

            gps_latitude:
              gps.latitude,

            gps_longitude:
              gps.longitude,

            remarks:
              remarks.trim(),
          });

        console.log(
          "AQUA SCAN RESPONSE:",
          JSON.stringify(response, null, 2)
        );

        if (!response.ok) {
          throw new Error(
            response.message ||
              "Unable to load crate."
          );
        }

        setResult(
          response.data || null
        );

        Alert.alert(
          "Crate Loaded",
          response.message ||
            "Crate loaded successfully."
        );
      } catch (error: any) {
        const message =
          error?.message ||
          "Unable to load crate.";

        setError(message);

        Alert.alert(
          "Loading Failed",
          message
        );
      } finally {
        setLoading(false);

        scanLockRef.current =
          false;
      }
    };

  // ==========================================================
  // CAMERA
  // ==========================================================

  const handleBarcodeScanned =
    async ({
      data,
    }: {
      data: string;
    }) => {
      if (
        !data ||
        loading ||
        scannerPaused ||
        scanLockRef.current
      ) {
        return;
      }

      scanLockRef.current =
        true;

      setScannerPaused(true);

      await submitQr(data);
    };

  // ==========================================================
  // RESET
  // ==========================================================

  const resetScanner = () => {
    setScannerPaused(false);

    setScannedQr("");

    setResult(null);

    setError("");

    setRemarks("");

    scanLockRef.current =
      false;
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <Screen>
      <View className="flex-1 bg-[#031225]">
        {/* HEADER */}

        <View className="flex-row items-center bg-[#071a35] px-5 py-5">
          <Pressable
            onPress={() =>
              router.back()
            }
          >
            <Ionicons
              name="arrow-back-circle-outline"
              size={35}
              color="#ffffff"
            />
          </Pressable>

          <View className="ml-4 flex-1">
            <Text className="text-[24px] font-extrabold text-white">
              Aqua Transport Loading
            </Text>

            <Text className="mt-1 text-[13px] text-slate-400">
              Scan packed crate QR
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 50,
          }}
        >
          {/* OPERATOR */}

          <View className="rounded-[24px] border border-slate-800 bg-[#0b172b] p-5">
            <Text className="text-[18px] font-extrabold text-white">
              Logged-in Transport
            </Text>

            {operatorLoading ? (
              <View className="items-center py-6">
                <ActivityIndicator
                  size="large"
                  color="#3b82f6"
                />
              </View>
            ) : (
              <>
                <InfoRow
                  label="Mobile"
                  value={display(
                    operator?.mobile
                  )}
                />

                <InfoRow
                  label="Vehicle No"
                  value={display(
                    vehicleNumber
                  )}
                />

                <InfoRow
                  label="ID"
                  value={display(
                    operator?.operator_rv_id ||
                      operator?.user_id
                  )}
                />

                

                <InfoRow
                  label="Trader ID"
                  value={display(
                    operator?.trader_id ??
                      operator?.traderId
                  )}
                />
              </>
            )}

            {operatorError ? (
              <View className="mt-4 rounded-[18px] bg-red-950/30 p-4">
                <Text className="text-[12px] leading-5 text-red-300">
                  {operatorError}
                </Text>
              </View>
            ) : null}
          </View>

          {/* REMARKS */}

          <View className="mt-5 rounded-[24px] border border-slate-800 bg-[#0b172b] p-5">
            <Text className="font-extrabold text-white">
              Remarks
            </Text>

            <TextInput
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Optional remarks"
              placeholderTextColor="#64748b"
              multiline
              editable={!loading}
              textAlignVertical="top"
              className="mt-4 min-h-[90px] rounded-[18px] border border-slate-700 bg-[#07101f] p-4 text-white"
            />
          </View>

          {/* SCANNED QR */}

          {scannedQr ? (
            <View className="mt-5 rounded-[18px] bg-[#102544] p-4">
              <Text className="text-[11px] font-bold text-slate-400">
                SCANNED QR
              </Text>

              <Text className="mt-1 font-extrabold text-white">
                {scannedQr}
              </Text>
            </View>
          ) : null}

          {/* CAMERA */}

          <View className="mt-5 overflow-hidden rounded-[28px] border border-slate-800 bg-black">
            <View className="h-[420px]">
              {!cameraPermission ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator
                    size="large"
                    color="#3b82f6"
                  />
                </View>
              ) : !cameraPermission.granted ? (
                <View className="flex-1 items-center justify-center px-6">
                  <Ionicons
                    name="camera-outline"
                    size={48}
                    color="#60a5fa"
                  />

                  <Text className="mt-4 text-center font-bold text-white">
                    Camera permission is required
                  </Text>

                  <Pressable
                    onPress={
                      requestCameraPermission
                    }
                    className="mt-5 rounded-[18px] bg-blue-600 px-6 py-4"
                  >
                    <Text className="font-extrabold text-white">
                      Allow Camera
                    </Text>
                  </Pressable>
                </View>
              ) : !vehicleNumber ? (
                <View className="flex-1 items-center justify-center px-6">
                  <Ionicons
                    name="car-outline"
                    size={50}
                    color="#f59e0b"
                  />

                  <Text className="mt-4 text-center text-[17px] font-extrabold text-amber-300">
                    Vehicle Not Available
                  </Text>

                  <Text className="mt-2 text-center text-[13px] leading-5 text-slate-400">
                    /api/auth/me did not return a vehicle number.
                  </Text>
                </View>
              ) : (
                <>
                  <CameraView
                    style={{
                      flex: 1,
                    }}
                    facing="back"
                    barcodeScannerSettings={{
                      barcodeTypes: [
                        "qr",
                      ],
                    }}
                    onBarcodeScanned={
                      scannerPaused ||
                      loading
                        ? undefined
                        : handleBarcodeScanned
                    }
                  />

                  {/* SCANNER FRAME */}

                  <View className="absolute inset-0">
                    <View className="absolute left-8 right-8 top-[90px] h-[225px] rounded-[28px] border-[4px] border-blue-500" />

                    {!scannerPaused &&
                    !loading ? (
                      <View className="absolute left-12 right-12 top-[200px] h-[3px] bg-blue-400" />
                    ) : null}

                    <View className="absolute bottom-5 left-4 right-4 rounded-[18px] bg-black/70 p-4">
                      <Text className="text-center font-extrabold text-white">
                        {loading
                          ? "Loading crate..."
                          : scannerPaused
                          ? "Scanner paused"
                          : "Align QR inside frame"}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* LOADING */}

          {loading ? (
            <View className="mt-5 items-center rounded-[24px] border border-blue-900 bg-[#0b172b] p-7">
              <ActivityIndicator
                size="large"
                color="#3b82f6"
              />

              <Text className="mt-3 font-extrabold text-white">
                Loading Crate...
              </Text>

              <Text className="mt-2 text-center text-[12px] leading-5 text-slate-400">
                GPS and crate validations are being processed.
              </Text>
            </View>
          ) : null}

          {/* ERROR */}

          {error ? (
            <View className="mt-5 rounded-[24px] border border-red-900 bg-red-950/20 p-5">
              <Text className="text-[14px] font-semibold leading-5 text-red-300">
                {error}
              </Text>

              {!loading &&
              scannerPaused ? (
                <Pressable
                  onPress={
                    resetScanner
                  }
                  className="mt-4 items-center rounded-[18px] bg-blue-600 py-4"
                >
                  <Text className="font-extrabold text-white">
                    Try Scan Again
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* SUCCESS */}

          {result ? (
            <View className="mt-5 rounded-[24px] border border-emerald-800 bg-[#0b172b] p-5">
              <Text className="text-[20px] font-extrabold text-emerald-300">
                Crate Loaded
              </Text>

              <InfoRow
                label="Crate Code"
                value={display(
                  result.crate_code
                )}
              />

              <InfoRow
                label="Harvest ID"
                value={display(
                  result.harvest_id
                )}
              />

              <InfoRow
                label="Trader ID"
                value={display(
                  result.trader_id
                )}
              />

              <InfoRow
                label="Species"
                value={display(
                  result.species
                )}
              />

              <InfoRow
                label="Grade"
                value={display(
                  result.grade
                )}
              />

              <InfoRow
                label="Weight"
                value={
                  result.weight_kg !==
                  undefined
                    ? `${result.weight_kg} kg`
                    : "-"
                }
              />

              <InfoRow
                label="Vehicle"
                value={display(
                  result.vehicle_number ||
                    vehicleNumber
                )}
              />

              <InfoRow
                label="Status"
                value={formatStatus(
                  result.chain_of_custody_status
                )}
              />

              <InfoRow
                label="Loaded At"
                value={formatDateTime(
                  result.loaded_at
                )}
              />

              <Pressable
                onPress={resetScanner}
                className="mt-5 items-center rounded-[18px] bg-[#16b8b2] py-4"
              >
                <Text className="font-extrabold text-white">
                  Scan Next Crate
                </Text>
              </Pressable>

              {result.harvest_id ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname:
                        "/(transport)/aqua-progress",

                      params: {
                        harvestId:
                          String(
                            result.harvest_id
                          ),
                      },
                    })
                  }
                  className="mt-3 items-center rounded-[18px] bg-blue-600 py-4"
                >
                  <Text className="font-extrabold text-white">
                    View Harvest Progress
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Screen>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="mt-3 rounded-[16px] bg-[#102544] p-3">
      <Text className="text-[10px] font-bold uppercase text-slate-400">
        {label}
      </Text>

      <Text className="mt-1 font-extrabold text-white">
        {value}
      </Text>
    </View>
  );
}