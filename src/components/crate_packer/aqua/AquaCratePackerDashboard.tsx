// src/components/crate_packer/aqua/AquaCratePackerDashboard.tsx
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import CratePackerTabs, { type CrateTabKey } from "../CratePackerTabs";
import { useAppDispatch } from "../../../store/hooks";
import { logout as logoutThunk } from "../../../store/auth/login.slice";

import {
  listAquaHarvestPackedCrates,
  scanAquaPondForCratePacking,
  submitAquaCratePacking,
  type AquaCrateInput,
  type AquaCratePackingScanData,
  type AquaPackedCrate,
} from "../../../services/cratePacker/aquaCratePackingApi";

const BG = "#030712";
const HEADER_BG = "#071228";
const BORDER = "rgba(255,255,255,0.12)";
const SURFACE = "rgba(255,255,255,0.06)";
const FIELD_BG = "rgba(0,0,0,0.35)";
const BLUE = "#3b82f6";

type ScanTarget = "POND" | "CRATE";

function normCode(raw: any) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

function toPosNumber(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function pickFirst(...vals: any[]) {
  return vals.find(
    (v) => v !== undefined && v !== null && String(v).trim() !== ""
  );
}

function cleanText(v: any) {
  const s = String(v ?? "").trim();

  if (!s || s.toLowerCase() === "undefined" || s.toLowerCase() === "null") {
    return "";
  }

  return s;
}

function fmtKg(v: any) {
  const n = Number(v);

  if (!Number.isFinite(n)) {
    return "0 kg";
  }

  return `${Number(n.toFixed(2))} kg`;
}

function packedDateKey(value?: string) {
  if (!value) return "UNKNOWN";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "UNKNOWN";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function packedDateLabel(key: string) {
  if (!key || key === "UNKNOWN") return "Unknown date";

  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return key;

  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SmallLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: "rgba(255,255,255,0.62)",
        fontWeight: "900",
        fontSize: 11,
      }}
    >
      {children}
    </Text>
  );
}

function InfoBox({ label, value }: { label: string; value: any }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 130,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: "rgba(0,0,0,0.22)",
        padding: 10,
      }}
    >
      <SmallLabel>{label}</SmallLabel>

      <Text
        selectable
        style={{
          color: "white",
          fontWeight: "900",
          marginTop: 5,
          fontSize: 12,
        }}
        numberOfLines={2}
      >
        {cleanText(value) || "-"}
      </Text>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: any;
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={{
        height: 46,
        borderRadius: 15,
        backgroundColor: disabled ? "rgba(59,130,246,0.25)" : BLUE,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        opacity: disabled || loading ? 0.7 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : icon ? (
        <Ionicons name={icon} size={17} color="white" />
      ) : null}

      <Text style={{ color: "white", fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function GhostButton({
  label,
  onPress,
  active,
  icon,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  icon?: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        height: 40,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "rgba(59,130,246,0.8)" : BORDER,
        backgroundColor: active
          ? "rgba(59,130,246,0.22)"
          : "rgba(255,255,255,0.06)",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 7,
      }}
    >
      {icon ? <Ionicons name={icon} size={15} color="white" /> : null}

      <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.35)"
      autoCapitalize="characters"
      autoCorrect={false}
      keyboardType={keyboardType || "default"}
      style={{
        marginTop: 8,
        height: 44,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: FIELD_BG,
        color: "white",
        paddingHorizontal: 12,
        fontWeight: "900",
      }}
    />
  );
}

