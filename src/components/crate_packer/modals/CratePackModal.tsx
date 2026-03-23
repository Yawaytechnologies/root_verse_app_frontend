// src/components/crate_packer/modals/CratePackModal.tsx
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { fetchFilledFishDetails } from "../../../services/cratePacker/filledFishApi";

type FishGrade = "A" | "B" | "C" | "D";

type FishRow = {
  qr_id: number | null;
  fishQr: string;
  fish_code: string;
  species: string;
  weight_kg: number;
  qc_grade: FishGrade | null;
  catch_date: string | null;
  landed_date: string | null;
  method_code: string | null;
};

type Mode = "EDIT" | "VIEW";

type Props = {
  visible: boolean;
  crateQr: string;
  mode?: Mode;
  initialPayload?: any | null;
  onCancel: () => void;
  onSubmit: (payload: any) => void | Promise<void>;
  submitLoading?: boolean;
  submitError?: string | null;
  fishToCrateMap?: Record<string, string>;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatDate(dt: Date) {
  return `${pad2(dt.getDate())}-${pad2(dt.getMonth() + 1)}-${dt.getFullYear()}`;
}
function formatTime(dt: Date) {
  const h24 = dt.getHours();
  const h12 = h24 % 12 || 12;
  const ampm = h24 >= 12 ? "PM" : "AM";
  return `${pad2(h12)}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())} ${ampm}`;
}
function fmtDMYFromISO(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return formatDate(d);
}
function normCode(raw: string) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}
function toFishGrade(v: any): FishGrade | null {
  const s = String(v || "").trim().toUpperCase();
  if (s === "A" || s === "B" || s === "C" || s === "D") return s as FishGrade;
  return null;
}
function toPosInt(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ====== QR frame overlay ====== */
const FRAME = 220;
const CORNER = 24;
const THICK = 5;
const BLUE = "rgba(46,125,255,0.95)";

function CornerBrackets() {
  return (
    <View style={{ width: FRAME, height: FRAME }}>
      {/* TL */}
      <View style={{ position: "absolute", left: 0, top: 0, width: CORNER, height: THICK, borderRadius: 999, backgroundColor: BLUE }} />
      <View style={{ position: "absolute", left: 0, top: 0, width: THICK, height: CORNER, borderRadius: 999, backgroundColor: BLUE }} />
      {/* TR */}
      <View style={{ position: "absolute", right: 0, top: 0, width: CORNER, height: THICK, borderRadius: 999, backgroundColor: BLUE }} />
      <View style={{ position: "absolute", right: 0, top: 0, width: THICK, height: CORNER, borderRadius: 999, backgroundColor: BLUE }} />
      {/* BL */}
      <View style={{ position: "absolute", left: 0, bottom: 0, width: CORNER, height: THICK, borderRadius: 999, backgroundColor: BLUE }} />
      <View style={{ position: "absolute", left: 0, bottom: 0, width: THICK, height: CORNER, borderRadius: 999, backgroundColor: BLUE }} />
      {/* BR */}
      <View style={{ position: "absolute", right: 0, bottom: 0, width: CORNER, height: THICK, borderRadius: 999, backgroundColor: BLUE }} />
      <View style={{ position: "absolute", right: 0, bottom: 0, width: THICK, height: CORNER, borderRadius: 999, backgroundColor: BLUE }} />
    </View>
  );
}

/** Labels */
const LABEL_STYLE = {
  color: "rgba(255,255,255,0.65)",
  fontWeight: "900" as const,
  fontSize: 11,
};

function CompactBox({
  value,
  scrollX = false,
  center = false,
}: {
  value: string;
  scrollX?: boolean;
  center?: boolean;
}) {
  return (
    <View
      style={{
        marginTop: 6,
        height: 34,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(0,0,0,0.35)",
        paddingHorizontal: 12,
        justifyContent: "center",
        alignItems: center ? "center" : "flex-start",
      }}
    >
      {scrollX ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: "center" }}>
          <Text selectable style={{ color: "white", fontWeight: "800", fontSize: 12, lineHeight: 14 }}>
            {value}
          </Text>
        </ScrollView>
      ) : (
        <Text selectable style={{ color: "white", fontWeight: "800", fontSize: 12, lineHeight: 14 }} numberOfLines={1} ellipsizeMode="tail">
          {value}
        </Text>
      )}
    </View>
  );
}

