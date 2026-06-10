import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  getCultureCyclesByUser,
  getQrByCode,
  type CultureCycle,
  type QrRecord,
} from "../../../src/services/aqua/harvest.service";
import { useAppSelector } from "../../../src/store/hooks";

function clean(value: any) {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

function pickText(...values: any[]) {
  for (const value of values) {
    const text = clean(value);

    if (
      text &&
      text !== "0" &&
      text !== "undefined" &&
      text !== "null"
    ) {
      return text;
    }
  }

  return "";
}

function pickNumberText(...values: any[]) {
  for (const value of values) {
    const text = clean(value);

    if (
      text &&
      text !== "0" &&
      text !== "undefined" &&
      text !== "null" &&
      Number.isFinite(Number(text))
    ) {
      return text;
    }
  }

  return "";
}

function getLoggedInUserId(state: any) {
  const me =
    state?.me?.me ||
    state?.auth?.user ||
    state?.auth?.me ||
    state?.user?.user ||
    state?.user?.me ||
    state?.aquaAuth?.user ||
    null;

  return pickNumberText(
    me?.user_id,
    me?.id,
    me?.owner_id,
    me?.farmer_id,
    me?.farmerId,
  );
}

async function getUserIdFromStorage() {
  const keys = ["user", "auth_user", "login_user", "me", "authUser"];

  for (const key of keys) {
    const raw = await AsyncStorage.getItem(key);

    if (!raw) continue;

    try {
      const user = JSON.parse(raw);

      const id = pickNumberText(
        user?.user_id,
        user?.id,
        user?.owner_id,
        user?.farmer_id,
        user?.farmerId,
      );

      if (id) return id;
    } catch {
      // ignore invalid storage value
    }
  }

  return "";
}

function getQrCodeText(qr: QrRecord | null, scannedCode: string) {
  return pickText(
    qr?.qrs_code,
    qr?.qrsCode,
    qr?.qr_code,
    qr?.qrCode,
    qr?.code,
    scannedCode,
  );
}

function getFarmId(source: any) {
  const farm = source?.farm || source?.farmDetails || source?.linked_farm || null;

  return pickNumberText(
    source?.farm_id,
    source?.farmId,
    farm?.id,
    farm?.farm_id,
    farm?.farmId,
  );
}

function getPondId(source: any) {
  const pond = source?.pond || source?.pondDetails || source?.linked_pond || null;

  return pickNumberText(
    source?.pond_id,
    source?.pondId,
    pond?.id,
    pond?.pond_id,
    pond?.pondId,
  );
}

function getCultureId(cycle: CultureCycle | null) {
  return pickNumberText(
    cycle?.culture_id,
    cycle?.cultureId,
    cycle?.culture_cycle_id,
    cycle?.cultureCycleId,
    cycle?.id,
  );
}

function getQrCodeId(qr: QrRecord | null, cycle: CultureCycle | null) {
  return pickNumberText(
    qr?.id,
    qr?.qr_code_id,
    qr?.qrcode_id,
    qr?.qrCodeId,
    qr?.qrcodeId,
    cycle?.qr_code_id,
    cycle?.qrcode_id,
    cycle?.qrCodeId,
    cycle?.qrcodeId,
    cycle?.qrs_id,
    cycle?.qrsId,
  );
}

function getStockingDate(cycle: CultureCycle | null) {
  return pickText(
    cycle?.stocking_date,
    cycle?.stockingDate,
    cycle?.stocked_date,
    cycle?.stockedDate,
    cycle?.start_date,
    cycle?.startDate,
  );
}

function getDoc(cycle: CultureCycle | null) {
  const directDoc = pickNumberText(
    cycle?.DOC,
    cycle?.doc,
    cycle?.days_of_culture,
    cycle?.daysOfCulture,
    cycle?.culture_doc,
    cycle?.cultureDoc,
  );

  if (directDoc) return directDoc;

  const stockingDate = getStockingDate(cycle);

  if (!stockingDate) return "";

  const stocked = new Date(stockingDate);
  const today = new Date();

  if (Number.isNaN(stocked.getTime())) return "";

  const diffMs = today.getTime() - stocked.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays >= 0 ? String(diffDays) : "";
}

function getSpecies(cycle: CultureCycle | null) {
  return pickText(
    cycle?.species,
    cycle?.species_name,
    cycle?.speciesName,
    cycle?.fish_name,
    cycle?.fishName,
    cycle?.fish_type,
    cycle?.fishType,
    "Vannamei",
  );
}

function isActiveCulture(cycle: CultureCycle) {
  const status = clean(
    cycle?.status ||
      cycle?.cycle_status ||
      cycle?.culture_status ||
      cycle?.verification_status,
  ).toUpperCase();

  return (
    cycle?.is_active === true ||
    cycle?.isActive === true ||
    status === "ACTIVE" ||
    status === "RUNNING" ||
    status === "STOCKED" ||
    status === "APPROVED" ||
    !status
  );
}

function findMatchingCultureCycle(
  cycles: CultureCycle[],
  qr: QrRecord,
): CultureCycle | null {
  const qrId = pickNumberText(qr?.id);
  const qrFarmId = getFarmId(qr);
  const qrPondId = getPondId(qr);

  const activeCycles = cycles.filter(isActiveCulture);

  console.log("ACTIVE CULTURE CYCLES:", JSON.stringify(activeCycles, null, 2));

  const byQrId = activeCycles.find((cycle) => {
    const cycleQrId = pickNumberText(
      cycle?.qr_code_id,
      cycle?.qrcode_id,
      cycle?.qrCodeId,
      cycle?.qrcodeId,
      cycle?.qrs_id,
      cycle?.qrsId,
    );

    return qrId && cycleQrId && qrId === cycleQrId;
  });

  if (byQrId) return byQrId;

  const byFarmAndPond = activeCycles.find((cycle) => {
    const cycleFarmId = getFarmId(cycle);
    const cyclePondId = getPondId(cycle);

    return (
      qrFarmId &&
      qrPondId &&
      cycleFarmId &&
      cyclePondId &&
      qrFarmId === cycleFarmId &&
      qrPondId === cyclePondId
    );
  });

  if (byFarmAndPond) return byFarmAndPond;

  const byPondOnly = activeCycles.find((cycle) => {
    const cyclePondId = getPondId(cycle);
    return qrPondId && cyclePondId && qrPondId === cyclePondId;
  });

  if (byPondOnly) return byPondOnly;

  return null;
}

export default function HarvestPondQrScannerScreen() {
  const reduxUserId = useAppSelector((state: any) => getLoggedInUserId(state));

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera Permission Required</Text>
        <Text style={styles.text}>
          Camera access is needed to scan Pond QR and create harvest request.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Allow Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleBarcodeScanned(result: { data: string }) {
    if (scanned || loading) return;

    const scannedCode = clean(result.data);

    if (!scannedCode) {
      Alert.alert("Invalid QR", "QR code is empty.");
      return;
    }

    try {
      setScanned(true);
      setLoading(true);

      const userId = reduxUserId || (await getUserIdFromStorage());

      if (!userId) {
        Alert.alert("Failed", "User ID not found. Please login again.", [
          {
            text: "OK",
            onPress: () => {
              setScanned(false);
              setLoading(false);
            },
          },
        ]);
        return;
      }

      console.log("SCANNED QR CODE:", scannedCode);
      console.log("LOGGED USER ID:", userId);

      const qrResponse = await getQrByCode(scannedCode);

      console.log("QR RESPONSE:", JSON.stringify(qrResponse, null, 2));

      if (!qrResponse.ok || !qrResponse.data) {
        Alert.alert("Failed", qrResponse.message || "QR code not found.", [
          {
            text: "OK",
            onPress: () => {
              setScanned(false);
              setLoading(false);
            },
          },
        ]);
        return;
      }

      const qrRecord = qrResponse.data;

      const cyclesResponse = await getCultureCyclesByUser(userId);

      console.log(
        "CULTURE CYCLES RESPONSE:",
        JSON.stringify(cyclesResponse, null, 2),
      );

      if (!cyclesResponse.ok) {
        Alert.alert(
          "Failed",
          cyclesResponse.message || "Unable to fetch culture cycle.",
          [
            {
              text: "OK",
              onPress: () => {
                setScanned(false);
                setLoading(false);
              },
            },
          ],
        );
        return;
      }

      const cultureCycle = findMatchingCultureCycle(
        cyclesResponse.data || [],
        qrRecord,
      );

      console.log("MATCHED CULTURE CYCLE:", JSON.stringify(cultureCycle, null, 2));

      if (!cultureCycle) {
        Alert.alert(
          "Failed",
          "No active culture cycle found for this scanned pond QR.",
          [
            {
              text: "OK",
              onPress: () => {
                setScanned(false);
                setLoading(false);
              },
            },
          ],
        );
        return;
      }

      const cultureId = getCultureId(cultureCycle);
      const qrCodeId = getQrCodeId(qrRecord, cultureCycle);
      const doc = getDoc(cultureCycle);
      const stockingDate = getStockingDate(cultureCycle);
      const species = getSpecies(cultureCycle);
      const qrCode = getQrCodeText(qrRecord, scannedCode);

      const farmId = getFarmId(qrRecord) || getFarmId(cultureCycle);
      const pondId = getPondId(qrRecord) || getPondId(cultureCycle);

      console.log("FINAL HARVEST SCAN DATA:", {
        cultureId,
        qrCodeId,
        doc,
        stockingDate,
        species,
        qrCode,
        farmId,
        pondId,
      });

      if (!cultureId || !qrCodeId) {
        Alert.alert("Failed", "Required data missing. Need culture_id and qr_code_id.", [
          {
            text: "OK",
            onPress: () => {
              setScanned(false);
              setLoading(false);
            },
          },
        ]);
        return;
      }

      router.push({
        pathname: "/(aqua)/harvest/create-request",
        params: {
          userId: String(userId),

          cultureId: String(cultureId),
          culture_id: String(cultureId),

          qrCodeId: String(qrCodeId),
          qr_code_id: String(qrCodeId),

          DOC: String(doc || ""),
          doc: String(doc || ""),

          stockingDate: String(stockingDate || ""),
          stocking_date: String(stockingDate || ""),

          species: String(species || "Vannamei"),

          qrCode: String(qrCode || scannedCode),
          qr_code: String(qrCode || scannedCode),

          farmId: String(farmId || ""),
          farm_id: String(farmId || ""),

          pondId: String(pondId || ""),
          pond_id: String(pondId || ""),
        },
      });
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.message || "Unable to fetch QR linked details.",
        [
          {
            text: "OK",
            onPress: () => {
              setScanned(false);
              setLoading(false);
            },
          },
        ],
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBack}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.routeTitle}>Harvest QR Scan</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Scan Pond QR</Text>
        <Text style={styles.subtitle}>
          Scan the pond QR to get QR ID and active culture cycle details.
        </Text>
      </View>

      <View style={styles.cameraBox}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />

        <View style={styles.scanFrame} />

        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Fetching QR and culture cycle...</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            setScanned(false);
            setLoading(false);
          }}
        >
          <Text style={styles.secondaryButtonText}>Scan Again</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  center: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  topBack: {
    paddingTop: 58,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
  },
  backIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  routeTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
  },
  header: {
    paddingTop: 90,
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 17,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 24,
  },
  text: {
    fontSize: 15,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 10,
  },
  cameraBox: {
    height: 410,
    marginHorizontal: 22,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  camera: {
    flex: 1,
  },
  scanFrame: {
    position: "absolute",
    alignSelf: "center",
    top: "28%",
    width: 245,
    height: 245,
    borderWidth: 3,
    borderColor: "#16A34A",
    borderRadius: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  footer: {
    padding: 22,
    gap: 14,
  },
  primaryButton: {
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    marginTop: 20,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    paddingHorizontal: 22,
  },
  cancelButtonText: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
  },
});