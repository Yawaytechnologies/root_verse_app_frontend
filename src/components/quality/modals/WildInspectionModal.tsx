// src/components/quality/modals/WildInspectionModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { captureRef } from "react-native-view-shot";
import { Ionicons } from "@expo/vector-icons";

import {
  ensureFileUri,
  ImageList,
  Input,
  Label,
  ReadOnly,
  TwoCol,
  Select,
} from "./common";

// ✅ QC inspector from auth slice
import { useAppSelector } from "../../../store/hooks";
import { selectInspector as selectQcInspector } from "../../../store/qualityAuth/qualityAuth.slice";

export type QCStatus = "CHECKED" | "HOLD" | "REJECTED";
export type QcResult = "PASS" | "HOLD" | "REJECT";
export type QualityGrade = "A" | "B" | "C";

// ✅ MUST MATCH BACKEND ENUM EXACTLY
export const REJECT_REASONS = [
  "TEMP_ABUSE",
  "SPOILAGE_ODOR",
  "CONTAMINATION",
  "DAMAGED_PACKAGING",
  "MIXED_SPECIES",
  "WRONG_LABEL",
  "UNDER_SIZE",
  "UNKNOWN_ORIGIN",
  "OTHER",
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];

export type WildFormState = {
  qc_status: QCStatus | null;

  qc_result: QcResult | null;
  quality_grade: QualityGrade | null;

  species: string;

  weight_kg: string;
  temperature_c: string;

  size: "SMALL" | "MEDIUM" | "LARGE";
  damage: "NONE" | "MINOR" | "MODERATE" | "SEVERE";

  reject_reason: RejectReason | "";
  remarks: string;

  images: string[];
};

export const wildInitial = (): WildFormState => ({
  qc_status: null,

  qc_result: null,
  quality_grade: null,

  species: "",

  weight_kg: "",
  temperature_c: "",

  size: "MEDIUM",
  damage: "NONE",

  reject_reason: "",
  remarks: "",

  images: [],
});

type Props = {
  visible: boolean;
  scannedCode: string;

  loading?: boolean;
  error?: string | null;
  data?: any;

  form: WildFormState;
  setFormField: <K extends keyof WildFormState>(
    k: K,
    v: WildFormState[K],
  ) => void;

  // parent still passes these; we keep prop compatibility
  onPickImages: () => void;
  onRemoveImage: (uri: string) => void;

  submitLoading: boolean;
  submitError?: string | null;

  onCancel: () => void;
  onSubmit: (payload: any) => void | Promise<void>;

  readOnly: boolean;
};

/* ---------- input rules ---------- */
function sanitize3DigitInt(input: string) {
  return input.replace(/[^\d]/g, "").slice(0, 3);
}

function sanitizeTemp(input: string) {
  let v = input.replace(/[^\d.]/g, "");

  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
  }
  if (v.startsWith(".")) v = "0" + v;

  const [a = "", b = ""] = v.split(".");
  const a2 = a.slice(0, 2);
  const b2 = b.slice(0, 2);

  if (firstDot !== -1) return `${a2}.${b2}`;
  return a2;
}

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

function mapResultToStatus(r: QcResult | null): QCStatus | null {
  if (!r) return null;
  if (r === "PASS") return "CHECKED";
  if (r === "HOLD") return "HOLD";
  return "REJECTED";
}

async function getImageSizeSafe(
  uri: string,
): Promise<{ w: number; h: number }> {
  return await new Promise((resolve) => {
    Image.getSize(
      uri,
      (w, h) => resolve({ w, h }),
      () => resolve({ w: 1080, h: 1080 }),
    );
  });
}

function scaleDown(w: number, h: number, maxSide: number = 1280) {
  const max = Math.max(w, h);
  if (!max || max <= maxSide)
    return { W: Math.round(w || 1080), H: Math.round(h || 1080) };
  const s = maxSide / max;
  return { W: Math.round(w * s), H: Math.round(h * s) };
}