function GradeSelectField({
  value,
  onPress,
  disabled,
}: {
  value: FishGrade | "";
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        marginTop: 6,
        height: 36,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(0,0,0,0.35)",
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>{value || "Select"}</Text>
      <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.85)" />
    </Pressable>
  );
}

function safeItems(payload: any): any[] {
  return Array.isArray(payload?.items) ? payload.items : [];
}

export default function CratePackModal({
  visible,
  crateQr,
  mode = "EDIT",
  initialPayload = null,
  onCancel,
  onSubmit,
  submitLoading = false,
  submitError,
  fishToCrateMap = {},
}: Props) {
  const isView = mode === "VIEW";
  const uiDisabled = submitLoading || isView;

  const crateId = useMemo(
    () => toPosInt(initialPayload?.crate_id ?? initialPayload?.crateId),
    [initialPayload]
  );

  const [capturedDate, setCapturedDate] = useState("");
  const [capturedTime, setCapturedTime] = useState("");

  const [rows, setRows] = useState<FishRow[]>([]);
  const [fishManual, setFishManual] = useState("");

  const [crateGrade, setCrateGrade] = useState<FishGrade | "">("");
  const [gradePickerOpen, setGradePickerOpen] = useState(false);

  const [cameraPerm, requestCameraPerm] = useCameraPermissions();

  const scanPausedUntilRef = useRef(0);
  const busyRef = useRef(false);

  const scanLineY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || isView) {
      scanLineY.stopAnimation();
      scanLineY.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(scanLineY, { toValue: 0, duration: 1300, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, isView, scanLineY]);

  const scanTranslateY = useMemo(() => {
    const travel = FRAME - 45;
    return scanLineY.interpolate({ inputRange: [0, 1], outputRange: [0, travel] });
  }, [scanLineY]);

  useEffect(() => {
    if (!visible) return;

    if (isView && initialPayload) {
      const packedAtRaw = initialPayload?.packed_at || initialPayload?.packedAt;
      const dt = packedAtRaw ? new Date(packedAtRaw) : new Date();

      setCapturedDate(formatDate(dt));
      setCapturedTime(formatTime(dt));

      const g = String(
        initialPayload?.crate_grade ??
          initialPayload?.crateGrade ??
          initialPayload?.grade ??
          ""
      )
        .trim()
        .toUpperCase();

      setCrateGrade(
        g === "A" || g === "B" || g === "C" || g === "D"
          ? (g as FishGrade)
          : ""
      );

      const items = safeItems(initialPayload);
      const nextRows: FishRow[] = items.map((it: any) => {
        const fishQr = normCode(
          it?.fish_qr ?? it?.fishQr ?? it?.fish_code ?? it?.fishCode ?? ""
        );
        const fish_code = String(
          (it?.fish_code ??
            it?.fishCode ??
            it?.fish_qr ??
            it?.fishQr ??
            fishQr) || "-"
        );
        const species = String(it?.species ?? it?.speciesName ?? "-");
        const weight_kg = Number(it?.weight_kg ?? it?.weightKg ?? 0) || 0;
        const qc_grade = toFishGrade(
          it?.qc_grade ?? it?.qcGrade ?? it?.grade ?? null
        );

        const catch_date = it?.catch_date ? String(it.catch_date) : null;
        const landed_date = it?.landed_date ? String(it.landed_date) : null;
        const method_code = it?.method_code ? String(it.method_code) : null;

        const qr_id = Number(it?.qr_id ?? it?.qrId ?? it?.id ?? NaN);
        const qr_id_safe = Number.isFinite(qr_id) && qr_id > 0 ? qr_id : null;

        return {
          qr_id: qr_id_safe,
          fishQr: fishQr || normCode(fish_code),
          fish_code,
          species,
          weight_kg,
          qc_grade,
          catch_date,
          landed_date,
          method_code,
        };
      });

      setRows(nextRows);
      setFishManual("");
      setGradePickerOpen(false);
      scanPausedUntilRef.current = 0;
      busyRef.current = false;
      return;
    }

    const now = new Date();
    setCapturedDate(formatDate(now));
    setCapturedTime(formatTime(now));

    setRows([]);
    setFishManual("");
    setCrateGrade("");
    setGradePickerOpen(false);
    scanPausedUntilRef.current = 0;
    busyRef.current = false;
  }, [visible, crateQr, isView, initialPayload]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (gradePickerOpen) {
        setGradePickerOpen(false);
        return true;
      }
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [visible, onCancel, gradePickerOpen]);

  const totalWeight = useMemo(() => {
    if (isView && initialPayload) {
      const v = Number(
        initialPayload?.total_weight_kg ??
          initialPayload?.totalWeightKg ??
          initialPayload?.total_weight ??
          initialPayload?.weight ??
          NaN
      );
      if (Number.isFinite(v)) return Number(v.toFixed(2));
    }
    const sum = rows.reduce((acc, r) => acc + (Number(r.weight_kg) || 0), 0);
    return Number(sum.toFixed(2));
  }, [rows, isView, initialPayload]);

  const addFish = async (fishQrRaw: string) => {
    if (isView) return;

    const fishQr = normCode(fishQrRaw);
    if (!fishQr) return;
    if (submitLoading) return;

    if (rows.some((r) => normCode(r.fishQr) === fishQr)) {
      Alert.alert(
        "Duplicate",
        "This fish tag is already added."
      );
      return;
    }

    const existingCrate = fishToCrateMap[fishQr];
    if (existingCrate && normCode(existingCrate) !== normCode(crateQr)) {
      Alert.alert(
        "Already Submitted",
        `This fish has already been submitted in crate ${existingCrate}.`
      );
      return;
    }

    if (busyRef.current) return;
    busyRef.current = true;

    try {
      const info: any = await fetchFilledFishDetails(fishQr);
      const qc = toFishGrade(info.grade);

      const qrIdNum = Number(info.qrId ?? info.qr_id ?? info.id ?? NaN);
      const qr_id = Number.isFinite(qrIdNum) && qrIdNum > 0 ? qrIdNum : null;

      setRows((prev) => [
        ...prev,
        {
          qr_id,
          fishQr,
          fish_code: info.fishQrCode || fishQr,
          species: info.speciesName || "-",
          weight_kg: Number(info.weightKg || 0),
          qc_grade: qc,
          catch_date: info.catchDateISO ?? null,
          landed_date: info.landedDateISO ?? null,
          method_code: info.methodCode ?? null,
        },
      ]);
    } finally {
      busyRef.current = false;
    }
  };

  const removeRow = (fishQr: string) => {
    if (isView) return;
    setRows((p) => p.filter((x) => x.fishQr !== fishQr));
  };

  const validation = useMemo(() => {
    if (isView) return { ok: true, msg: "" };
    if (!crateQr) {
      return { ok: false, msg: "Crate QR missing" };
    }
    if (!crateId) {
      return {
        ok: false,
        msg: "Crate ID missing. Re-scan crate.",
      };
    }
    if (!rows.length) {
      return {
        ok: false,
        msg: "Scan at least one fish tag",
      };
    }
    if (!crateGrade) {
      return {
        ok: false,
        msg: "Select crate grade (A/B/C/D)",
      };
    }
    return { ok: true, msg: "" };
  }, [crateQr, crateId, rows.length, crateGrade, isView]);

  const buildPayload = () => {
    const crate_qr = normCode(crateQr);

    return {
      crate_id: crateId,
      crate_qr,
      crate_grade: crateGrade,
      total_weight_kg: totalWeight,
      packed_at: new Date().toISOString(),
      grade: crateGrade,
      total_weight: totalWeight,
      status: "CLOSED",
      items: rows.map((r) => ({
        qr_id: r.qr_id,
        fish_qr: r.fishQr,
        fish_code: r.fish_code,
        species: r.species,
        weight_kg: r.weight_kg,
        qc_grade: r.qc_grade,
        catch_date: r.catch_date,
        landed_date: r.landed_date,
        method_code: r.method_code,
      })),
    };
  };

  const cameraKey = useMemo(() => {
    return `fishcam_${visible ? 1 : 0}_${normCode(crateQr)}_${cameraPerm?.granted ? 1 : 0}`;
  }, [visible, crateQr, cameraPerm?.granted]);

  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 99999,
        elevation: 99999,
        backgroundColor: "rgba(0,0,0,0.60)",
        padding: 16,
        justifyContent: "center",
      }}
    >
      <View
        style={{
          borderRadius: 24,
          backgroundColor: "#0b1630",
          height: "90%",
          overflow: "hidden",
        }}
      >
        {/* HEADER */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.10)",
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>
                  Crate Packing
                </Text>

                {isView ? (
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 999,
                      backgroundColor: "rgba(251,191,36,0.18)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.10)",
                    }}
                  >
                    <Text
                      style={{
                        color: "rgba(251,191,36,0.95)",
                        fontWeight: "900",
                        fontSize: 12,
                      }}
                    >
                      ALREADY SUBMITTED
                    </Text>
                  </View>
                ) : null}
              </View>

              <View
                style={{
                  marginTop: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <Ionicons name="qr-code-outline" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "900" }}>
                  QR:
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, minWidth: 0 }}>
                  <Text selectable style={{ color: "white", fontWeight: "900", fontSize: 14 }}>
                    {normCode(crateQr) || "—"}
                  </Text>
                </ScrollView>
              </View>

              {!validation.ok && (
                <Text style={{ marginTop: 8, color: "#fca5a5", fontWeight: "900" }}>
                  {validation.msg}
                </Text>
              )}

              {!isView ? (
                <Text
                  style={{
                    marginTop: 6,
                    color: "rgba(255,255,255,0.55)",
                    fontWeight: "900",
                    fontSize: 11,
                  }}
                >
                  Crate ID: {crateId ? String(crateId) : "—"}
                </Text>
              ) : null}
            </View>

            <View style={{ alignItems: "flex-end", gap: 8 }}>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: "rgba(255,255,255,0.70)", fontWeight: "900" }}>
                  {capturedDate || "-"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "900" }}>
                  {capturedTime || "-"}
                </Text>
              </View>

              <Pressable
                onPress={onCancel}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.10)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={20} color="white" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* BODY */}
        <View style={{ flex: 1 }}>
          {/* CAMERA SECTION */}
          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            <Text style={{ color: "rgba(255,255,255,0.70)", fontWeight: "900", fontSize: 13 }}>
              Scan Fish Tags
            </Text>

            {isView ? (
              <View
                style={{
                  marginTop: 8,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  padding: 14,
                }}
              >
                <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "900" }}>
                  Read-only: fish scan disabled
                </Text>
              </View>
            ) : !cameraPerm ? (
              <View
                style={{
                  marginTop: 8,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  padding: 14,
                }}
              >
                <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "900" }}>
                  Requesting camera…
                </Text>
              </View>
            ) : !cameraPerm.granted ? (
              <View
                style={{
                  marginTop: 8,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  padding: 14,
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>
                  Camera permission required
                </Text>
                <Pressable
                  onPress={requestCameraPerm}
                  style={{
                    marginTop: 10,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(96,165,250,0.35)",
                    backgroundColor: "rgba(59,130,246,0.15)",
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "900" }}>
                    Allow Camera
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View
                style={{
                  marginTop: 8,
                  alignSelf: "center",
                  width: FRAME + 28,
                  height: FRAME + 28,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(0,0,0,0.35)",
                  overflow: Platform.OS === "ios" ? "hidden" : "visible",
                }}
                renderToHardwareTextureAndroid
                collapsable={false}
              >
                <CameraView
                  key={cameraKey}
                  style={{ width: "100%", height: "100%" }}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={async (e: any) => {
                    const now = Date.now();
                    if (now < scanPausedUntilRef.current) return;

                    const code = normCode(e?.data);
                    if (!code) return;

                    scanPausedUntilRef.current = now + 900;

                    try {
                      await addFish(code);
                    } catch (err: any) {
                      Alert.alert(
                        "Fish scan failed",
                        String(err?.message || err || "Failed")
                      );
                    }
                  }}
                />

                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View style={{ width: FRAME, height: FRAME }}>
                    <CornerBrackets />
                    <Animated.View
                      style={{
                        position: "absolute",
                        left: 12,
                        right: 12,
                        top: 16,
                        height: 2,
                        borderRadius: 999,
                        backgroundColor: BLUE,
                        transform: [{ translateY: scanTranslateY }],
                        zIndex: 999,
                        elevation: 999,
                      }}
                    />
                    <View
                      style={{
                        position: "absolute",
                        left: 8,
                        right: 8,
                        top: 8,
                        bottom: 8,
                        borderRadius: 18,
                        backgroundColor: "rgba(0,0,0,0.10)",
                      }}
                    />
                  </View>

                  <Text
                    style={{
                      marginTop: 8,
                      color: "rgba(255,255,255,0.85)",
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    Align Fish QR inside the box
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* SCROLL SECTION */}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 14, flexGrow: 1 }}>
            {/* Manual Fish Add */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "rgba(255,255,255,0.70)", fontWeight: "900", fontSize: 13 }}>
                  Manual Fish QR
                </Text>
                <TextInput
                  value={fishManual}
                  onChangeText={setFishManual}
                  placeholder="e.g. IN-NA-WC-HL-001855"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!uiDisabled}
                  style={{
                    marginTop: 8,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    color: "white",
                    fontWeight: "900",
                    opacity: uiDisabled ? 0.6 : 1,
                  }}
                />
              </View>

              <View style={{ width: 120, justifyContent: "flex-end" }}>
                <Pressable
                  disabled={uiDisabled}
                  onPress={async () => {
                    const code = normCode(fishManual);
                    if (!code) {
                      Alert.alert(
                        "Missing",
                        "Enter fish QR"
                      );
                      return;
                    }
                    setFishManual("");
                    try {
                      await addFish(code);
                    } catch (e: any) {
                      Alert.alert(
                        "Add failed",
                        String(e?.message || e || "Failed")
                      );
                    }
                  }}
                  style={{
                    marginTop: 8,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(96,165,250,0.35)",
                    backgroundColor: "rgba(59,130,246,0.15)",
                    paddingVertical: 12,
                    alignItems: "center",
                    opacity: uiDisabled ? 0.5 : 1,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "900" }}>
                    Add
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Rows */}
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "900" }}>
                Scanned Fish ({rows.length})
              </Text>

              {!rows.length ? (
                <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.55)", fontWeight: "900" }}>
                  No fish scanned yet.
                </Text>
              ) : (
                <View style={{ marginTop: 10, gap: 12 }}>
                  {rows.map((r) => (
                    <View
                      key={`${r.fishQr}_${r.qr_id ?? "x"}`}
                      style={{
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.10)",
                        backgroundColor: "rgba(255,255,255,0.05)",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderBottomWidth: 1,
                          borderBottomColor: "rgba(255,255,255,0.10)",
                        }}
                      >
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, marginRight: 10 }}>
                          <Text selectable style={{ color: "white", fontWeight: "900" }}>
                            {r.fish_code}
                          </Text>
                        </ScrollView>

                        <Pressable
                          disabled={uiDisabled}
                          onPress={() => removeRow(r.fishQr)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 16,
                            backgroundColor: "rgba(255,255,255,0.10)",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: uiDisabled ? 0.4 : 1,
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color="white" />
                        </Pressable>
                      </View>

                      <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={LABEL_STYLE}>Species</Text>
                          </View>
                          <View style={{ width: 74 }}>
                            <Text style={[LABEL_STYLE, { textAlign: "center" }]}>
                              Grade
                            </Text>
                          </View>
                          <View style={{ width: 78 }}>
                            <Text style={[LABEL_STYLE, { textAlign: "center" }]}>Kg</Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: "row", gap: 10, paddingBottom: 10 }}>
                          <View style={{ flex: 1 }}>
                            <CompactBox value={r.species} scrollX />
                          </View>
                          <View style={{ width: 74 }}>
                            <CompactBox value={r.qc_grade ?? "-"} center />
                          </View>
                          <View style={{ width: 78 }}>
                            <CompactBox value={String(r.weight_kg)} center />
                          </View>
                        </View>

                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={LABEL_STYLE}>Catch Date</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={LABEL_STYLE}>Landed Date</Text>
                          </View>
                          <View style={{ width: 90 }}>
                            <Text style={LABEL_STYLE}>Method</Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: "row", gap: 10, paddingBottom: 12 }}>
                          <View style={{ flex: 1 }}>
                            <CompactBox value={fmtDMYFromISO(r.catch_date)} center />
                          </View>
                          <View style={{ flex: 1 }}>
                            <CompactBox value={fmtDMYFromISO(r.landed_date)} center />
                          </View>
                          <View style={{ width: 90 }}>
                            <CompactBox value={r.method_code || "-"} center />
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-end" }}>
                <View style={{ flex: 1 }}>
                  <Text style={LABEL_STYLE}>Crate Grade</Text>
                  <GradeSelectField
                    value={crateGrade}
                    disabled={uiDisabled}
                    onPress={() => {
                      if (uiDisabled) return;
                      setGradePickerOpen(true);
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={LABEL_STYLE}>Total (kg)</Text>
                  <View
                    style={{
                      marginTop: 6,
                      height: 36,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.10)",
                      backgroundColor: "rgba(0,0,0,0.35)",
                      paddingHorizontal: 12,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "900", fontSize: 13 }}>
                      {String(totalWeight)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.55)", fontWeight: "900", fontSize: 11 }}>
                Only A / B / C / D allowed
              </Text>
            </View>

            {!!submitError && !isView ? (
              <Text style={{ color: "#f87171", marginTop: 12 }}>{submitError}</Text>
            ) : null}

            <View style={{ height: 18 }} />
          </ScrollView>
        </View>

        {/* FOOTER */}
        <View
          style={{
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.10)",
            flexDirection: "row",
            gap: 12,
          }}
        >
          <Pressable
            onPress={onCancel}
            style={{
              flex: 1,
              backgroundColor: "rgba(255,255,255,0.10)",
              padding: 16,
              borderRadius: 16,
            }}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>
              Close
            </Text>
          </Pressable>

          {!isView ? (
            <Pressable
              disabled={!validation.ok || submitLoading}
              onPress={() => onSubmit(buildPayload())}
              style={{
                flex: 1,
                padding: 16,
                borderRadius: 16,
                backgroundColor:
                  !validation.ok || submitLoading
                    ? "rgba(59,130,246,0.15)"
                    : "rgba(59,130,246,0.30)",
                opacity: !validation.ok || submitLoading ? 0.65 : 1,
              }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>
                {submitLoading ? "Submitting…" : "Submit"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Grade picker overlay */}
        {!isView && gradePickerOpen ? (
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 999999, elevation: 999999 }}>
            <Pressable onPress={() => setGradePickerOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} />
            <View style={{ position: "absolute", left: 16, right: 16, bottom: 92 }}>
              <View
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(6,12,26,0.98)",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(255,255,255,0.10)",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "900" }}>
                    Select Crate Grade
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.60)",
                      fontWeight: "900",
                      marginTop: 4,
                      fontSize: 12,
                    }}
                  >
                    Only A / B / C / D
                  </Text>
                </View>

                {(["A", "B", "C", "D"] as FishGrade[]).map((g) => {
                  const active = g === crateGrade;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => {
                        setCrateGrade(g);
                        setGradePickerOpen(false);
                      }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderBottomWidth: g === "D" ? 0 : 1,
                        borderBottomColor: "rgba(255,255,255,0.08)",
                        backgroundColor: active ? "rgba(46,125,255,0.18)" : "transparent",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text style={{ color: "white", fontWeight: "900" }}>{g}</Text>
                      {active ? <Ionicons name="checkmark" size={18} color="white" /> : null}
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => setGradePickerOpen(false)}
                style={{
                  marginTop: 10,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}