export default function AquaCratePackerDashboard({
  meOverride,
}: {
  meOverride: any;
}) {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  const me = meOverride || {};

  const packerId = toPosNumber(me?.id);

  const packerName = cleanText(
    pickFirst(
      me?.packer_name,
      me?.name,
      me?.username,
      me?.full_name,
      "Crate Packer"
    )
  );

  const packerCode = cleanText(
    pickFirst(me?.code, me?.packer_code, me?.crate_packer_code, "")
  );

  const [cameraPerm, requestCameraPerm] = useCameraPermissions();

  const scanLockRef = useRef(false);

  const [tab, setTab] = useState<CrateTabKey>("SCAN");
  const [scanTarget, setScanTarget] = useState<ScanTarget>("POND");

  const [pondQrInput, setPondQrInput] = useState("");
  const [scanData, setScanData] = useState<AquaCratePackingScanData | null>(
    null
  );

  const [crateQrInput, setCrateQrInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [gradeInput, setGradeInput] = useState("A");

  const [pendingCrates, setPendingCrates] = useState<AquaCrateInput[]>([]);
  const [packedCrates, setPackedCrates] = useState<AquaPackedCrate[]>([]);

  const [scanLoading, setScanLoading] = useState(false);
  const [packedLoading, setPackedLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPendingWeight = useMemo(() => {
    return Number(
      pendingCrates
        .reduce((sum, c) => sum + Number(c.weight || 0), 0)
        .toFixed(2)
    );
  }, [pendingCrates]);

  // Only use crates that belong to the currently selected Harvest ID.
  const packedForCurrentHarvest = useMemo(() => {
    if (!scanData?.harvest_id) return [];

    return packedCrates.filter((c) => {
      // The harvest crates API is already scoped by harvest ID.
      // Keep rows with no harvest_id too, because some backend responses omit it.
      if (c.harvest_id === undefined || c.harvest_id === null) return true;
      return Number(c.harvest_id) === Number(scanData.harvest_id);
    });
  }, [packedCrates, scanData?.harvest_id]);

  // Date-wise total packed weight for the current Harvest ID.
  const dateWisePackedTotals = useMemo(() => {
    const grouped = new Map<
      string,
      { dateKey: string; totalWeight: number; crateCount: number }
    >();

    for (const crate of packedForCurrentHarvest) {
      const dateKey = packedDateKey(crate.packed_at);
      const current = grouped.get(dateKey) || {
        dateKey,
        totalWeight: 0,
        crateCount: 0,
      };

      current.totalWeight += Number(crate.weight_kg || 0);
      current.crateCount += 1;
      grouped.set(dateKey, current);
    }

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        totalWeight: Number(item.totalWeight.toFixed(2)),
      }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [packedForCurrentHarvest]);

  const alreadyPackedQrSet = useMemo(() => {
    const set = new Set<string>();

    packedCrates.forEach((c) => {
      const code = normCode(c.crate_qr);

      if (code) {
        set.add(code);
      }
    });

    return set;
  }, [packedCrates]);

  async function reloadPacked(harvestId?: number) {
    const hid = harvestId || scanData?.harvest_id;

    if (!hid) {
      return;
    }

    setPackedLoading(true);

    try {
      const list = await listAquaHarvestPackedCrates(hid);
      setPackedCrates(list);
    } catch (e: any) {
      setError(String(e?.message || "Unable to fetch packed crates"));
    } finally {
      setPackedLoading(false);
    }
  }

  async function scanPond(pondQrRaw: string) {
    const pondQr = normCode(pondQrRaw);

    if (!pondQr) {
      Alert.alert("Missing pond QR", "Please scan or enter pond QR.");
      return;
    }

    setScanLoading(true);
    setError(null);

    try {
      const data = await scanAquaPondForCratePacking({
        pondQr,
        cratePackerId: packerId,
        cratePackerCode: packerCode || undefined,
      });

      setScanData(data);
      setPondQrInput(data.pond_qr || pondQr);
      setPackedCrates(data.crates || []);
      setPendingCrates([]);
      setCrateQrInput("");
      setWeightInput("");
      setGradeInput(data.grade || "A");
      setScanTarget("CRATE");

      await reloadPacked(data.harvest_id);
    } catch (e: any) {
      const msg = String(e?.message || "Pond scan failed");
      setError(msg);
      Alert.alert("Scan failed", msg);
    } finally {
      setScanLoading(false);
    }
  }

  function addCrate() {
    const crateQr = normCode(crateQrInput);
    const weight = Number(weightInput);
    const grade = String(gradeInput || "").trim().toUpperCase();

    if (!scanData?.harvest_id) {
      Alert.alert(
        "Scan pond first",
        "Pond QR scan is required before adding crates."
      );
      return;
    }

    if (!crateQr) {
      Alert.alert("Missing crate QR", "Please scan or enter crate QR.");
      return;
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      Alert.alert("Invalid weight", "Please enter valid crate weight.");
      return;
    }

    if (pendingCrates.some((c) => normCode(c.crate_qr) === crateQr)) {
      Alert.alert("Duplicate", "This crate is already added in pending list.");
      return;
    }

    if (alreadyPackedQrSet.has(crateQr)) {
      Alert.alert(
        "Already packed",
        "This crate is already packed for this harvest."
      );
      return;
    }

    setPendingCrates((prev) => [
      ...prev,
      {
        crate_qr: crateQr,
        weight: Number(weight.toFixed(2)),
        grade: grade || undefined,
      },
    ]);

    setCrateQrInput("");
    setWeightInput("");
  }

  function removePendingCrate(crateQr: string) {
    const code = normCode(crateQr);

    setPendingCrates((prev) =>
      prev.filter((c) => normCode(c.crate_qr) !== code)
    );
  }

  async function submitCrates() {
    if (!scanData?.harvest_id) {
      Alert.alert("Scan pond first", "Pond QR scan is required.");
      return;
    }

    if (!pendingCrates.length) {
      Alert.alert("No crates", "Add at least one crate.");
      return;
    }

    setSubmitLoading(true);
    setError(null);

    try {
      const result = await submitAquaCratePacking({
        pondQr: scanData.pond_qr || pondQrInput,
        harvestId: scanData.harvest_id,
        cratePackerId: packerId,
        crates: pendingCrates,
      });

      await reloadPacked(scanData.harvest_id);

      setPendingCrates([]);
      setCrateQrInput("");
      setWeightInput("");
      setTab("PACKED");

      Alert.alert("Success", result.message || "Crates packed successfully.");
    } catch (e: any) {
      const msg = String(e?.message || "Submit failed");
      setError(msg);
      Alert.alert("Submit failed", msg);
    } finally {
      setSubmitLoading(false);
    }
  }

  function onCameraScan(raw: any) {
    const code = normCode(raw);

    if (!code || scanLockRef.current) {
      return;
    }

    scanLockRef.current = true;

    setTimeout(() => {
      scanLockRef.current = false;
    }, 1400);

    if (scanTarget === "POND") {
      scanPond(code);
      return;
    }

    setCrateQrInput(code);
  }

  async function onLogout() {
    await dispatch(logoutThunk()).unwrap().catch(() => {});
    router.replace("/(auth)/login");
  }

  const bottomPad = 64 + Math.max(insets.bottom, 10) + 12;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
      <View
        style={{
          paddingTop: Platform.OS === "android" ? Math.max(insets.top, 2) : 2,
          paddingHorizontal: 12,
          paddingBottom: 10,
          backgroundColor: HEADER_BG,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.06)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 15,
              backgroundColor: "rgba(59,130,246,0.18)",
              borderWidth: 1,
              borderColor: BLUE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="water-outline" size={22} color="white" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: "white", fontSize: 18, fontWeight: "900" }}>
              Aqua Crate Packer
            </Text>

            <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 3 }}>
              {packerName} {packerCode ? `(${packerCode})` : ""}
            </Text>
          </View>

          <Pressable
            onPress={onLogout}
            style={{
              paddingHorizontal: 10,
              height: 36,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: BORDER,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
            }}
          >
            <Ionicons name="log-out-outline" size={16} color="white" />

            <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>
              Logout
            </Text>
          </Pressable>
        </View>
      </View>

      <CratePackerTabs tab={tab} onChange={setTab} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
      >
        {error ? (
          <View
            style={{
              marginBottom: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(248,113,113,0.35)",
              backgroundColor: "rgba(248,113,113,0.12)",
              padding: 12,
            }}
          >
            <Text style={{ color: "#fecaca", fontWeight: "900" }}>
              {error}
            </Text>
          </View>
        ) : null}

        {tab === "SCAN" ? (
          <>
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: BORDER,
                backgroundColor: SURFACE,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <GhostButton
                  label="Pond QR"
                  icon="water-outline"
                  active={scanTarget === "POND"}
                  onPress={() => setScanTarget("POND")}
                />

                <GhostButton
                  label="Crate QR"
                  icon="cube-outline"
                  active={scanTarget === "CRATE"}
                  onPress={() => setScanTarget("CRATE")}
                />
              </View>

              {!cameraPerm ? (
                <Text style={{ color: "white" }}>
                  Requesting camera permission...
                </Text>
              ) : !cameraPerm.granted ? (
                <PrimaryButton
                  label="Allow Camera"
                  icon="camera-outline"
                  onPress={requestCameraPerm}
                />
              ) : (
                <View
                  style={{
                    height: 260,
                    borderRadius: 18,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: BORDER,
                    backgroundColor: "black",
                  }}
                >
                  <CameraView
                    style={{ width: "100%", height: "100%" }}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={(e: any) => onCameraScan(e?.data)}
                  />

                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 12,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        borderRadius: 999,
                        backgroundColor: "rgba(0,0,0,0.65)",
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontWeight: "900",
                          fontSize: 12,
                        }}
                      >
                        Scanning{" "}
                        {scanTarget === "POND" ? "pond QR" : "crate QR"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View
              style={{
                marginTop: 12,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: BORDER,
                backgroundColor: SURFACE,
                padding: 12,
              }}
            >
              <SmallLabel>Enter Pond QR manually</SmallLabel>

              <Input
                value={pondQrInput}
                onChangeText={setPondQrInput}
                placeholder="IN-TN-NA-P-2600001"
              />

              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  label="Fetch Harvest Prefill"
                  icon="search-outline"
                  loading={scanLoading}
                  onPress={() => scanPond(pondQrInput)}
                />
              </View>
            </View>

            {scanData ? (
              <View
                style={{
                  marginTop: 12,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: BORDER,
                  backgroundColor: SURFACE,
                  padding: 12,
                }}
              >
                <Text
                  style={{ color: "white", fontWeight: "900", fontSize: 16 }}
                >
                  Harvest Prefill
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  <InfoBox label="Pond QR" value={scanData.pond_qr} />
                  <InfoBox label="Harvest ID" value={scanData.harvest_id} />
                  <InfoBox
  label="Farmer Name"
  value={scanData.farmer_name || "-"}
/>
                  <InfoBox
                    label="Pond"
                    value={scanData.pond_name || scanData.pond_code}
                  />
                  <InfoBox
                    label="Farm"
                    value={scanData.farm_name || scanData.farm_code}
                  />
                  <InfoBox label="Species" value={scanData.species} />
                  <InfoBox
                    label="Size Count/kg"
                    value={scanData.size_count_kg}
                  />
                  
                  <InfoBox
                    label="ABW (g)"
                    value={
                      scanData.abw_g !== null &&
                      scanData.abw_g !== undefined
                        ? `${scanData.abw_g} g`
                        : "-"
                    }
                  />
                  <InfoBox label="Grade" value={scanData.grade} />
                  <InfoBox
                    label="Trader"
                    value={scanData.trader_name || scanData.trader_code}
                  />
                </View>
              </View>
            ) : null}

            {scanData ? (
              <View
                style={{
                  marginTop: 12,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: BORDER,
                  backgroundColor: SURFACE,
                  padding: 12,
                }}
              >
                <Text
                  style={{ color: "white", fontWeight: "900", fontSize: 16 }}
                >
                  Add Aqua Crates
                </Text>

                <View style={{ marginTop: 12 }}>
                  <SmallLabel>Crate QR</SmallLabel>

                  <Input
                    value={crateQrInput}
                    onChangeText={setCrateQrInput}
                    placeholder="IN-TN-A-260654568"
                  />
                </View>

                <View style={{ marginTop: 12 }}>
                  <SmallLabel>Weight kg</SmallLabel>

                  <Input
                    value={weightInput}
                    onChangeText={setWeightInput}
                    placeholder="18.75"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={{ marginTop: 12 }}>
                  <SmallLabel>Grade</SmallLabel>

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    {["A", "B", "C", "D"].map((g) => (
                      <GhostButton
                        key={g}
                        label={g}
                        active={gradeInput === g}
                        onPress={() => setGradeInput(g)}
                      />
                    ))}
                  </View>
                </View>

                <View style={{ marginTop: 14 }}>
                  <PrimaryButton
                    label="Add Crate"
                    icon="add-circle-outline"
                    onPress={addCrate}
                  />
                </View>

                {pendingCrates.length ? (
                  <View style={{ marginTop: 14 }}>
                    <Text style={{ color: "white", fontWeight: "900" }}>
                      Pending Crates: {pendingCrates.length} | Total:{" "}
                      {fmtKg(totalPendingWeight)}
                    </Text>

                    {pendingCrates.map((c) => (
                      <View
                        key={c.crate_qr}
                        style={{
                          marginTop: 10,
                          borderRadius: 15,
                          borderWidth: 1,
                          borderColor: BORDER,
                          backgroundColor: "rgba(0,0,0,0.25)",
                          padding: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "white", fontWeight: "900" }}>
                            {c.crate_qr}
                          </Text>

                          <Text
                            style={{
                              color: "rgba(255,255,255,0.7)",
                              marginTop: 4,
                            }}
                          >
                            {fmtKg(c.weight)} | Grade: {c.grade || "-"}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => removePendingCrate(c.crate_qr)}
                          hitSlop={10}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color="#fca5a5"
                          />
                        </Pressable>
                      </View>
                    ))}

                    <View style={{ marginTop: 14 }}>
                      <PrimaryButton
                        label="Submit Crate Packing"
                        icon="cloud-upload-outline"
                        loading={submitLoading}
                        onPress={submitCrates}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <View
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: BORDER,
              backgroundColor: SURFACE,
              padding: 12,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: "white", fontWeight: "900", fontSize: 18 }}
                >
                  Packed Aqua Crates
                </Text>

                <Text
                  style={{ color: "rgba(255,255,255,0.65)", marginTop: 4 }}
                >
                  {scanData?.harvest_id
                    ? `Harvest ID: ${scanData.harvest_id}`
                    : "Scan pond QR first to view packed crates."}
                </Text>
              </View>

              <GhostButton
                label="Refresh"
                icon="refresh-outline"
                onPress={() => reloadPacked()}
              />
            </View>

            {scanData?.harvest_id ? (
              <View style={{ marginTop: 14 }}>
                {dateWisePackedTotals.length ? (
                  dateWisePackedTotals.map((item) => (
                    <View
                      key={`${scanData.harvest_id}_${item.dateKey}`}
                      style={{
                        marginBottom: 10,
                        borderRadius: 15,
                        borderWidth: 1,
                        borderColor: BORDER,
                        backgroundColor: "rgba(59,130,246,0.10)",
                        padding: 12,
                      }}
                    >
                      <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>
                        Harvest ID: {scanData.harvest_id}
                      </Text>

                      <Text
                        style={{
                          color: "rgba(255,255,255,0.72)",
                          marginTop: 6,
                          fontWeight: "800",
                        }}
                      >
                        Date: {packedDateLabel(item.dateKey)}
                      </Text>

                      <Text
                        style={{
                          color: "#93c5fd",
                          marginTop: 6,
                          fontWeight: "900",
                          fontSize: 16,
                        }}
                      >
                        Total Packed Weight: {fmtKg(item.totalWeight)}
                      </Text>

                      <Text
                        style={{
                          color: "rgba(255,255,255,0.62)",
                          marginTop: 4,
                          fontWeight: "800",
                        }}
                      >
                        Total Crates: {item.crateCount}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View
                    style={{
                      borderRadius: 15,
                      borderWidth: 1,
                      borderColor: BORDER,
                      backgroundColor: "rgba(59,130,246,0.10)",
                      padding: 12,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "900" }}>
                      Harvest ID: {scanData.harvest_id}
                    </Text>
                    <Text style={{ color: "#93c5fd", marginTop: 6, fontWeight: "900" }}>
                      Total Packed Weight: 0 kg
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {packedLoading ? (
              <View
                style={{
                  marginTop: 16,
                  flexDirection: "row",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <ActivityIndicator />

                <Text style={{ color: "white", fontWeight: "900" }}>
                  Loading...
                </Text>
              </View>
            ) : !packedCrates.length ? (
              <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 16 }}>
                No packed crates found.
              </Text>
            ) : (
              <View style={{ marginTop: 12 }}>
                {packedCrates.map((c, idx) => (
                  <View
                    key={`${c.id || idx}_${c.crate_qr}`}
                    style={{
                      marginBottom: 10,
                      borderRadius: 15,
                      borderWidth: 1,
                      borderColor: BORDER,
                      backgroundColor: "rgba(0,0,0,0.25)",
                      padding: 12,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "900" }}>
                      {c.crate_qr || "-"}
                    </Text>

                    <Text
                      style={{
                        color: "rgba(255,255,255,0.72)",
                        marginTop: 5,
                      }}
                    >
                      Weight: {fmtKg(c.weight_kg)} | Grade: {c.grade || "-"}
                    </Text>

                    <Text
                      style={{
                        color: "rgba(255,255,255,0.72)",
                        marginTop: 5,
                      }}
                    >
                      Status: {c.packing_status || "-"}
                    </Text>

                    <Text
                      style={{
                        color: "rgba(255,255,255,0.55)",
                        marginTop: 5,
                      }}
                    >
                      Packed:{" "}
                      {c.packed_at
                        ? new Date(c.packed_at).toLocaleString()
                        : "-"}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}