async function captureLiveLocationStamp(extraLine?: string) {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== "granted") throw new Error("Location permission denied");

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) throw new Error("Location services OFF");

  const timeoutMs = 8000;
  const pos = (await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }),
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("Location timeout")), timeoutMs),
    ),
  ])) as Location.LocationObject;

  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const acc = pos.coords.accuracy;

  const now = new Date();
  const dt = `${formatDate(now)} ${formatTime(now)}`;

  const l1 = `Lat: ${lat.toFixed(5)}  Lng: ${lng.toFixed(5)}`;
  const l2 = acc != null ? `Acc: ${Math.round(acc)} m  •  ${dt}` : dt;

  return extraLine ? `${l1}\n${l2}\n${extraLine}` : `${l1}\n${l2}`;
}

const POWERED_LINE = "Powered by Rootverse";

export default function WildInspectionModal(props: Props) {
  const {
    visible,
    scannedCode,
    loading,
    error,
    data,
    form,
    setFormField,
    onRemoveImage,
    submitLoading,
    submitError,
    onCancel,
    onSubmit,
    readOnly,
  } = props;

  const inspector = useAppSelector(selectQcInspector);

  const qcInspectorId =
    String(inspector?.checker_code ?? inspector?.id ?? "").trim() || "-";

  const MAX_IMAGES = 3;
  const speciesAuto = data?.fish_name ?? "";

  const [capturedAtIso, setCapturedAtIso] = useState<string>("");
  const [capturedDate, setCapturedDate] = useState<string>("");
  const [capturedTime, setCapturedTime] = useState<string>("");

  useEffect(() => {
    if (visible) {
      const now = new Date();
      setCapturedAtIso(now.toISOString());
      setCapturedDate(formatDate(now));
      setCapturedTime(formatTime(now));
    }
  }, [visible]);

  const isReject = String(form.qc_result || "").toUpperCase() === "REJECT";

  const validation = useMemo(() => {
    if (readOnly) return { ok: true, msg: "" };

    if (!form.qc_result) return { ok: false, msg: "QC result required" };
    if (!form.quality_grade)
      return { ok: false, msg: "Quality grade required" };

    if (!form.weight_kg) return { ok: false, msg: "Weight required" };
    if (!form.temperature_c) return { ok: false, msg: "Temperature required" };

    if (!form.size) return { ok: false, msg: "Size required" };
    if (!form.damage) return { ok: false, msg: "Damage required" };

    if (isReject && !form.reject_reason)
      return { ok: false, msg: "Reject reason required" };

    return { ok: true, msg: "" };
  }, [form, readOnly, isReject]);

  // ✅ watermark staging
  const watermarkRef = useRef<View | null>(null);
  const wmPromiseRef = useRef<null | { resolve: (u: string) => void }>(null);

  const [wmTask, setWmTask] = useState<null | {
    uri: string;
    text: string;
    W: number;
    H: number;
  }>(null);
  const [wmBusy, setWmBusy] = useState(false);
  const [stageReady, setStageReady] = useState(false);
  const [stageErr, setStageErr] = useState<string | null>(null);

  useEffect(() => {
    if (!wmTask) return;
    if (!stageReady) return;

    let cancelled = false;

    (async () => {
      try {
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        await new Promise((r) => setTimeout(r, 180));

        if (stageErr) {
          if (!cancelled) wmPromiseRef.current?.resolve(wmTask.uri);
          return;
        }

        const outUri = await captureRef(watermarkRef, {
          format: "jpg",
          quality: 0.72,
          result: "tmpfile",
        });

        if (!cancelled) wmPromiseRef.current?.resolve(outUri);
      } catch {
        if (!cancelled) wmPromiseRef.current?.resolve(wmTask.uri);
      } finally {
        wmPromiseRef.current = null;
        setWmTask(null);
        setWmBusy(false);
        setStageReady(false);
        setStageErr(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wmTask, stageReady, stageErr]);

  const watermarkImage = async (uri: string, stampText: string) => {
    const safeUri = await ensureFileUri(uri);

    const { w, h } = await getImageSizeSafe(safeUri);
    const { W, H } = scaleDown(w, h, 960);

    return await new Promise<string>((resolve) => {
      wmPromiseRef.current = { resolve };
      setStageReady(false);
      setStageErr(null);
      setWmTask({ uri: safeUri, text: stampText, W, H });
    });
  };

  const appendImages = (newUris: string[]) => {
    const existing = form.images || [];
    const merged = Array.from(new Set([...existing, ...newUris]));
    setFormField("images", merged.slice(0, MAX_IMAGES));
  };

  const onCaptureImage = async () => {
    if (readOnly || submitLoading || wmBusy) return;

    try {
      if ((form.images?.length || 0) >= MAX_IMAGES) {
        Alert.alert("Limit reached", `Only ${MAX_IMAGES} images allowed`);
        return;
      }

      setWmBusy(true);

      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setWmBusy(false);
        Alert.alert("Permission needed", "Please allow camera permission");
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        quality: 0.75,
        allowsEditing: false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (res.canceled) {
        setWmBusy(false);
        return;
      }

      const uri = res.assets?.[0]?.uri;
      if (!uri) {
        setWmBusy(false);
        return;
      }

      const extra = scannedCode ? `QR: ${String(scannedCode).trim()}` : "";
      const stamp = await captureLiveLocationStamp(extra);

      const watermarked = await watermarkImage(uri, stamp);
      appendImages([watermarked]);
    } catch (e: any) {
      setWmBusy(false);
      Alert.alert("Watermark failed", String(e?.message || e || "Failed"));
    }
  };

  const onPickGalleryStamped = async () => {
    if (readOnly || submitLoading || wmBusy) return;

    try {
      if ((form.images?.length || 0) >= MAX_IMAGES) {
        Alert.alert("Limit reached", `Only ${MAX_IMAGES} images allowed`);
        return;
      }

      setWmBusy(true);

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setWmBusy(false);
        Alert.alert("Permission needed", "Please allow gallery permission");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (res.canceled) {
        setWmBusy(false);
        return;
      }

      const picked = (res.assets || [])
        .map((a) => a.uri)
        .filter(Boolean) as string[];
      if (!picked.length) {
        setWmBusy(false);
        return;
      }

      const remaining = MAX_IMAGES - (form.images?.length || 0);
      const limited = picked.slice(0, Math.max(0, remaining));

      const extra = scannedCode ? `QR: ${String(scannedCode).trim()}` : "";
      const stamp = await captureLiveLocationStamp(extra);

      const out: string[] = [];
      for (const u of limited) {
        const wm = await watermarkImage(u, stamp);
        out.push(wm);
      }

      appendImages(out);
    } catch (e: any) {
      Alert.alert(
        "Gallery watermark failed",
        String(e?.message || e || "Failed"),
      );
    } finally {
      setWmBusy(false);
    }
  };

  const buildPayload = () => {
    const qc_status = mapResultToStatus(form.qc_result);

    const quality_checker_id = inspector?.id ?? null;
    const quality_checker_code = inspector?.checker_code ?? null;
    const quality_checker_name = inspector?.checker_name ?? null;

    return {
      quality_checker_id,
      quality_checker_code,
      quality_checker_name,

      qc_status,
      qc_result: form.qc_result,
      quality_grade: form.quality_grade,

      weight: String(form.weight_kg || "").trim(),
      temperature_c: String(form.temperature_c || "").trim(),

      size: form.size,
      damage: form.damage,
      is_damaged: form.damage !== "NONE",

      reject_reason: isReject ? form.reject_reason || null : null,
      qc_remarks: form.remarks?.trim() || null,

      inspected_at: capturedAtIso || null,
      images: form.images,
      division: "WILD",
    };
  };

  const codeToShow = String(
    scannedCode || data?.fish_code || data?.qr_code || "",
  ).trim();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/60 p-4 justify-center">
        <View className="rounded-3xl bg-[#0b1630] h-[90%] overflow-hidden">
          <View className="px-4 py-4 border-b border-white/10">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-white font-extrabold text-lg">
                  {"Wild Quality Inspection"}
                </Text>

                <View
                  style={{
                    marginTop: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={16}
                    color="rgba(255,255,255,0.7)"
                  />
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      fontWeight: "900",
                    }}
                  >
                    QR:
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flex: 1, minWidth: 0 }}
                    contentContainerStyle={{ paddingRight: 12 }}
                  >
                    <Text
                      selectable
                      style={{
                        color: "white",
                        fontWeight: "900",
                        fontSize: 14,
                        letterSpacing: 0.3,
                      }}
                    >
                      {codeToShow || "—"}
                    </Text>
                  </ScrollView>
                </View>

                {readOnly && (
                  <Text className="mt-2 text-amber-300 font-extrabold">
                    Already submitted (Read-only)
                  </Text>
                )}
                {!readOnly && !validation.ok && (
                  <Text className="mt-2 text-red-300 font-extrabold">
                    {validation.msg}
                  </Text>
                )}
              </View>

              <View className="items-end gap-2">
                <View className="items-end">
                  <Text className="text-white/70 font-extrabold">
                    {capturedDate || "-"}
                  </Text>
                  <Text className="text-white/60 font-extrabold">
                    {capturedTime || "-"}
                  </Text>
                </View>

                <Pressable
                  onPress={onCancel}
                  className="w-10 h-10 rounded-2xl bg-white/10 items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="white" />
                </Pressable>
              </View>
            </View>
          </View>

          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          >
            {loading && <ActivityIndicator />}
            {!!error && <Text className="text-red-400">{error}</Text>}

            <TwoCol>
              <View className="flex-1">
                <Label>Fish Code</Label>
                <ReadOnly value={codeToShow || scannedCode || "—"} />
              </View>
              <View className="flex-1">
                <Label>Species</Label>
                <ReadOnly value={speciesAuto || "-"} />
              </View>
            </TwoCol>

            <TwoCol>
              <View className="flex-1">
                <Label>QC Result</Label>
                <Select<QcResult>
                  value={(form.qc_result || "") as QcResult | ""}
                  onValueChange={(v) => {
                    setFormField("qc_result", v);
                    setFormField("qc_status", mapResultToStatus(v));
                    if (v !== "REJECT") setFormField("reject_reason", "");
                  }}
                  items={["PASS", "HOLD", "REJECT"] as const}
                  disabled={readOnly || submitLoading}
                  placeholder="Select"
                />
              </View>

              <View className="flex-1">
                <Label>Quality Grade</Label>
                <Select<QualityGrade>
                  value={(form.quality_grade || "") as QualityGrade | ""}
                  onValueChange={(v) => setFormField("quality_grade", v)}
                  items={["A", "B", "C"] as const}
                  disabled={readOnly || submitLoading}
                  placeholder="Select"
                />
              </View>
            </TwoCol>

            <TwoCol>
              <View className="flex-1">
                <Label>Weight (kg)</Label>
                <Input
                  value={form.weight_kg}
                  onChangeText={(v) =>
                    setFormField("weight_kg", sanitize3DigitInt(v))
                  }
                  keyboardType="number-pad"
                  maxLength={3}
                  disabled={readOnly || submitLoading}
                  placeholder="Eg: 120"
                />
              </View>

              <View className="flex-1">
                <Label>Temp (°C)</Label>
                <Input
                  value={form.temperature_c}
                  onChangeText={(v) =>
                    setFormField("temperature_c", sanitizeTemp(v))
                  }
                  keyboardType="decimal-pad"
                  disabled={readOnly || submitLoading}
                  placeholder="Eg: 0.2"
                />
              </View>
            </TwoCol>

            <TwoCol>
              <View className="flex-1">
                <Label>Size</Label>
                <Select<"SMALL" | "MEDIUM" | "LARGE">
                  value={(form.size || "") as "SMALL" | "MEDIUM" | "LARGE" | ""}
                  onValueChange={(v) => setFormField("size", v)}
                  items={["SMALL", "MEDIUM", "LARGE"] as const}
                  disabled={readOnly || submitLoading}
                  placeholder="Select"
                />
              </View>

              <View className="flex-1">
                <Label>Damage</Label>
                <Select<"NONE" | "MINOR" | "MODERATE" | "SEVERE">
                  value={
                    (form.damage || "") as
                      | "NONE"
                      | "MINOR"
                      | "MODERATE"
                      | "SEVERE"
                      | ""
                  }
                  onValueChange={(v) => setFormField("damage", v)}
                  items={["NONE", "MINOR", "MODERATE", "SEVERE"] as const}
                  disabled={readOnly || submitLoading}
                  placeholder="Select"
                />
              </View>
            </TwoCol>

            <Label>Reject Reason</Label>
            <Select<RejectReason>
              value={(form.reject_reason || "") as RejectReason | ""}
              onValueChange={(v) => setFormField("reject_reason", v)}
              items={REJECT_REASONS}
              disabled={readOnly || submitLoading || !isReject}
              placeholder={
                isReject ? "Select" : "Only when QC Result = REJECT"
              }
            />

            <Label>Remarks</Label>
            <Input
              value={form.remarks}
              onChangeText={(v) => setFormField("remarks", v)}
              placeholder="Write remarks"
              multiline
              numberOfLines={4}
              disabled={readOnly || submitLoading}
            />

            <TwoCol>
              <View className="flex-1">
                <Label>Capture</Label>
                <Pressable
                  onPress={onCaptureImage}
                  disabled={readOnly || submitLoading || wmBusy}
                  className={[
                    "mt-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3",
                    readOnly || submitLoading || wmBusy
                      ? "opacity-60"
                      : "opacity-100",
                  ].join(" ")}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="camera-outline" size={18} color="white" />
                    <Text className="text-white font-extrabold ml-2">
                      {wmBusy ? "Processing…" : "Capture"}
                    </Text>
                  </View>
                </Pressable>
              </View>

              <View className="flex-1">
                <Label>Gallery</Label>
                <Pressable
                  onPress={onPickGalleryStamped}
                  disabled={readOnly || submitLoading || wmBusy}
                  className={[
                    "mt-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3",
                    readOnly || submitLoading || wmBusy
                      ? "opacity-60"
                      : "opacity-100",
                  ].join(" ")}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="images-outline" size={18} color="white" />
                    <Text className="text-white font-extrabold ml-2">
                      Pick ({form.images.length}/{MAX_IMAGES})
                    </Text>
                  </View>
                </Pressable>
              </View>
            </TwoCol>

            <ImageList
              uris={form.images}
              onRemove={onRemoveImage}
              disabled={readOnly || submitLoading}
            />

            {!!submitError && (
              <Text className="text-red-400 mt-2">{submitError}</Text>
            )}
            <View style={{ height: 24 }} />
          </ScrollView>

          <View className="p-4 border-t border-white/10 flex-row gap-3">
            <Pressable
              onPress={onCancel}
              className="flex-1 bg-white/10 p-4 rounded-2xl"
            >
              <Text className="text-white text-center font-extrabold">
                Close
              </Text>
            </Pressable>

            {!readOnly && (
              <Pressable
                disabled={!validation.ok || submitLoading}
                onPress={() => onSubmit(buildPayload())}
                className="flex-1 bg-blue-500/30 p-4 rounded-2xl"
              >
                <Text className="text-white text-center font-extrabold">
                  {submitLoading ? "Submitting…" : "Submit"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {wmTask && (
          <View
            pointerEvents="none"
            collapsable={false}
            ref={(r) => {
              watermarkRef.current = r;
            }}
            style={{
              position: "absolute",
              left: -(wmTask.W + 80),
              top: 0,
              width: wmTask.W,
              height: wmTask.H,
              backgroundColor: "#000",
            }}
          >
            <Image
              source={{ uri: wmTask.uri }}
              style={{ width: wmTask.W, height: wmTask.H }}
              resizeMode="cover"
              onLoadEnd={() => setStageReady(true)}
              onError={() => {
                setStageErr("stage image load failed");
                setStageReady(true);
              }}
            />

            <View
              style={{
                position: "absolute",
                right: 18,
                top: 18,
                maxWidth: "72%",
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: "rgba(0,0,0,0.55)",
                alignItems: "flex-end",
              }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.95)",
                  fontWeight: "900",
                  fontSize: 16,
                  lineHeight: 20,
                  textAlign: "right",
                }}
              >
                {POWERED_LINE}
              </Text>

              <Text
                style={{
                  marginTop: 2,
                  color: "rgba(255,255,255,0.95)",
                  fontWeight: "900",
                  fontSize: 15,
                  lineHeight: 20,
                  textAlign: "right",
                }}
              >
                Quality Inspector ID: {qcInspectorId}
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  color: "white",
                  fontWeight: "900",
                  fontSize: 15,
                  lineHeight: 20,
                  textAlign: "right",
                }}
              >
                {wmTask.text}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}